#!/usr/bin/env node
// run.mjs — behavioral gate for the /mytasks web layer (story 260613-yfr).
//
// Zero-dep, deterministic. Exits non-zero on any failure (the per-skill quality
// gate, like /logos run.mjs + /solitaire). Covers: frontmatter round-trip,
// recurrence date math + spawn, INDEX regen, and the live HTTP API (CRUD,
// quick-add tokens, optimistic-concurrency 409, atomic write, complete-spawn).
//
//   node tests/run.mjs --selftest
//
// CJS modules (lib/recur/serve) are loaded via createRequire.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import http from 'node:http';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS = path.join(here, '..', 'scripts');
const lib = require(path.join(SCRIPTS, 'lib.js'));
const { spawnRecurrence } = require(path.join(SCRIPTS, 'recur.js'));
const serve = require(path.join(SCRIPTS, 'serve.js'));

let pass = 0, fail = 0;
const failures = [];
function ok(name, cond, detail) {
  if (cond) { pass++; } else { fail++; failures.push(`${name}${detail ? ' — ' + detail : ''}`); }
}
function eq(name, got, want) { ok(name, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); }

// ── tmp tasks dir ──
function mkTmp() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'mytasks-test-'));
  fs.mkdirSync(path.join(d, 'items'), { recursive: true });
  return d;
}
function writeItem(dir, fm, body = '') { fs.writeFileSync(path.join(dir, 'items', `${fm.id}-${lib.slugify(fm.title)}.md`), lib.serializeItem(fm, body)); }

function reqJson(port, method, p, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({ host: '127.0.0.1', port, path: p, method, headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) } }, (res) => {
      let buf = ''; res.on('data', (c) => buf += c); res.on('end', () => { let j = null; try { j = JSON.parse(buf); } catch (_) {} resolve({ status: res.statusCode, json: j }); });
    });
    r.on('error', reject); if (data) r.write(data); r.end();
  });
}

// ── 1. Pure lib: frontmatter round-trip (incl. bare-key empties + body) ──
function testFrontmatter() {
  const src = `---
schema_version: 2
id: 260613-a3f
title: Launch landing page
type: execution
importance: leverage
status: in-progress
project: launch
parent:
order: 1
recur:
people: []
labels: [launch, q3]
links: []
due: 2026-06-20
start:
checkin:
next_checkin:
created: 2026-06-13
updated: 2026-06-13
completed:
---

## Notes
Parent task.
`;
  const { fm, body } = lib.parseFrontmatter(src);
  eq('fm.id', fm.id, '260613-a3f');
  eq('fm.labels list', fm.labels, ['launch', 'q3']);
  eq('fm.parent empty', fm.parent, '');
  eq('fm.people empty list', fm.people, []);
  ok('body parsed', body.includes('## Notes') && body.includes('Parent task.'), JSON.stringify(body));
  const round = lib.serializeItem(fm, body);
  const re = lib.parseFrontmatter(round);
  eq('round-trip id', re.fm.id, '260613-a3f');
  eq('round-trip labels', re.fm.labels, ['launch', 'q3']);
  eq('round-trip order', re.fm.order, '1');
  ok('round-trip bare-key empties present', /\nstart:\n/.test(round) && /\nrecur:\n/.test(round), round);
  ok('round-trip body preserved', re.body.includes('Parent task.'));
}

// ── 2. Date math + recurrence ──
function testDateMath() {
  eq('addDays', lib.addDays('2026-06-13', 7), '2026-06-20');
  eq('monthly clamp Jan31->Feb28', lib.addMonthsClamp('2026-01-31', 1), '2026-02-28');
  eq('monthly clamp Aug31->Sep30', lib.addMonthsClamp('2026-08-31', 1), '2026-09-30');
  eq('advance weekly', lib.advanceByRecur('2026-06-13', 'weekly'), '2026-06-20');
  eq('advance every 2 weeks', lib.advanceByRecur('2026-06-13', 'every 2 weeks'), '2026-06-27');
  eq('advance every 3 months', lib.advanceByRecur('2026-01-31', 'every 3 months'), '2026-04-30');
  ok('valid recur weekly', lib.isValidRecur('weekly'));
  ok('valid recur every monday', lib.isValidRecur('every monday'));
  ok('invalid recur rejected', !lib.isValidRecur('fortnightly'));
}

