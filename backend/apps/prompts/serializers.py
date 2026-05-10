from rest_framework import serializers

from apps.prompts.models import PromptTemplate


class PromptTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromptTemplate
        fields = ("id", "name", "description", "system_prompt", "variables", "is_public", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")
