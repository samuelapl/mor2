#!/usr/bin/env node
/**
 * Moves inline bilingual UI text into src/lib/i18n/locales/{en,am}/<ns>.json and rewrites
 * the code to t('key').
 *
 *   node scripts/i18n-extract.mjs --ns sessions [--dry-run] <file-or-dir> [...]
 *
 * Converts (when both sides are string/template literals):
 *   tBilingual('English', 'አማርኛ')          tBilingual({ en: '…', am: '…' })      tBilingual('Same')
 *   isAmharic ? 'አማርኛ' : 'English'         lang === 'am' ? … : …                 isEnglish ? … : …
 * Template literals become placeholders: `Created ${rows.length}` → "Created {count}" + t(key, { count: rows.length }).
 *
 * Only text whose language comes from the UI language (useTranslation() / the locale store) is
 * converted. Everything else is listed in the report for manual conversion, as are spots where a
 * local `t` would shadow the hook's `t`.
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// ---------------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------------
const argv = process.argv.slice(2);
const opt = { ns: null, dryRun: false, targets: [] };
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--ns') opt.ns = argv[++i];
  else if (argv[i] === '--dry-run') opt.dryRun = true;
  else opt.targets.push(argv[i]);
}
if (!opt.ns || opt.targets.length === 0) {
  console.error('usage: node scripts/i18n-extract.mjs --ns <namespace> [--dry-run] <file-or-dir> [...]');
  process.exit(2);
}

const ROOT = process.cwd();
const LOCALES = path.join(ROOT, 'src/lib/i18n/locales');
const NS = opt.ns;
for (const lang of ['en', 'am']) {
  if (!fs.existsSync(path.join(LOCALES, lang, `${NS}.json`))) {
    console.error(`unknown namespace "${NS}" (no locales/${lang}/${NS}.json)`);
    process.exit(2);
  }
}

function listFiles(target) {
  const abs = path.resolve(ROOT, target);
  if (!fs.existsSync(abs)) throw new Error(`not found: ${target}`);
  if (fs.statSync(abs).isFile()) return [abs];
  return fs
    .readdirSync(abs, { withFileTypes: true })
    .flatMap((d) => (d.isDirectory() ? listFiles(path.join(abs, d.name)) : /\.tsx?$/.test(d.name) ? [path.join(abs, d.name)] : []));
}
const targetFiles = [...new Set(opt.targets.flatMap(listFiles))].filter((f) => !f.includes(`${path.sep}lib${path.sep}i18n${path.sep}`));

// ---------------------------------------------------------------------------------------------
// Catalog (namespace JSON) handling
// ---------------------------------------------------------------------------------------------
const readJson = (lang) => JSON.parse(fs.readFileSync(path.join(LOCALES, lang, `${NS}.json`), 'utf8'));
const catalog = { en: readJson('en'), am: readJson('am') };

function flatten(obj, prefix = '', out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flatten(v, p, out);
    else out.set(p, v);
  }
  return out;
}
const pairIndex = new Map(); // `${en}\0${am}` → key
const englishIndex = new Map(); // en → Set(key)
for (const [key, en] of flatten(catalog.en)) {
  const am = flatten(catalog.am).get(key);
  pairIndex.set(`${en}\0${am}`, key);
  if (!englishIndex.has(en)) englishIndex.set(en, new Set());
  englishIndex.get(en).add(key);
}
const keyExists = (key) => flatten(catalog.en).has(key) || hasNode(catalog.en, key);
function hasNode(obj, key) {
  let node = obj;
  for (const part of key.split('.')) {
    if (!node || typeof node !== 'object' || !(part in node)) return false;
    node = node[part];
  }
  return true;
}
function setKey(obj, key, value) {
  const parts = key.split('.');
  let node = obj;
  for (const part of parts.slice(0, -1)) {
    if (!(part in node)) node[part] = {};
    node = node[part];
  }
  node[parts.at(-1)] = value;
}

const conflicts = [];
function keyFor(scope, en, am) {
  const existing = pairIndex.get(`${en}\0${am}`);
  if (existing) return { key: existing, reused: true };
  let top = scope;
  if (typeof catalog.en[top] === 'string') top = `${top}Text`;
  const base = `${top}.${slugOf(en)}`;
  let key = base;
  for (let n = 2; keyExists(key); n++) key = `${base}${n}`;
  setKey(catalog.en, key, en);
  setKey(catalog.am, key, am);
  pairIndex.set(`${en}\0${am}`, key);
  const sameEnglish = englishIndex.get(en);
  if (sameEnglish && sameEnglish.size) conflicts.push({ en, keys: [...sameEnglish, key] });
  if (!sameEnglish) englishIndex.set(en, new Set());
  englishIndex.get(en).add(key);
  return { key, reused: false };
}

function slugOf(text) {
  const words = text
    .replace(/\{\w+\}/g, ' ')
    .match(/[A-Za-z0-9]+/g);
  if (!words) return 'text';
  const slug = words
    .slice(0, 6)
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join('');
  return (/^[0-9]/.test(slug) ? `n${slug}` : slug).slice(0, 40);
}

// ---------------------------------------------------------------------------------------------
// TypeScript program
// ---------------------------------------------------------------------------------------------
function createProgram() {
  const configPath = path.join(ROOT, 'tsconfig.json');
  const parsed = ts.getParsedCommandLineOfConfigFile(configPath, {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} });
  return ts.createProgram(parsed.fileNames, parsed.options);
}

const unwrap = (n) => {
  while (n && (ts.isParenthesizedExpression(n) || ts.isAsExpression(n))) n = n.expression;
  return n;
};
const calleeName = (call) => (ts.isIdentifier(call.expression) ? call.expression.text : null);

/** The `const { … } = useTranslation(…)` declaration a binding element comes from, if any. */
function hookDeclOf(decl) {
  if (!decl || !ts.isBindingElement(decl)) return null;
  const pattern = decl.parent;
  const varDecl = pattern?.parent;
  if (!ts.isObjectBindingPattern(pattern) || !varDecl || !ts.isVariableDeclaration(varDecl)) return null;
  const init = unwrap(varDecl.initializer);
  if (init && ts.isCallExpression(init) && calleeName(init) === 'useTranslation') return varDecl;
  return null;
}

