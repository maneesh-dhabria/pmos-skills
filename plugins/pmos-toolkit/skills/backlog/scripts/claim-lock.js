#!/usr/bin/env node
// claim-lock.js — atomic story-claim lock for /backlog's Loop-2 (build) picker.
// Zero npm dependencies (node built-ins only). Requires: node >= 18.
//
// Why this exists (design D13): the build loop's atomic claim is
// `backlog/claims/<id>.lock` created with O_EXCL. A YAML `claimed_by:` mirror in
// the item file is display/audit only — YAML check-then-write is NOT atomic, so
// two unattended drivers (`/loop`, cron) could double-claim the same story.
// This file is the ground truth; the item's `claimed_by:` is a convenience copy.
//
// This is the /magazine-worker O_EXCL pattern (scripts/magazine-lock.js),
// re-homed for the backlog and given a story-claims CLI. macOS ships no `flock`
// binary, so the lock lives here in node, not in bash.
//
// Mechanism: O_EXCL lockfile at <claims-dir>/<id>.lock holding {id, holder, pid,
// at}. Reclaim by `acquire` has TWO triggers (each applies one retry on the
// freed slot):
//   (1) Time-based TTL (design D13: "stale-lease TTL with steal-on-warning"): a
//       holder whose timestamp is older than staleMs is reclaimed regardless of
//       who holds it. Default TTL is 4h. This is the rule for a FOREIGN holder.
//   (2) Own-holder identity (epic 0612-w4e D3 — the build loop's resume-first
//       reconcile): a lock whose recorded `holder` EQUALS the requesting
//       `--holder` is reclaimed IMMEDIATELY, without waiting out the TTL. A
//       crashed `/loop` build tick leaves its own claim held; the next tick
//       claims with the same stable per-loop holder id, recognizes the abandoned
//       lock as "mine", and resumes at once instead of stalling out the 4h TTL.
//       A DIFFERENT (foreign) holder is unaffected by this trigger — it still
//       obeys (1). Own-holder reclaim requires an explicit `--holder` (a default
//       `pid:<n>` label is per-process and never matches a prior tick's lock).
// A holder that is neither stale (1) nor own (2) is reported as contended.
// NOTE: unlike the magazine worker (which holds its lock for one live process),
// a backlog claim must SURVIVE the claiming process's exit — the story stays
// claimed across many CLI invocations until `unclaim` or a reclaim trigger — so
// PID-liveness is still NOT a reclaim trigger here; `pid` is audit-only. `steal`
// is the manual override.
//
// CLI:
//   node claim-lock.js acquire <claims-dir> <id> [--holder <s>] [--stale-ms <n>]
//   node claim-lock.js release <claims-dir> <id>
//   node claim-lock.js status  <claims-dir> <id>
//   node claim-lock.js steal   <claims-dir> <id> [--holder <s>]   # force-take
//   node claim-lock.js --selftest
//
// Exit codes: 0 ok · 3 contended (live fresh FOREIGN holder) · 4 not-held (release/status
// of a free slot) · 64 usage error. On `acquire`/`status`/`steal` the current or
// new holder JSON is printed to stdout so the caller can surface who holds it.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const DEFAULT_STALE_MS = 4 * 60 * 60 * 1000; // 4h — design D13 default stale-lease TTL

