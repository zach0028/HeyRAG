from uuid import UUID
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.database import Conversation, Message


class ConversationService:

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, project_id: UUID, title: str = "Nouvelle conversation") -> Conversation:
        conversation = Conversation(project_id=project_id, title=title)
        self.session.add(conversation)
        await self.session.commit()
        await self.session.refresh(conversation)
        return conversation

    async def list_by_project(self, project_id: UUID) -> list[Conversation]:
        result = await self.session.execute(
            select(Conversation)
            .where(Conversation.project_id == project_id)
            .order_by(Conversation.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_messages(self, conversation_id: UUID) -> list[Message]:
        result = await self.session.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
        )
        return list(result.scalars().all())

    async def add_message(self, conversation_id: UUID, role: str, content: str, sources: list = None) -> Message:
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            sources=sources or [],
        )
        self.session.add(message)
        await self.session.commit()
        await self.session.refresh(message)
        return message

    async def update_title(self, conversation_id: UUID, title: str) -> Conversation | None:
        conversation = await self.session.get(Conversation, conversation_id)
        if not conversation:
            return None
        conversation.title = title
        self.session.add(conversation)
        await self.session.commit()
        await self.session.refresh(conversation)
        return conversation

    async def delete(self, conversation_id: UUID) -> None:
        conversation = await self.session.get(Conversation, conversation_id)
        if conversation:
            await self.session.delete(conversation)
            await self.session.commit()
