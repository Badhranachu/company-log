from rest_framework import decorators, permissions, response, status, viewsets
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from datetime import timedelta
from .models import User
from .permissions import IsOwner
from .serializers import PasswordResetSerializer, SuspendSerializer, UserCreateSerializer, UserSerializer


class AuthViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]

    @decorators.action(detail=False, methods=['post'])
    def login(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        user = User.objects.filter(email=email).first()
        if not user or not user.check_password(password):
            return response.Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        if user.is_banned:
            return response.Response({'detail': 'Your account is banned.'}, status=status.HTTP_403_FORBIDDEN)
        if user.is_suspended:
            return response.Response({'detail': f'Account suspended until {user.suspended_until}.'}, status=status.HTTP_403_FORBIDDEN)
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
    search_fields = ['name', 'email', 'phone_number']

    def get_permissions(self):
        if self.action in ['create', 'destroy', 'reset_password', 'update', 'partial_update', 'suspend', 'unsuspend', 'ban', 'unban']:
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

    @decorators.action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        user = self.get_object()
        if user.id == request.user.id:
            return response.Response({'detail': 'Owner cannot suspend self.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = SuspendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.suspended_until = timezone.now() + timedelta(minutes=serializer.validated_data['minutes'])
        user.is_active = False
        user.save(update_fields=['suspended_until', 'is_active'])
        return response.Response({'detail': 'User suspended', 'suspended_until': user.suspended_until})

    @decorators.action(detail=True, methods=['post'])
    def unsuspend(self, request, pk=None):
        user = self.get_object()
        user.suspended_until = None
        user.is_active = True
        user.save(update_fields=['suspended_until', 'is_active'])
        return response.Response({'detail': 'User unsuspended'})

    @decorators.action(detail=True, methods=['post'])
    def ban(self, request, pk=None):
        user = self.get_object()
        if user.id == request.user.id:
            return response.Response({'detail': 'Owner cannot ban self.'}, status=status.HTTP_400_BAD_REQUEST)
        user.is_banned = True
        user.is_active = False
        user.save(update_fields=['is_banned', 'is_active'])
        return response.Response({'detail': 'User banned'})

    @decorators.action(detail=True, methods=['post'])
    def unban(self, request, pk=None):
        user = self.get_object()
        user.is_banned = False
        if not user.is_suspended:
            user.is_active = True
        user.save(update_fields=['is_banned', 'is_active'])
        return response.Response({'detail': 'User unbanned'})
