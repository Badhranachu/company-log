import random
from rest_framework import decorators, permissions, response, status, viewsets
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import User
from .permissions import IsOwner
from .serializers import PasswordResetSerializer, SuspendSerializer, UserCreateSerializer, UserSerializer


def _send_otp(email: str, subject: str, purpose: str) -> str:
    otp = str(random.randint(100000, 999999))
    send_mail(
        subject,
        f'Your OTP for {purpose} is: {otp}\n\nValid for 10 minutes. Do not share this code.',
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )
    return otp


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
        # Email and password changes go through OTP endpoints — block them here
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        data.pop('email', None)
        data.pop('password', None)
        data.pop('role', None)
        serializer = UserSerializer(request.user, data=data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return response.Response(serializer.data)

    @decorators.action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def request_password_otp(self, request):
        user = request.user
        try:
            otp = _send_otp(user.email, 'Company Log — Password Change OTP', 'password change')
        except Exception:
            return response.Response({'detail': 'Failed to send OTP. Check email config.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        cache.set(f'otp_pwd_{user.id}', otp, timeout=300)
        return response.Response({'detail': f'OTP sent to {user.email}'})

    @decorators.action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def change_password(self, request):
        otp = str(request.data.get('otp', '')).strip()
        new_password = request.data.get('new_password', '').strip()
        if not otp or not new_password:
            return response.Response({'detail': 'otp and new_password are required.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 8:
            return response.Response({'detail': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)
        cached = cache.get(f'otp_pwd_{request.user.id}')
        if not cached or cached != otp:
            return response.Response({'detail': 'Invalid or expired OTP.'}, status=status.HTTP_400_BAD_REQUEST)
        cache.delete(f'otp_pwd_{request.user.id}')
        request.user.set_password(new_password)
        request.user.save(update_fields=['password'])
        return response.Response({'detail': 'Password changed successfully.'})

    @decorators.action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def request_email_change(self, request):
        new_email = request.data.get('new_email', '').strip().lower()
        if not new_email or '@' not in new_email:
            return response.Response({'detail': 'Valid new_email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email=new_email).exists():
            return response.Response({'detail': 'This email is already in use.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            otp = _send_otp(new_email, 'Company Log — Email Change OTP', 'email change')
        except Exception:
            return response.Response({'detail': 'Failed to send OTP. Check the email address.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        cache.set(f'otp_email_{request.user.id}', {'otp': otp, 'new_email': new_email}, timeout=300)
        return response.Response({'detail': f'OTP sent to {new_email}'})

    @decorators.action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def verify_email_change(self, request):
        otp = str(request.data.get('otp', '')).strip()
        if not otp:
            return response.Response({'detail': 'OTP is required.'}, status=status.HTTP_400_BAD_REQUEST)
        cached = cache.get(f'otp_email_{request.user.id}')
        if not cached or cached['otp'] != otp:
            return response.Response({'detail': 'Invalid or expired OTP.'}, status=status.HTTP_400_BAD_REQUEST)
        new_email = cached['new_email']
        if User.objects.filter(email=new_email).exclude(id=request.user.id).exists():
            cache.delete(f'otp_email_{request.user.id}')
            return response.Response({'detail': 'Email already taken.'}, status=status.HTTP_400_BAD_REQUEST)
        cache.delete(f'otp_email_{request.user.id}')
        request.user.email = new_email
        request.user.username = new_email  # keep in sync with AbstractUser
        request.user.save(update_fields=['email', 'username'])
        return response.Response({'detail': 'Email changed successfully.', 'email': new_email})


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
