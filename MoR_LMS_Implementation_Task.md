when the course creator click create course the modal should be full screen,course title,course description,objective every text area should be interactive(we can bold,use bullet etc) remove delivery method and language from create course modal and on every text area you should not auto fill rather put place holder and on curriculum section every thing like modules,lesson,sublessons,assesment should cove all the screen and use + and - sign when we need see and hide and there should support quiz builder,assignment section in every module,lesson,sublesson,to move to the next you should pass the previous unless locked there is some start use it and modify in professional and attractive way on curriculum section i need to ask cluade and show the result quickly

# LMS Final Fix — Live Sessions, Course Creation, Curriculum, Quiz, Assignment, and Notifications

## CRITICAL IMPLEMENTATION INSTRUCTION

Continue from the current implementation. Do **not** restart the project, undo Claude's existing work, or redesign unrelated features.

I need the actual implementation quickly. Do not spend a long time analyzing or create a lengthy planning document. Briefly inspect the current code, identify the relevant existing APIs/components, and implement the fixes immediately.

Reuse the existing backend, Prisma models, authentication, RBAC, permissions, course, assessment, session, attendance, notification, Jitsi/BigBlueButton, and enrollment architecture wherever possible.

Do not create fake/mock production data.

Do not run:
- `prisma migrate reset`
- database reset
- database drop
- deletion of existing migrations
- deletion of existing production/test data

---

# 1. LIVE MEETING — REMOVE UNNECESSARY LOGIN REQUIREMENT

There is currently a problem with the live meeting.

When a Trainer or Learner clicks **Join Session**, the live meeting requires the user to log in to the external meeting provider.

That is NOT what I need.

## Required behavior

The LMS user is already authenticated inside the LMS.

When an authorized Trainer or Learner clicks:

**Join Session**

the user should be able to enter the live meeting **without being required to create/log into a separate Jitsi/meeting-provider account**, where the existing provider/configuration supports guest participation.

Use the user's LMS identity/name when joining if the existing integration supports passing the display name.

Do not create a second authentication system.

Do not unnecessarily replace Jitsi with another provider.

First inspect the currently configured live-meeting provider and its existing integration.

### Important

The requirement is:

**LMS login = sufficient for joining the LMS live session.**

Do not redirect the user to a separate provider login page unless the provider has a genuine configuration/security limitation that makes guest joining impossible.

If Jitsi is being used, configure the meeting so authorized LMS users can join as guests without a Jitsi account, subject to the provider's actual configuration.

If BigBlueButton is being used, use its supported guest/join mechanism rather than inventing a fake login bypass.

---

# 2. LIVE SESSION MUST BE VISIBLE TO TRAINER AND LEARNER

There is currently another issue.

A Training Administrator schedules a live session.

The scheduled session is visible to the Trainer, but it is NOT visible to the Learner/Student.

This must be fixed.

## Required behavior

When Training Administrator schedules a session associated with a course/training:

**Training Administrator schedules session**
↓
**Assigned Trainer can see the session**
↓
**Learners enrolled/eligible for that course can see the session**
↓
**Trainer can open/join/manage the session**
↓
**Learner can open/join the session**

Do not create a second session system.

Reuse the existing session/scheduling APIs and database relationships.

## Check carefully

Inspect:

- session creation
- course/session relationship
- trainer assignment
- learner enrollment
- session visibility query
- learner dashboard/session query
- trainer session query
- authorization/RBAC filters

Find why the learner query does not return the session.

Fix the backend/data filtering rather than simply adding a fake frontend card.

---

# 3. LIVE SESSION DISPLAY

For Learners, show relevant scheduled sessions in appropriate areas such as:

- Learner Dashboard
- My Courses / Course Details
- Upcoming Sessions
- Session Details

For Trainers, show:

- My Sessions
- Upcoming Sessions
- Session Details
- Learners
- Attendance
- Join Session

Use real session data.

Do not hardcode sessions.

---

# 4. SESSION NOTIFICATIONS

When a Training Administrator schedules a session, send/display a notification to the appropriate users.