/**
 * Resolves a language identifier (isAmharic / isEnglish / lang) to where its value comes from.
 * Returns { hookDecl } (from useTranslation), { anchor } (a locale/auth store selector statement
 * after which a useTranslation() call can be inserted), or null (prop, parameter, other).
 */
function uiLanguageSource(checker, ident, depth = 0) {
  if (depth > 4) return null;
  const sym = checker.getSymbolAtLocation(ident);
  const decl = sym?.declarations?.[0];
  if (!decl) return null;
  const hookDecl = hookDeclOf(decl);
  if (hookDecl) return { hookDecl };
  if (ts.isVariableDeclaration(decl) && decl.initializer) {
    const init = unwrap(decl.initializer);
    if (ts.isCallExpression(init) && ['useLocaleStore', 'useAuthStore'].includes(calleeName(init))) {
      const selector = init.arguments[0];
      if (selector && /\.lang\b/.test(selector.getText())) return { anchor: decl.parent.parent };
      return null;
    }
    if (ts.isBinaryExpression(init) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(init.operatorToken.kind)) {
      const side = ts.isIdentifier(init.left) ? init.left : ts.isIdentifier(init.right) ? init.right : null;
      if (side) return uiLanguageSource(checker, side, depth + 1);
    }
  }
  return null;
}

/** Reads a string-ish expression: { text, parts: [{ name, expr }] } with {name} placeholders. */
function readText(node, sf, names) {
  node = unwrap(node);
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return { text: node.text, exprs: [] };
  if (ts.isTemplateExpression(node)) {
    let text = node.head.text;
    const exprs = [];
    for (const span of node.templateSpans) {
      const exprText = span.expression.getText(sf);
      text += `{${placeholderName(span.expression, exprText, names)}}${span.literal.text}`;
      exprs.push(exprText);
    }
    return { text, exprs };
  }
  return null;
}

function placeholderName(expr, exprText, names) {
  if (names.has(exprText)) return names.get(exprText);
  let base = 'value';
  const e = unwrap(expr);
  if (ts.isIdentifier(e)) base = e.text;
  else if (ts.isPropertyAccessExpression(e)) base = e.name.text === 'length' ? 'count' : e.name.text;
  let name = base;
  const used = new Set(names.values());
  for (let n = 2; used.has(name); n++) name = `${base}${n}`;
  names.set(exprText, name);
  return name;
}

