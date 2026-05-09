from rest_framework.permissions import BasePermission, SAFE_METHODS


class ChatBoxPermission(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'owner':
            return True
        if request.method in SAFE_METHODS:
            return True
        return obj.created_by_id == request.user.id


class MessagePermission(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'owner':
            return True
        if request.method in SAFE_METHODS:
            return True
        return obj.sender_id == request.user.id
