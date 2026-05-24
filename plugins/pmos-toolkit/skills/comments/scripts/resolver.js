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
// T13 — wave planner for --batch mode (FR-25, §S14, Decision P6).
const { planWaves, overlapRelationFR25, _internal: _plannerInternal } = require("./wave-planner.js");
const _plannerKind = _plannerInternal && _plannerInternal._kind;

// FR-29: clarification cap = 1 per thread.
const MAX_CLARIFY = 1;

// T15: re-dispatch cap per thread (S10).
const MAX_REDISPATCH = 2;

// T15: system message body when clarification cap is exceeded (pinned string for tests).
const CLARIFY_CAP_EXCEEDED_BODY = "clarification cap exceeded — operator input required";

// Closed error_enum — must match the T6 contract / T9 shim verbatim.
const ERROR_ENUM = Object.freeze({
  ANCHOR_ORPHANED: "anchor_orphaned",
  EDIT_CONFLICTED: "edit_conflicted",
  AGENT_JUDGED_INFEASIBLE: "agent_judged_infeasible",
  AGENT_ERRORED: "agent_errored",
});

// Valid modes — closed set.
const VALID_MODES = new Set(["confirm-each", "batch", "auto", "non-interactive"]);

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

// ---- extracted per-thread helper ----

// _resolveSingleThread — shared dispatch loop body across confirm-each,
// auto, and non-interactive modes.
//
// ctx: {
//   html,              // current artifact HTML (mutable via ctx.setHtml)
//   artifactPath,      // string — absolute path
//   skillSlug,         // string — originating skill slug
//   askUser,           // injectable
//   dispatchSubagent,  // injectable
//   deferred,          // mutable array (non-interactive pushes to it)
//   skipped,           // mutable array — shared with caller
//   resolvedCount,     // object { value } — mutable by reference
//   setHtml,           // (newHtml) => void — write-back for html update
// }
//
// strategy: {
//   promptOnSuccess:    bool — confirm-each=true; auto/non-interactive=false
//   onClarification:    'prompt' | 'defer'  — confirm-each/auto='prompt'; non-interactive='defer'
//   checkAnchorAlways:  bool — non-interactive checks on every iteration; others only on first
// }
//
// Returns: 'applied' | 'skip' | 'deferred' (outcome string, same as the
// original per-mode while-loop used internally).
async function _resolveSingleThread(thread, ctx, strategy) {
  const {
    artifactPath,
    skillSlug,
    askUser,
    dispatchSubagent,
    deferred,
    skipped,
    resolvedCount,
    setHtml,
  } = ctx;

  let body = _lastUserBody(thread);
  let clarifyAttempts = 0;
  let redispatchCount = 0;

  // Anchor pre-validation (first pass only, unless checkAnchorAlways).
  const anchorObj = {
    id_anchor: thread.id_anchor || (thread.anchor && thread.anchor.id_anchor) || null,
    quote_anchor:
      thread.quote_anchor || (thread.anchor && thread.anchor.quote_anchor) || null,
    diagram_anchor:
      thread.diagram_anchor || (thread.anchor && thread.anchor.diagram_anchor) || null,
  };

  const pre = resolveAnchor({ anchor: anchorObj, artifactHtml: ctx.html });
  if (pre && pre.orphan === true) {
    skipped.push({
      id: thread.id,
      reason:
        ERROR_ENUM.ANCHOR_ORPHANED +
        ": anchor unresolved (id-first miss + quote-fallback below threshold)",
    });
    return "skip";
  }

  // Main dispatch loop.
  for (;;) {
    const input = {
      artifact_path: artifactPath,
      anchor: anchorObj,
      body: body,
      thread_id: thread.id,
    };

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
      if (strategy.onClarification === "defer") {
        // non-interactive: append system message, leave open, do NOT prompt.
        const DEFERRED_BODY =
          "deferred — operator input required (re-run interactively for this thread)";
        thread.messages = thread.messages || [];
        thread.messages.push({ role: "system", body: DEFERRED_BODY, ts: _isoNow() });
        // status stays "open"; do NOT increment resolvedCount.
        deferred.push(thread.id);
        return "deferred";
      }

      // 'prompt' path (confirm-each / auto).
      if (clarifyAttempts >= MAX_CLARIFY) {
        // Cap exceeded: append system message, leave status open, record skip.
        thread.messages = thread.messages || [];
        thread.messages.push({
          role: "system",
          body: CLARIFY_CAP_EXCEEDED_BODY,
          ts: _isoNow(),
        });
        skipped.push({ id: thread.id, reason: "clarify_cap_exceeded" });
        return "skip";
      }
      clarifyAttempts++;
      const ans = await askUser(out.clarification.question, out.clarification.options);
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
      return "skip";
    }

    // Success path.
    if (!strategy.promptOnSuccess) {
      // auto / non-interactive: apply without prompting.
      if (typeof out.applied_artifact === "string") {
        setHtml(out.applied_artifact);
        fs.writeFileSync(artifactPath, ctx.html, "utf8");
      }
      thread.messages = thread.messages || [];
      thread.messages.push({
        role: "system",
        body: String(out.system_reply || ""),
        ts: _isoNow(),
      });
      thread.status = "resolved";
      resolvedCount.value++;
      return "applied";
    }

    // confirm-each: present Accept/Reject/Reject-with-refinement/Modify/Skip prompt.
    // Re-dispatch cap: once redispatchCount >= MAX_REDISPATCH, hide the
    // "Reject with refinement" option (E10).
    const promptOptions =
      redispatchCount < MAX_REDISPATCH
        ? ["Accept", "Reject", "Reject with refinement", "Modify", "Skip"]
        : ["Modify", "Skip"];

    const choice = await askUser(
      "Apply edit for thread " + thread.id + "?\n" + (out.diff_ref || "(no diff_ref)") +
        "\n" + (out.system_reply || ""),
      promptOptions
    );

    if (choice === "Accept") {
      if (typeof out.applied_artifact === "string") {
        setHtml(out.applied_artifact);
        fs.writeFileSync(artifactPath, ctx.html, "utf8");
      }
      thread.messages = thread.messages || [];
      thread.messages.push({
        role: "system",
        body: String(out.system_reply || ""),
        ts: _isoNow(),
      });
      thread.status = "resolved";
      resolvedCount.value++;
      return "applied";
    } else if (choice === "Reject with refinement") {
      // re-dispatch with a refinement note. Counter already checked above.
      const note = await askUser(
        "Enter refinement note for thread " + thread.id + ":",
        []
      );
      redispatchCount++;
      thread.messages = thread.messages || [];
      thread.messages.push({ role: "user", body: String(note), ts: _isoNow() });
      body = String(note);
      continue;
    } else if (choice === "Skip" || choice === "Reject") {
      skipped.push({ id: thread.id, reason: "operator_" + choice.toLowerCase() });
      return "skip";
    } else if (choice === "Modify") {
      // T10 records the choice as a skip-for-now; full Modify-edit-then-
      // resubmit UX lands in T14 (Modify-edit-then-resubmit UX). Thread stays open.
      skipped.push({ id: thread.id, reason: "operator_modify_deferred" });
      return "skip";
    } else {
      skipped.push({ id: thread.id, reason: "operator_unknown_choice:" + String(choice) });
      return "skip";
    }
  }
}

