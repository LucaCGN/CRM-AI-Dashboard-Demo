import pandas as pd
import sqlite3
from pathlib import Path

CSV_DIR = Path(__file__).parent / "tables"
conn = sqlite3.connect(Path(__file__).parent / "app.db")

for tbl in ["contacts","products","orders","order_items"]:
    df = pd.read_csv(CSV_DIR / f"{tbl}.csv")
    df.to_sql(tbl, conn, if_exists="replace", index=False)

conn.close()
print("✅ app.db criado com as tabelas: contacts, products, orders, order_items")
