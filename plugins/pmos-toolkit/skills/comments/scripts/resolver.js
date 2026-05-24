#!/usr/bin/env node
// T10 — /comments resolve controller (confirm-each mode).
//
// Walks open threads in <artifact>.comments.json, dispatches each thread
// to the originating skill's apply-edit-at-anchor entrypoint (routed via
// <meta name="pmos:skill">), presents the diff via AskUserQuestion, and
// on Accept applies the edit + stages the files. Never commits.
//
// Spec refs: §6.1 (architecture), §9.1 (input/output), §9.2 (error_enum),
// §9.3 (idempotency); FR-20, FR-22, FR-24, FR-27, FR-28, FR-31.
// Contract: plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md
//
// Testability seam: dispatchSubagent / askUser / runGit are injectable.
// Tests mock all three. The CLI (cli.js) wires real implementations.

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

// T12 — canonical anchor resolver. Used to pre-validate each thread's
// anchor before burning a subagent dispatch; an orphan result becomes
// an immediate error_enum=anchor_orphaned skip.
const { resolveAnchor } = require("./anchor-resolver.js");

const MAX_CLARIFY = 2;

// Closed error_enum — must match the T6 contract / T9 shim verbatim.
const ERROR_ENUM = Object.freeze({
  ANCHOR_ORPHANED: "anchor_orphaned",
  EDIT_CONFLICTED: "edit_conflicted",
  AGENT_JUDGED_INFEASIBLE: "agent_judged_infeasible",
  AGENT_ERRORED: "agent_errored",
});

// ---- helpers ----

function _sidecarPathFor(artifactPath) {
  // Convention: <artifact>.comments.json (FR-10 / FR-11 sidecar shape, T3).
  const dir = path.dirname(artifactPath);
  const base = path.basename(artifactPath).replace(/\.html?$/i, "");
  return path.join(dir, base + ".comments.json");
}

