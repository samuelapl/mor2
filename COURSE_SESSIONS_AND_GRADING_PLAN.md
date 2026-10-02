# Assessment Pass Marks, Planned Online Sessions & Session Quizzes

This plan covers three features, built one after another:

| Phase | Feature | Ships independently? |
|---|---|---|
| **1** | Each assessment is graded by its own pass mark; the global policy pass mark gates the certificate | Yes |
| **2** | Course owners plan online sessions (with optional weighted quizzes) during course preparation | Yes (needs Phase 1) |
| **3** | Approved courses: schedule planned sessions, prepare their quizzes, grade them into the course result | Needs Phase 2 |

Each task has an ID (`P1.3`, `P2.4` and so on), names the files it touches, and lists what "done" means. Tasks inside a phase are ordered so that each one builds on the previous one.

---

## Scope: Online Self-Paced Only

All three phases target the **Online / Self-Paced** delivery mode (`ONLINE_ONLY`). **In-Person Classroom** (`IN_PERSON_ONLY`) and **Hybrid** (`BOTH`) are left as they are:

- Their code is not changed: venue allocation, in-person sessions and attendance.
- Courses that already use them keep working.
- New courses cannot choose them for now (task P1.0).

The planned online sessions in Phases 2–3 are virtual sessions held inside self-paced online courses. Re-enabling the other two modes later means undoing P1.0 and then deciding how sessions apply to those modes.

---

## Grading Model (the target for all three phases)

| Level | Set by | Decides |
|---|---|---|
| **Assessment pass mark** | Course owner, per assessment, in the Creator Studio | Whether one attempt at that assessment passes |
| **Global pass mark** | Admin, in Policy Settings (`CoursePolicySettings.passingScorePercent`) | (a) the default for new assessments, (b) whether the **weighted course grade** is high enough for a certificate |
| **Weights** | Course owner | How much each assessment contributes to the course grade. All weights together **must equal exactly 100%**. |

**Course grade** = Σ (best score on each assessment × its weight ÷ 100). An assessment that was never taken scores 0.

**Certificate** requires all of:
1. All lessons completed.
2. Every **lesson, module and final** assessment passed at its own pass mark.
3. Course grade ≥ global pass mark.

Session quizzes (Phases 2–3) count towards the **course grade only**. They are not individually required to pass. A missed session quiz scores 0, which lowers the grade, and the certificate is blocked only if the grade then falls below the global pass mark. This follows the rule "record a missed quiz as 0, and block the certificate only if the global pass mark is not met."

---

## Database Safety (applies to every migration in this plan)

- Generate each migration with `npx prisma migrate dev --create-only --name <name>`, read the SQL, then apply it with `npx prisma migrate dev`.
- **Never** pass the development `DATABASE_URL` as `--shadow-database-url`. Prisma resets the shadow database.
- Back up the database before applying a migration: `pg_dump "$DATABASE_URL" > backup-$(date +%F).sql`.

---

## Phase 1: Assessment-Level Pass Mark + Global Certificate Policy

**Goal:** new courses are online self-paced; an attempt is graded by the assessment's own pass mark; the global pass mark gates the certificate; weights always total 100%; and a learner who misses the certificate is told why.

### P1.0 Make Online Self-Paced the only option for new courses
* **`creator/modal/DeliveryFormatModal.tsx`:**
  * Move the **"Recommended"** badge from Hybrid (line 102) to **Online / Self-Paced**, and change `initialMode` (line 29) to `'ONLINE_ONLY'`.
  * Show **In-Person Classroom** and **Hybrid** as disabled cards: greyed out, not selectable, with a "Coming soon" badge and `aria-disabled`. Their descriptions stay, so users know these modes exist.
* **Default mode:** change `'BOTH'` to `'ONLINE_ONLY'` in `CourseCreationWizard.tsx` (line 19) and in the `initialDeliveryMode` default in `creator/CourseCreatorShell.tsx` (line 50).
* **`creator/stages/CourseDetailsStage.tsx`** (delivery buttons, lines 231–270): disable the `IN_PERSON_ONLY` and `BOTH` buttons and mark them "Coming soon".
  * **When editing an existing course** that already uses one of those modes, show its current mode as selected and locked, with the note "This delivery mode is no longer offered for new courses." The course is never silently switched to Online.
