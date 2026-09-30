# Prepared Quiz Feature — Implementation Plan

> **Goal:** Allow trainers to pre-load quiz questions from the question bank onto a session *before* it goes live, then broadcast those prepared questions in one click during the live session.
>
> **Constraint:** Zero breaking changes to the existing quiz, live-session, and question-bank flows.

---

## 1. Overview & Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  PRE-SESSION (Trainer Dashboard)                            │
│  /trainer/sessions → open session → "Prepare Quiz" tab      │
│  → pick questions from bank → save → stored in DB           │
└───────────────────────┬─────────────────────────────────────┘
                        │  REST: POST/GET/DELETE
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND: prepared-quiz module (NestJS)                      │
│  PreparedQuizService ← Prisma (SessionPreparedQuestion)      │
│  PreparedQuizController  ← Redis cache layer (ioredis)       │
└───────────────────────┬─────────────────────────────────────┘
                        │  Cached read on join
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  LIVE SESSION (Classroom UI)                                 │
│  QuizPanel → new "Prepared Quiz" tab                         │
│  → fetch cached list → click → broadcast (existing flow)    │
└─────────────────────────────────────────────────────────────┘
```

**State layers:**

| Layer | Technology | Responsibility |
|---|---|---|
| Persistent store | PostgreSQL via Prisma | Source of truth for prepared questions |
| Cache | Redis (ioredis, already in project) | Fast read during live session |
| Client state | Zustand slice (usePreparedQuizStore) | Optimistic UI, selection state |
| Server state | Fetch + local state | API calls, loading/error |

---

## 2. Database — Prisma Migration

### 2.1 New model: SessionPreparedQuestion

Add to `backend/prisma/schema.prisma`:

```prisma
model SessionPreparedQuestion {
  id         String   @id @default(uuid())
  sessionId  String   @map("session_id")
  questionId String   @map("question_id")
  addedAt    DateTime @default(now()) @map("added_at")
  order      Int      @default(0)

  session  LiveSession          @relation("SessionPreparedQuestions", fields: [sessionId], references: [id], onDelete: Cascade)
  question QuestionBankQuestion @relation("PreparedQuizQuestions", fields: [questionId], references: [id], onDelete: Cascade)

  @@unique([sessionId, questionId])
  @@index([sessionId])
  @@map("session_prepared_questions")
}
```

### 2.2 Update LiveSession model

Add the back-relation inside the existing `LiveSession` model:

```prisma
  preparedQuestions SessionPreparedQuestion[] @relation("SessionPreparedQuestions")
```

### 2.3 Update QuestionBankQuestion model

Add the back-relation:

```prisma
  preparedIn SessionPreparedQuestion[] @relation("PreparedQuizQuestions")
```

### 2.4 Migration command

```bash
cd backend
npx prisma migrate dev --name add_session_prepared_questions
```

---

## 3. Backend — prepared-quiz Module

### 3.1 File structure

```
backend/src/modules/prepared-quiz/
  ├── prepared-quiz.module.ts
  ├── prepared-quiz.controller.ts
  ├── prepared-quiz.service.ts
  └── dto/
      ├── add-prepared-question.dto.ts
      ├── bulk-add-prepared-questions.dto.ts
      └── index.ts
