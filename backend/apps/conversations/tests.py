from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase

from apps.conversations.models import Conversation, Message
from apps.prompts.models import PromptTemplate


User = get_user_model()


class ConversationApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(username="bruce", password="StrongPass123")
        self.other_user = User.objects.create_user(username="steve", password="StrongPass123")
        self.client.force_authenticate(self.user)

    def test_create_list_and_retrieve_conversation_with_messages(self):
        create_response = self.client.post("/api/conversations/", {"title": "Research"}, format="json")
        conversation_id = create_response.data["id"]
        conversation = Conversation.objects.get(id=conversation_id)
        Message.objects.create(conversation=conversation, role=Message.Role.USER, content="Hello Jarvis")

        list_response = self.client.get("/api/conversations/")
        detail_response = self.client.get(f"/api/conversations/{conversation_id}/")
        messages_response = self.client.get(f"/api/conversations/{conversation_id}/messages/")

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data[0]["message_count"], 1)
        self.assertNotIn("messages", list_response.data[0])
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(detail_response.data["messages"]), 1)
        self.assertEqual(messages_response.status_code, status.HTTP_200_OK)
        self.assertEqual(messages_response.data[0]["content"], "Hello Jarvis")

    def test_user_cannot_access_another_users_conversation(self):
        conversation = Conversation.objects.create(user=self.other_user, title="Private")

        response = self.client.get(f"/api/conversations/{conversation.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_archives_conversation(self):
        conversation = Conversation.objects.create(user=self.user, title="Archive me")

        delete_response = self.client.delete(f"/api/conversations/{conversation.id}/")
        list_response = self.client.get("/api/conversations/")
        conversation.refresh_from_db()

        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertIsNotNone(conversation.archived_at)
        self.assertEqual(list_response.data, [])

    def test_apply_prompt_creates_system_message(self):
        conversation = Conversation.objects.create(user=self.user, title="Architecture")
        prompt = PromptTemplate.objects.create(
            user=self.user,
            name="Architect",
            system_prompt="Think like an enterprise architect.",
        )

        response = self.client.post(
            f"/api/conversations/{conversation.id}/apply_prompt/",
            {"prompt_id": str(prompt.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["role"], Message.Role.SYSTEM)
        self.assertEqual(response.data["content"], "Think like an enterprise architect.")
        self.assertTrue(Message.objects.filter(conversation=conversation, role=Message.Role.SYSTEM).exists())

    def test_apply_prompt_rejects_prompt_owned_by_another_user(self):
        conversation = Conversation.objects.create(user=self.user, title="Architecture")
        prompt = PromptTemplate.objects.create(
            user=self.other_user,
            name="Other Architect",
            system_prompt="Hidden system prompt.",
        )

        response = self.client.post(
            f"/api/conversations/{conversation.id}/apply_prompt/",
            {"prompt_id": str(prompt.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Message.objects.filter(conversation=conversation).count(), 0)
