# Implementation Plan — Time-Gated Progression, Assessment Gating & Certificate Rules

> Handoff document. Target: **NestJS + Prisma** backend (`/backend`) and **Next.js (App Router)** frontend (`/frontend`).
> Read this fully before coding. Follow existing patterns (services throw `ForbiddenException`/`NotFoundException`, i18n via `translate`, API wrapper in `frontend/src/lib/api/client.ts`).

---

## 1. Context — how it works today

### 1.1 Sequential unlock (backend)
- `backend/src/common/utils/unlock.util.ts:31` `computeSequentialUnlocks()` decides what is unlocked:
  - Module N is unlocked when **every previous module is completed**.
  - Lesson N is unlocked when **every previous lesson in the module is completed**.
  - Sub-lesson N is unlocked when previous sub-lessons are completed.
- "Completed" comes from DB rows: `LessonCompletion.completed` (`schema.prisma:392`) and `ModuleCompletion.completed` (`schema.prisma:378`).
- `isModuleDone()` has a fallback: even if `ModuleCompletion` is missing, the module counts as done when all its lessons are complete (`unlock.util.ts:50-54`). This fallback **must not** accidentally bypass a module assessment — see §5.4.

### 1.2 Completion today (backend)
- `backend/src/modules/progress/progress.service.ts:135` `markLessonComplete()`:
  - Enforces sequential unlock only, then upserts `completed = dto.completed`.
  - Cascades to sub-lessons and auto-completes the parent lesson.
  - `progress.service.ts:266` `maybeCompleteModule()` sets `ModuleCompletion` when all lessons are done.
  - `progress.service.ts:330` `maybeCompleteCourse()` marks the enrollment `COMPLETED` and calls `certificatesService.maybeIssueForCompletion()` when all lessons are done. **No time check anywhere.**
- **There is no time-spent tracking.** `LessonCompletion` only has `lastPosition` (video seconds) and `lastAccessed` (`schema.prisma:398-399`). `durationMinutes` already exists on `Lesson` (`schema.prisma:319`) and `CurriculumModule` (`schema.prisma:291`).

### 1.3 Assessments today (backend)
- Types: `FINAL_ASSESSMENT`, `MODULE_ASSESSMENT`, `LESSON_ASSESSMENT`, `SUB_LESSON_ASSESSMENT` (`schema.prisma:444`).
- `backend/src/modules/assessments/assessments.service.ts:482` `submit()`:
  - Grades via `grading.util.ts` (`gradeAnswers`, `computeResult`).
  - **Non-final assessments: submitting completes the lesson/module regardless of score** (`assessments.service.ts:571-587`, calls `completeModuleOnSubmission` / `completeLessonOnSubmission`).
  - Final assessment: on pass marks enrollment complete and issues certificate (`assessments.service.ts:590-616`).
- Learner result response only returns `score`, `passed`, `correctCount`, `totalQuestions` (`assessments.service.ts:618-625`). **Correct answers are never returned to the learner.**
- `stripAnswers()` (`assessments.service.ts:41`) removes `correctAnswer` from question listings for learners.

### 1.4 Certificate today
- `backend/src/modules/certificates/certificates.service.ts:195` `maybeIssueForCompletion()` already requires **all lessons complete AND a passed final assessment**.
- Gap is the **UI**: `LearnCourseModal.tsx:255-258` computes `isCourseComplete` from `overallPercent >= 100` and shows “Your official certificate is ready” (`LearnCourseModal.tsx:675-695`) even before the final exam is passed.

### 1.5 Frontend learning UI today
- `frontend/src/components/features/courses/LearnCourseModal.tsx` is the learner player.
  - “Mark Complete” buttons at lines **888-897**, **1053-1062**, **1157-1167**; “Complete & Next Activity” at **1172-1181**.
  - Calls `markLessonComplete()` (`frontend/src/lib/api/progress.ts:20`).
  - Local optimistic unlock logic at lines **180-258** (mirrors the backend).
  - Only the **final** assessment is surfaced (`LearnCourseModal.tsx:1252-1290`), opened through `QuizTakerModal`.
- `frontend/src/components/features/quiz/QuizTakerModal.tsx`:
  - Always loads the **first course assessment** via `fetchCourseAssessments(courseId)` (`QuizTakerModal.tsx:53-60`); cannot take a module/lesson assessment.
  - Result screen (`QuizTakerModal.tsx:210-245`) shows score only — no per-question review.

---

## 2. Target behavior (confirmed decisions)

1. **Time policy:** a lesson/module can only be completed after the learner has spent **≥ 50% of its `durationMinutes`** actively working on it. If not enough time has elapsed, the learner **must wait** — the next content stays locked.
2. **Lesson/module assessment gate:** if a lesson/module has an assessment, the learner must **pass it** (`score ≥ passingScore`) to unlock the next lesson/module. **Failing → show the review and prompt to retry.** Submitting alone no longer unlocks.
3. **Assessment review:** after any lesson/module/final assessment, show the result **plus the correct answer for every question** (and whether the learner was right/wrong).
4. **Certificate:** only when **all lessons are completed AND the final course assessment is passed**. Lesson/module assessments never issue a certificate.
5. **"Mark as completed" button → "Next" button:** clicking Next validates the policy (time + assessment), completes the item, and unlocks/opens the next item.

---

## 3. Data model changes (Prisma)

File: `backend/prisma/schema.prisma`

