import asyncio
from abc import ABC, abstractmethod
from collections.abc import AsyncIterator

from django.conf import settings


class AIProvider(ABC):
    @abstractmethod
    async def stream_chat(self, messages: list[dict[str, str]]) -> AsyncIterator[str]:
        raise NotImplementedError


class MockProvider(AIProvider):
    async def stream_chat(self, messages: list[dict[str, str]]) -> AsyncIterator[str]:
        last_user_message = next((message["content"] for message in reversed(messages) if message["role"] == "user"), "")
        response = (
            "Mock Jarvis response. I received your message and would normally stream "
            f"from the configured AI provider. Your last message was: {last_user_message}"
        )
        for token in response.split(" "):
            await asyncio.sleep(0.04)
            yield token + " "


class OpenAIProvider(AIProvider):
    async def stream_chat(self, messages: list[dict[str, str]]) -> AsyncIterator[str]:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        stream = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta


def get_ai_provider() -> AIProvider:
    if settings.AI_PROVIDER == "openai":
        return OpenAIProvider()
    return MockProvider()