* **Backend guard:** `courses.service.ts` `create` rejects `deliveryMode` other than `ONLINE_ONLY` with a clear message. Updates to an existing course may keep its current mode but cannot switch to a disabled one.
  * Keep the list of allowed modes in one constant, `ENABLED_DELIVERY_MODES`, in `backend/src/modules/courses/` and in `frontend/src/constants/`, so re-enabling a mode is a one-line change on each side.
* **Not changed:** in-person and hybrid session screens, venue allocation and existing courses in those modes.
* **Done when:**
  * Creating a course offers only Online / Self-Paced, marked Recommended.
  * An existing Hybrid course opens in the studio still showing Hybrid.
  * An API request to create an `IN_PERSON_ONLY` course is refused.

### P1.1 Grade attempts with the assessment's own pass mark
* **File:** `backend/src/modules/assessments/assessments.service.ts` (`submit()`, around line 620)
* **Change:** `effectivePassMark = assessment.passingScore > 0 ? assessment.passingScore : globalPassMark`.
  * Today the global mark always wins, because `getPassingScorePercent()` never returns null. This is the same rule `progress.service.ts` already uses (lines 107 and 727), so attempt results and progress will agree.
* **Done when:** an assessment with a 70% pass mark, under a 50% global policy, marks a 60% attempt as **failed**.

### P1.2 Use the global policy as the default pass mark
* **Backend:** `assessments.service.ts` `dataFor()` (line 178). Replace `dto.passingScore ?? 50` with the policy value. `dataFor` becomes async, or the policy value is passed in by its callers.
* **Frontend:** the Creator Studio pre-fills new assessments from the policy instead of hard-coded `70`. Load it once in `CourseCreatorShell.tsx` from the existing policy API (`lib/api/policy.ts`), and use it in `handleAddModuleAssessment`, `handleAddLessonAssessment` and the final-assessment initial state.
* **Done when:** with a 60% policy, every new assessment starts at 60%, and an API call without `passingScore` stores 60.

### P1.3 Require weights to total exactly 100%
* **Frontend:**
  * `creator/stages/ReviewSubmitStage.tsx`: a weight total ≠ 100% becomes a **blocking** issue in the pre-flight list. Today it is only a warning.
  * `creator/stages/AssessmentEditorStage.tsx`: the weight input shows the remaining allowance and cannot be set above `100 − (all other weights)`.
* **Backend (submit guard):** `courses.service.ts` `submitForApproval` rejects a course whose assessment weights do not total 100%, with a clear message. This applies only when the course has at least one assessment.
* **Done when:** a course with weights 20 / 20 / 40 cannot be submitted, and the studio explains why.

### P1.4 Warn when an assessment pass mark is below the global mark
* **File:** `creator/stages/AssessmentEditorStage.tsx`
* Below the pass-mark field, show: "The course requires a 70% overall grade for the certificate. A pass mark below that lets learners pass every quiz and still miss the certificate."
  * This is a warning, not a block. Owners may set a lower per-quiz mark on purpose.
* **Done when:** the warning appears whenever pass mark < global mark.

### P1.5 Explain a missed certificate in the classroom
* **Files:** `frontend/src/components/features/classroom/stage/CertificateStage.tsx`, and the progress types in `lib/api/types.ts`
* Use the data that `courseCompletion` already returns (`totalCourseGrade`, `passingScorePercent`, `gradeSatisfied`, `allAssessmentsPassed` and `assessmentBreakdown`) to show:
  * the course grade compared with the required grade, as a progress bar;
  * a per-assessment table with best score, pass mark, weight and points earned;
  * when content is complete but the certificate is blocked: **"You did not reach the required course grade (62% of 70%). Retake an assessment to improve your score, or contact support."** If retakes are exhausted and no cooldown is set, show only "contact support".
* **Done when:** a learner who passed every quiz but has a 62% grade under a 70% policy sees this message instead of an empty certificate card.

