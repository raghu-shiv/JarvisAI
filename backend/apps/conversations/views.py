from django.core.cache import cache
from rest_framework import decorators, response, viewsets

from apps.conversations.models import Conversation
from apps.conversations.serializers import ConversationSerializer, MessageSerializer


class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer

    def get_queryset(self):
        return Conversation.objects.filter(user=self.request.user, archived_at__isnull=True).prefetch_related("messages")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        cache.delete(f"conversations:{self.request.user.id}")

    def perform_update(self, serializer):
        serializer.save()
        cache.delete(f"conversations:{self.request.user.id}")

    def perform_destroy(self, instance):
        user_id = self.request.user.id
        instance.delete()
        cache.delete(f"conversations:{user_id}")

    @decorators.action(detail=True, methods=["get"])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        serializer = MessageSerializer(conversation.messages.all(), many=True)
        return response.Response(serializer.data)
