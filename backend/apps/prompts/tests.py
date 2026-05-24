from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase

from apps.prompts.models import PromptTemplate


User = get_user_model()


class PromptTemplateApiTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(username="natasha", password="StrongPass123")
        self.other_user = User.objects.create_user(username="clint", password="StrongPass123")
        self.client.force_authenticate(self.user)

    def test_create_and_list_only_owned_prompts(self):
        PromptTemplate.objects.create(user=self.other_user, name="Other", system_prompt="Hidden prompt")

        create_response = self.client.post(
            "/api/prompts/",
            {
                "name": "Code Reviewer",
                "description": "Review code for production readiness.",
                "system_prompt": "You are a senior code reviewer.",
                "variables": {"language": "python"},
                "is_public": False,
            },
            format="json",
        )
        list_response = self.client.get("/api/prompts/")

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["name"], "Code Reviewer")

    def test_duplicate_prompt_name_is_rejected_per_user(self):
        PromptTemplate.objects.create(user=self.user, name="Architect", system_prompt="Think in systems.")

        response = self.client.post(
            "/api/prompts/",
            {"name": "architect", "system_prompt": "Different text."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_update_and_delete_prompt(self):
        prompt = PromptTemplate.objects.create(user=self.user, name="Draft", system_prompt="Draft clearly.")

        patch_response = self.client.patch(
            f"/api/prompts/{prompt.id}/",
            {"name": "Writer", "system_prompt": "Write clearly."},
            format="json",
        )
        delete_response = self.client.delete(f"/api/prompts/{prompt.id}/")

        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.data["name"], "Writer")
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(PromptTemplate.objects.filter(id=prompt.id).exists())
