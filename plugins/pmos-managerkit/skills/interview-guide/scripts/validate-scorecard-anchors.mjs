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

  // 6. Archetype-specific: work-history carries the additive role-evidence + trajectory-synthesis
  //    families (design D6/D9). Presence-guarded on data-archetype="work-history" — for every OTHER
  //    archetype this assertion is skipped and the sheet validates exactly as before (AC8/AC9).
  if (/data-archetype\s*=\s*"work-history"/.test(html)) {
    failures.push(...validateWorkHistory(html));
  }

  return failures;
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ── Work-history section families ────────────────────────────────────────────
// Extract each top-level <section data-card="<cardValue>">…</section> block (these sections are flat —
// no nested <section> — so a non-greedy match to the first </section> is exact).
function extractSections(html, cardValue) {
  const re = new RegExp('<section\\b[^>]*data-card="' + escapeRe(cardValue) + '"[^>]*>[\\s\\S]*?</section>', 'g');
  return html.match(re) || [];
}

// Assert the work-history contract: ≥1 role-evidence block (each with its six role: sub-anchors,
// result-measured field, and both flag lists) and exactly one trajectory-synthesis block (with its
// three trajectory: sub-anchors and the level-verdict field). Returns an array of failure strings.
function validateWorkHistory(html) {
  const failures = [];

  const roleBlocks = extractSections(html, 'role-evidence');
  if (roleBlocks.length < 1) {
    failures.push('work-history: no data-card="role-evidence" block found (need at least one)');
  }
  const roleSlots = ['role:company', 'role:title', 'role:tenure', 'role:scope', 'role:contribution', 'role:result'];
  roleBlocks.forEach((block, i) => {
    const n = i + 1;
    for (const slot of roleSlots) {
      if (!new RegExp('data-input\\s*=\\s*"' + escapeRe(slot) + '"').test(block)) {
        failures.push(`work-history: role-evidence block #${n} is missing data-input="${slot}"`);
      }
    }
    if (!/data-field\s*=\s*"result-measured"/.test(block)) {
      failures.push(`work-history: role-evidence block #${n} is missing data-field="result-measured"`);
    }
    if (!/data-flags\s*=\s*"green"/.test(block)) failures.push(`work-history: role-evidence block #${n} is missing data-flags="green"`);
    if (!/data-flags\s*=\s*"red"/.test(block)) failures.push(`work-history: role-evidence block #${n} is missing data-flags="red"`);
  });

  const trajBlocks = extractSections(html, 'trajectory-synthesis');
  if (trajBlocks.length !== 1) {
    failures.push(`work-history: expected exactly 1 data-card="trajectory-synthesis" block, found ${trajBlocks.length}`);
  }
  const traj = trajBlocks[0] || '';
  for (const slot of ['trajectory:scope-arc', 'trajectory:patterns', 'trajectory:level-fit']) {
    if (!new RegExp('data-input\\s*=\\s*"' + escapeRe(slot) + '"').test(traj)) {
      failures.push(`work-history: trajectory-synthesis is missing data-input="${slot}"`);
    }
  }
  if (!/data-field\s*=\s*"level-verdict"/.test(traj)) {
    failures.push('work-history: trajectory-synthesis is missing data-field="level-verdict"');
  }

  return failures;
}

// ── --level-rubric override sum-gate (design D8) ─────────────────────────────
// Deterministic §H gate on an operator-supplied competency→weight set. The skill interprets the
// operator's free-form markdown into a JSON object {competency: integerWeight, …} for the selected
// level and hands it here; a set that is not all non-negative integers summing to 100 is REFUSED, so
// the skill never emits a malformed sheet (it re-prompts, or falls back to the default ladder).
function checkOverride(jsonStr) {
  let obj;
  try { obj = JSON.parse(jsonStr); }
  catch (e) { return { ok: false, detail: `override is not valid JSON: ${e.message}` }; }
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, detail: 'override must be a JSON object mapping competency → integer weight' };
  }
  const entries = Object.entries(obj);
  if (entries.length === 0) return { ok: false, detail: 'override has no weights' };
  let sum = 0;
  for (const [k, v] of entries) {
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
      return { ok: false, detail: `weight for "${k}" is not a non-negative integer (got ${JSON.stringify(v)})` };
    }
    sum += v;
  }
  if (sum !== 100) return { ok: false, detail: `override weights sum to ${sum}, not 100` };
  return { ok: true, detail: `override valid (${entries.length} competencies, weights sum to 100)` };
}

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

// A minimal but complete work-history sheet: one full role-evidence block, exactly one
// trajectory-synthesis, plus a weighted dim + reco so the base checks also pass.
const WH_GOOD_FIXTURE = `<!DOCTYPE html><html><body>
<main data-card="scorecard" data-archetype="work-history">
  <section class="dim" data-dim="product-delivery" data-weight="100">
    <div class="scale" data-scale="1-4"><span data-v="1">1</span></div>
    <div class="notes" data-input="notes:product-delivery"></div>
    <ul data-flags="green"></ul><ul data-flags="red"></ul>
  </section>
  <section class="role" data-card="role-evidence" data-role="1">
    <div data-input="role:company"></div><div data-input="role:title"></div>
    <div data-input="role:tenure"></div><div data-input="role:scope"></div>
    <div data-input="role:contribution"></div><div data-input="role:result"></div>
    <div class="field" data-field="result-measured"><span data-measured="yes">yes</span></div>
    <ul data-flags="green"></ul><ul data-flags="red"></ul>
  </section>
  <section class="trajectory" data-card="trajectory-synthesis">
    <div data-input="trajectory:scope-arc"></div><div data-input="trajectory:patterns"></div>
    <div data-input="trajectory:level-fit"></div>
    <div class="field" data-field="level-verdict"><span data-verdict="at">at</span></div>
  </section>
  <section class="reco"><div class="reco-opts" data-input="reco">
    <span data-reco="strong-no">Strong no</span><span data-reco="no">No</span>
    <span data-reco="yes">Hire</span><span data-reco="strong-yes">Strong hire</span>
  </div><div data-input="notes:reco"></div></section>
</main></body></html>`;

