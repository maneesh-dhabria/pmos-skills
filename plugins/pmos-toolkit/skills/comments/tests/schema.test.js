#!/usr/bin/env node
// T16 — schema.test.js
//
// In-process tests for:
//   (a) error_enum=anchor_orphaned: subagent returns anchor_orphaned →
//       thread status stays "open", skipped[0].reason includes "anchor_orphaned:"
//       prefix + system_reply; system message appended; resolver continues.
//   (b) error_enum=agent_judged_infeasible: system_reply (rationale + suggested
//       next action) appears in skipped reason; system message appended.
//   (c) error_enum=agent_errored: subagent throws → wrapped as agent_errored
//       with e.message excerpt (first 200 chars); system message appended.
//   (d) error_enum=edit_conflicted: subagent returns edit_conflicted →
//       console.warn logs "resolver: WARNING wave-planner bug …" + thread id;
//       thread skipped (status open).
//   (e1) _semanticMatchScore: body whose keywords are 100% present in region
//       → returns 1.0; resolver short-circuits (subagent NOT dispatched,
//       thread resolved with "Edit already present" system message).
//   (e2) score in 60–80% range → resolver dispatches subagent (no short-circuit).
//   (e3) score < 60% → resolver dispatches as today.
//   (schema-version pass-through) schema_version=1 sidecar loads without error.
//
// Spec refs: §9.2, §9.3, E4, S3, FR-NEW-B.

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");

const RESOLVER_PATH = path.join(__dirname, "..", "scripts", "resolver.js");
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
  resolver = require(RESOLVER_PATH);
} catch (e) {
  console.error("FAIL: cannot load resolver at " + RESOLVER_PATH);
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
}

// Verify exported symbols.
assert.ok(resolver.CURRENT_SCHEMA_VERSION === 1, "CURRENT_SCHEMA_VERSION must equal 1");
assert.ok(resolver.STOPWORDS instanceof Set, "STOPWORDS must be exported as a Set");
assert.ok(resolver.STOPWORDS.has("the"), "STOPWORDS must contain 'the'");
assert.ok(resolver.STOPWORDS.has("and"), "STOPWORDS must contain 'and'");
assert.ok(resolver.MAX_REDISPATCH === 2, "MAX_REDISPATCH must equal 2");
assert.ok(
  typeof resolver._internal._semanticMatchScore === "function",
  "_semanticMatchScore must be exported via _internal"
);
assert.ok(
  typeof resolver._internal._buildPromptOptions === "function",
  "_buildPromptOptions must be exported via _internal"
);

const { _semanticMatchScore } = resolver._internal;

// ---- utilities ----

function makeTmp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), (prefix || "t16-") + "-"));
}

function makeRunGit(tmpDir) {
  function runGit(args) {
    if (args[0] === "rev-parse" && args[1] === "--show-toplevel") {
      return tmpDir + "\n";
    }
    if (args[0] === "add") return "";
    throw new Error("runGit: unexpected args " + JSON.stringify(args));
  }
  return { runGit };
}

function makeFixture(tmpDir, threads, schemaVersion) {
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

  const sv = typeof schemaVersion === "number" ? schemaVersion : 1;
  const sidecar = {
    schema_version: sv,
    lineage: "44444444-4444-4444-8444-444444444444",
    threads: threads,
  };
  fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2) + "\n", "utf8");
  return { artifactPath, sidecarPath, html };
}

