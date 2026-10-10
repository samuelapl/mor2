# Enterprise-Hardened Modular Live Session Rolling Rescheduler
## Implementation Plan & Architectural Blueprint

---

## 1. Overview & Architectural Philosophy

This blueprint defines the architecture and implementation for an automated, rolling live-session lifecycle system tailored for the **MoR LMS** (NestJS + Prisma Client + PostgreSQL + Next.js). When a live session concludes (either clicked by the trainer or resolved by the zero-participant abandonment reaper), the system detects completion and automatically schedules the next iteration based on the institutional **Policy Day Gap** configured in the System Admin Policies page.

All logic is encapsulated within a **standalone, self-contained NestJS module** (`SessionReschedulerModule`), ensuring that if this feature ever needs to be disabled or removed, it can be decoupled without touching core business logic.

```
                           [ Trainer Clicks "End Session" ]        [ 45-Min Zero-Participant Reaper ]
                                          │                                       │
                                          └───────────────────┬───────────────────┘
                                                              ▼
                                             [ LiveSessionsService.changeStatus() ]
                                                              │
                                                              ▼
                                            Emits: 'live_session.ended' (EventEmitter2)
                                                              │
                     ┌────────────────────────────────────────┴────────────────────────────────────────┐
                     ▼ (Decoupled Event Bus)                                                           ▼
       ┌─────────────────────────────────────────────┐                                   [ Core System Continues ]
       │          SessionReschedulerModule           │                                    (Zero coupling)
       ├─────────────────────────────────────────────┤
       │ 1. Idempotency Lock (rescheduleStatus)      │
       │ 2. Anchor Date = Max(Upcoming) ?? JustEnded │
       │ 3. Policy Day Gap Math                      │
       │ 4. Working-Day Resolver (Skip Sunday & Hol.)│
       │ 5. Create Fresh LiveSession (0 Attendees)   │
       │ 6. Targeted Scoped Notifications            │
       └─────────────────────────────────────────────┘
```

---

## 2. Inactivity / Abandonment Reaper (Solving the Ghost Session)

- **Problem**: Trainers frequently forget to click "End Session" before closing their laptops or after network outages. Leaving sessions permanently in `LIVE` halts the rolling reschedule cycle indefinitely.
- **Enterprise Solution**:
  - We do NOT use a hard timer based strictly on scheduled duration, allowing trainers to teach longer if needed.
  - Instead, an **Abandonment Reaper** periodically checks for `LIVE` sessions where scheduled duration has passed AND **zero participants** have been active in the room for **45 consecutive minutes**.
  - When verified empty for 45 minutes, the reaper gracefully transitions the session to `COMPLETED`, records `actualEndedAt`, and emits `live_session.ended`.
  - If a trainer or learner is still in the room, the session remains active regardless of duration.

---

## 3. Event-Driven True Decoupling (`EventEmitter2`)

- **Domain Event**: When `LiveSessionsService` transitions a session to `COMPLETED`, it broadcasts:
  ```typescript
  this.eventEmitter.emit('live_session.ended', {
    sessionId: session.id,
    courseId: session.courseId,
    sessionPlanId: session.sessionPlanId,
    endedAt: session.actualEndedAt ?? new Date(),
  });
  ```
- **Consumer**: `SessionReschedulerService` listens asynchronously using `@OnEvent('live_session.ended', { async: true })`.
- **Zero Tight Coupling**: `LiveSessionsService` has no dependency on `SessionReschedulerModule`. Removing `SessionReschedulerModule` from `AppModule` requires zero modifications to existing code.

---

## 4. Concurrency & Idempotency Engine

- To prevent race conditions from double-clicks or multiple co-hosts clicking "End Session" simultaneously, `LiveSession` tracks:
  `rescheduleStatus: 'NONE' | 'PENDING' | 'PROCESSED'`.
- The rescheduler acquires an atomic lock:
  ```typescript
  const updated = await prisma.liveSession.updateMany({
    where: { id: event.sessionId, rescheduleStatus: { not: 'PROCESSED' } },
    data: { rescheduleStatus: 'PROCESSED' },
  });
  if (updated.count === 0) return; // Already processed
  ```

---

## 5. Ethiopian Calendar & Working-Day Resolver (Skip Sunday & Public Holidays)

- **Working Days**: Monday through Saturday are valid training days. **Sunday is strictly skipped**.
- **Public Holidays**: Statutory Ethiopian public holidays (e.g., Ethiopian New Year, Meskel, Adwa Victory Day, Ethiopian Christmas/Genna, Id Al-Fitr, etc.) are skipped.
- **Algorithm**:
  1. Base candidate date:
     $$\text{Candidate Date} = \text{Anchor Date} + \text{Policy Day Gap}$$
  2. While $\text{DayOfWeek}(\text{Candidate Date}) == \text{Sunday}$ OR $\text{Candidate Date} \in \text{Public Holidays}$:
     Advance $\text{Candidate Date}$ by $+1\text{ Day}$.
  3. Preserve original session start time (hours & minutes).

