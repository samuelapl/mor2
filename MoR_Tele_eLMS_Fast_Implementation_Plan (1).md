# MoR Tele eLMS — Fast Professional Actor Workflow Completion Plan

## Mission

Complete the existing **MoR Tele eLMS** into a professional, production-oriented, dynamic e-learning platform using the existing codebase, existing APIs, Prisma schema, Nilespark business logic, authentication, permissions, and existing functionality.

### Existing projects

- Frontend:
  `C:\Users\j\Desktop\Lemat Projects\MoR LMS\e-learning-Demo\elearning-front`
- Backend:
  `C:\Users\j\Desktop\Lemat Projects\MoR LMS\nilespark-backend`

### Six actors

1. Learner
2. Trainer
3. Course Owner
4. Content Approver
5. Training Administrator
6. System Administrator

The **System Administrator permission-management UI/implementation is being handled by another developer**. Do not redesign or take ownership of that part. All other actor workflows must consume the existing permission architecture correctly.

---

# 1. Non-Negotiable Rules

## Real data only

Do NOT use:

- mock courses
- fake users
- fake dashboards
- fake statistics
- fake progress
- fake approval queues
- fake messages
- hardcoded business records
- localStorage as database persistence
- in-memory stores as the final implementation
- fake API responses

If a required feature cannot be persisted because the database/API is missing something:

> STOP, identify the exact gap, and report it.

Do not hide the gap with mock data.

## Preserve the existing application

Do not replace the application with a new LMS.

Reuse:

- existing frontend routes
- existing components
- existing NestJS modules
- existing Prisma models
- existing APIs
- existing authentication
- existing permissions
- existing Nilespark business logic
- existing assessment/exam functionality
- existing certificates
- existing live-session functionality
- existing bilingual support
- existing MoR branding

Only change what is necessary to complete the workflow.

## Permission enforcement

Permissions must affect both:

1. frontend navigation/action visibility
2. backend authorization

If System Admin removes a permission:

- navigation disappears
- page/action buttons disappear
- direct URL access is blocked
- backend API access is rejected
- no frontend-only permission bypass is acceptable

Use the existing permission architecture. Do not create a competing RBAC system.

---

# 2. IMPORTANT: Prisma Safety First

The backend currently has a large set of Prisma-related TypeScript errors.

Before feature implementation:

1. inspect the actual Prisma schema
2. inspect generator configuration
3. inspect database provider
4. inspect Prisma and `@prisma/client` versions
5. inspect all existing models/enums referenced by services
6. determine whether Prisma Client is stale or generated from another schema
7. determine whether multiple Prisma schemas exist
8. determine whether the recent DirectMessage change caused/exposed the mismatch
9. verify whether `DATABASE_URL` is needed for generation
10. identify the exact root cause

Do NOT:

- fix dozens of errors individually
- invent TypeScript replacements for Prisma enums
- manually fake Prisma types
- reset the database
- drop tables
- run destructive migrations
- modify credentials
- modify `.env`

`prisma generate` is allowed only when safe and non-destructive.

The current 86-error situation must be diagnosed before large feature work.

---

# 3. FIRST ACTION — READ-ONLY ARCHITECTURE AUDIT

Do NOT implement all phases immediately.

Perform a fast, parallel, read-only audit of the frontend and backend.

Report:

## A. Data model

Find existing models/relations for:

- Program
- Course
- Module
- Lesson
- Learning Activity
- Quiz
- Assignment
- Assessment/Exam
- Question Bank
- Enrollment
- Progress
- Certificate
- User
- Role
- Permission
- Approval
- Notification
- Live Session
- Attendance
- Files/media
- Direct Message

For every relevant model, identify whether it is reusable.

## B. APIs

List existing endpoints for:

- authentication
- courses
- modules/curriculum
- lessons/content
- activities
- quizzes
- assessments/exams
- enrollment
- progress
- certificates
- approvals
- publishing
- scheduling
- live sessions
- attendance
- messaging
- users/learners/trainers
- file/media upload

## C. Frontend

List existing routes/components for each actor.

Identify:

- implemented
- partially implemented
- placeholder
- broken
- missing

## D. Permissions

Find the actual permission names and enforcement mechanism.

Do not invent permission names before inspection.

## E. State machine

Find the actual course statuses and transitions.

Prefer existing equivalents of:

`DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → PUBLISHED → ARCHIVED`

If the existing schema uses different names, use the existing names.

Document rejection/request-change behavior.