```

### 3.2 DTOs

**add-prepared-question.dto.ts**
```typescript
import { IsString, IsOptional, IsInt } from 'class-validator';
export class AddPreparedQuestionDto {
  @IsString() questionId: string;
  @IsOptional() @IsInt() order?: number;
}
```

**bulk-add-prepared-questions.dto.ts**
```typescript
import { IsArray, IsString } from 'class-validator';
export class BulkAddPreparedQuestionsDto {
  @IsArray() @IsString({ each: true }) questionIds: string[];
}
```

### 3.3 Service — PreparedQuizService

Key responsibilities:
- CRUD for prepared questions on a session
- Redis cache with TTL of 5 minutes per session (key: `prepared_quiz:session:{sessionId}`)
- Cache invalidation on any write (add / remove / reorder / clear)
- Graceful Redis fallback to DB on error (same pattern as PermissionsService)

**Methods:**

| Method | Description |
|---|---|
| `addQuestion(sessionId, dto)` | Add single question, invalidate cache |
| `bulkAdd(sessionId, dto)` | Bulk-import from bank, invalidate cache |
| `removeQuestion(sessionId, questionId)` | Remove one, invalidate cache |
| `clearAll(sessionId)` | Remove all prepared questions, invalidate cache |
| `reorder(sessionId, orderedIds)` | Update order field, invalidate cache |
| `findAll(sessionId)` | Read from Redis → fallback to DB; populate cache on miss |
| `assertSessionExists(sessionId)` | Throw NotFoundException if session not found |
| `assertQuestionExists(questionId)` | Throw NotFoundException if bank question not found |

### 3.4 Redis caching pattern (mirrors PermissionsService)

```typescript
// Best-effort: always fall back to DB on Redis error
private readonly redis: Redis;

constructor(...) {
  this.redis = new Redis({
    host: RedisConfig.host,
    port: RedisConfig.port,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    enableOfflineQueue: false,
  });
  this.redis.on('error', () => undefined);
}

async findAll(sessionId: string) {
  try {
    await this.ensureConnected();
    const cached = await this.redis.get(this.cacheKey(sessionId));
    if (cached) return JSON.parse(cached);
  } catch { /* fallback to DB */ }

  const rows = await this.prisma.sessionPreparedQuestion.findMany({
    where: { sessionId },
    orderBy: { order: 'asc' },
    include: { question: true },
  });

  try {
    await this.redis.set(this.cacheKey(sessionId), JSON.stringify(rows), 'EX', 300);
  } catch { /* ignore */ }

  return rows;
}

private async invalidateCache(sessionId: string) {
  try {
    await this.ensureConnected();
    await this.redis.del(this.cacheKey(sessionId));
  } catch { /* ignore */ }
}
```

### 3.5 Controller routes

All routes under prefix: `live-sessions/:sessionId/prepared-quiz`

| Method | Route | Permission | Description |
|---|---|---|---|
| GET | `/` | manage_own or manage_all | List prepared questions |
| POST | `/` | manage_own or manage_all | Add single question |
| POST | `/bulk` | manage_own or manage_all | Bulk import from bank |
| DELETE | `/:questionId` | manage_own or manage_all | Remove one question |
| DELETE | `/` | manage_own or manage_all | Clear all |
| PATCH | `/reorder` | manage_own or manage_all | Update question order |

### 3.6 Module registration

```typescript
// prepared-quiz.module.ts
@Module({
  imports: [QuestionBankModule],
  controllers: [PreparedQuizController],
  providers: [PreparedQuizService, PrismaService],
  exports: [PreparedQuizService],
})
export class PreparedQuizModule {}
```

Register in `app.module.ts`:
```typescript
import { PreparedQuizModule } from './modules/prepared-quiz/prepared-quiz.module';
// add to @Module imports array
PreparedQuizModule,
```

---

## 4. Frontend — Dedicated prepared-quiz Module

### 4.1 File structure

```
frontend/src/
├── lib/
│   ├── api/
│   │   └── prepared-quiz.ts          # API client functions
│   └── stores/
│       └── prepared-quiz-store.ts    # Zustand store
├── components/
│   └── features/
│       └── prepared-quiz/
│           ├── PreparedQuizManager.tsx   # Pre-session: add/remove questions UI
│           ├── PreparedQuizPanel.tsx     # In-session: list + broadcast button
│           └── PreparedQuizBadge.tsx     # Question card inside manager
└── app/
    └── (dashboard)/
        └── trainer/
            └── sessions/
                └── [sessionId]/
                    └── page.tsx          # Session detail page with "Prepare Quiz" tab
```

### 4.2 API client — lib/api/prepared-quiz.ts

```typescript
const BASE = (sessionId: string) => `/live-sessions/${sessionId}/prepared-quiz`;