### P1.6 Notify the learner once when the certificate is missed
* **Backend:**
  * `progress.service.ts`: where completion is evaluated (around line 736), detect this case: content complete, every required assessment passed or attempted, and the grade below the global mark. Send one notification.
  * Notification text: *"You missed the certificate for {course}: your course grade is {grade}%, {required}% is required. Improve your other assessments or contact support."*
* **Schema:** add `CERTIFICATE_GRADE_NOT_MET` to the `NotificationType` enum (migration `add_certificate_grade_not_met_notification`).
* **De-duplicate:** send it again only if the grade changes. Store the last notified grade in the notification `metadata` and compare against it.
* **Done when:** the learner gets exactly one notification per distinct shortfall, and it links to the course.

### P1.7 Show both pass marks on the review page
* **File:** `review/stages/AssessmentStage.tsx`
* Show "Pass mark: 70% (this assessment) · Course requires 60% overall (policy)".
* **Done when:** approvers see both rules side by side.

### P1.8 Phase 1 verification
* Backend unit tests:
  * `grading.util` pass/fail at the pass-mark boundary;
  * `progress.service` `gradeSatisfied` for weights 20/20/60 with best scores;
  * a missed assessment counts as 0.
* `npx tsc --noEmit` and `npm run build` pass in `frontend/` and `backend/`.
* Manual scenario: policy 70%, quiz pass marks 50%, scores 55/60/65 → every quiz is passed, the grade is 62%, there is no certificate, the learner sees the message and gets one notification. Retake the final at 90% → the grade becomes 77% and the certificate is issued.

---

## Phase 2: Planned Online Sessions in Course Preparation

**Goal:** while preparing a course, the owner can add placeholder online sessions. Each session can hold one or more weighted quizzes. Every weight in the course (lesson, module, final and session quizzes) totals 100%. Approvers review the session plan.

### Data model

```
Course 1─* CourseSessionPlan 1─* Assessment (type = SESSION_ASSESSMENT)
                         0..1
                           └── LiveSession (linked when scheduled in Phase 3)
```

* A **`CourseSessionPlan`** is a placeholder session. It holds no date, trainer or platform.
* Each **session quiz** is a normal `Assessment` row of the new type `SESSION_ASSESSMENT` with its own title, weight and pass mark. Its questions start empty and are prepared in Phase 3.
  * Because it is an `Assessment`, the existing course-grade calculation in `progress.service.ts` includes it with **no change**.

### P2.1 Schema and migration
* **File:** `backend/prisma/schema.prisma`. Migration name: `add_course_session_plans`.
* Add the model:
  ```prisma
  model CourseSessionPlan {
    id            String   @id @default(uuid())
    courseId      String   @map("course_id")
    order         Int
    titleEn       String   @map("title_en")
    descriptionEn String?  @map("description_en")   // description & objectives (rich text)
    objectivesEn  String?  @map("objectives_en")
    createdAt     DateTime @default(now()) @map("created_at")
    updatedAt     DateTime @updatedAt @map("updated_at")
    course        Course       @relation(fields: [courseId], references: [id], onDelete: Cascade)
    assessments   Assessment[]
    liveSession   LiveSession?
    @@index([courseId])
    @@map("course_session_plans")
  }
  ```
* Add `SESSION_ASSESSMENT` to the `AssessmentType` enum.
* `Assessment`: add `sessionPlanId String? @map("session_plan_id")`, with a relation that cascades on delete.
* `LiveSession`: add `sessionPlanId String? @unique @map("session_plan_id")`. Set the relation to `SetNull` on delete, so deleting a plan never deletes a held session.
* `Course`: add `hasOnlineSessions Boolean @default(false) @map("has_online_sessions")`.
* **Done when:** the migration applies cleanly to a copy of the database, and `prisma generate` and `tsc` pass.

### P2.2 Backend session-plan module
* **New module:** `backend/src/modules/session-plans/` with `session-plans.module.ts`, `session-plans.controller.ts`, `session-plans.service.ts` and `dto/`.
* **Endpoints:**
  * `GET /courses/:courseId/session-plans` returns the plans with their quizzes (questions included for staff).
  * `PUT /courses/:courseId/session-plans` replaces all plans and their quizzes in one transaction. The course must be `DRAFT` or `REJECTED`, mirroring `curriculum.replaceAll`. Permission: `course.manage_curriculum`.
