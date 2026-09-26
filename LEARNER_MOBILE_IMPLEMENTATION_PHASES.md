# Learner Mobile App — 4-Phase Implementation Plan

Companion to [LEARNER_MOBILE_ARCHITECTURE.md](LEARNER_MOBILE_ARCHITECTURE.md) (the **how**) and [LEARNER_MOBILE_API_SPEC.md](LEARNER_MOBILE_API_SPEC.md) (the **contract**). Section references: `A§x` = architecture doc, `S§x` = API spec.

| Phase | Theme | Outcome | Manual test by you |
|---|---|---|---|
| **1** | Architecture foundation | Project skeleton, core infrastructure, design system, all routes stubbed | Smoke check only |
| **2** | Access & discovery | Auth, profile, catalog, course details, enrollment, dashboard, My Courses | ✅ Full test gate |
| **3** | Learning experience | Lesson player, time tracking, completion, quizzes | ✅ Full test gate |
| **4** | Live, credentials & polish | Live sessions, attendance/check-in, certificates, notifications, offline | ✅ Full test gate (release candidate) |

**Rule:** a phase starts only after the previous phase's **Exit Gate** is fully checked.

---

## Phase 1 — Architecture Foundation

**Goal:** a running Expo app with every layer from A§4 in place, so Phases 2–4 only add feature code and never restructure.

### 1.1 Project setup
- [x] `npx create-expo-app@latest mobile` (TypeScript, strict mode) at the repo root next to `backend/` and `frontend/`. → Expo SDK 57, RN 0.86, React 19.2; routes live in `mobile/src/app/`.
- [x] Path alias `@/` → `src/` (tsconfig + babel).
- [x] ESLint + Prettier with the same rules as `frontend/`.
- [x] Runs in **Expo Go** (all native modules are bundled in Expo Go; storage uses expo-sqlite instead of MMKV). A dev build (`expo-dev-client`, `eas.json`) stays available for later native-only needs. See `mobile/README.md`.
- [x] `.env.local`: `EXPO_PUBLIC_API_URL=http://<LAN_IP>:3001/api/v1` (template in `.env.example`; `eas.json` profiles set the same value).
- [x] Install every library from A§2 now: expo-router, @tanstack/react-query (+ persist-client), zustand, axios, expo-sqlite (kv-store), expo-secure-store, nativewind, lucide-react-native, i18next, react-i18next, expo-localization, expo-video, expo-audio, react-native-webview, expo-web-browser, expo-linking, expo-file-system, expo-sharing, expo-camera, expo-location, @react-native-community/netinfo.

### 1.2 Core layer (`src/core/`)
- [x] `api/types.ts`: `ApiEnvelope<T>`, `Paginated<T>`, `PaginationMeta`, and every shared enum from S§1.10.
- [x] `api/errors.ts`: `ApiError` (`status`, `message`, `messageAm`, `reason`, `remainingSeconds`, `remainingMinutes`) — S§1.5.
- [x] `api/client.ts`: Axios instance with:
  - base URL ending in `/api/v1`
  - `Authorization` and `Accept-Language` headers
  - envelope unwrap (`response.data.data`)
  - error normalization
  - single-flight 401 refresh with token rotation (A§6.1–6.2)
- [x] `api/endpoints.ts`: path builders for **every** endpoint in S§2–S§10.
- [x] `api/query-client.ts`: QueryClient, NetInfo ↔ `onlineManager`, expo-sqlite persister.
- [x] `storage/secure.ts` (access + refresh tokens) and `storage/kv-storage.ts` (expo-sqlite stores: session, sync-queue, playhead, query-cache, preferences).
- [x] `sync/sync-queue.ts`: durable queue API (`enqueue`, `flush`, coalesce by key). Leave it empty of consumers until Phase 3.
- [x] `i18n/`: i18next init, `en.json` / `am.json`, `pickLocalized()` helper (A§6.11).
- [x] `media/resolveMediaUrl.ts` (A§6.13).
- [x] `hooks/`: `useNetworkStatus`, `useAppState`, `useDebounce`, `useInterval`. `utils/formatters.ts`.
- [x] `theme/`: colors and typography copied from the web Tailwind config into `tailwind.config.js`.

