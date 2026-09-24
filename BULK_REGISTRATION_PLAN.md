# Bulk Registration — Implementation Plan

Goal: bulk registration uses the same fields as self-registration — **first name, last name,
email, phone, password, TIN (optional)** — and works end to end, including a correct result
summary.

## 1. Current state

| Area | File | Status |
|---|---|---|
| Endpoint `POST /users/bulk` (`user.manage`) | `backend/src/modules/users/users.controller.ts` | Exists |
| Service `bulkCreate` | `backend/src/modules/users/users.service.ts` | Exists — no phone/TIN |
| DTO `BulkCreateUserItemDto` | `backend/src/modules/users/dto/bulk-create-users.dto.ts` | No phone/TIN |
| Page `/system-admin/bulk-register` | `frontend/src/app/(dashboard)/system-admin/bulk-register/page.tsx` | No phone/TIN |
| Store `bulkRegisterUsers` | `frontend/src/lib/lms-store.tsx` | Discards API result |
| API types `BulkCreateUserItem` | `frontend/src/lib/api/types.ts` | No phone/TIN |

The `User` model already has `phone String?` and `tin String?`, so **no DB migration is needed**.

### Bugs found

1. **Large imports fail.** The whole file runs inside one Prisma interactive transaction
   (default timeout 5 s), and each row does a bcrypt hash at 12 rounds (~250 ms). Around 20+
   rows exceed the timeout, and the entire import is rolled back.
2. **The summary is wrong.** The store ignores the API response, so the page shows *every*
   submitted row as created, even rows the backend skipped (duplicate email, bad password).
   `skippedRows` is never filled.
3. **Generated passwords are lost.** The backend returns auto-generated passwords once, but
   the page never shows them, so the admin can't give them to users.
4. **Columns are read by position.** The CSV parser uses `cells[0..4]`, so a file with a
   different column order is imported wrongly.
5. **Unknown roles become Learner.** An unknown or custom role in the file silently becomes
   `learner` on the frontend.

## 2. New CSV format

```
first_name,last_name,email,phone,password,tin,role
Abebe,Kebede,abebe.kebede@mor.gov.et,+251911000000,Welcome2026,0012345678,learner
Sara,Ahmed,sara.ahmed@mor.gov.et,+251922000000,,,trainer
```

| Column | Required | Rule |
|---|---|---|
| first_name | Yes | not blank |
| last_name | Yes | not blank |
| email | Yes | valid, unique (login uses email) |
| phone | Yes | not blank, same rule as self-registration |
| password | No | blank → auto-generated; otherwise must pass the password policy |
| tin | No | blank → stored as `null` |
| role | No | blank → `LEARNER`; must be an existing role |

Columns are matched **by header name** (case- and space-insensitive, e.g. `First Name` =
`first_name`), so column order no longer matters.

## 3. Backend changes

1. **DTO** (`bulk-create-users.dto.ts`): add `phone` (`@IsString() @IsNotEmpty()`) and
   `tin?` (`@IsOptional() @IsString()`). Add `@ArrayMinSize(1)` and `@ArrayMaxSize(500)`
   on `users`.
2. **Service `bulkCreate`**:
   - Validate each row and hash its password **before** the transaction, then do only the
     DB writes inside it with a raised `timeout`. Or drop the single transaction and create
     each row on its own (recommended: each row is independent, and duplicates are already
     skipped, so a partial success is fine and matches "skipped" reporting).
   - Look up existing emails in one `findMany` instead of one query per row.
   - Save `phone` and `tin` (`tin?.trim() || null`).
   - Report skipped rows with the row number plus email and reason.
   - Return `phone` in each `created` row.
3. **Privilege check (recommended):** a caller who isn't `SYSTEM_ADMIN` can't assign the
   `SYSTEM_ADMIN` role through bulk import (the row is skipped with a reason).
4. **Unit tests** in `users.service.spec.ts`: phone/TIN are saved, duplicate emails are
   skipped, a blank password is generated, an unknown role is skipped, and a 50-row import
   succeeds.

## 4. Frontend changes

1. **Types** (`lib/api/types.ts`): add `phone` and `tin?` to `BulkCreateUserItem` and to
   the result row. Change `role` to a plain string so custom roles are allowed.
2. **Store** (`lms-store.tsx`): `bulkRegisterUsers` sends `phone`/`tin` and **returns the
   API result** (`created`, `skipped`, `totals`).
3. **Page** (`bulk-register/page.tsx`):
   - New template with the columns above.
   - Match columns by header name. If a required column is missing, show a clear error.
   - Preview table adds editable Phone and TIN columns, and each row shows its errors
     (missing name, invalid email, missing phone, weak password).
   - The Register button only sends rows with no errors.
   - Result section: a **Created** table (name, email, phone, role, password — with a
     note that generated passwords are shown only once, plus a "Download credentials CSV"
     button) and a **Skipped** table (row, email, reason).
   - Role dropdown lists the roles loaded from the backend instead of the fixed `ROLES`
     list. An unknown role in the file is flagged, not silently turned into Learner.
   - Update the description text on the page.

## 5. Verification

- `npx tsc --noEmit` (frontend) and `npm run build` / `npm test` (backend).
- Manual test: import a CSV with ~50 rows including one duplicate email, one weak password,
  one blank password, one missing TIN and a shuffled column order. Check the created and
  skipped counts, then check in the DB that `phone` and `tin` are saved.
- A generated password can log in.

## 6. Open questions

- **Email** wasn't in the requested field list, but it's required and unique, and login
  uses it, so this plan keeps it required. Should login also accept phone?
- **Role column:** kept as optional (defaults to Learner). Remove it if bulk registration
  should only ever create learners.
- Should phone numbers be unique or checked against a format (e.g. `+2519XXXXXXXX`)? Today
  neither self-registration nor the DB enforces it.
