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
