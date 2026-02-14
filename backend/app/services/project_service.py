from uuid import UUID, uuid4
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.database import Project


class ProjectService:

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, name: str, system_prompt: str = "") -> Project:
        project = Project(
            name=name,
            system_prompt=system_prompt,
            collection_name=f"project_{uuid4().hex[:8]}",
        )
        self.session.add(project)
        await self.session.commit()
        await self.session.refresh(project)
        return project

    async def list_all(self) -> list[Project]:
        result = await self.session.execute(
            select(Project).order_by(Project.created_at.desc())
        )
        return list(result.scalars().all())

    async def get(self, project_id: UUID) -> Project | None:
        return await self.session.get(Project, project_id)

    async def update(self, project_id: UUID, name: str = None, system_prompt: str = None) -> Project | None:
        project = await self.session.get(Project, project_id)
        if not project:
            return None
        if name is not None:
            project.name = name
        if system_prompt is not None:
            project.system_prompt = system_prompt
        self.session.add(project)
        await self.session.commit()
        await self.session.refresh(project)
        return project

    async def delete(self, project_id: UUID) -> None:
        project = await self.session.get(Project, project_id)
        if project:
            await self.session.delete(project)
            await self.session.commit()
