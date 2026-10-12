# Formative Session Quizzes: Implementation Plan

## Goal

Live-session quizzes (`SESSION_ASSESSMENT`) become **formative**. They have no pass mark and no weight, and their score is shown to the learner and trainer as feedback only. For live sessions, the certificate depends only on **attendance**.

## Rules after this change

| Topic | Rule |
|---|---|
| Course weights | Lesson, module and final assessments must total **exactly 100%**. Session quizzes are not part of the total. |
| Session quiz | Optional per session. No pass mark, no weight, no pass/fail. Shows the score only, e.g. "7/10 (70%)". |
| Course grade | Weighted from the regular assessments only. Session quiz scores are never included. |
| Certificate | All lessons completed, all regular assessments passed, the course grade reaches the global pass mark, and **every planned session attended** (in any round). The session quiz result is irrelevant. |
| Missed session | The final assessment and the certificate stay blocked until the learner attends a rescheduled round. The block message names the session and the next scheduled date. |

| Learner case | Certificate effect |
|---|---|
| Attended and failed the quiz | None. The score is shown as feedback. |
| Attended and didn't answer | None. Shown as "Not answered". |
| Didn't attend | Blocked until they attend the next round of that session. |

## Current behaviour (to change)

- Session quizzes carry a `weight` that counts toward the 100% (`courseWeightTotal` in `backend/src/common/utils/weights.util.ts`) and a `passingScore` that defaults to the policy mark (`session-plans.service.ts`).
- `computeCourseGrade` (`backend/src/common/utils/course-grade.util.ts`) adds session quiz scores to the grade, and a missed quiz scores 0. `sessionsPending` holds the certificate back until every session quiz has a result.
- Grading (`session-quiz-grading.service.ts`) stores `passed = score >= passingScore`.
- The UI shows "pass X%" labels and pass/fail badges, and `LiveQuizTrainerControl.tsx` has a hardcoded 60% "Passed / Needs review" split.

**Already correct, keep as is:** the attendance gate (`backend/src/common/utils/session-attendance.util.ts`), which the final assessment and the certificate share, and the session rescheduler (`backend/src/modules/session-rescheduler`).

**Design choice:** keep the `SESSION_ASSESSMENT` `Assessment` rows. They still hold the answer key and the per-learner results (`AssessmentAttempt`). Session quizzes are given `weight = 0` and `passingScore = 0` (the `weight` column is non-null), and every grading and certificate path ignores them. No schema change is needed.

---

## Phase 1: Backend rules and data migration ✅ implemented

> **What was built (differences from the plan below):**
> - Session quizzes are created with `weight: 0` and `passingScore: 0`, not `null`.
> - The DTOs keep `weight`, `passingScore` and `rebalance` as **optional, deprecated and ignored**, because the API rejects unknown fields and the current web app still sends them. Remove them after Phase 2 ships.
> - `computeCourseGrade` still returns an entry for each session quiz, so `assessmentBreakdown` lines up. Each entry has `weight: 0`, `passingScore: 0`, `earnedPoints: 0` and `passed = attempted` ("taken"), plus `bestScore` as feedback.
> - The course progress response now includes `courseCompletion.missingSessions` (`{ id, title, nextSessionAt }`). `allLiveSessionsAttended` now uses the same attendance rule as the certificate, and `sessionsPending` was removed.
> - Grading now runs the completion check after **every** completed session, including sessions with no quiz, so attending can be the last thing that completes a course.
> - Session-quiz results return `recorded: { score, missed }`, without `weight` or `passingScore`.
> - The data migration is `backend/prisma/formative-session-quizzes.ts`. Run it with `npm run session-quizzes:formative` (add `-- --dry-run` to only report).
> - The backend helper `prepared-quiz/quiz-points.ts` (even split of a weight) was deleted.


### 1.1 Grading and certificate rules
- **`common/utils/course-grade.util.ts`**
  - Leave `SESSION_ASSESSMENT` out of `computeCourseGrade` before weighting. This also removes it from the even-split fallback for legacy courses.
  - Remove `sessionsPending` and the `closed` handling from `certificateReady`.
  - Delete `isSessionQuizClosed` and the `closed` field.
  - Rewrite the header comment to describe the new rules.
