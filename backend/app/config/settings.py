from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ollama_base_url: str = "http://localhost:11434"
    ollama_embed_model: str = "nomic-embed-text"
    chroma_host: str = "localhost"
    chroma_port: int = 8001
    database_url: str = "postgresql+asyncpg://heyrag:heyrag@localhost:5432/heyrag"
    whisper_model: str = "mlx-community/whisper-large-v3-turbo"
    kokoro_model: str = "prince-canuma/Kokoro-82M"
    kokoro_voice: str = "ff_siwis"
    tts_speed: float = 1.0

    class Config:
        env_file = ".env"


settings = Settings()
