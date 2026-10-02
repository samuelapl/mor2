# Course Review Page: Full-Page Replacement for CourseDetailModal

This plan replaces `CourseDetailModal.tsx` (a 980-line modal) with a full-screen **Course Review** page at `/courses/[courseId]`. The page reuses the layout of the Course Creator Studio (`creator/`) and the learner Classroom (`classroom/`). It keeps every existing action: Submit, Approve, Reject, Publish, Assign Trainer + Publish, Unpublish, Archive, Delete and Edit.

The work is split into two phases that ship one after the other:

- **Phase 1** builds the new page and moves all the action logic into it. The modal is not touched, so nothing breaks while the page is being built.
- **Phase 2** finishes the read-only content stages, switches every entry point to the new page and deletes the modal.

---

## Architecture Overview & Design Principles

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ReviewHeader: [←] TEST101 · [Under review] · Course title                               │
│ Actions (permission + status gated): [Edit] [Submit] [Reject] [Approve] [Publish] [⋯]  │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ ReviewSidebar (read-only)     │ Stage area (renders the selected node)                 │
│                               │                                                        │
│ • Course Overview             │ • OverviewStage: details, cover, objectives, files     │
│ ▼ Module 1: Introduction      │ • ModuleStage: description, objectives, files, quiz    │
│   • Lesson 1.1                │ • LessonStage: body, media, files, sub-lessons         │
│     • Sub-lesson 1.1.1        │ • AssessmentStage: settings, weight, questions+answers │
│     • Lesson Assessment (20%) │ • ApprovalHistoryStage: submissions, decisions,        │
│   • Module Assessment (20%)   │   rejection reasons                                    │
│ • Final Assessment (60%)      │                                                        │
│ • Approval History            │                                                        │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

**Principles**

1. **One page for every role.** Owners, approvers and admins open the same URL. Buttons appear only when the user has the permission *and* the course is in the matching status. These are the same rules the modal uses today (`CourseDetailModal.tsx:403-409`).
2. **Logic in hooks, not in JSX.** All data loading and all actions live in two hooks. Components only render.
3. **A real route, not a modal.** Links can be shared and bookmarked, the back button works, and there is no portal or z-index layering.
4. **Read-only.** Editing stays in the Creator Studio. "Edit course" sends the user there instead of rendering the wizard inline.
5. **Reuse, don't rebuild.** The page uses `detail/*` components and the existing `lms-store` actions. The backend and store do not change.

---

## Phase 1: Route, Shell, Actions & Header

**Goal:** `/courses/[courseId]` opens a full-screen page with a working header. Every action works there with the same rules as the modal. The modal stays in place and everything still uses it, so this phase can merge on its own.

### 1.1 Route
* **File:** `frontend/src/app/(dashboard)/courses/[courseId]/page.tsx`
* **Responsibilities:**
  * Read `courseId` from the route params and render `<CourseReviewShell courseId={courseId} />`.
  * Follow the same pattern as `learner/courses/[courseId]/learn/page.tsx`.
  * Add the route's permission entry in `constants/navigation.ts`: `course.view.own`, `course.view.all` or `course.approve_reject`. Without it, the route guard blocks the page.

### 1.2 Types
* **File:** `frontend/src/components/features/courses/review/types.ts`
* **Contents:**
  * `ReviewNodeType`: `OVERVIEW | MODULE | LESSON | SUB_LESSON | MODULE_ASSESSMENT | LESSON_ASSESSMENT | FINAL_ASSESSMENT | APPROVAL_HISTORY`.
  * `ReviewNode`: `{ type; moduleId?; lessonId?; subLessonId? }`. This has the same shape as `CreatorActiveNode`, so the two sidebars stay consistent.
  * `CourseActionKey`: `edit | submit | approve | reject | publish | unpublish | archive | delete`.

### 1.3 Data hook
* **File:** `frontend/src/components/features/courses/review/hooks/useCourseReview.ts`
* **Responsibilities:**
  * Resolve the course from `useLms().courseById(courseId)`, and show a not-found state when it is missing.
  * Load **all** assessments with answers: `fetchCourseAssessments` followed by `fetchAssessmentWithAnswers`. Group them by `type`, `moduleId` and `lessonId`. This replaces the modal's `assessments` / `assessmentLoading` state (lines 89-90).
  * Hold the selected `ReviewNode`, defaulting to `OVERVIEW`, and sync it to the URL hash (for example `#module=<id>`) so a deep link opens the right item.
  * Return `{ course, assessmentsByScope, loading, selectedNode, setSelectedNode }`.

