# Common Settings, Help/Support & Layout — Implementation Plan

Covers three waves:

- **Wave 1 — Account Settings & Help/Support**: per-user settings available on **every**
  dashboard (all roles), accessed from the sidebar bottom **above** the existing
  "Switch role / Sign out" footer, which stays unchanged.
- **Wave 2 — Layout**: remove the duplicated Header logo (sidebar one is enough) and make
  the sidebar expandable/collapsible.
- **Wave 3 — User Management (permission-based)**: admins holding `user.manage` can
  deactivate users, change role/status, switch Users & Roles pages between grid/table, and
  view a user detail modal. Access to these pages is **purely permission-based —
  the role redirect is ignored**.

Share of work: **Backend first (with tests)** → verify with e2e/curl → **Frontend**.

---

## 1. Goal / Deliverables (Wave 1)

1. **Account** (sidebar button → opens modal with tabs)
   - **Profile** tab — avatar upload, first/last name, phone, TIN, locale (en/am)
   - **Security** tab — change current password
   - **Details** tab — read-only: email, roles, status, member since, last login
   - **Preferences** tab — language toggle (persisted to `PATCH /users/me`)
2. **Help & Support** (sidebar button → modal with FAQ / contact / shortcuts / version)
3. **Language Toggle** — persisted per-user (backend `locale`), shared with existing
   `LanguageToggle` component and the LMS store's `lang`.
4. Keep **"Switch role / Sign out"** footer exactly as it is today.

---

## 2. Current State (verified)

### Backend — already exists
| Endpoint | Purpose | Notes |
|---|---|---|
| `GET /users/me` | Get own profile | returns `sanitizeUser` |
| `PATCH /users/me` | Update own profile | `UpdateUserDto`: firstName, lastName, phone, locale, avatarUrl |
| `POST /users/me/change-password` | Change own password | `ChangePasswordDto`: currentPassword, newPassword (min 6) |
| `POST /files/avatar` | Upload avatar | persists `avatarUrl` on the user |

- Prisma `User` model already has `tin String?`, `avatarUrl String?`, `locale String default "en"`.
- **Gaps:** `UpdateUserDto` does **not** accept `tin`; there is **no** `department` on the `User`
  model (only courses). `ApiUser` (frontend) doesn't carry `tin`/`department`.

### Frontend — already exists
- `LanguageToggle.tsx` in `src/components/shared/` (local state only, not persisted).
- `Modal.tsx`, `Button.tsx`, `Badge.tsx` UI components to reuse.
- `lms-store.tsx` exposes `lang`, `setLang`, `currentUser`.
- Sidebar footer (`Sidebar.tsx:167`) = "Switch role / Sign out".

### Frontend gaps
- No `updateMyProfile`, `changeMyPassword`, `uploadAvatar` API helpers.
- `ApiUser`/`userFromApi` (`transform.ts:112`) drops `tin` and sets `department: ""`.
- **Wave 3 gaps:** Users page (`system-admin/users`) is hardcoded to `role="system_admin"`
  in `PageShell`; `DashboardShell` (`DashboardShell.tsx:21-23`) role-redirects away from any
  path whose first segment isn't the user's role — blocks permission-based access; `deactivateUser`
  helper exists in `users.ts` but is **not wired** into the store/page; no `reactivate` endpoint;
  no delete/deactivate UX, no grid/table toggle, no user-detail modal on either page.

---

## 3. Backend Tasks (do first, test, then frontend) — Wave 1
> Wave 3 backend work happens in its own section (§Wave 3. Backend). Nothing here changes.

### 3.1 Extend `UpdateUserDto` with TIN
File: `backend/src/modules/users/dto/update-user.dto.ts`

- Add optional `tin?: string` (`@IsOptional() @IsString()`).
- (Optional, only if we want department: would require migration — see 3.2.)

### 3.2 (Optional) Add `department` to User
File: `backend/prisma/schema.prisma` + migration via `npm run prisma:migrate`

```prisma
model User {
  ...
  tin        String?
  department String?  // NEW
  ...
}
```
- Skip if out of scope for this task; profile edit will just not include department.

