# Implementation Plan (Sequential)

1. Baseline cleanup and alignment. Confirm environment variables and configs across services, align `db/schema.sql` with Go models (institutions, contents, lesson metadata, institution_id fields, etc.), and remove remaining dead references in UI copy or docs that don’t reflect current scope.
2. Database and migrations. Finalize Postgres schema updates to match current models, decide on migration strategy (manual SQL vs GORM AutoMigrate), and add seed data for roles and minimal starter content.
3. Authentication and user roles. Keep existing JWT auth and RBAC stable, add admin endpoints for user listing, role assignment, and status updates, and consider a lightweight audit trail for user changes.
4. User management interface (Admin). Build admin UI to view users, filter by role/status/institution, edit user roles, and deactivate/reactivate accounts.
5. Institution management (B2B). Add admin UI to create/update institutions, expose endpoints to list/create/update institutions, and hook CSV bulk-invite into the UI.
6. Subscription management (Admin). Build admin UI to list subscriptions and filter by status/user/institution, and add basic actions like view details and reconcile status with Razorpay webhook state.
7. Subscription UX (User). Keep pricing page for order flow, add a “My subscriptions” detail view, and add a cancel flow that triggers a backend action (if supported by Razorpay API).
8. Course and content authoring (Instructor). Keep current course/module/lesson CRUD, add file/media support or clear URL validation for lesson content, and improve ordering controls for modules and lessons.
9. Content library (Admin). Keep the current content library manager, add metadata validation and status workflows, and add content import flow if needed.
10. Progress tracking. Wire lesson progress updates from the course view into `/progress` endpoints and add last-position tracking tied to lesson playback or reading position.
11. AI content generation pipeline. Keep AI microservice endpoints stable, improve scraping reliability and sanitization, and add configurable generation settings (summary length, flashcards count).
12. Analytics. Expand admin analytics (active users, engagement, revenue, churn signals) and add charts and time filters on the admin dashboard.
13. Hardening and security. Replace in-memory rate limiting with Redis, add request validation and stricter CORS settings for production, and add structured logging and error observability.
14. QA and documentation. Add backend tests for auth, subscriptions, and content endpoints, add frontend smoke tests for core flows, and update `README.md` and the deployment runbook.

## Step 15: Master Domain Manager
**Goal:** Allow administrators to centrally manage explicit Domains (e.g., Engineering, Medicine) and nested Subdomains (e.g., Civil, Cardiology) so that Content Manager forms utilize strictly structured dropdowns instead of free text inputs.

**Backend Changes:**
- **[NEW] `backend-go/internal/models/domain.go`**: Create `Domain` (ID, Name) and `Subdomain` (ID, DomainID, Name) Relational tables.
- **[MODIFY] `backend-go/internal/handlers/domains.go`**: Add `GET /api/v1/domains` (returns domains preloading subdomains), `POST /api/v1/domains`, `POST /api/v1/domains/:id/subdomains`, `DELETE` operations. Register routes in `main.go`.

**Frontend Changes:**
- **[NEW] `frontend/components/DomainManagementPanel.tsx`**: A specialized Admin tab to list existing Domains, add new ones, and drill down to add Subdomains.
- **[MODIFY] `frontend/app/admin/page.tsx`**: Add the new "Domains" tab pointing to `DomainManagementPanel`.
- **[MODIFY] `frontend/components/AdminDashboard.tsx`**: 
  - Fetch global `/domains` data upon component mount.
  - Transform the generic "Domain" and "Subdomain" `text` inputs into intelligent `select` dropdowns.
  - Apply logic so that `Subdomain` options dynamically populate based on the uniquely selected `Domain` value within `formState`.

## Current Delivery Status

### Working / Implemented
1. JWT auth with role-based access control, Google login, super-admin role preview, and institution-aware registration.
2. Admin operations for users, institutions, subscriptions, products, domains, settings, and content management.
3. Institution dashboard coverage for purchased products, seat usage, student access control, and subscription visibility.
4. Payment record visibility in admin subscriptions and admin-managed user creation.
5. Production-focused hardening: config validation, Docker healthchecks, non-root containers, build verification, security headers, and server timeouts.
6. AI engine integration through a Python microservice using Gemini.

### Partially Complete / Needs Follow-through
1. Commerce lifecycle: checkout, payment capture, entitlement assignment, and subscription state are not yet a single end-to-end flow.
2. Analytics: useful dashboard summaries exist, but richer chartable, date-filtered analytics endpoints are still limited.
3. Admin UX: many flows still use `alert`, `confirm`, or silent catch blocks instead of structured feedback.
4. Testing: only minimal backend tests exist; there are no frontend smoke/integration tests.
5. Database evolution: schema changes still rely on GORM auto-migration rather than versioned migrations.

### Not Started / Largely Missing
1. Quizzes and assessments.
2. Full observability stack: structured logging, error reporting, tracing, and deployment monitoring.
3. Rich analytics filters and cohort/product reporting.

