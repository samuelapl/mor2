# Implementation Plan: Email Notifications (Brevo + BullMQ + Redis + Nodemailer)

> **Date:** October 8, 2026
> **Status:** Phase 1 and Phase 2 implemented
> **Scope:** `backend/` (NestJS) + a small settings toggle in `frontend/` and `mobile/`

---

## 1. Goal

Send real emails to users for account events and for the business events that today only appear as in-app notifications.

- **Phase 1: Email infrastructure and account emails.** Add a queue and a worker, move the existing emails onto the queue, add the missing registration and security emails, and switch to Brevo.
- **Phase 2: Notification emails.** Every in-app notification can also go out by email, with a per-user opt-out, the missing course-approval notification, and session reminders.

Phase 2 builds on Phase 1. Do not start it until Phase 1 is merged and verified.

---

## 2. Current State

| Module | What it does today |
|---|---|
| `backend/src/modules/mail/` | `MailService` sends 4 emails directly over SMTP with nodemailer: password reset, first-login code, registration approved, registration rejected. HTML is inline in the service and English only. If SMTP fails, the email is lost. |
| `backend/src/modules/notifications/` | `NotificationsService.send/sendToMany` writes in-app notifications (EN + AM) to the `Notification` table. It is called from about 13 places and never sends email. |
| Infrastructure | Redis (`redis:7-alpine`) and MailHog are already in `backend/docker-compose.yml`. `ioredis` and `nodemailer` are already installed. |

Known issue: `MailService.sendRegistrationRejected` puts the admin-written `reason` into the HTML without escaping it.

---

## 3. Target Architecture

```
Domain services (auth, users, courses, enrollments, ...)
   │                                   │
   │ account emails                    │ business events
   ▼                                   ▼
EmailQueue.enqueue*()  ◄──── NotificationsService.send/sendToMany
   │                          (1) insert in-app rows  (2) enqueue email jobs   ← Phase 2
   ▼
Redis  ──  BullMQ queue "email"
   ▼
EmailProcessor (BullMQ worker, runs inside the backend process)
   • rate limited (MAIL_RATE_LIMIT_PER_SEC)
   • renders template (en | am) → { subject, html, text }
   • MailService.send() → nodemailer → Brevo SMTP relay
   • on error: retry with exponential backoff, then keep the job in "failed"
```

### Design rules

1. **No request sends SMTP directly.** Request handlers only add jobs to the queue, which is fast. The worker does the delivery.
2. **`MailService` only delivers.** It has one method, `send({ to, subject, html, text })`, and no template logic.
3. **Templates are pure functions.** `(locale, data) => { subject, html, text }`, with every interpolated value passed through `escapeHtml()`.
4. **Jobs are idempotent.** Notification emails use `jobId = notification.id`, so retries and duplicate enqueues never send the same email twice.
5. **Priorities.** Security emails (OTP codes, password changed) get priority `1`. Everything else gets `5` or lower, so bulk mail can't delay a password reset.
6. **Language.** Emails use `user.locale` (`en` | `am`) and fall back to `en`.

### Job options (defaults)

```ts
{
  attempts: 5,
  backoff: { type: 'exponential', delay: 60_000 },  // 1m, 2m, 4m, 8m
  removeOnComplete: { age: 7 * 24 * 3600, count: 5000 },
  removeOnFail: false,                               // keep for inspection / manual retry
}
```

### Brevo constraints

- The free plan allows **300 emails/day**. Until you are on a paid plan, bulk announcements (news) must stay **in-app only**. Otherwise one announcement can use up the daily limit and block OTP emails.
- Verify the sender domain in Brevo (add the DKIM and DMARC records it gives you to DNS). `SMTP_FROM` must use that domain.

---

## 4. Phase 1: Email Infrastructure and Account Emails

### 4.1 Dependencies

```bash
cd backend
npm i bullmq
```

`bullmq` is used directly rather than through `@nestjs/bullmq`: the Nest wrapper needs Redis settings at import time (before `.env` is loaded) and cannot fail fast when Redis is down.

**Redis stays optional.** The rest of the app already works without Redis (permissions fall back to the database), so `EmailQueue` checks Redis first (2 s timeout). If Redis is unreachable it sends the email directly instead: it is still delivered, just without retries.

