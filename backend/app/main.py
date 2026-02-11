from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

#CORSMiddleware => Autorise frontend (port 3000) à parler au backend (port 8000)

app = FastAPI(title="HeyRAG API", version="0.1.0")
#ici on pose une instanciation d'un objet fastAPI auquel est rataché @app.get ; @app.routes

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], #autorise uniquement le front
    allow_methods=["*"], #autorisations de toutes les méthodes HTTP : GET, POST, DELETE...
    allow_headers=["*"],
)
#ici on résoud le pb de sécurité de la CORS (Cross-Origin resource sharing) qui vise à séparer les deux ports, le but est de poser une autorisation pour que le front communique avec le back

@app.get("/health") #déclare un route GET sur health via le décorateur @
async def health(): #async => fct asynchrone qui permet de gérer plusieurs requêtes paralleles sans bloquer
    return {"status": "ok", "service": "heyrag-api"}
