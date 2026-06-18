#!/usr/bin/env node
// svg-metrics.mjs — zero-dependency deterministic SVG hard-gate metrics computer.
//
// CLI:  node svg-metrics.mjs <file.svg> --theme <theme-name>
//   Loads ../themes/<theme>/theme.yaml (relative to THIS script) for per-theme ceilings.
//   Emits to stdout: { hard_fails: string[], metrics: {...}, pass: boolean }
//     pass === (hard_fails.length === 0)
//
// Exit codes:
//   0   readable file (even if it has hard_fails)
//  64   usage error (missing file arg / missing --theme / unreadable svg)
//   2   theme load error (missing/unparseable theme.yaml, or missing required keys)
//
// Parsing posture: this is a PRAGMATIC regex/string SVG inspector, NOT a full XML
// validator and NOT an XML DOM. No XML library is available in this runtime, so every
// check below operates on the raw source text. Heuristic gates are documented inline.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Tiny hand-rolled YAML reader.
// The theme files are flat / 2-space-nested and simple. We only need:
//   palette.max_colors (int), palette.ink (hex), stroke.min_effective_px (float).
// A focused reader (readThemeYaml, below) parses exactly that known shape —
// `key:`, `key: value`, 2-space nesting, quoted scalars, `- hex:`/`name:` list
// items, and `>`/`|` block scalars (skipped). It is deliberately minimal; do
// NOT treat it as a general YAML parser, and do NOT pull a YAML dependency.
// ---------------------------------------------------------------------------
function stripQuotes(s) {
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function coerce(s) {
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~' || s === '') return null;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d*\.\d+$/.test(s)) return parseFloat(s);
  return s;
}

// The parser above provisionally stores empty-valued keys as maps with a listTarget
// array. To keep things robust without a second pass, we re-implement the list-folding
// directly with a small purpose-built parser that the theme schema needs. Given the
// flat, well-known shape we parse the few keys we need with a focused reader:
function readThemeYaml(text) {
  const out = { palette: { max_colors: null, ink: null, accents: [] }, stroke: { min_effective_px: null, single_weight: null } };
  const lines = text.split(/\r?\n/);
  let section = null;       // 'palette' | 'stroke' | 'fallback' | null
  let inAccents = false;
  let curAccent = null;
  let blockSkipIndent = null;

  for (const raw of lines) {
    if (raw.trim() === '' || raw.trim().startsWith('#')) continue;
    const indent = raw.length - raw.replace(/^ +/, '').length;

    if (blockSkipIndent !== null) {
      if (indent > blockSkipIndent) continue;
      blockSkipIndent = null;
    }

    const t = raw.trim();

    // top-level section headers (indent 0)
    if (indent === 0) {
      inAccents = false; curAccent = null;
      const m = t.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (m) {
        section = m[1];
        const v = m[2];
        if (v === '>' || v === '|') { blockSkipIndent = indent; }
      }
      continue;
    }

    // nested under a section (indent 2 typically)
    if (section === 'palette') {
      const accStart = t.match(/^accents:\s*$/);
      if (accStart) { inAccents = true; continue; }
      if (inAccents) {
        const li = t.match(/^-\s*hex:\s*(.+)$/);
        if (li) { out.palette.accents.push({ hex: stripQuotes(li[1]) }); curAccent = out.palette.accents[out.palette.accents.length - 1]; continue; }
        const nm = t.match(/^name:\s*(.+)$/);
        if (nm && curAccent) { curAccent.name = stripQuotes(nm[1]); continue; }
        const li2 = t.match(/^-\s*(.+)$/);
        if (li2) { out.palette.accents.push(coerce(stripQuotes(li2[1]))); continue; }
      }
      const mc = t.match(/^max_colors:\s*(.+)$/);
      if (mc) { out.palette.max_colors = coerce(stripQuotes(mc[1])); inAccents = false; continue; }
      const ink = t.match(/^ink:\s*(.+)$/);
      if (ink) { out.palette.ink = stripQuotes(ink[1]); inAccents = false; continue; }
    } else if (section === 'stroke') {
      const me = t.match(/^min_effective_px:\s*(.+)$/);
      if (me) { out.stroke.min_effective_px = coerce(stripQuotes(me[1])); continue; }
      const sw = t.match(/^single_weight:\s*(.+)$/);
      if (sw) { out.stroke.single_weight = coerce(stripQuotes(sw[1])); continue; }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Mark-type aspect bounds (FR6).
// The `viewbox-not-square` gate compares the viewBox aspect against a band that
// depends on the mark's intended usage:
//   - lockup types (combination/emblem/wordmark) are legitimately wide -> [0.8, 4.0]
//   - square types (favicon/pictorial/abstract/lettermark/monogram/mascot) -> [0.8, 1.25]
//   - flag absent -> back-compat default square band [0.8, 1.25]
// An icon-only variant of a lockup is gated as a square icon by the caller passing
// a square mark type (or omitting the flag) when it checks the icon file.
// ---------------------------------------------------------------------------
const LOCKUP_MARK_TYPES = ['combination', 'emblem', 'wordmark'];
const SQUARE_MARK_TYPES = ['favicon', 'pictorial', 'abstract', 'lettermark', 'monogram', 'mascot'];
const ALL_MARK_TYPES = [...LOCKUP_MARK_TYPES, ...SQUARE_MARK_TYPES];
const SQUARE_ASPECT_BOUNDS = { min: 0.8, max: 1.25 };
const LOCKUP_ASPECT_BOUNDS = { min: 0.8, max: 4.0 };

// Resolve the allowed aspect band for a mark type. `null`/undefined -> square default.
// An unknown (non-null) value returns null so callers can reject it.
function aspectBoundsFor(markType) {
  if (markType == null) return SQUARE_ASPECT_BOUNDS;
  if (LOCKUP_MARK_TYPES.includes(markType)) return LOCKUP_ASPECT_BOUNDS;
  if (SQUARE_MARK_TYPES.includes(markType)) return SQUARE_ASPECT_BOUNDS;
  return null; // unknown mark type
}

// ---------------------------------------------------------------------------
// Color normalization
// ---------------------------------------------------------------------------
const NAMED_COLORS = {
  white: '#ffffff', black: '#000000', red: '#ff0000', green: '#008000',
  blue: '#0000ff', yellow: '#ffff00', orange: '#ffa500', purple: '#800080',
  gray: '#808080', grey: '#808080', silver: '#c0c0c0', navy: '#000080',
  teal: '#008080', maroon: '#800000', olive: '#808000', lime: '#00ff00',
  aqua: '#00ffff', fuchsia: '#ff00ff',
};
const IGNORED_COLOR_TOKENS = new Set(['none', 'transparent', 'currentcolor']);

function normalizeColor(raw) {
  if (raw == null) return null;
  let c = raw.trim().toLowerCase();
  if (c === '') return null;
  if (IGNORED_COLOR_TOKENS.has(c)) return null;
  if (c.startsWith('url(')) return null;          // gradient/pattern ref, not a literal color
  if (NAMED_COLORS[c]) c = NAMED_COLORS[c];
  if (c.startsWith('#')) {
    const hex = c.slice(1);
    if (/^[0-9a-f]{3}$/.test(hex)) {
      return '#' + hex.split('').map((h) => h + h).join('');
    }
    if (/^[0-9a-f]{6}$/.test(hex)) return '#' + hex;
    if (/^[0-9a-f]{8}$/.test(hex)) return '#' + hex.slice(0, 6); // drop alpha for counting
    return c; // unknown hex length — keep as-is (still counts as distinct)
  }
  // rgb()/hsl()/other functional or unknown named color — count the literal string.
  return c.replace(/\s+/g, '');
}

// ---------------------------------------------------------------------------
// SVG inspection (regex-based)
// ---------------------------------------------------------------------------
function attrValues(svg, attrName) {
  // returns array of values for attrName="..."
  // The leading (?<![A-Za-z0-9_-]) boundary stops `d=` from matching the tail of
  // `id=`, `fill=` from matching `xfill=`, etc. — only true attribute starts count.
  const re = new RegExp('(?<![A-Za-z0-9_-])' + attrName + '\\s*=\\s*"([^"]*)"', 'gi');
  const out = [];
  let m;
  while ((m = re.exec(svg)) !== null) out.push(m[1]);
  return out;
}

function styleDeclColors(svg) {
  // pull fill:/stroke:/stop-color: from inline style="..." attrs
  const out = [];
  const re = /style\s*=\s*"([^"]*)"/gi;
  let m;
  while ((m = re.exec(svg)) !== null) {
    const decl = m[1];
    const props = decl.split(';');
    for (const p of props) {
      const kv = p.split(':');
      if (kv.length < 2) continue;
      const key = kv[0].trim().toLowerCase();
      if (key === 'fill' || key === 'stroke' || key === 'stop-color') {
        out.push(kv.slice(1).join(':').trim());
      }
    }
  }
  return out;
}

function computeMetrics(svg, theme, markType = null) {
  const hard_fails = [];

  // --- root <svg> + viewBox ---------------------------------------------
  const svgOpenTags = svg.match(/<svg\b[^>]*>/gi) || [];
  const rootMatch = svg.match(/<svg\b[^>]*>/i);
  let viewBoxW = null, viewBoxH = null, aspect = null;

  // invalid-xml: pragmatic well-formedness. If we can't find a root <svg ...> at all,
  // or the angle brackets are wildly unbalanced, flag it.
  const openAngles = (svg.match(/</g) || []).length;
  const closeAngles = (svg.match(/>/g) || []).length;
  let wellFormed = true;
  if (!rootMatch) { wellFormed = false; }
  if (openAngles !== closeAngles) { wellFormed = false; }
  // crude tag-balance: count opening element tags vs closing tags, allowing self-close.
  {
    const opens = (svg.match(/<[A-Za-z][^>]*?(?<!\/)>/g) || []).length; // not self-closing
    const closes = (svg.match(/<\/[A-Za-z][^>]*>/g) || []).length;
    // declarations/comments/processing-instructions excluded by [A-Za-z] start guard
    if (opens !== closes) wellFormed = false;
  }
  if (!wellFormed) hard_fails.push('invalid-xml');

  // not-single-root-svg: exactly one root <svg> carrying a viewBox.
  if (svgOpenTags.length !== 1) {
    hard_fails.push('not-single-root-svg');
  } else {
    const vb = rootMatch[0].match(/viewBox\s*=\s*"([^"]*)"/i);
    if (!vb) {
      hard_fails.push('not-single-root-svg');
    } else {
      const nums = vb[1].trim().split(/[\s,]+/).map(Number).filter((n) => !Number.isNaN(n));
      if (nums.length >= 4) {
        viewBoxW = nums[2];
        viewBoxH = nums[3];
        if (viewBoxH > 0) aspect = viewBoxW / viewBoxH;
      } else {
        hard_fails.push('not-single-root-svg');
      }
    }
  }

  // --- raster-embed -----------------------------------------------------
  if (/<image\b/i.test(svg) || /data:image/i.test(svg)) {
    hard_fails.push('raster-embed');
  }

  // --- script-present ---------------------------------------------------
  if (/<script\b/i.test(svg)) {
    hard_fails.push('script-present');
  }

  // --- color-ceiling ----------------------------------------------------
  const colorTokens = [
    ...attrValues(svg, 'fill'),
    ...attrValues(svg, 'stroke'),
    ...attrValues(svg, 'stop-color'),
    ...styleDeclColors(svg),
  ];
  const distinct = new Set();
  for (const raw of colorTokens) {
    const n = normalizeColor(raw);
    if (n) distinct.add(n);
  }
  const distinct_colors = distinct.size;
  const maxColors = theme.palette.max_colors;
  if (typeof maxColors === 'number' && distinct_colors > maxColors) {
    hard_fails.push('color-ceiling');
  }

  // --- stroke-too-thin --------------------------------------------------
  // effective = stroke-width * 16 / viewBoxHeight ; min across stroked elements.
  // No stroked elements → no flag.
  const strokeWidths = [];
  {
    // attribute form
    for (const v of attrValues(svg, 'stroke-width')) {
      const n = parseFloat(v);
      if (!Number.isNaN(n)) strokeWidths.push(n);
    }
    // inline style form: style="...;stroke-width:2;..."
    const re = /style\s*=\s*"([^"]*)"/gi;
    let m;
    while ((m = re.exec(svg)) !== null) {
      const sw = m[1].match(/stroke-width\s*:\s*([0-9.]+)/i);
      if (sw) { const n = parseFloat(sw[1]); if (!Number.isNaN(n)) strokeWidths.push(n); }
    }
  }
  let min_effective_stroke = null;
  if (strokeWidths.length > 0 && viewBoxH && viewBoxH > 0) {
    const effs = strokeWidths.map((w) => (w * 16) / viewBoxH);
    min_effective_stroke = Math.min(...effs);
    const floor = theme.stroke.min_effective_px;
    if (typeof floor === 'number' && min_effective_stroke < floor) {
      hard_fails.push('stroke-too-thin');
    }
  }

  // --- viewbox-not-square -----------------------------------------------
  // The allowed aspect band depends on the mark type (FR6): lockup marks
  // (combination/emblem/wordmark) are legitimately wide -> [0.8, 4.0]; square
  // marks and the flag-absent default sit in [0.8, 1.25]. An unknown markType
  // is rejected at the CLI/arg boundary before reaching here, so by this point
  // aspectBoundsFor() always resolves to a real band.
  if (aspect != null) {
    const bounds = aspectBoundsFor(markType) || SQUARE_ASPECT_BOUNDS;
    if (aspect < bounds.min || aspect > bounds.max) hard_fails.push('viewbox-not-square');
  }

  // --- path-budget ------------------------------------------------------
  const dStrings = attrValues(svg, 'd');
  const path_chars = dStrings.reduce((acc, s) => acc + s.length, 0);
  const drawableRe = /<(path|rect|circle|ellipse|line|polyline|polygon|text)\b/gi;
  const element_count = (svg.match(drawableRe) || []).length;
  if (path_chars > 4000 || element_count > 60) {
    hard_fails.push('path-budget');
  }

  // --- id-collision -----------------------------------------------------
  // ids on linearGradient|radialGradient|clipPath|filter|mask. Flag if any repeats,
  // OR if any such id lacks a hyphen (proxy for "not namespaced with need+variant").
  const defIds = [];
  {
    const re = /<(linearGradient|radialGradient|clipPath|filter|mask)\b[^>]*\bid\s*=\s*"([^"]*)"/gi;
    let m;
    while ((m = re.exec(svg)) !== null) defIds.push(m[2]);
  }
  let idCollision = false;
  const seen = new Set();
  for (const id of defIds) {
    if (seen.has(id)) idCollision = true;
    seen.add(id);
    if (!id.includes('-')) idCollision = true; // bare `grad` fails; `reports-icon-v2-grad` passes
  }
  if (idCollision) hard_fails.push('id-collision');

  // --- fake-negative-space ----------------------------------------------
  // HEURISTIC (conservative): a non-root element painted in a page-background token
  // (#FFFFFF / #ffffff / white) with NO clipPath/mask present anywhere in the file
  // is likely faking a cutout. If a clipPath/mask exists we assume genuine masking
  // and do NOT flag. This is a proxy gate, not a proof.
  {
    const hasMaskingMachinery = /<(clipPath|mask)\b/i.test(svg) || /\bclip-path\s*=/i.test(svg) || /\bmask\s*=/i.test(svg);
    // find white fills on elements other than the root <svg>
    let whiteFillOnChild = false;
    // strip the root <svg ...> open tag region so its own fill (rare) isn't counted
    const rootTag = rootMatch ? rootMatch[0] : '';
    const body = rootTag ? svg.replace(rootTag, '') : svg;
    const re = /fill\s*=\s*"(#ffffff|#fff|white)"/gi;
    if (re.test(body)) whiteFillOnChild = true;
    // also inline style fill:#fff / fill:white on children
    const reStyle = /style\s*=\s*"[^"]*fill\s*:\s*(#ffffff|#fff|white)\b[^"]*"/gi;
    if (reStyle.test(body)) whiteFillOnChild = true;
    if (whiteFillOnChild && !hasMaskingMachinery) hard_fails.push('fake-negative-space');
  }

  const metrics = {
    distinct_colors,
    min_effective_stroke,
    aspect,
    path_chars,
    element_count,
    viewBox: viewBoxW != null && viewBoxH != null ? [viewBoxW, viewBoxH] : null,
    ids: defIds,
  };

  return { hard_fails, metrics };
}

