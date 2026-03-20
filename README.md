# Advanced AI-Powered LMS Platform

This repository follows the architecture described in `lms_architecture.md` with three services:

- `frontend`: Next.js App Router UI
- `backend-go`: Golang (Gin) API for auth, users, subscriptions
- `ai-engine-py`: Python FastAPI microservice for Gemini-powered content generation

## Quick Start (Local)

1. **Database**

```bash
psql "postgres://lms_user:lms_pass@localhost:5433/lms?sslmode=disable" -f db/schema.sql
```

Or let the backend apply the embedded SQL migrations automatically on boot with `RUN_MIGRATIONS=true`.
If you are adopting the migration system on an existing auto-migrated database, set `BASELINE_EXISTING_SCHEMA=true` for the first boot only so the current schema is recorded as migration `000001_initial_schema.sql` instead of being recreated.

2. **Backend**

```bash
cd backend-go
cp .env.example .env
# update DATABASE_URL, JWT_SECRET, Razorpay keys

go mod tidy
RUN_MIGRATIONS=true go run main.go
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

## Testing

Run the main test suites locally with:

```bash
cd backend-go
go test ./...

cd ../frontend
npx tsc --noEmit
npm test
npx playwright test
```

Coverage currently includes:
- Go handler and middleware tests for auth, payments, analytics, AI, and institution/admin flows
- Vitest component and client-flow coverage for auth, pricing, admin access, and user management
- Playwright browser smoke coverage for auth entry points, pricing redirects and checkout success, admin role access, AI logs, and institution error states

GitHub Actions now runs these suites automatically on pushes to `main` and on pull requests.

## Notes

- Razorpay webhooks are verified using `RAZORPAY_WEBHOOK_SECRET`.
- Contact-form and purchase-request submissions can be pushed into your CRM/ERP lead section via `LEAD_WEBHOOK_URL`, `LEAD_WEBHOOK_SECRET`, and `LEAD_COMPANY_ID`.
- AWS SES can send acknowledgement and checkout emails using `AWS_REGION`, `SES_FROM_EMAIL`, and optional `SES_CONFIGURATION_SET`.
- AWS SNS can publish operational alerts for lead sync failures using `SNS_ALERT_TOPIC_ARN`.
- SES delivery, bounce, and complaint notifications can be ingested back into the admin area via `SES_SNS_TOPIC_ARN` and the public webhook endpoint `/api/v1/notifications/ses-sns`.
- The AI engine uses the Gemini API via `GEMINI_API_KEY` and can be called directly by the frontend or routed through the backend.
- All sensitive credentials are kept in `.env` files.
- For production, set `APP_ENV=production`, `GIN_MODE=release`, a strong `JWT_SECRET`, explicit `APP_BASE_URL`, `NEXT_PUBLIC_API_URL`, and `TRUSTED_PROXIES`.
- The backend now fails fast on insecure production config, pings the database in `/health`, and runs with HTTP server timeouts suitable for deployment behind a reverse proxy.
- The backend now uses versioned SQL migrations instead of relying on GORM `AutoMigrate` drift at startup.
- The repo now includes both a baseline migration and a follow-up `000002` migration to demonstrate the normal upgrade path after initial adoption.
- For existing production databases created before this migration system, deploy once with `BASELINE_EXISTING_SCHEMA=true`, verify boot success, then set it back to `false`.
- Docker images now run as non-root users, and `docker-compose.yml` includes service healthchecks plus frontend build args so production URLs are not baked incorrectly.
# DL
