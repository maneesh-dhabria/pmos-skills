#!/usr/bin/env node
// magazine-lock.js — a tiny advisory lockfile for /magazine's transcription queue.
// Zero npm dependencies (node built-ins only). Requires: node >= 18.
//
// Why this exists: a background worker and an interactive session both mutate the
// ledger (claim/release a podcast for transcription). Writes are atomic, but two
// `claim` passes could still interleave. This lock serializes the brief
// claim/release ledger mutation — it is held ONLY for that, never across the
// whisper subprocess, so the two consumers can transcribe DIFFERENT episodes at
// once but never the same one.
//
// macOS ships no `flock` binary, so the lock lives here in node, not in bash.
// Mechanism: O_EXCL lockfile holding {pid, at}; a holder whose PID is dead or
// whose timestamp is older than staleMs is reclaimed automatically.
//
// CLI:  node magazine-lock.js --selftest
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_STALE_MS = 30 * 60 * 1000; // 30 min — generous vs. a long episode

function defaultLockPath() {
  return path.join(os.homedir(), '.pmos', 'magazine', '.watch.lock');
}

// process.kill(pid, 0) probes liveness without signalling: throws ESRCH when the
// process is gone, EPERM when it exists but we may not signal it (still alive).
function isAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

// Synchronous sleep without a busy-loop (CLI context, no event loop to block).
function sleepSync(ms) {
  if (ms <= 0) return;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function makeHandle(lockPath) {
  let released = false;
  return {
    path: lockPath,
    release() {
      if (released) return;
      released = true;
      try { fs.unlinkSync(lockPath); } catch (_e) { /* already gone */ }
    },
  };
}

// Try to acquire the lock. Returns a handle, or null if a live, fresh holder
// owns it. A dead/stale holder is reclaimed (one retry).
function acquire(lockPath, opts) {
  const staleMs = (opts && opts.staleMs) || DEFAULT_STALE_MS;
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = fs.openSync(lockPath, 'wx'); // O_EXCL | O_CREAT
      fs.writeSync(fd, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
      fs.closeSync(fd);
      return makeHandle(lockPath);
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      let holder = null;
      try { holder = JSON.parse(fs.readFileSync(lockPath, 'utf8')); } catch (_e) { holder = null; }
      const dead = !holder || !isAlive(holder.pid);
      const expired = holder && holder.at && (Date.now() - Date.parse(holder.at) > staleMs);
      if (dead || expired) {
        try { fs.unlinkSync(lockPath); } catch (_e) { /* race: someone else reclaimed */ }
        continue; // retry once on the now-free slot
      }
      return null; // live, fresh holder — contended
    }
  }
  return null;
}

// Run fn() while holding the lock; release on every exit path. Retries with
// backoff if contended; throws Error{code:'ELOCKED'} when it cannot acquire in
// time so the caller can skip this pass gracefully.
function withLock(lockPath, fn, opts) {
  const o = opts || {};
  const retries = o.retries == null ? 20 : o.retries;
  const backoffMs = o.backoffMs == null ? 50 : o.backoffMs;
  for (let i = 0; i <= retries; i++) {
    const h = acquire(lockPath, o);
    if (h) {
      try { return fn(); } finally { h.release(); }
    }
    sleepSync(backoffMs);
  }
  const err = new Error('lock contended: ' + lockPath);
  err.code = 'ELOCKED';
  throw err;
}

function selftest() {
  let ok = true;
  const assert = (c, m) => { if (!c) { ok = false; console.error('FAIL:', m); } };
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'mag-lock-'));
  const lp = path.join(tmpdir, '.watch.lock');

  // acquire / contended / release
  const h1 = acquire(lp);
  assert(h1 !== null, 'first acquire succeeds');
  assert(acquire(lp) === null, 'second acquire is contended (null)');
  h1.release();
  const h2 = acquire(lp);
  assert(h2 !== null, 'acquire succeeds after release');
  h2.release();
  assert(!fs.existsSync(lp), 'lockfile gone after release');

  // dead-PID holder is reclaimed
  fs.writeFileSync(lp, JSON.stringify({ pid: 4000000, at: new Date().toISOString() }));
  const h3 = acquire(lp);
  assert(h3 !== null, 'dead-PID holder reclaimed');
  h3.release();

  // expired holder (alive PID but stale timestamp) is reclaimed
  fs.writeFileSync(lp, JSON.stringify({ pid: process.pid, at: new Date(Date.now() - 60 * 60 * 1000).toISOString() }));
  const h4 = acquire(lp, { staleMs: 1000 });
  assert(h4 !== null, 'expired holder reclaimed');
  h4.release();

  // live, fresh holder is NOT reclaimed
  fs.writeFileSync(lp, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
  assert(acquire(lp, { staleMs: 60 * 60 * 1000 }) === null, 'live fresh holder not reclaimed');
  fs.unlinkSync(lp);

  // withLock returns fn result and releases on success
  const v = withLock(lp, () => 42);
  assert(v === 42, 'withLock returns fn result');
  assert(!fs.existsSync(lp), 'withLock released after success');

  // withLock releases on throw
  let threw = false;
  try { withLock(lp, () => { throw new Error('boom'); }); } catch (_e) { threw = true; }
  assert(threw, 'withLock propagates fn throw');
  assert(!fs.existsSync(lp), 'withLock released after throw');

  // withLock gives up with ELOCKED when a live holder never frees it
  fs.writeFileSync(lp, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
  let elocked = false;
  try { withLock(lp, () => 1, { retries: 1, backoffMs: 1, staleMs: 60 * 60 * 1000 }); }
  catch (e) { elocked = e.code === 'ELOCKED'; }
  assert(elocked, 'withLock throws ELOCKED when contended past retries');
  fs.unlinkSync(lp);

  // isAlive sanity
  assert(isAlive(process.pid) === true, 'isAlive true for self');
  assert(isAlive(4000000) === false, 'isAlive false for absent pid');

  fs.rmSync(tmpdir, { recursive: true, force: true });
  console.log(ok ? 'magazine-lock.js --selftest: PASS' : 'magazine-lock.js --selftest: FAIL');
  process.exit(ok ? 0 : 1);
}

module.exports = { defaultLockPath, isAlive, sleepSync, acquire, withLock };

if (require.main === module) {
  if (process.argv.slice(2).includes('--selftest')) selftest();
  else console.log('usage: magazine-lock.js --selftest');
}
