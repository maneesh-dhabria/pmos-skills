// svg-anchor.js — SVG data-anchor retrofit helper (T23, FR-50, FR-51, S15)
//
// Walks every <g>, top-level <rect>, and top-level <path> in an SVG string,
// derives a slug for each (kebab(id) → kebab(aria-label) → kebab(text content)
// → shape-<N> ordinal fallback), deduplicates within the SVG, and injects
// data-anchor="<slug>" on any element that doesn't already carry one.
//
// Pure: no fs, no git, no process. Node ≥ 12 + browser-compatible (no require).
// Deterministic and idempotent: same input → same output; re-application is safe.

"use strict";

// ---------------------------------------------------------------------------
// kebab(s) → lowercase, replace non-alphanumeric runs with -, trim, collapse
// ---------------------------------------------------------------------------
function kebab(s) {
  if (typeof s !== "string") return "";
  const k = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return k;
}

// ---------------------------------------------------------------------------
// Read an attribute value from a raw attribute string fragment.
// e.g. attrs = ' id="foo" aria-label="Step 1"'
// ---------------------------------------------------------------------------
function _readAttr(attrs, name) {
  // Accept both single and double quotes; case-insensitive attr name match.
  const re = new RegExp(
    "(?:^|[\\s/])" + name.replace(/[-]/g, "\\-") + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')",
    "i"
  );
  const m = attrs.match(re);
  if (!m) return null;
  return m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : null;
}

