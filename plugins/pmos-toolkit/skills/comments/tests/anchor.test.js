#!/usr/bin/env node
// T12 — anchor-resolver pure-function tests (spec §14.1, FR-23).
//
// Seven sub-cases:
//   (a) id-first hit            → strategy="id-first", score~=1.0, dom_range
//   (b) id miss + quote hit     → strategy="quote-fallback", score>=0.5
//   (c) both miss               → { orphan: true, score }
//   (d) SVG data-anchor hit     → strategy="svg-data-anchor", shape_id+bbox
//   (e) SVG bbox fallback       → strategy="svg-bbox", matched-by-bbox
//   (f) prefix/suffix proximity → closer-to-prefix location wins
//   (g) long-quote Bitap hit    → end_offset reflects the truncated probe
//                                 length (Match_MaxBits), not the full
//                                 quote_anchor.text length

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
  ok("a.score~=1", typeof r.score === "number" && r.score >= 0.99, "score=" + r.score);
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

// ---------- (g) long-quote Bitap hit — truncated probe length ----------
(function caseG() {
  // Quote longer than dmp Match_MaxBits (32). Artifact contains a
  // slightly-perturbed version (no exact substring match), forcing the
  // Bitap fallback path. The fix under test: end_offset must reflect the
  // truncated probe length (~32), not the full quote_anchor.text length.
  const quote = "the quick brown fox jumps over the lazy dog and runs away fast";
  // 62 chars — comfortably > 32.
  if (quote.length <= 32) {
    console.error("FAIL: g — test fixture quote is not longer than maxBits");
    process.exit(1);
  }
  // Perturb a char inside the first 32 chars so the probe (first 32 chars)
  // does NOT match the artifact exactly, but is still close enough for
  // Bitap to land on it with a high score.
  const perturbed =
    "the quick brawn fox jumps over the lazy dog and runs away fast";
  // sanity — quote must NOT appear verbatim, else exact-match path runs.
  if (perturbed.indexOf(quote) !== -1) {
    console.error("FAIL: g — fixture is not perturbed (would hit exact path)");
    process.exit(1);
  }
  const html =
    '<main class="doc"><p>padding lead-in. ' + perturbed + " trailing.</p></main>";
  const r = resolveAnchor({
    anchor: {
      id_anchor: null,
      quote_anchor: { text: quote, prefix: "", suffix: "" },
      diagram_anchor: null,
    },
    artifactHtml: html,
  });
  ok("g.strategy", r.strategy === "quote-fallback", "strategy=" + r.strategy);
  ok("g.score>=0.5", typeof r.score === "number" && r.score >= 0.5, "score=" + r.score);
  ok("g.dom_range present", r.dom_range && typeof r.dom_range.start_offset === "number");
  const span = r.dom_range.end_offset - r.dom_range.start_offset;
  // span should reflect the truncated probe length (≤ 32), NOT the full
  // 62-char quote.text length. Allow a small fuzz tolerance — but must be
  // strictly less than the full quote length.
  ok(
    "g.span clamped to probe length",
    span < quote.length,
    "expected span < " + quote.length + " (full quote), got " + span
  );
  ok(
    "g.span <= maxBits (32)",
    span <= 32,
    "expected span <= 32 (Match_MaxBits), got " + span
  );
})();

console.log("PASS: anchor-resolver — 7/7 cases (id-first, quote-fallback, orphan, svg-data, svg-bbox, prefix/suffix, long-quote-bitap)");
