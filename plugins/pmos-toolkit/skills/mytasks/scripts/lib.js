#!/usr/bin/env node
// lib.js — zero-dep core for the /mytasks web layer (story 260613-yfr).
//
// Pure, side-effect-light helpers shared by serve.js (the API server) and
// tests/run.mjs (the behavioral gate). The markdown task FILES are the source of
// truth (design §3); this module round-trips their exact on-disk shape, validates
// against schema.md enums, regenerates INDEX.md, and parses the quick-add token
// grammar. It NEVER deletes a task file.
//
// Field/enum/INDEX contracts are owned by ../schema.md (the §K single home); this
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
  'project', 'parent', 'order', 'recur', 'people', 'labels', 'links',
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

function loadAllItems(tasksDir) {
  const out = [];
  for (const f of listItemFiles(tasksDir)) {
    try { out.push(readItem(f)); } catch (_) { /* skip malformed */ }
  }
  return out;
}

function writeItemAtomic(file, content) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}

// ── INDEX.md regeneration (schema.md "INDEX.md format") ──
function regenerateIndex(tasksDir, opts = {}) {
  const today = opts.today || isoToday();
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
  let md = `# My Tasks\n\nLast regenerated: ${today}\n`;
  for (const bucket of ['leverage', 'neutral', 'overhead']) {
    md += `\n## ${bucket}\n`;
    md += `| id | type | status | due | next_checkin | title | project | parent |\n`;
    md += `|----|------|--------|-----|--------------|-------|---------|--------|\n`;
    for (const it of buckets[bucket].sort(cmp)) {
      const f = it.fm;
      md += `| ${cell(f.id)} | ${cell(f.type)} | ${cell(f.status)} | ${cell(f.due)} | ${cell(f.next_checkin)} | ${cell(f.title)} | ${cell(f.project)} | ${cell(f.parent)} |\n`;
    }
  }
  writeItemAtomic(path.join(tasksDir, 'INDEX.md'), md);
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

module.exports = {
  ENUMS, FIELD_ORDER, LIST_FIELDS,
  parseFrontmatter, serializeFrontmatter, serializeItem,
  versionOf, slugify,
  addDays, addMonthsClamp, nextWeekday, advanceByRecur, isValidRecur,
  validateField, parseNLDate, inferType, parseQuickAdd,
  itemsDir, listItemFiles, readItem, findItemFile, loadAllItems,
  writeItemAtomic, regenerateIndex, isoToday, appendToSection, listSort,
};
