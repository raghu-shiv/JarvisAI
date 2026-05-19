import asyncio
from abc import ABC, abstractmethod
from collections.abc import AsyncIterator

from django.conf import settings


class AIProviderError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class AIProviderConfigError(AIProviderError):
    pass


class AIProvider(ABC):
    provider_name: str
    model: str

    @abstractmethod
    async def stream_chat(self, messages: list[dict[str, str]]) -> AsyncIterator[str]:
        raise NotImplementedError


class MockProvider(AIProvider):
    provider_name = "mock"

    def __init__(self) -> None:
        self.model = settings.MOCK_AI_MODEL

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
    provider_name = "openai"

    def __init__(self) -> None:
        self.model = settings.OPENAI_MODEL
        self.temperature = settings.OPENAI_TEMPERATURE
        self.max_tokens = settings.OPENAI_MAX_TOKENS

        if not settings.OPENAI_API_KEY:
            raise AIProviderConfigError("OpenAI provider is selected, but OPENAI_API_KEY is not configured.")

    async def stream_chat(self, messages: list[dict[str, str]]) -> AsyncIterator[str]:
        from openai import APIConnectionError, APIStatusError, APITimeoutError, AsyncOpenAI, OpenAIError

        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY, timeout=settings.OPENAI_TIMEOUT_SECONDS)
        request = {
            "model": self.model,
            "messages": messages,
            "stream": True,
            "temperature": self.temperature,
        }
        if self.max_tokens > 0:
            request["max_tokens"] = self.max_tokens

        try:
            stream = await client.chat.completions.create(**request)
            async for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
        except APITimeoutError as exc:
            raise AIProviderError("OpenAI request timed out. Please try again.") from exc
        except APIConnectionError as exc:
            raise AIProviderError("Could not connect to OpenAI. Please check network connectivity.") from exc
        except APIStatusError as exc:
            raise AIProviderError(f"OpenAI returned an error status: {exc.status_code}.") from exc
        except OpenAIError as exc:
            raise AIProviderError("OpenAI request failed. Please try again.") from exc


def get_ai_provider() -> AIProvider:
    provider = settings.AI_PROVIDER.strip().lower()
    if provider == "openai":
        return OpenAIProvider()
    if provider == "mock":
        return MockProvider()
    raise AIProviderConfigError(f"Unsupported AI_PROVIDER '{settings.AI_PROVIDER}'. Use 'mock' or 'openai'.")