- **`modules/progress/progress.service.ts`** (around lines 176 and 896) and **`modules/certificates/certificates.service.ts`** (`maybeIssueForCompletion`, around line 623):
  - Drop the `closed` mapping and the "sessions pending" early return.
  - Keep the `findMissingSessionAttendance` check.
  - Filter the assessment queries with `type: { not: SESSION_ASSESSMENT }`.
- **`common/utils/course-progress.util.ts`:** check that its `SESSION_ASSESSMENT` exclusion is still consistent.

### 1.2 Weights
- **`common/utils/weights.util.ts`:** in `courseWeightTotal`, stop counting session quizzes. Lesson, module and final assessments must now total 100% on their own, so the "atMost" and "exact" checks need no other change.
- **`modules/session-plans`:**
  - Remove `weight` and `passingScore` from `replace-session-plans.dto.ts`, along with `WeightRebalanceDto` and both `rebalance` fields.
  - In `session-plans.service.ts`, create session quizzes with `weight: null` and `passingScore: 0`.
  - Delete `giveWeightToDefault` and the rebalance and auto-move logic for quizzes added or removed after approval.
  - Remove the session-plan `assertCourseWeightsTotal` calls that only existed because of quiz weight.
- **`modules/courses/courses.service.ts`** (lines 366 and 834): drop session quiz weight from any course totals or summaries.

### 1.3 Session quiz grading and results
- **`modules/live-sessions/session-quiz-grading.service.ts`:**
  - Keep writing one `AssessmentAttempt` per attending learner, so results stay visible.
  - Always store `passed: false`; it is no longer meaningful for session quizzes.
  - Keep `missed` in `answers`.
  - Keep the `maybeCompleteCourse` call: it is harmless, and attendance may be what completes the course.
- **Question points (`modules/prepared-quiz/prepared-quiz.service.ts`):**
  - Points no longer need to total the quiz's weight. Remove `applyEvenSplit` against the weight; default to 1 point per question, which the trainer can change.
  - Score % = earned ÷ total points, as today.
- **`modules/live-sessions/session-quiz-results.service.ts`:** stop returning `weight`, `passingScore` and pass/fail. Return `earnedPoints`, `totalPoints`, `scorePercent`, `answered` and `missed`.
- **`modules/live-sessions/live-sessions.service.ts`** (line 632) and **`modules/session-rescheduler/session-rescheduler.service.ts`** (line 86): no logic change is expected. Check that they no longer read `weight` or `passingScore`.

### 1.4 Attendance block message with the next session date
- **`common/utils/session-attendance.util.ts`:** extend `MissingSession` with `nextSessionAt: Date | null`. That is the earliest `SCHEDULED` or `LIVE` live session whose `sessionPlanId` or `originalPlanId` matches the plan, or `null` when none is scheduled yet.
- **`modules/assessments/assessments.service.ts`** (`LIVE_SESSIONS_INCOMPLETE`) and the progress/completion response: include `nextSessionAt` for each missing session.
- **Wording:** "You missed *{title}*. Attend the next session on {date} to unlock the final assessment and certificate." When no date is set: "…the trainer will schedule a new session."

### 1.5 Data migration (existing courses)
One-off script: `backend/prisma/formative-session-quizzes.ts`. It is safe to run more than once.
1. For each course with session quizzes, add up the freed weight Σ `weight`.
2. Set every `SESSION_ASSESSMENT` to `weight = 0` and `passingScore = 0`, and set its existing attempts to `passed = false`.
3. Give the freed weight to the course's **final assessment**, or to its heaviest regular assessment if it has no final one. Scale that assessment's question points by the same ratio, so the "points = weight" rule (`assertAssessmentPointsMatchWeights`) still holds; put any rounding difference on the last question.
4. Check that each course now totals exactly 100%. Log any course that doesn't, for manual fixing.
5. For every ACTIVE enrollment in an affected course, re-run `progressService.maybeCompleteCourse(userId, courseId)`. Learners who were held back only by a session quiz will now complete and get their certificate.
6. Leave already-issued certificates unchanged.

