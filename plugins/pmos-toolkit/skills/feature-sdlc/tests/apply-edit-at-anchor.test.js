#!/usr/bin/env node
// T21 — orchestrator contract test for /feature-sdlc's "Apply comment-resolver edit" shim.
// FR-62: ONE shim, TWO surfaces. Covers BOTH orchestrator artifacts in separate sub-cases:
//   - pipeline sub-cases:  (pipeline.a) happy, (pipeline.b) infeasible-schema-change,
//                          (pipeline.c) idempotency, (pipeline.d) orphan, (pipeline.e) clarification
//   - oq sub-cases:        (oq.a) happy, (oq.b) infeasible-structural, (oq.c) idempotency,
//                          (oq.d) orphan, (oq.e) clarification
// Contract: plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md

"use strict";

const path = require("path");
const assert = require("assert");

const SHIM_PATH = path.join(__dirname, "..", "scripts", "apply-edit-at-anchor.js");
const PIPELINE_FIXTURE = path.join(
  __dirname,
  "fixtures",
  "apply-edit-at-anchor",
  "00_pipeline_mini.html"
);
const OQ_FIXTURE = path.join(
  __dirname,
  "fixtures",
  "apply-edit-at-anchor",
  "00_open_questions_index_mini.html"
);

let apply;
try {
  ({ apply } = require(SHIM_PATH));
} catch (e) {
  console.error("FAIL: cannot load shim at " + SHIM_PATH);
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
}

function mkPipelineInput(overrides) {
  return Object.assign(
    {
      artifact_path: PIPELINE_FIXTURE,
      thread_id: "TP_A",
      anchor: { id_anchor: "phase-requirements", quote_anchor: null },
      body: "clarify status text for this phase row",
    },
    overrides || {}
  );
}

function mkOqInput(overrides) {
  return Object.assign(
    {
      artifact_path: OQ_FIXTURE,
      thread_id: "TOQ_A",
      anchor: { id_anchor: "oq-1", quote_anchor: null },
      body: "tighten wording on this open question",
    },
    overrides || {}
  );
}

