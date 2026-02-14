import uuid
from app.services.file_parser import FileParser
from app.services.chunker import Chunker
from app.core.base_embedder import BaseEmbedder
from app.core.base_vector_store import BaseVectorStore, Chunk


class DocumentService:

    def __init__(self, embedder: BaseEmbedder, store: BaseVectorStore):
        self.parser = FileParser()
        self.chunker = Chunker()
        self.embedder = embedder
        self.store = store

    async def upload(self, file_path: str, filename: str) -> dict:
        document_id = str(uuid.uuid4())

        text = self.parser.parse(file_path)
        texts = self.chunker.chunk(text)
        embeddings = await self.embedder.embed_batch(texts)

        chunks = [
            Chunk(
                text=t,
                embedding=e,
                metadata={"document_id": document_id, "filename": filename, "chunk_index": i},
            )
            for i, (t, e) in enumerate(zip(texts, embeddings))
        ]

        await self.store.add_documents(chunks)

        return {"document_id": document_id, "filename": filename, "chunks_count": len(chunks)}

    async def list_documents(self) -> list[dict]:
        return await self.store.list_documents()

    async def delete_document(self, document_id: str) -> None:
        await self.store.delete_document(document_id)
