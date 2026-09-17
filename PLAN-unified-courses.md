# Unified Courses Management — Implementation Plan

**Goal:** Replace the role-scattered course pages ("My Courses", "Pending Approvals", "Approved Courses", "Pending to Publish", "View Published Course") with **one shared, permission-driven "Courses" page + one permission/status-driven course-detail modal** that supports a view / edit mode toggle.

Apply **Wave 1 (backend)** first, then **Wave 2 (frontend)**. Each wave must pass its lint/typecheck/tests before moving on.

---

## 1. Design decisions (do not deviate)

1. **One shared route** `/courses` (no role segment) — a *permission-gated* page accessible by any role holding a course-view permission, following the existing pattern of `PERMISSION_GATED_PATHS` (`/system-admin/users`, `/system-admin/roles`) in `frontend/src/constants/navigation.ts`.
2. **List content is server-scoped.** The backend already scopes `GET /courses` per role in `visibilityWhere()` (`backend/src/modules/courses/courses.service.ts:57`). Do **not** add client-side list filtering by role — display exactly what the API returns.
   - Course Owner → only courses they own
   - Trainer → only courses assigned to them
   - Content Approver / Training Admin / System Admin → all courses
   - Learner → **unchanged** (keeps "Available Courses" catalog + "My Courses" enrollments)
3. **All course action buttons live in the course-detail modal header** (the `actions` slot of `WorkspaceDetailOverlay`), **next to the close icon** — not on the `CourseCard`. Cards keep a single "Details" affordance.
4. **View / Edit modes:** clicking "Edit course" (visible only with `course.update.own`/`course.update.all` AND a status the backend allows editing) switches the same modal into **edit mode**, rendering the existing `CourseCreationWizard` (`editingCourse={course}`) inside the same overlay. "Done/Cancel" switches back to view mode.
5. **Permission + status (state machine) both gate visibility.** A permission alone is not enough: e.g. "Publish" needs `course.publish` AND `status === approved && !published`; "Edit" needs update-permission AND status ∈ {draft, rejected} (backend rejects approved/published edits). Every action row in §3 includes its status precondition.
6. **Backend stays mostly as-is.** The guards + `assertCanWrite`/`assertOwnerCanActOnDraftOnly` + `CourseStateMachine` already enforce everything. Wave 1 is small: permission-registry polish (assigned-scope for trainers) + read-model confirmation + tests. Do not rewrite the state machine.

---

## 2. Permission inventory covered by this feature

Source of truth: `backend/prisma/seed-permissions.ts` (`PERMISSIONS` registry at line 27-84, `ROLE_PERMISSION_MATRIX` at line 87-157).

| Permission | Shown/used for | Current holders |
|---|---|---|
| `course.create` | "Create Course" button on the Courses page header | COURSE_OWNER, TRAINING_ADMIN |
| `course.view.own` | See own courses (nav gate) | COURSE_OWNER |
| `course.view.all` | See all courses (nav + list gate) | CONTENT_APPROVER, TRAINING_ADMIN |
| `course.view.assigned` **(new, see Wave 1)** | See assigned courses (nav gate) | TRAINER |
| `course.update.own` / `course.update.all` | "Edit course" → opens modal in edit mode (status: draft/rejected) | OWN / ALL |
| `course.submit_approval` | "Submit / Resubmit for approval" (status: draft/rejected) | COURSE_OWNER, TRAINING_ADMIN |
| `course.approve` / `course.reject` | "Approve" / "Reject / Request changes" (status: pending_approval) | CONTENT_APPROVER |
| `course.publish` | "Publish course" (status: approved && !published) | TRAINING_ADMIN |
| `course.unpublish` | "Unpublish course" (status: published) | TRAINING_ADMIN |
| `course.archive` | "Archive course" (status: draft for plain owners) | COURSE_OWNER, TRAINING_ADMIN |
| `course.delete` | "Delete course" (status: draft for plain owners) | COURSE_OWNER, TRAINING_ADMIN |
| `course.assign_trainer` | "Assign/remove trainer" visible in trainer-management section of modal | TRAINING_ADMIN |

