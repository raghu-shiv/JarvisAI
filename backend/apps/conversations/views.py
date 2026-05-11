from django.core.cache import cache
from django.db.models import Count
from django.utils import timezone
from rest_framework import decorators, response, viewsets

from apps.conversations.models import Conversation
from apps.conversations.serializers import ConversationDetailSerializer, ConversationListSerializer, MessageSerializer


class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationDetailSerializer

    def get_serializer_class(self):
        if self.action == "list":
            return ConversationListSerializer
        return ConversationDetailSerializer

    def get_queryset(self):
        queryset = Conversation.objects.filter(user=self.request.user, archived_at__isnull=True).annotate(message_count=Count("messages"))
        if self.action == "retrieve":
            return queryset.prefetch_related("messages")
        return queryset

    def perform_create(self, serializer):
        title = serializer.validated_data.get("title") or "New conversation"
        serializer.save(user=self.request.user, title=title)
        cache.delete(f"conversations:{self.request.user.id}")

    def perform_update(self, serializer):
        serializer.save()
        cache.delete(f"conversations:{self.request.user.id}")

    def perform_destroy(self, instance):
        user_id = self.request.user.id
        instance.archived_at = timezone.now()
        instance.save(update_fields=["archived_at", "updated_at"])
        cache.delete(f"conversations:{user_id}")

    @decorators.action(detail=True, methods=["get"])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        serializer = MessageSerializer(conversation.messages.all(), many=True)
        return response.Response(serializer.data)
