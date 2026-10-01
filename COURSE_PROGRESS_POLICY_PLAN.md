# MoR LMS - Implementation Plan: Course Progress Policy (Locked vs. Open Progression)

**Version:** 1.0  
**Target:** MoR e-Learning Management System (`mor2`)  
**Scope:** Root Workspace (`backend/` & `frontend/`)  
**Date:** October 2026  

---

## 1. Executive Summary & Architectural Overview

### 1.1 Objective
Introduce a configurable **Course Progress Policy** inside the System Admin Policy Settings (`Course Completion Policies` tab). The policy gives administrators control over learner progression style across courses with two distinct options:

1. **Locked Progression (Sequential - Default):**
   - Current LMS behavior.
   - Learners must complete modules, lessons, and required quizzes sequentially in chronological order.
   - Subsequent modules and lessons remain locked until preceding prerequisite lessons/modules are completed and passed.

2. **Open Progression (Flexible / Self-Paced):**
   - All modules, lessons, sub-lessons, and module/lesson checkpoint quizzes are immediately unlocked and open to access.
   - Learners can browse, study, watch videos, and take module/lesson assessments in any sequence according to their learning preference.
   - **Strict Capstone Gating:** The **Final Assessment** and **Course Certificate** remain strictly locked until **100% of all preceding modules and lessons** in the course have been completed.
   - **Explicit Learner Feedback:** When a learner attempts to open or start the Final Assessment before completing all prerequisite lessons, the system blocks them with an explicit feedback dialog listing uncompleted modules/lessons: *"You have uncompleted modules or lessons. Complete all prerequisite content before taking the final assessment."*

---

## 2. Implementation Phasing Strategy

To ensure zero downtime, high reliability, and clear incremental testing, the feature is structured into **2 sequential phases**:

```mermaid
flowchart TD
    subgraph Phase 1: Backend Data Model & Core Policy Gating Engine
        P1_1[1.1 Prisma Schema & Enum Migration] --> P1_2[1.2 Policy Service & DTO Updates]
        P1_2 --> P1_3[1.3 Unlock Utility Progression Mode Engine]
        P1_3 --> P1_4[1.4 Progress & Curriculum Access Gating]
        P1_4 --> P1_5[1.5 Assessment Attempt Gating & Final Assessment Check]
        P1_5 --> P1_6[1.6 Backend Test Suite & Verification]
    end

    subgraph Phase 2: Admin Policy Management UI & Learner Classroom Experience
        P2_1[2.1 Frontend Policy API Client] --> P2_2[2.2 Admin Policy UI Accordion / Selector]
        P2_2 --> P2_3[2.3 Classroom Navigation & Sidebar Unlock State]
        P2_3 --> P2_4[2.4 LearnCourseModal & CourseDetailModal Adaptation]
        P2_4 --> P2_5[2.5 Final Assessment Prerequisite Validation Modal / Banner]
        P2_5 --> P2_6[2.6 End-to-End Functional & Bilingual Verification]
    end

    Phase 1 --> Phase 2
```

---

## 3. Phase 1: Backend Data Model, Policy Settings API & Unlock Engine

> **Goal:** Establish the database schema, administrative policy API, and server-side authorization enforcement for Open vs. Locked progression.

### 3.1 Database Schema & Migration
* **File:** `backend/prisma/schema.prisma`
* **Changes:**
  - Define enum `CourseProgressionMode`:
    ```prisma
    enum CourseProgressionMode {
      LOCKED
      OPEN
    }
    ```
  - Extend `model CoursePolicySettings`:
    ```prisma
    model CoursePolicySettings {
      id                    String                @id @default("default")
      timeSpentPercent      Float                 @default(50) @map("time_spent_percent")
      retakeCooldownMinutes Int                   @default(0) @map("retake_cooldown_minutes")
      progressionMode       CourseProgressionMode @default(LOCKED) @map("progression_mode")
      updatedAt             DateTime              @updatedAt @map("updated_at")
      updatedBy             String?               @map("updated_by")

      @@map("course_policy_settings")
    }
    ```
  - Run database migration:
    `cd backend && npx prisma migrate dev --name add_course_progression_mode`

### 3.2 Policy Module DTO & Service
* **Files:**
  - `backend/src/modules/policy/dto/update-policy.dto.ts`
  - `backend/src/modules/policy/policy.service.ts`
* **Changes:**
  - In `UpdatePolicyDto`: Add `@IsOptional()` and `@IsEnum(CourseProgressionMode)` for `progressionMode`.
  - In `PolicyService`:
    - Persist `progressionMode` in `updateSettings()`.
    - Provide helper method `getProgressionMode(): Promise<CourseProgressionMode>`.