### 3.3 Expose TIN in API responses
File: `backend/src/modules/users/users.service.ts` — `sanitizeUser(...)`

- Include `tin` (and `department` if added in 3.2) in the returned object.

### 3.4 Refresh-token invalidation on profile/security changes (audit already exists)
- `changePassword` already revokes sessions (`users.service.ts:247`).
- Confirm `update()` does the same for phone/locale if desired (likely not needed).

### 3.5 Backend tests
Add to `backend/src/modules/users/` (unit) or extend `backend/test/*.e2e-spec.ts`:

1. `PATCH /users/me` with `{ firstName, phone, tin, locale }` → 200, response includes `tin`,
   firstName updated, other fields unchanged.
2. `PATCH /users/me` with invalid payload (e.g. `locale: "xx"`) → 400.
3. `POST /users/me/change-password` with wrong `currentPassword` → 401/400.
4. `POST /users/me/change-password` with valid creds → 200, old password no longer works,
   refresh tokens revoked.
5. Unauthenticated access to `GET/PATCH /users/me` → 401.

### 3.6 Run backend checks
```bash
cd backend
npm run lint
npm run test            # unit tests
npm run test:e2e        # e2e
```

### 3.7 Manual API verification (curl)
```bash
# login → capture access token
curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"sysadmin@eltms.gov.et","password":"Password123!"}'

# update profile (tin + locale)
curl -s -X PATCH http://localhost:3001/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"tin":"9000123456","locale":"am","phone":"+251911000000"}'

# change password
curl -s -X POST http://localhost:3001/api/v1/users/me/change-password \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"currentPassword":"Password123!","newPassword":"NewPass123!"}'
```

---

## 4. Frontend Tasks (after backend is green)

### 4.1 API layer
Files: `frontend/src/lib/api/types.ts`, `frontend/src/lib/api/users.ts`, `frontend/src/lib/api/files.ts`

- `ApiUser`: add `tin: string | null` (+ `department` if added).
- `userFromApi` (`transform.ts:112`): map `tin`, `department`.
- Add to `users.ts`:
  - `updateMyProfile(input: { firstName?; lastName?; phone?; tin?; locale?: "en"|"am" })` → `PATCH users/me`
  - `changeMyPassword(input: { currentPassword; newPassword })` → `POST users/me/change-password`
  - `fetchMyProfile()` → `GET users/me` (optional)
- Add to `files.ts`: `uploadAvatar(file)` → `POST files/avatar`.

### 4.2 Store wiring (`lms-store.tsx`)
- Add `updateProfile()`, `changePassword()`, `updateLocale()` to `LmsContextValue` (+ `useMemo` deps).
- `updateLocale(locale)` → `PATCH /users/me { locale }` then `setLang(locale)` + update
  `currentUser.locale` so the toggle persists across reloads.

### 4.3 UI components (new folder `frontend/src/components/shared/account/`)
- `AccountMenu.tsx` — the sidebar footer button + trigger for the modal.
- `AccountModal.tsx` — modal shell with tab state (`useState<"profile"|"security"|"details"|"preferences">`).
- `ProfileTab.tsx` — form: avatar upload (preview + `uploadAvatar`), firstName, lastName, phone, tin.
- `SecurityTab.tsx` — currentPassword + newPassword (+ confirm), success/error toast.
- `DetailsTab.tsx` — read-only rows: email, roles (Badge), status (Badge), createdAt, lastLogin.
- `PreferencesTab.tsx` — language radio/toggle (reuses `LanguageToggle` semantics → `updateLocale`).
- `HelpSupport.tsx` — modal (or fifth tab) with FAQ accordion, contact (support email/phone),
  keyboard shortcuts, app version.

### 4.4 Sidebar integration (`Sidebar.tsx`)
Keep structure, add above the existing footer:

```tsx
<div className="relative border-t border-slate-200 p-3 space-y-1">
  <button onClick={() => setAccountOpen(true)}>User  Account</button>
  <button onClick={() => setHelpOpen(true)}>HelpCircle  Help & Support</button>
  {/* existing Switch role / Sign out link unchanged */}
</div>
```

