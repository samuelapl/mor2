# First-Login Password Change — Implementation Plan

Goal: users created by an admin (bulk registration) must change their password the first
time they sign in. A 6-digit code is emailed to them, and they enter it with a new password
and a confirmation. Self-registered users aren't affected. The plan reuses the existing
forgot/reset-password code.

## 1. What already exists (reused)

| Piece | Where | Reuse |
|---|---|---|
| `PasswordReset` table (code hash, attempts, expiry, usedAt) | `prisma/schema.prisma` | Stores first-login codes too |
| 6-digit code generation + SHA-256 hash + constant-time compare + attempt lockout | `auth.service.ts` `forgotPassword` / `resetPassword` | Moved into shared private helpers |
| Code email | `mail.service.ts` `sendPasswordResetCode` | Same layout, different wording |
| Password policy `passwordIssues` | backend `@common/utils`, frontend `@/constants/auth` | Same |
| Code + new-password form UI | `frontend/src/app/(auth)/verify-code`, `reset-password` | Same style and components |

## 2. Flow

```
Admin bulk-registers user ──► user.mustChangePassword = true
                                   │
User signs in (email + temp password)
   │  password wrong ──► "Invalid credentials" (unchanged)
   │  password right + mustChangePassword
   ▼
Backend: NO access/refresh tokens. Emails a 6-digit code and returns
   { passwordChangeRequired: true, challengeToken, email }
   ▼
Frontend /first-login page: code + new password + confirm password  (+ "Resend code")
   ▼
POST /auth/first-login/complete
   • checks challengeToken, code, policy, new ≠ temp password
   • sets new password, mustChangePassword = false, uses up codes
   • returns normal login response (tokens + permissions) ──► user lands on dashboard
```

Why a `challengeToken`: without it, `/first-login/complete` would just be forgot-password
again. The token proves the user **knew the temporary password**, and the code proves they
**own the email**. It's a short-lived JWT (15 min) with `purpose: "first_login"`, signed
with the normal JWT secret. It can't be used as an access token because the JWT strategy
rejects that purpose.

Tokens are never issued while the flag is set, so the rule is enforced on the server and
the frontend can't skip it.

## 3. Backend

1. **Schema + migration** (`add_must_change_password`):
   - `User.mustChangePassword Boolean @default(false) @map("must_change_password")`
   - `PasswordReset.purpose PasswordResetPurpose @default(RESET)` with enum
     `RESET | FIRST_LOGIN`, so a forgot-password code can't be used for first login (and
     the reverse).
   - Existing users keep `false`, so nobody is forced to change right away.
2. **Set the flag** in `UsersService.bulkCreate` (`mustChangePassword: true`).
3. **`AuthService`**:
   - Move code issue/verify out of `forgotPassword`/`resetPassword` into
     `issueCode(userId, purpose)` and `consumeCode(userId, purpose, code)`. Behaviour stays
     the same (invalidate older codes, 10-min TTL, max attempts, lockout).
   - `login`: after a correct password, if `mustChangePassword` then `issueCode(FIRST_LOGIN)`,
     send the email, and return `{ passwordChangeRequired: true, challengeToken, email }`.
   - `resendFirstLoginCode(challengeToken)`: 60-second cooldown per user.
   - `completeFirstLogin({ challengeToken, code, newPassword, confirmPassword })`:
     passwords must match and pass the policy, the new password can't equal the current
     one, and one transaction updates the password, clears the flag, uses up the codes and
     revokes old refresh tokens. Then it returns the same payload as `login`.
   - `resetPassword` (forgot-password) also clears `mustChangePassword`. The user proved
     email ownership and chose their own password, so they aren't asked twice.
4. **Endpoints** (`@Public()`, rate-limited like forgot-password):
   - `POST /auth/first-login/resend-code` `{ challengeToken }`
   - `POST /auth/first-login/complete` `{ challengeToken, code, newPassword, confirmPassword }`
5. **JWT strategy:** reject tokens whose `purpose` is `first_login`.
6. **Mail:** `sendFirstLoginCode(to, code)`, with wording like "Welcome to MoR LMS — use
   this code to set your own password", in the same HTML layout as the reset email.
7. **`sanitizeUser`:** expose `mustChangePassword` so the admin Users list can show it.
8. **Tests:** login with the flag returns a challenge and no tokens; the full completion
   flow works; wrong code, lockout, mismatched confirmation and reusing the temp password
   are rejected; a RESET code is rejected for first login; forgot-password clears the flag.

## 4. Frontend

1. **API client** (`lib/api/auth.ts`): the login response becomes a union type, plus
   `resendFirstLoginCode` and `completeFirstLogin`.
2. **Store `login`:** returns `{ ok: true, role }` or `{ ok: false, message }` as today, plus
   a new `{ ok: "password_change_required", email }` case. The `challengeToken` goes into
   `sessionStorage` (never the URL). Add a `completeFirstLogin` action that saves the
   session exactly like `login`.
3. **Login page:** on `password_change_required`, go to `/first-login`.
4. **New page `(auth)/first-login`** (same look as verify-code/reset-password):
   - "We sent a 6-digit code to a•••@mor.gov.et"
   - Inputs: code, new password, confirm password, with live policy hints
   - "Resend code" button with a 60-second countdown
   - If the token is missing or expired, show a message and a link back to login
   - On success, go to the role's dashboard
5. **Admin Users list:** a "Must change password" badge (optional, small).
6. **Bulk-register page note:** "Users will be asked to set their own password on first
   sign-in."

## 5. Verification

- Backend unit tests and `npm run build`. Frontend `tsc --noEmit`.
- Manual: bulk-register a user whose email you can read (or use a dev SMTP catcher like
  Mailpit), sign in with the temp password, receive the code, set a new password, land on
  the dashboard. Signing in again with the new password skips the step.

## 6. Open questions

1. **Which accounts get the flag?** The plan: bulk registration only, as asked.
   Recommended: also **Actor Registration** and **admin "reset user password"**, since those
   are admin-chosen passwords too.
2. **After changing the password:** log them in automatically (planned) or send them back
   to the login page?
3. **No SMTP in dev:** the code email is skipped, so the user can't finish. Proposal: when
   `NODE_ENV=development` and SMTP isn't configured, log the code to the server console
   (never in production).
4. **Migration:** your local DB still has migration drift, so it needs the
   `prisma migrate reset` we discussed before the new migration can be applied.