function _readMetaSkill(html) {
  // Accept the canonical `pmos:skill` (spec §6.1 / FR-01) and the legacy
  // `pmos-originating-skill` (used by some early fixtures). Either resolves.
  const reCanonical = /<meta\s+name=["']pmos:skill["']\s+content=["']([^"']+)["']\s*\/?>/i;
  const reLegacy = /<meta\s+name=["']pmos-originating-skill["']\s+content=["']([^"']+)["']\s*\/?>/i;
  let m = html.match(reCanonical);
  if (m) return m[1];
  m = html.match(reLegacy);
  if (m) return m[1];
  return null;
}

function _lastUserBody(thread) {
  const msgs = Array.isArray(thread.messages) ? thread.messages : [];
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i] && msgs[i].role === "user") return String(msgs[i].body || "");
  }
  return "";
}

function _isoNow() {
  return new Date().toISOString();
}

// Serializer matches T3's `serialize_sidecar` byte-for-byte:
//   JSON.stringify(obj, null, 2) + '\n'  (LF, trailing newline).
function _serializeSidecar(obj) {
  return JSON.stringify(obj, null, 2) + "\n";
}

// ---- default injectables ----

// Default dispatchSubagent: route by skill slug. T10 ships only the
// /spec lane (delegates to the T9 shim). Other slugs raise not_implemented
// — those entrypoints land in T18–T21.
function _defaultDispatchSubagent({ skill, input }) {
  if (skill === "spec") {
    // Reach into the T9 shim. Relative path from this file:
    //   ../../spec/scripts/apply-edit-at-anchor.js
    const shimPath = path.join(
      __dirname,
      "..",
      "..",
      "spec",
      "scripts",
      "apply-edit-at-anchor.js"
    );
    const { apply } = require(shimPath);
    // Adapt §9.1 input → T9 shim input (shim expects flat shape with
    // thread_id; we mirror it).
    const shimInput = {
      artifact_path: input.artifact_path,
      thread_id: input.thread_id,
      anchor: input.anchor,
      body: input.body,
    };
    return apply(shimInput);
  }
  throw new Error(
    "dispatchSubagent: not_implemented for skill='" +
      skill +
      "' — see T18–T21 for non-/spec lanes"
  );
}

function _defaultAskUser(/* question, options */) {
  // Resolver-skeleton stage: a real prompt is wired by cli.js (readline).
  // Library callers and tests MUST inject their own askUser.
  throw new Error("askUser must be injected at the resolver-skeleton stage");
}

function _defaultRunGit(args, opts) {
  const cwd = (opts && opts.cwd) || process.cwd();
  return execFileSync("git", args, { cwd: cwd, stdio: "pipe" });
}

// ---- core resolve loop ----

async function resolve(params) {
  const artifactPath = path.resolve(params.path);
  const mode = params.mode || "confirm-each";
  const askUser = params.askUser || _defaultAskUser;
  const dispatchSubagent = params.dispatchSubagent || _defaultDispatchSubagent;
  const runGit = params.runGit || _defaultRunGit;

  if (mode !== "confirm-each") {
    // T13/T14 ship batch / auto / non-interactive.
    throw new Error(
      "resolve: mode='" + mode + "' not implemented in T10 — see T13/T14"
    );
  }

  // 1. Read artifact + sidecar.
  let html = fs.readFileSync(artifactPath, "utf8");
  const sidecarPath = _sidecarPathFor(artifactPath);
  const sidecarRaw = fs.readFileSync(sidecarPath, "utf8");
  const sidecar = JSON.parse(sidecarRaw);

  // 2. Read meta tag → originating skill slug.
  const skillSlug = _readMetaSkill(html);
  if (!skillSlug) {
    throw new Error(
      "resolve: artifact missing <meta name=\"pmos:skill\"> — cannot route dispatch (FR-22)"
    );
  }

  // 3. Walk open threads.
  const threads = Array.isArray(sidecar.threads) ? sidecar.threads : [];
  const openIdxs = threads
    .map((t, i) => (t && t.status === "open" ? i : -1))
    .filter((i) => i !== -1);
  const totalOpen = openIdxs.length;

  let resolvedCount = 0;
  const skipped = [];

  for (const idx of openIdxs) {
    const thread = threads[idx];
    let body = _lastUserBody(thread);
    let clarifyAttempts = 0;
    let outcome = null;

    // Dispatch loop (with bounded clarification re-dispatch).
    while (outcome === null) {
      const anchorObj = {
        id_anchor: thread.id_anchor || (thread.anchor && thread.anchor.id_anchor) || null,
        quote_anchor:
          thread.quote_anchor || (thread.anchor && thread.anchor.quote_anchor) || null,
        diagram_anchor:
          thread.diagram_anchor || (thread.anchor && thread.anchor.diagram_anchor) || null,
      };
      const input = {
        artifact_path: artifactPath,
        anchor: anchorObj,
        body: body,
        thread_id: thread.id,
      };

      // T12 — pre-validate via canonical resolver. On orphan, skip without
      // dispatching the subagent. id-first / quote-fallback / svg results
      // pass through to the per-skill apply-edit phase as-is.
      if (clarifyAttempts === 0) {
        const pre = resolveAnchor({ anchor: anchorObj, artifactHtml: html });
        if (pre && pre.orphan === true) {
          skipped.push({
            id: thread.id,
            reason:
              ERROR_ENUM.ANCHOR_ORPHANED +
              ": anchor unresolved (id-first miss + quote-fallback below threshold)",
          });
          outcome = "skip";
          break;
        }
      }

      let out;
      try {
        out = await dispatchSubagent({ skill: skillSlug, input: input });
      } catch (e) {
        out = {
          success: false,
          error_enum: ERROR_ENUM.AGENT_ERRORED,
          system_reply: "Dispatch failed: " + (e && e.message ? e.message : String(e)),
        };
      }

      // Clarification path.
      if (out && out.clarification) {
        if (clarifyAttempts >= MAX_CLARIFY) {
          skipped.push({ id: thread.id, reason: "clarify_cap_exceeded" });
          outcome = "skip";
          break;
        }
        clarifyAttempts++;
        const ans = await askUser(out.clarification.question, out.clarification.options);
        // Fold the answer back into the thread as a new user message,
        // then re-dispatch.
        thread.messages = thread.messages || [];
        thread.messages.push({ role: "user", body: String(ans), ts: _isoNow() });
        body = String(ans);
        continue;
      }

      // Failure path.
      if (!out || out.success !== true) {
        const enumv = (out && out.error_enum) || ERROR_ENUM.AGENT_ERRORED;
        const msg = (out && out.system_reply) || "(no reply)";
        skipped.push({ id: thread.id, reason: enumv + ": " + msg });
        outcome = "skip";
        break;
      }

      // Success — present diff for confirmation.
      const choice = await askUser(
        "Apply edit for thread " + thread.id + "?\n" + (out.diff_ref || "(no diff_ref)") +
          "\n" + (out.system_reply || ""),
        ["Accept", "Reject", "Modify", "Skip"]
      );

      if (choice === "Accept") {
        // Apply: prefer out.applied_artifact (full-text replacement) when
        // the dispatched skill returns one. Fall back to leaving the
        // artifact bytes untouched (the T9 shim does not mutate; the
        // resolver-skeleton's job is to support a full-text shim too).
        if (typeof out.applied_artifact === "string") {
          html = out.applied_artifact;
          fs.writeFileSync(artifactPath, html, "utf8");
        }
        thread.messages = thread.messages || [];
        thread.messages.push({
          role: "system",
          body: String(out.system_reply || ""),
          ts: _isoNow(),
        });
        thread.status = "resolved";
        resolvedCount++;
        outcome = "applied";
      } else if (choice === "Skip" || choice === "Reject") {
        skipped.push({ id: thread.id, reason: "operator_" + choice.toLowerCase() });
        outcome = "skip";
      } else if (choice === "Modify") {
        // T10 records the choice as a skip-for-now; full Modify-edit-then-
        // resubmit UX lands in T13. Thread stays open.
        skipped.push({ id: thread.id, reason: "operator_modify_deferred" });
        outcome = "skip";
      } else {
        skipped.push({ id: thread.id, reason: "operator_unknown_choice:" + String(choice) });
        outcome = "skip";
      }
    }
  }

  // 4. Persist sidecar; stage via `git add`. The resolver never invokes
  //    the commit verb — operator commits after reviewing staged diff.
  fs.writeFileSync(sidecarPath, _serializeSidecar(sidecar), "utf8");

  const repoRoot = _gitRepoRoot(artifactPath, runGit);
  runGit(["add", artifactPath, sidecarPath], { cwd: repoRoot });

  const summary =
    "Resolved " + resolvedCount + "/" + totalOpen +
    ". Review with git diff --cached then commit.";
  if (params.printSummary !== false) {
    process.stdout.write(summary + "\n");
    if (skipped.length > 0) {
      for (const s of skipped) {
        process.stdout.write("  skipped " + s.id + ": " + s.reason + "\n");
      }
    }
  }

  return {
    artifact: artifactPath,
    sidecar: sidecarPath,
    skill: skillSlug,
    total_open: totalOpen,
    resolved: resolvedCount,
    skipped: skipped,
    summary: summary,
  };
}

function _gitRepoRoot(seedPath, runGit) {
  // Best-effort: ask git from the artifact's directory; fall back to cwd
  // if git rev-parse errors (e.g., tests in /tmp).
  try {
    const dir = fs.statSync(seedPath).isDirectory() ? seedPath : path.dirname(seedPath);
    const out = runGit(["rev-parse", "--show-toplevel"], { cwd: dir });
    return String(out).trim() || process.cwd();
  } catch (_) {
    return process.cwd();
  }
}

module.exports = {
  resolve: resolve,
  ERROR_ENUM: ERROR_ENUM,
  MAX_CLARIFY: MAX_CLARIFY,
  _internal: {
    _sidecarPathFor: _sidecarPathFor,
    _readMetaSkill: _readMetaSkill,
    _serializeSidecar: _serializeSidecar,
  },
};