* **DTO:** `{ plans: [{ titleEn, descriptionEn?, objectivesEn?, quizzes: [{ titleEn, weight, passingScore?, timeLimitMinutes? }] }] }`.
* **Weight rule:** shared helper `assertCourseWeightsTotal(tx, courseId)` in `backend/src/common/utils/weights.util.ts`. It sums every assessment weight (lesson, module, final and session) and allows a total of at most 100 while editing. Phase 1's submit guard (P1.3) uses the same helper to require exactly 100. P3.4 reuses it.
* **Done when:** a PUT with quizzes pushing the total above 100% returns 400 with the current total in the message.

### P2.3 Course DTO and detail include
* `courses` create/update DTOs gain `hasOnlineSessions?: boolean`.
* The `courses.service.ts` detail query includes `sessionPlans` (ordered) with their `SESSION_ASSESSMENT` assessments (id, title, weight, pass mark, question count).
* Frontend: `types/index.ts` gets `Course.hasOnlineSessions` and `Course.sessionPlans`, mapped in `lib/api/transform.ts`.

### P2.4 Store and API client
* `frontend/src/lib/api/session-plans.ts`: `fetchSessionPlans` and `replaceSessionPlans`.
* `lms-store.tsx`: `createCourse` and `updateCourseFull` accept `hasOnlineSessions` and `sessionPlans`. After `syncCurriculumAndAssessments`, call `replaceSessionPlans`. Report failures the same way as assessment failures (no silent `console.error`).

### P2.5 Creator Studio: sessions toggle and editor
* **Draft types:** `creator/types.ts` gets `SessionPlanDraft { id, titleEn, descriptionEn, objectivesEn, quizzes: SessionQuizDraft[] }` and `SessionQuizDraft { id, titleEn, weight, passingScore, timeLimitMinutes }`.
* **`stages/CourseDetailsStage.tsx`:** an **"Include online sessions"** toggle. It is shown only for **Online / Self-Paced** courses (the only mode enabled, see P1.0) and is off by default. Turning it off when plans exist asks for confirmation, because the plans and their quizzes will be removed. The backend `PUT /session-plans` (P2.2) likewise rejects plans for a course that is not `ONLINE_ONLY`.
* **New file `stages/SessionPlanEditorStage.tsx`:**
  * session title and description/objectives (`RichEditor`);
  * a **"This session has quizzes"** toggle;
  * a list of quizzes, each with title, weight, pass mark (pre-filled from the policy, P1.2) and time limit, plus "+ Add quiz";
  * a weight bar showing this session's share, the course total and what remains.
* **`CreatorSidebar.tsx`:** a **"Online Sessions"** group after the modules, with each planned session, its quiz count and weight badge, and **"+ Add session"**. It appears only when the toggle is on.
* **`types.ts` node types:** `SESSION_PLAN` with `sessionPlanId`.
* **`CourseCreatorShell.tsx`:**
  * state, add/remove handlers and `renderActiveStage` case for session plans;
  * session quiz weights included in `totalAllocatedWeight`;
  * session plans included in `draftSnapshot`, so autosave covers them;
  * plans loaded back when editing.
* **Done when:** an owner can add two sessions, give one of them two quizzes at 10% each, and see the course total update live.

### P2.6 Weight limit enforced in the frontend
* One shared function, `computeWeightTotal(modules, finalWeight, sessionPlans)` in `creator/weights.ts`, used by the shell, `AssessmentEditorStage`, `SessionPlanEditorStage` and `ReviewSubmitStage`. This replaces the three separate sums that exist today.
* Every weight input sets `max` to its remaining allowance, so the total can never be pushed above 100%.
* `ReviewSubmitStage` pre-flight adds these checks: a session without a title; a session with the quiz toggle on but no quizzes; a session quiz with weight 0; total ≠ 100% (blocking, P1.3).
* **Done when:** it is impossible to type a weight that makes the total exceed 100%.