// -------------------------------------------------------------------------
// _semanticMatchScore unit tests (standalone, no resolve() call).
// -------------------------------------------------------------------------
function testSemanticMatchScoreUnit() {
  // All keywords present → 1.0
  const region = "Users currently have no way to attach inline review comments to generated HTML";
  const body = "attach inline review comments";
  // body tokens after stopwords removal: ["attach", "inline", "review", "comments"]
  // all 4 appear in region → score = 4/4 = 1.0
  const s1 = _semanticMatchScore(body, region);
  assert.ok(s1 === 1.0, "score should be 1.0 when all keywords present — got " + s1);

  // No keywords (all stopwords) → 0
  const s2 = _semanticMatchScore("the and or but", region);
  assert.ok(s2 === 0, "score should be 0 when body is all stopwords — got " + s2);

  // Empty body → 0
  const s3 = _semanticMatchScore("", region);
  assert.ok(s3 === 0, "score should be 0 for empty body — got " + s3);

  // Mixed: 2 of 4 keywords present
  const body2 = "attach missing keywords xyz";
  // tokens after stopwords: ["attach", "missing", "keywords", "xyz"]
  // "attach" present, "missing"/"keywords"/"xyz" not → 1/4 = 0.25
  const s4 = _semanticMatchScore(body2, region);
  assert.ok(s4 >= 0.24 && s4 <= 0.26, "score should be ~0.25 for 1/4 keywords — got " + s4);

  console.log("PASS: _semanticMatchScore unit tests");
}

// -------------------------------------------------------------------------
// Sub-case (a): subagent returns error_enum=anchor_orphaned.
// -------------------------------------------------------------------------
async function testAnchorOrphanedFromSubagent() {
  const tmp = makeTmp("t16a");
  try {
    const { artifactPath, sidecarPath, html } = makeFixture(tmp, [
      {
        id: "T_AO",
        id_anchor: "nonexistent-anchor-xyz",
        quote_anchor: null,
        status: "open",
        messages: [{ role: "user", author: "tester", body: "fix this section", ts: "2026-05-24T10:00:00Z" }],
      },
      {
        id: "T_AO2",
        id_anchor: "problem",
        quote_anchor: null,
        status: "open",
        messages: [{ role: "user", author: "tester", body: "fix problem section", ts: "2026-05-24T10:00:00Z" }],
      },
    ]);

    let dispatchCount = 0;
    async function dispatchSubagent({ skill, input }) {
      dispatchCount++;
      // T_AO will be orphaned at pre-validate (id doesn't exist).
      // T_AO2 will dispatch and succeed.
      if (input.thread_id === "T_AO2") {
        return {
          success: true,
          diff_ref: "staged: T_AO2",
          applied_artifact: html,
          system_reply: "Applied T_AO2",
        };
      }
      // Should never reach here for T_AO (orphaned at pre-validate).
      return {
        success: false,
        error_enum: "anchor_orphaned",
        system_reply: "anchor could not be found in the document",
      };
    }

    async function askUser(question, options) {
      // T_AO2 confirm-each prompt → Accept
      return "Accept";
    }

    const { runGit } = makeRunGit(tmp);

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
      throw new Error("FAIL (a): resolver threw — " + (e && e.stack ? e.stack : e));
    }

    // T_AO should be in skipped with anchor_orphaned prefix.
    const aoSkip = out.skipped.find((s) => s.id === "T_AO");
    assert.ok(aoSkip, "(a) T_AO must appear in skipped");
    assert.ok(
      aoSkip.reason.startsWith("anchor_orphaned:"),
      "(a) skipped reason must start with 'anchor_orphaned:' — got: " + aoSkip.reason
    );

    // T_AO's thread status must stay "open" on disk.
    const onDisk = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    const aoThread = onDisk.threads.find((t) => t.id === "T_AO");
    assert.ok(aoThread, "(a) T_AO thread must exist on disk");
    assert.strictEqual(aoThread.status, "open", "(a) T_AO thread status must stay open");

    // System message appended to the thread.
    const sysMsgs = (aoThread.messages || []).filter((m) => m && m.role === "system");
    assert.ok(sysMsgs.length >= 1, "(a) at least one system message must be appended to T_AO");
    assert.ok(
      sysMsgs[0].body.startsWith("anchor_orphaned:"),
      "(a) system message body must start with 'anchor_orphaned:' — got: " + sysMsgs[0].body
    );
    // Suggested-action suffix.
    assert.ok(
      sysMsgs[0].body.includes("suggested action"),
      "(a) system message must include 'suggested action' hint — got: " + sysMsgs[0].body
    );

    // Resolver continued: T_AO2 must be resolved.
    const ao2Thread = onDisk.threads.find((t) => t.id === "T_AO2");
    assert.ok(ao2Thread, "(a) T_AO2 must exist on disk");
    assert.strictEqual(ao2Thread.status, "resolved", "(a) T_AO2 must be resolved (resolver continued past T_AO)");
    assert.strictEqual(out.resolved, 1, "(a) resolved count must be 1");

    console.log("PASS: (a) anchor_orphaned — system message + status open + resolver continues");
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* swallow */ }
  }
}

