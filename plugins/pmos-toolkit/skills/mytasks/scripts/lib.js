#!/usr/bin/env node
// lib.js — zero-dep core for the /mytasks web layer (story 260613-yfr).
//
// Pure, side-effect-light helpers shared by serve.js (the API server) and
// tests/run.mjs (the behavioral gate). The markdown task FILES are the source of
// truth (design §3); this module round-trips their exact on-disk shape, validates
// against schema.md enums, renders the derived-on-read index view (never persisted —
// _shared/tracker-crudl.md §5), and parses the quick-add token grammar. It NEVER
// deletes a task file.
//
// Field/enum/index-view contracts are owned by ../schema.md (the §K single home); this
// file implements them. Recurrence date math is re-used by ./recur.js.
//
// CommonJS so serve.js can `require` it; tests/run.mjs reaches it via createRequire.

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Enums (schema.md "Enum values" — the closed sets the skill must never widen) ──
const ENUMS = {
  type: ['execution', 'follow-up', 'reminder', 'idea', 'read', 'call'],
  importance: ['leverage', 'neutral', 'overhead'],
  status: ['pending', 'in-progress', 'waiting', 'completed', 'dropped'],
  checkin: ['daily', 'weekly', 'biweekly', 'monthly', 'none'],
};

// Canonical frontmatter field order (mirrors the fixtures + schema.md exactly).
const FIELD_ORDER = [
  'schema_version', 'id', 'title', 'type', 'importance', 'status',
  'project', 'goal', 'milestone', 'parent', 'order', 'recur', 'people', 'labels', 'links',
  'due', 'start', 'checkin', 'next_checkin', 'created', 'updated', 'completed',
];
const LIST_FIELDS = new Set(['people', 'labels', 'links']);

// ── Frontmatter parse / serialize (a tolerant subset tuned to the mytasks shape) ──

function parseFrontmatter(text) {
  // Returns { fm: {...}, body: '<everything after the closing --->' }.
  const norm = String(text).replace(/\r\n/g, '\n');
  if (!norm.startsWith('---\n')) return { fm: {}, body: norm };
  const end = norm.indexOf('\n---', 3);
  if (end === -1) return { fm: {}, body: norm };
  const fmBlock = norm.slice(4, end + 1); // text between the two --- lines
  // Body is everything after the closing '---' line.
  const afterClose = norm.slice(end + 4);
  const body = afterClose.startsWith('\n') ? afterClose.slice(1) : afterClose;

  const fm = {};
  for (const rawLine of fmBlock.split('\n')) {
    if (!rawLine.trim()) continue;
    const m = rawLine.match(/^([A-Za-z0-9_]+):\s?(.*)$/);
    if (!m) continue;
    const key = m[1];
    const rawVal = m[2];
    fm[key] = parseScalarOrList(rawVal, LIST_FIELDS.has(key));
  }
  return { fm, body };
}

function parseScalarOrList(raw, isList) {
  const v = raw.trim();
  if (isList) {
    if (v === '' || v === '[]') return [];
    const inner = v.replace(/^\[/, '').replace(/\]$/, '').trim();
    if (inner === '') return [];
    return inner.split(',').map((s) => stripQuotes(s.trim())).filter((s) => s !== '');
  }
  if (v === '') return '';
  return stripQuotes(v);
}

function stripQuotes(s) {
  if (s.length >= 2 && ((s[0] === '"' && s.endsWith('"')) || (s[0] === "'" && s.endsWith("'")))) {
    return s.slice(1, -1);
  }
  return s;
}

function needsQuote(s) {
  // Quote a scalar title only when it could confuse the parser / YAML readers.
  return /^[\[\{>|*&!#%@`"']/.test(s) || /:\s/.test(s) || s !== s.trim();
}

function serializeValue(key, val) {
  if (LIST_FIELDS.has(key)) {
    const arr = Array.isArray(val) ? val : (val ? [val] : []);
    if (arr.length === 0) return '[]';
    return '[' + arr.join(', ') + ']';
  }
  if (val === undefined || val === null || val === '') return '';
  const s = String(val);
  if (key === 'title' && needsQuote(s)) return JSON.stringify(s);
  return s;
}

function serializeFrontmatter(fm) {
  // Emit canonical-ordered keys first, then any extra keys (stable), preserving
  // the bare-key-empty binding (every optional written, never omitted — §4).
  const keys = FIELD_ORDER.filter((k) => k in fm)
    .concat(Object.keys(fm).filter((k) => !FIELD_ORDER.includes(k)));
  const lines = keys.map((k) => {
    const rendered = serializeValue(k, fm[k]);
    return rendered === '' ? `${k}:` : `${k}: ${rendered}`;
  });
  return lines.join('\n');
}

function serializeItem(fm, body) {
  const fmText = serializeFrontmatter(fm);
  const b = body == null ? '' : String(body);
  const bodyPart = b === '' ? '' : '\n' + (b.startsWith('\n') ? b.slice(1) : b);
  return `---\n${fmText}\n---\n${bodyPart}`;
}

// ── Version token (design §3.4: content hash) ──
function versionOf(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 16);
}

// ── Slug (tracker-crudl §2.2; prefer truncating at a hyphen boundary, cap ~60) ──
function slugify(title) {
  let s = String(title || 'untitled').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!s) s = 'untitled';
  if (s.length > 60) {
    const cut = s.slice(0, 60);
    const lastHyphen = cut.lastIndexOf('-');
    s = lastHyphen > 20 ? cut.slice(0, lastHyphen) : cut;
  }
  return s;
}

// ── Date math (ISO YYYY-MM-DD, UTC-anchored to avoid TZ drift) ──
function toUTC(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso).trim());
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}
function fmtUTC(d) {
  return d.getUTCFullYear() + '-' +
    String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(d.getUTCDate()).padStart(2, '0');
}
function addDays(iso, n) {
  const d = toUTC(iso); if (!d) return iso;
  d.setUTCDate(d.getUTCDate() + n);
  return fmtUTC(d);
}
function addMonthsClamp(iso, n) {
  const d = toUTC(iso); if (!d) return iso;
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return fmtUTC(target);
}
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
function nextWeekday(iso, weekday) {
  const d = toUTC(iso); if (!d) return iso;
  const want = WEEKDAYS.indexOf(String(weekday).toLowerCase());
  if (want === -1) return iso;
  let delta = (want - d.getUTCDay() + 7) % 7;
  if (delta === 0) delta = 7; // exclusive of the anchor day
  return addDays(iso, delta);
}

