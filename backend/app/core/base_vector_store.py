
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class Chunk:
    text: str
    embedding: list[float]
    metadata: dict
    score: float = 0.0


class BaseVectorStore(ABC):

    @abstractmethod
    async def add_documents(self, chunks: list[Chunk]) -> None:
        pass

    @abstractmethod
    async def query(self, embedding: list[float], top_k: int = 5) -> list[Chunk]:
        pass

    @abstractmethod
    async def delete_document(self, document_id: str) -> None:
        pass

    @abstractmethod
    async def list_documents(self) -> list[dict]:
        pass
