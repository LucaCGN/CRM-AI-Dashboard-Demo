# backend/main.py

import uuid
import sqlite3
from pathlib import Path
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse

from agent import run_analytics
from db_agent import analytics_crew, event_queue   # leave SSE in place if you still want it
from ag_ui.encoder import EventEncoder
from ag_ui.core import RunStartedEvent, RunFinishedEvent, EventType

import anyio

# — file logging for server —
logging.basicConfig(
    filename=Path(__file__).parent / "server.log",
    filemode="w",
    level=logging.DEBUG,
    format="%(asctime)s %(levelname)s %(message)s"
)
logging.debug("Starting main.py")

app = FastAPI(title="Dashboard AI – Backend")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database helper
DB_PATH = Path(__file__).parent / "app.db"
def get_conn():
    return sqlite3.connect(DB_PATH)

def build_filters(params: dict) -> str:
    conds = []
    if params.get("product_id"):
        conds.append(
            f"order_id IN (SELECT order_id FROM order_items WHERE product_id={params['product_id']})"
        )
    if params.get("category"):
        conds.append(
            "order_id IN (SELECT oi.order_id FROM order_items oi "
            f"JOIN products p ON oi.product_id=p.product_id "
            f"WHERE p.category='{params['category']}')"
        )
    if params.get("start_date"):
        conds.append(f"date(order_date)>=date('{params['start_date']}')")
    if params.get("end_date"):
        conds.append(f"date(order_date)<=date('{params['end_date']}')")
    return " AND ".join(conds)

# — Chart endpoints —
@app.get("/charts/aov")
def aov(start_date: str = None, end_date: str = None,
        product_id: int = None, category: str = None):
    conn = get_conn(); c = conn.cursor()
    sql = (
        "SELECT strftime('%Y-%m',order_date) AS mes, "
        "AVG(grand_total) AS valor "
        "FROM orders"
    )
    filters = build_filters(locals())
    if filters:
        sql += " WHERE " + filters
    sql += " GROUP BY mes ORDER BY mes;"
    rows = c.execute(sql).fetchall()
    conn.close()
    return {"data": [{"mes": m, "valor": v} for m, v in rows]}

@app.get("/charts/category-mix")
def category_mix(start_date: str = None, end_date: str = None,
                 product_id: int = None, category: str = None):
    conn = get_conn(); c = conn.cursor()
    sql = (
        "SELECT p.category, SUM(oi.qty * oi.unit_price) AS total "
        "FROM orders o "
        "JOIN order_items oi ON o.order_id = oi.order_id "
        "JOIN products p ON oi.product_id = p.product_id"
    )
    filters = build_filters(locals())
    if filters:
        sql += " WHERE " + filters
    sql += " GROUP BY p.category ORDER BY total DESC;"
    rows = c.execute(sql).fetchall()
    conn.close()
    return {"data": [{"category": cat, "total": tot} for cat, tot in rows]}

@app.get("/charts/repeat-funnel")
def repeat_funnel(start_date: str = None, end_date: str = None,
                  product_id: int = None, category: str = None):
    conn = get_conn(); c = conn.cursor()
    sub = "SELECT contact_id, COUNT(*) AS cnt FROM orders"
    filters = build_filters(locals())
    if filters:
        sub += " WHERE " + filters
    sub += " GROUP BY contact_id"
    sql = (
        "SELECT "
        "SUM(CASE WHEN cnt>=1 THEN 1 ELSE 0 END) AS p1, "
        "SUM(CASE WHEN cnt>=2 THEN 1 ELSE 0 END) AS p2, "
        "SUM(CASE WHEN cnt>=3 THEN 1 ELSE 0 END) AS p3 "
        f"FROM ({sub}) AS t;"
    )
    p1, p2, p3 = c.execute(sql).fetchone()
    conn.close()
    return {"data": [
        {"step": "1+ orders", "customers": p1},
        {"step": "2+ orders", "customers": p2},
        {"step": "3+ orders", "customers": p3},
    ]}

@app.get("/charts/vendas_por_mes")
def vendas_por_mes_api(start_date: str = None, end_date: str = None):
    conn = get_conn(); c = conn.cursor()
    sql = (
        "SELECT strftime('%Y-%m',order_date) AS mes, "
        "SUM(grand_total) AS total "
        "FROM orders"
    )
    filters = build_filters(locals())
    if filters:
        sql += " WHERE " + filters
    sql += " GROUP BY mes ORDER BY mes;"
    rows = c.execute(sql).fetchall()
    conn.close()
    return {"data": [{"mes": m, "total": t} for m, t in rows]}

# — Schema endpoints —
@app.get("/schema")
def get_schema():
    conn = get_conn()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    out = {}
    for tbl in ["contacts", "products", "orders", "order_items"]:
        c.execute(f"PRAGMA table_info({tbl});")
        out[tbl] = [dict(r) for r in c.fetchall()]
    conn.close()
    return out

@app.get("/schema-diagram")
def schema_diagram():
    img_path = Path(__file__).parent / "static" / "schema.png"
    if not img_path.exists():
        logging.error("schema.png not found at %s", img_path)
    return FileResponse(img_path)

# — JSON chat endpoint —
@app.post("/chat")
async def chat_json(request: Request):
    """
    A simple POST /chat that returns the parsed JSON from CrewAI,
    and logs it in agent.log.
    """
    payload = await request.json()
    user_message = payload.get("message")
    if not user_message:
        return JSONResponse({"error": "Field 'message' is required."}, status_code=400)

    try:
        response = run_analytics(user_message)
        return JSONResponse(response.dict())
    except Exception as e:
        logging.exception("Error in /chat")
        return JSONResponse({"error": str(e)}, status_code=500)


# — SSE chat-stream (unchanged) —
@app.get("/chat-stream")
def chat_stream(user_message: str):
    tid, rid = str(uuid.uuid4()), str(uuid.uuid4())
    enc = EventEncoder()

    async def event_gen():
        yield enc.encode(RunStartedEvent(
            type=EventType.RUN_STARTED,
            threadId=tid,
            runId=rid
        ))

        # Trigger your existing SSE-driven crew:
        analytics_crew.kickoff(inputs={"input": user_message})

        while True:
            ev = await anyio.to_thread.run_sync(event_queue.get)
            if ev is None:
                break
            yield ev[0] + ev[1]

        yield enc.encode(RunFinishedEvent(
            type=EventType.RUN_FINISHED,
            threadId=tid,
            runId=rid
        ))

    return StreamingResponse(event_gen(), media_type="text/event-stream")


logging.debug("FastAPI app setup complete")
