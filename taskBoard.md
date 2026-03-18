# Task Board

## Backlog
1. Replace heuristic AI with LLM integration (optional)
2. Add dashboard analytics endpoints
3. Replace placeholder dashboard metrics in UI
4. Add smoke tests for frontend
5. Add unit tests for backend auth/courses/webhooks
6. AI engine payload validation tests

## Sprint 1: Student Course Experience
1. Backend: add course detail endpoint (single course w/ modules + lessons)
2. Frontend: replace static course detail page with real data fetch
3. Progress: integrate progress update per lesson
4. UI: lesson list, progress bars, resume state
5. QA + bugfix for course flow

## Sprint 2: Admin Content Management API
1. DB schema for admin content types
2. GORM models for admin content types
3. Backend CRUD endpoints + RBAC
4. Wire `frontend/components/AdminDashboard.tsx` to API
5. Validation + error states
6. QA + bugfix for admin flow

## Sprint 3: AI Engine Integration
1. Backend proxy endpoint to AI engine
2. Persist AI output into course/module/lesson data
3. Frontend action to "Generate Material"
4. AI error handling (timeouts, invalid URLs)
5. QA + bugfix for AI flow

## Sprint 4: Quizzes & Assessments
1. Backend CRUD for quizzes + questions
2. Attempt tracking + scoring endpoints
3. Frontend quiz UI
4. Quiz results + analytics view
5. QA + bugfix for quizzes

## Sprint 5: Subscriptions UX + Analytics
1. Frontend subscription flow
2. Connect subscription status to course access rules
3. Dashboard analytics endpoints
4. Replace placeholder metrics in UI
5. QA + bugfix for subscriptions/analytics

## Sprint 6: API Security
1. Security Headers middleware (Helmet-like)
2. Rate Limiting for Auth & AI endpoints
3. CORS Policy hardening
4. Input Validation & Sanitization audit
5. Secure JWT configuration (Expiration/Scoping)
6. QA + security audit loop

## Sprint 7: B2B Institution Logic
1. Create `Institution` DB Model + Foreign Keys
2. Overhaul auth `/register` (Domain sniffing + Code invite logic)
3. API for Admin CSV user upload 
4. Port existing Subscriptions to bill/link against Institutions organically.
5. Organization admin UI for managing members

## Sprint 9: Testing & Production Hardening
1. Go unit tests for Auth, Subscriptions, Rate-limit middleware
2. Frontend smoke tests (build + route validation)
3. Create `.env.example` documenting all required env vars
4. Add `Makefile` with `make dev`, `make test`, `make build` targets
5. Final QA pass and end-to-end validation
