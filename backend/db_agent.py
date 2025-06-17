# backend/db_agent.py

import matplotlib
matplotlib.use("Agg")   # force non-GUI backend for thread safety

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

# — Configure concise logging to backend/agent.log —
logging.basicConfig(
    filename=Path(__file__).parent / "agent.log",
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s"
)
logger = logging.getLogger(__name__)
logger.info("Loading db_agent.py")

# — SSE event queue: strings of "data: …\n\n" —
event_queue: queue.Queue = queue.Queue()

# — Database helper —
DB_PATH = Path(__file__).parent / "app.db"
def get_conn():
    """
    Obtain a new SQLite connection to the application database.
    """
    return sqlite3.connect(DB_PATH)


# — Tools definitions —


@tool("set_filters")
def set_filters(
    data_inicial: str = None,
    data_final:   str = None,
    produto_id:   int = None,
    categoria:    str = None
) -> str:
    """
    Build a JSON string of filter parameters for analytics queries.
    """
    logger.info(f"[set_filters] inputs={dict(data_inicial=data_inicial, data_final=data_final, produto_id=produto_id, categoria=categoria)}")
    filters = {
        k: v for k, v in {
            "start_date": data_inicial,
            "end_date":   data_final,
            "product_id": produto_id,
            "category":   categoria
        }.items() if v is not None
    }
    out = json.dumps(filters)
    logger.info(f"[set_filters] → {out}")
    return out


@tool("toggle_theme")
def toggle_theme(tema: str = None) -> str:
    """
    Toggle or set the UI theme.
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
    """
    logger.info(f"[query_sql] SQL={query}")
    if not query.strip().lower().startswith("select"):
        msg = "Erro: apenas SELECT permitido."
        logger.warn(f"[query_sql] → {msg}")
        return msg

    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(query)
        cols = [d[0] for d in cur.description]
        rows = cur.fetchall()
        result = [dict(zip(cols, r)) for r in rows]
        out = json.dumps(result)
        logger.info(f"[query_sql] fetched {len(rows)} rows")
        return out
    except Exception as e:
        err = f"Erro SQL: {e}"
        logger.error(f"[query_sql] {err}")
        return err
    finally:
        conn.close()


@tool("sales_by_category")
def sales_by_category(categoria: str) -> str:
    """
    Calculate total sales amount for a given product category.
    """
    logger.info(f"[sales_by_category] categoria={categoria}")
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT IFNULL(SUM(oi.qty*oi.unit_price),0)
            FROM order_items oi
            JOIN products p ON oi.product_id=p.product_id
            WHERE p.category=?
            """, (categoria,)
        )
        val = float(cur.fetchone()[0] or 0)
        res = f"{val:.2f}"
        logger.info(f"[sales_by_category] → {res}")
        return res
    except Exception as e:
        logger.error(f"[sales_by_category] ERROR: {e}")
        return f"Erro: {e}"
    finally:
        conn.close()


@tool("vendas_por_mes")
def vendas_por_mes(
    data_inicial: str = None,
    data_final:   str = None
) -> str:
    """
    Aggregate monthly sales totals within optional date range.
    """
    logger.info(f"[vendas_por_mes] inputs={dict(data_inicial=data_inicial, data_final=data_final)}")
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
        payload = [{"mes": m, "total": t} for m, t in rows]
        out = json.dumps(payload)
        logger.info(f"[vendas_por_mes] → {len(rows)} rows")
        return out
    except Exception as e:
        logger.error(f"[vendas_por_mes] ERROR: {e}")
        return f"Erro: {e}"
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
    """
    logger.info(f"[generate_chart] tipo={tipo}, titulo={titulo}, points={len(x)}")
    import matplotlib.pyplot as plt
    import io

    fig, ax = plt.subplots(figsize=(6, 4))
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

    img_data = base64.b64encode(buf.getvalue()).decode("utf-8")
    logger.info(f"[generate_chart] image size={len(img_data)} bytes")
    return img_data


# — Build and expose the CrewAI instance —

def build_crew() -> Crew:
    """
    Assemble and return the CrewAI instance with configured tools.
    """
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


# — Stream tool usage events into SSE queue —

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
