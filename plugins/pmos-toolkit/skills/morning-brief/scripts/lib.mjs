#!/usr/bin/env node
// morning-brief deterministic core (design 02_design.html#data-model, §H).
// Zero-dependency Node ESM. Owns everything the LLM must NOT do by hand:
//   - store-dir resolution + the never-write-inside-a-code-repo guard (INV-4)
//   - sources.yaml / cursor.yaml parse + validate + atomic serialize (INV-1, D9/D10)
//   - the /mytasks read-only lane (INV-6) — buckets due/overdue/check-ins/waiting-on
//   - manifest count assembly (§7) — script-computed, never LLM-estimated
// Run `node lib.mjs --selftest` to exercise all of the above with inline fixtures.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Store dir + privacy-residency guard (INV-4) ───────────────────────────────

export const DEFAULT_SETTINGS = { first_window_days: 7, carryover_horizon_days: 14 };
const KINDS = new Set(['email', 'calendar', 'doc-comments', 'chat', 'custom']);

// Resolve the store dir WITHOUT creating it. $PMOS_MORNING_BRIEF_DIR wins, else
// ~/.pmos/morning-brief. Never returns a path inside a code repo unchecked —
// callers gate writes through assertWritableStore().
export function resolveStoreDir(env = process.env, home = os.homedir()) {
  const override = env.PMOS_MORNING_BRIEF_DIR;
  return path.resolve(override && override.trim() ? override : path.join(home, '.pmos', 'morning-brief'));
}

// The toplevel of the nearest enclosing git working tree at or above `dir`,
// walking up existing ancestors (dir itself may not exist yet). null if none.
export function enclosingGitToplevel(dir) {
  let cur = path.resolve(dir);
  const root = path.parse(cur).root;
  while (true) {
    try {
      if (fs.existsSync(path.join(cur, '.git'))) return cur;
    } catch { /* unreadable ancestor — keep walking */ }
    if (cur === root) return null;
    const parent = path.dirname(cur);
    if (parent === cur) return null;
    cur = parent;
  }
}

// INV-4: config/state/briefs may live under a git repo ONLY when that repo is the
// user's personal ~/.pmos (or $HOME) store — never inside a code/project repo.
// Throws with a clear message otherwise. Returns the resolved dir on success.
export function assertWritableStore(dir, home = os.homedir()) {
  const resolved = path.resolve(dir);
  const top = enclosingGitToplevel(resolved);
  if (top === null) return resolved; // not in any git tree — fine
  const allowed = new Set([path.resolve(home), path.resolve(path.join(home, '.pmos'))]);
  if (allowed.has(path.resolve(top))) return resolved;
  throw new Error(
    `refusing to write morning-brief data inside a code repository (${top}). ` +
    `INV-4: work-comms content is never written inside a project repo. ` +
    `Unset PMOS_MORNING_BRIEF_DIR or point it outside the repo (default: ~/.pmos/morning-brief).`
  );
}

