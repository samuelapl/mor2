# Course Assessment Weighting & Global Pass Mark Architecture Plan

## Executive Summary
This document outlines the end-to-end architecture and implementation plan for introducing **Course Assessment Weighting** (summing to 100%) and a **Global Pass Mark Policy** (dual-threshold gating for individual assessments and final course certification).

---

## 1. System Architecture & Mathematical Model

### 1.1 Dual-Threshold Evaluation Model
1. **Per-Assessment Gating:**
   - Every assessment in a course (Lesson Quizzes, Module Quizzes, and Final Assessment) evaluates against the **Global Pass Mark Policy** (e.g., $50\%$).
   - A learner must achieve $\text{Score}_i \ge \text{GlobalPassMark}$ to pass that assessment and fulfill its completion requirement.
   - If $\text{Score}_i < \text{GlobalPassMark}$, the learner is prompted to retake the assessment (up to configured max attempts).

2. **Weighted Cumulative Grade Model:**
   - Every assessment has an assigned integer weight $W_i \in [1, 100]$ such that:
     $$\sum_{i=1}^N W_i = 100\%$$
   - The learner's cumulative course grade is computed from the best valid attempt of each assessment:
     $$\text{Total Course Grade} = \sum_{i=1}^N \left( \text{BestScore}_i \times \frac{W_i}{100} \right)$$

3. **Certificate Issuance Triple-Check:**
   A certificate is unlocked and issued if and only if:
   - **Criteria 1 (Content):** All course curriculum lessons/sub-lessons and required time criteria are satisfied (`contentCompleted === true`).
   - **Criteria 2 (Per-Assessment):** Every required assessment is individually passed (`\forall i, \text{passed}_i === true`).
   - **Criteria 3 (Overall Grade):** $\text{Total Course Grade} \ge \text{GlobalPassMark}$.

---

## 2. Implementation Phases

