# SCORM Implementation Plan
## Two-Phase Alignment with Manual Course Preparation Method

**Goal**: Implement SCORM package upload and processing that aligns perfectly with the existing manual course preparation flow: **Course Detail → Objective → Lesson → Sub-lesson**

---

## Overview
The existing manual course creation flow is fully preserved. SCORM adds a new *content source* (ZIP package) while keeping the exact same curriculum structure, progress tracking, and certification requirements.

> **Key Principle**: SCORM lessons use the **exact same Prisma models, services, and classroom components** as manual lessons. Only the content storage and parsing layer differs.

---

## Phase 1: Backend SCORM Service & API
*Focus: Extract SCORM package metadata and create lessons aligned with manual flow*

### 1.1 Create SCORM Service (`backend/src/modules/courses/scorem.service.ts`)

| Task | Description | Alignment |
|------|-------------|-----------|
| `extractManifest(zipPath: string)` | Parse `imsmanifest.xml` from uploaded ZIP | Extracts package title, objectives, activities, sequencing |
| `parseActivities(manifest: any)` | Transform SCORM activities into lesson data | Maps to `Lesson` model fields: `title`, `contentType: SCORM`, `objectives` |
| `parseSequencing(manifest: any)` | Transform SCORM sequencing into lesson structure | Maps to sub-lesson sequence, rollup rules, mastery settings |
| `getPackageMetadata(manifest: any)` | Extract org metadata, description, keywords | Maps to course detail fields for auto-population |

### 1.2 Add SCORM Endpoint (`backend/src/modules/files/files.controller.ts`)

| Task | Description | Alignment |
|------|-------------|-----------|
| `POST /files/upload-scorm` | Accept `purpose: 'scorm'` + course ID | Same endpoint, but returns parsed metadata instead of just file URL |
| Response format: | ```json { "courseTitle": "string", "lessons": [{ "title": "string", "objectives": [], "duration": number }], "activityCount": number }``` | Frontend uses this to pre-populate the manual creation wizard |

### 1.3 Update Course Service Integration (`backend/src/modules/courses/courses.service.ts`)

| Task | Description | Alignment |
|------|-------------|-----------|
| `createCourseFromScorm(scormData: any, userId: string)` | Create course with modules/lessons from parsed SCORM data | **Identical to manual flow**: creates course → modules → lessons with `contentType: SCORM` |
| `formatLessonFromScorm(lessonData: any)` | Format lesson for Prisma creation | Uses same DTOs as manual lesson creation → `createLessonDto` |
| `validateScormLessons(lessons: Lesson[])` | Validate that all lessons have required objectives | Same validation rules as manual lessons |

### 1.4 Update Prisma Seed (Optional)

| Task | Description | Alignment |
|------|-------------|-----------|
| Add SCORM course seed example | Demonstrate SCORM → course conversion | Shows how SCORM data maps to existing course structure |

---

## Phase 2: Frontend SCORM Upload & Course Creation
*Focus: Upload SCORM ZIP and auto-populate the manual creation wizard*

### 2.1 Replace SCORM Placeholder (`frontend/src/app/(dashboard)/course-owner/create-course/page.tsx`)

| Task | Description | Alignment |
|------|-------------|-----------|
| Replace "coming soon" text | Show SCORM upload component | Same page layout as manual creation, just different step 1 option |
| Add SCORM ZIP file selector | `input type="file"` accept `.zip` | User uploads package, same as attaching resources in manual flow |

### 2.2 Build SCORM Upload Component (`frontend/src/components/courses/ScormUpload.tsx`)

| Task | Description | Alignment |
|------|-------------|-----------|
| File drag-and-drop or browse | Upload SCORM ZIP (200MB max) | Same size limit as manual file uploads |
| Package metadata preview | Display: package title, # of activities, estimated duration | Populates **Course Detail** step of the wizard identically to manual entry |
| "Auto-create lessons from SCORM" checkbox | When checked, pre-fills Modules/Lessons steps | **Direct alignment**: same as manually adding modules/lessons, just auto-populated |

### 2.3 Update Course Creation Wizard (`frontend/src/components/features/courses/CourseCreationWizard.tsx`)

