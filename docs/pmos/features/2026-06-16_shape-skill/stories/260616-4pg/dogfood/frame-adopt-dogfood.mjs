#!/usr/bin/env node
// frame-adopt-dogfood.mjs — load-bearing dogfood for story 260616-4pg.
// Mirrors EXACTLY the detection + field-extraction contract written into
// /ideate SKILL.md Phase 1 (#frame). Proves both paths against /shape's REAL
// output (not a mock): (1) ADOPT — a present /shape brief yields HMW + JTBD +
// chosen framing + sharpest problem, so /ideate reuses the frame (no re-derive);
// (2) FALL-BACK — a non-/shape HTML resolves no brief, so /ideate derives.
// If /shape's section ids or field labels drift, this fails — that is the point.
//
//   node frame-adopt-dogfood.mjs   # exit 0 = both paths verified, 1 = mismatch

import { readFileSync } from "node:fs";

function section(html, id) {
  const m = String(html).match(
    new RegExp(`<section[^>]*\\bid\\s*=\\s*["']${id}["'][^>]*>([\\s\\S]*?)<\\/section>`, "i")
  );
  return m ? m[1] : "";
}
function text(s) {
  return String(s).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}
function labelled(sectionHtml, label) {
  // "<strong>How might we:</strong> value" → value
  const t = text(sectionHtml);
  const re = new RegExp(`${label}\\s*(.+?)(?:\\s+[A-Z][a-z]+(?:[ -][A-Za-z]+)*:|$)`, "i");
  const m = t.match(re);
  return m ? m[1].trim() : "";
}

// Detection contract (SKILL.md #frame): a /shape brief carries this meta.
function isShapeBrief(html) {
  return /<meta[^>]*name=["']pmos:skill["'][^>]*content=["']shape["']/i.test(html) ||
         /<meta[^>]*content=["']shape["'][^>]*name=["']pmos:skill["']/i.test(html);
}

// Adopt: read the four contract fields from the brief's sections.
function adoptFrame(html) {
  const felt = section(html, "felt-problem");
  return {
    hmw: labelled(felt, "How might we:"),
    jtbd: labelled(felt, "Job-to-be-done:"),
    chosenFraming: labelled(section(html, "framings"), "Chosen framing:"),
    sharpestProblem: text(section(html, "tldr")).slice(0, 120),
  };
}

const fails = [];

// ---- Path 1: ADOPT (real /shape brief present) ----
const briefPath = new URL("../../260616-p7b/dogfood/2026-06-17_abandoned-side-projects.html", import.meta.url);
const brief = readFileSync(briefPath, "utf8");

if (!isShapeBrief(brief)) fails.push("ADOPT: real /shape brief not detected via pmos:skill meta");
const f = adoptFrame(brief);
for (const [k, v] of Object.entries(f)) {
  if (!v || v.length < 8) fails.push(`ADOPT: field '${k}' not extracted from real brief (got: ${JSON.stringify(v)})`);
}
// The whole point of dedup: the adopted HMW must be /shape's, verbatim-ish — not re-derived.
if (f.hmw && !/re-enter a paused side project/i.test(f.hmw)) {
  fails.push(`ADOPT: HMW did not match /shape's framing (got: ${f.hmw})`);
}

// ---- Path 2: FALL-BACK (non-/shape HTML present) ----
const notShape = `<!DOCTYPE html><meta name="pmos:skill" content="ideate"><section id="tldr"><h2>x</h2></section>`;
if (isShapeBrief(notShape)) fails.push("FALL-BACK: a non-/shape (pmos:skill=ideate) artifact was wrongly detected as a /shape brief");
// No brief → /ideate derives (standalone path preserved). Nothing to extract; detection correctly returns false.

if (fails.length) {
  console.error("FAIL: frame-adopt dogfood —");
  for (const x of fails) console.error("  - " + x);
  process.exit(1);
}
console.log("PASS: frame-adopt dogfood — 2 paths");
console.log("  ADOPT (real /shape brief):");
console.log("    HMW:            " + f.hmw);
console.log("    JTBD:           " + f.jtbd.slice(0, 80) + (f.jtbd.length > 80 ? "…" : ""));
console.log("    chosen framing: " + f.chosenFraming.slice(0, 80) + (f.chosenFraming.length > 80 ? "…" : ""));
console.log("    sharpest:       " + f.sharpestProblem + "…");
console.log("  FALL-BACK (pmos:skill=ideate): no /shape brief detected → /ideate derives as today.");
