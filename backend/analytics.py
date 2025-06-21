# analytics.py ─── commerce/order dashboards
import sqlite3, logging
from pathlib import Path
from fastapi import APIRouter, Query, HTTPException

router = APIRouter(prefix="/charts", tags=["commerce"])
logger = logging.getLogger("analytics")

DB_PATH = Path(__file__).with_name("app.db")          # same folder as main.py
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ── helper ────────────────────────────────────────────────────────────────────
def build_filters(
    data_inicial: str | None = None,
    data_final:   str | None = None,
    product_id:   int  | None = None,
    category:     str  | None = None,
):
    conds, params = [], []

    if product_id is not None:
        conds.append(
            "order_id IN (SELECT order_id FROM order_items WHERE product_id=?)")
        params.append(product_id)

    if category:
        conds.append(
            "order_id IN (SELECT oi.order_id FROM order_items oi "
            "JOIN products p ON oi.product_id = p.product_id "
            "WHERE p.category = ?)")
        params.append(category)

    if data_inicial:
        conds.append("date(order_date) >= date(?)")
        params.append(data_inicial)

    if data_final:
        conds.append("date(order_date) <= date(?)")
        params.append(data_final)

    return (" AND ".join(conds), params)

# ── AOV ───────────────────────────────────────────────────────────────────────
@router.get("/aov")
def aov(
    data_inicial: str | None = Query(None),
    data_final:   str | None = Query(None),
    product_id:   int  | None = Query(None),
    category:     str  | None = Query(None),
):
    conn = get_conn()
    try:
        where, params = build_filters(data_inicial, data_final,
                                      product_id, category)
        sql = (
            "SELECT strftime('%Y-%m', order_date) AS mes, "
            "AVG(grand_total) AS valor "
            "FROM orders"
        )
        if where:
            sql += f" WHERE {where}"
        sql += " GROUP BY mes ORDER BY mes;"
        rows = conn.execute(sql, params).fetchall()
        return {"data": [dict(r) for r in rows]}
    except Exception:
        logger.exception("Error in /charts/aov")
        raise HTTPException(500)
    finally:
        conn.close()

# ── Category-mix ──────────────────────────────────────────────────────────────
@router.get("/category-mix")
def category_mix(
    data_inicial: str | None = Query(None),
    data_final:   str | None = Query(None),
    product_id:   int  | None = Query(None),
    category:     str  | None = Query(None),
):
    conn = get_conn()
    try:
        where, params = build_filters(data_inicial, data_final,
                                      product_id, category)
        sql = (
            "SELECT p.category, SUM(oi.qty * oi.unit_price) AS total "
            "FROM orders o "
            "JOIN order_items oi ON o.order_id = oi.order_id "
            "JOIN products p   ON oi.product_id = p.product_id"
        )
        if where:
            sql += f" WHERE {where}"
        sql += " GROUP BY p.category ORDER BY total DESC;"
        rows = conn.execute(sql, params).fetchall()
        return {"data": [dict(r) for r in rows]}
    except Exception:
        logger.exception("Error in /charts/category-mix")
        raise HTTPException(500)
    finally:
        conn.close()

# ── Repeat funnel ────────────────────────────────────────────────────────────
@router.get("/repeat-funnel")
def repeat_funnel(
    data_inicial: str | None = Query(None),
    data_final:   str | None = Query(None),
    product_id:   int  | None = Query(None),
    category:     str  | None = Query(None),
):
    conn = get_conn()
    try:
        where, params = build_filters(data_inicial, data_final,
                                      product_id, category)
        sub = "SELECT contact_id, COUNT(*) AS cnt FROM orders"
        if where:
            sub += f" WHERE {where}"
        sub += " GROUP BY contact_id"
        sql = (
            "SELECT "
            "SUM(CASE WHEN cnt >= 1 THEN 1 ELSE 0 END) AS p1, "
            "SUM(CASE WHEN cnt >= 2 THEN 1 ELSE 0 END) AS p2, "
            "SUM(CASE WHEN cnt >= 3 THEN 1 ELSE 0 END) AS p3 "
            f"FROM ({sub})"
        )
        p1, p2, p3 = conn.execute(sql, params).fetchone()
        return {"data": [
            {"step": "1+ orders", "customers": p1},
            {"step": "2+ orders", "customers": p2},
            {"step": "3+ orders", "customers": p3},
        ]}
    except Exception:
        logger.exception("Error in /charts/repeat-funnel")
        raise HTTPException(500)
    finally:
        conn.close()

# ── Vendas por mês ───────────────────────────────────────────────────────────
@router.get("/vendas_por_mes")
def vendas_por_mes(
    data_inicial: str | None = Query(None),
    data_final:   str | None = Query(None),
):
    conn = get_conn()
    try:
        where, params = build_filters(data_inicial, data_final)
        sql = (
            "SELECT strftime('%Y-%m', order_date) AS mes, "
            "SUM(grand_total) AS total "
            "FROM orders"
        )
        if where:
            sql += f" WHERE {where}"
        sql += " GROUP BY mes ORDER BY mes;"
        rows = conn.execute(sql, params).fetchall()
        return {"data": [dict(r) for r in rows]}
    except Exception:
        logger.exception("Error in /charts/vendas_por_mes")
        raise HTTPException(500)
    finally:
        conn.close()
