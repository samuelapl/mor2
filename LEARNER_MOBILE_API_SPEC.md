# Learner Mobile App — API Specification

Every backend REST endpoint used by the **Learner Mobile App** (React Native / Expo), verified against the NestJS source in `backend/src/modules/*`. Field names, enums and validation rules below are what the backend actually accepts and returns.

> **Status legend**: ⚠️ = a backend quirk the mobile client must work around (documented inline).

---

## 1. Global Conventions (read first)

### 1.1 Base URL
The global prefix is **`/api/v1`** (`backend/src/main.ts`). The port comes from `PORT` in `backend/.env` — **3001** in this project (the code default is 3000).

| Target | Base URL |
|---|---|
| Physical device (dev build, same Wi-Fi) | `http://<YOUR_LAN_IP>:3001/api/v1` |
| Android emulator | `http://10.0.2.2:3001/api/v1` |
| iOS simulator | `http://localhost:3001/api/v1` |

Configure via `EXPO_PUBLIC_API_URL`.

### 1.2 Headers
```http
Authorization: Bearer <accessToken>
Content-Type: application/json
Accept-Language: en        # or "am" — localizes error messages (messageAm)
```

### 1.3 Success envelope — every response is wrapped
A global `TransformInterceptor` wraps **every** successful response:
```json
{ "data": <payload>, "timestamp": "2026-09-26T10:00:00.000Z" }
```
The Axios client must unwrap `response.data.data`. **All payloads in this document are shown already unwrapped.**

### 1.4 Paginated payload
Paginated endpoints return (inside the envelope):
```json
{
  "data": [ ... ],
  "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3, "hasNextPage": true, "hasPreviousPage": false }
}
```
So on the wire a list is `body.data.data`. Common query params: `page` (default 1), `limit` (default 20, max 100), `search`, `sortBy`, `sortOrder=asc|desc` (default sort `createdAt desc`).

⚠️ `sortBy` is restricted to `createdAt`, `updatedAt`, `titleEn`, `titleAm`, `email`, `lastName`, `firstName`, `status`, `order`, `scheduledAt`, `score`. Any other value silently falls back to `createdAt desc`.

### 1.5 Error format
```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Please spend more time on this activity before continuing.",
  "messageAm": ["..."],
  "locale": "en",
  "path": "/api/v1/progress/lessons/abc/complete",
  "timestamp": "2026-09-26T10:00:00.000Z",
  "reason": "TIME_NOT_MET",
  "remainingSeconds": 120
}
```
- `message` may be a **string or string[]** (validation errors are arrays).
- Extra fields (`reason`, `remainingSeconds`, `remainingMinutes`) appear on policy-gating 403s. Known `reason` codes: `LOCKED`, `TIME_NOT_MET`, `ASSESSMENT_REQUIRED`, `ASSESSMENT_NOT_PASSED`, `RETAKE_COOLDOWN`.

### 1.6 Strict body validation
The validation pipe runs with `whitelist + forbidNonWhitelisted`. **Sending any field not listed in a request body below returns `400`.** Mobile request types must match exactly.

### 1.7 Tokens
- Access token: JWT, default lifetime **15 min** (`JWT_ACCESS_EXPIRATION`).
- Refresh token: default **7 days**, **rotated on every refresh** (the old one is revoked immediately — always store the new one).

### 1.8 File / media URLs ⚠️
`thumbnailUrl`, `resourceUrl`, attachment `fileUrl`, `avatarUrl` are stored as absolute MinIO URLs built from `MINIO_ENDPOINT` (default `http://localhost:9000/eltms-files/<key>`). `localhost` is unreachable from a phone:
- **Dev setup**: set `MINIO_ENDPOINT=<YOUR_LAN_IP>` in `backend/.env` (restart backend) so new URLs and **presigned certificate URLs** are reachable. Presigned URLs are signed with the host — they cannot be host-rewritten on the client.
- **Already-stored URLs**: the mobile `resolveMediaUrl()` helper rewrites `localhost`/`127.0.0.1` hosts to the dev host for unsigned media.
- **Relative paths** (seed data such as `thumbnailUrl: "/sample.jpg"`, `/sample.mp4`) are files in `frontend/public`, served by the **web app** (port 3000). `resolveMediaUrl()` prefixes them with `EXPO_PUBLIC_WEB_URL` (default: API host, port 3000).
- **USB testing**: with `adb reverse` for ports 3001/3000/9000 the phone reaches everything via `localhost`, so no `MINIO_ENDPOINT` change is needed.

### 1.9 Learner permissions (seeded)
`course.browse`, `enrollment.self`, `progress.mark_own`, `assessment.submit`, `result.view.own`, `attendance.checkin`, `certificate.view`. Every endpoint below is reachable by the `LEARNER` role.

