# backend/db_agent.py

import json
import sqlite3
import base64
import queue
import logging
from pathlib import Path

from crewai import Agent, Crew, LLM, Task, Process
from crewai.tools import tool
from crewai.utilities.events import crewai_event_bus
from crewai.utilities.events.tool_usage_events import ToolUsageFinishedEvent

from ag_ui.encoder import EventEncoder
from ag_ui.core import RawEvent, EventType

# — Configure concise logging —
logging.basicConfig(
    filename=Path(__file__).parent / "agent.log",
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s"
)
logger = logging.getLogger(__name__)
logger.info("Loading db_agent.py")

# — SSE event queue: strings of "data: …\n\n" —
event_queue: queue.Queue = queue.Queue()

# — DB helper —
DB_PATH = Path(__file__).parent / "app.db"
def get_conn():
    """
    Obtain a new SQLite connection to the application database.
    """
    return sqlite3.connect(DB_PATH)

# — Tools —


@tool("set_filters")
def set_filters(
    data_inicial: str = None,
    data_final:   str = None,
    produto_id:   int = None,
    categoria:    str = None
) -> str:
    """
    Build a JSON string of filter parameters for analytics queries.

    Args:
        data_inicial (str, optional): Start date in YYYY-MM-DD format.
        data_final (str, optional): End date in YYYY-MM-DD format.
        produto_id (int, optional): ID of the product to filter.
        categoria (str, optional): Category name to filter.

    Returns:
        str: JSON-formatted string containing provided filters.
    """
    logger.info(f"[set_filters] {locals()}")
    filters = {k: v for k, v in {
        "start_date": data_inicial,
        "end_date":   data_final,
        "product_id": produto_id,
        "category":   categoria
    }.items() if v is not None}
    out = json.dumps(filters)
    logger.info(f"[set_filters] → {out}")
    return out


@tool("toggle_theme")
def toggle_theme(tema: str = None) -> str:
    """
    Toggle or set the UI theme.

    Args:
        tema (str, optional): Desired theme: 'light' or 'dark'.

    Returns:
        str: 'light', 'dark', or 'toggle' if no valid tema provided.
    """
    logger.info(f"[toggle_theme] tema={tema}")
    t = tema.lower() if tema else None
    res = t if t in ("light", "dark") else "toggle"
    logger.info(f"[toggle_theme] → {res}")
    return res


@tool("query_sql")
def query_sql(query: str) -> str:
    """
    Execute a read-only SQL SELECT against the application database.

    Args:
        query (str): A SQL query string starting with SELECT.

    Returns:
        str: JSON-formatted list of row objects, or error message.
    """
    logger.info(f"[query_sql] SQL={query}")
    if not query.strip().lower().startswith("select"):
        return "Erro: apenas SELECT permitido."
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(query)
        cols = [d[0] for d in cur.description]
        rows = cur.fetchall()
        out = json.dumps([dict(zip(cols, r)) for r in rows])
        logger.info(f"[query_sql] fetched {len(rows)} rows")
        return out
    except Exception as e:
        logger.error(f"[query_sql] ERROR: {e}")
        return f"Erro SQL: {e}"
    finally:
        conn.close()


@tool("sales_by_category")
def sales_by_category(categoria: str) -> str:
    """
    Calculate total sales amount for a given product category.

    Args:
        categoria (str): Category name to filter orders.

    Returns:
        str: Total sales as a formatted string with two decimals.
    """
    logger.info(f"[sales_by_category] categoria={categoria}")
    conn = get_conn()
    try:
        cur = conn.cursor()
        # ← fixed: use oi.qty (not oi.quantity)
        cur.execute(
            """
            SELECT IFNULL(SUM(oi.qty * oi.unit_price), 0)
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            WHERE p.category = ?
            """,
            (categoria,),
        )
        total = cur.fetchone()[0] or 0
        res = f"{float(total):.2f}"
        logger.info(f"[sales_by_category] → {res}")
        return res
    finally:
        conn.close()


@tool("vendas_por_mes")
def vendas_por_mes(
    data_inicial: str = None,
    data_final:   str = None
) -> str:
    """
    Aggregate monthly sales totals within optional date range.

    Args:
        data_inicial (str, optional): Start date filter (YYYY-MM-DD).
        data_final (str, optional): End date filter (YYYY-MM-DD).

    Returns:
        str: JSON array of objects with 'mes' and 'total' keys.
    """
    logger.info(f"[vendas_por_mes] {locals()}")
    conn = get_conn()
    try:
        cur = conn.cursor()
        sql = "SELECT strftime('%Y-%m',order_date) AS mes, SUM(grand_total) AS total FROM orders"
        conds = []
        if data_inicial:
            conds.append(f"date(order_date)>=date('{data_inicial}')")
        if data_final:
            conds.append(f"date(order_date)<=date('{data_final}')")
        if conds:
            sql += " WHERE " + " AND ".join(conds)
        sql += " GROUP BY mes ORDER BY mes;"
        rows = cur.execute(sql).fetchall()
        out = json.dumps([{"mes": m, "total": t} for m, t in rows])
        logger.info(f"[vendas_por_mes] → {len(rows)} entries")
        return out
    finally:
        conn.close()


@tool("generate_chart")
def generate_chart(
    titulo: str,
    x:      list,
    y:      list,
    tipo:   str = "bar"
) -> str:
    """
    Generate a base64-encoded chart image.

    Args:
        titulo (str): Title of the chart.
        x (list): Labels for the X-axis.
        y (list): Numeric values for the Y-axis.
        tipo (str, optional): 'bar' or 'line'. Defaults to 'bar'.

    Returns:
        str: Base64-encoded PNG image data.
    """
    logger.info(f"[generate_chart] tipo={tipo}, titulo={titulo}, pts={len(x)}")
    import matplotlib.pyplot as plt, io
    fig, ax = plt.subplots(figsize=(6,4))
    if tipo == "line":
        ax.plot(x, y, marker='o', linewidth=2)
    else:
        ax.bar(x, y)
    ax.set_title(titulo)
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    plt.close(fig)
    img = base64.b64encode(buf.getvalue()).decode('utf-8')
    logger.info(f"[generate_chart] image size={len(img)}")
    return img


def build_crew():
    llm = LLM(model="openai/gpt-4o-mini", temperature=0.1, stream=False)
    agent = Agent(
        role="Assistente de Analytics",
        goal="Auxiliar na análise de dados, filtros, tema e gráficos",
        backstory="IA especialista em e-commerce e visualização de dados",
        tools=[
            set_filters,
            toggle_theme,
            query_sql,
            sales_by_category,
            vendas_por_mes,
            generate_chart
        ],
        allow_delegation=False,
        llm=llm
    )
    task = Task(
        name="processa_consulta",
        description="Processa consulta do usuário: {input}",
        agent=agent,
        expected_output="Resposta em texto com insights e/ou gráficos"
    )
    return Crew(
        agents=[agent],
        tasks=[task],
        process=Process.sequential,
        verbose=False
    )

analytics_crew = build_crew()
logger.info("analytics_crew ready")


@crewai_event_bus.on(ToolUsageFinishedEvent)
def on_tool(ev: ToolUsageFinishedEvent):
    """
    Capture tool execution events and enqueue as SSE messages.
    """
    payload = {"tool": ev.tool_name, "output": ev.output or ""}
    raw = RawEvent(EventType.RAW, ev.thread_id, ev.run_id, payload)
    msg = "data: " + EventEncoder().encode(raw) + "\n\n"
    event_queue.put(msg)
    logger.info(f"[queued] {ev.tool_name}")
