#!/bin/bash
set -e

echo "Running database migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Running production setup (users, services, disclaimer)..."
python manage.py setup_production

echo "Seeding UK compliance baseline..."
python manage.py seed_compliance

echo "Starting Gunicorn..."
exec gunicorn booking_platform.wsgi:application --bind 0.0.0.0:$PORT --timeout 120
