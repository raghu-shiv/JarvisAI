from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from apps.ai_providers.providers import AIProviderError, get_ai_provider
from apps.conversations.models import Conversation, Message
from apps.core.cache_keys import chat_rate_limit_key, conversation_list_key


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        self.user = self.scope.get("user")

        if not self.user or self.user.is_anonymous:
            await self.close(code=4401)
            return

        if not await self._user_owns_conversation():
            await self.close(code=4403)
            return

        await self.accept()
        await self.send_json({"type": "connection.ready"})

    async def receive_json(self, content, **kwargs):
        event_type = content.get("type")
        if event_type != "user.message":
            await self.send_json({"type": "error", "error": "Unsupported event type."})
            return

        text = (content.get("content") or "").strip()
        if not text:
            await self.send_json({"type": "error", "error": "Message content is required."})
            return

        try:
            provider = get_ai_provider()
        except AIProviderError as exc:
            await self.send_json({"type": "assistant.failed", "error": exc.message})
            return

        if provider.provider_name != "openrouter" and await self._is_rate_limited():
            await self.send_json(
                {
                    "type": "rate_limited",
                    "error": "You are sending messages too quickly. Please wait before trying again.",
                    "retry_after_seconds": settings.CHAT_RATE_LIMIT_WINDOW_SECONDS,
                }
            )
            return

        await self._save_message(role=Message.Role.USER, content=text, status=Message.Status.COMPLETED)
        assistant = await self._save_message(
            role=Message.Role.ASSISTANT,
            content="",
            status=Message.Status.STREAMING,
            provider=provider.provider_name,
            model=provider.model,
        )

        await self.send_json(
            {
                "type": "assistant.started",
                "message_id": str(assistant.id),
                "provider": provider.provider_name,
                "model": provider.model,
            }
        )

        chunks: list[str] = []
        try:
            history = await self._message_history()
            async for chunk in provider.stream_chat(history):
                chunks.append(chunk)
                await self.send_json({"type": "assistant.delta", "message_id": str(assistant.id), "delta": chunk})

            final_content = "".join(chunks)
            await self._complete_message(assistant.id, final_content)
            await self.send_json({"type": "assistant.completed", "message_id": str(assistant.id), "content": final_content})
        except AIProviderError as exc:
            await self._fail_message(assistant.id, exc.message)
            await self.send_json({"type": "assistant.failed", "message_id": str(assistant.id), "error": exc.message})
        except Exception as exc:
            await self._fail_message(assistant.id, "The assistant response failed unexpectedly.")
            await self.send_json({"type": "assistant.failed", "message_id": str(assistant.id), "error": "The assistant response failed unexpectedly."})

    @database_sync_to_async
    def _user_owns_conversation(self) -> bool:
        return Conversation.objects.filter(id=self.conversation_id, user=self.user).exists()

    @database_sync_to_async
    def _save_message(self, role: str, content: str, status: str, provider: str = "", model: str = "") -> Message:
        message = Message.objects.create(
            conversation_id=self.conversation_id,
            role=role,
            content=content,
            status=status,
            provider=provider,
            model=model,
        )
        conversation_updates = {"updated_at": timezone.now()}
        if role == Message.Role.USER:
            conversation = Conversation.objects.only("title").get(id=self.conversation_id)
            if conversation.title == "New conversation":
                conversation_updates["title"] = content[:60]
        Conversation.objects.filter(id=self.conversation_id).update(**conversation_updates)
        cache.delete(conversation_list_key(self.user.id))
        return message

    @database_sync_to_async
    def _is_rate_limited(self) -> bool:
        key = chat_rate_limit_key(self.user.id)
        added = cache.add(key, 1, timeout=settings.CHAT_RATE_LIMIT_WINDOW_SECONDS)
        if added:
            return False

        try:
            request_count = cache.incr(key)
        except ValueError:
            cache.set(key, 1, timeout=settings.CHAT_RATE_LIMIT_WINDOW_SECONDS)
            return False

        return request_count > settings.CHAT_RATE_LIMIT_COUNT

    @database_sync_to_async
    def _message_history(self) -> list[dict[str, str]]:
        messages = Message.objects.filter(conversation_id=self.conversation_id).order_by("created_at")
        return [{"role": message.role, "content": message.content} for message in messages if message.content]

    @database_sync_to_async
    def _complete_message(self, message_id, content: str) -> None:
        Message.objects.filter(id=message_id).update(content=content, status=Message.Status.COMPLETED, error="", token_count=len(content.split()))

    @database_sync_to_async
    def _fail_message(self, message_id, error: str) -> None:
        Message.objects.filter(id=message_id).update(status=Message.Status.FAILED, error=error[:1000])