// ── 3. recurrence spawn (the §K canonical routine) ──
function testSpawn() {
  const fm = { id: '260613-zzz', title: 'Weekly review', type: 'execution', importance: 'leverage', status: 'completed', project: 'ops', parent: '', order: '5', recur: 'weekly', people: ['sam'], labels: ['ritual'], links: [], due: '2026-06-13', start: '2026-06-12', checkin: 'weekly', next_checkin: '', created: '2026-06-01', updated: '2026-06-13', completed: '2026-06-13', schema_version: 2 };
  let n = 0;
  const r = spawnRecurrence({ fm, body: '' }, { mintId: () => `260620-aa${n++}`, today: '2026-06-13' });
  ok('spawn returned', !!r);
  eq('spawn new id', r.new_id, '260620-aa0');
  eq('spawn due advanced (anchored on completed due)', r.newFm.due, '2026-06-20');
  eq('spawn start advanced', r.newFm.start, '2026-06-19');
  eq('spawn status reset', r.newFm.status, 'pending');
  eq('spawn order NOT copied', r.newFm.order, '');
  eq('spawn recur copied', r.newFm.recur, 'weekly');
  eq('spawn people copied', r.newFm.people, ['sam']);
  ok('spawn log line', /spawned next instance/.test(r.logLine));
  // non-recurring → no spawn
  const r2 = spawnRecurrence({ fm: { ...fm, recur: '' }, body: '' }, { mintId: () => 'x', today: '2026-06-13' });
  ok('non-recurring returns null', r2 === null);
}

