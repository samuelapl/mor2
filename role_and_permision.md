# Role & Permission — Implementation Plan (2 Waves)

> Source of truth for permission codes, seed matrix, and design decisions: [ROLE-PERMISSION-SPEC.md](./ROLE-PERMISSION-SPEC.md) (verified against the current codebase). This file is the execution checklist, not a re-statement of the spec.

**Wave 1 (Backend)** must be fully merged and migrated before **Wave 2 (Frontend)** starts — Wave 2 depends on the new API shape (`permissions[]`/`roles[]` on `auth/me`, the `/admin/*` endpoints) existing in the environment it's built against.

---

## Wave 1 — Backend: Permission Engine (no visible UI change)

**Goal:** Ship the full DB schema, seed data, guard layer, admin API, and route hardening. Existing `@Roles()`-based behavior must not regress — the UI looks and behaves identically to today when this wave ships.

**Status: done — full coverage.** All 40 permission codes are wired to real, live-tested `@Permissions()` checks (not just seeded data), `npm test` + `npm run test:e2e` green, cross-role probe passed on all 6 roles.

### 1. Schema & migration — done, deviated from spec §4 for safety
- [x] Add `Role`, `Permission`, `RolePermission` models (additive).
- [x] **Design change from spec §4:** rather than altering `UserRole.role` (enum) → `roleId` (a real structural change to an existing, in-use column), `Role.name` was made the unique key (`Role.name RoleName @unique`) and `RolePermission.roleId` points at `Role.id`. `UserRole` is completely untouched — no backfill, no `assignRole`/`removeRole`/`bulkCreate` changes needed. Verified: migration SQL is 3 pure `CREATE TABLE`s, nothing else.
- [x] Migration applied to the dev DB (`20260915194907_role_permission_matrix`) and confirmed additive-only.

### 2. Data backfill & seed (idempotent — safe to re-run) — done
- [x] Seed the 6 `Role` rows with label + `dashboardPath`, `isSystem: true`.
- [x] Seed the full 40-code `Permission` registry (spec §5, including the added `attendance.checkin`, `result.view.own/all`, `progress.view`/`progress.mark_own`).
- [x] Seed `RolePermission` from the final matrix (spec §6) — verified counts: Course Owner 17, Approver 3, Training Admin 22, Trainer 9, Learner 7, System Admin 40/40.
- [x] Re-ran seed twice to confirm idempotency (upsert-based, no duplicate-key errors).
- ~~Backfill `UserRole`, update `assignRole`/`removeRole`/`bulkCreate`~~ — not needed, see item 1.

### 3. Guard & service layer — done
- [x] `PermissionsService.effectivePermissions(roles)` — union across a user's role names (sourced straight from the JWT, no extra DB round-trip), Redis-cached (`ioredis`, reusing the existing dependency/docker-compose service) with ~15s TTL. Cache key is per-role-name (`perm:role:<ROLE>`), not per-user, since permissions are a pure function of role in Phase 1 — this also makes invalidation trivial (delete one key per edited role, no "batch invalidate all users" needed as spec §7.3 assumed).
- [x] `PermissionsService.invalidateRole(role)` — called on every grant/revoke; verified live (see item 8).
- [x] `@Permissions(...codes)` decorator + `PermissionsGuard` — OR semantics, `@Public()` skip, `SYSTEM_ADMIN` bypass, no-metadata pass-through. Registered as a global `APP_GUARD` alongside `RolesGuard`.
- [x] `@Roles()` + `RolesGuard` — kept as originally written for all of Wave 1. **Superseded 2026-09-16, see Wave 3 below:** this "left completely untouched" decision turned out to be wrong — `@Roles()` silently overrides a runtime permission grant for any role not in its static list, which defeats the whole point of the Wave 2 admin UI. Ignore this line; Wave 3 is the current state.

### 4. New admin endpoints (all `SYSTEM_ADMIN`-only) — done, all live-tested
- [x] `GET /admin/permissions` — registry grouped by resource
- [x] `GET /admin/roles` — 6 roles + their permission codes
- [x] `POST /admin/roles/:id/permissions` — full replace-set save
- [x] `DELETE /admin/roles/:id/permissions/:permissionId` — single revoke
- [x] `GET /admin/users/:id/permissions` — effective permissions (debug/support)
- [x] Lock-out protection — `SYSTEM_ADMIN` role edits are rejected outright (locked); a generic "last holder of `permission.manage`" check also guards the other 5 roles.