### 4.2 Environment variables

Add to `backend/.env.example` and every environment's `.env`:

```env
# ── Email ─────────────────────────────────────────────────
# Dev: MailHog (localhost:1025, no TLS). Prod: Brevo below.
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false                 # 587 = STARTTLS; use true only with port 465
SMTP_USER=<brevo smtp login>
SMTP_PASS=<brevo smtp key>
SMTP_FROM="ELTMS <no-reply@your-verified-domain>"
APP_PUBLIC_URL=https://lms.example.gov.et   # base URL for links in emails (FRONTEND_URL is a CORS list, not usable for this)
MAIL_RATE_LIMIT_PER_SEC=10
```

`REDIS_HOST` and `REDIS_PORT` already exist and are reused.

### 4.3 File layout

```
backend/src/modules/mail/
  mail.module.ts          provides MailService, EmailQueue, EmailProcessor; exports EmailQueue
  mail.service.ts         REFACTOR → deliver(job): render template + send over SMTP
  email.queue.ts          NEW → producer (bullmq Queue); typed methods; inline fallback without Redis
  email.processor.ts      NEW → bullmq Worker (concurrency 5, rate limited)
  email.types.ts          NEW → job payload types (discriminated union), priorities
  redis-connection.ts     NEW → Redis options from ConfigService + throttled error logging
  templates/
    escape.ts             NEW → escapeHtml()
    layout.ts             NEW → shared HTML wrapper (header, footer, button) + plain-text builder
    auth.templates.ts     NEW → all account/security templates, en + am
    index.ts              NEW → renderEmail(job, ctx)
```

### 4.4 Tasks

#### Step 1: Queue and worker

- [ ] Register `BullModule.forRootAsync` in `app.module.ts`, reading the Redis host and port from `ConfigService`.
- [ ] In `mail.module.ts`, add `BullModule.registerQueue({ name: 'email', defaultJobOptions })` with the defaults from §3.
- [ ] `email.types.ts`: define the job payload as a discriminated union, e.g.
      `{ template: 'password-reset-code'; to: string; locale: 'en'|'am'; data: { code: string } } | ...`
- [ ] `email.queue.ts`: one typed method per template (`passwordResetCode`, `firstLoginCode`, `registrationReceived`, ...). Each one sets the priority and calls `queue.add`.
- [ ] `email.processor.ts`:
  - `@Processor('email', { limiter: { max: MAIL_RATE_LIMIT_PER_SEC, duration: 1000 }, concurrency: 5 })`
  - `process(job)`: look up the template, render it, call `MailService.send`, and let errors propagate so BullMQ retries.
  - On the `failed` event, log the job id, template and recipient. **Never log OTP codes.**

#### Step 2: Refactor `MailService`

- [ ] Reduce it to the constructor (transport setup, unchanged), `isConfigured`, and `send()`.
- [ ] Keep the current behaviour when SMTP is not configured. In development, log the OTP code so local login still works (move the existing dev fallback into `send()` or the processor).
- [ ] Move the existing 4 email bodies into `templates/auth.templates.ts`, add Amharic versions, and escape all values. This fixes the unescaped `reason`.

#### Step 3: Move existing emails onto the queue

| Email | Current call site | Change |
|---|---|---|
| Password reset code | `auth.service.ts` → `forgotPassword()` | `emailQueue.passwordResetCode(...)`, priority 1 |
| First-login code | `auth.service.ts` → `sendFirstLoginCode()` | `emailQueue.firstLoginCode(...)`, priority 1 |
| Registration approved | `users.service.ts` → `approveRegistration()` | `emailQueue.registrationApproved(...)` |
| Registration rejected | `users.service.ts` → `rejectRegistration()` | `emailQueue.registrationRejected(...)` |

- [ ] Keep the `devCode` response behaviour in `auth.service.ts`. It depends on `mailService.isConfigured` and does not change.

#### Step 4: Add the missing account emails