export async function fetchPreparedQuiz(sessionId: string): Promise<PreparedQuestion[]>
export async function addPreparedQuestion(sessionId: string, questionId: string): Promise<PreparedQuestion>
export async function bulkAddPreparedQuestions(sessionId: string, questionIds: string[]): Promise<PreparedQuestion[]>
export async function removePreparedQuestion(sessionId: string, questionId: string): Promise<void>
export async function clearPreparedQuiz(sessionId: string): Promise<void>
export async function reorderPreparedQuiz(sessionId: string, orderedIds: string[]): Promise<void>
```

All functions use the existing apiFetch pattern from the codebase.

### 4.3 Zustand store — lib/stores/prepared-quiz-store.ts

> NOTE: Zustand is not currently installed. Run: `cd frontend && npm install zustand`

```typescript
import { create } from 'zustand';

interface PreparedQuizState {
  questions: PreparedQuestion[];
  sessionId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  loadForSession: (sessionId: string) => Promise<void>;
  addQuestion: (sessionId: string, questionId: string) => Promise<void>;
  bulkAdd: (sessionId: string, questionIds: string[]) => Promise<void>;
  removeQuestion: (sessionId: string, questionId: string) => Promise<void>;
  clearAll: (sessionId: string) => Promise<void>;
  reorder: (sessionId: string, orderedIds: string[]) => Promise<void>;
  reset: () => void;
}

