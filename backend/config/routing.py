from django.urls import path

from apps.conversations.consumers import ChatConsumer

websocket_urlpatterns = [
    path("ws/chat/<uuid:conversation_id>/", ChatConsumer.as_asgi()),
]
