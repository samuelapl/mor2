#!/usr/bin/env node
// Guards the dark theme (DARK_THEME_PLAN.md): theme colors come from the semantic tokens in
// src/app/globals.css, so .ts/.tsx code must not contain
//   - dark: color utilities (dark:bg-slate-900, dark:hover:text-white…), which the tokens replace
//   - raw neutral surface / text / border colors (bg-white, bg-slate-50, text-slate-500,
//     border-gray-200…), which stay light in dark mode
// Translucent white overlays (bg-white/20 on colored surfaces), dark scrims behind modals
// (bg-slate-900/40 and stronger) and text-white look the same in both themes and are fine.
// Exceptions live in scripts/theme-allowlist.json, each with a reason: an entry without
// "allowed" covers the whole file (the theme-tokens codemod skips it too); an entry with
// "allowed" permits only those exact classes in that file. Exits 1 on any problem.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const allowlist = JSON.parse(readFileSync(join(ROOT, 'scripts/theme-allowlist.json'), 'utf8')).files;
const byFile = new Map(allowlist.map((e) => [e.file, e]));

const COLORS = 'white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|[1-9]00|950)';
const UTILITY = '(?:bg|text|border(?:-[trblxyse])?|divide|ring|ring-offset|outline|placeholder|fill|stroke|from|via|to|decoration|caret)';
const VARIANTS = '(?:[\\w@[\\]&>*_.%#=()\'-]+:)*';
// Class boundaries: start of a class word … end of it.
const B = '(?<![\\w:/\\-[])';
const E = '(?![\\w\\-/[])';

const RULES = [
  {
    name: 'dark: color class',
    re: new RegExp(`${B}!?${VARIANTS}dark:${VARIANTS}${UTILITY}-(?:${COLORS})(?:/\\d+)?${E}`, 'g'),
    fix: 'use a semantic token (bg-card, text-foreground, border-border, bg-success-soft…) and drop the dark: partner',
  },
  {
    name: 'raw neutral color',
    re: new RegExp(
      `${B}!?${VARIANTS}(?:bg-white(?:/(?:[4-9]\\d|100))?|(?:bg|text|border(?:-[trblxyse])?|divide|placeholder)-(?:slate|gray|zinc|neutral|stone)-(?:50|[1-9]00|950)(?:/\\d+)?)${E}`,
      'g',
    ),
    fix: 'use a semantic token (bg-card, bg-muted, text-foreground, text-muted-foreground, border-border…)',
    // Scrims: bg-slate-900/40 … bg-slate-950/90 dim the page the same way in both themes.
    skip: /^bg-(?:slate|gray|zinc|neutral|stone)-(?:900|950)\/(?:[4-9]\d)$/,
  },
];

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = join(dir, d.name);
    if (d.isDirectory()) return walk(p);
    return /\.tsx?$/.test(d.name) ? [p] : [];
  });
}

const problems = [];
const usedAllowed = new Map(); // file → Set(class) actually found, to report stale entries
let files = 0;
for (const file of walk(join(ROOT, 'src'))) {
  files++;
  const rel = relative(ROOT, file).split(sep).join('/');
  const entry = byFile.get(rel);
  if (entry && !entry.allowed) continue;
  const allowed = new Set(entry?.allowed ?? []);
  const text = readFileSync(file, 'utf8');
  for (const rule of RULES) {
    for (const m of text.matchAll(rule.re)) {
      if (rule.skip?.test(m[0]) || (rule !== RULES[0] && m[0].includes('dark:'))) continue; // dark: is reported once, by rule 1
      if (allowed.has(m[0])) {
        if (!usedAllowed.has(rel)) usedAllowed.set(rel, new Set());
        usedAllowed.get(rel).add(m[0]);
        continue;
      }
      const line = text.slice(0, m.index).split('\n').length;
      problems.push(`${rel}:${line}: ${rule.name} "${m[0]}" — ${rule.fix}, or allow-list it in scripts/theme-allowlist.json with a reason`);
    }
  }
}

for (const e of allowlist) {
  if (!e.reason?.trim()) problems.push(`theme-allowlist.json: ${e.file} has no reason`);
  let exists = true;
  try {
    readFileSync(join(ROOT, e.file));
  } catch {
    exists = false;
    problems.push(`theme-allowlist.json: ${e.file} does not exist`);
  }
  if (exists && e.allowed) {
    const used = usedAllowed.get(e.file) ?? new Set();
    for (const c of e.allowed) if (!used.has(c)) problems.push(`theme-allowlist.json: ${e.file} allows "${c}", which is no longer used — remove it`);
  }
}

if (problems.length) {
  console.error(`theme:check found ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`theme:check OK — ${files} code files use semantic color tokens (${allowlist.length} allow-listed exceptions).`);