| # | Event | Where | Recipient | Template |
|---|---|---|---|---|
| 1 | Registration submitted (PENDING) | `auth.service.ts` → `register()` | The new user | `registration-received`: "We received your registration; an administrator will review it." |
| 2 | New registration awaiting review | `auth.service.ts` → `register()` | All active `SYSTEM_ADMIN` users | `admin-new-registration`: name and email of the applicant, plus a link to the user approval page |
| 3 | Password reset completed | `auth.service.ts` → `resetPassword()` | The user | `password-changed`: "If this wasn't you, contact an administrator." Priority 1 |
| 4 | Password changed while signed in | `users.service.ts` → `changePassword()` | The user | `password-changed`, priority 1 |

- [ ] Enqueue **after** the database write succeeds. An enqueue failure must be caught and logged, never returned to the user as an error (same pattern as the current notification calls).

#### Step 5: Configuration and rollout

- [ ] Create the Brevo account, verify the sender domain (DKIM, DMARC), and generate an SMTP key.
- [ ] Set the production `.env` values from §4.2.
- [ ] Development stays on MailHog (`SMTP_HOST=localhost`, `SMTP_PORT=1025`, `SMTP_SECURE=false`).

### 4.5 Testing

- [ ] Unit tests for every template: renders in `en` and `am`, escapes `<script>` in user input, and includes a plain-text part.
- [ ] Unit tests for `EmailQueue`: correct job name, payload and priority. Mock the BullMQ `Queue`.
- [ ] Update `auth.service.spec.ts` and the users service specs to expect `EmailQueue` calls instead of `MailService` calls.
- [ ] Manual check with MailHog (`http://localhost:8025`): register, approve, reject, forgot password, first login, change password.
- [ ] Failure check: stop MailHog, trigger a password reset, confirm the job retries, start MailHog again, confirm the email arrives.

### 4.6 Done when

- All 8 account emails (4 existing + 4 new) are delivered through the queue in both languages.
- A temporary SMTP outage delays emails but does not lose them.
- A real email reaches a real inbox through Brevo without going to spam.

---

## 5. Phase 2: Notification Emails

### 5.1 Database

```prisma
model User {
  // ...
  emailNotifications Boolean @default(true) @map("email_notifications")
}
```

- [ ] `npm run prisma:migrate -- --name add_email_notifications_pref`
- [ ] Account and security emails from Phase 1 **ignore** this flag and are always sent.

### 5.2 Connect `NotificationsService` to the queue

- [ ] Inject `EmailQueue` into `NotificationsService`. `NotificationsModule` imports `MailModule`.
- [ ] Change `send()` and `sendToMany()` to do the following:
  1. Insert the rows as they do today.
  2. Unless `options.email === false`, call `emailQueue.notificationBulk(createdRows)`. This uses `queue.addBulk` with one job per row and `jobId = notification.id`.
- [ ] Add an optional last parameter, `options?: { email?: boolean }`, so a caller can keep a notification in-app only (used for news, §5.4).
- [ ] The job payload is just `{ notificationId }`. The processor then:
  1. Loads the notification and its user (`email`, `locale`, `emailNotifications`, `isActive`, `deletedAt`).
  2. Skips the job (completes it with no email) if the user opted out, is inactive, or is deleted.
  3. Renders the generic `notification` template from `titleEn/titleAm` and `bodyEn/bodyAm`, using the user's locale.
  4. Builds a call-to-action link from `metadata` (`courseId` → `/courses/:id`, `newsId` → `/news/:slug`, certificate → certificates page) using `APP_PUBLIC_URL`.

Resolving the user inside the worker keeps `sendToMany` fast: one bulk insert plus one `addBulk`, with no per-user lookups during the request.

### 5.3 Events that will send email

These already create in-app notifications, so after §5.2 they send email without changing the call sites:

| # | Event | Call site | Recipient |
|---|---|---|---|
| 1 | Enrolled (single) | `enrollments.service.ts` → `notifyEnrollment()` | Learner |
| 2 | Enrolled (bulk) | `enrollments.service.ts` (bulk enroll, `sendToMany`) | Learners |
| 3 | Assessment graded | `assessments.service.ts` (`ASSESSMENT_GRADED`) | Learner |
| 4 | Certificate issued | `certificates.service.ts` (`CERTIFICATE_ISSUED`) | Learner |
| 5 | Required grade not met | `progress.service.ts` (`CERTIFICATE_GRADE_NOT_MET`) | Learner |
| 6 | Course approved / rejected / needs revision | `courses.service.ts` approval decision | Course owners |
| 7 | Course approval withdrawn | `courses.service.ts` withdraw approval | Course owners |
| 8 | Course published | `courses.service.ts` publish | Course owners |
| 9 | Registration approved / rejected | `users.service.ts` | **Pass `{ email: false }`**. Phase 1 already sends a dedicated email for these, so this avoids a duplicate |

