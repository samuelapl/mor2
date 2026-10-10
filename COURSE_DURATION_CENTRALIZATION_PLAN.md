# Implementation Plan: Course Duration Centralization & Auto-Calculation

## 1. Executive Summary & Objective

Currently, course duration is calculated independently with duplicated, inconsistent loop algorithms across 7+ different frontend components (`CourseOverviewStage`, `ModuleOverviewStage`, `CourseCard`, `CatalogCourseModal`, `OverviewStage`, `StepReviewSubmit`, `CertificateStage`). Furthermore, module durations and course durations are not automatically synchronized when creators add or adjust lesson/sub-lesson study times.

This plan details the full implementation of a **centralized, bottom-up duration management system**:
1. **Hierarchical Auto-Aggregation**: Lesson & sub-lesson study times automatically aggregate into their parent Module duration. Module durations sum into the total Course duration.
2. **Assessment Exclusion**: Content items marked as assessments (`contentType === 'ASSESSMENT'` or quiz drafts) are excluded from instructional duration calculations.
3. **Database Persistence**: When a course is created or updated, the aggregated duration is saved directly to the database (`Course.estimatedHours` and `CurriculumModule.durationMinutes`).
4. **Smart Human-Readable Formatting**: Durations are formatted consistently (e.g., `< 60 min` displays as `45 mins`, `180 min` displays as `3 hrs`, `145 min` displays as `2 hrs 25 mins`), with full English and Amharic bilingual support.
5. **Universal Consistency**: All course cards, catalog listings, learner classroom overviews, certificates, and review screens consume this centralized utility.

---

## 2. Architecture & Calculation Rules

### A. Bottom-Up Calculation Rules
$$\text{Sub-lesson Duration} = \text{subLesson.durationMin} \quad (\text{if contentType } \neq \text{'ASSESSMENT'})$$
$$\text{Lesson Duration} = \text{lesson.durationMin} + \sum \text{Sub-lesson Durations} \quad (\text{if contentType } \neq \text{'ASSESSMENT'})$$
$$\text{Module Duration} = \sum \text{Lesson Durations in Module}$$
$$\text{Course Total Minutes} = \sum \text{Module Durations}$$
$$\text{Course Estimated Hours} = \text{round}\left(\frac{\text{Course Total Minutes}}{60}, 1\right)$$

### B. Formatting Rules
| Total Minutes | English Format | Amharic Format (`isAmharic = true`) |
| :--- | :--- | :--- |
| `0` or undefined | `Self-paced` | `በግል ፍጥነት` |
| `< 60 min` (e.g., `45`) | `45 mins` | `45 ደቂቃ` |
| Exact Hours (e.g., `180`) | `3 hrs` | `3 ሰዓታት` |
| Hours & Minutes (e.g., `145`) | `2 hrs 25 mins` | `2 ሰዓት 25 ደቂቃ` |
| Singular 1 Hour (e.g., `60`) | `1 hr` | `1 ሰዓት` |

---

## 3. Implementation Steps & File-by-File Changes

### Phase 1: Core Duration Utility
**File to create**: `frontend/src/lib/utils/duration.ts`
Implement robust, strongly-typed helper functions:

```typescript
export interface DurationItem {
  durationMin?: number;
  durationMinutes?: number;
  contentType?: string;
  subLessons?: DurationItem[];
  lessons?: DurationItem[];
}

/**
 * Calculates total instructional duration in minutes for a single lesson (including its sub-lessons).
 * Excludes assessment items.
 */
export function calculateLessonDuration(lesson: DurationItem): number {
  if (lesson.contentType === 'ASSESSMENT') return 0;
  const selfTime = lesson.durationMin || 0;
  const subLessonsTime = (lesson.subLessons || []).reduce(
    (acc, sub) => (sub.contentType === 'ASSESSMENT' ? acc : acc + (sub.durationMin || 0)),
    0,
  );
  return selfTime + subLessonsTime;
}

/**
 * Calculates total instructional minutes for a module by summing non-assessment lessons and sub-lessons.
 */
export function calculateModuleDuration(module: { lessons?: DurationItem[]; durationMinutes?: number }): number {
  const lessonSum = (module.lessons || []).reduce((acc, lesson) => acc + calculateLessonDuration(lesson), 0);
  return lessonSum > 0 ? lessonSum : (module.durationMinutes || 0);
}

/**
 * Calculates total course minutes across all modules.
 */
export function calculateCourseDuration(modules: Array<{ lessons?: DurationItem[]; durationMinutes?: number }>): number {
  if (!modules || modules.length === 0) return 0;
  return modules.reduce((acc, mod) => acc + calculateModuleDuration(mod), 0);
}

/**
 * Converts total minutes into Course.estimatedHours (rounded to 1 decimal place).
 */
export function calculateEstimatedHours(totalMinutes: number): number {
  if (!totalMinutes || totalMinutes <= 0) return 0;
  return Math.round((totalMinutes / 60) * 10) / 10;
}

/**
 * Formats minutes into clean, human-readable text with Amharic/English support.
 */
export function formatDuration(minutes: number, isAmharic = false): string {
  if (!minutes || minutes <= 0) {
    return isAmharic ? 'በግል ፍጥነት' : 'Self-paced';
  }

  const hrs = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;

  if (hrs === 0) {
    return isAmharic ? `${remainingMins} ደቂቃ` : `${remainingMins} mins`;
  }

  if (remainingMins === 0) {
    if (isAmharic) {
      return hrs === 1 ? '1 ሰዓት' : `${hrs} ሰዓታት`;
    }
    return hrs === 1 ? '1 hr' : `${hrs} hrs`;
  }

  return isAmharic
    ? `${hrs} ሰዓት ${remainingMins} ደቂቃ`
    : `${hrs} hr${hrs > 1 ? 's' : ''} ${remainingMins} mins`;
}

/**
 * Helper to format directly from hours (e.g. Course.estimatedHours in database).
 */
export function formatHours(hours: number | null | undefined, isAmharic = false): string {
  if (!hours || hours <= 0) return isAmharic ? 'በግል ፍጥነት' : 'Self-paced';
  return formatDuration(Math.round(hours * 60), isAmharic);
}
```

---

### Phase 2: Course Creator Auto-Aggregation & Persistence
**File**: `frontend/src/components/features/courses/creator/CourseCreatorShell.tsx`
1. **Live State Synchronization**:
   - Whenever lessons or sub-lessons are added, updated, or removed, auto-update the parent module's `durationMinutes` in state:
     ```typescript
     const computedModDuration = calculateModuleDuration(mod);
     ```
2. **Payload Serialization**:
   - In `handleSaveCourse()` and `buildCoursePayload()`:
     - Automatically calculate `totalCourseMinutes = calculateCourseDuration(modules)`.
     - Set `estimatedHours: calculateEstimatedHours(totalCourseMinutes)`.
     - Set each module's `durationMinutes: calculateModuleDuration(m)`.
   - Send `estimatedHours` in the payload to the backend API (`POST /api/courses` or `PATCH /api/courses/:id`).
3. **Module Editor UI**:
   - In `ModuleEditorStage.tsx`, display the auto-calculated duration badge (e.g. `Auto-calculated: 45 mins from 3 lessons`).

---

### Phase 3: Course Review & Publishing Pages
Update creator review stages to use `calculateCourseDuration` and `formatDuration`:
1. **`frontend/src/components/features/courses/review/stages/OverviewStage.tsx`**:
   - Replace manual lines 50–65 loops with `calculateCourseDuration(course.modules)`.
   - Format with `formatDuration(minutes, isAmharic)`.
2. **`frontend/src/components/features/courses/review/stages/ModuleStage.tsx`**:
   - Replace module duration sum with `calculateModuleDuration(module)`.
3. **`frontend/src/components/features/courses/StepReviewSubmit.tsx`**:
   - Replace lines 531–545 with `calculateCourseDuration(modules)`.

---

### Phase 4: Learner & Catalog Pages
Update all cards and modals to display the standardized format:

