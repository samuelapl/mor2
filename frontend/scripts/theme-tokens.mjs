#!/usr/bin/env node
/**
 * Rewrites raw Tailwind color classes to the semantic color tokens from src/app/globals.css
 * (see DARK_THEME_PLAN.md).
 *
 *   node scripts/theme-tokens.mjs [--dry-run] [--verbose] <file-or-dir> [...]
 *   node scripts/theme-tokens.mjs --self-test
 *
 * Works on every string / template literal in .ts/.tsx whose words all look like Tailwind classes
 * (className attributes, cn()/clsx() arguments, variant maps…). Inside one literal:
 *   bg-white dark:bg-slate-900            → bg-card            (the dark: partner is dropped)
 *   text-slate-500 dark:text-slate-400    → text-muted-foreground
 *   bg-slate-50/60                        → bg-muted/60        (opacity is kept)
 *   hover:bg-emerald-50 dark:hover:bg-…   → hover:bg-success-soft
 * A light class with no dark: partner is converted the same way (those are today's white boxes).
 *
 * Anything without a mapping (gradients, odd shades, text-white on colored buttons, solid status
 * fills, dark: classes whose light partner is in another literal) is left unchanged and listed in
 * the report for manual review. Files allow-listed as a whole in scripts/theme-allowlist.json are skipped.
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// ---------------------------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------------------------
const NEUTRAL = new Set(['slate', 'gray']);
const STATUS = {
  emerald: 'success', green: 'success',
  amber: 'warning', yellow: 'warning', orange: 'warning',
  red: 'danger', rose: 'danger',
  sky: 'info', blue: 'info', cyan: 'info',
  indigo: 'primary',
};
const FAMILIES =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const UTILITY = '(bg|text|border(?:-[trblxyse])?|divide|ring|ring-offset|outline|placeholder|fill|stroke|from|via|to|decoration|caret)';
const COLOR_RE = new RegExp(`^${UTILITY}-(white|black|(${FAMILIES})-(50|[1-9]00|950))(?:/(\\d+))?$`);

/** Splits `dark:hover:bg-slate-50/60` into variants, utility, family, shade, opacity. */
function parseClass(token) {
  const important = token.startsWith('!') ? '!' : '';
  const parts = token.slice(important.length).split(':');
  const base = parts.pop();
  const m = COLOR_RE.exec(base);
  if (!m) return null;
  const [, utility, color, family = color, shade = null, opacity = null] = m;
  return { token, important, variants: parts, utility, family, shade: shade && Number(shade), opacity: opacity && Number(opacity) };
}

const withOpacity = (name, base, extra) => {
  if (base == null && extra == null) return name;
  const value = Math.round((((base ?? 100) / 100) * ((extra ?? 100) / 100) * 100) / 5) * 5;
  return value >= 100 ? name : `${name}/${value}`;
};

/**
 * Token for a light-mode color class, or null when it has no safe mapping.
 * Returns { name, opacity } where opacity (0–100) is folded into the class's own opacity.
 */
