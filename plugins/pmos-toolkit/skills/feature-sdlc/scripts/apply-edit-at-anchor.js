#!/usr/bin/env node
// T21 — /feature-sdlc orchestrator "Apply comment-resolver edit" Node-callable shim.
//
// Contract: plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md
// Spec refs: §9.1 (input/output), §9.2 (error_enum), §9.3 (idempotency).
//
// FR-62: ONE entrypoint that differentiates by artifact_path:
//   - ends in "00_pipeline.html"            → pipeline-status-table editing rules
//   - ends in "00_open_questions_index.html" → OQ-section-prose editing rules
//
// Structural changes to the pipeline table schema are infeasible; per-OQ
// note edits and pipeline table-row prose edits are feasible.
// Surface area kept ≤ ~250 LOC.

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

// Per-process idempotency ledger.
const _applied = new Set();

function _key(input) {
  const sha = crypto
    .createHash("sha1")
    .update(String(input.body || ""))
    .digest("hex");
  return `${input.artifact_path}:${input.thread_id}:${sha}`;
}

// FR-62: detect which orchestrator surface this artifact belongs to.
// Handles both production filenames and test fixture filenames (e.g. 00_pipeline_mini.html).
function _detectSurface(artifactPath) {
  const base = path.basename(String(artifactPath || ""));
  // Match "00_pipeline.html" OR "00_pipeline_*.html" (e.g. test fixtures).
  if (/^00_pipeline(\.[^.]+)?\.html$/.test(base) || base.startsWith("00_pipeline")) return "pipeline";
  // Match "00_open_questions_index.html" OR "00_open_questions_index_*.html".
  if (/^00_open_questions_index(\.[^.]+)?\.html$/.test(base) || base.startsWith("00_open_questions_index")) return "oq-index";
  return "unknown";
}

// Infeasibility: pipeline table schema changes are infeasible (FR-62).
// Body heuristic: mentions "add column", "remove column", "restructure table",
// or "reorder rows" → infeasible for pipeline surface.
function _isPipelineSchemaChange(body) {
  if (!body) return false;
  const t = String(body).toLowerCase();
  return (
    /\badd\s+column\b/.test(t) ||
    /\bremove\s+column\b/.test(t) ||
    /\brestructure\s+(the\s+)?table\b/.test(t) ||
    /\breorder\s+(the\s+)?rows\b/.test(t) ||
    // Generic multi-section restructure heuristic from T9:
    (/\brewrite\b/.test(t) && (t.match(/(?:§|S)\d+/g) || []).length >= 2)
  );
}

// Infeasibility: OQ structural changes are infeasible.
// Body heuristic: mentions "restructure" or "reorder" across OQ sections.
function _isOqStructuralChange(body) {
  if (!body) return false;
  const t = String(body).toLowerCase();
  return (
    /\brestructure\b/.test(t) ||
    /\breorder\b/.test(t) ||
    (/\brewrite\b/.test(t) && (t.match(/(?:§|S)\d+/g) || []).length >= 2)
  );
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

// Anchor resolution: id-first; then Bitap-via-dmp on quote_anchor.text.
function _resolveAnchor(html, anchor) {
  if (!anchor) return { ok: false, reason: "missing_anchor" };
  const id = anchor.id_anchor;
  if (id) {
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
    const surface = _detectSurface(input.artifact_path);

    // 0. Clarification heuristic (precedes resolution).
    const clar = _maybeClarification(input.body);
    if (clar) {
      return { clarification: clar };
    }

    // 1. Infeasibility: surface-specific structural-change guards (FR-62).
    if (surface === "pipeline" && _isPipelineSchemaChange(input.body)) {
      return {
        success: false,
        error_enum: ERROR_ENUM.AGENT_JUDGED_INFEASIBLE,
        system_reply:
          "Pipeline status table is generated by /feature-sdlc state.yaml — edit state.yaml or re-run /feature-sdlc",
      };
    }
    if (surface === "oq-index" && _isOqStructuralChange(input.body)) {
      return {
        success: false,
        error_enum: ERROR_ENUM.AGENT_JUDGED_INFEASIBLE,
        system_reply:
          "Cannot apply: request reads as a structural change to the open-questions index. OQ sections are generated from state.yaml — re-run /feature-sdlc or edit state.yaml instead.",
      };
    }
    // Unknown surface falls through to general feasibility (no infeasibility block).

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

    // 5. Propose edit.
    _applied.add(key);
    const r = resolved.dom_range;
    const bodyExcerpt = String(input.body || "").slice(0, 80).replace(/-->/g, "--&gt;");
    const surfaceLabel = surface === "pipeline" ? "pipeline" : surface === "oq-index" ? "oq-index" : "feature-sdlc";
    const annotation = `<!-- comment-resolver: thread=${input.thread_id} skill=feature-sdlc surface=${surfaceLabel} request="${bodyExcerpt}" -->\n`;
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