At minimum:

- assigned Trainer(s)
- eligible/enrolled Learner(s)

The notification should contain useful information such as:

- session/course name
- date
- start time
- relevant session information
- action/link to open the session

Use the existing notification architecture if one already exists.

Do not create duplicate notification systems if an existing notification service/table/API is already present.

If notifications are currently only partially implemented, extend the existing system.

## Notification timing

Send the notification when the session is successfully scheduled.

If the existing system supports reminders, preserve/use that architecture where appropriate, but the immediate scheduling notification is required.

Do not send duplicate notifications because of repeated frontend renders.

---

# 5. JOIN SESSION MUST REMAIN INSIDE LMS

When Trainer or Learner clicks:

**Join Session**

the meeting must open inside the LMS workspace.

Do NOT:

- open a new browser tab
- use `window.open()`
- use `_blank`
- redirect unnecessarily to another application

Use the existing `LiveSessionWorkspace` or improve it.

The meeting should occupy the available LMS workspace.

The existing Trainer → My Sessions → Open Session → Join Session experience should remain the reference for the full-screen workspace.

---

# 6. CREATE COURSE MUST BE FULL SCREEN

When Course Creator/Course Owner clicks:

**Create Course**

the current modal must become a **full-screen LMS workspace**.

Do not use a small centered modal.

Do not use a half-screen modal.

Do not use a side drawer.

Do not constrain the entire course creation workflow to a small card.

Use the full available LMS content area and viewport.

Keep normal LMS navigation/header where appropriate.

---

# 7. COURSE TITLE

Course Title must:

- be empty by default
- have a clear placeholder
- be editable
- not contain automatically generated/fake text
- show proper validation when required

Example placeholder:

`Enter course title`

Do not auto-fill actual content.

---

# 8. COURSE DESCRIPTION

Course Description must be a real interactive rich-text editor.

It must support appropriate formatting such as:

- Bold
- Italic
- Underline if supported
- Bulleted list
- Numbered list
- Paragraphs
- Links if supported
- Clear formatting if supported

The field must start empty.

Use a placeholder such as:

`Enter a detailed course description...`

Do NOT auto-fill sample/course text.

---

# 9. COURSE OBJECTIVES

Course Objectives must also be an interactive rich-text editor.

Support:

- Bold
- Italic
- Bullets
- Numbered lists
- Paragraph formatting
- Other existing rich-text functionality

Start empty.

Use a placeholder.

Do NOT auto-fill objective content.

---

# 10. REMOVE DELIVERY METHOD AND LANGUAGE

Remove the following fields from the **Create Course** workflow:

- Delivery Method
- Language

Do not display them in the create-course form.

Do not leave unnecessary empty space where they were.

Do not remove unrelated course fields.

If the backend requires these values for compatibility, handle them using the existing backend defaults/optional behavior rather than asking the Course Creator to enter them in this workflow.

---

# 11. ALL CREATE-COURSE TEXT AREAS

Audit every textarea/editor in the Create Course workflow.

Every editable text area must:

- be interactive
- be empty initially unless existing saved data is being edited
- have a useful placeholder
- never contain fake auto-filled content
- preserve the user's entered content
- support rich text where appropriate

Important distinction:

### Creating a NEW course

Fields should start empty with placeholders.

### Editing an EXISTING course

Existing saved course content should load normally.

Do not erase existing course data during editing.

---

# 12. CURRICULUM MUST USE THE FULL SCREEN

The Curriculum section must use the full available screen.

Do not put the entire curriculum into a small centered card.

Do not constrain it to a narrow `max-width`.

Use a professional full-width/full-height workspace.

The curriculum should clearly show:

Course
→ Modules
→ Lessons
→ Sub-lessons
→ Assessments
→ Quizzes
→ Assignments

---

# 13. PLUS AND MINUS CONTROLS

Use clear:

`+`

and

`−`

controls.

### `+`

Expands/shows children.

Examples:

Module `+` → show Lessons

Lesson `+` → show Sub-lessons