// ---- mode branch helpers ----

async function _resolveConfirmEach(openIdxs, threads, ctx) {
  const strategy = {
    promptOnSuccess: true,
    onClarification: "prompt",
  };
  for (const idx of openIdxs) {
    await _resolveSingleThread(threads[idx], ctx, strategy);
  }
}

async function _resolveAuto(openIdxs, threads, ctx) {
  const strategy = {
    promptOnSuccess: false,
    onClarification: "prompt",
  };
  for (const idx of openIdxs) {
    await _resolveSingleThread(threads[idx], ctx, strategy);
  }
}

async function _resolveNonInteractive(openIdxs, threads, ctx) {
  const strategy = {
    promptOnSuccess: false,
    onClarification: "defer",
  };
  for (const idx of openIdxs) {
    await _resolveSingleThread(threads[idx], ctx, strategy);
  }
}

// ---- core resolve loop ----

async function resolve(params) {
  const artifactPath = path.resolve(params.path);
  const mode = params.mode || "confirm-each";
  const askUser = params.askUser || _defaultAskUser;
  const dispatchSubagent = params.dispatchSubagent || _defaultDispatchSubagent;
  const runGit = params.runGit || _defaultRunGit;

  if (!VALID_MODES.has(mode)) {
    throw new Error(
      "resolve: mode='" + mode + "' not implemented — valid modes: " +
        Array.from(VALID_MODES).join(", ")
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

  // T13 — --batch mode (FR-25, §S14, Decision P6).
  //
  // Resolve anchors for all open threads, partition into waves via the
  // wave planner, then per wave: dispatch subagents in parallel, present
  // ONE accept/reject prompt per wave, and on Accept apply edits
  // right-to-left so earlier offsets aren't invalidated. Sequential
  // between waves.
  if (mode === "batch") {
    // 1. Pre-resolve every open thread's anchor.
    const planInputs = [];
    for (const idx of openIdxs) {
      const t = threads[idx];
      const anchorObj = {
        id_anchor: t.id_anchor || (t.anchor && t.anchor.id_anchor) || null,
        quote_anchor: t.quote_anchor || (t.anchor && t.anchor.quote_anchor) || null,
        diagram_anchor: t.diagram_anchor || (t.anchor && t.anchor.diagram_anchor) || null,
      };
      const resolved = resolveAnchor({ anchor: anchorObj, artifactHtml: html });
      if (resolved && resolved.orphan === true) {
        skipped.push({
          id: t.id,
          reason:
            ERROR_ENUM.ANCHOR_ORPHANED +
            ": anchor unresolved (id-first miss + quote-fallback below threshold)",
        });
        continue;
      }
      // Build the planner thread shape: id + anchor (planner reads
      // start_offset/end_offset for text, bbox for svg).
      const plannerAnchor = {};
      if (resolved && resolved.dom_range && resolved.strategy !== "svg-data-anchor"
          && resolved.strategy !== "svg-bbox") {
        plannerAnchor.start_offset = resolved.dom_range.start_offset;
        plannerAnchor.end_offset = resolved.dom_range.end_offset;
      } else if (resolved && resolved.bbox) {
        plannerAnchor.bbox = resolved.bbox;
      } else if (resolved && resolved.dom_range) {
        // SVG resolution with dom_range but no usable bbox — treat as
        // text-style range over its dom_range for packing purposes.
        console.warn(
          "resolver: thread " + t.id + " SVG anchor has no bbox; " +
            "reclassifying as text-range for wave packing"
        );
        plannerAnchor.start_offset = resolved.dom_range.start_offset;
        plannerAnchor.end_offset = resolved.dom_range.end_offset;
      }
      planInputs.push({
        id: t.id,
        anchor: plannerAnchor,
        _thread: t,
        _anchorObj: anchorObj,
      });
    }

    // 2. Plan waves.
    const waves = planWaves(planInputs, overlapRelationFR25);

    // 3. Per wave: dispatch in parallel, one combined prompt, apply RTL.
    for (let wi = 0; wi < waves.length; wi++) {
      const wave = waves[wi];

      // Dispatch all subagents in parallel for this wave. We use
      // Promise.allSettled (not Promise.all) so a dispatcher that returns
      // a synchronously-rejected Promise outside the inner try/catch
      // cannot crash the whole wave — wave-mate isolation does not depend
      // on every dispatcher being well-behaved.
      const settledRaw = await Promise.allSettled(
        wave.map(async (entry) => {
          const t = entry._thread;
          const input = {
            artifact_path: artifactPath,
            anchor: entry._anchorObj,
            body: _lastUserBody(t),
            thread_id: t.id,
          };
          try {
            const out = await dispatchSubagent({ skill: skillSlug, input });
            return { entry, out, err: null };
          } catch (e) {
            return {
              entry,
              out: {
                success: false,
                error_enum: ERROR_ENUM.AGENT_ERRORED,
                system_reply:
                  "Dispatch failed: " + (e && e.message ? e.message : String(e)),
              },
              err: e,
            };
          }
        })
      );
      // Map any allSettled-rejected entries (dispatcher misbehaved before
      // the inner try/catch could catch) to the same failure shape.
      const settled = settledRaw.map((s, i) => {
        if (s.status === "fulfilled") return s.value;
        const entry = wave[i];
        const e = s.reason;
        return {
          entry,
          out: {
            success: false,
            error_enum: ERROR_ENUM.AGENT_ERRORED,
            system_reply:
              "Dispatch failed: " + (e && e.message ? e.message : String(e)),
          },
          err: e,
        };
      });

      // Build a combined diff summary across this wave's successes.
      const successes = settled.filter((r) => r.out && r.out.success === true);
      const failures = settled.filter((r) => !(r.out && r.out.success === true));

      // Record failures as skips immediately (don't gate the wave on them).
      for (const f of failures) {
        const enumv = (f.out && f.out.error_enum) || ERROR_ENUM.AGENT_ERRORED;
        const msg = (f.out && f.out.system_reply) || "(no reply)";
        skipped.push({ id: f.entry._thread.id, reason: enumv + ": " + msg });
      }

      if (successes.length === 0) {
        continue; // nothing to apply this wave
      }

      const diffSummary = successes
        .map((r) => "  - " + r.entry._thread.id + ": " + (r.out.diff_ref || "(no diff_ref)"))
        .join("\n");
      const choice = await askUser(
        "Wave " + (wi + 1) + "/" + waves.length + " — " + successes.length +
          " edit(s) ready:\n" + diffSummary +
          "\nApply this wave?",
        ["Accept wave", "Reject wave", "Defer"]
      );

      if (choice !== "Accept wave") {
        const reason =
          choice === "Reject wave" ? "operator_reject_wave" : "operator_defer_wave";
        for (const r of successes) {
          skipped.push({ id: r.entry._thread.id, reason });
        }
        continue;
      }

      // Apply right-to-left within the wave (planner already RTL-sorted
      // the wave; re-sort defensively in case a caller swapped planner).
      // Mirror the planner's _rightToLeft: primary by kind (text first,
      // then svg), secondary by start_offset DESC, tertiary by id ASC.
      // Use the planner's exported _kind so an SVG that ever populates
      // start_offset still sorts AFTER text threads.
      const kindOf = (entry) => {
        if (typeof _plannerKind === "function") {
          // Planner _kind reads thread.anchor — wrap the entry's planner
          // anchor (entry.anchor was built in planInputs above).
          return _plannerKind({ anchor: entry.anchor });
        }
        if (entry.anchor && entry.anchor.bbox) return "svg";
        if (entry.anchor && typeof entry.anchor.start_offset === "number") return "text";
        return "unknown";
      };
      const ordered = successes.slice().sort((a, b) => {
        const ka = kindOf(a.entry);
        const kb = kindOf(b.entry);
        if (ka !== kb) {
          if (ka === "text") return -1;
          if (kb === "text") return 1;
        }
        const sa = a.entry.anchor && typeof a.entry.anchor.start_offset === "number"
          ? a.entry.anchor.start_offset
          : -1;
        const sb = b.entry.anchor && typeof b.entry.anchor.start_offset === "number"
          ? b.entry.anchor.start_offset
          : -1;
        if (sa !== sb) return sb - sa;
        const ia = String(a.entry._thread.id || "");
        const ib = String(b.entry._thread.id || "");
        if (ia < ib) return -1;
        if (ia > ib) return 1;
        return 0;
      });
      for (const r of ordered) {
        if (typeof r.out.applied_artifact === "string") {
          html = r.out.applied_artifact;
          fs.writeFileSync(artifactPath, html, "utf8");
        }
        const t = r.entry._thread;
        t.messages = t.messages || [];
        t.messages.push({
          role: "system",
          body: String(r.out.system_reply || ""),
          ts: _isoNow(),
        });
        t.status = "resolved";
        resolvedCount++;
      }
    }

    // Persist + stage, then short-circuit.
    fs.writeFileSync(sidecarPath, _serializeSidecar(sidecar), "utf8");
    const repoRoot = _gitRepoRoot(artifactPath, runGit);
    runGit(["add", artifactPath, sidecarPath], { cwd: repoRoot });

    const summary =
      "Resolved " + resolvedCount + "/" + totalOpen +
      " (batch, " + waves.length + " wave(s)). Review with git diff --cached then commit.";
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
      waves: waves.length,
      summary: summary,
    };
  }

  // --- per-thread modes: confirm-each, auto, non-interactive ---
  //
  // Build a shared ctx object; resolvedCount is boxed so _resolveSingleThread
  // can increment it by reference. html is similarly accessed through ctx.html
  // and updated via ctx.setHtml so the batch-style html variable stays in sync.
  const deferred = [];
  const rcBox = { value: 0 };
  let htmlRef = html;

  const ctx = {
    get html() { return htmlRef; },
    artifactPath,
    skillSlug,
    askUser,
    dispatchSubagent,
    deferred,
    skipped,
    resolvedCount: rcBox,
    setHtml(newHtml) { htmlRef = newHtml; },
  };

  if (mode === "auto") {
    await _resolveAuto(openIdxs, threads, ctx);
  } else if (mode === "non-interactive") {
    await _resolveNonInteractive(openIdxs, threads, ctx);
  } else {
    // confirm-each (default)
    await _resolveConfirmEach(openIdxs, threads, ctx);
  }

  resolvedCount = rcBox.value;

  // 4. Persist sidecar; stage via `git add`. The resolver never invokes
  //    the commit verb — operator commits after reviewing staged diff.
  fs.writeFileSync(sidecarPath, _serializeSidecar(sidecar), "utf8");

  const repoRoot = _gitRepoRoot(artifactPath, runGit);
  runGit(["add", artifactPath, sidecarPath], { cwd: repoRoot });

  const summary =
    "Resolved " + resolvedCount + "/" + totalOpen +
    (mode !== "confirm-each" ? " (" + mode + ")" : "") +
    ". Review with git diff --cached then commit.";
  if (params.printSummary !== false) {
    process.stdout.write(summary + "\n");
    if (skipped.length > 0) {
      for (const s of skipped) {
        process.stdout.write("  skipped " + s.id + ": " + s.reason + "\n");
      }
    }
    if (mode === "non-interactive" && deferred.length > 0) {
      process.stdout.write("  deferred (re-run interactively):\n");
      for (const tid of deferred) {
        process.stdout.write("    deferred " + tid + ": operator input required\n");
      }
    }
  }

  const result = {
    artifact: artifactPath,
    sidecar: sidecarPath,
    skill: skillSlug,
    total_open: totalOpen,
    resolved: resolvedCount,
    skipped: skipped,
    summary: summary,
  };

  if (mode === "non-interactive") {
    result.deferred = deferred;
  }

  return result;
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
  CLARIFY_CAP_EXCEEDED_BODY: CLARIFY_CAP_EXCEEDED_BODY,
  _internal: {
    _sidecarPathFor: _sidecarPathFor,
    _readMetaSkill: _readMetaSkill,
    _serializeSidecar: _serializeSidecar,
  },
};
