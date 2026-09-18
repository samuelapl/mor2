# MoR Tele eLMS --- Combined Implementation Plan & Verification

## 1.Dynamic Permission-Driven Access

Transform LMS navigation and page accessibility into a permission-driven
system based on permissions configured by the System Administrator in
`/system-admin/roles`.

### Requirements

-   All actors must use the existing permission architecture:
    -   Course Owner
    -   Content Approver
    -   Training Admin
    -   Trainer
    -   Learner
    -   System Admin
-   Sidebar visibility and route access must respond to the permissions
    actually granted.
-   If a permission is granted, the corresponding capability can become
    available regardless of the user's role-folder prefix.
-   If a permission is revoked, the corresponding navigation item must
    disappear and direct URL access must be blocked.
-   Backend authorization must remain authoritative; frontend hiding
    alone is not sufficient.
-   Do not invent a separate permission system or replace the existing
    System Admin permission architecture.

### Dynamic Navigation and Route Gating

Update `frontend/src/constants/navigation.ts`:

-   Add permission requirements to relevant navigation items:
    -   Training Admin --- Training Sessions:
        -   `live_session.manage`
        -   `attendance.view`
    -   Trainer --- My Sessions:
        -   `live_session.manage`
        -   `attendance.view`
    -   Trainer --- Attendance:
        -   `attendance.manage`
        -   `attendance.view`
        -   `attendance.override`
    -   Course Owner --- Question Bank:
        -   `quiz.create`
        -   `quiz.grade`
    -   Learner --- Live Sessions:
        -   `live_session.manage`
        -   `attendance.checkin`
        -   `course.browse`
    -   System Admin --- System Settings:
        -   `user.manage`
        -   `role.manage`
        -   `permission.manage`
-   Add dynamic capability navigation so users who receive a capability
    permission can see the relevant navigation item even when it was not
    originally associated with their role.
-   Use only permission names that actually exist in the
    implementation/database.

Expand `PERMISSION_GATED_PATHS` for relevant routes, including:

-   `/trainer/attendance`
-   `/training-admin/sessions`
-   `/trainer/sessions`
-   `/learner/live-sessions`
-   `/course-owner/question-bank`
-   `/trainer/question-bank`
-   `/training-admin/enrollments`
-   `/system-admin/audit-logs`
-   `/system-admin/certificate-templates`
-   `/system-admin/pending-course-approvals`
-   `/content-approver/pending-approvals`
-   `/learner/certificates`
-   `/learner/progress`
-   `/learner/catalog`

Each route must use the appropriate existing permissions, such as
`attendance.view`, `attendance.manage`, `attendance.override`,
`live_session.manage`, `quiz.create`, `quiz.grade`, `student.manage`,
`student.view`, `enrollment.view_all`, `audit.view`,
`certificate.manage`, `course.approve`, `course.reject`,
`certificate.view`, `progress.view`, `progress.mark_own`, and
`course.browse`, only where those permissions are confirmed to exist.

### Dashboard Shell

Update `frontend/src/components/layout/DashboardShell.tsx`:

-   Support prefix route matching so subroutes inherit parent permission
    requirements.
-   Block users from directly opening routes for which they have no
    required permission.
-   Redirect unauthorized users safely.
-   Permit users with the required granted capability to access
    capability pages even if the URL is under another role's folder.
-   Preserve backend authorization.

### Permission Synchronization

Update `frontend/src/lib/lms-store.tsx`:

-   Refresh permissions periodically in the background, approximately
    every 10--12 seconds.
-   Listen for the `mor_permissions_updated` custom event.
-   Listen for the browser `storage` event.
-   Refresh permissions when the application/window receives focus.
-   Avoid requiring a logout/login or full page reload for normal
    permission changes.

Update `frontend/src/app/(dashboard)/system-admin/roles/page.tsx`:

-   After a successful permission save:
    -   dispatch `mor_permissions_updated`;
    -   update `localStorage` with a timestamp such as
        `mor_permissions_updated_at`.
-   Do not use localStorage as the authoritative persistence layer; it
    is only a synchronization signal.

### Capability-Specific UI

Training Admin and Trainer session pages:

-   Show `Schedule Session` only when the user has
    `live_session.manage`.
-   Show `Go Live` and `End Session` only when the user has
    `live_session.manage`.

