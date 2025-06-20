import uuid
import logging
from pathlib import Path
from pydantic import BaseModel

from db_agent import analytics_crew, event_queue

# — Logging setup — #
log_path = Path(__file__).parent / "analytics_runner.log"
log_path.parent.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    filename=str(log_path),
    filemode='a',
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s"
)
logger = logging.getLogger(__name__)
logger.info("Starting analytics_runner…")


class AnalyticsResponse(BaseModel):
    """
    Wrapper for the analytics result so FastAPI can return .dict().
    """
    content: str


def run_analytics(user_message: str) -> AnalyticsResponse:
    tid, rid = str(uuid.uuid4()), str(uuid.uuid4())
    logger.info("▶ Run started (thread_id=%s run_id=%s): %r", tid, rid, user_message)

    # synchronous kickoff (enqueues events into event_queue)
    result = analytics_crew.kickoff(inputs={"input": user_message})

    logger.info("✔️ Crew finished, raw output: %r", result)
    resp = AnalyticsResponse(content=str(result))
    logger.info("– Returning AnalyticsResponse: %r", resp.dict())
    return resp