### 1.6 Tests
- Update `course-grade.util.spec.ts`, `weights.util.spec.ts`, `session-plans.service.spec.ts`, `session-quiz-grading.service.spec.ts`, `session-quiz-results.service.spec.ts`, `assessment-weighting.spec.ts`, `assessments-gating.spec.ts` and `backend/test/wave2.e2e-spec.ts`.
- Add cases:
  - A session quiz score of 0 doesn't change the grade or the certificate.
  - A course is certificate-ready with no session quiz result as long as attendance is met.
  - An absent learner is blocked, and `nextSessionAt` is returned.
  - The migration moves the freed weight and rescales points.
- Update `prisma/seed.ts` and `seed-courses.ts` so session quizzes have no weight or pass mark.

**Done when:** backend tests pass, and on a seeded course a learner gets the certificate after attending every session while failing or skipping every session quiz.

---

## Phase 2: Web frontend ✅ implemented

> **What was built (differences from the plan below):**
> - Final-assessment and certificate checks in the classroom now use the server's `courseCompletion.missingSessions`, via `src/lib/live-attendance.ts`. The sidebar, the navigation hook and the certificate page used their own "every listed session completed and attended" rule before.
> - The locked final-assessment toast names the missed session and its next date. The certificate page lists each missed session with its next date, or says it's not scheduled yet.
> - `quiz-points.ts` keeps `splitEvenly`, because the regular assessment editor uses it; the weight-matching rules are gone.
> - Unused translation keys were removed. New Amharic strings need a review by a native speaker.
> - The frontend has no ESLint config or test runner, so `tsc` was the only automated check.
> - Still to do after Phase 3: remove the deprecated `weight` / `passingScore` / `rebalance` fields from the backend DTOs.


### 2.1 Course creator and review
- **`creator/stages/SessionPlanEditorStage.tsx`:**
  - Remove the pass-mark and weight inputs, and the "below policy pass mark" warning.
  - Each session gets a "Has quiz" toggle (optional), plus a short note: "Formative: score shown to learners, not counted in the grade."
- **`creator/weights.ts`, `creator/types.ts` and `CourseCreatorShell.tsx`** (around lines 94 and 846):
  - Drop session-quiz `weight` and `passingScore` from the state and the payload.
  - The 100% total counts lesson, module and final assessments only.
- **`creator/stages/ReviewSubmitStage.tsx`** (line 357), **`review/stages/SessionPlanStage.tsx`** (around lines 414–419) and **`review/hooks/useCourseReview.ts`:**
  - Show "Formative quiz" instead of "{weight}% · pass {mark}%".
  - Remove session quizzes from the reviewer's weight checks.
- **`courses/CatalogCourseModal.tsx`:** stop counting session quizzes in any weight or grade summary.

### 2.2 Trainer quiz tools
- **`prepared-quiz/manager/QuizGroupSettings.tsx`** (line 117):
  - Remove "Graded course quiz · X% · pass mark Y%" and replace it with "Formative session quiz".
  - Also update `QuizGroupBar.tsx`, `AddQuestionsConfirm.tsx`, `PreparedQuizPanel.tsx` and `useQuizReadinessGate.tsx`: points no longer have to total a weight, and the readiness gate shouldn't block on a points total.
- **`prepared-quiz/quiz-points.ts`:** drop the weight-based even split, so each question defaults to 1 point.
- **`sessions/virtual/interactive/LiveQuizTrainerControl.tsx`** (around lines 1139, 1247 and 3533): remove the hardcoded 60% `PASSED`/`NEEDS_REVIEW` status. Show the score only.

### 2.3 Results and learner views
- **`sessions/shared/quiz-results/SessionQuizResultsTab.tsx`** (line 203) and **`QuizAnswerList.tsx`** (around lines 79–88):
  - Remove the "Graded · X% · pass Y%" labels and the pass/fail badges.
  - Show "Score 7/10 (70%)", or "Not answered".
- **`sessions/virtual/interactive/LiveQuizLearnerOverlay.tsx`:** the end-of-quiz summary shows the score only, with no pass/fail wording.
- **`classroom/stage/CourseGradeSummary.tsx`:** list only regular assessments in the grade breakdown. Optionally add a separate "Session quizzes (not graded)" list of scores.
- **`classroom/stage/CertificateStage.tsx`:**
  - Remove "sessions pending" quiz wording.
  - When attendance is missing, show each missed session with its `nextSessionAt` date, or "awaiting reschedule".
