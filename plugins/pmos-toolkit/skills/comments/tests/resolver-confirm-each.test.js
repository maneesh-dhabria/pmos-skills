#!/usr/bin/env node
// T10 — /comments resolver confirm-each happy path (1-thread).
//
// Asserts the resolver:
//   (a) applies the dispatched skill's proposed full-text replacement to disk
//   (b) marks the thread status="resolved"
//   (c) appends a system message with the dispatched system_reply
//   (d) calls runGit(['add', artifact, sidecar]) exactly once
//   (e) NEVER calls runGit(['commit', ...])
//
// Spec refs: §6.1, §9.1, §9.3; FR-20, FR-22, FR-24, FR-27, FR-28, FR-31.

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

function makeTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "t10-comments-"));
}

(async () => {
  const tmp = makeTmp();
  const artifactPath = path.join(tmp, "02_spec_mini.html");

  // Copy the T9 fixture artifact; ensure it carries the canonical
  // <meta name="pmos:skill"> tag (the fixture uses pmos-originating-skill;
  // the resolver accepts either, but we rewrite to the canonical form so
  // this test pins the §6.1 routing path).
  let html = fs.readFileSync(FIXTURE_HTML, "utf8");
  if (!/name=["']pmos:skill["']/.test(html)) {
    html = html.replace(
      /<meta\s+name=["']pmos-originating-skill["']\s+content=["']([^"']+)["']\s*\/?>/,
      '<meta name="pmos:skill" content="$1">'
    );
  }

  // Embed a 1-open-thread inline pmos-comments block (v2.58.0 — sidecar
  // retired). The resolver reads/writes threads through this block, so the
  // fixture must carry it inline. `html` below already contains the block,
  // which `editedHtml` (the dispatch mock's applied_artifact) preserves.
  const threads = [
    {
      id: "T_A",
      id_anchor: "problem",
      quote_anchor: null,
      status: "open",
      messages: [
        {
          role: "user",
          author: "tester",
          body: "tighten the wording",
          ts: "2026-05-24T10:00:00Z",
        },
      ],
    },
  ];
  html = resolver._internal._injectCommentsBlock(html, {
    schema: 1,
    version: 0,
    generated_at: "2026-05-24T00:00:00Z",
    threads: threads,
  });
  fs.writeFileSync(artifactPath, html, "utf8");

  // ---- mocks ----
  const APPLIED_MARKER = "Tightened wording in §problem.";
  const SYSTEM_REPLY = "Tightened wording in §problem. Resolved.";
  const editedHtml = html.replace(
    /<p>Users currently have no way[^<]*<\/p>/,
    "<p>" + APPLIED_MARKER + "</p>"
  );
  assert.notStrictEqual(editedHtml, html, "fixture replace produced no change");

  let dispatchCalls = 0;
  async function dispatchSubagent({ skill, input }) {
    dispatchCalls++;
    assert.strictEqual(skill, "spec", "skill slug routed from meta tag");
    assert.strictEqual(input.thread_id, "T_A", "thread_id passed through");
    assert.strictEqual(input.anchor.id_anchor, "problem", "anchor.id_anchor passed");
    assert.strictEqual(input.body, "tighten the wording", "body = newest user msg");
    assert.strictEqual(input.artifact_path, artifactPath, "absolute artifact_path");
    return {
      success: true,
      diff_ref: "staged: offsets in 02_spec_mini.html",
      applied_artifact: editedHtml,
      system_reply: SYSTEM_REPLY,
    };
  }

  let askCalls = 0;
  async function askUser(/* question, options */) {
    askCalls++;
    return "Accept";
  }

  const gitCalls = [];
  function runGit(args /*, opts */) {
    gitCalls.push(args.slice());
    if (args[0] === "rev-parse" && args[1] === "--show-toplevel") {
      // Pretend the tmp dir is its own repo root.
      return tmp + "\n";
    }
    if (args[0] === "add") return "";
    throw new Error("runGit: unexpected args " + JSON.stringify(args));
  }

  // ---- run ----
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
    console.error("FAIL: resolver threw — " + (e && e.stack ? e.stack : e));
    process.exit(1);
  }

  // ---- asserts ----
  try {
    // (a) Edit applied to disk.
    const onDiskHtml = fs.readFileSync(artifactPath, "utf8");
    assert.ok(
      onDiskHtml.indexOf(APPLIED_MARKER) !== -1,
      "(a) artifact on disk contains the applied edit marker"
    );

    // (b) inline thread[0].status === "resolved".
    const onDiskComments = resolver._internal._parseInlineComments(
      fs.readFileSync(artifactPath, "utf8")
    );
    assert.strictEqual(
      onDiskComments.threads[0].status,
      "resolved",
      "(b) thread status flipped to resolved"
    );

    // (c) inline block carries a system message with the dispatched reply.
    const sysMsgs = (onDiskComments.threads[0].messages || []).filter(
      (m) => m && m.role === "system"
    );
    assert.strictEqual(sysMsgs.length, 1, "(c) exactly one system message appended");
    assert.strictEqual(sysMsgs[0].body, SYSTEM_REPLY, "(c) system message body matches");

    // (d) runGit called exactly once with ['add', artifact] (no sidecar).
    const addCalls = gitCalls.filter((a) => a[0] === "add");
    assert.strictEqual(addCalls.length, 1, "(d) git add called exactly once");
    assert.deepStrictEqual(
      addCalls[0],
      ["add", artifactPath],
      "(d) git add args match [artifact]"
    );

    // (e) NEVER commit.
    const commitCalls = gitCalls.filter((a) => a[0] === "commit");
    assert.strictEqual(commitCalls.length, 0, "(e) git commit must never be called");

    // Sanity on dispatch + ask counts.
    assert.strictEqual(dispatchCalls, 1, "dispatchSubagent called once");
    assert.strictEqual(askCalls, 1, "askUser called once (single Accept prompt)");
    assert.strictEqual(out.resolved, 1, "summary: resolved=1");
    assert.strictEqual(out.total_open, 1, "summary: total_open=1");
  } catch (e) {
    console.error("FAIL: " + (e && e.message ? e.message : e));
    process.exit(1);
  } finally {
    // Best-effort cleanup.
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch (_) {
      /* swallow */
    }
  }

  console.log("PASS: /comments resolver confirm-each — 1-thread happy path");
})().catch((e) => {
  console.error("FAIL: uncaught " + (e && e.stack ? e.stack : e));
  process.exit(1);
});
