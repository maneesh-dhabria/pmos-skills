#!/usr/bin/env node
// plan.mjs — assemble a human-first 1:1 prep agenda (AC4) from the report's record, and emit a
// commentable, self-contained HTML artifact (reference/prep-skeleton.html) plus a terminal summary.
//
// Ordering is the human-first §5 order: Human first → Last time's open loops → Their agenda → Growth &
// feedback in view → Coached suggestions. The three flags (status-creep, stale-action, career-due) and
// the "due" status are computed by record-lib (§H, deterministic — never model arithmetic); the coached
// questions come from reference/coaching-corpus.md via coach-lib. Everything is offline.
//
//   node plan.mjs --handle sarah-chen [--today 2026-07-05] [--out <path>] [--no-html]

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readRecord, recordExists, storeDir, assertStoreOutsideRepo, parseRecord,
  statusCreepFlag, staleActionFlags, careerDueFlag, dueStatus,
} from './record-lib.mjs';
import { readQuestionBank, questionsFor, normalizeIntent } from './coach-lib.mjs';
import { parseArgs, today, die } from './cli-lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKELETON = join(__dirname, '..', 'reference', 'prep-skeleton.html');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const nonEmpty = (lines) => (lines || []).filter((l) => l.trim() !== '');

const f = parseArgs(process.argv.slice(2));
if (f.selftest) { runSelftest(); }
if (!f.handle) die('usage: plan.mjs --handle <h> [--today <date>] [--out <path>] [--no-html]', 64);
if (!recordExists(f.handle)) die(`no 1:1 record for '${f.handle}' — run /one-on-one add ${f.handle} first`, 65);

const date = today(f);
const rec = readRecord(f.handle);
const bank = readQuestionBank();
const model = buildPlan(rec, bank, date);

// ---- terminal summary (always) --------------------------------------------------------------------
console.log(`\n1:1 prep — ${rec.fm.name || f.handle} (${date})`);
console.log(model.due.due ? `  ⏰ Due: ${model.due.daysSince ?? '—'} day(s) since last session (cadence ${rec.fm.cadence || 'weekly'}).`
  : `  ✓ On cadence (${model.due.daysSince ?? '—'} day(s) since last session).`);
for (const flag of model.flags) console.log(`  ⚑ ${flag.replace(/<[^>]+>/g, '')}`);
console.log(`  Opener: ${model.opener}`);
if (model.inbox.length) console.log(`  Their agenda: ${model.inbox.length} inbox item(s).`);
console.log(`  Coached questions queued: ${model.coached.length}.`);

// ---- HTML artifact (unless --no-html) -------------------------------------------------------------
if (!f['no-html']) {
  const outDir = f.out ? dirname(f.out) : join(storeDir(), 'prep');
  const outPath = f.out || join(outDir, `${f.handle}-${date}.html`);
  assertStoreOutsideRepo(outDir);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const html = renderHtml(model, rec, f.handle, date);
  writeFileSync(outPath, html);
  console.log(`  → prep artifact: ${outPath} (open it to annotate before the meeting)`);
}

// ---------------------------------------------------------------------------------------------------