Trainer Attendance:

-   Show attendance marking/bulk actions only with `attendance.manage`.
-   Show Override only with `attendance.override`.
-   Users with `attendance.view` but without management permissions can
    view attendance and statistics in read-only mode.

------------------------------------------------------------------------

## 2. Interactive Rich Text Areas

Use the existing reusable TipTap-based `RichTextArea` component for text
areas that require formatting.

### Existing Rich Text Component

`frontend/src/components/ui/RichTextArea.tsx`

Supported formatting includes:

-   Bold (`Ctrl+B`)
-   Italic (`Ctrl+I`)
-   Underline (`Ctrl+U`)
-   Strikethrough
-   H2/H3 headings
-   Bullet lists
-   Numbered lists
-   Blockquotes
-   Clear formatting
-   Undo
-   Redo

### Existing Text Areas Converted

The rich text editor has been applied to:

1.  `QuestionBankWorkspace.tsx` --- question prompts and learner
    instructions.
2.  `PendingCourseApprovals.tsx` --- rejection reasons and
    change-request feedback.
3.  `CourseDetailModal.tsx` --- approval review comments and revision
    details.
4.  `CourseCreationWizard.tsx` --- lesson activity guides and prompts.
5.  `system-admin/users/page.tsx` --- rejection/deactivation notes.
6.  `system-admin/pending-registrations/page.tsx` --- applicant
    rejection reasons.
7.  `ScheduleSessionModal.tsx` --- live-session description and agenda.

Do not duplicate this work; verify the current implementation before
modifying these files.

### Course Metadata Rich Text

The following Course Details fields should use `RichTextArea` where the
current data model supports storing their formatted content:

-   Course Title --- English
-   Course Title --- Amharic
-   Course Code
-   Owning Department
-   Target Audience
-   Prerequisites

Use a compact editor where appropriate.

Validation must strip HTML before checking whether a required field is
actually empty, for example:

``` text
.replace(/<[^>]+>/g, "").trim()
```

Do not silently change database field types or schemas merely to support
formatting. Inspect the existing schema and API first and make only the
necessary compatible changes.

### Rich Content Rendering

Update `frontend/src/components/ui/RichContent.tsx` if needed:

-   Add an `inline?: boolean` rendering option.
-   Add a `stripHtmlTags(html: string): string` helper for plain-text
    fallback.
-   Sanitize HTML before rendering.
-   Add inline rich-content styling in `globals.css`.

Use rich rendering in:

-   `CourseDetailModal.tsx`
-   `CatalogCourseModal.tsx`
-   `CourseCard.tsx`

Do not allow unsafe HTML to be rendered directly.

------------------------------------------------------------------------

## 3. Trainer Assignment During Session Scheduling

### Backend

In `backend/prisma/schema.prisma`, the current implementation adds to
`LiveSession`:

-   `trainerId String? @map("trainer_id")`
-   `trainer User? @relation("SessionTrainer")`

The backend DTOs should accept `trainerId`:

-   `create-session.dto.ts`
-   `update-session.dto.ts`

`live-sessions.service.ts` should:

-   Persist the selected `trainerId`.
-   Automatically create/link a `TrainerAssignment` to the course when
    needed.
-   Notify the assigned trainer with the existing notification
    mechanism.
-   Return assigned trainer information from:
    -   `findAll`
    -   `findById`
    -   `upcomingForUser`

Trainer information should be limited to appropriate fields such as:

-   id
-   first name
-   last name
-   email
-   avatar URL

### Scheduling UI

`ScheduleSessionModal.tsx` should:

-   Fetch active qualified trainers from the real API.
-   Highlight course-assigned trainers.
-   Prefer/select the default course trainer when appropriate.
-   Allow selection from the qualified trainer list.
-   Persist the actual selected trainer.

### Display

Show the assigned trainer in:

-   `SessionTable.tsx`
-   `training-admin/sessions/page.tsx`
-   `SessionDetailModal.tsx`
-   `LiveSessionWorkspace.tsx`

The live workspace should display the trainer's verified name instead of
generic placeholder text.

------------------------------------------------------------------------

## 4. Fullscreen Live Video Conference

### Full-Viewport Classroom

`WorkspaceDetailOverlay.tsx` should support a full-viewport mode for the
live classroom:

