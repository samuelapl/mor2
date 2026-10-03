# Course Approval Undo, Trainer Rule & Question Bank Duplicate Detection

This plan covers two related pieces of course-authoring work:

- **Part A: Question bank duplicate detection.** Stops identical or near-identical questions from being added to the same course, at any curriculum level.
- **Part B: Return an approved course to draft, and relax the trainer rule.** Lets an approver send an approved course back to its owner for changes, and lets a course with no planned sessions be published without a trainer.

| Part | Status |
|---|---|
| A. Question bank duplicate detection | Implemented |
| B1. Publish without a trainer when no sessions are planned | Implemented |
| B2. "Return to draft" for approved courses | Implemented |

---

## Part A: Question bank duplicate detection

### Problem

A question can be attached to a course in general, or to one of its modules, lessons or sub-lessons. Nothing stopped an author from adding the same question twice, for example once at course level and again under Module 2 › Lesson 3. Both copies can then land in the same quiz. The dev database already contains such duplicates (one course has the same question 7 times).

### Rules

1. **Scope is the whole course.** A course question is compared with every question of that course, whatever level it is attached to, plus the reusable (global) questions. All of these show up together in the course's bank. A reusable question is compared with all questions, since it shows up in every course.
2. **Identical questions are always rejected.** "Identical" means the same type, question text and set of options after normalization. Normalization strips HTML tags and entities, applies Unicode NFKC, lowercases, removes punctuation (including Ethiopic punctuation such as `።`), and ignores option order.
3. **Similar questions need confirmation.** Matches are found with PostgreSQL trigram similarity (`pg_trgm`):
   - a score of `0.55` or more is reported as **Similar**;
   - a score of `0.75` or more is reported as **Likely duplicate**.

   The author can save anyway by confirming the question is different (`acknowledgeSimilar: true`).
4. **Short, generic stems include their options.** For prompts under 6 words, such as "Which of the following is correct?", the options are part of the compared text, so these stems don't all match each other.
5. **Editing a legacy duplicate is allowed.** The check only re-runs on update when the type, text, options or course change. Existing duplicates can still have their points or placement edited.

The thresholds were chosen from real pairs in the dev data, and can be tuned in `question-duplicates.ts`.

### Design

**Database** (`backend/prisma/migrations/20261003090000_question_bank_duplicate_detection`)

- Enables `pg_trgm`.
- SQL functions `qb_normalize_text`, `qb_normalize_options`, `qb_similarity_text` and `qb_content_hash` hold the only definition of normalization. Both the stored columns and the incoming draft go through them, so the two sides cannot drift apart.
- Two stored generated columns on `question_bank_questions`:
  - `content_hash`: an exact fingerprint, indexed with `course_id`;
  - `similarity_text`: the text compared for similarity, with a GIN `gin_trgm_ops` index.

  Seeds and existing rows get both columns automatically.
- **No unique index**, because existing duplicates would make it fail. Instead, writes take a transaction-scoped advisory lock (`pg_advisory_xact_lock`) while they check and insert, so two concurrent saves of the same question cannot both pass.
- In Prisma, both columns are declared as `@default(dbgenerated(...))` so `migrate diff` reports no drift. They are omitted from every API response.

**Backend** (`backend/src/modules/question-bank`)

| Piece | Behaviour |
|---|---|
| `question-duplicates.ts` | `findSimilarQuestions` (top 5 matches, with module / lesson / sub-lesson titles), `findBatchDuplicates` (pairs within one batch), `lockQuestionBank` |
| `POST /question-bank/check-duplicates` | Returns `{ matches }` for a draft question. Used by the editor while the author types. |
| `POST /question-bank` and `PATCH /question-bank/:id` | Return 409 `QUESTION_DUPLICATE` for an identical question. Return 409 `QUESTION_SIMILAR` for similar matches unless `acknowledgeSimilar: true`. |
| `POST /question-bank/bulk` | All-or-nothing. Returns 409 `QUESTION_BATCH_DUPLICATES` with `issues[]`: the row index, the reason (`EXACT` or `SIMILAR`), the bank matches, and matches against earlier rows of the same batch. |

**Frontend** (`frontend/src/components/features/question-bank`)

- `useQuestionEditor` runs a debounced (500 ms) live check once the prompt is at least 12 characters. Identical matches block "Add Another Question" and "Save". Similar matches require the author to tick "save anyway".
- `DuplicateWarning` lists the matches with their severity, score and location, for example "Module 1 › Lesson 2".
- When a batch save is rejected, every question in it goes back to the queue. `StagedQuestionList` shows each question's problem. Similar ones get a "Keep anyway" button; identical ones must be edited or removed.
- A rejected bulk save is no longer retried one question at a time, which would have saved part of the batch.
- `ApiError` now carries the full error body (`details`), so structured 409s reach the UI.
- Intentional copies skip the similar-question confirmation (`acknowledgeSimilar: true`): the editor's "Duplicate" action and questions saved from the live quiz screen, so a session isn't held up. Identical copies are still rejected.

### Verification