// ---------------------------------------------------------------------------
// Exported entry (used by tests)
// ---------------------------------------------------------------------------
export function evaluateSvg(svgText, theme, markType = null) {
  const { hard_fails, metrics } = computeMetrics(svgText, theme, markType);
  return { hard_fails, metrics, pass: hard_fails.length === 0 };
}

export function loadTheme(themeName, scriptDir = __dirname) {
  const themePath = path.join(scriptDir, '..', 'themes', themeName, 'theme.yaml');
  let text;
  try {
    text = fs.readFileSync(themePath, 'utf8');
  } catch (e) {
    const err = new Error(`unreadable theme '${themeName}' at ${themePath}`);
    err.exitCode = 2;
    throw err;
  }
  let theme;
  try {
    theme = readThemeYaml(text);
  } catch (e) {
    const err = new Error(`unparseable theme.yaml for '${themeName}': ${e.message}`);
    err.exitCode = 2;
    throw err;
  }
  if (typeof theme.palette.max_colors !== 'number' || typeof theme.stroke.min_effective_px !== 'number') {
    const err = new Error(`theme '${themeName}' missing required keys palette.max_colors / stroke.min_effective_px`);
    err.exitCode = 2;
    throw err;
  }
  return theme;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function main(argv) {
  const args = argv.slice(2);
  let file = null;
  let themeName = null;
  let markType = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--theme') { themeName = args[++i]; }
    else if (args[i].startsWith('--theme=')) { themeName = args[i].slice('--theme='.length); }
    else if (args[i] === '--mark-type') { markType = args[++i]; }
    else if (args[i].startsWith('--mark-type=')) { markType = args[i].slice('--mark-type='.length); }
    else if (!args[i].startsWith('--')) { file = args[i]; }
  }

  if (!file) { process.stderr.write('error: missing <file.svg>\nusage: node svg-metrics.mjs <file.svg> --theme <theme-name> [--mark-type <type>]\n'); process.exit(64); }
  if (!themeName) { process.stderr.write('error: missing --theme <theme-name>\n'); process.exit(64); }
  if (markType != null && aspectBoundsFor(markType) === null) {
    process.stderr.write(`error: unknown --mark-type '${markType}'\nvalid mark types: ${ALL_MARK_TYPES.join(', ')}\n`);
    process.exit(64);
  }

  let svgText;
  try {
    svgText = fs.readFileSync(file, 'utf8');
  } catch (e) {
    process.stderr.write(`error: cannot read svg file '${file}'\n`); process.exit(64);
  }

  let theme;
  try {
    theme = loadTheme(themeName);
  } catch (e) {
    process.stderr.write(`error: ${e.message}\n`); process.exit(e.exitCode || 2);
  }

  const result = evaluateSvg(svgText, theme, markType);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(0);
}

// Run as CLI only when invoked directly (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1] === __filename) {
  main(process.argv);
}
