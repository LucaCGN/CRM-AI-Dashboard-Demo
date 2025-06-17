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
logger.info("Starting agent.py")

# — SSE event queue: strings of "data: …\n\n" —
event_queue: queue.Queue = queue.Queue()

# — DB helper —
DB_PATH = Path(__file__).parent / "app.db"
def get_conn():
    return sqlite3.connect(DB_PATH)

# — Define tools with minimal INFO-level logging —


@tool("set_filters")
def set_filters(
    data_inicial: str = None,
    data_final:   str = None,
    produto_id:   int = None,
    categoria:    str = None
) -> str:
    logger.info(f"[set_filters] args start={data_inicial}, end={data_final}, product={produto_id}, cat={categoria}")
    filters = {k: v for k, v in {
        "start_date": data_inicial,
        "end_date":   data_final,
        "product_id": produto_id,
        "category":   categoria
    }.items() if v is not None}
    output = json.dumps(filters)
    logger.info(f"[set_filters] => {output}")
    return output


@tool("toggle_theme")
def toggle_theme(tema: str = None) -> str:
    logger.info(f"[toggle_theme] arg tema={tema}")
    t = tema.lower() if tema else None
    result = t if t in ("light", "dark") else "toggle"
    logger.info(f"[toggle_theme] => {result}")
    return result


@tool("query_sql")
def query_sql(query: str) -> str:
    logger.info(f"[query_sql] SQL={query}")
    if not query.strip().lower().startswith("select"):
        return "Erro: apenas SELECT permitido."
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(query)
        cols = [d[0] for d in cur.description]
        rows = cur.fetchall()
        result = json.dumps([dict(zip(cols, r)) for r in rows])
        logger.info(f"[query_sql] returned {len(rows)} rows")
        return result
    except Exception as e:
        logger.error(f"[query_sql] ERROR: {e}")
        return f"Erro SQL: {e}"
    finally:
        conn.close()


@tool("sales_by_category")
def sales_by_category(categoria: str) -> str:
    logger.info(f"[sales_by_category] categoria={categoria}")
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT IFNULL(SUM(oi.qty*oi.unit_price), 0)
            FROM order_items oi
            JOIN products p ON oi.product_id=p.product_id
            WHERE p.category=?
            """,
            (categoria,)
        )
        val = float(cur.fetchone()[0])
        result = f"{val:.2f}"
        logger.info(f"[sales_by_category] => {result}")
        return result
    finally:
        conn.close()


@tool("vendas_por_mes")
def vendas_por_mes(
    data_inicial: str = None,
    data_final:   str = None
) -> str:
    logger.info(f"[vendas_por_mes] start={data_inicial}, end={data_final}")
    conn = get_conn()
    try:
        cur = conn.cursor()
        sql = (
            "SELECT strftime('%Y-%m',order_date) AS mes, "
            "SUM(grand_total) AS total FROM orders"
        )
        conds = []
        if data_inicial:
            conds.append(f"date(order_date)>=date('{data_inicial}')")
        if data_final:
            conds.append(f"date(order_date)<=date('{data_final}')")
        if conds:
            sql += " WHERE " + " AND ".join(conds)
        sql += " GROUP BY mes ORDER BY mes;"
        rows = cur.execute(sql).fetchall()
        output = json.dumps([{"mes": m, "total": t} for m, t in rows])
        logger.info(f"[vendas_por_mes] => {len(rows)} months")
        return output
    finally:
        conn.close()


@tool("generate_chart")
def generate_chart(
    titulo: str,
    x:      list,
    y:      list,
    tipo:   str = "bar"
) -> str:
    logger.info(f"[generate_chart] tipo={tipo}, title={titulo}, points={len(x)}")
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
    img_b64 = base64.b64encode(buf.getvalue()).decode('utf-8')
    logger.info(f"[generate_chart] generated image ({len(img_b64)} chars)")
    return img_b64


# — Build the Crew —

def build_crew():
    llm = LLM(model="openai/gpt-4", temperature=0.6, stream=False)
    agent = Agent(
        role="Assistente de Analytics",
        goal="Auxiliar na análise de dados, aplicar filtros, alternar tema e gerar gráficos.",
        backstory="Você é uma IA especialista em e-commerce e visualização de dados.",
        tools=[set_filters, toggle_theme, query_sql, sales_by_category, vendas_por_mes, generate_chart],
        allow_delegation=False,
        llm=llm
    )
    task = Task(
        description="Processa consulta do usuário: {input}",
        agent=agent,
        expected_output="Resposta de texto ou gráfico conforme necessário."
    )
    crew = Crew(
        agents=[agent],
        tasks=[task],
        process=Process.sequential,
        verbose=False
    )
    return crew

analytics_crew = build_crew()
logger.info("Crew assembled successfully")


# — Stream tool-usage events into our SSE queue —
@crewai_event_bus.on(ToolUsageFinishedEvent)
def _on_tool_finished(source, ev: ToolUsageFinishedEvent):
    logger.info(f"[ToolFinished] {ev.tool_name} on thread={ev.thread_id}")
    name, output = ev.tool_name, ev.output or ""
    # Build AG-UI raw payload
    if name == "set_filters":
        payload = {"type":"filter_update", "filters": json.loads(output)}
    elif name == "toggle_theme":
        payload = {"type":"toggle_theme", "theme": output}
    elif name == "generate_chart":
        payload = {"type":"chart", "image": output}
    else:
        payload = {"type":"tool_response", "tool": name, "content": output}

    # Only default "data:" so front end onmessage fires
    msg = "data: " + EventEncoder().encode(
        RawEvent(EventType.RAW, ev.thread_id, ev.run_id, payload)
    ) + "\n\n"
    event_queue.put(msg)
    logger.info(f"[Queued] {name} ▶ {len(msg)} chars")