### 1.4 Actions hook
* **File:** `frontend/src/components/features/courses/review/hooks/useCourseActions.ts`
* **Responsibilities:**
  * Move these functions from `CourseDetailModal.tsx` (lines 306-395) without changing their behaviour: `doSubmit`, `doApprove`, `doReject`, `doPublish`, `doAssignAndPublish`, `doUnpublish`, `doArchive`, `doDelete`.
  * Move the permission + status checks (lines 105-107 and 402-409) and return them as `can: Record<CourseActionKey, boolean>`.
  * Move the trainer-options loading used by "assign trainer before publishing" (modal lines 263-281).
  * Return `{ can, busy, run: { submit, approve, reject(reason), publish, assignAndPublish(trainerId), unpublish, archive, delete } }`.
  * Every action shows the same toast message the modal shows today. After a delete, navigate back to `/courses`.
  * Keep the result handling the modal uses: show an error when `ActionResult.ok === false`, and never show a success message without checking the result.

### 1.5 Dialogs
* **Folder:** `frontend/src/components/features/courses/review/dialogs/`
* **Files:**
  * `RejectDialog.tsx`: rejection reason textarea with validation. This replaces the modal's `rejectOpen`, `reason` and `reasonError` state.
  * `PublishDialog.tsx`: when the course has no trainer, a trainer picker followed by "Assign & Publish". This replaces `needsTrainerForPublish` and `publishTrainerId`.
  * `ConfirmActionDialog.tsx`: one confirmation dialog shared by Archive and Delete. This replaces `confirmArchiveOpen` and `confirmDeleteOpen`.
* All three use `components/ui/Modal.tsx`. The page is not itself a modal, so dialogs stack normally.

### 1.6 Header
* **File:** `frontend/src/components/features/courses/review/ReviewHeader.tsx`
* **Features:**
  * Back button, course code badge, status badge (`CourseStatusBadge`), delivery mode badge and title, styled like `CreatorHeader.tsx`.
  * Action buttons driven only by `useCourseActions().can`. The primary action for the current status sits on the right: Approve while `under_review`, Publish while `approved`. Archive and Delete go in an overflow menu.
  * "Edit course" goes to the Creator Studio with this course loaded. That means `/course-owner/create-course?edit=<id>`, or the same `CourseCreationWizard` mount used today.
  * Language toggle, the same as in `CreatorHeader`.

### 1.7 Shell (with temporary content)
* **File:** `frontend/src/components/features/courses/review/CourseReviewShell.tsx`
* **Features:**
  * Full-screen layout (`flex h-screen flex-col overflow-hidden`) with the header on top and the sidebar beside the stage area, matching `CourseCreatorShell.tsx`.
  * In Phase 1 the stage area renders the existing `detail/CourseCurriculumSection` and `detail/AssessmentDetailSection` as one scrolling column, so the page is complete enough to review a course. Phase 2 replaces this with per-node stages.
  * Loading and not-found states.

### 1.8 Phase 1 verification
* `npx tsc --noEmit` and `npm run build` in `frontend/` pass with 0 errors.
* Open `/courses/<id>` directly as each demo role and check that the right buttons appear for each course status:

  | Role | `draft` | `under_review` | `approved` | published |
  |---|---|---|---|---|
  | owner@gmail.com | Edit, Submit | — | — | — |
  | approver@gmail.com | — | Approve, Reject | — | — |
  | tadministrator@gmail.com | Archive / Delete | — | Publish | Unpublish |

* Run each action once from the new page: reject with a reason, approve, publish with and without a trainer assigned, unpublish, archive and delete. Each action produces the same toast and the same status change as the modal.
* The modal still works unchanged from all three entry points.

---

## Phase 2: Sidebar, Content Stages, Migration & Removal

**Goal:** the review page shows one item at a time from a classroom-style tree, every entry point opens the page, and `CourseDetailModal.tsx` is deleted.

### 2.1 Review sidebar
* **File:** `frontend/src/components/features/courses/review/ReviewSidebar.tsx`
* **Features:**
  * Read-only tree that looks like `CreatorSidebar.tsx`, without the add and delete buttons. It contains: Course Overview, then each module (collapsible) with its lessons and sub-lessons, then the lesson and module assessment checkpoints with their weight badges, then Final Assessment and Approval History.
  * Content-type icons, file count and duration on each node.
  * A warning dot on nodes that fail the pre-flight checks from `ReviewSubmitStage.tsx`: a module with no lessons, a missing title, an assessment with no questions or with blank options. Reviewers can then find problems without reading every item.
  * Keyboard navigation (Up/Down/Enter), reusing the `handleTreeKeyDown` approach from `CreatorSidebar.tsx`.

