// serve-web.test.mjs — behavioural tests for the /people web viewer (story 260626-nq0).
//
// Two halves:
//   (1) derivation (serve-web-lib): parses ~/.pmos/people/*.md fixtures, sorts by name,
//       skips malformed files, derives team/relationship facets — and ASSERTS the PII
//       whitelist: the payload carries ONLY the schema.md index-view fields, so aliases /
//       workstreams / Notes body / timestamps never leak (AC4).
//   (2) server (serve-web.mjs): GET / → viewer.html, GET /api/people → fresh live read from
//       the person files (no INDEX), 404 otherwise, read-only (no mutation route), --no-open
//       + ephemeral port, --people-dir override.
//
// Run: node tests/serve-web.test.mjs   (exit 0 = all pass, 1 = any fail). Node stdlib only.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parsePeople, buildModel, parseFrontmatter, PERSON_WHITELIST } from '../scripts/serve-web-lib.mjs';

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

function person(fm, body = '') {
  const lines = ['---'];
  for (const [k, v] of Object.entries(fm)) {
    if (Array.isArray(v)) lines.push(`${k}: [${v.join(', ')}]`);
    else lines.push(`${k}: ${v}`);
  }
  lines.push('---', body);
  return lines.join('\n');
}

function buildFixture() {
  const peopleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'people-web-'));
  const w = (name, text) => fs.writeFileSync(path.join(peopleDir, name), text);

  // sarah-chen: full record incl. aliases + workstreams + a Notes body (PII that must NOT leak)
  w('sarah-chen.md', person(
    { schema_version: 1, handle: 'sarah-chen', name: 'Sarah Chen', designation: 'VP Engineering', role: 'Eng Manager', working_relationship: 'peer', team: 'platform', email: 'sarah@acme.com', workstreams: ['platform-q3'], aliases: ['sarah', 'schen'], created: '2026-04-25', updated: '2026-04-25' },
    '## Notes\nPrefers async; OOO last week of June. SECRET-1099-SSN.\n'
  ));
  // mark-davis: full record
  w('mark-davis.md', person(
    { schema_version: 1, handle: 'mark-davis', name: 'Mark Davis', designation: 'Director of Product', role: 'PM Lead', working_relationship: 'peer', team: 'product', email: 'mark@acme.com', aliases: ['mark'], created: '2026-04-26', updated: '2026-04-26' }
  ));
  // anna-bell: sparse record — several optional fields absent (empty-cell rendering)
  w('anna-bell.md', person(
    { schema_version: 1, handle: 'anna-bell', name: 'Anna Bell', role: 'Designer', working_relationship: 'team-member', team: 'design', created: '2026-04-27', updated: '2026-04-27' }
  ));
  // malformed — no frontmatter
  w('bad.md', 'just some text, no frontmatter here\n');
  // malformed — frontmatter but no handle key
  w('nohandle.md', person({ name: 'No Handle', role: 'ghost' }));

  return peopleDir;
}

// --- (1) derivation + PII tests --------------------------------------------------------

function testDerivation() {
  const dir = buildFixture();
  const { people, skipped } = parsePeople(dir);

  eq(skipped.length, 2, 'two malformed files skipped, not fatal (no-frontmatter + no-handle)');
  eq(people.length, 3, 'parsed all 3 good records');

  const model = buildModel(people, { now: Date.parse('2026-05-01T00:00:00Z'), repo: 'pmos' });

  // sorted by name asc, case-insensitive: Anna Bell, Mark Davis, Sarah Chen
  eq(model.people.map((p) => p.handle), ['anna-bell', 'mark-davis', 'sarah-chen'], 'people sorted by name asc');
  eq(model.count, 3, 'count reflects derived people');

  // facets
  eq(model.facets.teams, ['design', 'platform', 'product'], 'team facet derived + sorted');
  eq(model.facets.relationships, ['peer', 'team-member'], 'relationship facet derived + sorted');

  // empty optional fields render as '' (never null/undefined) — anna has no designation/email
  const anna = model.people.find((p) => p.handle === 'anna-bell');
  eq(anna.designation, '', 'absent designation is empty string, not null');
  eq(anna.email, '', 'absent email is empty string, not null');

  fs.rmSync(dir, { recursive: true, force: true });
}

