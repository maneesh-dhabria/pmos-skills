#!/usr/bin/env node
// T17 — /comments resolver end-to-end integration test (FR-61 ship-blocker).
//
// Exercises all 4 modes against a curated 8-thread fixture covering every
// closed-set error_enum branch and the idempotency short-circuit.
//
// Sub-cases:
//   (a) --confirm-each : 7 open threads → 3 resolved (T_happy, T_clarify,
//       T_idempotent) + 1 pre-resolved (T_already_resolved) = 4 "resolved" in
//       final sidecar; 4 stay "open". AskUser: Accept for T_happy + clarification
//       pick + Accept for T_clarify. git add once, never commit.
//   (b) --batch : 1 wave (all anchors disjoint). T_orphan orphan-skipped before
//       planWaves. T_clarify goes into failures bucket (clarification object has
//       no .success=true and no .error_enum → treated as agent_errored). T_infeasible,
//       T_errored, T_conflict also skipped. T_happy and T_idempotent succeed
//       (NOTE: in batch the idempotency semantic-match guard is NOT run — T_idempotent
//       is dispatched and succeeds normally). AskUser: "Accept wave" once.
//   (c) --auto : idempotency fires for T_idempotent (short-circuit). AskUser only
//       for T_clarify clarification; no Accept/Reject prompts for other threads.
//   (d) --non-interactive : T_clarify dispatched, receives clarification, deferred.
//       AskUser NEVER called. Returned object exposes deferred: ["T_clarify"].
//
// Discovered batch behavior: T_clarify in --batch ends up skipped with
//   reason "agent_errored: (no reply)" because the batch branch filters
//   dispatches by out.success===true; clarification objects have neither
//   .success nor .error_enum, so the fallback enum is AGENT_ERRORED.
//
// Spec refs: §6.1, §9.1, §9.2, §9.3; FR-20, FR-22, FR-24, FR-25, FR-27,
//            FR-28, FR-31, FR-61.

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");

const RESOLVER_PATH = path.join(__dirname, "..", "scripts", "resolver.js");
const FIXTURE_HTML = path.join(__dirname, "fixtures", "integration", "artifact.html");
const FIXTURE_SIDECAR_TEMPLATE = path.join(__dirname, "fixtures", "integration", "sidecar.template.json");

let resolver;
try {
  resolver = require(RESOLVER_PATH);
} catch (e) {
  console.error("FAIL: cannot load resolver at " + RESOLVER_PATH);
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
}

// Sanity-pin the constants this test depends on.
assert.strictEqual(resolver.MAX_CLARIFY, 1, "MAX_CLARIFY must be 1 (FR-29)");
assert.strictEqual(resolver.CURRENT_SCHEMA_VERSION, 1, "CURRENT_SCHEMA_VERSION must be 1");

// ---- makeFixture ----
// Clones artifact.html and sidecar.template.json into a fresh tmp dir.
// Returns { artifactPath, sidecarPath } ready for the resolver.
function makeFixture(tmpDir) {
  const artifactPath = path.join(tmpDir, "artifact.html");
  const sidecarPath = path.join(tmpDir, "artifact.comments.json");
  const html = fs.readFileSync(FIXTURE_HTML, "utf8");
  const template = fs.readFileSync(FIXTURE_SIDECAR_TEMPLATE, "utf8");
  fs.writeFileSync(artifactPath, html, "utf8");
  fs.writeFileSync(sidecarPath, template, "utf8");
  return { artifactPath, sidecarPath };
}

function makeTmp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), (prefix || "t17-") + "-"));
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

