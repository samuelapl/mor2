# Implementation Plan: Live Sessions, Quizzes & Attendance Gating (Web & Mobile)

This plan outlines the fixes for live session quiz point customization, real-time vote distribution before reveal, accurate 60% threshold attendance tracking, and proper missed session display with strikethrough and rescheduling (applicable to both Web and Mobile).

---

## Phase 1: Backend Engine & Core Attendance / Progress Services

### 1. Attendance Heartbeat & 60% Threshold Calculation

- **Files**:
  - `backend/src/modules/attendance/attendance.service.ts`
  - `backend/src/modules/attendance/attendance.controller.ts`
- **Fixes**:
  1. **Session Threshold Prioritization**:
     - Update `recordHeartbeat()` to use `session.attendanceThreshold ?? (await this.getDefaultAttendanceThreshold())` instead of always overriding with global system settings.
  2. **Dynamic Live Percentage Calculation**:
     - When a session is `LIVE`, compute active presence percentage against the **actual elapsed live duration** (`Math.max(activeSeconds, elapsedLiveSeconds)`), with a cap at the scheduled duration.
     - Prevent premature 40% lock when a student has participated for 100% of an ongoing session (e.g. 23 min into a live broadcast).
     - Automatically update `status` to `PRESENT` as soon as the session's active threshold (e.g. 60%) is reached.
  3. **Auto-Rescheduling Triggering**:
     - Ensure that when a session ends (`actualEndedAt` or status `COMPLETED`), all enrolled participants who remained `ABSENT` or `MISSED` trigger the auto-rescheduling service (`session-rescheduler.service.ts`) so a replacement round is generated and linked.

### 2. Strict Session Attendance Gating for Final Assessment & Certificates

- **Files**:
  - `backend/src/common/utils/session-attendance.util.ts`
  - `backend/src/modules/assessments/assessments.service.ts`
  - `backend/src/modules/progress/progress.service.ts`
- **Fixes**:
  1. **Strict Attended Status Check**:
     - Ensure `missingSessionAttendance()` verifies that the learner has an attendance record with status `PRESENT` or `LATE`.
     - Explicitly treat `MISSED` or `ABSENT` sessions as unfulfilled, regardless of whether the session lifecycle status is `COMPLETED`.
  2. **Prerequisite Gating Enforcement**:
     - `assertFinalEligible()` in `assessments.service.ts` must strictly throw `LIVE_SESSIONS_INCOMPLETE` if any required planned or scheduled session was missed and has not yet been attended in a rescheduled round.
  3. **Enriched Learner Session Payload**:
     - When a session is missed, ensure `progress.liveSessions` includes the missed round details AND the linked next rescheduled session (`rescheduledSessionId`, `nextSessionAt`, `rescheduledRound`).

### 3. Dynamic Quiz Points & Result Storage in Live Sessions

- **Files**:
  - `backend/src/modules/live-sessions/live-sessions.service.ts`
  - `backend/src/modules/live-sessions/dto/create-prepared-quiz.dto.ts`
- **Fixes**:
  - Allow custom points per question when storing or broadcasting session quizzes, rather than defaulting to 10 points.
  - Store and calculate `maxScore` and learner earned points based on these custom weights.

---

## Phase 2: Frontend & Mobile User Experience

### 1. Flexible Question Points in "Live Classroom Quiz & Polls" (Web & Mobile)

- **Files**:
  - Web: `frontend/src/components/features/sessions/virtual/interactive/LiveQuizTrainerControl.tsx`
  - Mobile / Shared: Quiz Results & Gradebook summaries
- **Fixes**:
  - In the **Question Bank** tab of `LiveQuizTrainerControl.tsx`:
    - Add a **"Total Points" input / Point Reallocator** (e.g. Total 100 pts divided evenly or custom per-question point input).
    - When selecting questions from the Question Bank into the broadcast queue, assign the customized points instead of hardcoding `points: 10`.
  - Update `SessionQuizResults` to display the actual configured points for each question and calculate percentage scores accurately.

