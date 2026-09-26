# Session Mode Restructure Plan (4-Stage Execution)

Reorganise how **online (virtual)** and **in-person** courses and sessions are handled, so each mode's rules live in one place, while everything the two modes share stays in one shared core.

---

## Goal & Principle

Online and in-person sessions are about **80% the same** (course, trainer, time, status, attendance, reports, certificates) and **20% different** (where it happens, how learners join, how attendance is taken, room rules).

So we **do not** build two separate systems. We keep:

- **One** `LiveSession` table, with `sessionType` (`VIRTUAL` | `IN_PERSON`) saying which kind it is.
- **One** shared core for create / edit / list / status / attendance records.
- **Separate folders** only for the parts that really differ.

```
                        Course.deliveryMode
               ONLINE_ONLY  |  IN_PERSON_ONLY  |  BOTH
                                  │
                   ┌──────────────┴──────────────┐
                   ▼                             ▼
          VIRTUAL sessions                IN_PERSON sessions
          (video link, time tracking)     (venue, seats, QR/GPS check-in)
                   │                             │
                   └──────────────┬──────────────┘
                                  ▼
                 Enrollment = the LEARNER's choice
       deliveryMode (ONLINE_ONLY | IN_PERSON_ONLY), sessionId?, venueId?
                                  │
                                  ▼
            Learner sees only the sessions matching their choice
```

**"Both" courses:** the course has both kinds of sessions; the learner chooses at enrollment, and the choice is stored on the `Enrollment`. Nothing in this plan changes that. It makes the rule behind it consistent everywhere.

---

## Target Folder Layout

**Backend** (`backend/src/modules/live-sessions/`)
```
live-sessions/
  live-sessions.service.ts     ← shared core: CRUD, status, listing, upcoming
  session-mode.ts              ← the ONE "is in-person?" rule            (Stage 1)
  in-person/                   ← seats, capacity, venue conflicts        (Stage 2)
  virtual/                     ← join URL / token, providers             (Stage 3)
    providers/                 ← LiveKit, BigBlueButton behind one interface
```

**Frontend** (`frontend/src/`)
```
lib/session-mode.ts            ← the same rule for the UI                (Stage 1)
components/features/sessions/
  shared/                      ← SessionTable, SessionDetailModal, …     (Stage 4)
  virtual/                     ← LiveSessionWorkspace, live quiz, …      (Stage 4)
  in-person/                   ← venue picker, check-in, QR modal        (Stage 4)
```

---

## Stage 1: One "Is This In-Person?" Helper

**Problem:** the rule is copied in about 8 places and the copies disagree. For example, `SessionTable` checks only `sessionType`, while other places also check `venueId`.

**Do:**
1. Backend: add `live-sessions/session-mode.ts` with
   - `isInPersonSession(session)`: `sessionType === IN_PERSON || venueId set`
   - `isInPersonEnrollment(enrollment)`: `deliveryMode === IN_PERSON_ONLY || (venueId set && deliveryMode !== ONLINE_ONLY)`
2. Frontend: add `lib/session-mode.ts` with the same two helpers (the enrollment one also falls back to `course.deliveryMode === IN_PERSON_ONLY`).
3. Replace every copy:

| File | Which check |
|---|---|
| `backend/.../live-sessions.service.ts`: `create()`, `upcomingForUser()` | session, enrollment |
| `frontend/.../learner/page.tsx` | enrollment + session |
| `frontend/.../learner/live-sessions/page.tsx` | session |
| `frontend/.../learner/my-courses/page.tsx`, `catalog/page.tsx` | enrollment (via `EnrolledCourseActions`) |
| `frontend/.../trainer/attendance/page.tsx` | session |
| `frontend/.../courses/CatalogCourseModal.tsx` | session |
| `frontend/.../sessions/SessionTable.tsx`, `SessionDetailModal.tsx` | session |

**Behaviour change:** none, except that `SessionTable` / `SessionDetailModal` now also treat a session with a venue as in-person (it used to depend on the file).

**Done when:** a search for the inline rule returns only the helper files, and both apps type-check.

---

## Stage 2: In-Person Rules in One Place (+ Missing Rules)

