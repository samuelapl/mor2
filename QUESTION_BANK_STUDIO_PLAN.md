# Question Bank Studio — Implementation Plan

Move the question bank out of `frontend/src/components/features/quiz/` into its own
`frontend/src/components/features/question-bank/` feature, and turn it into a full-page
studio (header + curriculum sidebar + main stage), modelled on the course creation studio.

**Constraints for both phases**

- No API changes. Every call keeps going through the existing functions in
  `frontend/src/lib/api/quiz.ts` and `frontend/src/lib/api/courses.ts`, with the same payloads.
- No backend changes.
- Same routes and permissions: `/course-owner/question-bank`, `/trainer/question-bank`
  (and `/trainer/create-quiz`, which re-exports the trainer page), all gated by
  `question_bank.manage` in `constants/navigation.ts`.
- `features/quiz/QuizTakerModal.tsx` (learner self-paced quizzes) stays where it is.
- Questions can still be placed at every current level: course (general), module, lesson,
  sub-lesson, and reusable global.

---

## Current state

`features/quiz/QuestionBankWorkspace.tsx` is one ~2,300-line component that holds everything:

| Concern | Where today |
|---|---|
| Types (`BankQuestion`, `ActiveCurriculumNode`, `StagedQuestion`) and title/HTML helpers | top of file |
| Course picking (all vs. my courses, search, selected course) | lines ~202–268 |
| Data loading (questions, modules, assessments) | `loadQuestions`, `loadModules`, `loadAssessments` |
| Curriculum tree state, counts per node, filters, pagination | lines ~362–506 |
| Question form state, staging queue, save / edit / duplicate / delete | lines ~275–918 |
| Quiz selection + builder + publish | lines ~293–1007 |
| All rendering, including two full-screen overlays (editor, quiz builder) | lines ~1009–end |

The API-response → `BankQuestion` mapping is copy-pasted four times (load, update, bulk
create, duplicate).

### Bug: staged questions can't be saved

After **Add Another Question**, the form is cleared, but the four answer-choice inputs keep the
HTML `required` attribute. Clicking **Save to Bank** triggers the browser's built-in form
validation, which blocks the submit because those inputs are empty, so `handleSaveQuestion`
never runs. The handler already supports saving only the staged queue; the browser just
never lets it be called.

---

## Phase 1 — Extract into `features/question-bank/` and fix saving

Goal: same screens and same behaviour as today, but split into a modular feature, with
saving staged questions working. No visual redesign in this phase, so any regression is
easy to spot.

### 1.1 Folder layout

```
frontend/src/components/features/question-bank/
├── index.ts                      # public exports
├── types.ts                      # BankQuestion, ActiveCurriculumNode, CurriculumNodeType,
│                                 # StagedQuestion, QuestionDraft, QuizSettings
├── utils.ts                      # getClean{Module,Lesson,SubLesson}Title, stripHtml,
│                                 # toBankQuestion (the one shared API→UI mapper),
│                                 # draftToPayload (form/staged item → API input)
├── styles.ts                     # shared class helpers (cardClass, navItemClass, …)
├── hooks/
│   ├── useBankCourses.ts         # course list, ALL/MY filter, search, selected course
│   ├── useBankData.ts            # questions, modules, assessments + loaders
│   ├── useQuestionFilters.ts     # curriculum node, search/type/scope, counts, pagination
│   ├── useQuestionEditor.ts      # form state, staging queue, save/edit/duplicate/delete
│   └── useQuizBuilder.ts         # selection, builder settings, order, publish
├── components/
│   ├── CourseBar.tsx             # course search/select + ALL/MY toggle
│   ├── ViewTabs.tsx              # Questions / Published Quizzes
│   ├── CurriculumNavigator.tsx   # scope nodes + module/lesson/sub-lesson tree
│   ├── QuestionFilters.tsx       # active-node header, search, type, scope, refresh
│   ├── QuestionCard.tsx
│   ├── QuestionList.tsx          # selection bar, cards, empty state, pagination
│   ├── QuestionEditorForm.tsx    # placement, question, answers, action bar
│   ├── StagedQuestionList.tsx
│   ├── QuizBuilder.tsx
│   └── PublishedQuizList.tsx
└── QuestionBankWorkspace.tsx     # thin composition of the hooks + components above
```

### 1.2 Steps

1. **Create `types.ts`, `utils.ts`, `styles.ts`.** Move the types and helpers as they are.
   Replace the four copies of the API→`BankQuestion` mapping with one `toBankQuestion()`.
2. **Extract the hooks** in this order, since each depends on the one before:
   `useBankCourses` → `useBankData(selectedCourseId)` → `useQuestionFilters(questions, modules)`
   → `useQuestionEditor(...)` → `useQuizBuilder(...)`. Move the logic exactly as it is,
   including the bulk-create fallback to sequential `createQuestionBankItem`.
3. **Extract the components.** Each one receives exactly the state and callbacks its markup
   uses today. No new behaviour.
4. **Fix saving staged questions:**
   - add `noValidate` to the editor `<form>` (the handlers already validate: prompt required,
     at least 2 multiple-choice options, curriculum target);
   - remove `required` from the answer-choice inputs;
   - show the existing `saveError` message next to the action bar so validation feedback
     stays visible.
5. **Re-point the pages:**
   - `app/(dashboard)/course-owner/question-bank/page.tsx` and
     `app/(dashboard)/trainer/question-bank/page.tsx` import from
     `@/components/features/question-bank`.
   - `trainer/create-quiz` keeps re-exporting the trainer page (no change).