### 1.10 Shared enums
| Enum | Values |
|---|---|
| `CourseStatus` | `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `PUBLISHED`, `REJECTED`, `ARCHIVED` |
| `CourseLevel` | `BASIC`, `INTERMEDIATE`, `ADVANCED` |
| `CourseDeliveryMode` | `ONLINE_ONLY`, `IN_PERSON_ONLY`, `BOTH` |
| `EnrollmentStatus` | `ACTIVE`, `COMPLETED`, `DROPPED` |
| `LessonContentType` | `VIDEO`, `DOCUMENT`, `PRESENTATION`, `INTERACTIVE`, `SCORM`, `EXTERNAL_LINK`, `AUDIO` |
| `AssessmentType` | `FINAL_ASSESSMENT`, `MODULE_ASSESSMENT`, `LESSON_ASSESSMENT`, `SUB_LESSON_ASSESSMENT` |
| `QuestionType` | `MULTIPLE_CHOICE`, `TRUE_FALSE`, `SHORT_ANSWER` |
| `SessionType` | `VIRTUAL`, `IN_PERSON` |
| `SessionPlatform` | `LIVEKIT`, `ZOOM`, `GOOGLE_MEET`, `MS_TEAMS`, `CUSTOM`, `IN_PERSON` |
| `SessionStatus` | `SCHEDULED`, `LIVE`, `COMPLETED`, `CANCELLED` |
| `AttendanceStatus` | `PRESENT`, `ABSENT`, `LATE`, `EXCUSED` |
| `CheckInMethod` | `VIRTUAL`, `QR`, `GPS`, `BIOMETRIC` |
| `NotificationType` | `ENROLLMENT_APPROVED`, `ENROLLMENT_REJECTED`, `COURSE_PUBLISHED`, `COURSE_APPROVED`, `COURSE_REJECTED`, `ASSESSMENT_GRADED`, `CERTIFICATE_ISSUED`, `SESSION_REMINDER`, `TRAINING_REMINDER`, `REGISTRATION_APPROVED`, `REGISTRATION_REJECTED`, `SYSTEM` |

---

## 2. Authentication & Account (`/auth`, `/users`)

### 2.1 Sign In — `POST /auth/login` (public)
```json
{ "email": "learner@gmail.com", "password": "Password123!" }
```
`password` min length 6.

**Response A — session (`200`)**:
```json
{
  "user": {
    "id": "uuid",
    "email": "learner@gmail.com",
    "firstName": "Meron",
    "lastName": "Kassa",
    "phone": "+2519...",
    "tin": null,
    "avatarUrl": null,
    "locale": "en",
    "isActive": true,
    "registrationStatus": "APPROVED",
    "mustChangePassword": false,
    "primaryVenueId": null,
    "lastLogin": "...",
    "createdAt": "...",
    "updatedAt": "...",
    "roles": [{ "id": "uuid", "userId": "uuid", "role": "LEARNER", "grantedAt": "...", "grantedBy": null }]
  },
  "accessToken": "jwt...",
  "refreshToken": "jwt...",
  "permissions": ["course.browse", "enrollment.self", "..."]
}
```
> `user.roles` is an array of **objects** — use `roles.map(r => r.role)`.

**Response B — first-login challenge (`200`)** (admin-created account, `mustChangePassword = true`):
```json
{ "passwordChangeRequired": true, "challengeToken": "jwt...", "email": "le•••@gmail.com" }
```
`email` is **masked** (display only). Discriminate on `"passwordChangeRequired" in payload`.

**Errors (`401`)**: `Invalid credentials`, `Your registration is awaiting administrator approval`, `Your registration was rejected. Contact an administrator`, `Account is deactivated`.

### 2.2 Refresh — `POST /auth/refresh` (public)
```json
{ "refreshToken": "jwt..." }
```
**Response**: same shape as 2.1 Response A (`user`, `accessToken`, `refreshToken`, `permissions`). The old refresh token is revoked. `401` → session is dead, log out.

> Fixed 2026-09-26: refresh tokens used to be stored as a salted bcrypt hash and looked up by re-hashing, so refresh **always** returned 401. They are now stored as a SHA-256 hash (`auth.service.ts`, covered by `auth.service.spec.ts`).

### 2.3 Sign Out — `POST /auth/logout` (bearer)
No body. Revokes the current session. Response: `{ "message": "Logged out successfully" }`.

### 2.4 Self-Registration — `POST /auth/register` (public)
```json
{
  "firstName": "Meron",
  "lastName": "Kassa",
  "email": "learner@example.com",
  "password": "Password123!",
  "phone": "+251911000000",
  "tin": "0012345678",
  "locale": "en"
}
```
Required: `firstName`, `lastName`, `email`, `password`, `phone`. Optional: `tin`, `locale` (`en`|`am`). No other fields allowed.

**Password policy** (all endpoints that set a password — register, reset, first-login, change-password; `common/utils/password.util.ts`): at least **8 characters** with **at least one letter and one number**. The DTO minimum of 6 is weaker than the policy the service enforces.
**Response**: `{ "message": "Registration submitted for approval", "user": { "id", "firstName", "lastName", "email", "registrationStatus": "PENDING" } }` — the user **cannot log in until an admin approves**. Show a "pending approval" screen.

### 2.5 Forgot Password
| Step | Endpoint | Body | Response |
|---|---|---|---|
| 1 | `POST /auth/forgot-password` | `{ "email" }` | `{ "message": "If that email exists, a code has been sent." }` (always, anti-enumeration) |
| 2 | `POST /auth/verify-reset-code` | `{ "email", "code" }` | `{ "message": "Code verified." }` |
| 3 | `POST /auth/reset-password` | `{ "email", "code", "newPassword" }` | `{ "message": "Password reset successfully. You can now sign in." }` |

`code` must be exactly 6 digits; `newPassword` min 8. Step 3 does not log in — navigate to Login.

### 2.6 First-Login Password Setup
| Step | Endpoint | Body | Response |
|---|---|---|---|
| Resend | `POST /auth/first-login/resend-code` | `{ "challengeToken" }` | `{ "message": "A new code has been sent.", "email": "le•••@..." }` |
| Verify | `POST /auth/first-login/verify-code` | `{ "challengeToken", "code" }` | `{ "message": "Code verified." }` |
| Complete | `POST /auth/first-login/complete` | `{ "challengeToken", "code", "newPassword", "confirmPassword" }` | Session (same as 2.1 Response A) — user is logged in |

`newPassword` min 8 and must equal `confirmPassword`, must differ from the temporary password, and must satisfy the server password policy (`400` with the policy message otherwise). The challenge token is short-lived; on `401` restart from Login.

### 2.7 Profile (bearer)
| Action | Endpoint | Body |
|---|---|---|
| Get profile | `GET /users/me` | — |
| Update profile | `PATCH /users/me` | any of `firstName`, `lastName`, `phone`, `locale` (`en`\|`am`), `tin`, `avatarUrl`, `primaryVenueId` |
| Change password | `POST /users/me/change-password` | `{ "currentPassword", "newPassword" }` — policy above; errors are **403** (`Current password is incorrect`, policy message) |
| Upload avatar | `POST /files/avatar` | `multipart/form-data`, field `file` → `{ "avatarUrl" }` (also saved on the user) |

`GET/PATCH /users/me` return the user object (as in 2.1, without password) plus `primaryVenue` (Venue or `null`).

---

## 3. Course Catalog (`/courses`)

### 3.1 List Courses — `GET /courses` (paginated)
Query: `page`, `limit`, `search` (matches `titleEn`, `titleAm`, `code`), `sortBy`, `sortOrder`, `status`.
- Learners **only ever see `PUBLISHED` courses** (enforced server-side); `status=PUBLISHED` is optional.
- ⚠️ There is **no `category` or `level` filter** server-side — filter client-side on the current page if needed.

Item shape (full `Course` row + owners):
```json
{
  "id": "uuid",
  "code": "TAX-101",
  "titleEn": "Tax Law Fundamentals",
  "titleAm": "የግብር ሕግ መሠረታዊ መርሆዎች",
  "descriptionEn": "...", "descriptionAm": "...",
  "objectivesEn": "...", "objectivesAm": "...",
  "thumbnailUrl": "http://...",
  "status": "PUBLISHED",
  "level": "BASIC",
  "category": "Taxation",
  "department": "...",
  "targetAudience": "...",
  "deliveryMode": "BOTH",
  "language": "en",
  "prerequisites": "...",
  "estimatedHours": 10,
  "version": 1,
  "publishedAt": "...",
  "owners": [{ "user": { "id", "firstName", "lastName", ... } }]
}
```

> ⚠️ **Security (known, not yet fixed):** `owners[].user` (list and detail) and `trainers[].user` (detail) are full user rows **including the `password` hash**. The app must only read `id`, `firstName`, `lastName`, `email`, `avatarUrl`; the backend should `select` safe fields.

### 3.2 Course Details (with syllabus + lock state) — `GET /courses/:id`
**This is the primary syllabus endpoint for learners.** Returns the course plus:
```json
{
  "...course fields": "...",
  "enrolled": true,
  "enrollmentStatus": "ACTIVE",
  "enrolledAt": "...",
  "trainers": [{ "user": { ... } }],
  "attachments": [ ... ],
  "assessments": [{ "id", "titleEn", "titleAm", "passingScore", "timeLimitMinutes" }],
  "modules": [
    {
      "id": "uuid", "order": 0, "titleEn": "...", "titleAm": "...",
      "descriptionEn": "...", "durationMinutes": 60, "passingScore": null,
      "unlocked": true,
      "attachments": [ ... ],
      "assessments": [{ "id", "titleEn", "titleAm", "passingScore", "timeLimitMinutes" }],
      "lessons": [
        {
          "id": "uuid", "order": 0, "titleEn": "...", "titleAm": "...",
          "contentType": "VIDEO", "durationMinutes": 15,
          "contentEn": "...", "contentAm": "...", "resourceUrl": "http://...",
          "unlocked": true,
          "attachments": [ ... ],
          "assessments": [{ "id", "titleEn", "titleAm", "passingScore", "timeLimitMinutes" }],
          "subLessons": [{ "id", "titleEn", "contentType", "unlocked", "attachments", "..." }]
        }
      ]
    }
  ],
  "lessons": [ "flattened top-level lessons of all modules" ]
}
```
- Top-level `assessments` = the course's `FINAL_ASSESSMENT` (0 or 1).
- **Not enrolled** → every module/lesson has `unlocked: false` and `contentEn/contentAm/resourceUrl = null`, `attachments = []`.
- **Enrolled** → `unlocked` follows **sequential progression** (a lesson unlocks when the preceding one — and its assessment, if any — is complete).

### 3.3 Modules List — `GET /courses/:courseId/modules`
⚠️ Returns raw modules → lessons → subLessons with full content, attachments and assessments **including every user's `attempts`**, and **no `unlocked` flags**. Do not use it for learner UI — use 3.2 for structure and 6.1 for progress.

### 3.4 Module Details — `GET /modules/:moduleId`
Same caveat as 3.3. Not needed by the app.

---

## 4. Enrollments

### 4.1 My Enrollments — `GET /enrollments/me` (paginated)
Query: `page`, `limit`, `sortBy`, `sortOrder`.
⚠️ `status` is **ignored** server-side — fetch all (e.g. `limit=100`) and filter `ACTIVE` / `COMPLETED` / `DROPPED` on the client.

Item:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "courseId": "uuid",
  "status": "ACTIVE",
  "deliveryMode": "ONLINE_ONLY",
  "venueId": null,
  "sessionId": null,
  "enrolledAt": "...",
  "completedAt": null,
  "droppedAt": null,
  "droppedReason": null,
  "course": { "...full Course row (see 3.1, without owners)" },
  "venue": null
}
```