``` text
fixed inset-0 z-50 w-screen h-screen
```

The live classroom should not be constrained by the normal
sidebar/header workspace offsets.

### Fullscreen Controls

`LiveSessionWorkspace.tsx` should provide:

-   Full Screen
-   Exit Fullscreen

Use the browser Fullscreen API:

-   `requestFullscreen`
-   `exitFullscreen`

Controls may be available in the top header and bottom control bar.

### Layout and Controls

Avoid hardcoded viewport heights that cause clipping.

Use a flex layout with:

-   `flex-1`
-   `min-h-0`
-   `shrink-0`

Keep the bottom control bar pinned and fully visible.

The classroom controls should provide access to the supported meeting
actions, including:

-   Microphone
-   Camera
-   Screen sharing
-   Raise hand
-   Chat
-   Fullscreen
-   Leave room

### Embedded Jitsi

Jitsi should remain embedded inside the LMS rather than requiring a new
browser tab.

The iframe should use the available workspace:

``` text
w-full h-full flex-1 min-h-0
```

Do not claim BBB is operational unless a real BBB server/configuration
is available. Jitsi is the prioritized live-session provider; BBB can
remain a configurable alternative.

------------------------------------------------------------------------

## 5. Important LMS Workflow Rules

These requirements remain part of the overall implementation and should
not be lost while applying the changes above.

### Course Lifecycle

Use the existing CourseStatus state machine and verify its actual values
before changing it.

Expected lifecycle:

``` text
DRAFT
→ SUBMITTED / PENDING_APPROVAL / UNDER_REVIEW
→ APPROVED
→ PUBLISHED
→ ARCHIVED
```

Rejection/request-changes must return the course to the appropriate
editable state according to the existing implementation.

Do not add or rename statuses without first checking the current Prisma
schema, migrations, services, and frontend.

### Course Owner

Must be able to:

-   Create course content.
-   Build curriculum.
-   Add modules, lessons, activities, quizzes, and assignments where
    supported.
-   Submit courses for approval.
-   See status/version/owner/last modified/submission date.
-   See approval history and rejection/change-request reasons.
-   Edit content after rejection/request changes according to the
    lifecycle rules.

### Content Approver

Must be able to:

-   View real pending courses.
-   Inspect metadata, classification, content, version, and history.
-   Approve.
-   Reject.
-   Request changes where supported.
-   Provide a persisted reason/comment.
-   Create an auditable approval record.
-   Not bypass the established publishing workflow.

### Training Admin

Must be able to:

-   See approved content awaiting publication.
-   Publish only approved content.
-   Manage published courses according to existing permissions.
-   Manage training sessions.
-   Schedule sessions.
-   Assign trainers.
-   See/manage attendance according to actual permissions.

Navigation requirements:

-   Remove the standalone Enrollment bar if it is no longer required by
    the current design.
-   Add Pending to Publish.
-   Replace Publish Course navigation with View Published Course where
    appropriate.
-   Do not move permissions outside the existing permission
    architecture.

### Learner

Learners should:

-   See only courses available to them.
-   See published courses.
-   Open course details.
-   See locked/blurred learning content before enrollment where
    required.
-   Enroll using real backend persistence.
-   Enter the actual learning experience after enrollment.
-   Follow backend-enforced sequential progression.
-   Complete lessons/activities/assessments.
-   Receive certificates only after completion rules are satisfied.

### Trainer

Trainer functionality should include only capabilities actually granted
by permissions.

Trainer should be able to access authorized:

-   Courses
-   Sessions
-   Learners
-   Attendance
-   Grading
-   Communication
-   Live-class functionality

Session scheduling authority is intended for Training Admin, unless the
existing permission configuration explicitly grants it elsewhere.

------------------------------------------------------------------------

## 6. No Mock or Fake Data

The LMS must use real persisted data.

Do not use:

-   Hardcoded courses
-   Fake users
-   Fake dashboard statistics
-   Fake progress
-   Fake approvals
-   Fake messages
-   Fake API responses
-   Fake assessment results
-   Final persistence in localStorage
-   Final persistence only in in-memory state

Use the existing API/database architecture.

------------------------------------------------------------------------

## 7. Database and API Safety

Before making schema changes:

1.  Inspect the current Prisma schema.
2.  Inspect existing migrations.
3.  Inspect the related service/controller/DTO.
4.  Identify the exact missing relation or field.
5.  Reuse existing models and relations where possible.

Do not:

-   Run `prisma migrate reset`.
-   Drop production/user data.
-   Disable foreign keys to hide errors.
-   Use `prisma db push` as a substitute for a proper migration when a
    migration is required.
-   Modify credentials or `.env` values unless explicitly required and
    approved.
-   Add packages without a clear need and approval.

When a migration is already present and pending, use the appropriate
migration workflow rather than creating a duplicate schema change.

------------------------------------------------------------------------

## 8. Current Attachment Upload Error to Verify

A previously observed backend runtime error was:

``` text
this.prisma.attachment.create()
Foreign key constraint violated on:
attachments_module_id_fkey
```

The failure occurred in:

``` text
backend/src/modules/files/files.service.ts
```

The supplied `module_id` did not correspond to an existing module.

Fix this at the data-flow level:

1.  Inspect `FilesService.upload`.
2.  Inspect the `Attachment` model.
3.  Inspect the Module/CurriculumModule/Lesson relations.
4.  Inspect relevant migrations.
5.  Check which ID the frontend sends during file upload.
6.  Verify the module exists before creating the attachment.
7.  Correct the frontend/backend ID mapping if the wrong ID is being
    sent.
8.  Preserve the foreign-key constraint.
9.  Test an actual file upload through the LMS.
10. Verify both object storage and database persistence.

Do not remove or weaken the foreign key just to make the upload succeed.

------------------------------------------------------------------------

## 9. Live Session Visibility and Access

The live-session workflow must satisfy these product rules:

-   Training Admin schedules a live session.
-   The scheduled session is visible to both the assigned trainer and
    eligible learners.
-   Learners receive the appropriate notification using the existing
    notification system.
-   The assigned trainer receives the appropriate notification.
-   Joining the live session should not require a separate LMS login to
    the meeting provider when the configured provider supports embedded
    anonymous/guest access.
-   Jitsi should be embedded inside the LMS.
-   Do not open a separate tab as the normal workflow.
-   Provider authentication requirements must not be falsely bypassed;
    configure the actual provider appropriately.

------------------------------------------------------------------------

## 10. Course Builder Structure

Use the existing architecture and models to support, where available:

``` text
Program
  └── Course
       └── Module
            └── Lesson
                 └── Learning Activity
                      ├── Quiz
                      └── Assignment
```

Also support where the current schema permits:

-   Final Assessment
-   Completion Rules
-   Certification

Do not create a new Program model unless inspection confirms it is
genuinely missing and the change is necessary.

### Course Creation Flow

Preferred flow:

``` text
Course Details
→ Curriculum
→ Final Assessment & Completion Rules
→ Review & Submit
```

Avoid unnecessary duplicate Materials steps.

### Curriculum

Support:

-   Modules
-   Lessons
-   Sub-lessons where implemented
-   Learning activities
-   Optional quizzes
-   Optional assignments
-   Reordering where permissions allow
-   Expand/collapse controls
-   Clear progression requirements

### Progression

Backend must enforce prerequisite/progression rules.

A learner must not bypass required previous content simply by entering a
later URL directly.

------------------------------------------------------------------------

## 11. Assessment Requirements

Where supported by the existing implementation:

-   MCQ
-   True/False
-   Matching
-   Essay
-   Case-based questions
-   Upload/practical assessment
-   Final assessment
-   Passing score
-   Attempts
-   Time limits
-   Retakes
-   Grading
-   Rubrics
-   Difficulty/randomization

Timers and assessment enforcement must be server-authoritative where
required.

------------------------------------------------------------------------

## 12. UI/UX Requirements

Use a professional MoR-branded light/white LMS interface.

Major LMS workspaces should be effectively full-screen between the
application header/sidebar where appropriate.

Avoid:

-   Small centered application modals for major workflows.
-   Half-screen course builders.
-   Split previews that unnecessarily reduce workspace.
-   Fixed widths that cause clipping.

Use:

-   Full workspace overlays for major detail/review/live experiences.
-   Normal confirmation dialogs for simple confirmations.
-   Real tables.
-   Search/filtering.
-   Pagination where needed.
-   Loading states.
-   Empty states.
-   Error states.
-   Validation.
-   Breadcrumbs.
-   Audit/history views where supported.
-   Responsive and accessible controls.