## Recommended Next Sprint

### Sprint Goal
Stabilize the payment-to-access lifecycle, formalize schema change management, and reduce production risk through tests and admin UX hardening.

### Ticket 1: Commerce and Entitlement Consistency
**Priority:** Critical  
**Estimate:** 3-5 days

**Scope**
1. Make successful checkout create or finalize a durable purchase/license/subscription record tied to product, user, institution, and payment.
2. Ensure webhook reconciliation updates both billing history and access state.
3. Remove dependency on manual admin reconciliation for normal paid purchases.

**Acceptance Criteria**
1. A successful payment results in a visible payment record and an immediately visible access record.
2. Purchased content/products become visible in the user or institution dashboard without manual intervention.
3. Failed payments never unlock access.
4. Duplicate webhook delivery does not create duplicate entitlements.

**Main Files**
1. `backend-go/internal/handlers/subscriptions.go`
2. `backend-go/internal/handlers/admin_subscriptions.go`
3. `frontend/app/pricing/page.tsx`
4. `frontend/app/dashboard/page.tsx`

### Ticket 2: Database Migration Strategy
**Priority:** Critical  
**Estimate:** 2-3 days

**Scope**
1. Introduce versioned SQL migrations or a migration tool.
2. Capture the current schema including payments, institutions, roles, products, and latest admin additions.
3. Document deploy-time migration steps.

**Acceptance Criteria**
1. New environments can be created from migrations only.
2. Existing environments can be upgraded safely without relying on `AUTO_MIGRATE`.
3. Production deployment guide includes migration execution steps.

**Main Files**
1. `db/schema.sql`
2. `backend-go/main.go`
3. Deployment docs

### Ticket 3: Admin UX Hardening
**Priority:** High  
**Estimate:** 2-4 days

**Scope**
1. Replace `alert`/`confirm` usage with consistent feedback UI.
2. Replace silent failures with visible error states.
3. Add better success/error messaging for admin actions.

**Acceptance Criteria**
1. Admin users always see success or failure feedback for mutations.
2. No critical admin flow fails silently.
3. Destructive actions use a clear confirmation pattern.

**Main Files**
1. `frontend/components/SubscriptionAdminPanel.tsx`
2. `frontend/components/UserManagementPanel.tsx`
3. `frontend/components/InstitutionPanel.tsx`
4. `frontend/components/AdminDashboard.tsx`
5. `frontend/components/DomainManagementPanel.tsx`

### Ticket 4: Test Coverage Expansion
**Priority:** High  
**Estimate:** 3-4 days

**Scope**
1. Add backend tests for payments, subscriptions, role switching, and institution overview logic.
2. Add frontend smoke tests for auth flows, admin pages, and dashboard routes.

**Acceptance Criteria**
1. Backend tests cover payment capture and access assignment edge cases.
2. Frontend has at least basic route and auth flow validation in CI.
3. Regressions in admin role-based access are caught automatically.

**Main Files**
1. `backend-go/internal/handlers/*_test.go`
2. frontend test setup files to be added

### Ticket 5: Analytics Expansion
**Priority:** Medium  
**Estimate:** 2-3 days

**Scope**
1. Add date-filtered analytics endpoints.
2. Add revenue, payment trend, institution growth, and user activity series.
3. Replace remaining inferred or placeholder-style UI metrics with backed API data.

**Acceptance Criteria**
1. Admin analytics can be filtered by date range.
2. Revenue trends and user activity trends are visible in charts.
3. Institution growth metrics come from backend data rather than frontend-only inference.

**Main Files**
1. `backend-go/internal/handlers/analytics.go`
2. `frontend/components/AdminDashboard.tsx`
3. `frontend/app/dashboard/page.tsx`

### Ticket 6: AI Robustness and Observability
**Priority:** Medium  
**Estimate:** 2-3 days

**Scope**
1. Add Gemini error classification and stronger response validation.
2. Add logging around AI requests and failures.
3. Store prompt/model metadata if auditability is required.

**Acceptance Criteria**
1. Gemini failures surface a useful admin-visible error.
2. Invalid JSON/model errors do not create broken lessons.
3. AI calls are traceable in logs.

**Main Files**
1. `ai-engine-py/main.py`
2. `backend-go/internal/handlers/generator.go`

## Suggested Execution Order
1. Ticket 1: Commerce and Entitlement Consistency
2. Ticket 2: Database Migration Strategy
3. Ticket 4: Test Coverage Expansion
4. Ticket 3: Admin UX Hardening
5. Ticket 5: Analytics Expansion
6. Ticket 6: AI Robustness and Observability

## Definition of "Ready for Wider Production Use"
1. Payments and entitlements are consistent and idempotent.
2. Schema changes are migration-driven.
3. Critical backend flows are test-covered.
4. Admin flows expose real errors and success feedback.
5. Basic observability exists for auth, payments, AI, and webhooks.