// -------------------------------------------------------------------------
// Sub-case (b): subagent returns error_enum=agent_judged_infeasible.
// -------------------------------------------------------------------------
async function testAgentJudgedInfeasible() {
  const tmp = makeTmp("t16b");
  try {
    const { artifactPath, sidecarPath, html } = makeFixture(tmp, [
      {
        id: "T_JI",
        id_anchor: "problem",
        quote_anchor: null,
        status: "open",
        messages: [{ role: "user", author: "tester", body: "make this section shorter", ts: "2026-05-24T10:00:00Z" }],
      },
    ]);

    async function dispatchSubagent({ skill, input }) {
      return {
        success: false,
        error_enum: "agent_judged_infeasible",
        system_reply: "Cannot shorten this section; it contains required legal text. Suggested next action: contact the document owner to review the requirement.",
      };
    }

    async function askUser() { return "Accept"; }

    const { runGit } = makeRunGit(tmp);

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
      throw new Error("FAIL (b): resolver threw — " + (e && e.stack ? e.stack : e));
    }

    // T_JI in skipped with agent_judged_infeasible prefix.
    const jiSkip = out.skipped.find((s) => s.id === "T_JI");
    assert.ok(jiSkip, "(b) T_JI must appear in skipped");
    assert.ok(
      jiSkip.reason.startsWith("agent_judged_infeasible:"),
      "(b) skipped reason must start with 'agent_judged_infeasible:' — got: " + jiSkip.reason
    );
    // system_reply body (rationale + suggested next action) in reason.
    assert.ok(
      jiSkip.reason.includes("Suggested next action"),
      "(b) skipped reason must include suggested-next-action text from system_reply — got: " + jiSkip.reason
    );

    // thread status stays open on disk.
    const onDisk = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    const jiThread = onDisk.threads.find((t) => t.id === "T_JI");
    assert.strictEqual(jiThread.status, "open", "(b) T_JI thread status must stay open");

    // system message appended.
    const sysMsgs = (jiThread.messages || []).filter((m) => m && m.role === "system");
    assert.ok(sysMsgs.length >= 1, "(b) system message must be appended to T_JI");
    assert.ok(
      sysMsgs[0].body.startsWith("agent_judged_infeasible:"),
      "(b) system message body must start with 'agent_judged_infeasible:' — got: " + sysMsgs[0].body
    );

    assert.strictEqual(out.resolved, 0, "(b) resolved count must be 0");

    console.log("PASS: (b) agent_judged_infeasible — rationale + suggested next action in skip reason");
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* swallow */ }
  }
}

