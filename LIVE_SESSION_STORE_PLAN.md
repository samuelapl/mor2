# Live Session Store Plan (`live-session-store.ts`)

> Prerequisite: the Zustand migration (ZUSTAND_MIGRATION_PLAN.md) is tested and merged. Do this on its own branch.

## 1. Why

Live-session lists are fetched page by page, with each page keeping its own copy in local `useState`:

| Call | Where | Count |
| :--- | :--- | :---: |
| `fetchLiveSessions({ limit: 100 })` | `trainer/page.tsx`, `system-admin/page.tsx`, `training-admin/calendar/page.tsx`, `trainer/attendance/page.tsx`, `SessionsManager.tsx` | 5 |
| `fetchLiveSessions({ limit: 50 })` | `training-admin/page.tsx` | 1 |
| `fetchUpcomingSessions()` | `learner/page.tsx`, `learner/live-sessions/page.tsx` | 2 |
| `fetchLiveSessions({ courseId, status: 'SCHEDULED', limit: 50 })` | `CatalogCourseModal.tsx` | 1 |

Problems:
- **Duplicate requests:** the same list is fetched again on every page visit.
- **Stale views:** a session that is scheduled, edited, cancelled, deleted or has its status changed only refreshes the screen that made the change. Other views keep the old list until they reload.

The fix: one store that loads the list once and that all session changes go through, so every view stays in sync. This uses the same pattern as `course-store.ts`.

## 2. Scope

**In the store**
- `sessions: ApiLiveSession[]` — the `live-sessions` list (`limit: 100`)
- `upcoming: ApiLiveSession[]` — the learner's `live-sessions/upcoming/me`
- Loading/error flags and a "loaded" marker for each list
- The changes: schedule, update, set status, delete

**Stays as it is (not in the store)**
- In-session state: the `LiveSessionWorkspace` heartbeat, live quiz polling, the learner quiz overlay, LiveKit tokens and join URLs. It belongs to one screen and changes every few seconds.
- Single-session fetches, `fetchLiveSession(id)`: `SessionDetailModal`, `SessionAttendanceModal`, `LiveSessionsStage`, `trainer/sessions/[sessionId]`.
- Attendance and quiz-result APIs.
- `CatalogCourseModal`'s course-filtered query: it is a different query used only in the modal.
- `prepared-quiz-store.ts`: already exists and is unchanged.

## 3. Store Shape

```ts
// frontend/src/lib/stores/live-session-store.ts
interface LiveSessionState {
  sessions: ApiLiveSession[];
  sessionsLoaded: boolean;
  loadingSessions: boolean;
  upcoming: ApiLiveSession[];
  upcomingLoaded: boolean;
  loadingUpcoming: boolean;
}

interface LiveSessionActions {
  /** Fetches once; later calls reuse the list unless `force` is set. */
  loadSessions: (opts?: { force?: boolean }) => Promise<void>;
  loadUpcoming: (opts?: { force?: boolean }) => Promise<void>;
  scheduleSession: (courseId: string, body: ScheduleSessionBody) => Promise<ApiLiveSession>;
  updateSession: (id: string, body: Partial<ScheduleSessionBody>) => Promise<ApiLiveSession>;
  setStatus: (id: string, status: BackendSessionStatus) => Promise<ApiLiveSession>;
  deleteSession: (id: string) => Promise<ApiLiveSession>;
  reset: () => void;
}
```

Rules:
- **Same API functions:** each change calls the same function in `lib/api/monitoring.ts`, then replaces, inserts or removes that one session in `sessions`. It then marks `upcoming` stale (`upcomingLoaded = false`), so the next learner view refetches it.
- **Errors still reach the caller:** components keep their current toast and error handling.
- **Course refresh stays where it is:** the change does **not** call `refreshCourse`. Components keep calling it exactly as they do today (`SessionsManager.tsx:313`, `:651`).
- **Cleared on logout:** `reset()` is added to `resetAll()` in `session-data.ts`. The list depends on who is logged in, because the backend filters by role, so it must be cleared on logout.

## 4. Phases

### Phase A — Create the store (no consumers yet)
1. Add `live-session-store.ts` with the shape above.
2. Add `useLiveSessionStore.getState().reset()` to `resetAll()`.
3. `npx tsc --noEmit`. No behavior change, because nothing uses it yet.

### Phase B — Route the changes through the store
1. `ScheduleSessionModal.tsx:275` `scheduleSession(...)` → store `scheduleSession`.
2. `EditSessionModal.tsx:160` `updateLiveSession(...)` → store `updateSession`.
3. `SessionsManager.tsx:280` `setSessionStatus(...)` → store `setStatus`.
4. `SessionsManager.tsx:307` `deleteLiveSession(...)` → store `deleteSession`.
5. Keep each component's current re-fetch for now, so behavior is identical while the store gets exercised.

**Browser check:** schedule, edit, cancel/complete (status) and delete a session. Each should show the same toasts and results as before.

### Phase C — Read lists from the store
Replace each local `useState` + `useEffect` fetch with `useLiveSessionStore((s) => s.sessions)` + `loadSessions()` on mount:
1. `SessionsManager.tsx` (then drop its own re-fetch after changes)
2. `trainer/page.tsx`
3. `system-admin/page.tsx`
4. `training-admin/calendar/page.tsx`
5. `trainer/attendance/page.tsx`
6. `training-admin/page.tsx` — **note:** this page asks for 50 today; the store loads 100. Keep the page's own `slice(0, 50)` if the UI relies on the count.
7. `learner/page.tsx` and `learner/live-sessions/page.tsx` → `upcoming` + `loadUpcoming()`.

**Browser check:**
- Each dashboard shows the same sessions as before.
- Schedule a session in Sessions Manager, then open the trainer dashboard and the calendar without reloading. The new session should already be there.
- Log out and log in as a different role. No sessions from the first user should show.
- Learner: the upcoming list loads and self check-in still works.

### Phase D — Freshness
- Before Phase C, check whether any page relied on getting a fresh list on every visit (for example, the status changing as a session goes live). If so, call `loadSessions({ force: true })` on mount there, or refetch on window focus. Decide per page; don't add polling everywhere.
- Commit, then do a final full browser check.

## 5. Risks

| Risk | Mitigation |
| :--- | :--- |
| Stale list when another user changes a session | `force` reload on the pages that need it; the list is cleared on logout |
| Pages that relied on their own pagination/limit | Keep per-page `slice` / pagination on top of the shared list |
| A component forgets `refreshCourse` after moving to the store | Phase B keeps the component code around each change unchanged |
| A role-filtered list leaking across logins | `reset()` in `resetAll()` (Phase A) |

## 6. Checklist

| Phase | Work | TypeScript | Browser | Status |
| :--- | :--- | :---: | :---: | :--- |
| A | Store + `resetAll` hook | [x] | n/a | Done (committed) |
| B | Changes go through store | [x] | [ ] | Committed — awaiting browser check |
| C | 8 list consumers read store | [x] | [ ] | Awaiting browser check |
| D | Freshness review | [x] | [ ] | Every list page still refetches on mount (cached list shown meanwhile) — no polling added |
