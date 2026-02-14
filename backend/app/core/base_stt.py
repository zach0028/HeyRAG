from abc import ABC, abstractmethod


class BaseSTT(ABC):

    @abstractmethod
    async def transcribe(self, audio_path: str) -> str:
        pass
