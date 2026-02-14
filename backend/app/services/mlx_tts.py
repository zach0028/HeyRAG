import asyncio
import io
import logging
import threading
import numpy as np
import soundfile as sf
from mlx_audio.tts.utils import load_model as load_tts_model
from app.core.base_tts import BaseTTS
from app.config.settings import settings

logger = logging.getLogger(__name__)


class MlxTTS(BaseTTS):

    def __init__(self):
        self._model_id = settings.kokoro_model
        self._voice = settings.kokoro_voice
        self._speed = settings.tts_speed
        self._model = None
        self._lock = threading.Lock()

    def _load_model(self):
        if self._model is None:
            with self._lock:
                if self._model is None:
                    logger.info("Chargement Kokoro : %s", self._model_id)
                    self._model = load_tts_model(self._model_id)
        return self._model

    def _synthesize_sync(self, text: str) -> tuple[bytes, int]:
        model = self._load_model()
        audio_chunks = []
        sample_rate = 24000
        for result in model.generate(text, voice=self._voice, speed=self._speed, lang_code='f'):
            audio_chunks.append(np.array(result.audio))
            sample_rate = result.sample_rate
        audio = np.concatenate(audio_chunks)
        buffer = io.BytesIO()
        sf.write(buffer, audio, sample_rate, format="WAV")
        return buffer.getvalue(), sample_rate

    async def synthesize(self, text: str) -> tuple[bytes, int]:
        return await asyncio.to_thread(self._synthesize_sync, text)
