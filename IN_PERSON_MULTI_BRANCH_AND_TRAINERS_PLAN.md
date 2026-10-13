# In-Person Multi-Branch Scheduling, Branch-Specific Trainers & Classroom Experience Plan

## Executive Overview

This plan enhances the **In-Person Classroom** (`IN_PERSON_ONLY`) delivery workflow across the LMS ecosystem:
1. **Multi-Branch Cohort Scheduling**: Allows training coordinators to select multiple branch venues at once and schedule rounds across each branch.
2. **Session Plan Details & Objectives Preview**: Interactive info icon (`ℹ️`) on scheduling slots displaying full session plan descriptions, objectives, and formative quizzes.
3. **Trainer Specialization & Branch Binding**:
   - Trainers designated as **Online Trainer** vs. **In-Person Trainer**.
   - In-Person Trainers are strictly bound to their registered **Branch Venue** (`primaryVenueId`).
   - Pure online courses only show Online Trainers.
   - During in-person round scheduling, trainer selection is filtered to only trainers belonging to the selected branch.
   - Course creation/approval does not require upfront trainer assignment for in-person courses; trainers are assigned during live session scheduling.
4. **Branch-First Learner Enrollment**: Learners filter by available branch offices first, then select their preferred Round at that branch.
5. **Self-Paced Final Assessment**: In-person learners take the final assessment online at their own pace once coursework is completed (no in-person classroom exam friction).
6. **Classroom Sessions Roster & Check-In Fixes**:
   - Ensure all classroom sessions in an enrolled round appear in the learner's live/classroom sessions list (not just the first one).
   - Fix the 6-character PIN verification algorithm so projected trainer PINs check in reliably.
   - Add a direct **Check In** action on Classroom Session cards inside the Course Syllabus.
7. **Comprehensive Seed**: Seed at least 2 In-Person Trainers per branch venue and Online Trainers for online courses.

---

## 3-Phase Architecture & Execution Plan

```mermaid
flowchart TD
    subgraph Phase 1: Backend Foundation
        B1[Trainer Specialization & Venue Binding in DB]
        B2[Multi-Branch Round Scheduling Endpoint]
        B3[Decouple In-Person Approval from Trainer Assignment]
        B4[Fix Learner Sessions Roster for Multi-Session Rounds]
        B5[PIN Code & Direct Check-In API Verification]
    end

    subgraph Phase 2: Web Frontend Experience
        W1[Multi-Branch Venue Selector in InPersonRoundScheduler]
        W2[Session Plan Info Modal with Objectives & Quizzes]
        W3[Branch-Filtered Trainer Dropdown]
        W4[Trainer Management: Online vs In-Person + Venue Assignment]
        W5[Learner Catalog: Branch Filter then Round Selection]
        W6[Ensure Final Assessment is Self-Paced without Classroom Blocker]
    end

    subgraph Phase 3: Mobile App & E2E Seed Verification
        M1[Branch-Filtered Round Enrollment Flow on Mobile]
        M2[Show All Round Classroom Sessions in Live Sessions Screen]
        M3[Direct Check-In Button on Course Syllabus Classroom Cards]
        M4[Fix PIN Validation Algorithm on Mobile]
        M5[Seed Update: 2 Trainers per Branch Venue & Clean VAT102 Multi-Branch Rounds]
    end

    Phase 1 --> Phase 2
    Phase 2 --> Phase 3
```

---

## Phase 1: Backend Engine & Data Models

### 1.1 Trainer Delivery Type & Venue Association
- **Schema (`backend/prisma/schema.prisma`)**:
  - Add enum `TrainerDeliveryType` (`ONLINE`, `IN_PERSON`, `BOTH`).
  - Add field `trainerType TrainerDeliveryType @default(ONLINE) @map("trainer_type")` on `User`.
  - Ensure `primaryVenueId` is exposed and indexed on `User`.
- **User DTOs & Service (`backend/src/modules/users/`)**:
  - Update `CreateActorDto` and `UpdateUserDto` to accept `trainerType`.
  - Update `UsersService.findTrainers(deliveryType?: TrainerDeliveryType, venueId?: string)` to allow querying trainers filtered by `trainerType` and branch `venueId`.

### 1.2 In-Person Course Approval Decoupling
- In `backend/src/modules/courses/courses.service.ts`:
  - When reviewing or approving an `IN_PERSON_ONLY` course, do not block approval if no trainer is assigned on the course level.
  - Trainers are assigned when scheduling the physical sessions at the branch venue.

### 1.3 Multi-Branch Round Scheduling Service
- In `backend/src/modules/live-sessions/in-person/in-person-sessions.service.ts`:
  - Extend `scheduleRound` or create `scheduleMultiBranchRounds(dto)`:
    - Accepts an array of branch allocations: `branchAllocations: { venueId: string; trainerId: string; roundNumber?: number; slots: RoundSessionSlotDto[] }[]`.
    - Validates that each chosen trainer belongs to the corresponding branch venue (or has `trainerType` `IN_PERSON` / `BOTH`).
    - Validates venue availability for each slot.
    - Creates the numbered rounds across all selected branch venues in a single transaction.

### 1.4 Learner Sessions Roster Bug Fix
- In `backend/src/modules/progress/progress.service.ts`:
  - In `getCourseProgress`: ensure that when grouping or returning `liveSessions` for an enrolled learner, **all** sessions linked to the learner's enrolled round (`rescheduleStatus === round.rescheduleStatus` or matching `roundSessionIds`) are included in order, rather than only returning the primary/first session.

