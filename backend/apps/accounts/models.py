from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import BaseUserManager
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.ROLE_OWNER)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    ROLE_OWNER = 'owner'
    ROLE_USER = 'user'
    ROLE_CHOICES = [(ROLE_OWNER, 'Owner'), (ROLE_USER, 'User')]

    username = None
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_USER)
    name = models.CharField(max_length=255)
    username_alias = models.CharField(max_length=80, blank=True, default="")
    phone_number = models.CharField(max_length=30, blank=True, default="")
    bio = models.TextField(blank=True, default="")
    status_message = models.CharField(max_length=160, blank=True, default="")
    department = models.CharField(max_length=120, blank=True, default="")
    profile_picture = models.ImageField(upload_to="profiles/avatar/", null=True, blank=True)
    banner_image = models.ImageField(upload_to="profiles/banner/", null=True, blank=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    is_online = models.BooleanField(default=False)
    is_banned = models.BooleanField(default=False)
    suspended_until = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']
    objects = UserManager()

    def __str__(self):
        return f'{self.name} ({self.email})'

    @property
    def is_suspended(self):
        return bool(self.suspended_until and self.suspended_until > timezone.now())


class OTPCode(models.Model):
    PURPOSE_EMAIL = 'email_change'
    PURPOSE_PASSWORD = 'password_change'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otp_codes')
    purpose = models.CharField(max_length=20)
    otp = models.CharField(max_length=6)
    new_email = models.EmailField(blank=True, default='')
    expires_at = models.DateTimeField()

    class Meta:
        indexes = [models.Index(fields=['user', 'purpose'])]

    @property
    def is_valid(self):
        return timezone.now() < self.expires_at