- Render `<AccountMenu />` / `<HelpSupport />` modals when open (client-side state in Sidebar).

### 4.5 Language toggle persistence
- `LanguageToggle.tsx` currently only calls `setLang` locally → add `updateLocale` call so the
  choice is persisted per user via `PATCH /users/me`.

### 4.6 Frontend checks
```bash
cd frontend
npx tsc --noEmit        # typecheck
npm run lint            # next lint
npm run build           # production build
```

---

## 5. Wave 2 — Layout: Header Logo + Collapsible Sidebar

### 5.1 Remove duplicated Header logo, and the "ELTMS · Dashboard" eyebrow
File: `frontend/src/components/layout/Header.tsx`

- Removed the `<Image src="/logo.jpg" .../>` block from the header start (a second copy of
  the sidebar logo) — **done**.
- **Updated (2026-09-17):** also removed the "ELTMS · Dashboard" + role-title left block
  entirely (per direct request) rather than keeping it. The header's left side is now empty;
  `justify-end` on the `<header>` pushes the search box, notification bell, and profile block
  to the right edge.
- Only the sidebar logo (Sidebar.tsx:50-64) remains — always visible, even when collapsed.

### 5.1b Header profile → opens Account modal
- The right-aligned avatar + name/email block is now a `<button>` that opens the same
  `AccountModal` used from the sidebar's "Account" entry (own `accountOpen` state in
  `Header.tsx`, `AccountModal` imported directly from `@/components/shared/account/AccountModal`).

### 5.2 Collapsible sidebar — state
- Add local `const [collapsed, setCollapsed] = useState(false)` in `Sidebar.tsx`.
- Width: `cn("... w-64 ...", collapsed && "w-[76px]")`; add a `transition-[width] duration-200`.
- Add a toggle button in the sidebar header row (e.g. `PanelLeftClose` / `PanelLeftOpen`
  lucide icon) next to the logo block.

### 5.3 Collapsible sidebar — content behavior
When `collapsed`:
- Hide text labels; show icons only. Add `title={item.label}` for tooltips.
- Logo row: hide "ELTMS" + "MoR Training System" text, keep the round logo; center icon + toggle.
- Role/user card (`Sidebar.tsx:66-76`): hide text, keep the avatar circle (center it).
- Group headers (`item.children`): render the group icon as a single button that toggles the
  group, OR auto-expand groups while collapsed — keep simple: hidden labels, icon-only root.
- "Navigation" section label (`Sidebar.tsx:78`): hide when collapsed.
- Footer (`Sidebar.tsx:167-176`): "Account", "Help & Support", and "Switch role / Sign out"
  become icon-only rows; modals still open the same way (icons keep working while collapsed).
- `overflow-x-hidden` on the nav to prevent label bleed during the width transition.

### 5.4 Consistency with Header
- Header right side already drops the name/email on small screens (`hidden lg:block`,
  Header.tsx:204); no other change needed after logo removal.

### 5.5 Frontend checks (Wave 2)
```bash
cd frontend
npx tsc --noEmit
npm run lint
npm run build
```

---

## 6. Wave 3 — User Management (permission-based)

**Status: done (2026-09-17).** Backend (reactivate endpoint + tests) and frontend (permission
gating, grid/table toggles, detail modal) implemented and verified — see checklist items 12–17.
One small addition beyond the original write-up: `Role.description` (already on the Prisma
model, unused by the API) is now returned by `GET /admin/roles` and typed on
`ApiRoleWithPermissions`, so the new role grid cards have something to show — existing roles
just have `description: null` until someone sets one via `createRole`.

Decisions locked in:
1. **Delete = deactivate.** Do **not** soft-delete; "delete a user" just sets `isActive = false`
   (existing `POST /users/:id/deactivate`).
2. **Status model:** `pending → approve → active` (approve-registration), `rejected` (reject-registration),
   plus a separate **suspend (inactive) / reactivate** toggle driven by `isActive`.
