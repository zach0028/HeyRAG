import asyncio
import logging
import re
import subprocess
import tempfile
import os
from app.core.base_stt import BaseSTT
from app.core.base_tts import BaseTTS
from app.services.rag_service import RAGService

logger = logging.getLogger(__name__)

MIN_SENTENCE_LENGTH = 20


def clean_for_tts(text: str) -> str:
    text = re.sub(r'\*{1,3}(.+?)\*{1,3}', r'\1', text)  # **bold**, *italic*
    text = re.sub(r'#{1,6}\s*', '', text)                  # ### titres
    text = re.sub(r'`[^`]*`', '', text)                    # `code inline`
    text = re.sub(r'^\s*[-*+]\s+', '', text, flags=re.MULTILINE)  # - listes
    text = re.sub(r'^\s*\d+\.\s+', '', text, flags=re.MULTILINE)  # 1. listes
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)  # [liens](url)
    text = re.sub(r'[^\w\s.,;:!?\'"()\-/àâäéèêëïîôùûüÿçœæ]', '', text)  # emojis et symboles
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def split_sentences(buffer: str) -> tuple[str | None, str]:
    if len(buffer) < MIN_SENTENCE_LENGTH:
        return None, buffer
    for i, char in enumerate(buffer):
        if char in ".!?" and i >= MIN_SENTENCE_LENGTH - 1:
            next_idx = i + 1
            if next_idx < len(buffer) and buffer[next_idx] == " ":
                return buffer[:next_idx].strip(), buffer[next_idx:].lstrip()
        if buffer[i:i + 2] == "\n\n":
            sentence = buffer[:i].strip()
            if sentence:
                return sentence, buffer[i + 2:]
    return None, buffer


class VoiceService:

    def __init__(self, stt: BaseSTT, tts: BaseTTS, rag: RAGService):
        self.stt = stt
        self.tts = tts
        self.rag = rag

    async def transcribe(self, audio_bytes: bytes, suffix: str = ".webm") -> str:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        wav_path = tmp.name.replace(suffix, ".wav")
        try:
            tmp.write(audio_bytes)
            tmp.close()
            result = await asyncio.to_thread(
                subprocess.run,
                ["ffmpeg", "-i", tmp.name, "-ar", "16000", "-ac", "1", wav_path, "-y"],
                capture_output=True,
            )
            if result.returncode != 0:
                raise RuntimeError(f"ffmpeg échoué: {result.stderr.decode()}")
            if not os.path.exists(wav_path):
                raise RuntimeError("ffmpeg n'a pas produit de fichier WAV")
            return await self.stt.transcribe(wav_path)
        finally:
            os.unlink(tmp.name)
            if os.path.exists(wav_path):
                os.unlink(wav_path)

    async def ask_stream(self, question: str, model: str, conversation: list[dict] = None, options: dict = None, instruction: str = ""):
        buffer = ""
        in_code_block = False

        async for event in self.rag.ask_stream(question, model, conversation, options, instruction):
            if event["type"] == "sources":
                if buffer.strip() and not in_code_block:
                    result = await self._safe_synthesize(buffer.strip())
                    if result:
                        yield result
                yield event
                return

            token = event["content"]
            yield event

            buffer += token
            if "```" in token:
                in_code_block = not in_code_block
            if in_code_block:
                continue

            sentence, buffer = split_sentences(buffer)
            if sentence:
                result = await self._safe_synthesize(sentence)
                if result:
                    yield result

    async def _safe_synthesize(self, text: str) -> dict | None:
        try:
            text = clean_for_tts(text)
            if not text:
                return None
            wav, sr = await self.tts.synthesize(text)
            return {"type": "audio", "content": wav, "sample_rate": sr}
        except Exception as e:
            logger.warning("TTS échoué pour '%s...': %s", text[:50], e)
            return None