function buildPlan(rec, bank, date) {
  const S = rec.sections;
  // Deterministic flags.
  const stale = staleActionFlags(rec, date);
  const creep = statusCreepFlag(rec);
  const careerDue = careerDueFlag(rec, date);
  const due = dueStatus(rec, date);
  const flags = [];
  if (creep) flags.push('<b>status-creep</b> — the last few sessions were topic-only; go below the surface this week.');
  for (const s of stale) flags.push(`<b>stale action</b> — open ${s.age} days: ${esc(s.line.replace(/^- \[ \]\s*/, ''))}.`);
  if (careerDue) flags.push('<b>career-due</b> — no career conversation on record recently; consider running <code>/one-on-one career</code>.');

  // Their agenda: inbox items, and the set of surfaced intents.
  const inbox = nonEmpty(S['Inbox']);
  const surfaced = new Set();
  for (const line of inbox) {
    const m = line.match(/^- \[([a-z-]+)\]/i);
    if (m) surfaced.add(normalizeIntent(m[1]));
  }
  if (careerDue) surfaced.add('career');
  if (creep) { surfaced.add('growth-career'); surfaced.add('feedback-up'); }

  // Coached questions: opener + up to 2 per surfaced intent (stable corpus order).
  const opener = (bank.opener || ['How are you doing this week?'])[0];
  const coached = [];
  for (const intent of surfaced) for (const q of questionsFor(bank, intent, 2)) coached.push({ intent, q });
  // Always include one growth-career nudge even with an empty agenda (coaching is the point, D6).
  if (!coached.length) for (const q of questionsFor(bank, 'growth-career', 1)) coached.push({ intent: 'growth-career', q });

  return {
    opener, flags, coached, due,
    openLoops: nonEmpty(S['Open action items']),
    inbox,
    goals: nonEmpty(S['Goals & growth focus']),
    themes: nonEmpty(S['Standing themes']),
    perf: nonEmpty(S['Performance feedback']).slice(-3),
    coaching: nonEmpty(S['Coaching feedback']).slice(-3),
  };
}

function renderList(lines, emptyMsg) {
  if (!lines.length) return `<p class="empty">${esc(emptyMsg)}</p>`;
  const items = lines.map((l) => `<li>${esc(l.replace(/^- (\[.\] )?/, ''))}</li>`).join('\n');
  return `<ul>\n${items}\n</ul>`;
}

function renderHtml(m, rec, handle, date) {
  // Strip the authoring doc-comment (it mentions {{tokens}} literally — must not survive substitution).
  const tpl = readFileSync(SKELETON, 'utf8').replace(/<!--[\s\S]*?-->\n/, '');
  const parts = [];
  // 1. Human first
  parts.push(`<section><h2>Human first</h2><p class="lead">${esc(m.opener)}</p></section>`);
  // 2. Last time's open loops
  const loops = m.openLoops.length
    ? renderList(m.openLoops, '') + (m.flags.some((x) => x.includes('stale')) ? m.flags.filter((x) => x.includes('stale')).map((x) => `<div class="flag">${x}</div>`).join('') : '')
    : '<p class="empty">No open loops from last time.</p>';
  parts.push(`<section><h2>Last time's open loops</h2>${loops}</section>`);
  // 3. Their agenda
  parts.push(`<section><h2>Their agenda</h2>${renderInbox(m.inbox)}</section>`);
  // 4. Growth & feedback in view
  parts.push(`<section><h2>Growth &amp; feedback in view</h2>`
    + `<h3 class="muted" style="font-family:var(--sans);font-size:.85rem;margin:.6rem 0 .2rem">Goals &amp; growth focus</h3>${renderList(m.goals, 'No goals recorded yet — set one with /one-on-one set --field goal.')}`
    + `<h3 class="muted" style="font-family:var(--sans);font-size:.85rem;margin:.6rem 0 .2rem">Standing themes</h3>${renderList(m.themes, 'None.')}`
    + `<h3 class="muted" style="font-family:var(--sans);font-size:.85rem;margin:.6rem 0 .2rem">Recent performance feedback</h3>${renderList(m.perf, 'None recorded.')}`
    + `<h3 class="muted" style="font-family:var(--sans);font-size:.85rem;margin:.6rem 0 .2rem">Recent coaching feedback</h3>${renderList(m.coaching, 'None recorded.')}`
    + (m.flags.some((x) => x.includes('career-due')) ? `<div class="flag">${m.flags.find((x) => x.includes('career-due'))}</div>` : '')
    + `</section>`);
  // 5. Coached suggestions
  const qs = m.coached.map((c) => `<li class="q"><span class="tag">${esc(c.intent)}</span>${esc(c.q)}</li>`).join('\n');
  const creepFlag = m.flags.find((x) => x.includes('status-creep'));
  parts.push(`<section><h2>Coached suggestions</h2>${creepFlag ? `<div class="flag">${creepFlag}</div>` : ''}<ul>${qs}</ul></section>`);

  return tpl
    .replace(/\{\{title\}\}/g, esc(`1:1 prep — ${rec.fm.name || handle} — ${date}`))
    .replace(/\{\{report_name\}\}/g, esc(rec.fm.name || handle))
    .replace(/\{\{handle\}\}/g, esc(handle))
    .replace(/\{\{subtitle\}\}/g, esc(`${rec.fm.role || 'report'} · cadence ${rec.fm.cadence || 'weekly'} · ${m.due.due ? `due (${m.due.daysSince ?? '—'}d since last)` : 'on cadence'}`))
    .replace(/\{\{generated\}\}/g, esc(date))
    .replace(/\{\{body\}\}/g, parts.join('\n'));
}

