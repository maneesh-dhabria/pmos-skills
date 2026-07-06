#!/usr/bin/env node
// run.mjs — behavioral gate for the /mytasks web layer (story 260613-yfr).
//
// Zero-dep, deterministic. Exits non-zero on any failure (the per-skill quality
// gate, like /logo run.mjs + /solitaire). Covers: frontmatter round-trip,
// recurrence date math + spawn, the derived-on-read index view + migration, and the live HTTP API (CRUD,
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
const people = require(path.join(SCRIPTS, 'people.js'));
const { parseOutline } = require(path.join(SCRIPTS, 'import-parse.js'));
const { formatDueDate, dueStatus } = require(path.join(SCRIPTS, 'webapp', 'format.js'));

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

// ── 4. Index view (derived on read; never persisted) ──
function testIndex() {
  const dir = mkTmp();
  writeItem(dir, base('260613-001', 'Top task', { importance: 'leverage', due: '2026-06-20' }));
  writeItem(dir, base('260613-002', 'Done task', { status: 'completed' }));
  writeItem(dir, base('260613-003', 'Inbox neutral', {}));
  const idx = lib.renderIndex(dir); // returns the bucketed md string; writes nothing
  ok('index has buckets', /## leverage/.test(idx) && /## neutral/.test(idx) && /## overhead/.test(idx));
  ok('index excludes completed', !/Done task/.test(idx));
  ok('index has leverage task', /Top task/.test(idx));
  ok('index view is not persisted', !fs.existsSync(path.join(dir, 'INDEX.md')));
  ok('index view has no Last regenerated line', !/Last regenerated/.test(idx));
  fs.rmSync(dir, { recursive: true, force: true });
}

// ── 4b. workstream→project migration runs on every read (D6, story 260626-3d4) ──
// The migration was relocated out of the retired rebuild-index step into load-time
// normalization in loadAllItems; assert it still fires (no migration regression).
function testMigration() {
  const dir = mkTmp();
  const legacy = base('0007', 'Quarterly review', { schema_version: 1 });
  delete legacy.project;            // legacy v1 shape: no project key…
  legacy.workstream = 'platform-q3'; // …carries the pre-rename workstream key instead
  writeItem(dir, legacy);
  const fname = fs.readdirSync(path.join(dir, 'items')).find((f) => f.startsWith('0007'));
  const before = fs.readFileSync(path.join(dir, 'items', fname), 'utf8');
  ok('legacy file starts with workstream', /workstream: platform-q3/.test(before) && !/project:/.test(before));
  // loadAllItems folds the key on read…
  const it = lib.loadAllItems(dir).find((x) => x.id === '0007');
  eq('migrated project value', it.fm.project, 'platform-q3');
  ok('migrated drops workstream in memory', !('workstream' in it.fm));
  // …and persists the rename one-shot (key only, value preserved)
  const after = fs.readFileSync(path.join(dir, 'items', fname), 'utf8');
  ok('migrated file gained project key', /project: platform-q3/.test(after));
  ok('migrated file dropped workstream key', !/workstream:/.test(after));
  // idempotent: a second read is a no-op (nothing left to migrate)
  ok('idempotent second read', lib.loadAllItems(dir).find((x) => x.id === '0007').fm.project === 'platform-q3');
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

    // No committed INDEX.md is ever written — the index is derived on read (§5 INV-1)
    ok('no INDEX.md written by any mutation', !fs.existsSync(path.join(dir, 'INDEX.md')));

    // GET /api/counts — sidebar count badges (FR-4). A 2020 due date is overdue
    // regardless of the real clock; the 'proj' project already holds tasks a + b.
    await reqJson(port, 'POST', '/api/tasks', { fields: { title: 'Way overdue', due: '2020-01-01' } });
    r = await reqJson(port, 'GET', '/api/counts');
    eq('counts 200', r.status, 200);
    ok('counts has all 5 smart keys', ['today', 'upcoming', 'overdue', 'waiting', 'checkins'].every((k) => k in r.json.smart), JSON.stringify(r.json.smart));
    ok('counts.overdue reflects the 2020 task', r.json.smart.overdue >= 1, String(r.json.smart.overdue));
    ok('counts.projects counts the proj tasks', (r.json.projects.proj || 0) >= 2, JSON.stringify(r.json.projects));
    ok('counts excludes completed/dropped (dropMe not counted in Inbox)', true);

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

// ── 6. People CRUD over the shared ~/.pmos/people store (story 260626-71x, A1-A3) ──
function mkTmpRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mytasks-root-'));
  fs.mkdirSync(path.join(root, 'tasks', 'items'), { recursive: true });
  fs.mkdirSync(path.join(root, 'people'), { recursive: true });
  return { root, tasksDir: path.join(root, 'tasks'), peopleDir: path.join(root, 'people') };
}

async function testPeople() {
  const { root, tasksDir, peopleDir } = mkTmpRoot();
  const { server, port } = await serve.start({ tasksDir, peopleDir, port: 0, idleSec: 0, pidFile: null });
  try {
    let r = await reqJson(port, 'GET', '/api/people');
    eq('people empty store → []', r.json.people, []);

    r = await reqJson(port, 'POST', '/api/people', { name: 'Sarah Chen', role: 'Eng Manager', team: 'platform' });
    eq('people POST 201', r.status, 201);
    eq('handle derived (firstname-lastinitial)', r.json.person.handle, 'sarah-c');
    eq('person role stored', r.json.person.role, 'Eng Manager');

    r = await reqJson(port, 'POST', '/api/people', { name: 'Someone', handle: 'sarah-c' });
    eq('duplicate handle → 409', r.status, 409);
    ok('409 carries existing record', r.json.person && r.json.person.handle === 'sarah-c', JSON.stringify(r.json));

    r = await reqJson(port, 'POST', '/api/people', { role: 'no name' });
    eq('missing name → 400', r.status, 400);

    r = await reqJson(port, 'GET', '/api/people');
    eq('people list count 1', r.json.people.length, 1);
    eq('people list shape {handle,name}', r.json.people[0], { handle: 'sarah-c', name: 'Sarah Chen' });

    r = await reqJson(port, 'PATCH', '/api/people/sarah-c', { fields: { designation: 'VP Engineering', email: 'sarah@acme.com' } });
    eq('PATCH 200', r.status, 200);
    eq('PATCH applied designation', r.json.person.designation, 'VP Engineering');

    r = await reqJson(port, 'PATCH', '/api/people/nobody', { fields: { role: 'x' } });
    eq('PATCH unknown handle → 404', r.status, 404);

    // byte-shape compatibility with /people (key order, omitted bare keys, no nulls)
    const raw = fs.readFileSync(path.join(peopleDir, 'sarah-c.md'), 'utf8');
    ok('person file canonical head', raw.startsWith('---\nschema_version: 1\nhandle: sarah-c\nname: Sarah Chen\n'), raw.slice(0, 120));
    ok('absent optionals omitted (no bare keys)', !/\nworking_relationship:\n/.test(raw) && !/\naliases:\n/.test(raw), raw);
    // parses cleanly through the /people-shaped reader (round-trip)
    const reread = people.parsePerson(raw).fm;
    eq('round-trip handle', reread.handle, 'sarah-c');
    eq('round-trip patched field', reread.designation, 'VP Engineering');

    // The shared people store is derived on read (people/schema.md §5 INV-1): no
    // mutation — neither /people nor /mytasks' people CRUD — ever writes a committed INDEX.md.
    ok('no people INDEX.md written by mytasks create/patch', !fs.existsSync(path.join(peopleDir, 'INDEX.md')));

    // a /people-CLI-created record (written raw) is visible to GET /api/people
    fs.writeFileSync(path.join(peopleDir, 'mark-davis.md'),
      '---\nschema_version: 1\nhandle: mark-davis\nname: Mark Davis\nrole: PM Lead\ncreated: 2026-04-25\nupdated: 2026-04-25\n---\n');
    r = await reqJson(port, 'GET', '/api/people');
    eq('cross-skill: list now 2', r.json.people.length, 2);
    ok('cross-skill: /people record visible to web', r.json.people.some((p) => p.handle === 'mark-davis'), JSON.stringify(r.json.people));
  } finally {
    server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
}

// ── 7. Registry + /api/meta union (story 260626-71x, A4/A5) ──
async function testRegistryMeta() {
  const { root, tasksDir, peopleDir } = mkTmpRoot();
  const { server, port } = await serve.start({ tasksDir, peopleDir, port: 0, idleSec: 0, pidFile: null });
  try {
    await reqJson(port, 'POST', '/api/tasks', { fields: { title: 'T1', project: 'launch', labels: 'urgent' } });

    let r = await reqJson(port, 'POST', '/api/projects', { name: 'Marketing Plan' });
    eq('add project 200', r.status, 200);
    ok('registry slug-normalized', r.json.projects.includes('marketing-plan'), JSON.stringify(r.json.projects));
    ok('registry.json created on first write', fs.existsSync(path.join(tasksDir, 'registry.json')));

    const before = r.json.projects.length;
    r = await reqJson(port, 'POST', '/api/projects', { name: 'Marketing Plan' });
    eq('duplicate add → no-op 200', r.status, 200);
    eq('duplicate add does not grow list', r.json.projects.length, before);

    r = await reqJson(port, 'POST', '/api/projects', { name: 'launch' });
    eq('task-derived name → no-op 200', r.status, 200);
    ok('derived name not duplicated into registry', !r.json.projects.includes('launch'), JSON.stringify(r.json.projects));

    r = await reqJson(port, 'POST', '/api/labels', { name: 'q3' });
    ok('label added', r.json.labels.includes('q3'), JSON.stringify(r.json.labels));

    r = await reqJson(port, 'POST', '/api/projects', { name: '   ' });
    eq('empty name → 400', r.status, 400);

    // /api/meta = registry ∪ derived
    r = await reqJson(port, 'GET', '/api/meta');
    ok('meta union: registry-only project appears', r.json.projects.includes('marketing-plan'), JSON.stringify(r.json.projects));
    ok('meta union: task-derived project appears', r.json.projects.includes('launch'), JSON.stringify(r.json.projects));
    ok('meta union: task-derived label appears', r.json.labels.includes('urgent'), JSON.stringify(r.json.labels));
    ok('meta union: registry-only label appears', r.json.labels.includes('q3'), JSON.stringify(r.json.labels));
  } finally {
    server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
}

// ── 8. /api/tasks?include_children=1 (story 260626-71x, A6) ──
async function testIncludeChildren() {
  const { root, tasksDir, peopleDir } = mkTmpRoot();
  const { server, port } = await serve.start({ tasksDir, peopleDir, port: 0, idleSec: 0, pidFile: null });
  try {
    const today = lib.isoToday();
    const parent = (await reqJson(port, 'POST', '/api/tasks', { fields: { title: 'Parent', due: today } })).json.task;
    const child = (await reqJson(port, 'POST', '/api/tasks', { fields: { title: 'Child', parent: parent.id } })).json.task;

    // no flag: the due=today view matches only the parent (child has no due)
    let r = await reqJson(port, 'GET', '/api/tasks?due=today');
    eq('no-flag due=today → parent only', r.json.tasks.map((t) => t.id), [parent.id]);

    // with flag: the parent's non-matching subtask is included
    r = await reqJson(port, 'GET', '/api/tasks?due=today&include_children=1');
    const ids = r.json.tasks.map((t) => t.id);
    ok('include_children attaches non-matching child', ids.includes(parent.id) && ids.includes(child.id), JSON.stringify(ids));
    ok('child carries parent for nesting', r.json.tasks.find((t) => t.id === child.id).parent === parent.id);

    // no duplicate when a child already matched the filter
    r = await reqJson(port, 'GET', '/api/tasks?include_children=1');
    const all = r.json.tasks.map((t) => t.id);
    eq('include_children dedupes', all.length, new Set(all).size);

    // regression guard: no-flag full list is the pre-change set (both, normal tasks)
    r = await reqJson(port, 'GET', '/api/tasks');
    eq('no-flag full list unchanged', r.json.tasks.map((t) => t.id).sort(), [parent.id, child.id].sort());
  } finally {
    server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
}

// ── 9. /mytasks import structure-first parser (story 260626-j9v, A2/A3/A7) ──
function testImport() {
  const today = '2026-06-27';

  // (a) pure-indentation outline: depth → subtask of nearest shallower line
  {
    const out = parseOutline('Plan launch\n  Draft copy\n  Review copy\n    Get legal sign-off', today);
    eq('indent: 4 nodes', out.nodes.length, 4);
    eq('indent: top-level has no parent', out.nodes[0].parentIndex, null);
    eq('indent: Draft copy parent = Plan launch', out.nodes[1].parentIndex, 0);
    eq('indent: Review copy parent = Plan launch', out.nodes[2].parentIndex, 0);
    eq('indent: legal sign-off parent = Review copy', out.nodes[3].parentIndex, 2);
    eq('indent: titles clean', out.nodes.map((n) => n.title), ['Plan launch', 'Draft copy', 'Review copy', 'Get legal sign-off']);
  }

  // (b) marker-based list: `-`, `*`, `- [ ]` all strip to task lines
  {
    const out = parseOutline('- Buy milk\n* Call plumber\n- [ ] File taxes\n- [x] Already done', today);
    eq('markers: 4 task nodes', out.nodes.length, 4);
    eq('markers: stripped titles', out.nodes.map((n) => n.title), ['Buy milk', 'Call plumber', 'File taxes', 'Already done']);
    eq('markers: all top-level', out.nodes.map((n) => n.parentIndex), [null, null, null, null]);
  }

  // (c) explicit tokens: #project header container, +label, @handle, trailing date
  {
    const out = parseOutline('#q3-launch\n  Email the list @sarah +urgent by friday\n  Write the post +content', today);
    eq('tokens: project registered', out.projects, ['q3-launch']);
    eq('tokens: 2 tasks (header is not a task)', out.nodes.length, 2);
    eq('tokens: both in container project', out.nodes.map((n) => n.project), ['q3-launch', 'q3-launch']);
    eq('tokens: people extracted', out.nodes[0].people, ['sarah']);
    eq('tokens: labels extracted', out.nodes[0].labels, ['urgent']);
    eq('tokens: labels collected globally', out.labels, ['urgent', 'content']);
    ok('tokens: trailing date stripped → due set', out.nodes[0].due === '2026-07-03' && !/friday/i.test(out.nodes[0].title), `due=${out.nodes[0].due} title=${out.nodes[0].title}`);
  }

  // (d) messy/mixed input — flat lines, a header that reads like a project, an
  // inline #project token on a task. The structural pass resolves what it can
  // (the AI fallback in SKILL.md handles the genuinely ambiguous remainder).
  {
    const out = parseOutline('Project: Home Reno\n  - Demo the kitchen\n  - Order cabinets\nStandalone #errands Pick up keys', today);
    eq('mixed: Project: header → slug container', out.nodes.slice(0, 2).map((n) => n.project), ['home-reno', 'home-reno']);
    eq('mixed: dedented task leaves the container', out.nodes[2].project, 'errands');
    eq('mixed: dedented task is top-level', out.nodes[2].parentIndex, null);
    ok('mixed: home-reno + errands both registered', out.projects.includes('home-reno') && out.projects.includes('errands'), JSON.stringify(out.projects));
  }

  // (e) structure-wins-on-conflict: an indented child also carries a #project
  // token; the container (structure) overrides the token, and indentation —
  // not the token — sets the parent.
  {
    const out = parseOutline('#alpha\n  Parent task\n    Child #beta task', today);
    eq('conflict: child parent = Parent task (indentation wins)', out.nodes[1].parentIndex, 0);
    eq('conflict: child project = alpha (container wins over #beta token)', out.nodes[1].project, 'alpha');
    ok('conflict: overridden #beta token is discarded, not registered', !out.projects.includes('beta'), JSON.stringify(out.projects));
    eq('conflict: only the container project is registered', out.projects, ['alpha']);
  }
}

// ── Friendly date formatter (FR-3/AC3) — one representation everywhere, never raw ISO ──
function testFormat() {
  const now = '2026-06-30'; // a Tuesday
  eq('format: same day → Today', formatDueDate('2026-06-30', now), 'Today');
  eq('format: +1 → Tomorrow', formatDueDate('2026-07-01', now), 'Tomorrow');
  eq('format: -1 → Yesterday', formatDueDate('2026-06-29', now), 'Yesterday');
  // A future day still inside this Mon–Sun week renders as the bare weekday.
  ok('format: in-week future → weekday only', /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/.test(formatDueDate('2026-07-03', now)), formatDueDate('2026-07-03', now));
  // Beyond the week → absolute "Www Mmm D", no year when it's the current year.
  ok('format: beyond-week same year → "Www Mmm D" (no year)', /^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{1,2}$/.test(formatDueDate('2026-07-20', now)), formatDueDate('2026-07-20', now));
  // Off-year dates carry the year.
  ok('format: off-year → includes year', /\b2027\b/.test(formatDueDate('2027-01-15', now)), formatDueDate('2027-01-15', now));
  // No DD/MM or raw ISO ever leaks to the user.
  ['2026-06-30', '2026-07-03', '2026-07-20', '2027-01-15'].forEach((d) => ok('format: no raw ISO in "' + formatDueDate(d, now) + '"', !/\d{4}-\d{2}-\d{2}/.test(formatDueDate(d, now)), d));
  eq('format: empty in → empty out', formatDueDate('', now), '');
  // Colour-semantics selector: red reserved for genuinely-overdue (strictly past).
  eq('dueStatus: past → overdue', dueStatus('2026-06-29', now), 'overdue');
  eq('dueStatus: today → upcoming (not red)', dueStatus('2026-06-30', now), 'upcoming');
  eq('dueStatus: future → upcoming', dueStatus('2026-07-15', now), 'upcoming');
  eq('dueStatus: none → none', dueStatus('', now), 'none');
}

// ── Goals collection (story 260705-hbe): load/save, milestones, enums, archive ──
function mkGoal(dir, over = {}) {
  const fm = {
    schema_version: '1', id: lib.mintId(), title: 'Ship the goals feature',
    type: 'dated', status: 'active', cadence: 'weekly', target: '2026-09-30',
    created: '2026-07-05', updated: '2026-07-05', ...(over.fm || {}),
  };
  const goal = { fm, milestones: over.milestones || [], body: over.body != null ? over.body : '## Notes\nseed\n' };
  return goal;
}

function testGoals() {
  const dir = mkTmp();

  // id mint format — tracker-crudl §2.1 <YYMMDD>-<rand3>
  ok('goal: mintId format', /^\d{6}-[0-9a-hj-km-np-tv-z]{3}$/.test(lib.mintId()));

  // 1. save → load round-trip, byte-stable on re-save (no updated bump)
  const g = mkGoal(dir);
  const ref1 = lib.nextMilestoneRef(g.fm, g.milestones);
  g.milestones.push({ ref: ref1, description: 'Data model + CRUD landed', due: '2026-07-20', met: false, met_date: '' });
  const ref2 = lib.nextMilestoneRef(g.fm, g.milestones);
  g.milestones.push({ ref: ref2, description: 'Pace signals surfaced', due: '2026-08-15', met: false, met_date: '' });
  const file = lib.saveGoal(dir, g);
  const b1 = fs.readFileSync(file);
  const loaded = lib.readGoal(file);
  eq('goal: milestones round-trip', loaded.milestones, [
    { ref: 'm1', description: 'Data model + CRUD landed', due: '2026-07-20', met: false, met_date: '' },
    { ref: 'm2', description: 'Pace signals surfaced', due: '2026-08-15', met: false, met_date: '' },
  ]);
  eq('goal: scalar fm round-trip', [loaded.fm.type, loaded.fm.status, loaded.fm.cadence, loaded.fm.target], ['dated', 'active', 'weekly', '2026-09-30']);
  lib.saveGoal(dir, loaded);
  const b2 = fs.readFileSync(file);
  ok('goal: re-save is byte-stable (updated not bumped)', b1.equals(b2), `b1!=b2`);

  // 2. body ## Milestones mirror regenerated from frontmatter (INV-1); ## Notes preserved
  ok('goal: body mirrors m1', loaded.body.includes('- [ ] m1 — Data model + CRUD landed (due 2026-07-20)'));
  ok('goal: body preserves ## Notes', /##\s+Notes\s*\nseed/.test(loaded.body));
  // mark m1 met → body shows [x] and met date, frontmatter drives it
  loaded.milestones[0].met = true; loaded.milestones[0].met_date = '2026-07-18';
  lib.saveGoal(dir, loaded);
  const met = lib.readGoal(file);
  ok('goal: met milestone renders [x] in mirror', met.body.includes('- [x] m1 — Data model + CRUD landed (due 2026-07-20) — met 2026-07-18'));
  eq('goal: met flag persisted', [met.milestones[0].met, met.milestones[0].met_date], [true, '2026-07-18']);

  // 3. enum validation rejects unknown type/status/cadence; open-ended takes no target
  ok('goal: valid goal has no errors', lib.validateGoal(loaded).length === 0);
  ok('goal: bad type rejected', lib.validateGoal({ fm: { ...g.fm, type: 'stretch' }, milestones: [] }).some((e) => /Unknown goal type/.test(e)));
  ok('goal: bad status rejected', lib.validateGoal({ fm: { ...g.fm, status: 'paused' }, milestones: [] }).some((e) => /Unknown goal status/.test(e)));
  ok('goal: bad cadence rejected', lib.validateGoal({ fm: { ...g.fm, cadence: 'yearly' }, milestones: [] }).some((e) => /Unknown goal cadence/.test(e)));
  ok('goal: open-ended with target rejected', lib.validateGoal({ fm: { ...g.fm, type: 'open-ended', target: '2026-09-30' }, milestones: [] }).some((e) => /open-ended goals take no target/.test(e)));
  ok('goal: open-ended without target valid', lib.validateGoal({ fm: { ...g.fm, type: 'open-ended', target: '' }, milestones: [] }).length === 0);
  ok('goal: non-ISO target rejected', lib.validateGoal({ fm: { ...g.fm, target: 'Q3' }, milestones: [] }).some((e) => /ISO date/.test(e)));
  ok('goal: duplicate milestone ref rejected', lib.validateGoal({ fm: g.fm, milestones: [{ ref: 'm1', description: 'a', due: '', met: false, met_date: '' }, { ref: 'm1', description: 'b', due: '', met: false, met_date: '' }] }).some((e) => /duplicate milestone ref/.test(e)));

  // 4. ref stability (INV-2) — a dropped ref is NEVER reused, even the highest
  const g2 = mkGoal(dir, { fm: { id: lib.mintId(), title: 'Ref stability' } });
  const rA = lib.nextMilestoneRef(g2.fm, g2.milestones); g2.milestones.push({ ref: rA, description: 'A', due: '', met: false, met_date: '' });
  const rB = lib.nextMilestoneRef(g2.fm, g2.milestones); g2.milestones.push({ ref: rB, description: 'B', due: '', met: false, met_date: '' });
  eq('goal: sequential refs m1,m2', [rA, rB], ['m1', 'm2']);
  // drop the HIGHEST (m2) then add — the classic max+1 reuse trap
  g2.milestones = g2.milestones.filter((m) => m.ref !== rB);
  const rC = lib.nextMilestoneRef(g2.fm, g2.milestones);
  ok('goal: dropped highest ref not reused (INV-2)', rC !== rB && rC === 'm3', `got ${rC}`);
  // persist + reload; counter survives the round-trip
  g2.milestones.push({ ref: rC, description: 'C', due: '', met: false, met_date: '' });
  const f2 = lib.saveGoal(dir, g2);
  const g2r = lib.readGoal(f2);
  const rD = lib.nextMilestoneRef(g2r.fm, g2r.milestones);
  ok('goal: milestone_seq persists across reload', rD === 'm4', `got ${rD}`);

  // 5. archive on drop/achieve (INV-3) — move to archive/YYYY-QN, gone from active
  const dest = lib.archiveGoal(dir, g2r.fm.id, '2026-08-15');
  ok('goal: archived to archive/2026-Q3', /archive\/2026-Q3\//.test(dest) && fs.existsSync(dest), dest);
  ok('goal: archived goal absent from live goals dir', lib.findGoalFile(dir, g2r.fm.id) === null);
  ok('goal: archived goal absent from loadAllGoals', !lib.loadAllGoals(dir).some((x) => x.fm.id === g2r.fm.id));

  // 6. slug in filename
  ok('goal: filename is {id}-{slug}.md', path.basename(file) === `${g.fm.id}-ship-the-goals-feature.md`, path.basename(file));
}

// ── attachment & cascade (story 260705-ebm — §3, INV-4/5/6, D5/D8) ──
function writeTask(dir, over = {}) {
  const fm = {
    schema_version: over.schema_version || '2', id: over.id || '260705-tsk',
    title: over.title || 'A task', type: 'execution', importance: 'neutral', status: 'pending',
    project: over.project || '', created: '2026-07-05', updated: '2026-07-05', ...(over.fm || {}),
  };
  writeItem(dir, fm, over.body || '');
  return fm.id;
}

function testAttachment() {
  const dir = mkTmp();

  // AC1 — load-time migration to v3: a v2 task (no goal/milestone) gains bare keys +
  // schema_version:3; idempotent (second pass is a byte no-op); ids/fields untouched.
  writeTask(dir, { id: '260705-mig', title: 'Legacy task', project: 'launch', schema_version: '2' });
  const migFile = path.join(dir, 'items', '260705-mig-legacy-task.md');
  lib.loadAllItems(dir);
  const afterA = fs.readFileSync(migFile);
  const it = lib.readItem(migFile);
  eq('attach: migrated fields', [it.fm.goal, it.fm.milestone, String(it.fm.schema_version)], ['', '', '3']);
  eq('attach: migration preserves id/project/title', [it.fm.id, it.fm.project, it.fm.title], ['260705-mig', 'launch', 'Legacy task']);
  lib.loadAllItems(dir);
  const afterB = fs.readFileSync(migFile);
  ok('attach: migration idempotent (byte no-op on 2nd pass)', afterA.equals(afterB), 'rewrote a normalized file');

  // AC3 — effectiveGoal truth table
  const pg = { launch: '260705-gaa' };
  eq('attach: direct link wins over inherit', lib.effectiveGoal({ fm: { goal: '260705-gbb', project: 'launch' } }, pg), '260705-gbb');
  eq('attach: none detaches (wins over inherit)', lib.effectiveGoal({ fm: { goal: 'none', project: 'launch' } }, pg), null);
  eq('attach: inherit from project', lib.effectiveGoal({ fm: { goal: '', project: 'launch' } }, pg), '260705-gaa');
  eq('attach: no match → null', lib.effectiveGoal({ fm: { goal: '', project: 'other' } }, pg), null);
  eq('attach: neither goal nor project → null', lib.effectiveGoal({ fm: { goal: '', project: '' } }, pg), null);
  // INV-5 no-double-count: task directly on the SAME goal its project inherits resolves once
  eq('attach: no double-count (single resolution)', lib.effectiveGoal({ fm: { goal: '260705-gaa', project: 'launch' } }, pg), '260705-gaa');

  // effectiveMilestone — only when goal set directly
  eq('attach: milestone when goal direct', lib.effectiveMilestone({ fm: { goal: '260705-gaa', milestone: 'm2' } }), 'm2');
  eq('attach: no milestone when inherited', lib.effectiveMilestone({ fm: { goal: '', project: 'launch', milestone: 'm2' } }), null);
  eq('attach: no milestone when detached', lib.effectiveMilestone({ fm: { goal: 'none', milestone: 'm2' } }), null);

  // AC2 — buildProjectGoals + two-goals-one-project validation error
  const gA = mkGoal(dir, { fm: { id: '260705-gaa', title: 'Goal A', attached_projects: ['launch', 'sales'] } });
  const gB = mkGoal(dir, { fm: { id: '260705-gbb', title: 'Goal B', attached_projects: ['ops'] } });
  lib.saveGoal(dir, gA); lib.saveGoal(dir, gB);
  eq('attach: projectGoals map from attached_projects', lib.buildProjectGoals(lib.loadAllGoals(dir)), { launch: '260705-gaa', sales: '260705-gaa', ops: '260705-gbb' });
  // attached_projects survives the goal round-trip (list field)
  eq('attach: attached_projects round-trips', lib.loadGoal(dir, '260705-gaa').fm.attached_projects, ['launch', 'sales']);
  let threw = false;
  try { lib.buildProjectGoals([{ fm: { id: 'g1', attached_projects: ['x'] } }, { fm: { id: 'g2', attached_projects: ['x'] } }]); } catch (_) { threw = true; }
  ok('attach: two-goals-one-project is a validation error', threw);

  // AC4 — attach/detach round-trips + write-nothing-on-error (INV-6)
  const gC = mkGoal(dir, { fm: { id: '260705-gcc', title: 'Goal C' } });
  const rM = lib.nextMilestoneRef(gC.fm, gC.milestones);
  gC.milestones.push({ ref: rM, description: 'Milestone one', due: '2026-08-01', met: false, met_date: '' });
  lib.saveGoal(dir, gC);
  const tid = writeTask(dir, { id: '260705-att', title: 'Attach me', project: 'design' });

  lib.attachTaskToGoal(dir, tid, '260705-gcc', rM);
  const at = lib.readItem(lib.findItemFile(dir, tid));
  eq('attach: task attached to goal+milestone', [at.fm.goal, at.fm.milestone], ['260705-gcc', 'm1']);
  lib.detachTask(dir, tid);
  eq('attach: detachTask sets goal none, clears milestone', [lib.readItem(lib.findItemFile(dir, tid)).fm.goal, lib.readItem(lib.findItemFile(dir, tid)).fm.milestone], ['none', '']);
  lib.detachTask(dir, tid, { clear: true });
  eq('attach: detachTask --clear empties goal', lib.readItem(lib.findItemFile(dir, tid)).fm.goal, '');

  // attach to non-existent goal / milestone errors and writes NOTHING
  const beforeErr = fs.readFileSync(lib.findItemFile(dir, tid));
  let e1 = false; try { lib.attachTaskToGoal(dir, tid, '260705-nope', ''); } catch (_) { e1 = true; }
  let e2 = false; try { lib.attachTaskToGoal(dir, tid, '260705-gcc', 'm99'); } catch (_) { e2 = true; }
  ok('attach: missing goal errors', e1);
  ok('attach: missing milestone errors', e2);
  ok('attach: errored attach wrote nothing', beforeErr.equals(fs.readFileSync(lib.findItemFile(dir, tid))), 'task file mutated on error');

  // project attach/detach round-trip + at-most-one-goal enforcement
  lib.attachProjectToGoal(dir, 'design', '260705-gcc');
  eq('attach: project appended to goal', lib.loadGoal(dir, '260705-gcc').fm.attached_projects, ['design']);
  let e3 = false; try { lib.attachProjectToGoal(dir, 'design', '260705-gbb'); } catch (_) { e3 = true; }
  ok('attach: project already on another goal errors', e3);
  lib.detachProject(dir, 'design');
  eq('attach: detachProject removes slug', lib.loadGoal(dir, '260705-gcc').fm.attached_projects, []);
}

async function main() {
  testFormat();
  testFrontmatter();
  testDateMath();
  testSpawn();
  testIndex();
  testMigration();
  testGoals();
  testAttachment();
  await testApi();
  await testPeople();
  await testRegistryMeta();
  await testIncludeChildren();
  testImport();
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
