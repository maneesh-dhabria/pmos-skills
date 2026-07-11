#!/usr/bin/env node
// 260710-n67 T6 — /msf-wf SVG-payload coverage.
//
// Two guards for the monochrome-SVG /wireframes refactor (epic 260710-grd):
//
//  (1) AC7 forward guard — msf-wf/SKILL.md spot-checks approved edits against
//      ../wireframes/reference/eval-rubric.md (a by-PATH cite). Story 260710-dsc
//      rewrote that rubric to SVG-native ids and RETIRED A1–A5 / D1–D4. The cite
//      stays valid only while msf-wf/SKILL.md names no retired id. This extends the
//      epic's dangling-cite gate to cover msf-wf/SKILL.md with the pinned ERE
//      `\b(A1|A2|A3|A4|A5|D1|D2|D3|D4)\b` (amendment A1) — asserting ZERO matches,
//      so a future edit cannot silently reintroduce a retired id.
//
//  (2) AC8 — msf-wf --apply-edits (msf-wf/SKILL.md, the `--apply-edits` block)
//      applies approved edits via the `Edit` tool (substring replace), NOT the
//      apply-edit shim. Prove a coordinate-adjacent substring Edit against the SVG
//      payload — changing a <text> label sitting next to x=/y= attributes — lands
//      cleanly and does not corrupt the surrounding coordinates (design §7 risk 3).

"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const SKILL_MD = path.join(__dirname, "..", "SKILL.md");
const SVG_FIXTURE = path.join(
  __dirname,
  "..",
  "..",
  "wireframes",
  "tests",
  "fixtures",
  "apply-edit-at-anchor",
  "wireframes_svg_mini.html"
);

const failures = [];

// (1) Forward guard: the pinned retired-id ERE returns zero matches over SKILL.md.
try {
  const skill = fs.readFileSync(SKILL_MD, "utf8");
  const RETIRED = /\b(A1|A2|A3|A4|A5|D1|D2|D3|D4)\b/g;
  const hits = skill.match(RETIRED) || [];
  assert.strictEqual(
    hits.length,
    0,
    "(1) msf-wf/SKILL.md must name no retired rubric id (found: " + hits.join(", ") + ")"
  );
} catch (e) {
  failures.push("case (1) retired-id forward guard: " + (e && e.message));
}

// (2) Coordinate-adjacent substring Edit against the SVG payload.
try {
  const html = fs.readFileSync(SVG_FIXTURE, "utf8");
  // The content-region label sits immediately after its x/y coordinates:
  //   <text x="16" y="40" font-size="20" fill="#000" stroke="none">Acme Pilot Q3</text>
  const OLD_LABEL = "Acme Pilot Q3";
  const NEW_LABEL = "Acme Pilot Q4";
  assert.ok(html.includes(OLD_LABEL), "(2) fixture carries the label to edit");
  // Capture the exact coordinate token preceding the label (the "surrounding coordinates").
  const COORD = '<text x="16" y="40" font-size="20" fill="#000" stroke="none">';
  assert.ok(html.includes(COORD + OLD_LABEL), "(2) label sits directly after its x/y coords");

  // Simulate msf-wf's Edit-tool substring replace (old_string → new_string).
  const edited = html.replace(COORD + OLD_LABEL, COORD + NEW_LABEL);

  assert.ok(edited.includes(NEW_LABEL), "(2) edit landed — new label present");
  // Scoped substring Edit: the coordinate-adjacent occurrence is replaced. (The
  // manifest JSON carries an independent copy of the label — a payload-only edit
  // correctly leaves it, so assert on the SCOPED occurrence, not global absence.)
  assert.ok(!edited.includes(COORD + OLD_LABEL), "(2) coordinate-adjacent label replaced");
  assert.ok(
    edited.includes(COORD + NEW_LABEL),
    "(2) surrounding x/y coordinates are byte-intact after the edit"
  );
  // The rest of the document (every OTHER x=/y= attribute) is untouched.
  const coordCount = (s) => (s.match(/\b[xy]="\d+"/g) || []).length;
  assert.strictEqual(
    coordCount(edited),
    coordCount(html),
    "(2) no coordinate attribute added or dropped by the label edit"
  );
} catch (e) {
  failures.push("case (2) coordinate-adjacent SVG edit: " + (e && e.message));
}

if (failures.length > 0) {
  console.error("FAIL: /msf-wf svg-edit — " + failures.length + " of 2 cases");
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log("PASS: /msf-wf svg-edit — 2 cases");