---

## 6. Fallback Anchor Date (The Bootstrapping Fallback)

- If upcoming scheduled sessions exist for Course $X$:
  $$\text{Anchor Date} = \max(\text{Upcoming Sessions.scheduledAt})$$
- If zero upcoming scheduled sessions exist (e.g. final session in the cycle just completed):
  $$\text{Anchor Date} = \text{Date of Just-Ended Session}$$
- Raw Target Date = $\text{Anchor Date} + \text{Policy Day Gap}$.

---

## 7. Attendance Isolation & Targeted Notification Scoping

1. **Immutable History**: Completed session attendance records remain permanent and untouched with their original timestamps and statuses (`PRESENT`, `LATE`, etc.).
2. **Fresh Session**: The rescheduled session is created with a brand-new ID and empty attendance roster.
3. **Notification Scoping**: Notifications are sent strictly to:
   - Enrolled learners who have **not yet earned credit** for this session plan.
   - Newly enrolled learners.
   - Previous attendees are not spammed.
4. **Certificate Continuity**:
   A learner is eligible for their Certificate and Final Assessment as soon as they have attended each planned session topic across all cycles. Upcoming future cycles do not block certified/completed learners.

---

## 8. Admin Policy Configuration & Public Holidays Management

- In `system-admin/policies/page.tsx` (Tab: **Live Sessions & Attendance Policy**):
  - **Live Session Auto-Reschedule Day Gap** input (default: 10 days; presets: 7, 10, 14, 21, 30 days).
  - Stored in `system_settings` table under `live_session_reschedule_day_gap`.
  - **Public Holidays Management Panel**: Table listing registered holidays with add/remove capability.

---

## 9. Modernized Institutional Landing Page & Learner Journey Architecture

### 9.1 De-cluttering & Security Alignment
To present a clean, public-facing portal appropriate for Ministry personnel while removing internal technical artifacts:
1. **Removed Internal Workspaces Switcher (`#roles`)**: Exposing 6 internal administrative personas (SysAdmin, Content Approver, Course Owner) on the public landing page was removed.
2. **Removed Technical Compliance Box**: Replaced the static server encryption spec table ("Enterprise Compliance & Data Sovereignty") with user-centric capabilities.
3. **Removed News Feed from Landing**: Deprecated `<LatestNewsSection />` on the main page to keep the hero and onboarding streamlined.
4. **Removed Mock Curriculum Console (`DynamicTrainingExplorer`)**: Replaced with live operational metrics.
5. **Removed Truncated Hero Badges**: Replaced the truncated trust badges (`Civil Service Accredit...`) with a dedicated 4-column metric card grid.

### 9.2 Real-Time Impact Metrics Showcase
Configured prominent operational impact cards directly inside the Hero section:
- **7+ Accredited Courses** (Tax, Customs & Policy) — Sky Blue accent
- **22+ Active MoR Personnel** (Across all regional branches) — Emerald accent
- **17+ Live Sessions Completed** (Trainer-led interactive) — Violet accent
- **1+ Verifiable Credentials** (QR authenticated) — Amber accent

These cards dynamically connect to `fetchLandingStats()` with fallback baselines, featuring glassmorphism cards and full Amharic/English localization.

### 9.3 5-Step Learner Pathway (`#learner-flow`)
Replaced the removed workspaces section with an intuitive, end-to-end Learner Journey from signup to certificate issuance:
- **Step 01: Sign Up & Account Setup** (`ምዝገባ እና መለያ ማዋቀር`): Register with Ministry credentials, set branch/directorate, and activate profile.
- **Step 02: Explore & Enroll in Courses** (`ኮርሶችን መርጦ መመዝገብ`): Browse accredited tax, customs ASYCUDA, and audit curricula.
- **Step 03: Interactive Learning & Live Sessions** (`ትምህርት እና የቀጥታ ስልጠናዎች`): Multimedia lesson modules and live webinars with real-time presence tracking.
- **Step 04: Assessments & Knowledge Checks** (`ምዘና እና ማጠቃለያ ፈተናዎች`): Checkpoint quizzes and final comprehensive assessment meeting passing threshold.
- **Step 05: Earn Verifiable Certificate** (`የተረጋገጠ ሰርተፍኬት ማግኘት`): Digitally signed, tamper-proof diploma with verifiable QR code.
- **Action Callout Strip**: Clear dual-action buttons directing users to **Create Learner Account** (`/register`) and **Sign In to Platform** (`/login`).