// AC4: the API payload must contain ONLY the whitelisted index-view fields — no aliases,
// workstreams, Notes body, or housekeeping fields leak through.
function testPiiSafety() {
  const dir = buildFixture();
  const { people } = parsePeople(dir);
  const model = buildModel(people);

  const FORBIDDEN = ['aliases', 'workstreams', 'created', 'updated', 'schema_version', 'notes', 'body'];
  for (const p of model.people) {
    const keys = Object.keys(p);
    // every key is on the whitelist
    eq(keys.filter((k) => !PERSON_WHITELIST.includes(k)), [], `person ${p.handle}: payload keys are whitelist-only`);
    // no forbidden field present
    for (const f of FORBIDDEN) ok(!(f in p), `person ${p.handle}: forbidden field '${f}' absent from payload`);
  }

  // the planted secret in sarah-chen's Notes body must not appear ANYWHERE in the serialized payload
  const blob = JSON.stringify(model);
  ok(!/SECRET-1099-SSN/.test(blob), 'Notes-body PII never reaches the payload');
  ok(!/platform-q3/.test(blob), 'workstreams value never reaches the payload');
  ok(!/schen/.test(blob), 'alias value never reaches the payload');

  fs.rmSync(dir, { recursive: true, force: true });
}

function testNullCoercion() {
  // a bare YAML null literal in any field → '' (not the string "null")
  const p = parseFrontmatter('---\nhandle: x\nname: null\nemail: ~\nteam:\n---\nbody');
  eq(p.fm.name, '', 'parseScalar coerces `null` literal to empty');
  eq(p.fm.email, '', 'parseScalar coerces `~` literal to empty');
  eq(p.fm.team, '', 'parseScalar leaves an empty value empty');
  const q = parseFrontmatter('---\nhandle: x\nname: "null"\n---\nbody');
  eq(q.fm.name, 'null', 'a quoted "null" string is preserved (not the null literal)');
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
  const dir = buildFixture();
  const proc = spawn('node', [path.join(SCRIPTS, 'serve-web.mjs'), '--no-open', '--people-dir', dir], {
    env: { ...process.env },
  });
  let port;
  try {
    port = await waitForPort(proc);
  } catch (e) {
    fail++;
    console.error('  FAIL: server did not start:', e.message);
    proc.kill();
    fs.rmSync(dir, { recursive: true, force: true });
    return;
  }

  try {
    const root_ = await get(port, '/');
    ok(root_.status === 200, 'GET / → 200');
    ok(/<html|<!doctype/i.test(root_.body), 'GET / returns HTML');
    ok(/text\/html/.test(root_.type), 'GET / content-type text/html');

    const api = await get(port, '/api/people');
    ok(api.status === 200, 'GET /api/people → 200');
    const model = JSON.parse(api.body);
    ok(Array.isArray(model.people) && model.people.length === 3, 'API model has 3 people');
    eq(model.people.map((p) => p.handle), ['anna-bell', 'mark-davis', 'sarah-chen'], 'API people sorted by name (matches lib)');
    // PII gate at the HTTP boundary too
    ok(!/SECRET-1099-SSN/.test(api.body) && !/platform-q3/.test(api.body), 'API payload carries no Notes/alias/workstream PII');

    const four = await get(port, '/nope');
    ok(four.status === 404, 'unknown path → 404');

    const fav = await get(port, '/favicon.ico');
    ok(fav.status === 204, 'GET /favicon.ico → 204 (no console error for the auto-request)');

    // read-only: no mutation route exists
    const post = await request(port, 'POST', '/api/people');
    ok(post.status === 404, 'POST (any) → 404 (read-only, no mutation endpoint)');

    // live read: add a person, the next GET reflects it without restart (no INDEX consulted)
    fs.writeFileSync(
      path.join(dir, 'zoe-kim.md'),
      person({ schema_version: 1, handle: 'zoe-kim', name: 'Zoe Kim', role: 'Researcher', working_relationship: 'stakeholder', team: 'research', created: '2026-05-02', updated: '2026-05-02' })
    );
    const api2 = JSON.parse((await get(port, '/api/people')).body);
    ok(api2.people.length === 4, 'live read picks up a newly added record without restart');
    ok(api2.people.some((p) => p.handle === 'zoe-kim'), 'new record appears in the derived listing');

    // no INDEX file is ever written by the server
    ok(!fs.existsSync(path.join(dir, 'INDEX.md')), 'server never writes an INDEX.md (INV-3)');
  } finally {
    proc.kill();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// --- run -------------------------------------------------------------------------------

async function main() {
  testDerivation();
  testPiiSafety();
  testNullCoercion();
  await testServer();
  console.log(`serve-web.test.mjs: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error('test harness error:', e);
  process.exit(1);
});
