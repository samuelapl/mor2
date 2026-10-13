# In-Person Classroom Sessions & Round-Based Cohort Scheduling Plan

## Executive Summary

Enhance the **In-Person Classroom** (`IN_PERSON_ONLY`) delivery workflow across **Backend**, **Web Frontend**, and **Mobile App** while keeping all **Pure Online** (`ONLINE_ONLY` / `virtual`) features 100% untouched and isolated.

### Core Requirements

1. **Strict Module Isolation**:
   - All new backend logic lives inside `backend/src/modules/live-sessions/in-person/`.
   - All new frontend components live inside `frontend/src/components/features/sessions/in-person/`.
   - Pure online (`ONLINE_ONLY` / `virtual/`) code paths remain completely untouched.
2. **Classroom Sessions in Course Preparation**:
   - When a Course Creator selects **In-Person Classroom** (`IN_PERSON_ONLY`) and checks **"Include classroom sessions"**, the sidebar and stage headers dynamically display **"Classroom Sessions"** (instead of _"Online Sessions"_).
   - Creators can plan 1 or more **Classroom Sessions** (topics, objectives, descriptions, and formative classroom quizzes) in the curriculum.
3. **Round-Based Scheduling (Round 1, Round 2, ...)**:
   - A **Round** represents a complete scheduled cohort containing **1 or more planned Classroom Sessions** at a physical branch venue.
   - During initial scheduling, the Training Admin schedules **Round 1** (assigning dates, times, branch venue, and instructor for the planned classroom sessions).
   - Training Admins can create additional rounds (**Round 2, Round 3, ... — `+ Add Round`**) at any time based on learner demand or regional branch needs.
4. **Round-Based Learner Enrollment (Web & Mobile)**:
   - When enrolling in an `IN_PERSON_ONLY` course on Web or Mobile, learners select an available **Round** (e.g., _"Round 1 — Addis Ababa HQ"_ or _"Round 2 — Hawassa Branch"_), which reserves their seat across all classroom sessions in that Round.

---

## Architecture Flow

```mermaid
flowchart TD
    subgraph Course Preparation (Creator)
        A[Select In-Person Classroom] --> B[Check 'Include Classroom Sessions']
        B --> C[Sidebar Shows 'Classroom Sessions']
        C --> D[Plan Classroom Session 1, Session 2, ...]
    end

    subgraph Round Scheduling (Training Admin)
        D --> E[Schedule Round 1]
        E --> E1[Set Venue, Trainer & Date/Time for Session 1..N]
        D --> F[+ Add Round 2 / Round 3 as Needed]
        F --> F1[Set Venue, Trainer & Date/Time for Session 1..N]
    end

    subgraph Learner Experience (Web & Mobile)
        E1 & F1 --> G[Learner Views Available Rounds]
        G --> H[Learner Enrolls in a Round]
        H --> I[Seat Reserved for All Classroom Sessions in That Round]
        I --> J[On-Site QR / PIN Check-In per Session]
    end
```

---

## Phase 1: Backend — In-Person Round Architecture (`in-person/` Module)

### Objectives

Support grouping one or more planned Classroom Sessions into numbered **Rounds** (`Round 1`, `Round 2`, ...) inside the dedicated `in-person` module without altering virtual session logic.

### Tasks

1. **Round Metadata on In-Person Sessions (`schema.prisma` & Migration)**:
   - Add optional `roundNumber` (`Int?`, e.g., `1`, `2`, `3`) and `roundLabel` (`String?`, e.g., `"Round 1"`) to `LiveSession` (used exclusively by `IN_PERSON` sessions).
2. **Dedicated In-Person Round Service (`backend/src/modules/live-sessions/in-person/in-person-sessions.service.ts`)**:
   - **`scheduleRound(dto)`**:
     - Auto-detects the next `roundNumber` (`1` for the first scheduling, `2` for the next, etc.) for the course or accepts an explicit round number.
     - Takes the course's planned **Classroom Sessions** (`CourseSessionPlan[]`) and creates the corresponding `IN_PERSON` `LiveSession` records for that Round at the chosen branch venue(s) and trainer(s).
     - Links the first round's sessions (or satisfies the course publishing check) so the course review screen knows all planned Classroom Sessions are scheduled.
     - Duplicates planned formative quizzes (`SessionPreparedQuiz`) for each classroom session in the Round.
   - **`listCourseRounds(courseId)`**:
     - Returns all scheduled Rounds for an `IN_PERSON_ONLY` course, grouped by `roundNumber` + `venueId`, including all classroom sessions inside each Round and real-time seat availability (`capacity`, `bookedSeats`, `seatsLeft`).
3. **Publishing Readiness Check (`courses.service.ts`)**:
   - For `IN_PERSON_ONLY` courses, verify that at least **Round 1** has scheduled all planned Classroom Sessions (`sessionPlanId` or `originalPlanId` matched) so publishing is unblocked as soon as Round 1 is scheduled.
