from ollama import AsyncClient
from app.core.base_embedder import BaseEmbedder
from app.config.settings import settings


class OllamaEmbedder(BaseEmbedder):

    def __init__(self):
        self.client = AsyncClient(host=settings.ollama_base_url)
        self.model = settings.ollama_embed_model

    async def embed(self, text: str) -> list[float]:
        response = await self.client.embed(model=self.model, input=text)
        return response.embeddings[0]

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        response = await self.client.embed(model=self.model, input=texts)
        return response.embeddings
