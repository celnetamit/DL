# DL Platform Completion Backlog

## Overview

- Program: `DL Platform Completion`
- Recommended sprint length: `2 weeks`
- Estimation unit: `story points`
- Last updated: `2026-03-27`

## Completed

### Epic DL-100: Compliance Recovery

#### DL-101

- Title: Fix frontend compliance hook to use authenticated `/api/v1` endpoints
- Status: `Completed`

#### DL-102

- Title: Replace local-only consent fallback with server-backed consent state
- Status: `Completed`

### Epic DL-200: LMS Productization

#### DL-201

- Title: Replace manual lesson-ID progress widget with contextual course progress controls
- Status: `Completed`

#### DL-202

- Title: Build lesson viewer/player for article, document, and video lessons
- Status: `Completed`

#### DL-203

- Title: Add entitlement checks for protected course and lesson access
- Status: `Completed`

#### DL-204

- Title: Implement resume-from-last-position and auto-save progress
- Status: `Completed`

#### DL-205

- Title: Add course completion summary, next lesson recommendations, and learner completion awards
- Status: `Completed`
- Notes:
  - Course completion certificates and badges are now issued and shown in the learner flow

### Epic DL-300: Product and Catalog Data Hardening

#### DL-301

- Title: Design normalized schema for content-domain and product-content relationships
- Status: `Completed`
- Notes:
  - Design was implemented directly through migrations and handlers

#### DL-302

- Title: Create migrations for relational product/catalog mapping tables
- Status: `Completed`

#### DL-303

- Title: Refactor product stats and contents APIs to use relational joins
- Status: `Completed`

#### DL-304

- Title: Add validation rules for product composition in admin flows
- Status: `Completed`

## Partially Completed

### Epic DL-400: Content Operations Maturity

#### DL-401

- Title: Externalize content type and field definitions from frontend constants
- Status: `Partial`
- What is done:
  - Dedicated `/content-manager` page exists
  - Advanced filters, bulk edit, bulk delete, and per-user saved presets exist
  - Content operations are no longer confined to `/admin`
- What remains:
  - Move content taxonomy and field definitions out of frontend constants and into backend-managed schema/config

### Epic DL-500: AI Editorial Workflow

#### DL-501

- Title: Add admin/course-builder UI to trigger lesson generation
- Status: `Partial`
- What is done:
  - Course manager can trigger AI lesson generation in the curriculum builder
- What remains:
  - Broader editorial generation workflow outside course-builder-only usage

## Pending

### Epic DL-100: Compliance Recovery

#### DL-103

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

### Epic DL-400: Content Operations Maturity

#### DL-402

- Title: Normalize high-value content metadata entities
- Priority: Medium
- Estimate: 8
- Depends on: `DL-401`
- Scope:
  - Authors, publishers, identifiers, tags, and access type
- Acceptance:
  - Common filters and reporting no longer rely only on JSON metadata

#### DL-403

- Title: Build backend-managed import pipeline for content ingestion
- Priority: High
- Estimate: 8
- Depends on: `DL-401`
- Scope:
  - Replace browser-loop CSV import with server-side validation and import
- Acceptance:
  - Import returns row-level results
  - Large imports are supported safely

### Epic DL-500: AI Editorial Workflow

#### DL-502

- Title: Change AI-generated lessons to draft-first review workflow
- Priority: High
- Estimate: 5
- Depends on: `DL-501`
- Scope:
  - Avoid immediate publish on generation
- Acceptance:
  - Generated lesson enters a reviewable draft state

#### DL-503

- Title: Expand AI logs with reviewer and source provenance detail
- Priority: Medium
- Estimate: 3
- Depends on: `DL-502`
- Scope:
  - Add richer audit metadata and filters
- Acceptance:
  - Admin can inspect generation source, outcome, and review status

### Epic DL-600: Institution Onboarding

#### DL-601

- Title: Add bulk invite UI for institution onboarding
- Priority: Medium
- Estimate: 5
- Depends on: none
- Scope:
  - Surface existing backend invite capability
- Acceptance:
  - Admin can submit bulk invites from UI

#### DL-602

- Title: Add invite tracking and seat allocation reporting
- Priority: Medium
- Estimate: 8
- Depends on: `DL-601`
- Scope:
  - Track accepted, pending, and failed invites
  - Show seat consumption lifecycle
- Acceptance:
  - Institution admins can monitor onboarding status

### Epic DL-700: Settings and Integration Completeness

#### DL-701

- Title: Expand settings panel to full backend config inventory
- Priority: High
- Estimate: 5
- Depends on: none
- Scope:
  - Add CRM, SES, SNS, Google redirect, and related settings
- Acceptance:
  - Settings UI covers the actual backend config surface

#### DL-702

- Title: Add validation and effective-source visibility to settings management
- Priority: Medium
- Estimate: 5
- Depends on: `DL-701`
- Scope:
  - Indicate DB override vs env fallback
  - Validate expected formats
- Acceptance:
  - Admin can tell what value is active and whether it is valid

### Epic DL-800: Dependency and Compatibility Modernization

#### DL-801

- Title: Upgrade Go backend dependencies to latest compatible minor/patch set
- Priority: Medium
- Estimate: 5
- Depends on: none

#### DL-802

- Title: Upgrade AI Python service dependencies to latest compatible versions
- Priority: Medium
- Estimate: 5
- Depends on: none

#### DL-803

- Title: Upgrade frontend test/tooling dependencies
- Priority: Low
- Estimate: 3
- Depends on: none

#### DL-804

- Title: Run compatibility spike for Next.js and Tailwind major upgrades
- Priority: Low
- Estimate: 5
- Depends on: none

## Recommended Next Priorities

1. `DL-103`
2. `DL-401` remaining backend-driven schema work
3. `DL-403`
4. `DL-502`
5. `DL-701`
