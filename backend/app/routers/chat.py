from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.config.database import get_session, async_session
from app.services.ollama_service import OllamaLLM
from app.services.ollama_embedder import OllamaEmbedder
from app.services.chroma_store import ChromaVectorStore
from app.services.rag_service import RAGService
from app.services.project_service import ProjectService
from app.services.conversation_service import ConversationService
import json


router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    question: str
    model: str
    project_id: UUID
    conversation_id: UUID | None = None
    options: dict = {}


@router.post("/stream")
async def chat_stream(request: ChatRequest, session: AsyncSession = Depends(get_session)):
    project_service = ProjectService(session)
    project = await project_service.get(request.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouve")

    conv_service = ConversationService(session)

    if request.conversation_id:
        conversation_id = request.conversation_id
    else:
        title = request.question[:50] + ("..." if len(request.question) > 50 else "")
        conversation = await conv_service.create(project.id, title)
        conversation_id = conversation.id

    db_messages = await conv_service.get_messages(conversation_id)
    history = [{"role": msg.role, "content": msg.content} for msg in db_messages]

    await conv_service.add_message(conversation_id, "user", request.question)

    service = RAGService(
        llm=OllamaLLM(),
        embedder=OllamaEmbedder(),
        store=ChromaVectorStore(project.collection_name),
    )

    async def event_generator():
        full_response = ""
        sources_data = []

        yield f"data: {json.dumps({'type': 'conversation_id', 'content': str(conversation_id)})}\n\n"

        try:
            async for event in service.ask_stream(
                question=request.question,
                model=request.model,
                conversation=history,
                options=request.options,
                instruction=project.system_prompt,
            ):
                if event["type"] == "token":
                    full_response += event["content"]
                if event["type"] == "sources":
                    sources_data = event["content"]
                yield f"data: {json.dumps(event)}\n\n"

            async with async_session() as save_session:
                save_service = ConversationService(save_session)
                await save_service.add_message(conversation_id, "assistant", full_response, sources_data)

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/models")
async def list_models():
    llm = OllamaLLM()
    names = await llm.list_models()
    models = []
    for name in names:
        try:
            info = await llm.get_model_info(name)
            models.append({"name": name, "num_ctx": info.get("num_ctx", 4096)})
        except Exception:
            models.append({"name": name, "num_ctx": 4096})
    return {"models": models}
