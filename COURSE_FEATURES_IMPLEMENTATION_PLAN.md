# Comprehensive Implementation Plan: MoR LMS Course Creation, Classroom & Policy Enhancements

> **Date:** October 7, 2026  
> **Status:** Pending User Approval  
> **Location:** `mor2/COURSE_FEATURES_IMPLEMENTATION_PLAN.md`

---

## 1. Executive Summary & Goals

This plan details the implementation for the 12 targeted enhancements requested across course authoring, content management, classroom experience, policy enforcement, and certificate issuance:

1. **Global "Save Changes" Action**: Available across all stages/pages of the course creation wizard.
2. **Video File Upload & URL Support**: Allow course creators to directly browse and upload video files (`.mp4`, `.webm`) into file storage (MinIO) in addition to providing external embed URLs.
3. **Collapsible Dropdown Hierarchy in Course Sidebar**: Smooth nested accordions/dropdowns for Module $\rightarrow$ Lesson $\rightarrow$ Sublesson in the classroom navigation.
4. **Course Deletion Confirmation with Learner Impact Notice**: Display enrolled learner counts before deletion, and automatically cancel/clean up associated learner enrollments upon confirmation.
5. **Certificate Gating on Live Session Attendance**: Require learners to attend scheduled live sessions before certificates are granted, even when assessments are not present or already passed.
6. **Robust Auto-Save & Emergency Recovery**: Automatic background draft persistence (localStorage & backend), emergency exit protection, and an explicit manual "Save as Draft" button.
7. **Rich Formatting in Textareas**: Bullet lists (`•`, `-`, `*`) and numbered lists (`1.`, `2.`) with auto-continuation on Enter and dedicated quick-format toolbar actions.
8. **"Add Question" Button Positioned Below Added Questions**: Ensure creators can conveniently add new questions directly beneath the questions they just added.
9. **"Preview as Learner" Mode**: Launch the authentic learner classroom player in preview mode directly from the course creator/editor.
10. **Policy-Controlled Waiting Time per Page**: Functional countdown/study-time requirement on lesson pages linked to administrator course policy settings.
11. **Smooth Assessment Completion Flow**: Auto-scroll to the celebratory congratulations card upon passing, provide a clear unblurred "Continue" button, and eliminate duplicate/blurred disabled buttons.
12. **In-Context "View Session" Details**: Clicking "View Session" displays the specific session's schedule, agenda, trainer, and join links rather than navigating to the global sessions directory.

---

## 2. Detailed Technical Breakdown & Architecture

### Item 1: Global "Save Changes" Button on All Course Creation Pages
- **Target Files:**
  - `frontend/src/components/features/courses/creator/CreatorHeader.tsx`
  - `frontend/src/components/features/courses/creator/CourseCreatorShell.tsx`
  - `frontend/src/components/features/courses/creator/stages/*.tsx`
- **Current State:** The header only renders "Save Draft" and "Submit Course" in the upper right. Stages themselves lack a persistent bottom/floating action bar.
- **Implementation:**
  - Add a dedicated, globally accessible **"Save Changes"** primary button visible on all stages (in `CreatorHeader` next to Save Draft, plus a sticky footer bar in each stage when unsaved edits are present).
  - Clicking "Save Changes" executes immediate draft persistence (`persistDraft()`), displays a success toast notification, and updates the last saved timestamp without closing the editor window.

---

### Item 2: Video File Browsing & Upload in Addition to URL
- **Target Files:**
  - `frontend/src/components/features/courses/creator/stages/LessonEditorStage.tsx`
  - `backend/src/modules/files/files.controller.ts` / `files.service.ts`
- **Current State:** For `VIDEO`, `AUDIO`, and `PRESENTATION` content types, the editor only provides a text input for an external stream/embed URL (`resourceUrl`).
- **Implementation:**
  - Introduce a dual-input mode in `LessonEditorStage` for video/media:
    - **Tab 1: "Upload Video File"** (allows drag-and-drop or file browsing for `.mp4`, `.webm`, `.mov`, `.m4v`). When a file is chosen, it uploads via `uploadAttachment(file, { courseId })` to MinIO, sets `resourceUrl` to the uploaded URL, and stores `fileName` and `fileSize`.
    - **Tab 2: "Video URL / Embed Link"** (retains existing YouTube, Vimeo, or external stream link input).
  - Show a video preview player thumbnail with playback test directly in the editor once uploaded or entered.

---

