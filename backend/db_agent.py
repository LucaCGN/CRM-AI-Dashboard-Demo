import json
import sqlite3
import logging
from pathlib import Path

from pydantic import BaseModel
from crewai import Agent, Task, Crew
from crewai.tools import tool

# — Configure logging —
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# — Pydantic model for our chat output —  
class ChatResponse(BaseModel):
    query: str
    results: list[dict]
    reasoning: str

# — SQLite helper —  
DB_PATH = Path(__file__).parent / "app.db"
def get_conn():
    return sqlite3.connect(DB_PATH)

# — Single tool: runs SELECT and returns rows as JSON —  
@tool("query_sql")
def query_sql(query: str) -> str:
    """
    Execute a SELECT query and return a JSON array of rows.
    """
    logger.info(f"Running SQL: {query}")
    if not query.strip().lower().startswith("select"):
        return json.dumps({ "error": "Only SELECT queries allowed." })
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(query)
        cols = [c[0] for c in cur.description]
        rows = cur.fetchall()
        data = [dict(zip(cols, r)) for r in rows]
        return json.dumps(data)
    except Exception as e:
        logger.exception("SQL error")
        return json.dumps({ "error": str(e) })
    finally:
        conn.close()

# — Build our Crew with the schema and a requirement to explain reasoning —  
def build_crew():
    schema_desc = (
        "orders(order_id PK, contact_id, order_date, grand_total), "
        "order_items(order_item_id PK, order_id, product_id, qty, unit_price), "
        "products(product_id PK, name, category, price), "
        "contacts(contact_id PK, email, phone, full_name, created_at)"
    )
    agent = Agent(
        role="SQL Assistant",
        goal="Translate the user’s natural‐language request into a SQL SELECT query, execute it, and explain your reasoning. In brazillian portuguese",
        backstory=(
            "You are an expert SQL assistant. Anwsers in In brazillian portuguese  \n"
            "Database schema:  \n"
            f"  • {schema_desc}.  \n"
            "No other tables exist.  \n"
            "When you respond, include three fields in your JSON:  \n"
            "  1) `query`: the SQL you generated,  \n"
            "  2) `results`: the array of rows returned,  \n"
            "  3) `reasoning`: a short explanation of why you wrote that SQL."
        ),
        tools=[query_sql],
        model="openai/gpt-4o-mini",
        verbose=False
    )

    task = Task(
        description="User asks: {input}",
        expected_output='{"query":"...","results":[{...},...],"reasoning":"..."} with contents In brazillian portuguese ',
        agent=agent,
        output_json=ChatResponse
    )

    return Crew(
        agents=[agent],
        tasks=[task],
        process="sequential",
        verbose=False
    )

# — Instantiate —  
analytics_crew = build_crew()