export const usePreparedQuizStore = create<PreparedQuizState>((set, get) => ({
  questions: [],
  sessionId: null,
  isLoading: false,
  isSaving: false,

  loadForSession: async (sessionId) => {
    set({ isLoading: true, sessionId });
    try {
      const data = await fetchPreparedQuiz(sessionId);
      set({ questions: data });
    } finally {
      set({ isLoading: false });
    }
  },

  addQuestion: async (sessionId, questionId) => {
    set({ isSaving: true });
    try {
      const added = await addPreparedQuestion(sessionId, questionId);
      set((s) => ({ questions: [...s.questions, added] }));
    } finally {
      set({ isSaving: false });
    }
  },

  bulkAdd: async (sessionId, questionIds) => {
    set({ isSaving: true });
    try {
      const added = await bulkAddPreparedQuestions(sessionId, questionIds);
      set((s) => ({
        questions: [
          ...s.questions,
          ...added.filter((a) => !s.questions.some((q) => q.questionId === a.questionId)),
        ],
      }));
    } finally {
      set({ isSaving: false });
    }
  },

  removeQuestion: async (sessionId, questionId) => {
    set((s) => ({ questions: s.questions.filter((q) => q.questionId !== questionId) }));
    await removePreparedQuestion(sessionId, questionId);
  },

  clearAll: async (sessionId) => {
    set({ questions: [] });
    await clearPreparedQuiz(sessionId);
  },

  reorder: async (sessionId, orderedIds) => {
    set((s) => ({
      questions: orderedIds
        .map((id) => s.questions.find((q) => q.questionId === id))
        .filter(Boolean) as PreparedQuestion[],
    }));
    await reorderPreparedQuiz(sessionId, orderedIds);
  },

  reset: () => set({ questions: [], sessionId: null }),
}));
```

### 4.4 Components

#### PreparedQuizManager.tsx — Pre-session prep UI
- Shown in the session detail page `/trainer/sessions/[sessionId]`
- Reuses the existing QuestionBankWorkspace for browsing questions
- "Add to Session" button on each question card → calls `store.addQuestion()`
- "Import Selected" bulk button → calls `store.bulkAdd()`
- Shows current prepared list with reorder and remove controls
- Shows a counter badge: `Prepared: 5 questions`

#### PreparedQuizPanel.tsx — In-session broadcast panel
- Rendered inside the existing live classroom quiz/control panel
- Fetches from store (already cached from pre-session) or calls `loadForSession` on mount
- Displays question cards with a single "Broadcast" button per question
- Broadcast button calls the existing `broadcastQuestion()` function — no new broadcast logic
- Shows empty state if no prepared questions

#### Session Detail Page — /trainer/sessions/[sessionId]/page.tsx
- New route under the existing trainer sessions route
- Tabs: Overview | Prepare Quiz | Participants
- "Prepare Quiz" tab renders PreparedQuizManager

---

## 5. Integration with Existing Live Session Classroom UI

The existing quiz panel gets a third tab:

```
[ From Question Bank ]  [ Instant Question ]  [ Prepared Quiz (5) ]
```

- Clicking "Prepared Quiz" tab renders PreparedQuizPanel
- No changes to the existing two tabs
- Badge (5) shows count — fetched on session join via `loadForSession` in the store
- Zero changes to submitQuizResponse, getLiveQuizReport, or any existing broadcast flow

---

## 6. Step-by-Step Implementation Order

### Phase 1 — Database
- [ ] Add `SessionPreparedQuestion` model to schema.prisma
- [ ] Add back-relations to LiveSession and QuestionBankQuestion
- [ ] Run `prisma migrate dev`
- [ ] Verify with `prisma studio`

### Phase 2 — Backend Module
- [ ] Create `prepared-quiz/dto/` files
- [ ] Create PreparedQuizService with Redis cache pattern
- [ ] Create PreparedQuizController with all routes
- [ ] Create PreparedQuizModule and register in AppModule
- [ ] Test all endpoints via Swagger

### Phase 3 — Frontend API Client
- [ ] Install Zustand: `cd frontend && npm install zustand`
- [ ] Create `lib/api/prepared-quiz.ts`
- [ ] Create `lib/stores/prepared-quiz-store.ts`

### Phase 4 — Pre-session UI
- [ ] Create `/trainer/sessions/[sessionId]/page.tsx` with tabs
- [ ] Build PreparedQuizManager.tsx
- [ ] Build PreparedQuizBadge.tsx
- [ ] Wire up store actions (add, remove, reorder, clear)

### Phase 5 — In-session UI
- [ ] Build PreparedQuizPanel.tsx
- [ ] Add "Prepared Quiz" tab to the existing classroom quiz panel
- [ ] Call `loadForSession()` on live session join
- [ ] Wire broadcast button to existing broadcast function

### Phase 6 — Polish & Validation
- [ ] Handle edge cases: session not found, already added, empty list
- [ ] Show toast notifications for add/remove/broadcast actions
- [ ] Test full flow: prepare → join → broadcast
- [ ] Verify Redis cache invalidation on each write
- [ ] Confirm no regression in existing question bank / live quiz flows

---

## 7. Key Design Decisions

| Decision | Rationale |
|---|---|
| Separate PreparedQuizModule | Keeps the feature isolated; LiveSessionsModule is not modified |
| ioredis direct (not NestJS CacheModule) | Matches the existing pattern in PermissionsService |
| Redis TTL = 5 min | Short enough to reflect edits; long enough to avoid DB hammering |
| Cache invalidated on every write | Simplest correct strategy; prepared quiz writes are rare (pre-session only) |
| Zustand slice, not lms-store | lms-store uses React Context; Zustand is a new, lighter slice for this feature |
| Reuse existing broadcast flow | PreparedQuizPanel calls the identical function used by the existing question bank flow |
| @@unique([sessionId, questionId]) | DB-level guarantee — no duplicate questions per session |
| No changes to LiveSession model fields | Prepared questions are a child table, not a column |

---

## 8. Environment & Package Changes

### Backend
No new packages needed — ioredis is already installed.

### Frontend
```bash
cd frontend
npm install zustand
```

### Environment variables
No new variables needed — Redis is already configured via REDIS_HOST / REDIS_PORT in .env.

---

## 9. API Contract Summary

```
GET    /live-sessions/:sessionId/prepared-quiz              → PreparedQuestion[]
POST   /live-sessions/:sessionId/prepared-quiz              → PreparedQuestion
POST   /live-sessions/:sessionId/prepared-quiz/bulk         → PreparedQuestion[]
DELETE /live-sessions/:sessionId/prepared-quiz/:questionId  → 204
DELETE /live-sessions/:sessionId/prepared-quiz              → 204 (clear all)
PATCH  /live-sessions/:sessionId/prepared-quiz/reorder      → { orderedIds: string[] }
```

All endpoints require `live_session.manage_own` or `live_session.manage_all` permission.
No new permissions needed — reuses the existing permission system.
