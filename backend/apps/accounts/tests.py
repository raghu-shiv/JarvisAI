from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase


User = get_user_model()


class AccountApiTests(APITestCase):
    def test_register_returns_user_and_tokens(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "username": "tony",
                "email": "tony@example.com",
                "password": "StrongPass123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["username"], "tony")
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertTrue(User.objects.filter(username="tony", email="tony@example.com").exists())

    def test_login_and_current_user(self):
        user = User.objects.create_user(username="pepper", email="pepper@example.com", password="StrongPass123")

        login_response = self.client.post(
            "/api/auth/login/",
            {"username": "pepper", "password": "StrongPass123"},
            format="json",
        )

        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertEqual(login_response.data["user"]["id"], user.id)
        self.assertIn("access", login_response.data)
        self.assertIn("refresh", login_response.data)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")
        me_response = self.client.get("/api/auth/me/")

        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data["username"], "pepper")

    def test_logout_blacklists_refresh_token(self):
        User.objects.create_user(username="rhodey", email="rhodey@example.com", password="StrongPass123")
        login_response = self.client.post(
            "/api/auth/login/",
            {"username": "rhodey", "password": "StrongPass123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")

        logout_response = self.client.post(
            "/api/auth/logout/",
            {"refresh": login_response.data["refresh"]},
            format="json",
        )
        refresh_response = self.client.post(
            "/api/auth/token/refresh/",
            {"refresh": login_response.data["refresh"]},
            format="json",
        )

        self.assertEqual(logout_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)
