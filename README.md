# The Mind Department Website

Booking platform for The Mind Department (Aly Harwood).

## Architecture

- **Backend**: Django REST API (Railway)
- **Frontend**: Next.js (Vercel)

## Deployment

### Backend (Railway)
- Root directory: `backend`
- Procfile defaults to `start_mind_department.sh`
- Required env vars: `DATABASE_URL`, `DJANGO_SECRET_KEY`, `DEBUG=False`

### Frontend (Vercel)
- Root directory: `frontend`
- Required env var: `DJANGO_BACKEND_URL` (Railway backend URL, e.g. `https://your-app.up.railway.app`)

## Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_mind_department
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev
```