// -------------------------------------------------------------------------
// Sub-case (c): subagent throws → wrapped as agent_errored.
// -------------------------------------------------------------------------
async function testAgentErrored() {
  const tmp = makeTmp("t16c");
  try {
    const { artifactPath, sidecarPath, html } = makeFixture(tmp, [
      {
        id: "T_AE",
        id_anchor: "problem",
        quote_anchor: null,
        status: "open",
        messages: [{ role: "user", author: "tester", body: "rewrite this section", ts: "2026-05-24T10:00:00Z" }],
      },
    ]);

    async function dispatchSubagent({ skill, input }) {
      throw new Error("connection timeout: subagent did not respond");
    }

    async function askUser() { return "Accept"; }

    const { runGit } = makeRunGit(tmp);

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
      throw new Error("FAIL (c): resolver threw — " + (e && e.stack ? e.stack : e));
    }

    // T_AE in skipped with agent_errored prefix.
    const aeSkip = out.skipped.find((s) => s.id === "T_AE");
    assert.ok(aeSkip, "(c) T_AE must appear in skipped");
    assert.ok(
      aeSkip.reason.startsWith("agent_errored:"),
      "(c) skipped reason must start with 'agent_errored:' — got: " + aeSkip.reason
    );
    // e.message excerpt must appear in the reason.
    assert.ok(
      aeSkip.reason.includes("connection timeout"),
      "(c) skipped reason must include e.message excerpt — got: " + aeSkip.reason
    );

    // thread status stays open on disk.
    const onDisk = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    const aeThread = onDisk.threads.find((t) => t.id === "T_AE");
    assert.strictEqual(aeThread.status, "open", "(c) T_AE thread status must stay open");

    // system message appended.
    const sysMsgs = (aeThread.messages || []).filter((m) => m && m.role === "system");
    assert.ok(sysMsgs.length >= 1, "(c) system message must be appended to T_AE");
    assert.ok(
      sysMsgs[0].body.startsWith("agent_errored:"),
      "(c) system message body must start with 'agent_errored:' — got: " + sysMsgs[0].body
    );

    assert.strictEqual(out.resolved, 0, "(c) resolved count must be 0");

    console.log("PASS: (c) agent_errored — subagent throws → wrapped with e.message + system message");
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* swallow */ }
  }
}

// -------------------------------------------------------------------------
// Sub-case (d): subagent returns error_enum=edit_conflicted.
// -------------------------------------------------------------------------
async function testEditConflicted() {
  const tmp = makeTmp("t16d");
  try {
    const { artifactPath, sidecarPath, html } = makeFixture(tmp, [
      {
        id: "T_EC",
        id_anchor: "problem",
        quote_anchor: null,
        status: "open",
        messages: [{ role: "user", author: "tester", body: "restructure this section", ts: "2026-05-24T10:00:00Z" }],
      },
    ]);

    async function dispatchSubagent({ skill, input }) {
      return {
        success: false,
        error_enum: "edit_conflicted",
        system_reply: "Overlapping edit detected with a concurrent thread",
      };
    }

    async function askUser() { return "Accept"; }

    const { runGit } = makeRunGit(tmp);

    // Capture console.warn output.
    const warnMessages = [];
    const originalWarn = console.warn;
    console.warn = (...args) => { warnMessages.push(args.join(" ")); };

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
      console.warn = originalWarn;
      throw new Error("FAIL (d): resolver threw — " + (e && e.stack ? e.stack : e));
    } finally {
      console.warn = originalWarn;
    }

    // Must have logged a wave-planner bug warning.
    assert.ok(
      warnMessages.some((msg) => msg.includes("wave-planner bug") && msg.includes("T_EC")),
      "(d) must log 'wave-planner bug' warning including thread id T_EC — got: " +
        JSON.stringify(warnMessages)
    );
    // Warning must have the required prefix.
    assert.ok(
      warnMessages.some((msg) => msg.startsWith("resolver: WARNING wave-planner bug")),
      "(d) warning must start with 'resolver: WARNING wave-planner bug' — got: " +
        JSON.stringify(warnMessages)
    );

    // T_EC in skipped with edit_conflicted prefix.
    const ecSkip = out.skipped.find((s) => s.id === "T_EC");
    assert.ok(ecSkip, "(d) T_EC must appear in skipped");
    assert.ok(
      ecSkip.reason.startsWith("edit_conflicted:"),
      "(d) skipped reason must start with 'edit_conflicted:' — got: " + ecSkip.reason
    );

    // thread status stays open on disk.
    const onDisk = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    const ecThread = onDisk.threads.find((t) => t.id === "T_EC");
    assert.strictEqual(ecThread.status, "open", "(d) T_EC thread status must stay open");

    assert.strictEqual(out.resolved, 0, "(d) resolved count must be 0");

    console.log("PASS: (d) edit_conflicted — console.warn 'wave-planner bug' + thread skipped");
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* swallow */ }
  }
}