### 1.3 Design system (`src/components/ui/`)
- [x] Button, Card, Input, OtpInput, Badge, Avatar, ProgressBar, ProgressRing, Skeleton, EmptyState, ErrorState, ModalSheet, OfflineBanner, LockBadge.
- [x] A dev-only `app/dev/ui-gallery.tsx` screen showing all primitives in light and dark mode.

### 1.4 Routing skeleton (`app/`)
- [x] Every route from A§4 created as a **placeholder screen** (title + params displayed).
- [x] Root `_layout.tsx` with providers (QueryClient, i18n, theme) and an `AuthGate` that routes to `(auth)` or `(tabs)` based on a stubbed session flag.
- [x] Tab bar with 5 tabs and icons.
- [x] Empty feature folders with `index.ts` barrels for all 9 features (A§4).

### 1.5 Backend preparation
- [ ] `backend/.env`: `MINIO_ENDPOINT=<LAN_IP>`, then restart the backend (S§1.8).
- [ ] Ports 3001 (API) and 9000 (MinIO) reachable from the phone (open `http://<LAN_IP>:3001/api/v1/health` in the phone's browser).
- [ ] Seed data present: learner `learner@gmail.com` / `password`.

### 1.6 Phase 1 smoke check (no full test gate)
- [ ] The app builds and launches on Android (and iOS if available).
- [ ] You can open every tab and every placeholder route.
- [ ] The UI gallery renders correctly in light and dark mode.
- [ ] A temporary debug button calling `GET /health` shows a success response, which confirms the base URL and envelope unwrap.
- [x] `npx tsc --noEmit` and lint pass with zero errors.

---

## Phase 2 — Access & Discovery

**Goal:** a learner can sign in through every auth path, manage their profile, browse the catalog, view course details with lock states, enroll or drop, and see their courses on the dashboard.

### 2.0 Status & how to run (USB)
**Implemented 2026-09-26** — all scope items below. Automated checks: `tsc`, lint and Android bundle export pass; request/response shapes were verified against the running backend (login, users/me, catalog, course detail enrolled + not enrolled, enrollments, progress, in-person sessions, logout).

Backend fix included: `POST /auth/refresh` always returned 401 (salted bcrypt lookup) — now SHA-256, with regression tests in `auth.service.spec.ts`. Test 2-4 depends on it.

Run on your phone with **Expo Go** (no Android Studio needed):
1. Install **Expo Go** from the Play Store / App Store (it must support **SDK 57**). Phone and computer on the **same Wi-Fi**.
2. Start the backend (`cd backend && npm run start:dev`) and, for seed images from `frontend/public`, the web app (`cd frontend && npm run dev`).
3. `mobile/.env.local`: `EXPO_PUBLIC_API_URL=http://<LAN_IP>:3001/api/v1` (currently `192.168.0.151`).
4. If ufw is enabled: `sudo ufw allow 8081,3000,3001,9000/tcp`.
5. `cd mobile && npm start` → scan the QR code with Expo Go (Android) or the Camera app (iOS).
6. Sanity check from the phone's browser: `http://<LAN_IP>:3001/api/v1/health`.

### 2.1 Scope
| Feature | Screens | Endpoints | Design ref |
|---|---|---|---|
| **auth** | login, first-login, register, pending-approval, forgot / verify / reset password | S§2.1–2.6 | A§6.2 |
| **profile** | profile tab, edit-profile (+ avatar), change-password, language switch, logout | S§2.3, S§2.7 | A§6.11 |
| **courses** | catalog (search, infinite scroll), course detail + syllabus with locks, enroll sheet, drop | S§3.1–3.2, S§4.2–4.3, S§8.2 | A§6.3–6.4 |
| **progress** (read only) | progress rings and syllabus merge | S§6.1 | A§6.3 |
| **dashboard / My Courses** | Home (continue learning), My Courses (Active / Completed / Dropped client filter) | S§4.1, S§6.1 | A§6.4 |

Other notes:
- The lesson row in the syllabus navigates to the Phase 1 placeholder player. It's implemented in Phase 3.
- The Home tab's "upcoming sessions" card stays hidden until Phase 4.

### 2.2 Definition of done
- [ ] Sessions persist across app restarts. After a restart the user lands directly on the tabs.
- [ ] Silent token refresh works. Access tokens expire after 15 minutes, and the app must keep working past that without logging out.
- [ ] Every screen has loading, empty and error states. Error messages show in the selected language.
- [ ] Amharic toggle switches the UI strings and the course/lesson titles.
- [ ] No request sends fields outside the allowed list. Watch the backend logs for 400s.

### 2.3 Test data to prepare (via the web app)
- A **published** online course with ≥ 2 modules and ≥ 3 lessons, where you're not yet enrolled.
- A **published** course with `deliveryMode = IN_PERSON_ONLY` and one scheduled IN_PERSON session.
- An admin-created learner account (bulk import or actor creation) so the account has `mustChangePassword`.
- Access to the admin UI for approving self-registrations.

### 2.4 Manual test script — you
| # | Steps | Expected |
|---|---|---|
| 2-1 | Log in with `learner@gmail.com` / `password` | Lands on Home; name shown on Profile tab |
| 2-2 | Log in with a wrong password | "Invalid credentials" message, stays on Login |
| 2-3 | Kill the app and reopen it | Goes straight to Home (no login screen) |
| 2-4 | Stay logged in > 15 min (or set `JWT_ACCESS_EXPIRATION=1m` in `backend/.env` and restart) and pull to refresh | Data loads with no logout. The backend log shows `/auth/refresh`. |
| 2-5 | Log in with the admin-created account | Goes to the first-login screen with a masked email. The code arrives by email. Resend works. Mismatched passwords show an error. On success you land on Home. |
| 2-6 | Register a new account from the app | "Pending approval" screen. Logging in shows the "awaiting administrator approval" message. After an admin approves it on the web, login works. |
| 2-7 | Forgot password → enter email → code → new password | Each step advances, and a wrong code shows an error. You can log in with the new password. |
| 2-8 | Edit first name and phone, and upload an avatar | Changes are saved and visible after an app restart, and on the web profile |
| 2-9 | Change password (wrong current password, then the correct one) | Wrong one shows an error; the correct one works on the next login |
| 2-10 | Switch language to Amharic | UI strings and course titles change to Amharic; errors show in Amharic |
| 2-11 | Catalog: scroll, then search by course code and by title | Only published courses; infinite scroll loads more; search filters results |
| 2-12 | Open a non-enrolled course | Outline visible, all lessons locked, **Enroll** button shown |
| 2-13 | Enroll in the online course | Button changes to enrolled. The first lesson is unlocked, the rest locked. The course appears in My Courses → Active. |
| 2-14 | Open the IN_PERSON_ONLY course → Enroll | Session picker appears. Enrolling without a session is not possible. After enrolling, the venue and session are shown. |
| 2-15 | Try to enroll again in the same course (e.g. from a stale screen) | "Already enrolled" message, no crash |
| 2-16 | Drop the online course with a reason | Moves to My Courses → Dropped; its lessons become locked |
| 2-17 | Turn on airplane mode and open the catalog and My Courses | Cached data is shown with the offline banner, and there's no crash |
| 2-18 | Log out | Returns to Login. The back gesture can't reach the tabs. Relaunching shows Login. |

### 2.5 Exit gate
- [ ] All tests 2-1 … 2-18 pass on a **physical Android device** (plus iOS if you target it).
- [ ] `tsc` and lint are clean.
- [ ] Bugs found are fixed and re-tested.

---

## Phase 3 — Learning Experience

**Goal:** a learner can study every lesson type, have time and position tracked (including offline), complete lessons according to the server's rules, and take quizzes, including the final assessment.

### 3.0 Status & how to run
**Implemented 2026-09-26** — all scope items below. `tsc`, lint, `expo-doctor` and the Android bundle export pass; lesson, lesson-progress, assessment and attempts responses were checked read-only against the running backend (no heartbeats, completions or quiz submissions were sent, so the seed learner's progress is untouched).

Run exactly as in Phase 2 (Expo Go, same Wi-Fi, `npm start`), **plus start the web app** (`cd frontend && npm run dev`): the seed PDFs (`/file-sample.pdf`) and videos (`/sample.mp4`) are files in `frontend/public`.

What the seed data gives you for testing (learner `learner@gmail.com`):
- **CYBER301**, **INSP101**, **TAX101**: reading lessons (markdown) with a PDF attachment and a lesson quiz each; CYBER301's first lesson also has a sub-lesson. Required study time is 5 s per 1-minute lesson, so tests 3-2/3-3 are quick.
- Video (`/sample.mp4`) lessons exist in other published courses — enroll in one from the Catalog to test 3-1, 3-4, 3-5.

### 3.1 Scope
| Feature | Work | Endpoints | Design ref |
|---|---|---|---|
| **classroom** | `learn/[lessonId]` player with renderers for VIDEO, AUDIO, DOCUMENT, PRESENTATION, INTERACTIVE, SCORM and EXTERNAL_LINK; lesson body (`contentEn/Am`); sub-lesson list; attachments download/share | S§5.1–5.2 | A§6.5 |
| **progress** | Time heartbeat (30 s, 1–300 s per call, active-time only), playhead (local store every 5 s, server every 30 s with the current `completed` state), offline sync queue, **Mark complete** gating with `TIME_NOT_MET`, `ASSESSMENT_NOT_PASSED` and `LOCKED` handling, cache invalidation | S§6.2–6.4 | A§6.6 |
| **assessments** | Quiz pre-flight (attempts left), start/resume, deadline timer + auto-submit, answer encoding, local answer backup, result + review screen, cooldown / max-attempts / locked / final-eligibility states | S§7.1–7.5 | A§6.7 |
| **courses** (update) | Syllabus shows completed ✓, time progress, quiz status; next-lesson unlock after completion; "Continue learning" on Home resumes the last lesson | S§6.1 | A§6.3 |

### 3.2 Definition of done
- [ ] Only foreground, on-screen (and playing, for media) time is counted.
- [ ] No progress call ever sends `completed: false` for an already-completed lesson.
- [ ] Heartbeats recorded offline are delivered after reconnect, and the time totals match the web app.
- [ ] Quiz timer survives backgrounding and an app kill. The attempt resumes with the same `attemptId`.

### 3.3 Test data to prepare (via the web app)
One published course where you are enrolled, containing:
- A VIDEO lesson with a duration (e.g. 2 min), a DOCUMENT lesson with a PDF attachment, and an EXTERNAL_LINK lesson.
- A lesson with **sub-lessons**.
- A **lesson quiz** (MULTIPLE_CHOICE + TRUE_FALSE + SHORT_ANSWER) and a **module quiz**.
- A timed **final assessment** (e.g. 3 min, maxAttempts 2).
- Optionally, set the time-spent policy low in admin settings to speed up testing.

### 3.4 Manual test script — you
| # | Steps | Expected |
|---|---|---|
| 3-1 | Open the first lesson (VIDEO) | Video plays from `resourceUrl`; body text and attachments shown |
| 3-2 | Tap **Mark complete** immediately | Blocked with "spend N more seconds" (countdown visible) |
| 3-3 | Watch until the time requirement is met | The button becomes enabled. After completing, the lesson shows ✓ and the next lesson unlocks. |
| 3-4 | Pause the video at 1:10, leave the lesson, and kill the app. Reopen the lesson. | Resumes at ~1:10 |
| 3-5 | Put the app in the background for 2 minutes during a lesson | Time spent doesn't increase by those 2 minutes (compare the web progress view) |
| 3-6 | Airplane mode, study a lesson for 1 minute, then reconnect | After reconnect, time spent increases by ~1 minute on the server |
| 3-7 | Try to open a locked lesson (e.g. via "Continue" or a stale screen) | Lock message; you stay on the syllabus |
| 3-8 | Open the DOCUMENT lesson and download the PDF attachment | Opens and shares via the system sheet |
| 3-9 | Open the EXTERNAL_LINK lesson | Opens in the in-app browser |
| 3-10 | Lesson with sub-lessons: complete each sub-lesson | The parent lesson auto-completes after the last sub-lesson |
| 3-11 | Lesson with a quiz: try to complete it before passing the quiz | "Pass the assessment first" → opens the quiz |
| 3-12 | Take the lesson quiz and answer MC, T/F and short answer correctly | Score 100%, passed; review shows each question correct. The lesson becomes complete. |
| 3-13 | Take a quiz and intentionally fail | Failed result; review shows your answer vs the correct one; attempts left decreases |
| 3-14 | Start the timed final assessment, answer 1 question, kill the app, reopen, and start again | Same attempt resumes with less time remaining and your answer kept |
| 3-15 | Let the final timer run out | Auto-submits once and shows the result |
| 3-16 | Try the final before finishing all lessons | "Complete course content first" state, and Start is disabled |
| 3-17 | Use up all attempts | "Maximum attempts reached" (or a cooldown message with minutes) |
| 3-18 | Complete all lessons and pass the final | Course progress 100%; enrollment moves to My Courses → Completed |
| 3-19 | Compare progress % and time with the web app for the same learner | Numbers match |

### 3.5 Exit gate
- [ ] All tests 3-1 … 3-19 pass on a physical device.
- [ ] Tested on a slow or unstable network (Wi-Fi toggling) with no lost progress and no duplicate completions.
- [ ] `tsc` and lint are clean. Bugs are fixed and re-tested.

---

## Phase 4 — Live Sessions, Credentials & Polish (Release Candidate)

**Goal:** a learner can attend virtual and in-person sessions with attendance tracked, check in by QR or GPS, claim and download certificates, and use notifications. Offline, UX and performance get a final polish.

### 4.0 Status & how to run
**Implemented 2026-09-26.** `tsc`, lint, `expo-doctor` and the Android bundle export pass; sessions, attendance, visibility, venue, certificates, claim and notifications responses were checked read-only against the running backend.

How it maps to the backend (details in the API spec §8–§10):
- **Virtual join** — Zoom/Meet/Teams/Jitsi/custom: `join-url` opens the meeting app; attendance is tracked by wall clock (join → heartbeats ≤120 s, caught up when you return to the app → "I've left"). **LiveKit**: in-app room (LiveKit web SDK in a WebView; needs internet for the SDK and the LiveKit server reachable from the phone — `LIVEKIT_URL` / port 7880 + its RTC ports).
- **In-person check-in** — PIN (last 6 chars of the session id, shown on the web's "Classroom QR" modal), QR (`ELTMS-CHECKIN:<sessionId>:<PIN>`; the web's QR is decorative, so generate a real one from that text), or GPS.
- **Certificates** — the PDF link is presigned for MinIO's host: set `MINIO_ENDPOINT=<LAN IP>` in `backend/.env` and restart, or the app explains that the PDF server isn't reachable.
- **Notifications** — bell with unread badge in the tab headers; tap deep-links to the certificate / quiz / course.
- **Branding** — app icon, adaptive icon and splash use the Ministry of Revenues emblem from `frontend/public/logo.png`.

Current seed data for `learner@gmail.com`: 1 upcoming **in-person** session (today) → PIN check-in works now; **no virtual sessions** → create one (Zoom/Meet link, or LiveKit) in the web app for tests 4-2 to 4-4. CYBER301 is complete with certificate **ELTMS-2026-000001**; 84 unread notifications.

Release build (test 4-19) without Android Studio: `npx eas-cli@latest build --profile preview --platform android` (APK; `eas.json` bakes in `EXPO_PUBLIC_API_URL`).

### 4.1 Scope
| Feature | Work | Endpoints | Design ref |
|---|---|---|---|
| **live-sessions** | Upcoming list (grouped by day, LIVE badge), past list from attendance history, session details, venue screen, Home "next session" card | S§8.1–8.3, S§8.7, S§8.9 | A§6.8 |
| **attendance** | Join flow (join → join-url → open → heartbeat every 30 s (1–120 s) → leave), attendance % when `canView` | S§8.4–8.5, S§8.8 | A§6.8 |
| **check-in** | QR scanner (expo-camera, payload = session ID, mismatch guard), GPS check-in (expo-location + permission handling) | S§8.6 | A§6.8 |
| **certificates** | List, claim when `certificateEligible`, detail (number + verification code), fresh-URL download + share | S§9.1–9.3 | A§6.9 |
| **notifications** | Tab badge (foreground + 60 s poll), list with All / Unread, mark read / mark all, deep links by `type` + `metadata` | S§10.1–10.3 | A§6.10 |
| **polish** | Offline rules table (A§6.12) enforced everywhere, pull-to-refresh everywhere, full Amharic coverage, accessibility labels, app icon + splash, release build | — | A§6.11–6.12 |

### 4.2 Definition of done
- [ ] Attendance recorded from mobile matches what the trainer sees on the web.
- [ ] Every online-only action is blocked offline with a clear message (A§6.12).
- [ ] A release build (`eas build` or `expo run:android --variant release`) installs and works against the LAN backend.

### 4.3 Test data to prepare (via the web app)
- A **VIRTUAL** session (e.g. Google Meet / Zoom external URL) and a **LIVEKIT** session for your enrolled course, scheduled for today. Set one to LIVE.
- An **IN_PERSON** session with a venue. For the QR test, generate a QR code (any online generator) whose text is `ELTMS-CHECKIN:<sessionId>:<PIN>`; the PIN is the last 6 characters of the session id, upper-case.
- A completed course (from Phase 3) so a certificate can be claimed.
- Trigger some notifications: complete a quiz, have an admin publish a course, issue a certificate.

### 4.4 Manual test script — you
| # | Steps | Expected |
|---|---|---|
| 4-1 | Open the Live Sessions tab | Today's sessions listed with correct local times; the LIVE one is badged |
| 4-2 | Join the external-URL session | Zoom/Meet opens. Return to the app after 5+ minutes and leave. The trainer's web attendance shows your time and %. |
| 4-3 | Join the LIVEKIT session | Opens in the in-app browser, and attendance is recorded as above |
| 4-4 | Stay in a session past its attendance threshold | Status becomes PRESENT (visible where `canView` allows) |
| 4-5 | In-person session → Check-in → scan the correct QR | "Checked in", and the web attendance shows PRESENT via QR |
| 4-6 | Scan a QR for a different session | Mismatch warning, and no check-in request is sent |
| 4-7 | GPS check-in (allow location) and then deny the permission on a second try | First works (coordinates stored); denial shows a helpful message with a settings link |
| 4-8 | Try check-in for a completed or cancelled session | Server message "not scheduled or live" shown cleanly |
| 4-9 | Open the venue from the in-person session | Name, building, branch and facilities are shown |
| 4-10 | Past tab | Attendance history with status per session |
| 4-11 | Completed course → Claim certificate | The certificate appears with its number and verification code |
| 4-12 | Download the certificate PDF, then share it | PDF opens correctly (confirms `MINIO_ENDPOINT` setup); share sheet works |
| 4-13 | Claim on a course that isn't complete (if reachable) | "Not eligible yet" and no crash |
| 4-14 | Notification badge | Shows the unread count; it updates after returning to the app |
| 4-15 | Tap a certificate / quiz / session notification | Opens the right screen and the item becomes read; badge decreases |
| 4-16 | Mark all read, then switch to the Unread filter | Badge is 0 and the Unread list is empty |
| 4-17 | Airplane mode: try to join, check in, claim, enroll, submit a quiz and complete a lesson | Every one shows the offline message, and cached screens still render |
| 4-18 | Full Amharic pass through all screens | No untranslated strings; Amharic titles used where available |
| 4-19 | Install the **release build** and repeat 2-1, 3-1, 4-1 and 4-11 | All pass in release mode |
| 4-20 | End-to-end regression: a fresh learner registers, gets approved, enrolls, completes the course, passes the final, attends a session, and claims the certificate | The whole journey works on mobile only |

### 4.5 Exit gate (release candidate)
- [ ] All tests 4-1 … 4-20 pass on a physical device.
- [ ] Spot-check regression of Phase 2 and Phase 3 critical tests (2-1, 2-4, 2-13, 3-3, 3-6, 3-14).
- [ ] `tsc` and lint are clean. No red screens or console errors during testing.
- [ ] Known backend limitations (A§8) are reviewed and accepted, or raised as backend tickets.

---

## Bug Reporting Template (use during Phases 2–4)

```text
Test ID:        e.g. 3-14
Device / OS:    e.g. Samsung A52, Android 14
Build:          dev / release, commit hash
Steps:          1. … 2. …
Expected:       (from the test table)
Actual:         …
Backend log:    (request path + status code if relevant)
Screenshot:     attached
```