## F. Media

Identify the existing upload/storage architecture.

Do not invent another file-storage system.

## G. Prisma errors

Give the exact root cause and safest correction.

## H. Missing workflow pieces

Create a prioritized list:

- Critical
- High
- Medium
- Nice-to-have

---

# 4. REQUIRED REGISTRATION IMPROVEMENT

Update registration professionally.

Required fields must have a consistent accessible required indicator.

Example:

- First Name *
- Last Name *
- Email *
- Password *
- Confirm Password *
- Phone Number *
- TIN (Optional)

TIN MUST remain optional.

Validation must be consistent between:

- frontend
- backend DTO/business validation
- database constraints where appropriate

Do not invent authentication rules.

---

# 5. PROFESSIONAL DYNAMIC COURSE BUILDER

The core content hierarchy should support:

```text
Program
  └── Course
      ├── Modules
      │   └── Lessons
      │       ├── Learning Activities
      │       ├── Optional Quiz
      │       └── Optional Assignment
      ├── Final Assessment
      ├── Completion Rules
      └── Certification
```

Reuse existing models whenever possible.

Do not create duplicate Course/Module/Lesson/etc. models.

Course metadata should use the existing schema and requirements where supported:

- title
- course code
- category
- owning department
- target audience
- level
- delivery method
- duration
- language
- course owner
- objectives
- prerequisites
- certification
- metadata
- classification
- version
- status

---

# 6. COURSE OWNER WORKFLOW

Course Owner:

```text
Create Course
→ Build Structure
→ Add Modules
→ Add Lessons
→ Add Learning Activities
→ Add Optional Quiz
→ Add Optional Assignment
→ Configure Final Assessment
→ Configure Completion Rules
→ Review
→ Submit
```

Show real:

- status
- version
- owner
- last modified
- submission date
- approval history
- rejection/request-change reason

After submission, editing must follow existing business rules.

---

# 7. CONTENT APPROVER WORKFLOW

Create a professional real-data approval workspace.

Approver sees real pending courses.

Approver can inspect:

- course information
- modules
- lessons
- resources
- activities
- assessments
- metadata
- classification
- version
- approval history

Actions:

- Approve
- Reject / Request Changes

Reject/request changes requires a reason.

Persist:

- decision
- reason
- actor
- timestamp
- audit trail

Do not allow the Approver to publish unless existing business rules explicitly allow it.

---

# 8. TRAINING ADMINISTRATOR WORKFLOW

Training Admin sees approved courses awaiting operational publication.

Workflow:

```text
APPROVED
→ Publication Readiness
→ Configure Availability/Audience
→ PUBLISH
→ Visible to Eligible Learners
```

Never publish an unapproved course.

Never show unpublished/unapproved courses to learners.

Preserve existing:

- scheduling
- attendance
- learner administration
- operational reporting

---

# 9. LEARNER EXPERIENCE — USE SUPPLIED SCREENSHOTS AS UX REFERENCE

The supplied screenshots show how a professional learner-facing LMS can organize course content.

Use them as **UX/interaction references only**.

Do NOT copy:

- branding
- logo
- company name
- fake/sample content
- exact text
- business rules

Use MoR branding and real MoR/Nilespark data.

## Learner course experience

A learner opening a published course should see something similar in information hierarchy to:

```text
Course
├── Overview
├── Objectives
├── Course Information
├── Progress
├── Module 1
│   ├── Lesson 1
│   │   ├── Video
│   │   ├── PDF/Reading
│   │   ├── Activity
│   │   └── Completion
│   ├── Lesson 2
│   └── Optional Quiz
├── Module 2
│   └── ...
├── Optional Assignments
├── Final Assessment
├── Feedback
└── Certificate
```

Use professional expandable/collapsible sections similar to the screenshots.

The exact hierarchy must come from the database.

Never hardcode:

- Week 1
- Week 2
- Module 1
- Lesson 1

unless those records exist.

## Learner sees real data

Display actual:

- enrolled courses
- published eligible courses
- progress
- module completion
- lesson completion
- activity completion
- quiz attempts/results
- assessment results
- grades
- assignment status
- attendance where applicable
- certificate status

No fake percentages.

---

# 10. LEARNING CONTENT

Use existing supported content/media types.

Where supported:

- rich text
- PDF
- Word
- PowerPoint
- video
- audio
- external link
- interactive content
- learning activities

Each content item should have appropriate:

- type indicator
- title
- duration where applicable
- completion state
- access state