// -------------------------------------------------------------------------
// Sub-case (e1): score >= 0.80 → short-circuit, subagent NOT dispatched.
// Uses quote_anchor so resolveAnchor returns the actual quoted text as the
// anchored region, making the semantic-match meaningful.
// -------------------------------------------------------------------------
async function testIdempotencyShortCircuit() {
  const tmp = makeTmp("t16e1");
  try {
    // The fixture's problem section contains:
    // "attach inline review comments to generated HTML artifacts"
    // quote_anchor strategy returns that exact text as the anchored region.
    const { artifactPath, sidecarPath, html } = makeFixture(tmp, [
      {
        id: "T_IDEM",
        id_anchor: null,
        quote_anchor: { text: "attach inline review comments to generated HTML artifacts" },
        status: "open",
        messages: [
          {
            role: "user",
            author: "tester",
            // All significant keywords exist in the anchored region.
            body: "attach inline review comments generated HTML artifacts",
            ts: "2026-05-24T10:00:00Z",
          },
        ],
      },
    ]);

    let dispatchCount = 0;
    async function dispatchSubagent({ skill, input }) {
      dispatchCount++;
      return {
        success: true,
        diff_ref: "staged: T_IDEM",
        applied_artifact: html,
        system_reply: "Applied T_IDEM",
      };
    }

    async function askUser() { return "Accept"; }
    const { runGit } = makeRunGit(tmp);

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
      throw new Error("FAIL (e1): resolver threw — " + (e && e.stack ? e.stack : e));
    }

    // Subagent must NOT have been dispatched.
    assert.strictEqual(dispatchCount, 0, "(e1) dispatchSubagent must NOT be called when score >= 0.80");

    // Thread must be resolved (no-op short-circuit counts as resolved).
    assert.strictEqual(out.resolved, 1, "(e1) resolved count must be 1 (short-circuit no-op)");

    // Thread status must be "resolved" on disk.
    const onDisk = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
    const t = onDisk.threads[0];
    assert.strictEqual(t.status, "resolved", "(e1) thread status must be 'resolved' after short-circuit");

    // System message must contain the idempotency message.
    const sysMsgs = (t.messages || []).filter((m) => m && m.role === "system");
    assert.ok(sysMsgs.length >= 1, "(e1) system message must be appended");
    assert.ok(
      sysMsgs[0].body.includes("Edit already present"),
      "(e1) system message must include 'Edit already present' — got: " + sysMsgs[0].body
    );

    console.log("PASS: (e1) idempotency score >= 0.80 → short-circuit, subagent not dispatched, thread resolved");
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* swallow */ }
  }
}

// -------------------------------------------------------------------------
// Sub-case (e2): score in 60–80% range → dispatcher IS called.
// Uses quote_anchor so resolveAnchor returns actual content as the region.
// -------------------------------------------------------------------------
async function testIdempotencyMidRange() {
  const tmp = makeTmp("t16e2");
  try {
    // Anchored region = "attach inline review comments to generated HTML artifacts"
    // Body keywords after stopwords removal:
    //   "attach"(present), "inline"(present), "review"(present),
    //   "missing1"(absent), "missing2"(absent)
    //   => 3/5 = 0.60, which is the 60% boundary → no short-circuit.
    const { artifactPath, sidecarPath, html } = makeFixture(tmp, [
      {
        id: "T_MID",
        id_anchor: null,
        quote_anchor: { text: "attach inline review comments to generated HTML artifacts" },
        status: "open",
        messages: [
          {
            role: "user",
            author: "tester",
            body: "attach inline review missing1 missing2",
            ts: "2026-05-24T10:00:00Z",
          },
        ],
      },
    ]);

    let dispatchCount = 0;
    async function dispatchSubagent({ skill, input }) {
      dispatchCount++;
      return {
        success: true,
        diff_ref: "staged: T_MID",
        applied_artifact: html,
        system_reply: "Applied T_MID",
      };
    }

    async function askUser() { return "Accept"; }
    const { runGit } = makeRunGit(tmp);

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
      throw new Error("FAIL (e2): resolver threw — " + (e && e.stack ? e.stack : e));
    }

    // Dispatcher MUST have been called (score < 0.80 → no short-circuit).
    assert.ok(
      dispatchCount >= 1,
      "(e2) dispatchSubagent must be called when score in [0.60, 0.80) — dispatchCount=" + dispatchCount
    );

    console.log("PASS: (e2) idempotency score in [0.60, 0.80) → dispatcher called (no short-circuit)");
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* swallow */ }
  }
}

