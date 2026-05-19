from django.core.cache import cache
from django.db.models import Case, Count, IntegerField, Value, When
from django.utils import timezone
from rest_framework import decorators, response, status, viewsets

from apps.conversations.models import Conversation, Message
from apps.conversations.serializers import ApplyPromptSerializer, ConversationDetailSerializer, ConversationListSerializer, MessageSerializer
from apps.core.cache_keys import conversation_list_key
from apps.prompts.models import PromptTemplate


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
        if self.action == "list":
            cache_key = conversation_list_key(self.request.user.id)
            cached_ids = cache.get(cache_key)
            if cached_ids is None:
                cached_ids = [str(conversation_id) for conversation_id in queryset.values_list("id", flat=True)]
                cache.set(cache_key, cached_ids, timeout=60)
            if not cached_ids:
                return queryset.none()
            ordering = Case(
                *[When(id=conversation_id, then=Value(index)) for index, conversation_id in enumerate(cached_ids)],
                output_field=IntegerField(),
            )
            return queryset.filter(id__in=cached_ids).order_by(ordering)
        return queryset

    def perform_create(self, serializer):
        title = serializer.validated_data.get("title") or "New conversation"
        serializer.save(user=self.request.user, title=title)
        cache.delete(conversation_list_key(self.request.user.id))

    def perform_update(self, serializer):
        serializer.save()
        cache.delete(conversation_list_key(self.request.user.id))

    def perform_destroy(self, instance):
        user_id = self.request.user.id
        instance.archived_at = timezone.now()
        instance.save(update_fields=["archived_at", "updated_at"])
        cache.delete(conversation_list_key(user_id))

    @decorators.action(detail=True, methods=["get"])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        serializer = MessageSerializer(conversation.messages.all(), many=True)
        return response.Response(serializer.data)

    @decorators.action(detail=True, methods=["post"])
    def apply_prompt(self, request, pk=None):
        conversation = self.get_object()
        serializer = ApplyPromptSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        prompt = PromptTemplate.objects.get(id=serializer.validated_data["prompt_id"], user=request.user)
        message = Message.objects.create(
            conversation=conversation,
            role=Message.Role.SYSTEM,
            content=prompt.system_prompt,
            status=Message.Status.COMPLETED,
        )
        conversation.updated_at = timezone.now()
        conversation.save(update_fields=["updated_at"])
        cache.delete(conversation_list_key(request.user.id))
        return response.Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)
