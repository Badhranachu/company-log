import json
from django.utils import timezone
from django.db import models
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from .models import ChatBox, ChatBoxMember, Message
from apps.accounts.models import User


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.chatbox_id = int(self.scope['url_route']['kwargs']['chatbox_id'])
        self.group_name = f'chat_{self.chatbox_id}'
        user = self.scope.get('user')
        if not user or user.is_anonymous:
            await self.close(code=4001)
            return
        if not await self._can_access_chatbox(user.id):
            await self.close(code=4003)
            return
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self._set_presence(user.id, True)
        await self.channel_layer.group_send(self.group_name, {'type': 'presence', 'user_id': user.id, 'online': True})

    async def disconnect(self, close_code):
        user = self.scope.get('user')
        if user and not user.is_anonymous:
            await self._set_presence(user.id, False)
            await self.channel_layer.group_send(self.group_name, {'type': 'presence', 'user_id': user.id, 'online': False})
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        event_type = data.get('type', 'message')
        if event_type == 'typing':
            await self.channel_layer.group_send(self.group_name, {'type': 'typing', 'user_id': self.scope['user'].id})
            return
        if event_type == 'seen':
            await self._mark_seen(data.get('message_id'))
            await self.channel_layer.group_send(self.group_name, {'type': 'seen_event', 'message_id': data.get('message_id'), 'user_id': self.scope['user'].id})
            return
        if event_type == 'message':
            message = await self._create_message(data)
            if message:
                await self.channel_layer.group_send(self.group_name, {'type': 'message_event', 'message': message})
        if event_type == 'delete':
            message_id = data.get('message_id')
            ok = await self._delete_for_everyone(message_id)
            if ok:
                await self.channel_layer.group_send(self.group_name, {'type': 'delete_event', 'message_id': message_id})

    async def message_event(self, event):
        await self.send(text_data=json.dumps({'type': 'message', 'payload': event['message']}))

    async def typing(self, event):
        await self.send(text_data=json.dumps({'type': 'typing', 'payload': event}))

    async def presence(self, event):
        await self.send(text_data=json.dumps({'type': 'presence', 'payload': event}))

    async def seen_event(self, event):
        await self.send(text_data=json.dumps({'type': 'seen', 'payload': event}))

    async def delete_event(self, event):
        await self.send(text_data=json.dumps({'type': 'delete', 'payload': {'message_id': event['message_id']}}))

    @database_sync_to_async
    def _can_access_chatbox(self, user_id: int) -> bool:
        chatbox = ChatBox.objects.filter(id=self.chatbox_id).first()
        if not chatbox:
            return False
        if chatbox.created_by_id == user_id:
            return True
        return ChatBoxMember.objects.filter(chatbox_id=self.chatbox_id, user_id=user_id).exists()

    @database_sync_to_async
    def _create_message(self, data):
        user = self.scope['user']
        chatbox = ChatBox.objects.get(id=self.chatbox_id)
        membership = ChatBoxMember.objects.filter(chatbox=chatbox, user=user).first()
        if user.role != 'owner' and not membership and chatbox.created_by_id != user.id:
            return None
        if chatbox.visibility_type == ChatBox.VISIBILITY_VIEW_ONLY and user.role != 'owner' and chatbox.created_by_id != user.id:
            return None
        msg = Message.objects.create(
            chatbox=chatbox,
            sender=user,
            message=data.get('message', ''),
            reply_to_id=data.get('reply_to') or None,
        )
        ChatBoxMember.objects.filter(chatbox=chatbox).exclude(user=user).update(unread_count=models.F("unread_count") + 1)
        return {
            'id': msg.id,
            'client_id': data.get('client_id'),
            'chatbox': msg.chatbox_id,
            'sender': msg.sender_id,
            'sender_name': msg.sender.name,
            'message': msg.message,
            'created_at': msg.created_at.isoformat(),
            'is_pinned': msg.is_pinned,
            'is_ticked': msg.is_ticked,
            'attachment_url': None,
            'attachment_type': msg.attachment_type,
            'reply_to': msg.reply_to_id,
            'seen_by_ids': [],
        }

    @database_sync_to_async
    def _delete_for_everyone(self, message_id) -> bool:
        if not message_id:
            return False
        user = self.scope['user']
        from django.utils import timezone
        from datetime import timedelta
        msg = Message.objects.filter(id=message_id, chatbox_id=self.chatbox_id).first()
        if not msg:
            return False
        if user.role != 'owner' and msg.sender_id != user.id:
            return False
        if user.role != 'owner' and timezone.now() - msg.created_at > timedelta(hours=1):
            return False
        msg.deleted_for_everyone = True
        msg.deleted_at = timezone.now()
        msg.deleted_by = user
        msg.message = ''
        msg.attachment = None
        msg.save(update_fields=['deleted_for_everyone', 'deleted_at', 'deleted_by', 'message', 'attachment'])
        return True

    @database_sync_to_async
    def _mark_seen(self, message_id):
        if not message_id:
            return
        msg = Message.objects.filter(id=message_id, chatbox_id=self.chatbox_id).first()
        if msg:
            msg.seen_by.add(self.scope['user'])
            ChatBoxMember.objects.filter(chatbox_id=self.chatbox_id, user=self.scope["user"]).update(unread_count=0)

    @database_sync_to_async
    def _set_presence(self, user_id: int, online: bool):
        User.objects.filter(id=user_id).update(is_online=online, last_seen_at=timezone.now())
