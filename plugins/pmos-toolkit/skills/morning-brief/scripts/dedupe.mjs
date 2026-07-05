#!/usr/bin/env node
// morning-brief dedupe (design 02_design.html#confirm §9, story 260702-ww7 T2, §H).
// The DETERMINISTIC half of dedupe: exact source-link match of a proposed create
// against the set of already-open /mytasks items. The title-similarity remainder is
// LLM judgment in the SKILL body — this script never guesses.
//
// A proposed create whose item source-link exactly matches the source link of an
// open task is downgraded to "already tracked" (INV-6 — /mytasks is the sole store,
// so we never mint a duplicate). Matches carry the tracked task id back for the lane.
//
// Zero-dependency Node ESM. `node dedupe.mjs --selftest` exercises the pure core.
// Runtime use: `node dedupe.mjs <tasksDir> <proposals.json>` reads open /mytasks
// items via the sibling /mytasks lib (byte-compatible) and prints annotated JSON.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Active statuses whose source links count as "already tracked" (INV-6). A
// completed/dropped task does NOT suppress a re-proposal — the item is live again.
const ACTIVE = new Set(['pending', 'in-progress', 'waiting']);

// Normalize a source link for exact comparison: trim only. We do NOT canonicalize
// hosts/queries — an "exact" match per §9 is a byte-equal deep link after trimming;
// anything looser is title-similarity's job (judgment, not this script).
export function normalizeLink(link) {
  return typeof link === 'string' ? link.trim() : '';
}

// Pull every source link an open task carries: its `links` frontmatter list plus any
// bare URL in its body (task creation in T3 writes the link into both). Returns a Set
// of normalized non-empty links.
export function itemLinks(item) {
  const out = new Set();
  const fm = item.fm || item;
  const links = fm.links;
  if (Array.isArray(links)) for (const l of links) { const n = normalizeLink(l); if (n) out.add(n); }
  else if (typeof links === 'string') { const n = normalizeLink(links); if (n) out.add(n); }
  const body = item.body || '';
  const urlRe = /https?:\/\/[^\s<>")]+/g;
  let m;
  while ((m = urlRe.exec(body)) !== null) { const n = normalizeLink(m[0]); if (n) out.add(n); }
  return out;
}

// Build the index of already-tracked links -> tracked task id, from open items only.
export function trackedIndex(openItems) {
  const idx = new Map();
  for (const it of openItems) {
    const fm = it.fm || it;
    const status = fm.status || 'pending';
    if (!ACTIVE.has(status)) continue;
    for (const link of itemLinks(it)) {
      if (!idx.has(link)) idx.set(link, fm.id || (it.id || null));
    }
  }
  return idx;
}

// Pure core: annotate each proposal with exact source-link dedupe. A proposal keeps
// all its fields and gains { already_tracked, tracked_id }. A create with an empty
// link is passed through untouched (already_tracked:false) — link dedupe cannot speak
// to it; the SKILL layer runs title-similarity on those (judgment).
export function dedupeProposals(proposals, openItems) {
  const idx = openItems instanceof Map ? openItems : trackedIndex(openItems);
  return (proposals || []).map((p) => {
    if (p.action !== 'create-task') return { ...p, already_tracked: false, tracked_id: null };
    const link = normalizeLink(p.link);
    if (link && idx.has(link)) return { ...p, already_tracked: true, tracked_id: idx.get(link) };
    return { ...p, already_tracked: false, tracked_id: null };
  });
}

// Runtime loader: read open /mytasks items via the sibling lib (byte-compatible),
// falling back to a local frontmatter+body read when that lib is absent.
function loadOpenItems(tasksDir) {
  const itemsDir = path.join(tasksDir, 'items');
  if (!fs.existsSync(itemsDir)) return [];
  try {
    const require = createRequire(import.meta.url);
    const mt = require(path.join(__dirname, '..', '..', 'mytasks', 'scripts', 'lib.js'));
    if (typeof mt.loadAllItems === 'function') return mt.loadAllItems(tasksDir);
  } catch { /* fall through */ }
  return fs.readdirSync(itemsDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => parseItem(fs.readFileSync(path.join(itemsDir, f), 'utf8')));
}
function parseItem(text) {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  const fm = {}; let body = '';
  if (m) {
    body = m[2] || '';
    for (const line of m[1].split('\n')) {
      const mm = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
      if (!mm) continue;
      let v = mm[2].trim();
      const li = /^\[(.*)\]$/.exec(v);
      if (li) v = li[1].trim() === '' ? [] : li[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
      else v = v.replace(/^["']|["']$/g, '');
      fm[mm[1]] = v;
    }
  }
  return { fm, body };
}

// ── Selftest ──
function selftest() {
  let pass = 0, fail = 0;
  const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`  FAIL: ${name}`); } };

  const open = [
    { fm: { id: 't1', status: 'pending', links: ['https://mail/x1'] }, body: 'from the thread https://mail/deep1' },
    { fm: { id: 't2', status: 'completed', links: ['https://mail/x2'] }, body: '' },
    { fm: { id: 't3', status: 'waiting', links: [] }, body: 'see https://notion/c3 for the comment' },
  ];
  const idx = trackedIndex(open);

  // hit: exact link match against an open task's links field
  const props = dedupeProposals([
    { action: 'create-task', summary: 'A', link: 'https://mail/x1' },
    { action: 'create-task', summary: 'B', link: 'https://mail/none' },
    { action: 'create-task', summary: 'C', link: '  https://notion/c3  ' }, // body match + whitespace
    { action: 'create-task', summary: 'D', link: '' },                       // malformed/empty link
    { action: 'create-task', summary: 'E', link: 'https://mail/x2' },        // matches a COMPLETED task -> not tracked
    { action: 'dismiss', summary: 'F', link: 'https://mail/x1' },            // non-create passes through
  ], idx);

  ok('hit: links-field exact match tracked', props[0].already_tracked === true && props[0].tracked_id === 't1');
  ok('miss: unknown link not tracked', props[1].already_tracked === false && props[1].tracked_id === null);
  ok('hit: body-url match after trim', props[2].already_tracked === true && props[2].tracked_id === 't3');
  ok('malformed: empty link never tracked', props[3].already_tracked === false);
  ok('completed task does not suppress re-propose', props[4].already_tracked === false);
  ok('non-create action passes through', props[5].already_tracked === false && props[5].tracked_id === null);

  // deep-link in body of the active task t1 is also indexed
  ok('body deep-link indexed for active task', idx.get('https://mail/deep1') === 't1');
  ok('completed task link NOT indexed', !idx.has('https://mail/x2'));
  ok('normalizeLink trims', normalizeLink('  x  ') === 'x' && normalizeLink(null) === '');
  ok('itemLinks unions field + body', itemLinks(open[0]).has('https://mail/x1') && itemLinks(open[0]).has('https://mail/deep1'));

  console.log(`dedupe.mjs selftest: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--selftest')) { selftest(); }
  else {
    const [tasksDir, propsFile] = process.argv.slice(2);
    if (!tasksDir || !propsFile) { console.error('usage: node dedupe.mjs <tasksDir> <proposals.json> | --selftest'); process.exit(64); }
    const proposals = JSON.parse(fs.readFileSync(propsFile, 'utf8'));
    const annotated = dedupeProposals(proposals, loadOpenItems(tasksDir));
    console.log(JSON.stringify(annotated, null, 2));
  }
}
