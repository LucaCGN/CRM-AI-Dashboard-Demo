"""
load_db.py  ─────────────────────────────────────────────────────────────
(Re)builds backend/app.db from the four CSVs in backend/tables.

• Called automatically by main.py on FastAPI start-up, but you can also
  run it by hand:  >>> python backend/load_db.py
• Includes an explicit SQL DDL block (SCHEMA_DDL) so the schema remains
  documented in-repo even though we still rely on pandas.to_sql() to do
  the heavy lifting.

Author: Luca + ChatGPT
"""
from pathlib import Path
import sqlite3

import pandas as pd

CSV_DIR = Path(__file__).parent / "tables"
DB_PATH  = Path(__file__).parent / "app.db"

# ── 1.  Human-readable schema definition (purely for documentation) ──
SCHEMA_DDL = """
-- contacts ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
    contact_id   INTEGER PRIMARY KEY,
    full_name    TEXT,
    email        TEXT UNIQUE,
    phone        TEXT,
    created_at   TEXT
);

-- products ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    product_id   INTEGER PRIMARY KEY,
    name         TEXT,
    category     TEXT,
    unit_price   REAL
);

-- orders --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    order_id     INTEGER PRIMARY KEY,
    contact_id   INTEGER,
    order_date   TEXT,
    total        REAL,
    FOREIGN KEY (contact_id) REFERENCES contacts(contact_id)
);

-- order_items ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id INTEGER PRIMARY KEY,
    order_id      INTEGER,
    product_id    INTEGER,
    quantity      INTEGER,
    line_total    REAL,
    FOREIGN KEY (order_id)   REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);
"""


# ── 2.  (Re)populate ---------------------------------------------------------
def populate_db() -> None:
    """Drop / recreate all four tables from CSV files."""
    conn = sqlite3.connect(DB_PATH)
    cur  = conn.cursor()

    # Apply the DDL so we always have the structure on disk
    cur.executescript(SCHEMA_DDL)

    # Load each CSV with pandas and shove into SQLite
    for tbl in ["contacts", "products", "orders", "order_items","campaigns"]:
        csv_path = CSV_DIR / f"{tbl}.csv"
        if not csv_path.exists():
            raise FileNotFoundError(f"CSV não encontrado: {csv_path}")

        df = pd.read_csv(csv_path)
        df.to_sql(tbl, conn, if_exists="replace", index=False)
        print(f"  • {tbl:<12}  {len(df):>6,} linhas")

    conn.commit()
    conn.close()
    print("✅  app.db criado / atualizado.")


# ── 3.  CLI helper -----------------------------------------------------------
if __name__ == "__main__":
    populate_db()