### 3.3 Unlock Utility Refactoring
* **Files:**
  - `backend/src/common/utils/unlock.util.ts`
  - `backend/src/common/utils/unlock.util.spec.ts`
* **Changes:**
  - Update `computeSequentialUnlocks()` to accept optional `mode: 'LOCKED' | 'OPEN' = 'LOCKED'`:
    - If `mode === 'OPEN'`:
      - All `moduleUnlocked.set(mod.id, true)`
      - All `lessonUnlocked.set(lesson.id, true)` and sub-lessons `true`
    - If `mode === 'LOCKED'`:
      - Preserve existing sequential order calculations.
  - Add comprehensive unit tests in `unlock.util.spec.ts` covering both `LOCKED` and `OPEN` configurations.

### 3.4 Curriculum & Progress Service Authorization
* **Files:**
  - `backend/src/modules/progress/progress.service.ts`
  - `backend/src/modules/curriculum/curriculum.service.ts`
  - `backend/src/modules/courses/courses.service.ts`
* **Changes:**
  - In `progress.service.ts`:
    - Inject `PolicyService` to retrieve active `progressionMode`.
    - In `getCourseProgress()`: Pass `progressionMode` to `computeSequentialUnlocks()`.
    - Include `progressionMode` in the returned payload so the client knows which mode is active.
    - In `assertLessonUnlocked()`: If `progressionMode === 'OPEN'`, skip sequential checks (allowing time tracking and completion for any lesson).
  - In `curriculum.service.ts`:
    - In `getLesson(id, user)`: If `progressionMode === 'OPEN'`, bypass the `ForbiddenException` lock check so learners can read any lesson content.
  - In `courses.service.ts`:
    - In `getCourseWithCurriculum()`: Ensure returned modules/lessons reflect `unlocked: true` when `progressionMode === 'OPEN'`.

### 3.5 Assessment Gating & Final Assessment Eligibility Check
* **File:** `backend/src/modules/assessments/assessments.service.ts`
* **Changes:**
  - In `assertTargetUnlocked()`:
    - If `progressionMode === 'OPEN'`, permit learners to take module assessments and lesson assessments freely.
  - In `assertFinalEligible(courseId, userId)`:
    - Strictly enforce that **all** modules, lessons, and sub-lessons are completed.
    - Check for any uncompleted lessons/sub-lessons.
    - If uncompleted content exists, throw `ForbiddenException` with detailed metadata:
      ```ts
      throw new ForbiddenException({
        reason: 'PREREQUISITES_INCOMPLETE',
        message: 'You have uncompleted modules or lessons. Complete all prerequisite content before taking the final assessment.',
        incompleteCount: uncompletedLessons.length,
        incompleteLessons: uncompletedLessons.map(l => ({ id: l.id, title: l.title })),
      });
      ```

---

## 4. Phase 2: Admin UI Policy Management & Learner Classroom Experience

> **Goal:** Deliver the administrative accordion interface for setting the policy and upgrade learner-facing interfaces (Classroom and Modals) with responsive unlocking and actionable gating feedback.

### 4.1 Frontend Policy API Client
* **File:** `frontend/src/lib/api/policy.ts`
* **Changes:**
  - Add `progressionMode: 'LOCKED' | 'OPEN'` to `CoursePolicySettings` interface and `UpdateCoursePolicyPayload`.

### 4.2 Admin Policy Settings Screen UI (Accordion / Card Selector)
* **File:** `frontend/src/app/(dashboard)/system-admin/policies/page.tsx`
* **Changes:**
  - Under the **"Course Completion Policies"** tab, introduce a dedicated section: **Course Progress Policy** (`Course Progression Mode`).
  - Implement two interactive accordion / radio-card options:
    1. **Locked Progression (Sequential)**:
       - Icon: `Lock` / `ShieldCheck`
       - Title (Bilingual): *Locked Progression (የተቆለፈ የትምህርት ቅደም ተከተል)*
       - Description: *Learners must complete modules, lessons, and quizzes in strict sequential order. Next content unlocks only upon completing preceding prerequisites.*
    2. **Open Progression (Flexible / Self-Paced)**:
       - Icon: `Compass` / `Unlock`
       - Title (Bilingual): *Open Progression (ክፍት የትምህርት ቅደም ተከተል)*
       - Description: *All modules, lessons, and lesson assessments are open to explore in any order. The Final Assessment and Certificate remain locked until all course content is 100% completed.*
  - Connect state to `saveCoursePolicy()` with toast notification and bilingual support.