function lockPathFor(claimsDir, id) {
  return path.join(claimsDir, `${id}.lock`);
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

function readHolder(lockPath) {
  try {
    return JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  } catch (_e) {
    return null;
  }
}

// True when the recorded holder is missing or expired (timestamp older than
// staleMs). Time-based ONLY — a backlog claim outlives the process that made it,
// so PID liveness is deliberately not consulted (see the header note).
function reclaimable(holder, staleMs) {
  if (!holder) return true;
  if (holder.at && Date.now() - Date.parse(holder.at) > staleMs) return true;
  return false;
}

// True when the recorded holder is the SAME holder now requesting the lock —
// an abandoned own-claim (epic 0612-w4e D3). Reclaim trigger (2): lets a build
// loop tick recognize a prior tick's crashed claim as "mine" and resume without
// the TTL wait. Requires a real, equal `holder` string on both sides — a missing
// recorded holder or a missing/empty request holder never matches (the absent
// case is already covered by reclaimable()'s null check).
function reclaimableByHolder(holder, requestingHolder) {
  if (!holder || !requestingHolder) return false;
  return holder.holder === requestingHolder;
}

// Try to acquire the lock for <id>. Returns the holder record on success, or
// null if a live, fresh holder owns it (contended). A dead/stale holder is
// reclaimed (one retry) — that reclaim is the "steal-on-warning" of D13.
function acquire(claimsDir, id, opts) {
  const staleMs = (opts && opts.staleMs) || DEFAULT_STALE_MS;
  const explicitHolder = (opts && opts.holder) || null; // own-holder reclaim needs an explicit --holder
  const holderLabel = explicitHolder || `pid:${process.pid}`;
  const lockPath = lockPathFor(claimsDir, id);
  fs.mkdirSync(claimsDir, { recursive: true });
  for (let attempt = 0; attempt < 2; attempt++) {
    const record = { id: String(id), holder: holderLabel, pid: process.pid, at: new Date().toISOString() };
    try {
      const fd = fs.openSync(lockPath, 'wx'); // O_EXCL | O_CREAT
      fs.writeSync(fd, JSON.stringify(record));
      fs.closeSync(fd);
      return record;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      const holder = readHolder(lockPath);
      // Trigger (1) time-based TTL (any holder) OR trigger (2) own-holder identity
      // (an explicit --holder matching the recorded holder — an abandoned own-claim).
      if (reclaimable(holder, staleMs) || reclaimableByHolder(holder, explicitHolder)) {
        try { fs.unlinkSync(lockPath); } catch (_e) { /* race: someone else reclaimed */ }
        continue; // retry once on the now-free slot
      }
      return null; // live, fresh, foreign holder — contended
    }
  }
  return null;
}

// Force-take the lock regardless of holder freshness (manual override).
function steal(claimsDir, id, opts) {
  const lockPath = lockPathFor(claimsDir, id);
  try { fs.unlinkSync(lockPath); } catch (_e) { /* already free */ }
  return acquire(claimsDir, id, opts);
}

// Remove the lock for <id>. Returns true if a lock was present, false if free.
function release(claimsDir, id) {
  const lockPath = lockPathFor(claimsDir, id);
  try {
    fs.unlinkSync(lockPath);
    return true;
  } catch (_e) {
    return false;
  }
}

function status(claimsDir, id) {
  return readHolder(lockPathFor(claimsDir, id));
}

function selftest() {
  let ok = true;
  const assert = (c, m) => { if (!c) { ok = false; console.error('FAIL:', m); } };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'claim-lock-'));
  const dir = path.join(tmp, 'claims');

  // acquire / contended / release
  const a = acquire(dir, '0012');
  assert(a && a.id === '0012', 'first acquire succeeds, records id');
  assert(acquire(dir, '0012') === null, 'second acquire is contended (null)');
  assert(status(dir, '0012').pid === process.pid, 'status reports the live holder');
  assert(release(dir, '0012') === true, 'release reports a lock was present');
  assert(release(dir, '0012') === false, 'release of free slot reports false');
  assert(status(dir, '0012') === null, 'status of free slot is null');

  // distinct ids do not contend
  const b1 = acquire(dir, '0012');
  const b2 = acquire(dir, '0013');
  assert(b1 && b2, 'distinct ids acquire independently');
  release(dir, '0012'); release(dir, '0013');

  // a claim by a now-dead process is NOT reclaimed on PID-death — it persists
  // until the TTL (a backlog claim outlives the claiming process).
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(lockPathFor(dir, '0014'), JSON.stringify({ id: '0014', pid: 4000000, at: new Date().toISOString() }));
  assert(acquire(dir, '0014', { staleMs: 4 * 60 * 60 * 1000 }) === null, 'fresh claim from a dead PID is NOT reclaimed (persists, contended)');
  release(dir, '0014');

  // expired holder (stale timestamp) is reclaimed regardless of PID
  fs.writeFileSync(lockPathFor(dir, '0015'), JSON.stringify({ id: '0015', pid: 4000000, at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() }));
  assert(acquire(dir, '0015', { staleMs: 4 * 60 * 60 * 1000 }) !== null, 'expired holder reclaimed past 4h TTL');
  release(dir, '0015');

  // fresh holder is NOT reclaimed within the TTL (contended)
  fs.writeFileSync(lockPathFor(dir, '0016'), JSON.stringify({ id: '0016', pid: process.pid, at: new Date().toISOString() }));
  assert(acquire(dir, '0016', { staleMs: 4 * 60 * 60 * 1000 }) === null, 'fresh holder not reclaimed within TTL (contended)');

  // steal force-takes a live fresh holder
  assert(steal(dir, '0016', { holder: 'manual' }).holder === 'manual', 'steal force-takes a live holder');
  release(dir, '0016');

  // holder label is recorded and surfaced
  const h = acquire(dir, '0017', { holder: 'loop-driver-a' });
  assert(h.holder === 'loop-driver-a', 'custom holder label recorded');
  assert(status(dir, '0017').holder === 'loop-driver-a', 'custom holder label surfaced by status');
  release(dir, '0017');

  // --- own-holder reclaim (epic 0612-w4e D3) -------------------------------
  // A FRESH lock held by MY OWN holder is reclaimed immediately, no TTL wait —
  // this is the crashed-loop-tick self-resume path.
  fs.writeFileSync(lockPathFor(dir, '0018'), JSON.stringify({ id: '0018', holder: 'loop:sess-1', pid: 4000000, at: new Date().toISOString() }));
  const own = acquire(dir, '0018', { holder: 'loop:sess-1', staleMs: 4 * 60 * 60 * 1000 });
  assert(own !== null && own.holder === 'loop:sess-1', 'fresh own-holder lock reclaimed immediately (no TTL wait)');
  assert(own.pid === process.pid, 'own-holder reclaim rewrites the lock with the live pid');
  release(dir, '0018');

  // A FRESH lock held by a DIFFERENT (foreign) holder is still contended — the
  // own-holder trigger must not let me steal another driver's live claim.
  fs.writeFileSync(lockPathFor(dir, '0019'), JSON.stringify({ id: '0019', holder: 'loop:sess-OTHER', pid: 4000000, at: new Date().toISOString() }));
  assert(acquire(dir, '0019', { holder: 'loop:sess-1', staleMs: 4 * 60 * 60 * 1000 }) === null, 'fresh foreign-holder lock is contended (own-holder trigger does not steal it)');
  release(dir, '0019');

  // A STALE lock held by a foreign holder is still reclaimed at the TTL
  // (trigger (1) unchanged), even when my --holder differs.
  fs.writeFileSync(lockPathFor(dir, '001a'), JSON.stringify({ id: '001a', holder: 'loop:sess-OTHER', pid: 4000000, at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() }));
  assert(acquire(dir, '001a', { holder: 'loop:sess-1', staleMs: 4 * 60 * 60 * 1000 }) !== null, 'stale foreign-holder lock reclaimed at TTL (foreign TTL semantics preserved)');
  release(dir, '001a');

  // The reclaimableByHolder helper: equal holders match; missing/empty never do.
  assert(reclaimableByHolder({ holder: 'x' }, 'x') === true, 'reclaimableByHolder: equal holders match');
  assert(reclaimableByHolder({ holder: 'x' }, 'y') === false, 'reclaimableByHolder: different holders do not match');
  assert(reclaimableByHolder(null, 'x') === false, 'reclaimableByHolder: no recorded holder never matches');
  assert(reclaimableByHolder({ holder: 'x' }, null) === false, 'reclaimableByHolder: no requesting holder never matches');

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(ok ? 'claim-lock.js --selftest: PASS' : 'claim-lock.js --selftest: FAIL');
  process.exit(ok ? 0 : 1);
}

