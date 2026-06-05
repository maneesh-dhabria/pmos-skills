#!/usr/bin/env node
// T14 — /comments resolver --auto and --non-interactive modes.
//
// Sub-cases:
//   (a) --auto: 3 threads, all confidently resolved → all applied, askUser 0 times.
//   (b) --auto: 1 confident + 1 ambiguous (clarification returned first, then re-dispatch
//       success) → confident applied without prompt; ambiguous triggers askUser once
//       (for the clarification); final answer applied without further prompt.
//       askUser called exactly 1 time total.
//   (c) --non-interactive: 2 unambiguous + 1 ambiguous → 2 applied (no askUser calls),
//       1 deferred: system message appended exactly
//       "deferred — operator input required (re-run interactively for this thread)",
//       status stays "open". askUser called 0 times.
//   (d) --non-interactive: end-of-run summary lists deferred threads — returned object
//       has `deferred` array with the deferred thread id; printed summary line names it.
//
// Spec refs: FR-26, FR-32, S12.

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

function makeTmp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), (prefix || "t14-") + "-"));
}

function makeRunGit(tmpDir) {
  const gitCalls = [];
  function runGit(args /*, opts */) {
    gitCalls.push(args.slice());
    if (args[0] === "rev-parse" && args[1] === "--show-toplevel") {
      return tmpDir + "\n";
    }
    if (args[0] === "add") return "";
    throw new Error("runGit: unexpected args " + JSON.stringify(args));
  }
  return { runGit, gitCalls };
}

