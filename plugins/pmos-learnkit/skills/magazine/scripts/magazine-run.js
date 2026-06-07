#!/usr/bin/env node
// magazine-run.js — the Stage-A orchestration entrypoint for /magazine (FR-P4).
// Zero npm dependencies. Requires: node >= 18.
//
// Without this, the agent has to hand-write a throwaway Node driver for every
// phase against the module APIs. This thin driver *shells the existing scripts*
// (fetch-feed.js / extract-article.js / transcribe.sh) and records progress in
// the lifecycle ledger via magazine-state.js — it does NOT re-implement parsing,
// extraction, or transcription.
//
// Subcommands:
//   discover [--feed <url>]... [--feeds <file>] [--since <ISO>] [--max <N>] [--root DIR]
//       Run fetch-feed per in-scope feed (each isolated; a failing feed is
//       skipped + reported, never aborting the run), record each GUID at
//       `discovered`, and print the snapshot item set as JSON.
//   prep [--root DIR] [--min-chars N]
//       For each `discovered` item: crawl via extract-article.js with output
//       REDIRECTED to crawl-cache/<safe-guid>.txt (never pipe-captured — closes
//       the truncation blast radius at the call site, FR-P1); transcribe
//       podcasts via transcribe.sh. Advances each item's status.
//   status [--root DIR]
//       Print the ledger summary (counts per lifecycle state).
//
//   --selftest    Round-trips `discover` against the bundled fixture feed.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const state = require('./magazine-state.js');
const lock = require('./magazine-lock.js');

const SCRIPTS = __dirname;
const FETCH = path.join(SCRIPTS, 'fetch-feed.js');
const EXTRACT = path.join(SCRIPTS, 'extract-article.js');
const TRANSCRIBE = path.join(SCRIPTS, 'transcribe.sh');

function defaultRoot() {
  return path.join(os.homedir(), '.pmos', 'magazine');
}
function safeGuid(guid) {
  return String(guid).replace(/[^A-Za-z0-9._-]/g, '_');
}
function statePath(root) {
  return path.join(root, 'state.json');
}

