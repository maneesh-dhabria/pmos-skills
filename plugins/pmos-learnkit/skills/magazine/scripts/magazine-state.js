#!/usr/bin/env node
// magazine-state.js — the per-item lifecycle ledger for /magazine.
// Zero npm dependencies (node built-ins only). Requires: node >= 18.
//
// state.json lives at ~/.pmos/magazine/state.json and is the resume + dedup
// ledger. Writes are atomic (temp file + rename) so an interrupted write never
// corrupts the ledger.
//
// Lifecycle (per item, keyed by GUID):
//   discovered -> downloaded -> transcribed -> summarized -> rendered
//   any -> failed (carries failed_reason)
//   discovered -> duplicate (cross-feed link dup; carries duplicate_of)
//
// Cross-feed dedup (FR-Q2): the same article syndicated across two feeds
// (e.g. a newsletter that re-publishes a podcast episode) arrives under two
// different GUIDs, which GUID-keyed dedup cannot catch. discover() also keys a
// canonicalized link index, so the second sighting is recorded as `duplicate`
// (catalogued, not dropped — it carries `duplicate_of`) and excluded from the
// issue snapshot instead of forcing the agent to hand-dedupe every run.
//
// Cursor rule: per-feed cursors advance ONLY when an issue fully completes
// (advanceCursors), so an interrupt + resume never drops or double-counts.
//
// CLI:
//   node magazine-state.js --selftest         # round-trips a temp ledger, exits 0/1
//   node magazine-state.js --path <file> show # print the ledger
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const STATES = ['discovered', 'downloaded', 'transcribed', 'summarized', 'rendered', 'failed', 'duplicate'];

// Query params that identify a campaign/referrer, not the content. Stripped
// before keying the dedup index so the same article tagged with two different
// feed-specific tracking strings still collapses to one canonical key.
const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm',
  'ref', 'ref_src', 'mc_cid', 'mc_eid', 'fbclid', 'gclid', 'source', 'spm',
]);

function defaultPath() {
  return path.join(os.homedir(), '.pmos', 'magazine', 'state.json');
}

// Reduce a URL to a stable dedup key: drop scheme + leading `www.`, lowercase
// host, strip the fragment and tracking params, sort the survivors, and trim a
// trailing slash. Two feeds linking the same article under different tracking
// strings (or http/https, or a trailing slash) produce the same key. Returns
// null for an empty/garbage link so it never collapses distinct items.
function canonicalLink(url) {
  if (!url) return null;
  let u;
  try {
    u = new URL(String(url));
  } catch (_e) {
    const t = String(url).trim().toLowerCase().replace(/\/+$/, '');
    return t || null;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, '') + (u.port ? ':' + u.port : '');
  const kept = [];
  for (const [k, v] of u.searchParams) {
    if (!TRACKING_PARAMS.has(k.toLowerCase())) kept.push([k, v]);
  }
  kept.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  const qs = kept.map(([k, v]) => (v === '' ? k : k + '=' + v)).join('&');
  let p = u.pathname.replace(/\/+$/, '');
  if (p === '') p = '/';
  return host + p + (qs ? '?' + qs : '');
}

function load(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_e) {
    return { cursors: {}, items: {} };
  }
}

// Atomic write: temp file in the same dir, then rename(2).
function save(file, state) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, file);
}

// Record a newly discovered item; idempotent — re-discovering an existing GUID
// is a no-op (GUID dedup), so a re-run never resurrects an already-rendered
// item. A *different* GUID whose link canonicalizes to one already in the
// ledger is a cross-feed duplicate (FR-Q2): it is still recorded (catalogued,
// not dropped) but marked `status: 'duplicate'` with `duplicate_of` set to the
// first GUID, and returns false so callers leave it out of the issue snapshot.
function discover(state, guid, meta) {
  if (!state.links) state.links = {};
  if (state.items[guid]) return false; // GUID dedup (idempotent re-discover)

  const canon = canonicalLink(meta && meta.link);
  const firstGuid = canon ? state.links[canon] : null;
  if (firstGuid && firstGuid !== guid) {
    state.items[guid] = Object.assign({ status: 'duplicate', duplicate_of: firstGuid }, meta);
    return false; // cross-feed link dup — recorded but not a fresh active item
  }

  state.items[guid] = Object.assign({ status: 'discovered' }, meta);
  if (canon && !state.links[canon]) state.links[canon] = guid;
  return true;
}

