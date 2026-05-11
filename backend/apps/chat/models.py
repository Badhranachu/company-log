from django.conf import settings
from django.db import models


class ChatBox(models.Model):
    VISIBILITY_VIEW_ONLY = 'view_only'
    VISIBILITY_CHAT_ENABLED = 'chat_enabled'
    VISIBILITY_CHOICES = [
        (VISIBILITY_VIEW_ONLY, 'View Only'),
        (VISIBILITY_CHAT_ENABLED, 'Chat Enabled'),
    ]

    TYPE_GROUP = 'group'
    TYPE_DIRECT = 'direct'
    CHAT_TYPE_CHOICES = [
        (TYPE_GROUP, 'Group'),
        (TYPE_DIRECT, 'Direct Message'),
    ]

    title = models.CharField(max_length=200)
    chat_type = models.CharField(max_length=10, choices=CHAT_TYPE_CHOICES, default=TYPE_GROUP)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_chatboxes')
    group_avatar = models.ImageField(upload_to="chatboxes/avatar/", null=True, blank=True)
    group_banner = models.ImageField(upload_to="chatboxes/banner/", null=True, blank=True)
    visibility_type = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default=VISIBILITY_CHAT_ENABLED)
    can_members_edit_name = models.BooleanField(default=False)
    can_members_edit_description = models.BooleanField(default=False)
    can_members_edit_media = models.BooleanField(default=False)
    edit_mode = models.CharField(
        max_length=20,
        choices=[("admins", "Only Admins"), ("everyone", "Everyone"), ("owner", "Owner Only")],
        default="admins",
    )
    is_archived = models.BooleanField(default=False)
    is_starred = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']


class ChatBoxMember(models.Model):
    chatbox = models.ForeignKey(ChatBox, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_memberships')
    can_chat = models.BooleanField(default=True)
    is_admin = models.BooleanField(default=False)
    unread_count = models.PositiveIntegerField(default=0)
    is_muted = models.BooleanField(default=False)
    is_pinned = models.BooleanField(default=False)

    class Meta:
        unique_together = ('chatbox', 'user')


class Message(models.Model):
    ATTACH_IMAGE = 'image'
    ATTACH_VIDEO = 'video'
    ATTACH_AUDIO = 'audio'
    ATTACH_PDF = 'pdf'
    ATTACH_DOC = 'document'
    ATTACH_ARCHIVE = 'archive'
    ATTACH_OTHER = 'other'
    ATTACHMENT_TYPE_CHOICES = [
        (ATTACH_IMAGE, 'Image'),
        (ATTACH_VIDEO, 'Video'),
        (ATTACH_AUDIO, 'Audio'),
        (ATTACH_PDF, 'PDF'),
        (ATTACH_DOC, 'Document'),
        (ATTACH_ARCHIVE, 'Archive'),
        (ATTACH_OTHER, 'Other'),
    ]

    chatbox = models.ForeignKey(ChatBox, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='messages')
    message = models.TextField(blank=True)
    attachment = models.FileField(upload_to='attachments/%Y/%m/%d/', null=True, blank=True)
    attachment_type = models.CharField(max_length=20, choices=ATTACHMENT_TYPE_CHOICES, default=ATTACH_OTHER)
    is_pinned = models.BooleanField(default=False)
    is_ticked = models.BooleanField(default=False)
    reply_to = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='replies')
    edited_at = models.DateTimeField(null=True, blank=True)
    deleted_for_everyone = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="deleted_messages",
    )
    is_system = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    seen_by = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='seen_messages', blank=True)
    hidden_by = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='hidden_messages', blank=True)

    class Meta:
        ordering = ['created_at']
        indexes = [models.Index(fields=['chatbox', '-created_at'])]
