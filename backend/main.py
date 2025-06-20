import uuid
import sqlite3
import logging
from pathlib import Path

from fastapi import FastAPI, Request, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from db_agent import analytics_crew

# — Logging —
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# — Create FastAPI app —
app = FastAPI(title="Dashboard AI – Backend")

# ────── CORS ──────
# Allow * (or narrow this to your frontend origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# — SQLite helper for charts —
DB_PATH = Path(__file__).parent / "app.db"
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# — Build WHERE clause from filters —
def build_filters(
    data_inicial: str | None = None,
    data_final:   str | None = None,
    product_id:   int  | None = None,
    category:     str  | None = None
) -> str:
    conds: list[str] = []
    if product_id is not None:
        conds.append(f"order_id IN (SELECT order_id FROM order_items WHERE product_id={product_id})")
    if category:
        conds.append(
            "order_id IN (SELECT oi.order_id FROM order_items oi "
            "JOIN products p ON oi.product_id=p.product_id "
            f"WHERE p.category='{category}')"
        )
    if data_inicial:
        conds.append(f"date(order_date) >= date('{data_inicial}')")
    if data_final:
        conds.append(f"date(order_date) <= date('{data_final}')")
    return " AND ".join(conds)

# ─────────── Chart Endpoints ───────────

@app.get("/charts/aov")
def aov(
    data_inicial: str | None = Query(None),
    data_final:   str | None = Query(None),
    product_id:   int  | None = Query(None),
    category:     str  | None = Query(None),
):
    """
    /charts/aov
    Average Order Value per month.
    """
    conn, cur = get_conn(), None
    try:
        cur = conn.cursor()
        sql = (
            "SELECT strftime('%Y-%m',order_date) AS mes, "
            "AVG(grand_total) AS valor "
            "FROM orders"
        )
        f = build_filters(data_inicial, data_final, product_id, category)
        if f:
            sql += " WHERE " + f
        sql += " GROUP BY mes ORDER BY mes;"
        rows = cur.execute(sql).fetchall()
        return {"data": [{"mes": r["mes"], "valor": r["valor"]} for r in rows]}
    except Exception:
        logger.exception("Error in /charts/aov")
        raise HTTPException(500, "Internal Server Error")
    finally:
        if cur:
            cur.close()
            conn.close()

@app.get("/charts/category-mix")
def category_mix(
    data_inicial: str | None = Query(None),
    data_final:   str | None = Query(None),
    product_id:   int  | None = Query(None),
    category:     str  | None = Query(None),
):
    """
    /charts/category-mix
    Total revenue by category.
    """
    conn, cur = get_conn(), None
    try:
        cur = conn.cursor()
        sql = (
            "SELECT p.category, SUM(oi.qty*oi.unit_price) AS total "
            "FROM orders o "
            "JOIN order_items oi ON o.order_id=oi.order_id "
            "JOIN products p ON oi.product_id=p.product_id"
        )
        f = build_filters(data_inicial, data_final, product_id, category)
        if f:
            sql += " WHERE " + f
        sql += " GROUP BY p.category ORDER BY total DESC;"
        rows = cur.execute(sql).fetchall()
        return {"data": [{"category": r["category"], "total": r["total"]} for r in rows]}
    except Exception:
        logger.exception("Error in /charts/category-mix")
        raise HTTPException(500, "Internal Server Error")
    finally:
        if cur:
            cur.close()
            conn.close()

@app.get("/charts/repeat-funnel")
def repeat_funnel(
    data_inicial: str | None = Query(None),
    data_final:   str | None = Query(None),
    product_id:   int  | None = Query(None),
    category:     str  | None = Query(None),
):
    """
    /charts/repeat-funnel
    Customer funnel: 1+, 2+, 3+ orders.
    """
    conn, cur = get_conn(), None
    try:
        cur = conn.cursor()
        sub = "SELECT contact_id, COUNT(*) AS cnt FROM orders"
        f = build_filters(data_inicial, data_final, product_id, category)
        if f:
            sub += " WHERE " + f
        sub += " GROUP BY contact_id"
        sql = (
            "SELECT "
            "SUM(CASE WHEN cnt>=1 THEN 1 ELSE 0 END) AS p1, "
            "SUM(CASE WHEN cnt>=2 THEN 1 ELSE 0 END) AS p2, "
            "SUM(CASE WHEN cnt>=3 THEN 1 ELSE 0 END) AS p3 "
            f"FROM ({sub}) AS t;"
        )
        p1, p2, p3 = cur.execute(sql).fetchone()
        return {"data": [
            {"step": "1+ orders", "customers": p1},
            {"step": "2+ orders", "customers": p2},
            {"step": "3+ orders", "customers": p3},
        ]}
    except Exception:
        logger.exception("Error in /charts/repeat-funnel")
        raise HTTPException(500, "Internal Server Error")
    finally:
        if cur:
            cur.close()
            conn.close()

@app.get("/charts/vendas_por_mes")
def vendas_por_mes_api(
    data_inicial: str | None = Query(None),
    data_final:   str | None = Query(None),
):
    """
    /charts/vendas_por_mes
    Total sales per month.
    """
    conn, cur = get_conn(), None
    try:
        cur = conn.cursor()
        sql = (
            "SELECT strftime('%Y-%m',order_date) AS mes, "
            "SUM(grand_total) AS total "
            "FROM orders"
        )
        f = build_filters(data_inicial, data_final)
        if f:
            sql += " WHERE " + f
        sql += " GROUP BY mes ORDER BY mes;"
        rows = cur.execute(sql).fetchall()
        return {"data": [{"mes": r["mes"], "total": r["total"]} for r in rows]}
    except Exception:
        logger.exception("Error in /charts/vendas_por_mes")
        raise HTTPException(500, "Internal Server Error")
    finally:
        if cur:
            cur.close()
            conn.close()

# ─────────── Chat JSON endpoint ───────────
@app.post("/chat")
async def chat_json(request: Request):
    """
    Expects JSON { "message": "<user query>" }.
    Returns JSON { "query": "<SQL>", "results": [...], "reasoning": "..." }.
    """
    payload = await request.json()
    user_message = payload.get("message")
    if not user_message:
        return JSONResponse({"error": "Field 'message' is required."}, status_code=400)

    try:
        crew_output = analytics_crew.kickoff({"input": user_message})
        return JSONResponse(crew_output.dict())
    except Exception:
        logger.exception("Error in /chat")
        return JSONResponse({"error": "Internal Server Error"}, status_code=500)
