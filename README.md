# Company Log App

Internal collaboration platform with WhatsApp Web-like UX for team communication, process documentation, updates, and knowledge sharing.

## What You Get
- Role-based access (`owner`, `user`)
- JWT auth + persistent login
- Chat boxes with visibility modes (`view_only`, `chat_enabled`)
- Realtime chat with Django Channels (typing, presence, seen)
- Message actions: reply, pin, tick, delete, edit-ready schema
- File uploads: image/video/pdf/docs/zip with validation
- Owner pages: Add User, Users List, Reset Password, Delete User
- Profile and settings pages
- Dockerized stack with MySQL + Redis + backend + frontend

## One Command Runtime
```bash
docker compose up --build
```
This automatically:
- starts MySQL
- starts Redis
- waits for DB readiness
- runs migrations
- serves Django HTTP + WebSockets on a single ASGI process (`uvicorn config.asgi:application`)
- mounts media uploads persistently

No separate websocket server command is needed.

## URLs
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000/api/v1/`
- WebSocket: `ws://localhost:8000/ws/chat/{chatbox_id}/?token=<JWT_ACCESS_TOKEN>`

## Key API Routes
- `POST /api/v1/auth/login/`
- `GET /api/v1/auth/me/`
- `PATCH /api/v1/auth/update_profile/`
- `GET|POST /api/v1/users/` (owner create)
- `DELETE /api/v1/users/{id}/` (owner)
- `POST /api/v1/users/{id}/reset_password/` (owner)
- `GET|POST /api/v1/chatboxes/`
- `POST /api/v1/chatboxes/{id}/add_member/`
- `POST /api/v1/chatboxes/{id}/archive/`
- `POST /api/v1/chatboxes/{id}/star/`
- `GET|POST /api/v1/messages/?chatbox={id}`
- `POST /api/v1/messages/{id}/toggle_tick/`
- `POST /api/v1/messages/{id}/toggle_pin/`
- `POST /api/v1/messages/{id}/seen/`

## Local Dev (Without Docker)
### Backend
```bash
cd backend
python -m venv venv
# activate venv
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Required Follow-up After Pulling Latest Changes
Since message model changed (new `attachment_type` and index), run:
```bash
python manage.py makemigrations
python manage.py migrate
```

## Volumes
- `mysql_data`: MySQL persistence
- `media_data`: Uploaded media persistence

## Security/Validation Included
- JWT auth for REST
- JWT auth for WebSockets (query token)
- DRF throttling
- Permission checks for owner/chat creator/sender actions
- File type + size validation (30MB max)