// ---- mock dispatch factories ----
// Returns a dispatchSubagent that replays the pre-scripted responses.
// Also returns a call log for assertions.
//
// Mock responses:
//   T_happy    → success (first call)
//   T_orphan   → never dispatched (anchor_orphaned pre-validates before dispatch)
//   T_infeasible → {success:false, error_enum:"agent_judged_infeasible", system_reply:"..."}
//   T_errored  → throw (simulates subagent crash)
//   T_clarify  → {clarification:{question:"...", options:["pick a","pick b"]}} on 1st call,
//                {success:true, applied_artifact:updatedHtml, system_reply:"..."} on 2nd call
//   T_conflict → {success:false, error_enum:"edit_conflicted"}
//   T_idempotent → success (may be called in batch/auto/non-interactive modes)
//   T_already_resolved → never dispatched (status="resolved", not in openIdxs)
function makeDispatch(originalHtml) {
  const calls = {};
  const log = [];

  async function dispatchSubagent({ skill, input }) {
    const tid = input.thread_id;
    calls[tid] = (calls[tid] || 0) + 1;
    log.push({ tid, callNum: calls[tid], body: input.body });

    assert.strictEqual(skill, "spec", "skill slug must be 'spec' (from pmos:skill meta tag)");

    if (tid === "T_happy") {
      return {
        success: true,
        diff_ref: "staged: T_happy",
        applied_artifact: originalHtml,
        system_reply: "Tightened wording in #happy.",
      };
    }
    if (tid === "T_orphan") {
      // Should never be reached — orphan is detected pre-dispatch
      throw new Error("T_orphan must not be dispatched (orphan pre-validated)");
    }
    if (tid === "T_infeasible") {
      return {
        success: false,
        error_enum: "agent_judged_infeasible",
        system_reply: "Cannot apply: would violate FR-X. Next: split into two threads.",
      };
    }
    if (tid === "T_errored") {
      throw new Error("simulated subagent crash for T_errored");
    }
    if (tid === "T_clarify") {
      if (calls[tid] === 1) {
        return {
          clarification: {
            question: "Which level of detail do you prefer?",
            options: ["pick a", "pick b"],
          },
        };
      }
      // Second call (after operator pick) — success
      return {
        success: true,
        diff_ref: "staged: T_clarify",
        applied_artifact: originalHtml,
        system_reply: "Expanded clarification section.",
      };
    }
    if (tid === "T_conflict") {
      return {
        success: false,
        error_enum: "edit_conflicted",
      };
    }
    if (tid === "T_idempotent") {
      // In batch mode this thread IS dispatched (batch skips the semantic-match check)
      return {
        success: true,
        diff_ref: "staged: T_idempotent",
        applied_artifact: originalHtml,
        system_reply: "No change needed — content already present.",
      };
    }
    if (tid === "T_already_resolved") {
      throw new Error("T_already_resolved must not be dispatched (status=resolved, not open)");
    }
    throw new Error("unexpected thread_id in dispatch: " + tid);
  }

  return { dispatchSubagent, calls, log };
}

