# The Mind Department — Full Platform

Production booking and business management platform for **The Mind Department** (Aly Harwood), a mindfulness practice based in Northumberland.

**Live site:** https://theminddepartmentwebsite.vercel.app
**Backend API:** https://theminddepartmentwebsite-production.up.railway.app

---

## Architecture

| Layer | Stack | Host |
|-------|-------|------|
| **Frontend** | Next.js 14 (App Router) | Vercel |
| **Backend** | Django 5.2 + DRF | Railway |
| **Database** | PostgreSQL | Railway (managed) |
| **Email** | IONOS SMTP (`minddept.bookings@nbne.uk`) | IONOS |
| **Static files** | WhiteNoise | Railway |

### Key design decisions
- JWT authentication with role-based access (customer, staff, manager, owner)
- Next.js middleware enforces route protection client-side
- Django API proxy via `/api/django/[...path]` catch-all route (avoids CORS)
- Static public site served from `frontend/public/*.html` with shared CSS
- Admin panel is a Next.js SPA at `/admin/*`

---

## Features

### Public Site (`/home.html`, `/about.html`, etc.)
- Static HTML pages with responsive design
- Brand colours, custom typography, event photography
- Online booking flow at `/booking`
- Contact form

### Booking System
- Service, staff, and client management
- Dynamic slot generation with double-booking prevention
- Staff schedules, business hours, closures, and leave
- Smart Booking Engine (SBE) — risk scoring, demand indexing
- Intake profiles and wellbeing disclaimers with renewal tracking
- Booking confirmation and reminder emails (24h and 1h before)
- Class packages (multi-session passes)

### Admin Panel (`/admin/*`)
- **Dashboard** — Revenue, bookings, client health, owner actions
- **Bookings** — Full CRUD, calendar view, status management
- **Clients** — Client profiles, booking history
- **Disclaimers** — Intake profiles, disclaimer versioning, renewal management
- **CRM** — Lead pipeline, auto-sync from bookings
- **Compliance** — UK HSE baseline (fire, electrical, gas, insurance, risk assessments), Peace of Mind Score
- **Documents** — Document vault with tagging
- **Business Insights** — Cross-module health overview
- **Reports** — Revenue, utilisation, client retention analytics

### Authentication & Security
- JWT tokens with embedded role and `must_change_password` flag
- Owner invite system with single-use, time-limited tokens
- Password reset flow with branded email links
- Middleware-based route protection by role

### Email System
- IONOS SMTP via `minddept.bookings@nbne.uk`
- Booking confirmation emails
- Automated reminders (24h and 1h before session)
- Invite and password reset emails
- Background reminder worker (10-minute loop)

### Payments (Stripe — scaffolded)
- Stripe Checkout session creation
- Deposit and full payment support
- Webhook handling for payment confirmation

---

## Project Structure

```
theminddepartmentwebsite/
├── backend/
│   ├── booking_platform/     # Django project settings, URLs
│   ├── bookings/             # Booking, service, client, staff, schedule models & views
│   ├── core/                 # Config model, auth views, password tokens
│   ├── compliance/           # UK HSE compliance items, categories, scoring
│   ├── crm/                  # Lead management, booking sync
│   ├── comms/                # Communications module
│   ├── documents/            # Document vault
│   ├── start.sh              # Railway startup script
│   ├── railway.json          # Railway build/deploy config
│   └── requirements.txt
├── frontend/
│   ├── app/                  # Next.js App Router pages
│   │   ├── admin/            # Admin panel (dashboard, bookings, clients, etc.)
│   │   ├── booking/          # Public booking flow
│   │   ├── login/            # Login page
│   │   ├── set-password/     # Token-based password set
│   │   ├── forgot-password/  # Password reset request
│   │   └── reset-password/   # Token-based password reset
│   ├── lib/api.ts            # API client functions
│   ├── middleware.ts          # JWT auth + role-based route protection
│   └── public/               # Static site (HTML, CSS, assets, event photos)
└── images/                   # Source event photography
```

---

## Deployment

### Backend (Railway)

**Build:** Nixpacks with `pip install -r requirements.txt`
**Start:** `chmod +x start.sh && bash start.sh`

`start.sh` runs on every deploy:
1. `migrate` — Apply database migrations
2. `collectstatic` — Gather static files
3. `setup_production` — Ensure default users, services, disclaimers
4. `invite_owner` — Create/resend Aly's owner account invite
5. `seed_compliance` — UK HSE baseline items
6. `seed_document_vault` — Default document placeholders
7. `sync_crm_leads` — Sync CRM from bookings
8. `update_demand_index` — Service demand scoring
9. `backfill_sbe_scores` — Smart Booking Engine scores
10. `send_booking_reminders --loop &` — Background reminder worker
11. `gunicorn` — Start web server

#### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `DJANGO_SECRET_KEY` | Django secret key |
| `DEBUG` | `False` for production |
| `ALLOWED_HOSTS` | Comma-separated hostnames |
| `EMAIL_HOST` | `smtp.ionos.co.uk` |
| `EMAIL_HOST_USER` | SMTP username |
| `EMAIL_HOST_PASSWORD` | SMTP password |
| `REMINDER_EMAIL_HOST` | `smtp.ionos.co.uk` |
| `REMINDER_EMAIL_HOST_USER` | `minddept.bookings@nbne.uk` |
| `REMINDER_EMAIL_HOST_PASSWORD` | SMTP password |
| `REMINDER_EMAIL_PORT` | `465` |
| `REMINDER_EMAIL_USE_SSL` | `True` |
| `FRONTEND_URL` | `https://theminddepartmentwebsite.vercel.app` |

### Frontend (Vercel)

**Framework:** Next.js (auto-detected)
**Root directory:** `frontend`

| Variable | Description |
|----------|-------------|
| `DJANGO_BACKEND_URL` | Railway backend URL |
| `NEXT_PUBLIC_API_BASE_URL` | Same as above (for client-side) |

---

## Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # Edit with local DB credentials
python manage.py migrate
python manage.py setup_production
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev
```

---

## Owner Access

- **Owner:** Aly Harwood (`contact@theminddepartment.com`)
- **Username:** `contact` (derived from email prefix)
- **Login:** https://theminddepartmentwebsite.vercel.app/login
- **Invite:** Sent automatically on deploy via `invite_owner` management command
- **Password reset:** Available via "Forgot your password?" on login page

---

## Status (Feb 2026)

### Complete
- ✅ Public website with event photography
- ✅ Online booking system with intake profiles
- ✅ Admin panel (dashboard, bookings, clients, disclaimers, CRM, compliance, documents, reports)
- ✅ Smart Booking Engine (risk scoring, demand indexing)
- ✅ UK HSE compliance module with Peace of Mind Score
- ✅ JWT authentication with role-based access control
- ✅ Owner invite and password reset flows with email
- ✅ Automated booking reminder emails (24h + 1h)
- ✅ CRM with auto-sync from bookings
- ✅ Document vault
- ✅ Business Insights dashboard

### In Progress
- 🔄 Stripe payment integration (scaffolded, not live)
- 🔄 Staff portal (shifts, leave, training)

### Planned
- ⏳ Class package booking flow (frontend)
- ⏳ Client self-service portal
- ⏳ Push notifications
- ⏳ Reporting exports (CSV/PDF)
