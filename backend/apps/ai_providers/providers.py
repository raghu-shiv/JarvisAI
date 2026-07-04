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
            "Hello Mr. Stark, this is a mock response generated asynchronously to simulate streaming behavior "
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
                if not chunk.choices:
                    continue
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


class OpenRouterProvider(AIProvider):
    provider_name = "openrouter"
    allowed_models = {
        "liquid/lfm-2.5-1.2b-instruct:free",
        "qwen/qwen3-next-80b-a3b-instruct:free",
        "openai/gpt-oss-120b:free",
    }

    def __init__(self) -> None:
        self.model = settings.OPENROUTER_MODEL
        self.temperature = settings.OPENROUTER_TEMPERATURE
        self.max_tokens = settings.OPENROUTER_MAX_TOKENS

        if not settings.OPENROUTER_API_KEY:
            raise AIProviderConfigError("OpenRouter provider is selected, but OPENROUTER_API_KEY is not configured.")
        if self.model not in self.allowed_models:
            allowed = "', '".join(sorted(self.allowed_models))
            raise AIProviderConfigError(f"Unsupported OPENROUTER_MODEL '{self.model}'. Use '{allowed}'.")

    async def stream_chat(self, messages: list[dict[str, str]]) -> AsyncIterator[str]:
        from openai import APIConnectionError, APIStatusError, APITimeoutError, AsyncOpenAI, OpenAIError

        client = AsyncOpenAI(
            api_key=settings.OPENROUTER_API_KEY,
            base_url=settings.OPENROUTER_BASE_URL,
            timeout=settings.OPENROUTER_TIMEOUT_SECONDS,
            default_headers={
                "HTTP-Referer": settings.OPENROUTER_HTTP_REFERER,
                "X-OpenRouter-Title": settings.OPENROUTER_APP_TITLE,
            },
        )
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
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
        except APITimeoutError as exc:
            raise AIProviderError("OpenRouter request timed out. Please try again.") from exc
        except APIConnectionError as exc:
            raise AIProviderError("Could not connect to OpenRouter. Please check network connectivity.") from exc
        except APIStatusError as exc:
            if exc.status_code == 429:
                raise AIProviderError(
                    "OpenRouter is rate limiting this free model. Try again later or switch to the other configured OpenRouter free model."
                ) from exc
            raise AIProviderError(f"OpenRouter returned an error status: {exc.status_code}.") from exc
        except OpenAIError as exc:
            raise AIProviderError("OpenRouter request failed. Please try again.") from exc


def get_ai_provider() -> AIProvider:
    provider = settings.AI_PROVIDER.strip().lower()
    if provider == "openrouter":
        return OpenRouterProvider()
    if provider == "openai":
        return OpenAIProvider()
    if provider == "mock":
        return MockProvider()
    raise AIProviderConfigError(f"Unsupported AI_PROVIDER '{settings.AI_PROVIDER}'. Use 'mock', 'openai', or 'openrouter'.")
