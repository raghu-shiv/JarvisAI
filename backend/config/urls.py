from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/conversations/", include("apps.conversations.urls")),
    path("api/prompts/", include("apps.prompts.urls")),
]
