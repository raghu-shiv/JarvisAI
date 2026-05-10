from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers import RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


class CurrentUserView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)
