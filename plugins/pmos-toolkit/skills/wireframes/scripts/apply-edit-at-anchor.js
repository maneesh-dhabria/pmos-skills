#!/usr/bin/env node
// T19 — /wireframes "Apply comment-resolver edit" Node-callable shim.
//
// Contract: plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md
// Spec refs: §9.1 (input/output), §9.2 (error_enum), §9.3 (idempotency).
//
// /wireframes emits a subfolder of N per-screen HTML files + index.html.
// Applyable surface: textual/HTML edits inside an individual screen file.
// Infeasible surface: edits to index.html structure (<nav>, screen list)
// — those require regeneration via /wireframes.
//
// Minimal in-shim anchor resolver (id-first + naive substring-contains fallback,
// FR-25 / P6). Surface area kept ≤ ~200 LOC.

"use strict";

const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

// Closed error_enum per the contract doc.
const ERROR_ENUM = Object.freeze({
  ANCHOR_ORPHANED: "anchor_orphaned",
  EDIT_CONFLICTED: "edit_conflicted",
  AGENT_JUDGED_INFEASIBLE: "agent_judged_infeasible",
  AGENT_ERRORED: "agent_errored",
});

// Per-process idempotency ledger. Keyed by
// `${artifact_path}:${thread_id}:sha1(body)`. Sufficient for the §9.3
// no-op contract within a single `/comments resolve` run.
const _applied = new Set();

function _key(input) {
  const sha = crypto
    .createHash("sha1")
    .update(String(input.body || ""))
    .digest("hex");
  return `${input.artifact_path}:${input.thread_id}:${sha}`;
}

// Infeasibility: edits to index.html structure (nav, screen list) must
// be regenerated via /wireframes. Heuristic: body mentions "index" or
// "nav" or "screen list" with a structural directive verb.
function _isInfeasible(body, artifactPath) {
  if (!body) return false;
  const text = String(body);
  // Cross-screen restructure spanning multiple sections — same heuristic
  // as /spec shim.
  const firstSentence = text.split(/[.!?]/)[0] || "";
  if (/\brewrite\b/i.test(firstSentence)) {
    const refs = firstSentence.match(/(?:§|S)\d+/g) || [];
    if (refs.length >= 2) return true;
  }
  // Index-structure edit — only infeasible when the artifact IS the
  // index.html (nav / screen-list edits require full regen).
  // TODO: this gate hard-codes 'index.html'; if /wireframes ever renames its index emit (e.g., 'nav.html'/'home.html'),
  // this check silently disables and the structural-change refusal stops firing. Re-evaluate when/if the emit naming
  // convention changes.
  if (artifactPath && path.basename(artifactPath) === "index.html") {
    if (/\b(nav|navigation|screen.?list|card.?grid|reorder|add.?screen|remove.?screen)\b/i.test(text)) {
      return true;
    }
  }
  return false;
}

// Heuristic: question with " or " → clarification path.
function _maybeClarification(body) {
  if (!body) return null;
  const text = String(body).trim();
  if (!text.endsWith("?")) return null;
  if (!/\bor\b/i.test(text)) return null;
  const m = text.match(/\b([\w-]+)\s+or\s+([\w-]+)\??$/i);
  if (!m) return null;
  const a = m[1].replace(/[?.,;:!]+$/, "").trim();
  const b = m[2].replace(/[?.,;:!]+$/, "").trim();
  return { question: text, options: [a, b] };
}

