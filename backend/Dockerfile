FROM python:3.12-slim

WORKDIR /app
RUN apt-get update && apt-get install -y default-libmysqlclient-dev build-essential pkg-config && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && pip install --no-cache-dir -r requirements.txt
COPY . .
RUN chmod +x /app/entrypoint.sh
EXPOSE 5000
CMD ["/app/entrypoint.sh"]