### 4.3 Classroom Navigation & Sidebar (`ClassroomShell` & `ClassroomSidebar`)
* **Files:**
  - `frontend/src/components/features/classroom/hooks/useClassroomNavigation.ts`
  - `frontend/src/components/features/classroom/ClassroomSidebar.tsx`
* **Changes:**
  - In `useClassroomNavigation.ts`:
    - When `progressionMode === 'OPEN'`, set `unlocked: true` on module overviews, lessons, sub-lessons, and module checkpoint quizzes.
    - Keep `quizKind === 'FINAL_ASSESSMENT'` and `type === 'CERTIFICATE'` strictly locked to `contentCompleted`.
  - In `ClassroomSidebar.tsx`:
    - In Open mode, remove lock icons and disabled states from modules, lessons, and checkpoint quizzes.
    - Make the Final Assessment item interactive even when locked:
      - If locked and clicked, display the uncompleted content dialog or toast rather than silently ignoring the click.

### 4.4 Learner Modals (`LearnCourseModal.tsx` & `CourseDetailModal.tsx`)
* **Files:**
  - `frontend/src/components/features/courses/LearnCourseModal.tsx`
  - `frontend/src/components/features/courses/CourseDetailModal.tsx`
* **Changes:**
  - In `LearnCourseModal.tsx`:
    - Remove artificial locks on lessons and module quizzes when in Open Progression mode.
    - For the **Final Assessment Card**:
      - When `!contentCompleted`, show a clickable state or clear helper text.
      - Clicking "Start Final Assessment" when uncompleted presents a modal:
        - Header: *Prerequisites Incomplete*
        - Body: *You have uncompleted modules or lessons. Complete all prerequisite lessons and quizzes before attempting the Final Assessment.*
        - Action: Quick button to navigate to the first uncompleted lesson.
  - In `CourseDetailModal.tsx`:
    - Update syllabus preview to display unlocked indicators appropriate to the course progression policy.

### 4.5 Verification & End-to-End Testing
* **Validation Steps:**
  1. Set policy to **Locked Progression**:
     - Verify new learner can only access Module 1, Lesson 1.
     - Verify later lessons show locked badges and return 403 on API call.
  2. Switch policy to **Open Progression**:
     - Log in as learner; verify all modules, lessons, and module quizzes can be opened and viewed immediately.
     - Attempt to take Lesson 3 quiz without taking Lesson 1: should be allowed.
     - Attempt to open Final Assessment: should be blocked with the informative dialog detailing uncompleted lessons.
     - Complete all lessons (satisfying required time): verify Final Assessment unlocks.
     - Pass Final Assessment: verify Certificate unlocks and can be claimed/downloaded.
  3. Verify bilingual rendering (English / Amharic) across all new UI elements and messages.

---

## 5. Summary of Files Affected

| Component | Path | Action |
| :--- | :--- | :--- |
| **Prisma Schema** | `backend/prisma/schema.prisma` | Add `CourseProgressionMode` enum and field |
| **Policy DTO** | `backend/src/modules/policy/dto/update-policy.dto.ts` | Add `progressionMode` validation |
| **Policy Service** | `backend/src/modules/policy/policy.service.ts` | Handle persistence and accessor |
| **Unlock Engine** | `backend/src/common/utils/unlock.util.ts` | Support open vs sequential unlock |
| **Unlock Tests** | `backend/src/common/utils/unlock.util.spec.ts` | Unit tests for both progression modes |
| **Progress Service** | `backend/src/modules/progress/progress.service.ts` | Integrate policy in unlock context |
| **Curriculum Service** | `backend/src/modules/curriculum/curriculum.service.ts` | Gate lesson access by progression mode |
| **Assessments Service** | `backend/src/modules/assessments/assessments.service.ts` | Gate quizzes & final assessment eligibility |
| **Courses Service** | `backend/src/modules/courses/courses.service.ts` | Format course tree with unlock flags |
| **Policy API** | `frontend/src/lib/api/policy.ts` | Add TypeScript types & API payloads |
| **Admin Policy UI** | `frontend/src/app/(dashboard)/system-admin/policies/page.tsx` | Add Course Progress Policy accordion |
| **Classroom Nav Hook** | `frontend/src/components/features/classroom/hooks/useClassroomNavigation.ts` | Mark items unlocked in open mode |
| **Classroom Sidebar** | `frontend/src/components/features/classroom/ClassroomSidebar.tsx` | Unlocked states & final quiz click handler |
| **Learn Course Modal** | `frontend/src/components/features/courses/LearnCourseModal.tsx` | Missing prerequisites feedback modal |
| **Course Detail Modal** | `frontend/src/components/features/courses/CourseDetailModal.tsx` | Reflect progression badges |
