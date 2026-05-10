from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0004_upgrade_chat_permissions_delete_state'),
    ]

    operations = [
        migrations.AddField(
            model_name='chatbox',
            name='chat_type',
            field=models.CharField(
                choices=[('group', 'Group'), ('direct', 'Direct Message')],
                default='group',
                max_length=10,
            ),
        ),
    ]