// -------------------------------------------------------------------------
// Sub-case (e3): score < 0.60 → dispatcher IS called.
// -------------------------------------------------------------------------
async function testIdempotencyLowScore() {
  const tmp = makeTmp("t16e3");
  try {
    // Anchored region = "attach inline review comments to generated HTML artifacts"
    // Body keywords: "refactor"(absent), "database"(absent), "schema"(absent),
    //   "migration"(absent), "strategy"(absent) → 0/5 = 0.0, well < 0.60.
    const { artifactPath, sidecarPath, html } = makeFixture(tmp, [
      {
        id: "T_LOW",
        id_anchor: null,
        quote_anchor: { text: "attach inline review comments to generated HTML artifacts" },
        status: "open",
        messages: [
          {
            role: "user",
            author: "tester",
            body: "refactor database schema migration strategy",
            ts: "2026-05-24T10:00:00Z",
          },
        ],
      },
    ]);

    let dispatchCount = 0;
    async function dispatchSubagent({ skill, input }) {
      dispatchCount++;
      return {
        success: true,
        diff_ref: "staged: T_LOW",
        applied_artifact: html,
        system_reply: "Applied T_LOW",
      };
    }

    async function askUser() { return "Accept"; }
    const { runGit } = makeRunGit(tmp);

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
      throw new Error("FAIL (e3): resolver threw — " + (e && e.stack ? e.stack : e));
    }

    // Dispatcher MUST have been called.
    assert.ok(
      dispatchCount >= 1,
      "(e3) dispatchSubagent must be called when score < 0.60 — dispatchCount=" + dispatchCount
    );

    console.log("PASS: (e3) idempotency score < 0.60 → dispatcher called");
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* swallow */ }
  }
}

// -------------------------------------------------------------------------
// Schema-version pass-through: schema_version=1 loads fine.
// -------------------------------------------------------------------------
async function testSchemaVersionPassthrough() {
  const tmp = makeTmp("t16sv");
  try {
    const { artifactPath, sidecarPath, html } = makeFixture(tmp, [
      {
        id: "T_SV",
        id_anchor: "problem",
        quote_anchor: null,
        status: "open",
        messages: [{ role: "user", author: "tester", body: "update this", ts: "2026-05-24T10:00:00Z" }],
      },
    ], 1);

    async function dispatchSubagent({ skill, input }) {
      return {
        success: true,
        diff_ref: "staged: T_SV",
        applied_artifact: html,
        system_reply: "Applied T_SV",
      };
    }

    async function askUser() { return "Accept"; }
    const { runGit } = makeRunGit(tmp);

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
      throw new Error("FAIL (schema-passthrough): resolver threw for schema_version=1 — " + (e && e.stack ? e.stack : e));
    }

    // Should have resolved normally.
    assert.ok(typeof out === "object", "(schema-passthrough) resolve() must return a result object");

    console.log("PASS: schema_version=1 sidecar loads without error (pass-through)");
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* swallow */ }
  }
}

// -------------------------------------------------------------------------
// Run all sub-cases.
// -------------------------------------------------------------------------
(async () => {
  try {
    testSemanticMatchScoreUnit();
    await testAnchorOrphanedFromSubagent();
    await testAgentJudgedInfeasible();
    await testAgentErrored();
    await testEditConflicted();
    await testIdempotencyShortCircuit();
    await testIdempotencyMidRange();
    await testIdempotencyLowScore();
    await testSchemaVersionPassthrough();
    console.log("\nPASS: /comments resolver schema + error_enum + idempotency — all sub-cases (T16)");
  } catch (e) {
    console.error("\nFAIL: " + (e && e.stack ? e.stack : e));
    process.exit(1);
  }
})().catch((e) => {
  console.error("FAIL: uncaught — " + (e && e.stack ? e.stack : e));
  process.exit(1);
});
