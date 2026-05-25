#!/usr/bin/env node
// T23 — svg-anchor.js unit tests (FR-50, FR-51, S15).
// Sub-cases (a)–(g) per task spec.

"use strict";

const path = require("path");
const assert = require("assert");

// From skills/diagram/tests/ → skills/_shared/html-authoring/assets/
const SVG_ANCHOR_PATH = path.join(
  __dirname,
  "..",
  "..",
  "_shared",
  "html-authoring",
  "assets",
  "svg-anchor.js"
);

let retrofitSvg, _internal;
try {
  ({ retrofitSvg, _internal } = require(SVG_ANCHOR_PATH));
} catch (e) {
  console.error("FAIL: cannot load svg-anchor.js at " + SVG_ANCHOR_PATH);
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
}

const { derivSlug, kebab, extractLabel, dedupe } = _internal;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getDataAnchors(svgStr) {
  const re = /data-anchor="([^"]*)"/g;
  const out = [];
  let m;
  while ((m = re.exec(svgStr)) !== null) out.push(m[1]);
  return out;
}

// ---------------------------------------------------------------------------
// (a) id-based slugs on 3 <g> groups
// ---------------------------------------------------------------------------
function test_a() {
  const svg = '<svg><g id="header"><text>H</text></g><g id="body"><text>B</text></g><g id="footer"><text>F</text></g></svg>';
  const out = retrofitSvg(svg);
  const anchors = getDataAnchors(out);
  assert.deepStrictEqual(
    anchors,
    ["header", "body", "footer"],
    "(a) ids → data-anchor slugs"
  );
}

// ---------------------------------------------------------------------------
// (b) aria-label kebab fallback
// ---------------------------------------------------------------------------
function test_b() {
  const svg = '<svg><g aria-label="Step 1"><text>S1</text></g><g aria-label="Step 2"><text>S2</text></g></svg>';
  const out = retrofitSvg(svg);
  const anchors = getDataAnchors(out);
  assert.deepStrictEqual(
    anchors,
    ["step-1", "step-2"],
    "(b) aria-label → kebab slugs"
  );
}

// ---------------------------------------------------------------------------
// (c) ordinal fallback — no id, no label, no text child
// ---------------------------------------------------------------------------
function test_c() {
  const svg = "<svg><g></g><g></g><g></g></svg>";
  const out = retrofitSvg(svg);
  const anchors = getDataAnchors(out);
  assert.deepStrictEqual(
    anchors,
    ["shape-1", "shape-2", "shape-3"],
    "(c) ordinal fallback slugs"
  );
}

// ---------------------------------------------------------------------------
// (d) inline SVG inside an HTML wireframe fixture — data-anchor lands in output
// ---------------------------------------------------------------------------
function test_d() {
  const html = `<!doctype html><html><body>
<section id="diagram-area">
  <svg xmlns="http://www.w3.org/2000/svg">
    <g id="nav-bar"><text>Nav</text></g>
    <g aria-label="Content Area"><text>Content</text></g>
  </svg>
</section>
</body></html>`;
  const out = retrofitSvg(html);
  const anchors = getDataAnchors(out);
  assert.deepStrictEqual(
    anchors,
    ["nav-bar", "content-area"],
    "(d) inline SVG in HTML wireframe fixture gets data-anchor"
  );
}

// ---------------------------------------------------------------------------
// (e) Idempotency: retrofitSvg(retrofitSvg(svg)) === retrofitSvg(svg)
// ---------------------------------------------------------------------------
function test_e() {
  const svg = '<svg><g id="alpha"><text>A</text></g><g aria-label="Beta Zone"></g><g></g></svg>';
  const once = retrofitSvg(svg);
  const twice = retrofitSvg(once);
  assert.strictEqual(
    once,
    twice,
    "(e) idempotent: second application is byte-exact no-op"
  );
}