// Create the store dir (after the guard). Returns the dir.
export function ensureStoreDir(dir, home = os.homedir()) {
  assertWritableStore(dir, home);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ── Minimal, schema-tuned YAML (hand-editable configs — no dependency) ─────────

function stripInlineList(v) {
  // "[a, b, c]" -> ["a","b","c"]; leaves scalars untouched.
  const m = /^\[(.*)\]$/.exec(v.trim());
  if (!m) return null;
  const inner = m[1].trim();
  if (inner === '') return [];
  return inner.split(',').map((s) => unquote(s.trim())).filter((s) => s !== '');
}
function unquote(s) {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}
function scalar(v) {
  const t = v.trim();
  if (t === '') return '';
  const list = stripInlineList(t);
  if (list) return list;
  if (/^-?\d+$/.test(t)) return Number(t);
  return unquote(t);
}
// indent width (spaces) of a raw line
function indentOf(line) { return line.length - line.replace(/^\s+/, '').length; }
// strip a whole-line comment (leading `#`), keep values containing `#` intact
function contentLines(text) {
  return text.split(/\r?\n/).filter((l) => {
    const t = l.trim();
    return t !== '' && !t.startsWith('#');
  });
}

// Parse sources.yaml into { version, settings, sources[] } and validate (D9/D10, INV-3).
export function parseSources(text) {
  const out = { version: 1, settings: { ...DEFAULT_SETTINGS }, sources: [] };
  let mode = null;   // null | 'settings' | 'sources'
  let cur = null;    // current source object
  for (const raw of contentLines(text)) {
    const indent = indentOf(raw);
    const line = raw.trim();
    if (indent === 0) {
      const m = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
      if (!m) throw new Error(`sources.yaml: unparseable top-level line: "${line}"`);
      const [, key, val] = m;
      if (key === 'settings') { mode = 'settings'; }
      else if (key === 'sources') { mode = 'sources'; }
      else if (key === 'version') { out.version = scalar(val); mode = null; }
      else throw new Error(`sources.yaml: unknown top-level key "${key}"`);
      continue;
    }
    if (mode === 'settings') {
      const m = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
      if (!m) throw new Error(`sources.yaml: unparseable settings line: "${line}"`);
      out.settings[m[1]] = scalar(m[2]);
      continue;
    }
    if (mode === 'sources') {
      if (line.startsWith('- ')) {
        cur = {};
        out.sources.push(cur);
        const m = /^-\s+([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
        if (!m) throw new Error(`sources.yaml: unparseable source item: "${line}"`);
        cur[m[1]] = scalar(m[2]);
      } else {
        if (!cur) throw new Error(`sources.yaml: source field before any "- ": "${line}"`);
        const m = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
        if (!m) throw new Error(`sources.yaml: unparseable source field: "${line}"`);
        cur[m[1]] = scalar(m[2]);
      }
      continue;
    }
    throw new Error(`sources.yaml: content outside settings/sources: "${line}"`);
  }
  return validateSources(out);
}

export function validateSources(cfg) {
  const s = cfg.settings || {};
  for (const k of ['first_window_days', 'carryover_horizon_days']) {
    if (s[k] === undefined) s[k] = DEFAULT_SETTINGS[k];
    if (typeof s[k] !== 'number' || !Number.isInteger(s[k]) || s[k] <= 0) {
      throw new Error(`sources.yaml: settings.${k} must be a positive integer`);
    }
  }
  if (!Array.isArray(cfg.sources) || cfg.sources.length === 0) {
    throw new Error('sources.yaml: at least one source must be declared');
  }
  const seen = new Set();
  for (const src of cfg.sources) {
    if (!src.id || typeof src.id !== 'string') throw new Error('sources.yaml: every source needs a non-empty id');
    if (seen.has(src.id)) throw new Error(`sources.yaml: duplicate source id "${src.id}"`);
    seen.add(src.id);
    if (!KINDS.has(src.kind)) throw new Error(`sources.yaml: source "${src.id}" has invalid kind "${src.kind}" (one of ${[...KINDS].join(', ')})`);
    if (!src.connector || typeof src.connector !== 'string') throw new Error(`sources.yaml: source "${src.id}" needs a connector hint`);
    if (typeof src.priority !== 'number') throw new Error(`sources.yaml: source "${src.id}" needs a numeric priority`);
    if (src.dismiss === undefined || src.dismiss === '') src.dismiss = 'none';
    if (src.scope !== undefined && !Array.isArray(src.scope)) src.scope = [String(src.scope)];
  }
  return cfg;
}

export function serializeSources(cfg) {
  const s = cfg.settings || { ...DEFAULT_SETTINGS };
  const lines = ['version: 1', 'settings:',
    `  first_window_days: ${s.first_window_days ?? DEFAULT_SETTINGS.first_window_days}`,
    `  carryover_horizon_days: ${s.carryover_horizon_days ?? DEFAULT_SETTINGS.carryover_horizon_days}`,
    'sources:'];
  for (const src of cfg.sources) {
    lines.push(`  - id: ${src.id}`);
    lines.push(`    kind: ${src.kind}`);
    lines.push(`    connector: ${quoteIfNeeded(src.connector)}`);
    lines.push(`    priority: ${src.priority}`);
    lines.push(`    dismiss: ${src.dismiss ?? 'none'}`);
    if (Array.isArray(src.scope) && src.scope.length) {
      lines.push(`    scope: [${src.scope.map(quoteIfNeeded).join(', ')}]`);
    }
  }
  return lines.join('\n') + '\n';
}
function quoteIfNeeded(v) {
  const s = String(v);
  return /[:#\[\]]|^\s|\s$/.test(s) ? `"${s}"` : s;
}

// ── cursor.yaml (INV-1: the ONLY run-state) ───────────────────────────────────

export function parseCursor(text) {
  const out = { version: 1, last_run: null, high_water: {} };
  let mode = null;
  for (const raw of contentLines(text)) {
    const indent = indentOf(raw);
    const line = raw.trim();
    if (indent === 0) {
      const m = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
      if (!m) throw new Error(`cursor.yaml: unparseable line: "${line}"`);
      const [, key, val] = m;
      if (key === 'high_water') { mode = 'high_water'; }
      else if (key === 'last_run') { out.last_run = val.trim() ? unquote(val) : null; mode = null; }
      else if (key === 'version') { out.version = scalar(val); mode = null; }
      else { mode = null; }
      continue;
    }
    if (mode === 'high_water') {
      const m = /^([A-Za-z_][\w.-]*):\s*(.*)$/.exec(line);
      if (m) out.high_water[m[1]] = unquote(m[2]);
    }
  }
  return out;
}

export function serializeCursor(cur) {
  const lines = ['version: 1', `last_run: ${cur.last_run ?? ''}`];
  const hw = cur.high_water || {};
  const keys = Object.keys(hw);
  if (keys.length) {
    lines.push('high_water:');
    for (const k of keys.sort()) lines.push(`  ${k}: ${quoteIfNeeded(hw[k])}`);
  }
  return lines.join('\n') + '\n';
}

// Atomic write: temp-then-rename(2). On crash the original is intact.
export function writeAtomic(file, content) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(file)}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
  return file;
}

export function readCursor(storeDir) {
  const f = path.join(storeDir, 'cursor.yaml');
  if (!fs.existsSync(f)) return null;
  return parseCursor(fs.readFileSync(f, 'utf8'));
}
export function writeCursor(storeDir, cur, home = os.homedir()) {
  assertWritableStore(storeDir, home);
  return writeAtomic(path.join(storeDir, 'cursor.yaml'), serializeCursor(cur));
}

// ── Sweep window math (§H — never prose arithmetic; D9/D10) ────────────────────

// Given the cursor (or null) and `now`, compute the sweep + carryover window.
// first run (no cursor): reach back first_window_days. carryover reaches
// carryover_horizon_days regardless; items older than that are counted, not shown.
export function computeWindow(cursor, settings, nowIso) {
  const s = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  const now = new Date(nowIso);
  const firstRun = !cursor || !cursor.last_run;
  const from = firstRun
    ? daysBefore(now, s.first_window_days)
    : new Date(cursor.last_run);
  const carryoverFloor = daysBefore(now, s.carryover_horizon_days);
  return {
    from: from.toISOString(),
    to: now.toISOString(),
    first_run: firstRun,
    first_window_days: s.first_window_days,
    carryover_horizon_days: s.carryover_horizon_days,
    carryover_floor: carryoverFloor.toISOString(),
  };
}
function daysBefore(date, n) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}
export function isoDate(iso) { return new Date(iso).toISOString().slice(0, 10); }

// ── /mytasks read-only lane (INV-6) ───────────────────────────────────────────

const ACTIVE = new Set(['pending', 'in-progress', 'waiting']);

// Buckets due / overdue / check-ins / waiting-on from the /mytasks store, READ-ONLY.
// Prefers /mytasks' own lib (byte-compatible read); falls back to a local
// frontmatter reader if that lib can't be resolved. Absent store -> {absent:true}.
export function mytasksLane(tasksDir, todayIso) {
  const today = isoDate(todayIso);
  const itemsDir = path.join(tasksDir, 'items');
  if (!fs.existsSync(itemsDir)) return { absent: true };
  const items = loadMytasksItems(tasksDir, itemsDir);
  const lane = { overdue: [], due: [], checkins: [], waiting: [] };
  for (const it of items) {
    const status = it.status || 'pending';
    const active = ACTIVE.has(status);
    if (active && it.due) {
      const d = String(it.due).slice(0, 10);
      if (d < today) lane.overdue.push(row(it, 'due'));
      else if (d === today) lane.due.push(row(it, 'due'));
    }
    if (active && it.next_checkin && String(it.next_checkin).slice(0, 10) <= today) {
      lane.checkins.push(row(it, 'next_checkin'));
    }
    if (status === 'waiting') lane.waiting.push(row(it, 'due'));
  }
  return lane;
}
function row(it, dateField) {
  return { id: it.id, title: it.title || '(untitled)', when: it[dateField] ? String(it[dateField]).slice(0, 10) : null };
}
function loadMytasksItems(tasksDir, itemsDir) {
  // Preferred path: the /mytasks lib (same files, byte-compatible read).
  try {
    const require = createRequire(import.meta.url);
    const mt = require(path.join(__dirname, '..', '..', 'mytasks', 'scripts', 'lib.js'));
    if (typeof mt.loadAllItems === 'function') {
      return mt.loadAllItems(tasksDir).map((it) => it.fm || it);
    }
  } catch { /* fall through to the local reader */ }
  // Fallback: local frontmatter read (decoupled; used when the sibling lib is absent).
  return fs.readdirSync(itemsDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => parseFrontmatter(fs.readFileSync(path.join(itemsDir, f), 'utf8')));
}
function parseFrontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---/.exec(text);
  const fm = {};
  if (!m) return fm;
  for (const line of m[1].split('\n')) {
    const mm = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (mm) fm[mm[1]] = unquote(mm[2]);
  }
  return fm;
}