### 1.5 PIN Code & Check-In Validation
- Audit and standardize PIN generation and verification:
  - Normalize PIN format (uppercase, strip whitespace, handle UUID trailing characters).
  - Ensure the backend check-in endpoint accepts PIN/QR cleanly and records `CheckInMethod.QR` with `AttendanceStatus.PRESENT`.

---

## Phase 2: Web Frontend — Multi-Branch Scheduler, Trainer Management & Learner Flow

### 2.1 Multi-Branch In-Person Round Scheduler
- In `frontend/src/components/features/sessions/in-person/InPersonRoundScheduler.tsx`:
  - Add **Multi-Branch Selection**: Allow selecting multiple branch venues simultaneously (with branch search, capacity indicators, and badges).
  - For each selected branch venue:
    - Display the round configuration.
    - Trainer selector dynamically fetches and displays **only the in-person trainers registered to that specific branch**.
    - For each planned classroom session slot:
      - Display an **Info Icon (`ℹ️`)** button next to the title.
      - Clicking the icon opens a **Session Plan Detail Popover/Modal** displaying the description, learning objectives, and attached formative quiz summary.

### 2.2 Trainer Registration & Management
- In `frontend/src/components/features/users/`:
  - When creating or editing a user with role `TRAINER`:
    - Display trainer type options: **Online Trainer** vs. **In-Person Trainer**.
    - If **In-Person Trainer** is selected, require selecting their **Branch Venue** (`primaryVenueId`).
  - In course creator / approval:
    - Pure online courses only show and select **Online Trainers**.
    - In-person course creation does not require upfront trainer assignment.

### 2.3 Learner Catalog Enrollment: Branch Filter $\rightarrow$ Round Selection
- In `frontend/src/components/features/courses/CatalogCourseModal.tsx`:
  - Step 1: Display a clean branch office selector/filter: *"Select Branch Venue"* (e.g., *Addis Ababa Head Office*, *Adama Branch*, *Hawassa Branch*).
  - Step 2: Under the chosen branch, display the available **Rounds** (e.g., *Round 1*, *Round 2*) with seat availability and the complete schedule of classroom sessions.
  - Clicking enroll reserves the seat in the chosen Round.

### 2.4 Self-Paced Final Assessment for In-Person Courses
- In course review, syllabus, and learner views:
  - Ensure that for `IN_PERSON_ONLY` courses, the final assessment behaves exactly like self-paced online courses (unlocks when required modules are completed, taken online anytime).
  - Remove any legacy "In-Person Classroom Evaluation" requirement or modal blocker.

---

## Phase 3: Mobile App, Check-In Polish & Seed Verification

### 3.1 Mobile Branch-First Round Enrollment
- In `mobile/src/app/course/[courseId]/enroll.tsx`:
  - Add branch filter tabs/picker so learners choose their branch first, then see available Rounds for that branch.
  - Display all classroom sessions included in each round.

### 3.2 Display All Classroom Sessions in Live/Classroom Sessions Screen
- In `mobile/src/app/course/[courseId]/live-sessions.tsx`:
  - Render every classroom session in the learner's enrolled Round with date/time, branch venue, building/room, and check-in status.

### 3.3 Direct Check-In on Course Syllabus Classroom Session Cards
- In `mobile/src/features/courses/components/CourseSyllabus.tsx` and `mobile/src/app/course/[courseId]/index.tsx`:
  - Add a direct **Check In** button on each classroom session card for enrolled learners so they can open the check-in modal/scanner directly from the course syllabus.

### 3.4 6-Digit PIN Check-In Fix
- In `mobile/src/features/live-sessions/utils/check-in.ts` and `mobile/src/app/session/[sessionId]/check-in.tsx`:
  - Ensure `isValidPin` extracts the exact 6-character PIN matching the trainer's displayed code.
  - Normalize case, remove whitespace, and verify against the session's ID.

### 3.5 Database Seed & Multi-Branch Demo
- In `backend/prisma/seed-in-person-vat.ts` (and main seed):
  - Seed at least **2 In-Person Trainers for each branch venue** (e.g., 2 in Addis Ababa HQ, 2 in Adama, 2 in Hawassa) with `primaryVenueId` set and `trainerType: 'IN_PERSON'`.
  - Seed dedicated **Online Trainers** with `trainerType: 'ONLINE'`.
  - Seed `VAT102` with planned classroom sessions scheduled across **multiple branch venues** (e.g., Round 1 at Adama with Adama trainers, Round 2 at Addis Ababa HQ with HQ trainers).

---

## Execution Checklist

| Phase | Milestone | Key Deliverables | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Backend Foundation** | `TrainerDeliveryType` in schema, branch-filtered trainer query, multi-branch round scheduler, decoupling in-person approval from trainer assignment, roster bug fix. | **Completed** |
| **Phase 2** | **Web Frontend Experience** | Multi-branch scheduler UI with info icons, branch-filtered trainer picker, trainer registration with branch binding, branch-first learner round enrollment. | **Completed** |
| **Phase 3** | **Mobile App & Seed Verification** | Mobile branch filter & round picker, all round sessions listed, direct syllabus check-in button, PIN code fix, 2 trainers per branch seed, full E2E test. | **Completed** |


