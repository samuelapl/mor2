# Full-Page Classroom Migration Plan (2-Stage Execution)

This plan details the complete migration from the modal-based learning dialog (`LearnCourseModal.tsx`) to a modern, full-page, distraction-free learning classroom (similar to Coursera / Udemy).

---

## Architecture & Layout Overview

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ClassroomHeader: [← Back to My Courses]   Advanced Excel...      [Progress: 45%]  [ ⛶ ] │
├──────────────────────────┬─────────────────────────────────────────────────────────────┤
│ ClassroomSidebar (320px) │ ClassroomStage (flex-1 overflow-y-auto)                     │
│ [Collapse ◀]             │                                                             │
│                          │  # Module 1 > Lesson 1.1: Revenue Formulas                  │
│ ▼ Module 1 (2/3)         │                                                             │
│   ✓ 1.1 Overview         │  [ DocumentStage / MediaStage / AssignmentStage / Quiz ]    │
│   ✓ 1.1.1 Formula Lab    │                                                             │
│   ● 1.1.2 XLOOKUP Notes  │  Rich lecture notes (text-[15px]/16px), formatted tables,   │
│   🔒 Lesson 1 Checkpoint │  embedded media, attachments, and checkpoint cards.         │
│                          │                                                             │
│ ▶ Module 2 (Locked 🔒)   │                                                             │
│ ──────────────────────── │                                                             │
│ 🔒 Final Certification   │                                                             │
├──────────────────────────┴─────────────────────────────────────────────────────────────┤
│ ClassroomFooter: [← Previous Topic]      ⏱ 4m 12s / 5m req       [Next: Lesson Quiz →] │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 1: Core Classroom Architecture, Route, Shell, Header, Sidebar & Navigation Hooks

### 1.1 Route Setup & Full-Width Layout Integration
- **Target Route**: `frontend/src/app/(dashboard)/learner/courses/[courseId]/learn/page.tsx`
- **Full-Width Classroom Mode**:
  - Update `DashboardLayout.tsx` (or route shell) so that when navigating to the classroom route (`/learn`), the standard dashboard sidebar (Dashboard, Catalog, Certificates, etc.) is hidden or collapsed.
  - This guarantees the **Course Curriculum Sidebar** is the sole navigation sidebar on screen, giving learners 100% focused width.

### 1.2 Custom Hooks & State Architecture
- **`frontend/src/components/features/classroom/hooks/useClassroomNavigation.ts`**:
  - Manages active selection state (`activeModuleId`, `activeLessonId`, `activeSubLessonId`, `activeQuizId`).
  - URL Synchronization: Reads and updates URL search parameters (`?lesson=...&sub=...&quiz=...`) so bookmarking, sharing, or refreshing preserves the exact topic.
  - Linear Traversal Engine: Calculates `previousItem`, `nextItem`, auto-advancement targets, and checks whether the next step is locked or available.
- **`frontend/src/components/features/classroom/hooks/useClassroomHeartbeat.ts`**:
  - Encapsulates study time tracking with tab visibility detection and periodic flushing to the backend progress API.

### 1.3 Classroom Shell, Focus Header & Footer
- **`frontend/src/components/features/classroom/ClassroomShell.tsx`**:
  - Top-level orchestrator: fetches course details (`fetchCourseDetail`) and learner progress (`fetchCourseProgress`) in parallel.
  - Handles loading skeletons, error states, and unenrollment fallbacks.
- **`frontend/src/components/features/classroom/ClassroomHeader.tsx`**:
  - Back button (`← Back to Courses`), course title & code badge, live progress indicator (`45% Completed`), and sidebar collapse toggle button (`◀ / ▶`).
- **`frontend/src/components/features/classroom/ClassroomFooter.tsx`**:
  - Sticky bottom navigation bar with `← Previous Topic` and `Next Topic →` buttons, active study timer display, and checkpoint prompt.

