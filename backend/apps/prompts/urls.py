from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.prompts.views import PromptTemplateViewSet

router = DefaultRouter()
router.register("", PromptTemplateViewSet, basename="prompt")

urlpatterns = [
    path("", include(router.urls)),
]