### 4.2 Self-Enroll — `POST /enrollments/self`
```json
{ "courseId": "uuid", "deliveryMode": "IN_PERSON_ONLY", "sessionId": "uuid", "venueId": "uuid" }
```
Only `courseId` is required. Rules by `course.deliveryMode`:
| Course mode | Body |
|---|---|
| `ONLINE_ONLY` | `{ courseId }` (sending `IN_PERSON_ONLY` → 400) |
| `BOTH` | `{ courseId }` for online, or `{ courseId, deliveryMode: "IN_PERSON_ONLY", sessionId \| venueId }` |
| `IN_PERSON_ONLY` | `{ courseId, sessionId }` (or `venueId`) — **required**, else 400 "Please select an in-person training session to reserve your seat" |

Pick an in-person session from `GET /live-sessions?courseId=<id>` (8.2) filtered to `sessionType === "IN_PERSON"`. A seat is reserved; a full session returns 400.
**Errors (400)**: `Course is not published`, `Already enrolled in this course`, `You have already completed this course and earned your certificate`. A previously `DROPPED` enrollment is re-activated; a `COMPLETED` one whose certificate was revoked is reset for a retake.
**Response**: the Enrollment row.

### 4.3 Drop — `PATCH /enrollments/:id/drop`
Body (optional): `{ "reason": "Scheduling conflict" }`. A `COMPLETED` enrollment cannot be dropped (400). Response: the updated Enrollment.

