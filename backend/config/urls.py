from django.contrib import admin
from django.urls import include, path

from apps.core.views import HealthCheckView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", HealthCheckView.as_view(), name="health-check"),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/conversations/", include("apps.conversations.urls")),
    path("api/prompts/", include("apps.prompts.urls")),
]
