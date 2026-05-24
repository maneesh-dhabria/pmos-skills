#!/usr/bin/env node
// T13 — wave planner for /comments resolve --batch mode.
// Ported from execute/subagent-driven.md Step A "Wave planning" (Kahn's + greedy packing).
// Source: ~/.claude-personal/plugins/cache/pmos-skills/pmos-toolkit/2.54.0/skills/execute/subagent-driven.md
// sha1: 23ada3a9cd18b5552f5522c911fb4ccda51933ea
//
// In /comments resolve, threads have no dependency edges between them
// (they're static comments on a fixed artifact), so Kahn's layering
// collapses to a single layer; the interesting work is the conflict-
// packing step that respects the FR-25 overlap relation.
//
// Spec refs: FR-25 (i)/(ii)/(iii), §S14; Decision P6.

"use strict";

// ---- FR-25 overlap relation ----
//
//   (i)  text/text  : [a.start, a.end) ∩ [b.start, b.end) non-empty
//   (ii) SVG/SVG    : axis-aligned bbox overlap area > 0
//   (iii) text/SVG  : never overlap *in document space*, BUT we treat
//                     mixed kinds as a SOFT conflict for wave-grouping
//                     purposes (per-skill subagent dispatching batches
//                     per range-type; segregating waves keeps the diff
//                     presentation coherent — see T13 test case (d)).

function _kind(thread) {
  const a = thread && thread.anchor;
  if (!a) return "unknown";
  if (a.orphan === true) return "orphan";
  if (a.bbox) return "svg";
  if (typeof a.start_offset === "number") return "text";
  return "unknown";
}

