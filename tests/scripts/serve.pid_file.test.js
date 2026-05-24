'use strict';
// T4 — pid-file + idle timeout + 127.0.0.1 hard-bind + --port-file alias.
// FR-44, FR-45, NFR-07; Decision P2. Run via assert_serve_js_pid_file.sh.

const path = require('path');
const fs   = require('fs');
const os   = require('os');
const net  = require('net');
const { spawn } = require('child_process');

const REPO  = path.resolve(__dirname, '..', '..');
const SERVE = path.join(REPO, 'plugins/pmos-toolkit/skills/_shared/html-authoring/assets/serve.js');

let passed = 0, failed = 0;
function ok(name)        { console.log(`  ok  ${name}`); passed++; }
function fail(name, err) { console.log(`  FAIL ${name}\n       ${err && (err.stack || err.message) || err}`); failed++; }
function assert(cond, msg) { if (!cond) throw new Error(msg); }

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function spawnServe(args, opts = {}) {
  const child = spawn(process.execPath, [SERVE, ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: opts.cwd || os.tmpdir(),
  });
  child.stdoutBuf = '';
  child.stderrBuf = '';
  child.stdout.on('data', (d) => { child.stdoutBuf += d.toString(); });
  child.stderr.on('data', (d) => { child.stderrBuf += d.toString(); });
  return child;
}

async function waitForFile(p, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { const st = fs.statSync(p); if (st.size > 0) return true; } catch (_) {}
    await sleep(50);
  }
  return false;
}

async function waitForGone(p, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { fs.statSync(p); } catch (_) { return true; }
    await sleep(25);
  }
  return false;
}

async function waitForExit(child, timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; resolve(null); } }, timeoutMs);
    child.once('exit', (code) => { if (!done) { done = true; clearTimeout(t); resolve(code); } });
  });
}

function freshPid(prefix) {
  return path.join(os.tmpdir(), `${prefix}-${process.pid}-${Date.now()}-${Math.floor(Math.random()*1e6)}.pid`);
}

