#!/usr/bin/env node
// T26 — Calibration corpus scorer test (§14.6 thresholds).
//
// Loads calibration-spans-2026.json (50 deterministic spans), perturbs each
// artifact with light word-substitution (stochastic with per-span LCG seed),
// and runs resolveAnchor() against the perturbed HTML. Asserts:
//
//   id-first hits          >= 45/50
//   quote-fallback + orphan <= 5/50
//   orphan                 <=  3/50
//
// Perturbation strategy:
//   - Word substitutions from SUBS table applied at probability 0.3 per occurrence.
//   - In 10% of spans (deterministic per LCG) the section's id attribute is
//     REMOVED from the perturbed HTML to force the quote-fallback path, so
//     that the thresholds are actually exercised (not 50/50 id-first trivially).
//
// The scorer uses a simple LCG (no external deps) for per-span determinism.

"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const RESOLVER_PATH = path.join(__dirname, "..", "scripts", "anchor-resolver.js");
const CORPUS_PATH = path.join(__dirname, "fixtures", "calibration-spans-2026.json");

// Repo root — walk up from __dirname until .git exists
function findRepoRoot(start) {
  let cur = start;
  while (true) {
    if (fs.existsSync(path.join(cur, ".git"))) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) throw new Error("Cannot find repo root from " + start);
    cur = parent;
  }
}

const REPO_ROOT = findRepoRoot(__dirname);

let resolverMod;
try {
  resolverMod = require(RESOLVER_PATH);
} catch (e) {
  console.error("FAIL: cannot load anchor-resolver at " + RESOLVER_PATH);
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
}
const { resolveAnchor } = resolverMod;

// ---------- deterministic LCG ----------
// Simple LCG for per-span deterministic random; no external deps.
// Constants from Numerical Recipes (modulus 2^32).
function makeLCG(seed) {
  let s = (seed >>> 0) || 1;
  return function nextFloat() {
    s = ((s * 1664525 + 1013904223) >>> 0);
    return s / 0x100000000;
  };
}

// ---------- perturbation ----------
const SUBS = {
  the: "a",
  and: "&",
  is: "will be",
  use: "leverage",
  create: "build",
  add: "introduce",
};

/**
 * Apply word substitutions with probability p per occurrence, using the
 * provided LCG as the randomness source.
 */
function perturbText(text, rng, p) {
  return text.replace(/\b(the|and|is|use|create|add)\b/gi, (match) => {
    if (rng() < p) {
      const key = match.toLowerCase();
      const replacement = SUBS[key] || match;
      // Preserve original capitalisation for first letter
      if (match[0] === match[0].toUpperCase() && replacement.length > 0) {
        return replacement[0].toUpperCase() + replacement.slice(1);
      }
      return replacement;
    }
    return match;
  });
}

/**
 * Remove id="<sectionId>" (or id='...') from the HTML to force
 * the quote-fallback path.
 */
function removeSectionId(html, sectionId) {
  const escaped = sectionId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Remove the id attribute wherever it appears for this section
  const re = new RegExp('\\s*\\bid\\s*=\\s*["\']' + escaped + '["\']', "g");
  return html.replace(re, "");
}

// ---------- corpus ----------
let corpus;
try {
  corpus = JSON.parse(fs.readFileSync(CORPUS_PATH, "utf8"));
} catch (e) {
  console.error("FAIL: cannot load calibration corpus at " + CORPUS_PATH);
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
}

const spans = corpus.spans;
if (!Array.isArray(spans) || spans.length === 0) {
  console.error("FAIL: corpus has no spans");
  process.exit(1);
}

// ---------- scoring ----------
let idFirst = 0;
let quoteFallback = 0;
let orphanCount = 0;

const results = [];

for (let i = 0; i < spans.length; i++) {
  const span = spans[i];

  // Load original artifact
  const artifactPath = path.join(REPO_ROOT, span.file);
  let originalHtml;
  try {
    originalHtml = fs.readFileSync(artifactPath, "utf8");
  } catch (e) {
    console.error("FAIL: cannot read artifact: " + artifactPath);
    console.error(e && e.stack ? e.stack : e);
    process.exit(1);
  }

  // Build anchor — resolver expects quote_anchor.text (not .quote)
  const anchor = {
    id_anchor: span.section_id,
    quote_anchor: {
      text: span.quote,
      prefix: span.prefix,
      suffix: span.suffix,
    },
    diagram_anchor: null,
  };

  // Perturb HTML — LCG seeded with span index for determinism
  const rng = makeLCG(i + 1);  // +1 so seed 0 is never used
  let perturbedHtml = perturbText(originalHtml, rng, 0.3);

  // In ~10% of spans (every 10th, deterministic) remove the section id to
  // exercise the quote-fallback path and make thresholds non-trivially testable.
  const forceQuoteFallback = (i % 10 === 5);
  if (forceQuoteFallback) {
    perturbedHtml = removeSectionId(perturbedHtml, span.section_id);
  }

  // Resolve
  const result = resolveAnchor({ anchor, artifactHtml: perturbedHtml });

  // Classify
  let classification;
  if (result.orphan === true) {
    orphanCount++;
    classification = "orphan";
  } else if (result.strategy === "id-first") {
    idFirst++;
    classification = "id-first";
  } else if (result.strategy === "quote-fallback") {
    quoteFallback++;
    classification = "quote-fallback";
  } else {
    // Unexpected strategy — count as orphan
    orphanCount++;
    classification = "orphan(unexpected:" + result.strategy + ")";
  }

  results.push({ i, section_id: span.section_id, classification, forceQuoteFallback });
}

// ---------- assert thresholds (§14.6) ----------
const total = spans.length;

let failed = false;

function check(label, cond, detail) {
  if (!cond) {
    console.error("FAIL: " + label + " — " + detail);
    failed = true;
  }
}

check(
  "id-first threshold",
  idFirst >= 45,
  "id-first hits " + idFirst + "/" + total + " below threshold 45"
);
check(
  "quote+orphan threshold",
  (quoteFallback + orphanCount) <= 5,
  "quote+orphan " + (quoteFallback + orphanCount) + "/" + total + " above threshold 5"
);
check(
  "orphan threshold",
  orphanCount <= 3,
  "orphan " + orphanCount + "/" + total + " above threshold 3"
);

if (failed) {
  // Print diagnostic breakdown before exiting
  console.error("\nDiagnostic breakdown:");
  for (const r of results) {
    if (r.classification !== "id-first") {
      console.error(
        "  [" + r.i + "] " + r.section_id + " → " + r.classification +
        (r.forceQuoteFallback ? " (forced-quote-fallback)" : "")
      );
    }
  }
  process.exit(1);
}

console.log(
  "PASS: scorer calibration — id-first " + idFirst + "/" + total +
  ", quote-fallback " + quoteFallback + "/" + total +
  ", orphan " + orphanCount + "/" + total
);
