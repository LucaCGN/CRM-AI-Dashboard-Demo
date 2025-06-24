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
    final_answer: str
    
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
        "contacts("
            "contact_id PK INTEGER 1–60, "
            "email TEXT e.g. uma.brown1@example.com, leo.davis2@example.com, rose.perez3@example.com, yara.smith4@example.com, "
            "phone TEXT e.g. 12055295904–19800052419, "
            "full_name TEXT e.g. Uma Brown, Leo Davis, Rose Perez, Yara Smith, "
            "created_at DATETIME e.g. 2023-02-15T16:12:35, 2024-11-18T08:33:50, 2023-03-26T04:41:12, 2023-09-07T10:25:57"
        "), "
        "products("
            "product_id PK INTEGER 1–120, "
            "name TEXT e.g. Runner Sneaker Alpha, Canvas Sneaker Beta, Leather Boot Cedar, Trail Boot Delta, "
            "category TEXT e.g. Footwear, Apparel, Accessories, Home, "
            "price DECIMAL e.g. 5.99–399.00"
        "), "
        "orders("
            "order_id PK INTEGER 1–200, "
            "contact_id FK→contacts.contact_id INTEGER 1–60, "
            "order_date DATETIME e.g. 2023-08-20T20:34:49, 2024-09-03T10:08:42, 2024-12-08T15:35:10, 2023-12-24T12:33:55, "
            "grand_total DECIMAL e.g. 17.64–1728.90"
        "), "
        "order_items("
            "order_item_id PK INTEGER 1–541, "
            "order_id FK→orders.order_id INTEGER 1–200, "
            "product_id FK→products.product_id INTEGER 1–120, "
            "qty INTEGER 1–3, "
            "unit_price DECIMAL 0.00–399.00"
        "), "
        "campaigns("
            "send_date DATE e.g. 30/03/2025, 02/05/2025, 29/01/2025, 17/03/2025, "
            "email_job_id PK INTEGER 4000109–4999666, "
            "email_sender_name TEXT e.g. Relacionamento, Equipe Vendas, Equipe CRM, Newsletter Especial, "
            "email_content_name TEXT e.g. CAMPANHA 2025 - Volta às Aulas, CAMPANHA 2025 - Férias, CAMPANHA 2025 - Black Friday, CAMPANHA 2025 - Natal, "
            "email_subject TEXT e.g. Corre! Estoques limitados para volta às aulas, Você foi selecionado(a) para descontos de férias, Últimos dias da promoção black friday, Preços imperdíveis nesta férias, "
            "email_sends INTEGER 6 363–798 938, "
            "email_unique_opens INTEGER 1 446–320 239, "
            "email_unique_clicks INTEGER 137–61 783, "
            "email_unique_unsubscribes INTEGER 3–1 968"
        ")"
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
        expected_output='{"query":"...","results":[{...},...],"reasoning":"...", "final_answer":"..."} with contents In brazillian portuguese ',
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