3. **Grid/table toggle applies to BOTH** the Users page and the Roles page.
4. **Access is purely permission-based — the DashboardShell role redirect is ignored** for the
   Users & Roles pages.

### 6.1 Backend tasks (Wave 3)

Mostly exists already; the only new piece is **reactivate**.

**New endpoint — `POST /users/:id/reactivate`** (`users.service.ts` + `users.controller.ts`)
- Restores `isActive: true`, keeps `registrationStatus` (for a suspended user it stays APPROVED).
- Guarded by `@Permissions('user.manage')` like `deactivate`.
- Update `deactivate` if needed so it leaves `registrationStatus` untouched (already does).

**Confirm existing behavior (no change expected):**
- `POST /users/:id/deactivate` → `{ isActive: false }` (`users.service.ts:366`).
- `POST /users/:id/approve-registration` → `{ registrationStatus: APPROVED, isActive: true }` (`:286`).
- `POST /users/:id/reject-registration` → `{ registrationStatus: REJECTED, isActive: true }` (`:328`) —
  note: rejected users stay *active*, the "rejected" state is `registrationStatus`. Keep as-is.
- `POST /users/assign-role` / `DELETE /users/:id/roles/:role` for role changes (already wired).
- `GET /users` with `registrationStatus` + role filters (already wired).

### 6.2 Backend tests (Wave 3)
Extend `backend/test/wave3.e2e-spec.ts` (or a new `users-manage.e2e-spec.ts`):

1. Actor **with** `user.manage`: `POST /users/:id/deactivate` → 200, `isActive:false`; `POST /users/:id/reactivate` → 200, `isActive:true`; `registrationStatus` unchanged in both.
2. Actor **without** `user.manage`: both endpoints + `DELETE /users/:id` → 403.
3. `GET /users` `registrationStatus=PENDING` filter returns only pending (regression).
4. Unauthenticated → 401.

```bash
cd backend
npm run lint
npm run test
npm run test:e2e
```

### 6.3 Frontend — API layer (`users.ts`, `transform.ts`)
- Add `reactivateUser(userId)` → `POST users/:id/reactivate`.
- Reuse `deactivateUser(userId)` (already in `users.ts:70`).
- `ApiUser`/`userFromApi`: add `isActive` → map to frontend `User.status` (`suspended` ⇔ `!isActive`
  when registrationStatus is APPROVED). Keep `status` derivation: pending/rejected from
  `registrationStatus`, suspended/active from `isActive`.

### 6.4 Frontend — store (`lms-store.tsx`)
- Add `deactivateUser(userId)` and `reactivateUser(userId)` to `LmsContextValue`:
  call API → `reloadData()` → return `ActionResult`. Guard with
  `hasPermission(currentUser, "user.manage")` → otherwise `{ ok:false, message }`.

