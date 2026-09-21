# Plan: Restructure Session Permissions into "Manage All" and "Manage Own"

## Overview
This plan implements the requested role and permission changes for live sessions:
- Replace legacy session permissions with two distinct permissions:
  1. `live_session.manage_all` (**Manage all sessions**)
  2. `live_session.manage_own` (**Manage own sessions**)
- Configure default role permissions:
  - **Training Administrator** (`TRAINING_ADMIN`) defaults to having **`manage own session`** (`live_session.manage_own`), so they only see their assigned sessions.
  - **Trainer** (`TRAINER`) defaults to having **`manage own session`** (`live_session.manage_own`).
  - **System Administrator** (`SYSTEM_ADMIN`) retains all permissions (both `manage_all` and `manage_own`).
- Update the **Sessions** sidebar accordion:
  - If a user has `manage own session` only: **only the "My Sessions" tab appears** inside the Sessions accordion.
  - If a user has `manage all session`: **"All Sessions" appears** inside the Sessions accordion (alongside "My Sessions").

---

## 1. Backend: Permission Registry & Seed Matrix
- **File**: `backend/prisma/seed-permissions.ts`
  - Update `PERMISSIONS` array:
    - Register `live_session.manage_all` (scope: `ALL`, description: "Manage all sessions").
    - Register `live_session.manage_own` (scope: `OWN`, description: "Manage own sessions").
    - Remove old `live_session.manage` and `live_session.view_own`.
  - Update `ROLE_PERMISSION_MATRIX`:
    - `TRAINING_ADMIN`: replace old live session grants with `['live_session.manage_own']`.
    - `TRAINER`: replace old live session grant with `['live_session.manage_own']`.
    - `COURSE_OWNER`: replace old live session grant with `['live_session.manage_own']`.
    - `SYSTEM_ADMIN`: receives all permissions including both `live_session.manage_all` and `live_session.manage_own`.
  - Cleanup logic in `seedPermissions`:
    - Delete deprecated permissions `live_session.manage` and `live_session.view_own` from DB.
    - Revoke `live_session.manage_all` from default `TRAINING_ADMIN` role so existing databases adopt the new default immediately.

---

## 2. Backend: Live Sessions Controller & Service
- **Files**:
  - `backend/src/modules/live-sessions/live-sessions.controller.ts`
  - `backend/src/modules/live-sessions/live-sessions.service.ts`
- **Changes**:
  - In `live-sessions.controller.ts`:
    - Change endpoint permission decorators from `('live_session.manage_all', 'live_session.manage')` to `('live_session.manage_all', 'live_session.manage_own')` on session creation, update, status change, and removal endpoints.
  - In `live-sessions.service.ts`:
    - Add `trainerId?: string` filtering support to `findAll`.

---

## 3. Frontend: Navigation & Sidebar Accordion
- **File**: `frontend/src/constants/navigation.ts`
  - Under `NAV_ITEMS.training_admin`, `NAV_ITEMS.trainer`, and `DYNAMIC_CAPABILITY_NAV_ITEMS`:
    - `All Sessions`: `permission: ["live_session.manage_all"]`
    - `My Sessions`: `permission: ["live_session.manage_own", "live_session.manage_all"]`
  - Under `NAV_ITEMS.learner`:
    - Remove old `live_session.manage` permission reference.
  - Under `PERMISSION_GATED_PATHS`:
    - `"/training-admin/sessions"`: `["live_session.manage_all"]`
    - `"/trainer/sessions"`: `["live_session.manage_own", "live_session.manage_all"]`
    - `"/learner/live-sessions"`: `["attendance.checkin", "course.browse"]`

---

## 4. Frontend: Sessions Pages
- **File**: `frontend/src/app/(dashboard)/trainer/sessions/page.tsx`
  - Update `canManageAll = can("live_session.manage_all")`.
  - Update `canConductSession = canAny(["live_session.manage_all", "live_session.manage_own"])`.
- **File**: `frontend/src/app/(dashboard)/training-admin/sessions/page.tsx`
  - Update `canManageAll = can("live_session.manage_all")`.

---

## 5. Verification & Testing
- Run backend database seed to populate updated permissions and clean legacy entries:
  ```bash
  cd backend && npm run prisma:seed
  ```
- Build backend and frontend to verify no type or compilation errors:
  ```bash
  cd backend && npm run build
  cd frontend && npm run build
  ```
- Verify sidebar behavior across roles:
  - **Training Admin** (`tadministrator@gmail.com`): Sessions accordion contains **only "My Sessions"**.
  - **System Admin** (`sadministrator@gmail.com`): Sessions accordion contains **"All Sessions"** and **"My Sessions"**.
  - **Roles Management** (`/system-admin/roles`): "Live Session" resource displays the two permissions cleanly.

