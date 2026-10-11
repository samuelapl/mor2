#!/usr/bin/env node
// Checks src/lib/i18n/locales: every key exists in both en and am, no empty values,
// and both languages use the same {placeholders}. Also fails on Amharic text in .ts/.tsx
// code outside the locales, except strings listed in scripts/i18n-allowlist.json (each
// with a reason). Exits 1 on any problem.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = join(process.cwd(), 'src/lib/i18n/locales');
const langs = ['en', 'am'];

function flatten(obj, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') flatten(value, path, out);
    else out[path] = value;
  }
  return out;
}

const placeholders = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

const problems = [];
const files = new Set(langs.flatMap((lang) => readdirSync(join(root, lang)).filter((f) => f.endsWith('.json'))));
let keyCount = 0;

for (const file of [...files].sort()) {
  const ns = file.replace(/\.json$/, '');
  const flat = {};
  for (const lang of langs) {
    try {
      flat[lang] = flatten(JSON.parse(readFileSync(join(root, lang, file), 'utf8')));
    } catch (err) {
      problems.push(`${lang}/${file}: ${err.code === 'ENOENT' ? 'file missing' : `invalid JSON (${err.message})`}`);
      flat[lang] = {};
    }
  }
  const keys = new Set([...Object.keys(flat.en), ...Object.keys(flat.am)]);
  keyCount += keys.size;
  for (const key of [...keys].sort()) {
    const id = `${ns}.${key}`;
    for (const lang of langs) {
      const value = flat[lang][key];
      if (value === undefined) problems.push(`${id}: missing in ${lang}`);
      else if (typeof value !== 'string') problems.push(`${id}: ${lang} value is not a string`);
      else if (!value.trim()) problems.push(`${id}: empty in ${lang}`);
    }
    if (typeof flat.en[key] === 'string' && typeof flat.am[key] === 'string') {
      const a = placeholders(flat.en[key]);
      const b = placeholders(flat.am[key]);
      if (a !== b) problems.push(`${id}: placeholders differ (en: {${a}} am: {${b}})`);
    }
  }
}

// Amharic in code: every Amharic run must be allow-listed for its file.
const allowlist = JSON.parse(readFileSync(join(process.cwd(), 'scripts/i18n-allowlist.json'), 'utf8'));
const amharicRun = /[\u1200-\u137F]+(?:[ \u1360-\u1368]+[\u1200-\u137F]+)*/g;
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = join(dir, d.name);
    if (d.isDirectory()) return p.includes(join('lib', 'i18n', 'locales')) ? [] : walk(p);
    return /\.tsx?$/.test(d.name) ? [p] : [];
  });
}
let codeFiles = 0;
for (const file of walk(join(process.cwd(), 'src'))) {
  codeFiles++;
  const rel = relative(process.cwd(), file).split(sep).join('/');
  const text = readFileSync(file, 'utf8');
  const allowed = new Set(allowlist[rel]?.allowed ?? []);
  for (const m of text.matchAll(amharicRun)) {
    if (allowed.has(m[0])) continue;
    const line = text.slice(0, m.index).split('\n').length;
    problems.push(`${rel}:${line}: Amharic text in code ("${m[0].slice(0, 40)}") — move it to locales/am + locales/en and use t(), or allow-list it in scripts/i18n-allowlist.json with a reason`);
  }
}

if (problems.length) {
  console.error(`i18n:check found ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`i18n:check OK — ${files.size} namespaces, ${keyCount} keys, en/am in sync; ${codeFiles} code files without unlisted Amharic.`);