// Broken WH: role-evidence missing role:result, and NO trajectory-synthesis block at all.
const WH_BROKEN_FIXTURE = `<!DOCTYPE html><html><body>
<main data-card="scorecard" data-archetype="work-history">
  <section class="dim" data-dim="product-delivery" data-weight="100">
    <div class="scale" data-scale="1-4"><span data-v="1">1</span></div>
    <div class="notes" data-input="notes:product-delivery"></div>
    <ul data-flags="green"></ul><ul data-flags="red"></ul>
  </section>
  <section class="role" data-card="role-evidence" data-role="1">
    <div data-input="role:company"></div><div data-input="role:title"></div>
    <div data-input="role:tenure"></div><div data-input="role:scope"></div>
    <div data-input="role:contribution"></div>
    <div class="field" data-field="result-measured"><span data-measured="yes">yes</span></div>
    <ul data-flags="green"></ul><ul data-flags="red"></ul>
  </section>
  <section class="reco"><div class="reco-opts" data-input="reco">
    <span data-reco="strong-no">Strong no</span><span data-reco="no">No</span>
    <span data-reco="yes">Hire</span><span data-reco="strong-yes">Strong hire</span>
  </div><div data-input="notes:reco"></div></section>
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

  // Work-history: good fixture must pass (0 failures); the base product-sense fixtures above prove the
  // assertion is SKIPPED for non-work-history archetypes (byte-unchanged validation, AC8/AC9).
  const whGood = validate(WH_GOOD_FIXTURE);
  if (whGood.length !== 0) {
    ok = false;
    console.error('SELFTEST FAIL: work-history good fixture reported failures:');
    for (const f of whGood) console.error('  - ' + f);
  } else {
    console.log('selftest: work-history good fixture ✓ (0 failures)');
  }

  const whBad = validate(WH_BROKEN_FIXTURE);
  const whExpect = [
    /role-evidence block #1 is missing data-input="role:result"/,
    /expected exactly 1 data-card="trajectory-synthesis" block, found 0/,
    /trajectory-synthesis is missing data-input="trajectory:scope-arc"/,
    /trajectory-synthesis is missing data-field="level-verdict"/,
  ];
  const whMissed = whExpect.filter((re) => !whBad.some((f) => re.test(f)));
  if (whMissed.length !== 0) {
    ok = false;
    console.error('SELFTEST FAIL: work-history broken fixture did not report all expected failures.');
    console.error('  reported: ' + JSON.stringify(whBad, null, 2));
  } else {
    console.log(`selftest: work-history broken fixture ✓ (caught ${whBad.length} failures incl. all expected)`);
  }

  // --check-override sum-gate: a summing set passes; non-summing, non-integer, and malformed refuse.
  const ovCases = [
    { in: '{"a":60,"b":40}', want: true,  name: 'valid sum-100 override' },
    { in: '{"a":60,"b":30}', want: false, name: 'non-summing override (90)' },
    { in: '{"a":60,"b":40.5}', want: false, name: 'non-integer override' },
    { in: '{"a":60,"b":-10,"c":50}', want: false, name: 'negative-weight override' },
    { in: 'not json', want: false, name: 'malformed override' },
    { in: '[]', want: false, name: 'non-object override' },
  ];
  for (const c of ovCases) {
    const got = checkOverride(c.in).ok;
    if (got !== c.want) {
      ok = false;
      console.error(`SELFTEST FAIL: override case "${c.name}" expected ok=${c.want}, got ${got}`);
    }
  }
  if (ok) console.log(`selftest: --check-override sum-gate ✓ (${ovCases.length} cases)`);

  if (ok) { console.log('SELFTEST PASS'); process.exit(0); }
  console.error('SELFTEST FAILED'); process.exit(1);
}

// ── Main ─────────────────────────────────────────────────────────────────────

const arg = process.argv[2];
if (!arg) {
  console.error('usage: validate-scorecard-anchors.mjs <scoring-sheet.html> | --selftest | --check-override \'<json>\'');
  process.exit(2);
}
if (arg === '--selftest') { selftest(); }

// --level-rubric override sum-gate (design D8): validate an interpreted weight set, no file involved.
if (arg === '--check-override') {
  const payload = process.argv[3];
  if (!payload) {
    console.error('usage: validate-scorecard-anchors.mjs --check-override \'{"competency": <int>, …}\'');
    process.exit(2);
  }
  const r = checkOverride(payload);
  if (r.ok) { console.log(`✓ level-rubric override: ${r.detail}`); process.exit(0); }
  console.error(`✗ level-rubric override rejected: ${r.detail}`);
  process.exit(1);
}

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