- Ran against the dev database. Exact matches survived HTML, case, punctuation and option-order changes. Reworded questions were flagged as Similar (0.68–0.73). Questions in other courses and unrelated questions were not matched.
- Service-level scenarios:
  - creating an identical question at module level → 409;
  - a reworded question → 409 without confirmation, saved with `acknowledgeSimilar`;
  - a bulk save with an existing duplicate and an in-batch duplicate → 409 listing rows 0 and 2, nothing saved;
  - editing only the points of a duplicate → allowed;
  - changing the text to an identical copy → 409.
- Backend `tsc`, ESLint and the jest suite pass; frontend `tsc` passes.

---

## Part B: Return to draft & trainer rule

### Problem

1. **Every course needs a trainer to be published.** `CoursesService.publish` refused any course without a trainer, even a self-paced course with no planned sessions, where no trainer is involved.
2. **An approval cannot be undone.**
   - An `APPROVED` course can only move to `PUBLISHED` or `ARCHIVED`.
   - The Reject action only exists while a course is under review.
   - Course details, curriculum, assessments and session plans can only be edited in `DRAFT` or `REJECTED`.
   - Unpublishing returns a course to `APPROVED`, which is still locked.

   If the approver changes their mind, or the course needs updates or sessions added, there is no way to send it back to the owner.

### Decisions

| Question | Decision |
|---|---|
| Trainer requirement | Needed only when the course has planned sessions (`course_session_plans` rows). A course with no planned sessions can be published without a trainer. |
| Who can return a course to draft | Anyone with the `course.approve_reject` permission. |
| Which courses | Only `APPROVED` courses. Published courses are excluded; unpublish first to reach `APPROVED`. |
| Who starts it | Only the approver. There is no owner-side "withdraw" request. |

### B1. Trainer rule

**Backend:** `CoursesService.publish` counts the course's session plans and requires a trainer only when there is at least one. The existing session-readiness check (every plan scheduled, every session quiz has questions) is unchanged.

**Frontend:** `useCourseActions` exposes `requiresTrainer`, which is true when the course has session plans. `CourseReviewShell.handlePublish` publishes directly when the course has a trainer or doesn't need one. Otherwise it opens the assign-trainer dialog as before. The Publish button's tooltip follows the same rule.

### B2. Return to draft

**Endpoint:** `POST /courses/:id/return-to-draft`, body `{ reason: string }`, permission `course.approve_reject`.

**Service** (`CoursesService.returnToDraft`):

1. The course must be `APPROVED`. A published course gets a 400 saying to unpublish it first; any other status gets a 400.
2. A reason is required.
3. The request is refused while the course has **enrollments** or **scheduled sessions** (non-deleted `live_sessions`):
   - Draft courses can have their curriculum and session plans replaced wholesale. That would destroy learner progress.
   - Saving session plans deletes and recreates them, which would detach scheduled sessions and their prepared quizzes from their plans.

   Today a draft course never has either, and this keeps it that way. The error says what to remove first.
4. The status moves `APPROVED → DRAFT`. This transition is added to `CourseStateMachine`; no other code path requests it.
5. A `ContentApproval` row with status `NEEDS_REVISION` and the reason is written. The approval history already labels this "Needs revision", so the history reads "Approved", then "Needs revision", with the reason. No migration is needed.
6. The owners are notified (type `COURSE_REJECTED`, titled "Course approval withdrawn") with the reason, in English and Amharic.

The owner then edits the course in the Creator Studio, adds sessions if needed, and resubmits through the normal `request-approval → review` flow.

**Frontend:**

| File | Change |
|---|---|
| `lib/api/courses.ts` | `returnCourseToDraft(id, reason)` |
| `lib/lms-store.tsx` | `returnCourseToDraft` action, reloads data like the other review actions |
| `review/types.ts` | New `returnToDraft` action key |
| `review/hooks/useCourseActions.ts` | `can.returnToDraft` = `course.approve_reject` and status `approved` and not published. `returnToDraft(reason)` returns the error text for the dialog. |
| `review/ReviewHeader.tsx` | "Return to draft" button for approved, unpublished courses |
| `review/dialogs/RejectDialog.tsx` | A `mode` prop (`reject` or `returnToDraft`) switches the title, label, placeholder and button text, so one reason dialog serves both |
| `review/CourseReviewShell.tsx` | Opens the dialog in the right mode |

### Out of scope

- An owner-initiated "withdraw approval" request.
- Returning a published course straight to draft. It must be unpublished first, and that is only possible when it has no enrollments or scheduled sessions.
- A dedicated `APPROVAL_REVOKED` status or notification type. `NEEDS_REVISION` and `COURSE_REJECTED` carry the meaning without a migration.

### Verification

- Backend: `tsc`, ESLint and jest.
- Service-level scenarios against the dev database, all rolled back:
  - returning an approved course with no enrollments or sessions moves it to `DRAFT`, writes a history row and notifies the owners;
  - a published course is refused;
  - a course with a scheduled session is refused;
  - a missing reason is refused;
  - publishing an approved course with no session plans and no trainer succeeds;
  - publishing with session plans and no trainer is refused.
- Frontend: `tsc`.
