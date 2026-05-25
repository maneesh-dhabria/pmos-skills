#!/usr/bin/env node
// T20 — per-skill contract test for /survey-analyse's "Apply comment-resolver edit" shim.
// Exercises 5 cases against the §9.1 input/output contract from
// plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md.
// Includes a skill-specific infeasible sub-case: edits to chart data are refused.

"use strict";

const path = require("path");
const assert = require("assert");

const SHIM_PATH = path.join(__dirname, "..", "scripts", "apply-edit-at-anchor.js");
const FIXTURE = path.join(__dirname, "fixtures", "apply-edit-at-anchor", "survey-analyse_mini.html");

let apply;
try {
  ({ apply } = require(SHIM_PATH));
} catch (e) {
  console.error("FAIL: cannot load shim at " + SHIM_PATH);
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
}

function mkInput(overrides) {
  return Object.assign(
    {
      artifact_path: FIXTURE,
      thread_id: "T_A",
      anchor: { id_anchor: "executive-summary", quote_anchor: null },
      body: "tighten this wording",
    },
    overrides || {}
  );
}

(async () => {
  const failures = [];

  // (a) Happy id-first path — prose section (executive-summary) — T_A
  try {
    const out = await apply(mkInput({}));
    assert.strictEqual(out.success, true, "(a) success should be true");
    assert.ok(typeof out.diff_ref === "string" && out.diff_ref.length > 0, "(a) diff_ref present");
    assert.ok(typeof out.system_reply === "string" && out.system_reply.length > 0, "(a) system_reply present");
    assert.ok(!out.diff_ref.startsWith("no-op"), "(a) first call must not be a no-op");
  } catch (e) {
    failures.push("case (a) happy id-first: " + (e && e.message));
  }

  // (b) Orphan — T_C: id missing + quote text absent
  try {
    const out = await apply(
      mkInput({
        thread_id: "T_C",
        anchor: {
          id_anchor: "missing-section",
          quote_anchor: { text: "a phrase that does not appear anywhere in the artifact at all xyzzy plugh" },
        },
        body: "fix this",
      })
    );
    assert.strictEqual(out.success, false, "(b) success false on orphan");
    assert.strictEqual(out.error_enum, "anchor_orphaned", "(b) error_enum=anchor_orphaned");
  } catch (e) {
    failures.push("case (b) orphan: " + (e && e.message));
  }

  // (c) Idempotent: re-call (a). Second call returns no-op shape.
  try {
    const out = await apply(mkInput({}));
    assert.strictEqual(out.success, true, "(c) idempotent success true");
    assert.ok(
      typeof out.diff_ref === "string" && out.diff_ref.indexOf("no-op: edit already applied") !== -1,
      "(c) diff_ref carries 'no-op: edit already applied'"
    );
  } catch (e) {
    failures.push("case (c) idempotent: " + (e && e.message));
  }

  // (d) Skill-specific infeasible: chart data edit (read-only region).
  // Edits targeting chart-* ids are refused — chart data is generated from
  // the response set and must be updated by re-running /survey-analyse.
  try {
    const out = await apply(
      mkInput({
        thread_id: "T_D",
        anchor: { id_anchor: "chart-q-barrier", quote_anchor: null },
        body: "update the percentages in this chart",
      })
    );
    assert.strictEqual(out.success, false, "(d) success false on chart data edit");
    assert.strictEqual(out.error_enum, "agent_judged_infeasible", "(d) error_enum=agent_judged_infeasible");
    assert.ok(
      typeof out.system_reply === "string" && out.system_reply.indexOf("re-run /survey-analyse") !== -1,
      "(d) system_reply mentions re-run /survey-analyse"
    );
  } catch (e) {
    failures.push("case (d) infeasible chart data: " + (e && e.message));
  }

  // (e) Clarification path: question with 'or' splits options.
  try {
    const out = await apply(
      mkInput({
        thread_id: "T_E",
        anchor: { id_anchor: "methodology" },
        body: "should this be brief or detailed?",
      })
    );
    assert.ok(out.clarification && typeof out.clarification === "object", "(e) clarification present");
    assert.ok(typeof out.clarification.question === "string", "(e) clarification.question is string");
    assert.ok(Array.isArray(out.clarification.options), "(e) options is array");
    assert.deepStrictEqual(
      out.clarification.options,
      ["brief", "detailed"],
      "(e) options split on ' or ' and trimmed (trailing punctuation stripped)"
    );
  } catch (e) {
    failures.push("case (e) clarification: " + (e && e.message));
  }

  // (f) False-positive guard: anchor immediately after </script> close tag must NOT be infeasible.
  // Regression for the `<script` prefix bug — without \b, lastIndexOf("<script") could match
  // inside "</script>" and incorrectly conclude the anchor is inside a script block.
  try {
    const out = await apply(
      mkInput({
        thread_id: "T_F",
        // "methodology" section in the fixture appears immediately after the </script> close tag
        // for the chart-q-barrier-data block — exercises the post-</script> boundary case.
        anchor: { id_anchor: "methodology", quote_anchor: null },
        body: "clarify the correction method used",
      })
    );
    // Must NOT return agent_judged_infeasible — the anchor is outside any script block.
    assert.ok(
      out.error_enum !== "agent_judged_infeasible",
      "(f) anchor after </script> must not be judged infeasible (false-positive guard)"
    );
    // Should resolve normally — success or orphaned (not infeasible).
    assert.ok(
      out.success === true || out.error_enum === "anchor_orphaned",
      "(f) expected success or orphaned, got: " + JSON.stringify(out)
    );
  } catch (e) {
    failures.push("case (f) post-script-close false-positive guard: " + (e && e.message));
  }

  if (failures.length > 0) {
    console.error("FAIL: /survey-analyse apply-edit-at-anchor — " + failures.length + " of 6 cases");
    for (const f of failures) console.error("  - " + f);
    process.exit(1);
  }
  console.log("PASS: /survey-analyse apply-edit-at-anchor — 6 cases");
})().catch((e) => {
  console.error("FAIL: uncaught " + (e && e.stack ? e.stack : e));
  process.exit(1);
});