---

## 5. Lesson Content

### 5.1 Lesson Details — `GET /lessons/:lessonId`
```json
{
  "id": "uuid",
  "moduleId": "uuid",
  "parentId": null,
  "titleEn": "Introduction to Withholding Tax",
  "titleAm": "...",
  "contentType": "VIDEO",
  "contentEn": "HTML/markdown body or transcript",
  "contentAm": "...",
  "resourceUrl": "http://.../lesson1.mp4",
  "durationMinutes": 15,
  "order": 0,
  "attachments": [
    { "id", "fileName": "tax_guide.pdf", "fileUrl": "http://...", "fileType": "application/pdf", "sizeBytes": 2048576, "fileKey", "createdAt" }
  ],
  "assessments": [ "LESSON_ASSESSMENT rows (use 7.2 instead — this includes raw attempts)" ],
  "parent": null,
  "subLessons": [{ "id", "titleEn", "contentType", "resourceUrl", "attachments", "..." }],
  "module": { "id", "courseId", "order" }
}
```
- Media source = `resourceUrl` (video/audio/document/external link). Body text = `contentEn` / `contentAm`.
- **403** `You must be actively enrolled in this course to access lesson content.`
- **403** `This lesson or sub-lesson is locked. Complete the preceding required modules and activities first.`

### 5.2 Lesson Attachments — `GET /lessons/:lessonId/attachments`
Array of Attachment rows (shape above). Also `GET /modules/:moduleId/attachments`.

---

## 6. Progress (`/progress`)