- **Final assessment gate** (`courses/learn/FinalAssessmentCard.tsx` and its caller): show the same missed-session list and date when the API returns `LIVE_SESSIONS_INCOMPLETE`.
- **`frontend/src/lib/api/types.ts`, `transform.ts`, `prepared-quiz.ts`, `quiz.ts`, `monitoring.ts`:** remove `sessionsPending` and the session-quiz `weight` and `passingScore` fields, and add `nextSessionAt`.
- **i18n:** add the new en and am strings and remove the unused pass/fail ones.

**Done when:** `tsc` and `eslint` are clean. In the browser:
- A trainer can create a course whose session plans have optional quizzes with no weight or pass mark, and it submits at 100% from regular assessments.
- Learners see scores only.
- An absent learner sees the missed session and its next date.

---

## Phase 3: Mobile and end-to-end checks — 3.1 ✅ implemented, 3.2 not run yet

> **What was built (differences from the plan below):**
> - `CourseGradeSummary` was exported but never rendered anywhere in the app. It now appears on the course screen below the main action while the learner is enrolled and not yet certificate-eligible. It shows the missed sessions with their next date, the grade from regular assessments, and the session quiz scores as feedback.
> - Offline downloads only include course, module and lesson assessments, never session quizzes, so `offline-db.ts` and `download-manager.ts` are unchanged.
> - When the final assessment is blocked, the quiz screen shows the server's `LIVE_SESSIONS_INCOMPLETE` message, which now includes the next session date.
> - The quiz screens (`app/quiz/[assessmentId]/*`) never open session quizzes, so they keep their pass marks.
> - `livekit-room-html.ts` has no weight or pass wording, so it is unchanged.
> - New Amharic strings need a review by a native speaker.
> - **3.2 (end-to-end checks on web and mobile) has not been run.** It needs a running backend with seeded sessions and a device or emulator.


### 3.1 Mobile app
- **`features/live-sessions/components/SessionQuizResults.tsx`** (around lines 78 and 104): remove the pass mark and pass/fail, and show the score only.
- **`features/live-sessions/types/live-session.types.ts`** (line 115): drop `passingScore` and `weight` from session quiz types.
- **`features/live-sessions/utils/livekit-room-html.ts`:** remove any weight or pass wording from the in-room quiz UI.
- **`features/progress/components/CourseGradeSummary.tsx`** and **`progress.types.ts`:**
  - Show only regular assessments in the grade.
  - Remove `sessionsPending`.
  - Show missed sessions with `nextSessionAt`.
- **`app/course/[courseId]/overview.tsx`**, **`features/courses/components/CourseSyllabus.tsx`** and **`features/courses/types/course.types.ts`:** no session quiz weight or pass mark.
- **`app/quiz/[assessmentId]/index.tsx`** and **`result.tsx`:** make sure a `SESSION_ASSESSMENT` is never shown with a pass mark.
- **Offline (`features/offline/offline-db.ts`, `download-manager.ts`):** stop storing session-quiz `passingScore` and `weight`. Bump the offline schema version if needed.
- **i18n** (`core/i18n/locales/en.json`, `am.json`): add the missed-session and next-date strings, and remove the session-quiz pass/fail strings.

### 3.2 End-to-end verification (web and mobile)
On a course with two planned sessions, each with a quiz, plus a final assessment:
1. **Attended and failed both quizzes:** passing the final gives the certificate, and the quiz scores show as feedback.
2. **Attended and didn't answer:** "Not answered" is shown, and the certificate is still issued after the final.
3. **Missed session 2:**
   - The final assessment and the certificate are blocked, with the message and next date.
   - Once they attend the rescheduled round, both unlock.
4. **Course with sessions but no quizzes:** the same rules apply.
5. **Migrated legacy course:** it totals 100%, its final question points are rescaled, and learners who now qualify get their certificate.
6. **Trainer:** results show scores only, with no 60% "Passed" split.

**Done when:** all six scenarios pass on web and mobile and the data migration has run on staging.

---

## Rollout order
1. Merge and deploy Phase 1, then run the data migration on staging and then on production.
2. Deploy Phase 2 (web) right after Phase 1. Old web builds still show the pass mark until they are updated.
3. Release Phase 3 (mobile). Older app versions keep showing a pass mark; the API no longer sends the field, so they must handle it being missing.
