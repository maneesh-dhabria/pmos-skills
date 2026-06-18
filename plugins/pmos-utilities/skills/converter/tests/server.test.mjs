#!/usr/bin/env node
// server.test.mjs — the zero-dep server endpoints (T6 / AC2). Mirrors game-launcher/serve.test.mjs.
//   node server.test.mjs [--selftest]

import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.join(here, '..', 'scripts', 'server.js');

const EXPECTED_CHECKS = 8;
const selftest = process.argv.includes('--selftest');
let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) { passed += 1; process.stdout.write(`  ok   ${name}\n`); }
  else { failures.push(name); process.stdout.write(`  FAIL ${name}\n`); }
}

function request(port, method, urlPath, body, headers) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: urlPath, method, headers }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => resolve({ status: res.statusCode, body: buf, headers: res.headers }));
    });
    req.on('error', reject);
    req.setTimeout(4000, () => req.destroy(new Error('timeout')));
    if (body != null) req.write(body);
    req.end();
  });
}

function waitForUrl(child) {
  return new Promise((resolve, reject) => {
    let out = '';
    const onData = (d) => {
      out += d.toString();
      const m = out.match(/http:\/\/127\.0\.0\.1:(\d+)\//);
      if (m) { child.stdout.off('data', onData); resolve(Number(m[1])); }
    };
    child.stdout.on('data', onData);
    child.on('exit', (code) => reject(new Error(`server exited early (code ${code})`)));
    setTimeout(() => reject(new Error('timed out waiting for server URL')), 5000);
  });
}

async function main() {
  const child = spawn(process.execPath, [SERVER, '--no-open'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let port;
  try { port = await waitForUrl(child); }
  catch (e) { check('server prints an ephemeral port URL', false); child.kill('SIGKILL'); return finish(); }
  check('server prints an ephemeral port URL', Number.isInteger(port) && port > 0);

  const root = await request(port, 'GET', '/').catch(() => ({ status: 0, body: '' }));
  check('GET / serves the single-file UI', root.status === 200 && /<html/i.test(root.body));

  const conv = await request(port, 'GET', '/conversions').catch(() => ({ status: 0, body: '{}' }));
  let ids = [];
  try { ids = (JSON.parse(conv.body).conversions || []).map((d) => d.id).sort(); } catch (_e) {}
  check('GET /conversions returns the registry ids (4 data pairs + the HTML↔MD and PDF↔MD pairs)',
    conv.status === 200 && JSON.stringify(ids) === JSON.stringify(['csv→json', 'html→md', 'json→csv', 'json→yaml', 'md→html', 'md→pdf', 'pdf→md', 'yaml→json']));

  const payload = JSON.stringify({ id: 'json→yaml', input: '{"a":1,"b":[2,3]}' });
  const cv = await request(port, 'POST', '/convert', payload, { 'Content-Type': 'application/json' }).catch(() => ({ status: 0, body: '' }));
  check('POST /convert returns text/plain with the converted output',
    cv.status === 200 && /text\/plain/.test(cv.headers['content-type'] || '') && /a:\s*1/.test(cv.body));

  // round-trip back through yaml→json
  const back = await request(port, 'POST', '/convert', JSON.stringify({ id: 'yaml→json', input: cv.body }),
    { 'Content-Type': 'application/json' }).catch(() => ({ status: 0, body: '' }));
  let rt = false;
  try { rt = JSON.stringify(JSON.parse(back.body)) === JSON.stringify({ a: 1, b: [2, 3] }); } catch (_e) {}
  check('POST /convert round-trips json→yaml→json', rt);

  const unknown = await request(port, 'POST', '/convert', JSON.stringify({ id: 'nope', input: 'x' }),
    { 'Content-Type': 'application/json' }).catch(() => ({ status: 0 }));
  check('POST /convert unknown id → 404 + structured error',
    unknown.status === 404 && /error/.test(unknown.body));

  const miss = await request(port, 'GET', '/nope').catch(() => ({ status: 0 }));
  check('unknown route → 404', miss.status === 404);

  const exited = await new Promise((resolve) => {
    child.on('exit', (code) => resolve(code));
    child.kill('SIGTERM');
    setTimeout(() => { child.kill('SIGKILL'); resolve('killed'); }, 2000);
  });
  check('clean shutdown on SIGTERM (exit 0)', exited === 0);

  finish();
}

function finish() {
  process.stdout.write(`\n${passed}/${EXPECTED_CHECKS} checks passed\n`);
  if (selftest && passed !== EXPECTED_CHECKS) {
    process.stderr.write(`selftest: expected ${EXPECTED_CHECKS}, got ${passed}\n`);
    process.exit(1);
  }
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((e) => { process.stderr.write(`server.test.mjs error: ${e.stack || e}\n`); process.exit(1); });