System Admin bypasses all permission checks server-side (PermissionGuard superuser bypass) but is seeded with every permission so NavItems resolve; keep that.

---

## 3. Course-detail modal — action matrix (the core UI spec)

Rendered in the `actions` slot of `WorkspaceDetailOverlay` (top-right, next to close). **Order matters**; render left→right as listed. Multiple buttons are allowed simultaneously (e.g. "Edit" + "Submit for approval" on a draft).

| # | Action | Permission check (`usePermissions().can(...)`) | Status precondition | On click |
|---|---|---|---|---|
| 1 | **Edit course** | `course.update.own` \|\| `course.update.all` | `draft` \|\| `rejected` | Switch modal to **edit mode** (render `CourseCreationWizard` with `editingCourse={course}`) |
| 2 | **Submit / Resubmit for approval** | `course.submit_approval` | `draft` \|\| `rejected` | `submitForApproval(course.id)` (store action) |
| 3 | **Request changes** | `course.reject` | `pending_approval` | prompt for reason → `reviewCourse(id, {status:'NEEDS_REVISION', comments})` |
| 4 | **Reject** | `course.reject` | `pending_approval` | prompt for reason → `reviewCourse(id, {status:'REJECTED', comments})` |
| 5 | **Approve** | `course.approve` | `pending_approval` | `reviewCourse(id, {status:'APPROVED'})` |
| 6 | **Publish course** | `course.publish` | `approved` && `!published` && has trainer | `publishCourse(course.id)` |
| 7 | **Unpublish course** | `course.unpublish` | `published` | `unpublishCourse(course.id)` |
| 8 | **Archive course** | `course.archive` | `draft` (or any, if TRAINING_ADMIN/SYSTEM_ADMIN) | `archiveCourse(course.id)` — confirm dialog |
| 9 | **Delete course** | `course.delete` | `draft` (or any, if TRAINING_ADMIN/SYSTEM_ADMIN) | `deleteCourse(course.id)` — confirm dialog |

Keep the existing in-modal **trainer management** section (assign/remove) — but raise its **Publish / Unpublish buttons out of the modal body into the header actions** (remove the duplicate header-less publish/unpublish from the trainer section). The trainer assign dropdown may stay in the body.

The existing `reviewActions` prop on `CourseDetailModal` becomes **redundant** — review actions now derive from permissions + status. Either keep it as a non-breaking optional prop (prefer) or deprecate it and update the call sites (`PendingCourseApprovals`, content-approver pages).

---

## 4. Current state — files you will touch

