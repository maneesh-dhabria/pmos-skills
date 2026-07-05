#!/usr/bin/env node
// validate-scorecard-anchors.mjs — structural validator for /interview-guide output (b), the Scoring Sheet.
//
// AC4 / INV-2: a scoring sheet must carry the FULL scorecard-skeleton machine-anchor set so
// `/interview-feedback score` can consume it verbatim (the interop loop, design D8). This script is the
// deterministic §H hard gate on that contract — the model authors the sheet, the script proves the anchors
// are present and the weights are arithmetically sound (never have the model add the weights by hand).
//
// Usage:
//   node validate-scorecard-anchors.mjs <scoring-sheet.html>   → validate one file (exit 0 pass / 1 fail)
//   node validate-scorecard-anchors.mjs --selftest             → run the built-in good+broken fixtures
//
// Zero dependencies (Node built-ins only). Anchor discovery is regex-based over the raw HTML — the same
// discovery contract fill-scorecard.mjs uses on the /interview-feedback side, so a sheet that passes here
// is one that side can parse.

import { readFileSync } from 'node:fs';

// ── Anchor checks ────────────────────────────────────────────────────────────
// Each returns { ok, detail } given the raw HTML string. `dims` is the list of data-dim ids discovered once.

function discoverDims(html) {
  const ids = [];
  const re = /data-dim\s*=\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) ids.push(m[1]);
  return ids;
}

function discoverWeights(html) {
  const weights = [];
  const re = /data-weight\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(html)) !== null) weights.push(m[1]);
  return weights;
}

// Returns an array of failure strings (empty ⇒ pass).
function validate(html) {
  const failures = [];

  // 1. Root card anchor.
  if (!/data-card\s*=\s*"scorecard"/.test(html)) {
    failures.push('missing data-card="scorecard" on the root <main>');
  }

  // 2. At least one scored dimension.
  const dims = discoverDims(html);
  if (dims.length === 0) {
    failures.push('no data-dim="<id>" dimensions found (need at least one scored dimension)');
  }

  // 3. Per-dimension anchors: scale, notes slot, both flag containers.
  for (const dim of dims) {
    const notesRe = new RegExp('data-input\\s*=\\s*"notes:' + escapeRe(dim) + '"');
    if (!notesRe.test(html)) {
      failures.push(`dimension "${dim}" is missing data-input="notes:${dim}"`);
    }
  }
  if (dims.length > 0) {
    if (!/data-scale\s*=\s*"[^"]+"/.test(html)) {
      failures.push('no data-scale="…" container found (each dimension needs a scale)');
    }
    if (!/data-v\s*=\s*"\d+"/.test(html)) {
      failures.push('no data-v="<n>" scale options found');
    }
    if (!/data-flags\s*=\s*"green"/.test(html)) {
      failures.push('no data-flags="green" container found');
    }
    if (!/data-flags\s*=\s*"red"/.test(html)) {
      failures.push('no data-flags="red" container found');
    }
  }

  // 4. Overall recommendation control + its four options.
  if (!/data-input\s*=\s*"reco"/.test(html)) {
    failures.push('missing data-input="reco" (the overall hire/no-hire control)');
  } else {
    for (const opt of ['strong-yes', 'yes', 'no', 'strong-no']) {
      const re = new RegExp('data-reco\\s*=\\s*"' + escapeRe(opt) + '"');
      if (!re.test(html)) failures.push(`reco control is missing option data-reco="${opt}"`);
    }
  }

  // 5. Weights are integers and sum to exactly 100 (§H: arithmetic is the script's job, not the model's).
  const weights = discoverWeights(html);
  if (dims.length > 0) {
    if (weights.length !== dims.length) {
      failures.push(`found ${dims.length} data-dim but ${weights.length} data-weight (one weight per dimension required)`);
    }
    let sum = 0;
    let bad = false;
    for (const w of weights) {
      if (!/^\d+$/.test(w)) { failures.push(`data-weight="${w}" is not a non-negative integer`); bad = true; continue; }
      sum += parseInt(w, 10);
    }
    if (!bad && weights.length > 0 && sum !== 100) {
      failures.push(`data-weight values sum to ${sum}, not 100`);
    }
  }

  return failures;
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ── Selftest ─────────────────────────────────────────────────────────────────