// Prepare a tmp dir with the fixture artifact (rewriting to canonical meta tag)
// and a sidecar with the given threads.
function makeFixture(tmpDir, threads) {
  const artifactPath = path.join(tmpDir, "02_spec_mini.html");

  let html = fs.readFileSync(FIXTURE_HTML, "utf8");
  if (!/name=["']pmos:skill["']/.test(html)) {
    html = html.replace(
      /<meta\s+name=["']pmos-originating-skill["']\s+content=["']([^"']+)["']\s*\/?>/,
      '<meta name="pmos:skill" content="$1">'
    );
  }

  // v2.58.0 — threads live inline in the artifact (sidecar retired). Embed the
  // block and return the with-block html so dispatch mocks that echo it back
  // as applied_artifact preserve the block.
  html = resolver._internal._injectCommentsBlock(html, {
    schema: 1,
    version: 0,
    generated_at: "2026-05-24T00:00:00Z",
    threads: threads,
  });
  fs.writeFileSync(artifactPath, html, "utf8");
  return { artifactPath, html };
}

// -----------------------------------------------------------------------
// Sub-case (a): --auto, 3 threads, all confidently resolved
// Expected: all applied, askUser called 0 times.
// -----------------------------------------------------------------------
async function testAutoAllConfident() {
  const tmp = makeTmp("t14a");
  try {
    const { artifactPath, html } = makeFixture(tmp, [
      {
        id: "T_A1",
        id_anchor: "problem",
        quote_anchor: null,
        status: "open",
        messages: [{ role: "user", author: "tester", body: "tighten wording A1", ts: "2026-05-24T10:00:00Z" }],
      },
      {
        id: "T_A2",
        id_anchor: "solution",
        quote_anchor: null,
        status: "open",
        messages: [{ role: "user", author: "tester", body: "tighten wording A2", ts: "2026-05-24T10:01:00Z" }],
      },
      {
        id: "T_A3",
        id_anchor: "rollout",
        quote_anchor: null,
        status: "open",
        messages: [{ role: "user", author: "tester", body: "tighten wording A3", ts: "2026-05-24T10:02:00Z" }],
      },
    ]);

    let dispatchCalls = 0;
    async function dispatchSubagent({ skill, input }) {
      dispatchCalls++;
      return {
        success: true,
        diff_ref: "staged: " + input.thread_id,
        applied_artifact: html, // return same html (no actual edit needed for test)
        system_reply: "Applied edit for " + input.thread_id,
      };
    }

    let askCalls = 0;
    async function askUser(question, options) {
      askCalls++;
      // Should never be called in auto mode for confident resolves
      return options && options[0];
    }

    const { runGit, gitCalls } = makeRunGit(tmp);

    let out;
    try {
      out = await resolver.resolve({
        path: artifactPath,
        mode: "auto",
        askUser: askUser,
        dispatchSubagent: dispatchSubagent,
        runGit: runGit,
        printSummary: false,
      });
    } catch (e) {
      throw new Error("FAIL (a): resolver threw — " + (e && e.stack ? e.stack : e));
    }

    assert.strictEqual(dispatchCalls, 3, "(a) dispatchSubagent called 3 times");
    assert.strictEqual(askCalls, 0, "(a) askUser must NOT be called for confident resolves in --auto");
    assert.strictEqual(out.resolved, 3, "(a) all 3 threads resolved");
    assert.strictEqual(out.skipped.length, 0, "(a) no skips");

    const onDiskSidecar = resolver._internal._parseInlineComments(fs.readFileSync(artifactPath, "utf8"));
    for (const t of onDiskSidecar.threads) {
      assert.strictEqual(t.status, "resolved", "(a) thread " + t.id + " status=resolved");
    }

    // git add called, never commit
    const addCalls = gitCalls.filter((a) => a[0] === "add");
    assert.strictEqual(addCalls.length, 1, "(a) git add called once");
    assert.strictEqual(gitCalls.filter((a) => a[0] === "commit").length, 0, "(a) no git commit");

    console.log("PASS: (a) --auto: 3 confident threads → all applied, askUser=0");
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* swallow */ }
  }
}

// -----------------------------------------------------------------------
// Sub-case (b): --auto, 1 confident + 1 ambiguous (clarification on first
// dispatch, then success on re-dispatch with answer).
// Expected: confident applied immediately without prompt; ambiguous triggers
// askUser ONCE (the clarification question); re-dispatch applied without prompt.
// askUser called exactly 1 time total.
// -----------------------------------------------------------------------
async function testAutoWithClarification() {
  const tmp = makeTmp("t14b");
  try {
    const { artifactPath, html } = makeFixture(tmp, [
      {
        id: "T_B1",
        id_anchor: "problem",
        quote_anchor: null,
        status: "open",
        messages: [{ role: "user", author: "tester", body: "tighten wording B1", ts: "2026-05-24T10:00:00Z" }],
      },
      {
        id: "T_B2",
        id_anchor: "solution",
        quote_anchor: null,
        status: "open",
        messages: [{ role: "user", author: "tester", body: "ambiguous request B2", ts: "2026-05-24T10:01:00Z" }],
      },
    ]);

    // T_B1: confident success on first dispatch
    // T_B2: clarification on first dispatch, then success on re-dispatch
    const dispatchHistory = {};
    async function dispatchSubagent({ skill, input }) {
      const tid = input.thread_id;
      dispatchHistory[tid] = (dispatchHistory[tid] || 0) + 1;
      if (tid === "T_B1") {
        return {
          success: true,
          diff_ref: "staged: T_B1",
          applied_artifact: html,
          system_reply: "Applied B1",
        };
      }
      if (tid === "T_B2") {
        if (dispatchHistory[tid] === 1) {
          // First dispatch: return clarification
          return {
            clarification: {
              question: "Which tone do you prefer?",
              options: ["Formal", "Casual"],
            },
          };
        } else {
          // Second dispatch (after clarification answer): success
          return {
            success: true,
            diff_ref: "staged: T_B2",
            applied_artifact: html,
            system_reply: "Applied B2 (formal tone)",
          };
        }
      }
      throw new Error("unexpected thread_id: " + tid);
    }

    let askCalls = 0;
    const askArgs = [];
    async function askUser(question, options) {
      askCalls++;
      askArgs.push({ question, options });
      // Return first option (the clarification answer)
      return options && options[0];
    }

    const { runGit, gitCalls } = makeRunGit(tmp);

    let out;
    try {
      out = await resolver.resolve({
        path: artifactPath,
        mode: "auto",
        askUser: askUser,
        dispatchSubagent: dispatchSubagent,
        runGit: runGit,
        printSummary: false,
      });
    } catch (e) {
      throw new Error("FAIL (b): resolver threw — " + (e && e.stack ? e.stack : e));
    }

    // T_B1: 1 dispatch, T_B2: 2 dispatches (clarification + re-dispatch)
    assert.strictEqual(dispatchHistory["T_B1"], 1, "(b) T_B1 dispatched once");
    assert.strictEqual(dispatchHistory["T_B2"], 2, "(b) T_B2 dispatched twice (clarify + re-dispatch)");
    assert.strictEqual(askCalls, 1, "(b) askUser called exactly once (for clarification)");
    assert.strictEqual(askArgs[0].question, "Which tone do you prefer?", "(b) askUser called with clarification question");
    assert.strictEqual(out.resolved, 2, "(b) both threads resolved");
    assert.strictEqual(out.skipped.length, 0, "(b) no skips");

    const onDiskSidecar = resolver._internal._parseInlineComments(fs.readFileSync(artifactPath, "utf8"));
    for (const t of onDiskSidecar.threads) {
      assert.strictEqual(t.status, "resolved", "(b) thread " + t.id + " status=resolved");
    }

    assert.strictEqual(gitCalls.filter((a) => a[0] === "commit").length, 0, "(b) no git commit");

    console.log("PASS: (b) --auto: 1 confident + 1 clarification → applied both, askUser=1");
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* swallow */ }
  }
}

// -----------------------------------------------------------------------
// Sub-case (c): --non-interactive, 2 unambiguous + 1 ambiguous
// Expected: 2 applied (no askUser calls), 1 deferred (system message appended,
// status stays "open"). askUser called 0 times.
// -----------------------------------------------------------------------
async function testNonInteractiveDeferAmbiguous() {
  const tmp = makeTmp("t14c");
  try {
    const { artifactPath, html } = makeFixture(tmp, [
      {
        id: "T_C1",
        id_anchor: "problem",
        quote_anchor: null,
        status: "open",
        messages: [{ role: "user", author: "tester", body: "fix C1", ts: "2026-05-24T10:00:00Z" }],
      },
      {
        id: "T_C2",
        id_anchor: "solution",
        quote_anchor: null,
        status: "open",
        messages: [{ role: "user", author: "tester", body: "fix C2", ts: "2026-05-24T10:01:00Z" }],
      },
      {
        id: "T_C3",
        id_anchor: "rollout",
        quote_anchor: null,
        status: "open",
        messages: [{ role: "user", author: "tester", body: "ambiguous C3", ts: "2026-05-24T10:02:00Z" }],
      },
    ]);

    async function dispatchSubagent({ skill, input }) {
      const tid = input.thread_id;
      if (tid === "T_C3") {
        return {
          clarification: {
            question: "Tone?",
            options: ["Formal", "Casual"],
          },
        };
      }
      return {
        success: true,
        diff_ref: "staged: " + tid,
        applied_artifact: html,
        system_reply: "Applied " + tid,
      };
    }

    let askCalls = 0;
    async function askUser(question, options) {
      askCalls++;
      return options && options[0];
    }

    const { runGit, gitCalls } = makeRunGit(tmp);

    let out;
    try {
      out = await resolver.resolve({
        path: artifactPath,
        mode: "non-interactive",
        askUser: askUser,
        dispatchSubagent: dispatchSubagent,
        runGit: runGit,
        printSummary: false,
      });
    } catch (e) {
      throw new Error("FAIL (c): resolver threw — " + (e && e.stack ? e.stack : e));
    }

    assert.strictEqual(askCalls, 0, "(c) askUser must NOT be called in non-interactive mode");
    assert.strictEqual(out.resolved, 2, "(c) 2 threads resolved");

    // T_C3 must be deferred (not counted as resolved or skipped with non-deferred reason)
    assert.ok(out.deferred && Array.isArray(out.deferred), "(c) out.deferred must be an array");
    assert.strictEqual(out.deferred.length, 1, "(c) exactly 1 deferred thread");
    assert.strictEqual(out.deferred[0], "T_C3", "(c) T_C3 is the deferred thread");

    const onDiskSidecar = resolver._internal._parseInlineComments(fs.readFileSync(artifactPath, "utf8"));
    const t1 = onDiskSidecar.threads.find((t) => t.id === "T_C1");
    const t2 = onDiskSidecar.threads.find((t) => t.id === "T_C2");
    const t3 = onDiskSidecar.threads.find((t) => t.id === "T_C3");

    assert.strictEqual(t1.status, "resolved", "(c) T_C1 status=resolved");
    assert.strictEqual(t2.status, "resolved", "(c) T_C2 status=resolved");
    assert.strictEqual(t3.status, "open", "(c) T_C3 status stays open (deferred)");

    // T_C3 must have the exact deferred system message appended
    const DEFERRED_MSG = "deferred — operator input required (re-run interactively for this thread)";
    const sysMessages = (t3.messages || []).filter((m) => m && m.role === "system");
    assert.strictEqual(sysMessages.length, 1, "(c) exactly 1 system message appended to T_C3");
    assert.strictEqual(sysMessages[0].body, DEFERRED_MSG, "(c) exact deferred message body");

    assert.strictEqual(gitCalls.filter((a) => a[0] === "commit").length, 0, "(c) no git commit");

    console.log("PASS: (c) --non-interactive: 2 applied + 1 deferred, askUser=0");
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* swallow */ }
  }
}

