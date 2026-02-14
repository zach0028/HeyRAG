import asyncio
import logging
import threading
from mlx_audio.stt.generate import load_model as load_stt_model
from app.core.base_stt import BaseSTT
from app.config.settings import settings

logger = logging.getLogger(__name__)


class MlxSTT(BaseSTT):

    def __init__(self):
        self._model_id = settings.whisper_model
        self._model = None
        self._lock = threading.Lock()

    def _load_model(self):
        if self._model is None:
            with self._lock:
                if self._model is None:
                    logger.info("Chargement Whisper : %s", self._model_id)
                    self._model = load_stt_model(self._model_id)
        return self._model

    def _transcribe_sync(self, audio_path: str) -> str:
        model = self._load_model()
        result = model.generate(audio_path, language="fr")
        return result.text.strip()

    async def transcribe(self, audio_path: str) -> str:
        return await asyncio.to_thread(self._transcribe_sync, audio_path)