### 6.1 Course Progress — `GET /progress/courses/:courseId`
**The source of truth for syllabus progress, locks and certificate eligibility.**
```json
{
  "courseId": "uuid",
  "stats": { "totalModules": 3, "totalLessons": 12, "completedLessons": 8, "unlockedLessons": 9, "overallPercent": 67 },
  "modules": [
    {
      "moduleId": "uuid", "titleEn": "...", "titleAm": "...", "order": 0,
      "unlocked": true,
      "totalLessons": 4, "completedLessons": 4, "unlockedLessons": 4,
      "moduleCompleted": true,
      "progressPercent": 100,
      "durationMinutes": 60, "timeSpentSeconds": 3000, "requiredSeconds": 2880, "timeSatisfied": true,
      "assessment": { "id", "titleEn", "titleAm", "passingScore", "passed": true },
      "lessons": [
        {
          "lessonId": "uuid", "titleEn": "...", "titleAm": "...", "order": 0,
          "unlocked": true, "completed": true,
          "lastPosition": 720,
          "durationMinutes": 15, "timeSpentSeconds": 900, "requiredSeconds": 720, "timeSatisfied": true,
          "assessment": null,
          "subLessons": [
            { "lessonId", "titleEn", "titleAm", "order", "unlocked", "completed", "durationMinutes", "timeSpentSeconds", "requiredSeconds", "timeSatisfied", "assessment": null }
          ]
        }
      ]
    }
  ],
  "courseCompletion": {
    "contentCompleted": false,
    "finalAssessmentRequired": true,
    "finalAssessmentPassed": false,
    "certificateEligible": false,
    "finalAssessment": { "id", "titleEn", "titleAm", "passingScore", "passed": false }
  }
}
```
- Lessons with sub-lessons count their sub-lessons (not the parent) in totals.
- `lastPosition` (seconds) is on top-level lessons only; sub-lessons don't expose it here — use 6.2.
- Total course time spent = sum of `modules[].timeSpentSeconds`.

### 6.2 Single Lesson Progress — `GET /progress/lessons/:lessonId`
Returns the `LessonCompletion` row or **`null`** if never opened:
```json
{ "id", "userId", "lessonId", "completed": false, "completedAt": null, "lastPosition": 140, "lastAccessed": "...", "timeSpentSeconds": 300 }
```

### 6.3 Mark Complete / Save Playhead — `PATCH /progress/lessons/:lessonId/complete`
```json
{ "completed": true, "lastPosition": 900 }
```
`completed` (boolean) is **required**; `lastPosition` optional integer ≥ 0 (seconds).
⚠️ `completed` is **overwritten** on every call. To save the playhead without changing state, send the lesson's **current** completion state (`completed: <current>`); sending `false` on a completed lesson un-completes it.
When `completed: true` the server enforces, in order:
1. **403 `reason: "LOCKED"`** — lesson not yet unlocked.
2. **403 `reason: "TIME_NOT_MET"`, `remainingSeconds`** — not enough time spent (see 6.4).
3. **403 `reason: "ASSESSMENT_NOT_PASSED"`** — the lesson's assessment must be passed first.

Completing a parent lesson cascades to its sub-lessons; completing all sub-lessons completes the parent; module completion and certificate issuance cascade automatically.
**Response**: the `LessonCompletion` row.

### 6.4 Time Heartbeat — `PATCH /progress/lessons/:lessonId/time`
```json
{ "secondsDelta": 30 }
```
`secondsDelta`: integer **1–300** (values outside → 400). Requires the lesson to be unlocked (403 `LOCKED`).
**Response**:
```json
{ "lessonId": "uuid", "timeSpentSeconds": 900, "requiredSeconds": 720, "satisfied": true }
```
`requiredSeconds` = `durationMinutes × 60 × policy ratio` (admin-configured; 5 s for ≤1-minute lessons, 0 when no duration). Enable the "Mark complete" button only when `satisfied`.

---

## 7. Assessments

### 7.1 Listing
| Scope | Endpoint |
|---|---|
| All for course | `GET /courses/:courseId/assessments` |
| Module quiz | `GET /modules/:moduleId/assessments` |
| Lesson check | `GET /lessons/:lessonId/assessments` |

Each returns an **array** of assessments (shape 7.2). Prefer the IDs already present in 6.1 (`modules[].assessment`, `lessons[].assessment`, `courseCompletion.finalAssessment`), which also carry `passed`.

