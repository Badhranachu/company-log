from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0005_chatbox_chat_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='message',
            name='is_system',
            field=models.BooleanField(default=False),
        ),
    ]
