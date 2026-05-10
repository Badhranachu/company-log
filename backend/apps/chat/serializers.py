from rest_framework import serializers
from .models import ChatBox, ChatBoxMember, Message


class ChatBoxSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    group_avatar_url = serializers.SerializerMethodField()
    group_banner_url = serializers.SerializerMethodField()
    last_message_preview = serializers.SerializerMethodField()
    last_message_at = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatBox
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_group_avatar_url(self, obj):
        request = self.context.get("request")
        if not obj.group_avatar:
            return None
        return request.build_absolute_uri(obj.group_avatar.url) if request else obj.group_avatar.url

    def get_group_banner_url(self, obj):
        request = self.context.get("request")
        if not obj.group_banner:
            return None
        return request.build_absolute_uri(obj.group_banner.url) if request else obj.group_banner.url

    def get_last_message_preview(self, obj):
        msg = obj.messages.order_by("-created_at").first()
        if not msg:
            return ""
        if msg.deleted_for_everyone:
            return "This message was deleted"
        if msg.message:
            return msg.message[:80]
        return f"[{msg.attachment_type}]"

    def get_last_message_at(self, obj):
        msg = obj.messages.order_by("-created_at").first()
        return msg.created_at if msg else None

    def get_unread_count(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or user.is_anonymous:
            return 0
        membership = obj.memberships.filter(user=user).first()
        return membership.unread_count if membership else 0

    def get_member_count(self, obj):
        return obj.memberships.count()


class ChatBoxMemberSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)

    class Meta:
        model = ChatBoxMember
        fields = '__all__'
        read_only_fields = ['chatbox']


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.name', read_only=True)
    attachment_url = serializers.SerializerMethodField()
    seen_by_ids = serializers.SerializerMethodField()
    display_message = serializers.SerializerMethodField()

    class Meta:
        model = Message
        exclude = ['hidden_by']
        read_only_fields = ['sender', 'created_at', 'edited_at', 'attachment_type', 'seen_by']

    def get_attachment_url(self, obj):
        request = self.context.get('request')
        if not obj.attachment:
            return None
        if request:
            return request.build_absolute_uri(obj.attachment.url)
        return obj.attachment.url

    def get_seen_by_ids(self, obj):
        return list(obj.seen_by.values_list('id', flat=True))

    def validate(self, attrs):
        if getattr(self.instance, "deleted_for_everyone", False):
            raise serializers.ValidationError("Deleted messages cannot be edited.")
        if not attrs.get('message') and not attrs.get('attachment'):
            raise serializers.ValidationError('Message or attachment is required.')
        return attrs

    def validate_attachment(self, file):
        if not file:
            return file
        allowed = {
            'image/jpeg', 'image/png', 'image/webp', 'image/gif',
            'video/mp4', 'video/webm',
            'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/zip', 'application/x-zip-compressed',
            'text/plain'
        }
        if file.content_type not in allowed:
            raise serializers.ValidationError('Unsupported file type.')
        if file.size > 30 * 1024 * 1024:
            raise serializers.ValidationError('File too large. Max 30MB.')
        return file

    def get_display_message(self, obj):
        if obj.deleted_for_everyone:
            return "This message was deleted"
        return obj.message


class MessageUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['message', 'is_pinned', 'edited_at']
        read_only_fields = ['edited_at']