Do not display empty or unsupported content sections.

---

# 11. QUIZ / ASSIGNMENT / ASSESSMENT

Quizzes are optional.

Assignments are optional.

Use existing assessment/exam architecture.

Where already supported, preserve:

- question banks
- MCQ
- true/false
- matching
- essay
- case study
- upload/practical
- passing score
- attempts
- time limits
- retake rules
- grading/rubrics
- difficulty
- randomization
- proctoring

Do not fake unsupported assessment functionality.

---

# 12. COURSE LIFECYCLE

Use the existing state machine.

Target business behavior:

```text
DRAFT
  ↓
SUBMITTED
  ↓
UNDER_REVIEW
  ↓
APPROVED
  ↓
PUBLISHED
  ↓
ARCHIVED
```

Rejection/request-changes must return the course to the correct editable state according to existing rules.

Persist every transition.

Create/maintain audit history.

---

# 13. TRAINER WORKFLOW

Preserve and complete real trainer functionality:

- assigned courses
- assigned learners
- schedules
- live classes
- attendance
- learner support
- grading
- communication
- session management

Trainer must only see data they are authorized to manage.

---

# 14. LIVE SESSIONS — JITSI + BIGBLUEBUTTON

Investigate the existing live-session architecture BEFORE adding anything.

## Jitsi

The existing project already contains Jitsi/live-session-related functionality.

Prioritize completing and integrating the existing Jitsi implementation.

Where supported, provide:

- session creation
- scheduled date/time
- trainer
- course/module/lesson association
- meeting URL/room
- learner join action
- trainer join/manage action
- session status
- attendance integration
- access control
- session history

Reuse existing Jitsi APIs/components.

Do not replace an existing working Jitsi architecture.

## BigBlueButton

Also inspect whether BigBlueButton support already exists anywhere in the project.

If BBB integration already exists:

- complete it
- connect it to the real Live Session model
- reuse existing configuration

If BBB does NOT exist:

- do not blindly install packages or deploy a BBB server
- document the infrastructure requirement
- prepare an integration boundary/API service design
- only implement what can safely be completed inside the existing application without credentials/server provisioning

## Live-session provider architecture

If practical, make the Live Session domain provider-aware:

```text
LiveSession
  ├── JITSI
  └── BIGBLUEBUTTON
```

BUT:

Do not add a new enum/model if the current schema already has an equivalent.

The learner/trainer UI should interact with a generic live-session interface rather than duplicating the entire workflow for each provider.

## Important

Do not store provider credentials in source code.

Do not modify `.env` secrets.

Do not claim BBB/Jitsi integration is complete unless the actual backend + frontend flow is verified.

---

# 15. PROFESSIONAL ACTOR PAGES

Actor pages must be dynamic and data-driven.

Avoid static demo dashboards.

Use:

- real tables
- search
- filters
- pagination where appropriate
- status badges
- sorting where useful
- empty states
- loading states
- error states
- confirmation dialogs
- validation messages
- breadcrumbs
- activity/audit history
- responsive layouts
- accessible controls

If there is no data:

> No courses found

Do not show:

> 12 courses

unless 12 courses actually exist.

---

# 16. END-TO-END REQUIRED BUSINESS TEST

The final system should support this real scenario:

```text
System Admin grants Course Owner permission
        ↓
Course Owner logs in
        ↓
Creates Course
        ↓
Adds Modules
        ↓
Adds Lessons
        ↓
Adds Learning Activities
        ↓
Optionally adds Quiz
        ↓
Optionally adds Assignment
        ↓
Configures Final Assessment
        ↓
Configures Completion Rules
        ↓
Submits Course
        ↓
Content Approver sees pending course
        ↓
Reviews course
        ↓
Approves course
        ↓
Training Administrator sees APPROVED course
        ↓
Publishes course
        ↓
Eligible Learner sees course
        ↓
Learner enrolls
        ↓
Learner opens Course
        ↓
Learner sees dynamic Module → Lesson → Content structure
        ↓
Learner completes real learning content
        ↓
Learner takes Quiz/Assessment when configured
        ↓
Results persist
        ↓
Progress persists
        ↓
Completion rules are evaluated
        ↓
Certificate becomes available when eligible
```

Every arrow must represent a real persisted business transition.

---

# 17. FAST EXECUTION STRATEGY

We have limited time.

Do NOT spend time polishing isolated UI while core workflows are broken.

Prioritize in this order:

### P0 — Blocking foundation

