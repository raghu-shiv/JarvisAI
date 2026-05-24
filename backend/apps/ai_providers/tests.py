import asyncio

from django.test import SimpleTestCase, override_settings

from apps.ai_providers.providers import AIProviderConfigError, MockProvider, get_ai_provider


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

    @override_settings(AI_PROVIDER="unknown")
    def test_unsupported_provider_raises_config_error(self):
        with self.assertRaisesMessage(AIProviderConfigError, "Unsupported AI_PROVIDER"):
            get_ai_provider()

