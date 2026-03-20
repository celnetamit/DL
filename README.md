# Advanced AI-Powered LMS Platform

This repository follows the architecture described in `lms_architecture.md` with three services:

- `frontend`: Next.js App Router UI
- `backend-go`: Golang (Gin) API for auth, users, subscriptions
- `ai-engine-py`: Python FastAPI microservice for AI content generation

## Quick Start (Local)

1. **Database**

```bash
psql "postgres://lms_user:lms_pass@localhost:5433/lms?sslmode=disable" -f db/schema.sql
```

2. **Backend**

```bash
cd backend-go
cp .env.example .env
# update DATABASE_URL, JWT_SECRET, Razorpay keys

go mod tidy
AUTO_MIGRATE=false go run main.go
```

3. **AI Engine**

```bash
cd ai-engine-py
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

4. **Frontend**

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Notes

- Razorpay webhooks are verified using `RAZORPAY_WEBHOOK_SECRET`.
- The AI engine can be called directly by the frontend or routed through the backend.
- All sensitive credentials are kept in `.env` files.
- For production, set `APP_ENV=production`, `GIN_MODE=release`, a strong `JWT_SECRET`, explicit `APP_BASE_URL`, `NEXT_PUBLIC_API_URL`, and `TRUSTED_PROXIES`.
- The backend now fails fast on insecure production config, pings the database in `/health`, and runs with HTTP server timeouts suitable for deployment behind a reverse proxy.
- Docker images now run as non-root users, and `docker-compose.yml` includes service healthchecks plus frontend build args so production URLs are not baked incorrectly.
# DL