(async () => {
  const failures = [];

  // ─── PIPELINE surface ───────────────────────────────────────────────────────

  // (pipeline.a) Happy id-first path — prose edit to a table row is feasible.
  try {
    const out = await apply(mkPipelineInput({}));
    assert.strictEqual(out.success, true, "(pipeline.a) success should be true");
    assert.ok(typeof out.diff_ref === "string" && out.diff_ref.length > 0, "(pipeline.a) diff_ref present");
    assert.ok(typeof out.system_reply === "string" && out.system_reply.length > 0, "(pipeline.a) system_reply present");
    assert.ok(!out.diff_ref.startsWith("no-op"), "(pipeline.a) first call must not be a no-op");
  } catch (e) {
    failures.push("case (pipeline.a) happy: " + (e && e.message));
  }

  // (pipeline.b) Infeasible schema change — add/remove column or restructure table.
  try {
    const out = await apply(
      mkPipelineInput({
        thread_id: "TP_B",
        anchor: { id_anchor: "phases" },
        body: "restructure the table to add a new column for owner",
      })
    );
    assert.strictEqual(out.success, false, "(pipeline.b) success false");
    assert.strictEqual(out.error_enum, "agent_judged_infeasible", "(pipeline.b) error_enum=agent_judged_infeasible");
    assert.ok(
      out.system_reply.indexOf("state.yaml") !== -1 || out.system_reply.indexOf("generated") !== -1,
      "(pipeline.b) system_reply references state.yaml or generated nature of table"
    );
  } catch (e) {
    failures.push("case (pipeline.b) infeasible-schema-change: " + (e && e.message));
  }

  // (pipeline.c) Idempotent: re-call (pipeline.a). Second call returns no-op shape.
  try {
    const out = await apply(mkPipelineInput({}));
    assert.strictEqual(out.success, true, "(pipeline.c) idempotent success true");
    assert.ok(
      typeof out.diff_ref === "string" && out.diff_ref.indexOf("no-op: edit already applied") !== -1,
      "(pipeline.c) diff_ref carries 'no-op: edit already applied'"
    );
  } catch (e) {
    failures.push("case (pipeline.c) idempotency: " + (e && e.message));
  }

  // (pipeline.d) Orphan — id missing + quote text not in artifact.
  try {
    const out = await apply(
      mkPipelineInput({
        thread_id: "TP_D",
        anchor: {
          id_anchor: "phase-nonexistent",
          quote_anchor: { text: "a phrase that does not appear anywhere in the pipeline artifact xyzzy plugh" },
        },
        body: "fix this row",
      })
    );
    assert.strictEqual(out.success, false, "(pipeline.d) success false on orphan");
    assert.strictEqual(out.error_enum, "anchor_orphaned", "(pipeline.d) error_enum=anchor_orphaned");
  } catch (e) {
    failures.push("case (pipeline.d) orphan: " + (e && e.message));
  }

  // (pipeline.e) Clarification path: question with 'or' splits options.
  try {
    const out = await apply(
      mkPipelineInput({
        thread_id: "TP_E",
        anchor: { id_anchor: "phase-plan" },
        body: "should this be pending or in_progress?",
      })
    );
    assert.ok(out.clarification && typeof out.clarification === "object", "(pipeline.e) clarification present");
    assert.ok(typeof out.clarification.question === "string", "(pipeline.e) clarification.question is string");
    assert.ok(Array.isArray(out.clarification.options), "(pipeline.e) options is array");
    assert.deepStrictEqual(
      out.clarification.options,
      ["pending", "in_progress"],
      "(pipeline.e) options split on ' or ' and trimmed"
    );
  } catch (e) {
    failures.push("case (pipeline.e) clarification: " + (e && e.message));
  }

  // ─── OQ-INDEX surface ────────────────────────────────────────────────────────

  // (oq.a) Happy id-first path — per-OQ note edit is feasible.
  try {
    const out = await apply(mkOqInput({}));
    assert.strictEqual(out.success, true, "(oq.a) success should be true");
    assert.ok(typeof out.diff_ref === "string" && out.diff_ref.length > 0, "(oq.a) diff_ref present");
    assert.ok(typeof out.system_reply === "string" && out.system_reply.length > 0, "(oq.a) system_reply present");
    assert.ok(!out.diff_ref.startsWith("no-op"), "(oq.a) first call must not be a no-op");
  } catch (e) {
    failures.push("case (oq.a) happy: " + (e && e.message));
  }

  // (oq.b) Infeasible structural change — restructure or reorder OQ sections.
  try {
    const out = await apply(
      mkOqInput({
        thread_id: "TOQ_B",
        anchor: { id_anchor: "requirements-oq" },
        body: "restructure the sections to group by priority instead of skill",
      })
    );
    assert.strictEqual(out.success, false, "(oq.b) success false");
    assert.strictEqual(out.error_enum, "agent_judged_infeasible", "(oq.b) error_enum=agent_judged_infeasible");
  } catch (e) {
    failures.push("case (oq.b) infeasible-structural: " + (e && e.message));
  }

  // (oq.c) Idempotent: re-call (oq.a). Second call returns no-op shape.
  try {
    const out = await apply(mkOqInput({}));
    assert.strictEqual(out.success, true, "(oq.c) idempotent success true");
    assert.ok(
      typeof out.diff_ref === "string" && out.diff_ref.indexOf("no-op: edit already applied") !== -1,
      "(oq.c) diff_ref carries 'no-op: edit already applied'"
    );
  } catch (e) {
    failures.push("case (oq.c) idempotency: " + (e && e.message));
  }

  // (oq.d) Orphan — id missing + quote text not in artifact.
  try {
    const out = await apply(
      mkOqInput({
        thread_id: "TOQ_D",
        anchor: {
          id_anchor: "oq-nonexistent",
          quote_anchor: { text: "a phrase that does not appear anywhere in the oq index artifact xyzzy plugh" },
        },
        body: "fix this question",
      })
    );
    assert.strictEqual(out.success, false, "(oq.d) success false on orphan");
    assert.strictEqual(out.error_enum, "anchor_orphaned", "(oq.d) error_enum=anchor_orphaned");
  } catch (e) {
    failures.push("case (oq.d) orphan: " + (e && e.message));
  }

  // (oq.e) Clarification path: question with 'or' splits options.
  try {
    const out = await apply(
      mkOqInput({
        thread_id: "TOQ_E",
        anchor: { id_anchor: "oq-2" },
        body: "should this be eager or lazy?",
      })
    );
    assert.ok(out.clarification && typeof out.clarification === "object", "(oq.e) clarification present");
    assert.ok(typeof out.clarification.question === "string", "(oq.e) clarification.question is string");
    assert.ok(Array.isArray(out.clarification.options), "(oq.e) options is array");
    assert.deepStrictEqual(
      out.clarification.options,
      ["eager", "lazy"],
      "(oq.e) options split on ' or ' and trimmed"
    );
  } catch (e) {
    failures.push("case (oq.e) clarification: " + (e && e.message));
  }

  if (failures.length > 0) {
    console.error(
      "FAIL: /feature-sdlc apply-edit-at-anchor — " + failures.length + " of 10 cases"
    );
    for (const f of failures) console.error("  - " + f);
    process.exit(1);
  }
  console.log("PASS: /feature-sdlc apply-edit-at-anchor — 10 cases (pipeline:5 + oq-index:5)");
})().catch((e) => {
  console.error("FAIL: uncaught " + (e && e.stack ? e.stack : e));
  process.exit(1);
});