### 5.4 New notifications and exceptions

- [ ] **Course submitted for approval** (`courses.service.ts`, the transition to `PENDING_APPROVAL`). There is no notification here today. Add `sendToMany` to all active `CONTENT_APPROVER` users with a new `NotificationType.COURSE_SUBMITTED` (requires a migration for the enum value).
- [ ] **News announcement** (`news.service.ts` → `notifyLearners()`). Pass `{ email: false }` while on the Brevo free plan. Turn it on only after upgrading the plan or adding a daily digest.

### 5.5 Session reminders

`SESSION_REMINDER` and `TRAINING_REMINDER` exist in the enum. Session reminders are now sent; `TRAINING_REMINDER` is still unused.

Implemented in `backend/src/modules/live-sessions/session-reminders.service.ts`:

- [x] When a session is created, batch-created, rescheduled, or set back to `SCHEDULED`, two **delayed** jobs are added to the `session-reminders` queue, one 24 h and one 1 h before `scheduledAt`. Reminders whose time has already passed are skipped.
- [x] Job ids include the start time (`session-{id}-{startEpochMs}-{24h|1h}`). A reschedule just adds new jobs. **Old jobs are not removed.** When a job fires, it checks that the session is still `SCHEDULED`, not deleted, still at the same start time, and not yet started. If any of these fail, it does nothing. Cancelled and deleted sessions are handled the same way.
- [x] On startup, every upcoming session is scheduled again. BullMQ ignores duplicate job ids, so this only fills gaps, for example sessions created while Redis was down.
- [x] Recipients: learners with an `ACTIVE` enrollment that covers the session (`enrollmentCoversSession`, the same rule as session visibility), plus the session's trainer. The trainer's link goes to `/trainer/sessions/:id`.

### 5.6 User preference API and UI

- [ ] `PATCH /users/me` accepts `emailNotifications: boolean`. Add it to the DTO and include it in the `me` response.
- [ ] Web (`frontend/`): an "Email me about course activity" toggle in the user's account settings.
- [ ] Mobile (`mobile/src/app/settings/`): the same toggle. Add EN and AM strings to `mobile/src/core/i18n/locales/`.

### 5.7 Testing

- [ ] `notifications.service.spec`: `sendToMany` calls `addBulk` once with one job per row, and calls nothing when `{ email: false }`.
- [ ] Processor tests: skips opted-out, inactive and deleted users; uses the right locale; builds the right link for each metadata shape.
- [ ] Reminder tests: create adds 2 delayed jobs; reschedule replaces them; cancel removes them; a job for a cancelled session sends nothing.
- [ ] Manual check with MailHog: enroll a learner, grade an assessment, issue a certificate, submit, approve and reject a course, schedule a session 1 h ahead.
- [ ] Load check: bulk-enroll 500 learners. The request must return in under 1 s, and the emails then drain at the configured rate.

### 5.8 Done when

- Every event in §5.3 sends an email in the user's language, unless the user opted out.
- Approvers are notified when a course is submitted.
- Session reminders arrive 24 h and 1 h before a session and follow reschedules and cancellations.
- News stays in-app only until the email plan allows bulk sending.

---

## 6. Operations

- **Monitoring:** log failed jobs with the template name. Optionally add Bull Board (`@bull-board/nestjs`) behind the `SYSTEM_ADMIN` role to inspect and retry failed jobs.
- **Scaling later:** the worker runs inside the API process at first. If email volume grows, move `EmailProcessor` into a separate worker process (same code, separate entry point) so it doesn't compete with API requests.
- **Redis persistence:** the `redis_data` volume already exists, so queued jobs survive a Redis restart.