### P2.7 Review page shows the session plan
* `review/nodes.ts` and `ReviewSidebar.tsx`: an "Online Sessions" group, with a node per plan.
* **New file `review/stages/SessionPlanStage.tsx`:** title, description/objectives, the quizzes with weight and pass mark, and the status "Not scheduled yet" (Phase 3 fills in the scheduled date and trainer).
* `OverviewStage`: the weight stat includes session quizzes.
* **Done when:** an approver sees every planned session and its quiz weights before approving.

### P2.8 Phase 2 verification
* Backend tests: the weight helper (≤ 100 while editing, = 100 on submit), plan replace, and cascade delete of quizzes with their plan.
* Builds pass.
* Manual run: create an **Online / Self-Paced** course with weights 20 / 20 / 40 plus 2 sessions with 10% + 10% quizzes (total 100%), autosave, reload, submit, and check the review page shows both sessions.
* Check that an existing Hybrid course shows no sessions toggle.

---

## Phase 3: Scheduling Planned Sessions, Preparing Their Quizzes & Grading

**Goal:** once a course is approved, a scheduler turns its placeholder sessions into real sessions using the existing session form. The trainer prepares each quiz from the question bank, using the existing prepared-quiz tools. Learner results feed the course grade.

### P3.1 Open the question bank and quiz preparation to approved courses
* **Backend:**
  * `prepared-quiz.service.ts` and the question-bank service must accept courses in `APPROVED` or `PUBLISHED` status. Audit them for status checks and add the rule where one is missing.
  * `courses.service.ts` list visibility (around lines 88–108): staff with `question_bank.manage` or `quiz.create` can see `APPROVED` courses they own or are assigned to.
* **Frontend:** `quiz/QuestionBankWorkspace.tsx` course lists (`myCourses` and the All filter) include approved courses, marked with an "Approved · not published" badge.
* **Done when:** a trainer assigned to an approved, unpublished course can add questions to its bank.

### P3.2 The session form offers the planned sessions
* **Reuse:** `sessions/shared/ScheduleSessionModal.tsx` together with the existing `POST /courses/:courseId/sessions`.
* After a course is chosen, load `GET /courses/:courseId/session-plans` and show a **"Planned sessions"** picker listing the unscheduled plans first, plus a "New unplanned session" option.
* Picking a plan pre-fills **title** and **description/objectives**, both still editable. The scheduler then sets **trainer**, **virtual classroom platform**, **date**, **time** and **duration** with the existing fields.
* `CreateSessionDto` gets optional `sessionPlanId`. `live-sessions.service.ts` `create()`:
  * checks that the plan belongs to the course and is not already scheduled (`@unique`);
  * links the session to the plan;
  * **adds the session trainer as a course trainer** if not already one, so the course appears in that trainer's question bank (P3.1).
* `EditSessionModal.tsx` shows which plan a session came from (read-only).
* **Done when:** scheduling from a plan creates a session that shows the plan's title, and the plan disappears from the "unscheduled" list.

### P3.3 Each prepared quiz is tied to a weighted quiz from the plan
* **Schema:** `SessionPreparedQuiz` gets `assessmentId String? @unique @map("assessment_id")`, linking it to its `SESSION_ASSESSMENT` (migration `link_prepared_quiz_to_assessment`).
* When a session is scheduled from a plan, `live-sessions.service.ts` creates one `SessionPreparedQuiz` per planned quiz, pre-linked and titled from the plan. The trainer then only adds questions.
* **Reuse:** `prepared-quiz/PreparedQuizManager.tsx` and `PreparedQuizPanel.tsx`:
  * a linked quiz shows its **weight and pass mark** as read-only badges ("Weighted quiz · 10% · pass 60%");
  * a linked quiz cannot be deleted, only an unlinked extra quiz can;
  * adding questions copies them into the linked `Assessment.questions` as well, so grading has the answer key.
* **Done when:** the trainer opens the session and finds the planned quizzes already present, each with its weight.

