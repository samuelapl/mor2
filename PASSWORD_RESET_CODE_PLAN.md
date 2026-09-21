# Plan: Replace password-reset link with a 6-digit email verification code

## 1. Overview

Replace the current token-link based password reset with a 6-digit numeric code flow:

1. User enters their email → backend generates a 6-digit code, stores a **hash** of it, and emails the code.
2. User enters the code + a new password → backend verifies the code and resets the password.

The reset **link is removed entirely**. Everything else (accounts, emails, session invalidation) stays the same.

## 2. Current implementation (what exists today)

All paths below are relative to `backend/`.

- **`prisma/schema.prisma`** lines ~163–175: `PasswordReset` model with `tokenHash @unique`, `expiresAt`, `usedAt`, `userId`.
- **`src/modules/auth/auth.service.ts`**
  - `hashToken()` helper (line 23) — SHA-256 hex of a string.
  - `forgotPassword()` (line 180) — generates a 32-byte hex token, stores `hashToken(token)`, emails a reset URL built from `FRONTEND_URL` + `/reset-password?token=...`. Returns a generic answer to avoid email enumeration.
  - `resetPassword()` (line 213) — looks up by `tokenHash`, checks `usedAt`/`expiresAt`, validates password policy, then in one transaction: marks all pending resets used, updates the password, and revokes all refresh tokens.
- **`src/modules/mail/mail.service.ts`**
  - `sendPasswordReset(to, resetUrl)` (line 41) — HTML email with a "Reset password" button. Warns and skips (does not throw) when SMTP is not configured.
- **`src/modules/auth/dto/password-reset.dto.ts`**
  - `ForgotPasswordDto` = `{ email }`.
  - `ResetPasswordDto` = `{ token, newPassword }`.
- **`src/modules/auth/auth.controller.ts`** — routes `POST auth/forgot-password` and `POST auth/reset-password`, both `@Public()`.
- **`src/modules/auth/auth.module.ts`** — already imports `MailModule`.

Existing useful constants/utilities:
- `src/common/utils/password.util.ts` — `passwordIssues()`, `MIN_PASSWORD_LENGTH = 8`.
- `src/config/constants.ts` — `BCRYPT_ROUNDS`.
- Redis usage pattern to copy: `src/modules/permissions/permissions.service.ts` lines 9–38 (ioredis, lazyConnect, best-effort fallback to DB on error).

## 3. Target behavior

**Endpoint 1 — `POST /api/v1/auth/forgot-password`** (public)
- Request: `{ "email": "john@example.com" }`
- Always responds `{ "message": "If that email exists, a code has been sent." }` (no email enumeration).
- If the user exists and is active:
  1. Invalidate (mark `usedAt`) any still-pending reset codes for that user.
  2. Generate a 6-digit code (`010000`–`999999`).
  3. Store `sha256(code)` as `codeHash` with `expiresAt = now + 10 min`.
  4. Email the code via `MailService.sendPasswordResetCode(email, code)` inside a try/catch (log the error, never leak it to the response).
- Optional: Redis rate-limit (see section 7). If Redis is down, fail open (best-effort), mirroring the permissions cache pattern.

**Endpoint 2 — `POST /api/v1/auth/reset-password`** (public)
- Request: `{ "email": "john@example.com", "code": "123456", "newPassword": "NewPass123" }`
- Always responds `{ "message": "Password reset successfully. You can now sign in." }` (or a generic code error) without revealing whether the email/code is valid.
- Logic:
  1. Lowercase + trim the email; load the user.
  2. Find the most recent pending reset: `findFirst({ where: { userId, usedAt: null, expiresAt: { gt: now } }, orderBy: { createdAt: 'desc' } })`.
  3. Missing reset → throw `BadRequestException('Invalid or expired code.')`.
  4. If `attempts >= 5` → mark it used and throw `BadRequestException('Too many attempts. Request a new code.')`.
  5. Compare `hashToken(dto.code)` against `codeHash` using a **constant-time** comparison (`crypto.timingSafeEqual`).
  6. On mismatch → increment `attempts`; if it reaches 5, mark used; always throw `'Invalid or expired code.'`.
  7. Validate password with `passwordIssues()`.
  8. In one `$transaction`: mark all pending resets for this user used; update the password (bcrypt, `BCRYPT_ROUNDS`); revoke all non-revoked refresh tokens.

## 4. Schema changes (`prisma/schema.prisma`)

Replace the `PasswordReset` model (lines 163–175) with:

```prisma
model PasswordReset {
  id        String    @id @default(uuid())
  userId    String    @map("user_id")
  codeHash  String    @unique @map("code_hash")
  attempts  Int       @default(0)
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("password_resets")
}
```

Changes: rename `tokenHash` → `codeHash`, add `attempts Int @default(0)`.

> Alternative if you want zero churn: keep the field name `tokenHash` and just add `attempts`. Renaming is preferred for clarity — run `npm run prisma:migrate` after and Prisma will generate a rename migration.

Generate the migration and client:
```powershell
npm run prisma:migrate
npm run prisma:generate
```

