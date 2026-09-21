# Implementation Plan: Unified Sessions Navigation & In-Session Attendance Permissions

Implement a unified "Sessions" sidebar group containing "All Sessions" and "My Sessions", enforce permissions (`live_session.manage_all` vs `live_session.view_own`), remove the attendance sidebar navigation item, and provide rich in-session attendance viewing/management based on `attendance.view` and `attendance.manage`.

## Proposed Changes

### 1. Backend & Database Permissions
- Update [seed-permissions.ts](file:///c:/Users/HP/Desktop/MoR%20LMS/MoR%20LMS/mor2/backend/prisma/seed-permissions.ts):
  - Add `live_session.manage_all`: "Manage all sessions" (Scope: ALL)
  - Add `live_session.view_own`: "View own sessions" (Scope: OWN)
  - Migrate any existing grants from `live_session.manage` to `live_session.manage_all`
  - Update `ROLE_PERMISSION_MATRIX`:
    - `TRAINING_ADMIN`: `live_session.manage_all`, `live_session.view_own`, etc.
    - `TRAINER`: `live_session.view_own` (by default, trainer only has own sessions; admin can grant manage all)
    - `COURSE_OWNER`: `live_session.view_own`
    - `SYSTEM_ADMIN`: all permissions
- Update [live-sessions.controller.ts](file:///c:/Users/HP/Desktop/MoR%20LMS/MoR%20LMS/mor2/backend/src/modules/live-sessions/live-sessions.controller.ts):
  - Support `@Permissions('live_session.manage_all', 'live_session.manage')` on create, update, changeStatus, and remove endpoints.
- Run a migration/seed script to insert the permissions into the PostgreSQL database.

### 2. Frontend Navigation & Permissions
- Update [navigation.ts](file:///c:/Users/HP/Desktop/MoR%20LMS/MoR%20LMS/mor2/frontend/src/constants/navigation.ts):
  - Remove separate "Training Sessions" and "My Sessions" sidebar items.
  - Remove "Attendance" from the sidebar navigation completely.
  - Add unified "Sessions" group with children:
    - **All Sessions** (`/training-admin/sessions` or `/sessions/all`): requires `["live_session.manage_all", "live_session.manage"]`
    - **My Sessions** (`/trainer/sessions` or `/sessions/my`): requires `["live_session.view_own"]`
  - Update `PERMISSION_GATED_PATHS`:
    - `/training-admin/sessions`: `["live_session.manage_all", "live_session.manage"]`
    - `/trainer/sessions`: `["live_session.view_own", "live_session.manage_all", "live_session.manage"]`
  - Update `DYNAMIC_CAPABILITY_NAV_ITEMS` to include the unified Sessions group and remove the standalone Attendance item.

### 3. Session Pages & Access Enforcement
- Update [trainer/sessions/page.tsx](file:///c:/Users/HP/Desktop/MoR%20LMS/MoR%20LMS/mor2/frontend/src/app/(dashboard)/trainer/sessions/page.tsx) (My Sessions):
  - When the actor only has `live_session.view_own` (and not `live_session.manage_all`), strictly filter to their own assigned course sessions only. Hide the option to view other courses' sessions.
  - If the actor has `live_session.manage_all`, allow viewing all sessions or creating schedules.
  - Use `currentUser.role` in `PageShell` so it renders dynamically for any actor visiting My Sessions.
- Update [training-admin/sessions/page.tsx](file:///c:/Users/HP/Desktop/MoR%20LMS/MoR%20LMS/mor2/frontend/src/app/(dashboard)/training-admin/sessions/page.tsx) (All Sessions):
  - Use `currentUser.role` in `PageShell` so any authorized actor sees proper role context.
  - Keep "Schedule Session" button gated by `live_session.manage_all` / `live_session.manage`.

### 4. In-Session Attendance Management & Viewing
- Update [SessionDetailModal.tsx](file:///c:/Users/HP/Desktop/MoR%20LMS/MoR%20LMS/mor2/frontend/src/components/features/sessions/SessionDetailModal.tsx):
  - Replace the external `/trainer/attendance` link with integrated in-session attendance management.
  - If `can("attendance.manage")`:
    - Allow changing learner attendance status directly (Present, Absent, Late, Excused).
    - Provide "Mark All Present" button.
    - Provide "Export Attendance CSV" button.
    - Provide "Calculate & Send Report" button.
  - If `can("attendance.view")` (without manage):
    - Allow viewing attendance log, stay times, and status badges.
  - If neither permission:
    - Hide or display a clear restricted access state for attendance.
- Update [SessionTable.tsx](file:///c:/Users/HP/Desktop/MoR%20LMS/MoR%20LMS/mor2/frontend/src/components/features/sessions/SessionTable.tsx) and session action buttons:
  - Add an "Attendance" quick action button on each session row that opens the session details / attendance overlay.

## Verification Plan
1. Check Roles & Permissions page in UI: verify "Manage all sessions" and "View own sessions" appear under LIVE SESSION.
2. Verify sidebar for Trainer:
   - When Trainer has only "View own sessions", only "My Sessions" appears under "Sessions". "All Sessions" is not shown.
   - Attendance sidebar item is completely gone.
3. Verify sidebar for Training Admin:
   - Training Admin with "Manage all sessions" sees "All Sessions" under "Sessions".
4. Verify granting "Manage all sessions" to Trainer:
   - Both "All Sessions" and "My Sessions" appear under "Sessions".
5. Test In-Session Attendance:
   - Open a session modal as an actor with `attendance.manage`: verify ability to view and change learner attendance statuses.
   - Open as an actor with only `attendance.view`: verify read-only attendance view.
   - Open as an actor without attendance permissions: verify attendance actions/data are restricted.
