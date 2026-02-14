from abc import ABC, abstractmethod


class BaseTTS(ABC):

    @abstractmethod
    async def synthesize(self, text: str) -> tuple[bytes, int]:
        pass