## 5. DTO changes (`src/modules/auth/dto/password-reset.dto.ts`)

Keep `ForgotPasswordDto` as-is. Replace `ResetPasswordDto`:

```ts
export class ResetPasswordDto {
  @ApiProperty({ example: 'john.doe@mor.gov.et' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Code must be exactly 6 digits.' })
  code: string;

  @ApiProperty({ example: 'NewPass123' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
```

Note: rely on `passwordIssues()` in the service for the full password policy; `MinLength(8)` in the DTO is a first-line check.

## 6. Service changes (`src/modules/auth/auth.service.ts`)

- Add constants:
  ```ts
  const PASSWORD_RESET_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
  const PASSWORD_RESET_MAX_ATTEMPTS = 5;
  ```
- Keep `hashToken()` (reused for the code hash).
- Add a small constant-time compare helper:
  ```ts
  function safeEqualHex(a: string, b: string): boolean {
    const ba = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
  }
  ```

Rewrite `forgotPassword()`:

```ts
async forgotPassword(email: string): Promise<{ message: string }> {
  const normalized = email.trim().toLowerCase();
  const user = await this.prisma.user.findUnique({
    where: { email: normalized },
  });

  if (!user || !user.isActive) {
    return { message: 'If that email exists, a code has been sent.' };
  }

  // Invalidate any previously pending codes before issuing a new one.
  await this.prisma.passwordReset.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const code = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_CODE_TTL_MS);

  await this.prisma.passwordReset.create({
    data: { userId: user.id, codeHash: hashToken(code), expiresAt },
  });

  try {
    await this.mailService.sendPasswordResetCode(user.email, code);
  } catch (err) {
    this.logger.error(`Failed to send password reset code to ${user.email}: ${err}`);
  }

  return { message: 'If that email exists, a code has been sent.' };
}
```

Rewrite `resetPassword()`:

```ts
async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
  const normalized = dto.email.trim().toLowerCase();
  const user = await this.prisma.user.findUnique({ where: { email: normalized } });

  // Generic error — do not reveal whether the email exists.
  const genericError = 'Invalid or expired code.';
  if (!user) throw new BadRequestException(genericError);

  const reset = await this.prisma.passwordReset.findFirst({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  if (!reset) throw new BadRequestException(genericError);

  if (reset.attempts >= PASSWORD_RESET_MAX_ATTEMPTS) {
    await this.prisma.passwordReset.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    });
    throw new BadRequestException('Too many attempts. Request a new code.');
  }

  // Constant-time comparison against the stored hash.
  if (!safeEqualHex(hashToken(dto.code), reset.codeHash)) {
    const nextAttempts = reset.attempts + 1;
    await this.prisma.passwordReset.update({
      where: { id: reset.id },
      data: {
        attempts: nextAttempts,
        ...(nextAttempts >= PASSWORD_RESET_MAX_ATTEMPTS ? { usedAt: new Date() } : {}),
      },
    });
    throw new BadRequestException(genericError);
  }

  const policyError = passwordIssues(dto.newPassword);
  if (policyError) throw new BadRequestException(policyError);

  const hashedPassword = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

  await this.prisma.$transaction([
    this.prisma.passwordReset.updateMany({
      where: { userId: reset.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    this.prisma.user.update({ where: { id: reset.userId }, data: { password: hashedPassword } }),
    this.prisma.refreshToken.updateMany({
      where: { userId: reset.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return { message: 'Password reset successfully. You can now sign in.' };
}
```

## 7. Optional but recommended: Redis rate-limiting

Brute-force protection at the code level (5 attempts) is required; additionally rate-limit the two endpoints so the 1M-code space can't be hammered.

Pattern: copy the best-effort Redis client from `src/modules/permissions/permissions.service.ts` (lazyConnect, `retryStrategy: () => null`, error handler that swallows), so the app never depends on Redis being up. In the `AuthService` constructor create `this.redis`, and implement `OnModuleDestroy` to `quit()`.

- In `forgotPassword(email)`: key `rate:forgot:${email}` — `INCR`; on first response set `EXPIRE 3600`. If count > 5 → `429 Too Many Requests` (or a `BadRequestException`). Also key `rate:forgot:ip:${ip}` via the request IP if easily available (requires passing IP from controller).
- In `resetPassword(dto)`: key `rate:reset:${email}` — `INCR`, `EXPIRE 3600`, cap ~10/hr.

> Rate limiting is a hardening step. If you want to keep this plan minimal, implement the DB `attempts` counter first and treat Redis limits as a follow-up. The DB counter alone meets the minimum security requirement.

## 8. Mail changes (`src/modules/mail/mail.service.ts`)

DELETE `sendPasswordReset()` (the link version) and replace it with:

```ts
async sendPasswordResetCode(to: string, code: string): Promise<void> {
  if (!this.transporter) {
    this.logger.warn(`[mail] SMTP not configured — skipping password reset code email to ${to}`);
    return;
  }

  const appName = this.appName;
  const display = `${code.slice(0, 3)} ${code.slice(3)}`; // e.g. 123 456

  await this.transporter.sendMail({
    from: this.from || undefined,
    to,
    subject: `${appName} — Your password reset code`,
    text: [
      `Hello,`,
      ``,
      `Your ${appName} password reset code is: ${code}`,
      `It expires in 10 minutes.`,
      ``,
      `If you didn't request this, you can safely ignore this email.`,
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#1e293b;margin:0 0 8px">${appName}</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6">
          Your password reset code is:
        </p>
        <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#4f46e5;background:#eef2ff;display:inline-block;padding:12px 24px;border-radius:8px;margin:16px 0">
          ${display}
        </p>
        <p style="color:#94a3b8;font-size:12px">
          This code expires in 10 minutes.<br/>
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
  this.logger.log(`Sent password reset code email to ${to}`);
}
```

Requirements:
- Never log the code itself.
- Search the whole codebase for usages of `sendPasswordReset(` after the change; there should be none. If any remain (e.g., an old e2e test), update them.

## 9. Controller changes (`src/modules/auth/auth.controller.ts`)

Routes and DTOs stay the same; only update the Swagger text so it reflects a code instead of a link:
- `forgot-password` summary → `'Request a 6-digit password-reset code for an email'`.
- `reset-password` summary → `'Set a new password using the emailed 6-digit code'`.

## 10. Frontend impact (brief)

The frontend currently links to `/reset-password?token=...` (see `auth.service.ts` line 202 and the `FRONTEND_URL` env var). Since the link is removed:

- The flow becomes two screens: (1) "enter email" → shows "code sent", (2) "enter code + new password".
- The `reset-password` page should read `code` and `email` from its own form state, not from the URL query.
- Frontend password rules in `frontend/src/constants/auth.ts` must keep matching `passwordIssues()` (8+ chars, one letter + one number).

> This plan is backend-focused. Implement and verify the backend first; the frontend screens can be wired afterwards. If the frontend is being handled separately, tell the implementing engineer that the old `?token=` URL can no longer be used.

## 11. Local SMTP for testing

Currently, without `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`, MailService warns and **does not send**. To test locally you need one of:

1. Real SMTP creds (e.g., Gmail App Password) in `backend/.env`.
2. A local dev mail catcher. Smallest option: add to `backend/docker-compose.yml`:
   ```yaml
   mailhog:
     image: mailhog/mailhog:latest
     container_name: eltms-mailhog
     ports:
       - "8025:8025"   # web UI: http://localhost:8025
       - "1025:1025"   # SMTP port
   ```
   Then set in `backend/.env`:
   ```
   SMTP_HOST=localhost
   SMTP_PORT=1025
   SMTP_USER=
   SMTP_PASS=
   SMTP_SECURE=false
   SMTP_FROM="MoR Tele ELTMS <no-reply@mor.gov.et>"
   ```
   Emails appear instantly at `http://localhost:8025`. (SDK note: MailHog accepts any auth, or none — leave `SMTP_USER`/`SMTP_PASS` empty; `MailService` currently only creates a transporter when host+user+pass are all present, so for MailHog you must make the `user`/`pass` optional in `MailService` — otherwise emails are skipped.)

> The MailService constructor condition at lines 21–34 requires all of host, user, pass. For the MailHog path, change the condition so a transporter is created whenever **host** is present (user/pass optional), e.g. `if (host)`. Keep `auth: user && pass ? { user, pass } : undefined`.

## 12. Verification checklist

Do all of these manually after implementation:

1. `npm run prisma:migrate` then `npm run prisma:generate` — must succeed (rename + add column).
2. `npm run build` (or rely on `npm run start:dev`) — no TS errors.
3. `POST /auth/forgot-password` with an existing email → email with 6-digit code arrives (or MailHog shows it). Same request with a non-existent email → identical response body.
4. `POST /auth/reset-password`:
   - correct code + valid password → success, then tell the user's refresh tokens are revoked (old session rejects on refresh).
   - wrong code ×5 → locked (6th attempt with the right code fails with "Too many attempts").
   - expired code (set `expiresAt` in the past directly in the DB to test) → error.
   - reusing the same code twice → second call fails.
   - wrong/missing email → generic `'Invalid or expired code.'` error.
5. Log scan — the plaintext code must not appear anywhere in server logs.
6. `docker compose ps` shows containers healthy; `npm run start:dev` logs "Nest application successfully started".

## 13. Files touched (summary)

| File | Change |
|---|---|
| `backend/prisma/schema.prisma` | `PasswordReset`: `tokenHash`→`codeHash`, add `attempts` |
| `backend/src/modules/auth/dto/password-reset.dto.ts` | `ResetPasswordDto`: add `email`, `code`; drop `token` |
| `backend/src/modules/auth/auth.service.ts` | Rewrite `forgotPassword` + `resetPassword`; add const-time compare; optional Redis |
| `backend/src/modules/mail/mail.service.ts` | Replace `sendPasswordReset` with `sendPasswordResetCode`; make host-only transporter (for MailHog) |
| `backend/src/modules/auth/auth.controller.ts` | Swagger wording only |
| `backend/docker-compose.yml` | (optional) add MailHog |
| `backend/.env` | (for local testing) SMTP settings |