Sub-lesson `+` → show associated learning content

Assessment/Quiz/Assignment `+` where nested details exist → show details

### `−`

Collapses/hides children.

The user should be able to expand/collapse the curriculum easily.

Do not remove content when collapsing.

Collapsing only changes visibility.

---

# 14. MODULE ACTIONS

At the Module level, provide appropriate actions such as:

- Add Lesson
- Add Quiz
- Add Assignment
- Add Assessment
- Edit
- Manage

Use clear buttons/icons.

When any major action is clicked, open its workflow in a **full-screen workspace**.

---

# 15. LESSON ACTIONS

At the Lesson level, provide appropriate actions such as:

- Add Sub-lesson
- Add Quiz
- Add Assignment
- Add Assessment
- Edit
- Manage

Again, every major workflow must be full screen.

---

# 16. SUB-LESSON ACTIONS

At the Sub-lesson level, provide appropriate supported actions such as:

- Add Quiz
- Add Assignment
- Add Assessment
- Edit
- Manage

Do not merely display buttons that do nothing.

Use the real backend architecture.

If a particular relationship is not supported by the existing data model, inspect the architecture and implement the minimum necessary support without breaking existing functionality.

---

# 17. QUIZ BUILDER

The curriculum must support a real Quiz workflow.

Required flow:

**Module/Lesson/Sub-lesson**
→ **Add Quiz**
→ **Question Bank / Select Questions**
→ **Quiz Builder**
→ **Configure**
→ **Save**
→ **Publish**

Quiz Builder must be full screen.

Support where already supported by the backend:

- quiz title
- instructions
- questions
- question ordering
- points/marks
- correct answers
- question reuse
- quiz settings
- save
- publish
- edit

Reuse existing Question Bank and Assessment APIs.

Do not build a fake frontend-only quiz.

---

# 18. ASSIGNMENT SECTION

Add a real Assignment workflow where supported.

Required flow:

**Module/Lesson/Sub-lesson**
→ **Add Assignment**
→ **Assignment Builder**
→ **Configure**
→ **Save**

Assignment workspace must be full screen.

Support appropriate existing assignment functionality such as:

- title
- instructions
- marks
- due date
- availability
- learner submission information
- save/edit

Do not display an Assignment button that leads nowhere.

---

# 19. ASSESSMENT

The curriculum must clearly support Assessments.

Use the existing assessment model/API.

Assessment creation/details/editing must open as a full-screen workspace.

Do not create a second assessment architecture.

---

# 20. LEARNING PROGRESSION

Learners should normally follow the course sequence.

Example:

Module 1
→ Lesson 1
→ Sub-lesson 1
→ Quiz
→ Assignment
→ Lesson 2

A learner should not be able to move to the next required learning item until the previous required item has been completed.

Show clear states:

- Locked
- Available
- In Progress
- Completed

If an item is intentionally unlocked or has no prerequisite, allow it.

Use the existing prerequisite/progression architecture if present.

Where the architecture supports backend enforcement, enforce progression on the backend too.

Do NOT rely only on hiding/disable buttons in the frontend.

---

# 21. START / EXISTING COURSE IMPLEMENTATION

There is already some implementation for the curriculum/course workflow.

**Use it as the starting point.**

Do not throw it away.

Modify and improve it professionally.

Preserve working functionality.

Improve:

- hierarchy
- spacing
- expand/collapse behavior
- action buttons
- typography
- icons
- progress indicators
- states
- empty states
- loading states
- error states
- responsive behavior

---

# 22. GLOBAL FULL-SCREEN RULE

This rule applies across the entire LMS.

Every major page/workflow opened from a button must use the full available LMS workspace.

Examples:

- Create Course
- Course Details
- Edit Course
- Schedule Session
- Session Details
- Open Session
- Join Session
- Question Bank
- Create Question
- Quiz Builder
- Assignment Builder
- Assessment Builder
- Attendance
- Course Builder
- Module management
- Lesson management
- Sub-lesson management

Do NOT use small modals for major workflows.

