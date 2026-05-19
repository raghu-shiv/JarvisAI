from django.core.cache import cache
from django.db.models import Case, IntegerField, Value, When
from rest_framework import viewsets

from apps.core.cache_keys import prompt_list_key
from apps.prompts.models import PromptTemplate
from apps.prompts.serializers import PromptTemplateSerializer


class PromptTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = PromptTemplateSerializer

    def get_queryset(self):
        cache_key = prompt_list_key(self.request.user.id)
        cached_ids = cache.get(cache_key)
        queryset = PromptTemplate.objects.filter(user=self.request.user)
        if cached_ids is None:
            cached_ids = [str(prompt_id) for prompt_id in queryset.values_list("id", flat=True)]
            cache.set(cache_key, cached_ids, timeout=60)
        if not cached_ids:
            return queryset.none()
        ordering = Case(
            *[When(id=prompt_id, then=Value(index)) for index, prompt_id in enumerate(cached_ids)],
            output_field=IntegerField(),
        )
        return queryset.filter(id__in=cached_ids).order_by(ordering)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        cache.delete(prompt_list_key(self.request.user.id))

    def perform_update(self, serializer):
        serializer.save()
        cache.delete(prompt_list_key(self.request.user.id))

    def perform_destroy(self, instance):
        user_id = self.request.user.id
        instance.delete()
        cache.delete(prompt_list_key(user_id))
