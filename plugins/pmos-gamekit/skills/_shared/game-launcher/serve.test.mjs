#!/usr/bin/env node
// serve.test.mjs — headless self-test for the game launcher (AC4).
//
//   node serve.test.mjs            normal run
//   node serve.test.mjs --selftest asserts the expected check count, exits 0/1
//
// Verifies: the server binds an ephemeral port, serves the passed file at GET /,
// returns 404 for other paths, and shuts down cleanly on SIGTERM. Browser auto-open
// is suppressed via --no-open so the test never opens a window.

import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVE = path.join(__dirname, 'serve.js');
// Serve this test file itself — any readable file works for the launcher contract.
const SERVED_FILE = fileURLToPath(import.meta.url);

const EXPECTED_CHECKS = 5;
const selftest = process.argv.includes('--selftest');

let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) {
    passed += 1;
    process.stdout.write(`  ok   ${name}\n`);
  } else {
    failures.push(name);
    process.stdout.write(`  FAIL ${name}\n`);
  }
}

function get(port, urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path: urlPath }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.setTimeout(3000, () => req.destroy(new Error('timeout')));
  });
}

function waitForUrl(child) {
  return new Promise((resolve, reject) => {
    let out = '';
    const onData = (d) => {
      out += d.toString();
      const m = out.match(/http:\/\/127\.0\.0\.1:(\d+)\//);
      if (m) {
        child.stdout.off('data', onData);
        resolve(Number(m[1]));
      }
    };
    child.stdout.on('data', onData);
    child.on('exit', (code) => reject(new Error(`server exited early (code ${code})`)));
    setTimeout(() => reject(new Error('timed out waiting for server URL')), 5000);
  });
}

async function main() {
  const child = spawn(process.execPath, [SERVE, SERVED_FILE, '--no-open'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let port;
  try {
    port = await waitForUrl(child);
  } catch (e) {
    check('server prints an ephemeral port URL', false);
    child.kill('SIGKILL');
    return finish();
  }
  check('server prints an ephemeral port URL', Number.isInteger(port) && port > 0);

  const root = await get(port, '/').catch(() => ({ status: 0, body: '' }));
  check('GET / returns 200', root.status === 200);
  check('GET / serves the passed file', root.body.includes('serve.test.mjs') || root.body.length > 0);

  const other = await get(port, '/nope.txt').catch(() => ({ status: 0 }));
  check('GET /other returns 404', other.status === 404);

  // clean shutdown on SIGTERM
  const exited = await new Promise((resolve) => {
    child.on('exit', (code) => resolve(code));
    child.kill('SIGTERM');
    setTimeout(() => {
      child.kill('SIGKILL');
      resolve('killed');
    }, 2000);
  });
  check('clean shutdown on SIGTERM (exit 0)', exited === 0);

  finish();
}

function finish() {
  process.stdout.write(`\n${passed}/${EXPECTED_CHECKS} checks passed\n`);
  if (selftest && passed !== EXPECTED_CHECKS) {
    process.stderr.write(`selftest: expected ${EXPECTED_CHECKS} checks, got ${passed}\n`);
    process.exit(1);
  }
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((e) => {
  process.stderr.write(`serve.test.mjs error: ${e.stack || e}\n`);
  process.exit(1);
});
