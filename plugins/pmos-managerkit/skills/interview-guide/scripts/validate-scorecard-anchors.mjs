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

  // 7. Duration budget anchors — OPTIONAL + additive (design D8, INV-5). A sheet with neither
  //    data-duration nor data-budget validates exactly as before (the 8 bundled scorecards, both base
  //    fixtures). When present, the arithmetic is the script's job, never the model's (§H, INV-6):
  //    data-duration must be a positive integer, and per-dim data-budget values must be positive
  //    integers that sum to at most the round duration. A data-budget without a data-duration to sit
  //    under is an inconsistent sheet (INV-2 says emit neither, or both) and is refused.
  const durMatch = html.match(/data-duration\s*=\s*"([^"]*)"/);
  const budgets = [];
  {
    const re = /data-budget\s*=\s*"([^"]*)"/g;
    let m;
    while ((m = re.exec(html)) !== null) budgets.push(m[1]);
  }
  if (durMatch) {
    const raw = durMatch[1];
    if (!/^\d+$/.test(raw) || parseInt(raw, 10) <= 0) {
      failures.push(`data-duration="${raw}" is not a positive integer`);
    } else {
      const dur = parseInt(raw, 10);
      let bsum = 0;
      let bbad = false;
      for (const b of budgets) {
        if (!/^\d+$/.test(b) || parseInt(b, 10) <= 0) {
          failures.push(`data-budget="${b}" is not a positive integer`);
          bbad = true;
          continue;
        }
        bsum += parseInt(b, 10);
      }
      if (!bbad && budgets.length > 0 && bsum > dur) {
        failures.push(`per-dim data-budget values sum to ${bsum}, exceeding data-duration=${dur}`);
      }
    }
  } else if (budgets.length > 0) {
    failures.push(`found ${budgets.length} data-budget value(s) but no data-duration on the root card (emit both anchors or neither — INV-2)`);
  }

  // 8. Level-descriptor anchors — OPTIONAL + additive. The rules live in scorecard-skeleton.html's
  //    contract comment (the single home); this is their enforcement, per dimension:
  //      - a dimension with NO data-level is legal (the un-backfilled state — all-or-none, not all-or-fail);
  //      - a dimension with data-level on some but not all of its data-v options is refused;
  //      - a present-but-empty (or whitespace-only) descriptor is refused, with a distinct message.
  //    Presence-and-completeness only — no arithmetic (§H).
  failures.push(...validateLevelDescriptors(html));

  return failures;
}

// ── Level descriptors ────────────────────────────────────────────────────────
// Extract each <section … data-dim="…">…</section> block. Dimension sections are flat (no nested
// <section>), so a non-greedy match to the first </section> is exact — the same assumption
// extractSections() makes for the work-history card families.
function extractDimSections(html) {
  const re = /<section\b[^>]*\bdata-dim\s*=\s*"([^"]+)"[^>]*>[\s\S]*?<\/section>/g;
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) out.push({ id: m[1], block: m[0] });
  return out;
}

// Enforce the data-level contract per dimension. Returns an array of failure strings.
function validateLevelDescriptors(html) {
  const failures = [];

  for (const { id, block } of extractDimSections(html)) {
    // Each scale option is a tag carrying data-v="<n>"; the descriptor, when present, is an attribute
    // on that same tag.
    const optRe = /<[a-zA-Z][^>]*\bdata-v\s*=\s*"(\d+)"[^>]*>/g;
    const options = [];
    let m;
    while ((m = optRe.exec(block)) !== null) {
      const lvl = m[0].match(/\bdata-level\s*=\s*"([^"]*)"/);
      options.push({ v: m[1], has: lvl !== null, text: lvl ? lvl[1] : null });
    }
    if (options.length === 0) continue;

    const described = options.filter((o) => o.has);
    if (described.length > 0 && described.length !== options.length) {
      const missing = options.filter((o) => !o.has).map((o) => o.v).join(', ');
      failures.push(
        `dimension "${id}" has data-level on ${described.length} of ${options.length} scale options — missing on level(s) ${missing} ` +
        `(all-or-none per dimension; see scorecard-skeleton.html's data-level contract)`,
      );
    }
    for (const o of described) {
      if (o.text.trim() === '') {
        failures.push(`dimension "${id}" has an empty data-level on level ${o.v} (a present descriptor must carry real text)`);
      }
    }
  }

  return failures;
}