// ── Manifest count assembly (§7 — deterministic, script-computed) ──────────────

const TIERS = ['today', 'knowing', 'fyi'];

// Build the manifest from a run-model. Counts are derived here, never estimated.
export function assembleManifest(model) {
  const items = model.items || [];
  const bySource = {};
  for (const src of model.sources || []) {
    bySource[src.id] = {
      id: src.id, kind: src.kind, priority: src.priority,
      status: src.status || 'swept', reason: src.reason || null,
      new: (src.counts && src.counts.new) || 0,
      carryover: (src.counts && src.counts.carryover) || 0,
      beyond_horizon: (src.counts && src.counts.beyond_horizon) || 0,
      shown: { today: 0, knowing: 0, fyi: 0 },
    };
  }
  const noRule = [];
  for (const it of items) {
    const tier = TIERS.includes(it.tier) ? it.tier : 'fyi';
    const s = bySource[it.source];
    if (s) s.shown[tier] += 1;
    if (it.no_rule_matched) noRule.push({ id: it.id, source: it.source, summary: it.summary });
  }
  const sources = (model.sources || []).map((src) => bySource[src.id]);
  const anyFailed = sources.some((s) => s.status === 'failed');
  const totals = {
    swept: sources.filter((s) => s.status !== 'failed').length,
    failed: sources.filter((s) => s.status === 'failed').length,
    items: items.length,
    by_tier: { today: 0, knowing: 0, fyi: 0 },
    no_rule_matched: noRule.length,
    beyond_horizon: sources.reduce((a, s) => a + s.beyond_horizon, 0),
  };
  for (const it of items) {
    const tier = TIERS.includes(it.tier) ? it.tier : 'fyi';
    totals.by_tier[tier] += 1;
  }
  return {
    window: model.window,
    sources,
    totals,
    any_failed: anyFailed,
    no_rule_matched: noRule,
  };
}

