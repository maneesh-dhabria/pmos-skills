#!/usr/bin/env node
// T19 — /diagram "Apply comment-resolver edit" Node-callable shim.
//
// Contract: plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md
// Spec refs: §9.1 (input/output), §9.2 (error_enum), §9.3 (idempotency).
//
// /diagram emits a single SVG file (or HTML wrapping an SVG). Applyable
// surface: textual edits to SVG <text> elements. Infeasible surface: edits
// to geometry (shape coords, paths, viewBox) — SVG-retrofit territory
// deferred to T23 — return agent_judged_infeasible for those.
//
// Minimal in-shim anchor resolver (id-first via data-anchor + Bitap
// quote-fallback). Surface area kept ≤ ~200 LOC.

"use strict";

const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const DMP_PATH = path.join(
  __dirname,
  "..",
  "..",
  "_shared",
  "html-authoring",
  "assets",
  "diff-match-patch.js"
);
const { diff_match_patch } = require(DMP_PATH);

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

// Infeasibility: geometry edits (coords, paths, viewBox, dimensions)
// require SVG-retrofit machinery deferred to T23.
function _isInfeasible(body) {
  if (!body) return false;
  const text = String(body);
  // Cross-section restructure — same heuristic as /spec shim.
  const firstSentence = text.split(/[.!?]/)[0] || "";
  if (/\brewrite\b/i.test(firstSentence)) {
    const refs = firstSentence.match(/(?:§|S)\d+/g) || [];
    if (refs.length >= 2) return true;
  }
  // SVG geometry edits → infeasible (T23 deferred).
  if (
    /\b(move|resize|reposition|reshape|coords?|coordinates?|path\s+data|viewBox|cx|cy|rx|ry|x1|y1|x2|y2|width|height|polygon|polyline)\b/i.test(
      text
    )
  ) {
    return true;
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

// Anchor resolution for diagram:
// 1. id-first: tries id="<id>" (HTML wrapper) or data-anchor="<id>" (SVG
//    nodes annotated by /diagram emit).
// 2. Bitap quote-fallback on quote_anchor.text (for <text> element content).
function _resolveAnchor(html, anchor) {
  if (!anchor) return { ok: false, reason: "missing_anchor" };
  const id = anchor.id_anchor;
  if (id) {
    // Try standard id= first.
    const reId = new RegExp(`id\\s*=\\s*["']${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`);
    const mId = html.match(reId);
    if (mId) {
      const idx = html.indexOf(mId[0]);
      return {
        ok: true,
        strategy: "id-first",
        dom_range: { start_offset: idx, end_offset: idx + mId[0].length },
        score: 1.0,
      };
    }
    // Try SVG data-anchor= (used by /diagram's node annotations).
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
  if (q && q.text) {
    const dmp = new diff_match_patch();
    dmp.Match_Threshold = 0.3;
    dmp.Match_Distance = 1000;
    const maxBits = dmp.Match_MaxBits || 32;
    const probe = q.text.length > maxBits ? q.text.slice(0, maxBits) : q.text;
    let loc = -1;
    try {
      loc = dmp.match_main(html, probe, 0);
    } catch (_) {
      loc = -1;
    }
    if (loc !== -1) {
      const slice = html.substr(loc, probe.length);
      const edits = dmp.diff_levenshtein(dmp.diff_main(slice, probe));
      const score = Math.max(0, 1 - edits / Math.max(probe.length, 1));
      if (score >= 0.7) {
        return {
          ok: true,
          strategy: "quote-fallback",
          dom_range: { start_offset: loc, end_offset: loc + q.text.length },
          score,
        };
      }
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

    // 1. Infeasibility heuristic (diagram-specific: geometry edits).
    if (_isInfeasible(input.body)) {
      return {
        success: false,
        error_enum: ERROR_ENUM.AGENT_JUDGED_INFEASIBLE,
        system_reply:
          "Cannot apply: edit targets SVG geometry (shape coords, paths, dimensions). SVG-retrofit is deferred to T23. Regenerate the diagram via /diagram for structural layout changes.",
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
    const annotation = `<!-- comment-resolver: thread=${input.thread_id} skill=diagram request="${bodyExcerpt}" -->\n`;
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
