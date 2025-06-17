# backend/analytics_runner.py

import uuid
import logging
from pathlib import Path
from pydantic import BaseModel
from db_agent import analytics_crew, event_queue

# 1. Resolve the log file alongside this script
log_path = Path(__file__).parent / "analytics_runner.log"

# 2. Ensure its directory exists (it will, since it's the same folder,
#    but this pattern generalizes if you ever nest it deeper)
log_path.parent.mkdir(parents=True, exist_ok=True)

# 3. Now configure logging to write to that file
logging.basicConfig(
    filename=str(log_path),
    filemode='a',             # append (and create if missing)
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s"
)

logger = logging.getLogger(__name__)
logger.info("Starting analytics_runner…")

class AnalyticsResponse(BaseModel):
    """
    Simple response wrapper so main.py can do .dict()
    and send exactly this JSON back.
    """
    content: str

def run_analytics(user_message: str) -> AnalyticsResponse:
    tid, rid = str(uuid.uuid4()), str(uuid.uuid4())
    logger.info("▶ Run started (thread_id=%s run_id=%s): %r", tid, rid, user_message)

    # synchronous kickoff: will enqueue events into event_queue
    result = analytics_crew.kickoff(inputs={"input": user_message})

    logger.info("✔️ Crew finished, raw output: %r", result)

    resp = AnalyticsResponse(content=str(result))
    logger.info("– Returning AnalyticsResponse: %r", resp.dict())
    return resp
