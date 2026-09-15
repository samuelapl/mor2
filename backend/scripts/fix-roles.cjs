#!/usr/bin/env node
/** One-shot: link each seeded user to its role (idempotent). Run with .env. */
const { PrismaClient, Prisma } = require("@prisma/client");
require("dotenv").config();
const p = new PrismaClient();

const MAP = {
  "system.admin@mor.gov.et": "SYSTEM_ADMIN",
  "training.admin@mor.gov.et": "TRAINING_ADMIN",
  "owner@mor.gov.et": "COURSE_OWNER",
  "approver@mor.gov.et": "CONTENT_APPROVER",
  "trainer@mor.gov.et": "TRAINER",
  "learner1@mor.gov.et": "LEARNER",
  "learner2@mor.gov.et": "LEARNER",
  "learner3@mor.gov.et": "LEARNER",
  "learner4@mor.gov.et": "LEARNER",
  "learner5@mor.gov.et": "LEARNER",
  "sadministrator@gmail.com": "SYSTEM_ADMIN",
  "tadministrator@gmail.com": "TRAINING_ADMIN",
  "owner@gmail.com": "COURSE_OWNER",
  "approver@gmail.com": "CONTENT_APPROVER",
  "trainer@gmail.com": "TRAINER",
  "learner@gmail.com": "LEARNER",
};

(async () => {
  console.error("PROBE typeof p:", typeof p, "| p?.user?:", typeof p?.user, "| findUnique?:", typeof p?.user?.findUnique, "| DATABASE_URL set:", !!process.env.DATABASE_URL);
  let linked = 0;
  for (const [email, code] of Object.entries(MAP)) {
    const u = await p.user.findUnique({ where: { email } });
    if (!u) { console.log(`  ⏭ missing user ${email}`); continue; }
    const r = await p.role.findUnique({ where: { code } });
    if (!r) { console.log(`  ⏭ missing role ${code}`); continue; }
    const ex = await p.userRole.findUnique({
      where: { userId_roleId: { userId: u.id, roleId: r.id } },
    });
    if (ex) { console.log(`  ✓ ${email} → ${code} (already)`); continue; }
    await p.userRole.create({ data: { userId: u.id, roleId: r.id } });
    linked++;
    console.log(`  ✓ ${email} → ${code}`);
  }
  const rows = await p.userRole.count();
  console.log(`\nuserRole rows = ${rows} (new this run: ${linked})`);
  await p.$disconnect();
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