### 2. Real-Time Poll / Quiz Vote Distribution Before Reveal (Screenshot Fix)

- **Files**:
  - `frontend/src/components/features/sessions/virtual/interactive/LiveQuizTrainerControl.tsx`
  - Web & Mobile LiveKit socket/data channel listeners
- **Fixes**:
  - **Option Matching Normalization**:
    - Update the live `distribution` computation to match votes by:
      1. `opt.id` (UUID or `opt-0`)
      2. Option index (`0`, `1`, `2`, `3`)
      3. Option text (`"True"`, `"False"`, etc.)
  - This ensures that as soon as learners submit their choices, the vote bars (e.g. `1 (100%)`) immediately reflect their votes in real time before the trainer clicks "Reveal".

### 3. Missed Session Strikethrough & Rescheduling UI (Web & Mobile)

- **Web Files**:
  - `frontend/src/components/features/classroom/hooks/useClassroomNavigation.ts`
  - `frontend/src/components/features/classroom/ClassroomSidebar.tsx`
  - `frontend/src/components/features/classroom/stage/LiveSessionsStage.tsx`
- **Mobile Files**:
  - `mobile/src/app/course/[courseId]/live-sessions.tsx`
  - `mobile/src/app/session/[sessionId]/index.tsx`
- **Fixes**:
  1. **Sidebar Completion Indicator**:
     - Change `completed: liveSessions.every((s) => s.status === 'COMPLETED')` in `useClassroomNavigation.ts` to:
       ```ts
       completed: liveSessions.length > 0 &&
         liveSessions.every((s) => s.attended === true);
       ```
     - A missed session will **never** grant a green checkmark to "Live Sessions".
  2. **Strikethrough on Missed Sessions**:
     - In both Web (`LiveSessionsStage.tsx`) and Mobile (`live-sessions.tsx`):
       - If a session is `MISSED` (`s.status === 'COMPLETED' && !s.attended`):
         - Apply `line-through text-muted-foreground decoration-danger/60` directly to the missed session title and date.
         - Display the **"Missed"** badge in danger/amber tone.
  3. **Rescheduled Makeup Session Callout**:
     - Immediately beneath the strikethrough card, render the **Rescheduled Makeup Session**:
       - Showing the new date, time, trainer, and link to attend.
       - If the rescheduler is calculating a date, display an informative banner:
         _"This session was missed. You must attend the upcoming rescheduled session to unlock the final assessment."_
  4. **Strict Final Assessment Lock**:
     - Ensure the Final Assessment in the sidebar and stage remains locked with the exact prerequisite message until the makeup session is attended.

---

## Verification & Testing Plan

1. **Live Heartbeat Test**:
   - Run a live session and simulate heartbeats for 23 minutes with a 60% threshold. Verify that the threshold honors session settings and transitions to `PRESENT`.
2. **Real-Time Distribution Test**:
   - Launch a True/False quiz question from the Question Bank in LiveKit.
   - Submit an answer from a learner account.
   - Verify that the Trainer's screen updates the vote bar to `1 (100%)` immediately before clicking reveal.
3. **Question Points Test**:
   - Configure a 3-question quiz with 25 pts, 25 pts, and 50 pts (total 100 pts).
   - Verify that results and learner badges reflect the custom points instead of 10 pts.
4. **Missed Session Strikethrough & Reschedule Test**:
   - Test with a learner who missed Session 1.
   - Verify that "Live Sessions" does not have a green checkmark in the sidebar.
   - Verify that Session 1 has a strikethrough, displays "Missed", and renders the rescheduled makeup session below it.
   - Verify that the Final Assessment remains locked.
5. **Mobile Verification**:
   - Run typecheck and verify that the mobile live sessions screen (`mobile/src/app/course/[courseId]/live-sessions.tsx`) renders the strikethrough and makeup round accurately.