```
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Backend Data Model, Global Policy & Weighted Scoring Engine   │
├────────────────────────────────────────────────────────────────────────┤
│ • Prisma Schema: Add `passingScorePercent` to CoursePolicySettings     │
│ • Prisma Schema: Add `weight` (Int @default(0)) to Assessment          │
│ • Policy Module: Update DTO, Service, Controller for Global Pass Mark  │
│ • Assessment Engine: Weight validation (sum = 100%) on Course Publish  │
│ • Progress Service: Cumulative weighted score & 3-point cert gating    │
│ • Automated Unit Tests: Gating, weighted calculations, fallbacks      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Frontend Policy UI, Wizard Allocator & Learner Breakdown      │
├────────────────────────────────────────────────────────────────────────┤
│ • System Admin: Pass Mark Policy Card in `policies/page.tsx`           │
│ • Course Wizard: Assessment Weight Allocator & live 100% progress bar  │
│ • Course Wizard: StepCurriculum & StepFinalAssessment weight inputs    │
│ • StepReviewSubmit: Weight summary table and 100% validation check     │
│ • LearnCourseModal & DetailModal: Weight, Score & Grade Breakdown UI   │
│ • Verification: End-to-end lint, test suites, and Next.js/Nest builds  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Backend Data Model, Global Policy & Weighted Scoring Engine

### 1.1 Database Schema Enhancements (`backend/prisma/schema.prisma`)
1. **`CoursePolicySettings`**:
   - Add `passingScorePercent Int @default(50) @map("passing_score_percent")` (percentage 1–100, default 50%).
2. **`Assessment`**:
   - Add `weight Int @default(0) @map("weight")` (percentage 0–100).
   - If a course has only one assessment (e.g. final assessment), weight defaults to `100`.
3. **Run Prisma Migration**:
   - `npx prisma db push` or migration generation to keep DB in sync without data loss.

### 1.2 System Admin Course Policy Module
1. **`backend/src/modules/policy/dto/update-policy.dto.ts`**:
   - Add `@IsOptional() @IsInt() @Min(1) @Max(100) passingScorePercent?: number;`.
2. **`backend/src/modules/policy/policy.service.ts`**:
   - Support reading and updating `passingScorePercent`.
   - Provide helper method `getGlobalPassingScore(): Promise<number>`.

### 1.3 Assessment Creation & Validation Engine
1. **`backend/src/modules/assessments/dto/create-assessment.dto.ts`**:
   - Add `@IsOptional() @IsInt() @Min(0) @Max(100) weight?: number;`.
2. **`backend/src/modules/assessments/assessments.service.ts`**:
   - When grading submissions (`submit`), resolve the pass mark against the global policy `passingScorePercent` (or fallback to assessment-level score if explicitly overridden).
   - Add validation helper: `validateCourseAssessmentWeights(courseId: string)`.
     - When a course has $\ge 1$ assessments, verify $\sum W_i = 100$.
     - Provide automatic fallback: If all assessments have `weight === 0` (legacy courses), allocate weights evenly ($100 / N$).

### 1.4 Progress Service & Certificate Engine
1. **`backend/src/modules/progress/progress.service.ts`**:
   - In `getCourseProgress`:
     - Calculate each assessment's weighted contribution: $\text{contrib}_i = \text{bestScore}_i \times (W_i / 100)$.
     - Compute `totalCourseGrade = Math.round(sum(contrib_i))`.
     - Expose `assessmentGrades` breakdown and `totalCourseGrade` in the progress response.
   - In `maybeCompleteCourse`:
     - Verify:
       1. `completedLessons === totalLessons`
       2. Every assessment has `bestScore >= globalPassingScore`
       3. `totalCourseGrade >= globalPassingScore`
     - Only if all 3 pass, mark enrollment `COMPLETED` and trigger `maybeIssueForCompletion`.

### 1.5 Unit & Integration Testing
- Add tests in `backend/src/modules/assessments/assessments-gating.spec.ts`:
  - Assessment graded as failed if below global pass mark.
  - Retakes permitted up to max attempts.
  - Final course grade accurately calculated using weights.
  - Certificate issued only when overall weighted score and all individual assessments pass.

---

## Phase 2: Frontend Wizard Weight Allocator, Policy UI & Learner Grade Breakdown

### 2.1 System Admin Policy Management (`frontend/src/app/(dashboard)/system-admin/policies/page.tsx`)
1. **Global Pass Mark Policy Card**:
   - Visual slider/input for `passingScorePercent` (e.g. 50%, with preset chips: 50%, 60%, 70%, 75%, 80%).
   - Explanation banner: *"This pass mark applies to all quizzes and assessments across the platform, and governs certification eligibility."*
   - Save button with toast feedback and immediate synchronization.
2. **API Client (`frontend/src/lib/api/policy.ts`)**:
   - Update `ApiCoursePolicy` and payload types to include `passingScorePercent`.

### 2.2 Course Creation Wizard: Assessment Weight Allocator
1. **State & Types (`wizard-types.ts`)**:
   - Add `weight?: number` to `LessonDraft` (for quiz lessons) and Final Assessment settings.
2. **Interactive Weight Allocator in `StepCurriculum.tsx` & `StepFinalAssessment.tsx`**:
   - For each quiz/assessment created, display a **Weight (%)** input.
   - Display a persistent **Total Assessment Weight Bar**:
     - Visual badge: `Current Total: 80% / 100%` (Amber if $<100\%$, Red if $>100\%$, Green if $=100\%$).
     - One-click "Distribute Evenly" button (automatically divides 100% among all active assessments).
3. **Review & Publish Safeguards (`StepReviewSubmit.tsx`)**:
   - Add an Assessment Weight Breakdown table in the review step.
   - Disable the "Publish Course" button if assessments exist and total weight $\ne 100\%$, with an explanatory tooltip and link to fix weights.

### 2.3 Learner Classroom & Grade Breakdown UI
1. **Classroom View (`frontend/src/components/features/courses/LearnCourseModal.tsx`)**:
   - Header Grade Pill: Shows learner's current weighted score (e.g. `Current Grade: 78% (Pass Mark: 50%)`).
   - Assessment Cards:
     - Displays: `Score: 80%` | `Weight: 20%` | `Earned: 16.0%`.
     - Passing status badge: `Passed` (green) or `Retake Needed (Must reach 50%)` (amber).
2. **Course Detail Modal (`frontend/src/components/features/courses/CourseDetailModal.tsx`)**:
   - Show curriculum assessment list with their respective grade weights (e.g. `Module 1 Quiz (20%)`, `Final Exam (60%)`).

### 2.4 End-to-End Build & Validation
- Run full typecheck and production builds:
  - `cd backend && npm test && npm run build`
  - `cd frontend && npm run build`
- Verify backwards compatibility with courses that have 0 or 1 assessment.

---

## 3. Summary of Deliverables & Verification Checklist

| Milestone | Key Deliverable | Verification Check |
|---|---|---|
| **Phase 1** | `CoursePolicySettings.passingScorePercent` & `Assessment.weight` schema | Prisma migration applied cleanly |
| **Phase 1** | Global Policy API & Service updates | Pass mark stored & fetched via API |
| **Phase 1** | Weighted scoring calculation & 3-criteria cert gating | Backend unit tests pass (100% green) |
| **Phase 2** | System Admin Global Pass Mark UI | Admin can modify and persist pass mark |
| **Phase 2** | Course Creation Wizard Weight Allocator | Live 100% total validation & auto-split button |
| **Phase 2** | Learner weighted grade breakdown in classroom modal | Visual points earned & pass/retake indicators |
| **Phase 2** | Production builds verification | Zero TypeScript/build errors in backend & frontend |