function parseFlags(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--holder') out.holder = argv[++i];
    else if (argv[i] === '--stale-ms') out.staleMs = parseInt(argv[++i], 10);
    else out._.push(argv[i]);
  }
  return out;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--selftest')) return selftest();
  const f = parseFlags(argv);
  const [cmd, claimsDir, id] = f._;
  const usage = 'usage: claim-lock.js <acquire|release|status|steal> <claims-dir> <id> [--holder <s>] [--stale-ms <n>] | --selftest';
  if (!cmd || !claimsDir || !id) { console.error(usage); process.exit(64); }
  const opts = { holder: f.holder, staleMs: f.staleMs };
  if (cmd === 'acquire') {
    const r = acquire(claimsDir, id, opts);
    if (r) { console.log(JSON.stringify(r)); process.exit(0); }
    console.error('contended: ' + JSON.stringify(status(claimsDir, id)));
    process.exit(3);
  } else if (cmd === 'steal') {
    console.log(JSON.stringify(steal(claimsDir, id, opts)));
    process.exit(0);
  } else if (cmd === 'release') {
    process.exit(release(claimsDir, id) ? 0 : 4);
  } else if (cmd === 'status') {
    const s = status(claimsDir, id);
    if (s) { console.log(JSON.stringify(s)); process.exit(0); }
    process.exit(4);
  } else {
    console.error(usage);
    process.exit(64);
  }
}

module.exports = { lockPathFor, isAlive, reclaimable, reclaimableByHolder, acquire, steal, release, status, DEFAULT_STALE_MS };

if (require.main === module) main();
