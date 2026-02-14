from abc import ABC, abstractmethod

class BaseLLM(ABC):
    @abstractmethod
    async def list_models(self) -> list[str]:
        pass

    @abstractmethod
    async def chat(self, messages: list[dict], model: str, options: dict = None) -> str:
        pass

    @abstractmethod
    async def chat_stream(self, messages: list[dict], model: str, options: dict = None):
        pass