// ── rules.md append (story ww7 T5 — observe+correct capture; §H) ───────────────
// The DETERMINISTIC half of rule capture: append a synthesized one-line rule under
// its GTD-4D category heading. The synthesis (turning a confirm-step correction into
// a rule sentence) and the per-rule approval stay LLM judgment in the SKILL body —
// this only does the placement + atomic write. No silent writes: callers gate on the
// user's approval before calling.

export const RULE_CATEGORIES = ['do', 'delegate-reply', 'defer-track', 'drop-FYI'];

// Pure: insert `- <ruleLine>` at the end of the `## <category> …` section. A missing
// heading is appended at EOF (cold-start safety). Returns the updated text; throws on
// an unknown category (the four GTD-4D buckets are the closed set).
export function appendRule(rulesText, category, ruleLine) {
  if (!RULE_CATEGORIES.includes(category)) {
    throw new Error(`appendRule: unknown category "${category}" (one of ${RULE_CATEGORIES.join(', ')})`);
  }
  const bullet = `- ${String(ruleLine).trim()}`;
  const lines = String(rulesText).split('\n');
  const esc = category.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
  const headRe = new RegExp(`^##\\s+${esc}(?=\\s|$)`);
  const hi = lines.findIndex((l) => headRe.test(l));
  if (hi === -1) {
    return String(rulesText).replace(/\n*$/, '\n') + `\n## ${category}\n\n${bullet}\n`;
  }
  let end = lines.length;
  for (let i = hi + 1; i < lines.length; i++) { if (/^##\s/.test(lines[i])) { end = i; break; } }
  let insertAt = end;
  while (insertAt > hi + 1 && lines[insertAt - 1].trim() === '') insertAt--;
  lines.splice(insertAt, 0, bullet);
  return lines.join('\n');
}

// I/O wrapper: append a rule to <storeDir>/rules.md atomically (repo-guarded, INV-4).
// Reads the current file (must exist — seeded on first `rules` use), applies appendRule,
// writes back. Returns the file path.
export function appendRuleToStore(storeDir, category, ruleLine, home = os.homedir()) {
  assertWritableStore(storeDir, home);
  const f = path.join(storeDir, 'rules.md');
  const cur = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '# Morning-brief categorization rules\n';
  return writeAtomic(f, appendRule(cur, category, ruleLine));
}

// ── Selftest ──────────────────────────────────────────────────────────────────

function selftest() {
  let pass = 0, fail = 0;
  const ok = (name, cond) => { if (cond) { pass++; } else { fail++; console.error(`  FAIL: ${name}`); } };
  const throws = (name, fn) => { try { fn(); fail++; console.error(`  FAIL (expected throw): ${name}`); } catch { pass++; } };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mb-lib-'));

  // 1. store-dir resolution
  ok('resolveStoreDir override', resolveStoreDir({ PMOS_MORNING_BRIEF_DIR: '/x/y' }, '/home/u') === path.resolve('/x/y'));
  ok('resolveStoreDir default', resolveStoreDir({}, '/home/u') === path.resolve('/home/u/.pmos/morning-brief'));

  // 2. repo guard (INV-4)
  const repo = path.join(tmp, 'code-repo');
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
  throws('write inside a code repo refused', () => assertWritableStore(path.join(repo, 'sub', 'morning-brief'), tmp));
  const plain = path.join(tmp, 'plain-dir');
  ok('write outside any repo allowed', assertWritableStore(plain, tmp) === path.resolve(plain));
  const pmosHome = path.join(tmp, '.pmos');
  fs.mkdirSync(path.join(pmosHome, '.git'), { recursive: true });
  ok('write inside ~/.pmos allowed', assertWritableStore(path.join(pmosHome, 'morning-brief'), tmp) === path.resolve(path.join(pmosHome, 'morning-brief')));

  // 3. sources.yaml round-trip + defaults + validation
  const cfg = parseSources([
    'version: 1',
    'settings:',
    '  first_window_days: 3',
    'sources:',
    '  - id: gmail',
    '    kind: email',
    '    connector: Gmail',
    '    priority: 1',
    '    dismiss: archive',
    '    scope: [INBOX, "Team X"]',
    '  - id: gcal',
    '    kind: calendar',
    '    connector: Google Calendar',
    '    priority: 2',
  ].join('\n'));
  ok('sources parsed count', cfg.sources.length === 2);
  ok('settings default applied (carryover)', cfg.settings.carryover_horizon_days === 14);
  ok('settings override kept (first_window)', cfg.settings.first_window_days === 3);
  ok('scope inline list parsed', Array.isArray(cfg.sources[0].scope) && cfg.sources[0].scope[1] === 'Team X');
  ok('dismiss defaulted to none', cfg.sources[1].dismiss === 'none');
  ok('sources round-trips', parseSources(serializeSources(cfg)).sources.length === 2);
  throws('malformed: bad kind', () => parseSources('sources:\n  - id: x\n    kind: sms\n    connector: c\n    priority: 1'));
  throws('malformed: duplicate id', () => parseSources('sources:\n  - id: a\n    kind: email\n    connector: c\n    priority: 1\n  - id: a\n    kind: chat\n    connector: c\n    priority: 2'));
  throws('malformed: missing priority', () => parseSources('sources:\n  - id: a\n    kind: email\n    connector: c'));
  throws('malformed: no sources', () => parseSources('version: 1\nsettings:\n  first_window_days: 7'));

  // 4. cursor.yaml round-trip + atomic
  const store = ensureStoreDir(path.join(tmp, 'store'), tmp);
  ok('readCursor absent -> null', readCursor(store) === null);
  writeCursor(store, { last_run: '2026-07-05T09:00:00.000Z', high_water: { gmail: 'abc', gcal: 'def' } }, tmp);
  const cur = readCursor(store);
  ok('cursor last_run round-trips', cur.last_run === '2026-07-05T09:00:00.000Z');
  ok('cursor high_water round-trips', cur.high_water.gmail === 'abc' && cur.high_water.gcal === 'def');
  ok('no .tmp orphan left', fs.readdirSync(store).every((f) => !f.endsWith('.tmp')));

  // 5. window math (D9/D10)
  const w1 = computeWindow(null, { first_window_days: 7, carryover_horizon_days: 14 }, '2026-07-05T00:00:00.000Z');
  ok('first-run window reaches first_window_days back', isoDate(w1.from) === '2026-06-28' && w1.first_run === true);
  ok('carryover floor at horizon', isoDate(w1.carryover_floor) === '2026-06-21');
  const w2 = computeWindow({ last_run: '2026-07-04T06:00:00.000Z' }, {}, '2026-07-05T06:00:00.000Z');
  ok('cursor-run window starts at last_run', w2.from === '2026-07-04T06:00:00.000Z' && w2.first_run === false);

  // 6. /mytasks lane (INV-6)
  const tasksDir = path.join(tmp, 'tasks');
  const itemsDir = path.join(tasksDir, 'items');
  fs.mkdirSync(itemsDir, { recursive: true });
  const mkTask = (id, fm) => fs.writeFileSync(path.join(itemsDir, `${id}-x.md`),
    `---\nid: ${id}\ntitle: ${fm.title}\nstatus: ${fm.status}\ndue: ${fm.due || ''}\nnext_checkin: ${fm.next_checkin || ''}\n---\n`);
  mkTask('t1', { title: 'Overdue thing', status: 'pending', due: '2026-07-01' });
  mkTask('t2', { title: 'Due today', status: 'in-progress', due: '2026-07-05' });
  mkTask('t3', { title: 'Waiting on Bob', status: 'waiting' });
  mkTask('t4', { title: 'Check in', status: 'pending', next_checkin: '2026-07-05' });
  mkTask('t5', { title: 'Done ignore', status: 'completed', due: '2026-07-01' });
  const lane = mytasksLane(tasksDir, '2026-07-05T09:00:00.000Z');
  ok('lane overdue', lane.overdue.length === 1 && lane.overdue[0].id === 't1');
  ok('lane due-today', lane.due.length === 1 && lane.due[0].id === 't2');
  ok('lane waiting', lane.waiting.length === 1 && lane.waiting[0].id === 't3');
  ok('lane checkins', lane.checkins.length === 1 && lane.checkins[0].id === 't4');
  ok('lane ignores completed', !JSON.stringify(lane).includes('t5'));
  ok('lane absent store', mytasksLane(path.join(tmp, 'nope'), '2026-07-05T00:00:00Z').absent === true);

  // 7. manifest assembly (§7)
  const man = assembleManifest({
    window: w1,
    sources: [
      { id: 'gmail', kind: 'email', priority: 1, status: 'swept', counts: { new: 3, carryover: 1, beyond_horizon: 2 } },
      { id: 'gcal', kind: 'calendar', priority: 2, status: 'failed', reason: 'unauthed' },
    ],
    items: [
      { id: 'i1', source: 'gmail', tier: 'today', no_rule_matched: false },
      { id: 'i2', source: 'gmail', tier: 'fyi', no_rule_matched: true },
      { id: 'i3', source: 'gmail', tier: 'knowing', no_rule_matched: false },
    ],
  });
  ok('manifest swept/failed totals', man.totals.swept === 1 && man.totals.failed === 1);
  ok('manifest any_failed', man.any_failed === true);
  ok('manifest per-source shown-by-tier', man.sources[0].shown.today === 1 && man.sources[0].shown.fyi === 1 && man.sources[0].shown.knowing === 1);
  ok('manifest no-rule-matched list', man.totals.no_rule_matched === 1 && man.no_rule_matched[0].id === 'i2');
  ok('manifest beyond-horizon total', man.totals.beyond_horizon === 2);

  // 8. rule capture append (story ww7 T5)
  const seed = '# Rules\n\n## do — needs action\n\n- Existing do rule.\n\n## delegate-reply — reply clears it\n\n- Existing delegate rule.\n\n## defer-track — real, not today\n\n## drop-FYI — awareness only\n\n- Existing fyi rule.\n';
  const r1 = appendRule(seed, 'do', 'Threads from Alice needing sign-off = do.');
  ok('appendRule inserts under do section', /## do —[\s\S]*- Existing do rule\.\n- Threads from Alice needing sign-off = do\.\n\n## delegate-reply/.test(r1));
  ok('appendRule does not disturb other sections', r1.includes('- Existing fyi rule.'));
  const r2 = appendRule(seed, 'defer-track', 'Newsletters to read later = defer-track.');
  ok('appendRule fills an empty section', /## defer-track —[\s\S]*- Newsletters to read later = defer-track\.\n\n## drop-FYI/.test(r2));
  const r3 = appendRule('# Rules\n', 'drop-FYI', 'CCs = drop-FYI.');
  ok('appendRule creates a missing heading', /## drop-FYI\n\n- CCs = drop-FYI\.\n/.test(r3));
  throws('appendRule rejects unknown category', () => appendRule(seed, 'archive', 'x'));
  const rf = path.join(store, 'rules.md');
  fs.writeFileSync(rf, seed);
  appendRuleToStore(store, 'drop-FYI', 'Automated alerts = drop-FYI.', tmp);
  ok('appendRuleToStore writes back', fs.readFileSync(rf, 'utf8').includes('- Automated alerts = drop-FYI.'));
  ok('appendRuleToStore no .tmp orphan', fs.readdirSync(store).every((f) => !f.endsWith('.tmp')));

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`lib.mjs selftest: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--selftest')) selftest();
  else { console.error('usage: node lib.mjs --selftest   (this is a library module)'); process.exit(64); }
}