### 7.2 Assessment Details — `GET /assessments/:id`
Correct answers are stripped for learners.
```json
{
  "id": "uuid",
  "courseId": "uuid", "moduleId": null, "lessonId": null,
  "type": "FINAL_ASSESSMENT",
  "titleEn": "Final Exam", "titleAm": "...",
  "descriptionEn": "...", "descriptionAm": "...",
  "passingScore": 70,
  "maxAttempts": 3,
  "timeLimitMinutes": 20,
  "shuffleQuestions": false,
  "questions": [
    { "id": "q1", "type": "MULTIPLE_CHOICE", "question": "What is the standard withholding tax rate?", "options": ["2%", "5%", "10%", "15%"], "points": 20 },
    { "id": "q2", "type": "TRUE_FALSE", "question": "...", "options": ["True", "False"] },
    { "id": "q3", "type": "SHORT_ANSWER", "question": "...", "options": [] }
  ],
  "course": { "id", "titleEn", "titleAm" },
  "module": null,
  "lesson": null,
  "attempts": [ "⚠️ attempts of ALL users — ignore; use 7.5" ]
}
```
Questions may also carry `imageUrl` (render above the prompt when present) and `points`. `shuffleQuestions: true` → shuffle order on the client (the server does not shuffle); shuffle questions only, never `options` (answers are graded by option index).

### 7.3 Start Attempt — `POST /assessments/:id/start`
No body. **Idempotent**: if an unsubmitted attempt exists and time remains, it is **resumed** (same `attemptId`, reduced `remainingSeconds`). If its time already expired, the server auto-submits it and starts a new attempt if allowed.
```json
{ "attemptId": "uuid", "attemptNumber": 1, "startedAt": "...", "timeLimitMinutes": 20, "remainingSeconds": 1200 }
```
`timeLimitMinutes` / `remainingSeconds` are absent/`null` for untimed quizzes. Drive the countdown from `remainingSeconds`, not from a local 20-minute constant.
**Errors (403)**:
- `You must be enrolled in this course to take this assessment`
- `Prerequisite course content must be completed before taking the final assessment` (final only)
- `This module is still locked...` / `This lesson is still locked...` (module/lesson quizzes)
- `Maximum attempts reached for this assessment`
- `reason: "RETAKE_COOLDOWN"`, `remainingMinutes` — attempts exhausted but a cooldown retake will be allowed later

### 7.4 Submit — `POST /assessments/:id/submit`
```json
{
  "answers": [
    { "questionId": "q1", "selectedOption": 1 },
    { "questionId": "q2", "selectedOption": 0 },
    { "questionId": "q3", "selectedOption": "Proclamation 979" }
  ]
}
```
Grading is **strict equality** of `selectedOption` against the stored `correctAnswer`:
| Question type | `selectedOption` |
|---|---|
| `MULTIPLE_CHOICE` | **number** — zero-based index into `options` |
| `TRUE_FALSE` | **number** — `0` = "True", `1` = "False" (index into `options`) |
| `SHORT_ANSWER` | **string** — exact, case-sensitive match (trim whitespace client-side) |

⚠️ Do **not** send `textAnswer` (the DTO example shows it, but grading only reads `selectedOption`). Unanswered questions may be omitted (they score as wrong). Score = `round(correct / totalQuestions × 100)`.
**Response**:
```json
{
  "attemptId": "uuid",
  "attemptNumber": 1,
  "score": 80,
  "passed": true,
  "correctCount": 4,
  "totalQuestions": 5,
  "review": [
    { "questionId": "q1", "type": "MULTIPLE_CHOICE", "question": "...", "options": ["2%", "5%", "10%", "15%"], "imageUrl": null, "selectedOption": 1, "correctAnswer": 1, "isCorrect": true }
  ]
}
```
`review` covers **every** question (unanswered ones have `selectedOption: undefined`, `isCorrect: false`).
There is no `explanation`, `submittedAt` or `timeSpentSeconds` in this response — read them from 7.5 if needed. Passing a lesson/module quiz auto-completes that lesson/module; passing the final can complete the enrollment and issue the certificate.

### 7.5 My Attempts — `GET /assessments/:id/attempts`
Array (oldest first) of the learner's own attempts:
```json
[{ "id", "assessmentId", "userId", "attemptNumber": 1, "score": 80, "passed": true, "answers": [ ... ], "startedAt", "submittedAt", "timeSpentSeconds": 930, "createdAt" }]
```
An attempt with `submittedAt: null` is in progress. Remaining attempts = `maxAttempts − count(submitted)`.

---

## 8. Live Sessions & Attendance

### 8.1 My Upcoming Sessions — `GET /live-sessions/upcoming/me` (paginated)
Query: `page`, `limit`, `courseId`. Returns `SCHEDULED` and `LIVE` sessions visible to the learner, ordered by `scheduledAt asc`.
```json
{
  "id": "uuid",
  "courseId": "uuid",
  "titleEn": "Interactive Q&A Session", "titleAm": "...",
  "descriptionEn": "...", "descriptionAm": "...",
  "sessionType": "VIRTUAL",
  "platform": "LIVEKIT",
  "status": "SCHEDULED",
  "scheduledAt": "2026-09-28T14:00:00Z",
  "durationMinutes": 60,
  "externalUrl": null, "meetingId": null, "meetingPassword": null,
  "venueId": null,
  "recordingUrl": null,
  "attendanceThreshold": 60,
  "allowViewAttendance": false,
  "actualStartedAt": null, "actualEndedAt": null,
  "course": { "id", "titleEn", "titleAm", "code" },
  "trainer": { "id", "firstName", "lastName", "email", "avatarUrl" },
  "venue": null
}
```
Use `sessionType` (`VIRTUAL` | `IN_PERSON`) to branch UI; `venue` is populated for in-person sessions.

