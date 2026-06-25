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
//   discovered -> transcribing{by,at} -> transcribed   (the queue: claim/release)
//   any -> failed (carries failed_reason)
//   discovered -> duplicate (cross-feed link dup; carries duplicate_of)
//
// Transcription queue (background worker + interactive foreground share it):
// podcast items at `discovered` with an enclosure are the pending queue. A
// consumer atomically claim()s one (discovered -> transcribing{by,at}) under the
// magazine-lock, transcribes it OUTSIDE the lock, then release()s it to
// `transcribed` (success) / `failed` / back to `discovered` (retryable). A claim
// whose owner died or went stale is reclaimStale()d so episodes are never
// stranded. These ops are PURE (no lock inside) — the caller holds the lock.
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

const STATES = ['discovered', 'downloaded', 'transcribing', 'transcribed', 'summarized', 'rendered', 'failed', 'duplicate'];

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

// Feed key unification (FR-R4/FR-R5). The cursor key + the ledger item's `feed`
// must be ONE thing. The canonical key is the feed slug (`name`), matching the
// documented config-schema and the card source-badge. Older ledgers wrote
// cursors under the feed URL (the pre-fix interactive discover path); remap them
// to the slug so a unified-key run does not lose the "since last run" anchor and
// silently re-pull history. `feeds` is [{name, url}, ...]. Returns the count moved.
function remapCursors(state, feeds) {
  if (!state.cursors) state.cursors = {};
  let moved = 0;
  for (const f of feeds || []) {
    if (!f || !f.name || !f.url || f.name === f.url) continue;
    if (Object.prototype.hasOwnProperty.call(state.cursors, f.url)) {
      const v = state.cursors[f.url];
      const cur = state.cursors[f.name];
      if (cur === undefined || String(v) > String(cur)) state.cursors[f.name] = v;
      delete state.cursors[f.url];
      moved++;
    }
  }
  return moved;
}

// Cursor keys that match no current feed name OR url — orphans left behind by a
// renamed/removed feed. Surfaced by `status` so a stale ledger is not mistaken
// for a clean first run (FR-R5).
function orphanCursors(state, feeds) {
  const valid = new Set();
  for (const f of feeds || []) { if (f && f.name) valid.add(f.name); if (f && f.url) valid.add(f.url); }
  return Object.keys((state && state.cursors) || {}).filter((k) => !valid.has(k));
}

// --- Feed-health tracking (FR-5.1 / D3 — suggest-only quarantine) ---

// Count CONSECUTIVE runs a feed's fetch failed. `ok` resets the counter to 0;
// a failure increments it. "Consecutive runs" is the unit even when runs are
// days apart (the counter lives in the ledger, not wall-clock). The map is
// additive — an absent `feedHealth` or absent slug reads as 0. This NEVER
// disables a feed; `feedsToSuggest` only surfaces a suggestion (no silent drop).
function recordFeedResult(state, slug, ok) {
  if (!state.feedHealth) state.feedHealth = {};
  if (!slug) return state.feedHealth;
  const h = state.feedHealth[slug] || { consecFails: 0 };
  h.consecFails = ok ? 0 : (h.consecFails || 0) + 1;
  state.feedHealth[slug] = h;
  return h;
}

// The slugs whose consecutive-failure count is at/above `threshold` — the feeds
// a run should suggest quarantining. Tolerates a missing/empty feedHealth map.
function feedsToSuggest(state, threshold) {
  const fh = (state && state.feedHealth) || {};
  return Object.keys(fh).filter((s) => ((fh[s] && fh[s].consecFails) || 0) >= threshold);
}

// --- Transcription queue ops (PURE — caller wraps these in magazine-lock) ---

// The pending queue: podcast items (have an enclosure) still at `discovered`,
// oldest-published first, capped at limit. Items already `transcribing`/
// `transcribed` are excluded, so the read is the set of episodes that still need
// a consumer.
function pendingPodcasts(state, opts) {
  const limit = (opts && opts.limit) || Infinity;
  const items = Object.keys(state.items)
    .map((guid) => ({ guid, it: state.items[guid] }))
    .filter(({ it }) => it.status === 'discovered' && it.enclosure)
    .sort((a, b) => String(a.it.published || '').localeCompare(String(b.it.published || '')));
  return items.slice(0, limit).map(({ guid, it }) => Object.assign({ guid }, it));
}

