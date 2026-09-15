# 📚 MoR Tele ELTMS — Backend

NestJS + Prisma + PostgreSQL + Redis + MinIO backend for the MoR Tele E-Learning Training Management System.

## Prerequisites

- Node.js ≥ 20
- Docker & Docker Compose (for Postgres, Redis, MinIO)
- pnpm or npm

## Quick Start

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Install dependencies
npm install

# 3. Configure env (defaults match docker-compose)
cp .env.example .env

# 4. Generate Prisma client + run migrations
npm run prisma:generate
npm run prisma:migrate

# 5. Seed demo data (role-based users + courses)
npm run prisma:seed

# 6. Run the server
npm run start:dev
```

API: `http://localhost:3000/api/v1`
Swagger docs: `http://localhost:3000/api/docs`

## Architecture

See [`../backend-architecture-and-folder-structure.md`](../backend-architecture-and-folder-structure.md) and
[`../backend-implementation-plan-3-waves.md`](../backend-implementation-plan-3-waves.md)

## Folder Structure

```
backend/
├── prisma/            # Schema, migrations, seed
├── src/
│   ├── common/        # Guards, decorators, interceptors, filters, pipes, utils
│   ├── config/        # PrismaService, env validation, constants
│   ├── integrations/  # SSO (stub) + HR (stub)
│   └── modules/       # Feature modules
│       ├── auth/          # JWT + refresh token rotation
│       ├── users/
│       ├── courses/       # Lifecycle state machine
│       ├── curriculum/    # Modules + lessons
│       ├── attachments/
│       ├── assessments/
│       ├── enrollments/
│       ├── progress/
│       ├── live-sessions/
│       ├── attendance/
│       ├── certificates/
│       ├── notifications/
│       ├── audit/
│       ├── admin/
│       └── files/         # MinIO uploads
└── docker-compose.yml
```

## Roles

`SYSTEM_ADMIN`, `TRAINING_ADMIN`, `COURSE_OWNER`, `CONTENT_APPROVER`, `TRAINER`, `LEARNER`

## Demo Accounts (after seed)

All passwords: `Password123!`

| Email | Role |
| --- | --- |
| system.admin@mor.gov.et | SYSTEM_ADMIN |
| training.admin@mor.gov.et | TRAINING_ADMIN |
| owner@mor.gov.et | COURSE_OWNER |
| approver@mor.gov.et | CONTENT_APPROVER |
| trainer@mor.gov.et | TRAINER |
| learner1@mor.gov.et | LEARNER |

## Common Commands

```bash
npm run start:dev      # dev server (watch)
npm run build          # compile
npm run lint           # eslint --fix
npm run test           # unit tests
npm run test:e2e       # e2e tests
npm run prisma:studio  # DB explorer
npm run prisma:migrate # create + run migration
npm run prisma:migrate:prod  # apply migrations in prod
```

## Bilingual Support

All content-bearing tables carry `*_am` and `*_en` fields. The API returns both; the
frontend renders the field matching the user's `locale` (`en` | `am`), which is
conveyed via the `Accept-Language` header or `?locale=` query param.