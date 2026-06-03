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

const STATES = ['discovered', 'downloaded', 'transcribed', 'summarized', 'rendered', 'failed'];

function defaultPath() {
  return path.join(os.homedir(), '.pmos', 'magazine', 'state.json');
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
// is a no-op (dedup), so a re-run never resurrects an already-rendered item.
function discover(state, guid, meta) {
  if (state.items[guid]) return false;
  state.items[guid] = Object.assign({ status: 'discovered' }, meta);
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

module.exports = { STATES, defaultPath, load, save, discover, transition, advanceCursors };

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) { selftest(); }
  else if (args[0] === '--path' && args[2] === 'show') {
    console.log(JSON.stringify(load(args[1]), null, 2));
  } else {
    console.log('usage: magazine-state.js --selftest | --path <file> show');
  }
}
