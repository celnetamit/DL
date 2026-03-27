# DL Platform Completion Backlog

## Overview

- Program: `DL Platform Completion`
- Recommended sprint length: `2 weeks`
- Estimation unit: `story points`
- Date prepared: `2026-03-27`

## Epic DL-100: Compliance Recovery

Goal: make consent, export, and account deletion fully backend-driven and auditable.

### DL-101

- Title: Fix frontend compliance hook to use authenticated `/api/v1` endpoints
- Priority: Highest
- Estimate: 3
- Depends on: none
- Scope:
  - Update frontend compliance calls to correct route prefix
  - Pass JWT token to protected calls
  - Use existing session storage keys consistently
- Acceptance:
  - Consent call succeeds for signed-in users
  - Export call downloads real backend payload
  - Delete call works for authenticated user only

### DL-102

- Title: Replace local-only consent fallback with server-backed consent state
- Priority: Highest
- Estimate: 3
- Depends on: `DL-101`
- Scope:
  - Hydrate consent status from backend
  - Remove silent local success behavior on backend failure
- Acceptance:
  - Banner visibility matches DB state
  - Failed consent submissions remain visible and actionable

### DL-103

- Title: Expand compliance export and deletion coverage
- Priority: High
- Estimate: 5
- Depends on: `DL-101`
- Scope:
  - Include all relevant user-linked records in export
  - Define delete vs anonymize policy for business records
- Acceptance:
  - Export includes user, progress, payments, purchases, subscriptions, and leads where appropriate
  - Account deletion leaves system in a consistent state

## Epic DL-200: LMS Productization

Goal: convert the current course and progress prototype into a real learner workflow.

### DL-201

- Title: Replace manual lesson-ID progress widget with contextual course progress controls
- Priority: Highest
- Estimate: 5
- Depends on: none
- Scope:
  - Remove raw lesson UUID entry UX
  - Bind progress actions to lesson cards and current lesson
- Acceptance:
  - User can mark or update progress directly from course lesson UI
  - No manual identifier entry is required

### DL-202

- Title: Build lesson viewer/player for article, document, and video lessons
- Priority: Highest
- Estimate: 8
- Depends on: `DL-201`
- Scope:
  - Render lesson body from `source_url` or `content_url`
  - Add content-type-aware UI
- Acceptance:
  - Lessons open in-app
  - Article, document, and video lessons are viewable with appropriate UI

### DL-203

- Title: Add entitlement checks for protected course and lesson access
- Priority: Highest
- Estimate: 8
- Depends on: `DL-202`
- Scope:
  - Restrict access based on purchase, subscription, and product rules
  - Return clear unauthorized states
- Acceptance:
  - Non-entitled users are blocked
  - Entitled users access correct lessons

### DL-204

- Title: Implement resume-from-last-position and auto-save progress
- Priority: High
- Estimate: 8
- Depends on: `DL-202`
- Scope:
  - Persist `last_position_seconds`
  - Resume from saved point
  - Auto-save or timed save while consuming lesson
- Acceptance:
  - Reopening a lesson resumes prior state
  - Progress persists without manual form input

### DL-205

- Title: Add course completion summary and next lesson recommendations
- Priority: Medium
- Estimate: 5
- Depends on: `DL-201`, `DL-204`
- Scope:
  - Aggregate progress at course level
  - Identify next suggested lesson
- Acceptance:
  - Course page shows completion stats
  - User sees a clear next step

## Epic DL-300: Product and Catalog Data Hardening

Goal: replace fragile JSON metadata packaging with relational integrity.

### DL-301

- Title: Design normalized schema for content-domain and product-content relationships
- Priority: Highest
- Estimate: 5
- Depends on: none
- Scope:
  - Define migration plan for relational links
  - Preserve existing data compatibility
- Acceptance:
  - Schema proposal is approved
  - Migration design is documented

### DL-302

- Title: Create migrations for relational product/catalog mapping tables
- Priority: Highest
- Estimate: 5
- Depends on: `DL-301`
- Scope:
  - Add link tables such as `content_domain_links`, `product_content_links`, and `product_bundle_links`
- Acceptance:
  - Migrations apply cleanly
  - Existing schema remains bootable

### DL-303

- Title: Refactor product stats and contents APIs to use relational joins
- Priority: Highest
- Estimate: 8
- Depends on: `DL-302`
- Scope:
  - Replace `metadata->>'domain'` and `metadata->>'subdomain'` matching
- Acceptance:
  - Product stats are computed via relational links
  - Product detail contents remain correct after migration

### DL-304

- Title: Add validation rules for product composition in admin flows
- Priority: High
- Estimate: 5
- Depends on: `DL-303`
- Scope:
  - Validate domain, subdomain, content, and bundle combinations
- Acceptance:
  - Invalid product structures cannot be saved
  - Admin receives actionable validation errors

## Epic DL-400: Content Operations Maturity

Goal: make content management schema-driven and scalable.

### DL-401

- Title: Externalize content type and field definitions from frontend constants
- Priority: High
- Estimate: 8
- Depends on: none
- Scope:
  - Move content taxonomy definitions out of frontend-only code
- Acceptance:
  - Admin content UI renders schema from backend data

