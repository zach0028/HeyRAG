from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, JSON
from uuid import uuid4, UUID
from datetime import datetime, UTC


def utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class Project(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str
    system_prompt: str = ""
    collection_name: str = Field(unique=True)
    created_at: datetime = Field(default_factory=utcnow)

    conversations: list["Conversation"] = Relationship(
        back_populates="project",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class Conversation(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    project_id: UUID = Field(foreign_key="project.id")
    title: str = "Nouvelle conversation"
    created_at: datetime = Field(default_factory=utcnow)

    project: Project = Relationship(back_populates="conversations")
    messages: list["Message"] = Relationship(
        back_populates="conversation",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class Message(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    conversation_id: UUID = Field(foreign_key="conversation.id")
    role: str
    content: str
    sources: list = Field(default=[], sa_column=Column(JSON, default=[]))
    created_at: datetime = Field(default_factory=utcnow)

    conversation: Conversation = Relationship(back_populates="messages")
