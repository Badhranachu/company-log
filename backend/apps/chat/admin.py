from django.contrib import admin
from .models import ChatBox, ChatBoxMember, Message

admin.site.register(ChatBox)
admin.site.register(ChatBoxMember)
admin.site.register(Message)
