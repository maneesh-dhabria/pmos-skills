#!/usr/bin/env node
// T19 — per-skill contract test for /prototype "Apply comment-resolver edit" shim.
// Exercises 5 cases against the §9.1 input/output contract from
// plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md.
//
// Prototype-specific infeasible case: edit targeting JSX script block or
// simulated mock-data must return agent_judged_infeasible.

"use strict";

const path = require("path");
const assert = require("assert");

const SHIM_PATH = path.join(__dirname, "..", "scripts", "apply-edit-at-anchor.js");
const FIXTURE = path.join(__dirname, "fixtures", "apply-edit-at-anchor", "prototype_mini.html");

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
      anchor: { id_anchor: "dashboard-screen", quote_anchor: null },
      body: "tighten the description of the landing screen",
    },
    overrides || {}
  );
}

(async () => {
  const failures = [];

  // (a) Happy id-first path — T_A
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
          id_anchor: "missing-screen",
          quote_anchor: { text: "a phrase that does not appear anywhere in the prototype at all xyzzy plugh" },
        },
        body: "update this screen label",
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

  // (d) agent_judged_infeasible: JSX / mock-data heuristic.
  // Body must contain BOTH an edit-intent verb AND a target keyword (verb+keyword bigram).
  try {
    const out = await apply(
      mkInput({
        thread_id: "T_D",
        anchor: { id_anchor: "dashboard-screen" },
        body: "modify the mock-data block to add a new field",
      })
    );
    assert.strictEqual(out.success, false, "(d) success false");
    assert.strictEqual(out.error_enum, "agent_judged_infeasible", "(d) error_enum=agent_judged_infeasible");
  } catch (e) {
    failures.push("case (d) infeasible: " + (e && e.message));
  }

  // (e) Clarification path: question with 'or' splits options.
  try {
    const out = await apply(
      mkInput({
        thread_id: "T_E",
        anchor: { id_anchor: "rollout" },
        body: "should this be eager or lazy?",
      })
    );
    assert.ok(out.clarification && typeof out.clarification === "object", "(e) clarification present");
    assert.ok(typeof out.clarification.question === "string", "(e) clarification.question is string");
    assert.ok(Array.isArray(out.clarification.options), "(e) options is array");
    assert.deepStrictEqual(
      out.clarification.options,
      ["eager", "lazy"],
      "(e) options split on ' or ' and trimmed (trailing punctuation stripped)"
    );
  } catch (e) {
    failures.push("case (e) clarification: " + (e && e.message));
  }

  // (f) False-positive guard: keyword present but no edit-intent verb must NOT trip infeasible.
  // Body mentions "mock-data" and "window.__mockData" in explanatory prose — keyword present
  // but no verb like edit/modify/update directly preceding the keyword.
  try {
    const out = await apply(
      mkInput({
        thread_id: "T_F",
        anchor: { id_anchor: "dashboard-screen" },
        body: "Add a note explaining that mock-data lives in window.__mockData",
      })
    );
    // Must NOT return agent_judged_infeasible — reviewer is describing context, not requesting regen.
    assert.ok(
      out.error_enum !== "agent_judged_infeasible",
      "(f) keyword-only prose must not be judged infeasible (false-positive guard)"
    );
    // Should proceed to success or orphaned.
    assert.ok(
      out.success === true || out.error_enum === "anchor_orphaned",
      "(f) expected success or orphaned, got: " + JSON.stringify(out)
    );
  } catch (e) {
    failures.push("case (f) keyword-only prose false-positive guard: " + (e && e.message));
  }

  if (failures.length > 0) {
    console.error("FAIL: /prototype apply-edit-at-anchor — " + failures.length + " of 6 cases");
    for (const f of failures) console.error("  - " + f);
    process.exit(1);
  }
  console.log("PASS: /prototype apply-edit-at-anchor — 6 cases");
})().catch((e) => {
  console.error("FAIL: uncaught " + (e && e.stack ? e.stack : e));
  process.exit(1);
});