function tokenFor({ utility, family, shade, opacity, variants }) {
  const kind = utility.startsWith('border') ? 'border' : utility;
  if (kind === 'from' || kind === 'via' || kind === 'to') return softStop(family, shade);
  if (family === 'white') {
    if (kind === 'bg' && (opacity == null || opacity >= 40)) return { name: 'card' };
    return null; // text-white / border-white / faint white overlays sit on colored surfaces
  }
  if (family === 'black') return kind === 'text' ? { name: 'foreground' } : null;

  if (NEUTRAL.has(family)) {
    switch (kind) {
      case 'bg':
        if (shade === 50) return { name: 'muted' };
        if (shade === 100) return { name: 'secondary' };
        if (shade === 200 && variants.length === 0) return { name: 'border' }; // tracks, pills, dividers (hover → secondary)
        if (shade === 300) return { name: 'input' };
        if (shade === 400) return { name: 'subtle-foreground' }; // neutral dots
        return null; // always-dark slate-800/900 stages: review by hand
      case 'text':
      case 'fill':
      case 'stroke':
      case 'placeholder':
      case 'decoration':
      case 'caret':
        if (shade >= 800 && shade <= 950) return { name: 'foreground' };
        if (shade === 600 || shade === 700) return { name: 'secondary-foreground' };
        if (shade === 500) return { name: 'muted-foreground' };
        if (shade === 300 || shade === 400) return { name: 'subtle-foreground' };
        return null;
      case 'border':
      case 'divide':
      case 'outline':
        if (shade === 100) return { name: 'border', opacity: 60 };
        if (shade === 200) return { name: 'border' };
        if (shade === 300) return { name: 'input' };
        return null;
      case 'ring':
        if (shade === 200) return { name: 'border' };
        if (shade >= 600 && opacity != null && opacity <= 30) return { name: 'foreground' };
        return null;
      case 'ring-offset':
        return null;
      default:
        return null; // gradients
    }
  }

  const status = STATUS[family] ?? (['violet', 'purple'].includes(family) ? 'accent' : null);
  if (!status) return null;
  if (status === 'accent') {
    if (kind === 'bg') return shade === 50 || shade === 100 ? { name: 'accent-soft' } : null;
    if (kind === 'text') return shade >= 600 && shade <= 950 ? { name: 'accent' } : null;
    if (kind === 'border') return shade >= 100 && shade <= 300 ? { name: 'accent', opacity: 30 } : null;
    if (kind === 'ring') return shade >= 100 && shade <= 200 && opacity == null ? { name: 'accent', opacity: 20 } : null;
    return null;
  }
  switch (kind) {
    case 'text':
    case 'fill':
    case 'stroke':
    case 'decoration':
      // 500 icons would darken in light mode; 900/950 text on soft tints would vanish in dark mode
      return shade >= 600 && shade <= 950 ? { name: status } : null;
    case 'bg':
      if (shade === 50 || shade === 100) return { name: `${status}-soft` };
      // A solid fill's hover/active shade has no token; converting it would remove the hover.
      if (status === 'primary' && (shade === 500 || shade === 600) && variants.length === 0) return { name: 'primary' };
      return null; // solid status fills (white text on them): review by hand
    case 'border':
    case 'divide':
      if (shade >= 100 && shade <= 300) return { name: status, opacity: 30 };
      if (status === 'primary' && shade >= 400 && shade <= 500 && opacity == null) return { name: 'ring' };
      if (shade >= 500 && shade <= 700) return { name: status }; // selected / accent edges
      return null;
    case 'ring':
    case 'outline':
      if (status === 'primary' && shade >= 300 && shade <= 600) return { name: 'ring' };
      if (shade >= 500 && shade <= 700) return { name: status };
      if (shade >= 100 && shade <= 200 && opacity == null) return { name: status === 'primary' ? 'ring' : status, opacity: 20 };
      return null;
    default:
      return null; // from-/via-/to- gradients, ring-offset
  }
}

// An element painted with a gradient or white text sits on a colored surface: its colors are
// deliberate, so the whole literal is left for review.
const COLORED_SURFACE = new RegExp(
  `^!?(?:(?!dark:)[\\w-]+:)*(?:text-white(?:/\\d+)?|bg-(?!gradient-to-)[\\w-]*gradient[\\w-]*|(?:from|via|to)-(?:black|(?:${FAMILIES})-(?:[2-9]00|950))(?:/\\d+)?)$`,
);
// Small white dots / switch knobs sit on colored tracks.
const WHITE_DOT = /(^|\s)rounded-full\b/;
const SMALL_SIZE = /(^|\s)(h|w|size)-(0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6)\b/;

/**
 * Token for a hover:/focus:/active: class whose plain mapping is missing or would equal the base
 * class (e.g. bg-indigo-50 hover:bg-indigo-100 → both primary-soft). Uses opacity for the effect.
 */
function stateTokenFor({ utility, family, shade }) {
  const kind = utility.startsWith('border') ? 'border' : utility;
  if (NEUTRAL.has(family)) {
    if (kind === 'bg' && shade === 100) return { name: 'secondary' };
    if (kind === 'bg' && shade >= 200 && shade <= 300) return { name: 'input', opacity: 60 }; // a step above secondary
    if (kind === 'border' && shade === 400) return { name: 'subtle-foreground', opacity: 60 };
    return null;
  }
  const status = STATUS[family];
  if (!status) return null;
  if (kind === 'bg' && (shade === 50 || shade === 100 || shade === 200)) return { name: status, opacity: 15 };
  if (kind === 'bg' && status === 'primary' && shade === 700) return { name: 'primary', opacity: 90 };
  if (kind === 'text' && shade >= 600 && shade <= 900) return { name: status, opacity: 80 };
  if (kind === 'border' && shade >= 300 && shade <= 500) return { name: status === 'primary' ? 'ring' : status, opacity: 60 };
  if (kind === 'ring' && shade >= 100 && shade <= 300) return { name: status === 'primary' ? 'ring' : status, opacity: 20 };
  return null;
}

