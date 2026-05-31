from django.core.cache import cache
from django.db import connection
from rest_framework import permissions, response, status, views


class HealthCheckView(views.APIView):
    authentication_classes = ()
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        checks = {}

        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            checks["database"] = "ok"
        except Exception:
            checks["database"] = "error"

        try:
            cache_key = "jarvis:health"
            cache.set(cache_key, "ok", timeout=10)
            checks["cache"] = "ok" if cache.get(cache_key) == "ok" else "error"
        except Exception:
            checks["cache"] = "error"

        is_healthy = all(value == "ok" for value in checks.values())
        return response.Response(
            {"status": "ok" if is_healthy else "degraded", "checks": checks},
            status=status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE,
        )