// Anchor resolution: id-first (id= then SVG data-anchor=); then naive
// substring-contains on quote_anchor.text (FR-25, P6). Quote must be ≥40 chars
// to avoid false matches.
function _resolveAnchor(html, anchor) {
  if (!anchor) return { ok: false, reason: "missing_anchor" };
  const id = anchor.id_anchor;
  if (id) {
    // Try standard id= first.
    const re = new RegExp(`id\\s*=\\s*["']${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`);
    const m = html.match(re);
    if (m) {
      const idx = html.indexOf(m[0]);
      return {
        ok: true,
        strategy: "id-first",
        dom_range: { start_offset: idx, end_offset: idx + m[0].length },
        score: 1.0,
      };
    }
    // Try SVG data-anchor= (post-refactor screen regions carry data-anchor,
    // no id). comments.js stores shape_id = the data-anchor value and drives
    // it through id_anchor, so it resolves under the same id-first strategy.
    const reData = new RegExp(
      `data-anchor\\s*=\\s*["']${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`
    );
    const mData = html.match(reData);
    if (mData) {
      const idx = html.indexOf(mData[0]);
      return {
        ok: true,
        strategy: "id-first",
        dom_range: { start_offset: idx, end_offset: idx + mData[0].length },
        score: 1.0,
      };
    }
  }
  const q = anchor.quote_anchor;
  if (q && q.text && q.text.length >= 40) {
    const idx = html.indexOf(q.text);
    if (idx !== -1) {
      return {
        ok: true,
        strategy: "substring-contains",
        dom_range: { start_offset: idx, end_offset: idx + q.text.length },
        score: 0.8,
      };
    }
  }
  return { ok: false, reason: "unresolved" };
}

async function apply(input) {
  try {
    // 0. Clarification heuristic.
    const clar = _maybeClarification(input.body);
    if (clar) {
      return { clarification: clar };
    }

    // 1. Infeasibility heuristic (wireframes-specific: index.html structure).
    if (_isInfeasible(input.body, input.artifact_path)) {
      return {
        success: false,
        error_enum: ERROR_ENUM.AGENT_JUDGED_INFEASIBLE,
        system_reply:
          "Cannot apply: edit targets index.html navigation or screen-list structure. Regenerate via /wireframes to restructure across-screen layout.",
      };
    }

    // 2. Read artifact.
    let html;
    try {
      html = fs.readFileSync(input.artifact_path, "utf8");
    } catch (e) {
      return {
        success: false,
        error_enum: ERROR_ENUM.AGENT_ERRORED,
        system_reply: "Cannot read artifact: " + (e && e.message),
      };
    }

    // 3. Resolve anchor.
    const resolved = _resolveAnchor(html, input.anchor);
    if (!resolved.ok) {
      return {
        success: false,
        error_enum: ERROR_ENUM.ANCHOR_ORPHANED,
        system_reply:
          "Anchor could not be resolved (id-first miss + quote-fallback below 0.7). Thread stays open with orphaned=true for operator triage.",
      };
    }

    // 4. Idempotency check (§9.3).
    const key = _key(input);
    if (_applied.has(key)) {
      return {
        success: true,
        diff_ref: "no-op: edit already applied",
        system_reply: "Edit already present in artifact; marking resolved without changes.",
      };
    }

    // 5. Propose edit — insert annotation comment before resolved anchor.
    _applied.add(key);
    const r = resolved.dom_range;
    const bodyExcerpt = String(input.body || "").slice(0, 80).replace(/-->/g, "--&gt;");
    const annotation = `<!-- comment-resolver: thread=${input.thread_id} skill=wireframes request="${bodyExcerpt}" -->\n`;
    const applied_artifact =
      html.slice(0, r.start_offset) + annotation + html.slice(r.start_offset);
    return {
      success: true,
      diff_ref: `staged: offsets ${r.start_offset}–${r.end_offset} in ${path.basename(
        input.artifact_path
      )} (strategy=${resolved.strategy}, score=${resolved.score.toFixed(2)})`,
      system_reply: `Proposed edit at #${input.anchor && input.anchor.id_anchor} per request: "${String(
        input.body || ""
      ).slice(0, 80)}". Resolved.`,
      applied_artifact,
    };
  } catch (e) {
    return {
      success: false,
      error_enum: ERROR_ENUM.AGENT_ERRORED,
      system_reply: "Subagent errored: " + (e && e.message ? e.message : String(e)),
    };
  }
}

module.exports = { apply, ERROR_ENUM };
