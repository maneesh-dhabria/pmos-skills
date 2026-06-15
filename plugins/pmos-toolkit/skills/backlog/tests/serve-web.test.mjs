// serve-web.test.mjs — behavioural tests for the /backlog web viewer (story 260613-14b).
//
// Two halves:
//   (1) derivation (serve-web-lib): rollups, queue membership, readiness, facets, malformed-skip
//       — asserted against a temp fixture backlog with known expected values.
//   (2) server (serve-web.mjs): GET / → viewer.html, GET /api/backlog → fresh live read,
//       404 otherwise, read-only (no mutation route), --no-open + ephemeral port.
//
// Run: node tests/serve-web.test.mjs   (exit 0 = all pass, 1 = any fail). Node stdlib only.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseItems, buildModel, parseFrontmatter } from '../scripts/serve-web-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS = path.join(__dirname, '..', 'scripts');

let pass = 0;
let fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; } else { fail++; console.error('  FAIL:', msg); }
}
function eq(actual, expected, msg) {
  ok(JSON.stringify(actual) === JSON.stringify(expected), `${msg} (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`);
}

// --- fixture builder -------------------------------------------------------------------

function item(fm, body = '') {
  const lines = ['---'];
  for (const [k, v] of Object.entries(fm)) {
    if (Array.isArray(v)) lines.push(`${k}: [${v.join(', ')}]`);
    else lines.push(`${k}: ${v}`);
  }
  lines.push('---', body);
  return lines.join('\n');
}

function buildFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'backlog-web-'));
  const itemsDir = path.join(root, 'backlog', 'items');
  fs.mkdirSync(itemsDir, { recursive: true });
  const w = (name, text) => fs.writeFileSync(path.join(itemsDir, name), text);

  // E1 (defined, in-flight): S1 done + S2 planned(should) + S6 planned(could, dep S1) + S5 draft
  w('e1.md', item({ id: 'E1', kind: 'epic', title: 'Epic one', status: 'defined', route: 'skill', labels: ['pmos-toolkit'], created: '2026-06-10' }));
  w('s1.md', item({ id: 'S1', kind: 'story', title: 'S1', status: 'done', route: 'skill', priority: 'should', parent: 'E1', dependencies: [] }));
  w('s2.md', item({ id: 'S2', kind: 'story', title: 'S2', status: 'planned', route: 'skill', priority: 'should', parent: 'E1', dependencies: [] }, '## Acceptance Criteria\n- [ ] does a thing\n'));
  w('s6.md', item({ id: 'S6', kind: 'story', title: 'S6', status: 'planned', route: 'skill', priority: 'could', parent: 'E1', dependencies: ['S1'] }, '## Acceptance Criteria\n- [ ] another\n'));
  w('s5.md', item({ id: 'S5', kind: 'story', title: 'S5', status: 'draft', route: 'skill', priority: 'should', parent: 'E1', dependencies: [] }));

  // E2 (defined, all done): S3 done → release_ready
  w('e2.md', item({ id: 'E2', kind: 'epic', title: 'Epic two', status: 'defined', route: 'skill', labels: ['pmos-gamekit'], created: '2026-06-11' }));
  w('s3.md', item({ id: 'S3', kind: 'story', title: 'S3', status: 'done', route: 'skill', priority: 'must', parent: 'E2', dependencies: [] }));

  // E3 (inbox, no stories) → needs_definition
  w('e3.md', item({ id: 'E3', kind: 'epic', title: 'Epic three', status: 'inbox', labels: ['pmos-toolkit'], created: '2026-06-12' }));

  // E4 (defined, has blocked story): S4 blocked + S7 planned dep on blocked S4 (deps unsatisfied)
  w('e4.md', item({ id: 'E4', kind: 'epic', title: 'Epic four', status: 'defined', route: 'feature', labels: ['pmos-toolkit'], created: '2026-06-13' }));
  w('s4.md', item({ id: 'S4', kind: 'story', title: 'S4', status: 'blocked', route: 'feature', priority: 'should', parent: 'E4', dependencies: [] }, '## Notes\nblocked by #S3 upstream change\n'));
  w('s7.md', item({ id: 'S7', kind: 'story', title: 'S7', status: 'planned', route: 'feature', priority: 'must', parent: 'E4', dependencies: ['S4'] }, '## Acceptance Criteria\n- [ ] x\n'));

  // malformed — no frontmatter
  w('bad.md', 'just some text, no frontmatter here\n');

  return root;
}

// --- (1) derivation tests --------------------------------------------------------------