### 2.2 Content stages
* **Folder:** `frontend/src/components/features/courses/review/stages/`
* **Files:**
  * `OverviewStage.tsx`: cover, title, code, category, level, delivery mode, department, target audience, prerequisites, objectives, description, course-level reference files and totals (modules, lessons, files, questions, weight sum).
  * `ModuleStage.tsx`: description, objectives, duration, module files and a summary card for the module assessment that links to its node.
  * `LessonStage.tsx`: body (`RichContent`), embedded media (`VideoEmbed`-style player or a PDF/link card), lesson files, sub-lesson list and a lesson assessment summary. It is also used for sub-lessons.
  * `AssessmentStage.tsx`: one component for all three tiers. It shows title, pass mark, weight, time limit, attempts and assessment files, plus every question with its correct answer, using `detail/AssessmentQuestionPreview`.
  * `ApprovalHistoryStage.tsx`: timeline of submissions, approvals and rejections with reviewer name, date and rejection reason. The data comes from `course.approvals` (already included by `courses.service.ts`).
* Every stage uses `detail/AttachmentCard` for files.

### 2.3 Shell wiring
* **File:** `CourseReviewShell.tsx`
* Replace the temporary single-column content from Phase 1 with `renderStage(selectedNode)`, which switches on `ReviewNodeType`.
* Add Previous/Next buttons at the bottom of each stage that follow the sidebar order, similar to `classroom/ClassroomFooter.tsx`.

### 2.4 Switch the entry points
Each of these currently opens `CourseDetailModal`. Change each one to navigate to `/courses/${course.id}` with `router.push` or a `Link`:
1. `frontend/src/components/features/courses/PendingCourseApprovals.tsx` (line 181). Keep the quick Approve/Reject buttons on the list, and use `RejectDialog` for the reason.
2. `frontend/src/app/(dashboard)/courses/page.tsx`
3. `frontend/src/app/(dashboard)/course-owner/content-status/page.tsx`

### 2.5 Remove the modal
* Before deleting, check with `grep -rn "CourseDetailModal" frontend/src` that nothing imports it any more.
* Delete `frontend/src/components/features/courses/CourseDetailModal.tsx`.
* Keep the `detail/` folder, because the review stages use it.
* Remove any modal-only helpers that become unused, such as local `getItemAttachments` copies.

### 2.6 Phase 2 verification
* `npx tsc --noEmit` and `npm run build` in `frontend/` pass with 0 errors.
* Each of the three entry points opens `/courses/<id>`, and the back button returns to the list it came from.
* Every sidebar node opens the right stage. A deep link with a hash opens the right node.
* Run the end-to-end flow:
  1. As owner@gmail.com, create a course with module and lesson files and 20% / 20% / 60% assessments, then submit it.
  2. As approver@gmail.com, open it from Pending Approvals. Check that every file, question and correct answer is visible. Reject it with a reason.
  3. As the owner, check that the reason appears in Approval History. Edit and resubmit the course.
  4. As the approver, approve it.
  5. As tadministrator@gmail.com, publish it, assigning a trainer when prompted.
  6. As learner@gmail.com, check that the course and all three assessment tiers appear in the classroom.
* `grep -rn "CourseDetailModal" frontend/src` returns nothing.

---

## Final File Map

```
frontend/src/app/(dashboard)/courses/[courseId]/page.tsx          (Phase 1, new)
frontend/src/components/features/courses/review/
├── CourseReviewShell.tsx                                          (Phase 1, wired in Phase 2)
├── ReviewHeader.tsx                                               (Phase 1)
├── ReviewSidebar.tsx                                              (Phase 2)
├── types.ts                                                       (Phase 1)
├── hooks/useCourseReview.ts                                       (Phase 1)
├── hooks/useCourseActions.ts                                      (Phase 1)
├── dialogs/RejectDialog.tsx                                       (Phase 1)
├── dialogs/PublishDialog.tsx                                      (Phase 1)
├── dialogs/ConfirmActionDialog.tsx                                (Phase 1)
└── stages/OverviewStage.tsx, ModuleStage.tsx, LessonStage.tsx,
    AssessmentStage.tsx, ApprovalHistoryStage.tsx                  (Phase 2)

Modified in Phase 2: PendingCourseApprovals.tsx, courses/page.tsx, course-owner/content-status/page.tsx
Deleted in Phase 2:  components/features/courses/CourseDetailModal.tsx
Unchanged:           lms-store.tsx actions, backend endpoints, detail/* components
```