// Advance an anchor date by a recurrence rule (schema.md "Recurrence"). Returns
// the new ISO date, or the input unchanged if the rule is unrecognized/empty.
function advanceByRecur(iso, rule) {
  const r = String(rule || '').trim().toLowerCase();
  if (!r || !iso) return iso;
  if (r === 'daily') return addDays(iso, 1);
  if (r === 'weekly') return addDays(iso, 7);
  if (r === 'biweekly') return addDays(iso, 14);
  if (r === 'monthly') return addMonthsClamp(iso, 1);
  let m;
  if ((m = /^every\s+(\d+)\s+days?$/.exec(r))) return addDays(iso, +m[1]);
  if ((m = /^every\s+(\d+)\s+weeks?$/.exec(r))) return addDays(iso, 7 * +m[1]);
  if ((m = /^every\s+(\d+)\s+months?$/.exec(r))) return addMonthsClamp(iso, +m[1]);
  if ((m = /^every\s+(\w+)$/.exec(r)) && WEEKDAYS.includes(m[1])) return nextWeekday(iso, m[1]);
  return iso;
}

function isValidRecur(rule) {
  const r = String(rule || '').trim().toLowerCase();
  if (r === '') return true; // empty clears / one-shot
  return /^(daily|weekly|biweekly|monthly)$/.test(r)
    || /^every\s+\d+\s+(days?|weeks?|months?)$/.test(r)
    || (/^every\s+(\w+)$/.test(r) && WEEKDAYS.includes(r.replace(/^every\s+/, '')));
}

// ── Validation (returns null on ok, else an error string mirroring SKILL.md copy) ──
function validateField(field, value) {
  if (ENUMS[field]) {
    if (value === '' && field === 'checkin') return null;
    if (!ENUMS[field].includes(value)) {
      return `Unknown ${field} '${value}'. Allowed: ${ENUMS[field].join(', ')}.`;
    }
    return null;
  }
  if (field === 'order') {
    if (value === '' || value == null) return null;
    if (!/^\d+$/.test(String(value))) return `order must be a non-negative integer (got '${value}').`;
    return null;
  }
  if (field === 'recur') {
    if (!isValidRecur(value)) {
      return `Unknown recurrence rule '${value}'. Allowed: daily, weekly, biweekly, monthly, every <N> days|weeks|months, every <weekday>.`;
    }
    return null;
  }
  if (['due', 'start', 'next_checkin', 'completed'].includes(field)) {
    if (value === '' || value == null) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return `${field} must be an ISO date (YYYY-MM-DD) or empty.`;
    return null;
  }
  return null; // free fields (title, project, parent, people, labels, links)
}

// ── Natural-language date parse (inference-heuristics.md "Date inference") ──
// Returns { date, matched } or null. todayIso anchors relative phrases.
function parseNLDate(text, todayIso) {
  const t = String(text);
  let m;
  if ((m = /\b(today|eod)\b/i.exec(t))) return { date: todayIso, matched: m[0] };
  if ((m = /\btomorrow\b/i.exec(t))) return { date: addDays(todayIso, 1), matched: m[0] };
  if ((m = /\bin\s+(\d+)\s+days?\b/i.exec(t))) return { date: addDays(todayIso, +m[1]), matched: m[0] };
  if ((m = /\bby\s+(\d{4}-\d{2}-\d{2})\b/i.exec(t))) return { date: m[1], matched: m[0] };
  if ((m = /\bby\s+(\d{1,2})\/(\d{1,2})\/(\d{4})\b/.exec(t))) {
    return { date: `${m[3]}-${pad(m[1])}-${pad(m[2])}`, matched: m[0] };
  }
  if ((m = /\bby\s+(\d{1,2})\/(\d{1,2})\b/.exec(t))) {
    const year = +todayIso.slice(0, 4);
    let cand = `${year}-${pad(m[1])}-${pad(m[2])}`;
    if (cand < todayIso) cand = `${year + 1}-${pad(m[1])}-${pad(m[2])}`;
    return { date: cand, matched: m[0] };
  }
  if ((m = /\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.exec(t))) {
    return { date: nextWeekday(todayIso, m[1].toLowerCase()), matched: m[0] };
  }
  if ((m = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.exec(t))) {
    return { date: nextWeekday(todayIso, m[1].toLowerCase()), matched: m[0] };
  }
  return null;
}
function pad(n) { return String(n).padStart(2, '0'); }

const TYPE_RULES = [
  [/\bcall\b|\bring\b/i, 'call'],
  [/\bread\b|review article|review post|review doc/i, 'read'],
  [/\bremind\b|\bremember\b/i, 'reminder'],
  [/\bfollow up\b|\bfollowup\b|\bcheck in with\b|\bping\b/i, 'follow-up'],
  [/\bidea\b|\bbrainstorm\b/i, 'idea'],
];
function inferType(text) {
  for (const [re, type] of TYPE_RULES) if (re.test(text)) return type;
  return 'execution';
}

// Quick-add token grammar (inference-heuristics.md): strip order type→date→@→#→+.
// People resolution via /people is CLI-only, so the web stores literal handles
// (AC2). Returns the parsed fields + the residual title.
function parseQuickAdd(rawText, todayIso) {
  let text = String(rawText).trim();
  const type = inferType(text); // type keyword is NOT stripped
  let due = '';
  const dateHit = parseNLDate(text, todayIso);
  if (dateHit) { due = dateHit.date; text = text.replace(dateHit.matched, ' ').trim(); }

  const people = [];
  text = text.replace(/(^|\s)@([A-Za-z0-9][A-Za-z0-9._-]*)/g, (full, pre, handle) => {
    people.push(handle); return pre;
  });

  let project = '';
  let firstProjectTaken = false;
  text = text.replace(/(^|\s)#([A-Za-z0-9][A-Za-z0-9._-]*)/g, (full, pre, slug) => {
    if (!firstProjectTaken) { project = slug; firstProjectTaken = true; return pre; }
    return full; // further #tokens stay in the title
  });

  const labels = [];
  text = text.replace(/(^|\s)\+([A-Za-z0-9][A-Za-z0-9._-]*)/g, (full, pre, lbl) => {
    labels.push(lbl); return pre;
  });

  const title = text.replace(/\s+/g, ' ').trim();
  return { title, type, due, project, people, labels };
}

// ── Item store I/O ──
function itemsDir(tasksDir) { return path.join(tasksDir, 'items'); }

function listItemFiles(tasksDir) {
  const dir = itemsDir(tasksDir);
  let names;
  try { names = fs.readdirSync(dir); } catch (_) { return []; }
  return names.filter((n) => n.endsWith('.md')).map((n) => path.join(dir, n));
}

function readItem(file) {
  const bytes = fs.readFileSync(file);
  const { fm, body } = parseFrontmatter(bytes.toString('utf8'));
  return { file, fm, body, version: versionOf(bytes), id: fm.id || path.basename(file).split('-')[0] };
}

function findItemFile(tasksDir, id) {
  const dir = itemsDir(tasksDir);
  let names;
  try { names = fs.readdirSync(dir); } catch (_) { return null; }
  const hit = names.find((n) => n === `${id}` || n.startsWith(`${id}-`));
  return hit ? path.join(dir, hit) : null;
}

