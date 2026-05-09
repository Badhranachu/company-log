from .models import Message, ChatBox


def create_message(*, chatbox: ChatBox, sender, message: str):
    return Message.objects.create(chatbox=chatbox, sender=sender, message=message)