// -----------------------------------------------------------------------
// Sub-case (d): --non-interactive end-of-run summary lists deferred threads.
// Verifies: returned object has `deferred` array with thread id; printed
// summary line names the deferred thread.
// -----------------------------------------------------------------------
async function testNonInteractiveSummaryListsDeferred() {
  const tmp = makeTmp("t14d");
  try {
    const { artifactPath, html } = makeFixture(tmp, [
      {
        id: "T_D1",
        id_anchor: "problem",
        quote_anchor: null,
        status: "open",
        messages: [{ role: "user", author: "tester", body: "fix D1", ts: "2026-05-24T10:00:00Z" }],
      },
      {
        id: "T_D2",
        id_anchor: "solution",
        quote_anchor: null,
        status: "open",
        messages: [{ role: "user", author: "tester", body: "ambiguous D2", ts: "2026-05-24T10:01:00Z" }],
      },
    ]);

    async function dispatchSubagent({ skill, input }) {
      const tid = input.thread_id;
      if (tid === "T_D2") {
        return {
          clarification: {
            question: "Style?",
            options: ["Concise", "Verbose"],
          },
        };
      }
      return {
        success: true,
        diff_ref: "staged: " + tid,
        applied_artifact: html,
        system_reply: "Applied " + tid,
      };
    }

    async function askUser() {
      throw new Error("askUser must not be called in non-interactive mode");
    }

    // Capture stdout to verify the summary contains the deferred thread id
    const capturedLines = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    process.stdout.write = function(chunk) {
      capturedLines.push(String(chunk));
      return true;
    };

    const { runGit } = makeRunGit(tmp);

    let out;
    try {
      out = await resolver.resolve({
        path: artifactPath,
        mode: "non-interactive",
        askUser: askUser,
        dispatchSubagent: dispatchSubagent,
        runGit: runGit,
        printSummary: true, // enable summary printing for this sub-case
      });
    } catch (e) {
      process.stdout.write = origWrite;
      throw new Error("FAIL (d): resolver threw — " + (e && e.stack ? e.stack : e));
    } finally {
      process.stdout.write = origWrite;
    }

    // Verify returned object
    assert.ok(out.deferred && Array.isArray(out.deferred), "(d) out.deferred must be an array");
    assert.strictEqual(out.deferred.length, 1, "(d) exactly 1 deferred in return object");
    assert.strictEqual(out.deferred[0], "T_D2", "(d) T_D2 listed as deferred in return object");

    // Verify printed summary mentions T_D2
    const summaryText = capturedLines.join("");
    assert.ok(
      summaryText.indexOf("T_D2") !== -1,
      "(d) printed summary must list the deferred thread id T_D2 — got: " + summaryText
    );

    console.log("PASS: (d) --non-interactive: deferred array + printed summary list deferred thread");
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* swallow */ }
  }
}

// -----------------------------------------------------------------------
// Run all sub-cases
// -----------------------------------------------------------------------
(async () => {
  try {
    await testAutoAllConfident();
    await testAutoWithClarification();
    await testNonInteractiveDeferAmbiguous();
    await testNonInteractiveSummaryListsDeferred();
    console.log("\nPASS: /comments resolver --auto and --non-interactive modes — all 4 sub-cases");
  } catch (e) {
    console.error("\nFAIL: " + (e && e.stack ? e.stack : e));
    process.exit(1);
  }
})().catch((e) => {
  console.error("FAIL: uncaught — " + (e && e.stack ? e.stack : e));
  process.exit(1);
});
