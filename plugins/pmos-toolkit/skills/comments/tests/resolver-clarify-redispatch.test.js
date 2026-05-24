#!/usr/bin/env node
// T15 — /comments resolver clarification flow + re-dispatch cap.
//
// Sub-cases:
//   (a) Clarification → AskUserQuestion → re-dispatch with operator's pick.
//       Verify dispatchSubagent called twice, askUser called once (clarification),
//       and second dispatch's input.body contains the operator's pick.
//   (b) 2 sequential Reject+refinement → on 3rd presentation, askUser's
//       options array is exactly ["Modify", "Skip"] (no "Reject with refinement").
//   (c) Clarification cap=1 — subagent returns clarification on first call,
//       operator picks; subagent returns ANOTHER clarification on second call
//       → resolver appends system reply CLARIFY_CAP_EXCEEDED_BODY (verbatim),
//       status stays "open", resolvedCount NOT incremented, askUser called
//       exactly once (the first clarification only).
//   (d) Operator picks "Reject with refinement" then submits "   " (whitespace)
//       as the note → thread goes to skipped with reason
//       "operator_reject_empty_refinement", dispatchSubagent called exactly
//       ONCE (no re-dispatch), status stays "open", resolvedCount === 0.
//
// Spec refs: FR-24, FR-29, S10, E10.

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");

const RESOLVER = path.join(__dirname, "..", "scripts", "resolver.js");
const FIXTURE_HTML = path.join(
  __dirname,
  "..",
  "..",
  "spec",
  "tests",
  "fixtures",
  "02_spec_mini.html"
);

let resolver;
try {
  resolver = require(RESOLVER);
} catch (e) {
  console.error("FAIL: cannot load resolver at " + RESOLVER);
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
}

// Verify MAX_CLARIFY is 1 (FR-29).
assert.strictEqual(resolver.MAX_CLARIFY, 1, "MAX_CLARIFY must equal 1 (FR-29)");

const CLARIFY_CAP_EXCEEDED_BODY = resolver.CLARIFY_CAP_EXCEEDED_BODY;
assert.ok(
  typeof CLARIFY_CAP_EXCEEDED_BODY === "string" && CLARIFY_CAP_EXCEEDED_BODY.length > 0,
  "CLARIFY_CAP_EXCEEDED_BODY must be exported as a non-empty string"
);

function makeTmp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), (prefix || "t15-") + "-"));
}

function makeRunGit(tmpDir) {
  const gitCalls = [];
  function runGit(args) {
    gitCalls.push(args.slice());
    if (args[0] === "rev-parse" && args[1] === "--show-toplevel") {
      return tmpDir + "\n";
    }
    if (args[0] === "add") return "";
    throw new Error("runGit: unexpected args " + JSON.stringify(args));
  }
  return { runGit, gitCalls };
}