// ── Free-form duration parser (§H) ───────────────────────────────────────────
// The model NEVER parses minutes itself. It hands the operator's raw phrasing here; this deterministic
// parser resolves it to a positive integer of minutes or refuses. Handled shapes: a bare integer ("90"),
// an explicit minute unit ("90 mins", "45 minute"), an hour unit ("1 hour", "2 hrs" → ×60), and additive
// phrasing where the buffer is written out ("90 + 15 buffer" → 105). Hour/minute-unit tokens are consumed
// first so their integers are not also counted as bare minutes; whatever integers remain are read as
// minutes and summed. No digits ⇒ unparseable (non-zero exit ⇒ the skill re-prompts, never guesses).
function parseDuration(raw) {
  const s = String(raw).toLowerCase();
  let total = 0;
  let found = false;
  let rest = s;
  rest = rest.replace(/(\d+)\s*(hours|hour|hrs|hr|h)\b/g, (_, n) => { total += parseInt(n, 10) * 60; found = true; return ' '; });
  rest = rest.replace(/(\d+)\s*(minutes|minute|mins|min|m)\b/g, (_, n) => { total += parseInt(n, 10); found = true; return ' '; });
  const bare = rest.match(/\d+/g);
  if (bare) { for (const b of bare) { total += parseInt(b, 10); found = true; } }
  if (!found || total <= 0) return { ok: false };
  return { ok: true, minutes: total };
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

// ── Duration-budget fixtures (design D8, INV-5) ──────────────────────────────
// A well-formed duration sheet: root data-duration + per-dim data-budget values that sum to ≤ duration.
const DUR_GOOD_FIXTURE = `<!DOCTYPE html><html><body>
<main data-card="scorecard" data-archetype="product-sense" data-duration="60">
  <section class="dim" data-dim="user-empathy" data-weight="60" data-budget="35">
    <div class="scale" data-scale="1-4"><span data-v="1">1</span><span data-v="2">2</span><span data-v="3">3</span><span data-v="4">4</span></div>
    <div class="notes" data-input="notes:user-empathy"></div>
    <ul data-flags="green"></ul><ul data-flags="red"></ul>
  </section>
  <section class="dim" data-dim="prioritization" data-weight="40" data-budget="20">
    <div class="scale" data-scale="1-4"><span data-v="1">1</span><span data-v="2">2</span><span data-v="3">3</span><span data-v="4">4</span></div>
    <div class="notes" data-input="notes:prioritization"></div>
    <ul data-flags="green"></ul><ul data-flags="red"></ul>
  </section>
  <section class="reco"><div class="reco-opts" data-input="reco">
    <span data-reco="strong-no">Strong no</span><span data-reco="no">No</span>
    <span data-reco="yes">Hire</span><span data-reco="strong-yes">Strong hire</span>
  </div><div data-input="notes:reco"></div></section>
</main></body></html>`;

// Broken: per-dim budgets (35 + 40) sum to 75, overrunning the 60-minute round.
const DUR_OVERRUN_FIXTURE = DUR_GOOD_FIXTURE.replace('data-budget="20"', 'data-budget="40"');

// Broken: data-duration is not a positive integer.
const DUR_BADINT_FIXTURE = DUR_GOOD_FIXTURE.replace('data-duration="60"', 'data-duration="1h"');

// ── Level-descriptor fixtures ────────────────────────────────────────────────
// Minimal and self-contained on purpose — they must not couple these assertions to the bundled corpus
// content. Both dimensions describe every option of their scale; the pass line (3) permits prompting and
// only the top level (4) carries the unprompted language.
const LEVEL_GOOD_FIXTURE = `<!DOCTYPE html><html><body>
<main data-card="scorecard" data-archetype="product-sense">
  <section class="dim" data-dim="user-empathy" data-weight="60">
    <div class="scale" data-scale="1-4"><span data-v="1" data-level="ue-1: never reached the user, even when asked directly.">1</span><span data-v="2" data-level="ue-2: reached the user only after repeated prompting, and stayed generic.">2</span><span data-v="3" data-level="ue-3: named a concrete user and their need after a probe.">3</span><span data-v="4" data-level="ue-4: led with the user unprompted and segmented them.">4</span></div>
    <div class="notes" data-input="notes:user-empathy"></div>
    <ul data-flags="green"></ul><ul data-flags="red"></ul>
  </section>
  <section class="dim" data-dim="prioritization" data-weight="40">
    <div class="scale" data-scale="1-4"><span data-v="1" data-level="pr-1: offered no ordering at all.">1</span><span data-v="2" data-level="pr-2: ordered by gut with no criterion named.">2</span><span data-v="3" data-level="pr-3: named a criterion and applied it when asked to.">3</span><span data-v="4" data-level="pr-4: proposed the tradeoff unprompted and defended what was cut.">4</span></div>
    <div class="notes" data-input="notes:prioritization"></div>
    <ul data-flags="green"></ul><ul data-flags="red"></ul>
  </section>
  <section class="reco"><div class="reco-opts" data-input="reco">
    <span data-reco="strong-no">Strong no</span><span data-reco="no">No</span>
    <span data-reco="yes">Hire</span><span data-reco="strong-yes">Strong hire</span>
  </div><div data-input="notes:reco"></div></section>
</main></body></html>`;

// Undescribed: no data-level anywhere. The legal all-none state every bundled scorecard is in — it must
// validate exactly as it did before the contract existed.
const LEVEL_NONE_FIXTURE = GOOD_FIXTURE;

// Partially described: user-empathy describes 2 of its 4 options (levels 2 and 4 lose their descriptor).
const LEVEL_PARTIAL_FIXTURE = LEVEL_GOOD_FIXTURE
  .replace(' data-level="ue-2: reached the user only after repeated prompting, and stayed generic."', '')
  .replace(' data-level="ue-4: led with the user unprompted and segmented them."', '');

// Empty descriptors: one truly empty, one whitespace-only — both present, so all-or-none is satisfied and
// only the distinct non-empty failure fires.
const LEVEL_EMPTY_FIXTURE = LEVEL_GOOD_FIXTURE
  .replace('data-level="ue-3: named a concrete user and their need after a probe."', 'data-level=""')
  .replace('data-level="pr-2: ordered by gut with no criterion named."', 'data-level="   "');

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

  // Duration-budget gate: a well-formed duration sheet passes; a budget overrun and a non-integer
  // duration are both refused. The base fixtures above (which carry NEITHER anchor) prove the gate is
  // SKIPPED when absent — the 8 bundled scorecards validate byte-unchanged (INV-5).
  const durGood = validate(DUR_GOOD_FIXTURE);
  if (durGood.length !== 0) {
    ok = false;
    console.error('SELFTEST FAIL: duration good fixture reported failures:');
    for (const f of durGood) console.error('  - ' + f);
  } else {
    console.log('selftest: duration good fixture ✓ (0 failures)');
  }

  const durBad = validate(DUR_OVERRUN_FIXTURE);
  if (!durBad.some((f) => /sum to 75, exceeding data-duration=60/.test(f))) {
    ok = false;
    console.error('SELFTEST FAIL: budget-overrun fixture did not report the sum overrun.');
    console.error('  reported: ' + JSON.stringify(durBad, null, 2));
  } else {
    console.log('selftest: budget-overrun fixture ✓ (caught the overrun)');
  }

  const durBadInt = validate(DUR_BADINT_FIXTURE);
  if (!durBadInt.some((f) => /data-duration="1h" is not a positive integer/.test(f))) {
    ok = false;
    console.error('SELFTEST FAIL: non-integer duration fixture did not report the bad integer.');
    console.error('  reported: ' + JSON.stringify(durBadInt, null, 2));
  } else {
    console.log('selftest: non-integer duration fixture ✓ (caught the bad integer)');
  }

  // Level-descriptor gate: a fully-described sheet and an undescribed sheet both pass; a
  // partially-described dimension and an empty descriptor are each refused, with distinct messages.
  const lvlGood = validate(LEVEL_GOOD_FIXTURE);
  if (lvlGood.length !== 0) {
    ok = false;
    console.error('SELFTEST FAIL: level-descriptor good fixture reported failures:');
    for (const f of lvlGood) console.error('  - ' + f);
  } else {
    console.log('selftest: level-descriptor good fixture ✓ (0 failures)');
  }

  const lvlNone = validate(LEVEL_NONE_FIXTURE);
  if (lvlNone.length !== 0) {
    ok = false;
    console.error('SELFTEST FAIL: undescribed fixture reported failures (all-or-none must accept zero descriptors):');
    for (const f of lvlNone) console.error('  - ' + f);
  } else {
    console.log('selftest: undescribed fixture ✓ (0 failures — the legal all-none state)');
  }

  const lvlPartial = validate(LEVEL_PARTIAL_FIXTURE);
  if (!lvlPartial.some((f) => /dimension "user-empathy" has data-level on 2 of 4 scale options — missing on level\(s\) 2, 4/.test(f))) {
    ok = false;
    console.error('SELFTEST FAIL: partially-described fixture did not name the dimension and its missing levels.');
    console.error('  reported: ' + JSON.stringify(lvlPartial, null, 2));
  } else {
    console.log('selftest: partially-described fixture ✓ (caught the incomplete scale)');
  }

  const lvlEmpty = validate(LEVEL_EMPTY_FIXTURE);
  const lvlEmptyExpect = [
    /dimension "user-empathy" has an empty data-level on level 3/,
    /dimension "prioritization" has an empty data-level on level 2/,
  ];
  if (lvlEmptyExpect.some((re) => !lvlEmpty.some((f) => re.test(f))) || lvlEmpty.some((f) => /all-or-none/.test(f))) {
    ok = false;
    console.error('SELFTEST FAIL: empty-descriptor fixture did not report both empties with the distinct message.');
    console.error('  reported: ' + JSON.stringify(lvlEmpty, null, 2));
  } else {
    console.log('selftest: empty-descriptor fixture ✓ (caught both empties, distinct from all-or-none)');
  }

  // --check-duration free-form parser (§H). Parseable shapes resolve to a positive integer of minutes;
  // an in-band value returns no band warning; an out-of-band value still parses (warn, never block);
  // a wordy answer with no number is unparseable (the skill re-prompts).
  const durCases = [
    { in: '90',              want: 90,   band: true,  name: 'bare integer' },
    { in: '90 mins',         want: 90,   band: true,  name: 'explicit minute unit' },
    { in: '1 hour',          want: 60,   band: true,  name: 'hour unit ×60' },
    { in: '90 + 15 buffer',  want: 105,  band: true,  name: 'additive buffer phrasing' },
    { in: '5',               want: 5,    band: false, name: 'below the 15-minute band' },
    { in: '300',             want: 300,  band: false, name: 'above the 240-minute band' },
    { in: 'sometime after lunch', want: null, band: null, name: 'unparseable (no number)' },
  ];
  for (const c of durCases) {
    const r = parseDuration(c.in);
    if (c.want === null) {
      if (r.ok) { ok = false; console.error(`SELFTEST FAIL: duration case "${c.name}" should be unparseable, got ${r.minutes}`); }
    } else if (!r.ok || r.minutes !== c.want) {
      ok = false;
      console.error(`SELFTEST FAIL: duration case "${c.name}" expected ${c.want}, got ${r.ok ? r.minutes : 'unparseable'}`);
    } else {
      const inBand = r.minutes >= 15 && r.minutes <= 240;
      if (inBand !== c.band) {
        ok = false;
        console.error(`SELFTEST FAIL: duration case "${c.name}" band expected ${c.band}, got ${inBand}`);
      }
    }
  }
  if (ok) console.log(`selftest: --check-duration parser ✓ (${durCases.length} cases)`);

  if (ok) { console.log('SELFTEST PASS'); process.exit(0); }
  console.error('SELFTEST FAILED'); process.exit(1);
}

