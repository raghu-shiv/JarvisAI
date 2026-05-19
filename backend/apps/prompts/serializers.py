from rest_framework import serializers

from apps.prompts.models import PromptTemplate


class PromptTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromptTemplate
        fields = ("id", "name", "description", "system_prompt", "variables", "is_public", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("Prompt name cannot be empty.")

        request = self.context.get("request")
        if request:
            queryset = PromptTemplate.objects.filter(user=request.user, name__iexact=name)
            if self.instance:
                queryset = queryset.exclude(id=self.instance.id)
            if queryset.exists():
                raise serializers.ValidationError("A prompt with this name already exists.")

        return name

    def validate_system_prompt(self, value):
        system_prompt = value.strip()
        if not system_prompt:
            raise serializers.ValidationError("System prompt cannot be empty.")
        return system_prompt

    def validate_variables(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Variables must be an object.")
        return value