------------------------------------------------------------------------

## 13. Verification

### Frontend

Run:

``` bash
cd "C:\Users\j\Desktop\MoR LMS\mor2\frontend"
npm run build
```

Expected:

-   Successful Next.js production build.
-   Zero TypeScript/build errors.

### Backend

Run:

``` bash
cd "C:\Users\j\Desktop\MoR LMS\mor2\backend"
npm run build
```

Expected:

-   Successful NestJS production build.
-   Zero TypeScript/build errors.

### Permission Testing

Test with real accounts/roles:

1.  System Admin changes Content Approver permissions.
2.  Grant `attendance.view` and `live_session.manage` only if these
    permissions exist.
3.  Save.
4.  Verify permission synchronization.
5.  Log/switch into Content Approver.
6.  Verify the corresponding capability navigation appears.
7.  Verify direct route access works only when authorized.

Then remove `live_session.manage` from Trainer:

1.  Save the permission change.
2.  Verify My Sessions disappears.
3.  Verify direct `/trainer/sessions` access is blocked.

### Rich Text Testing

Open Course Creation and test:

-   Course title
-   Course code
-   Owning department
-   Target audience
-   Prerequisites

Verify:

-   Bold
-   Italic
-   Underline
-   Bullet lists
-   Headings where appropriate
-   Persistence after save
-   Correct rendering in cards/details/catalog.

### Session Testing

1.  Training Admin schedules a session.
2.  Selects a real qualified trainer.
3.  Confirm trainer assignment persists.
4.  Confirm trainer sees the session.
5.  Confirm eligible learners see the session.
6.  Confirm notifications are created.
7.  Open the session.
8.  Confirm the live meeting is embedded in the LMS.
9.  Confirm the full-screen classroom has no clipping.
10. Confirm the assigned trainer name is displayed.
11. Confirm meeting controls are visible.

### End-to-End Course Workflow

Verify the real database/API flow:

``` text
Course Owner creates course
→ course persists in DB
→ Course Owner submits
→ course appears in approval queue
→ Content Approver reviews
→ approval/rejection/request-change persists
→ approved course reaches Training Admin
→ Training Admin publishes
→ learner can query published course
→ learner enrolls
→ enrollment persists
→ learner completes lesson
→ progress persists
→ learner completes assessment
→ result persists
→ certificate becomes available only after completion rules
```

------------------------------------------------------------------------

## 14. Existing Verified Implementation --- Do Not Duplicate

The walkthrough confirms that several features were already implemented
and built successfully:

### Rich Text

A reusable TipTap `RichTextArea` exists and has already replaced the
listed raw textareas. Verify current code before changing them again.

### Trainer Assignment

Trainer assignment was already added to `LiveSession`, DTOs, service
logic, scheduling UI, session tables, session details, and the live
workspace.

### Fullscreen Conference

`WorkspaceDetailOverlay` and `LiveSessionWorkspace` were already updated
for full-viewport live classrooms, browser fullscreen controls, flexible
layout sizing, pinned controls, and embedded Jitsi.

### Previous Build Verification

The walkthrough reported:

-   Frontend `next build`: successful, with 44 routes prerendered and
    exit code 0.
-   Backend NestJS build: successful with exit code 0.
-   Database synchronization had added `trainer_id` to `live_sessions`.

These results are historical verification from the walkthrough, so rerun
the builds after any new changes.

------------------------------------------------------------------------

## 15. Final Agent Rules

Before editing:

-   Inspect the existing implementation.
-   Reuse existing components, services, models, permissions, and APIs.
-   Remove duplicates rather than implementing the same feature twice.
-   Keep changes limited to the requested functionality.
-   Do not overwrite working functionality without checking it first.

After editing:

-   Run frontend build.
-   Run backend build.
-   Test affected API endpoints.
-   Test real database persistence.
-   Test authorization with multiple roles.
-   Test direct URL protection.
-   Test the actual user workflow.

If a requirement conflicts with the current schema or existing
permission architecture:

1.  Identify the conflict.
2.  Explain the exact file/model/API involved.
3.Make the smallest compatible change.
4.  Do not perform destructive migrations or database resets.
