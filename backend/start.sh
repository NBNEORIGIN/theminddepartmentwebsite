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

echo "Seeding Document Vault..."
python manage.py seed_document_vault || echo "WARNING: seed_document_vault failed (non-fatal)"

echo "Syncing CRM leads from bookings..."
python manage.py sync_crm_leads

echo "Updating service demand indices..."
python manage.py update_demand_index

echo "Backfilling Smart Booking Engine scores..."
python manage.py backfill_sbe_scores

echo "Starting booking reminder worker (background)..."
python manage.py send_booking_reminders --loop &

echo "Starting Gunicorn..."
exec gunicorn booking_platform.wsgi:application --bind 0.0.0.0:$PORT --timeout 120