### 8.2 Sessions for a Course — `GET /live-sessions?courseId=<id>` (paginated)
Used to choose an in-person session during enrollment (4.2). Query: `courseId`, `status`, `page`, `limit`.

### 8.3 Session Details — `GET /live-sessions/:id`
Same fields as 8.1 plus `attendees` (Attendance rows with `user`).

### 8.4 Join a Virtual Session
| Platform | Call | Response | Mobile action |
|---|---|---|---|
| `ZOOM`, `GOOGLE_MEET`, `MS_TEAMS`, `CUSTOM` | `GET /live-sessions/:id/join-url` | `{ "joinUrl": "https://...", "platform": "ZOOM" }` | Open `joinUrl` with `Linking.openURL` (native app) |
| `LIVEKIT` | `GET /live-sessions/:id/join-url` | `{ "joinUrl", "platform": "LIVEKIT" }` | Open in `expo-web-browser` (MVP) |
| `LIVEKIT` (native, later phase) | `GET /live-sessions/:id/livekit-token` | `{ "token", "wsUrl", "roomName" }` | Connect with `@livekit/react-native` |

`livekit-token` returns **400** `Session is not scheduled or live`; learners not actively enrolled are auto-enrolled.

⚠️ For `LIVEKIT` sessions `join-url` returns an **empty** `joinUrl` (no external link) — the room is joined with the token. `wsUrl` defaults to `ws://localhost:7880` (`LIVEKIT_URL`); the mobile app rewrites loopback hosts to the API host in development. `join-url` on an in-person session returns 400 `This is an in-person classroom session and has no video room…`. The virtual heartbeat threshold comes from the admin attendance policy, not `session.attendanceThreshold`.

### 8.5 Virtual Attendance Tracking (call alongside 8.4)
| Step | Endpoint | Body | Response |
|---|---|---|---|
| Join | `POST /attendance/sessions/:sessionId/join` | — | Attendance row + `threshold`, `sessionDurationMinutes` |
| Heartbeat | `POST /attendance/sessions/:sessionId/heartbeat` | `{ "activeSeconds": 30 }` (int **1–120**, default 15) | `{ activeSeconds, durationMinutes, percentage, status, threshold, sessionDurationMinutes }` |
| Leave | `POST /attendance/sessions/:sessionId/leave` | — | Updated Attendance row (or `null`) |

Send a heartbeat every 30 s while the meeting is in the foreground; `activeSeconds` = real elapsed seconds since the last heartbeat (cap 120). The learner becomes `PRESENT` once `percentage ≥ threshold`.