Small confirmation dialogs are acceptable for simple:

- Delete confirmation
- Warning
- Confirmation
- Success/error message

---

# 23. RESPONSIVE AND PROFESSIONAL UI

The result should look like a professional enterprise LMS.

Use:

- full available width
- full available height
- clear hierarchy
- consistent typography
- professional buttons
- appropriate icons
- good spacing
- responsive layout
- clear loading states
- clear empty states
- clear error states
- accessible controls
- visible progress indicators

Do not turn everything into a collection of small cards.

The dashboard can use cards/charts, but major workspaces should use the available screen.

---

# 24. DO NOT BREAK EXISTING RBAC

Preserve role permissions.

Training Administrator should manage only what their permissions allow.

Trainer should manage sessions/attendance only where authorized.

Learner should only see sessions/courses they are eligible for.

Course Owner should manage their authorized courses.

Approver should see their approval scope.

System Admin should retain existing administrative access.

Do not bypass authorization just to make the UI work.

---

# 25. DO NOT CREATE DUPLICATE SYSTEMS

Before adding anything, inspect existing:

- Session APIs
- Course APIs
- Enrollment APIs
- Attendance APIs
- Assessment APIs
- Question Bank APIs
- Notification APIs
- User/RBAC APIs
- Jitsi/BigBlueButton integration

Reuse existing functionality.

Only add or modify what is genuinely necessary.

---

# 26. QUICK IMPLEMENTATION REQUIREMENT

Do not spend 20–30 minutes analyzing.

Do not create a long implementation plan.

Do not stop and ask for approval.

Do this:

1. Briefly inspect the current implementation.
2. Identify the relevant files/services/components.
3. Implement the fixes immediately.
4. Run focused tests/checks.
5. Fix any errors.
6. Report the result briefly.

---

# 27. VERIFICATION

After implementation verify:

### Course
- Create Course opens full screen.
- Title is empty with placeholder.
- Description is empty with placeholder.
- Objective is empty with placeholder.
- Rich text editing works.
- Delivery Method removed.
- Language removed.

### Curriculum
- Full screen.
- Module expand/collapse works.
- Lesson expand/collapse works.
- Sub-lesson expand/collapse works.
- `+` shows children.
- `−` hides children.
- Quiz actions work.
- Assignment actions work.
- Assessment actions work.
- Major workflows open full screen.

### Quiz
- Question Bank works.
- Questions can be selected/reused.
- Quiz Builder works.
- Save works.
- Publish works where authorized.

### Assignment
- Add Assignment works.
- Assignment Builder opens.
- Save/edit works where supported.

### Live Sessions
- Training Administrator schedules a session.
- Trainer sees the session.
- Eligible Learner sees the session.
- Trainer can open/join.
- Learner can open/join.
- Meeting stays inside LMS.
- No separate provider login is required where guest participation is supported.
- No new browser tab/window.

### Notifications
- Scheduling a session creates notification(s) for the appropriate Trainer(s) and Learner(s).
- No duplicate notifications from frontend re-renders.

### Progression
- Locked items are clearly shown.
- Required previous item must be completed before the next item.
- Available/unlocked items can be opened.
- Completed items are clearly shown.

---

# 28. FINAL CHECKS

Run:

- backend TypeScript check
- frontend TypeScript check
- frontend production build

If tests exist for the affected services, run the relevant tests.

Do not reset the database.

Do not delete existing data.

Do not remove migrations.

---

# FINAL RESPONSE FORMAT

After completing the implementation, give a short report:

## Fixed
- Live session guest login
- Learner session visibility
- Session notifications
- Full-screen Create Course
- Rich text fields
- Removed Delivery Method/Language
- Full-screen curriculum
- Module/Lesson/Sub-lesson actions
- Quiz Builder
- Assignment workflow
- Learning progression

## Verification
- Backend TypeScript:
- Frontend TypeScript:
- Frontend build:
- Live session:
- Learner visibility:
- Notifications:

## Remaining limitations

Only list genuine technical limitations that could not be fixed.
