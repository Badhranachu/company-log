from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_user_profile_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="is_banned",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="user",
            name="suspended_until",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

