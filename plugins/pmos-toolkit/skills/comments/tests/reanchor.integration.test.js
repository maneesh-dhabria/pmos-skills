#!/usr/bin/env node
// T26 — Re-anchor integration test (FR-23 quote-fallback / orphan paths).
//
// Three focused sub-cases exercising artifact regeneration scenarios:
//
//   (a) id-first-still-works   — same id, new prose → id still resolves
//   (b) quote-fallback-on-id-removal — id removed, prose similar → Bitap hits
//   (c) orphan-on-total-rewrite — id removed + prose totally replaced → orphan
//
// Uses in-memory HTML strings only; no tmp-dir I/O needed.
// Spec refs: FR-23, §14.1, §14.6.

"use strict";

const path = require("path");
const assert = require("assert");

const RESOLVER_PATH = path.join(__dirname, "..", "scripts", "anchor-resolver.js");

let mod;
try {
  mod = require(RESOLVER_PATH);
} catch (e) {
  console.error("FAIL: cannot load anchor-resolver at " + RESOLVER_PATH);
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
}
const { resolveAnchor } = mod;

function ok(label, cond, detail) {
  if (!cond) {
    console.error("FAIL: " + label + " — " + (detail || "assertion failed"));
    process.exit(1);
  }
}

// ---------- shared anchor ----------
// Original artifact: section id="foo", prose A.
// Sidecar thread has: id_anchor="foo", quote="original wording",
//   prefix="The ", suffix=" of this"
const ANCHOR = {
  id_anchor: "foo",
  quote_anchor: {
    text: "original wording",
    prefix: "The ",
    suffix: " of this",
  },
  diagram_anchor: null,
};

// ---------- (a) id-first-still-works ----------
// Regenerated artifact: SAME id="foo", NEW prose.
// The id_anchor "foo" still exists so id-first should resolve regardless.
(function caseA() {
  const regeneratedHtml =
    '<main class="doc">' +
    '<section id="foo">' +
    "<h2>Foo Section</h2>" +
    "<p>The freshly-rewritten wording of this section is unique.</p>" +
    "</section>" +
    "</main>";

  const r = resolveAnchor({ anchor: ANCHOR, artifactHtml: regeneratedHtml });

  ok("a.strategy", r.strategy === "id-first", "expected id-first, got " + JSON.stringify(r));
  ok("a.no-orphan", !r.orphan, "expected no orphan");
  ok("a.dom_range", r.dom_range && typeof r.dom_range.start_offset === "number",
    "dom_range missing: " + JSON.stringify(r));

  console.log("PASS: reanchor sub-case (a) id-first-still-works");
})();

// ---------- (b) quote-fallback-on-id-removal ----------
// Regenerated artifact: id="foo" REMOVED (not regenerated), prose remains
// similar to original (quote "original wording" still present verbatim).
// The id-first strategy will miss; quote-fallback via Bitap should hit.
(function caseB() {
  const regeneratedHtml =
    '<main class="doc">' +
    '<section>' +
    "<h2>Foo Section</h2>" +
    // NOTE: the original quote "original wording" is still present, so
    // the Bitap / exact-match path can locate it.
    "<p>The original wording of this section is unique.</p>" +
    "</section>" +
    "</main>";

  const r = resolveAnchor({ anchor: ANCHOR, artifactHtml: regeneratedHtml });

  ok("b.strategy", r.strategy === "quote-fallback",
    "expected quote-fallback, got " + JSON.stringify(r));
  ok("b.no-orphan", !r.orphan, "expected no orphan");
  ok("b.score", typeof r.score === "number" && r.score >= 0.5,
    "score below 0.5: " + r.score);
  ok("b.dom_range", r.dom_range && typeof r.dom_range.start_offset === "number",
    "dom_range missing: " + JSON.stringify(r));

  console.log("PASS: reanchor sub-case (b) quote-fallback-on-id-removal");
})();

// ---------- (c) orphan-on-total-rewrite ----------
// Regenerated artifact: id removed AND prose totally replaced with Lorem ipsum.
// Neither id-first nor quote-fallback can resolve → orphan.
(function caseC() {
  const regeneratedHtml =
    '<main class="doc">' +
    '<section>' +
    "<h2>Foo Section</h2>" +
    "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>" +
    "</section>" +
    "</main>";

  const r = resolveAnchor({ anchor: ANCHOR, artifactHtml: regeneratedHtml });

  ok("c.orphan", r.orphan === true,
    "expected orphan=true, got " + JSON.stringify(r));

  console.log("PASS: reanchor sub-case (c) orphan-on-total-rewrite");
})();

console.log("PASS: reanchor integration — all 3 sub-cases passed (id-first-still-works, quote-fallback-on-id-removal, orphan-on-total-rewrite)");