### 3.1 Add accumulated time to lesson completions
```prisma
model LessonCompletion {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  lessonId        String   @map("lesson_id")
  completed       Boolean  @default(false)
  completedAt     DateTime? @map("completed_at")
  lastPosition    Int?     @map("last_position")
  lastAccessed    DateTime? @map("last_accessed")
  timeSpentSeconds Int     @default(0) @map("time_spent_seconds")   // NEW
  ...
}
```

- Module time is **derived** (sum of its lessons/sub-lessons' `timeSpentSeconds`), so **no new column on `ModuleCompletion`** is required. Keep it simple.
- Migration: `cd backend && npx prisma migrate dev --name add_lesson_time_spent`.

### 3.2 (Optional) backfill
Existing completed rows keep `timeSpentSeconds = 0`; they stay completed because completion is persisted. Only *new* completions are subject to the policy. No backfill needed.

---

## 4. Backend — shared policy utility

### 4.1 New file `backend/src/common/utils/completion-policy.util.ts`
Export from `backend/src/common/utils/index.ts`.

```ts
export const TIME_POLICY_RATIO = 0.5; // spend at least half the configured time

export function requiredSeconds(durationMinutes?: number | null): number {
  if (!durationMinutes || durationMinutes <= 0) return 0; // no requirement configured
  return Math.ceil(durationMinutes * 60 * TIME_POLICY_RATIO);
}

export function isTimeSatisfied(
  timeSpentSeconds: number,
  durationMinutes?: number | null,
): boolean {
  return timeSpentSeconds >= requiredSeconds(durationMinutes);
}

export interface PolicyFailure {
  reason: 'TIME_NOT_MET' | 'ASSESSMENT_REQUIRED' | 'ASSESSMENT_NOT_PASSED' | 'LOCKED';
  message: string;
  remainingSeconds?: number;
}

/** Sum of lesson + sub-lesson time for a module. */
export function sumLessonTime(
  rows: Array<{ timeSpentSeconds: number }>,
): number {
  return rows.reduce((sum, r) => sum + (r.timeSpentSeconds ?? 0), 0);
}
```

### 4.2 Reason codes on `ForbiddenException`
Throw `new ForbiddenException({ reason, message, remainingSeconds })` so the frontend can branch. Keep messages i18n-friendly (use `translate` if the codebase pattern requires).

---

## 5. Backend — Progress module

File: `backend/src/modules/progress/progress.service.ts`, `progress.controller.ts`, `dto/`.

### 5.1 New endpoint: accumulate lesson time (heartbeat)
- **Route:** `PATCH /progress/lessons/:lessonId/time`
- **Permission:** `progress.mark_own`
- **DTO** `backend/src/modules/progress/dto/add-lesson-time.dto.ts`:
  ```ts
  export class AddLessonTimeDto {
    @IsInt() @Min(1) @Max(300) secondsDelta: number; // server caps to 300
  }
  ```
- **Service** `addLessonTime(userId, lessonId, secondsDelta)`:
  1. Load lesson + module; 404 if missing.
  2. Verify the lesson is unlocked (reuse the `computeSequentialUnlocks` block currently in `markLessonComplete`, lines 147-184). Throw `LOCKED` if not.
  3. Cap `secondsDelta = Math.min(secondsDelta, 300)`.
  4. `upsert` `LessonCompletion`, `timeSpentSeconds: { increment: secondsDelta }`, `lastAccessed: new Date()`.
  5. Return `{ lessonId, timeSpentSeconds, requiredSeconds, satisfied }`.

### 5.2 Rework `markLessonComplete()` (the "Next" action)
Rename internally to `completeLessonForNext` semantics but keep the route for compatibility if desired. Add policy enforcement when `dto.completed === true`:

1. Existing sequential-unlock check (keep lines 147-184).
2. **Time policy** on the target lesson:
   - `spent = completion.timeSpentSeconds` (for a parent lesson with sub-lessons, use the **sum of the parent + sub-lessons**; see §9.1).
   - if `!isTimeSatisfied(spent, lesson.durationMinutes)` → throw `TIME_NOT_MET` with `remainingSeconds = required - spent`.
3. **Assessment gate**: if this lesson (or any of its sub-lessons, for a parent) has a `LESSON_ASSESSMENT` / `SUB_LESSON_ASSESSMENT`, require a passed attempt by the user:
   ```ts
   const assessment = await this.prisma.assessment.findFirst({
     where: { lessonId: lesson.id, type: { in: [LESSON_ASSESSMENT, SUB_LESSON_ASSESSMENT] } },
   });
   if (assessment) {
     const passed = await this.prisma.assessmentAttempt.findFirst({
       where: { assessmentId: assessment.id, userId, passed: true },
     });
     if (!passed) throw new ForbiddenException({ reason: 'ASSESSMENT_NOT_PASSED', ... });
   }
   ```
4. Proceed with the existing upsert + sub-lesson cascade + `maybeCompleteModule`.

> Keep `completed: false` (reset) for now, but note it can bypass the policy; consider restricting it to staff in a follow-up.

### 5.3 `maybeCompleteModule()` — add module-level policy + module assessment
Current code: `progress.service.ts:266-328`. Change `allDone` to additionally require:
```ts
// module time policy
const lessonRows = await this.prisma.lessonCompletion.findMany({
  where: { userId, lessonId: { in: activeLessons.map(l => l.id) } },
  select: { timeSpentSeconds: true },
});
const moduleTimeOk = isTimeSatisfied(sumLessonTime(lessonRows), module.durationMinutes);

// module assessment gate
const moduleAssessment = await this.prisma.assessment.findFirst({
  where: { moduleId, type: AssessmentType.MODULE_ASSESSMENT },
});
const assessmentOk = moduleAssessment
  ? !!(await this.prisma.assessmentAttempt.findFirst({
      where: { assessmentId: moduleAssessment.id, userId, passed: true },
    }))
  : true;

const allDone = lessonsAllDone && moduleTimeOk && assessmentOk;
```
`maybeCompleteModule` needs the module's `durationMinutes`, so load it (currently only selects `courseId`).

### 5.4 `computeSequentialUnlocks()` — do not bypass module assessment
File: `backend/src/common/utils/unlock.util.ts:50-54`.

Problem: `isModuleDone()` returns `true` when all lessons are complete even if `ModuleCompletion` is false — this would unlock the next module without the module assessment.

**Recommended fix:** make `ModuleCompletion` authoritative for modules that have an assessment, or pass assessment state in:
- Extend `computeSequentialUnlocks` params with `moduleAssessmentPassed: Map<string, boolean>` (and `hasModuleAssessment: Set<string>`), or
- Simpler: **remove the lesson-derived fallback** and rely on `ModuleCompletion.completed`, then reconcile missing rows before computation.

Chosen approach (implement this):
- In `getCourseProgress()` (and every caller) call a new `reconcileModuleCompletions(userId, modules)` that runs `maybeCompleteModule` for each module before computing unlocks. This guarantees `ModuleCompletion` rows are up to date, then `isModuleDone` can safely be:
  ```ts
  const isModuleDone = (m) => moduleCompletions.get(m.id) === true;
  ```
- Keep `isLessonComplete` as-is (parent completed OR all sub-lessons completed).

### 5.5 `maybeCompleteCourse()` — certificate only on passed final assessment
Current code: `progress.service.ts:330-358`. Change so the enrollment is marked `COMPLETED` only when:
- all lessons completed, **AND**
- if the course has a `FINAL_ASSESSMENT`, the learner has a passed attempt.

Then call `certificatesService.maybeIssueForCompletion()` (which re-checks the same conditions). Do **not** issue/complete on lesson completion alone.

### 5.6 `getCourseProgress()` — enrich response for the UI
File: `progress.service.ts:17-133`. Add:

- Per lesson/sub-lesson: `timeSpentSeconds`, `requiredSeconds`, `timeSatisfied`, and `assessment: { id, titleEn, titleAm, passingScore, passed } | null`.
- Per module: `durationMinutes`, `timeSpentSeconds` (sum), `requiredSeconds`, `timeSatisfied`, `assessment: {...} | null`.
- Top-level `courseCompletion`:
  ```ts
  courseCompletion: {
    contentCompleted: boolean,        // all lessons done
    finalAssessmentRequired: boolean, // course has a FINAL_ASSESSMENT
    finalAssessmentPassed: boolean,
    certificateEligible: boolean,     // contentCompleted && (!required || passed)
  }
  ```
Implement by fetching the course's assessments once (with attempts for this user) and building `Map<moduleId|lessonId, assessmentInfo>`.
Update `frontend/src/lib/api/types.ts` accordingly (see §7.2).

### 5.7 `assertFinalEligible()` (assessments service)
`assessments.service.ts:257-273` already requires all lessons complete before the final assessment. Keep. Optionally also require passed lesson/module assessments — but since those gate content completion via §5.3, this is already implied. Do **not** add time checks here in v1.

---

## 6. Backend — Assessments module

File: `backend/src/modules/assessments/assessments.service.ts`, `grading.util.ts`.

### 6.1 Non-final assessments: complete only on PASS
Replace the block at `assessments.service.ts:571-587`:
```ts
if (!isFinal) {
  try {
    if (passed) {                       // <-- only on pass now
      if (assessment.type === MODULE_ASSESSMENT && assessment.moduleId) {
        await this.completeModuleOnSubmission(userId, assessment.moduleId);
      }
      if ((assessment.type === LESSON_ASSESSMENT || assessment.type === SUB_LESSON_ASSESSMENT)
          && assessment.lessonId && assessment.moduleId) {
        await this.completeLessonOnSubmission(userId, assessment.lessonId, assessment.moduleId);
      }
    }
  } catch { /* non-fatal */ }
}
```
> The time policy is enforced at content-completion time (§5.2/§5.3). Passing the assessment does complete the item, so the learner does not need to click Next again. If product wants the time check to also apply here, call the shared policy check before `completeLessonOnSubmission`.

### 6.2 Return per-question review to the learner
`grading.util.ts` — extend `GradedAnswer` to optionally carry the correct answer, or build the review in the service. Recommended: build it in the service because the service already has `assessment.questions` and `gradedAnswers`.

Add a helper in `assessments.service.ts`:
```ts
private buildReview(
  questions: Array<Record<string, any>>,
  graded: GradedAnswer[],
): Array<{
  questionId: string;
  type?: string;
  question?: string;
  options?: string[];
  imageUrl?: string | null;
  selectedOption?: number | string;
  correctAnswer?: number | string;
  isCorrect: boolean;
}> {
  const byId = new Map(graded.map((g) => [g.questionId, g]));
  return questions.map((q) => {
    const g = byId.get(q.id);
    return {
      questionId: q.id,
      type: q.type,
      question: q.question,
      options: q.options,
      imageUrl: q.imageUrl ?? null,
      selectedOption: g?.selectedOption,
      correctAnswer: q.correctAnswer,
      isCorrect: g?.isCorrect ?? false,
    };
  });
}
```
Add `review` to the `submit()` return value (`assessments.service.ts:618-625`).

Optional: `GET /assessments/:id/attempts/:attemptId/review` (owner or staff) that rebuilds `review` from `attempt.answers` + `assessment.questions`, for history/retake screens. Not required for v1.

### 6.3 `completeLessonOnSubmission` / `completeModuleOnSubmission`
These helpers (`assessments.service.ts:424-480`) can stay, but note they currently call `completeModuleOnSubmission` unconditionally at the end of `completeLessonOnSubmission` (line 479). With the new module-assessment gate, **do not mark the module complete just because a lesson assessment passed**. Replace line 479 with a call to a shared `maybeCompleteModule(userId, moduleId)` (the progress logic) rather than unconditional completion. Extract `maybeCompleteModule` into a shared helper/service so both `ProgressService` and `AssessmentsService` use the same logic (avoid divergence).

> **Refactor note:** move `maybeCompleteModule` + `maybeCompleteCourse` into a shared provider (e.g. `ProgressCompletionService` or a method in `ProgressService` exported and injected into `AssessmentsService`). Watch for circular deps: `ProgressService` already injects `EnrollmentsService` and `CertificatesService`; `AssessmentsService` injects `CertificatesService`. If injecting `ProgressService` into `AssessmentsService` risks a cycle, put the shared logic in the `progress` module and inject via a small dedicated provider.

---

## 7. Frontend

### 7.1 API layer

`frontend/src/lib/api/progress.ts`
```ts
export async function addLessonTime(lessonId: string, secondsDelta: number) {
  return api(`progress/lessons/${lessonId}/time`, {
    method: "PATCH",
    body: { secondsDelta },
  });
}
```
`markLessonComplete` already exists — keep the same endpoint; the backend now enforces the policy.

`frontend/src/lib/api/quiz.ts`
- Add `fetchModuleAssessments(moduleId)` → `modules/${moduleId}/assessments`.
- Add `fetchLessonAssessments(lessonId)` → `lessons/${lessonId}/assessments`.
- Extend `GradedResult` with `review: AssessmentReviewItem[]` (define the type).
- Optionally add `fetchAttemptReview(assessmentId, attemptId)`.

### 7.2 Types — `frontend/src/lib/api/types.ts`
- `ApiProgressLesson`: add `timeSpentSeconds: number; requiredSeconds: number; timeSatisfied: boolean; assessment?: ApiAttachedAssessment | null;`
- `ApiProgressModule`: add `durationMinutes?: number | null; timeSpentSeconds: number; requiredSeconds: number; timeSatisfied: boolean; assessment?: ApiAttachedAssessment | null;`
- New:
  ```ts
  export interface ApiAttachedAssessment {
    id: string; titleEn: string; titleAm: string; passingScore: number; passed: boolean;
  }
  export interface AssessmentReviewItem {
    questionId: string; type?: string; question?: string; options?: string[];
    imageUrl?: string | null; selectedOption?: number | string;
    correctAnswer?: number | string; isCorrect: boolean;
  }
  ```
- `ApiCourseProgress`: add `courseCompletion: { contentCompleted: boolean; finalAssessmentRequired: boolean; finalAssessmentPassed: boolean; certificateEligible: boolean; }`.
- Update the `progress` lesson mapping in `ApiProgressLesson` to include `subLessons` (currently `ApiCourseProgress` lessons don't declare sub-lessons, though the backend sends them).

### 7.3 `QuizTakerModal.tsx` — reusable + review
1. Add props `assessmentId?: string` and `onPassed?: () => void`.
   - If `assessmentId` is provided, load it directly (`fetchAssessment(assessmentId)`); else keep the current “first course assessment” behavior.
2. On `submit`, store `result.review`.
3. Result screen (`QuizTakerModal.tsx:210-245`):
   - Keep the score badge.
   - Add a **review list**: for each item render the question, options; mark the correct option green, mark the learner's incorrect selection red; for `SHORT_ANSWER` show “Your answer” and “Correct answer”.
   - If `!result.passed`: primary button = **Retry** (`start()`), secondary = Close. Copy: “You need {passingScore}% to continue.”
   - If `result.passed`: call `onPassed?.()` and show “Continue”.
4. Guard retries against `maxAttempts` (backend already enforces; surface the error).

### 7.4 `LearnCourseModal.tsx` — the main rework
Remove the optimistic local “mark complete” gating and rely on the server response + refreshed progress.

**Heartbeat / time tracking**
- When a lesson or sub-lesson is expanded (`openLesson` / `openSubLesson`) and `document.visibilityState === "visible"`, start an interval (every 30s) that:
  - accumulates `secondsDelta` since the last tick (or a fixed 30), and
  - calls `addLessonTime(itemId, secondsDelta)`.
- Pause/clear the interval on lesson close, modal close, or tab hidden (`visibilitychange`).
- Keep a local counter so the UI can show `mm:ss / required` live; reconcile with the server on each response/refresh.

**"Mark Complete" → "Next"**
- Lesson summary row: replace the “Mark Complete” button (`LearnCourseModal.tsx:888-897`) with a single **Next** button (primary) and the lock indicator.
- Expanded footer (`LearnCourseModal.tsx:1148-1204`): replace “Mark Complete” + “Complete & Next Activity” with one **Next** button.
- Sub-lesson row (`LearnCourseModal.tsx:1053-1062`): replace “Complete” with **Next**.
- `onNext(item)`:
  1. If `!timeSatisfied` → show inline message “Spend {remaining} more on this activity” and do **not** call the API. Optionally still try and handle the `TIME_NOT_MET` 403.
  2. If the item has an `assessment` and `!assessment.passed` → open `QuizTakerModal` with `assessmentId` and `onPassed={refresh}`. Label the button “Take Assessment”.
  3. Otherwise → `markLessonComplete(itemId, { completed: true, lastPosition: 0 })`, then refresh and advance to the next lesson/module (reuse `toggleCompleteAndAdvance` logic, lines 311-332), or open the module assessment if this lesson is the last in a module with one.
- Handle backend errors by `reason`:
  - `TIME_NOT_MET` → toast/inline “Please spend at least 50% of the activity time.”
  - `ASSESSMENT_NOT_PASSED` / `ASSESSMENT_REQUIRED` → open the assessment.
  - `LOCKED` → refresh progress (state is stale).

**Time UI**
- Under each lesson/sub-lesson and module header, show a small progress indicator: e.g. `Time 07:30 / 15:00 (50% required)` with a mini `ProgressBar` bound to `timeSatisfied`.
- Show `Badge` “Time requirement met” once satisfied.

**Module handling**
- Module row: show module time status and, if the module has an assessment, a **Take Module Assessment** button (disabled until all lessons done). Only after pass does the next module unlock (server-driven).
- The module header lock state should come from `progress.modules[i].unlocked`, not only local computation.

**Certificate banner**
- Replace the `overall >= 100` condition (`LearnCourseModal.tsx:255-258, 675-695`) with `progress.courseCompletion.certificateEligible`.
- If content is complete but the final assessment is not passed, show a different card: “Complete the Final Assessment to earn your certificate” with a button that opens the final assessment.
- Final Assessment card lock (`LearnCourseModal.tsx:1252-1288`): gate on `progress.courseCompletion.contentCompleted` and reflect `finalAssessmentPassed`.

**Remove/replace reset affordances**
- The “Mark incomplete” reset buttons (e.g. `LearnCourseModal.tsx:871-880`, `587-594`) conflict with time-gated progression. Remove for learners (or hide behind staff role). Confirm with product; default plan: **remove from learner view**.

### 7.5 Other progress-aware UI
- `frontend/src/app/(dashboard)/learner/progress/page.tsx` and dashboard stat cards read `ApiCourseProgress`; verify the new fields don’t break existing rendering (additive only).

---

## 8. End-to-end flows

### 8.1 Lesson with no assessment
1. Learner opens lesson → heartbeat every 30s → `PATCH /progress/lessons/:id/time`.
2. Next clicked → backend checks time ≥ 50% and sequential unlock.
3. Pass → `LessonCompletion.completed = true`; next lesson unlocks. Fail (`TIME_NOT_MET`) → stay, show remaining time.

### 8.2 Lesson with assessment
1. Content viewed until time satisfied.
2. Button becomes “Take Assessment” → `QuizTakerModal` (module/lesson assessment).
3. `POST /assessments/:id/submit` → graded result + `review`.
4. **Pass** → backend sets lesson complete (and module reconcile); UI shows review then advances.
5. **Fail** → UI shows review + correct answers, “Retry”; next stays locked until a pass.

### 8.3 Module
- Module completes only when: all lessons complete **AND** module time ≥ 50% of `module.durationMinutes` **AND** (if a `MODULE_ASSESSMENT` exists) it is passed. Only then does the next module unlock.

### 8.4 Final certificate
1. `contentCompleted` (all lessons) **and** final assessment passed.
2. Final submit pass → enrollment `COMPLETED` + `maybeIssueForCompletion`.
3. UI banner shows certificate only when `certificateEligible` is true.

---

## 9. Edge cases & decisions

1. **Lessons with sub-lessons / time attribution.**
   - Track time per sub-lesson. For a parent lesson with sub-lessons, `spent = Σ(sub.timeSpentSeconds)` and `required = requiredSeconds(lesson.durationMinutes)` (fallback to `Σ requiredSeconds(sub.durationMinutes)` when the parent duration is null).
   - Time-satisfied means every required sub-lesson is satisfied **or** the aggregate reaches the requirement. Pick aggregate (simpler and friendlier) and document it in code.
2. **`durationMinutes` null/0** → no time requirement (`requiredSeconds = 0`), proceed.
3. **Server-side delta cap** (300s/request) prevents a client from faking huge elapsed time in one call. Consider also ignoring deltas when the lesson isn't unlocked.
4. **Tab visibility** → don't count hidden time.
5. **Reset to incomplete** → remove for learners; if kept, it must not allow re-completion to skip the time policy (the policy always re-applies on the next completion attempt).
6. **Legacy completed rows** → remain completed.
7. **Attempts exhausted** → surface the backend `ForbiddenException` (“Maximum attempts reached”).
8. **`maxAttempts`** already enforced in `startAttempt` (`assessments.service.ts:395-401`) and `submit` (`:493-500`).
9. **Shuffle questions** → review must map by `questionId`, never by index.
10. **i18n** → use the existing `translate` helper for user-facing backend messages; add Amharic strings for new messages in the frontend constants where the app does so.

---

## 10. Test plan

Backend (Jest, co-located `*.spec.ts`):
- `completion-policy.util.spec.ts`: `requiredSeconds`, `isTimeSatisfied`, boundary at exactly 50%, null duration.
- `unlock.util.spec.ts`: module not unlocked when module assessment not passed; unlocked after pass; missing `ModuleCompletion` reconciliation.
- `progress.service.spec.ts` (or integration): `markLessonComplete` rejects `TIME_NOT_MET` and `ASSESSMENT_NOT_PASSED`; succeeds after heartbeat + pass; `maybeCompleteModule` requires module time + assessment; `maybeCompleteCourse` does not complete/issue without final pass.
- `assessments.service.spec.ts`: non-final fail does **not** complete; pass completes; `submit` returns `review` with `correctAnswer`; final pass issues certificate, final fail does not.

Frontend:
- Heartbeat pauses on tab hide and lesson close.
- Next button blocks on time, opens assessment, advances after pass.
- Review renders correct answers (MCQ, true/false, short answer).
- Certificate banner only when `certificateEligible`.

Manual QA:
- Fresh enrollment → first lesson only unlocked.
- Grind time without watching → still gated.
- Fail an assessment → review shown, retry allowed, next locked.
- Complete content without passing final → no certificate, prompt shown.
- Pass final → certificate appears in `/learner/certificates`.

---

## 11. Implementation order (checklist)

**Phase 1 — Data & policy**
- [ ] Prisma: add `LessonCompletion.timeSpentSeconds`; migrate.
- [ ] Add `completion-policy.util.ts` (+ export from `common/utils/index.ts`).

**Phase 2 — Backend completion**
- [ ] `AddLessonTimeDto` + `progress.controller.ts` route.
- [ ] `ProgressService.addLessonTime()`.
- [ ] Enforce time + assessment policy in `markLessonComplete()`.
- [ ] Module time + module assessment gate in `maybeCompleteModule()`; extract shared completion logic.
- [ ] `reconcileModuleCompletions()` and update `computeSequentialUnlocks` / `unlock.util.ts`.
- [ ] `maybeCompleteCourse()` requires passed final assessment.
- [ ] Enrich `getCourseProgress()` response (`timeSpentSeconds`, `requiredSeconds`, `timeSatisfied`, `assessment`, `courseCompletion`).

**Phase 3 — Backend assessments**
- [ ] Non-final: complete only on pass.
- [ ] `buildReview()` + return `review` from `submit()`.
- [ ] (Optional) attempt review endpoint.

**Phase 4 — Frontend API/types**
- [ ] `addLessonTime`, `fetchModuleAssessments`, `fetchLessonAssessments`.
- [ ] Extend `GradedResult`, `ApiCourseProgress`, `ApiProgressLesson/Module`; add `ApiAttachedAssessment`, `AssessmentReviewItem`.

**Phase 5 — Frontend UI**
- [ ] `QuizTakerModal`: `assessmentId` + `onPassed` + per-question review + retry.
- [ ] `LearnCourseModal`: heartbeat, Next button, time indicators, module assessment, error handling.
- [ ] Certificate banner driven by `courseCompletion.certificateEligible`; final assessment card gating.
- [ ] Remove learner “Mark incomplete”.

**Phase 6 — Tests & QA**
- [ ] Backend specs above; run `npm run lint`, `npm run test`, `npm run build` (backend).
- [ ] Frontend: `npm run lint`, `npm run build`.
- [ ] Manual QA script from §10.

---

## 12. Key file reference

| Concern | File |
| --- | --- |
| Sequential unlock | `backend/src/common/utils/unlock.util.ts` |
| New policy util | `backend/src/common/utils/completion-policy.util.ts` (new) |
| Lesson/module/course completion | `backend/src/modules/progress/progress.service.ts` |
| Progress routes/DTO | `backend/src/modules/progress/progress.controller.ts`, `backend/src/modules/progress/dto/` |
| Assessment grading/submission | `backend/src/modules/assessments/assessments.service.ts`, `grading.util.ts` |
| Assessment routes | `backend/src/modules/assessments/assessments.controller.ts` |
| Certificate eligibility | `backend/src/modules/certificates/certificates.service.ts` |
| Prisma schema | `backend/prisma/schema.prisma` |
| Learner player | `frontend/src/components/features/courses/LearnCourseModal.tsx` |
| Quiz taker | `frontend/src/components/features/quiz/QuizTakerModal.tsx` |
| Progress API | `frontend/src/lib/api/progress.ts` |
| Quiz API | `frontend/src/lib/api/quiz.ts` |
| Types | `frontend/src/lib/api/types.ts` |

---

## 13. Open assumptions (confirm if wrong)
- Module assessment is optional and, when present, must be passed; when absent, module unlocks on lessons complete + module time.
- Time policy ratio is admin-configurable (§14), 50% by default.
- “Spend time” counts only while the item is open and the tab is visible.
- Learner cannot reset completed lessons.
- A passed assessment remains valid for unlocking (no need to re-take it when revisiting).

---

## 14. Follow-up — Dynamic Course Policy, independent MCQ answers, retake cooldown

Implemented as a fast follow-up to §1–§13.

### 14.1 Bug: MCQ answer selection was not independent per question
**Symptom:** selecting an option on one multiple-choice question also appeared to select an
option on another question.

**Root cause:** `QuizTakerModal.tsx` kept the in-progress `answers` state keyed by
`question.id`. Question ids are free-text, staff-assigned strings (`AssessmentQuestionDto.id`).
Legacy question banks / assessments (e.g. anything authored through the now-orphaned
`QuizBuilder.tsx`, which minted ids as `qn-${Date.now()}` — no random suffix) can contain two
questions with the same id. When that happens, `answers[question.id]` is a single shared slot,
so picking an option on question A overwrote/reflected on question B.

**Fix:**
- `frontend/src/components/features/quiz/QuizTakerModal.tsx`: `answers` is now keyed by the
  question's **array index**, not `question.id` — collisions are now structurally impossible in
  the UI regardless of question-bank data quality. The submit payload still maps
  `index → assessment.questions[index].id` so grading is unaffected.
- `backend/src/modules/assessments/assessments.service.ts`: `dataFor()` (the single choke point
  used by `create`/`replaceForCourse`/`createForModule`/`createForLesson`/`update`) now calls
  `assertUniqueQuestionIds()` and rejects a `questions` array with duplicate ids, so new bad data
  can no longer be created. (Pre-existing assessments with colliding ids, if any, are not migrated
  automatically — the UI-level fix above makes them safe to take regardless.)

### 14.2 Dynamic "Course Policy" management (permission-gated)
Time-spent % and assessment retake cooldown are no longer hardcoded — they're stored in the DB
and editable from a new admin page, gated by a permission like every other admin surface.

- **Permission:** `course_policy.manage` (seeded in `backend/prisma/seed-permissions.ts`,
  granted to `SYSTEM_ADMIN` (implicit — gets every permission) and `TRAINING_ADMIN` by default;
  any role can be granted it via the existing Roles & Permissions matrix).
- **Data model:** `CoursePolicySettings` (`backend/prisma/schema.prisma`) — a singleton row
  (`id = "default"`, auto-created on first read) with `timeSpentPercent` (0–100, default 50) and
  `retakeCooldownMinutes` (default 0 = disabled).
- **Backend module:** `backend/src/modules/policy/` — `PolicyService` (`getSettings`,
  `updateSettings`, `getTimeRatio()` → 0–1 fraction, `getRetakeCooldownMinutes()`) +
  `PolicyController` (`GET /policy`, `PATCH /policy`, both behind `course_policy.manage`).
- **Wired in:**
  - `common/utils/completion-policy.util.ts`: `requiredSeconds`/`isTimeSatisfied` now take an
    optional `ratio` param (default `DEFAULT_TIME_POLICY_RATIO = 0.5`, used only where a caller
    doesn't fetch the live setting — e.g. unit tests).
  - `ProgressModule` imports `PolicyModule`; `ProgressService` fetches
    `policyService.getTimeRatio()` once per request and threads it through every
    `requiredSeconds`/`isTimeSatisfied` call (`getCourseProgress`, `addLessonTime`,
    `assertLessonPolicySatisfied`, `maybeCompleteModule`) — changing the % takes effect
    immediately for every course, no redeploy.
  - `AssessmentsModule` imports `PolicyModule`; `AssessmentsService.assertRetakeAllowed()`
    (used by `startAttempt` and `submit`) checks `policyService.getRetakeCooldownMinutes()`
    once `maxAttempts` is hit: cooldown `0` → permanently blocked (unchanged default behavior);
    cooldown `> 0` → a new attempt is allowed once that many minutes have passed since the
    learner's last **submitted** attempt (`ForbiddenException({ reason: 'RETAKE_COOLDOWN',
    remainingMinutes })` while still waiting).
- **Frontend:**
  - `frontend/src/lib/api/policy.ts`: `fetchCoursePolicy()`, `updateCoursePolicy()`.
  - `frontend/src/constants/navigation.ts`: "Policies" nav entry + `PERMISSION_GATED_PATHS`
    entry (`course_policy.manage`) added to `CROSS_ROLE_ADMIN_ITEMS`, so any role granted the
    permission sees the sidebar tab immediately, matching the existing Users/Roles pattern.
  - `frontend/src/app/(dashboard)/system-admin/policies/page.tsx`: slider + number input for
    time-spent %, number input (minutes) for retake cooldown, live preview text, Save button.

**Known follow-ups not done in this pass:** no caching layer on `PolicyService` (each check does
a cheap single-row lookup — fine at this scale, revisit if it becomes a hot path); no audit-log
entry specifically for policy changes (falls back to whatever global audit interceptor already
covers); no data migration for any *pre-existing* duplicate-id questions in already-authored
assessments.

---

## 15. Follow-up round 2 — heartbeat accuracy, enrollment race, retry-answer leak, certificate placement, approve/reject permission merge

### 15.1 Bug: "Next" stuck on a stale time-remaining message
**Symptom:** a 55-min lesson at a low time-spent % kept saying "Spend 0:03 more..." forever,
even after waiting well past that.

**Root cause:** the heartbeat sent a flat `+30s` every 30 seconds, and `handleNext` only ever
checked the last heartbeat's snapshot. Any click landing between two ticks saw the same stale
"spent" value no matter how long was actually waited (e.g. required=33s: stuck at "3s more" for
the entire 30s→60s window). Separately, a **collapsed** lesson row still showed an enabled
"Next" — but the heartbeat only runs while a lesson is expanded/open, so a collapsed row never
accrues time at all, however long you wait.

**Fix** (`frontend/src/components/features/courses/LearnCourseModal.tsx`):
- `flushHeartbeat(itemId)` (new) computes the *real* wall-clock elapsed time since the item was
  opened/last flushed and syncs that exact delta to the server — `handleNext` calls it right
  before deciding, instead of trusting the last periodic tick.
- If the item isn't currently open when "Next" is clicked, `handleNext` now auto-opens it (so
  the heartbeat starts) and shows "Open this activity to start tracking time…" instead of
  repeating the same frozen countdown.
- A new effect auto-opens the first unlocked, incomplete lesson once progress loads, so a
  learner is never silently sitting on an all-collapsed view from the start.

### 15.2 Bug: enrolling in a course crashed on the `(user_id, course_id)` unique constraint
**Root cause:** `EnrollmentsService.selfEnroll()` only branched on `ACTIVE` (→ error) and
`DROPPED` (→ reactivate) explicitly; a `COMPLETED` row (retake attempt) — or two concurrent
enroll requests both passing the initial `findUnique` check before either row existed — fell
through to a plain `create()` and hit the unique constraint raw.

**Fix** (`backend/src/modules/enrollments/enrollments.service.ts`): `COMPLETED` now throws a
clear `"You have already completed this course"`; the create/reactivate step uses `upsert`
(atomic) instead of read-then-`create`, with a `P2002` catch as a last-resort fallback so a lost
race surfaces as "Already enrolled" instead of a raw Prisma error.

### 15.3 Assessment retry: correct answers were visible before retrying
**Requirement:** while a retry is still available, the review must show only what the learner
selected — not the correct answer or a right/wrong verdict, which would let them read the
answers off before their next attempt.

**Fix** (`frontend/src/components/features/quiz/QuizTakerModal.tsx`): `canRetry = !passed &&
attemptNumber < maxAttempts`. While `canRetry`, the per-question review renders neutrally (no
green/red, no correct-answer line, numbered instead of check/cross) with a note "Correct answers
are hidden while a retry is available." Once passed, or once attempts are exhausted, the full
review (right/wrong + correct answers) shows as before.

### 15.4 Certificate section: moved to the bottom, always visible with a locked state
**Requirement:** the "Congratulations!" certificate message belongs after the Final Assessment
card, and should show as *locked* (not simply absent) until the course is actually finished.

**Fix** (`frontend/src/components/features/courses/LearnCourseModal.tsx`): removed the
certificate/final-assessment nudge banner that used to sit near the top (right under the
progress overview). A single certificate card now renders after the Final Assessment card:
locked (grey, lock icon, "Not yet earned" badge, context-aware copy) whenever
`!courseCompletion.certificateEligible`; the existing green "Congratulations" + download link
once eligible.

### 15.5 Time-spent policy now accepts fractional percentages (e.g. 0.3%)
**Root cause:** `CoursePolicySettings.timeSpentPercent` was `Int` and `UpdatePolicyDto` used
`@IsInt()` — saving a fractional value like `0.3` was rejected by validation.

**Fix:** migrated the column to `Float` (`backend/prisma/migrations/
20260918062850_time_spent_percent_float/`), changed the DTO to `@IsNumber()`
(`backend/src/modules/policy/dto/update-policy.dto.ts`). Frontend number input now uses
`step={0.1}` and the live preview shows required **seconds** instead of rounding to whole
minutes (`frontend/src/app/(dashboard)/system-admin/policies/page.tsx`).

### 15.6 Additive demo-course seed using existing gmail.com actors
Added `backend/prisma/seed-more-courses.ts` — **additive-only** (skips any course code that
already exists; never deletes anything), unlike the repo's pre-existing `seed-courses.ts` which
wipes every course first. Looks up the gmail.com demo actors already in this DB
(`owner@/trainer@/approver@/learner@gmail.com`) and creates one course per `CourseStatus` (6
total: `GRAPH101` DRAFT, `NEG201` PENDING_APPROVAL, `TAX301` APPROVED, `SOC201` REJECTED,
`CLOUD201` PUBLISHED, `LEGACY101` ARCHIVED), each with 2 modules / 4 lessons, a
MODULE_ASSESSMENT, a LESSON_ASSESSMENT, and a FINAL_ASSESSMENT, cover = `/sample.jpg`. The demo
learner is auto-enrolled in the one `PUBLISHED` course. Run: `cd backend && npx ts-node
prisma/seed-more-courses.ts`.

### 15.7 Merged `course.approve` + `course.reject` into one permission
**Rationale:** the single `/courses/:id/review` endpoint already accepted either permission
interchangeably (approve/reject is one action gated one way, branching only on the request body)
— two separate permission codes added no real distinction, just two toggles that always needed
to move together.

**Change:** both codes replaced by `course.approve_reject` everywhere:
- `backend/prisma/seed-permissions.ts`: single `PERMISSIONS` entry; `CONTENT_APPROVER`'s matrix
  entry updated; a cleanup step deletes the old `course.approve`/`course.reject` `Permission`
  rows (cascades to their `RolePermission` grants) so no stale codes linger after reseeding.
- `backend/src/modules/courses/courses.controller.ts`: `@Post(':id/review')` now declares
  `@Permissions('course.approve_reject')`.
- `frontend/src/constants/navigation.ts`: "Pending Course Approvals" nav item's permission is now
  the single string instead of a two-code array.
- `frontend/src/components/features/courses/CourseDetailModal.tsx` and
  `.../PendingCourseApprovals.tsx`: every `can("course.approve")` / `can("course.reject")` call
  now checks `can("course.approve_reject")`.
- Applied directly to the dev DB via the permission-only seed path (same approach as §14.2) — any
  role previously granted `course.approve` or `course.reject` now needs `course.approve_reject`
  re-granted through the Roles & Permissions UI if it wasn't already `CONTENT_APPROVER` or
  `SYSTEM_ADMIN`.
