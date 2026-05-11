#!/bin/sh
set -e

echo "==> Installing Python requirements..."
pip install --no-cache-dir -r requirements.txt

echo "==> Waiting for MySQL..."
python -c "
import os, time, pymysql
host = os.getenv('MYSQL_HOST', 'db')
port = int(os.getenv('MYSQL_PORT', '3306'))
user = os.getenv('MYSQL_USER', 'companylog')
pwd  = os.getenv('MYSQL_PASSWORD', 'companylog123')
db   = os.getenv('MYSQL_DATABASE', 'companylog')
for i in range(60):
    try:
        conn = pymysql.connect(host=host, port=port, user=user, password=pwd, database=db)
        conn.close()
        print('MySQL ready')
        break
    except Exception as e:
        print(f'waiting... {i+1}/60: {e}')
        time.sleep(2)
else:
    raise SystemExit('MySQL did not become ready in time')
"

echo "==> Running makemigrations..."
python manage.py makemigrations --noinput

echo "==> Running migrate..."
python manage.py migrate --noinput

echo "==> Collecting static files..."
python manage.py collectstatic --noinput || true

echo "==> Starting server..."
exec uvicorn config.asgi:application --host 0.0.0.0 --port 5000
