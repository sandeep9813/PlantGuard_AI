import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

load_dotenv()

from controllers.auth_controller import router as auth_router, limiter
from controllers.chatbot_controller import router as chatbot_router
from controllers.dashboard_controller import router as dashboard_router
from controllers.history_controller import router as history_router
from controllers.prediction_controller import router as prediction_router
from controllers.tips_controller import router as tips_router
from controllers.chat_history_controller import router as chat_history_router
from chat.chat_router import router as ollama_chat_router
from services.app_services import app_services
from database.engine import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    import database.models  # registers models with Base
    Base.metadata.create_all(bind=engine)
    app_services.startup()
    yield
    app_services.shutdown()


app = FastAPI(
    title="PlantGuard AI Backend",
    description="FastAPI backend serving Plant Disease Detection and AI Chat advice.",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

heatmaps_dir = Path(__file__).resolve().parent / "storage" / "heatmaps"
heatmaps_dir.mkdir(parents=True, exist_ok=True)
app.mount("/heatmaps", StaticFiles(directory=str(heatmaps_dir)), name="heatmaps")

uploads_dir = Path(__file__).resolve().parent / "storage" / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

app.include_router(auth_router)
app.include_router(prediction_router)
app.include_router(chatbot_router)
app.include_router(ollama_chat_router)
app.include_router(chat_history_router)
app.include_router(history_router)
app.include_router(dashboard_router)
app.include_router(tips_router)


@app.get("/")
async def root():
    return app_services.health()