// ---- sub-case (a): --confirm-each ----
// Walk all 8 threads. 7 are open (T_already_resolved skipped by filter).
//
// Expected dispatch calls:
//   T_happy: 1 (success → Accept)
//   T_orphan: 0 (orphan pre-validated)
//   T_infeasible: 1 (failure → skip)
//   T_errored: 1 (throws → skip)
//   T_clarify: 2 (1st → clarification, 2nd → success → Accept)
//   T_conflict: 1 (failure → skip)
//   T_idempotent: 0 (semantic short-circuit)
//
// Expected askUser calls:
//   1. T_happy  Accept prompt → "Accept"
//   2. T_clarify clarification question → "pick a"
//   3. T_clarify Accept prompt → "Accept"
//   Total: 3 calls
//
// Expected final sidecar:
//   status="resolved": T_happy, T_clarify, T_idempotent, T_already_resolved → 4 total
//   status="open":     T_orphan, T_infeasible, T_errored, T_conflict        → 4 total
async function testConfirmEach() {
  const tmp = makeTmp("t17a");
  try {
    const { artifactPath, sidecarPath } = makeFixture(tmp);
    const html = fs.readFileSync(artifactPath, "utf8");
    const { dispatchSubagent, calls, log } = makeDispatch(html);
    const { runGit, gitCalls } = makeRunGit(tmp);

    const askLog = [];
    let askCallNum = 0;
    async function askUser(question, options) {
      askCallNum++;
      askLog.push({ callNum: askCallNum, question, options: options ? options.slice() : [] });

      // T_happy: first Accept prompt
      if (askCallNum === 1) return "Accept";
      // T_clarify: clarification question
      if (askCallNum === 2) {
        assert.ok(
          options && options.indexOf("pick a") !== -1,
          "(a) clarification options must include 'pick a'"
        );
        return "pick a";
      }
      // T_clarify: Accept prompt after re-dispatch
      if (askCallNum === 3) return "Accept";
      // Unexpected
      throw new Error("(a) askUser called unexpectedly (call #" + askCallNum + "): " + question);
    }

    let out;
    try {
      out = await resolver.resolve({
        path: artifactPath,
        mode: "confirm-each",
        askUser,
        dispatchSubagent,
        runGit,
        printSummary: false,
      });
    } catch (e) {
      throw new Error("(a) resolver threw — " + (e && e.stack ? e.stack : e));
    }

    // Dispatch call counts
    assert.strictEqual(calls["T_happy"] || 0, 1, "(a) T_happy dispatched once");
    assert.ok(!(calls["T_orphan"]), "(a) T_orphan must not be dispatched");
    assert.strictEqual(calls["T_infeasible"] || 0, 1, "(a) T_infeasible dispatched once");
    assert.strictEqual(calls["T_errored"] || 0, 1, "(a) T_errored dispatched once");
    assert.strictEqual(calls["T_clarify"] || 0, 2, "(a) T_clarify dispatched twice (clarify + re-dispatch)");
    assert.strictEqual(calls["T_conflict"] || 0, 1, "(a) T_conflict dispatched once");
    assert.ok(!(calls["T_idempotent"]), "(a) T_idempotent must NOT be dispatched (semantic short-circuit)");
    assert.ok(!(calls["T_already_resolved"]), "(a) T_already_resolved must not be dispatched");

    // Ask counts
    assert.strictEqual(askCallNum, 3, "(a) askUser called exactly 3 times");

    // Resolver return values
    assert.strictEqual(out.total_open, 7, "(a) total_open = 7 (T_already_resolved excluded)");
    assert.strictEqual(out.resolved, 3, "(a) resolved = 3 (T_happy + T_clarify + T_idempotent)");
    assert.strictEqual(out.skipped.length, 4, "(a) 4 skipped (T_orphan + T_infeasible + T_errored + T_conflict)");

    // git add once, never commit
    const addCalls = gitCalls.filter((a) => a[0] === "add");
    assert.strictEqual(addCalls.length, 1, "(a) git add called exactly once");
    assert.deepStrictEqual(
      addCalls[0],
      ["add", artifactPath, sidecarPath],
      "(a) git add args = [artifact, sidecar]"
    );
    assert.strictEqual(gitCalls.filter((a) => a[0] === "commit").length, 0, "(a) never git commit");

    // Final sidecar on disk
    const onDisk = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    const resolvedThreads = onDisk.threads.filter((t) => t.status === "resolved");
    const openThreads = onDisk.threads.filter((t) => t.status === "open");
    assert.strictEqual(resolvedThreads.length, 4, "(a) 4 threads resolved in final sidecar");
    assert.strictEqual(openThreads.length, 4, "(a) 4 threads still open in final sidecar");

    // Confirm which threads are resolved
    const resolvedIds = resolvedThreads.map((t) => t.id).sort();
    assert.deepStrictEqual(
      resolvedIds,
      ["T_already_resolved", "T_clarify", "T_happy", "T_idempotent"],
      "(a) resolved thread ids"
    );

    // T_idempotent must have the idempotency system message (no dispatch happened)
    const tIdem = onDisk.threads.find((t) => t.id === "T_idempotent");
    assert.ok(tIdem, "(a) T_idempotent must exist in sidecar");
    assert.strictEqual(tIdem.status, "resolved", "(a) T_idempotent status=resolved");
    const idemSysMsgs = (tIdem.messages || []).filter((m) => m && m.role === "system");
    assert.strictEqual(idemSysMsgs.length, 1, "(a) T_idempotent has exactly 1 system message");
    assert.ok(
      idemSysMsgs[0].body.indexOf("already present") !== -1,
      "(a) T_idempotent system message mentions 'already present' — got: " + idemSysMsgs[0].body
    );

    // Skipped must include all 4 non-resolved open threads
    const skippedIds = out.skipped.map((s) => s.id).sort();
    assert.deepStrictEqual(
      skippedIds,
      ["T_conflict", "T_errored", "T_infeasible", "T_orphan"],
      "(a) skipped thread ids"
    );

    // T_orphan skip reason must include anchor_orphaned
    const orphanSkip = out.skipped.find((s) => s.id === "T_orphan");
    assert.ok(
      orphanSkip && orphanSkip.reason.indexOf("anchor_orphaned") !== -1,
      "(a) T_orphan skip reason contains anchor_orphaned — got: " + (orphanSkip && orphanSkip.reason)
    );

    // T_infeasible skip reason must include agent_judged_infeasible
    const infeasSkip = out.skipped.find((s) => s.id === "T_infeasible");
    assert.ok(
      infeasSkip && infeasSkip.reason.indexOf("agent_judged_infeasible") !== -1,
      "(a) T_infeasible skip reason contains agent_judged_infeasible"
    );

    // T_errored skip reason must include agent_errored
    const erroredSkip = out.skipped.find((s) => s.id === "T_errored");
    assert.ok(
      erroredSkip && erroredSkip.reason.indexOf("agent_errored") !== -1,
      "(a) T_errored skip reason contains agent_errored"
    );

    // T_conflict skip reason must include edit_conflicted
    const conflictSkip = out.skipped.find((s) => s.id === "T_conflict");
    assert.ok(
      conflictSkip && conflictSkip.reason.indexOf("edit_conflicted") !== -1,
      "(a) T_conflict skip reason contains edit_conflicted"
    );

    console.log("PASS: (a) --confirm-each: 3 resolved + 1 pre-resolved = 4 final, 4 open, askUser=3");
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* swallow */ }
  }
}