/** Name of the outermost named function (the component/hook), else the file name. */
function scopeName(node, sf) {
  let name = null;
  for (let n = node.parent; n; n = n.parent) {
    if ((ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n) || ts.isClassDeclaration(n)) && n.name) name = n.name.getText(sf);
    else if ((ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && ts.isVariableDeclaration(n.parent) && ts.isIdentifier(n.parent.name)) name = n.parent.name.text;
  }
  if (!name) name = path.basename(sf.fileName).replace(/\.(tsx?|jsx?)$/, '').replace(/[^A-Za-z0-9]+(.)/g, (_, c) => c.toUpperCase());
  name = name.replace(/[^A-Za-z0-9]/g, '');
  return name[0].toLowerCase() + name.slice(1);
}

// ---------------------------------------------------------------------------------------------
// One pass over the target files
// ---------------------------------------------------------------------------------------------
const report = { converted: [], skipped: [] };

function runPass() {
  const program = createProgram();
  const checker = program.getTypeChecker();
  let edited = 0;

  for (const file of targetFiles) {
    const sf = program.getSourceFile(file);
    if (!sf) continue;
    const rel = path.relative(ROOT, file);
    const loc = (n) => `${rel}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`;
    const quote = /from "/.test(sf.text) && !/from '/.test(sf.text) ? '"' : "'";
    const sites = [];

    const skip = (n, why) => report.skipped.push({ at: loc(n), why, code: n.getText(sf).slice(0, 110).replace(/\s+/g, ' ') });

    const visit = (node) => {
      if (ts.isCallExpression(node)) {
        if (calleeName(node) === 'tBilingual') collectTBilingual(node);
        else if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'tBilingual') skip(node, 'tBilingual called as a member — convert by hand');
      } else if (ts.isConditionalExpression(node)) collectTernary(node);
      ts.forEachChild(node, visit);
    };

    const collectTBilingual = (call) => {
      const hookDecl = hookDeclOf(checker.getSymbolAtLocation(call.expression)?.declarations?.[0]);
      if (!hookDecl) return skip(call, 'tBilingual is not from useTranslation() here (prop/param) — pass `t` instead');
      const names = new Map();
      let en, am;
      const [a0, a1] = call.arguments;
      const obj = unwrap(a0);
      if (call.arguments.length === 1 && obj && ts.isObjectLiteralExpression(obj)) {
        const prop = (k) => obj.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText(sf) === k)?.initializer;
        en = readText(prop('en'), sf, names);
        am = readText(prop('am'), sf, names);
      } else {
        en = readText(a0, sf, names);
        am = call.arguments.length >= 2 ? readText(a1, sf, names) : en;
      }
      if (!en || !am) return skip(call, 'tBilingual arguments are not plain text');
      addSite(call, en, am, { hookDecl }, names, call.arguments.length === 1 && !ts.isObjectLiteralExpression(obj));
    };

    const collectTernary = (cond) => {
      let test = unwrap(cond.condition);
      let negate = false;
      if (ts.isPrefixUnaryExpression(test) && test.operator === ts.SyntaxKind.ExclamationToken) {
        negate = true;
        test = unwrap(test.operand);
      }
      let ident = null;
      let amFirst;
      if (ts.isIdentifier(test) && (test.text === 'isAmharic' || test.text === 'isEnglish')) {
        ident = test;
        amFirst = test.text === 'isAmharic';
      } else if (ts.isBinaryExpression(test)) {
        const op = test.operatorToken.kind;
        const eq = [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(op);
        const ne = [ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(op);
        const lit = [test.left, test.right].find((s) => ts.isStringLiteral(s) && (s.text === 'am' || s.text === 'en'));
        const id = [test.left, test.right].find((s) => ts.isIdentifier(s) && s.text === 'lang');
        if ((eq || ne) && lit && id) {
          ident = id;
          amFirst = (lit.text === 'am') === eq;
        }
      }
      if (!ident) return;
      if (negate) amFirst = !amFirst;
      const names = new Map();
      const first = readText(cond.whenTrue, sf, names);
      const second = readText(cond.whenFalse, sf, names);
      if (!first || !second) return; // not text (JSX, numbers, class names…) — leave alone
      const source = uiLanguageSource(checker, ident);
      if (!source) return skip(cond, `\`${ident.text}\` is not the UI language here (prop/param?) — convert by hand`);
      addSite(cond, amFirst ? second : first, amFirst ? first : second, source, names, false);
    };

    const addSite = (node, en, am, source, names, enOnly) => {
      if ([...en.exprs].sort().join('\0') !== [...am.exprs].sort().join('\0')) return skip(node, 'English and Amharic interpolate different values');
      // A local `t` (other than the hook's) would shadow the one we add.
      const tSym = checker.getSymbolsInScope(node, ts.SymbolFlags.Value).find((s) => s.name === 't');
      if (tSym) {
        const d = tSym.declarations?.[0];
        if (!(source.hookDecl && d && hookDeclOf(d) === source.hookDecl)) return skip(node, 'a local `t` is in scope here — convert by hand');
      }
      sites.push({ node, en, am, source, names, enOnly, scope: scopeName(node, sf) });
    };

    visit(sf);

    // Nested sites (text inside text) are done innermost first; the outer one waits for the next pass.
    const ready = sites.filter((s) => !sites.some((o) => o !== s && s.node.getStart(sf) <= o.node.getStart(sf) && s.node.end >= o.node.end));

    // Hook declarations that get a namespaced `t`.
    const hookPlans = new Map(); // VariableDeclaration → { ok }
    const anchorPlans = new Map(); // statement → true
    for (const s of ready) {
      if (s.source.hookDecl && !hookPlans.has(s.source.hookDecl)) {
        const call = unwrap(s.source.hookDecl.initializer);
        const arg = call.arguments[0];
        const ok = !arg || (ts.isStringLiteral(arg) && arg.text === NS);
        hookPlans.set(s.source.hookDecl, { ok, call, hasArg: Boolean(arg) });
      }
    }
    const edits = [];
    for (const s of ready) {
      if (s.source.hookDecl && !hookPlans.get(s.source.hookDecl).ok) {
        skip(s.node, `useTranslation() here already uses another namespace than "${NS}"`);
        continue;
      }
      if (s.source.anchor) anchorPlans.set(s.source.anchor, true);
      const { key, reused } = keyFor(s.scope, s.en.text, s.am.text);
      const vars = [...s.names.entries()].map(([expr, name]) => (expr === name ? name : `${name}: ${expr}`));
      const call = vars.length ? `t(${quote}${key}${quote}, { ${vars.join(', ')} })` : `t(${quote}${key}${quote})`;
      edits.push({ start: s.node.getStart(sf), end: s.node.end, text: call });
      report.converted.push({ at: loc(s.node), key: `${NS}.${key}`, en: s.en.text, am: s.am.text, reused, enOnly: s.enOnly });
    }
    if (!edits.length) continue;
    const replaced = edits.map((e) => [e.start, e.end]);
    const inReplaced = (n) => replaced.some(([a, b]) => n.getStart(sf) >= a && n.end <= b);

    // Destructures: add `t`, set the namespace, drop `tBilingual` when nothing uses it anymore.
    for (const [decl, plan] of hookPlans) {
      if (!plan.ok) continue;
      const pattern = decl.name;
      const tbElement = pattern.elements.find((e) => e.name.getText(sf) === 'tBilingual');
      let tbStillUsed = false;
      const depsEdits = [];
      if (tbElement) {
        const tbSym = checker.getSymbolAtLocation(tbElement.name);
        const scan = (n) => {
          if (ts.isIdentifier(n) && n.text === 'tBilingual' && n !== tbElement.name && checker.getSymbolAtLocation(n) === tbSym && !inReplaced(n)) {
            const arr = n.parent;
            const hookCall = arr?.parent;
            if (ts.isArrayLiteralExpression(arr) && hookCall && ts.isCallExpression(hookCall) && ['useCallback', 'useMemo', 'useEffect', 'useLayoutEffect'].includes(calleeName(hookCall))) {
              const hasT = arr.elements.some((e) => ts.isIdentifier(e) && e.text === 't');
              depsEdits.push({ start: n.getStart(sf), end: n.end, text: hasT ? 'tBilingual' : 't', keep: hasT });
              if (hasT) tbStillUsed = true;
            } else tbStillUsed = true;
          }
          ts.forEachChild(n, scan);
        };
        scan(sf);
      }
      for (const d of depsEdits) if (!d.keep) edits.push(d);
      const names = pattern.elements.map((e) => e.getText(sf)).filter((txt) => !(txt === 'tBilingual' && !tbStillUsed));
      if (!pattern.elements.some((e) => e.name.getText(sf) === 't')) names.push('t');
      const multiline = pattern.getText(sf).includes('\n');
      let patternText;
      if (multiline) {
        const indent = sf.text.slice(sf.text.lastIndexOf('\n', pattern.elements[0].getStart(sf)) + 1, pattern.elements[0].getStart(sf));
        const closeIndent = indent.slice(2);
        patternText = `{\n${names.map((n) => `${indent}${n},`).join('\n')}\n${closeIndent}}`;
      } else patternText = `{ ${names.join(', ')} }`;
      edits.push({ start: pattern.getStart(sf), end: pattern.end, text: patternText });
      if (!plan.hasArg) {
        const call = plan.call;
        edits.push({ start: call.arguments.pos, end: call.arguments.end, text: `${quote}${NS}${quote}` });
      }
    }

    // Language from a store selector: add `const { t } = useTranslation('ns')` right after it.
    let needsImport = false;
    for (const stmt of anchorPlans.keys()) {
      const lineStart = sf.text.lastIndexOf('\n', stmt.getStart(sf)) + 1;
      const indent = sf.text.slice(lineStart, stmt.getStart(sf));
      edits.push({ start: stmt.end, end: stmt.end, text: `\n${indent}const { t } = useTranslation(${quote}${NS}${quote});` });
      needsImport = true;
    }
    if (needsImport && !/import\s*\{[^}]*\buseTranslation\b[^}]*\}\s*from/.test(sf.text)) {
      const imports = sf.statements.filter(ts.isImportDeclaration);
      const pos = imports.length ? imports.at(-1).end : 0;
      edits.push({ start: pos, end: pos, text: `\nimport { useTranslation } from ${quote}@/lib/i18n/useTranslation${quote};` });
    }

    edits.sort((a, b) => b.start - a.start || b.end - a.end);
    for (let i = 1; i < edits.length; i++) {
      if (edits[i].end > edits[i - 1].start) throw new Error(`overlapping edits in ${rel} at ${edits[i].start}`);
    }
    let text = sf.text;
    for (const e of edits) text = text.slice(0, e.start) + e.text + text.slice(e.end);
    if (!opt.dryRun) fs.writeFileSync(file, text);
    edited += edits.length;
  }
  return edited;
}

