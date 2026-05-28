#!/usr/bin/env node
// serve.save.test.js — T2 tests for serve.js HEAD/POST /save + orphan scan.
// Run: node tests/serve.save.test.js
//
// Strategy: fork serve.js as a subprocess with --port 0, parse the bound port
// from stdout ("Open http://127.0.0.1:PORT/index.html"), then drive HTTP
// against it. Each case sets up its own tmpdir, spawns serve, asserts, and
// kills the child in a finally{}.

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');

const SERVE_JS = path.resolve(__dirname, '..', 'assets', 'serve.js');
const COMMENTS_RE = /<!-- pmos-comments:start -->[\s\S]*?<script id="pmos-comments" type="application\/json">([\s\S]*?)<\/script>[\s\S]*?<!-- pmos-comments:end -->/;

function mkTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'serve-save-test-'));
}

function rmrf(p) {
  try { fs.rmSync(p, { recursive: true, force: true }); } catch (_) {}
}

function buildArtifact(version, threads) {
  const payload = {
    schema: 1,
    version,
    generated_at: '2026-05-28T00:00:00Z',
    threads: threads || [],
  };
  const inline = JSON.stringify(payload).replace(/</g, '\\u003c');
  return [
    '<!doctype html><html><head><meta charset="utf-8"><title>foo</title></head><body>',
    '<h1>foo</h1>',
    '<!-- pmos-comments:start -->',
    '<script id="pmos-comments" type="application/json">',
    inline,
    '</script>',
    '<!-- pmos-comments:end -->',
    '</body></html>',
    '',
  ].join('\n');
}

function writeFixture(root, version, threads) {
  fs.writeFileSync(path.join(root, 'foo.html'), buildArtifact(version, threads));
}

function readArtifactPayload(root, name) {
  const html = fs.readFileSync(path.join(root, name || 'foo.html'), 'utf8');
  const m = html.match(COMMENTS_RE);
  if (!m) throw new Error('no inline block in artifact');
  return JSON.parse(m[1]);
}

function startServe(root, extraArgs) {
  const args = ['--port', '0', '--root', root, '--idle', '0'];
  if (extraArgs) args.push(...extraArgs);
  const child = spawn(process.execPath, [SERVE_JS, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdoutBuf = '';
  let stderrBuf = '';
  child.stdout.on('data', (d) => { stdoutBuf += d.toString('utf8'); });
  child.stderr.on('data', (d) => { stderrBuf += d.toString('utf8'); });

  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch (_) {}
      reject(new Error('serve.js did not print port within 3s; stderr=' + stderrBuf));
    }, 3000);
    const tick = () => {
      const m = stdoutBuf.match(/http:\/\/127\.0\.0\.1:(\d+)\//);
      if (m) {
        clearTimeout(t);
        resolve({
          port: parseInt(m[1], 10),
          child,
          getStdout: () => stdoutBuf,
          getStderr: () => stderrBuf,
        });
        return;
      }
      setTimeout(tick, 20);
    };
    tick();
    child.on('exit', (code) => {
      clearTimeout(t);
      if (!stdoutBuf.match(/http:\/\/127\.0\.0\.1:(\d+)\//)) {
        reject(new Error(`serve.js exited (code=${code}) before printing port; stderr=${stderrBuf}`));
      }
    });
  });
}

function killServe(ctx) {
  try { ctx.child.kill('SIGTERM'); } catch (_) {}
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      try { ctx.child.kill('SIGKILL'); } catch (_) {}
      resolve();
    }, 1000);
    ctx.child.on('exit', () => { clearTimeout(t); resolve(); });
  });
}

