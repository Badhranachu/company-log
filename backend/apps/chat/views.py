from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from rest_framework import decorators, permissions, response, status, viewsets
from rest_framework.exceptions import PermissionDenied
from .models import ChatBox, ChatBoxMember, Message
from .permissions import ChatBoxPermission, MessagePermission
from .serializers import ChatBoxMemberSerializer, ChatBoxSerializer, MessageSerializer, MessageUpdateSerializer


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
        ChatBoxMember.objects.get_or_create(chatbox=chatbox, user=self.request.user, defaults={'can_chat': True})

    @decorators.action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        chatbox = self.get_object()
        if request.user.role != 'owner' and chatbox.created_by_id != request.user.id:
            return response.Response({'detail': 'Not allowed'}, status=status.HTTP_403_FORBIDDEN)
        serializer = ChatBoxMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(chatbox=chatbox)
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)

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
        return super().destroy(request, *args, **kwargs)

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