### 6.5 Frontend — permission-based access (build first, pages depend on it)
- `DashboardShell.tsx:21-23` currently redirects whenever `currentUser.role !== pathRole`
  (from the URL's first segment). **Bypass this role redirect for permission-gated routes**:
  - Add a small registry, e.g. in `constants/navigation.ts`:
    ```ts
    export const PERMISSION_GATED_PATHS: Record<string, string[]> = {
      "/system-admin/users": ["user.manage", "user.view"],
      "/system-admin/roles": ["role.manage", "permission.manage"],
    };
    ```
  - In `DashboardShell`, if `pathname` matches a gated path: skip the role check; instead
    `canAny(PERMISSION_GATED_PATHS[pathname])` → if false, `router.replace(ROLE_PATHS[currentUser.role])`.
  - Confirmed requirement: **users and roles pages work for any role that holds the permission.**
- `PageShell` `role` prop is only a display label — pass `currentUser.role` (the acting viewer),
  derive from `getRoleFromPath` if not signed in.
- Sidebar "Users & Roles" item already filters by `["user.manage","role.manage"]` via
  `filterNavItems` (`navigation.ts:88`) → stays dynamic. Make sure it **reacts after a role's
  permissions are edited** (reload current user after permission edits on the Roles page).

### 6.6 Frontend — Users page (`system-admin/users/page.tsx`) rework
- **View toggle**: `const [view, setView] = useState<"table" | "grid">("table")`; two buttons
  (`LayoutGrid`, `Table`/`List` icons) in `PageShell actions`; `bg-gradient` active state.
- **Table mode**: existing `<Table>` + add actions column:
  - 👁 `Eye` → opens `UserDetailModal`
  - Role `<select>` (unchanged)
  - Status action button per status (`approve` when pending, `reject` when pending,
    `suspend`/`reactivate` toggle via `deactivateUser`/`reactivateUser`)
- **Grid mode**: responsive card grid; each card = avatar/initials, name, email, role + status
  Badges, small action row with the same buttons as the table.
- **UserDetailModal** (`src/components/features/users/UserDetailModal.tsx`): opened by the Eye
  icon; shows avatar, name, email, phone, department, TIN, roles (Badges), status badges,
  timestamps (createdAt, lastLogin, updatedAt), and puts the same action buttons (role change /
  status / suspend) in its footer using existing `Modal` component.
- **Actions gate**: every action button shown only when `can("user.manage")`; view-only rows for
  readers with `user.view` only.

### 6.7 Frontend — Roles page (`system-admin/roles/page.tsx`)
- Add the same **grid/table toggle**; grid mode renders a role card per role (name, label,
  description, permission count, "N permissions" + expandable permission tags).
- Keep role assignment + permission-editing (existing) inside table mode / detail view.
- After saving permission changes → re-fetch `/users/me` (or `reloadData`) so the sidebar and
  gated pages react immediately (reinforces 6.5).

### 6.8 Frontend checks (Wave 3)
```bash
cd frontend
npx tsc --noEmit
npm run lint
npm run build
```

---

## 7. Manual Test Checklist

1. Login as each role (learner, trainer, course_owner, content_approver, training_admin, system_admin) → Account + Help & Support buttons visible in sidebar for all.
2. "Switch role / Sign out" still renders and works unchanged.
3. Profile tab: upload avatar → preview updates in Header + Sidebar; save name/phone/TIN → reload persists.
4. Security tab: wrong current password → error; correct → success and refresh token invalidated (re-login needed).
5. Preferences tab: toggle Amharic → UI labels change and value persists after refresh/relogin.
6. Details tab: shows correct email, roles, status, timestamps.
7. Help & Support: FAQ/contact/shortcuts open and render.
8. Backend: `npm run test`, `npm run test:e2e` pass; curl checks from 3.7 succeed.
9. **Wave 2 — Header**: no duplicated logo; "ELTMS · Dashboard" + role title still shown; sidebar logo only.
10. **Wave 2 — Collapse**: toggle shrinks sidebar to icon-only (no text bleed), nav/account/help/sign-out all accessible as icons with tooltips; expand restores full labels; state persists during a page navigation (lift to shared layout state if needed).
11. **Wave 2 — Responsive**: collapsed sidebar works on smaller widths; header name/email still hides on small screens.
12. **Wave 3 — Access**: a non-sysadmin role granted `user.manage` (via Roles page) can open Users & Roles with no role redirect; removing the permission hides the sidebar item and redirects out of the page.
13. **Wave 3 — Status**: suspend an active user → inactive + cannot access; reactivate restores; pending user can be approved/rejected from the row action.
14. **Wave 3 — "Delete"**: the delete action only deactivates (`isActive:false`) — user stays listed as inactive, no soft-deleted rows.
15. **Wave 3 — Grid/Table**: toggle switches both Users and Roles pages; grid renders cards, table renders rows, filters/search still work in both.
16. **Wave 3 — Detail modal**: Eye icon on every row/card opens full user detail; role change + status actions work from inside the modal.
17. **Wave 3 — Permissions**: `user.manage` denied → action buttons hidden; `user.view` only → read-only. Backend e2e from 6.2 passes.

---

## 8. Out of Scope (future)
- Session management / "sign out all devices"
- 2FA/MFA toggle
- Notification per-type preferences
- Help center content management (static strings for now)
- Setting to persist sidebar collapsed state to `localStorage` (optional nice-to-have)