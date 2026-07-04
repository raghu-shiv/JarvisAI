import asyncio

from django.test import SimpleTestCase, override_settings

from apps.ai_providers.providers import AIProviderConfigError, MockProvider, OpenRouterProvider, get_ai_provider


class AIProviderTests(SimpleTestCase):
    def test_mock_provider_streams_response_with_configured_model(self):
        async def collect_response():
            with override_settings(MOCK_AI_MODEL="mock-test-model"):
                provider = MockProvider()
                chunks = [
                    chunk
                    async for chunk in provider.stream_chat(
                        [{"role": "user", "content": "Summarize our architecture."}]
                    )
                ]
                return provider, "".join(chunks)

        provider, response = asyncio.run(collect_response())

        self.assertEqual(provider.provider_name, "mock")
        self.assertEqual(provider.model, "mock-test-model")
        self.assertIn("Summarize our architecture.", response)

    @override_settings(AI_PROVIDER="openai", OPENAI_API_KEY="")
    def test_openai_provider_requires_api_key(self):
        with self.assertRaisesMessage(AIProviderConfigError, "OPENAI_API_KEY is not configured"):
            get_ai_provider()

    @override_settings(AI_PROVIDER="openrouter", OPENROUTER_API_KEY="")
    def test_openrouter_provider_requires_api_key(self):
        with self.assertRaisesMessage(AIProviderConfigError, "OPENROUTER_API_KEY is not configured"):
            get_ai_provider()

    @override_settings(
        AI_PROVIDER="openrouter",
        OPENROUTER_API_KEY="test-key",
        OPENROUTER_MODEL="liquid/lfm-2.5-1.2b-instruct:free",
    )
    def test_openrouter_provider_uses_supported_free_model(self):
        provider = get_ai_provider()

        self.assertIsInstance(provider, OpenRouterProvider)
        self.assertEqual(provider.provider_name, "openrouter")
        self.assertEqual(provider.model, "liquid/lfm-2.5-1.2b-instruct:free")

    @override_settings(
        AI_PROVIDER="openrouter",
        OPENROUTER_API_KEY="test-key",
        OPENROUTER_MODEL="paid-provider/model",
    )
    def test_openrouter_provider_rejects_unsupported_model(self):
        with self.assertRaisesMessage(AIProviderConfigError, "Unsupported OPENROUTER_MODEL"):
            get_ai_provider()

    @override_settings(AI_PROVIDER="unknown")
    def test_unsupported_provider_raises_config_error(self):
        with self.assertRaisesMessage(AIProviderConfigError, "Unsupported AI_PROVIDER"):
            get_ai_provider()