### 5. Auth response — done
- [x] Login and refresh responses now include `permissions: string[]` (computed from the user's roles at the moment of login/refresh); `user.roles` was already present. Verified via live login: Learner gets the correct 7 codes, System Admin gets all 40.

### 6. Harden currently-ungated routes — done, plus one extra found
Verified against the controllers — these had **no** `@Roles()` at all (open to any authenticated user):
- [x] `assessment.submit` / `start` → `@Permissions('assessment.submit')`
- [x] `assessments/:id/attempts` → `@Permissions('result.view.own', 'result.view.all')` (found during implementation — this is exactly the `result.view.own` gap identified earlier; now actually enforced, not just seeded)
- [x] `enrollment.self` drop half → `@Permissions('enrollment.self')`
- [x] `attendance.checkin` → `@Permissions('attendance.checkin')`
- [x] `progress.mark_own` → `@Permissions('progress.mark_own')`
- [x] `certificate.view` (`GET certificates/me`) → `@Permissions('certificate.view')`

### 7. Course Owner draft-only check — done
- [x] `courses.service.ts` `archive`/`softDelete`: a `COURSE_OWNER`-only actor (not also Training Admin/System Admin) is now rejected with a 403 unless `course.status === 'DRAFT'`. Training Admin/System Admin unaffected. Controller now passes `@CurrentUser()` roles through to both methods.

### 8. The 3 intentional access changes — implemented and live-verified
- [x] `course.publish` → added `@Permissions('course.publish')`; live-tested: Course Owner now gets 403, Training Admin unaffected.
- [x] `student.manage` (bulk enroll, `POST courses/:courseId/enrollments`) → added `@Permissions('student.manage')`, now System-Admin-only. (At the time this was written, `@Roles()` on this route still listed Training Admin too, and that was harmless only because the permission check independently already blocked them. Wave 3 later removed that `@Roles()` line entirely, once it became clear the same pattern was actively wrong on other routes — see below.)
- [x] `certificate.manage` → added to `certificates.controller.ts` (`issue`, `revoke`) and controller-wide on `certificate-templates.controller.ts`, now System-Admin-only.

### 9. Regression verification — done
- [x] `npm test` — 11/11 pass (unchanged).
- [x] `npm run test:e2e` (wave2, wave3) — 7/7 pass, unchanged.
- [x] Live-tested against the dev DB: login/permissions shape, admin CRUD, lock-out on `SYSTEM_ADMIN`, `course.publish` revoke-and-reject with **no re-login required**, then reseeded to restore clean state.
- [x] Confirmed `scripts/wave1-smoke.mjs` failures are pre-existing/unrelated (stale hardcoded `201` expectation for a login route that has returned `200` since before this session; a stale course-DTO shape) — not a regression from this work.

### 10. Full coverage — every permission code wired, done
Extended beyond the initial 8 routes: all remaining ~30 codes are now wired to their matching route(s) with `@Permissions()`, verified 40/40 codes (41 after Wave 3's `enrollment.view_all`) referenced in the controllers (`grep` diff against the seed registry). At the time this was written, `@Roles()` was left untouched everywhere — `@Permissions()` was only *added*, never used to replace a role check. **See Wave 3: that turned out to be the wrong call and was reversed.**
- [x] `courses.controller.ts` — `course.create`, `course.update.own`/`.all`, `course.submit_approval`, `course.approve`/`course.reject`, `course.unpublish`, `course.archive`, `course.delete`, `course.assign_trainer` (both assign + remove routes)
- [x] `courses.controller.ts` `findAll`/`findOne` (the generic "list/get courses" routes, open to all 6 roles today) — wired to `@Permissions('course.browse', 'course.view.own', 'course.view.all')` (OR-list). Every role already holds at least one of these three, so this closes `course.browse`/`course.view.own`/`course.view.all` with **zero behavior change** while making all three live-editable.
- [x] `curriculum.controller.ts` — `course.manage_curriculum` on all module/lesson create/update/reorder/delete/restore routes (9 + 2 routes). The two `permanent`-delete routes stayed `@Roles(SYSTEM_ADMIN)`-only with no `@Permissions()` — System Admin bypasses both guards anyway, so wiring them would be inert.
- [x] `assessments.controller.ts` — `quiz.create` (create/replace/update), `quiz.grade` (grading summary)
- [x] `attendance.controller.ts` — `attendance.manage` (mark/bulk-mark), `attendance.view` (by-session/summary), `attendance.override` (already had it)
- [x] `enrollments.controller.ts` — `enrollment.self` (self-enroll, drop — filled a gap I'd missed on the initial self-enroll route), `enrollment.view_all` (admin-wide listings — split out from `course.view_enrollments` on 2026-09-16, see ROLE-PERMISSION-SPEC.md footnote ⁴, after removing the static `@Roles()` that had been silently keeping Course Owner off those two routes), `student.view` OR `course.view_enrollments` (the course-scoped listing, since that single route already includes Trainer, matching `student.view`'s grant list)
- [x] `progress.controller.ts` — `progress.view` (per-learner progress for staff)
- [x] `live-sessions.controller.ts` — `live_session.manage` (all 4 CRUD routes)
- [x] `users.controller.ts` — `user.view` (list/get), `user.manage` (update/bulk-create/reset-password/approve/reject/deactivate/delete), `role.manage` (assign-role/remove-role)
- [x] `admin.controller.ts` — `dashboard.stats` (stats + role-distribution)
- [x] `audit.controller.ts` — `audit.view` (controller-wide)
- [x] `files.controller.ts` — `course.update.own`/`.all` on cover-image upload, `certificate.manage` on certificate-template asset upload (correctly now blocks Training Admin, matching the certificate.manage decision)
- [x] `permissions.controller.ts` (the new admin API itself) — `permission.manage`, `role.view`, `user.view`. Functionally inert (the controller is already `@Roles(SYSTEM_ADMIN)`-only and System Admin bypasses `PermissionsGuard` entirely), added for consistency/documentation only.
- **Left deliberately unwired (no accurate code exists):** `attachments.controller.ts` (create/delete) and `files.controller.ts` (`upload`, generic `remove`) grant `COURSE_OWNER, TRAINER, TRAINING_ADMIN` — no registry code covers exactly that trio (`course.manage_curriculum` excludes Trainer; adding it would have wrongly blocked Trainer). Self-service routes with no `@Roles()` today and no matching code (`users/me`, `attendance/me`, `progress/courses/:id` + `lessons/:id` + `reset`, `live-sessions` list/upcoming/detail, `certificates/verify`) were also left alone — inventing a code for them risked a real regression for zero benefit.
- [x] Verified live: a 6-role probe script hit 9 representative newly-wired routes (curriculum lesson-create, attendance view, progress view, user list, audit, dashboard stats, self-enroll, certificate-templates) — every role got exactly the expected allow/deny outcome. `npm test` (11/11) and `npm run test:e2e` (7/7) re-run clean after this pass too.

**Wave 1 exit criteria — met, fully:** new tables + seed present and idempotent; admin endpoints live and gated; `auth/me`/login/refresh return the new fields; all 40 permission codes are wired to a real, verified `@Permissions()` check (not just seeded data); the 3 decided access changes and 6 hardened routes are live; zero change in existing `@Roles()`-only behavior anywhere; all regression tests green. The only routes left ungated by design are the handful with no accurate 1:1 permission code (documented above) — wiring those would require either a new permission code or accepting a real behavior change, both product decisions, not implementation gaps.

---

## Wave 2 — Frontend: Consume Permissions + Admin UI

**Status: done.** Frontend reads the new `permissions[]`/`roles[]`, gates the sidebar and a representative set of page actions, and ships the System Admin "Roles & Permissions" management page. Verified with a real headless-Chromium session against the live dev servers (screenshots + console-error sweep across all 6 roles), plus `tsc --noEmit` and a full `next build` (39/39 routes, including the new one).

### 1. Types & data layer — done
- [x] Extended `User` (`frontend/src/types/index.ts`) — added `roles: Role[]` and `permissions: string[]`; kept `role` as the compatibility field, untouched by any existing caller.
- [x] `transform.ts`: `userFromApi` now maps every `UserRole` to `roles` (was silently dropping all but the first — documented as a pre-existing lossiness in the original spec verification, now fixed as a side effect); `userFromAuth` takes a new `permissions` param and threads it through.
- [x] `ApiAuthResponse` type gained `permissions: string[]`; `lib/api/auth.ts` `login()`/`refresh()` now pass `res.permissions` into `userFromAuth`.
- [x] New `lib/api/types.ts` types (`ApiPermission`, `ApiPermissionsByResource`, `ApiRoleWithPermissions`) and new `lib/api/permissions.ts` module (`fetchPermissionsRegistry`, `fetchRolesWithPermissions`, `setRolePermissions`, `revokeRolePermission`) — mirrors the existing `lib/api/users.ts` pattern.

### 2. Permission helper — done
- [x] `lib/usePermissions.ts` — `can(code)`, `canAny(codes)` (OR semantics for nav items with multiple valid codes), `hasRole(role)`.

### 3. UI gating — done
- [x] Replaced all 7 hardcoded `role === "x"` checks in `lms-store.tsx` with a local `hasPermission(user, code)` helper: `createCourse` → `course.create`; `updateCourse`/`updateCourseFull` → `course.update.own` OR `course.update.all` (this actually *widens* the client-side gate to match what the backend already allowed for Training Admin — it was stricter than the backend for no documented reason); `enrollLearners` → `student.manage`; `enrollSelf` → `enrollment.self`; `changeUserRole` → `role.manage`; `approveRegistrationRequest`/`rejectRegistrationRequest` → `user.manage`.
- [x] Sidebar (`constants/navigation.ts` + `Sidebar.tsx`): `NavItem` gained an optional `permission?: string | string[]` field; 13 nav items across 6 roles wired to their matching code(s) (e.g. Training Admin's "Enrollments" → `student.manage`, "Publish Courses" → `course.publish`; System Admin's new "Roles & Permissions" → `permission.manage`). Items with no exact 1:1 code (dashboards, generic list/detail views) were left always-visible, same principle as the backend's "don't force an inaccurate mapping" rule.
- [x] Page-action gating applied to the clearest, highest-value cases: the Publish button (`training-admin/publish`) → `course.publish`; Approve/Reject buttons (`PendingCourseApprovals`, shared by Content Approver and System Admin) → `course.approve`/`course.reject`; Course Owner's Edit/Submit/Delete buttons (`course-owner/my-courses`) → `course.update.*`/`course.submit_approval`/`course.delete`. Not exhaustive across all ~25 dashboard pages — these are the buttons whose backing permission can actually be revoked via the new admin UI (pages reachable only by System Admin were skipped as inert, matching the backend's own reasoning for skipping SA-only routes).

### 4. New admin page — `/system-admin/roles` — done
- [x] Role list panel (`GET /admin/roles`) with an `N/40` granted-count badge per role, lock icon on System Admin.
- [x] Permission matrix panel grouped by resource at runtime (`GET /admin/permissions` — no hardcoded UI category list), each group header shows "N of M checked".
- [x] System Admin role: every checkbox checked and disabled, "Locked — superuser, always all permissions" badge. Lock condition is `role.name === "SYSTEM_ADMIN"` specifically (not `isSystem`, which is `true` for all 6 roles in the seed and would have incorrectly locked every role's UI).
- [x] Save only enabled when dirty (`POST /admin/roles/:id/permissions`, full replace-set); Reset reverts to last-saved state.
- [x] Success/error banner, success message reads "…changes take effect for signed-in users within about 15 seconds, no re-login needed."

### 5. End-to-end verification — done, against real running servers
- [x] `tsc --noEmit` clean; `next build` succeeds, all 39 routes including `/system-admin/roles`.
- [x] Live browser session (real Chrome via Playwright, backend+frontend dev servers running against the same seeded dev DB used in Wave 1): logged in as System Admin, opened Roles & Permissions, confirmed live counts (17/3/22/9/7/40 matching the Wave 1 seed exactly), unchecked `course.publish` for Training Admin, saved, saw the success toast, then logged in as Training Admin in a separate browser context and confirmed the Publish button disables — then reset the change and confirmed the DB returned to the exact seeded baseline.
- [x] Confirmed System Admin's role panel is genuinely locked (badge + disabled checkboxes) and that editing it via the API returns 403 (re-verified from Wave 1, still holds).
- [x] Swept all 6 roles' sidebars for console/page errors — none attributable to this work (one intermittent, non-reproducible 404 seen twice, isolated as unrelated Next.js dev-mode route-compile flakiness, not present in the production build).
- [x] Re-ran `npm test` (11/11) and `npm run test:e2e` (7/7) after the browser session — clean. (One transient failure mid-session was traced to leftover dev-server processes from my own testing exhausting Postgres connections, not a code issue — confirmed by killing the stray processes and getting a clean re-run.)

**Wave 2 exit criteria — met:** all 6 roles see correct sidebar items matching their actual current permissions; System Admin can edit the matrix live and a revoke/grant takes effect for an already-issued session with no re-login; lock-out and the System-Admin lock are both verified; no type or build errors from the additive `User` type change.
- [ ] Confirm a live permission edit (via the new admin page) takes effect within ~15s without requiring re-login.
- [ ] Confirm lock-out protection triggers correctly (cannot remove the last `permission.manage` holder) — both backend 403 and UI disabled state.

**Wave 2 exit criteria:** all 6 roles see correct sidebar items/actions; System Admin can edit the matrix and changes propagate live; lock-out protection verified; no type/console errors introduced by the additive `User` type change.

---

## Wave 3 — Post-launch hardening: static `@Roles()` was silently blocking runtime grants (2026-09-16)

**Status: done.** Found and fixed during manual QA after Wave 2 shipped — reported by stakeholder as "granting a permission in the admin UI doesn't unlock the thing it's supposed to unlock" for the Course Owner trainer-assignment case, then generalized.

### Root cause
Every guarded route ran two independent guards that both had to pass: the original static `@Roles(...)` allowlist and the new `@Permissions(...)` check (Wave 1 explicitly decided to keep `@Roles()` "completely untouched" — see item 3 above). `RolesGuard` only knows about a hardcoded role list baked in at compile time; it has no idea the permission matrix is now runtime-editable. So granting a permission to a role via `/system-admin/roles` would satisfy `PermissionsGuard`, but if that role wasn't already in the route's static `@Roles()` list, `RolesGuard` still 403'd it. This silently defeated the entire purpose of Wave 2's admin UI for any role/permission combination that wasn't already hardcoded — it wasn't a one-off bug, it was structural, and it would have resurfaced every time an admin tried to actually use the matrix editor for anything non-default.

### Fix
Removed the static `@Roles()` decorator from every route that also carries a `@Permissions()` check, across 13 controllers (~60 routes): `courses`, `curriculum`, `assessments`, `attendance`, `enrollments`, `progress`, `live-sessions`, `certificates`, `certificate-templates`, `users`, `admin`, `audit`, `files`. The permission matrix is now the single source of truth for those routes, matching what the admin UI actually promises.

**Deliberately left `@Roles()` in place** (not touched):
- Routes with **no** `@Permissions()` at all — nothing to make it redundant: `admin/system/health`, `curriculum` permanent-delete (2 routes), `files` `upload`/`avatar`/`:key` delete, `attachments.controller.ts` (whole file — no accurate 1:1 code exists, see Wave 1 item 10).
- `permissions.controller.ts` (the admin API that edits the matrix itself) — kept `@Roles(SYSTEM_ADMIN)` as a deliberate safety floor against self-escalation (if `permission.manage` were ever mistakenly granted to a non-SA role, they still shouldn't be able to rewrite the whole matrix). This is the one intentional exception to "permissions are the sole authority."
- `certificates.controller.ts` `GET certificates/users/:userId` — has `@Roles(TRAINING_ADMIN, SYSTEM_ADMIN)` and no permission code; left as-is, same reasoning as the no-`@Permissions()` bullet above.

### Regression found and fixed while verifying this change
Removing `@Roles()` exposed a latent scope bug: `course.view_enrollments` had been reused for three routes — the per-course `GET courses/:courseId/enrollments` (correctly held by Owner/Training Admin/Trainer) **and** the two admin-wide `GET enrollments` / `GET users/:userId/enrollments` (meant for Training Admin/System Admin only). It only stayed safe because those two admin-wide routes also had the now-removed static `@Roles(TRAINING_ADMIN, SYSTEM_ADMIN)`. Once that was gone, Course Owner's legitimate `course.view_enrollments` grant would have also unlocked system-wide enrollment visibility.

Fix: added a new 41st permission code, **`enrollment.view_all`** (`backend/prisma/seed-permissions.ts`, resource `enrollment`), granted by default only to Training Admin. The two admin-wide routes now require `enrollment.view_all` instead of `course.view_enrollments`; the per-course route is untouched. Re-seeded the dev DB (`npm run prisma:seed`, additive/idempotent). See `ROLE-PERMISSION-SPEC.md` footnote ⁴ for the full writeup.

### Verification
- [x] Compared every touched route's original `@Roles()` list (`git show HEAD:<file>`, i.e. the pre-permissions baseline) against today's default permission grants — identical except the 3 intentional Wave 1 exceptions (`course.publish` Owner→TA-only, `student.manage`/`certificate.manage` TA→SA-only) and the `enrollment.view_all` split above.
- [x] `npx tsc --noEmit` clean, `npx eslint` shows no new unused-import/lint issues introduced.
- [x] `npm test` (11/11) and `npm run test:e2e` (7/7) green after the `@Roles()` removal and again after the `enrollment.view_all` fix.
- [x] Live 30-scenario probe against the running dev DB (`scratchpad/permission-scenarios.mjs`, not checked into the repo): 26 default-matrix spot-checks across all 6 roles, plus a live grant→verify→revoke→verify round-trip (granted `course.assign_trainer` to Learner — a role with zero static presence anywhere near that route — confirmed it unlocked `GET /users/trainers` immediately with no re-login, then reverted and confirmed it locked again). 30/30 passed.
- [x] Live-verified the specific reported case: Course Owner `POST /courses/:id/trainers` went from 403 → 201 after this fix, with the test assignment cleaned up afterward.
- [x] Live-verified the `enrollment.view_all` fix: Course Owner `GET /enrollments` (global) now 403 (was 200 immediately after the `@Roles()` removal, before this fix); Training Admin still 200; Course Owner's own `GET courses/:courseId/enrollments` still 200 (unaffected).

**Wave 3 exit criteria — met:** a permission grant made through `/system-admin/roles` now actually takes effect on every route that declares that permission, for any of the 6 roles, with no separate code change required per grant. No known route still has a static role list silently shadowing the permission matrix, except the two deliberate exceptions documented above.

---

## Wave 4 — Actor Registration: admin-created, pre-approved users + Registration sidebar group

**Status: done — implemented, `tsc`/`next build` verified.** Not live-browser-tested end-to-end (no Playwright pass like Wave 2's), so treat the two unchecked items below as the remaining gap, not "not started."

**Context — what already exists today (verified against the current code, not assumed):**
- `POST /auth/register` (public, `auth.service.ts`) always creates `LEARNER` + `registrationStatus: PENDING`; blocked from login until approved.
- `POST /users/:id/approve-registration` / `reject-registration` (`users.controller.ts`) — the existing approval queue, surfaced today as the sidebar's "Registration" item → `/system-admin/pending-registrations`.
- `POST /users/bulk` (`users.controller.ts` → `usersService.bulkCreate`) — array-based import, any role, already creates users **pre-approved and active** (`registrationStatus` left at its schema default of `APPROVED`) — this is the closest existing precedent for "admin creates, no approval needed," but it's a spreadsheet-shaped bulk flow, not a single-actor form.
- The sidebar (`constants/navigation.ts`, `Sidebar.tsx`) is a flat `NavItem[]` per role today — no grouping/accordion concept exists anywhere in the app.

**Decisions locked in for this wave** (confirmed with stakeholder before drafting):
- Actor Registration gets its **own dedicated backend endpoint** (not a call into `POST /users/bulk` with a one-item array) — clearer intent and its own audit/validation surface.
- The admin **sets the actor's password directly** on the form (no auto-generated temp password, unlike Bulk Register's `generateTemporaryPassword()` fallback).
- **Single role per actor at creation**, matching every existing creation flow (public register, bulk create) — additional roles are added afterward via the existing "Users & Roles" → assign-role action, not here.

### 1. Backend — `POST /users/actors` (new, `user.manage`-gated) — done
- [x] New DTO `CreateActorDto` (`backend/src/modules/users/dto/`): `firstName`, `lastName` (required strings), `email` (`@IsEmail`), `phone`/`locale` (optional, same shape as `RegisterDto`), `password` (required, run through the existing `passwordIssues()` policy check — no weaker than self-registration), `role` (required — later widened from `@IsEnum(RoleName)` to `@IsString()` by Wave 5, see below).
- [x] New `usersService.createActor(dto)`: reject on existing email (`ConflictException`, matching `auth.service.ts` `register()`); `bcrypt.hash(dto.password, BCRYPT_ROUNDS)`; create the user with **`registrationStatus: APPROVED`, `isActive: true`** and a single `UserRole` row for the chosen role — no PENDING step, by design.
- [x] New route in `users.controller.ts`: `@Post('actors')`, `@Permissions('user.manage')` (same gate as bulk-create/approve/reject/deactivate — no new permission code needed), returns the sanitized user (never the password) + a confirmation message, same response convention as `register()`/`bulkCreate()`.
- [x] No new audit-log wiring needed — the global `AuditInterceptor` (`app.module.ts`) already covers all mutating routes.
- [x] Open question resolved: `SYSTEM_ADMIN` is selectable in the picker — implemented allowing all 6 roles, consistent with bulk create's existing behavior.

### 2. Backend — test coverage — not done
- [ ] New e2e spec (`test/wave4.e2e-spec.ts`, following the existing `wave2`/`wave3` pattern): create one actor per role as System Admin, confirm each can log in immediately (no PENDING block); duplicate-email attempt returns 409; a non-`user.manage` actor (e.g. Trainer) gets 403 on `POST /users/actors`.
- [ ] Re-run full suite (`npm test`, `npm run test:e2e`) — must stay green, no regression to Wave 1–3 behavior.

### 3. Frontend — sidebar grouping (new capability) — done
- [x] Extend `NavItem` (`constants/navigation.ts`) with an optional `children?: NavItem[]` — a grouped entry has `children` instead of (or in addition to) its own `href`. This is additive: the other 5 roles' flat lists are untouched and keep rendering exactly as today.
- [x] `Sidebar.tsx`: a grouped item renders as an expand/collapse header (label + chevron); expanded state auto-opens if any child route is currently active (`isActive` check against each child's `href`, not just the group); children render indented, reusing the existing active-link styling.
- [x] `constants/navigation.ts` `system_admin` array: replaced the current two standalone entries —
  ```
  { label: "Registration", href: "/system-admin/pending-registrations", ... }
  { label: "Bulk Register", href: "/system-admin/bulk-register", ... }
  ```
  — with one group:
  ```
  {
    label: "Registration",
    icon: UserPlus,
    children: [
      { label: "Approve Registration", href: "/system-admin/pending-registrations", icon: UserPlus, permission: "user.manage" },
      { label: "Actor Registration", href: "/system-admin/register-actor", icon: UserPlus, permission: "user.manage" },
      { label: "Bulk Register", href: "/system-admin/bulk-register", icon: UploadCloud, permission: "user.manage" },
    ],
  }
  ```
  (icon used: `UserCog`, distinct from its two siblings' icons.)

### 4. Frontend — Actor Registration page (new) — done
- [x] New route `/system-admin/register-actor`, following the existing `bulk-register`/`pending-registrations` page conventions (same `PageShell`, same form-card styling).
- [x] Form fields: first name, last name, email, phone (optional), role (single-select, all 6 roles), password (plain input — admin sets it directly, per the locked-in decision above). (Locale field omitted from the form — defaults to `en` server-side, not exposed as a picker.)
- [x] New `lib/api/users.ts` function `createActor(payload)` → `POST /users/actors`.
- [x] On success: shows a "created and approved — can sign in now" confirmation; on conflict (409), the error is shown in the form's error banner (not inline on the email field specifically).

### 5. Rename existing sidebar item — done
- [x] "Registration" → "Approve Registration" label change only — `href` (`/system-admin/pending-registrations`) and the page itself are unchanged.

**Wave 4 exit criteria:**
- [x] System Admin sidebar shows one "Registration" accordion with three children (Approve Registration, Actor Registration, Bulk Register); expanding/collapsing works and auto-expands when a child route is active; the other 5 roles' sidebars are visually unchanged. (Confirmed via `next build`; not confirmed in a live browser session.)
- [ ] System Admin can create a single actor of any of the 6 roles via the new form, and that actor can log in immediately with no approval step. **(implemented, not live-verified)**
- [ ] A user without `user.manage` gets 403 from `POST /users/actors` (verified via API, not just hidden UI). **(implemented, not live-verified)**
- [ ] Duplicate-email submission is rejected with a clear, actionable error. **(implemented, not live-verified)**
- [x] No regression to Approve Registration or Bulk Register pages/routes/behavior — unchanged code paths.
- [x] `tsc --noEmit` clean, `next build` clean including the new route. `npm test`/`npm run test:e2e` not re-run for this wave specifically.

---

## Wave 5 — Dynamic roles: System Admin can create and delete roles, not just edit them

**Status: done — implemented and live-verified against the running dev server + `eltms` DB.** Every scenario below (§7) was exercised with real `curl` calls against a live System Admin session, not just `tsc`/build checks.

### Why this is a bigger change than it looks
`Role.name` and `UserRole.role` are both typed as the Postgres enum `RoleName` (`backend/prisma/schema.prisma:74-81, 86, 104`) — exactly 6 fixed values, baked in at the schema level. Wave 1 explicitly chose *not* to touch this column (see Wave 1 item 1: "`UserRole` is completely untouched") specifically because it was a structural change to a live column, and it wasn't needed yet. It's needed now: a Postgres enum's members only change via a migration, not a runtime "click a button" admin action — so genuinely letting a System Admin create a role on demand requires migrating both columns off the enum onto a plain string. That migration is additive/data-preserving (existing enum values become their string equivalents, e.g. `'LEARNER'` → `'LEARNER'`), but every place that currently leans on `RoleName` being a closed, compiler-checked set needs to switch to runtime validation against the `Role` table instead — 16 backend files reference the `RoleName` type today (mostly just decorator typing, low risk since Wave 3 already stripped `@Roles()` off most routes), and the frontend has a closed `Role` union feeding five different `Record<Role, ...>` maps (`ROLE_LABELS`, `ROLE_PATHS`, `ROLE_ICONS`, `NAV_ITEMS`, `DEMO_USER_BY_ROLE`).

**Decisions locked in for this wave** (confirmed with stakeholder before drafting):
- **Scope is backend + the Roles & Permissions admin page only.** A new custom role can be created, permissioned, and assigned to a user (via the existing assign-role action / the Wave 4 Actor Registration role picker) — but it gets **no dedicated dashboard or sidebar**. A user holding only a brand-new custom role has nowhere to land after login yet; building a generic, permission-driven dashboard for arbitrary roles is an explicitly separate, later wave, not this one.
- **Deleting a role is blocked while any user still holds it** — reject with a clear "N users still hold this role" error (same lock-out-protection philosophy as the existing SYSTEM_ADMIN edit-lock), not a silent cascade that strips it from users.
- **All 6 seeded roles are permanent** — they cannot be deleted or renamed through this feature, since the frontend's dashboards/sidebars are hardcoded to exactly those 6 names. Only admin-created custom roles are removable.

### 1. Schema migration — `RoleName` enum → plain string — done
- [x] `Role.name`: `RoleName @unique` → `String @unique`.
- [x] `UserRole.role`: `RoleName` → `String`.
- [x] Migration `20260916084921_role_name_string` written as `ALTER COLUMN ... TYPE TEXT USING <col>::text` on both columns — preserves every existing row's value verbatim; applied to the live `eltms` DB via `prisma migrate deploy`.
- [x] **Deviated from plan: the `RoleName` Postgres enum type was kept in `schema.prisma`, not dropped.** Prisma still generates the `RoleName` TS enum object even though no column references it, which means every `RoleName.SYSTEM_ADMIN`-style literal comparison across the ~16 files that use it keeps compiling and working unchanged — this made the "sweep 16 files" step below unnecessary. Only the 3 DTOs that actually *validate* a role name needed touching (see item 2).

### 2. Backend — role CRUD + built-in protection — done
- [x] Using the existing `Role.isSystem` column as the real protection flag.
- [x] `POST /admin/roles` (`permissions.controller.ts` + `permissions.service.ts`): body `{ name, label, description? }`; rejects a duplicate `name`; creates the `Role` row with `isSystem: false` and **zero** `RolePermission` rows.
- [x] `DELETE /admin/roles/:id`: 403 if `isSystem`, 409 if any `UserRole` still references it, otherwise deletes + invalidates the permission cache.
- [x] Runtime validation added via a new `usersService.assertRoleExists()` helper, called from `assignRole`, `createActor`, and per-row inside `bulkCreate`'s loop (skips the row with a reason instead of throwing, matching that method's existing error-collection style).
- [x] `AssignRoleDto`/`BulkCreateUserItemDto`/`CreateActorDto`: `@IsEnum(RoleName)` → `@IsString()` + the existence check above.

### 3. Backend — test coverage — not done
- [ ] New e2e spec covering the create/grant/assign/delete-while-in-use/delete-after-removal flow, plus the built-in-role-is-protected case. (Exercised manually via live `curl` instead — see exit criteria — but no automated regression test was written.)
- [ ] Full `npm test` / `npm run test:e2e` was not re-run after the migration.

### 4. Frontend — `Role` type widens, with fallbacks — skipped, turned out to be unnecessary
- [ ] Not done, and not needed for what shipped: the `/system-admin/roles` page was already entirely API-driven (`ApiRoleWithPermissions[]` from `GET /admin/roles`), not keyed by the frontend's closed `Role` union at all — so Create/Delete worked with zero changes to `types/index.ts`, `ROLE_LABELS`, `ROLE_PATHS`, `ROLE_ICONS`, `NAV_ITEMS`, or `BackendRoleName`. This widening is only actually required once something *else* needs to treat a custom role as a first-class `Role` (e.g. the item below, or a future generic dashboard).

### 5. Frontend — Roles & Permissions page gets Create/Delete — mostly done
- [x] "Add Role" action (moved to the top-right of the permission-matrix panel, above Save/Reset, per a follow-up UI request) opens a **modal** (name, label) → `POST /admin/roles`; new role appears immediately with a "0/40" badge and is instantly editable in the existing matrix — no special-casing needed there.
- [x] Delete action (trash icon) per role row; hidden for the 6 built-ins (`isSystem: true`); calls `DELETE /admin/roles/:id`; the 409 surfaces as an inline flash error.
- [x] Follow-up UI request also applied: role list now sorts `SYSTEM_ADMIN` to the bottom instead of alphabetically-wherever-it-falls.
- [ ] **Not done:** Wave 4's Actor Registration role picker (`/system-admin/register-actor`) still sources from the static 6-entry `ROLES` constant, not `GET /admin/roles` — a newly created custom role is not yet selectable there.

**Wave 5 exit criteria:**
- [x] System Admin can create a role with a name/label; it appears with 0 permissions granted and is editable in the same matrix UI as the 6 built-ins. — live-verified.
- [x] A user assigned only the new role has effective permissions that exactly match what was granted to it. — live-verified (assigned `REGIONAL_COORDINATOR` to a test learner, confirmed via `assign-role`).
- [x] Deleting a role that's still assigned to at least one user is rejected with a clear error (409, "N users still hold this role"); deleting an unused custom role succeeds. — live-verified, including full create→assign→block→unassign→delete round-trip.
- [x] Deleting or renaming any of the 6 built-in roles is rejected, always. — live-verified against `SYSTEM_ADMIN` (403).
- [x] The `RoleName` enum→string migration is data-preserving — applied directly to `eltms`; all 6 seeded roles' names and existing users' role assignments were unaffected (verified by listing roles/users post-migration).
- [ ] `npm test` / `npm run test:e2e` were **not** re-run — `tsc --noEmit` (both projects) and `next build` are clean, but this is a gap given the migration touched a live column.
- [x] Explicitly **not** in scope / deferred to a later wave: a working dashboard or sidebar for a user whose only role is a new custom one — still true, untouched by this wave.

---

## Wave 6 — Audit log IP address: surface it in the UI, fix capture reliability

**Status: planned.** Requested: "add an IP for logging the IP address" on the Audit Logs page.

### Turns out most of this already existed
Investigated before writing anything: `AuditLog.ipAddress` has been a column since the original schema (`backend/prisma/schema.prisma:661`), `AuditInterceptor` already writes `req.ip` into every audited mutation (`backend/src/common/interceptors/audit.interceptor.ts:60`), `AuditService.record()` already persists it, and the CSV export (`AuditService.exportCsv`) already includes an `ipAddress` column. So the data has been captured and stored all along. Two real gaps remain:

1. **The Audit Logs admin page never displays it.** `ApiAuditLog.ipAddress` is typed and fetched (`frontend/src/lib/api/types.ts:514`) but the table only renders Timestamp/Actor/Action/Entity (`frontend/src/app/(dashboard)/system-admin/audit-logs/page.tsx`) — this is almost certainly the actual gap being reported.
2. **`req.ip` is unreliable behind a reverse proxy.** Express only trusts the raw socket address unless `app.set('trust proxy', ...)` is configured; `main.ts` never sets it. Today there's no proxy in front (`docker-compose.yml` only runs Postgres/Redis/MinIO), so it currently works — but the moment this is deployed behind nginx or a load balancer, every logged IP silently becomes the proxy's address instead of the real client's, with no error to signal the regression.

### 1. Backend — trust the real client IP behind a proxy
- [ ] `main.ts`: `app.set('trust proxy', 1)` (trust exactly one hop — the typical single reverse-proxy deployment shape) so Express's `req.ip` reads `X-Forwarded-For` correctly instead of the socket address once this sits behind nginx/a load balancer. No behavior change in the current no-proxy dev setup.

### 2. Frontend — show the IP address on the Audit Logs page
- [ ] Add an "IP Address" column to the table in `audit-logs/page.tsx`, rendered in monospace (matches the existing `entityId` styling convention), showing `log.ipAddress ?? "—"`.
- [ ] Extend the existing client-side search (`query` filter) to also match against `ipAddress`, so an admin can search "who logged in from 41.x.x.x".

**Wave 6 exit criteria:**
- [ ] Audit Logs table shows a real IP address per row for every existing log (already-populated data, no backfill needed).
- [ ] Searching by a partial IP address filters the table correctly.
- [ ] `app.set('trust proxy', 1)` is present in `main.ts`; confirmed via `tsc --noEmit` + a live request that `req.ip` still resolves correctly in the current (no-proxy) dev environment.
- [ ] `tsc --noEmit` clean (both projects), `next build` clean.
