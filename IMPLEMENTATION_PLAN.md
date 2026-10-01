# MoR LMS - Implementation Plan: Dynamic Roles, Typography & Account Actions

**Version:** 1.0  
**Target:** MoR e-Learning Management System (`mor2`)  
**Date:** October 2026  

---

## 1. Executive Summary & Problem Diagnosis

### 1.1 Dynamic / Custom Roles Login Crash
- **Symptom:** `TypeError: Cannot read properties of undefined (reading 'startsWith')` at `src/app/(auth)/login/page.tsx:42` upon attempting to log in with an account having a custom/dynamic role created via `/system-admin/roles`.
- **Root Cause:**
  1. The code attempted `router.push(ROLE_PATHS[result.role])`. `ROLE_PATHS` only contained fixed keys for the 6 hardcoded roles (`course_owner`, `content_approver`, `training_admin`, `trainer`, `learner`, `system_admin`). When a custom role (e.g. `"new role"`) was used, `ROLE_PATHS['new role']` was `undefined`, and `router.push(undefined)` crashed with `startsWith`.
  2. In `DashboardShell.tsx`, route gating checked `Boolean(pathRole && currentUser?.role !== pathRole)`. Since custom roles did not match built-in route segment roles, custom users were blocked from workspace pages or stuck in an infinite redirect loop when sent to `/course-owner` or `/system-admin`.
  3. In `navigation.ts`, `DYNAMIC_CAPABILITY_NAV_ITEMS` was missing `Courses` (`/courses`), `Attendance`, `Create Quiz`, and learner workspace items, leaving users with custom roles without navigational menu links.

### 1.2 Typography Alignment
- **Requirement:**
  - **UI / Headings:** Poppins
  - **Body text:** Inter
  - **Amharic text:** Noto Sans Ethiopic
- **Current State:** Only Poppins was configured for `font-sans`, making all body text Poppins, while Inter was not loaded in Next.js font configuration or Tailwind.

### 1.3 Top-Right Header User Account Dropdown with Logout
- **Requirement:** Clicking the user account badge in the top-right header must reveal a dropdown with an immediate, prominent **Logout** button.
- **Current State:** Clicking the badge immediately opened a multi-tab settings modal without an instant account dropdown or visible sign-out action.

---

## 2. Implementation Specifications

### Phase 1: Dynamic Role Routing & Navigation Architecture

1. **`roles.ts` Refactor (`getRoleHomePath` & `isBuiltInRole`):**
   - Provide `isBuiltInRole(role?: string | null): boolean` to test whether a given role string belongs to the 6 predefined core roles.
   - Refactor `getRoleHomePath(role, permissions)`:
     - If `role` is built-in, route to `ROLE_PATHS[role]`.
     - If custom role:
       - `course.view.all` / `course.view.assigned` / `course.view.own` / `course.create` $\rightarrow$ `'/courses'` (permission-gated).
       - `user.manage` / `role.manage` / `permission.manage` $\rightarrow$ `'/system-admin/users'` (permission-gated).
       - `course.approve_reject` $\rightarrow$ `'/system-admin/pending-course-approvals'` (permission-gated).
       - `live_session.manage_all` / `live_session.manage_own` $\rightarrow$ `'/trainer/sessions'` (permission-gated).
       - `attendance.view` / `attendance.manage` $\rightarrow$ `'/trainer/attendance'` (permission-gated).
       - `CERTIFICATE_MANAGE` $\rightarrow$ `'/manage-certificates'` (permission-gated).
       - `CERTIFICATE_TEMPLATE_MANAGE` $\rightarrow$ `'/certificate-templates'` (permission-gated).
       - `feedback.manage` $\rightarrow$ `'/training-admin/feedback'` (permission-gated).
       - `venue.manage` $\rightarrow$ `'/training-admin/venues'` (permission-gated).
       - `student.manage` / `enrollment.view_all` $\rightarrow$ `'/training-admin/enrollments'` (permission-gated).
       - Default fallback $\rightarrow$ `'/learner'`.

2. **`DashboardShell.tsx` Route Protection Update:**
   - Allow custom roles to access permission-gated pages and default `/learner` spaces without being rejected by `currentUser.role !== pathRole`.
   - Prevent redirect loops by checking whether user is custom before blocking on root role segments.