### Item 3: Collapsible Dropdown Hierarchy in Course Sidebar (Module $\rightarrow$ Lesson $\rightarrow$ Sublesson)
- **Target Files:**
  - `frontend/src/components/features/classroom/ClassroomSidebar.tsx`
  - `frontend/src/components/features/classroom/hooks/useClassroomState.ts`
- **Current State:** When a module is expanded, all lessons and all sublessons are rendered expanded by default.
- **Implementation:**
  - Add state `expandedLessons: Record<string, boolean>` to track lesson-level collapse/expand.
  - In `ClassroomSidebar.tsx`:
    - Clicking a module header toggles its lesson list.
    - If a lesson contains `subLessons && subLessons.length > 0`:
      - Render a dropdown chevron toggle (`<ChevronRight>` / `<ChevronDown>`) on the lesson row.
      - Clicking the toggle smoothly collapses/expands the nested sublesson list as a dropdown.
      - Automatically expand the parent lesson if an active sublesson is selected.

---

### Item 4: Course Deletion Confirmation with Enrolled Learner Count & Automatic Enrollment Cleanup
- **Target Files:**
  - `backend/src/modules/courses/courses.service.ts`
  - `backend/src/modules/courses/courses.controller.ts`
  - `frontend/src/components/features/courses/review/dialogs/ConfirmActionDialog.tsx`
  - `frontend/src/components/features/courses/review/hooks/useCourseActions.ts`
  - `frontend/src/components/features/courses/CourseCard.tsx`
- **Current State:**
  - Backend `softDelete` in `courses.service.ts` sets `deletedAt: new Date()` on the Course without touching learner enrollments.
  - The UI dialog has generic text and does not state how many learners will lose access.
- **Implementation:**
  - **Backend:**
    - Update `coursesService.softDelete`:
      1. Query active enrollment count for the course:
         ```typescript
         const enrollmentCount = await this.prisma.enrollment.count({
           where: { courseId: id, deletedAt: null },
         });
         ```
      2. In a transaction, cancel/soft-delete all active enrollments:
         ```typescript
         await this.prisma.enrollment.updateMany({
           where: { courseId: id, deletedAt: null },
           data: { status: 'CANCELLED', deletedAt: new Date() },
         });
         ```
      3. Return `{ success: true, affectedLearners: enrollmentCount }`.
    - Add endpoint `GET /api/v1/courses/:id/enrollment-count` (or return it in course details) so the confirmation modal can display the exact number beforehand.
  - **Frontend:**
    - When clicking "Delete Course", the confirmation dialog fetches and displays:
      > **Warning:** This course currently has **{count} enrolled learner(s)**. Deleting this course will automatically delete and cancel their enrollments.
    - Once confirmed and deleted, show a notification: *"Course deleted successfully. Enrollments for {count} learners were deleted automatically."*

---

### Item 5: Certificate Issuance Gated on Live Session Attendance
- **Target Files:**
  - `backend/src/modules/certificates/certificates.service.ts`
  - `frontend/src/components/features/classroom/stage/CertificateStage.tsx`
- **Current State:**
  - `maybeIssueForCompletion` checks lesson completion and quiz grades, but never checks if the learner attended scheduled live sessions.
- **Implementation:**
  - In `certificates.service.ts`:
    - Check if the course has planned/scheduled live sessions (`hasOnlineSessions === true` or existing `LiveSession` records for the course).
    - If scheduled sessions exist, check learner attendance records:
      ```typescript
      const sessions = await this.prisma.liveSession.findMany({
        where: { courseId, status: { in: ['COMPLETED', 'LIVE', 'SCHEDULED'] } },
        select: { id: true, titleEn: true },
      });
      if (sessions.length > 0) {
        const attendedCount = await this.prisma.attendance.count({
          where: {
            sessionId: { in: sessions.map((s) => s.id) },
            userId,
            status: { in: ['PRESENT', 'LATE'] },
          },
        });
        if (attendedCount < sessions.length) {
          return null; // Cannot issue certificate without attending all required live sessions
        }
      }
      ```
  - In `CertificateStage.tsx`:
    - If session attendance is missing, display a clear warning banner:
      > ⚠️ **Live Session Attendance Required:** You have completed the curriculum, but you must attend the scheduled session(s) before your certificate can be issued.

---

### Item 6: Auto-Save Always ON & Emergency Recovery Drafts
- **Target Files:**
  - `frontend/src/components/features/courses/creator/CourseCreatorShell.tsx`
  - `frontend/src/components/features/courses/creator/hooks/useCourseDraftRecovery.ts` (new)
