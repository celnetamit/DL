# JIRA Assignee Suggestions By Role

## Overview

This document maps each backlog item in [JIRA_BACKLOG.md](/home/itb04/Desktop/digital_lib/dl2%20by%20amit/JIRA_BACKLOG.md) to the most appropriate delivery role.

These are role recommendations, not named assignments.

## Role Definitions

- `Frontend Engineer`: owns Next.js UI, state management, UX flows, component integration, and client-side auth/session behavior
- `Backend Engineer`: owns Gin APIs, GORM models, DB queries, business rules, authz, and service orchestration
- `Full-Stack Engineer`: owns cross-cutting tickets that need coordinated frontend and backend changes
- `Platform Engineer`: owns infrastructure, config, secrets, containers, deployment runtime, and service compatibility
- `QA Engineer`: owns test plans, regression coverage, end-to-end validation, and release confidence
- `Tech Lead / Architect`: owns schema decisions, migration strategy, cross-team sequencing, and high-risk technical review
- `Product / Ops Analyst`: owns workflow clarification, compliance policy validation, operational acceptance criteria, and admin process design

## Recommended Ownership By Ticket

### Epic DL-100: Compliance Recovery

#### DL-101

- Primary assignee role: `Full-Stack Engineer`
- Supporting roles:
  - `Frontend Engineer`
  - `Backend Engineer`
  - `QA Engineer`
- Why:
  - Requires frontend API corrections plus backend contract verification

#### DL-102

- Primary assignee role: `Frontend Engineer`
- Supporting roles:
  - `Backend Engineer`
  - `QA Engineer`
- Why:
  - Mostly UI state/bootstrap behavior with small backend support if `/users/me` needs expansion

#### DL-103

- Primary assignee role: `Backend Engineer`
- Supporting roles:
  - `Tech Lead / Architect`
  - `Product / Ops Analyst`
  - `QA Engineer`
- Why:
  - Requires policy-heavy backend data export and deletion behavior

### Epic DL-200: LMS Productization

#### DL-201

- Primary assignee role: `Frontend Engineer`
- Supporting roles:
  - `Backend Engineer`
  - `QA Engineer`
- Why:
  - Primarily replaces placeholder learner UI with contextual UX

#### DL-202

- Primary assignee role: `Frontend Engineer`
- Supporting roles:
  - `Full-Stack Engineer`
  - `QA Engineer`
- Why:
  - Heavy UI/UX ticket with some backend contract checks

#### DL-203

- Primary assignee role: `Backend Engineer`
- Supporting roles:
  - `Frontend Engineer`
  - `QA Engineer`
  - `Tech Lead / Architect`
- Why:
  - Entitlement logic belongs in backend authorization and business rules

#### DL-204

- Primary assignee role: `Full-Stack Engineer`
- Supporting roles:
  - `Frontend Engineer`
  - `Backend Engineer`
  - `QA Engineer`
- Why:
  - Needs viewer integration plus persistence semantics

#### DL-205

- Primary assignee role: `Frontend Engineer`
- Supporting roles:
  - `Backend Engineer`
  - `Product / Ops Analyst`
  - `QA Engineer`
- Why:
  - UX-led feature with moderate backend aggregation support

### Epic DL-300: Product and Catalog Data Hardening

#### DL-301

- Primary assignee role: `Tech Lead / Architect`
- Supporting roles:
  - `Backend Engineer`
  - `Product / Ops Analyst`
- Why:
  - Foundational schema design and migration planning

#### DL-302

- Primary assignee role: `Backend Engineer`
- Supporting roles:
  - `Tech Lead / Architect`
  - `QA Engineer`
- Why:
  - Migration implementation and schema rollout

#### DL-303

- Primary assignee role: `Backend Engineer`
- Supporting roles:
  - `Frontend Engineer`
  - `QA Engineer`
- Why:
  - Core API and query refactor

#### DL-304

- Primary assignee role: `Full-Stack Engineer`
- Supporting roles:
  - `Backend Engineer`
  - `Frontend Engineer`
  - `QA Engineer`
- Why:
  - Validation spans API rules and admin UX feedback

### Epic DL-400: Content Operations Maturity

#### DL-401

- Primary assignee role: `Full-Stack Engineer`
- Supporting roles:
  - `Backend Engineer`
  - `Frontend Engineer`
  - `Tech Lead / Architect`
- Why:
  - Requires coordinated schema/config and UI rendering changes

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

#### DL-501

- Primary assignee role: `Frontend Engineer`
- Supporting roles:
  - `Backend Engineer`
  - `QA Engineer`
- Why:
  - Mostly a guided UI over existing generation capability

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

## Suggested Team Allocation

If staffing is limited, this is a reasonable minimum ownership model:

- `Frontend Engineer`
  - DL-102, DL-201, DL-202, DL-205, DL-501, DL-601, DL-803
- `Backend Engineer`
  - DL-103, DL-203, DL-302, DL-303, DL-402, DL-502, DL-503, DL-801
- `Full-Stack Engineer`
  - DL-101, DL-204, DL-304, DL-401, DL-602, DL-701
- `Platform Engineer`
  - DL-702, DL-802
- `Tech Lead / Architect`
  - DL-301, DL-804
- `QA Engineer`
  - Embedded across all epics, with priority focus on DL-101 through DL-205 and DL-303 through DL-304

## Best Fit For Immediate Start

### Frontend Engineer

- `DL-201`
- `DL-202`
- `DL-102`

### Backend Engineer

- `DL-103`
- `DL-203`
- `DL-302`

### Full-Stack Engineer

- `DL-101`
- `DL-204`
- `DL-701`

### Tech Lead / Architect

- `DL-301`
- `DL-804`

### QA Engineer

- Start test plan coverage for:
  - `DL-101`
  - `DL-102`
  - `DL-201`
  - `DL-202`
