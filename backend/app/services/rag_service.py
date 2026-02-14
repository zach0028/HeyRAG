from app.core.base_llm import BaseLLM
from app.core.base_embedder import BaseEmbedder
from app.core.base_vector_store import BaseVectorStore


DEFAULT_INSTRUCTION = """Tu es HeyRAG, un assistant intelligent et polyvalent.
Quand des documents sont fournis, base-toi dessus pour repondre.
Si aucun document n'est fourni, reponds en utilisant tes connaissances generales.
Reponds de maniere precise et concise."""

DEFAULT_INSTRUCTION_NO_DOCS = """Tu es HeyRAG, un assistant intelligent et polyvalent.
Aucun document n'est disponible pour cette conversation.
Reponds en utilisant tes connaissances generales.
Reponds de maniere precise et concise."""

CONTEXT_TEMPLATE = """{instruction}

--- DOCUMENTS ---
{context}
---"""

MAX_DISTANCE = 1.5


class RAGService:

    def __init__(self, llm: BaseLLM, embedder: BaseEmbedder, store: BaseVectorStore):
        self.llm = llm
        self.embedder = embedder
        self.store = store

    async def _retrieve(self, question: str, top_k: int = 5):
        embedding = await self.embedder.embed(question)
        chunks = await self.store.query(embedding, top_k=top_k)
        return [chunk for chunk in chunks if chunk.score < MAX_DISTANCE]

    def _build_messages(self, question: str, chunks, conversation: list[dict] = None, instruction: str = ""):
        if chunks:
            context = "\n\n".join([chunk.text for chunk in chunks])
            system_content = CONTEXT_TEMPLATE.format(
                instruction=instruction or DEFAULT_INSTRUCTION,
                context=context,
            )
        else:
            system_content = instruction or DEFAULT_INSTRUCTION_NO_DOCS
        messages = [{"role": "system", "content": system_content}]
        if conversation:
            messages.extend(conversation)
        messages.append({"role": "user", "content": question})
        return messages

    def _extract_sources(self, chunks) -> list[dict]:
        sources = []
        seen = set()
        for chunk in chunks:
            filename = chunk.metadata.get("filename", "inconnu")
            chunk_index = chunk.metadata.get("chunk_index", 0)
            key = f"{filename}_{chunk_index}"
            if key not in seen:
                seen.add(key)
                sources.append({"filename": filename, "chunk_index": chunk_index})
        return sources

    async def ask(self, question: str, model: str, conversation: list[dict] = None, options: dict = None, instruction: str = "") -> dict:
        chunks = await self._retrieve(question)
        messages = self._build_messages(question, chunks, conversation, instruction)
        answer = await self.llm.chat(messages, model, options)
        sources = self._extract_sources(chunks) if chunks else []
        return {"answer": answer, "sources": sources}

    async def ask_stream(self, question: str, model: str, conversation: list[dict] = None, options: dict = None, instruction: str = ""):
        chunks = await self._retrieve(question)
        messages = self._build_messages(question, chunks, conversation, instruction)
        sources = self._extract_sources(chunks) if chunks else []
        async for token in self.llm.chat_stream(messages, model, options):
            yield {"type": "token", "content": token}
        yield {"type": "sources", "content": sources}