- **Current State:** Autosave to backend requires `title.trim() !== '' && code.trim() !== ''`. If the user leaves before providing these, or if their browser crashes, all typed content is lost.
- **Implementation:**
  - Add client-side localStorage draft saving (`mor_course_draft_${courseId || 'new'}`):
    - Automatically updates every 2 seconds on any input change, even before title or code is saved.
    - When launching the course creator, check if an uncommitted local draft exists. If found, prompt:
      > *"We found unsaved changes from a previous session. Would you like to restore them?"*
  - Retain the backend `persistDraft()` for persistent database sync.
  - Provide an explicit **"Save as Draft"** button in addition to automatic saves.
  - Handle `beforeunload` event to warn if unsaved changes are pending.

---

### Item 7: Bullet Lists, Numbered Lists & Auto-Continuation in Textareas
- **Target Files:**
  - `frontend/src/components/ui/RichTextArea.tsx`
  - `frontend/src/components/features/courses/creator/stages/CourseDetailsStage.tsx`
  - `frontend/src/components/features/courses/creator/stages/LessonEditorStage.tsx`
- **Current State:**
  - `CourseDetailsStage` uses standard `<textarea>` elements for objectives, prerequisites, and descriptions. Standard textareas don't format bullets or continue lists on Enter.
- **Implementation:**
  - Create a lightweight `FormatTextArea` helper (or enhance `RichTextArea`):
    - **Smart Enter Keydown Handler:** When pressing Enter on a line beginning with `• `, `- `, `* `, or `1. `, automatically insert the next list item (`• ` or incrementing `2. `) on the new line.
    - **Smart Backspace Handler:** Pressing Backspace on an empty bullet line removes the bullet without deleting preceding text.
    - **Quick-Action Toolbar Buttons:** Add quick "• Bullet List" and "1. Numbered List" formatting buttons directly above description/objective textareas.

---

### Item 8: "Add Question" Button Positioned Below Added Questions
- **Target Files:**
  - `frontend/src/components/features/courses/creator/stages/AssessmentEditorStage.tsx`
- **Current State:** The "Add Question" button only appears at the top header bar (line 492) and in an empty state. Once questions exist, the creator must scroll back to the top to add another.
- **Implementation:**
  - At the bottom of the rendered questions list in `AssessmentEditorStage.tsx`, insert a prominent, full-width action bar:
    ```tsx
    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
      <div>
        <p className="text-sm font-semibold text-slate-900">Add Another Question</p>
        <p className="text-xs text-slate-500">Append Multiple Choice, True/False, or Short Answer</p>
      </div>
      <Button type="button" onClick={addQuestion} className="gap-2">
        <Plus className="h-4 w-4" /> Add Question
      </Button>
    </div>
    ```

---

### Item 9: "Preview as Learner" Mode
- **Target Files:**
  - `frontend/src/components/features/courses/creator/CourseCreatorShell.tsx`
  - `frontend/src/components/features/courses/creator/CreatorHeader.tsx`
  - `frontend/src/components/features/classroom/ClassroomShell.tsx`
- **Current State:** `onPreview={() => setActiveNode({ type: 'REVIEW_SUBMIT' })}` redirects to the instructor review stage, not the learner classroom.
- **Implementation:**
  - Create a preview mode flag `learnerPreviewOpen: boolean` in `CourseCreatorShell`.
  - When clicking **"Preview as Learner"**:
    - Render the course inside `ClassroomShell` with a `previewMode={true}` prop.
    - Display a floating top banner:
      > 👁️ **Learner Preview Mode** — View-only simulation. Progress and answers are not saved to learner records.
      > `[Exit Preview]` button returning directly to the editor stage.

---

### Item 10: Policy-Controlled Waiting Time per Page
- **Target Files:**
  - `backend/src/modules/policy/policy.service.ts`
  - `frontend/src/components/features/classroom/ClassroomFooter.tsx`
  - `frontend/src/components/features/classroom/hooks/useClassroomState.ts`
  - `frontend/src/app/(dashboard)/system-admin/course-policy/page.tsx`
- **Current State:** `timeSpentPercent` exists in backend `PolicyService`, but the classroom learner interface needs an active, visible study timer that strictly guides progression according to the policy setting.
- **Implementation:**
  - Calculate required time per page based on `policy.timeSpentPercent` $\times$ `durationMinutes`.
  - In `ClassroomFooter.tsx` and stage header:
    - Display an active ticking countdown timer: *"Required Study Time: mm:ss remaining"*.
    - Until the policy threshold is reached:
      - The "Complete & Next" button is disabled with a padlock/timer badge.
    - Once reached:
      - The timer turns green with a checkmark, and the "Complete & Next" button automatically enables.

---

