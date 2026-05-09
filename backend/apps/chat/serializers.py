from rest_framework import serializers
from .models import ChatBox, ChatBoxMember, Message


class ChatBoxSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)

    class Meta:
        model = ChatBox
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']


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

    class Meta:
        model = Message
        fields = '__all__'
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
        if not attrs.get('message') and not attrs.get('attachment'):
            raise serializers.ValidationError('Message or attachment is required.')
        return attrs

    def validate_attachment(self, file):
        if not file:
            return file
        allowed = {
            'image/jpeg', 'image/png', 'image/webp', 'image/gif',
            'video/mp4', 'video/webm',
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


class MessageUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['message', 'is_pinned', 'edited_at']
        read_only_fields = ['edited_at']