### Backend
- `backend/src/modules/courses/courses.controller.ts` — route + `@Permissions` today (see table in §5)
- `backend/src/modules/courses/courses.service.ts` — `visibilityWhere()` (line 57), `assertCanRead` (83), `assertCanWrite` (101), `assertOwnerCanActOnDraftOnly` (523)
- `backend/src/modules/courses/statemachine/course-state-machine.ts` — allowed transitions
- `backend/prisma/seed-permissions.ts` — registry + matrix
- `backend/prisma/schema.prisma` — only if you add a `Permission` row (you don't need a schema change; permissions are rows, seeded)

### Frontend
- `frontend/src/constants/navigation.ts` — `NAV_ITEMS`, `PERMISSION_GATED_PATHS`, `CROSS_ROLE_ADMIN_ITEMS`
- `frontend/src/constants/roles.ts` — `ROLE_PATHS`/`getRoleFromPath` (no change expected for `/courses`)
- `frontend/src/constants/labels.ts` — `tr(lang, "myCourses")` label
- `frontend/src/components/layout/DashboardShell.tsx` — permission-gate routing (add `/courses` to gated paths)
- `frontend/src/lib/lms-store.tsx` — course store actions (`reloadData` line 324) and any new actions needed
- `frontend/src/lib/api/courses.ts` — API client
- `frontend/src/components/features/courses/CourseDetailModal.tsx` — header actions + edit-mode toggle
- `frontend/src/components/features/courses/EditCourseModal.tsx` — likely absorbed into `CourseDetailModal`'s edit mode
- `frontend/src/components/features/courses/CourseCard.tsx` — ensure only "Details" action remains
- `frontend/src/app/(dashboard)/course-owner/my-courses/page.tsx` — baseline list page to generalize
- `frontend/src/app/(dashboard)/learner/my-courses/page.tsx` — keep as-is (learner scope untouched)
- Other role pages that referenced course lists: `content-approver/pending-approvals`, `content-approver/approved-courses`, `training-admin/publish`, `training-admin/courses`, `system-admin/pending-course-approvals`

---

# WAVE 1 — BACKEND

## 1.1 Add a `course.view.assigned` permission (trainer-scoped visibility)

Rationale: trainers are seeded with `course.view.all` but the API already hides everything except their assigned courses (`visibilityWhere`). Make the permission model match reality.

**File: `backend/prisma/seed-permissions.ts`**
- Add to `PERMISSIONS`:
  ```ts
  {
    code: 'course.view.assigned',
    resource: 'course',
    action: 'view',
    scope: 'OWN',
    description: 'View courses assigned to me (trainers)',
  },
  ```
- In `ROLE_PERMISSION_MATRIX`, replace `TRAINER`'s `'course.view.all'` with `'course.view.assigned'`.

**File: `backend/src/modules/courses/courses.controller.ts`**
- `GET /courses` and `GET /courses/:id` `@Permissions(...)` list becomes:
  `('course.browse', 'course.view.own', 'course.view.all', 'course.view.assigned')`.

**File: `backend/prisma/seed.ts` or wherever `seedPermissions` is invoked** — verify seeding is idempotent (it uses `upsert` by `code` — already so). If the seed script re-runs and the matrix entries are additive-only, provide a small cleanup note: stale `RolePermission` rows pointing at removed `course.view.all` from TRAINER should be deleted in the seed if that combination exists (this is the only remove-affecting case; document it, don't over-engineer).

## 1.2 Confirm read model serves the unified list

No code change required, but add **tests** to lock the behavior in `courses.service.ts` `visibilityWhere()`:

`backend/src/modules/courses/` (or `backend/test/`) — write unit tests covering:
- Course Owner sees only `owners.some(userId)` (own).
- Trainer sees only `trainers.some(userId)` (assigned) — even though they hold `course.view.all`-style broad access, the query must scope.
- Content Approver / Training Admin / System Admin see all (`isBroadStaff` returns `{}`).
- Learner see only `PUBLISHED`.
- Combined `?status=` filter composes with scope (`AND`).
- Empty-roles/user falls back to `PUBLISHED`.

## 1.3 Guard sanity (no change expected — verify only)

- `review()` currently has no explicit ownership check; it's guarded by `course.approve`/`course.reject` role gate + `PENDING_APPROVAL` status. Keep as-is.
- `publish()` / `unpublish()` require no ownership (Training Admin-only gate). Keep.
- Ensure the new Courses page's API calls hit **only** these endpoints: `GET /courses`, `GET /courses/:id`, plus existing action endpoints. Do not add new endpoints.

## 1.4 Wave 1 verification

- `cd backend && npm run lint`
- `cd backend && npm run build` (tsc)
- `cd backend && npx prisma format && npx prisma db seed` (idempotent)
- `cd backend && npm test` (new visibility tests pass)
- Manual curl: with a trainer token, `GET /api/courses` returns only assigned courses; with course-owner token, only owned.

---

# WAVE 2 — FRONTEND

## 2.1 Create the shared `/courses` page

**New file: `frontend/src/app/(dashboard)/courses/page.tsx`**

Generalize the current `course-owner/my-courses/page.tsx` logic:
- Header (`PageShell`): title **"Courses"** (label added to `labels.ts`, e.g. `courses: { en: "Courses", am: "ኮርሶች" }`). `PageShell` requires a `role` for its pill — use `currentUser.role` from the store (or relax `PageShell` `role` prop to `Role | null` and hide the pill when null).
- **Create Course button** in `PageShell` `actions`, rendered only when `can("course.create")` — opens the existing create overlay (`CourseCreationWizard`).
- Keep the status tabs / FilterBar / `CourseCard` grid / `Pagination` from the owner page.
- Card children: **only** a "Details" button (opens `CourseDetailModal`). Remove Edit/Submit/Delete/Publish from the card (they move to the modal header).
- Empty state text dynamic by permission (e.g. owner: "No courses yet — create one"; trainer: "No courses assigned to you yet").

## 2.2 Route gating

**File: `frontend/src/constants/navigation.ts`**
- Add to `PERMISSION_GATED_PATHS`:
  ```ts
  "/courses": ["course.view.own", "course.view.all", "course.view.assigned", "course.create"],
  ```
  (OR semantics — anyone with any course-vision/create permission may open it.)
- Update `NAV_ITEMS` for **every staff role** to a single "Courses" item pointing at `/courses`, with a `permission` field:
  - `course_owner`: replace `{ label: "My Courses", href: "/course-owner/my-courses" }` → `{ label: "Courses", href: "/courses", icon: BookOpen, permission: "course.view.own" }`
  - `content_approver`: replace "Pending Approvals" + "Approved Courses" → one `Courses` item (`permission: "course.view.all"`)
  - `training_admin`: replace "Pending to Publish" + "View Published Course" → `Courses` (`permission: "course.view.all"`)
  - `trainer`: add `Courses` (`permission: "course.view.assigned"`)
  - `system_admin`: add `Courses` (`permission: "course.view.all"`); keep "Pending Course Approvals" if desired (it's a filtered view) — optional
  - `learner`: **unchanged** (Available Courses + My Courses)
- Update label usage: anything calling `tr(lang, "myCourses")` for the owner/trainer/admin entries now uses the new `courses` label.

**File: `frontend/src/components/layout/DashboardShell.tsx`** — `getRoleFromPath("/courses")` returns `null` (first segment `courses` has no role), so non-gated behavior already passes; with `PERMISSION_GATED_PATHS["/courses"]` set, users lacking the perms get redirected to their role home. Verify this works; add `/courses` to the inline comment.
**File: `frontend/src/components/layout/Sidebar.tsx`** — no change expected; `filterNavItems` already uses `NavItem.permission`.

## 2.3 Redirect old course pages (cleanup, low risk)

- Update `ROLE_PATHS`? No — only the dashboard homes. Instead:
  - `frontend/src/app/(dashboard)/course-owner/my-courses/page.tsx` → replace with a thin redirect to `/courses` (e.g. `"use client"` + `<Redirect to="/courses">` via `router.replace`, or a `redirect()` server component) so old bookmarks still work. Same for any other removed pages (`training-admin/publish`, `training-admin/courses`, `content-approver/...` if replaced).
  - Simpler alternative accepted: leave old pages in place but stop linking to them. **Prefer redirects** to avoid dead routes.

## 2.4 Course detail modal — header actions + edit mode

**File: `frontend/src/components/features/courses/CourseDetailModal.tsx`**

1. Import `reviewCourse`, `archiveCourse` (add `archiveCourse` to store/API if missing) and `EditCourseModal`/`CourseCreationWizard`.
2. Add state: `mode: "view" | "edit"`. When `mode === "edit"`, render inside the same overlay:
   ```tsx
   <CourseCreationWizard key={course.id} editingCourse={course} onDone={() => setMode("view")} onCancel={() => setMode("view")} />
   ```
3. Build the header `actions` slot from the matrix in §3 using `usePermissions().can()` + course status. For "Request changes"/"Reject"/"Archive"/"Delete", add a small prompt modal (or `window.confirm`) capturing optional reason; reuse store actions + `notify()` flash for feedback.
4. Remove the now-duplicate Publish/Unpublish buttons from the trainer-management body (lines ~288-312); keep the trainer assign dropdown + remove flow gated by `can("course.assign_trainer")`.
5. Keep `reviewActions` prop but treat it as optional override; if both present, permission-derived actions win. Update the call sites that passed `reviewActions` if desirable (or leave them working unchanged).
6. `CourseDetailModal` is already used across the app — confirm all call sites still compile (owner page, content-approver pages, training-admin pages, `PendingCourseApprovals`, system-admin pending approvals). The unified `/courses` page passes no `reviewActions`.

**File: `frontend/src/components/features/courses/EditCourseModal.tsx`** — may become unused if fully absorbed into `CourseDetailModal` edit mode; keep the file only if call sites remain, else delete.

## 2.5 Store/API actions (verify existing, add if missing)

In `frontend/src/lib/lms-store.tsx` and `frontend/src/lib/api/courses.ts`:
- Confirm exists: `createCourse`, `updateCourse`, `submitForApproval` (requestApproval), `publishCourse`, `unpublishCourse`, `deleteCourse`, `assignTrainerToCourse`, `unassignTrainerFromCourse`, `fetchCourses`, `fetchCourseDetail`.
- Add if missing: `reviewCourse` (already present per exploration), `archiveCourse`, and a `createCourse` notifier is fine. Wire any missing store action following the existing `result {ok, message}` pattern.
- `reloadData` (lms-store.tsx:324) already loads up to 100 courses + details — sufficient for the unified page. The `current.role === "learner"` and staff enrollment-fetch branches (lines 343-388) should be generalized to use **permissions** instead of hardcoded role strings where feasible (e.g. only fetch enrollments when `can("course.view_enrollments")` or `enrollment.view_all`), while keeping learner enrollment logic intact.

## 2.6 Wave 2 verification

- `cd frontend && npm run lint`
- `cd frontend && npm run build` (or `tsc --noEmit`) — catches unused exports/imports from removed pages
- Manual walkthrough with each role:
  1. **Course owner** logs in → sidebar "Courses" → sees own list → Create Course button visible → open a draft → header shows Edit + Submit → edit switches modal to edit mode → save returns to view → submit for approval.
  2. **Trainer** logs in → "Courses" → sees only assigned → no Create button → detail modal shows no edit/publish actions (permission absent).
  3. **Content approver** logs in → "Courses" → all courses → open a pending one → Approve/Reject/Request-changes in header → action persists via `reviewCourse`.
  4. **Training admin** → "Courses" → all → open approved course → Publish in header; trainer section assign works; open published → Unpublish.
  5. **System admin** → "Courses" → all → edit/publish/delete available.
  6. Old bookmarks (`/course-owner/my-courses`) redirect to `/courses`.
  7. No permissions → `/courses` redirects to role home via `DashboardShell`.

---

## 5. Acceptance criteria (summary)

- [ ] One `/courses` page reachable by all staff roles; content scoped server-side per role.
- [ ] "Create Course" only when `course.create`.
- [ ] All course actions in the detail-modal header, gated by **permission + status**; no action buttons on cards.
- [ ] "Edit course" flips the same modal into edit mode (wizard) and back.
- [ ] Trainer list shows only assigned courses; `course.view.assigned` seeded and used.
- [ ] Old role course pages redirect (or are unlinked) with no dead imports.
- [ ] Backend tests for `visibilityWhere` added and passing; lint/build green on both apps.
- [ ] Learner experience unchanged.

## 6. Out of scope
- Versioning / "new version" flow for editing approved/published courses (existing constraint stays).
- Curriculum editing UX beyond what `CourseCreationWizard` already provides.
- Learner catalog checkout/enrollment changes.
- Audit logging policy changes (notifications/audit already exist).