4. **Round Enrollment (`enrollments.service.ts`)**:
   - When a learner enrolls in an `IN_PERSON_ONLY` course and selects a Round (or primary session of a Round), validate seat capacity on that Round and link the learner's enrollment to the Round.
5. **Backend Unit Tests**:
   - Add unit tests for `InPersonSessionsService` round creation, multi-session round grouping, and seat capacity checks.

---

## Phase 2: Web Frontend — "Classroom Sessions" Sidebar & Round Scheduler

### Objectives

Update the Course Creator/Review sidebars to display **"Classroom Sessions"** for `IN_PERSON_ONLY` courses, and provide a dedicated In-Person Round Scheduler (`Round 1`, `+ Add Round 2`, ...) and Learner Round Picker.

### Tasks

1. **Course Creator & Review Sidebar Labels (`CreatorSidebar.tsx`, `ReviewSidebar.tsx`, `CourseDetailsStage.tsx`, `SessionPlanStage.tsx`)**:
   - When `course.deliveryMode === 'IN_PERSON_ONLY'`:
     - Display **"Include classroom sessions"** in Course Details.
     - Display **"Classroom Sessions"** in the Creator Sidebar and Review Sidebar (and **"Add classroom session"** button).
     - Display **"Classroom Session"** badges and headings in the session planning stage.
   - When `course.deliveryMode === 'ONLINE_ONLY'`:
     - Keep **"Online Sessions"** completely unchanged.
2. **Dedicated In-Person Round Scheduler (`frontend/src/components/features/sessions/in-person/InPersonRoundSchedulerModal.tsx`)**:
   - Built inside `sessions/in-person/` so virtual scheduling is untouched.
   - Shows existing Rounds for the selected `IN_PERSON_ONLY` course (e.g., `Round 1`, `Round 2`) and a **`+ Schedule New Round (Round N)`** action.
   - Lists all planned **Classroom Sessions** from the course curriculum (Session 1, Session 2, ...) so the coordinator can set the date/time, venue, and trainer for each classroom session in that Round in one clean workflow.
3. **Course Review & Sessions Manager Integration (`SessionPlanStage.tsx` & `SessionsManager.tsx`)**:
   - Display scheduled Rounds clearly (e.g., _"Round 1 — 2 Classroom Sessions Scheduled"_), with a button to **`+ Add Round`** whenever more cohorts are needed.
4. **Web Learner Catalog Round Selection (`CatalogCourseModal.tsx`)**:
   - Group in-person sessions by **Round & Venue** (e.g., _"Round 1 · Addis Ababa HQ - Training Hall A (35 seats left)"_) and list the included classroom session dates underneath so the learner sees all sessions in the Round they are booking.

---

## Phase 3: Mobile App — Round Selection, Classroom Sessions & E2E Verification

### Objectives

Update the React Native mobile app (`mobile/`) so learners can view Rounds, enroll in a Round, see all Classroom Sessions in their Round, and check in on-site via QR/PIN.

### Tasks

1. **Mobile Round Enrollment (`mobile/src/app/course/[courseId]/enroll.tsx`)**:
   - Update `EnrollScreen` for `IN_PERSON_ONLY` courses to display selectable **Rounds** (showing Round number, Branch Venue, remaining seats, and the list of Classroom Session dates included in that Round).
2. **Mobile Course & Classroom Session Views (`mobile/src/app/course/[courseId]/index.tsx` & `live-sessions.tsx`)**:
   - Label the sessions section **"Classroom Sessions"** when `deliveryMode === 'IN_PERSON_ONLY'` (keeping **"Live Sessions"** for online courses).
   - Display the learner's enrolled **Round badge** (e.g., `Round 1`) on each classroom session card along with Venue, Building, Room, and QR/PIN check-in button.
3. **Localization (`mobile/src/core/i18n/locales/en.json` & `am.json`, `frontend/src/lib/i18n/locales/`)**:
   - Add English and Amharic translations for `"Classroom Sessions"`, `"Round {{number}}"`, `"Schedule New Round"`, and `"Select Training Round"`.
4. **Seed Update & Full E2E Verification**:
   - Update `VAT102` seed for `samueltiruneh123@gmail.com` to demonstrate clean planned Classroom Sessions ready for Round 1 & Round 2 testing.
   - Run `npx tsc --noEmit` across `backend`, `frontend`, and `mobile`, plus `npm test` on `backend`.

---

## Execution Checklist

| Phase       | Milestone                              | Scope                                                                                    | Status  |
| :---------- | :------------------------------------- | :--------------------------------------------------------------------------------------- | :-----: |
| **Phase 1** | Backend In-Person Round Engine         | `backend/src/modules/live-sessions/in-person/`, `prisma`, `courses`, `enrollments`       | **Completed** |
| **Phase 2** | Web "Classroom Sessions" & Round UI    | `frontend/src/components/features/courses/`, `sessions/in-person/`, `CatalogCourseModal` | **Completed** |
| **Phase 3** | Mobile Round Enrollment & Verification | `mobile/src/app/course/`, `mobile/src/features/live-sessions/`, i18n, Tests              | **Completed** |

