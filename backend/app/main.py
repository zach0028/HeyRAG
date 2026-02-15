import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.documents import router as documents_router
from app.routers.chat import router as chat_router
from app.routers.projects import router as projects_router
from app.config.database import init_db
from app.models.database import Project, Conversation, Message

try:
    from app.services.mlx_stt import MlxSTT
    from app.services.mlx_tts import MlxTTS
    MLX_AVAILABLE = True
except ImportError:
    MLX_AVAILABLE = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    if MLX_AVAILABLE:
        app.state.stt = MlxSTT()
        app.state.tts = MlxTTS()
        app.state.voice_semaphore = asyncio.Semaphore(1)
    yield


app = FastAPI(title="HeyRAG API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents_router)
app.include_router(chat_router)
app.include_router(projects_router)

if MLX_AVAILABLE:
    from app.routers.voice import router as voice_router
    app.include_router(voice_router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "heyrag-api",
        "voice": MLX_AVAILABLE,
    }