// ---- sub-case (b): --batch ----
// All anchors disjoint → 1 wave.
// T_orphan skipped before planWaves.
// 6 threads enter planWaves: T_happy, T_infeasible, T_errored, T_clarify,
//   T_conflict, T_idempotent.
// All disjoint → 1 wave.
// Dispatch in parallel: T_happy→success, T_infeasible→failure, T_errored→throw,
//   T_clarify→{clarification} (→ not success → treated as agent_errored failure),
//   T_conflict→failure, T_idempotent→success.
// Successes: T_happy, T_idempotent → combined wave prompt.
// AskUser called once: "Accept wave" → both applied.
//
// Discovered: T_clarify in --batch ends up in skipped with
//   reason "agent_errored: (no reply)" because clarification objects have
//   neither .success===true nor .error_enum, so the fallback enum is AGENT_ERRORED.
//
// NOTE: idempotency semantic-match is NOT checked in batch mode — T_idempotent
//   is dispatched normally and succeeds.
async function testBatch() {
  const tmp = makeTmp("t17b");
  try {
    const { artifactPath, sidecarPath } = makeFixture(tmp);
    const html = fs.readFileSync(artifactPath, "utf8");
    const { dispatchSubagent, calls, log } = makeDispatch(html);
    const { runGit, gitCalls } = makeRunGit(tmp);

    const askLog = [];
    async function askUser(question, options) {
      askLog.push({ question, options: options ? options.slice() : [] });
      // Only the wave-level prompt should fire.
      assert.ok(
        options && options.indexOf("Accept wave") !== -1,
        "(b) batch wave prompt must include 'Accept wave' — got options: " + JSON.stringify(options)
      );
      return "Accept wave";
    }

    let out;
    try {
      out = await resolver.resolve({
        path: artifactPath,
        mode: "batch",
        askUser,
        dispatchSubagent,
        runGit,
        printSummary: false,
      });
    } catch (e) {
      throw new Error("(b) resolver threw — " + (e && e.stack ? e.stack : e));
    }

    // Verify askUser was called exactly once (1 wave)
    assert.strictEqual(askLog.length, 1, "(b) askUser called exactly once (one combined wave prompt)");
    assert.strictEqual(out.waves, 1, "(b) waves = 1 (all anchors disjoint)");

    // T_orphan: skipped before planWaves
    assert.ok(!(calls["T_orphan"]), "(b) T_orphan must not be dispatched");
    // T_happy: dispatched and succeeded
    assert.strictEqual(calls["T_happy"] || 0, 1, "(b) T_happy dispatched once");
    // T_idempotent: dispatched in batch (no semantic-match check) and succeeded
    assert.strictEqual(calls["T_idempotent"] || 0, 1, "(b) T_idempotent dispatched once in batch mode");
    // T_infeasible, T_errored, T_clarify, T_conflict: all dispatched
    assert.strictEqual(calls["T_infeasible"] || 0, 1, "(b) T_infeasible dispatched once");
    assert.strictEqual(calls["T_errored"] || 0, 1, "(b) T_errored dispatched once");
    assert.strictEqual(calls["T_clarify"] || 0, 1, "(b) T_clarify dispatched once (1st call only; no re-dispatch in batch)");
    assert.strictEqual(calls["T_conflict"] || 0, 1, "(b) T_conflict dispatched once");

    // Resolved: T_happy + T_idempotent = 2
    assert.strictEqual(out.resolved, 2, "(b) resolved = 2 (T_happy + T_idempotent)");

    // Skipped: T_orphan + T_infeasible + T_errored + T_clarify + T_conflict = 5
    assert.strictEqual(out.skipped.length, 5, "(b) skipped = 5 (orphan + infeasible + errored + clarify-as-agent_errored + conflict)");

    // T_clarify in batch ends up as agent_errored (no .error_enum on clarification object)
    const clarifSkip = out.skipped.find((s) => s.id === "T_clarify");
    assert.ok(
      clarifSkip,
      "(b) T_clarify must be in skipped list"
    );
    assert.ok(
      clarifSkip.reason.indexOf("agent_errored") !== -1,
      "(b) T_clarify batch skip reason = agent_errored (clarification treated as non-success with no error_enum) — got: " + clarifSkip.reason
    );

    // Final sidecar: T_happy + T_idempotent resolved; T_already_resolved was already resolved
    const onDisk = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    const resolvedThreads = onDisk.threads.filter((t) => t.status === "resolved");
    assert.strictEqual(resolvedThreads.length, 3, "(b) 3 threads resolved in final sidecar (T_happy + T_idempotent + T_already_resolved)");

    // git add once, never commit
    const addCalls = gitCalls.filter((a) => a[0] === "add");
    assert.strictEqual(addCalls.length, 1, "(b) git add called exactly once");
    assert.strictEqual(gitCalls.filter((a) => a[0] === "commit").length, 0, "(b) never git commit");

    console.log("PASS: (b) --batch: 1 wave, 2 resolved (T_happy+T_idempotent), 5 skipped; T_clarify→agent_errored; askUser=1");
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* swallow */ }
  }
}

