from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="banner_image",
            field=models.ImageField(blank=True, null=True, upload_to="profiles/banner/"),
        ),
        migrations.AddField(
            model_name="user",
            name="bio",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="user",
            name="department",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="user",
            name="is_online",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="user",
            name="last_seen_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="phone_number",
            field=models.CharField(blank=True, default="", max_length=30),
        ),
        migrations.AddField(
            model_name="user",
            name="profile_picture",
            field=models.ImageField(blank=True, null=True, upload_to="profiles/avatar/"),
        ),
        migrations.AddField(
            model_name="user",
            name="status_message",
            field=models.CharField(blank=True, default="", max_length=160),
        ),
        migrations.AddField(
            model_name="user",
            name="username_alias",
            field=models.CharField(blank=True, default="", max_length=80),
        ),
    ]