// ── 4. INDEX regen ──
function testIndex() {
  const dir = mkTmp();
  writeItem(dir, base('260613-001', 'Top task', { importance: 'leverage', due: '2026-06-20' }));
  writeItem(dir, base('260613-002', 'Done task', { status: 'completed' }));
  writeItem(dir, base('260613-003', 'Inbox neutral', {}));
  lib.regenerateIndex(dir, { today: '2026-06-13' });
  const idx = fs.readFileSync(path.join(dir, 'INDEX.md'), 'utf8');
  ok('index has buckets', /## leverage/.test(idx) && /## neutral/.test(idx) && /## overhead/.test(idx));
  ok('index excludes completed', !/Done task/.test(idx));
  ok('index has leverage task', /Top task/.test(idx));
  ok('index has Last regenerated', /Last regenerated: 2026-06-13/.test(idx));
  fs.rmSync(dir, { recursive: true, force: true });
}
function base(id, title, extra) {
  return { schema_version: 2, id, title, type: 'execution', importance: 'neutral', status: 'pending', project: '', parent: '', order: '', recur: '', people: [], labels: [], links: [], due: '', start: '', checkin: '', next_checkin: '', created: '2026-06-13', updated: '2026-06-13', completed: '', ...extra };
}

// ── 5. Live HTTP API ──
async function testApi() {
  const dir = mkTmp();
  await serve.loadMinter();
  const { server, port } = await serve.start({ tasksDir: dir, port: 0, idleSec: 0, pidFile: null });
  try {
    // POST quick-add with tokens
    let r = await reqJson(port, 'POST', '/api/tasks', { text: 'Call @sam about #launch +urgent tomorrow' });
    eq('POST create 201', r.status, 201);
    const t = r.json.task;
    eq('quick-add project', t.project, 'launch');
    eq('quick-add labels', t.labels, ['urgent']);
    eq('quick-add people (literal handle)', t.people, ['sam']);
    eq('quick-add type call', t.type, 'call');
    ok('quick-add due set', !!t.due, t.due);
    ok('quick-add title stripped', t.title === 'Call about', t.title);
    ok('id is date-rnd', /^\d{6}-[0-9a-z]{3}$/.test(t.id), t.id);

    // GET list
    r = await reqJson(port, 'GET', '/api/tasks');
    eq('GET list count', r.json.tasks.length, 1);

    // GET meta
    r = await reqJson(port, 'GET', '/api/meta');
    eq('meta projects', r.json.projects, ['launch']);
    eq('meta labels', r.json.labels, ['urgent']);

    // PATCH with correct version
    let cur = (await reqJson(port, 'GET', '/api/tasks/' + t.id)).json.task;
    r = await reqJson(port, 'PATCH', '/api/tasks/' + t.id, { expected_version: cur.version, fields: { importance: 'leverage' } });
    eq('PATCH 200', r.status, 200);
    eq('PATCH applied', r.json.task.importance, 'leverage');

    // PATCH with STALE version → 409
    r = await reqJson(port, 'PATCH', '/api/tasks/' + t.id, { expected_version: cur.version, fields: { importance: 'overhead' } });
    eq('stale PATCH 409', r.status, 409);
    ok('409 carries current_version', !!r.json.current_version);

    // PATCH invalid enum → 400
    cur = (await reqJson(port, 'GET', '/api/tasks/' + t.id)).json.task;
    r = await reqJson(port, 'PATCH', '/api/tasks/' + t.id, { expected_version: cur.version, fields: { status: 'open' } });
    eq('invalid enum 400', r.status, 400);

    // Subtask: create child with parent, then GET parent shows it
    r = await reqJson(port, 'POST', '/api/tasks', { fields: { title: 'Draft copy', parent: t.id } });
    eq('subtask created 201', r.status, 201);
    eq('subtask parent set', r.json.task.parent, t.id);
    r = await reqJson(port, 'GET', '/api/tasks/' + t.id);
    eq('parent shows 1 subtask', r.json.task.subtasks.length, 1);

    // reorder
    const a = (await reqJson(port, 'POST', '/api/tasks', { fields: { title: 'A', project: 'proj' } })).json.task;
    const b = (await reqJson(port, 'POST', '/api/tasks', { fields: { title: 'B', project: 'proj' } })).json.task;
    r = await reqJson(port, 'POST', '/api/tasks/reorder', { project: 'proj', order: [b.id, a.id] });
    eq('reorder 200', r.status, 200);
    const bAfter = (await reqJson(port, 'GET', '/api/tasks/' + b.id)).json.task;
    eq('reorder persisted order', bAfter.order, 1);
    // …and the project list reflects that order (drag-reorder must survive a reload)
    const projList = (await reqJson(port, 'GET', '/api/tasks?project=proj')).json.tasks;
    eq('project list sorted by order [0]', projList[0].id, b.id);
    eq('project list sorted by order [1]', projList[1].id, a.id);

    // recurring complete → spawns next instance
    const rec = (await reqJson(port, 'POST', '/api/tasks', { fields: { title: 'Weekly sync', recur: 'weekly', due: '2026-06-13' } })).json.task;
    const before = (await reqJson(port, 'GET', '/api/tasks')).json.tasks.length;
    r = await reqJson(port, 'POST', '/api/tasks/' + rec.id + '/complete', { expected_version: rec.version });
    eq('complete 200', r.status, 200);
    ok('complete spawned next', !!r.json.spawned && !!r.json.spawned.new_id, JSON.stringify(r.json.spawned));
    eq('spawned due advanced', r.json.spawned.new_due, '2026-06-20');
    const after = (await reqJson(port, 'GET', '/api/tasks')).json.tasks.length;
    eq('active count net unchanged (rec completed, instance spawned)', after, before);

    // complete never deletes the file
    const files = fs.readdirSync(path.join(dir, 'items'));
    ok('recurring file still on disk (no delete)', files.some((f) => f.startsWith(rec.id)));

    // drop
    const dropMe = (await reqJson(port, 'POST', '/api/tasks', { fields: { title: 'Drop me' } })).json.task;
    r = await reqJson(port, 'POST', '/api/tasks/' + dropMe.id + '/drop', { expected_version: dropMe.version, reason: 'obsolete' });
    eq('drop 200', r.status, 200);
    eq('drop status', r.json.task.status, 'dropped');
    ok('drop kept file', fs.readdirSync(path.join(dir, 'items')).some((f) => f.startsWith(dropMe.id)));

    // INDEX regenerated after mutation
    ok('INDEX.md exists after mutations', fs.existsSync(path.join(dir, 'INDEX.md')));

    // cross-origin write rejected
    r = await new Promise((resolve) => {
      const data = JSON.stringify({ text: 'evil' });
      const rq = http.request({ host: '127.0.0.1', port, path: '/api/tasks', method: 'POST', headers: { 'Content-Type': 'application/json', 'Origin': 'http://evil.example.com', 'Content-Length': Buffer.byteLength(data) } }, (res) => { let b = ''; res.on('data', (c) => b += c); res.on('end', () => resolve({ status: res.statusCode })); });
      rq.write(data); rq.end();
    });
    eq('cross-origin write 403', r.status, 403);

  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  testFrontmatter();
  testDateMath();
  testSpawn();
  testIndex();
  await testApi();
  console.log(`\nmytasks web selftest: ${pass} passed, ${fail} failed`);
  if (fail) { console.error('FAILURES:\n  - ' + failures.join('\n  - ')); process.exit(1); }
  process.exit(0);
}

if (process.argv.includes('--selftest')) {
  main().catch((e) => { console.error('selftest crashed:', e); process.exit(2); });
} else {
  console.log('usage: node tests/run.mjs --selftest');
  process.exit(0);
}