// ---- sub-case (c): --auto ----
// No Accept/Reject prompts for confident resolves. AskUser only called for
// T_clarify's clarification question.
// T_idempotent short-circuits (semantic-match, no dispatch).
// T_orphan, T_infeasible, T_errored, T_conflict → skipped.
// T_happy → applied without prompt.
// T_clarify → clarification → askUser once → re-dispatch → applied without prompt.
//
// Expected askUser calls: 1 (T_clarify clarification question)
// Expected resolved: 3 (T_happy + T_clarify + T_idempotent)
async function testAuto() {
  const tmp = makeTmp("t17c");
  try {
    const { artifactPath, sidecarPath } = makeFixture(tmp);
    const html = fs.readFileSync(artifactPath, "utf8");
    const { dispatchSubagent, calls } = makeDispatch(html);
    const { runGit, gitCalls } = makeRunGit(tmp);

    let askCallNum = 0;
    const askLog = [];
    async function askUser(question, options) {
      askCallNum++;
      askLog.push({ callNum: askCallNum, question, options: options ? options.slice() : [] });

      // In --auto the ONLY valid askUser call is for T_clarify's clarification
      assert.ok(
        options && options.indexOf("pick a") !== -1,
        "(c) in --auto, askUser must only be called for the T_clarify clarification (options must include 'pick a') — got: " + JSON.stringify(options)
      );
      return "pick a";
    }

    let out;
    try {
      out = await resolver.resolve({
        path: artifactPath,
        mode: "auto",
        askUser,
        dispatchSubagent,
        runGit,
        printSummary: false,
      });
    } catch (e) {
      throw new Error("(c) resolver threw — " + (e && e.stack ? e.stack : e));
    }

    // askUser called exactly once (T_clarify clarification)
    assert.strictEqual(askCallNum, 1, "(c) askUser called exactly once (T_clarify clarification only)");

    // Dispatch counts
    assert.strictEqual(calls["T_happy"] || 0, 1, "(c) T_happy dispatched once");
    assert.ok(!(calls["T_orphan"]), "(c) T_orphan not dispatched (orphan)");
    assert.strictEqual(calls["T_infeasible"] || 0, 1, "(c) T_infeasible dispatched once");
    assert.strictEqual(calls["T_errored"] || 0, 1, "(c) T_errored dispatched once");
    assert.strictEqual(calls["T_clarify"] || 0, 2, "(c) T_clarify dispatched twice");
    assert.strictEqual(calls["T_conflict"] || 0, 1, "(c) T_conflict dispatched once");
    assert.ok(!(calls["T_idempotent"]), "(c) T_idempotent not dispatched (semantic short-circuit)");

    // Resolved count
    assert.strictEqual(out.resolved, 3, "(c) resolved = 3");
    assert.strictEqual(out.total_open, 7, "(c) total_open = 7");

    // Final sidecar
    const onDisk = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    const resolvedIds = onDisk.threads.filter((t) => t.status === "resolved").map((t) => t.id).sort();
    assert.deepStrictEqual(
      resolvedIds,
      ["T_already_resolved", "T_clarify", "T_happy", "T_idempotent"],
      "(c) resolved thread ids"
    );
    const openIds = onDisk.threads.filter((t) => t.status === "open").map((t) => t.id).sort();
    assert.deepStrictEqual(
      openIds,
      ["T_conflict", "T_errored", "T_infeasible", "T_orphan"],
      "(c) open thread ids"
    );

    // git add once, never commit
    assert.strictEqual(gitCalls.filter((a) => a[0] === "add").length, 1, "(c) git add once");
    assert.strictEqual(gitCalls.filter((a) => a[0] === "commit").length, 0, "(c) never commit");

    console.log("PASS: (c) --auto: 3 resolved, askUser=1 (T_clarify clarification only), T_idempotent short-circuited");
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* swallow */ }
  }
}

