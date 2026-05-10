from django.core.cache import cache
from rest_framework import viewsets

from apps.prompts.models import PromptTemplate
from apps.prompts.serializers import PromptTemplateSerializer


class PromptTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = PromptTemplateSerializer

    def get_queryset(self):
        cache_key = f"prompts:{self.request.user.id}"
        cached_ids = cache.get(cache_key)
        if cached_ids is None:
            queryset = PromptTemplate.objects.filter(user=self.request.user)
            cached_ids = list(queryset.values_list("id", flat=True))
            cache.set(cache_key, cached_ids, timeout=60)
        return PromptTemplate.objects.filter(user=self.request.user, id__in=cached_ids)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        cache.delete(f"prompts:{self.request.user.id}")

    def perform_update(self, serializer):
        serializer.save()
        cache.delete(f"prompts:{self.request.user.id}")

    def perform_destroy(self, instance):
        user_id = self.request.user.id
        instance.delete()
        cache.delete(f"prompts:{user_id}")
