#!/usr/bin/env node
/**
 * Wave 1 — backend live HTTP demo gate.
 * Requires: app running on :3001 (POSTGRES/REDIS/MINIO up via nilespark infra).
 * Run: APP_BASE=http://localhost:3001/api/v1 PW=password node scripts/wave1-smoke.mjs
 */
const BASE = (process.env.APP_BASE ?? "http://localhost:3001/api/v1").replace(/\/$/, "");
const PW = process.env.PW ?? "password";
const LOG = (m) => console.log(mGroups.length ? `\n▸ ${m}` : `\n▸ ${m}`);

let pass = 0, fail = 0;

const A = {
  admin:    { email: "system.admin@mor.gov.et" },
  tadmin:   { email: "training.admin@mor.gov.et" },
  owner:    { email: "owner@mor.gov.et" },
  approver: { email: "approver@mor.gov.et" },
  trainer:  { email: "trainer@mor.gov.et" },
  learner:  { email: "learner1@mor.gov.et" },
};

async function req(method, path, { token, body, expect = 200 } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, json };
}

async function login(email) {
  const r = await req("POST", "/auth/login", { body: { email, password: PW } });
  return { token: r.json?.data?.accessToken ?? r.json?.data?.tokens?.access, status: r.status };
}

const tokens = {};
for (const [k, a] of Object.entries(A)) {
  const { token, status } = await login(a.email);
  tokens[k] = token;
  if (token && status === 201) { pass++; console.log(`  ✓ ${a.email} login (201)`); }
  else { fail++; console.log(`  ✗ ${a.email} login → ${status}`); }
}

// ── Auth broken-password (AC-1.4) ───────────────────────
const bad = await req("POST", "/auth/login", { body: { email: A.admin.email, password: "wrong" } });
bad.status === 401 ? (pass++, console.log(`  ✓ bad password → 401`)) : (fail++, console.log(`  ✗ bad password → ${bad.status}`));

// ── RBAC (AC-1.5) ───────────────────────────────────────
const ownerCreate = await req("POST", "/courses", { token: tokens.owner, body: { code: `SMK${Date.now()%10000}`, titleEn: "Smk", titleAm: "ስምክ", descriptionEn: "d", descriptionAm: "d", estimatedHours: 4 } });
const courseId = ownerCreate.json?.data?.id ?? ownerCreate.json?.data?.course?.id;
courseId ? (pass++, console.log(`  ✓ course_owner creates course ${courseId}`)) : (fail++, console.log(`  ✗ create → ${ownerCreate.status} ${JSON.stringify(ownerCreate.json)}`));

const learnerCreate = await req("POST", "/courses", { token: tokens.learner, body: {} });
learnerCreate.status === 403 ? (pass++, console.log("  ✓ learner cannot create → 403")) : (fail++, console.log(`  ✗ RBAC learner → ${learnerCreate.status}`));

// ── submit → approve → publish (AC-1.10..1.12, 1.15) ────
if (courseId) {
  const sub = await req("POST", `/courses/${courseId}/request-approval`, { token: tokens.owner });
  sub.status === 201 ? (pass++, console.log("  ✓ owner submits for approval (201)")) : (fail++, console.log(`  ✗ submit → ${sub.status} ${JSON.stringify(sub.json)}`));

  const appr = await req("POST", `/courses/${courseId}/review`, { token: tokens.approver, body: { decision: "APPROVE" } });
  appr.status === 201 ? (pass++, console.log("  ✓ approver approves (201)")) : (fail++, console.log(`  ✗ approve → ${appr.status} ${JSON.stringify(appr.json)}`));

  const pub = await req("POST", `/courses/${courseId}/publish`, { token: tokens.tadmin });
  pub.status === 201 ? (pass++, console.log("  ✓ training_admin publishes (201)")) : (fail++, console.log(`  ✗ publish → ${pub.status} ${JSON.stringify(pub.json)}`));
}

// ── Enrollment (AC-1.14) ────────────────────────────────
if (courseId) {
  const enr = await req("POST", `/courses/${courseId}/enrollments`, { token: tokens.tadmin, body: { learnerIds: [A.learner.email] } });
  enr.status === 201 ? (pass++, console.log("  ✓ training_admin bulk-enrolls (201)")) : (fail++, console.log(`  ✗ enroll → ${enr.status} ${JSON.stringify(enr.json)}`));
}

console.log(`\n══ Wave 1 live gate: ${pass} passed, ${fail} failed ══`);
process.exit(fail === 0 ? 0 : 1);