/** True when the literal's base (no-variant) class for the same utility maps to `value`. */
function sameAsBase(words, p, value, pieces) {
  return words.some((o) => {
    if (pieces[o.index] === `${p.utility}-${value}`) return true; // base already converted
    const b = o.parsed;
    if (!b || b.variants.length || b.utility !== p.utility) return false;
    const t = tokenFor(b);
    return t && withOpacity(t.name, b.opacity, t.opacity) === value;
  });
}

/** Pale gradient stop → surface token (saturated stops are brand art and stay raw). */
function softStop(family, shade) {
  if (family === 'white') return { name: 'card' };
  if (shade == null || shade > 100) return null;
  if (NEUTRAL.has(family)) return { name: shade === 50 ? 'muted' : 'secondary' };
  if (['violet', 'purple', 'fuchsia'].includes(family)) return { name: 'accent-soft' };
  const status = STATUS[family];
  return status ? { name: `${status}-soft` } : null;
}

/** Rewrites one class string. Returns { text, converted, unmapped: [token] }. */
export function convertClasses(text, { partialFirst = false, partialLast = false } = {}) {
  const coloredSurface = text.split(/\s+/).some((w) => COLORED_SURFACE.test(w));
  const whiteDot = WHITE_DOT.test(text) && SMALL_SIZE.test(text);
  const pieces = text.split(/(\s+)/); // even = word, odd = whitespace
  const words = [];
  for (let i = 0; i < pieces.length; i += 2) {
    if (!pieces[i]) continue;
    const edge = (i === 0 && partialFirst) || (i === pieces.length - 1 && partialLast);
    words.push({ index: i, parsed: edge ? null : parseClass(pieces[i]) });
  }
  const darks = words.filter((w) => w.parsed?.variants.includes('dark'));
  const unmapped = [];
  let converted = 0;
  const removed = new Set();

  for (const w of words) {
    const p = w.parsed;
    if (!p || p.variants.includes('dark')) continue;
    const variantKey = p.variants.join(':');
    const partners = darks.filter((d) => {
      const dv = d.parsed.variants.filter((v) => v !== 'dark').join(':');
      return d.parsed.utility === p.utility && dv === variantKey && !removed.has(d.index);
    });
    let token = coloredSurface || (whiteDot && p.family === 'white') ? null : tokenFor(p);
    if (!coloredSurface && p.variants.length && (!token || sameAsBase(words, p, withOpacity(token.name, p.opacity, token.opacity), pieces))) {
      const state = stateTokenFor(p);
      if (state) token = { ...state, state: true };
    }
    if (!token) {
      // text-white & co. without a dark partner are deliberate (colored buttons); only report pairs
      if (partners.length || (!coloredSurface && p.family !== 'white')) unmapped.push(p.token);
      continue;
    }
    // A state token sets its own strength; the old class's opacity was tuned for the old shade.
    const value = withOpacity(token.name, token.state ? null : p.opacity, token.opacity);
    // hover:/focus: shade that lands on the same token as the base class would lose its effect.
    if (p.variants.length && sameAsBase(words, p, value, pieces)) {
      unmapped.push(p.token);
      continue;
    }
    const prefix = p.variants.length ? `${p.variants.join(':')}:` : '';
    pieces[w.index] = `${p.important}${prefix}${p.utility}-${value}`;
    for (const d of partners) removed.add(d.index);
    converted++;
  }
  for (const d of darks) if (!removed.has(d.index)) unmapped.push(d.parsed.token);

  // Drop removed words with one adjacent whitespace run.
  for (const index of [...removed].sort((a, b) => b - a)) {
    if (index > 0) pieces.splice(index - 1, 2);
    else pieces.splice(index, 2);
  }
  return { text: pieces.join(''), converted: converted + removed.size, unmapped };
}

