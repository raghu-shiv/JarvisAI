from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from apps.ai_providers.providers import get_ai_provider
from apps.conversations.models import Conversation, Message


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

    async def receive_json(self, content, **kwargs):
        event_type = content.get("type")
        if event_type != "user.message":
            await self.send_json({"type": "error", "error": "Unsupported event type."})
            return

        text = (content.get("content") or "").strip()
        if not text:
            await self.send_json({"type": "error", "error": "Message content is required."})
            return

        await self._save_message(role=Message.Role.USER, content=text, status=Message.Status.COMPLETED)
        assistant = await self._save_message(role=Message.Role.ASSISTANT, content="", status=Message.Status.STREAMING)

        await self.send_json({"type": "assistant.started", "message_id": str(assistant.id)})

        chunks: list[str] = []
        try:
            provider = get_ai_provider()
            history = await self._message_history()
            async for chunk in provider.stream_chat(history):
                chunks.append(chunk)
                await self.send_json({"type": "assistant.delta", "message_id": str(assistant.id), "delta": chunk})

            final_content = "".join(chunks)
            await self._complete_message(assistant.id, final_content)
            await self.send_json({"type": "assistant.completed", "message_id": str(assistant.id)})
        except Exception as exc:
            await self._fail_message(assistant.id, str(exc))
            await self.send_json({"type": "assistant.failed", "message_id": str(assistant.id), "error": str(exc)})

    @database_sync_to_async
    def _user_owns_conversation(self) -> bool:
        return Conversation.objects.filter(id=self.conversation_id, user=self.user).exists()

    @database_sync_to_async
    def _save_message(self, role: str, content: str, status: str) -> Message:
        return Message.objects.create(
            conversation_id=self.conversation_id,
            role=role,
            content=content,
            status=status,
        )

    @database_sync_to_async
    def _message_history(self) -> list[dict[str, str]]:
        messages = Message.objects.filter(conversation_id=self.conversation_id).order_by("created_at")
        return [{"role": message.role, "content": message.content} for message in messages if message.content]

    @database_sync_to_async
    def _complete_message(self, message_id, content: str) -> None:
        Message.objects.filter(id=message_id).update(content=content, status=Message.Status.COMPLETED, error="")

    @database_sync_to_async
    def _fail_message(self, message_id, error: str) -> None:
        Message.objects.filter(id=message_id).update(status=Message.Status.FAILED, error=error[:1000])
