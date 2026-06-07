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

// Typed feeds reader: parse feeds.yaml's block list into {url, type, name,
// whisper_model}. readFeeds() above returns bare URLs (all the Stage-A crawl
// needs); the transcription queue needs to know which feeds are podcasts AND
// which whisper model each uses (FR-R2), so this richer reader tracks each
// `- ` list entry's name/url/type/whisper_model.
function readFeedsTyped(root) {
  const file = path.join(root, 'feeds.yaml');
  if (!fs.existsSync(file)) return [];
  const out = [];
  let cur = null;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (/^\s*-\s/.test(line)) { if (cur) out.push(cur); cur = { url: null, type: null, name: null, whisper_model: null }; }
    if (!cur) continue;
    let m;
    if ((m = line.match(/\bname:\s*(['"]?)([\w.-]+)\1/))) cur.name = m[2];
    if ((m = line.match(/\burl:\s*(['"]?)([^'"\s#]+)\1/))) cur.url = m[2];
    if ((m = line.match(/\btype:\s*(['"]?)(newsletter|podcast)\1/))) cur.type = m[2];
    // whisper_model may be a bare name (base/small/…) or a path (allow / . ~ : -).
    if ((m = line.match(/\bwhisper_model:\s*(['"]?)([^'"#\s]+)\1/))) cur.whisper_model = m[2];
  }
  if (cur) out.push(cur);
  return out.filter((f) => f.url);
}

// The {name, url} pairs the cursor-unification helpers need (FR-R4).
function feedKeyPairs(root) {
  return readFeedsTyped(root).map((f) => ({ name: f.name, url: f.url }));
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
  // Iterate feed OBJECTS so the ledger item's `feed` is the slug (name) — the
  // single canonical key shared with cursors + enqueue (FR-R4). Explicit --feed
  // URLs (selftest fixtures, ad-hoc single feed) have no slug, so they key by URL.
  const feedObjs = (opts.feeds && opts.feeds.length)
    ? opts.feeds.map((u) => ({ url: u, name: null }))
    : readFeedsTyped(root).map((f) => ({ url: f.url, name: f.name }));
  if (!feedObjs.length) {
    process.stderr.write('magazine-run discover: no feeds (pass --feed/--feeds or seed feeds.yaml)\n');
    return [];
  }
  const file = statePath(root);
  const st = state.load(file);
  // Migrate any legacy URL-keyed cursors to the slug key before we use them.
  if (state.remapCursors(st, feedKeyPairs(root))) state.save(file, st);
  const snapshot = [];
  let dupes = 0;
  for (const fo of feedObjs) {
    const feedKey = fo.name || fo.url;
    for (const it of fetchOne(fo.url, opts.since, opts.max)) {
      const meta = {
        feed: feedKey, link: it.link, title: it.title,
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

  // Route by feed TYPE, not enclosure presence (FR-R1). Every Substack newsletter
  // carries an audio enclosure (the post's podcast version), so routing on
  // `item.enclosure` mis-sends all newsletters to the (slow, wrong) transcription
  // queue and never crawls the article text that is right there in the post. An
  // enclosure is necessary but NOT sufficient — only `type:podcast` feeds queue.
  const typed = readFeedsTyped(root);
  const typeByKey = {};
  for (const f of typed) { if (f.name) typeByKey[f.name] = f.type; if (f.url) typeByKey[f.url] = f.type; }
  const hasNewsletterFeed = typed.some((f) => f.type === 'newsletter');
  const route = { crawled: 0, queued: 0, unknownFeed: 0, newsletterQueued: 0, discovered: 0 };

  const results = [];
  for (const guid of Object.keys(st.items)) {
    const item = st.items[guid];
    if (item.status !== 'discovered') continue; // resumable: skip already-prepped
    const r = { guid, crawl: null, transcribe: null };
    route.discovered++;
    const ftype = typeByKey[item.feed];
    if (ftype === undefined) route.unknownFeed++;

    // Podcasts are transcribed through the shared queue (foreground drain below),
    // not inline here — their content is the transcript, and routing them through
    // the queue means an installed background worker and this session never
    // double-transcribe the same episode. Leave them at `discovered` (queued).
    // A feed of unknown type with an enclosure but no link is also queued (the
    // only content it has is audio); everything else with a link is crawled.
    const queue = item.enclosure && (ftype === 'podcast' || (ftype === undefined && !item.link));
    if (queue) {
      r.transcribe = 'queued';
      route.queued++;
      if (ftype === 'newsletter') route.newsletterQueued++;
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
      route.crawled++;
    }

    state.transition(st, guid, r.crawl === 'failed' ? 'failed' : 'downloaded',
      r.crawl === 'failed' ? 'crawl-failed' : undefined);
    results.push(r);
  }

  // Self-check (FR-R1): a declared-newsletter feed should never land in the
  // transcribe queue, and a routing pass that sends a majority to transcription
  // while newsletter feeds exist is a misconfiguration signal — surface it loudly
  // instead of silently transcribing what should have been crawled.
  if (route.newsletterQueued > 0) {
    process.stderr.write('magazine-run prep: WARNING ' + route.newsletterQueued +
      ' newsletter item(s) were queued for transcription — check feed `type` in feeds.yaml\n');
  }
  if (hasNewsletterFeed && route.discovered > 0 && route.queued > route.discovered / 2) {
    process.stderr.write('magazine-run prep: WARNING ' + route.queued + '/' + route.discovered +
      ' discovered items routed to transcription despite newsletter feeds present — likely a feed-type misconfiguration\n');
  }
  if (route.unknownFeed > 0) {
    process.stderr.write('magazine-run prep: note ' + route.unknownFeed +
      ' item(s) from feeds absent from feeds.yaml (defaulted to crawl)\n');
  }
  results.push({ route });
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
const MAX_TRANSCRIBE_ATTEMPTS = 3;      // give up (-> failed) after this many failed tries

// Producer: discover type:podcast feeds forward (per-feed cursor), recording new
// episodes at `discovered`. --backfill <days> overrides the cursor to pull
// history. Idempotent (discover dedups on GUID). Never advances cursors/renders.
function cmdEnqueue(opts) {
  const root = opts.root || defaultRoot();
  const file = statePath(root);
  const st = state.load(file);
  if (state.remapCursors(st, feedKeyPairs(root))) state.save(file, st); // FR-R4 slug unification
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
  const logPath = path.join(root, 'watch.log');
  const max = opts.max || DEFAULT_DRAIN_MAX;
  const budgetMs = opts.budgetSec ? opts.budgetSec * 1000 : 0;

  // Per-feed whisper model map (FR-R2). The drain MUST pass a resolved model to
  // transcribe.sh — passing none made it fall back to the name "base", which a
  // whisper.cpp user's model dir often does not contain, so transcribe exited 3
  // and the item was requeued with `transcribed:0` and no error surfaced. Keyed
  // by both name and url so it works whichever the ledger item.feed carries.
  const modelByFeed = {};
  for (const f of readFeedsTyped(root)) {
    const m = f.whisper_model || 'base';
    if (f.name) modelByFeed[f.name] = m;
    if (f.url) modelByFeed[f.url] = m;
  }
  const appendLog = (line) => { try { fs.appendFileSync(logPath, line + '\n'); } catch (_e) { /* best-effort */ } };

  // Default transcriber threads `--model` and, on a non-zero exit, logs the exit
  // code + stderr tail to watch.log instead of silently requeuing (FR-R2). Tests
  // inject their own fn (returning a number, 2 args); the extra `model` arg is ignored.
  const transcribe = opts.transcribeFn || ((guid, enclosure, model) => {
    try {
      execFileSync('bash', [TRANSCRIBE, enclosure, guid, '--model', model || 'base', '--out-dir', transcriptsDir],
        { stdio: ['ignore', 'inherit', 'pipe'] });
      return 0;
    } catch (e) {
      const code = e.status || 1;
      // exit 3 (no whisper / unresolved model) is logged once by cmdDrain's exit-3
      // branch below — don't double-log it here. Log every OTHER non-zero exit with
      // its stderr tail so a real transcribe failure is never silently requeued.
      if (code !== 3) {
        const errTail = (e.stderr ? e.stderr.toString() : '').trim().split('\n').slice(-3).join(' | ');
        appendLog(new Date().toISOString() + ' transcribe ' + guid + ' exit=' + code +
          (errTail ? ' stderr=' + errTail : ''));
      }
      return code;
    }
  });

  const start = Date.now();
  const counts = { drained: 0, transcribed: 0, failed: 0, skippedClaimed: 0, reclaimed: 0 };

  counts.reclaimed = lock.withLock(lockPath, () => {
    const st = state.load(file);
    const n = state.reclaimStale(st, Date.now(), STALE_TTL_MS, lock.isAlive);
    if (n) state.save(file, st);
    return n;
  });

  // Track GUIDs handled this run so a failing episode (released back to
  // `discovered` for a future tick) is never re-picked within the SAME run —
  // otherwise one dead enclosure would burn the whole --max budget on itself.
  const attempted = new Set();
  for (let i = 0; i < max; i++) {
    if (budgetMs && Date.now() - start > budgetMs) break;

    const job = lock.withLock(lockPath, () => {
      const st = state.load(file);
      const cand = state.pendingPodcasts(st, { limit: max + attempted.size + 1 })
        .find((p) => !attempted.has(p.guid));
      if (!cand) return null;
      if (state.claim(st, cand.guid, process.pid, new Date().toISOString())) {
        state.save(file, st);
        return { guid: cand.guid, enclosure: cand.enclosure, feed: cand.feed };
      }
      attempted.add(cand.guid); // lost the claim race — don't spin on it
      counts.skippedClaimed++;
      return 'skip';
    });
    if (job === null) break;        // nothing left to claim
    if (job === 'skip') continue;   // claimed elsewhere; try the next candidate

    attempted.add(job.guid);
    const exit = transcribe(job.guid, job.enclosure, modelByFeed[job.feed] || 'base');

    lock.withLock(lockPath, () => {
      const st = state.load(file);
      if (exit === 0) {
        state.release(st, job.guid, 'transcribed');
        counts.transcribed++;
      } else if (exit === 3) {
        // No whisper OR no resolvable model — requeue untouched, but log it so the
        // worker no longer fails silently forever (FR-R2). The next interactive run
        // surfaces the show-notes fallback honestly.
        state.release(st, job.guid, 'discovered');
        appendLog(new Date().toISOString() + ' transcribe ' + job.guid +
          ' exit=3 (no whisper or unresolved model — check PATH + whisper_model)');
      } else {
        // Retryable miss: requeue, but cap retries so a permanently-dead enclosure
        // eventually leaves the queue as `failed` instead of retrying every tick.
        const it = st.items[job.guid];
        const n = (it && it.attempts ? it.attempts : 0) + 1;
        if (n >= MAX_TRANSCRIBE_ATTEMPTS) {
          state.release(st, job.guid, 'failed', 'transcribe failed after ' + n + ' attempts');
        } else {
          state.release(st, job.guid, 'discovered');
          st.items[job.guid].attempts = n; // persists across ticks (release keeps it)
        }
        counts.failed++;
      }
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
  // Surface orphaned cursors (keys matching no current feed) so a stale ledger is
  // not silently mistaken for a clean first run (FR-R5).
  const orphans = state.orphanCursors(st, feedKeyPairs(root));
  if (orphans.length) {
    process.stderr.write('magazine-run status: WARNING ' + orphans.length +
      ' orphaned cursor(s) match no current feed: ' + orphans.join(', ') +
      ' (renamed/removed feeds reset the since-anchor)\n');
  }
  return { root, total: Object.keys(st.items).length, counts, cursors: st.cursors, orphanCursors: orphans };
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

  // A persistently failing episode (exit 1) is attempted ONCE per run (not
  // re-picked within the same tick), and gives up to `failed` after MAX attempts.
  const rroot = fs.mkdtempSync(path.join(os.tmpdir(), 'mag-retry-'));
  const rst = { cursors: {}, items: {} };
  state.discover(rst, 'rp1', { feed: 'pod', enclosure: 'http://x/dead.mp3', published: '2026-06-01' });
  state.save(statePath(rroot), rst);
  const failFn = () => 1;
  const r1 = cmdDrain({ root: rroot, max: 5, transcribeFn: failFn });
  assert(r1.drained === 1 && r1.failed === 1, 'failing episode attempted once per run (not re-picked), got drained=' + r1.drained);
  let rcur = state.load(statePath(rroot));
  assert(rcur.items.rp1.status === 'discovered' && rcur.items.rp1.attempts === 1, 'after 1 fail: requeued with attempts=1');
  cmdDrain({ root: rroot, max: 5, transcribeFn: failFn }); // attempts -> 2
  cmdDrain({ root: rroot, max: 5, transcribeFn: failFn }); // attempts -> 3 => failed
  rcur = state.load(statePath(rroot));
  assert(rcur.items.rp1.status === 'failed', 'after MAX attempts the episode leaves the queue as failed');
  fs.rmSync(rroot, { recursive: true, force: true });

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

  // --- FR-R1: prep routes by feed TYPE, not enclosure ---
  const r1root = fs.mkdtempSync(path.join(os.tmpdir(), 'mag-route-'));
  fs.writeFileSync(path.join(r1root, 'feeds.yaml'),
    'feeds:\n' +
    '  - name: news\n    url: http://x/news\n    type: newsletter\n' +
    '  - name: pod\n    url: http://x/pod\n    type: podcast\n');
  const r1st = { cursors: {}, items: {} };
  // a newsletter item WITH an audio enclosure (the Substack case) but no link
  state.discover(r1st, 'n1', { feed: 'news', enclosure: 'http://x/post.mp3', published: '2026-06-01' });
  // a real podcast episode
  state.discover(r1st, 'pq1', { feed: 'pod', enclosure: 'http://x/ep.mp3', published: '2026-06-01' });
  state.save(statePath(r1root), r1st);
  const r1res = cmdPrep({ root: r1root, max: 5,
    transcribeFn: (g) => { fs.mkdirSync(path.join(r1root, 'transcripts'), { recursive: true }); fs.writeFileSync(path.join(r1root, 'transcripts', safeGuid(g) + '.txt'), 'x'); return 0; } });
  const r1fin = state.load(statePath(r1root));
  assert(r1fin.items.n1.status !== 'discovered' && r1fin.items.n1.status !== 'transcribed',
    'FR-R1: a newsletter-with-enclosure is routed to crawl, not the transcribe queue (status=' + r1fin.items.n1.status + ')');
  assert(r1fin.items.pq1.status === 'transcribed', 'FR-R1: a podcast item is queued + transcribed');
  const r1route = (r1res.find((x) => x && x.route) || {}).route || {};
  assert(r1route.newsletterQueued === 0, 'FR-R1: zero newsletter items queued for transcription');
  fs.rmSync(r1root, { recursive: true, force: true });

  // --- FR-R2: drain threads the per-feed whisper_model into --model + logs exit-3 ---
  const r2root = fs.mkdtempSync(path.join(os.tmpdir(), 'mag-model-'));
  fs.writeFileSync(path.join(r2root, 'feeds.yaml'),
    'feeds:\n  - name: pod\n    url: ' + fixture + '\n    type: podcast\n    whisper_model: small\n');
  const r2st = { cursors: {}, items: {} };
  state.discover(r2st, 'm1', { feed: 'pod', enclosure: 'http://x/a.mp3', published: '2026-06-01' });
  state.save(statePath(r2root), r2st);
  let seenModel = null;
  cmdDrain({ root: r2root, max: 5, transcribeFn: (g, e, m) => { seenModel = m; fs.mkdirSync(path.join(r2root, 'transcripts'), { recursive: true }); fs.writeFileSync(path.join(r2root, 'transcripts', safeGuid(g) + '.txt'), 'x'); return 0; } });
  assert(seenModel === 'small', 'FR-R2: drain threads the per-feed whisper_model (got ' + seenModel + ')');
  // exit-3 is logged to watch.log (no longer a silent requeue)
  const r2st2 = { cursors: {}, items: {} };
  state.discover(r2st2, 'm2', { feed: 'pod', enclosure: 'http://x/b.mp3', published: '2026-06-02' });
  state.save(statePath(r2root), r2st2);
  cmdDrain({ root: r2root, max: 5, transcribeFn: () => 3 });
  const r2log = fs.existsSync(path.join(r2root, 'watch.log')) ? fs.readFileSync(path.join(r2root, 'watch.log'), 'utf8') : '';
  assert(/exit=3/.test(r2log), 'FR-R2: an exit-3 drain logs to watch.log instead of silently requeuing');
  fs.rmSync(r2root, { recursive: true, force: true });

  // --- FR-R4: enqueue respects a slug-keyed cursor + remaps a legacy URL cursor ---
  const r4root = fs.mkdtempSync(path.join(os.tmpdir(), 'mag-cursor-'));
  fs.writeFileSync(path.join(r4root, 'feeds.yaml'),
    'feeds:\n  - name: testpod\n    url: ' + fixture + '\n    type: podcast\n');
  state.save(statePath(r4root), { cursors: { testpod: '2999-01-01T00:00:00.000Z' }, items: {} });
  assert(cmdEnqueue({ root: r4root }).enqueued === 0, 'FR-R4: enqueue respects a slug-keyed cursor (forward-only, no backfill)');
  // a legacy URL-keyed cursor is remapped to the slug and respected
  state.save(statePath(r4root), { cursors: { [fixture]: '2999-01-01T00:00:00.000Z' }, items: {} });
  assert(cmdEnqueue({ root: r4root }).enqueued === 0, 'FR-R4: a legacy URL-keyed cursor is remapped + respected (no backfill)');
  const r4fin = state.load(statePath(r4root));
  assert(r4fin.cursors.testpod && r4fin.cursors[fixture] === undefined, 'FR-R4: legacy URL cursor remapped to the slug key');
  fs.rmSync(r4root, { recursive: true, force: true });

  // --- FR-R4: discover keys ledger items by slug (not URL) ---
  const r4droot = fs.mkdtempSync(path.join(os.tmpdir(), 'mag-discover-slug-'));
  fs.writeFileSync(path.join(r4droot, 'feeds.yaml'),
    'feeds:\n  - name: fixturepod\n    url: ' + fixture + '\n    type: podcast\n');
  cmdDiscover({ root: r4droot });
  const r4dfin = state.load(statePath(r4droot));
  assert(Object.values(r4dfin.items).every((it) => it.feed === 'fixturepod'),
    'FR-R4: discover stores the feed slug as item.feed (not the URL)');
  fs.rmSync(r4droot, { recursive: true, force: true });

  // --- FR-R5: status reports orphan cursors ---
  const r5root = fs.mkdtempSync(path.join(os.tmpdir(), 'mag-orphan-'));
  fs.writeFileSync(path.join(r5root, 'feeds.yaml'),
    'feeds:\n  - name: current\n    url: http://x/cur\n    type: podcast\n');
  state.save(statePath(r5root), { cursors: { current: '2026-06-01', 'old-slug': '2026-05-01' }, items: {} });
  const r5stat = cmdStatus({ root: r5root });
  assert(Array.isArray(r5stat.orphanCursors) && r5stat.orphanCursors.length === 1 && r5stat.orphanCursors[0] === 'old-slug',
    'FR-R5: status flags an orphaned cursor');
  fs.rmSync(r5root, { recursive: true, force: true });

  console.log(ok ? 'magazine-run.js --selftest: PASS' : 'magazine-run.js --selftest: FAIL');
  process.exit(ok ? 0 : 1);
}

module.exports = { cmdDiscover, cmdPrep, cmdStatus, cmdEnqueue, cmdDrain, safeGuid, readFeeds, readFeedsTyped, feedKeyPairs };

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
