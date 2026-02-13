#!/bin/bash

# Critical — must succeed
echo "Running database migrations..."
python manage.py migrate --noinput || { echo "FATAL: migrations failed"; exit 1; }

echo "Collecting static files..."
python manage.py collectstatic --noinput || echo "WARNING: collectstatic failed"

# Setup commands — non-fatal, each in subshell so crashes don't kill parent
echo "Running production setup (users, services, disclaimer)..."
(python manage.py setup_production) || echo "WARNING: setup_production failed"

echo "Ensuring owner account for Aly Harwood..."
(python manage.py invite_owner --email contact@theminddepartment.com --name "Aly Harwood" --resend) || echo "WARNING: invite_owner failed"

echo "Seeding UK compliance baseline..."
(python manage.py seed_compliance) || echo "WARNING: seed_compliance failed"

echo "Seeding Document Vault..."
(python manage.py seed_document_vault) || echo "WARNING: seed_document_vault failed"

echo "Syncing CRM leads from bookings..."
(python manage.py sync_crm_leads) || echo "WARNING: sync_crm_leads failed"

echo "Updating service demand indices..."
(python manage.py update_demand_index) || echo "WARNING: update_demand_index failed"

echo "Backfilling Smart Booking Engine scores..."
(python manage.py backfill_sbe_scores) || echo "WARNING: backfill_sbe_scores failed"

echo "Starting booking reminder worker (background)..."
python manage.py send_booking_reminders --loop &

echo "Starting Gunicorn..."
exec gunicorn booking_platform.wsgi:application --bind 0.0.0.0:$PORT --timeout 120