// ---------------------------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------------------------
const MAX_PASSES = opt.dryRun ? 1 : 5;
for (let pass = 1; pass <= MAX_PASSES; pass++) {
  const skippedBefore = report.skipped.length;
  const edited = runPass();
  if (pass < MAX_PASSES && edited > 0) report.skipped.length = skippedBefore; // re-reported by the next pass
  if (edited === 0) break;
}

if (!opt.dryRun) {
  for (const lang of ['en', 'am']) {
    fs.writeFileSync(path.join(LOCALES, lang, `${NS}.json`), `${JSON.stringify(catalog[lang], null, 2)}\n`);
  }
  // Self-check: every converted string reads back exactly from the files just written.
  const written = { en: flatten(readJson('en')), am: flatten(readJson('am')) };
  const bad = report.converted.filter((c) => {
    const key = c.key.slice(NS.length + 1);
    return written.en.get(key) !== c.en || written.am.get(key) !== c.am;
  });
  if (bad.length) {
    console.error(`SELF-CHECK FAILED for ${bad.length} string(s):`, bad.slice(0, 5));
    process.exit(1);
  }
}

// Report
const newKeys = report.converted.filter((c) => !c.reused).length;
console.log(`\n${opt.dryRun ? '[dry run] ' : ''}namespace "${NS}" — ${targetFiles.length} file(s)`);
console.log(`  converted: ${report.converted.length} (${newKeys} new keys, ${report.converted.length - newKeys} reused)`);
console.log(`  English-only (no Amharic in the original): ${report.converted.filter((c) => c.enOnly).length}`);
console.log(`  same English, different Amharic (review): ${conflicts.length}`);
console.log(`  skipped (convert by hand): ${report.skipped.length}`);
if (!opt.dryRun) console.log('  self-check: every converted string matches the JSON exactly');
if (process.env.I18N_VERBOSE || opt.dryRun) {
  for (const c of report.converted) console.log(`    + ${c.at}  ${c.key}${c.reused ? ' (reused)' : ''}${c.enOnly ? ' (en only)' : ''}  "${c.en.slice(0, 60)}"`);
}
for (const c of conflicts) console.log(`    ! "${c.en.slice(0, 60)}" → ${c.keys.join(', ')}`);
for (const s of report.skipped) console.log(`    - ${s.at}  ${s.why}\n        ${s.code}`);