function transition(state, guid, status, failedReason) {
  if (!STATES.includes(status)) throw new Error('unknown status: ' + status);
  const item = state.items[guid];
  if (!item) throw new Error('unknown guid: ' + guid);
  item.status = status;
  if (status === 'failed') item.failed_reason = failedReason || 'unknown';
  else delete item.failed_reason;
  return item;
}

// Advance each feed cursor to the newest published date among that feed's
// rendered items. Call ONLY on full issue completion.
function advanceCursors(state) {
  for (const guid of Object.keys(state.items)) {
    const it = state.items[guid];
    if (it.status !== 'rendered' || !it.feed || !it.published) continue;
    const cur = state.cursors[it.feed];
    if (!cur || it.published > cur) state.cursors[it.feed] = it.published;
  }
  return state.cursors;
}

function selftest() {
  const tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'mag-state-'));
  const file = path.join(tmpdir, 'state.json');
  let ok = true;
  const assert = (cond, msg) => { if (!cond) { ok = false; console.error('FAIL:', msg); } };

  let st = load(file); // missing file -> empty ledger
  assert(JSON.stringify(st) === '{"cursors":{},"items":{}}', 'empty ledger on missing file');

  assert(discover(st, 'g1', { feed: 'f', link: 'u', published: '2026-06-01' }) === true, 'first discover true');
  assert(discover(st, 'g1', { feed: 'f' }) === false, 'duplicate discover false (dedup)');

  transition(st, 'g1', 'rendered');
  assert(st.items.g1.status === 'rendered', 'transition to rendered');

  transition(st, 'g1', 'failed', 'paywall');
  assert(st.items.g1.failed_reason === 'paywall', 'failed carries reason');
  transition(st, 'g1', 'rendered');
  assert(st.items.g1.failed_reason === undefined, 'failed_reason cleared on recovery');

  discover(st, 'g2', { feed: 'f', published: '2026-06-05', status: 'discovered' });
  transition(st, 'g2', 'rendered');
  advanceCursors(st);
  assert(st.cursors.f === '2026-06-05', 'cursor advances to newest rendered');

  // FR-Q2: cross-feed link canonicalization + dedup.
  assert(canonicalLink('https://WWW.Example.com/ep/?id=42&utm_source=x#frag')
    === canonicalLink('http://example.com/ep?id=42'),
    'canonical key ignores www/scheme/utm/slash/fragment');
  assert(canonicalLink(null) === null && canonicalLink('') === null, 'empty link -> null key (never collapses)');
  const st2 = load(path.join(tmpdir, 'nope.json')); // fresh empty ledger
  assert(discover(st2, 'podA', { feed: 'pod', link: 'https://example.com/ep?id=42&utm=rss', published: '2026-06-01' }) === true,
    'first sighting of the article is active');
  assert(discover(st2, 'newsB', { feed: 'news', link: 'https://example.com/ep?id=42&ref=lenny', published: '2026-06-01' }) === false,
    'cross-feed re-publish (different GUID, same canonical link) returns false');
  assert(st2.items.newsB.status === 'duplicate', 'cross-feed dup recorded as duplicate (catalogued, not dropped)');
  assert(st2.items.newsB.duplicate_of === 'podA', 'duplicate_of points at the first GUID');
  assert(st2.items.podA.status === 'discovered', 'the original sighting stays active');

  save(file, st);
  const reloaded = load(file);
  assert(reloaded.cursors.f === '2026-06-05', 'atomic save round-trips');
  assert(fs.existsSync(file) && !fs.existsSync(file + '.tmp'), 'no orphan .tmp after save');

  let threw = false;
  try { transition(st, 'g1', 'bogus'); } catch (_e) { threw = true; }
  assert(threw, 'unknown status throws');

  fs.rmSync(tmpdir, { recursive: true, force: true });
  console.log(ok ? 'magazine-state.js --selftest: PASS' : 'magazine-state.js --selftest: FAIL');
  process.exit(ok ? 0 : 1);
}

module.exports = { STATES, defaultPath, canonicalLink, load, save, discover, transition, advanceCursors };

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) { selftest(); }
  else if (args[0] === '--path' && args[2] === 'show') {
    console.log(JSON.stringify(load(args[1]), null, 2));
  } else {
    console.log('usage: magazine-state.js --selftest | --path <file> show');
  }
}