// ── Load-time normalization: `workstream:` → `project:` (one-shot, idempotent) ──
// Relocated here from the retired `rebuild-index` migration (story 260626-3d4, D6):
// legacy schema_version:1 files carry a `workstream:` key. We rename the key only —
// value preserved — and write the file back, so the migration still runs on every
// read (loadAllItems) yet is a no-op once no `workstream:` key remains. Never touches
// ids, slugs, or other fields. Returns true iff this file was migrated this call.
function migrateWorkstreamKey(it) {
  if (!Object.prototype.hasOwnProperty.call(it.fm, 'workstream')) return false;
  const val = it.fm.workstream;
  delete it.fm.workstream;
  const cur = it.fm.project;
  if (cur === undefined || cur === null || cur === '') it.fm.project = val;
  writeItemAtomic(it.file, serializeItem(it.fm, it.body));
  it.version = versionOf(fs.readFileSync(it.file));
  return true;
}

// Load-time task-schema migration to v3 (story 260705-ebm, AC1). Tasks gain the
// optional attachment keys `goal:` (goal id | 'none' | empty) and `milestone:`
// (ref | empty). Mirrors migrateWorkstreamKey: key presence only — adds the bare
// keys when absent and stamps schema_version:3, never rewriting ids or any other
// field, so absent/1/2 files stay valid and the pass is a no-op once normalized.
// Returns true iff this file was rewritten this call.
function normalizeTaskSchema(it) {
  const fm = it.fm;
  const hasGoal = Object.prototype.hasOwnProperty.call(fm, 'goal');
  const hasMs = Object.prototype.hasOwnProperty.call(fm, 'milestone');
  if (hasGoal && hasMs && String(fm.schema_version) === '3') return false;
  if (!hasGoal) fm.goal = '';
  if (!hasMs) fm.milestone = '';
  fm.schema_version = '3';
  writeItemAtomic(it.file, serializeItem(fm, it.body));
  it.version = versionOf(fs.readFileSync(it.file));
  return true;
}

function loadAllItems(tasksDir) {
  const out = [];
  for (const f of listItemFiles(tasksDir)) {
    try {
      const it = readItem(f);
      migrateWorkstreamKey(it); // D6: workstream→project on every read (idempotent)
      normalizeTaskSchema(it);  // AC1: additive goal:/milestone: + schema_version→3 (idempotent)
      out.push(it);
    } catch (_) { /* skip malformed */ }
  }
  return out;
}

function writeItemAtomic(file, content) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}

// ── Index view (derived on read; never persisted — _shared/tracker-crudl.md §5) ──
// Returns the bucketed Markdown string. Writes nothing: the at-a-glance index is a
// view computed fresh per read (INV-1/INV-3), so there is no INDEX.md and no
// `Last regenerated:` line (nothing is regenerated). Consumes already-normalized
// items (loadAllItems folds workstream→project).
function renderIndex(tasksDir) {
  const items = loadAllItems(tasksDir)
    .filter((it) => !['completed', 'dropped'].includes(it.fm.status));
  const buckets = { leverage: [], neutral: [], overhead: [] };
  for (const it of items) {
    const imp = ENUMS.importance.includes(it.fm.importance) ? it.fm.importance : 'neutral';
    buckets[imp].push(it);
  }
  const cmp = (a, b) => {
    const da = a.fm.due || '', db = b.fm.due || '';
    if (da !== db) {
      if (!da) return 1; if (!db) return -1;
      return da < db ? -1 : 1;
    }
    const ua = a.fm.updated || '', ub = b.fm.updated || '';
    return ua < ub ? 1 : ua > ub ? -1 : 0; // updated desc
  };
  let md = `# My Tasks\n`;
  md += goalsIndexSummary(tasksDir); // compact behind/starved/at-risk goals; quiet when healthy (D4b)
  for (const bucket of ['leverage', 'neutral', 'overhead']) {
    md += `\n## ${bucket}\n`;
    md += `| id | type | status | due | next_checkin | title | project | parent |\n`;
    md += `|----|------|--------|-----|--------------|-------|---------|--------|\n`;
    for (const it of buckets[bucket].sort(cmp)) {
      const f = it.fm;
      md += `| ${cell(f.id)} | ${cell(f.type)} | ${cell(f.status)} | ${cell(f.due)} | ${cell(f.next_checkin)} | ${cell(f.title)} | ${cell(f.project)} | ${cell(f.parent)} |\n`;
    }
  }
  return md;
}
function cell(v) { return (v === undefined || v === null) ? '' : String(v); }

function isoToday() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// ── Body section append (## Notes / ## Check-ins), creating the section if absent ──
function appendToSection(body, heading, line) {
  const b = body == null ? '' : String(body);
  const re = new RegExp(`(^|\\n)##\\s+${heading}\\s*\\n`);
  if (re.test(b)) {
    // Insert the line right after the heading line.
    return b.replace(re, (m) => `${m}${line}\n`);
  }
  const sep = b.trim() === '' ? '' : (b.endsWith('\n') ? '\n' : '\n\n');
  return `${b}${sep}## ${heading}\n${line}\n`;
}

// ── List ordering for the web/API list view ──
// In a project view, the manual `order` field wins (drag-reorder); empty order sorts last.
// Otherwise fall back to due asc (empty last) → updated desc, mirroring the INDEX comparator.
const IMP_RANK = { leverage: 0, neutral: 1, overhead: 2 };
function listSort(items, opts = {}) {
  const byProject = !!opts.byProject;
  const ord = (it) => { const n = parseInt(it.fm.order, 10); return Number.isFinite(n) ? n : Infinity; };
  const dueCmp = (a, b) => {
    const da = a.fm.due || '', db = b.fm.due || '';
    if (da !== db) { if (!da) return 1; if (!db) return -1; return da < db ? -1 : 1; }
    return 0;
  };
  const updCmp = (a, b) => {
    const ua = a.fm.updated || '', ub = b.fm.updated || '';
    return ua < ub ? 1 : ua > ub ? -1 : 0; // updated desc
  };
  return items.slice().sort((a, b) => {
    if (byProject) {
      const oa = ord(a), ob = ord(b);
      if (oa !== ob) return oa - ob;
      return dueCmp(a, b) || updCmp(a, b);
    }
    const d = dueCmp(a, b); if (d) return d;
    const ia = IMP_RANK[a.fm.importance] ?? 1, ib = IMP_RANK[b.fm.importance] ?? 1;
    if (ia !== ib) return ia - ib;
    return updCmp(a, b);
  });
}