### Item 11: Assessment Passing Flow: Remove Blurred Buttons & Auto-Scroll to Congratulations
- **Target Files:**
  - `frontend/src/components/features/classroom/stage/QuizStage.tsx`
  - `frontend/src/components/features/classroom/ClassroomFooter.tsx`
- **Current State:**
  - When an assessment is submitted and passed, the learner stays scrolled down in questions.
  - The bottom footer renders an inactive/disabled "Next" button with `disabled:opacity-50` and `backdrop-blur`, creating a confusing blurred button at the bottom.
- **Implementation:**
  - In `QuizStage.tsx`:
    - On passing assessment submit, immediately call:
      ```typescript
      congratulationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      ```
    - In the Congratulations card, render an active, prominent, unblurred primary button:
      ```tsx
      <Button size="lg" onClick={handleAdvanceNext} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
        Continue to Next Lesson <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
      ```
    - In `ClassroomFooter.tsx`: Hide or seamlessly sync the footer action when an assessment result is actively displayed so no blurred/redundant button appears below.

---

### Item 12: In-Context "View Session" Details for Specific Lesson / Course Session
- **Target Files:**
  - `frontend/src/components/features/classroom/stage/LiveSessionsStage.tsx`
  - `frontend/src/components/features/sessions/shared/SessionDetailModal.tsx` (or new modal)
- **Current State:** Clicking "View session" in `LiveSessionsStage.tsx` (line 83) links directly to `/learner/live-sessions`, losing the current lesson context and showing all scheduled sessions across the platform.
- **Implementation:**
  - Replace the external navigation link with an in-context **Session Detail Modal**:
    - Clicking "View session" opens a modal displaying:
      - Session Title & Description
      - Scheduled Date, Start Time, and Duration
      - Assigned Trainer name & avatar
      - Meeting Join Link / Room Status (Live countdown if upcoming, Join Room if live)
      - Session agenda & attached lesson/module context
      - Prepared quiz results (if session ended)
    - The learner remains on their current lesson page without navigating away.

---

## 3. Implementation Order & Verification Steps

| Step | Action Item | Core Files Affected | Verification |
|:---:|:---|:---|:---|
| **1** | Global Save Changes Button | `CreatorHeader.tsx`, `CourseCreatorShell.tsx` | Button appears on all wizard stages; clicking immediately updates draft. |
| **2** | Video File Browsing + URL | `LessonEditorStage.tsx`, `files.service.ts` | Upload local MP4; verify upload to MinIO and playback in editor. |
| **3** | Collapsible Sidebar Hierarchy | `ClassroomSidebar.tsx`, `useClassroomState.ts` | Test expanding/collapsing module $\rightarrow$ lesson $\rightarrow$ sublesson. |
| **4** | Delete Confirmation & Cascade | `courses.service.ts`, `ConfirmActionDialog.tsx` | Dialog displays enrolled learner count; upon confirm, enrollments are cleaned up. |
| **5** | Certificate Attendance Gating | `certificates.service.ts`, `CertificateStage.tsx` | Test completion on course with scheduled session; cert blocked until session attended. |
| **6** | Auto-Save & Recovery | `CourseCreatorShell.tsx`, `useCourseDraftRecovery.ts` | Refresh page during draft creation; verify prompt to restore content. |
| **7** | Textarea Bullets & Numbers | `RichTextArea.tsx`, `CourseDetailsStage.tsx` | Type `• ` or `1. ` and press Enter; verify auto-continuation. |
| **8** | Add Question Below List | `AssessmentEditorStage.tsx` | Add question 1; verify Add Question button is rendered directly underneath it. |
| **9** | Preview as Learner | `CourseCreatorShell.tsx`, `ClassroomShell.tsx` | Click Preview as Learner; verify classroom view opens in non-mutating preview mode. |
| **10** | Policy Waiting Timer | `ClassroomFooter.tsx`, `policy.service.ts` | Set policy time; verify countdown timer and button unlocking on timer completion. |
| **11** | Assessment Auto-Scroll & Clean UI | `QuizStage.tsx`, `ClassroomFooter.tsx` | Pass quiz; verify smooth scroll to congratulations and absence of blurred footer button. |
| **12** | Contextual Session Details Modal | `LiveSessionsStage.tsx` | Click View Session; verify modal with session-specific details without navigating away. |

---

## 4. User Approval Gateway

As requested by the user:
> *"first give me implementation plan then you can continue after i say continue unless do not proceed and put that implementation plan inside mor2 folder"*

No code modifications have been made yet. Once you review and reply **"continue"**, implementation will begin following this exact sequence.

