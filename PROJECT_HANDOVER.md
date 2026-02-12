# The Mind Department — Full Project Handover

> **Last updated:** February 2026
> **Client:** Aly Harwood — The Mind Department (wellness / mindfulness business, UK-based)
> **Developer:** NBNE (Toby)
> **Repo:** `NBNEORIGIN/theminddepartmentwebsite` (GitHub)

---

## 1. What This Project Is

A **full-stack booking and business management platform** for The Mind Department, a UK wellness/mindfulness business. It handles:

- Public-facing **session booking** with Stripe payments
- **Admin panel** for the business owner/managers (bookings, services, staff, reports, CRM, compliance, documents)
- **Staff portal** for employees (shifts, leave, training, team chat, documents, HSE)
- **Smart Booking Engine (SBE)** — an R&D-eligible algorithmic system that scores client reliability, calculates booking risk, recommends pricing/deposit strategies, and logs all decisions for HMRC R&D evidence
- **UK HSE compliance** module (risk assessments, incident reports, equipment inspections, compliance scoring)
- **Multi-tenant architecture** — the codebase is designed to be reusable across different NBNE clients via tenant config/branding

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel (Frontend)                     │
│              Next.js 14 / React 18 / TypeScript         │
│                    Port 3002 (dev)                       │
│                                                         │
│  /api/django/[...path]  ──proxy──►  Django backend      │
│  /api/auth              ──local──►  JWT cookie mgmt     │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────┐
│                   Railway (Backend)                      │
│           Django 5.2 / DRF / PostgreSQL                 │
│           Gunicorn / WhiteNoise / SimpleJWT             │
│                                                         │
│  /api/*  ──  REST endpoints                             │
│  /admin/ ──  Django Jazzmin admin                       │
└─────────────────────────────────────────────────────────┘
```

### Key Integration Points

| Concern | Technology | Notes |
|---------|-----------|-------|
| **Database** | PostgreSQL (Railway) | `DATABASE_PUBLIC_URL` env var |
| **Auth** | SimpleJWT (Django) → cookie-based session (Next.js middleware) | JWT in `nbne_session` httpOnly cookie |
| **Payments** | Stripe Checkout + Webhooks | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **Email** | Resend HTTP API (Railway blocks SMTP) | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| **Static files** | WhiteNoise (Django) | Collected to `backend/staticfiles/` |
| **Admin theme** | Jazzmin | Configured in `booking_platform/jazzmin_settings.py` |

---

## 3. Repository Structure

```
theminddepartmentwebsite/
├── backend/                          # Django project
│   ├── booking_platform/             # Django settings, urls, wsgi
│   │   ├── settings.py               # Main config (env-driven)
│   │   ├── urls.py                   # All API route registration
│   │   └── jazzmin_settings.py       # Admin panel theming
│   ├── bookings/                     # Core booking app
│   │   ├── models.py                 # Service, Staff, Client, Booking, Session, BusinessHours, etc.
│   │   ├── models_intake.py          # IntakeProfile, IntakeWellbeingDisclaimer (GDPR-safe)
│   │   ├── models_payment.py         # ClassPackage, ClientCredit, PaymentTransaction
│   │   ├── models_availability.py    # WorkingPattern, Rules, Overrides, Leave, Shifts, Timesheets
│   │   ├── models_schedule.py        # Legacy schedule models
│   │   ├── smart_engine.py           # SBE: reliability, risk, recommendation, demand (R&D)
│   │   ├── availability.py           # Slot generation engine
│   │   ├── api_views.py              # DRF ViewSets (Service, Staff, Booking, Client, StaffBlock)
│   │   ├── views_reports.py          # Reports Intelligence API (overview, daily, monthly, staff, insights)
│   │   ├── views_dashboard.py        # Dashboard summary + SBE backfill
│   │   ├── views_demo.py             # Demo data seed/delete endpoints
│   │   ├── views_intake.py           # Intake profile + disclaimer CRUD
│   │   ├── views_payment.py          # Payment integration endpoints
│   │   ├── views_stripe.py           # Stripe checkout session + webhook handler
│   │   ├── views_availability.py     # Availability engine API
│   │   ├── views_schedule.py         # Business hours, staff schedules, closures
│   │   ├── serializers.py            # Core serializers
│   │   ├── serializers_intake.py     # Intake serializers
│   │   ├── serializers_payment.py    # Payment serializers
│   │   ├── serializers_availability.py # Availability serializers
│   │   └── management/commands/      # CLI commands (see §7)
│   ├── compliance/                   # HSE & compliance app
│   │   ├── models.py                 # IncidentReport, RiskAssessment, HazardFinding, Equipment, ComplianceItem, etc.
│   │   ├── views.py                  # Full CRUD + compliance scoring + RAMS
│   │   └── urls.py                   # /api/compliance/*
│   ├── crm/                          # CRM / lead tracking
│   │   ├── models.py                 # Lead model (status pipeline, source tracking)
│   │   ├── views.py                  # Lead CRUD + stats
│   │   └── urls.py                   # /api/crm/*
│   ├── core/                         # Shared platform core
│   │   ├── models.py                 # Config key-value store (branding, features, system)
│   │   ├── auth_views.py             # JWT login, /me, set-password
│   │   ├── tenant_views.py           # Tenant settings + branding API
│   │   ├── config_loader.py          # Config loading utilities
│   │   └── views.py                  # Catch-all / health check
│   ├── requirements.txt              # Python dependencies
│   ├── railway.json                  # Railway deploy config
│   ├── start.sh                      # Full startup script (migrate, collectstatic, seed, gunicorn)
│   └── .env.example                  # Environment variable template
│
├── frontend/                         # Next.js project
│   ├── app/
│   │   ├── layout.tsx                # Root layout + TenantProvider
│   │   ├── globals.css               # Global CSS design system (light theme, variables, components)
│   │   ├── page.tsx                  # Landing / redirect
│   │   ├── login/                    # Login page
│   │   ├── set-password/             # First-login password set
│   │   ├── booking/                  # Public booking flow (service select → slot pick → Stripe checkout)
│   │   ├── intake/                   # Public intake form (pre-booking questionnaire)
│   │   ├── admin/                    # Admin panel (owner/manager)
│   │   │   ├── layout.tsx            # Admin shell (sidebar, topbar, nav)
│   │   │   ├── page.tsx              # Admin dashboard (KPIs, charts, SBE summary)
│   │   │   ├── bookings/             # Booking management
│   │   │   ├── services/             # Service CRUD + pricing
│   │   │   ├── staff/                # Staff management, shifts, leave, training, timesheets
│   │   │   ├── schedule/             # Timesheet management
│   │   │   ├── reports/              # Reports Intelligence (overview, daily, monthly, staff tabs)
│   │   │   ├── clients/              # CRM / lead pipeline
│   │   │   ├── disclaimers/          # Intake & disclaimer management
│   │   │   ├── chat/                 # Team chat
│   │   │   ├── hse/                  # Health & Safety (incidents, risk assessments, equipment, compliance)
│   │   │   ├── documents/            # Document management
│   │   │   ├── analytics/            # Analytics dashboard
│   │   │   ├── audit/                # Audit log viewer
│   │   │   └── settings/             # Business settings
│   │   ├── app/                      # Staff portal
│   │   │   ├── layout.tsx            # Staff shell
│   │   │   ├── page.tsx              # Staff dashboard
│   │   │   ├── shifts/               # My shifts
│   │   │   ├── leave/                # Leave requests
│   │   │   ├── training/             # Training records
│   │   │   ├── chat/                 # Team chat (staff view)
│   │   │   ├── documents/            # Documents (staff view)
│   │   │   ├── hse/                  # HSE (staff view)
│   │   │   └── staff.css             # Admin/staff shell CSS
│   │   └── api/
│   │       ├── auth/route.ts         # Local auth cookie management
│   │       └── django/[...path]/route.ts  # Catch-all proxy to Django backend
│   ├── lib/
│   │   ├── api.ts                    # Typed API client (JWT auth, all endpoints)
│   │   ├── auth.ts                   # JWT create/verify, demo user auth
│   │   ├── types.ts                  # Shared TypeScript interfaces
│   │   ├── tenant.tsx                # TenantProvider context (branding, modules)
│   │   └── demo-data.ts             # Frontend demo/seed data
│   ├── middleware.ts                 # Route protection (RBAC: /admin → manager+, /app → staff+)
│   ├── package.json                  # Node dependencies
│   └── .env.example                  # Frontend env template
│
├── RND/                              # R&D evidence folder
│   └── logs/                         # Optimisation decision logs
└── README.md                         # Basic setup instructions
```

---

## 4. Data Model Summary

### `bookings` app — Core Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **Service** | Bookable service/class | `name`, `duration_minutes`, `price`, `category`, `active`, `deposit_pence`, `deposit_percentage`, `deposit_strategy`, `smart_pricing_enabled`, `off_peak_discount_percent`, `no_show_rate`, `demand_index`, `peak_utilisation_rate`, `avg_risk_score`, `sort_order`, `data_origin`, `demo_seed_id` |
| **Staff** | Staff member | `name`, `email`, `phone`, `role` (staff/manager/owner), `photo_url`, `services` (M2M), `active` |
| **Client** | Booking customer | `name`, `email`, `phone`, `notes`, `total_bookings`, `completed_bookings`, `cancelled_bookings`, `no_show_count`, `consecutive_no_shows`, `reliability_score`, `lifetime_value`, `avg_days_between_bookings`, `data_origin`, `demo_seed_id` |
| **Booking** | Individual booking | `client` (FK), `service` (FK), `staff` (FK), `start_time`, `end_time`, `status` (pending/confirmed/completed/cancelled/no_show), `payment_status`, `payment_id`, `payment_amount`, `payment_type`, `risk_score`, `risk_level`, `revenue_at_risk`, `recommended_*` fields, `optimisation_snapshot`, `data_origin`, `demo_seed_id` |
| **Session** | Group session | `title`, `service` (FK), `staff` (FK), `start_time`, `end_time`, `capacity`, `enrolled_clients` (M2M) |
| **BusinessHours** | Weekly opening hours | `day_of_week`, `is_open`, `open_time`, `close_time` |
| **StaffSchedule** | Staff weekly schedule | `staff` (FK), `day_of_week`, `is_working`, `start_time`, `end_time` |
| **Closure** | Business closure dates | `date`, `reason`, `all_day`, `start_time`, `end_time` |
| **StaffBlock** | Staff unavailability | `staff` (FK), `date`, `start_time`, `end_time`, `reason`, `all_day` |
| **StaffLeave** | Staff time off | `staff` (FK), `start_date`, `end_date`, `reason` |
| **OptimisationLog** | R&D evidence log | `booking` (FK), `input_data`, `output_recommendation`, `override_applied`, `reliability_score`, `risk_score` |
| **ServiceOptimisationLog** | Service-level R&D log | `service` (FK), `previous_price`, `new_price`, `reason`, `ai_recommended`, `owner_override`, `input_metrics`, `output_recommendation` |

### `bookings` app — Intake Models (`models_intake.py`)

| Model | Purpose |
|-------|---------|
| **IntakeProfile** | GDPR-safe pre-booking questionnaire (name, email, phone, emergency contact, experience level, goals, preferences, consent fields, disclaimer version, renewal tracking, 1-year expiry) |
| **IntakeWellbeingDisclaimer** | Versioned disclaimer text (only one active at a time, editable by owner) |

### `bookings` app — Payment Models (`models_payment.py`)

| Model | Purpose |
|-------|---------|
| **ClassPackage** | Purchasable class packs (e.g. "5 Class Pass") with price, validity |
| **ClientCredit** | Client's remaining credits from a purchased package |
| **PaymentTransaction** | Audit trail of all payment transactions (Stripe refs) |

### `bookings` app — Availability Models (`models_availability.py`)

| Model | Purpose |
|-------|---------|
| **WorkingPattern** | Named weekly template per staff member (effective date range) |
| **WorkingPatternRule** | Split-shift periods within a weekday (start/end time per day) |
| **AvailabilityOverride** | One-off date overrides (available/unavailable) |
| **AvailabilityOverridePeriod** | Time periods within an override |
| **LeaveRequest** | Staff leave with approval workflow (pending/approved/rejected) |
| **BlockedTime** | Ad-hoc blocked time slots |
| **Shift** | Actual shift records (clock-in/out, breaks) |
| **TimesheetEntry** | Timesheet records for payroll |

### `compliance` app

| Model | Purpose |
|-------|---------|
| **IncidentReport** | HSE incident reports (severity, status, location, resolution) |
| **IncidentPhoto** | Photos attached to incidents |
| **SignOff** | Manager sign-offs on incidents |
| **RiskAssessment** | Site risk assessments (status, review dates) |
| **HazardFinding** | Individual hazards within assessments (severity, control measures, regulatory refs) |
| **Equipment** | Equipment register (inspection tracking, auto-status updates) |
| **EquipmentInspection** | Inspection records (pass/fail/advisory) |
| **ComplianceCategory** | Scoring categories (e.g. Fire Safety) |
| **ComplianceItem** | Individual compliance items with frequency, evidence, legal references — contributes to "Peace of Mind Score" |

### `crm` app

| Model | Purpose |
|-------|---------|
| **Lead** | Sales pipeline (NEW → CONTACTED → QUALIFIED → CONVERTED / LOST), source tracking, value estimation, auto-created from bookings |

### `core` app

| Model | Purpose |
|-------|---------|
| **Config** | Key-value store for branding, feature flags, and system settings. Categories: `branding`, `features`, `system` |

---

## 5. API Endpoints

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login/` | JWT login (returns access + refresh tokens) |
| GET | `/api/auth/me/` | Current user info |
| POST | `/api/auth/me/set-password/` | Set/change password |

### DRF Router (CRUD ViewSets)
All at `/api/<resource>/` with standard REST verbs:

`services`, `staff`, `bookings`, `clients`, `staff-blocks`, `business-hours`, `staff-schedules`, `closures`, `staff-leave`, `intake`, `intake-disclaimer`, `packages`, `credits`, `payment`, `working-patterns`, `working-pattern-rules`, `availability-overrides`, `leave-requests`, `blocked-times`, `shifts`, `timesheets`

### Reports Intelligence
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reports/overview/` | KPI summary, revenue time series, risk distribution, service breakdown |
| GET | `/api/reports/daily/` | Daily booking breakdown |
| GET | `/api/reports/monthly/` | Monthly aggregates |
| GET | `/api/reports/staff/` | Per-staff performance metrics |
| GET | `/api/reports/insights/` | AI-generated insights |

**Query params:** `date_from`, `date_to`, `staff_id`, `service_id`, `risk_level`, `payment_status`, `include_demo` (default: excludes demo data)

### Demo Data
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/demo/seed/` | Seed demo services, clients, bookings (idempotent) |
| DELETE | `/api/demo/seed/` | Remove all demo data |
| GET | `/api/demo/status/` | Check if demo data exists |

### Other
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard-summary/` | Admin dashboard KPIs |
| POST | `/api/backfill-sbe/` | Backfill SBE scores for all bookings |
| POST | `/api/checkout/create/` | Create Stripe checkout session |
| POST | `/api/checkout/webhook/` | Stripe webhook handler |
| GET | `/api/availability/` | Staff availability for a date |
| GET | `/api/availability/slots/` | Free booking slots |
| * | `/api/compliance/*` | Full compliance CRUD (incidents, assessments, equipment, items, scoring) |
| * | `/api/crm/*` | Lead CRUD + stats |
| * | `/api/tenant/` | Tenant settings |
| * | `/api/tenant/branding/` | Tenant branding config |

---

## 6. Authentication & RBAC

### Roles (hierarchical)
```
customer (0) < staff (1) < manager (2) < owner (3)
```

### Route Protection (Next.js middleware)
- `/admin/*` → requires `manager` or `owner`
- `/app/*` → requires `staff` or above
- Public routes: `/`, `/login`, `/booking`, `/intake`

### Flow
1. User logs in via `/login` → hits Django `/api/auth/login/`
2. Django returns JWT access + refresh tokens
3. Frontend stores tokens in `localStorage` (`nbne_access`, `nbne_refresh`) and sets `nbne_session` cookie
4. Next.js middleware reads cookie, decodes JWT payload (without verification — Django enforces real auth), checks role
5. API calls use `Authorization: Bearer <access_token>` header via the `apiFetch` helper in `lib/api.ts`
6. Frontend proxy at `/api/django/[...path]` forwards all API calls to Django backend

### Token Lifetimes
- Access: 8 hours
- Refresh: 7 days

---

## 7. Management Commands

Run from `backend/` directory:

| Command | Purpose |
|---------|---------|
| `setup_production` | Creates superuser, initial services, disclaimer (runs on every deploy) |
| `seed_compliance` | Seeds UK HSE compliance baseline (categories, items, legal references) |
| `sync_crm_leads` | Creates CRM leads from booking clients |
| `update_demand_index` | Recalculates service demand indices |
| `backfill_sbe_scores` | Backfills Smart Booking Engine risk/reliability scores for all bookings |
| `seed_bookings` | Seeds test booking data |
| `setup_initial_data` | Initial data setup |
| `setup_schedules` | Sets up default schedules |
| `update_service_intelligence` | Updates service-level intelligence metrics |
| `seed_config` | Seeds Config key-value pairs |
| `show_config` | Displays current config |
| `recalculate_compliance_score` | Recalculates compliance scores |

### Deploy Startup Sequence (`start.sh` / `railway.json`)
```
migrate → collectstatic → setup_production → seed_compliance → sync_crm_leads → update_demand_index → backfill_sbe_scores → gunicorn
```

---

## 8. Smart Booking Engine (SBE) — R&D System

The SBE is the core R&D-eligible component. It lives in `bookings/smart_engine.py` and operates in phases:

### Phase 2 — Reliability Engine
- `update_reliability_score(client)` — Recalculates client reliability (0-100) based on booking history
- Formula: base completion rate − no-show penalties, weighted 60% recent (90 days) / 40% overall
- Tracks: `total_bookings`, `completed_bookings`, `cancelled_bookings`, `no_show_count`, `consecutive_no_shows`, `lifetime_value`, `avg_days_between_bookings`

### Phase 3 — Booking Risk Engine
- `calculate_booking_risk(booking)` — Scores each booking's risk (0-100)
- Considers: client reliability, service price, demand, time-of-day, consecutive no-shows
- Outputs: `risk_score`, `risk_level` (LOW/MEDIUM/HIGH/CRITICAL), `revenue_at_risk`

### Phase 4 — Recommendation Engine
- Recommends payment type, deposit percentage, price adjustments, incentives
- Based on risk level and client history

### Phase 5 — Demand Intelligence
- `demand_index` per service (0-100)
- `peak_utilisation_rate` tracking
- Off-peak smart pricing support

### Phase 6+8 — R&D Logging
- Every SBE decision is logged to `OptimisationLog` with full input/output snapshots
- `ServiceOptimisationLog` tracks service-level pricing changes
- These logs serve as **HMRC R&D tax credit evidence**

### Phase 9 — Commercial Override
- Owner can override any SBE recommendation
- Override reason is logged for audit trail

---

## 9. Demo Data System

Added to support onboarding — allows one-click seeding and removal of demo data.

### How It Works
- Three models have `data_origin` (REAL/DEMO) and `demo_seed_id` (UUID) fields: **Service**, **Client**, **Booking**
- `POST /api/demo/seed/` creates: 3 demo services, 5 demo clients, 15-20 demo bookings spread over 30 days
- `DELETE /api/demo/seed/` removes all records where `data_origin='DEMO'`
- `GET /api/demo/status/` returns `{ has_demo, has_real, demo_count }`
- Reports queries filter `data_origin='REAL'` by default (override with `?include_demo=true`)

### Guardrails
- Demo data is **never** included in invoices, emails, or real payment workflows
- Demo bookings use `@example.com` email addresses
- Seeding is idempotent — won't create duplicates if demo data already exists

---

## 10. Multi-Tenant System

The platform supports multiple business tenants via the `core.Config` model and `TenantProvider` on the frontend.

### How It Works
- Backend: `Config` model stores key-value pairs categorised as `branding`, `features`, `system`
- Frontend: `TenantProvider` (React context) fetches branding from `/api/tenant/branding/` on mount
- CSS variables are dynamically set from tenant config: `--color-primary`, `--color-primary-dark`, `--color-bg`, `--color-text`
- Fonts and favicon are also tenant-configurable
- **Module visibility**: Admin sidebar items are filtered by `enabled_modules` in tenant config
- Current tenant slug: `mind-department` (hardcoded in `lib/tenant.tsx` as `TENANT_SLUG`)

### Available Modules
`bookings`, `staff`, `crm`, `comms`, `compliance`, `documents`, `analytics` (plus `_always` for Dashboard, Audit, Settings)

---

## 11. Frontend Design System

### CSS Architecture
- **`globals.css`** — Defines all CSS variables and component classes
- **`staff.css`** — Admin/staff shell layout (sidebar, topbar, grid)
- **`booking-compact.css`** — Public booking flow styles

### CSS Variables (Light Theme)
```css
--color-bg: #f8fafc
--color-surface: #ffffff
--color-text: #1e293b
--color-text-muted: #64748b
--color-border: #e2e8f0
--color-primary: #2563eb
--color-primary-dark: #1e40af
--color-success: #16a34a
--color-warning: #d97706
--color-danger: #dc2626
```

### Component Classes
`.card`, `.tabs`, `.tab`, `.tab.active`, `.table-wrap`, `table`, `.badge`, `.badge-success`, `.badge-warning`, `.badge-danger`, `.btn`, `.btn-primary`, `.btn-danger`, `.btn-ghost`, `.filter-bar`, `.page-header`, `.stats-grid`, `.stat-card`, `.modal-overlay`, `.modal`, `.empty-state`

### Key Principle
All admin pages should use these global classes for consistency. The Reports page was recently refactored from a dark dashboard theme to match this light design system.

---

## 12. Deployment

### Backend — Railway
- **Build:** Nixpacks, `pip install -r requirements.txt`
- **Start:** `python manage.py migrate --noinput && setup_production && gunicorn`
- **Database:** Railway PostgreSQL (uses `DATABASE_PUBLIC_URL` or `DATABASE_URL`)
- **Key env vars:** `DATABASE_PUBLIC_URL`, `DJANGO_SECRET_KEY`, `DEBUG=False`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `FRONTEND_URL`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`

### Frontend — Vercel
- **Framework:** Next.js 14
- **Root directory:** `frontend`
- **Key env var:** `DJANGO_BACKEND_URL` (Railway backend URL, e.g. `https://theminddepartmentwebsite-production.up.railway.app`)
- **Proxy:** All `/api/django/*` requests are proxied to the Django backend via the catch-all route handler

### CORS
Backend allows origins: `localhost:3000`, `localhost:3001`, `minddepartmentbooking.vercel.app`, `theminddepartmentwebsite.vercel.app`

---

## 13. Database Migrations

Currently at migration **0012** for the `bookings` app. Key migrations:

| # | Name | What it does |
|---|------|-------------|
| 0001 | initial | Core models (Service, Staff, Client, Booking, Session, BusinessHours, etc.) |
| 0002 | schedule_models | Schedule-related models |
| 0003 | staff_photo_url | Staff photo URL field |
| 0004 | classpackage_intakewellbeingdisclaimer_and_more | Payment + intake models |
| 0005 | add_disclaimer_version_and_renewal | Disclaimer versioning |
| 0006 | enhance_service_model | Service intelligence fields (demand_index, no_show_rate, etc.) |
| 0007 | staffblock | Staff block model |
| 0008 | staff_role | Staff role field |
| 0009 | smart_booking_engine | SBE fields on Booking (risk_score, risk_level, recommendations) |
| 0010 | service_intelligence_layer | Service optimisation fields + ServiceOptimisationLog |
| 0011 | availability_engine | WorkingPattern, Rules, Overrides, Leave, Shifts, Timesheets |
| **0012** | **demo_data_fields** | **`data_origin` + `demo_seed_id` on Service, Client, Booking** |

---

## 14. Known Gotchas & Important Notes

### DRF ViewSet `basename` Requirement
**Critical:** When a DRF `ModelViewSet` uses `get_queryset()` instead of a `queryset` class attribute, the `router.register()` call **MUST** include `basename='...'` or the entire backend will crash on startup. This has happened with `ServiceViewSet` and `StaffViewSet`. Always check `urls.py` when adding new ViewSets.

### Frontend Proxy Path
The frontend API client uses `API_BASE = '/api/django'`. All calls go through the Next.js catch-all proxy at `app/api/django/[...path]/route.ts`, which strips `/api/django` and forwards to `{DJANGO_BACKEND_URL}/api/...`.

### Local Development
The backend requires a PostgreSQL database and env vars (see `.env.example`). Without `DATABASE_URL` or individual `DB_*` vars, `manage.py` commands will fail. The frontend can run independently with `npm run dev` (port 3002) if `DJANGO_BACKEND_URL` is set.

### Email on Railway
Railway blocks outbound SMTP. The project uses **Resend** HTTP API for transactional email. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in Railway env vars.

### Stripe Webhooks
The webhook endpoint is `/api/checkout/webhook/`. In production, configure the Stripe dashboard to send events to `https://<railway-url>/api/checkout/webhook/`. The `STRIPE_WEBHOOK_SECRET` must match.

### Demo Data Safety
Demo data (`data_origin='DEMO'`) is automatically excluded from:
- All report queries (unless `?include_demo=true`)
- Should be excluded from email sends, invoice generation, and Stripe payment flows
- Demo clients use `@example.com` emails

---

## 15. Current State & Recent Changes

### Completed
- ✅ Full booking flow (public → Stripe → confirmation)
- ✅ Admin panel with all modules (bookings, services, staff, reports, CRM, compliance, documents, chat, analytics, audit)
- ✅ Staff portal (shifts, leave, training, chat, documents, HSE)
- ✅ Smart Booking Engine (reliability, risk, recommendations, demand, R&D logging)
- ✅ UK HSE compliance module (incidents, risk assessments, equipment, compliance scoring)
- ✅ Intake & disclaimer system (GDPR-safe, versioned, annual renewal)
- ✅ Availability engine (working patterns, split shifts, overrides, leave, blocked times)
- ✅ Timesheet system
- ✅ Reports Intelligence (overview, daily, monthly, staff, insights) — **recently refactored to light theme**
- ✅ Demo data seeding system (seed/remove/status endpoints + UI)
- ✅ Multi-tenant branding system

### In Progress / Planned
- Intake & Disclaimers admin page (currently open in IDE — `admin/disclaimers/page.tsx`)
- Further R&D documentation and evidence gathering
- Additional unit tests for demo data system
- Potential: automated compliance reminders, advanced analytics

---

## 16. Environment Variables Reference

### Backend (Railway)
```
DATABASE_PUBLIC_URL=postgresql://...        # Railway PostgreSQL
DJANGO_SECRET_KEY=<random-string>           # Django secret
DEBUG=False                                 # Production mode
ALLOWED_HOSTS=<railway-domain>              # Comma-separated
CSRF_TRUSTED_ORIGINS=https://<railway>,https://<vercel>

STRIPE_SECRET_KEY=sk_live_...               # Stripe
STRIPE_WEBHOOK_SECRET=whsec_...             # Stripe webhook

RESEND_API_KEY=re_...                       # Resend email
RESEND_FROM_EMAIL=hello@theminddepartment.com

FRONTEND_URL=https://theminddepartmentwebsite.vercel.app
```

### Frontend (Vercel)
```
DJANGO_BACKEND_URL=https://theminddepartmentwebsite-production.up.railway.app
```

---

## 17. Quick Reference: File → Feature Map

| Feature | Backend Files | Frontend Files |
|---------|--------------|----------------|
| **Booking flow** | `views_stripe.py`, `api_views.py` (BookingViewSet), `availability.py` | `app/booking/page.tsx` |
| **Smart Booking Engine** | `smart_engine.py`, `views_dashboard.py` | `app/admin/page.tsx` (dashboard) |
| **Reports** | `views_reports.py` | `app/admin/reports/page.tsx` |
| **Staff management** | `api_views.py` (StaffViewSet), `views_availability.py` | `app/admin/staff/page.tsx` |
| **Intake/Disclaimers** | `views_intake.py`, `models_intake.py`, `serializers_intake.py` | `app/intake/`, `app/admin/disclaimers/` |
| **Payments** | `views_payment.py`, `views_stripe.py`, `models_payment.py` | `app/booking/page.tsx` |
| **Compliance/HSE** | `compliance/views.py`, `compliance/models.py` | `app/admin/hse/`, `app/app/hse/` |
| **CRM** | `crm/views.py`, `crm/models.py` | `app/admin/clients/` |
| **Demo data** | `views_demo.py` | `app/admin/reports/page.tsx` (banner/buttons), `lib/api.ts` |
| **Tenant/branding** | `core/tenant_views.py`, `core/config_loader.py` | `lib/tenant.tsx` |
| **Auth** | `core/auth_views.py` | `lib/auth.ts`, `lib/api.ts`, `middleware.ts` |

---

*This document should be provided to any new AI assistant or developer joining the project for full context.*
