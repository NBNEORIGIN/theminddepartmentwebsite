# NBNE Booking Platform - Django

Single-tenant booking platform built with Django and PostgreSQL for Windows deployment.

## Why Django?

Switched from Next.js to Django for:
- **Native Windows support** - No Docker required
- **Reliable PostgreSQL** - No authentication issues
- **Lower resources** - Runs on old PC
- **Built-in admin** - Config management UI
- **Simpler deployment** - Windows Server ready

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 16 (native Windows install)

### Installation

```bash
# Clone repository
git clone <repo-url>
cd nbne-booking-django

# Create virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env with your database credentials

# Setup database
python manage.py migrate
python manage.py createsuperuser
python manage.py loaddata initial_config

# Run development server
python manage.py runserver
```

Access at: **http://localhost:8000**

## Tech Stack

- **Backend**: Django 5.2
- **Database**: PostgreSQL 16
- **Task Queue**: Celery + Redis
- **Frontend**: Django templates + HTMX
- **Static Files**: Whitenoise
- **WSGI Server**: Waitress (Windows) / Gunicorn (Linux)

## Features

- ✅ Loop 1: Django + PostgreSQL baseline
- ⏳ Loop 2: Backup/restore scripts
- ⏳ Loop 3: Instance bootstrap
- ⏳ Loop 4: Config system (Django admin)
- ⏳ Loop 5: Booking data model
- ⏳ Loop 6: Slot generation API
- ⏳ Loop 7: Sessions listing API
- ⏳ Loop 8: House of Hair UI
- ⏳ Loop 9: Mind Dept UI
- ⏳ Loop 10: Email worker (Celery)
- ⏳ Loop 11: SMS scaffold
- ⏳ Loop 12: Client portal
- ⏳ Loop 13: GDPR + security

## Project Structure

```
nbne-booking-django/
├── booking_platform/      # Django project settings
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── core/                  # Core app (config, health)
│   ├── models.py
│   ├── views.py
│   └── admin.py
├── bookings/              # Bookings app
│   ├── models.py
│   ├── views.py
│   └── admin.py
├── templates/             # HTML templates
├── static/                # CSS, JS, images
├── scripts/               # Backup/bootstrap scripts
├── requirements.txt       # Python dependencies
└── manage.py              # Django management
```

## Windows Deployment

### Development (Old PC)

```bash
# Install PostgreSQL for Windows
# Download from postgresql.org

# Run Django
python manage.py runserver 0.0.0.0:8000
```

### Production (Windows Server)

```bash
# Install dependencies
pip install -r requirements.txt
pip install waitress

# Collect static files
python manage.py collectstatic

# Run with Waitress
waitress-serve --port=8000 booking_platform.wsgi:application
```

### IIS Deployment (Optional)

Use `wfastcgi` for IIS integration:
```bash
pip install wfastcgi
wfastcgi-enable
```

## Database Setup (Windows)

1. Install PostgreSQL 16 for Windows
2. Create database:
```sql
CREATE DATABASE booking_db;
CREATE USER booking_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE booking_db TO booking_user;
```

3. Update `.env` with credentials
4. Run migrations: `python manage.py migrate`

## Creating Client Instances

```bash
# Run bootstrap script
python scripts/create_instance.py house-of-hair D:\clients\house-of-hair

# Each instance gets:
# - Own database
# - Own .env config
# - Own static files
# - Config-driven branding
```

## Admin Panel

Access Django admin at: **http://localhost:8000/admin**

Manage:
- Configuration (branding, features)
- Bookings
- Clients
- Services
- Staff

## License

MIT