// ── Main ─────────────────────────────────────────────────────────────────────

const arg = process.argv[2];
if (!arg) {
  console.error('usage: validate-scorecard-anchors.mjs <scoring-sheet.html> | --selftest | --check-override \'<json>\' | --check-duration \'<raw>\'');
  process.exit(2);
}
if (arg === '--selftest') { selftest(); }

// --check-duration (design D8, §H): normalize an operator's free-form round-length answer to a positive
// integer of minutes on stdout (exit 0), or exit non-zero when it cannot be parsed unambiguously so the
// skill re-prompts rather than guessing. An in-range parse that lands outside the 15–240 sane band still
// succeeds (exit 0) but WARNS on stderr — the band never blocks (A1). The model never parses minutes itself.
if (arg === '--check-duration') {
  const payload = process.argv[3];
  if (payload === undefined) {
    console.error('usage: validate-scorecard-anchors.mjs --check-duration \'<raw>\'');
    process.exit(2);
  }
  const r = parseDuration(payload);
  if (!r.ok) {
    console.error(`✗ could not parse a duration from ${JSON.stringify(payload)} — ask the operator for a number of minutes`);
    process.exit(1);
  }
  if (r.minutes < 15 || r.minutes > 240) {
    console.error(`WARN: ${r.minutes} minutes is outside the typical 15–240 minute band — confirm this is intended`);
  }
  console.log(String(r.minutes));
  process.exit(0);
}

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
