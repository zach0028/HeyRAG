import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.documents import router as documents_router
from app.routers.chat import router as chat_router
from app.routers.projects import router as projects_router
from app.routers.voice import router as voice_router
from app.config.database import init_db
from app.models.database import Project, Conversation, Message
from app.services.mlx_stt import MlxSTT
from app.services.mlx_tts import MlxTTS

#CORSMiddleware ; communication front / back

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    app.state.stt = MlxSTT()
    app.state.tts = MlxTTS()
    app.state.voice_semaphore = asyncio.Semaphore(1)
    yield


app = FastAPI(title="HeyRAG API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], #autorise uniquement le front
    allow_methods=["*"], #autorisations de toutes les méthodes HTTP : GET, POST, DELETE...
    allow_headers=["*"],
)
#ici on résoud le pb de sécurité de la CORS (Cross-Origin resource sharing) qui vise à séparer les deux ports, le but est de poser une autorisation pour que le front communique avec le back

app.include_router(documents_router)
app.include_router(chat_router)
app.include_router(projects_router)
app.include_router(voice_router)

@app.get("/health") #déclare un route GET sur health via le décorateur @
async def health(): #async => fct asynchrone qui permet de gérer plusieurs requêtes paralleles sans bloquer
    return {"status": "ok", "service": "heyrag-api"}
