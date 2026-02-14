import uuid
from pathlib import Path
from uuid import UUID
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.config.database import get_session
from app.services.ollama_embedder import OllamaEmbedder
from app.services.chroma_store import ChromaVectorStore
from app.services.document_service import DocumentService
from app.services.project_service import ProjectService


router = APIRouter(prefix="/api/documents", tags=["documents"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}
MAX_FILE_SIZE = 50 * 1024 * 1024


@router.post("/upload")
async def upload_document(
    project_id: UUID,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
):
    project_service = ProjectService(session)
    project = await project_service.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouve")

    extension = Path(file.filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Format non supporte : {extension}")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Fichier trop volumineux (max 50 Mo)")

    safe_filename = f"{uuid.uuid4()}{extension}"
    file_path = UPLOAD_DIR / safe_filename
    with open(file_path, "wb") as f:
        f.write(content)

    try:
        service = DocumentService(
            embedder=OllamaEmbedder(),
            store=ChromaVectorStore(project.collection_name),
        )
        result = await service.upload(str(file_path), file.filename)
        return result
    finally:
        file_path.unlink(missing_ok=True)


@router.get("/")
async def list_documents(project_id: UUID, session: AsyncSession = Depends(get_session)):
    project_service = ProjectService(session)
    project = await project_service.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouve")
    service = DocumentService(
        embedder=OllamaEmbedder(),
        store=ChromaVectorStore(project.collection_name),
    )
    return await service.list_documents()


@router.delete("/{document_id}")
async def delete_document(document_id: str, project_id: UUID, session: AsyncSession = Depends(get_session)):
    project_service = ProjectService(session)
    project = await project_service.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouve")
    service = DocumentService(
        embedder=OllamaEmbedder(),
        store=ChromaVectorStore(project.collection_name),
    )
    await service.delete_document(document_id)
    return {"status": "deleted", "document_id": document_id}