function makeFixture(tmpDir, threads) {
  const artifactPath = path.join(tmpDir, "02_spec_mini.html");
  const sidecarPath = path.join(tmpDir, "02_spec_mini.comments.json");

  let html = fs.readFileSync(FIXTURE_HTML, "utf8");
  if (!/name=["']pmos:skill["']/.test(html)) {
    html = html.replace(
      /<meta\s+name=["']pmos-originating-skill["']\s+content=["']([^"']+)["']\s*\/?>/,
      '<meta name="pmos:skill" content="$1">'
    );
  }
  fs.writeFileSync(artifactPath, html, "utf8");

  const sidecar = {
    schema_version: 1,
    lineage: "33333333-3333-4333-8333-333333333333",
    threads: threads,
  };
  fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2) + "\n", "utf8");
  return { artifactPath, sidecarPath, html };
}

// -----------------------------------------------------------------------
// Sub-case (a): Clarification → AskUserQuestion → re-dispatch with pick.
// Expected:
//   - dispatchSubagent called twice (first returns clarification, second success)
//   - askUser called once (for the clarification question)
//   - second dispatch's input.body contains operator's pick ("Formal")
//   - thread resolved
// -----------------------------------------------------------------------
async function testClarificationFlowConfirmEach() {
  const tmp = makeTmp("t15a");
  try {
    const { artifactPath, sidecarPath, html } = makeFixture(tmp, [
      {
        id: "T_A",
        id_anchor: "problem",
        quote_anchor: null,
        status: "open",
        messages: [{ role: "user", author: "tester", body: "initial request", ts: "2026-05-24T10:00:00Z" }],
      },
    ]);

    const dispatchInputs = [];
    let dispatchCount = 0;
    async function dispatchSubagent({ skill, input }) {
      dispatchCount++;
      dispatchInputs.push({ call: dispatchCount, body: input.body, thread_id: input.thread_id });
      if (dispatchCount === 1) {
        // First call: return clarification
        return {
          clarification: {
            question: "Which style do you prefer?",
            options: ["Formal", "Casual", "Technical"],
          },
        };
      }
      // Second call: success
      return {
        success: true,
        diff_ref: "staged: T_A",
        applied_artifact: html,
        system_reply: "Applied T_A with formal style",
      };
    }

    let askCount = 0;
    let askCallNumber = 0;
    const askLog = [];
    async function askUser(question, options) {
      askCount++;
      askCallNumber++;
      askLog.push({ question, options: options ? options.slice() : [] });
      // call 1 = clarification question; call 2 = accept/reject prompt
      switch (askCallNumber) {
        case 1: return "Formal"; // clarification pick
        case 2: return "Accept"; // accept the proposed edit
        default: return options && options[0];
      }
    }

    const { runGit } = makeRunGit(tmp);

    let out;
    try {
      out = await resolver.resolve({
        path: artifactPath,
        mode: "confirm-each",
        askUser: askUser,
        dispatchSubagent: dispatchSubagent,
        runGit: runGit,
        printSummary: false,
      });
    } catch (e) {
      throw new Error("FAIL (a): resolver threw — " + (e && e.stack ? e.stack : e));
    }

    // dispatchSubagent called exactly twice
    assert.strictEqual(dispatchCount, 2, "(a) dispatchSubagent must be called twice");

    // askUser called twice: once for clarification, once for Accept/Reject prompt
    assert.strictEqual(askCount, 2, "(a) askUser called twice (clarification + accept prompt)");

    // First askUser call = clarification question
    assert.strictEqual(askLog[0].question, "Which style do you prefer?", "(a) first askUser is clarification question");
    assert.deepStrictEqual(askLog[0].options, ["Formal", "Casual", "Technical"], "(a) clarification options passed through");

    // Second dispatch's input.body must contain the operator's pick
    const secondDispatch = dispatchInputs.find((d) => d.call === 2);
    assert.ok(secondDispatch, "(a) second dispatch must exist");
    assert.strictEqual(secondDispatch.body, "Formal", "(a) second dispatch input.body is operator's clarification pick");

    // Thread resolved
    assert.strictEqual(out.resolved, 1, "(a) thread resolved");
    assert.strictEqual(out.skipped.length, 0, "(a) no skips");

    const onDisk = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    assert.strictEqual(onDisk.threads[0].status, "resolved", "(a) thread status=resolved on disk");

    console.log("PASS: (a) clarification → AskUserQuestion → re-dispatch with pick");
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* swallow */ }
  }
}