// ---- sub-case (d): --non-interactive ----
// T_clarify is dispatched, receives clarification, deferred.
// AskUser NEVER called.
// Returned object exposes deferred: ["T_clarify"].
// Printed summary lists T_clarify under deferred.
//
// Expected resolved: 2 (T_happy + T_idempotent, since auto-applies without prompt)
// Expected deferred: ["T_clarify"]
// Expected open: T_orphan, T_infeasible, T_errored, T_conflict, T_clarify (deferred stays open)
async function testNonInteractive() {
  const tmp = makeTmp("t17d");
  try {
    const { artifactPath, sidecarPath } = makeFixture(tmp);
    const html = fs.readFileSync(artifactPath, "utf8");
    const { dispatchSubagent, calls } = makeDispatch(html);
    const { runGit, gitCalls } = makeRunGit(tmp);

    async function askUser() {
      throw new Error("(d) askUser must NEVER be called in --non-interactive mode");
    }

    // Capture stdout to verify summary mentions T_clarify
    const capturedLines = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = function (chunk) {
      capturedLines.push(String(chunk));
      return true;
    };

    let out;
    try {
      out = await resolver.resolve({
        path: artifactPath,
        mode: "non-interactive",
        askUser,
        dispatchSubagent,
        runGit,
        printSummary: true,
      });
    } catch (e) {
      process.stdout.write = origWrite;
      throw new Error("(d) resolver threw — " + (e && e.stack ? e.stack : e));
    } finally {
      process.stdout.write = origWrite;
    }

    // askUser never called — the throw ensures this (if called the test would fail above)

    // T_clarify dispatched exactly once (receives clarification → deferred without re-dispatch)
    assert.strictEqual(calls["T_clarify"] || 0, 1, "(d) T_clarify dispatched once (clarification received, then deferred)");

    // Deferred array
    assert.ok(out.deferred && Array.isArray(out.deferred), "(d) out.deferred must be an array");
    assert.deepStrictEqual(out.deferred, ["T_clarify"], "(d) deferred = [T_clarify]");

    // T_idempotent short-circuits in non-interactive too (same _resolveSingleThread path)
    assert.ok(!(calls["T_idempotent"]), "(d) T_idempotent not dispatched (semantic short-circuit applies in non-interactive too)");
    // Resolved: T_happy (auto-applied) + T_idempotent (short-circuit) = 2
    assert.strictEqual(out.resolved, 2, "(d) resolved = 2 (T_happy + T_idempotent short-circuit)");

    // Final sidecar: T_clarify status stays "open"
    const onDisk = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    const tClarify = onDisk.threads.find((t) => t.id === "T_clarify");
    assert.strictEqual(tClarify.status, "open", "(d) T_clarify status stays open (deferred)");

    // Exact system message on T_clarify
    const DEFERRED_MSG = "deferred — operator input required (re-run interactively for this thread)";
    const sysMsgs = (tClarify.messages || []).filter((m) => m && m.role === "system");
    assert.strictEqual(sysMsgs.length, 1, "(d) T_clarify has exactly 1 system message");
    assert.strictEqual(sysMsgs[0].body, DEFERRED_MSG, "(d) exact deferred system message body");

    // Printed summary mentions T_clarify
    const summaryText = capturedLines.join("");
    assert.ok(
      summaryText.indexOf("T_clarify") !== -1,
      "(d) printed summary must list T_clarify as deferred — got: " + summaryText
    );

    // git add once, never commit
    assert.strictEqual(gitCalls.filter((a) => a[0] === "add").length, 1, "(d) git add once");
    assert.strictEqual(gitCalls.filter((a) => a[0] === "commit").length, 0, "(d) never commit");

    console.log("PASS: (d) --non-interactive: T_clarify deferred, askUser=0, deferred array + summary correct");
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* swallow */ }
  }
}

// ---- run all sub-cases ----
(async () => {
  try {
    await testConfirmEach();
    await testBatch();
    await testAuto();
    await testNonInteractive();
    console.log("\nPASS: /comments resolver integration — all 4 sub-cases (T17, FR-61)");
  } catch (e) {
    console.error("\nFAIL: " + (e && e.stack ? e.stack : e));
    process.exit(1);
  }
})().catch((e) => {
  console.error("FAIL: uncaught — " + (e && e.stack ? e.stack : e));
  process.exit(1);
});
