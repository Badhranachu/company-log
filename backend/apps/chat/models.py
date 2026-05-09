from django.conf import settings
from django.db import models


class ChatBox(models.Model):
    VISIBILITY_VIEW_ONLY = 'view_only'
    VISIBILITY_CHAT_ENABLED = 'chat_enabled'
    VISIBILITY_CHOICES = [
        (VISIBILITY_VIEW_ONLY, 'View Only'),
        (VISIBILITY_CHAT_ENABLED, 'Chat Enabled'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_chatboxes')
    visibility_type = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default=VISIBILITY_CHAT_ENABLED)
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

    class Meta:
        unique_together = ('chatbox', 'user')


class Message(models.Model):
    ATTACH_IMAGE = 'image'
    ATTACH_VIDEO = 'video'
    ATTACH_PDF = 'pdf'
    ATTACH_DOC = 'document'
    ATTACH_ARCHIVE = 'archive'
    ATTACH_OTHER = 'other'
    ATTACHMENT_TYPE_CHOICES = [
        (ATTACH_IMAGE, 'Image'),
        (ATTACH_VIDEO, 'Video'),
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
    created_at = models.DateTimeField(auto_now_add=True)
    seen_by = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='seen_messages', blank=True)

    class Meta:
        ordering = ['created_at']
        indexes = [models.Index(fields=['chatbox', '-created_at'])]
