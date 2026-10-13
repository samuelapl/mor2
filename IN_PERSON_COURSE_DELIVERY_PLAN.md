# In-Person & Online Course Delivery Implementation Plan

## Executive Summary
Consolidate the LMS course delivery architecture from three disparate modes (`ONLINE_ONLY`, `IN_PERSON_ONLY`, and `BOTH`/Hybrid) into two unified formats:
1. **Online Self-Paced**: 100% digital curriculum (modules, lessons, online assessments) with optional virtual webinars.
2. **In-Person Classroom**: Shares the exact same online curriculum and assessment engine, but requires learners to physically attend classroom sessions at branch venues, with on-site attendance verified via QR/PIN check-in.

The redundant "Hybrid" mode is completely retired, simplifying course creation, enrollment, scheduling across country branches, and learner progress on both **Web** and **Mobile**.

---

## Architecture Comparison

```mermaid
flowchart TD
    subgraph Previous Architecture (Fragmented)
        A1[Online Self-Paced] 
        A2[In-Person Only]
        A3[Hybrid / Both - Complex Dual Pipeline]
    end

    subgraph Target Architecture (Unified Engine)
        B1["1. Online Self-Paced<br/>(Modules + Lessons + Assessments + Virtual Webinars)"]
        B2["2. In-Person Classroom<br/>(Modules + Lessons + Assessments + On-Site Branch Sessions)"]
    end
```

---

## Phase 1: Backend & Core Data Model Streamlining

### Objectives
Clean up the delivery mode enums, allow session planning for in-person courses, support multi-branch cohort scheduling, and streamline seat reservations.

### Tasks
1. **Schema & Enums Cleanup (`schema.prisma` & Migrations)**:
   - Deprecate/migrate `CourseDeliveryMode.BOTH` to `IN_PERSON` (or retain backward compatibility mapping in DB while enforcing 2 choices at the API layer: `ONLINE_ONLY` and `IN_PERSON`).
   - Ensure `CourseSessionPlan` supports both `ONLINE_ONLY` and `IN_PERSON` courses.
2. **Delivery Modes Service (`backend/src/modules/courses/delivery-modes.ts`)**:
   - Update `ENABLED_DELIVERY_MODES` to allow `ONLINE_ONLY` and `IN_PERSON` (remove `BOTH`).
   - Remove restrictions in `session-plans.service.ts` that previously blocked session plans for non-online courses.
3. **Multi-Branch Session Batch Scheduling (`venues.service.ts` & `live-sessions.service.ts`)**:
   - Provide clean API for scheduling a Session Round across multiple country branches in a single request (branch venue, local trainer, date/time, seat capacity).
   - Ensure venue conflict checks (`assertVenueAvailable`) and transactional locking prevent room double-booking.
4. **Enrollment & Seat Reservation (`enrollments.service.ts`)**:
   - Learners enrolling in an in-person course select their branch venue / round.
   - Separate course enrollment from session booking so a full classroom round does not prevent learning the online material (support alternate rounds / waitlist).
5. **Backend Automated Testing**:
   - Update unit tests in `src/modules/courses/`, `src/modules/live-sessions/`, `src/modules/enrollments/`, and `src/modules/session-plans/`.

---

## Phase 2: Web Frontend (Creator, Coordinator & Learner)

### Objectives
Provide a clean course-creation wizard with only two delivery options, an intuitive multi-branch schedule generator for coordinators, and smooth venue selection for learners.

### Tasks
1. **Course Creator Wizard (`CourseDetailsStage.tsx` & `CourseCreatorShell.tsx`)**:
   - Simplify format selection to two clear cards:
     - **Online Self-Paced** (Digital modules & assessments, optional virtual webinars).
     - **In-Person Classroom** (Digital modules & assessments, mandatory physical branch sessions).
   - Remove "Hybrid" / "Coming Soon" badges.
   - When **In-Person Classroom** is selected, enable the session plan editor step so creators can define in-person session topics, durations, and objectives.
2. **Multi-Branch Scheduling UI (`ScheduleSessionModal.tsx` & `VenueAllocationStep.tsx`)**:
   - For in-person course sessions, present a clean branch allocation grid.
   - Training coordinators select which country branches/venues will run Round 1, assign local branch trainers, and pick dates/times in one batch.
   - Real-time seat capacity and venue conflict indicators.
3. **Learner Course Catalog & Enrollment (`CatalogCourseModal.tsx`)**:
   - When enrolling in an In-Person course, learners choose their local branch/venue.
   - Clear display of session dates, venue name/room, local trainer, and remaining seats.
4. **Classroom & Learner Schedule View (`LiveSessionsStage.tsx`)**:
   - For virtual sessions: show "Join LiveKit Video Call".
   - For in-person sessions: display physical venue badge (Branch, Building, Room) and check-in status.
   - Trainers display the **Classroom Check-In Modal** (`ClassroomQrModal.tsx`) on the classroom projector with dynamic QR & 6-digit PIN.

---

## Phase 3: Mobile App & End-to-End Verification

### Objectives
Update the React Native mobile app (`mobile/`) to support in-person course viewing, branch selection, on-site QR/PIN check-in, and execute rigorous end-to-end testing.

### Tasks
1. **Mobile Course Catalog & Details (`mobile/src/app/course/[courseId]/`)**:
   - Update course details card to display "In-Person Classroom" badge alongside "Online Self-Paced".
   - Provide branch/venue picker when enrolling in an in-person course on mobile.
2. **Mobile Live Sessions & Attendance (`mobile/src/features/live-sessions/`)**:
   - In `SessionCard` and `live-sessions.tsx`, detect in-person sessions (`sessionType === 'IN_PERSON' || venueId`).
   - Replace the video join button with physical venue details: Branch name, building, room number, and session time.
3. **Mobile On-Site Check-In**:
   - Add QR code scanner / 6-digit PIN check-in sheet in the mobile app.
   - Learners scan the projector QR code or type the 6-digit PIN while in the room to record check-in (`checkInMethod: QR | PIN`) and mark themselves **Present**.
4. **Internationalization & Localization (`mobile/src/core/i18n/`)**:
   - Ensure all in-person badges, check-in prompts, and venue labels are translated into English (`en.json`) and Amharic (`am.json`).
5. **Full System Verification**:
   - Run `npx tsc --noEmit` on `backend`, `frontend`, and `mobile`.
   - Run backend test suite: `npm test`.
   - Verify complete user journey: Course Creation -> Multi-Branch Scheduling -> Learner Enrollment -> In-Person QR Check-In -> Attendance & Certificate.

---

## Execution Checklist

| Phase | Milestone | Scope | Status |
| :--- | :--- | :--- | :---: |
| **Phase 1** | Core API & Delivery Simplification | Backend (`prisma`, `courses`, `live-sessions`, `enrollments`) | **Completed** |
| **Phase 2** | Web Creator, Scheduling & Classroom | Frontend (`creator`, `sessions`, `classroom`, `catalog`) | **Completed** |
| **Phase 3** | Mobile Experience & Full E2E QA | Mobile (`mobile/src/features/live-sessions/`, `catalog`) + Tests | **Completed** |

