# JIRA Assignee Suggestions By Role

## Overview

This document now reflects only the backlog items that are still partially complete or pending from [JIRA_BACKLOG.md](/home/itb04/Desktop/digital_lib/dl2%20by%20amit/JIRA_BACKLOG.md).

These are role recommendations, not named assignments.

## Role Definitions

- `Frontend Engineer`: owns Next.js UI, state management, UX flows, component integration, and client-side auth/session behavior
- `Backend Engineer`: owns Gin APIs, GORM models, DB queries, business rules, authz, and service orchestration
- `Full-Stack Engineer`: owns cross-cutting tickets that need coordinated frontend and backend changes
- `Platform Engineer`: owns infrastructure, config, secrets, containers, deployment runtime, and service compatibility
- `QA Engineer`: owns test plans, regression coverage, end-to-end validation, and release confidence
- `Tech Lead / Architect`: owns schema decisions, migration strategy, cross-team sequencing, and high-risk technical review
- `Product / Ops Analyst`: owns workflow clarification, compliance policy validation, operational acceptance criteria, and admin process design

## Remaining Ownership By Ticket

### Epic DL-100: Compliance Recovery

#### DL-103

- Primary assignee role: `Backend Engineer`
- Supporting roles:
  - `Tech Lead / Architect`
  - `Product / Ops Analyst`
  - `QA Engineer`
- Why:
  - Requires policy-heavy backend data export and deletion behavior

### Epic DL-400: Content Operations Maturity

#### DL-401 Remaining Work

- Primary assignee role: `Full-Stack Engineer`
- Supporting roles:
  - `Backend Engineer`
  - `Frontend Engineer`
  - `Tech Lead / Architect`
- Why:
  - The dedicated content manager exists, but the field schema is still frontend-defined and needs backend ownership

#### DL-402

- Primary assignee role: `Backend Engineer`
- Supporting roles:
  - `Tech Lead / Architect`
  - `Frontend Engineer`
  - `QA Engineer`
- Why:
  - Primarily a data model and queryability improvement

#### DL-403

- Primary assignee role: `Backend Engineer`
- Supporting roles:
  - `Frontend Engineer`
  - `Platform Engineer`
  - `QA Engineer`
- Why:
  - Import execution belongs on server side with supporting UI and operational concerns

### Epic DL-500: AI Editorial Workflow

#### DL-501 Remaining Work

- Primary assignee role: `Frontend Engineer`
- Supporting roles:
  - `Backend Engineer`
  - `QA Engineer`
- Why:
  - Basic generation UI exists in course management, but broader editorial usability is still incomplete

#### DL-502

- Primary assignee role: `Backend Engineer`
- Supporting roles:
  - `Frontend Engineer`
  - `Product / Ops Analyst`
  - `QA Engineer`
- Why:
  - Workflow state and publishing policy should be enforced server-side

#### DL-503

- Primary assignee role: `Backend Engineer`
- Supporting roles:
  - `Frontend Engineer`
  - `QA Engineer`
- Why:
  - Log enrichment is backend-first, with admin filtering updates

### Epic DL-600: Institution Onboarding

#### DL-601

- Primary assignee role: `Frontend Engineer`
- Supporting roles:
  - `Backend Engineer`
  - `Product / Ops Analyst`
  - `QA Engineer`
- Why:
  - Existing backend capability mainly needs operational UI surfaced

#### DL-602

- Primary assignee role: `Full-Stack Engineer`
- Supporting roles:
  - `Backend Engineer`
  - `Frontend Engineer`
  - `Product / Ops Analyst`
  - `QA Engineer`
- Why:
  - Requires workflow modeling, persistence, and reporting UI

### Epic DL-700: Settings and Integration Completeness

#### DL-701

- Primary assignee role: `Full-Stack Engineer`
- Supporting roles:
  - `Platform Engineer`
  - `Backend Engineer`
  - `QA Engineer`
- Why:
  - Crosses admin UI, config model, and runtime integration coverage

#### DL-702

- Primary assignee role: `Platform Engineer`
- Supporting roles:
  - `Backend Engineer`
  - `Frontend Engineer`
  - `QA Engineer`
- Why:
  - Best owned by the role closest to effective runtime configuration and validation

### Epic DL-800: Dependency and Compatibility Modernization

#### DL-801

- Primary assignee role: `Backend Engineer`
- Supporting roles:
  - `Platform Engineer`
  - `QA Engineer`
- Why:
  - Backend library upgrades with service-level validation

#### DL-802

- Primary assignee role: `Platform Engineer`
- Supporting roles:
  - `Backend Engineer`
  - `QA Engineer`
- Why:
  - Python service dependency compatibility often overlaps with runtime and deployment concerns

#### DL-803

- Primary assignee role: `Frontend Engineer`
- Supporting roles:
  - `QA Engineer`
- Why:
  - Test/tooling refresh is frontend-owned with QA validation

#### DL-804

- Primary assignee role: `Tech Lead / Architect`
- Supporting roles:
  - `Frontend Engineer`
  - `Platform Engineer`
- Why:
  - Major platform upgrade planning needs architectural review before implementation

## Best Fit For Immediate Start

### Backend Engineer

- `DL-103`
- `DL-403`
- `DL-502`

### Full-Stack Engineer

- `DL-401` remaining backend-driven schema work
- `DL-701`

### Frontend Engineer

- `DL-601`
- `DL-501` remaining editorial UX improvements

### Platform Engineer

- `DL-702`
- `DL-802`