function renderInbox(inbox) {
  if (!inbox.length) return '<p class="empty">Empty — nothing captured since last time. Ask what\'s top of mind.</p>';
  const items = inbox.map((l) => {
    const m = l.match(/^- \[([a-z-]+)\]\s+(.*)$/i);
    return m ? `<li><span class="tag">${esc(m[1])}</span>${esc(m[2])}</li>` : `<li>${esc(l.replace(/^- /, ''))}</li>`;
  }).join('\n');
  return `<ul>\n${items}\n</ul>`;
}

// ---- selftest -------------------------------------------------------------------------------------
function runSelftest() {
  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) pass++; else { fail++; console.error('  FAIL: ' + m); } };
  const bank = readQuestionBank();
  const rec = parseRecord(
`---
schema_version: 1
handle: t
name: Test Report
role: PM
cadence: weekly
started: 2026-06-01
career_last_reviewed:
---

## Goals & growth focus
- Grow into staff scope.

## Standing themes

## Operating manual

## Performance feedback

## Coaching feedback

## Open action items
- [ ] (me) intro to platform lead — since 2026-05-01

## Inbox
- [growth] staff-eng ladder
- [blocker] blocked on legal

## Sessions
### 2026-06-25
- Topics: sprint.
### 2026-06-18
- Topics: bugs.
### 2026-06-11
- Topics: roadmap.
`);
  const m = buildPlan(rec, bank, '2026-07-05');
  ok(m.due.due === true, 'due computed');
  ok(m.flags.some((x) => x.includes('stale')), 'stale-action flag raised (>21d open item)');
  ok(m.flags.some((x) => x.includes('status-creep')), 'status-creep flag raised (3 topic-only sessions)');
  ok(m.flags.some((x) => x.includes('career-due')), 'career-due flag raised (never reviewed)');
  ok(m.coached.some((c) => c.intent === 'growth-career'), 'growth intent surfaced from inbox');
  ok(m.coached.some((c) => c.intent === 'blockers'), 'blocker intent surfaced from inbox');
  ok(m.coached.some((c) => c.intent === 'career'), 'career intent surfaced from career-due');
  const html = renderHtml(m, rec, 't', '2026-07-05');
  ok(html.includes('Human first') && html.indexOf('Human first') < html.indexOf('Coached suggestions'), 'human-first ordering preserved');
  ok(!html.includes('{{'), 'all skeleton tokens substituted');
  ok(html.includes('data-output="oneonone-prep"'), 'artifact anchor present');
  ok(html.includes('pmos:skill'), 'pmos:skill meta present');
  // empty-agenda still coaches (D6)
  const empty = parseRecord(`---\nschema_version: 1\nhandle: e\nname: E\nrole: PM\ncadence: weekly\nstarted: 2026-07-01\ncareer_last_reviewed: 2026-07-01\n---\n\n## Goals & growth focus\n\n## Standing themes\n\n## Operating manual\n\n## Performance feedback\n\n## Coaching feedback\n\n## Open action items\n\n## Inbox\n\n## Sessions\n### 2026-07-04\n- Growth: talked scope.\n`);
  const me = buildPlan(empty, bank, '2026-07-05');
  ok(me.coached.length >= 1, 'empty agenda still yields a coached question (D6)');
  if (fail === 0) { console.log(`plan.mjs selftest PASS: ${pass} assertions`); process.exit(0); }
  console.error(`plan.mjs selftest FAIL: ${fail}/${pass + fail}`); process.exit(1);
}
