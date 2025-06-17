"""
main.py  –  FastAPI backend for “Dashboard AI”
──────────────────────────────────────────────────────────────
• /charts/*  endpoints (JSON, English keys)
• /schema, /schema-diagram
• /chat  (JSON)  +  /chat-stream  (SSE to CrewAI)
"""

import uuid
import sqlite3
import logging
from pathlib import Path

from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse

from db_agent import analytics_crew, event_queue
from ag_ui.encoder import EventEncoder
from ag_ui.core import RunStartedEvent, RunFinishedEvent, EventType

import anyio

# ─────────────────────────── logging ────────────────────────────
LOG_PATH = Path(__file__).parent / "server.log"
logging.basicConfig(
    filename=LOG_PATH,
    filemode="a",
    level=logging.DEBUG,
    format="%(asctime)s %(levelname)s %(message)s"
)
logger = logging.getLogger(__name__)
logger.debug("Starting main.py")

# ─────────────────────────── FastAPI app ─────────────────────────
app = FastAPI(title="Dashboard AI – Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────── DB helpers / filters ────────────────────
DB_PATH = Path(__file__).parent / "app.db"

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def build_filters(p: dict) -> str:
    """Build WHERE conditions from query args."""
    conds = []
    if p.get("product_id"):
        conds.append(
            f"order_id IN (SELECT order_id FROM order_items WHERE product_id={p['product_id']})"
        )
    if p.get("category"):
        conds.append(
            "order_id IN (SELECT oi.order_id FROM order_items oi "
            "JOIN products p ON oi.product_id=p.product_id "
            f"WHERE p.category='{p['category']}')"
        )
    if p.get("start_date"):
        conds.append(f"date(order_date)>=date('{p['start_date']}')")
    if p.get("end_date"):
        conds.append(f"date(order_date)<=date('{p['end_date']}')")
    return " AND ".join(conds)

# ────────────────────────── Chart APIs ───────────────────────────
@app.get("/charts/aov")
def avg_order_value(
    start_date: str | None = Query(None, alias="data_inicial"),
    end_date:   str | None = Query(None, alias="data_final"),
    product_id: int | None = None,
    category:   str | None = None,
):
    conn = get_conn(); c = conn.cursor()
    sql = (
        "SELECT strftime('%Y-%m',order_date) AS month, "
        "AVG(grand_total) AS value "
        "FROM orders"
    )
    filt = build_filters(locals())
    if filt: sql += " WHERE " + filt
    sql += " GROUP BY month ORDER BY month;"
    rows = c.execute(sql).fetchall()
    conn.close()
    return {"data": [dict(r) for r in rows]}

# ---------------------------------------------------------------
@app.get("/charts/category-mix")
def category_mix(
    start_date: str | None = Query(None, alias="data_inicial"),
    end_date:   str | None = Query(None, alias="data_final"),
):
    conn = get_conn(); c = conn.cursor()
    sql = (
        "SELECT p.category, SUM(oi.qty * oi.unit_price) AS total "
        "FROM orders o "
        "JOIN order_items oi ON o.order_id = oi.order_id "
        "JOIN products p ON oi.product_id = p.product_id"
    )
    filt = build_filters(locals())
    if filt: sql += " WHERE " + filt
    sql += " GROUP BY p.category ORDER BY total DESC;"
    rows = c.execute(sql).fetchall()
    conn.close()
    return {"data": [{"category": cat, "total": tot} for cat, tot in rows]}

# ---------------------------------------------------------------
@app.get("/charts/repeat-funnel")
def repeat_funnel(
    start_date: str | None = Query(None, alias="data_inicial"),
    end_date:   str | None = Query(None, alias="data_final"),
):
    conn = get_conn(); c = conn.cursor()
    sub = "SELECT contact_id, COUNT(*) AS cnt FROM orders"
    filt = build_filters(locals())
    if filt: sub += " WHERE " + filt
    sub += " GROUP BY contact_id"

    sql = (
        "SELECT "
        "SUM(CASE WHEN cnt>=1 THEN 1 ELSE 0 END), "
        "SUM(CASE WHEN cnt>=2 THEN 1 ELSE 0 END), "
        "SUM(CASE WHEN cnt>=3 THEN 1 ELSE 0 END) "
        f"FROM ({sub}) AS t;"
    )
    p1, p2, p3 = c.execute(sql).fetchone()
    conn.close()
    return {"data": [
        {"step": "1+ orders", "customers": p1},
        {"step": "2+ orders", "customers": p2},
        {"step": "3+ orders", "customers": p3},
    ]}

# ---------------------------------------------------------------
@app.get("/charts/vendas_por_mes")
def vendas_por_mes(
    start_date: str | None = Query(None, alias="data_inicial"),
    end_date:   str | None = Query(None, alias="data_final"),
):
    conn = get_conn(); c = conn.cursor()
    sql = (
        "SELECT strftime('%Y-%m',order_date) AS month, "
        "SUM(grand_total) AS total "
        "FROM orders"
    )
    filt = build_filters(locals())
    if filt: sql += " WHERE " + filt
    sql += " GROUP BY month ORDER BY month;"
    rows = c.execute(sql).fetchall()
    conn.close()
    return {"data": [dict(r) for r in rows]}

# ───────────────────────── Schema endpoints ──────────────────────
@app.get("/schema")
def get_schema():
    conn = get_conn(); c = conn.cursor()
    out = {}
    for tbl in ["contacts", "products", "orders", "order_items"]:
        c.execute(f"PRAGMA table_info({tbl});")
        out[tbl] = [dict(r) for r in c.fetchall()]
    conn.close()
    return out

@app.get("/schema-diagram")
def schema_diagram():
    img = Path(__file__).parent / "static" / "schema.png"
    if not img.exists():
        raise HTTPException(status_code=404, detail="Schema diagram not found")
    return FileResponse(img)

# ─────────────────────────── Chat APIs ───────────────────────────
@app.post("/chat")
async def chat_json(request: Request):
    payload = await request.json()
    user_message = payload.get("message")
    if not user_message:
        return JSONResponse({"error": "Field 'message' is required."}, status_code=400)
    try:
        result = analytics_crew.kickoff({"input": user_message})
        return JSONResponse(result)
    except Exception:
        logger.exception("Error in /chat")
        return JSONResponse({"error": "Internal Server Error"}, status_code=500)

@app.get("/chat-stream")
def chat_stream(user_message: str):
    tid, rid = str(uuid.uuid4()), str(uuid.uuid4())
    enc = EventEncoder()

    async def event_gen():
        yield "data: " + enc.encode(RunStartedEvent(
            type=EventType.RUN_STARTED, thread_id=tid, run_id=rid)) + "\n\n"
        logger.debug("SSE START %s", tid)

        await anyio.to_thread.run_sync(
            lambda: analytics_crew.kickoff({"input": user_message})
        )
        event_queue.put(None)

        while True:
            ev = await anyio.to_thread.run_sync(event_queue.get)
            if ev is None:
                break
            yield ev

        yield "data: " + enc.encode(RunFinishedEvent(
            type=EventType.RUN_FINISHED, thread_id=tid, run_id=rid)) + "\n\n"
        logger.debug("SSE FINISH %s", tid)

    return StreamingResponse(event_gen(), media_type="text/event-stream")

logger.debug("FastAPI app setup complete")