const GOOD_FIXTURE = `<!DOCTYPE html><html><body>
<main data-card="scorecard" data-archetype="product-sense">
  <section class="dim" data-dim="user-empathy" data-weight="60">
    <div class="scale" data-scale="1-4"><span data-v="1">1</span><span data-v="2">2</span><span data-v="3">3</span><span data-v="4">4</span></div>
    <div class="notes" data-input="notes:user-empathy"></div>
    <ul data-flags="green"></ul><ul data-flags="red"></ul>
  </section>
  <section class="dim" data-dim="prioritization" data-weight="40">
    <div class="scale" data-scale="1-4"><span data-v="1">1</span><span data-v="2">2</span><span data-v="3">3</span><span data-v="4">4</span></div>
    <div class="notes" data-input="notes:prioritization"></div>
    <ul data-flags="green"></ul><ul data-flags="red"></ul>
  </section>
  <section class="reco"><div class="reco-opts" data-input="reco">
    <span data-reco="strong-no">Strong no</span><span data-reco="no">No</span>
    <span data-reco="yes">Hire</span><span data-reco="strong-yes">Strong hire</span>
  </div><div data-input="notes:reco"></div></section>
</main></body></html>`;

// Broken: root card anchor removed, one notes slot dropped, weights sum to 90, a reco option missing.
const BROKEN_FIXTURE = `<!DOCTYPE html><html><body>
<main data-archetype="product-sense">
  <section class="dim" data-dim="user-empathy" data-weight="60">
    <div class="scale" data-scale="1-4"><span data-v="1">1</span></div>
    <div class="notes" data-input="notes:user-empathy"></div>
    <ul data-flags="green"></ul><ul data-flags="red"></ul>
  </section>
  <section class="dim" data-dim="prioritization" data-weight="30">
    <div class="scale" data-scale="1-4"><span data-v="1">1</span></div>
    <ul data-flags="green"></ul><ul data-flags="red"></ul>
  </section>
  <section class="reco"><div class="reco-opts" data-input="reco">
    <span data-reco="no">No</span><span data-reco="yes">Hire</span><span data-reco="strong-yes">Strong hire</span>
  </div></section>
</main></body></html>`;

function selftest() {
  let ok = true;

  const goodFailures = validate(GOOD_FIXTURE);
  if (goodFailures.length !== 0) {
    ok = false;
    console.error('SELFTEST FAIL: good fixture reported failures:');
    for (const f of goodFailures) console.error('  - ' + f);
  } else {
    console.log('selftest: good fixture ✓ (0 failures)');
  }

  const badFailures = validate(BROKEN_FIXTURE);
  // The broken fixture must trip at least these categories.
  const expect = [
    /data-card="scorecard"/,          // missing root anchor
    /notes:prioritization/,            // dropped notes slot
    /sum to 90/,                       // weights don't total 100
    /data-reco="strong-no"/,           // missing reco option
  ];
  const missed = expect.filter((re) => !badFailures.some((f) => re.test(f)));
  if (missed.length !== 0) {
    ok = false;
    console.error('SELFTEST FAIL: broken fixture did not report all expected failures.');
    console.error('  reported: ' + JSON.stringify(badFailures, null, 2));
  } else {
    console.log(`selftest: broken fixture ✓ (caught ${badFailures.length} failures incl. all expected)`);
  }

  if (ok) { console.log('SELFTEST PASS'); process.exit(0); }
  console.error('SELFTEST FAILED'); process.exit(1);
}

// ── Main ─────────────────────────────────────────────────────────────────────

const arg = process.argv[2];
if (!arg) {
  console.error('usage: validate-scorecard-anchors.mjs <scoring-sheet.html> | --selftest');
  process.exit(2);
}
if (arg === '--selftest') { selftest(); }

let html;
try {
  html = readFileSync(arg, 'utf8');
} catch (e) {
  console.error(`cannot read ${arg}: ${e.message}`);
  process.exit(2);
}

const failures = validate(html);
if (failures.length === 0) {
  const n = discoverDims(html).length;
  console.log(`✓ scorecard anchors: valid (${n} dimension${n === 1 ? '' : 's'}, weights sum to 100, reco control present)`);
  process.exit(0);
}
console.error(`✗ scorecard anchors: ${failures.length} problem(s) in ${arg}`);
for (const f of failures) console.error('  - ' + f);
process.exit(1);
