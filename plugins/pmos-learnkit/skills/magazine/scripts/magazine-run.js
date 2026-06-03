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
  for (const feed of feeds) {
    for (const it of fetchOne(feed, opts.since, opts.max)) {
      const meta = {
        feed, link: it.link, title: it.title,
        published: it.published, enclosure: it.enclosure,
      };
      state.discover(st, it.guid, meta); // idempotent dedup
      snapshot.push(Object.assign({ guid: it.guid }, meta));
    }
  }
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

    // Transcribe podcasts (best-effort; exit 3 = no whisper/model -> show-notes).
    if (item.enclosure) {
      try {
        execFileSync('bash', [TRANSCRIBE, item.enclosure, guid, '--out-dir', path.join(root, 'transcripts')],
          { stdio: ['ignore', 'inherit', 'inherit'] });
        r.transcribe = 'ok';
      } catch (e) {
        r.transcribe = e.status === 3 ? 'no-whisper' : 'failed';
      }
    }

    state.transition(st, guid, r.crawl === 'failed' && !item.enclosure ? 'failed' : 'downloaded',
      r.crawl === 'failed' ? 'crawl-failed' : undefined);
    results.push(r);
  }
  state.save(file, st);
  return results;
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
  const opts = { feeds: [], since: null, max: 0, root: null, minChars: 0 };
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

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(ok ? 'magazine-run.js --selftest: PASS' : 'magazine-run.js --selftest: FAIL');
  process.exit(ok ? 0 : 1);
}

module.exports = { cmdDiscover, cmdPrep, cmdStatus, safeGuid, readFeeds };

if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.includes('--selftest')) { selftest(); }
  else {
    const cmd = argv[0];
    const opts = parseOpts(argv.slice(1));
    if (cmd === 'discover') process.stdout.write(JSON.stringify(cmdDiscover(opts), null, 2) + '\n');
    else if (cmd === 'prep') process.stdout.write(JSON.stringify(cmdPrep(opts), null, 2) + '\n');
    else if (cmd === 'status') process.stdout.write(JSON.stringify(cmdStatus(opts), null, 2) + '\n');
    else {
      process.stderr.write('usage: magazine-run.js <discover|prep|status> [opts]  |  --selftest\n');
      process.exit(64);
    }
  }
}
