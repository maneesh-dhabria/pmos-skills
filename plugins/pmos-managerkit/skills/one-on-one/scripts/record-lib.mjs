#!/usr/bin/env node
// record-lib.mjs — the /one-on-one per-report record: parse/serialize + store resolution + the
// deterministic coaching flags. Zero external deps (Node stdlib only). One rolling Markdown record
// per report at <store>/<handle>.md (02_design.html §3): YAML frontmatter + a fixed set of body
// sections (persistent header + running-agenda Inbox + reverse-chron Sessions). The canonical form
// round-trips byte-stably (AC1): serialize(parse(canonical)) === canonical.
//
// Store (D2, INV-4): $PMOS_ONEONONES_DIR else ~/.pmos/one-on-ones, created on first write, and NEVER
// inside the repo working tree — writeRecord refuses a store path under this repo (privacy: employee
// content must never be committed).
//
// The deterministic flags (§H / D8) — status-creep, stale-action, career-due, who's-due — are pure
// functions here (unit-tested via --selftest), so plan/overview never ask the model to do arithmetic.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, realpathSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// The fixed body sections, in canonical order (02_design.html §3). Always all present.
export const SECTIONS = [
  'Goals & growth focus',
  'Standing themes',
  'Operating manual',
  'Performance feedback',
  'Coaching feedback',
  'Open action items',
  'Inbox',
  'Sessions',
];
// Frontmatter keys, in canonical order. career_last_reviewed is always emitted (bare when empty).
const FM_KEYS = ['schema_version', 'handle', 'name', 'role', 'cadence', 'started', 'career_last_reviewed'];

// ---- store resolution + INV-4 guard ---------------------------------------------------------------

export function storeDir() {
  const raw = process.env.PMOS_ONEONONES_DIR || join(homedir(), '.pmos', 'one-on-ones');
  return resolve(raw);
}

// Walk up from `start` to the nearest dir containing a `.git` (dir OR gitdir-link file — worktrees use
// a file). Returns its realpath, or null. Used to detect "inside the repo working tree" (INV-4).
function repoRootOf(start) {
  let d = start;
  for (;;) {
    if (existsSync(join(d, '.git'))) { try { return realpathSync(d); } catch { return d; } }
    const up = dirname(d);
    if (up === d) return null;
    d = up;
  }
}

// INV-4: refuse a store path that lies inside this repo's working tree (where a stray commit would
// leak employee content). Compares against the repo that ships this script.
export function assertStoreOutsideRepo(dir) {
  const repo = repoRootOf(__dirname);
  if (!repo) return;
  const abs = resolve(dir);
  if (abs === repo || abs.startsWith(repo + '/')) {
    throw new Error(
      `refusing to write 1:1 records inside the repo working tree (${abs}). Records hold sensitive ` +
      `employee content and must live under ~/.pmos/one-on-ones/ (or $PMOS_ONEONONES_DIR) — never in a ` +
      `git tree (INV-4).`,
    );
  }
}

export function recordPath(handle) { return join(storeDir(), `${handle}.md`); }
export function recordExists(handle) { return existsSync(recordPath(handle)); }

export function listHandles() {
  const dir = storeDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)).sort();
}

// ---- parse / serialize ----------------------------------------------------------------------------

