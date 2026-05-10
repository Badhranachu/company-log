from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from django.views.static import serve
from rest_framework.routers import DefaultRouter
from apps.accounts.views import UserViewSet, AuthViewSet
from apps.chat.views import ChatBoxViewSet, MessageViewSet
from apps.chat.media_views import serve_media_range

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("auth", AuthViewSet, basename="auth")
router.register("chatboxes", ChatBoxViewSet, basename="chatbox")
router.register("messages", MessageViewSet, basename="message")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include((router.urls, "api"), namespace="v1")),
    # Range-request capable media serving (required for video seek/streaming)
    path("media/<path:path>", serve_media_range),
]

