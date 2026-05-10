from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from rest_framework import decorators, permissions, response, status, viewsets
from rest_framework.exceptions import PermissionDenied
from .models import ChatBox, ChatBoxMember, Message
from .permissions import ChatBoxPermission, MessagePermission
from .serializers import ChatBoxMemberSerializer, ChatBoxSerializer, MessageSerializer, MessageUpdateSerializer
from apps.accounts.models import User


class ChatBoxViewSet(viewsets.ModelViewSet):
    serializer_class = ChatBoxSerializer
    permission_classes = [permissions.IsAuthenticated, ChatBoxPermission]
    search_fields = ['title', 'description']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'owner':
            return ChatBox.objects.all()
        return ChatBox.objects.filter(
            Q(created_by=user) | Q(memberships__user=user)
        ).distinct()

    def perform_create(self, serializer):
        chatbox = serializer.save(created_by=self.request.user)
        ChatBoxMember.objects.get_or_create(chatbox=chatbox, user=self.request.user, defaults={'can_chat': True, "is_admin": True})

    def perform_update(self, serializer):
        chatbox = self.get_object()
        user = self.request.user
        if user.role == "owner" or chatbox.created_by_id == user.id:
            serializer.save()
            return
        membership = ChatBoxMember.objects.filter(chatbox=chatbox, user=user).first()
        if not membership:
            raise PermissionDenied("Not a member.")
        if chatbox.edit_mode == "owner":
            raise PermissionDenied("Only owner can edit group info.")
        if chatbox.edit_mode == "admins" and not membership.is_admin:
            raise PermissionDenied("Only admins can edit group info.")
        serializer.save()

    @decorators.action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        chatbox = self.get_object()
        if request.user.role != 'owner' and chatbox.created_by_id != request.user.id:
            return response.Response({'detail': 'Not allowed'}, status=status.HTTP_403_FORBIDDEN)
        user_id = request.data.get('user')
        if not user_id:
            return response.Response({'detail': 'user field is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return response.Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        member, created = ChatBoxMember.objects.get_or_create(
            chatbox=chatbox,
            user=target_user,
            defaults={'can_chat': request.data.get('can_chat', True)},
        )
        serializer = ChatBoxMemberSerializer(member)
        http_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return response.Response({**serializer.data, 'already_member': not created}, status=http_status)

    @decorators.action(detail=True, methods=['post'])
    def promote_admin(self, request, pk=None):
        chatbox = self.get_object()
        if request.user.role != "owner" and chatbox.created_by_id != request.user.id:
            return response.Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)
        member_id = request.data.get("member_id")
        member = ChatBoxMember.objects.filter(chatbox=chatbox, user_id=member_id).first()
        if not member:
            return response.Response({"detail": "Member not found"}, status=status.HTTP_404_NOT_FOUND)
        member.is_admin = True
        member.save(update_fields=["is_admin"])
        return response.Response({"detail": "Member promoted to admin"})

    @decorators.action(detail=True, methods=['post'])
    def demote_admin(self, request, pk=None):
        chatbox = self.get_object()
        if request.user.role != "owner" and chatbox.created_by_id != request.user.id:
            return response.Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)
        member_id = request.data.get("member_id")
        member = ChatBoxMember.objects.filter(chatbox=chatbox, user_id=member_id).first()
        if not member:
            return response.Response({"detail": "Member not found"}, status=status.HTTP_404_NOT_FOUND)
        if member.user_id == chatbox.created_by_id:
            return response.Response({"detail": "Owner cannot be demoted"}, status=status.HTTP_400_BAD_REQUEST)
        member.is_admin = False
        member.save(update_fields=["is_admin"])
        return response.Response({"detail": "Admin role removed"})

    @decorators.action(detail=True, methods=['post'])
    def transfer_ownership(self, request, pk=None):
        chatbox = self.get_object()
        if request.user.role != "owner" and chatbox.created_by_id != request.user.id:
            return response.Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)
        member_id = request.data.get("member_id")
        member = ChatBoxMember.objects.filter(chatbox=chatbox, user_id=member_id).first()
        if not member:
            return response.Response({"detail": "Member not found"}, status=status.HTTP_404_NOT_FOUND)
        chatbox.created_by_id = member.user_id
        chatbox.save(update_fields=["created_by", "updated_at"])
        member.is_admin = True
        member.save(update_fields=["is_admin"])
        return response.Response({"detail": "Ownership transferred"})

    @decorators.action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        chatbox = self.get_object()
        chatbox.is_archived = True
        chatbox.save(update_fields=['is_archived', 'updated_at'])
        return response.Response({'detail': 'Archived'})

    @decorators.action(detail=True, methods=['post'])
    def star(self, request, pk=None):
        chatbox = self.get_object()
        chatbox.is_starred = not chatbox.is_starred
        chatbox.save(update_fields=['is_starred', 'updated_at'])
        return response.Response({'is_starred': chatbox.is_starred})

    @decorators.action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def direct_message(self, request):
        target_user_id = request.data.get('user_id')
        if not target_user_id:
            return response.Response({'detail': 'user_id required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target_user = User.objects.get(id=target_user_id)
        except User.DoesNotExist:
            return response.Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        if target_user.id == request.user.id:
            return response.Response({'detail': 'Cannot DM yourself'}, status=status.HTTP_400_BAD_REQUEST)
        existing = ChatBox.objects.filter(
            chat_type=ChatBox.TYPE_DIRECT,
            memberships__user=request.user
        ).filter(
            memberships__user=target_user
        ).first()
        if existing:
            serializer = ChatBoxSerializer(existing, context={'request': request})
            return response.Response(serializer.data)
        dm = ChatBox.objects.create(
            title=target_user.name,
            created_by=request.user,
            chat_type=ChatBox.TYPE_DIRECT,
            visibility_type=ChatBox.VISIBILITY_CHAT_ENABLED,
        )
        ChatBoxMember.objects.create(chatbox=dm, user=request.user, can_chat=True, is_admin=True)
        ChatBoxMember.objects.create(chatbox=dm, user=target_user, can_chat=True)
        serializer = ChatBoxSerializer(dm, context={'request': request})
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)

    @decorators.action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def members(self, request, pk=None):
        chatbox = self.get_object()
        memberships = chatbox.memberships.select_related('user').all()
        data = [
            {
                'id': m.user.id,
                'name': m.user.name,
                'email': m.user.email,
                'is_admin': m.is_admin,
                'profile_picture': request.build_absolute_uri(m.user.profile_picture.url) if m.user.profile_picture else None,
            }
            for m in memberships
        ]
        return response.Response(data)


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated, MessagePermission]
    search_fields = ['message']

    def get_queryset(self):
        chatbox_id = self.request.query_params.get('chatbox')
        user = self.request.user
        qs = Message.objects.select_related('sender', 'chatbox', 'reply_to').prefetch_related('seen_by')
        if chatbox_id:
            qs = qs.filter(chatbox_id=chatbox_id)
        qs = qs.exclude(hidden_by=user)
        return qs.order_by('-created_at')

    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return MessageUpdateSerializer
        return MessageSerializer

    def perform_create(self, serializer):
        chatbox = serializer.validated_data['chatbox']
        user = self.request.user
        membership = ChatBoxMember.objects.filter(chatbox=chatbox, user=user).first()
        if user.role != 'owner' and not membership and chatbox.created_by_id != user.id:
            raise PermissionDenied('You are not a member of this chat box.')
        if chatbox.visibility_type == ChatBox.VISIBILITY_VIEW_ONLY and user.role != 'owner' and chatbox.created_by_id != user.id:
            raise PermissionDenied('This chat box is view-only.')
        message = serializer.save(sender=user)
        if message.attachment:
            message.attachment_type = _infer_attachment_type(message.attachment.name)
            message.save(update_fields=['attachment_type'])

    def perform_update(self, serializer):
        message = serializer.instance
        if self.request.user.role != 'owner' and message.sender_id != self.request.user.id:
            raise PermissionDenied('Only sender can edit.')
        if self.request.user.role != 'owner' and timezone.now() - message.created_at > timedelta(hours=1):
            raise PermissionDenied('Edit window expired (1 hour).')
        serializer.save(edited_at=timezone.now())

    def destroy(self, request, *args, **kwargs):
        message = self.get_object()
        scope = request.query_params.get('scope', 'everyone')

        if scope == 'me':
            message.hidden_by.add(request.user)
            return response.Response(status=status.HTTP_204_NO_CONTENT)

        # Delete for everyone
        if request.user.role != 'owner' and message.sender_id != request.user.id:
            return response.Response({'detail': 'Only sender can delete for everyone.'}, status=status.HTTP_403_FORBIDDEN)
        if request.user.role != 'owner' and timezone.now() - message.created_at > timedelta(hours=1):
            return response.Response({'detail': 'Delete window expired (1 hour).'}, status=status.HTTP_403_FORBIDDEN)
        message.deleted_for_everyone = True
        message.deleted_at = timezone.now()
        message.deleted_by = request.user
        message.message = ""
        message.attachment = None
        message.save(update_fields=["deleted_for_everyone", "deleted_at", "deleted_by", "message", "attachment"])
        return response.Response({"detail": "Deleted for everyone"})

    @decorators.action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def toggle_tick(self, request, pk=None):
        message = self.get_object()
        if request.user.role != 'owner' and message.sender_id != request.user.id:
            return response.Response({'detail': 'Only sender can toggle tick'}, status=status.HTTP_403_FORBIDDEN)
        message.is_ticked = not message.is_ticked
        message.save(update_fields=['is_ticked'])
        return response.Response({'is_ticked': message.is_ticked})

    @decorators.action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def toggle_pin(self, request, pk=None):
        message = self.get_object()
        chatbox = message.chatbox
        if request.user.role != 'owner' and chatbox.created_by_id != request.user.id:
            return response.Response({'detail': 'Only owner/chat admin can pin'}, status=status.HTTP_403_FORBIDDEN)
        message.is_pinned = not message.is_pinned
        message.save(update_fields=['is_pinned'])
        return response.Response({'is_pinned': message.is_pinned})

    @decorators.action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def seen(self, request, pk=None):
        message = self.get_object()
        message.seen_by.add(request.user)
        return response.Response({'detail': 'Seen updated'})


def _infer_attachment_type(filename: str) -> str:
    ext = filename.lower().split('.')[-1] if '.' in filename else ''
    if ext in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
        return Message.ATTACH_IMAGE
    if ext in ['mp4', 'webm', 'mov']:
        return Message.ATTACH_VIDEO
    if ext in ['pdf']:
        return Message.ATTACH_PDF
    if ext in ['doc', 'docx', 'txt']:
        return Message.ATTACH_DOC
    if ext in ['zip', 'rar', '7z']:
        return Message.ATTACH_ARCHIVE
    return Message.ATTACH_OTHER