// -----------------------------------------------------------------------
// Sub-case (b): 2 sequential Reject+refinement → on 3rd presentation,
// options array is exactly ["Modify", "Skip"] (E10 re-dispatch cap).
// -----------------------------------------------------------------------
async function testRedispatchCapCollapseOptions() {
  const tmp = makeTmp("t15b");
  try {
    const { artifactPath, sidecarPath, html } = makeFixture(tmp, [
      {
        id: "T_B",
        id_anchor: "problem",
        quote_anchor: null,
        status: "open",
        messages: [{ role: "user", author: "tester", body: "improve this section", ts: "2026-05-24T10:00:00Z" }],
      },
    ]);

    let dispatchCount = 0;
    async function dispatchSubagent({ skill, input }) {
      dispatchCount++;
      // Always return success (we're testing the prompt options, not re-dispatch)
      return {
        success: true,
        diff_ref: "staged: T_B dispatch #" + dispatchCount,
        applied_artifact: html,
        system_reply: "Proposed edit #" + dispatchCount,
      };
    }

    let askCount = 0;
    const askOptionsLog = [];
    let refineCallCount = 0;
    async function askUser(question, options) {
      askCount++;
      askOptionsLog.push(options ? options.slice() : []);

      // If this is a "Enter refinement note" prompt (options=[] or no Accept in options),
      // return a note
      if (!options || options.length === 0 || options.indexOf("Accept") === -1 && options.indexOf("Modify") === -1) {
        refineCallCount++;
        return "refinement note " + refineCallCount;
      }

      // Main prompt responses: reject with refinement twice, then on 3rd we check options
      // Presentation 1: Reject with refinement
      // Presentation 2: Reject with refinement
      // Presentation 3: we want to verify options = ["Modify", "Skip"] — return "Skip" to end
      const presentationNum = askOptionsLog.filter((opts) =>
        opts && opts.indexOf("Modify") !== -1
      ).length;

      if (presentationNum <= 2 && options && options.indexOf("Reject with refinement") !== -1) {
        return "Reject with refinement";
      }
      // On third presentation (after 2 redispatches), just skip
      return "Skip";
    }

    const { runGit } = makeRunGit(tmp);

    let out;
    try {
      out = await resolver.resolve({
        path: artifactPath,
        mode: "confirm-each",
        askUser: askUser,
        dispatchSubagent: dispatchSubagent,
        runGit: runGit,
        printSummary: false,
      });
    } catch (e) {
      throw new Error("FAIL (b): resolver threw — " + (e && e.stack ? e.stack : e));
    }

    // Find all the main prompt calls (those that include "Modify" in options)
    const mainPromptCalls = askOptionsLog.filter((opts) =>
      opts && opts.indexOf("Modify") !== -1
    );

    // There must be at least 3 main prompt presentations
    assert.ok(
      mainPromptCalls.length >= 3,
      "(b) must have at least 3 main prompt presentations, got " + mainPromptCalls.length
    );

    // The third main prompt presentation must have options exactly ["Modify", "Skip"]
    const thirdPresentation = mainPromptCalls[2];
    assert.deepStrictEqual(
      thirdPresentation,
      ["Modify", "Skip"],
      "(b) 3rd presentation options must be exactly [\"Modify\", \"Skip\"] — got: " +
        JSON.stringify(thirdPresentation)
    );

    // Verify "Reject with refinement" is NOT in the third presentation
    assert.ok(
      thirdPresentation.indexOf("Reject with refinement") === -1,
      "(b) 3rd presentation must NOT contain \"Reject with refinement\""
    );

    // dispatchSubagent called 3 times (initial + 2 re-dispatches after refinement)
    assert.strictEqual(dispatchCount, 3, "(b) dispatchSubagent called 3 times (initial + 2 re-dispatches)");

    console.log("PASS: (b) 2 Reject+refinement → 3rd presentation has options [\"Modify\", \"Skip\"]");
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* swallow */ }
  }
}

// -----------------------------------------------------------------------
// Sub-case (c): Clarification cap=1 — 2nd clarification from subagent →
// system message = CLARIFY_CAP_EXCEEDED_BODY (verbatim), status stays
// "open", resolvedCount NOT incremented, askUser called exactly once.
// -----------------------------------------------------------------------
async function testClarifyCap() {
  const tmp = makeTmp("t15c");
  try {
    const { artifactPath, sidecarPath, html } = makeFixture(tmp, [
      {
        id: "T_C",
        id_anchor: "problem",
        quote_anchor: null,
        status: "open",
        messages: [{ role: "user", author: "tester", body: "initial request", ts: "2026-05-24T10:00:00Z" }],
      },
    ]);

    let dispatchCount = 0;
    async function dispatchSubagent({ skill, input }) {
      dispatchCount++;
      // First dispatch: clarification
      // Second dispatch (after operator answered): another clarification
      return {
        clarification: {
          question: "Clarification question #" + dispatchCount,
          options: ["Option A", "Option B"],
        },
      };
    }

    let askCount = 0;
    async function askUser(question, options) {
      askCount++;
      // Return first option for any clarification
      return options && options[0];
    }

    const { runGit } = makeRunGit(tmp);

    let out;
    try {
      out = await resolver.resolve({
        path: artifactPath,
        mode: "confirm-each",
        askUser: askUser,
        dispatchSubagent: dispatchSubagent,
        runGit: runGit,
        printSummary: false,
      });
    } catch (e) {
      throw new Error("FAIL (c): resolver threw — " + (e && e.stack ? e.stack : e));
    }

    // askUser called exactly once (first clarification only — second is capped)
    assert.strictEqual(askCount, 1, "(c) askUser called exactly once (cap kicks in before 2nd clarification prompt)");

    // dispatchSubagent called twice (first returns clarification, second also returns clarification → cap)
    assert.strictEqual(dispatchCount, 2, "(c) dispatchSubagent called twice");

    // resolvedCount NOT incremented
    assert.strictEqual(out.resolved, 0, "(c) resolved=0 (thread not resolved)");

    // thread in skipped with "clarify_cap_exceeded"
    assert.ok(
      out.skipped.some((s) => s.id === "T_C" && s.reason === "clarify_cap_exceeded"),
      "(c) T_C must be in skipped with reason=clarify_cap_exceeded"
    );

    // thread status stays "open" on disk
    const onDisk = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    const thread = onDisk.threads[0];
    assert.strictEqual(thread.status, "open", "(c) thread status stays open");

    // system message with exact body = CLARIFY_CAP_EXCEEDED_BODY
    const sysMsgs = (thread.messages || []).filter((m) => m && m.role === "system");
    assert.strictEqual(sysMsgs.length, 1, "(c) exactly one system message appended");
    assert.strictEqual(
      sysMsgs[0].body,
      CLARIFY_CAP_EXCEEDED_BODY,
      "(c) system message body must be verbatim CLARIFY_CAP_EXCEEDED_BODY — got: " +
        JSON.stringify(sysMsgs[0].body)
    );

    console.log("PASS: (c) clarification cap=1 — 2nd clarification → system message + status open, askUser=1");
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* swallow */ }
  }
}