function httpReq(method, port, urlPath, bodyRaw) {
  return new Promise((resolve, reject) => {
    const opts = {
      host: '127.0.0.1',
      port,
      method,
      path: urlPath,
      headers: {},
    };
    if (bodyRaw != null) {
      const buf = Buffer.isBuffer(bodyRaw) ? bodyRaw : Buffer.from(bodyRaw, 'utf8');
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = buf.length;
    }
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('error', reject);
    if (bodyRaw != null) {
      const buf = Buffer.isBuffer(bodyRaw) ? bodyRaw : Buffer.from(bodyRaw, 'utf8');
      req.write(buf);
    }
    req.end();
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function case1_head() {
  const root = mkTmpDir();
  let ctx;
  try {
    writeFixture(root, 1);
    ctx = await startServe(root);
    const r = await httpReq('HEAD', ctx.port, '/save');
    assert.equal(r.status, 204, 'HEAD /save should return 204');
    assert.equal(r.body, '', 'HEAD /save body should be empty');
    console.log('OK: case 1 — HEAD /save → 204');
  } finally {
    if (ctx) await killServe(ctx);
    rmrf(root);
  }
}

async function case2_happyPath() {
  const root = mkTmpDir();
  let ctx;
  try {
    writeFixture(root, 5);
    ctx = await startServe(root);
    const body = JSON.stringify({
      expected_version: 5,
      payload: { schema: 1, version: 5, generated_at: '2026-05-28T00:00:00Z', threads: [{ id: 't1', text: 'hi' }] },
    });
    const r = await httpReq('POST', ctx.port, '/save?artifact=foo.html', body);
    assert.equal(r.status, 200, `POST happy → 200 (got ${r.status} body=${r.body})`);
    const resp = JSON.parse(r.body);
    assert.equal(resp.version, 6, 'response.version should be 6');
    assert.ok(typeof resp.generated_at === 'string' && resp.generated_at.length > 0, 'generated_at returned');

    const onDisk = readArtifactPayload(root);
    assert.equal(onDisk.version, 6, 'on-disk payload.version === 6');
    assert.equal(onDisk.threads.length, 1, '1 thread persisted');
    assert.equal(onDisk.threads[0].text, 'hi', 'thread text persisted');
    console.log('OK: case 2 — POST happy path → 200, version bumped, threads persisted');
  } finally {
    if (ctx) await killServe(ctx);
    rmrf(root);
  }
}

async function case3_staleVersion() {
  const root = mkTmpDir();
  let ctx;
  try {
    writeFixture(root, 5);
    const before = fs.readFileSync(path.join(root, 'foo.html'));
    ctx = await startServe(root);
    const body = JSON.stringify({
      expected_version: 4,
      payload: { schema: 1, version: 4, generated_at: '2026-05-28T00:00:00Z', threads: [] },
    });
    const r = await httpReq('POST', ctx.port, '/save?artifact=foo.html', body);
    assert.equal(r.status, 409, `stale → 409 (got ${r.status} body=${r.body})`);
    const resp = JSON.parse(r.body);
    assert.equal(resp.error, 'version-conflict');
    assert.equal(resp.current_version, 5);
    const after = fs.readFileSync(path.join(root, 'foo.html'));
    assert.ok(before.equals(after), 'file bytes unchanged on conflict');
    console.log('OK: case 3 — stale version → 409, file unchanged');
  } finally {
    if (ctx) await killServe(ctx);
    rmrf(root);
  }
}

async function case4_malformedJson() {
  const root = mkTmpDir();
  let ctx;
  try {
    writeFixture(root, 5);
    const before = fs.readFileSync(path.join(root, 'foo.html'));
    ctx = await startServe(root);
    const r = await httpReq('POST', ctx.port, '/save?artifact=foo.html', 'not json');
    assert.equal(r.status, 400, `malformed → 400 (got ${r.status} body=${r.body})`);
    const resp = JSON.parse(r.body);
    assert.equal(resp.error, 'schema-validation-failed');
    const after = fs.readFileSync(path.join(root, 'foo.html'));
    assert.ok(before.equals(after), 'file bytes unchanged on malformed body');
    console.log('OK: case 4 — malformed JSON → 400, file unchanged');
  } finally {
    if (ctx) await killServe(ctx);
    rmrf(root);
  }
}

async function case5_orphanScan() {
  const root = mkTmpDir();
  let ctx;
  try {
    fs.writeFileSync(path.join(root, 'foo.html.tmp'), 'leftover');
    fs.writeFileSync(path.join(root, 'index.html'), '<html></html>');
    ctx = await startServe(root);
    // serve.js prints the orphan line during start() right after listen.
    // We've already awaited the "Open http://..." stdout line, so the orphan
    // scan has executed. Give one more tick in case stderr is slightly buffered.
    await sleep(150);
    const stderr = ctx.getStderr();
    assert.ok(
      stderr.includes('orphan .tmp from previous run: foo.html.tmp'),
      `expected orphan log in stderr; got: ${stderr}`
    );
    assert.ok(fs.existsSync(path.join(root, 'foo.html.tmp')), 'orphan .tmp must NOT be auto-deleted');
    console.log('OK: case 5 — startup orphan scan logs to stderr, no auto-delete');
  } finally {
    if (ctx) await killServe(ctx);
    rmrf(root);
  }
}

(async () => {
  try {
    await case1_head();
    await case2_happyPath();
    await case3_staleVersion();
    await case4_malformedJson();
    await case5_orphanScan();
    console.log('OK: 5 cases passed');
    process.exit(0);
  } catch (e) {
    console.error('FAIL:', e && e.stack || e);
    process.exit(1);
  }
})();
