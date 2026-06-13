#!/usr/bin/env node
/*
 * compression.js — the arithmetic for /summary-tldr's compression model.
 *
 * The skill (the model) NEVER computes compression numbers itself (skill-patterns
 * §H: arithmetic is a script). It calls this script with the source word count and
 * an optional band, and renders the returned target range + absolute cap to the
 * user for confirmation. Reference: ../reference/compression-model.md.
 *
 * Bands (intent-labeled percentage-of-source, design D2):
 *   tight     ~10–20 %   skim / BLUF, high compression
 *   standard  ~20–30 %   the empirical sweet spot (DEFAULT)
 *   detailed  ~30–40 %   dense technical/legal/scientific only ("this will be long")
 *
 * Absolute cap. Compression is non-linear: a flat percentage of a very long
 * source still yields a sprawling document, not a TL;DR. So the percentage target
 * is bounded above by a word cap that grows sub-linearly with source length
 *   cap = round(200 + 80 * log10(clamp(words, 100, 1e7)))   (floor 150)
 * — a 500-word post caps at ~416 (never binds), a 50k-word report caps at ~576.
 * The cap is surfaced to the user alongside the band.
 *
 * Usage:
 *   node compression.js <source_word_count> [--band tight|standard|detailed]
 *   node compression.js --selftest
 *
 * Output (stdout): a single JSON object —
 *   { source_words, band, pct_low, pct_high, target_low, target_high,
 *     word_cap, capped, final_low, final_high }
 * where final_* is the target range after applying the cap (what the skill quotes).
 *
 * Exit codes: 0 ok / 0 selftest pass · 1 selftest fail · 64 usage error.
 * Dependencies: node only (no packages). No Math.random / no Date — pure function.
 */
'use strict';

var BANDS = {
  tight:    { low: 0.10, high: 0.20 },
  standard: { low: 0.20, high: 0.30 },
  detailed: { low: 0.30, high: 0.40 }
};

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

function wordCap(words) {
  var w = clamp(words, 100, 1e7);
  return Math.max(150, Math.round(200 + 80 * (Math.log(w) / Math.LN10)));
}

// Pure model: words + band -> the full compression proposal object.
function compute(words, band) {
  if (!BANDS[band]) throw new Error('unknown band: ' + band);
  var b = BANDS[band];
  var target_low = Math.round(words * b.low);
  var target_high = Math.round(words * b.high);
  var cap = wordCap(words);
  var final_low = Math.min(target_low, cap);
  var final_high = Math.min(target_high, cap);
  if (final_low > final_high) final_low = final_high; // cap collapsed the range
  return {
    source_words: words,
    band: band,
    pct_low: b.low,
    pct_high: b.high,
    target_low: target_low,
    target_high: target_high,
    word_cap: cap,
    capped: target_high > cap,
    final_low: final_low,
    final_high: final_high
  };
}

function selftest() {
  var fails = [];
  function ok(cond, msg) { if (!cond) fails.push(msg); }

  // Band monotonicity: detailed > standard > tight at the same length.
  var L = 2000;
  ok(compute(L, 'tight').target_high < compute(L, 'standard').target_high, 'tight<standard high');
  ok(compute(L, 'standard').target_high < compute(L, 'detailed').target_high, 'standard<detailed high');

  // Short source: cap never binds (final == raw target).
  var s = compute(500, 'standard');
  ok(!s.capped && s.final_high === s.target_high, 'short source: cap should not bind');

  // Long source: cap binds and holds the summary to a TL;DR.
  var big = compute(50000, 'standard');
  ok(big.capped, 'long source: cap should bind');
  ok(big.final_high <= big.word_cap, 'long source: final_high within cap');
  ok(big.final_high < 700, 'long source: capped TL;DR stays small (<700w), got ' + big.final_high);

  // Cap grows sub-linearly: 100x more words must NOT yield 100x the cap.
  ok(wordCap(100000) < 4 * wordCap(1000), 'cap grows sub-linearly');

  // Percentages match the published bands exactly.
  ok(compute(1000, 'tight').pct_low === 0.10 && compute(1000, 'tight').pct_high === 0.20, 'tight band pct');
  ok(compute(1000, 'standard').pct_low === 0.20 && compute(1000, 'standard').pct_high === 0.30, 'standard band pct');
  ok(compute(1000, 'detailed').pct_low === 0.30 && compute(1000, 'detailed').pct_high === 0.40, 'detailed band pct');

  // Unknown band throws.
  var threw = false;
  try { compute(1000, 'nope'); } catch (e) { threw = true; }
  ok(threw, 'unknown band should throw');

  if (fails.length) {
    process.stderr.write('SELFTEST FAIL:\n  ' + fails.join('\n  ') + '\n');
    process.exit(1);
  }
  process.stderr.write('SELFTEST PASS: ' + 'compression.js band + cap model holds.\n');
  process.exit(0);
}

function main(argv) {
  var args = argv.slice(2);
  if (args.indexOf('--selftest') !== -1) return selftest();

  var band = 'standard';
  var words = null;
  for (var i = 0; i < args.length; i++) {
    if (args[i] === '--band') { band = args[++i]; }
    else if (/^--band=/.test(args[i])) { band = args[i].split('=')[1]; }
    else if (/^[0-9]+$/.test(args[i])) { words = parseInt(args[i], 10); }
    else { process.stderr.write('usage: compression.js <word_count> [--band tight|standard|detailed] | --selftest\n'); process.exit(64); }
  }
  if (words === null) { process.stderr.write('error: source word count required\nusage: compression.js <word_count> [--band tight|standard|detailed] | --selftest\n'); process.exit(64); }
  if (!BANDS[band]) { process.stderr.write('error: --band must be one of tight|standard|detailed\n'); process.exit(64); }

  process.stdout.write(JSON.stringify(compute(words, band)) + '\n');
}

main(process.argv);