// ---------------------------------------------------------------------------
// (f) Top-level <rect>/<path> get anchors; nested ones (inside <g>) do NOT.
// ---------------------------------------------------------------------------
function test_f() {
  const svg = [
    '<svg>',
    // top-level rect — should get anchor
    '<rect id="bg" x="0" y="0" width="100" height="100"/>',
    // top-level path — should get anchor
    '<path id="edge-1" d="M0 0 L100 100"/>',
    // g with nested rect + path — nested ones should NOT get their own anchors
    '<g id="node-box">',
    '  <rect x="10" y="10" width="80" height="40"/>',
    '  <path d="M10 10 L90 10"/>',
    '</g>',
    '</svg>',
  ].join("\n");

  const out = retrofitSvg(svg);
  const anchors = getDataAnchors(out);

  // Expected: bg, edge-1 (top-level rect/path), node-box (g). Nested rect/path: none.
  assert.ok(anchors.includes("bg"), "(f) top-level rect gets anchor");
  assert.ok(anchors.includes("edge-1"), "(f) top-level path gets anchor");
  assert.ok(anchors.includes("node-box"), "(f) g gets anchor");

  // Nested rect/path inside <g> should NOT produce separate data-anchor attrs.
  // The total count should be exactly 3 (bg + edge-1 + node-box).
  assert.strictEqual(anchors.length, 3, "(f) nested rect/path have no anchors (count=3)");
}

// ---------------------------------------------------------------------------
// (g) Collision dedupe via -2/-3
// ---------------------------------------------------------------------------
function test_g() {
  // Two <g> elements with the same id → second gets -2 suffix.
  const svg = '<svg><g id="foo"><text>F1</text></g><g id="foo"><text>F2</text></g><g id="foo"><text>F3</text></g></svg>';
  const out = retrofitSvg(svg);
  const anchors = getDataAnchors(out);
  assert.deepStrictEqual(
    anchors,
    ["foo", "foo-2", "foo-3"],
    "(g) collision dedupe via -2/-3"
  );
}

// ---------------------------------------------------------------------------
// Internal helper unit tests
// ---------------------------------------------------------------------------
function test_kebab_basics() {
  assert.strictEqual(kebab("Step 1"), "step-1", "kebab: Step 1");
  assert.strictEqual(kebab("Content Area"), "content-area", "kebab: Content Area");
  assert.strictEqual(kebab("--bad--slug--"), "bad-slug", "kebab: trim + collapse");
  assert.strictEqual(kebab(""), "", "kebab: empty");
  assert.strictEqual(kebab("  "), "", "kebab: whitespace-only → empty");
}

function test_dedupe_unit() {
  const seen = new Set();
  assert.strictEqual(dedupe(seen, "foo"), "foo", "dedupe: fresh");
  assert.strictEqual(dedupe(seen, "foo"), "foo-2", "dedupe: first collision");
  assert.strictEqual(dedupe(seen, "foo"), "foo-3", "dedupe: second collision");
  assert.strictEqual(dedupe(seen, "bar"), "bar", "dedupe: different key fresh");
}

// ---------------------------------------------------------------------------
// Run all tests
// ---------------------------------------------------------------------------
(function run() {
  const tests = [
    ["(a) id-based slugs", test_a],
    ["(b) aria-label kebab fallback", test_b],
    ["(c) ordinal fallback", test_c],
    ["(d) inline SVG in HTML wireframe", test_d],
    ["(e) idempotency", test_e],
    ["(f) top-level vs nested rect/path", test_f],
    ["(g) collision dedupe", test_g],
    ["kebab() unit", test_kebab_basics],
    ["dedupe() unit", test_dedupe_unit],
  ];

  const failures = [];
  for (const [name, fn] of tests) {
    try {
      fn();
    } catch (e) {
      failures.push(name + ": " + (e && e.message ? e.message : String(e)));
    }
  }

  if (failures.length > 0) {
    console.error("FAIL: svg-data-anchor — " + failures.length + " of " + tests.length + " sub-cases");
    for (const f of failures) console.error("  - " + f);
    process.exit(1);
  }
  console.log("PASS: svg-data-anchor — " + tests.length + " sub-cases");
})();