| Task | Description | Alignment |
|------|-------------|-----------|
| Add `creationMode: 'scorm'` state | Parallel to existing `'manual'` mode | Wizard steps remain: **Course Detail → Objectives → Lessons → Assessment** |
| Step 1 (Course Detail): | - If manual: form fields<br>- If SCORM: show preview from uploaded ZIP | **Identical flow**, different data source |
| Step 2 (Curriculum/Modules): | - If manual: add modules manually<br>- If SCORM: lessons already created from parsing | **Same curriculum structure**, just pre-populated |
| Step 3 (Lessons): | - Review/editing of auto-created lessons<br>- Add objectives, resources same as manual | **Lesson editing interface unchanged** |
| Step 4 (Assessment): | Same quiz creation flow | **Identical** to manual course creation |

### 2.4 Integrate with LMS Store (`frontend/src/lib/lms-store.tsx`)

| Task | Description | Alignment |
|------|-------------|-----------|
| `normalizeLessonContentType` | Already handles `SCORM` (per exploration) | No changes needed - SCORM lessons render same as manual |
| `useCourseProgress` | Already loads `contentType` | SCORM lesson progress tracked via same `addLessonTime`, `isTimeSatisfied` |

### 2.5 Classroom Rendering (No Changes Required)

| Task | Description | Alignment |
|------|-------------|-----------|
| `mobile/src/features/classroom/components/ClassroomStage.tsx` | `case 'SCORM':` renders via `WebContentStage` | **Zero changes** - SCORM content plays in same player |
| `frontend/src/components/courses/lesson/ LessonContentRenderer.tsx` | Already checks `contentType` | SCORM content shows WebContentStage with SCORM player |

---

## Data Alignment Summary

| Manual Flow | SCORM Flow | Alignment |
|-------------|------------|-----------|
| **Course Creation Wizard** | Form fields + SCORM ZIP upload | Same 4 steps, same validation |
| **Course Detail** | Title, code, description + SCORM metadata | SCORM metadata auto-fills course detail fields |
| **Course Objectives** | Manually entered objectives + SCORM package objectives | Both stored in same `Lesson.objectives` field |
| **Module Creation** | Add module → add lesson manually | SCORM: parsing creates modules/lessons auto-identically |
| **Lesson Creation** | Set contentType, upload resources | SCORM: `contentType: SCORM` + content reference in MinIO |
| **Sublesson/Activities** | Sequential steps, completion tracking | SCORM: `cmi.core.lesson_status` + time-spent policy same tracking |
| **Progress Tracking** | `addLessonTime()`, `isTimeSatisfied()` | Same functions, same 50% ratio, same 5s min for short courses |
| **Assessment/ certification** | Pass marks (70%/75%), weighted grade ≥ 50% | Same certificate requirements, same grade calculation |
| **Classroom Rendering** | WebContentStage per lesson | Same component, SCORM content differs by `contentType` flag |

---

## Implementation Checklist

### Phase 1 Backend ✅
- [ ] Create `scorem.service.ts` with manifest extraction & activity parsing
- [ ] Add `POST /files/upload-scorm` endpoint returning parsed lesson data
- [ ] Update `courses.service.ts` with `createCourseFromScorm()` using identical flow
- [ ] Test: Upload SCORM ZIP → Course created with same structure as manual

### Phase 2 Frontend ✅
- [ ] Replace SCORM placeholder in create-course page with upload component
- [ ] Build `ScormUpload.tsx` with preview and "auto-create lessons" option
- [ ] Update `CourseCreationWizard.tsx` to handle `creationMode: 'scorm'`
- [ ] Verify wizard steps align: Course Detail → Objectives → Lessons → Assessment
- [ ] Test end-to-end: Upload SCORM → Create course → Open in classroom → Progress tracked

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| SCORM package format variance | Parse `imsmanifest.xml` strictly; fallback to manual entry if parsing fails |
| Large ZIP uploads (>200MB) | Enforce 200MB limit at API gate + frontend progress bar |
| Missing objectives in SCORM package | Allow manual objective entry after SCORM parsing (hybrid mode) |
| Course grade calculation differences | SCORM lessons use same `computeCourseGrade()` - no changes needed |
| Certification requirements | Same `certificateReady` logic - SCORM lessons pass/fail identically |

---

## Success Criteria

✅ Upload SCORM ZIP → Course created with **identical** module/lesson structure as manual  
✅ All lessons have `contentType: SCORM` but use **same Prisma models**  
✅ Progress tracking, time-spent policy, and certification work **exactly** as manual  
✅ Classroom rendering via **unchanged** `WebContentStage`  
✅ Wizard steps: **Course Detail → Objectives → Lessons → Assessment** preserved  
✅ Learner experience: **No difference** between SCORM and manually created courses

---
*Plan version: 1.0 | Aligned with manual course preparation flow: Course Detail → Objective → Lesson → Sub-lesson*