// Atomically (at the ledger level) claim a discovered item for transcription.
// Returns true if it moved discovered -> transcribing{by,at}; false if it was
// not claimable (already transcribing/transcribed/failed/duplicate, or absent).
// The CALLER must hold the lock so two consumers cannot both observe `discovered`.
function claim(state, guid, by, nowIso) {
  const item = state.items[guid];
  if (!item || item.status !== 'discovered') return false;
  item.status = 'transcribing';
  item.claim = { by, at: nowIso || new Date().toISOString() };
  return item;
}

// Release a claimed item to a terminal/retryable status. `transcribed` on
// success; `failed` (carries reason) for a hard miss; `discovered` to requeue a
// retryable miss (e.g. no whisper this pass). Clears the claim record.
function release(state, guid, status, reason) {
  const item = state.items[guid];
  if (!item) throw new Error('unknown guid: ' + guid);
  if (!STATES.includes(status)) throw new Error('unknown status: ' + status);
  item.status = status;
  delete item.claim;
  if (status === 'failed') item.failed_reason = reason || 'unknown';
  else delete item.failed_reason;
  return item;
}

// Revert claims whose owner is dead (isAlive(pid) === false) or whose `at` is
// older than ttlMs back to `discovered`, so a crashed consumer never strands an
// episode. Returns the number reclaimed. `isAlive` is injected for testability.
function reclaimStale(state, nowMs, ttlMs, isAlive) {
  let reclaimed = 0;
  for (const guid of Object.keys(state.items)) {
    const it = state.items[guid];
    if (it.status !== 'transcribing') continue;
    const claimAt = it.claim && it.claim.at ? Date.parse(it.claim.at) : 0;
    const dead = !it.claim || typeof isAlive !== 'function' || !isAlive(it.claim.by);
    const expired = !claimAt || (nowMs - claimAt > ttlMs);
    if (dead || expired) {
      it.status = 'discovered';
      delete it.claim;
      reclaimed++;
    }
  }
  return reclaimed;
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

  // --- Transcription queue ops ---
  const q = { cursors: {}, items: {} };
  discover(q, 'pod1', { feed: 'p', enclosure: 'http://x/a.mp3', published: '2026-06-02' });
  discover(q, 'pod2', { feed: 'p', enclosure: 'http://x/b.mp3', published: '2026-06-01' });
  discover(q, 'art1', { feed: 'n', link: 'http://x/post', published: '2026-06-03' }); // no enclosure

  const pend = pendingPodcasts(q, { limit: 10 });
  assert(pend.length === 2, 'pendingPodcasts returns only enclosure items, got ' + pend.length);
  assert(pend[0].guid === 'pod2', 'pendingPodcasts is oldest-published first');
  assert(pendingPodcasts(q, { limit: 1 }).length === 1, 'pendingPodcasts respects limit');

  assert(claim(q, 'pod1', 1234, '2026-06-07T00:00:00Z') && q.items.pod1.status === 'transcribing',
    'claim moves discovered -> transcribing');
  assert(q.items.pod1.claim.by === 1234, 'claim records owner pid');
  assert(claim(q, 'pod1', 5678) === false, 'second claim of a transcribing item is false');
  assert(claim(q, 'art1', 1) && q.items.art1.status === 'transcribing', 'claim works on any discovered item');
  release(q, 'art1', 'discovered'); // put the article back; not part of the podcast queue test

  release(q, 'pod1', 'transcribed');
  assert(q.items.pod1.status === 'transcribed' && q.items.pod1.claim === undefined,
    'release -> transcribed clears claim');
  assert(pendingPodcasts(q, {}).map((p) => p.guid).join() === 'pod2',
    'transcribed item leaves the pending queue');

  // reclaimStale: dead PID reclaimed; live fresh claim left intact
  claim(q, 'pod2', 4000000, new Date().toISOString()); // dead pid
  const aliveOf = (pid) => pid === process.pid;
  let n = reclaimStale(q, Date.now(), 60 * 60 * 1000, aliveOf);
  assert(n === 1 && q.items.pod2.status === 'discovered', 'reclaimStale reverts dead-PID claim');

  claim(q, 'pod2', process.pid, new Date().toISOString()); // live, fresh
  n = reclaimStale(q, Date.now(), 60 * 60 * 1000, aliveOf);
  assert(n === 0 && q.items.pod2.status === 'transcribing', 'reclaimStale leaves a live fresh claim');

  // reclaimStale: expired timestamp reclaimed even if PID alive
  q.items.pod2.claim.at = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  n = reclaimStale(q, Date.now(), 60 * 60 * 1000, aliveOf);
  assert(n === 1 && q.items.pod2.status === 'discovered', 'reclaimStale reverts expired claim');

  assert(STATES.includes('transcribing'), 'transcribing is a known state');

  // --- FR-R4/FR-R5: cursor key unification (remap) + orphan detection ---
  const feedsMeta = [{ name: 'acquired', url: 'https://feeds.transistor.fm/acquired' }];
  // a legacy URL-keyed cursor remaps to the slug
  const ck = { cursors: { 'https://feeds.transistor.fm/acquired': '2026-06-01' }, items: {} };
  assert(remapCursors(ck, feedsMeta) === 1, 'remapCursors moves a URL-keyed cursor');
  assert(ck.cursors.acquired === '2026-06-01' && ck.cursors['https://feeds.transistor.fm/acquired'] === undefined,
    'remapCursors: value now under the slug, URL key removed');
  // re-run is idempotent (nothing left to move)
  assert(remapCursors(ck, feedsMeta) === 0, 'remapCursors is idempotent');
  // when both keys exist, the newer value wins
  const ck2 = { cursors: { acquired: '2026-05-01', 'https://feeds.transistor.fm/acquired': '2026-06-09' }, items: {} };
  remapCursors(ck2, feedsMeta);
  assert(ck2.cursors.acquired === '2026-06-09', 'remapCursors keeps the newer value when both keys exist');
  // orphan detection: a cursor under a slug no current feed has
  const ck3 = { cursors: { acquired: '2026-06-01', 'old-renamed-feed': '2026-05-01' }, items: {} };
  const orph = orphanCursors(ck3, feedsMeta);
  assert(orph.length === 1 && orph[0] === 'old-renamed-feed', 'orphanCursors flags a key matching no current feed');
  assert(orphanCursors({ cursors: { acquired: '2026-06-01' } }, feedsMeta).length === 0, 'orphanCursors: a valid slug is not an orphan');

  // --- FR-5.1/D3: feed-health tracking (suggest-only quarantine) ---
  const fh = { cursors: {}, items: {} };
  assert(feedsToSuggest(fh, 3).length === 0, 'feedsToSuggest tolerates an absent feedHealth map (empty)');
  recordFeedResult(fh, 'svpg', false);
  assert(fh.feedHealth.svpg.consecFails === 1, 'first failure -> consecFails 1');
  recordFeedResult(fh, 'svpg', false);
  recordFeedResult(fh, 'svpg', false);
  assert(fh.feedHealth.svpg.consecFails === 3, 'three failing runs -> consecFails 3');
  assert(feedsToSuggest(fh, 3).join() === 'svpg', 'feedsToSuggest lists a feed at the threshold');
  recordFeedResult(fh, 'svpg', true); // a successful fetch resets + silences
  assert(fh.feedHealth.svpg.consecFails === 0, 'a success resets the counter to 0');
  assert(feedsToSuggest(fh, 3).length === 0, 'a reset feed drops out of the suggestion list');
  recordFeedResult(fh, 'lenny', false); // a second feed counts independently
  assert(feedsToSuggest(fh, 3).length === 0 && fh.feedHealth.lenny.consecFails === 1, 'per-slug counters are independent');

  fs.rmSync(tmpdir, { recursive: true, force: true });
  console.log(ok ? 'magazine-state.js --selftest: PASS' : 'magazine-state.js --selftest: FAIL');
  process.exit(ok ? 0 : 1);
}

module.exports = {
  STATES, defaultPath, canonicalLink, load, save, discover, transition, advanceCursors,
  remapCursors, orphanCursors, pendingPodcasts, claim, release, reclaimStale,
  recordFeedResult, feedsToSuggest,
};

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) { selftest(); }
  else if (args[0] === '--path' && args[2] === 'show') {
    console.log(JSON.stringify(load(args[1]), null, 2));
  } else {
    console.log('usage: magazine-state.js --selftest | --path <file> show');
  }
}