1. Prisma consistency
2. Authentication integrity
3. Existing permission architecture
4. Course/Module/Lesson data model
5. Existing API health

### P1 — Core workflow

6. Course Owner builder
7. Submit workflow
8. Approver workflow
9. Training Admin publication
10. Learner published-course flow

### P2 — Learning execution

11. Progress
12. Activities
13. Quiz
14. Assignment
15. Final assessment
16. Certificate

### P3 — Operational workflows

17. Trainer
18. Live sessions/Jitsi
19. BBB integration where safely possible
20. Attendance
21. Communication

### P4 — Quality

22. Permission-aware navigation
23. Backend authorization verification
24. Loading/error/empty states
25. Responsive/accessibility cleanup
26. End-to-end tests
27. Production build

## Parallel audit strategy

During the READ-ONLY audit, inspect frontend and backend in parallel.

Do not repeatedly inspect the same files.

Create one consolidated gap matrix:

| Area | Existing | Partial | Missing | Broken | Reusable | Priority |
|---|---|---|---|---|---|---|

This will prevent wasted work.

---

# 18. PHASES

## Phase 1 — Architecture + Prisma

Audit and fix only the Prisma/schema/client consistency if the safe fix is clear.

No destructive migration.

## Phase 2 — Permission/API audit

Map existing permissions to all six actors.

System Admin permission implementation remains outside scope.

## Phase 3 — Registration

Required indicators and TIN optional.

## Phase 4 — Course Builder

Course → Module → Lesson → Activity.

## Phase 5 — Assessments

Optional Quiz → Assignment → Final Assessment.

## Phase 6 — Course Owner Submission

Draft → Submit → Review queue.

## Phase 7 — Content Approver

Review → Approve / Request Changes.

## Phase 8 — Training Admin

Approved → Publish.

## Phase 9 — Learner

Published → Enrollment → Learning → Progress → Assessment → Completion.

## Phase 10 — Trainer

Trainer operational workflows.

## Phase 11 — Live Sessions

Jitsi first where existing implementation exists.

BBB integration only as far as safely supported by the existing infrastructure.

## Phase 12 — Permission Enforcement

Verify frontend + direct URL + backend authorization.

## Phase 13 — End-to-End QA

Verify persistence and state transitions.

---

# 19. DATABASE SAFETY

If a schema change is necessary:

1. explain the exact change
2. identify affected models
3. identify affected data
4. prepare migration plan
5. STOP for explicit approval before destructive/risky database operations

Never:

- reset
- drop
- wipe
- truncate
- delete existing business data

Do not modify `.env` or credentials.

---

# 20. TESTING REQUIREMENTS

After each major phase:

### Frontend

- `npx tsc --noEmit`
- production build

### Backend

- TypeScript check
- NestJS build

### API

Verify real endpoints.

### Persistence

Verify database state after:

- course creation
- module creation
- lesson creation
- submission
- approval
- publication
- enrollment
- lesson completion
- quiz/assessment submission
- certificate eligibility

### Authorization

Verify:

- allowed actor can perform action
- unauthorized actor cannot perform action
- direct URL cannot bypass permission
- backend rejects unauthorized request

---

# 21. REQUIRED REPORT AFTER EACH PHASE

Report:

- files changed
- database changes
- API changes
- UI changes
- tests run
- exact remaining issues
- blockers
- next phase

Do not claim a feature is complete because its page renders.

A feature is complete only when:

**UI + API + authorization + persistence + business state transition + verification**

all work.

---

# 22. FIRST RESPONSE REQUIRED FROM ANTIGRAVITY

Before implementing feature changes, produce:

1. Prisma architecture audit
2. Actor/permission audit
3. API inventory
4. Frontend route/component inventory
5. Course state-machine audit
6. Media/file architecture audit
7. Jitsi audit
8. BBB audit
9. Current 86 Prisma-error root cause
10. Gap matrix
11. Prioritized implementation plan
12. Estimated implementation order

Then STOP.

Do not start implementation until the plan is explicitly approved.

---

# Definition of Done

The platform should no longer behave like a collection of actor pages.

It should behave like one connected LMS:

**Course creation → governance → approval → publication → enrollment → learning → assessment → progress → completion → certification**

with:

**real data + real permissions + real persistence + real actor responsibilities + professional UX**

The supplied learner screenshots are the visual/interaction reference for how learners should experience course materials.

The existing MoR/Nilespark codebase is the technical source of truth.

The MoR requirements are the business/content source of truth.
