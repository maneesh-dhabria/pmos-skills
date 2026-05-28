#!/usr/bin/env node
// T12 — Canonical anchor resolver (id-first + substring-contains quote-fallback + SVG).
//
// Pure function. No I/O. Consumes the FR-22 sidecar anchor schema and the
// artifact HTML string; returns either a resolution descriptor or an
// orphan marker.
//
// Spec refs: §14.1, FR-23, FR-25, P6. (Bitap dropped per /inline-html-artifacts
// T7; exact-substring + prefix/suffix proximity is the sole quote-fallback path.)
// Contract: see plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md
//
//   resolveAnchor({anchor, artifactHtml, threshold?, distance?})
//     → { strategy, dom_range?, score, shape_id?, bbox? }   // success
//     → { orphan: true, score }                              // miss
//
// Strategies (in order):
//   "id-first"          — regex grep id="<anchor.id_anchor>"; score=1.0
//   "quote-fallback"    — exact substring on quote_anchor.text, prefix/suffix bias
//   "svg-data-anchor"   — SVG element matching data-anchor="<shape_id>"
//   "svg-bbox"          — SVG element whose axis-aligned bbox overlaps query

"use strict";

const QUOTE_MIN_SCORE = 0.5;     // §14.1 acceptance floor for quote-fallback
const PROXIMITY_WINDOW = 200;    // chars before/after for prefix/suffix bias
const PROXIMITY_BONUS = 0.1;     // score bump per side when present

// ---------- helpers ----------

function _escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Find a containing <section> bounds for a hit offset, if any. Returns
// {start, end} or null. Cheap, byte-based, not a real parser — sufficient
// for narrowing the Bitap search region inside an id-first hit's section.
function _enclosingSection(html, hitOffset) {
  // Walk backward looking for the nearest "<section" opening tag.
  const before = html.slice(0, hitOffset);
  const openIdx = before.lastIndexOf("<section");
  if (openIdx === -1) return null;
  // Find its matching close. Allow nested sections via a depth counter.
  const reTok = /<\/?section\b[^>]*>/gi;
  reTok.lastIndex = openIdx;
  let depth = 0;
  let m;
  let end = -1;
  while ((m = reTok.exec(html)) !== null) {
    if (m[0][1] === "/") {
      depth--;
      if (depth === 0) {
        end = m.index + m[0].length;
        break;
      }
    } else {
      depth++;
    }
  }
  if (end === -1) return null;
  return { start: openIdx, end };
}