// Minimal feeds.yaml reader: every `url: <value>` line is a feed. Names are
// optional metadata; the URL is the only thing fetch-feed needs.
function readFeeds(root) {
  const file = path.join(root, 'feeds.yaml');
  if (!fs.existsSync(file)) return [];
  const out = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/\burl:\s*(['"]?)([^'"\s]+)\1/);
    if (m) out.push(m[2]);
  }
  return out;
}

// Typed feeds reader: parse feeds.yaml's block list into {url, type, name}.
// readFeeds() above returns bare URLs (all the Stage-A crawl needs); the
// transcription queue needs to know which feeds are podcasts, so this richer
// reader tracks each `- ` list entry's name/url/type.
function readFeedsTyped(root) {
  const file = path.join(root, 'feeds.yaml');
  if (!fs.existsSync(file)) return [];
  const out = [];
  let cur = null;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (/^\s*-\s/.test(line)) { if (cur) out.push(cur); cur = { url: null, type: null, name: null }; }
    if (!cur) continue;
    let m;
    if ((m = line.match(/\bname:\s*(['"]?)([\w.-]+)\1/))) cur.name = m[2];
    if ((m = line.match(/\burl:\s*(['"]?)([^'"\s#]+)\1/))) cur.url = m[2];
    if ((m = line.match(/\btype:\s*(['"]?)(newsletter|podcast)\1/))) cur.type = m[2];
  }
  if (cur) out.push(cur);
  return out.filter((f) => f.url);
}

// Run fetch-feed.js for one feed. A local path is read with --file (used by the
// selftest and by file:// feeds); anything else is fetched as a URL. fetch-feed
// emits "[]" + exit 1 on failure, which we surface as an empty, reported set.
function fetchOne(feed, since, max) {
  const args = [FETCH];
  if (fs.existsSync(feed)) args.push('--file', feed);
  else args.push(feed);
  if (since) args.push('--since', since);
  if (max) args.push('--max', String(max));
  try {
    const out = execFileSync(process.execPath, args, { maxBuffer: 32 * 1024 * 1024 }).toString();
    return JSON.parse(out);
  } catch (e) {
    process.stderr.write('magazine-run: feed skipped (' + feed + '): ' + (e.message || e) + '\n');
    return [];
  }
}

function cmdDiscover(opts) {
  const root = opts.root || defaultRoot();
  const feeds = opts.feeds.length ? opts.feeds : readFeeds(root);
  if (!feeds.length) {
    process.stderr.write('magazine-run discover: no feeds (pass --feed/--feeds or seed feeds.yaml)\n');
    return [];
  }
  const file = statePath(root);
  const st = state.load(file);
  const snapshot = [];
  let dupes = 0;
  for (const feed of feeds) {
    for (const it of fetchOne(feed, opts.since, opts.max)) {
      const meta = {
        feed, link: it.link, title: it.title,
        published: it.published, enclosure: it.enclosure,
      };
      state.discover(st, it.guid, meta); // GUID + cross-feed link dedup
      // Exclude cross-feed duplicates from the issue-defining snapshot — they
      // are still catalogued in the ledger (status 'duplicate', duplicate_of),
      // so nothing is silently dropped (FR-Q2).
      const rec = st.items[it.guid];
      if (rec && rec.status === 'duplicate') { dupes++; continue; }
      snapshot.push(Object.assign({ guid: it.guid }, meta));
    }
  }
  if (dupes) process.stderr.write('magazine-run discover: collapsed ' + dupes + ' cross-feed duplicate(s)\n');
  state.save(file, st);
  return snapshot;
}

function cmdPrep(opts) {
  const root = opts.root || defaultRoot();
  const file = statePath(root);
  const st = state.load(file);
  const cacheDir = path.join(root, 'crawl-cache');
  fs.mkdirSync(cacheDir, { recursive: true });

  const results = [];
  for (const guid of Object.keys(st.items)) {
    const item = st.items[guid];
    if (item.status !== 'discovered') continue; // resumable: skip already-prepped
    const r = { guid, crawl: null, transcribe: null };

    // Podcasts are transcribed through the shared queue (foreground drain below),
    // not inline here — their content is the transcript, and routing them through
    // the queue means an installed background worker and this session never
    // double-transcribe the same episode. Leave them at `discovered` (queued).
    if (item.enclosure) {
      r.transcribe = 'queued';
      results.push(r);
      continue;
    }

    // Crawl — redirect to a file (NOT a pipe). The fd write is what makes the
    // flush-before-exit fix moot at the call site: the OS owns the file.
    if (item.link) {
      const cacheFile = path.join(cacheDir, safeGuid(guid) + '.txt');
      const fd = fs.openSync(cacheFile, 'w');
      try {
        const args = [EXTRACT, item.link];
        if (opts.minChars) args.push('--min-chars', String(opts.minChars));
        execFileSync(process.execPath, args, { stdio: ['ignore', fd, 'inherit'] });
        r.crawl = 'ok';
      } catch (e) {
        // exit 2 = thin/paywall (preview-only); 1 = hard fail (fall back to RSS).
        r.crawl = e.status === 2 ? 'preview-only' : 'failed';
      } finally {
        fs.closeSync(fd);
      }
    }

    state.transition(st, guid, r.crawl === 'failed' ? 'failed' : 'downloaded',
      r.crawl === 'failed' ? 'crawl-failed' : undefined);
    results.push(r);
  }
  state.save(file, st);

  // Foreground-drain a BOUNDED number of queued podcasts (FR-8). Shares the lock
  // with any background watcher (no double-transcribe); items beyond the cap stay
  // queued and render via the show-notes fallback, to be picked up next run.
  const fg = cmdDrain({
    root,
    max: opts.max || FOREGROUND_TRANSCRIBE_CAP,
    budgetSec: opts.budgetSec,
    transcribeFn: opts.transcribeFn,
  });
  results.push({ foregroundDrain: fg });
  return results;
}

// --- Transcription queue: enqueue (producer) + drain (consumer) ---
// Both are headless and share the ledger-as-queue with any interactive run and
// the background watcher. INVARIANT: neither advances cursors nor renders — they
// only move podcast items along discovered -> transcribing -> transcribed.

const DEFAULT_DRAIN_MAX = 5;             // background worker: episodes per tick
const FOREGROUND_TRANSCRIBE_CAP = 3;    // interactive prep: episodes transcribed in-session
const STALE_TTL_MS = 30 * 60 * 1000;

// Producer: discover type:podcast feeds forward (per-feed cursor), recording new
// episodes at `discovered`. --backfill <days> overrides the cursor to pull
// history. Idempotent (discover dedups on GUID). Never advances cursors/renders.
function cmdEnqueue(opts) {
  const root = opts.root || defaultRoot();
  const file = statePath(root);
  const st = state.load(file);
  const feeds = (opts._feeds || readFeedsTyped(root)).filter((f) => f.type === 'podcast');
  if (!feeds.length) {
    process.stderr.write('magazine-run enqueue: no podcast feeds (add one with /magazine add ... --type podcast)\n');
    return { enqueued: 0, feeds: 0, alreadyQueued: 0 };
  }
  let enqueued = 0;
  let already = 0;
  for (const f of feeds) {
    const feedKey = f.name || f.url;
    const since = opts.backfill
      ? new Date(Date.now() - opts.backfill * 86400000).toISOString()
      : (st.cursors[feedKey] || null);
    for (const it of fetchOne(f.url, since, opts.max)) {
      const meta = { feed: feedKey, link: it.link, title: it.title, published: it.published, enclosure: it.enclosure };
      const isNew = state.discover(st, it.guid, meta);
      if (isNew) enqueued++; else already++;
    }
  }
  state.save(file, st);
  return { enqueued, feeds: feeds.length, alreadyQueued: already };
}

// Consumer: reclaim stale claims, then claim up to `max` pending podcast items,
// transcribe each OUTSIDE the lock, and release per whisper exit (0=transcribed,
// 3=no-whisper -> requeue + stop, else -> requeue as a retryable miss). The lock
// is held only for the claim/release ledger mutation. opts.transcribeFn is an
// injectable transcriber (default shells transcribe.sh) for hermetic tests.
function cmdDrain(opts) {
  const root = opts.root || defaultRoot();
  const file = statePath(root);
  const lockPath = path.join(root, '.watch.lock');
  const transcriptsDir = path.join(root, 'transcripts');
  const max = opts.max || DEFAULT_DRAIN_MAX;
  const budgetMs = opts.budgetSec ? opts.budgetSec * 1000 : 0;
  const transcribe = opts.transcribeFn || ((guid, enclosure) => {
    try {
      execFileSync('bash', [TRANSCRIBE, enclosure, guid, '--out-dir', transcriptsDir],
        { stdio: ['ignore', 'inherit', 'inherit'] });
      return 0;
    } catch (e) { return e.status || 1; }
  });

  const start = Date.now();
  const counts = { drained: 0, transcribed: 0, failed: 0, skippedClaimed: 0, reclaimed: 0 };

  counts.reclaimed = lock.withLock(lockPath, () => {
    const st = state.load(file);
    const n = state.reclaimStale(st, Date.now(), STALE_TTL_MS, lock.isAlive);
    if (n) state.save(file, st);
    return n;
  });

  for (let i = 0; i < max; i++) {
    if (budgetMs && Date.now() - start > budgetMs) break;

    const job = lock.withLock(lockPath, () => {
      const st = state.load(file);
      const pend = state.pendingPodcasts(st, { limit: 1 });
      if (!pend.length) return null;
      const cand = pend[0];
      if (state.claim(st, cand.guid, process.pid, new Date().toISOString())) {
        state.save(file, st);
        return { guid: cand.guid, enclosure: cand.enclosure };
      }
      counts.skippedClaimed++;
      return null;
    });
    if (!job) break; // queue drained (or the only candidate was claimed elsewhere)

    const exit = transcribe(job.guid, job.enclosure);

    lock.withLock(lockPath, () => {
      const st = state.load(file);
      if (exit === 0) { state.release(st, job.guid, 'transcribed'); counts.transcribed++; }
      else { state.release(st, job.guid, 'discovered'); if (exit !== 3) counts.failed++; }
      state.save(file, st);
    });
    counts.drained++;
    if (exit === 3) break; // no whisper this pass — pointless to keep trying
  }
  return counts;
}

function cmdStatus(opts) {
  const root = opts.root || defaultRoot();
  const st = state.load(statePath(root));
  const counts = Object.fromEntries(state.STATES.map((s) => [s, 0]));
  for (const guid of Object.keys(st.items)) {
    const s = st.items[guid].status;
    counts[s] = (counts[s] || 0) + 1;
  }
  return { root, total: Object.keys(st.items).length, counts, cursors: st.cursors };
}

function parseOpts(argv) {
  const opts = { feeds: [], since: null, max: 0, root: null, minChars: 0, backfill: 0, budgetSec: 0 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--feed') opts.feeds.push(argv[++i]);
    else if (a === '--feeds') {
      const f = argv[++i];
      for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
        const t = line.trim();
        if (t && !t.startsWith('#')) opts.feeds.push(t);
      }
    } else if (a === '--since') opts.since = argv[++i];
    else if (a === '--max') opts.max = parseInt(argv[++i], 10) || 0;
    else if (a === '--root') opts.root = argv[++i];
    else if (a === '--min-chars') opts.minChars = parseInt(argv[++i], 10) || 0;
    else if (a === '--backfill') opts.backfill = parseInt(argv[++i], 10) || 0;
    else if (a === '--budget-sec') opts.budgetSec = parseInt(argv[++i], 10) || 0;
  }
  return opts;
}

function selftest() {
  let ok = true;
  const assert = (c, m) => { if (!c) { ok = false; console.error('FAIL:', m); } };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mag-run-'));
  const fixture = path.join(SCRIPTS, '..', 'tests', 'fixtures', 'sample-feed.xml');

  const snap = cmdDiscover({ feeds: [fixture], since: null, max: 0, root: tmp });
  assert(snap.length >= 1, 'discover emitted >=1 item, got ' + snap.length);
  assert(snap.every((s) => s.guid), 'every snapshot item has a guid');

  const st = state.load(statePath(tmp));
  assert(Object.values(st.items).every((it) => it.status === 'discovered'), 'all recorded at discovered');

  // Re-discover is idempotent: ledger size is stable.
  const before = Object.keys(st.items).length;
  cmdDiscover({ feeds: [fixture], since: null, max: 0, root: tmp });
  const after = Object.keys(state.load(statePath(tmp)).items).length;
  assert(before === after, 'idempotent re-discover (no duplicates)');

  const stat = cmdStatus({ root: tmp });
  assert(stat.total === before, 'status total matches ledger');

  // FR-Q2: cross-feed dedup — sample-feed-2 re-publishes the episode under a
  // different GUID. The snapshot collapses it; the ledger catalogues it.
  const tmp2 = fs.mkdtempSync(path.join(os.tmpdir(), 'mag-run-dedup-'));
  const fixture2 = path.join(SCRIPTS, '..', 'tests', 'fixtures', 'sample-feed-2.xml');
  const snap2 = cmdDiscover({ feeds: [fixture, fixture2], since: null, max: 0, root: tmp2 });
  const epInSnap = snap2.filter((s) => /\/ep\?id=42/.test(s.link || ''));
  assert(epInSnap.length === 1, 'episode appears exactly once in the snapshot, got ' + epInSnap.length);
  const led2 = state.load(statePath(tmp2));
  const dup = led2.items['lenny-news-555'];
  assert(dup && dup.status === 'duplicate' && dup.duplicate_of === 'substack:post:198591907',
    'cross-feed re-publish catalogued as duplicate_of the podcast GUID');
  assert(led2.items['feed2-unique'] && led2.items['feed2-unique'].status === 'discovered',
    "feed-2's unique item is still discovered (not collapsed)");
  fs.rmSync(tmp2, { recursive: true, force: true });

  fs.rmSync(tmp, { recursive: true, force: true });

  // --- Transcription queue: enqueue + drain (T3/T4) ---
  const qroot = fs.mkdtempSync(path.join(os.tmpdir(), 'mag-queue-'));
  fs.writeFileSync(path.join(qroot, 'feeds.yaml'),
    'feeds:\n' +
    '  - name: testpod\n    url: ' + fixture + '\n    type: podcast\n' +
    '  - name: testnews\n    url: ' + fixture + '\n    type: newsletter\n');

  // readFeedsTyped parses blocks + types
  const typed = readFeedsTyped(qroot);
  assert(typed.length === 2 && typed.filter((f) => f.type === 'podcast').length === 1,
    'readFeedsTyped parses two typed feeds (one podcast)');

  // enqueue: only the podcast feed; records discovered; idempotent
  const enq = cmdEnqueue({ root: qroot });
  assert(enq.feeds === 1, 'enqueue scopes to podcast feeds only');
  const qst1 = state.load(statePath(qroot));
  const podGuids = Object.keys(qst1.items).filter((g) => qst1.items[g].enclosure && qst1.items[g].status === 'discovered');
  assert(podGuids.length >= 1, 'enqueue recorded >=1 discovered podcast item');
  const enq2 = cmdEnqueue({ root: qroot });
  assert(enq2.enqueued === 0, 'enqueue is idempotent (re-run enqueues nothing new)');

  // drain with an injected transcriber (hermetic — no real whisper/network)
  let transcribeCalls = 0;
  const drained = cmdDrain({
    root: qroot,
    max: 10,
    transcribeFn: (guid, enclosure) => {
      transcribeCalls++;
      assert(!!enclosure, 'drain passes an enclosure URL to the transcriber');
      fs.mkdirSync(path.join(qroot, 'transcripts'), { recursive: true });
      fs.writeFileSync(path.join(qroot, 'transcripts', safeGuid(guid) + '.txt'), 'stub transcript\n');
      return 0;
    },
  });
  assert(drained.transcribed === podGuids.length, 'drain transcribed every pending podcast');
  assert(transcribeCalls === podGuids.length, 'transcriber called once per item (no double-transcribe)');
  const qst2 = state.load(statePath(qroot));
  assert(podGuids.every((g) => qst2.items[g].status === 'transcribed'), 'drained items are transcribed');

  // FR-7 invariant: enqueue+drain never advance cursors and never render/summarize
  assert(JSON.stringify(qst2.cursors) === JSON.stringify(qst1.cursors), 'FR-7: cursors unchanged by enqueue+drain');
  assert(Object.values(qst2.items).every((it) => it.status !== 'rendered' && it.status !== 'summarized'),
    'FR-7: no item rendered/summarized by enqueue+drain');

  // exit-3 (no whisper) requeues and stops without failing
  const qroot3 = fs.mkdtempSync(path.join(os.tmpdir(), 'mag-queue3-'));
  fs.writeFileSync(path.join(qroot3, 'feeds.yaml'),
    'feeds:\n  - name: testpod\n    url: ' + fixture + '\n    type: podcast\n');
  cmdEnqueue({ root: qroot3 });
  const d3 = cmdDrain({ root: qroot3, max: 10, transcribeFn: () => 3 });
  assert(d3.transcribed === 0 && d3.failed === 0, 'exit-3 drain transcribes/fails nothing');
  const qst3 = state.load(statePath(qroot3));
  assert(Object.values(qst3.items).some((it) => it.enclosure && it.status === 'discovered'),
    'exit-3 requeues the item at discovered');

  fs.rmSync(qroot, { recursive: true, force: true });
  fs.rmSync(qroot3, { recursive: true, force: true });

  // --- T8: interactive prep foreground-drains a bounded number, queues the rest ---
  const proot = fs.mkdtempSync(path.join(os.tmpdir(), 'mag-prep-'));
  const pst = { cursors: {}, items: {} };
  // two podcasts (enclosure) + one article (link) all discovered
  state.discover(pst, 'p1', { feed: 'pod', enclosure: 'http://x/1.mp3', published: '2026-06-01' });
  state.discover(pst, 'p2', { feed: 'pod', enclosure: 'http://x/2.mp3', published: '2026-06-02' });
  state.save(statePath(proot), pst);
  let calls = 0;
  const prepRes = cmdPrep({
    root: proot, max: 1, // foreground cap = 1
    transcribeFn: (guid) => { calls++; fs.mkdirSync(path.join(proot, 'transcripts'), { recursive: true }); fs.writeFileSync(path.join(proot, 'transcripts', safeGuid(guid) + '.txt'), 'x'); return 0; },
  });
  assert(calls === 1, 'prep foreground-transcribes only up to the cap (1), got ' + calls);
  const pfin = state.load(statePath(proot));
  const transcribedN = Object.values(pfin.items).filter((it) => it.status === 'transcribed').length;
  const queuedN = Object.values(pfin.items).filter((it) => it.status === 'discovered' && it.enclosure).length;
  assert(transcribedN === 1 && queuedN === 1, 'prep leaves the over-cap podcast queued (discovered), got transcribed=' + transcribedN + ' queued=' + queuedN);
  assert(JSON.stringify(pfin.cursors) === '{}', 'FR-7: prep foreground drain does not advance cursors');
  fs.rmSync(proot, { recursive: true, force: true });

  console.log(ok ? 'magazine-run.js --selftest: PASS' : 'magazine-run.js --selftest: FAIL');
  process.exit(ok ? 0 : 1);
}

module.exports = { cmdDiscover, cmdPrep, cmdStatus, cmdEnqueue, cmdDrain, safeGuid, readFeeds, readFeedsTyped };

if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.includes('--selftest')) { selftest(); }
  else {
    const cmd = argv[0];
    const opts = parseOpts(argv.slice(1));
    if (cmd === 'discover') process.stdout.write(JSON.stringify(cmdDiscover(opts), null, 2) + '\n');
    else if (cmd === 'prep') process.stdout.write(JSON.stringify(cmdPrep(opts), null, 2) + '\n');
    else if (cmd === 'status') process.stdout.write(JSON.stringify(cmdStatus(opts), null, 2) + '\n');
    else if (cmd === 'enqueue') process.stdout.write(JSON.stringify(cmdEnqueue(opts), null, 2) + '\n');
    else if (cmd === 'drain') process.stdout.write(JSON.stringify(cmdDrain(opts), null, 2) + '\n');
    else {
      process.stderr.write('usage: magazine-run.js <discover|prep|status|enqueue|drain> [opts]  |  --selftest\n');
      process.exit(64);
    }
  }
}
