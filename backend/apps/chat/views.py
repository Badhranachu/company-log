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
        show_deleted = self.request.query_params.get('deleted') == 'true'
        if show_deleted:
            if user.role != 'owner':
                return ChatBox.objects.none()
            return ChatBox.objects.filter(is_deleted=True)
        if user.role == 'owner':
            return ChatBox.objects.filter(is_deleted=False)
        return ChatBox.objects.filter(
            Q(created_by=user) | Q(memberships__user=user),
            is_deleted=False,
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
        if created:
            _post_system_message(chatbox, f"{target_user.name} was added to the group")
        serializer = ChatBoxMemberSerializer(member)
        http_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return response.Response({**serializer.data, 'already_member': not created}, status=http_status)

    @decorators.action(detail=True, methods=['post'])
    def remove_member(self, request, pk=None):
        chatbox = self.get_object()
        user_id = request.data.get('user_id')
        if not user_id:
            return response.Response({'detail': 'user_id required'}, status=status.HTTP_400_BAD_REQUEST)
        requester = request.user
        # Owner (app-level) or group creator/admin can remove members
        requester_membership = ChatBoxMember.objects.filter(chatbox=chatbox, user=requester).first()
        is_group_admin = requester.role == 'owner' or chatbox.created_by_id == requester.id or (requester_membership and requester_membership.is_admin)
        if not is_group_admin:
            return response.Response({'detail': 'Not allowed'}, status=status.HTTP_403_FORBIDDEN)
        target = ChatBoxMember.objects.filter(chatbox=chatbox, user_id=user_id).first()
        if not target:
            return response.Response({'detail': 'Member not found'}, status=status.HTTP_404_NOT_FOUND)
        if target.user_id == chatbox.created_by_id:
            return response.Response({'detail': 'Cannot remove the group owner'}, status=status.HTTP_400_BAD_REQUEST)
        removed_name = target.user.name
        target.delete()
        _post_system_message(chatbox, f"{removed_name} was removed from the group")
        return response.Response({'detail': 'Member removed'})

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

    @decorators.action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def pin_chat(self, request, pk=None):
        chatbox = self.get_object()
        member, _ = ChatBoxMember.objects.get_or_create(
            chatbox=chatbox, user=request.user,
            defaults={'can_chat': True, 'is_admin': request.user.role == 'owner'},
        )
        # Enforce max 5 pinned chats per user
        if not member.is_pinned:
            pinned_count = ChatBoxMember.objects.filter(user=request.user, is_pinned=True).count()
            if pinned_count >= 5:
                return response.Response({'detail': 'Maximum 5 chats can be pinned.'}, status=status.HTTP_400_BAD_REQUEST)
        member.is_pinned = not member.is_pinned
        member.save(update_fields=['is_pinned'])
        return response.Response({'is_pinned': member.is_pinned})

    @decorators.action(detail=True, methods=['post'])
    def delete_group(self, request, pk=None):
        if request.user.role != 'owner':
            return response.Response({'detail': 'Only admin can delete groups.'}, status=status.HTTP_403_FORBIDDEN)
        chatbox = self.get_object()
        chatbox.is_deleted = True
        chatbox.deleted_at = timezone.now()
        chatbox.save(update_fields=['is_deleted', 'deleted_at', 'updated_at'])
        return response.Response({'detail': 'Group deleted'})

    @decorators.action(detail=True, methods=['post'])
    def restore_group(self, request, pk=None):
        if request.user.role != 'owner':
            return response.Response({'detail': 'Only admin can restore groups.'}, status=status.HTTP_403_FORBIDDEN)
        # Must use unfiltered queryset to find deleted groups
        chatbox = ChatBox.objects.filter(pk=pk, is_deleted=True).first()
        if not chatbox:
            return response.Response({'detail': 'Deleted group not found.'}, status=status.HTTP_404_NOT_FOUND)
        chatbox.is_deleted = False
        chatbox.deleted_at = None
        chatbox.save(update_fields=['is_deleted', 'deleted_at', 'updated_at'])
        return response.Response({'detail': 'Group restored'})

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

        # Build the set of chatbox IDs this user may access
        if user.role == 'owner':
            accessible_ids = None  # owner sees all
        else:
            accessible_ids = set(
                ChatBox.objects.filter(
                    Q(created_by=user) | Q(memberships__user=user)
                ).values_list('id', flat=True)
            )

        qs = Message.objects.select_related('sender', 'chatbox', 'reply_to').prefetch_related('seen_by')

        if chatbox_id:
            try:
                chatbox_id_int = int(chatbox_id)
            except (ValueError, TypeError):
                return Message.objects.none()
            # Deny access if user is not a member of the requested chatbox
            if accessible_ids is not None and chatbox_id_int not in accessible_ids:
                return Message.objects.none()
            qs = qs.filter(chatbox_id=chatbox_id_int)
        elif accessible_ids is not None:
            qs = qs.filter(chatbox_id__in=accessible_ids)

        return qs.exclude(hidden_by=user).order_by('-created_at')

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
            uploaded_file = self.request.FILES.get('attachment')
            mime = uploaded_file.content_type if uploaded_file else ''
            message.attachment_type = _infer_attachment_type(message.attachment.name, mime)
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


def _post_system_message(chatbox, text: str):
    """Create a system-event message (no sender) and return its serialized form."""
    msg = Message.objects.create(chatbox=chatbox, sender=chatbox.created_by, message=text, is_system=True)
    return msg


def _infer_attachment_type(filename: str, mime: str = '') -> str:
    ext = filename.lower().split('.')[-1] if '.' in filename else ''
    if ext in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
        return Message.ATTACH_IMAGE
    if mime.startswith('audio/') or ext in ['mp3', 'ogg', 'wav', 'm4a']:
        return Message.ATTACH_AUDIO
    if ext in ['mp4', 'webm', 'mov'] or mime.startswith('video/'):
        return Message.ATTACH_VIDEO
    if ext in ['pdf']:
        return Message.ATTACH_PDF
    if ext in ['doc', 'docx', 'txt']:
        return Message.ATTACH_DOC
    if ext in ['zip', 'rar', '7z']:
        return Message.ATTACH_ARCHIVE
    return Message.ATTACH_OTHER