**Problem:** in-person rules are spread across `enrollments` and `live-sessions`, and two are missing or unsafe.

**Do:**
1. Create `live-sessions/in-person/in-person-sessions.service.ts` (exported from `LiveSessionsModule`).
2. Move in:
   - Seat-booking validation from `enrollments.service.ts` (session belongs to course, has a venue, capacity).
   - Venue validation from `createBatch()`.
3. **Add, enforced on the server:**
   - **No double-booking a venue:** check for overlapping SCHEDULED/LIVE sessions in the same venue on `create`, `update` (reschedule / venue change) and `createBatch`. Reuse the overlap logic in `venues.service.checkAvailability`.
   - **Safe seat capacity:** do the count-and-book inside one `prisma.$transaction`, so two learners can't take the last seat at the same time.
   - **Batch is all-or-nothing:** wrap `createBatch` in a transaction.
4. Frontend: make the catalog seat counter use the same count as the backend (active enrollments with that `sessionId`, not `attendees.length`).

**Behaviour change:** scheduling a room that's already booked, or enrolling into a full session, now returns a clear 400 error.

**Done when:** both apps type-check; manually, a second session in the same room/time is rejected and a full session can't be booked.

---

## Stage 3: Online (Virtual) Code in One Place

**Problem:** video-platform logic (BigBlueButton / Jitsi join URLs, LiveKit tokens, LiveKit webhook) sits inside the shared service and controller.

**Do:**
1. Move `providers/` → `live-sessions/virtual/providers/`.
2. Create `virtual/virtual-sessions.service.ts` holding `getJoinUrl()` and `getLiveKitToken()`. The core service and controller delegate to it.
3. Define one small `JoinUrlProvider` interface (`supports()` + `buildJoinUrl()`) implemented by BigBlueButton, Jitsi and a generic external-link (Zoom / Meet / Teams / custom) provider. LiveKit stays token-based in `LiveKitProvider`.
   - *As built:* providers are picked by the **meeting id / link** (same detection as before), not by `session.platform`, so existing sessions resolve exactly as they did.
4. Reject join/token requests for IN_PERSON sessions with a clear error, and replace "Join Room" with "Classroom Attendance" for in-person sessions on the admin sessions, trainer sessions and trainer dashboard pages.

**Behaviour change:** none for virtual sessions. In-person sessions can no longer request a video join link.

**Done when:** backend type-checks; joining a LiveKit session and opening an external-link session still work.

---

## Stage 4: Frontend Folders + Split Large Files

**Do:**
1. Move `components/features/sessions/*` into `shared/`, `virtual/`, `in-person/`, and move the in-person pieces from `attendance/` and `venues/` (`LearnerCheckInModal`, `ClassroomQrModal`, `VenueDetailModal`) next to them. Update imports.
2. Split the in-person step out of `ScheduleSessionModal` (1,029 lines) into `in-person/VenueAllocationStep.tsx`.
3. Merge the near-identical `training-admin/sessions` and `trainer/sessions` pages into one shared component with a `scope` prop (`all` | `own`).
   - *As built:* `shared/SessionsManager.tsx`; per-scope titles, texts, page size, scheduling and workspace role live in one `SCOPE_CONFIG`.
4. (Optional, separate PR) Break up `LiveQuizTrainerControl.tsx` (3,700 lines). *Not done yet.*

**Behaviour change:** none (pure reorganisation).

**Done when:** frontend type-checks and builds, and the admin, trainer and learner session pages render as before.

---

## Out of Scope (possible follow-ups)

- **Switching delivery mode after enrollment** (online ↔ in-person, releasing and re-booking the seat).
- **"Room full → take it online"** suggestion for `BOTH` courses.
- **Separate seat-booking table** so bookings stop being ABSENT `Attendance` rows.
- **Check-in validation**: the learner booked that session, uses an in-person method, and GPS is near the venue.

## Progress

- [x] Stage 1: one "is in-person?" helper
- [x] Stage 2: in-person rules + capacity/double-booking
- [x] Stage 3: virtual code + provider interface
- [x] Stage 4: frontend folders + splitting large files *(LiveQuizTrainerControl split left for a separate PR)*