// ══════════════════════════════════════════════════════════════════════════
// Goals collection — a SECOND tracker store alongside items/ (story 260705-hbe).
//
// Goals persist at ~/.pmos/tasks/goals/{id}-{slug}.md, binding the same
// _shared/tracker-crudl.md substrate as items (id/slug §2, archive §6). The one
// structural difference from a task file is the embedded `milestones:` frontmatter
// list (design 02_design.html §2, INV-1/2/3) — a nested block the flat items
// frontmatter parser cannot represent, so goals get a dedicated parse/serialize
// pair here. The frontmatter `milestones:` list is the machine-read source of truth
// (INV-1); the `## Milestones` body block is a human mirror regenerated from it.
// ══════════════════════════════════════════════════════════════════════════

const GOAL_ENUMS = {
  type: ['dated', 'open-ended'],
  status: ['active', 'achieved', 'dropped'],
  cadence: ['daily', 'weekly', 'biweekly', 'monthly'],
};
// Canonical goal frontmatter order. `milestone_seq` is an internal monotonic
// counter (never decremented) that guarantees milestone refs are never reused
// after deletion (INV-2) without a global lock; `milestones` is emitted last as a
// nested block by serializeGoal, not via this scalar order.
const GOAL_FIELD_ORDER = [
  'schema_version', 'id', 'title', 'type', 'status', 'cadence', 'target',
  'created', 'updated', 'milestone_seq', 'attached_projects',
];
// Goal frontmatter list-valued keys (rendered `[a, b]` / `[]`, never bare). The
// project→goal map (D8/AC2) lives here in the goal file, NOT in registry.json.
const GOAL_LIST_FIELDS = new Set(['attached_projects']);

// ── Id mint — <YYMMDD>-<rand3>, tracker-crudl §2.1 (mirrors serve.js inlineMint;
// crypto-sourced, never Math.random). Shared by goal + (future) item CLI mints. ──
const ID_ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';
function mintId() {
  const d = new Date();
  const ymd = String(d.getFullYear() % 100).padStart(2, '0') +
    String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  const b = crypto.randomBytes(3);
  let r = ''; for (let i = 0; i < 3; i++) r += ID_ALPHABET[b[i] % 32];
  return `${ymd}-${r}`;
}

// ── Goal frontmatter parse (scalar keys + the nested milestones: list) ──
// Returns { fm: {<scalars>}, milestones: [{ref,description,due,met,met_date}], body }.
function parseGoal(text) {
  const norm = String(text).replace(/\r\n/g, '\n');
  if (!norm.startsWith('---\n')) return { fm: {}, milestones: [], body: norm };
  const end = norm.indexOf('\n---', 3);
  if (end === -1) return { fm: {}, milestones: [], body: norm };
  const fmBlock = norm.slice(4, end + 1);
  const afterClose = norm.slice(end + 4);
  const body = afterClose.startsWith('\n') ? afterClose.slice(1) : afterClose;

  const fm = {};
  const milestones = [];
  const lines = fmBlock.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^milestones:\s*$/.test(line)) {
      i++;
      let cur = null;
      while (i < lines.length) {
        const ml = lines[i];
        if (ml.trim() === '') { i++; continue; }
        if (!/^\s+/.test(ml)) break; // dedent → end of the milestones list
        const start = ml.match(/^\s*-\s+([A-Za-z0-9_]+):\s?(.*)$/);
        const cont = ml.match(/^\s+([A-Za-z0-9_]+):\s?(.*)$/);
        if (start) {
          if (cur) milestones.push(cur);
          cur = {};
          cur[start[1]] = coerceMilestone(start[1], start[2]);
        } else if (cont && cur) {
          cur[cont[1]] = coerceMilestone(cont[1], cont[2]);
        }
        i++;
      }
      if (cur) milestones.push(cur);
      continue;
    }
    const m = line.match(/^([A-Za-z0-9_]+):\s?(.*)$/);
    if (m) fm[m[1]] = GOAL_LIST_FIELDS.has(m[1]) ? parseScalarOrList(m[2], true) : stripQuotes(m[2].trim());
    i++;
  }
  return { fm, milestones: milestones.map(normalizeMilestone), body };
}

function coerceMilestone(key, raw) {
  const v = String(raw).trim();
  if (key === 'met') return v === 'true';
  return stripQuotes(v);
}
function normalizeMilestone(ms) {
  return {
    ref: ms.ref || '',
    description: ms.description || '',
    due: ms.due || '',
    met: ms.met === true,
    met_date: ms.met_date || '',
  };
}

// ── Goal serialize (scalars in canonical order, then the milestones: block) ──
function serializeGoalFrontmatter(fm, milestones) {
  const keys = GOAL_FIELD_ORDER.filter((k) => k in fm)
    .concat(Object.keys(fm).filter((k) => !GOAL_FIELD_ORDER.includes(k) && k !== 'milestones'));
  const lines = keys.map((k) => {
    if (GOAL_LIST_FIELDS.has(k)) {
      const arr = Array.isArray(fm[k]) ? fm[k] : (fm[k] ? [fm[k]] : []);
      return `${k}: ${arr.length ? '[' + arr.join(', ') + ']' : '[]'}`;
    }
    const v = fm[k];
    const rendered = (v === undefined || v === null || v === '')
      ? '' : (k === 'title' && needsQuote(String(v)) ? JSON.stringify(String(v)) : String(v));
    return rendered === '' ? `${k}:` : `${k}: ${rendered}`;
  });
  lines.push('milestones:');
  for (const ms of milestones) {
    lines.push(`  - ref: ${ms.ref}`);
    lines.push(msField('description', ms.description));
    lines.push(msField('due', ms.due));
    lines.push(`    met: ${ms.met ? 'true' : 'false'}`);
    lines.push(msField('met_date', ms.met_date));
  }
  return lines.join('\n');
}
function msField(key, val) {
  if (val === undefined || val === null || val === '') return `    ${key}:`;
  const s = String(val);
  const rendered = (key === 'description' && needsQuote(s)) ? JSON.stringify(s) : s;
  return `    ${key}: ${rendered}`;
}

function serializeGoal(fm, milestones, body) {
  const fmText = serializeGoalFrontmatter(fm, milestones || []);
  const b = body == null ? '' : String(body);
  const bodyPart = b === '' ? '' : '\n' + (b.startsWith('\n') ? b.slice(1) : b);
  return `---\n${fmText}\n---\n${bodyPart}`;
}