### 1.4 Classroom Curriculum Sidebar
- **`frontend/src/components/features/classroom/ClassroomSidebar.tsx`**:
  - Left collapsible curriculum tree (desktop 320px, mobile slide-over drawer).
  - Module accordions with module objectives and progress stats (`X/Y lessons`).
  - Lesson rows with content-type icons, duration badges, and status pills:
    - Completed: `✓` (emerald)
    - Active: `●` (indigo ring)
    - Locked: `🔒` (slate)
  - Nested Sub-Lesson rows with clear hierarchy and lab tags.
  - Assessment Checkpoint rows:
    - Lesson Checkpoints (under their respective lessons)
    - Module Assessments (at the end of each module)
    - Final Certification Assessment (at the bottom of the curriculum)

### Stage 1 Deliverables & Verification:
- Route loads course and progress correctly.
- Top header displays course information and progress.
- Sidebar displays entire curriculum with accurate lock/complete states.
- Clicking unlocked items in the sidebar updates the selection and URL.
- Zero TypeScript errors (`npx tsc --noEmit`).

---

## Stage 2: Stage Renderers (Document, Media, Assignment, Quiz), Deep-Linking & Page Handoffs

### 2.1 Reusable Stage Renderers
- **`frontend/src/components/features/classroom/stage/ClassroomStage.tsx`**:
  - Dynamic dispatcher that selects the active view based on the current selection.
- **`frontend/src/components/features/classroom/stage/DocumentStage.tsx`**:
  - Lecture notes and reading lab viewer with comfortable typography (`text-[15px] sm:text-base leading-relaxed`), formatted code blocks, and callout alerts.
  - Renders the **Lesson Assessment Checkpoint Card** at the bottom of the reading.
- **`frontend/src/components/features/classroom/stage/MediaStage.tsx`**:
  - Video stream (YouTube/HTML5/Vimeo) or audio player with time requirements, followed by supplementary notes and transcripts.
- **`frontend/src/components/features/classroom/stage/AssignmentStage.tsx`**:
  - Practical homework workflow: assignment instructions, starter files/templates, student submission dropzone, and status tracking.
- **`frontend/src/components/features/classroom/stage/QuizStage.tsx`**:
  - Full-stage interactive quiz runner for Lesson Checkpoints, Module Assessments, and Final Certification Exam.
  - Radio choices, timer countdown, review questions, instant scoring, and retake support.
- **`frontend/src/components/features/classroom/ClassroomAttachments.tsx`**:
  - Resource cards with **Open in Tab** and **Download** actions.

### 2.2 Updating Learner Entry Points (Handoffs)
Update all learner pages to link directly to `/learner/courses/${courseId}/learn`:
1. **Learner Dashboard** ([`frontend/src/app/(dashboard)/learner/page.tsx`](file:///home/samuelapl/_projects/lms/frontend/src/app/(dashboard)/learner/page.tsx))
2. **My Courses Page** ([`frontend/src/app/(dashboard)/learner/my-courses/page.tsx`](file:///home/samuelapl/_projects/lms/frontend/src/app/(dashboard)/learner/my-courses/page.tsx))
3. **Learner Progress Page** ([`frontend/src/app/(dashboard)/learner/progress/page.tsx`](file:///home/samuelapl/_projects/lms/frontend/src/app/(dashboard)/learner/progress/page.tsx))
4. **Catalog Course Preview Modal** ([`frontend/src/components/features/courses/CatalogCourseModal.tsx`](file:///home/samuelapl/_projects/lms/frontend/src/components/features/courses/CatalogCourseModal.tsx))

### 2.3 End-to-End Verification & Testing
- Test sequential progression:
  1. Enroll in `EXCEL201`.
  2. Open classroom: Module 1, Lesson 1.1 automatically loads.
  3. Lesson 1.2 remains locked.
  4. Complete Lesson 1.1 reading -> unlock Lesson 1.1 Checkpoint Quiz.
  5. Pass Lesson 1.1 Checkpoint Quiz -> Lesson 1.2 unlocks.
  6. Pass Module 1 Checkpoint -> Module 2 unlocks.
- Verify sidebar collapse/expand toggle on desktop and mobile.
- Verify full TypeScript compilation (`npx tsc --noEmit`) and backend build (`nest build`).

---

## Ready for Execution
Once you say **continue**, we will begin executing **Stage 1**.

