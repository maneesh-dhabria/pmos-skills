// Unit tests for scorecard.js — node stdlib only (no deps).
// Run: node tests/scorecard.test.js   (exit 0 = all pass)
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sc = require('../scripts/scorecard.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok - ' + name); }
  catch (e) { console.error('  FAIL - ' + name + '\n    ' + e.message); process.exitCode = 1; }
}
function tmpfile() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ct-sc-')), 'scorecard.json');
}

// --- Brier known vectors ---
test('brier: perfect predictions = 0', () => {
  assert.strictEqual(sc.brier([{ p: 1, outcome: 1 }, { p: 0, outcome: 0 }]), 0);
});
test('brier: 0.5/0.5 split = 0.25', () => {
  assert.strictEqual(sc.brier([{ p: 0.5, outcome: 1 }, { p: 0.5, outcome: 0 }]), 0.25);
});
test('brier: empty = null', () => {
  assert.strictEqual(sc.brier([]), null);
});

// --- seed on absent ---
test('load: seeds a fresh scorecard when file absent', () => {
  const f = tmpfile();
  const data = sc.load(f);
  assert.strictEqual(data.version, 1);
  assert.deepStrictEqual(data.sessions, []);
  assert.deepStrictEqual(data.muscle_scores, {});
  assert.strictEqual(data.calibration.brier, null);
});

// --- corrupt file reseed ---
test('load: reseeds on corrupt JSON instead of crashing', () => {
  const f = tmpfile();
  fs.writeFileSync(f, '{ this is : not json');
  const data = sc.load(f);
  assert.strictEqual(data.version, 1);
  assert.deepStrictEqual(data.sessions, []);
});

// --- atomic update merge ---
test('applySession: merges muscles, predictions, recomputes brier', () => {
  let d = sc.seed();
  d = sc.applySession(d, {
    date: '2026-05-01', band: 'Quick', shapes: ['spot-the-bias', 'assumption-hunt'],
    muscles: { 'spot bias': { seen: 1, strong: 1 }, assumptions: { seen: 1, strong: 0 } },
    predictions: [{ p: 0.5, outcome: 1 }, { p: 0.5, outcome: 0 }],
  });
  assert.strictEqual(d.sessions.length, 1);
  assert.strictEqual(d.muscle_scores['spot bias'].seen, 1);
  assert.strictEqual(d.muscle_scores['spot bias'].strong, 1);
  assert.strictEqual(d.muscle_scores.assumptions.strong, 0);
  assert.strictEqual(d.calibration.brier, 0.25);
});

test('applySession: accumulates muscle counts across sessions', () => {
  let d = sc.seed();
  const s = { date: '2026-05-01', band: 'Quick', shapes: ['x'], muscles: { assumptions: { seen: 1, strong: 1 } }, predictions: [] };
  d = sc.applySession(d, s);
  d = sc.applySession(d, { ...s, date: '2026-05-02' });
  assert.strictEqual(d.muscle_scores.assumptions.seen, 2);
  assert.strictEqual(d.muscle_scores.assumptions.strong, 2);
});

// --- streak increment + reset ---
test('streak: increments on consecutive day, resets on gap', () => {
  let d = sc.seed();
  const base = { band: 'Quick', shapes: ['x'], muscles: {}, predictions: [] };
  d = sc.applySession(d, { ...base, date: '2026-05-01' });
  assert.strictEqual(d.streak.count, 1);
  d = sc.applySession(d, { ...base, date: '2026-05-02' }); // consecutive
  assert.strictEqual(d.streak.count, 2);
  d = sc.applySession(d, { ...base, date: '2026-05-02' }); // same day, no change
  assert.strictEqual(d.streak.count, 2);
  d = sc.applySession(d, { ...base, date: '2026-05-10' }); // gap > 1 day → reset
  assert.strictEqual(d.streak.count, 1);
});

// --- save/load round-trip is atomic + durable ---
test('save then load round-trips', () => {
  const f = tmpfile();
  let d = sc.seed();
  d = sc.applySession(d, { date: '2026-05-01', band: 'Deep', shapes: ['reframe-the-question'], muscles: { 'problem-framing': { seen: 1, strong: 1 } }, predictions: [] });
  sc.save(f, d);
  const reread = sc.load(f);
  assert.strictEqual(reread.sessions.length, 1);
  assert.strictEqual(reread.muscle_scores['problem-framing'].seen, 1);
});

// --- summary: weakest muscle ---
test('summary: reports weakest muscle by strong/seen ratio', () => {
  let d = sc.seed();
  d.muscle_scores = { a: { seen: 4, strong: 4 }, b: { seen: 4, strong: 1 } };
  const s = sc.summary(d);
  assert.strictEqual(s.weakest_muscle, 'b');
});

console.log(`\nscorecard.test.js: ${passed} passed` + (process.exitCode ? ' (with failures)' : ''));