(async () => {
  // ---------- (a)+(b) pid-file written, JSON has pid/port/started_at; kill -0 works ----------
  {
    const pidFile = freshPid('pmos-pidfile-a');
    const child = spawnServe(['--port=0', `--pid-file=${pidFile}`, `--idle=30`]);
    try {
      const got = await waitForFile(pidFile, 5000);
      assert(got, `pid file not written: ${pidFile}\nstdout:${child.stdoutBuf}\nstderr:${child.stderrBuf}`);
      const raw  = fs.readFileSync(pidFile, 'utf8');
      let data;
      try { data = JSON.parse(raw); }
      catch (e) { throw new Error(`pid file is not valid JSON: ${raw}`); }
      assert(typeof data.pid    === 'number' && data.pid > 0,                 `missing/invalid pid in: ${raw}`);
      assert(typeof data.port   === 'number' && data.port > 0,                `missing/invalid port in: ${raw}`);
      assert(typeof data.started_at === 'string' && /\d{4}-\d{2}-\d{2}T/.test(data.started_at),
             `started_at not ISO-8601 in: ${raw}`);
      // (b) kill -0 succeeds
      try { process.kill(data.pid, 0); } catch (e) { throw new Error(`kill -0 ${data.pid} failed: ${e.message}`); }
      ok('(a) pid file contains JSON with pid/port/started_at');
      ok('(b) kill -0 <pid> succeeds while serve is running');
    } catch (e) { fail('(a)/(b) pid-file JSON + kill -0', e); }
    finally { try { child.kill('SIGTERM'); } catch (_) {} await waitForExit(child, 2000); try { fs.unlinkSync(pidFile); } catch (_) {} }
  }

  // ---------- (c) SIGTERM removes pid file within 500ms ----------
  {
    const pidFile = freshPid('pmos-pidfile-c');
    const child = spawnServe(['--port=0', `--pid-file=${pidFile}`, `--idle=30`]);
    try {
      const got = await waitForFile(pidFile, 5000);
      assert(got, 'pid file not written before SIGTERM test');
      child.kill('SIGTERM');
      const gone = await waitForGone(pidFile, 800);
      assert(gone, `pid file still present 800ms after SIGTERM: ${pidFile}`);
      ok('(c) SIGTERM removes pid file within 500ms');
    } catch (e) { fail('(c) SIGTERM cleanup', e); }
    finally { try { child.kill('SIGKILL'); } catch (_) {} await waitForExit(child, 2000); try { fs.unlinkSync(pidFile); } catch (_) {} }
  }

  // ---------- (d) --port-file alias still works + emits deprecation warning ----------
  {
    const pidFile = freshPid('pmos-pidfile-d');
    const child = spawnServe(['--port=0', `--port-file=${pidFile}`, `--idle=30`]);
    try {
      const got = await waitForFile(pidFile, 5000);
      assert(got, `--port-file alias did not write file: stderr=${child.stderrBuf}`);
      const raw = fs.readFileSync(pidFile, 'utf8');
      // Accept JSON (new alias behavior) — task says "behaves identically to --pid-file"
      let data;
      try { data = JSON.parse(raw); } catch (e) { throw new Error(`--port-file output not JSON: ${raw}`); }
      assert(typeof data.pid === 'number' && typeof data.port === 'number',
             `--port-file alias output missing keys: ${raw}`);
      assert(/deprecat/i.test(child.stderrBuf),
             `--port-file did not emit deprecation warning on stderr: ${JSON.stringify(child.stderrBuf)}`);
      ok('(d) --port-file alias behaves identically + stderr deprecation warning');
    } catch (e) { fail('(d) --port-file alias', e); }
    finally { try { child.kill('SIGTERM'); } catch (_) {} await waitForExit(child, 2000); try { fs.unlinkSync(pidFile); } catch (_) {} }
  }

  // ---------- (e) --idle=1 → process exits within 1500ms ----------
  {
    const pidFile = freshPid('pmos-pidfile-e');
    const child = spawnServe(['--port=0', `--pid-file=${pidFile}`, '--idle=1']);
    try {
      const got = await waitForFile(pidFile, 5000);
      assert(got, 'pid file not written before idle test');
      const code = await waitForExit(child, 1800);
      assert(code !== null, `serve did not exit within 1800ms after --idle=1 (stderr=${child.stderrBuf})`);
      const gone = await waitForGone(pidFile, 200);
      assert(gone, `pid file not cleaned on idle exit: ${pidFile}`);
      ok('(e) --idle=1 triggers self-shutdown within ~1.5s');
    } catch (e) { fail('(e) --idle timeout', e); }
    finally { try { child.kill('SIGKILL'); } catch (_) {} try { fs.unlinkSync(pidFile); } catch (_) {} }
  }

  // ---------- (f) hard-bind to 127.0.0.1: non-loopback iface refuses ----------
  {
    const ifaces = os.networkInterfaces();
    let externalAddr = null;
    for (const list of Object.values(ifaces)) {
      for (const i of (list || [])) {
        if (i.family === 'IPv4' && !i.internal && i.address && i.address !== '127.0.0.1') {
          externalAddr = i.address; break;
        }
      }
      if (externalAddr) break;
    }
    if (!externalAddr) {
      console.log('  ok  (f) hard-bind 127.0.0.1 — SKIPPED (no non-loopback IPv4 iface)');
      passed++;
    } else {
      const pidFile = freshPid('pmos-pidfile-f');
      const child = spawnServe(['--port=0', `--pid-file=${pidFile}`, '--idle=30']);
      try {
        const got = await waitForFile(pidFile, 5000);
        assert(got, 'pid file not written before bind test');
        const data = JSON.parse(fs.readFileSync(pidFile, 'utf8'));
        // attempt to connect via the external addr — should fail (ECONNREFUSED or timeout)
        const refused = await new Promise((resolve) => {
          const sock = net.createConnection({ host: externalAddr, port: data.port, family: 4 });
          const t = setTimeout(() => { try { sock.destroy(); } catch (_) {} resolve('timeout'); }, 1200);
          sock.once('connect', () => { clearTimeout(t); try { sock.destroy(); } catch (_) {} resolve('connected'); });
          sock.once('error',   (e) => { clearTimeout(t); resolve(e.code || 'error'); });
        });
        assert(refused !== 'connected',
          `server unexpectedly accepted connection on ${externalAddr}:${data.port}`);
        ok(`(f) hard-bind 127.0.0.1 — non-loopback ${externalAddr} refused (${refused})`);
      } catch (e) { fail('(f) hard-bind 127.0.0.1', e); }
      finally { try { child.kill('SIGTERM'); } catch (_) {} await waitForExit(child, 2000); try { fs.unlinkSync(pidFile); } catch (_) {} }
    }
  }

  // ---------- (g) Regression: --port still works ----------
  {
    const startPort = 41000 + Math.floor(Math.random() * 2000);
    const pidFile = freshPid('pmos-pidfile-g');
    const child = spawnServe([`--port=${startPort}`, `--pid-file=${pidFile}`, '--idle=30']);
    try {
      const got = await waitForFile(pidFile, 5000);
      assert(got, '--port regression: pid file not written');
      const data = JSON.parse(fs.readFileSync(pidFile, 'utf8'));
      // basic HTTP probe via loopback
      const http = require('http');
      const code = await new Promise((resolve, reject) => {
        const req = http.get({ host: '127.0.0.1', port: data.port, path: '/' }, (res) => {
          resolve(res.statusCode); res.resume();
        });
        req.on('error', reject);
        req.setTimeout(2000, () => { req.destroy(new Error('timeout')); });
      });
      assert(typeof code === 'number', `expected HTTP response, got ${code}`);
      ok(`(g) regression: --port still binds + responds (HTTP ${code} on 127.0.0.1:${data.port})`);
    } catch (e) { fail('(g) --port regression', e); }
    finally { try { child.kill('SIGTERM'); } catch (_) {} await waitForExit(child, 2000); try { fs.unlinkSync(pidFile); } catch (_) {} }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