1. **Course Card Component**:
   - **`frontend/src/components/features/courses/CourseCard.tsx`**:
     - Check if `course.estimatedHours` exists: format with `formatHours(course.estimatedHours, isAmharic)`.
     - Otherwise fallback to `formatDuration(calculateCourseDuration(course.modules), isAmharic)`.
     - Replace hardcoded `{durationMin} min` with the formatted string (e.g., `3 hrs` instead of `180 min`).
2. **Course Catalog Modal & Detail**:
   - **`frontend/src/components/features/courses/CatalogCourseModal.tsx`**:
     - Replace lines 195–203 with `calculateCourseDuration(course.modules)`.
     - Display duration formatted with `formatDuration(...)`.
   - **`frontend/src/components/features/courses/detail/CourseCurriculumSection.tsx`**:
     - Standardize lesson and module duration badges.
3. **Learner Dashboard**:
   - **`frontend/src/app/(dashboard)/learner/page.tsx`**:
     - Use `formatDuration` or `formatHours` for enrolled course cards.
4. **Trainer & Admin Dashboards**:
   - **`frontend/src/app/(dashboard)/trainer/page.tsx`** & **`frontend/src/app/(dashboard)/training-admin/page.tsx`**:
     - Use `formatDuration` for course table columns and metrics cards.

---

### Phase 5: Classroom Learner Experience
1. **`frontend/src/components/features/classroom/stage/CourseOverviewStage.tsx`**:
   - Replace lines 45–57 with:
     ```typescript
     const totalDurationMin = calculateCourseDuration(course.modules);
     ```
   - Update line 114 to:
     ```typescript
     <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
       {formatDuration(totalDurationMin, isAmharic)}
     </p>
     ```
2. **`frontend/src/components/features/classroom/stage/ModuleOverviewStage.tsx`**:
   - Replace lines 30–33 with `calculateModuleDuration(module)`.
   - Display `formatDuration(totalDurationMin, isAmharic)`.
3. **`frontend/src/components/features/classroom/stage/CertificateStage.tsx`**:
   - Replace lines 184–190 with `calculateEstimatedHours(calculateCourseDuration(course.modules))`.

---

### Phase 6: Backend Verification
1. **Schema Check**:
   - `backend/prisma/schema.prisma` already defines:
     - `Course.estimatedHours Float? @map("estimated_hours")`
     - `CurriculumModule.durationMinutes Int? @map("duration_minutes")`
     - `CurriculumLesson.durationMinutes Int? @map("duration_minutes")`
2. **DTO & Service Verification**:
   - In `backend/src/modules/courses/dto/create-course.dto.ts` & `update-course.dto.ts`, ensure `estimatedHours` is accepted as an optional float.
   - In `backend/src/modules/courses/courses.service.ts`:
     - Verify `estimatedHours` is saved and returned on course queries.
     - Add a fallback auto-calculation during course creation/update in `courses.service.ts` if `estimatedHours` is not explicitly supplied by client.

---

## 4. Verification & Testing Checklist

- [ ] **Assessment Exclusion**: Add 3 lessons (15 mins each) and 1 module assessment. Total module duration must equal `45 mins` (not 60 mins).
- [ ] **Time Conversion (< 60 min)**: A course with 45 minutes of content displays as `45 mins` (Amharic: `45 ደቂቃ`).
- [ ] **Time Conversion (Exact Hours)**: A course with 180 minutes displays as `3 hrs` (Amharic: `3 ሰዓታት`), not `180 min`.
- [ ] **Time Conversion (Mixed)**: A course with 145 minutes displays as `2 hrs 25 mins` (Amharic: `2 ሰዓት 25 ደቂቃ`).
- [ ] **Catalog & Card Consistency**: The course card on the learner dashboard, course catalog modal, and classroom overview stage all show identical duration strings.
- [ ] **Course Save & DB Check**: Saving a course sends `estimatedHours` in the payload and persists to the database.
- [ ] **TypeScript Check**: Run `npx tsc --noEmit` across frontend with zero errors.