function testDerivation() {
  const root = buildFixture();
  const { items, skipped } = parseItems(path.join(root, 'backlog', 'items'));

  eq(skipped.length, 1, 'malformed file skipped, not fatal');
  ok(items.length === 11, `parsed all 11 good items (got ${items.length})`);

  const model = buildModel(items, { now: Date.parse('2026-06-14T00:00:00Z'), repo: 'fix' });
  const byId = Object.fromEntries(model.epics.map((e) => [e.id, e]));

  // epics ordered newest-created first
  eq(model.epics.map((e) => e.id), ['E4', 'E3', 'E2', 'E1'], 'epics ordered by created desc');

  // E1 rollup + progress
  eq(byId.E1.progress, { done: 1, total: 4, blocked: 0 }, 'E1 progress (S1 done of S1/S2/S6/S5 — draft counts in total)');
  eq(byId.E1.rollup, 'in-flight', 'E1 rollup in-flight');
  eq(byId.E1.in_flight, true, 'E1 in_flight (a story is done)');
  eq(byId.E1.plugin, 'pmos-toolkit', 'E1 plugin from labels');

  // E2 all done → release_ready
  eq(byId.E2.rollup, 'all-stories-done', 'E2 rollup all-stories-done');
  eq(byId.E2.plugin, 'pmos-gamekit', 'E2 plugin pmos-gamekit');

  // E3 inbox
  eq(byId.E3.rollup, 'inbox', 'E3 rollup inbox');

  // E4 has a blocked story
  eq(byId.E4.progress.blocked, 1, 'E4 has 1 blocked story');
  const s4 = byId.E4.stories.find((s) => s.id === 'S4');
  ok(/blocked by/i.test(s4.blocked_by || ''), 'S4 blocked_by parsed from ## Notes');

  // queues
  eq(model.queues.groom.needs_definition, ['E3'], 'groom needs_definition = [E3]');
  ok(model.queues.groom.needs_grooming.includes('S5'), 'groom needs_grooming includes draft S5');
  eq(model.queues.groom.blocked, ['S4'], 'groom blocked = [S4]');
  eq(model.queues.groom.stale_claims, [], 'no stale claims (no locks)');

  // next: S2(should) and S6(could) are candidates (both E1/in-flight); S7 excluded (dep S4 not done).
  // should beats could → S2.
  eq(model.queues.next.pick, 'S2', 'next pick = S2 (in-flight epic, should > could)');

  // releases — FR-6: not-started epics (0 stories done) are excluded from the column.
  // E4 is blocked but has 0 done stories → excluded entirely (its blocked story stays in groom).
  eq(model.queues.releases.release_ready, ['E2'], 'release_ready = [E2]');
  eq(model.queues.releases.blocked, [], 'releases blocked = [] (E4 has 0 done → excluded, FR-6)');
  eq(model.queues.releases.in_flight, ['E1'], 'releases in_flight = [E1]');

  // facets
  ok(model.facets.plugins.includes('pmos-toolkit') && model.facets.plugins.includes('pmos-gamekit'), 'facets.plugins from epics');
  ok(model.facets.routes.includes('skill') && model.facets.routes.includes('feature'), 'facets.routes');

  // parseFrontmatter inline array
  const p = parseFrontmatter('---\nid: X\ndependencies: [a, b, c]\nlabels: [one]\n---\nbody');
  eq(p.fm.dependencies, ['a', 'b', 'c'], 'parseFrontmatter inline array');

  fs.rmSync(root, { recursive: true, force: true });
}

// --- FR-5: null-literal coercion -------------------------------------------------------

function testNullCoercion() {
  // parseScalar (via parseFrontmatter) coerces the YAML null / ~ / empty literal to '' for
  // every field — not just the ones with a `|| ''` fallback downstream.
  const p = parseFrontmatter(
    '---\nid: X\nclaimed_by: null\nreleased: ~\ntitle:\nstatus: planned\n---\nbody'
  );
  eq(p.fm.claimed_by, '', 'parseScalar coerces `null` literal to empty (FR-5)');
  eq(p.fm.released, '', 'parseScalar coerces `~` literal to empty (FR-5)');
  eq(p.fm.title, '', 'parseScalar leaves an empty value empty (FR-5)');
  // a quoted "null" string is a real value, not the null literal — must survive.
  const q = parseFrontmatter('---\nid: X\nclaimed_by: "null"\n---\nbody');
  eq(q.fm.claimed_by, 'null', 'a quoted "null" string is preserved (not the null literal)');

  // end-to-end: an item whose claimed_by is the bare null literal must not surface "null".
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'backlog-null-'));
  const itemsDir = path.join(root, 'backlog', 'items');
  fs.mkdirSync(itemsDir, { recursive: true });
  fs.writeFileSync(path.join(itemsDir, 'e1.md'), item({ id: 'E1', kind: 'epic', title: 'E', status: 'defined', labels: ['pmos-toolkit'], created: '2026-06-10' }));
  fs.writeFileSync(path.join(itemsDir, 's1.md'), item({ id: 'S1', kind: 'story', title: 'S1', status: 'planned', parent: 'E1', claimed_by: 'null' }));
  const { items } = parseItems(itemsDir);
  const s1 = items.find((i) => i.id === 'S1');
  eq(s1.claimed_by, '', 'parseItems coerces `claimed_by: null` to empty (FR-5, no @null chip)');
  fs.rmSync(root, { recursive: true, force: true });
}

