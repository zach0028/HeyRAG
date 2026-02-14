from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.config.database import get_session
from app.services.project_service import ProjectService
from app.services.conversation_service import ConversationService
from app.services.chroma_store import ChromaVectorStore


router = APIRouter(prefix="/api/projects", tags=["projects"])


class CreateProjectRequest(BaseModel):
    name: str
    system_prompt: str = ""


class UpdateProjectRequest(BaseModel):
    name: str | None = None
    system_prompt: str | None = None


class UpdateConversationRequest(BaseModel):
    title: str


@router.post("/")
async def create_project(request: CreateProjectRequest, session: AsyncSession = Depends(get_session)):
    service = ProjectService(session)
    return await service.create(request.name, request.system_prompt)


@router.get("/")
async def list_projects(session: AsyncSession = Depends(get_session)):
    service = ProjectService(session)
    return await service.list_all()


@router.get("/{project_id}")
async def get_project(project_id: UUID, session: AsyncSession = Depends(get_session)):
    service = ProjectService(session)
    project = await service.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouve")
    return project


@router.patch("/{project_id}")
async def update_project(project_id: UUID, request: UpdateProjectRequest, session: AsyncSession = Depends(get_session)):
    service = ProjectService(session)
    project = await service.update(project_id, request.name, request.system_prompt)
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouve")
    return project


@router.delete("/{project_id}")
async def delete_project(project_id: UUID, session: AsyncSession = Depends(get_session)):
    service = ProjectService(session)
    project = await service.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouve")
    try:
        store = ChromaVectorStore(project.collection_name)
        await store._get_collection()
        await store._client.delete_collection(name=project.collection_name)
    except Exception:
        pass
    await service.delete(project_id)
    return {"status": "deleted"}


@router.post("/{project_id}/conversations")
async def create_conversation(project_id: UUID, session: AsyncSession = Depends(get_session)):
    project_service = ProjectService(session)
    if not await project_service.get(project_id):
        raise HTTPException(status_code=404, detail="Projet non trouve")
    service = ConversationService(session)
    return await service.create(project_id)


@router.get("/{project_id}/conversations")
async def list_conversations(project_id: UUID, session: AsyncSession = Depends(get_session)):
    service = ConversationService(session)
    return await service.list_by_project(project_id)


@router.patch("/conversations/{conversation_id}")
async def update_conversation(conversation_id: UUID, request: UpdateConversationRequest, session: AsyncSession = Depends(get_session)):
    service = ConversationService(session)
    conversation = await service.update_title(conversation_id, request.title)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation non trouvee")
    return conversation


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: UUID, session: AsyncSession = Depends(get_session)):
    service = ConversationService(session)
    await service.delete(conversation_id)
    return {"status": "deleted"}


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: UUID, session: AsyncSession = Depends(get_session)):
    service = ConversationService(session)
    return await service.get_messages(conversation_id)
