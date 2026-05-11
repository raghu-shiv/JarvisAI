from rest_framework import serializers

from apps.conversations.models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ("id", "role", "content", "status", "provider", "model", "token_count", "error", "created_at")
        read_only_fields = fields


class ConversationListSerializer(serializers.ModelSerializer):
    message_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Conversation
        fields = ("id", "title", "created_at", "updated_at", "archived_at", "message_count")
        read_only_fields = ("id", "created_at", "updated_at", "archived_at", "message_count")


class ConversationDetailSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    message_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Conversation
        fields = ("id", "title", "created_at", "updated_at", "archived_at", "message_count", "messages")
        read_only_fields = ("id", "created_at", "updated_at", "archived_at", "message_count", "messages")

    def validate_title(self, value):
        title = value.strip()
        if not title:
            raise serializers.ValidationError("Conversation title cannot be empty.")
        return title
