# campaigns.py ─── email marketing dashboards
import sqlite3, logging
from pathlib import Path
from fastapi import APIRouter, Query, HTTPException

router = APIRouter(prefix="/charts", tags=["campaigns"])
logger = logging.getLogger("campaigns")

DB_PATH = Path(__file__).with_name("app.db")
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ── helpers ──────────────────────────────────────────────────────────────────
def build_campaign_filters(
    data_inicial: str | None = None,
    data_final:   str | None = None,
    sender:       str | None = None,
):
    conds, params = [], []

    # sender filter
    if sender:
        conds.append("email_sender_name = ?")
        params.append(sender)

    # convert dd/mm/YYYY to ISO for date()
    def to_iso_col(col="send_date"):
        #  30/03/2025 → 2025-03-30
        return (
            f"substr({col}, 7, 4) || '-' || "
            f"substr({col}, 4, 2) || '-' || "
            f"substr({col}, 1, 2)"
        )

    if data_inicial:
        conds.append(f"date({to_iso_col()}) >= date(?)")
        params.append(data_inicial)
    if data_final:
        conds.append(f"date({to_iso_col()}) <= date(?)")
        params.append(data_final)

    return (" AND ".join(conds), params)

# ── 1) Volume por mês ────────────────────────────────────────────────────────
@router.get("/email-volume")
def email_volume(
    data_inicial: str | None = Query(None),
    data_final:   str | None = Query(None),
    sender:       str | None = Query(None),
):
    """Total de envios por mês."""
    conn = get_conn()
    try:
        where, params = build_campaign_filters(data_inicial, data_final, sender)
        sql = (
            "SELECT strftime('%Y-%m', "
            "        substr(send_date,7,4)||'-'||substr(send_date,4,2)||'-'||substr(send_date,1,2)) AS mes, "
            "SUM(email_sends) AS sends "
            "FROM campaigns"
        )
        if where:
            sql += f" WHERE {where}"
        sql += " GROUP BY mes ORDER BY mes;"
        rows = conn.execute(sql, params).fetchall()
        return {"data": [dict(r) for r in rows]}
    except Exception:
        logger.exception("Error in /charts/email-volume")
        raise HTTPException(500)
    finally:
        conn.close()

# ── 2) Engajamento por mês ───────────────────────────────────────────────────
@router.get("/email-engagement")
def email_engagement(
    data_inicial: str | None = Query(None),
    data_final:   str | None = Query(None),
    sender:       str | None = Query(None),
):
    """Taxas de abertura e clique % por mês."""
    conn = get_conn()
    try:
        where, params = build_campaign_filters(data_inicial, data_final, sender)
        sql = (
            "SELECT strftime('%Y-%m', "
            "        substr(send_date,7,4)||'-'||substr(send_date,4,2)||'-'||substr(send_date,1,2)) AS mes, "
            "SUM(email_unique_opens) * 1.0 / SUM(email_sends)  AS open_rate, "
            "SUM(email_unique_clicks) * 1.0 / NULLIF(SUM(email_unique_opens),0) AS click_rate "
            "FROM campaigns"
        )
        if where:
            sql += f" WHERE {where}"
        sql += " GROUP BY mes ORDER BY mes;"
        rows = conn.execute(sql, params).fetchall()
        return {"data": [
            {"mes": r["mes"],
             "open_rate": round(r["open_rate"] * 100, 2) if r["open_rate"] is not None else 0,
             "click_rate": round(r["click_rate"] * 100, 2) if r["click_rate"] is not None else 0}
            for r in rows]}
    except Exception:
        logger.exception("Error in /charts/email-engagement")
        raise HTTPException(500)
    finally:
        conn.close()

# ── 3) Mix por remetente ─────────────────────────────────────────────────────
@router.get("/email-sender-mix")
def email_sender_mix(
    data_inicial: str | None = Query(None),
    data_final:   str | None = Query(None),
):
    """Top 10 remetentes por volume + % abertura."""
    conn = get_conn()
    try:
        where, params = build_campaign_filters(data_inicial, data_final)
        sql = (
            "SELECT email_sender_name AS sender, "
            "       SUM(email_sends)  AS sends, "
            "       SUM(email_unique_opens)*1.0 / SUM(email_sends) AS open_rate "
            "FROM campaigns"
        )
        if where:
            sql += f" WHERE {where}"
        sql += " GROUP BY sender ORDER BY sends DESC LIMIT 10;"
        rows = conn.execute(sql, params).fetchall()
        return {"data": [
            {"sender": r["sender"],
             "sends": r["sends"],
             "open_rate": round(r["open_rate"] * 100, 2)} for r in rows]}
    except Exception:
        logger.exception("Error in /charts/email-sender-mix")
        raise HTTPException(500)
    finally:
        conn.close()

# ── 4) Taxa de descadastro ──────────────────────────────────────────────────
@router.get("/email-unsub-rate")
def email_unsub_rate(
    data_inicial: str | None = Query(None),
    data_final:   str | None = Query(None),
    sender:       str | None = Query(None),
):
    """% descadastro por mês."""
    conn = get_conn()
    try:
        where, params = build_campaign_filters(data_inicial, data_final, sender)
        sql = (
            "SELECT strftime('%Y-%m', "
            "        substr(send_date,7,4)||'-'||substr(send_date,4,2)||'-'||substr(send_date,1,2)) AS mes, "
            "SUM(email_unique_unsubscribes)*1.0 / SUM(email_sends) AS unsub_rate "
            "FROM campaigns"
        )
        if where:
            sql += f" WHERE {where}"
        sql += " GROUP BY mes ORDER BY mes;"
        rows = conn.execute(sql, params).fetchall()
        return {"data": [
            {"mes": r["mes"], "unsub_rate": round(r["unsub_rate"] * 100, 3)} for r in rows]}
    except Exception:
        logger.exception("Error in /charts/email-unsub-rate")
        raise HTTPException(500)
    finally:
        conn.close()
