#!/usr/bin/env node
// T20 — /survey-analyse "Apply comment-resolver edit" Node-callable shim.
//
// Contract: plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md
// Spec refs: §9.1 (input/output), §9.2 (error_enum), §9.3 (idempotency).
//
// Minimal in-shim anchor resolver (id-first + Bitap-via-dmp fallback).
// The full resolver lands in T12 at comments/scripts/anchor-resolver.js;
// this shim ships just enough resolution to satisfy the §9.1 contract for
// /survey-analyse's per-skill apply-edit phase. Surface area kept ≤ ~220 LOC.
//
// Skill-specific feasibility refusal (plan callout):
//   Edits to chart data (any <script type="application/json"> block or
//   chart-config block) return agent_judged_infeasible with system_reply:
//     "Chart data is generated from the response set — re-run /survey-analyse with updated responses."
//   Analysis prose IS editable.

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
// no-op contract within a single `/comments resolve` run; the persistent
// "already applied" check lives in the resolver and uses the semantic-
// keyword overlap rule.
const _applied = new Set();

function _key(input) {
  const sha = crypto
    .createHash("sha1")
    .update(String(input.body || ""))
    .digest("hex");
  return `${input.artifact_path}:${input.thread_id}:${sha}`;
}

// Skill-specific: detect edits targeting chart data regions.
// Chart data lives inside <script type="application/json"> blocks and
// chart-config objects. These are generated from the response set and
// are read-only in apply-edit.
//
// Detection strategy: if the anchor's id_anchor matches known chart-data
// patterns, or if the artifact HTML shows the anchor position is inside
// a <script type="application/json"> or chart-config block, refuse.
function _isChartDataEdit(input, html) {
  if (!input || !input.anchor) return false;
  const id = (input.anchor.id_anchor || "").toLowerCase();

  // Known chart-data id patterns: chart-*, data-*, per-question chart sections.
  if (/^(?:chart-|pmos-chart-|data-block-|chart-config-)/.test(id)) return true;

  // Check the quote_anchor text for chart data patterns.
  const qt = input.anchor.quote_anchor && input.anchor.quote_anchor.text
    ? String(input.anchor.quote_anchor.text)
    : "";
  if (/"(?:labels|datasets|data|type)"\s*:/.test(qt)) return true;

  // If html is available, check whether the resolved anchor position falls
  // inside a <script type="application/json"> block.
  if (html && id) {
    const re = new RegExp(`id\\s*=\\s*["']${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`);
    const m = html.match(re);
    if (m) {
      const pos = html.indexOf(m[0]);
      // Walk backward from pos to find the nearest opening <script tag.
      const before = html.slice(0, pos);
      // Use \b after "script" so we match only genuine opening <script tags
      // and not the "script" substring inside </script> close tags.
      // (Without \b, `<script` is a prefix of `</script>` and lastIndexOf
      //  would match inside a close tag, causing a false-positive.)
      let lastScriptOpen = -1;
      const scriptOpenRe = /<script\b/g;
      let scriptMatch;
      while ((scriptMatch = scriptOpenRe.exec(before)) !== null) {
        lastScriptOpen = scriptMatch.index;
      }
      const lastScriptClose = before.lastIndexOf("</script>");
      // If the last <script open comes after the last </script> close, we're inside a script block.
      if (lastScriptOpen > lastScriptClose) {
        const scriptTag = html.slice(lastScriptOpen, lastScriptOpen + 200);
        if (/type\s*=\s*["']application\/json["']/.test(scriptTag)) return true;
      }
    }
  }

  return false;
}

// Heuristic: out-of-scope restructure.
function _isInfeasible(body) {
  if (!body) return false;
  const firstSentence = String(body).split(/[.!?]/)[0] || "";
  if (!/\brewrite\b/i.test(firstSentence)) return false;
  const refs = firstSentence.match(/(?:§|S)\d+/g) || [];
  return refs.length >= 2;
}

// Heuristic: question with " or " → clarification path.
function _maybeClarification(body) {
  if (!body) return null;
  const text = String(body).trim();
  if (!text.endsWith("?")) return null;
  if (!/\bor\b/i.test(text)) return null;
  // Find the " X or Y" tail. Strip leading scaffolding (e.g., "should this be ").
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
    // id-first: cheap regex grep on id="<id>".
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
    dmp.Match_Threshold = 0.3; // accept loosely; convert to score below
    dmp.Match_Distance = 1000;
    // dmp's Bitap is bounded by Match_MaxBits (32 in JS). For longer
    // queries we search on a leading window — sufficient to locate the
    // anchor neighborhood; full alignment is the resolver's job (T12).
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
    // 0. Clarification heuristic (precedes resolution; question can apply
    //    regardless of anchor state).
    const clar = _maybeClarification(input.body);
    if (clar) {
      return { clarification: clar };
    }

    // 1. Skill-specific: chart data edit refusal (pre-read check on anchor id).
    if (_isChartDataEdit(input, null)) {
      return {
        success: false,
        error_enum: ERROR_ENUM.AGENT_JUDGED_INFEASIBLE,
        system_reply:
          "Chart data is generated from the response set — re-run /survey-analyse with updated responses.",
      };
    }

    // 2. Infeasibility heuristic.
    if (_isInfeasible(input.body)) {
      return {
        success: false,
        error_enum: ERROR_ENUM.AGENT_JUDGED_INFEASIBLE,
        system_reply:
          "Cannot apply: request reads as an out-of-scope restructure spanning multiple sections. Next: split into per-section threads.",
      };
    }

    // 3. Read artifact.
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

    // 4. Post-read chart data check (with html context for deeper detection).
    if (_isChartDataEdit(input, html)) {
      return {
        success: false,
        error_enum: ERROR_ENUM.AGENT_JUDGED_INFEASIBLE,
        system_reply:
          "Chart data is generated from the response set — re-run /survey-analyse with updated responses.",
      };
    }

    // 5. Resolve anchor.
    const resolved = _resolveAnchor(html, input.anchor);
    if (!resolved.ok) {
      return {
        success: false,
        error_enum: ERROR_ENUM.ANCHOR_ORPHANED,
        system_reply:
          "Anchor could not be resolved (id-first miss + quote-fallback below 0.7). Thread stays open with orphaned=true for operator triage.",
      };
    }

    // 6. Idempotency check (§9.3).
    const key = _key(input);
    if (_applied.has(key)) {
      return {
        success: true,
        diff_ref: "no-op: edit already applied",
        system_reply: "Edit already present in artifact; marking resolved without changes.",
      };
    }

    // 7. Propose edit + synthesize applied_artifact. The shim does NOT
    //    do real prose rewriting (that's the originating skill's deeper
    //    machinery, T12+). It inserts a single HTML annotation comment
    //    immediately before the resolved anchor element capturing the
    //    operator's request — byte-real (shows in git diff), idempotent
    //    via the per-process ledger. Lets the tracer demo (T11) prove
    //    the apply path works end-to-end.
    _applied.add(key);
    const r = resolved.dom_range;
    const bodyExcerpt = String(input.body || "").slice(0, 80).replace(/-->/g, "--&gt;");
    const annotation = `<!-- comment-resolver: thread=${input.thread_id} skill=survey-analyse request="${bodyExcerpt}" -->\n`;
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