6. **Delete `features/quiz/QuestionBankWorkspace.tsx`.** `features/quiz/` then only contains
   `QuizTakerModal.tsx`. Grep for any other importers of `BankQuestion` /
   `ActiveCurriculumNode` first and point them at the new `types.ts`.

### 1.3 Done when

- `npx tsc --noEmit` passes; no file in `question-bank/` is over ~400 lines.
- Manual check, as both a course owner and a trainer:
  - switch course; ALL/MY toggle; course search
  - browse All / Course level / Reusable global / module / lesson / sub-lesson; counts match
  - search, type and scope filters; pagination; page size
  - add a single question at each level (course, module, lesson, sub-lesson, reusable global)
  - **add 3 questions to the queue, then Save to Bank, and confirm all 3 are saved** (the bug fix)
  - queue 2 questions and also type a 3rd without staging it, then save: all 3 are saved
  - edit a queued question; remove a queued question; Clear all
  - edit, duplicate and delete an existing question
  - select questions → Assemble Quiz → reorder/remove → Save & Publish; it appears under
    Published Quizzes
  - Sync Bank / refresh buttons
- The network tab shows the same requests and payloads as before the move.

---

## Phase 2 — Full-page Question Bank Studio

Goal: replace the dashboard page and its overlays with a dedicated full-screen studio,
designed and laid out like the course creation studio.

### 2.1 Shell

- **Full screen.** Extract `StudioPortal` from `features/courses/CourseCreationWizard.tsx` into
  `components/shared/StudioPortal.tsx` and use it in both studios. It renders a
  `fixed inset-0` layer above the dashboard and locks body scroll.
- **Layout** (same structure as `CourseCreatorShell`):

```
┌──────────────────────────────────────────────────────────────────────────┐
│ StudioHeader                                                             │
│ ← Exit │ Question Bank Studio │ [Course switcher ▾] │ Questions · Quizzes│
│                                       │ Sync │ Assemble Quiz (3) │       │
├───────────────────┬──────────────────────────────────────────────────────┤
│ StudioSidebar     │ Main stage                                           │
│  Course summary   │  BROWSE   – filters + question list                  │
│  All questions    │  COMPOSE  – question editor + session queue (right)  │
│  Course level     │  BUILD    – quiz builder                             │
│  Reusable global  │  QUIZZES  – published quizzes                        │
│  ── Curriculum ── │                                                      │
│  M1 Module  (12)+ │                                                      │
│   1.1 Lesson (4)+ │                                                      │
│    1.1.1 Sub (1)+ │                                                      │
│  ── Stats ──      │                                                      │
│  MC 20 · TF 8 · … │                                                      │
└───────────────────┴──────────────────────────────────────────────────────┘
```

- **Exit** goes back with `router.back()`, falling back to the role's dashboard
  (`/course-owner` or `/trainer`).
- **Small screens:** the sidebar becomes a slide-over drawer opened from the header.

### 2.2 New components (in `question-bank/studio/`)

| Component | Content |
|---|---|
| `QuestionBankStudio.tsx` | Shell: header + sidebar + stage switcher; owns the active stage |
| `StudioHeader.tsx` | Exit, title, course switcher (search + select in one dropdown, with the ALL/MY toggle inside), Questions/Quizzes tabs, Sync, Assemble Quiz with the selected count |
| `StudioSidebar.tsx` | Course summary card, scope nodes, curriculum tree with counts and "+" per node, question-type stats |
| `stages/BrowseStage.tsx` | Active-node header, filters, selection bar, question cards |
| `stages/ComposeStage.tsx` | Editor in the main stage instead of an overlay. Placement starts from the node it was opened from. The session queue is a sticky right column, with Save to Bank always visible |
| `stages/QuizBuilderStage.tsx` | Settings card + ordered question list. Publish goes in the stage's own header |
| `stages/PublishedQuizzesStage.tsx` | Quiz cards grid |

The Phase 1 hooks are reused as they are. Only the presentation changes.

### 2.3 Stage flow

- **BROWSE** (default): clicking a sidebar node filters the list. A node's "+" opens COMPOSE
  with that node preselected.
- **COMPOSE:**
  - **Save to Bank** goes back to BROWSE.
  - **Cancel** with queued questions asks for confirmation first (new `ConfirmModal`; UI
    only, no API).
- **BUILD:** opened from **Assemble Quiz**. Publishing goes to QUIZZES.
- **QUIZZES:** opened from the header tab.

### 2.4 Visual direction

- Same design language as the course studio and dashboard: `rounded-2xl` cards, slate/indigo
  palette, `font-display` headings, `shadow-soft ring-super-soft`, the brand-gradient primary
  button, dark-mode variants.
- Question cards: type icon + colour, placement breadcrumb (Module › Lesson › Sub-lesson),
  rich-text prompt, highlighted correct answer, and actions that show on hover.
- Compose stage:
  - type picker as three selectable tiles (Multiple choice / True–False / Short answer),
    not a dropdown;
  - answer rows with a clear "correct" toggle;
  - a live preview of how the learner sees the question.
- Empty states for an empty course, an empty node and no quizzes, each with a direct action.
- Loading skeletons for the sidebar tree and the question list.

### 2.5 Done when

- Everything in the Phase 1 checklist still passes inside the studio.
- No `WorkspaceDetailOverlay` is used by the question bank anymore.
- Usable at 1280px+ and on mobile (sidebar drawer, stacked compose layout).
- Dark mode looks right.
- The course creation studio still opens and works after `StudioPortal` is extracted.

---

## Order of work

1. Phase 1, then manual check, then commit.
2. Phase 2, then manual check, then commit.

Each phase can ship on its own. After Phase 1 the page looks the same as it does today, with
saving fixed.