### P3.4 Schedulers may add or remove sessions, and weights stay valid
* **Add:**
  * "New unplanned session" creates a plain `LiveSession` with no quiz weight and no change to the total.
  * Adding a **weighted** quiz to an approved course goes through `POST /courses/:courseId/session-plans/:planId/quizzes`, which runs `assertCourseWeightsTotal` and requires the total to stay exactly 100%. The scheduler must take the weight from another session quiz in the same request (a rebalance dialog).
* **Remove:**
  * Deleting a session whose plan has weighted quizzes opens a **rebalance dialog**. The removed weight must be given to the remaining session quizzes before the delete is allowed, and the server checks the total is still 100%.
  * Sessions without quizzes delete freely.
* **Permission:** the existing session-management permissions (`live_session.manage_all` / `manage_own`).
* **Done when:** no sequence of add/remove actions can leave an approved course with weights ≠ 100%, and the server rejects any request that tries.

### P3.5 Grade session quizzes into the course result
* **Today:** live quiz answers are only logged per question as `attendanceLog` rows with `eventType: QUIZ_RESPONSE` (`live-sessions.service.ts`, around line 489).
* **Change:** include `quizId` in `SubmitLiveQuizDto` and in the log metadata.
* **New:** `SessionQuizGradingService` in `backend/src/modules/live-sessions/`. When a session ends (status → `COMPLETED`), or when the trainer closes a quiz, then for every enrolled learner and every linked quiz:
  * score = points earned ÷ total points × 100, computed from that learner's `QUIZ_RESPONSE` rows for the quiz;
  * upsert one `AssessmentAttempt` on the linked `Assessment` with `passed = score >= passingScore`;
  * a learner with no responses gets an attempt with **score 0**, so the miss is recorded.
* **Progress:** `progress.service.ts` already counts every assessment in the grade, so nothing changes there. One change: `allAssessmentsPassed` **skips `SESSION_ASSESSMENT`**, so a missed or failed session quiz lowers the grade but does not block on its own (see the grading model).
* After grading, re-run the certificate evaluation, which sends P1.6's notification if the grade falls short.
* **Done when:** a learner who misses a 10% session quiz gets a 0 attempt, their grade drops by up to 10 points, and the certificate is blocked only if the grade falls below the global mark.

### P3.6 Show session results to learners and staff
* **Classroom:** `CertificateStage` breakdown (P1.5) lists session quizzes, labelled "Missed" when the score is 0 with no responses.
* **Review page:** `SessionPlanStage` shows the linked live session (date, trainer, status) and, after completion, the class average per quiz.
* **Done when:** a learner can see why their grade dropped, for example "Session 2 quiz: Missed (0 of 10 points)".

### P3.7 Phase 3 verification
* Backend tests:
  * plan → session link (only one session per plan);
  * the weight guard on add/remove;
  * grading aggregation (full marks, partial, missed = 0);
  * `allAssessmentsPassed` ignores session quizzes.
* Builds pass.
* End-to-end run:
  1. Approve a course with 2 planned sessions (10% + 10%).
  2. Schedule both, then check the trainer is assigned and the course appears in their question bank.
  3. Prepare the quizzes and run session 1, with one learner absent.
  4. End the session and check the absent learner has a 0 attempt.
  5. Remove session 2 with a rebalance, then publish.
  6. As the learner, finish the course and check the grade and certificate outcome against the policy.

---

## Recorded Decisions & Assumptions

1. **Missed session quiz = 0.** It counts towards the grade only. The certificate is blocked only if the grade is below the global pass mark, and the learner is notified (P1.6).
2. **Several quizzes per session** are allowed. Each is a separate weighted `SESSION_ASSESSMENT`.
3. **Schedulers can add or remove sessions** after approval. Any change that touches weighted quizzes must keep the total at exactly 100% (P3.4).
4. **Online self-paced only.** New courses can only be `ONLINE_ONLY`, marked Recommended. In-Person Classroom and Hybrid are shown as disabled ("Coming soon"), and their code is not changed (P1.0). The online sessions toggle appears only for `ONLINE_ONLY` courses, and planned sessions are virtual sessions.
5. **Assumption to confirm:** a course's assessment weights (lesson, module, final, session) must total exactly 100% at submission; while editing, the total may be anywhere up to 100%.