// -----------------------------------------------------------------------
// Sub-case (d): "Reject with refinement" then submits whitespace note →
// thread goes to skipped with reason "operator_reject_empty_refinement",
// dispatchSubagent called exactly ONCE (no re-dispatch),
// status stays "open", resolvedCount === 0.
// -----------------------------------------------------------------------
async function testRejectWithEmptyRefinementNote() {
  const tmp = makeTmp("t15d");
  try {
    const { artifactPath, sidecarPath, html } = makeFixture(tmp, [
      {
        id: "T_D",
        id_anchor: "problem",
        quote_anchor: null,
        status: "open",
        messages: [{ role: "user", author: "tester", body: "initial request", ts: "2026-05-24T10:00:00Z" }],
      },
    ]);

    let dispatchCount = 0;
    async function dispatchSubagent({ skill, input }) {
      dispatchCount++;
      return {
        success: true,
        diff_ref: "staged: T_D dispatch #" + dispatchCount,
        applied_artifact: html,
        system_reply: "Proposed edit #" + dispatchCount,
      };
    }

    let askCount = 0;
    let askCallNumber = 0;
    async function askUser(question, options) {
      askCount++;
      askCallNumber++;
      // call 1 = main accept/reject prompt → pick "Reject with refinement"
      // call 2 = refinement note prompt → submit whitespace only
      switch (askCallNumber) {
        case 1: return "Reject with refinement";
        case 2: return "   ";
        default: return options && options[0];
      }
    }

    const { runGit } = makeRunGit(tmp);

    let out;
    try {
      out = await resolver.resolve({
        path: artifactPath,
        mode: "confirm-each",
        askUser: askUser,
        dispatchSubagent: dispatchSubagent,
        runGit: runGit,
        printSummary: false,
      });
    } catch (e) {
      throw new Error("FAIL (d): resolver threw — " + (e && e.stack ? e.stack : e));
    }

    // dispatchSubagent called exactly once (no re-dispatch after empty note)
    assert.strictEqual(dispatchCount, 1, "(d) dispatchSubagent must be called exactly once — no re-dispatch");

    // thread in skipped with "operator_reject_empty_refinement"
    assert.ok(
      out.skipped.some((s) => s.id === "T_D" && s.reason === "operator_reject_empty_refinement"),
      "(d) T_D must be in skipped with reason=operator_reject_empty_refinement — got: " +
        JSON.stringify(out.skipped)
    );

    // resolvedCount === 0
    assert.strictEqual(out.resolved, 0, "(d) resolved must be 0");

    // thread status stays "open" on disk
    const onDisk = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    assert.strictEqual(onDisk.threads[0].status, "open", "(d) thread status stays open");

    console.log("PASS: (d) Reject with refinement + whitespace note → skipped(operator_reject_empty_refinement), dispatchSubagent=1");
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* swallow */ }
  }
}

// -----------------------------------------------------------------------
// Run all sub-cases
// -----------------------------------------------------------------------
(async () => {
  try {
    await testClarificationFlowConfirmEach();
    await testRedispatchCapCollapseOptions();
    await testClarifyCap();
    await testRejectWithEmptyRefinementNote();
    console.log("\nPASS: /comments resolver clarify+redispatch — all 4 sub-cases (T15)");
  } catch (e) {
    console.error("\nFAIL: " + (e && e.stack ? e.stack : e));
    process.exit(1);
  }
})().catch((e) => {
  console.error("FAIL: uncaught — " + (e && e.stack ? e.stack : e));
  process.exit(1);
});
