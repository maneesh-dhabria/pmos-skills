#!/usr/bin/env node
// T13 — wave-planner unit tests.
//
// Asserts the FR-25 overlap relation + Kahn's-style greedy packing:
//   (a) 3 disjoint text threads      → 1 wave of 3
//   (b) 2 disjoint + 1 text-overlap  → 2 waves (2, 1)
//   (c) all overlap                  → 3 waves of 1
//   (d) text-only + SVG-only mixed   → 2 waves (one per range type)
//   (e) within-wave right-to-left    → wave threads sorted by start_offset DESC
//   (g) cycle in depEdges            → all-singleton waves (defensive fallback)
//
// Spec refs: FR-25 (i)/(ii)/(iii), §S14; Decision P6.

"use strict";

const path = require("path");
const assert = require("assert");

const PLANNER = path.join(__dirname, "..", "scripts", "wave-planner.js");

let mod;
try {
  mod = require(PLANNER);
} catch (e) {
  console.error("FAIL: cannot load wave-planner at " + PLANNER);
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
}

const { planWaves, overlapRelationFR25 } = mod;

// --- helpers ---

function textThread(id, start, end) {
  return { id, anchor: { start_offset: start, end_offset: end } };
}

function svgThread(id, x, y, w, h) {
  return { id, anchor: { bbox: { x, y, w, h } } };
}

function idsOf(wave) {
  return wave.map((t) => t.id);
}

let failed = 0;
function it(name, fn) {
  try {
    fn();
    console.log("  PASS " + name);
  } catch (e) {
    failed++;
    console.error("  FAIL " + name + " — " + (e && e.message ? e.message : e));
    if (e && e.stack) console.error(e.stack);
  }
}

// --- (a) 3 disjoint text threads → 1 wave of 3 ---
it("(a) 3 disjoint text threads → 1 wave of 3", () => {
  const threads = [
    textThread("T1", 0, 10),
    textThread("T2", 20, 30),
    textThread("T3", 40, 50),
  ];
  const waves = planWaves(threads, overlapRelationFR25);
  assert.strictEqual(waves.length, 1, "expected 1 wave");
  assert.strictEqual(waves[0].length, 3, "wave 0 holds all 3");
  assert.deepStrictEqual(idsOf(waves[0]).sort(), ["T1", "T2", "T3"]);
});

// --- (b) 2 disjoint + 1 overlap → 2 waves (2, 1) ---
it("(b) 2 disjoint + 1 text-overlap → 2 waves (2, 1)", () => {
  // T1 [0,10), T2 [20,30) disjoint; T3 [5,15) overlaps T1.
  const threads = [
    textThread("T1", 0, 10),
    textThread("T2", 20, 30),
    textThread("T3", 5, 15),
  ];
  const waves = planWaves(threads, overlapRelationFR25);
  assert.strictEqual(waves.length, 2, "expected 2 waves");
  const sizes = waves.map((w) => w.length).sort();
  assert.deepStrictEqual(sizes, [1, 2]);
  // T3 should land in wave[1] (T1 already claimed wave[0]).
  const wave0Ids = idsOf(waves[0]);
  assert.ok(wave0Ids.indexOf("T1") !== -1 && wave0Ids.indexOf("T2") !== -1,
    "wave 0 contains T1 and T2");
  assert.deepStrictEqual(idsOf(waves[1]), ["T3"], "wave 1 = [T3]");
});

// --- (c) all overlap → 3 waves of 1 ---
it("(c) all overlap → 3 sequential waves of 1", () => {
  const threads = [
    textThread("T1", 0, 100),
    textThread("T2", 50, 150),
    textThread("T3", 80, 200),
  ];
  const waves = planWaves(threads, overlapRelationFR25);
  assert.strictEqual(waves.length, 3, "expected 3 waves");
  for (const w of waves) assert.strictEqual(w.length, 1);
});

// --- (d) text + SVG segregation ---
it("(d) text-only + SVG-only mixed → 2 waves (one per range type)", () => {
  const threads = [
    textThread("T1", 0, 10),
    textThread("T2", 20, 30),
    svgThread("S1", 0, 0, 10, 10),
    svgThread("S2", 100, 100, 10, 10),
  ];
  const waves = planWaves(threads, overlapRelationFR25);
  // Per FR-25(iii) as interpreted in T13: text and SVG threads are
  // segregated into separate waves, even when individually disjoint.
  assert.strictEqual(waves.length, 2, "expected 2 waves (one text, one svg)");
  for (const w of waves) {
    const kinds = new Set(w.map((t) => (t.anchor && t.anchor.bbox) ? "svg" : "text"));
    assert.strictEqual(kinds.size, 1, "each wave is single-kind");
  }
});

// --- (e) within-wave right-to-left ---
it("(e) within-wave right-to-left ordering by start_offset DESC", () => {
  const threads = [
    textThread("T1", 0, 5),
    textThread("T2", 10, 15),
    textThread("T3", 20, 25),
  ];
  const waves = planWaves(threads, overlapRelationFR25);
  assert.strictEqual(waves.length, 1);
  const offsets = waves[0].map((t) => t.anchor.start_offset);
  // Descending.
  for (let i = 1; i < offsets.length; i++) {
    assert.ok(offsets[i - 1] >= offsets[i],
      "expected DESC start_offset; got " + JSON.stringify(offsets));
  }
  assert.deepStrictEqual(idsOf(waves[0]), ["T3", "T2", "T1"]);
});

// --- bonus: orphan threads excluded ---
it("(f) orphan threads excluded entirely", () => {
  const threads = [
    textThread("T1", 0, 10),
    { id: "TO", anchor: { orphan: true } },
  ];
  const waves = planWaves(threads, overlapRelationFR25);
  const allIds = waves.flat().map((t) => t.id);
  assert.strictEqual(allIds.indexOf("TO"), -1, "orphan excluded");
  assert.ok(allIds.indexOf("T1") !== -1, "non-orphan included");
});

// --- (g) cycle in depEdges → all-singleton waves (defensive fallback) ---
it("(g) cycle in depEdges → all-singleton waves", () => {
  // Three disjoint text threads (would otherwise pack into 1 wave of 3),
  // but with a synthetic cycle T1 → T2 → T3 → T1 in depEdges. Kahn's
  // can't make progress, so the planner falls back to all-singleton
  // layering: each thread in its own layer → 3 sequential waves of 1.
  const threads = [
    textThread("T1", 0, 10),
    textThread("T2", 20, 30),
    textThread("T3", 40, 50),
  ];
  const depEdges = [["T1", "T2"], ["T2", "T3"], ["T3", "T1"]];
  const waves = planWaves(threads, overlapRelationFR25, depEdges);
  assert.strictEqual(waves.length, 3, "expected 3 all-singleton waves");
  for (const w of waves) assert.strictEqual(w.length, 1, "each wave is singleton");
  const allIds = waves.flat().map((t) => t.id).sort();
  assert.deepStrictEqual(allIds, ["T1", "T2", "T3"], "all threads preserved");
});

if (failed > 0) {
  console.error("FAIL: " + failed + " sub-case(s) failed");
  process.exit(1);
}
console.log("PASS: wave-planner — all sub-cases pass");
