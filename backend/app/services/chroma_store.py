import uuid
import chromadb
from app.core.base_vector_store import BaseVectorStore, Chunk
from app.config.settings import settings


class ChromaVectorStore(BaseVectorStore):

    def __init__(self, collection_name: str):
        self.collection_name = collection_name
        self._client = None
        self._collection = None

    async def _get_collection(self):
        if self._client is None:
            self._client = await chromadb.AsyncHttpClient(
                host=settings.chroma_host,
                port=settings.chroma_port,
            )
        if self._collection is None:
            self._collection = await self._client.get_or_create_collection(
                name=self.collection_name
            )
        return self._collection

    async def add_documents(self, chunks: list[Chunk]) -> None:
        collection = await self._get_collection()
        await collection.add(
            ids=[str(uuid.uuid4()) for _ in chunks],
            documents=[chunk.text for chunk in chunks],
            embeddings=[chunk.embedding for chunk in chunks],
            metadatas=[chunk.metadata for chunk in chunks],
        )

    async def query(self, embedding: list[float], top_k: int = 5) -> list[Chunk]:
        collection = await self._get_collection()
        results = await collection.query(
            query_embeddings=[embedding],
            n_results=top_k,
            include=["documents", "metadatas", "distances"],
        )
        chunks = []
        for i in range(len(results["documents"][0])):
            chunks.append(Chunk(
                text=results["documents"][0][i],
                embedding=[],
                metadata=results["metadatas"][0][i],
                score=results["distances"][0][i],
            ))
        return chunks

    async def delete_document(self, document_id: str) -> None:
        collection = await self._get_collection()
        await collection.delete(where={"document_id": document_id})

    async def list_documents(self) -> list[dict]:
        collection = await self._get_collection()
        results = await collection.get()
        documents = {}
        for metadata in results["metadatas"]:
            doc_id = metadata.get("document_id")
            if doc_id and doc_id not in documents:
                documents[doc_id] = metadata
        return list(documents.values())
