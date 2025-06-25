# backend/main.py ─── app factory & chat

import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from db_agent import analytics_crew          # ← your CrewAI integration
from analytics import router as analytics_router
from campaigns import router as campaigns_router

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s"
)
logger = logging.getLogger("backend")

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(title="Dashboard AI – Backend")

# ── CORS (only really needed if you ever call from another domain) ────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten to your domain in prod if you like
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount your routers (they themselves define the /charts/* paths)
app.include_router(analytics_router)
app.include_router(campaigns_router)

# ── Chat (LLM) endpoint ───────────────────────────────────────────────────────
@app.post("/chat")
async def chat_json(request: Request):
    """
    Body:  { "message": "<user query>" }
    Reply: { "query": "<SQL>", "results": [...], "reasoning": "..." }
    """
    payload = await request.json()
    user_message = payload.get("message")
    if not user_message:
        raise HTTPException(400, detail="Field 'message' is required.")

    try:
        crew_output = analytics_crew.kickoff({"input": user_message})
        return JSONResponse(crew_output.dict())
    except Exception as exc:
        logger.exception("Error in /chat")
        raise HTTPException(500, detail="Internal Server Error") from exc
