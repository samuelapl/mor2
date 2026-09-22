# Question Bank: Separate Table Implementation Plan

## Current State
- Questions are stored as a `Json` blob inside the `assessments` table (line 484 of schema.prisma)
- The `QuestionBankWorkspace` frontend component **only stores questions in React state** — it reads from assessments to populate the bank, but "Add Question" and "Edit Question" actions only mutate local state, never persist to DB
- When "Assemble Quiz" is clicked, the questions are POSTed as part of the assessment body

## Target State
- New `question_bank_questions` table with proper columns
- Questions persist individually to the DB (CRUD endpoints)
- Assessments still store their own questions as a `Json` snapshot (for grading integrity), BUT the question bank feeds into it
- The frontend Question Bank workspace calls real API endpoints

## Impact Analysis

### Backend
1. **Schema** — add `QuestionBankQuestion` model
2. **Migration** — new table (no data migration needed; existing data stays in assessments Json)
3. **New module** — `question-bank` module with full CRUD
4. **Assessment service** — no change (still accepts questions JSON in the body; the UI now populates from the bank)

### Frontend  
5. **New API functions** in `lib/api/quiz.ts` — CRUD for bank questions
6. **QuestionBankWorkspace** — wire up create/edit/delete to real API instead of local state

## Proposed `QuestionBankQuestion` schema

```prisma
model QuestionBankQuestion {
  id            String       @id @default(uuid())
  courseId      String?      @map("course_id") // Nullable: reusable across courses
  createdById   String       @map("created_by_id")
  type          QuestionType @map("type")
  question      String       @db.Text
  options       Json         // string[] for MCQ/TF, [] for short answer
  correctAnswer String?      @map("correct_answer") // Nullable for open-ended questions
  points        Int          @default(10)
  category      String       @default("General")
  createdAt     DateTime     @default(now()) @map("created_at")
  updatedAt     DateTime     @updatedAt @map("updated_at")

  course        Course?      @relation(fields: [courseId], references: [id], onDelete: Cascade)
  createdBy     User         @relation(fields: [createdById], references: [id], onDelete: Cascade)

  @@index([courseId])
  @@index([createdById])
  @@map("question_bank_questions")
}

enum QuestionType {
  MULTIPLE_CHOICE
  TRUE_FALSE
  SHORT_ANSWER
}
```

## Open Questions Resolution
- **1. Should `correctAnswer` be nullable?**
  → **Yes, nullable (`String?`)**: Allows SHORT_ANSWER questions without a fixed exact match (e.g. open-ended, subjective, or trainer-graded questions).
- **2. Should questions be reusable across courses?**
  → **Yes, reusable across courses (`courseId String?`)**: When `courseId` is `null`, questions belong to the global question bank and are accessible/reusable across all courses. Users can toggle "Reusable across all courses" in the editor or scope filter by course/global.

## Execution Checklist
- [x] Update schema.prisma — add `QuestionBankQuestion` model + `QuestionType` enum with nullable `correctAnswer` and nullable `courseId`
- [x] Add migration SQL `20260921000000_question_bank_table` & run `prisma generate`
- [x] Create backend `question-bank` module (controller + service + DTOs) with CRUD, bulk creation, and flexible course/global filtering
- [x] Register module in `backend/src/app.module.ts`
- [x] Add API functions to frontend `lib/api/quiz.ts` (`fetchQuestionBank`, `createQuestionBankItem`, `updateQuestionBankItem`, `deleteQuestionBankItem`, `bulkCreateQuestionBankItems`)
- [x] Wire `QuestionBankWorkspace` to real API with:
  - Database-backed Question Bank CRUD
  - Reusable / Global question toggle & badge indicators
  - Nullable / open-ended short answer support
  - Scope filter ("All Scopes", "Course-specific", "Reusable Across Courses")
- [x] Verify backend build & frontend build
