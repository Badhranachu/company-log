from rest_framework import decorators, permissions, response, status, viewsets
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User
from .permissions import IsOwner
from .serializers import PasswordResetSerializer, UserCreateSerializer, UserSerializer


class AuthViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]

    @decorators.action(detail=False, methods=['post'])
    def login(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        user = User.objects.filter(email=email).first()
        if not user or not user.check_password(password):
            return response.Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        refresh = RefreshToken.for_user(user)
        return response.Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        })

    @decorators.action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        return response.Response(UserSerializer(request.user).data)

    @decorators.action(detail=False, methods=['patch'], permission_classes=[permissions.IsAuthenticated])
    def update_profile(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        if 'role' in serializer.validated_data and request.user.role != 'owner':
            return response.Response({'detail': 'Only owner can change roles.'}, status=status.HTTP_403_FORBIDDEN)
        serializer.save()
        return response.Response(serializer.data)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-created_at')
    search_fields = ['name', 'email', 'role']

    def get_permissions(self):
        if self.action in ['create', 'destroy', 'reset_password', 'update', 'partial_update']:
            return [IsOwner()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user.id == request.user.id:
            return response.Response({'detail': 'Owner cannot delete self.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

    @decorators.action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        serializer = PasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])
        return response.Response({'detail': 'Password reset successful'})