// ---------------------------------------------------------------------------
// Extract label: aria-label attribute || text content of first child <text>.
// Operates on the raw tag attrs + the raw body text of the element.
// ---------------------------------------------------------------------------
function extractLabel(attrs, body) {
  // aria-label on the element itself
  const al = _readAttr(attrs, "aria-label");
  if (al && al.trim()) return al.trim();

  // first <text>...</text> child text content
  if (body) {
    const tm = body.match(/<text\b[^>]*>([\s\S]*?)<\/text>/i);
    if (tm) {
      // strip inner tags (e.g. <tspan>), collect text
      const raw = tm[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (raw) return raw;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Derive a slug for one element.
// ordinalCounter is a { value: N } box mutated by reference.
// ---------------------------------------------------------------------------
function derivSlug(attrs, body, ordinalCounter) {
  // 1. id attribute
  const id = _readAttr(attrs, "id");
  if (id && id.trim()) {
    const k = kebab(id.trim());
    if (k) return k;
  }

  // 2. aria-label or first <text> child
  const label = extractLabel(attrs, body);
  if (label) {
    const k = kebab(label);
    if (k) return k;
  }

  // 3. ordinal fallback
  const n = ordinalCounter.value++;
  return "shape-" + n;
}

// ---------------------------------------------------------------------------
// Dedupe: if slug already seen, append -2, -3, etc.
// seenSlugs is a Set mutated in place.
// ---------------------------------------------------------------------------
function dedupe(seenSlugs, slug) {
  if (!seenSlugs.has(slug)) {
    seenSlugs.add(slug);
    return slug;
  }
  let n = 2;
  while (seenSlugs.has(slug + "-" + n)) n++;
  const deduped = slug + "-" + n;
  seenSlugs.add(deduped);
  return deduped;
}

// ---------------------------------------------------------------------------
// Minimal regex-based SVG walker.
//
// Strategy:
//   1. Find each top-level <svg>…</svg> block.
//   2. Within the block, walk elements in document order.
//      - A <g> at any nesting level gets a data-anchor.
//      - A <rect> or <path> that is NOT nested inside a <g> gets a data-anchor.
//   3. Inject data-anchor on opening tags that don't already carry one.
//
// Nesting tracking: we maintain a depth counter for <g> groups. Any <rect> or
// <path> encountered while depth > 0 is considered "inside a <g>" and skipped.
// ---------------------------------------------------------------------------

// Match a single opening tag (both self-closing and paired).
// Group 1 = tag name, Group 2 = rest of attrs.
const TAG_RE = /<(\/?)([a-zA-Z][\w-]*)(\s[^>]*)?\/?>/g;

function retrofitSvg(svgString, _opts) {
  if (typeof svgString !== "string") return svgString;

  // Find all <svg>…</svg> blocks and process each independently.
  const svgBlockRe = /<svg\b[^>]*>[\s\S]*?<\/svg>/gi;
  let result = svgString;
  let searchFrom = 0;
  let offset = 0; // cumulative char delta from prior injections

  // Collect all [matchIndex, matchStr] pairs from the original string first
  // (to avoid regex cursor confusion while mutating result).
  const blocks = [];
  {
    const tmp = svgString;
    let bm;
    const br = /<svg\b[^>]*>[\s\S]*?<\/svg>/gi;
    while ((bm = br.exec(tmp)) !== null) {
      blocks.push({ index: bm.index, raw: bm[0] });
    }
  }

  for (const block of blocks) {
    const retrofitted = _retrofitOneSvg(block.raw);
    if (retrofitted === block.raw) continue; // nothing changed

    // Splice retrofitted block into result at the (offset-adjusted) position.
    const adjIdx = block.index + offset;
    result =
      result.slice(0, adjIdx) +
      retrofitted +
      result.slice(adjIdx + block.raw.length);
    offset += retrofitted.length - block.raw.length;
  }

  return result;
}

function _retrofitOneSvg(svgBlock) {
  const seenSlugs = new Set();
  const ordinalCounter = { value: 1 };

  // We'll build the output by copying characters from svgBlock and injecting
  // attribute text just before the closing `>` of qualifying opening tags.

  // We need to identify:
  //   - opening <g …> tags (any nesting) → always retrofit
  //   - opening <rect …> and <path …> at depth 0 (not inside <g>) → retrofit
  //   - closing </g> → decrement depth

  // Approach: scan token-by-token using a stateful walk.

  let out = "";
  let pos = 0;
  let gDepth = 0; // number of open <g> groups we're currently inside

  // We process the inner content (everything after the opening <svg...>).
  // The <svg> tag itself is treated as depth 0 context.

  const tagRe = /<(\/?)([a-zA-Z][\w:-]*)(\s[^>]*)?(\/?)>/g;
  tagRe.lastIndex = 0;

  while (true) {
    const m = tagRe.exec(svgBlock);
    if (!m) break;

    const isClosing = m[1] === "/";
    const tag = m[2].toLowerCase();
    const attrsRaw = m[3] || "";
    const selfClose = m[4] === "/";
    const tagStart = m.index;
    const tagEnd = tagStart + m[0].length;

    // Append verbatim content before this tag.
    out += svgBlock.slice(pos, tagStart);
    pos = tagEnd;

    if (isClosing) {
      if (tag === "g") gDepth = Math.max(0, gDepth - 1);
      out += m[0];
      continue;
    }

    // Opening tag (or self-closing).
    const isG = tag === "g";
    const isRect = tag === "rect";
    const isPath = tag === "path";
    const isSvg = tag === "svg";

    // Decide whether to retrofit this element.
    const shouldRetrofit =
      isG ||
      ((isRect || isPath) && gDepth === 0 && !isSvg);

    if (!shouldRetrofit) {
      // Still need to track <g> nesting even for non-retrofitted tags.
      if (isG && !selfClose) gDepth++;
      out += m[0];
      continue;
    }

    // Check if data-anchor already present (idempotency).
    const existingAnchor = _readAttr(attrsRaw, "data-anchor");
    if (existingAnchor !== null) {
      // Already anchored — preserve as-is, but still update gDepth.
      if (isG && !selfClose) gDepth++;
      out += m[0];
      continue;
    }

    // Derive the body text for label extraction.
    // For <g> we'll look at the first <text> child inside the group body.
    // For self-closing <rect>/<path> there is no body.
    let body = "";
    if (isG && !selfClose) {
      // Peek ahead to grab the content until </g> (just a small slice for label).
      const bodyStart = tagEnd;
      const bodyEnd = Math.min(bodyStart + 512, svgBlock.length);
      body = svgBlock.slice(bodyStart, bodyEnd);
    }

    const rawSlug = derivSlug(attrsRaw, body, ordinalCounter);
    const slug = dedupe(seenSlugs, rawSlug);

    // Rebuild the tag with data-anchor injected before the closing >.
    // m[0] ends with > or />. Insert just before that.
    let tagStr = m[0];
    if (selfClose) {
      // Replace trailing `/>` with ` data-anchor="<slug>"/>`
      tagStr = tagStr.replace(/\s*\/>$/, ' data-anchor="' + slug + '"/>');
    } else {
      // Replace trailing `>` with ` data-anchor="<slug>">`
      tagStr = tagStr.replace(/>$/, ' data-anchor="' + slug + '">');
    }

    out += tagStr;

    if (isG && !selfClose) gDepth++;
  }

  // Append any trailing content after the last tag.
  out += svgBlock.slice(pos);
  return out;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  retrofitSvg,
  _internal: {
    derivSlug,
    kebab,
    extractLabel,
    dedupe,
  },
};
