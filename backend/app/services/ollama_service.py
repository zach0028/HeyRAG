from ollama import AsyncClient
from app.core.base_llm import BaseLLM
from app.config.settings import settings

class OllamaLLM(BaseLLM):
    def __init__(self):
        self.client = AsyncClient(host=settings.ollama_base_url)

    async def list_models(self) -> list[str]:
        response = await self.client.list()
        return [model.model for model in response.models if "embed" not in model.model]

    async def get_model_info(self, model: str) -> dict:
        response = await self.client.show(model)
        params = {}
        if hasattr(response, "model_info") and response.model_info:
            for key, value in response.model_info.items():
                if "context_length" in key:
                    params["num_ctx"] = value
                    break
        return params

    async def chat(self, messages: list[dict], model: str, options: dict = None) -> str:
        response = await self.client.chat(model=model, messages=messages, options=options or {})
        return response.message.content

    async def chat_stream(self, messages: list[dict], model: str, options: dict = None):
        stream = await self.client.chat(model=model, messages=messages, options=options or {}, stream=True)
        async for chunk in stream:
            yield chunk.message.content