### 8.6 Self Check-in — `POST /attendance/checkin/:sessionId?method=<CheckInMethod>`
Body (all optional):
```json
{ "method": "GPS", "latitude": 9.0108, "longitude": 38.7613 }
```
- `method` from query **or** body; default `VIRTUAL`. Allowed: `VIRTUAL`, `QR`, `GPS`, `BIOMETRIC`.
- `latitude`/`longitude` are stored only for `GPS`.
- ⚠️ **No code field exists** (`{ "code": ... }` → 400). There is no manual-code check-in.
- ⚠️ **Codes are client-side only** — the backend accepts any check-in while the session is SCHEDULED/LIVE. The web app defines the format and the mobile app matches it:
  - **Classroom PIN** = last 6 characters of the session id, upper-case (trainer's "Classroom QR" modal shows it). A verified PIN is sent as `method=QR`, like the web.
  - **QR payload** = `ELTMS-CHECKIN:<sessionId>:<PIN>` (a bare session id is also accepted). ⚠️ The web's `ClassroomQrPattern` draws a **decorative, non-scannable** pattern — a real QR must be generated from that payload until the web renders one.
- **400**: `Cannot check in to a session that is not scheduled or live`, `You are not enrolled in this course`. Repeat check-ins return the existing record.
**Response**: the Attendance row (`status: "PRESENT"`, `checkInMethod`).

### 8.7 My Attendance History — `GET /attendance/me`
Array (newest first) of Attendance rows including `session` (with `course: { id, titleEn, titleAm, code }`).

### 8.8 Attendance Visibility — `GET /attendance/sessions/:sessionId/visibility`
`{ "canView", "globalPermitted", "sessionPermitted", "isStaff" }` — show the learner's attendance % only when `canView`.

### 8.9 Venue Details — `GET /venues/:id` (public)
```json
{ "id", "name": "Room 204", "building": "HQ Tower", "branch": "Addis Ababa", "capacity": 30, "facilities": ["Projector"], "isActive": true }
```
⚠️ No address or coordinates are stored — show name/building/branch text only (no map pin).

---

## 9. Certificates (`/certificates`)

### 9.1 My Certificates — `GET /certificates/me`
Plain **array** (not paginated), newest first:
```json
[{
  "id": "uuid",
  "userId": "uuid",
  "courseId": "uuid",
  "templateId": "uuid",
  "certificateNumber": "ELTMS-2026-000001",
  "verificationCode": "A1B2C3D4",
  "issuedAt": "...",
  "expiresAt": null,
  "pdfFileUrl": "certificates/....pdf",
  "downloadUrl": "http://<MINIO_ENDPOINT>:9000/...signed... (valid 1h) or null",
  "course": { "id", "titleEn", "titleAm", "code" },
  "template": { ... }
}]
```

### 9.2 Claim — `POST /certificates/claim?courseId=<id>`
No body. Returns the Certificate (with `downloadUrl`) if eligible — or **`null`** (`data: null`, HTTP 201) when requirements aren't met (all lessons completed **and** final assessment passed, if any). Check `courseCompletion.certificateEligible` from 6.1 before showing the button. Certificates are usually auto-issued on completion, so claiming an existing one simply returns it.

### 9.3 Detail & Download
- `GET /certificates/:id` → Certificate + `user`, `course`, `template`, `downloadUrl`.
- `GET /certificates/:id/download` → `{ "downloadUrl": "..." | null }` (presigned, **1 hour**). Fetch a fresh URL immediately before downloading; `null` → PDF not generated yet.
- Public verification: `GET /certificates/verify?code=<verificationCode>`.

---

## 10. Notifications (`/notifications`)

### 10.1 List — `GET /notifications/me` (paginated)
Query: `page`, `limit`, `unreadOnly=true`. ⚠️ Omit `unreadOnly` entirely for "all" — any non-empty value (even `false`) is treated as true.
```json
{
  "data": [{ "id", "userId", "type": "CERTIFICATE_ISSUED", "titleEn", "titleAm", "bodyEn", "bodyAm", "metadata": { "courseId": "..." }, "readAt": null, "createdAt" }],
  "meta": { ... },
  "unreadCount": 3
}
```
`metadata` carries deep-link IDs (e.g. `courseId`, `assessmentId`, `sessionId`).

### 10.2 Unread Count — `GET /notifications/me/unread-count`
`{ "unreadCount": 3 }`

### 10.3 Mark Read
- Single: `PATCH /notifications/:id/read` → updated Notification (404 if not the user's).
- All: `PATCH /notifications/me/read-all` → `{ "message": "5 notifications marked as read" }`.

---

## 11. Screen → Endpoint Map

| Mobile Screen | Endpoints |
|---|---|
| **Login** | `POST /auth/login` |
| **Register / Pending approval** | `POST /auth/register` |
| **Forgot / Verify / Reset password** | `POST /auth/forgot-password`, `POST /auth/verify-reset-code`, `POST /auth/reset-password` |
| **First-login setup** | `POST /auth/first-login/resend-code`, `.../verify-code`, `.../complete` |
| **(Silent)** | `POST /auth/refresh` |
| **Home / Dashboard** | `GET /enrollments/me`, `GET /progress/courses/:id` (per active course), `GET /live-sessions/upcoming/me?limit=3`, `GET /notifications/me/unread-count` |
| **My Courses** | `GET /enrollments/me`, `GET /progress/courses/:courseId` |
| **Catalog** | `GET /courses` |
| **Course Details / Syllabus** | `GET /courses/:id`, `GET /progress/courses/:id`, `POST /enrollments/self`, `GET /live-sessions?courseId=`, `PATCH /enrollments/:id/drop` |
| **Lesson Player** | `GET /lessons/:id`, `GET /progress/lessons/:id`, `PATCH /progress/lessons/:id/time`, `PATCH /progress/lessons/:id/complete` |
| **Quiz** | `GET /assessments/:id`, `GET /assessments/:id/attempts`, `POST /assessments/:id/start`, `POST /assessments/:id/submit` |
| **Live Sessions** | `GET /live-sessions/upcoming/me`, `GET /live-sessions/:id`, `GET /live-sessions/:id/join-url`, `POST /attendance/sessions/:id/join` · `/heartbeat` · `/leave`, `GET /attendance/me` |
| **Check-in (QR / GPS)** | `POST /attendance/checkin/:sessionId?method=QR\|GPS` |
| **Venue** | `GET /venues/:id` |
| **Certificates** | `GET /certificates/me`, `POST /certificates/claim?courseId=`, `GET /certificates/:id/download` |
| **Notifications** | `GET /notifications/me`, `PATCH /notifications/:id/read`, `PATCH /notifications/me/read-all` |
| **Profile & Settings** | `GET /users/me`, `PATCH /users/me`, `POST /files/avatar`, `POST /users/me/change-password`, `POST /auth/logout` |