// ---------------------------------------------------------------------------------------------
// Self-test
// ---------------------------------------------------------------------------------------------
function selfTest() {
  const cases = [
    ['bg-white dark:bg-slate-900', 'bg-card'],
    ['rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4', 'rounded-2xl border border-border bg-card p-4'],
    ['text-slate-900 dark:text-white', 'text-foreground'],
    ['text-slate-500 dark:text-slate-400', 'text-muted-foreground'],
    ['text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white', 'text-secondary-foreground hover:text-foreground'],
    ['bg-slate-50/60', 'bg-muted/60'],
    ['border-slate-200/80 dark:border-slate-800/80', 'border-border/80'],
    ['border-slate-100', 'border-border/60'],
    ['bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400', 'bg-success-soft text-success'],
    ['border-amber-200 dark:border-amber-800', 'border-warning/30'],
    ['hover:bg-slate-100 dark:hover:bg-slate-800', 'hover:bg-secondary'],
    ['focus:ring-indigo-500 focus:border-indigo-500', 'focus:ring-ring focus:border-ring'],
    ['placeholder:text-slate-400', 'placeholder:text-subtle-foreground'],
    ['bg-indigo-600 text-white hover:bg-indigo-700', 'bg-indigo-600 text-white hover:bg-indigo-700'],
    ['bg-indigo-600 hover:bg-indigo-500', 'bg-primary hover:bg-indigo-500'],
    ['bg-indigo-50 group-hover:bg-indigo-100', 'bg-primary-soft group-hover:bg-primary/15'],
    ['text-indigo-600 hover:text-indigo-800', 'text-primary hover:text-primary/80'],
    ['bg-indigo-600 hover:bg-indigo-700', 'bg-primary hover:bg-primary/90'],
    ['hover:bg-slate-200/60 dark:hover:bg-slate-700', 'hover:bg-input/60'],
    ['bg-secondary hover:bg-slate-200 dark:hover:bg-slate-700', 'bg-secondary hover:bg-input/60'],
    ['bg-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700', 'bg-secondary hover:bg-input/60'],
    ['focus:border-rose-400 focus:ring-rose-200', 'focus:border-danger/60 focus:ring-danger/20'],
    ['bg-slate-50 hover:bg-slate-100', 'bg-muted hover:bg-secondary'],
    ['bg-brand-gradient text-white', 'bg-brand-gradient text-white'],
    ['bg-white/10 text-white', 'bg-white/10 text-white'],
    ['from-indigo-500 to-violet-600', 'from-indigo-500 to-violet-600'],
    ['border border-slate-200/90 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-white', 'border border-border/90 bg-gradient-to-r from-muted via-primary-soft/20 to-card'],
    ['bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950 dark:to-violet-950', 'bg-gradient-to-br from-primary-soft to-accent-soft'],
    ['bg-gradient-to-r from-indigo-600 to-violet-600 text-white', 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white'],
    ['dark:bg-slate-900', 'dark:bg-slate-900'],
    ['!text-slate-500', '!text-muted-foreground'],
    ['group-hover:text-rose-600 dark:group-hover:text-rose-400', 'group-hover:text-danger'],
    ['bg-gradient-to-r from-indigo-600 to-violet-600 text-white ring-2 ring-indigo-500/20', 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white ring-2 ring-indigo-500/20'],
    ['inline-block h-5 w-5 rounded-full bg-white shadow', 'inline-block h-5 w-5 rounded-full bg-white shadow'],
    ['h-12 w-12 rounded-full bg-white', 'h-12 w-12 rounded-full bg-card'],
    ['h-3.5 w-3.5 text-amber-500', 'h-3.5 w-3.5 text-amber-500'],
    ['bg-indigo-50 text-indigo-900', 'bg-primary-soft text-primary'],
    ['text-purple-700 bg-purple-50 border-purple-200 ring-1 ring-violet-100', 'text-accent bg-accent-soft border-accent/30 ring-1 ring-accent/20'],
    ['border-2 border-indigo-600', 'border-2 border-primary'],
    ['h-2 rounded-full bg-slate-200', 'h-2 rounded-full bg-border'],
    ['bg-orange-50 text-orange-700 ring-1 ring-indigo-100', 'bg-warning-soft text-warning ring-1 ring-ring/20'],
    ['border-indigo-200/60 dark:border-indigo-800', 'border-primary/20'],
  ];
  let failed = 0;
  for (const [input, expected] of cases) {
    const { text } = convertClasses(input);
    if (text !== expected) {
      failed++;
      console.error(`FAIL  ${input}\n  got      ${text}\n  expected ${expected}`);
    }
  }
  const partial = convertClasses('bg-white text-', { partialLast: true }).text;
  if (partial !== 'bg-card text-') {
    failed++;
    console.error(`FAIL  partial template edge: ${partial}`);
  }
  console.log(failed ? `self-test: ${failed} failure(s)` : `self-test: ${cases.length + 1} cases pass`);
  process.exit(failed ? 1 : 0);
}

// ---------------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------------
const argv = process.argv.slice(2);
const opt = { dryRun: false, verbose: false, targets: [] };
for (const arg of argv) {
  if (arg === '--dry-run') opt.dryRun = true;
  else if (arg === '--verbose') opt.verbose = true;
  else if (arg === '--self-test') selfTest();
  else opt.targets.push(arg);
}
if (opt.targets.length === 0) {
  console.error('usage: node scripts/theme-tokens.mjs [--dry-run] [--verbose] <file-or-dir> [...]  |  --self-test');
  process.exit(2);
}

const ROOT = process.cwd();
const allowlistPath = path.join(ROOT, 'scripts/theme-allowlist.json');
// Whole-file entries (no "allowed" list) are skipped; class-level entries are still converted.
const skipped = new Set(
  (fs.existsSync(allowlistPath) ? JSON.parse(fs.readFileSync(allowlistPath, 'utf8')).files ?? [] : [])
    .filter((e) => !e.allowed)
    .map((e) => path.resolve(ROOT, e.file)),
);

function listFiles(target) {
  const abs = path.resolve(ROOT, target);
  if (!fs.existsSync(abs)) throw new Error(`not found: ${target}`);
  if (fs.statSync(abs).isFile()) return [abs];
  return fs
    .readdirSync(abs, { withFileTypes: true })
    .flatMap((d) => (d.isDirectory() ? listFiles(path.join(abs, d.name)) : /\.tsx?$/.test(d.name) ? [path.join(abs, d.name)] : []));
}
const targetFiles = [...new Set(opt.targets.flatMap(listFiles))];

// A literal is a class list when every word looks like a Tailwind class and one is a color class.
const CLASS_WORD = /^!?(?:[a-z0-9@[\]&>*_.%#=()'-]+:)*-?[a-z][a-z0-9-]*(?:-\[[^\]\s]+\]|\/[0-9.]+|\.[0-9]+)*(?:\/[0-9]+)?$/;
const looksLikeClasses = (text) => {
  const words = text.split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every((w) => CLASS_WORD.test(w)) && words.some((w) => parseClass(w));
};

function processFile(file) {
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edits = [];
  const unmapped = [];
  let converted = 0;

  const handle = (start, end, opts) => {
    const raw = source.slice(start, end);
    // Only template parts can be partial; a whole literal with no class-like words is skipped.
    const probe = raw.split(/\s+/).filter(Boolean);
    const inner = probe.slice(opts.partialFirst ? 1 : 0, opts.partialLast ? -1 : undefined).join(' ');
    if (!looksLikeClasses(inner)) return;
    const result = convertClasses(raw, opts);
    converted += result.converted;
    const { line } = sf.getLineAndCharacterOfPosition(start);
    for (const token of result.unmapped) unmapped.push({ line: line + 1, token });
    if (result.text !== raw) edits.push({ start, end, text: result.text });
  };

  const visit = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const start = node.getStart(sf) + 1;
      const end = node.end - 1;
      if (source.slice(start, end) === node.text) handle(start, end, {});
    } else if (ts.isTemplateExpression(node)) {
      const parts = [node.head, ...node.templateSpans.map((s) => s.literal)];
      parts.forEach((part, i) => {
        const start = part.getStart(sf) + 1; // after ` or }
        const end = part.end - (i === parts.length - 1 ? 1 : 2); // before ` or ${
        const text = source.slice(start, end);
        handle(start, end, { partialFirst: i > 0 && !/^\s/.test(text), partialLast: i < parts.length - 1 && !/\s$/.test(text) });
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  if (edits.length && !opt.dryRun) {
    let out = source;
    for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
    fs.writeFileSync(file, out);
  }
  return { converted, unmapped };
}

let totalConverted = 0;
let totalUnmapped = 0;
const rows = [];
for (const file of targetFiles) {
  if (skipped.has(file)) {
    rows.push({ file, skipped: true });
    continue;
  }
  const { converted, unmapped } = processFile(file);
  totalConverted += converted;
  totalUnmapped += unmapped.length;
  if (converted || unmapped.length) rows.push({ file, converted, unmapped });
}

console.log(`\n${opt.dryRun ? '[dry run] ' : ''}${targetFiles.length} file(s) scanned\n`);
for (const row of rows) {
  const rel = path.relative(ROOT, row.file);
  if (row.skipped) {
    console.log(`  skip  ${rel} (theme-allowlist.json)`);
    continue;
  }
  console.log(`  ${String(row.converted).padStart(4)} converted  ${String(row.unmapped.length).padStart(4)} to review  ${rel}`);
  if (opt.verbose || opt.dryRun) {
    const byToken = new Map();
    for (const { line, token } of row.unmapped) byToken.set(token, [...(byToken.get(token) ?? []), line]);
    for (const [token, lines] of [...byToken].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`          ${token}  (line ${lines.join(', ')})`);
    }
  }
}
console.log(`\n${totalConverted} class(es) ${opt.dryRun ? 'would be ' : ''}converted, ${totalUnmapped} left for manual review.`);
