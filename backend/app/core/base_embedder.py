from abc import ABC, abstractmethod
class BaseEmbedder(ABC):

    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        pass

    @abstractmethod
    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        pass
