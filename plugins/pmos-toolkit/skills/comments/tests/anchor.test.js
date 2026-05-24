#!/usr/bin/env node
// T12 — anchor-resolver pure-function tests (spec §14.1, FR-23).
//
// Six sub-cases:
//   (a) id-first hit            → strategy="id-first", score=1.0, dom_range
//   (b) id miss + quote hit     → strategy="quote-fallback", score>=0.5
//   (c) both miss               → { orphan: true, score }
//   (d) SVG data-anchor hit     → strategy="svg-data-anchor", shape_id+bbox
//   (e) SVG bbox fallback       → strategy="svg-bbox", matched-by-bbox
//   (f) prefix/suffix proximity → closer-to-prefix location wins

"use strict";

const path = require("path");
const assert = require("assert");

const RESOLVER = path.join(__dirname, "..", "scripts", "anchor-resolver.js");

let mod;
try {
  mod = require(RESOLVER);
} catch (e) {
  console.error("FAIL: cannot load anchor-resolver at " + RESOLVER);
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
}
const { resolveAnchor } = mod;

function ok(label, cond, detail) {
  try {
    assert.ok(cond, detail || label);
  } catch (e) {
    console.error("FAIL: " + label + " — " + (e && e.message ? e.message : e));
    process.exit(1);
  }
}

// ---------- (a) id-first hit ----------
(function caseA() {
  const html =
    '<main class="doc"><section><h2 id="problem">Problem</h2>' +
    "<p>Users currently have no way to comment.</p></section></main>";
  const r = resolveAnchor({
    anchor: { id_anchor: "problem", quote_anchor: null, diagram_anchor: null },
    artifactHtml: html,
  });
  ok("a.strategy", r.strategy === "id-first", "strategy=" + r.strategy);
  ok("a.score==1", r.score === 1.0, "score=" + r.score);
  ok("a.dom_range present", r.dom_range && typeof r.dom_range.start_offset === "number");
  ok("a.not orphan", !r.orphan);
})();

// ---------- (b) id miss + quote hit ----------
(function caseB() {
  const html =
    '<main class="doc"><section><h2 id="problem">Problem</h2>' +
    "<p>Users currently have no way to comment on artifacts.</p></section></main>";
  const r = resolveAnchor({
    anchor: {
      id_anchor: "does-not-exist",
      quote_anchor: {
        text: "no way to comment on artifacts",
        prefix: "Users currently have ",
        suffix: ".",
      },
      diagram_anchor: null,
    },
    artifactHtml: html,
  });
  ok("b.strategy", r.strategy === "quote-fallback", "strategy=" + r.strategy);
  ok("b.score>=0.5", typeof r.score === "number" && r.score >= 0.5, "score=" + r.score);
  ok("b.dom_range present", r.dom_range && typeof r.dom_range.start_offset === "number");
})();

// ---------- (c) both miss ----------
(function caseC() {
  const html = '<main class="doc"><p>completely different content here</p></main>';
  const r = resolveAnchor({
    anchor: {
      id_anchor: "nope",
      quote_anchor: {
        text: "zzzz qqqq xxxx yyyy unmatched gibberish phrase",
        prefix: "",
        suffix: "",
      },
      diagram_anchor: null,
    },
    artifactHtml: html,
  });
  ok("c.orphan", r.orphan === true, "expected orphan=true, got " + JSON.stringify(r));
  ok("c.score number", typeof r.score === "number");
})();

// ---------- (d) SVG data-anchor hit ----------
(function caseD() {
  const html =
    '<main class="doc"><svg viewBox="0 0 100 100">' +
    '<rect data-anchor="box1" x="10" y="10" width="20" height="20" />' +
    '<circle data-anchor="dot2" cx="50" cy="50" r="5" />' +
    "</svg></main>";
  const r = resolveAnchor({
    anchor: {
      id_anchor: null,
      quote_anchor: null,
      diagram_anchor: { shape_id: "dot2", bbox: null },
    },
    artifactHtml: html,
  });
  ok("d.strategy", r.strategy === "svg-data-anchor", "strategy=" + r.strategy);
  ok("d.shape_id", r.shape_id === "dot2", "shape_id=" + r.shape_id);
  ok("d.bbox present", r.bbox && typeof r.bbox.x === "number");
})();

// ---------- (e) SVG bbox fallback ----------
(function caseE() {
  const html =
    '<main class="doc"><svg viewBox="0 0 100 100">' +
    '<rect x="10" y="10" width="20" height="20" />' +
    '<rect x="60" y="60" width="20" height="20" />' +
    "</svg></main>";
  const r = resolveAnchor({
    anchor: {
      id_anchor: null,
      quote_anchor: null,
      // Query bbox overlaps the second rect.
      diagram_anchor: { shape_id: null, bbox: { x: 65, y: 65, w: 10, h: 10 } },
    },
    artifactHtml: html,
  });
  ok("e.strategy", r.strategy === "svg-bbox", "strategy=" + r.strategy);
  ok("e.matched-by-bbox bbox present", r.bbox && r.bbox.x === 60 && r.bbox.y === 60,
     "bbox=" + JSON.stringify(r.bbox));
})();

// ---------- (f) prefix/suffix proximity bias ----------
(function caseF() {
  // Same quote appears twice. The correct occurrence has the prefix
  // immediately before it; the decoy has no surrounding prefix/suffix.
  const quote = "ambiguous phrase";
  const html =
    '<main class="doc">' +
    "<p>" + "padding ".repeat(50) + quote + " elsewhere.</p>" +
    "<p>UNIQUE_PREFIX_TOKEN " + quote + " UNIQUE_SUFFIX_TOKEN end.</p>" +
    "</main>";
  const r = resolveAnchor({
    anchor: {
      id_anchor: null,
      quote_anchor: {
        text: quote,
        prefix: "UNIQUE_PREFIX_TOKEN ",
        suffix: " UNIQUE_SUFFIX_TOKEN",
      },
      diagram_anchor: null,
    },
    artifactHtml: html,
  });
  ok("f.strategy", r.strategy === "quote-fallback", "strategy=" + r.strategy);
  // The chosen offset must be the second occurrence (closer to prefix).
  const second = html.lastIndexOf(quote);
  ok(
    "f.chosen second occurrence",
    Math.abs(r.dom_range.start_offset - second) < quote.length,
    "expected near offset " + second + ", got " + r.dom_range.start_offset
  );
})();

console.log("PASS: anchor-resolver — 6/6 cases (id-first, quote-fallback, orphan, svg-data, svg-bbox, prefix/suffix)");
