# Run backend with ASGI/WebSocket support (use this instead of manage.py runserver)
.\venv\Scripts\python.exe -m uvicorn config.asgi:application --reload --port 8000