// Parse a record string → { fm: {k:v}, sections: {name: [lines]} }. Tolerant of extra/missing
// sections on read (unknown headings are kept under their own key so nothing is silently dropped),
// but serialize always re-emits the canonical fixed set.
export function parseRecord(text) {
  const fm = {};
  const sections = {};
  let body = text;
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (m) {
    for (const line of m[1].split('\n')) {
      const mm = line.match(/^([A-Za-z0-9_]+):\s?(.*)$/);
      if (mm) fm[mm[1]] = mm[2];
    }
    body = text.slice(m[0].length);
  }
  // Split body on "## " headings.
  const parts = body.split(/\n(?=## )/);
  for (let part of parts) {
    part = part.replace(/^\n+/, '');
    if (!part.startsWith('## ')) continue;
    const nl = part.indexOf('\n');
    const name = (nl === -1 ? part.slice(3) : part.slice(3, nl)).trim();
    const rest = nl === -1 ? '' : part.slice(nl + 1);
    // Trim a single trailing blank block, keep interior lines verbatim.
    const lines = rest.replace(/\n+$/, '').split('\n').filter((l, i, a) => !(l === '' && i === a.length));
    sections[name] = rest.trim() === '' ? [] : rest.replace(/\s+$/, '').split('\n');
  }
  return { fm, sections };
}

// Serialize → canonical bytes. Frontmatter in FM_KEYS order (career_last_reviewed always emitted);
// then every SECTION heading in order with its lines; sections separated by one blank line; single
// trailing newline. Idempotent: serialize(parse(serialize(x))) === serialize(x).
export function serializeRecord(rec) {
  const fm = rec.fm || {};
  const sec = rec.sections || {};
  const fmLines = [];
  for (const k of FM_KEYS) {
    const has = Object.prototype.hasOwnProperty.call(fm, k);
    if (k === 'career_last_reviewed') { fmLines.push(`career_last_reviewed:${fm[k] ? ' ' + fm[k] : ''}`); continue; }
    if (has && fm[k] !== undefined && fm[k] !== '') fmLines.push(`${k}: ${fm[k]}`);
    else if (k === 'schema_version') fmLines.push('schema_version: 1');
  }
  const blocks = SECTIONS.map((name) => {
    const lines = sec[name] || [];
    return lines.length ? `## ${name}\n${lines.join('\n')}` : `## ${name}`;
  });
  return `---\n${fmLines.join('\n')}\n---\n\n${blocks.join('\n\n')}\n`;
}

export function readRecord(handle) {
  const p = recordPath(handle);
  if (!existsSync(p)) throw new Error(`no 1:1 record for '${handle}' at ${p} — run /one-on-one add ${handle} first`);
  return parseRecord(readFileSync(p, 'utf8'));
}

export function writeRecord(handle, rec) {
  const dir = storeDir();
  assertStoreOutsideRepo(dir);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(recordPath(handle), serializeRecord(rec));
}

// Build a fresh record skeleton (all sections present, empty).
export function emptyRecord(fm) {
  const sections = {};
  for (const s of SECTIONS) sections[s] = [];
  return { fm: { schema_version: '1', career_last_reviewed: '', ...fm }, sections };
}

// ---- section helpers ------------------------------------------------------------------------------

export function appendLine(rec, section, line) {
  if (!rec.sections[section]) rec.sections[section] = [];
  rec.sections[section].push(line);
}
export function prependLine(rec, section, line) {
  if (!rec.sections[section]) rec.sections[section] = [];
  rec.sections[section].unshift(line);
}

// ---- deterministic coaching flags (§H, D8) --------------------------------------------------------

// Parse "### YYYY-MM-DD" dated session blocks from the Sessions section, newest-first as stored.
// Returns [{date, lines}]. A session is "topic-only" if it has no growth/human/career signal line.
export function parseSessions(rec) {
  const lines = rec.sections['Sessions'] || [];
  const out = [];
  let cur = null;
  for (const l of lines) {
    const m = l.match(/^###\s+(\d{4}-\d{2}-\d{2})/);
    if (m) { cur = { date: m[1], lines: [] }; out.push(cur); }
    else if (cur) cur.lines.push(l);
  }
  return out;
}

const HUMAN_RE = /\b(growth|career|human|check-?in|recognition|feeling|morale|well-?being|coaching|feedback|goal|develop)\b/i;

// status-creep: the last N session entries are all topic-only (no growth/human/coaching content).
export function statusCreepFlag(rec, n = 3) {
  const sessions = parseSessions(rec).slice(0, n);
  if (sessions.length < n) return false;
  return sessions.every((s) => !s.lines.some((l) => HUMAN_RE.test(l)));
}

// stale-action: an open action item ("- [ ]") whose trailing "since <date>" is older than thresholdDays.
export function staleActionFlags(rec, today, thresholdDays = 21) {
  const out = [];
  for (const l of rec.sections['Open action items'] || []) {
    if (!/^- \[ \]/.test(l)) continue;
    const m = l.match(/since\s+(\d{4}-\d{2}-\d{2})/);
    if (m && daysBetween(m[1], today) > thresholdDays) out.push({ line: l, since: m[1], age: daysBetween(m[1], today) });
  }
  return out;
}

// career-due: career_last_reviewed absent, or older than thresholdDays (~a quarter).
export function careerDueFlag(rec, today, thresholdDays = 90) {
  const d = (rec.fm.career_last_reviewed || '').trim();
  if (!d) return true;
  return daysBetween(d, today) > thresholdDays;
}

// who's-due: cadence vs the newest session date. Returns {due:boolean, daysSince, lastSession}.
const CADENCE_DAYS = { weekly: 7, biweekly: 14, 'bi-weekly': 14, fortnightly: 14, monthly: 30 };
export function dueStatus(rec, today) {
  const sessions = parseSessions(rec);
  const last = sessions.length ? sessions[0].date : (rec.fm.started || '').trim();
  const cadence = (rec.fm.cadence || 'weekly').trim().toLowerCase();
  const window = CADENCE_DAYS[cadence] || 7;
  if (!last) return { due: true, daysSince: null, lastSession: null };
  const daysSince = daysBetween(last, today);
  return { due: daysSince >= window, daysSince, lastSession: last };
}

// UTC-midnight day difference (avoids DST drift). Both args "YYYY-MM-DD".
export function daysBetween(a, b) {
  const pa = Date.parse(a + 'T00:00:00Z'), pb = Date.parse(b + 'T00:00:00Z');
  return Math.round((pb - pa) / 86400000);
}

// ---- selftest -------------------------------------------------------------------------------------

function selftest() {
  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) pass++; else { fail++; console.error('  FAIL: ' + m); } };

  const canonical =
`---
schema_version: 1
handle: sarah-chen
name: Sarah Chen
role: Senior PM
cadence: weekly
started: 2026-07-02
career_last_reviewed: 2026-06-01
---

## Goals & growth focus
- Grow into staff-level scope by H2.

## Standing themes
- Feels under-recognized in leadership reviews.

## Operating manual
- Feedback: direct, in the moment.

## Performance feedback
- 2026-Q2: strong delivery.

## Coaching feedback
- Working on: crisper design reviews.

## Open action items
- [ ] (me) intro Sarah to Platform lead — since 2026-06-01

## Inbox
- [growth] discuss the staff-eng ladder expectations
- [blocker] blocked on legal review

## Sessions
### 2026-06-25
- Topics: roadmap Q3.
- Decisions: Sarah leads the retro.
`;
  // (a) byte-stable round-trip
  ok(serializeRecord(parseRecord(canonical)) === canonical, 'canonical round-trips byte-stably');
  // idempotent under double round-trip
  const once = serializeRecord(parseRecord(canonical));
  ok(serializeRecord(parseRecord(once)) === once, 'double round-trip idempotent');

  const rec = parseRecord(canonical);
  ok(rec.fm.handle === 'sarah-chen' && rec.fm.role === 'Senior PM', 'frontmatter parsed');
  ok((rec.sections['Inbox'] || []).length === 2, 'inbox has 2 items');

  // (b) empty record has all sections + bare career field
  const e = serializeRecord(emptyRecord({ handle: 'x', name: 'X', role: 'PM', cadence: 'weekly', started: '2026-07-05' }));
  ok(e.includes('career_last_reviewed:\n'), 'empty career_last_reviewed emitted bare');
  ok(SECTIONS.every((s) => e.includes(`## ${s}`)), 'all fixed sections present in empty record');

  // (c) flags — status-creep (3 topic-only sessions)
  const creepy = parseRecord(canonical);
  creepy.sections['Sessions'] = ['### 2026-06-25', '- Topics: roadmap.', '### 2026-06-18', '- Topics: sprint.', '### 2026-06-11', '- Topics: bugs.'];
  ok(statusCreepFlag(creepy, 3) === true, 'status-creep flags 3 topic-only sessions');
  const humane = parseRecord(canonical);
  humane.sections['Sessions'] = ['### 2026-06-25', '- Growth: staff scope.', '### 2026-06-18', '- Topics: sprint.', '### 2026-06-11', '- Topics: bugs.'];
  ok(statusCreepFlag(humane, 3) === false, 'status-creep clears when a session has growth content');

  // (d) stale-action (>21d)
  ok(staleActionFlags(rec, '2026-07-05', 21).length === 1, 'stale-action flags the >21d open item');
  ok(staleActionFlags(rec, '2026-06-05', 21).length === 0, 'stale-action clears when within threshold');

  // (e) career-due
  ok(careerDueFlag(rec, '2026-09-10', 90) === true, 'career-due when >90d since review');
  ok(careerDueFlag(rec, '2026-07-05', 90) === false, 'career-due clears within a quarter');
  ok(careerDueFlag(parseRecord(canonical.replace('career_last_reviewed: 2026-06-01', 'career_last_reviewed:')), '2026-07-05', 90) === true, 'career-due when never reviewed');

  // (f) due status (weekly, last session 2026-06-25)
  ok(dueStatus(rec, '2026-07-05').due === true, 'weekly report due after 10 days');
  ok(dueStatus(rec, '2026-06-28').due === false, 'weekly report not due after 3 days');

  // (g) INV-4 guard: a store inside the repo is refused
  let refused = false;
  const saved = process.env.PMOS_ONEONONES_DIR;
  try { process.env.PMOS_ONEONONES_DIR = __dirname; writeRecord('nope', emptyRecord({ handle: 'nope' })); }
  catch { refused = true; }
  finally { if (saved === undefined) delete process.env.PMOS_ONEONONES_DIR; else process.env.PMOS_ONEONONES_DIR = saved; }
  ok(refused, 'INV-4: refuses to write inside the repo working tree');

  if (fail === 0) { console.log(`record-lib selftest PASS: ${pass} assertions`); process.exit(0); }
  console.error(`record-lib selftest FAIL: ${fail}/${pass + fail}`); process.exit(1);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain && process.argv[2] === '--selftest') selftest();
