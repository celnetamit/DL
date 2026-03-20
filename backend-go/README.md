# LMS Backend (Golang + Gin)

## Setup

1. Copy env file and fill values:

```bash
cp .env.example .env
```

2. Run PostgreSQL and either apply the baseline schema manually:

```bash
psql "$DATABASE_URL" -f ../db/schema.sql
```

Or skip that step and let the embedded migrations create the schema on startup.
If you already have an existing schema from earlier `AutoMigrate` boots, set `BASELINE_EXISTING_SCHEMA=true` for the first migration-enabled run so the baseline migration is recorded without replaying the full SQL file.
Subsequent migrations, such as `000002_add_payment_reference_indexes.sql`, will then apply normally on later boots.

3. Install dependencies and run:

```bash
go mod tidy
RUN_MIGRATIONS=true go run main.go
```

## API

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/users/me` (auth)
- `PUT /api/v1/users/me` (auth)
- `POST /api/v1/subscriptions/create-order` (auth)
- `POST /api/v1/subscriptions/create-subscription` (auth)
- `POST /api/v1/subscriptions/webhook`
- `POST /api/v1/courses` (auth, instructor)
- `PUT /api/v1/courses/:course_id` (auth, instructor)
- `DELETE /api/v1/courses/:course_id` (auth, instructor)
- `POST /api/v1/courses/:course_id/modules` (auth, instructor)
- `PUT /api/v1/modules/:module_id` (auth, instructor)
- `DELETE /api/v1/modules/:module_id` (auth, instructor)
- `POST /api/v1/modules/:module_id/lessons` (auth, instructor)
- `PUT /api/v1/lessons/:lesson_id` (auth, instructor)
- `DELETE /api/v1/lessons/:lesson_id` (auth, instructor)
- `GET /api/v1/courses` (auth)
- `POST /api/v1/progress` (auth)
- `GET /api/v1/ai/inactive-users` (auth)
- `GET /api/v1/ai/churn-risk/:user_id` (auth)

All responses are standardized JSON with `success`, `message`, and optional `data`.
