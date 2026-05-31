from rest_framework import status
from rest_framework.test import APITestCase


class HealthCheckApiTests(APITestCase):
    def test_health_check_reports_database_and_cache(self):
        response = self.client.get("/api/health/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "status": "ok",
                "checks": {
                    "database": "ok",
                    "cache": "ok",
                },
            },
        )
