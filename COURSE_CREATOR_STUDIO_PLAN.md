# Course Creator Studio: Classroom-Mirroring Implementation Plan

This document details the transition from the legacy form wizard to a modular, full-screen **Course Creator Studio** that visually mirrors the learner's classroom experience (`/learner/courses/[courseId]/learn`).

---

## Architecture Overview & Design Principles

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Creator Header: [Step 1: Details] [Step 2: Curriculum] [Step 3: Final Exam] [Step 4: Review] │
│ Action Buttons: [Save Draft] [Preview as Learner] [Submit for Approval]                 │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Live Classroom-Style Sidebar  │ Focused Stage Work Area                                │
│                               │                                                        │
│ • Course Overview & Details   │ (Dynamically renders the active selected node editor): │
│ ▼ Module 1: Introduction      │                                                        │
│   • Lesson 1: Basics          │ • CourseDetailsStage: Title, Cover, Delivery, Goals    │
│   • Lesson Assessment (20%)   │ • ModuleEditorStage: Objectives, Resources, Actions    │
│   • Module Assessment (20%)   │ • LessonEditorStage: Rich Text, Video, Assignments     │
│   + Add Lesson / Assessment   │ • AssessmentEditorStage: Question Bank & Grade Weight  │
│ ▼ Module 2: ...               │ • ReviewSubmitStage: Pre-flight Audit & Submission     │
│ • Final Assessment (60%)      │                                                        │
│ + Add New Module              │                                                        │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

---

## Phase 1: Entry Delivery Modal & Studio Shell Architecture

### 1.1 Delivery Format Selection Modal
* **File:** `frontend/src/components/features/courses/creator/modal/DeliveryFormatModal.tsx`
* **Purpose:** The first screen that appears when clicking "Create Course Manually" or editing delivery formats.
* **Features:**
  * Selectable cards for:
    1. **Self-Paced Online** (`ONLINE_ONLY`): Digital curriculum, documents, video streams, automated quizzes.
    2. **Classroom / In-Person** (`IN_PERSON_ONLY`): Physical venue sessions, attendance tracking, classroom materials.
    3. **Hybrid / Blended** (`BOTH`): Digital modules combined with scheduled virtual/in-person workshops.
  * Explicit explanations of how each mode enables live sessions, attendance QR codes, or digital certificate gates.
  * Proceed button opens the full-screen studio with `deliveryMode` pre-configured.

### 1.2 Studio Container & Top Header
* **Files:**
  * `frontend/src/components/features/courses/creator/CourseCreatorShell.tsx`
  * `frontend/src/components/features/courses/creator/CreatorHeader.tsx`
* **Features:**
  * Full-screen immersive layout (`h-screen overflow-hidden`) matching `ClassroomShell.tsx`.
  * Top navigation stepper for 4 phases:
    1. `COURSE_DETAILS`
    2. `CURRICULUM`
    3. `FINAL_ASSESSMENT`
    4. `REVIEW_SUBMIT`
  * Global status bar: Autosave indicator, Course Code badge, Delivery Mode indicator, Language toggle, "Save Draft" & "Submit for Approval" buttons.

### 1.3 Interactive Live Tree Sidebar
* **File:** `frontend/src/components/features/courses/creator/CreatorSidebar.tsx`
* **Features:**
  * Real-time reactive hierarchy mirroring `ClassroomSidebar.tsx`:
    * **Course Overview Node**: Click to edit course details.
    * **Module Nodes**: Collapsible module containers showing order, duration, and lesson count.
      * Inline action buttons: `+ Lesson` and `+ Module Assessment`.
    * **Lesson Nodes**: Showing content type icon (Document, Video, Assignment).
      * Nested sub-lesson items and `+ Lesson Assessment`.
    * **Assessment Checkpoint Nodes**: Distinct badges for Lesson Assessment, Module Assessment, and Final Exam with their grade weights.
    * **Bottom Action**: Big, prominent `+ Add New Module` button.
  * Active selection highlight with keyboard navigation support.

### 1.4 Course Details Stage
* **File:** `frontend/src/components/features/courses/creator/stages/CourseDetailsStage.tsx`
* **Features:**
  * Title (Bilingual En/Am), Course Code (auto-capitalized/unique check).
  * Category, Difficulty Level, Department, Target Audience, Prerequisites.
  * Rich cover image upload with thumbnail preview.
  * High-level Course Objectives and Syllabus Description.

---

## Phase 2: Focused Stage Editors, Assessment Studio & Review/Submit

### 2.1 Module Editor Stage
* **File:** `frontend/src/components/features/courses/creator/stages/ModuleEditorStage.tsx`
* **Features:**
  * Focused editor when a module node is selected.
  * Module Title, Detailed Description, Learning Objectives, Estimated Duration (minutes).
  * Module Reference Resources (PDF, PPTX, Guidelines).
  * Quick-launch cards: "Add an Instructional Lesson" or "Add a Module Knowledge Check".

### 2.2 Lesson & Sub-Lesson Editor Stage
* **File:** `frontend/src/components/features/courses/creator/stages/LessonEditorStage.tsx`
* **Features:**
  * Lesson Title and Duration.
  * Content Type Picker: `DOCUMENT`, `VIDEO`, `AUDIO`, `PRESENTATION`, `ASSIGNMENT`.
  * Context-sensitive body editor:
    * Document: Rich text editor (`RichEditor`).
    * Video/Audio/Presentation: Media resource uploader and URL embed.
    * Assignment: Submission prompt, accepted file extensions (`.pdf, .docx`), max marks.
  * Lesson reference attachments.
  * Child action: "Attach Lesson Checkpoint Assessment" or "Add Sub-Lesson".

### 2.3 Unified Assessment Editor Stage
* **File:** `frontend/src/components/features/courses/creator/stages/AssessmentEditorStage.tsx`
* **Features:**
  * Reusable builder for all 3 assessment tiers:
    * Lesson Assessment (e.g., 20% weight)
    * Module Assessment (e.g., 20% weight)
    * Final Assessment (e.g., 60% weight)
  * Assessment configuration: Title, Passing Score (%), Grade Weight (%), Time Limit, Max Attempts Allowed.
  * Interactive question bank builder:
    * Multiple Choice (dynamic options, correct option selector).
    * True / False (bilingual toggle).
    * Short Answer (exact text matching).
    * Dynamic Question Category lookup.

### 2.4 Review & Submit Stage
* **File:** `frontend/src/components/features/courses/creator/stages/ReviewSubmitStage.tsx`
* **Features:**
  * Full learner-perspective preview: Renders the entire course syllabus exactly as seen in the catalog and classroom overview.
  * Automated Pre-flight Validator:
    * Verifies module count ($\ge 1$).
    * Verifies lesson count per module.
    * Verifies total assessment weights sum to 100% (or warns appropriately).
    * Checks for unconfigured questions or missing titles.
  * "Submit for Approval" trigger with full toast and modal status updates.

### 2.5 Integration, Backward Compatibility & Verification
* **File:** `frontend/src/components/features/courses/CourseCreationWizard.tsx`
* **Features:**
  * Wrap `CourseCreatorShell` while maintaining identical props (`onDone`, `onCancel`, `editingCourse`).
  * Verify all 3 consumer views:
    1. `/course-owner/create-course`
    2. `/courses` (manual create modal)
    3. `CourseDetailModal` (edit draft/rejected course)
  * Run backend and frontend builds (`npm run build`) to ensure 0 TypeScript or lint errors.
  * End-to-end verification creating a new course with 20%/20%/60% assessments and delivery mode.