3. **`navigation.ts` Expansion:**
   - Add `'/learner'`, `'/learner/my-courses'`, and `'/learner/courses'` to `PERMISSION_GATED_PATHS`.
   - Populate `DYNAMIC_CAPABILITY_NAV_ITEMS` with `Courses` (`/courses`), `Attendance` (`/trainer/attendance`), `Venues`, `Quiz Creation`, `Course Creation`, and learner items.
   - Update `navItemsForRole` to ensure any custom role receives all menu items their permissions unlock.

---

### Phase 2: Complete Typography System

1. **`layout.tsx`:**
   - Import both `Poppins` and `Inter` from `next/font/google`.
   - Set variables `--font-poppins` and `--font-inter`.
   - Include Google Fonts link for `Inter`, `Poppins`, and `Noto Sans Ethiopic`.
   - Attach `${poppins.variable} ${inter.variable}` to `<html>`.

2. **`tailwind.config.ts`:**
   - `fontFamily.sans`: `["var(--font-inter)", '"Inter"', '"Noto Sans Ethiopic"', '"Nyala"', ...defaultTheme.fontFamily.sans]` (Body text).
   - `fontFamily.display`: `["var(--font-poppins)", '"Poppins"', '"Noto Sans Ethiopic"', '"Nyala"', ...defaultTheme.fontFamily.sans]` (UI / Headings).
   - `fontFamily.heading`: `["var(--font-poppins)", '"Poppins"', '"Noto Sans Ethiopic"', '"Nyala"', ...defaultTheme.fontFamily.sans]`.
   - `fontFamily.amharic`: `['"Noto Sans Ethiopic"', '"Nyala"', '"Abyssinica SIL"', "sans-serif"]`.

3. **`globals.css`:**
   - Set base heading typography (`h1, h2, h3, h4, h5, h6`) to use `font-display` (Poppins) with fallback to Noto Sans Ethiopic.

---

### Phase 3: Profile Action Menu, Clean Account Settings & Sidebar Log Out

1. **Header Profile Action Menu (`Header.tsx`):**
   - Clicking the user account avatar/name in the top-right header displays a dedicated menu (matching mockup) presenting:
     - User header: Avatar initials ("TM"), full name ("Tewodros Melkamu"), and email address.
     - Divider line.
     - **`Account`** (Amharic: **`መለያ`**) with `UserCircle` icon $\rightarrow$ opens the Account Settings modal.
     - **`Log out`** (Amharic: **`ውጣ`**) with `LogOut` icon $\rightarrow$ signs out the user and redirects to `/login`.
   - Outside click dismisses the menu automatically.

2. **Clean Account Settings Modal (`AccountModal.tsx`):**
   - **No logout button inside Account Settings:** Removed the logout action from the modal footer. The modal remains dedicated purely to profile editing, security, details, and preferences.

3. **Dedicated Red "Log out" Action in Sidebar (`Sidebar.tsx`):**
   - Completely removed the ambiguous `"Switch role / Sign out"` text.
   - Changed the label strictly to **`"Log out"`** (Amharic: **`"ውጣ"`**).
   - Styled in bold red (`text-rose-600 dark:text-rose-400 font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-300`) with red `LogOut` icon.

4. **Clean Sidebar for Custom / Newly Created Roles (`navigation.ts`):**
   - Removed artificial `"Dashboard"` item injection for custom roles.
   - Custom roles only see the exact capability links their permissions grant (e.g. `Courses` for `course.view.all` / `course.view.assigned`), keeping the sidebar clean and focused.

---

## 3. Verification & Acceptance Criteria
- [x] Custom role login does not throw `TypeError: Cannot read properties of undefined (reading 'startsWith')`.
- [x] Users with custom roles and `course.view.assigned` / `course.view.all` are routed to `/courses` and see Courses in their sidebar without an unwanted Dashboard link.
- [x] Headings use Poppins, body text uses Inter, and Ethiopic characters render with Noto Sans Ethiopic.
- [x] Clicking the top-right profile displays separate Account and Log out buttons matching the screenshot design.
- [x] Account Settings modal contains NO logout button inside.
- [x] Sidebar exit link is updated from "Switch role / Sign out" to a bold red "Log out" (`ውጣ`) action.
- [x] Frontend builds with zero TypeScript compilation errors (`tsc --noEmit`).