// --- FR-4: grouped, lifecycle-ordered status facets ------------------------------------

function testGroupedStatusFacets() {
  const root = buildFixture();
  const { items } = parseItems(path.join(root, 'backlog', 'items'));
  const model = buildModel(items, { now: Date.parse('2026-06-14T00:00:00Z') });

  // Epic statuses present in the fixture: inbox (E3), defined (E1/E2/E4) → lifecycle order.
  eq(model.facets.epic_statuses, ['inbox', 'defined'], 'epic_statuses lifecycle-ordered, present-only (FR-4)');
  // Story statuses present: draft (S5), planned (S2/S6/S7), blocked (S4), done (S1/S3).
  eq(model.facets.story_statuses, ['draft', 'planned', 'blocked', 'done'], 'story_statuses lifecycle-ordered, present-only (FR-4)');
  fs.rmSync(root, { recursive: true, force: true });
}

// --- FR-6: Releases excludes not-started (0-done) epics --------------------------------

function testReleasesExclusion() {
  const root = buildFixture();
  const { items } = parseItems(path.join(root, 'backlog', 'items'));
  const model = buildModel(items, { now: Date.parse('2026-06-14T00:00:00Z') });
  const rel = model.queues.releases;
  const all = [...rel.release_ready, ...rel.in_flight, ...rel.blocked];
  ok(!all.includes('E4'), 'E4 (0 done) excluded from every Releases lane (FR-6)');
  // sanity: the epics that DO appear all have at least one done story.
  const byId = Object.fromEntries(model.epics.map((e) => [e.id, e]));
  ok(all.every((id) => byId[id].progress.done > 0), 'every Releases epic has done > 0 (FR-6)');
  fs.rmSync(root, { recursive: true, force: true });
}

// --- (2) server tests ------------------------------------------------------------------

function get(port, p) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: p }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body, type: res.headers['content-type'] || '' }));
    }).on('error', reject);
  });
}

function request(port, method, p) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: p, method }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function waitForPort(proc) {
  return new Promise((resolve, reject) => {
    let buf = '';
    const onData = (d) => {
      buf += d.toString();
      const m = buf.match(/http:\/\/127\.0\.0\.1:(\d+)\//);
      if (m) { proc.stdout.off('data', onData); resolve(Number(m[1])); }
    };
    proc.stdout.on('data', onData);
    proc.on('exit', (code) => reject(new Error('server exited early code=' + code + ' out=' + buf)));
    setTimeout(() => reject(new Error('timeout waiting for server; out=' + buf)), 5000);
  });
}

async function testServer() {
  const root = buildFixture();
  const proc = spawn('node', [path.join(SCRIPTS, 'serve-web.mjs'), '--no-open'], {
    cwd: root,
    env: { ...process.env },
  });
  let port;
  try {
    port = await waitForPort(proc);
  } catch (e) {
    fail++;
    console.error('  FAIL: server did not start:', e.message);
    proc.kill();
    fs.rmSync(root, { recursive: true, force: true });
    return;
  }

  try {
    const root_ = await get(port, '/');
    ok(root_.status === 200, 'GET / → 200');
    ok(/<html|<!doctype/i.test(root_.body), 'GET / returns HTML');
    ok(/text\/html/.test(root_.type), 'GET / content-type text/html');

    const api = await get(port, '/api/backlog');
    ok(api.status === 200, 'GET /api/backlog → 200');
    const model = JSON.parse(api.body);
    ok(Array.isArray(model.epics) && model.epics.length === 4, 'API model has 4 epics');
    ok(model.queues.next.pick === 'S2', 'API next pick = S2 (matches lib)');

    const four = await get(port, '/nope');
    ok(four.status === 404, 'unknown path → 404');

    const fav = await get(port, '/favicon.ico');
    ok(fav.status === 204, 'GET /favicon.ico → 204 (no console error for the auto-request)');

    // read-only: no mutation route exists
    const post = await request(port, 'POST', '/api/tasks');
    ok(post.status === 404, 'POST (any) → 404 (read-only, no mutation endpoint)');

    // live read: add an item, the next GET reflects it without restart
    fs.writeFileSync(
      path.join(root, 'backlog', 'items', 'e9.md'),
      item({ id: 'E9', kind: 'epic', title: 'Late epic', status: 'inbox', labels: ['pmos-toolkit'], created: '2026-06-14' })
    );
    const api2 = JSON.parse((await get(port, '/api/backlog')).body);
    ok(api2.epics.length === 5, 'live read picks up a newly added item without restart');
    ok(api2.queues.groom.needs_definition.includes('E9'), 'new inbox epic appears in groom');
  } finally {
    proc.kill();
    fs.rmSync(root, { recursive: true, force: true });
  }
}

// --- run -------------------------------------------------------------------------------

async function main() {
  testDerivation();
  testNullCoercion();
  testGroupedStatusFacets();
  testReleasesExclusion();
  await testServer();
  console.log(`serve-web.test.mjs: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error('test harness error:', e);
  process.exit(1);
});
