from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_user_profile_fields"),
        ("chat", "0003_add_hidden_by"),
    ]

    operations = [
        migrations.AddField(
            model_name="chatbox",
            name="can_members_edit_description",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="chatbox",
            name="can_members_edit_media",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="chatbox",
            name="can_members_edit_name",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="chatbox",
            name="edit_mode",
            field=models.CharField(
                choices=[("admins", "Only Admins"), ("everyone", "Everyone"), ("owner", "Owner Only")],
                default="admins",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="chatbox",
            name="group_avatar",
            field=models.ImageField(blank=True, null=True, upload_to="chatboxes/avatar/"),
        ),
        migrations.AddField(
            model_name="chatbox",
            name="group_banner",
            field=models.ImageField(blank=True, null=True, upload_to="chatboxes/banner/"),
        ),
        migrations.AddField(
            model_name="chatboxmember",
            name="is_admin",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="chatboxmember",
            name="is_muted",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="chatboxmember",
            name="is_pinned",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="chatboxmember",
            name="unread_count",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="message",
            name="deleted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="message",
            name="deleted_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="deleted_messages",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="message",
            name="deleted_for_everyone",
            field=models.BooleanField(default=False),
        ),
    ]