// Locate the <main class="doc"> body region. Falls back to the full
// document when not found. Returns {start, end}.
function _mainDocBounds(html) {
  const re = /<main\b[^>]*class\s*=\s*["'][^"']*\bdoc\b[^"']*["'][^>]*>/i;
  const m = html.match(re);
  if (!m) return { start: 0, end: html.length };
  const start = (m.index || 0) + m[0].length;
  const closeIdx = html.indexOf("</main>", start);
  const end = closeIdx === -1 ? html.length : closeIdx;
  return { start, end };
}

// Bitap dropped per T7 (FR-25 / P6). Substring-contains is the sole fuzzy
// path; non-exact matches are now orphans.

// Score a candidate offset for prefix/suffix proximity. Adds up to
// 2*PROXIMITY_BONUS when both prefix and suffix are found within the
// PROXIMITY_WINDOW on the correct side of the candidate.
function _proximityBonus(html, offset, qLen, prefix, suffix) {
  let bonus = 0;
  if (prefix && prefix.length > 0) {
    const winStart = Math.max(0, offset - PROXIMITY_WINDOW);
    const before = html.slice(winStart, offset);
    if (before.indexOf(prefix) !== -1) bonus += PROXIMITY_BONUS;
  }
  if (suffix && suffix.length > 0) {
    const afterStart = offset + qLen;
    const afterEnd = Math.min(html.length, afterStart + PROXIMITY_WINDOW);
    const after = html.slice(afterStart, afterEnd);
    if (after.indexOf(suffix) !== -1) bonus += PROXIMITY_BONUS;
  }
  return bonus;
}

// Quote-fallback scan with prefix/suffix proximity bias. Returns the
// best candidate across ALL exact occurrences of the query text plus a
// single Bitap fallback when no exact occurrence exists.
function _quoteFallback(html, region, qAnchor) {
  const q = qAnchor.text || "";
  if (!q) return { offset: -1, score: 0, matchedLen: 0 };
  const prefix = qAnchor.prefix || "";
  const suffix = qAnchor.suffix || "";

  // 1. Enumerate every exact occurrence within the region and rank by
  //    proximity bonus.
  const sliceStart = region.start;
  const sliceEnd = region.end;
  // Base score for an exact match is 0.8; proximity bonus (≤ 2 * 0.1)
  // takes the matched-on-both-sides candidate to 1.0 and breaks ties
  // against bare-quote occurrences (spec §14.1 (f)).
  const EXACT_BASE = 0.8;
  let best = { offset: -1, score: 0, matchedLen: 0 };
  let scanFrom = sliceStart;
  while (true) {
    const hit = html.indexOf(q, scanFrom);
    if (hit === -1 || hit >= sliceEnd) break;
    const bonus = _proximityBonus(html, hit, q.length, prefix, suffix);
    const score = Math.min(1.0, EXACT_BASE + bonus);
    if (score > best.score) {
      best = { offset: hit, score, matchedLen: q.length };
    }
    scanFrom = hit + 1;
  }
  if (best.offset !== -1) return best;

  // 2. No exact match — orphan. (Bitap fuzzy path removed per T7 / P6.)
  return { offset: -1, score: 0, matchedLen: 0 };
}

// ---- SVG support ----

// Parse all top-level SVG element tags within a <svg>…</svg> block.
// Returns array of { tag, attrs, start, end }. Self-closing or paired.
function _scanSvgElements(html) {
  const out = [];
  const svgRe = /<svg\b[^>]*>[\s\S]*?<\/svg>/gi;
  let svgMatch;
  while ((svgMatch = svgRe.exec(html)) !== null) {
    const svgStart = svgMatch.index;
    const svgBody = svgMatch[0];
    // Match any element opening tag inside. Both self-closing and paired.
    const elRe = /<([a-zA-Z][\w-]*)\b([^>]*)\/?>/g;
    let em;
    while ((em = elRe.exec(svgBody)) !== null) {
      const tag = em[1];
      if (tag.toLowerCase() === "svg") continue;
      const attrs = em[2] || "";
      out.push({
        tag,
        attrs,
        start: svgStart + em.index,
        end: svgStart + em.index + em[0].length,
      });
    }
  }
  return out;
}

function _readAttr(attrs, name) {
  // Word-boundary on the left so a query like `r` doesn't match the `r`
  // tail of `data-anchor`.
  const re = new RegExp('(?:^|[\\s/])' + _escapeRegex(name) + '\\s*=\\s*["\']([^"\']*)["\']', "i");
  const m = attrs.match(re);
  return m ? m[1] : null;
}

function _numAttr(attrs, name) {
  const v = _readAttr(attrs, name);
  if (v === null) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

// Compute an axis-aligned bbox for common SVG shapes. Returns null when
// the shape is unrecognized or attrs are insufficient.
function _shapeBbox(tag, attrs) {
  const t = tag.toLowerCase();
  if (t === "rect") {
    const x = _numAttr(attrs, "x") || 0;
    const y = _numAttr(attrs, "y") || 0;
    const w = _numAttr(attrs, "width");
    const h = _numAttr(attrs, "height");
    if (w === null || h === null) return null;
    return { x, y, w, h };
  }
  if (t === "circle") {
    const cx = _numAttr(attrs, "cx");
    const cy = _numAttr(attrs, "cy");
    const r = _numAttr(attrs, "r");
    if (cx === null || cy === null || r === null) return null;
    return { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r };
  }
  if (t === "ellipse") {
    const cx = _numAttr(attrs, "cx");
    const cy = _numAttr(attrs, "cy");
    const rx = _numAttr(attrs, "rx");
    const ry = _numAttr(attrs, "ry");
    if (cx === null || cy === null || rx === null || ry === null) return null;
    return { x: cx - rx, y: cy - ry, w: 2 * rx, h: 2 * ry };
  }
  // Generic x/y/width/height fallback (e.g. <image>, <foreignObject>).
  const x = _numAttr(attrs, "x");
  const y = _numAttr(attrs, "y");
  const w = _numAttr(attrs, "width");
  const h = _numAttr(attrs, "height");
  if (x !== null && y !== null && w !== null && h !== null) {
    return { x, y, w, h };
  }
  return null;
}

function _bboxOverlap(a, b) {
  if (!a || !b) return 0;
  const xOverlap = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return xOverlap * yOverlap;
}

function _resolveSvg(html, diagram) {
  if (!diagram) return null;
  const els = _scanSvgElements(html);
  if (els.length === 0) return null;

  // (a) data-anchor match
  if (diagram.shape_id) {
    for (const el of els) {
      const da = _readAttr(el.attrs, "data-anchor");
      if (da === diagram.shape_id) {
        const bbox = _shapeBbox(el.tag, el.attrs);
        return {
          strategy: "svg-data-anchor",
          shape_id: diagram.shape_id,
          bbox,
          dom_range: { start_offset: el.start, end_offset: el.end },
          score: 1.0,
        };
      }
    }
  }

  // (b) bbox overlap fallback
  if (diagram.bbox) {
    let best = null;
    for (const el of els) {
      const bb = _shapeBbox(el.tag, el.attrs);
      if (!bb) continue;
      const area = _bboxOverlap(bb, diagram.bbox);
      if (area > 0 && (!best || area > best.area)) {
        best = { el, bb, area };
      }
    }
    if (best) {
      const queryArea = Math.max(1, diagram.bbox.w * diagram.bbox.h);
      const score = Math.min(1.0, best.area / queryArea);
      return {
        strategy: "svg-bbox",
        shape_id: _readAttr(best.el.attrs, "data-anchor") || null,
        bbox: best.bb,
        dom_range: { start_offset: best.el.start, end_offset: best.el.end },
        score,
      };
    }
  }

  return null;
}

// ---------- public API ----------

function resolveAnchor(params) {
  const anchor = params && params.anchor;
  const html = (params && params.artifactHtml) || "";
  // `threshold`/`distance` params accepted for back-compat but unused — Bitap
  // dropped per T7. Substring-contains is the sole fuzzy path.

  if (!anchor) return { orphan: true, score: 0 };

  // SVG first — diagram_anchor is the strongest discriminator when present
  // (id-first / quote-fallback wouldn't naturally land inside an SVG).
  if (anchor.diagram_anchor) {
    const svg = _resolveSvg(html, anchor.diagram_anchor);
    if (svg) return svg;
    // fall through — operator may have supplied id_anchor as a secondary
  }

  // id-first
  if (anchor.id_anchor) {
    const re = new RegExp('id\\s*=\\s*["\']' + _escapeRegex(anchor.id_anchor) + '["\']');
    const m = html.match(re);
    if (m) {
      const idx = html.indexOf(m[0]);
      // Narrow region for any quote_anchor proximity scoring, but for the
      // id-first strategy we report the id hit directly (§14.1 (a)).
      return {
        strategy: "id-first",
        dom_range: { start_offset: idx, end_offset: idx + m[0].length },
        score: 1.0,
      };
    }
    // id missed — fall through to quote-fallback over the whole doc body.
  }

  // quote-fallback
  if (anchor.quote_anchor && anchor.quote_anchor.text) {
    const region = _mainDocBounds(html);
    const r = _quoteFallback(html, region, anchor.quote_anchor);
    if (r.offset !== -1 && r.score >= QUOTE_MIN_SCORE) {
      // Use matchedLen (not text.length) so a Bitap probe truncated to
      // Match_MaxBits does not over-claim the matched span. Exact hits
      // set matchedLen = text.length, preserving prior behavior.
      const matchedLen = (typeof r.matchedLen === "number" && r.matchedLen > 0)
        ? r.matchedLen
        : anchor.quote_anchor.text.length;
      return {
        strategy: "quote-fallback",
        dom_range: {
          start_offset: r.offset,
          end_offset: r.offset + matchedLen,
        },
        score: r.score,
      };
    }
    return { orphan: true, score: r.score };
  }

  return { orphan: true, score: 0 };
}

module.exports = {
  resolveAnchor,
  // Exposed for white-box tests and reuse by per-skill apply-edit shims.
  _internal: {
    _enclosingSection,
    _mainDocBounds,
    _quoteFallback,
    _scanSvgElements,
    _shapeBbox,
    _bboxOverlap,
    _resolveSvg,
  },
};