// ── ## Milestones body mirror (regenerated from the frontmatter list — INV-1) ──
function milestonesBlock(milestones) {
  const out = ['## Milestones'];
  if (!milestones.length) { out.push('_No milestones yet._'); return out.join('\n'); }
  for (const ms of milestones) {
    const box = ms.met ? '[x]' : '[ ]';
    const due = ms.due ? ` (due ${ms.due})` : '';
    const done = ms.met && ms.met_date ? ` — met ${ms.met_date}` : '';
    out.push(`- ${box} ${ms.ref} — ${ms.description}${due}${done}`);
  }
  return out.join('\n');
}
// Replace (or insert-at-top) the `## Milestones` section of a goal body, preserving
// every other section (## Notes, etc.). The body block is never parsed back for
// computation — it is a pure projection of the frontmatter list (INV-1).
function regenerateMilestonesBody(body, milestones) {
  const b = (body == null ? '' : String(body)).replace(/\r\n/g, '\n');
  const block = milestonesBlock(milestones);
  const parts = b.split(/(?=^##\s+)/m);
  let pre = '';
  const sections = [];
  for (const p of parts) {
    if (/^##\s+/.test(p)) {
      const nl = p.indexOf('\n');
      const headLine = nl === -1 ? p : p.slice(0, nl);
      const rest = nl === -1 ? '' : p.slice(nl + 1);
      sections.push({ heading: headLine.replace(/^##\s+/, '').trim(), body: rest });
    } else {
      pre += p;
    }
  }
  const idx = sections.findIndex((s) => s.heading.toLowerCase() === 'milestones');
  const msSection = { heading: 'Milestones', body: block.replace(/^## Milestones\n?/, '') };
  if (idx >= 0) sections[idx] = msSection;
  else sections.unshift(msSection);

  let out = pre.replace(/\s+$/, '');
  for (const s of sections) {
    if (out) out += '\n\n';
    out += `## ${s.heading}\n${s.body.replace(/^\n+/, '').replace(/\s+$/, '')}`;
  }
  return out.replace(/\s+$/, '') + '\n';
}

// ── Milestone ref minting (INV-2: stable, never reused) ──
// nextMilestoneRef bumps the goal's monotonic milestone_seq; a dropped ref's
// number is never handed out again because the counter only ever increases.
function nextMilestoneRef(goalFm, milestones) {
  const maxExisting = (milestones || []).reduce((mx, ms) => {
    const n = /^m(\d+)$/.exec(String(ms.ref || ''));
    return n ? Math.max(mx, +n[1]) : mx;
  }, 0);
  const seq = Math.max(parseInt(goalFm.milestone_seq, 10) || 0, maxExisting);
  const next = seq + 1;
  goalFm.milestone_seq = String(next);
  return `m${next}`;
}

// ── Validation (returns an array of error strings; empty == valid) ──
function validateGoal(goal) {
  const fm = goal.fm || {};
  const errs = [];
  for (const req of ['id', 'title', 'type', 'status', 'cadence']) {
    if (fm[req] === undefined || fm[req] === null || fm[req] === '') errs.push(`Goal ${req} is required.`);
  }
  for (const f of ['type', 'status', 'cadence']) {
    if (fm[f] !== undefined && fm[f] !== '' && !GOAL_ENUMS[f].includes(fm[f])) {
      errs.push(`Unknown goal ${f} '${fm[f]}'. Allowed: ${GOAL_ENUMS[f].join(', ')}.`);
    }
  }
  const target = fm.target;
  if (fm.type === 'open-ended') {
    if (target !== undefined && target !== null && target !== '') errs.push('open-ended goals take no target date (leave target empty).');
  } else if (target !== undefined && target !== null && target !== '') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(target))) errs.push('target must be an ISO date (YYYY-MM-DD) or empty.');
  }
  const seen = new Set();
  for (const ms of goal.milestones || []) {
    if (!ms.ref) { errs.push('milestone is missing a ref.'); continue; }
    if (seen.has(ms.ref)) errs.push(`duplicate milestone ref '${ms.ref}'.`);
    seen.add(ms.ref);
    if (ms.due && !/^\d{4}-\d{2}-\d{2}$/.test(String(ms.due))) errs.push(`milestone ${ms.ref} due must be an ISO date or empty.`);
    if (typeof ms.met !== 'boolean') errs.push(`milestone ${ms.ref} met must be a boolean.`);
  }
  return errs;
}

// ── Goal store I/O (mirrors the item store; goals/ is the second collection) ──
function goalsDir(tasksDir) { return path.join(tasksDir, 'goals'); }
function archiveDirFor(tasksDir, iso) {
  const parts = String(iso || isoToday()).split('-').map(Number);
  const y = parts[0] || new Date().getUTCFullYear();
  const m = parts[1] || 1;
  const q = Math.floor((m - 1) / 3) + 1;
  return path.join(tasksDir, 'archive', `${y}-Q${q}`);
}
function listGoalFiles(tasksDir) {
  const dir = goalsDir(tasksDir);
  let names;
  try { names = fs.readdirSync(dir); } catch (_) { return []; }
  return names.filter((n) => n.endsWith('.md')).map((n) => path.join(dir, n));
}
function readGoal(file) {
  const bytes = fs.readFileSync(file);
  const { fm, milestones, body } = parseGoal(bytes.toString('utf8'));
  return { file, fm, milestones, body, version: versionOf(bytes), id: fm.id || path.basename(file).split('-')[0] };
}
function findGoalFile(tasksDir, id) {
  const dir = goalsDir(tasksDir);
  let names;
  try { names = fs.readdirSync(dir); } catch (_) { return null; }
  const hit = names.find((n) => n === `${id}` || n.startsWith(`${id}-`));
  return hit ? path.join(dir, hit) : null;
}
function loadAllGoals(tasksDir) {
  const out = [];
  for (const f of listGoalFiles(tasksDir)) {
    try { out.push(readGoal(f)); } catch (_) { /* skip malformed */ }
  }
  return out;
}
function loadGoal(tasksDir, id) {
  const f = findGoalFile(tasksDir, id);
  return f ? readGoal(f) : null;
}
// Persist a goal, regenerating its ## Milestones body mirror from the frontmatter
// list (INV-1). Does NOT touch `updated` — callers bump it on a real edit, so a
// no-op load→save→load is byte-stable. Returns the file path.
function saveGoal(tasksDir, goal) {
  const fm = { ...goal.fm };
  if (fm.schema_version === undefined || fm.schema_version === '') fm.schema_version = '1';
  const milestones = (goal.milestones || []).map(normalizeMilestone);
  const body = regenerateMilestonesBody(goal.body || '', milestones);
  const dir = goalsDir(tasksDir);
  fs.mkdirSync(dir, { recursive: true });
  const file = goal.file || path.join(dir, `${fm.id}-${slugify(fm.title)}.md`);
  writeItemAtomic(file, serializeGoal(fm, milestones, body));
  return file;
}
// Archive a goal (move, not delete — tracker-crudl §6) into archive/YYYY-QN/.
// achieved/dropped goals leave the active surfaces (INV-3). Returns the new path.
function archiveGoal(tasksDir, id, todayIso) {
  const f = findGoalFile(tasksDir, id);
  if (!f) return null;
  const dir = archiveDirFor(tasksDir, todayIso);
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, path.basename(f));
  fs.renameSync(f, dest);
  return dest;
}

// ── Attachment & effective resolution (story 260705-ebm, design §3) ──

// Build the in-memory {project-slug → goal-id} map by scanning goals'
// attached_projects lists (D8/AC2 — the goal file is the source of truth, never
// registry.json). A project listed on two goals is a validation error: a project
// maps to at most one goal. Goals lacking attached_projects contribute nothing.
function buildProjectGoals(goals) {
  const map = {};
  for (const g of goals || []) {
    const fm = g.fm || {};
    const slugs = Array.isArray(fm.attached_projects) ? fm.attached_projects : [];
    for (const slug of slugs) {
      if (!slug) continue;
      if (Object.prototype.hasOwnProperty.call(map, slug) && map[slug] !== fm.id) {
        throw new Error(`project '${slug}' is attached to two goals (${map[slug]} and ${fm.id}); a project maps to at most one goal.`);
      }
      map[slug] = fm.id;
    }
  }
  return map;
}

// Pure effective-goal resolution (INV-4/INV-5, design §3.2). Accepts a loaded item
// ({fm:{…}}) or a flat frontmatter object. Precedence: explicit detach ('none') →
// null; a direct task.goal → that id; else the project's inherited goal; else null.
// Single function ⇒ a task counts toward a goal at most once (no double-count).
function effectiveGoal(task, projectGoals) {
  const fm = (task && task.fm) ? task.fm : (task || {});
  const g = (fm.goal === undefined || fm.goal === null) ? '' : String(fm.goal).trim();
  if (g === 'none') return null;            // explicit detach wins (D5)
  if (g !== '') return g;                    // direct link wins over inherit
  const proj = (fm.project === undefined || fm.project === null) ? '' : String(fm.project).trim();
  if (proj && projectGoals && Object.prototype.hasOwnProperty.call(projectGoals, proj)) return projectGoals[proj];
  return null;
}

// A milestone attaches only when the goal is set DIRECTLY on the task — inherited
// (project-level) goals attach at goal level, never milestone (design §3.2).
function effectiveMilestone(task) {
  const fm = (task && task.fm) ? task.fm : (task || {});
  const g = (fm.goal === undefined || fm.goal === null) ? '' : String(fm.goal).trim();
  if (g === '' || g === 'none') return null;
  const ms = (fm.milestone === undefined || fm.milestone === null) ? '' : String(fm.milestone).trim();
  return ms === '' ? null : ms;
}

// ── Attach / detach verbs (INV-6). Each validates its target BEFORE any write, so
// attaching to a non-existent goal/milestone errors and mutates nothing on disk. ──

function attachTaskToGoal(tasksDir, taskId, goalId, milestoneRef) {
  const goal = loadGoal(tasksDir, goalId);
  if (!goal) throw new Error(`no goal '${goalId}'.`);
  if (milestoneRef) {
    if (!(goal.milestones || []).some((m) => m.ref === milestoneRef)) {
      throw new Error(`goal '${goalId}' has no milestone '${milestoneRef}'.`);
    }
  }
  const file = findItemFile(tasksDir, taskId);
  if (!file) throw new Error(`no task '${taskId}'.`);
  const it = readItem(file);
  it.fm.goal = goal.fm.id || goalId;
  it.fm.milestone = milestoneRef || '';
  it.fm.schema_version = '3';
  it.fm.updated = isoToday();
  writeItemAtomic(file, serializeItem(it.fm, it.body));
  return file;
}

function detachTask(tasksDir, taskId, opts) {
  const file = findItemFile(tasksDir, taskId);
  if (!file) throw new Error(`no task '${taskId}'.`);
  const it = readItem(file);
  it.fm.goal = (opts && opts.clear) ? '' : 'none'; // default: explicit detach (wins over inherit)
  it.fm.milestone = '';
  it.fm.schema_version = '3';
  it.fm.updated = isoToday();
  writeItemAtomic(file, serializeItem(it.fm, it.body));
  return file;
}

function attachProjectToGoal(tasksDir, slug, goalId) {
  if (!slug) throw new Error('project slug is required.');
  const goals = loadAllGoals(tasksDir);
  const target = goals.find((g) => g.fm.id === goalId || path.basename(g.file).startsWith(`${goalId}-`) || path.basename(g.file) === `${goalId}`);
  if (!target) throw new Error(`no goal '${goalId}'.`);
  for (const g of goals) { // at-most-one-goal-per-project (AC2)
    if (g.fm.id === target.fm.id) continue;
    if ((Array.isArray(g.fm.attached_projects) ? g.fm.attached_projects : []).includes(slug)) {
      throw new Error(`project '${slug}' is already attached to goal '${g.fm.id}'; detach it first.`);
    }
  }
  const list = Array.isArray(target.fm.attached_projects) ? target.fm.attached_projects.slice() : [];
  if (!list.includes(slug)) list.push(slug);
  target.fm.attached_projects = list;
  target.fm.updated = isoToday();
  saveGoal(tasksDir, target);
  return target.file;
}

function detachProject(tasksDir, slug) {
  const goals = loadAllGoals(tasksDir);
  let changed = null;
  for (const g of goals) {
    const list = Array.isArray(g.fm.attached_projects) ? g.fm.attached_projects : [];
    if (list.includes(slug)) {
      g.fm.attached_projects = list.filter((s) => s !== slug);
      g.fm.updated = isoToday();
      saveGoal(tasksDir, g);
      changed = g.file;
    }
  }
  if (!changed) throw new Error(`project '${slug}' is not attached to any goal.`);
  return changed;
}

// ── Pace signals, progress & surfacing (story 260705-f79, design §4/§5) ──
// Determinism (INV-7 / §H): every band and number is computed HERE by a pure function;
// the model never estimates one. Three trust rules bind these functions:
//   • Open-ended goals never read "behind" — scheduleSignal returns null (D2).
//   • A goal with zero effective tasks reads a grace state, never falsely starved/behind
//     (INV-9): attentionSignal → 'no-tasks-yet', goalProgress → {state:'no-tasks-yet'}.
//   • Only REAL progress feeds attention: a completed OR created attached task. A bare
//     `updated` bump does NOT count (D7 — the "trust catch" against crying wolf).

const AT_RISK_DAYS = 7;    // a milestone due within this window is a candidate for at-risk
const AT_RISK_PCT = 0.5;   // …and at-risk iff its progress is below this

function daysBetween(fromIso, toIso) {
  const a = toUTC(fromIso), b = toUTC(toIso);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
// cadence → the real-progress lookback window in days (reuses the check-in cadence set).
function cadenceWindow(cadence) {
  switch (String(cadence || '').toLowerCase()) {
    case 'daily': return 1;
    case 'weekly': return 7;
    case 'biweekly': return 14;
    case 'monthly': return 30;
    default: return 7;
  }
}
function goalFm(g) { return (g && g.fm) ? g.fm : (g || {}); }
function taskFm(t) { return (t && t.fm) ? t.fm : (t || {}); }
function isTaskDone(t) { return taskFm(t).status === 'completed'; }

// Fraction of a task list that is completed. Empty list → null (INV-9: "no tasks yet",
// never 0% — a starved-of-work goal must not read as 0% done).
function derivedProgress(tasks) {
  const list = tasks || [];
  if (!list.length) return null;
  return list.filter(isTaskDone).length / list.length;
}

// {milestoneRef → 0..1} progress. A manual `met` flag reads 1 regardless of task state
// (INV-8 — the human's explicit call overrides the derived number); an unmet milestone
// derives from the effective tasks pinned to it (none → 0).
function milestoneProgressMap(goal, effectiveTasks) {
  const map = {};
  for (const ms of (goal.milestones || [])) {
    if (ms.met) { map[ms.ref] = 1; continue; }
    const scoped = (effectiveTasks || []).filter((t) => effectiveMilestone(t) === ms.ref);
    const p = derivedProgress(scoped);
    map[ms.ref] = p == null ? 0 : p;
  }
  return map;
}

// The earliest-due incomplete milestone (dated ones first; all-undated → the first).
function nextIncompleteMilestone(goal) {
  const incomplete = (goal.milestones || []).filter((m) => !m.met);
  if (!incomplete.length) return null;
  const dated = incomplete.filter((m) => m.due);
  const pool = dated.length ? dated : incomplete;
  return pool.slice().sort((a, b) => String(a.due || '~').localeCompare(String(b.due || '~')))[0];
}

// Schedule-adherence band from milestone due dates vs today (FR-10, §4.1, D2).
// Returns 'done' | 'behind' | 'at-risk' | 'on-track', or NULL for open-ended goals.
// `milestoneProgress` (optional {ref→pct}) refines at-risk; absent, an unmet near-due
// milestone reads progress 0. Script-computed — the model never estimates the band.
function scheduleSignal(goal, today, milestoneProgress) {
  const gfm = goalFm(goal);
  if (gfm.type === 'open-ended') return null;                 // D2 — never "behind"
  const t = today || isoToday();
  const ms = goal.milestones || [];
  const incomplete = ms.filter((m) => !m.met);
  if (ms.length && !incomplete.length) return 'done';         // every milestone met
  const next = nextIncompleteMilestone(goal);
  const deadline = (next && next.due) ? next.due : (gfm.target || '');
  if (!deadline) return 'on-track';                           // nothing dated to be late for
  if (deadline < t) return 'behind';
  // at-risk refines a milestone deadline (we have its progress); a bare target date has none.
  if (next && next.due && daysBetween(t, next.due) <= AT_RISK_DAYS) {
    const mp = milestoneProgress || {};
    const prog = mp[next.ref] != null ? mp[next.ref] : (next.met ? 1 : 0);
    if (prog < AT_RISK_PCT) return 'at-risk';
  }
  return 'on-track';
}

// Per-goal cadence-adherence band (FR-11, §4.2, D1/D7). Returns 'fed' | 'starved' |
// 'no-tasks-yet'. Fed = real progress (a completed OR created attached task) within the
// cadence window; a bare `updated` bump is NOT real progress (D7). Zero effective tasks →
// 'no-tasks-yet' (grace state, INV-9) — never falsely starved.
function attentionSignal(goal, effectiveTasks, today) {
  const list = effectiveTasks || [];
  if (!list.length) return 'no-tasks-yet';                    // INV-9
  const t = today || isoToday();
  let last = '';
  for (const task of list) {
    const fm = taskFm(task);
    for (const d of [fm.completed, fm.created]) {             // NOT fm.updated (D7)
      if (d && String(d) > last) last = String(d);
    }
  }
  if (!last) return 'starved';
  return daysBetween(last, t) > cadenceWindow(goalFm(goal).cadence) ? 'starved' : 'fed';
}

// Goal-level progress (FR-12, §4.3, D3/INV-8). Task-derived; zero effective tasks →
// {state:'no-tasks-yet'} (never 0%, INV-9). The manual-met override lives at the milestone
// level (milestoneProgressMap), not in this goal headline.
function goalProgress(goal, effectiveTasks) {
  const list = effectiveTasks || [];
  if (!list.length) return { state: 'no-tasks-yet' };
  const done = list.filter(isTaskDone).length;
  return { state: 'tracked', done, total: list.length, pct: done / list.length };
}

// The effective tasks pinned to a goal (direct link OR inherited via project — INV-4/5,
// resolved once by effectiveGoal so a task counts toward a goal at most once).
function effectiveTasksForGoal(goalId, allTasks, projectGoals) {
  return (allTasks || []).filter((t) => effectiveGoal(t, projectGoals) === goalId);
}

// One goal's full computed pace: both signal bands, progress, next milestone. Pure over
// its inputs (goal + all tasks + the project→goal map + today).
function goalPace(goal, allTasks, projectGoals, today) {
  const gfm = goalFm(goal);
  const t = today || isoToday();
  const tasks = effectiveTasksForGoal(gfm.id, allTasks, projectGoals);
  const mp = milestoneProgressMap(goal, tasks);
  const next = nextIncompleteMilestone(goal);
  return {
    id: gfm.id,
    title: gfm.title,
    type: gfm.type,
    cadence: gfm.cadence,
    schedule: scheduleSignal(goal, t, mp),
    attention: attentionSignal(goal, tasks, t),
    progress: goalProgress(goal, tasks),
    next: next ? { ref: next.ref, description: next.description, due: next.due || '' } : null,
    task_count: tasks.length,
  };
}

// Urgency rank for sorting/filtering — behind (0) < starved (1) < at-risk (2) < healthy.
const SCHED_RANK = { behind: 0, 'at-risk': 2, 'on-track': 4, done: 5 };
const ATTN_RANK = { starved: 1, fed: 4, 'no-tasks-yet': 4 };
function paceRank(p) {
  const s = SCHED_RANK[p.schedule] != null ? SCHED_RANK[p.schedule] : 3;
  const a = ATTN_RANK[p.attention] != null ? ATTN_RANK[p.attention] : 3;
  return Math.min(s, a);
}
function isFlagged(p) {
  return p.schedule === 'behind' || p.schedule === 'at-risk' || p.attention === 'starved';
}

// Every active goal's pace, behind/starved sorted first (id ascending on ties). Derived on
// read: loads goals + items fresh each call, no persisted view (INV-1 for goals surfaces).
function activeGoalPaces(tasksDir, today) {
  const t = today || isoToday();
  const goals = loadAllGoals(tasksDir).filter((g) => (goalFm(g).status || 'active') === 'active');
  let projectGoals = {};
  try { projectGoals = buildProjectGoals(goals); } catch (_) { projectGoals = {}; }
  const items = loadAllItems(tasksDir);
  return goals
    .map((g) => goalPace(g, items, projectGoals, t))
    .sort((a, b) => paceRank(a) - paceRank(b) || String(a.id).localeCompare(String(b.id)));
}

// The morning-brief hook (D4c): behind + starved active goals, in the shape /morning-brief
// consumes. An integration point — /morning-brief reads this, mytasks owns the computation.
function goalsForBrief(tasksDir, today) {
  return activeGoalPaces(tasksDir, today).filter((p) => p.schedule === 'behind' || p.attention === 'starved');
}

function progressLabel(pr) {
  if (!pr || pr.state === 'no-tasks-yet') return 'no tasks yet';
  return `${Math.round(pr.pct * 100)}% (${pr.done}/${pr.total})`;
}

// `/mytasks goals` view (D4a) — every active goal, behind/starved first, derived on read.
function renderGoalsView(tasksDir, today) {
  const paces = activeGoalPaces(tasksDir, today);
  let md = '# Goals\n';
  if (!paces.length) { md += '\n_No active goals. Add one with /mytasks goal add._\n'; return md; }
  md += `\n| goal | type | schedule | attention | progress | next milestone | due |\n`;
  md += `|------|------|----------|-----------|----------|----------------|-----|\n`;
  for (const p of paces) {
    const next = p.next ? (p.next.description || p.next.ref) : '—';
    const due = p.next && p.next.due ? p.next.due : '—';
    md += `| ${cell(p.title)} | ${cell(p.type)} | ${cell(p.schedule || '—')} | ${cell(p.attention)} | ${cell(progressLabel(p.progress))} | ${cell(next)} | ${cell(due)} |\n`;
  }
  return md;
}

// Compact `## Goals` summary for the bare /mytasks index (D4b): ONLY behind/starved/at-risk
// goals — empty string (quiet) when every goal is healthy. Never cries wolf.
function goalsIndexSummary(tasksDir, today) {
  const flagged = activeGoalPaces(tasksDir, today).filter(isFlagged);
  if (!flagged.length) return '';
  let md = `\n## Goals\n`;
  for (const p of flagged) {
    const flags = [];
    if (p.schedule === 'behind') flags.push('behind');
    else if (p.schedule === 'at-risk') flags.push('at-risk');
    if (p.attention === 'starved') flags.push('starved');
    const due = p.next && p.next.due ? ` (next due ${p.next.due})` : '';
    md += `- **${cell(p.title)}** — ${flags.join(', ')}${due}\n`;
  }
  return md;
}

// ── main-module --selftest (AC6): a quick smoke that never fires on require ──
function goalSelftest() {
  const os = require('os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mytasks-goal-selftest-'));
  const goal = {
    fm: { schema_version: '1', id: mintId(), title: 'Ship goals', type: 'dated', status: 'active', cadence: 'weekly', target: '2026-09-30', created: isoToday(), updated: isoToday() },
    milestones: [], body: '## Notes\nseed\n',
  };
  const ref = nextMilestoneRef(goal.fm, goal.milestones);
  goal.milestones.push({ ref, description: 'Core landed', due: '2026-07-20', met: false, met_date: '' });
  const file = saveGoal(dir, goal);
  const g1 = readGoal(file);
  const b1 = fs.readFileSync(file);
  saveGoal(dir, g1);
  const b2 = fs.readFileSync(file);
  const errs = validateGoal(g1);
  // Pace-signal smoke (S3): a past-due unmet milestone reads behind; open-ended never
  // behind (null); a zero-task goal reads the no-tasks-yet grace state (INV-9); real
  // progress feeds attention while a bare updated bump does not (D7).
  const today = '2026-07-05';
  const behindGoal = { fm: { type: 'dated', cadence: 'weekly' }, milestones: [{ ref: 'm1', due: '2026-07-01', met: false }] };
  const openGoal = { fm: { type: 'open-ended', cadence: 'weekly' }, milestones: [{ ref: 'm1', due: '2026-07-01', met: false }] };
  const fedTask = { fm: { status: 'pending', created: '2026-07-04', updated: '2026-07-04' } };
  const staleTask = { fm: { status: 'pending', created: '2026-05-01', updated: '2026-07-05' } }; // recent updated must NOT feed
  const paceOk = scheduleSignal(behindGoal, today) === 'behind'
    && scheduleSignal(openGoal, today) === null
    && attentionSignal(behindGoal, [], today) === 'no-tasks-yet'
    && attentionSignal(behindGoal, [fedTask], today) === 'fed'
    && attentionSignal(behindGoal, [staleTask], today) === 'starved';
  const ok = b1.equals(b2) && errs.length === 0 && g1.milestones.length === 1 && g1.milestones[0].ref === ref
    && validateGoal({ fm: { ...goal.fm, type: 'bogus' }, milestones: [] }).length > 0 && paceOk;
  process.stdout.write(ok ? `lib.js goal selftest: PASS (${ref}; pace ok)\n` : `lib.js goal selftest: FAIL errs=${JSON.stringify(errs)} paceOk=${paceOk}\n`);
  return ok ? 0 : 1;
}

module.exports = {
  ENUMS, FIELD_ORDER, LIST_FIELDS,
  parseFrontmatter, serializeFrontmatter, serializeItem,
  versionOf, slugify, mintId,
  addDays, addMonthsClamp, nextWeekday, advanceByRecur, isValidRecur,
  validateField, parseNLDate, inferType, parseQuickAdd,
  itemsDir, listItemFiles, readItem, findItemFile, loadAllItems,
  writeItemAtomic, renderIndex, migrateWorkstreamKey, normalizeTaskSchema, isoToday, appendToSection, listSort,
  // goals collection
  GOAL_ENUMS, GOAL_FIELD_ORDER, GOAL_LIST_FIELDS,
  parseGoal, serializeGoal, serializeGoalFrontmatter, normalizeMilestone,
  milestonesBlock, regenerateMilestonesBody, nextMilestoneRef, validateGoal,
  goalsDir, archiveDirFor, listGoalFiles, readGoal, findGoalFile,
  loadAllGoals, loadGoal, saveGoal, archiveGoal,
  // attachment & effective resolution (S2)
  buildProjectGoals, effectiveGoal, effectiveMilestone,
  attachTaskToGoal, detachTask, attachProjectToGoal, detachProject,
  // pace signals, progress & surfacing (S3, design §4/§5)
  AT_RISK_DAYS, AT_RISK_PCT, daysBetween, cadenceWindow,
  derivedProgress, milestoneProgressMap, nextIncompleteMilestone,
  scheduleSignal, attentionSignal, goalProgress,
  effectiveTasksForGoal, goalPace, paceRank, activeGoalPaces,
  goalsForBrief, progressLabel, renderGoalsView, goalsIndexSummary,
};

// AC6: --selftest guarded by a main-module check so it never fires on require().
if (require.main === module && process.argv.includes('--selftest')) {
  process.exit(goalSelftest());
}
