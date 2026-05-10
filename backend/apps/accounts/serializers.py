from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    profile_picture_url = serializers.SerializerMethodField()
    banner_image_url = serializers.SerializerMethodField()
    is_suspended = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'name', 'email', 'role', 'created_at',
            'username_alias', 'phone_number', 'bio', 'status_message',
            'department', 'last_seen_at', 'is_online',
            'is_banned', 'suspended_until', 'is_suspended',
            'profile_picture', 'banner_image', 'profile_picture_url', 'banner_image_url'
        ]
        read_only_fields = ['id', 'created_at']

    def get_profile_picture_url(self, obj):
        request = self.context.get("request")
        if not obj.profile_picture:
            return None
        return request.build_absolute_uri(obj.profile_picture.url) if request else obj.profile_picture.url

    def get_banner_image_url(self, obj):
        request = self.context.get("request")
        if not obj.banner_image:
            return None
        return request.build_absolute_uri(obj.banner_image.url) if request else obj.banner_image.url

    def get_is_suspended(self, obj):
        return obj.is_suspended


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'role', 'password']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class PasswordResetSerializer(serializers.Serializer):
    new_password = serializers.CharField(min_length=8)


class SuspendSerializer(serializers.Serializer):
    minutes = serializers.IntegerField(min_value=1, max_value=60 * 24 * 30)
