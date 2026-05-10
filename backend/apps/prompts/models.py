import uuid

from django.conf import settings
from django.db import models


class PromptTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="prompt_templates")
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    system_prompt = models.TextField()
    variables = models.JSONField(default=dict, blank=True)
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        unique_together = ("user", "name")

    def __str__(self) -> str:
        return self.name
