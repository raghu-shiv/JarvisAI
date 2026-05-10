from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication


class JwtAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        query_params = parse_qs(scope.get("query_string", b"").decode())
        token = query_params.get("token", [None])[0]
        scope["user"] = await self._get_user(token)
        return await self.app(scope, receive, send)

    @database_sync_to_async
    def _get_user(self, token):
        if not token:
            return AnonymousUser()
        try:
            jwt_auth = JWTAuthentication()
            validated_token = jwt_auth.get_validated_token(token)
            return jwt_auth.get_user(validated_token)
        except Exception:
            return AnonymousUser()