### DL-402

- Title: Normalize high-value content metadata entities
- Priority: Medium
- Estimate: 8
- Depends on: `DL-401`
- Scope:
  - Authors, publishers, identifiers, tags, and access type
- Acceptance:
  - Common filters and reporting no longer rely only on JSON metadata

### DL-403

- Title: Build backend-managed import pipeline for content ingestion
- Priority: High
- Estimate: 8
- Depends on: `DL-401`
- Scope:
  - Replace browser-loop CSV import with server-side validation and import
- Acceptance:
  - Import returns row-level results
  - Large imports are supported safely

## Epic DL-500: AI Editorial Workflow

Goal: make AI generation reviewable and production-safe.

### DL-501

- Title: Add admin/course-builder UI to trigger lesson generation
- Priority: Medium
- Estimate: 5
- Depends on: none
- Scope:
  - Expose the existing AI generation backend in a guided UI
- Acceptance:
  - Content managers can generate into a selected module from UI

### DL-502

- Title: Change AI-generated lessons to draft-first review workflow
- Priority: High
- Estimate: 5
- Depends on: `DL-501`
- Scope:
  - Avoid immediate publish on generation
- Acceptance:
  - Generated lesson enters a reviewable draft state

### DL-503

- Title: Expand AI logs with reviewer and source provenance detail
- Priority: Medium
- Estimate: 3
- Depends on: `DL-502`
- Scope:
  - Add richer audit metadata and filters
- Acceptance:
  - Admin can inspect generation source, outcome, and review status

## Epic DL-600: Institution Onboarding

Goal: complete institution lifecycle beyond CRUD.

### DL-601

- Title: Add bulk invite UI for institution onboarding
- Priority: Medium
- Estimate: 5
- Depends on: none
- Scope:
  - Surface existing backend invite capability
- Acceptance:
  - Admin can submit bulk invites from UI

### DL-602

- Title: Add invite tracking and seat allocation reporting
- Priority: Medium
- Estimate: 8
- Depends on: `DL-601`
- Scope:
  - Track accepted, pending, and failed invites
  - Show seat consumption lifecycle
- Acceptance:
  - Institution admins can monitor onboarding status

## Epic DL-700: Settings and Integration Completeness

Goal: align settings UI with actual runtime integrations.

### DL-701

- Title: Expand settings panel to full backend config inventory
- Priority: High
- Estimate: 5
- Depends on: none
- Scope:
  - Add CRM, SES, SNS, Google redirect, and related settings
- Acceptance:
  - Settings UI covers the actual backend config surface

### DL-702

- Title: Add validation and effective-source visibility to settings management
- Priority: Medium
- Estimate: 5
- Depends on: `DL-701`
- Scope:
  - Indicate DB override vs env fallback
  - Validate expected formats
- Acceptance:
  - Admin can tell what value is active and whether it is valid

## Epic DL-800: Dependency and Compatibility Modernization

Goal: reduce version drift without destabilizing delivery.

### DL-801

- Title: Upgrade Go backend dependencies to latest compatible minor/patch set
- Priority: Medium
- Estimate: 5
- Depends on: none
- Scope:
  - Upgrade `gin`, `oauth2`, selected AWS SDK modules, and related libraries
- Acceptance:
  - Backend tests pass
  - No API regressions are introduced

### DL-802

- Title: Upgrade AI Python service dependencies to latest compatible versions
- Priority: Medium
- Estimate: 5
- Depends on: none
- Scope:
  - Upgrade `fastapi`, `uvicorn`, `pydantic`, and related packages
- Acceptance:
  - AI service health and generation behavior remain stable

### DL-803

- Title: Upgrade frontend test and tooling dependencies
- Priority: Low
- Estimate: 3
- Depends on: none
- Scope:
  - Upgrade Playwright, testing libraries, and safe tooling updates
- Acceptance:
  - `npm test` and typecheck remain green

### DL-804

- Title: Run compatibility spike for Next.js and Tailwind major upgrades
- Priority: Low
- Estimate: 5
- Depends on: none
- Scope:
  - Assess upgrade path for `next` and `tailwindcss`
- Acceptance:
  - Written upgrade plan with risk list and effort estimate

## Suggested Sprint Breakdown

### Sprint 1

- `DL-101`
- `DL-102`
- `DL-201`

### Sprint 2

- `DL-103`
- `DL-202`
- `DL-204`

### Sprint 3

- `DL-203`
- `DL-205`
- `DL-301`
- `DL-302`

### Sprint 4

- `DL-303`
- `DL-304`
- `DL-401`

### Sprint 5

- `DL-403`
- `DL-501`
- `DL-502`
- `DL-701`

### Sprint 6

- `DL-503`
- `DL-601`
- `DL-602`
- `DL-702`
- `DL-801`
- `DL-802`

## Critical Path

- `DL-101` -> `DL-102`
- `DL-201` -> `DL-202` -> `DL-203`
- `DL-202` -> `DL-204` -> `DL-205`
- `DL-301` -> `DL-302` -> `DL-303` -> `DL-304`

## Top 5 Tickets To Start Immediately

1. `DL-101`
2. `DL-102`
3. `DL-201`
4. `DL-202`
5. `DL-301`