function _textOverlap(a, b) {
  const aStart = a.start_offset;
  const aEnd = a.end_offset;
  const bStart = b.start_offset;
  const bEnd = b.end_offset;
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

function _bboxOverlap(a, b) {
  const xO = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const yO = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return xO * yO > 0;
}

function overlapRelationFR25(threadA, threadB) {
  const ka = _kind(threadA);
  const kb = _kind(threadB);
  if (ka === "text" && kb === "text") {
    return _textOverlap(threadA.anchor, threadB.anchor);
  }
  if (ka === "svg" && kb === "svg") {
    return _bboxOverlap(threadA.anchor.bbox, threadB.anchor.bbox);
  }
  if ((ka === "text" && kb === "svg") || (ka === "svg" && kb === "text")) {
    // FR-25(iii) — never overlap in document space, but segregate at the
    // wave-grouping layer (soft conflict).
    return true;
  }
  return false;
}

// ---- Kahn's topological sort (vacuous for /comments — every thread is
// in layer 0 because there are no inter-thread dep edges in a static
// sidecar). Kept explicit so future dep-bearing inputs Just Work and the
// function shape matches Decision P6.

function _kahnLayers(threads, depEdges) {
  // depEdges is an optional array of [fromId, toId] pairs expressing
  // "from must run before to". When omitted/empty, in-degree is 0 for
  // every node → a single layer containing every thread (the common
  // /comments case, since static sidecars have no inter-thread edges).
  //
  // If a caller supplies edges and Kahn's detects a cycle (after
  // processing the queue, some nodes still have in-degree > 0), we fall
  // back to an all-singleton layering — each thread in its own layer —
  // which is the safest possible execution: fully sequential, no
  // assumption about which edge to break.
  const edges = Array.isArray(depEdges) ? depEdges : [];
  if (edges.length === 0) return [threads.slice()];

  const byId = new Map();
  for (const t of threads) byId.set(String(t.id), t);

  const inDeg = new Map();
  const adj = new Map();
  for (const t of threads) {
    inDeg.set(String(t.id), 0);
    adj.set(String(t.id), []);
  }
  for (const [from, to] of edges) {
    const f = String(from);
    const tt = String(to);
    if (!inDeg.has(f) || !inDeg.has(tt)) continue;
    adj.get(f).push(tt);
    inDeg.set(tt, inDeg.get(tt) + 1);
  }

  const layers = [];
  let frontier = [];
  for (const [id, deg] of inDeg) if (deg === 0) frontier.push(id);
  let processed = 0;
  while (frontier.length > 0) {
    layers.push(frontier.map((id) => byId.get(id)));
    const next = [];
    for (const id of frontier) {
      processed++;
      for (const m of adj.get(id)) {
        inDeg.set(m, inDeg.get(m) - 1);
        if (inDeg.get(m) === 0) next.push(m);
      }
    }
    frontier = next;
  }

  if (processed < threads.length) {
    // Cycle detected — fall back to all-singleton layering.
    return threads.map((t) => [t]);
  }
  return layers;
}

// ---- Greedy packing within a layer ----
//
// Iterate threads in stable order (by id ascending), placing each into
// the lowest-indexed sub-wave with no conflict; open a new sub-wave if
// none works.

function _stableOrder(threads) {
  return threads.slice().sort((a, b) => {
    const ia = String(a.id || "");
    const ib = String(b.id || "");
    if (ia < ib) return -1;
    if (ia > ib) return 1;
    return 0;
  });
}

function _packLayer(layer, overlapRelation) {
  const subWaves = [];
  for (const t of _stableOrder(layer)) {
    let placed = false;
    for (let i = 0; i < subWaves.length; i++) {
      const wave = subWaves[i];
      let conflict = false;
      for (const other of wave) {
        if (overlapRelation(t, other)) {
          conflict = true;
          break;
        }
      }
      if (!conflict) {
        wave.push(t);
        placed = true;
        break;
      }
    }
    if (!placed) subWaves.push([t]);
  }
  return subWaves;
}

// ---- Right-to-left sort within a wave ----
//
// Apply edits in descending start_offset order so earlier edits don't
// invalidate the offsets of later ones. SVG threads have no offset
// semantics in the text stream; they sort AFTER text threads, with a
// stable secondary by id ascending.

function _rightToLeft(wave) {
  return wave.slice().sort((a, b) => {
    const ka = _kind(a);
    const kb = _kind(b);
    // SVG sorts AFTER text (text first, descending offset).
    if (ka !== kb) {
      if (ka === "text") return -1;
      if (kb === "text") return 1;
    }
    if (ka === "text" && kb === "text") {
      const sa = a.anchor.start_offset;
      const sb = b.anchor.start_offset;
      if (sa !== sb) return sb - sa; // DESC
    }
    // Same kind, same (or no) offset — stable by id ascending.
    const ia = String(a.id || "");
    const ib = String(b.id || "");
    if (ia < ib) return -1;
    if (ia > ib) return 1;
    return 0;
  });
}

// ---- Public API ----

function planWaves(threads, overlapRelation, depEdges) {
  const rel = typeof overlapRelation === "function"
    ? overlapRelation
    : overlapRelationFR25;

  // Exclude orphans entirely (T12 pre-validation in the resolver will
  // surface them as anchor_orphaned skips).
  const eligible = (Array.isArray(threads) ? threads : []).filter(
    (t) => _kind(t) !== "orphan" && _kind(t) !== "unknown"
  );

  if (eligible.length === 0) return [];

  // depEdges is reserved for future dep-bearing inputs (current /comments
  // callers pass none). When supplied with a cycle, _kahnLayers falls
  // back to all-singleton layering — see test case (g).
  const layers = _kahnLayers(eligible, depEdges);
  const waves = [];
  for (const layer of layers) {
    const packed = _packLayer(layer, rel);
    for (const w of packed) waves.push(_rightToLeft(w));
  }
  return waves;
}

module.exports = {
  planWaves,
  overlapRelationFR25,
  _internal: {
    _kind,
    _textOverlap,
    _bboxOverlap,
    _kahnLayers,
    _packLayer,
    _rightToLeft,
    _stableOrder,
  },
};
