#!/usr/bin/env node
// lint-wireframe-svg.mjs — the deterministic §H hard gate for /wireframes monochrome SVGs.
//
// The model authors the SVG; THIS SCRIPT does every arithmetic/allowlist check — the model performs none of
// it (amendment A2/§H). It PARSES its colour allowlist out of reference/grid-system.md's palette sentinel
// block (A3/§K) rather than hardcoding the six hexes, so the palette has exactly one home: editing it there
// moves the enforcer with it. A missing/malformed palette block is a HARD error, never a silent hardcode
// fallback.
//
// Gates, per element, over a target SVG (AC5):
//   1. every x/y/width/height is a multiple of 8 (the root <svg>'s own canvas dims are exempt — device-fixed)
//   2. every colour literal is in the palette allowlist (named colours + out-of-allowlist hexes fail)
//   3. the annotation hex (#d33) appears ONLY inside a [data-region="annotations"] subtree
//   4. every <text> carries stroke="none" (kills the inherited-stroke glyph halo)
//   5. viewBox is present and matches the declared width/height
//   6. on a mobile canvas, every interactive primitive's tap target is ≥44px in its smaller dimension
//   7. every data-region group carries a <title> and a <desc>
// Plus (T5/A10): when a DESIGN.md is present, the design overlay must be regenerable-without-error.
//
// Exit non-zero on ANY violation, printing the offending file + element + value (AC8). NO silent caps: a
// check that DECLINES to inspect something (a non-numeric coord, a foreign embedded SVG) LOGS why on stderr
// rather than passing quietly.
//
// Usage:
//   node lint-wireframe-svg.mjs <file.svg> [<file2.svg> …]   → lint each (exit 0 all pass / 1 any fail)
//   node lint-wireframe-svg.mjs --selftest                   → built-in good+broken fixtures (see T6)
//   node lint-wireframe-svg.mjs --design-dir <dir> <file…>   → also run the A10 overlay assertion (see T5)
//
// Zero dependencies (Node built-ins only). Regex over raw text — the same discovery style the sibling
// validate-scorecard-anchors.mjs uses; our wireframe SVGs are flat and machine-authored, so it is exact.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const GRID_SYSTEM = join(HERE, '..', 'reference', 'grid-system.md');
const TAP_MIN = 44; // accessibility floor for mobile interactive targets

// ── Palette allowlist — parsed out of grid-system.md's sentinel block (A3/§K) ────────────────────────────
// Returns { hexes: Set<6-digit-lowercase>, annotation: <6-digit-lowercase>, raw: [{hex, token}] }.
// Throws on an absent/malformed block — a missing home is a hard error.
function loadPalette(mdPath) {
  let md;
  try { md = readFileSync(mdPath, 'utf8'); }
  catch (e) { throw new Error(`cannot read palette home ${mdPath}: ${e.message}`); }
  return parsePalette(md, mdPath);
}

// Parse the palette out of a grid-system.md string. Split from loadPalette so the selftest can exercise it
// on inline good/malformed fixtures without touching disk.
function parsePalette(md, src = '<string>') {
  const block = md.match(/<!--\s*palette:start\s*-->([\s\S]*?)<!--\s*palette:end\s*-->/);
  if (!block) throw new Error(`palette sentinel block (<!-- palette:start --> … <!-- palette:end -->) not found in ${src}`);
  const fenced = block[1].match(/```[^\n]*\n([\s\S]*?)```/);
  if (!fenced) throw new Error(`palette block in ${src} has no fenced code block`);

  const raw = [];
  const hexes = new Set();
  let annotation = null;
  for (const line of fenced[1].split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const m = t.match(/^(#[0-9a-fA-F]{3,6})\s+([A-Za-z][\w-]*)/);
    if (!m) throw new Error(`palette line is not "#hex token …": ${JSON.stringify(t)}`);
    const norm = normHex(m[1]);
    raw.push({ hex: norm, token: m[2].toLowerCase() });
    hexes.add(norm);
    if (m[2].toLowerCase() === 'annotation') annotation = norm;
  }
  if (hexes.size === 0) throw new Error(`palette block in ${src} declared no colours`);
  if (!annotation) throw new Error(`palette block in ${src} declares no "annotation" token (needed for the #d33 quarantine gate)`);
  return { hexes, annotation, raw };
}

// Expand #rgb → #rrggbb; lowercase. So #d33 and #dd3333 compare equal (author-friendly, drift-proof).
function normHex(h) {
  let s = h.toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(s)) s = '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
  return s;
}

// ── Element iteration ────────────────────────────────────────────────────────────────────────────────────
// Yield { tag, attrs (raw string), start, openEnd } for every element open/self-close tag.
function* elements(svg) {
  const re = /<([a-zA-Z][\w:-]*)\b([^>]*?)\/?>/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    if (m[1].startsWith('!') ) continue; // comments/doctype won't match [a-zA-Z] anyway
    yield { tag: m[1], attrs: m[2], start: m.index, openEnd: re.lastIndex };
  }
}

function attrMap(attrs) {
  const out = {};
  const re = /([a-zA-Z_:][-\w:]*)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(attrs)) !== null) out[m[1]] = m[2];
  return out;
}

// Balanced <g>…</g> slice starting at the '<g' whose open tag ends at openEnd. Returns {inner, end}.
function sliceGroup(svg, openEnd) {
  const re = /<(\/?)g\b/g;
  re.lastIndex = openEnd;
  let depth = 1, m;
  while ((m = re.exec(svg)) !== null) {
    if (m[1] === '/') { depth--; if (depth === 0) return { inner: svg.slice(openEnd, m.index), end: re.lastIndex }; }
    else { depth++; }
  }
  return { inner: svg.slice(openEnd), end: svg.length }; // unbalanced — caller still works on best-effort inner
}

// ── The validator ────────────────────────────────────────────────────────────────────────────────────────
// opts: { palette, filename, mobile (optional override), warn (fn) }. Returns array of failure strings.
function validateSvg(svg, opts) {
  const { palette } = opts;
  const warn = opts.warn || ((s) => process.stderr.write(`  · ${s}\n`));
  const failures = [];

  // Root <svg> tag — needed for check 5 and to exempt its own dims from check 1.
  const rootMatch = svg.match(/<svg\b[^>]*>/);
  if (!rootMatch) { failures.push('no <svg> root element found'); return failures; }
  const root = attrMap(rootMatch[0]);

  // Decide mobile: explicit override wins; else filename hints; else a phone-width canvas.
  const w = parseFloat(root.width), h = parseFloat(root.height);
  let mobile = opts.mobile;
  if (mobile === undefined) {
    const byName = /mobile/i.test(opts.filename || '');
    const byWidth = Number.isFinite(w) && w <= 480;
    mobile = byName || byWidth;
    if (mobile) warn(`treating as MOBILE canvas (basis: ${byName ? 'filename' : 'width≤480'}) — tap-target gate active`);
  }

  // 1. x/y/width/height multiples of 8, on every element EXCEPT the root <svg>.
  for (const el of elements(svg)) {
    if (el.tag === 'svg') continue; // canvas dims are device-fixed (grid-system.md canvas presets)
    const a = attrMap(el.attrs);
    for (const attr of ['x', 'y', 'width', 'height']) {
      if (!(attr in a)) continue;
      const v = a[attr];
      if (/^-?\d+(\.\d+)?$/.test(v)) {
        const n = parseFloat(v);
        if (!Number.isInteger(n) || n % 8 !== 0) failures.push(`off-grid: <${el.tag}> ${attr}="${v}" is not a multiple of 8`);
      } else {
        warn(`declined 8px snap on <${el.tag}> ${attr}="${v}" (non-numeric — e.g. %/unit); logged, not gated`);
      }
    }
  }

  // 2. colour literals — fill/stroke attrs + any stray #hex anywhere.
  const KEYWORDS = new Set(['none', 'transparent', 'currentcolor', 'inherit']);
  for (const el of elements(svg)) {
    const a = attrMap(el.attrs);
    for (const attr of ['fill', 'stroke', 'stop-color']) {
      if (!(attr in a)) continue;
      const v = a[attr].trim();
      if (KEYWORDS.has(v.toLowerCase())) continue;
      if (/^#[0-9a-fA-F]{3,6}$/.test(v)) {
        if (!palette.hexes.has(normHex(v))) failures.push(`off-palette: <${el.tag}> ${attr}="${v}" is not in the grid-system.md allowlist`);
      } else {
        failures.push(`off-palette: <${el.tag}> ${attr}="${v}" is not a palette token (named colours are forbidden — use a #hex from grid-system.md)`);
      }
    }
  }
  // Stray hexes outside fill/stroke (e.g. in a style="" or gradient) — catch any #hex not in the allowlist.
  {
    const re = /#[0-9a-fA-F]{3,6}\b/g;
    let m;
    while ((m = re.exec(svg)) !== null) {
      const nh = normHex(m[0]);
      if (!palette.hexes.has(nh)) {
        // Only report each distinct off-palette hex once to keep output readable.
        const msg = `off-palette hex "${m[0]}" appears in the file but is not in the grid-system.md allowlist`;
        if (!failures.includes(msg)) failures.push(msg);
      }
    }
  }

  // 3. annotation hex quarantined to [data-region="annotations"] subtrees.
  const annRanges = [];
  for (const el of elements(svg)) {
    if (el.tag !== 'g') continue;
    if (/\bdata-region\s*=\s*"annotations"/.test(el.attrs)) {
      const { end } = sliceGroup(svg, el.openEnd);
      annRanges.push([el.start, end]);
    }
  }
  {
    const re = /#[0-9a-fA-F]{3,6}\b/g;
    let m;
    while ((m = re.exec(svg)) !== null) {
      if (normHex(m[0]) !== palette.annotation) continue;
      const inside = annRanges.some(([s, e]) => m.index >= s && m.index < e);
      if (!inside) failures.push(`annotation-bleed: annotation colour "${m[0]}" appears outside a [data-region="annotations"] subtree (index ${m.index})`);
    }
  }

  // 4. every <text> carries stroke="none".
  for (const el of elements(svg)) {
    if (el.tag !== 'text') continue;
    const a = attrMap(el.attrs);
    if ((a.stroke || '').toLowerCase() !== 'none') failures.push(`text-halo: a <text> element is missing stroke="none" (has stroke="${a.stroke ?? ''}")`);
  }

  // 5. viewBox present and matches width/height.
  if (!root.viewBox) {
    failures.push('missing viewBox on the root <svg>');
  } else if (!('width' in root) || !('height' in root)) {
    failures.push('root <svg> must declare width and height alongside viewBox');
  } else {
    const vb = root.viewBox.trim().split(/[\s,]+/).map(Number);
    if (vb.length !== 4 || vb.some((n) => !Number.isFinite(n))) {
      failures.push(`malformed viewBox="${root.viewBox}" (expected "minX minY width height")`);
    } else if (vb[2] !== w || vb[3] !== h) {
      failures.push(`viewBox mismatch: viewBox="${root.viewBox}" but width="${root.width}" height="${root.height}"`);
    }
  }

  // 6. mobile tap targets ≥44 in the smaller dimension, on interactive primitives.
  if (mobile) {
    let sawInteractive = false;
    for (const el of elements(svg)) {
      if (!/\bdata-interactive\b/.test(el.attrs)) continue;
      sawInteractive = true;
      const a = attrMap(el.attrs);
      const tw = parseFloat(a.width), th = parseFloat(a.height);
      if (!Number.isFinite(tw) || !Number.isFinite(th)) {
        warn(`declined tap-target check on an interactive <${el.tag}> without numeric width/height; logged, not gated`);
        continue;
      }
      const smaller = Math.min(tw, th);
      if (smaller < TAP_MIN) failures.push(`tap-target: interactive <${el.tag}> is ${tw}×${th}; smaller dim ${smaller} < ${TAP_MIN}px mobile floor`);
    }
    if (!sawInteractive) warn('mobile canvas has no [data-interactive] primitives — tap-target gate found nothing to check');
  }

  // 7. every data-region group carries a <title> and a <desc> (in its own preamble, before any nested <g>).
  for (const el of elements(svg)) {
    if (el.tag !== 'g') continue;
    const dr = el.attrs.match(/\bdata-region\s*=\s*"([^"]+)"/);
    if (!dr) continue;
    const { inner } = sliceGroup(svg, el.openEnd);
    const nested = inner.search(/<g\b/);
    const preamble = nested === -1 ? inner : inner.slice(0, nested);
    if (!/<title\b/.test(preamble)) failures.push(`region "${dr[1]}" is missing a direct <title> child`);
    if (!/<desc\b/.test(preamble)) failures.push(`region "${dr[1]}" is missing a direct <desc> child`);
  }

  return failures;
}

// ── CLI ──────────────────────────────────────────────────────────────────────────────────────────────────
function lintFiles(files, palette) {
  let anyFail = false;
  for (const file of files) {
    let svg;
    try { svg = readFileSync(file, 'utf8'); }
    catch (e) { console.error(`✗ ${file}: cannot read (${e.message})`); anyFail = true; continue; }
    const failures = validateSvg(svg, { palette, filename: basename(file) });
    if (failures.length === 0) {
      console.log(`✓ ${file}: monochrome-SVG lint passed`);
    } else {
      anyFail = true;
      console.error(`✗ ${file}: ${failures.length} violation(s)`);
      for (const f of failures) console.error('  - ' + f);
    }
  }
  return anyFail;
}

// Parse argv: flags + positional files. --design-dir <dir> handled in T5.
function parseArgs(argv) {
  const files = [];
  let designDir = null, selftest = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--selftest') selftest = true;
    else if (a === '--design-dir') designDir = argv[++i];
    else files.push(a);
  }
  return { files, designDir, selftest };
}

function main() {
  const { files, designDir, selftest } = parseArgs(process.argv.slice(2));
  if (selftest) { runSelftest(); return; }
  if (files.length === 0) {
    console.error('usage: lint-wireframe-svg.mjs <file.svg> […] | --selftest | --design-dir <dir> <file…>');
    process.exit(2);
  }
  let palette;
  try { palette = loadPalette(GRID_SYSTEM); }
  catch (e) { console.error(`✗ palette: ${e.message}`); process.exit(2); }

  let anyFail = lintFiles(files, palette);
  if (designDir !== null) anyFail = assertOverlayRegenerable(designDir) || anyFail; // T5
  process.exit(anyFail ? 1 : 0);
}

// ── T5 / A10: overlay-regeneration assertion ─────────────────────────────────────────────────────────────
// A node lint cannot invoke the model-driven DESIGN.md → design-overlay.css generation described in
// reference/design-md-to-css.md. So it validates the overlay ARTIFACT as the deterministic proxy for
// "generation succeeded" — the faithful reading of amendment A10 ("generation regressions still fail fast now
// that wireframe screens no longer render the overlay"). SCOPE: when a DESIGN.md is present in <design-dir>,
// assert design-overlay.css exists, is non-empty, and parses as valid CSS (balanced braces, not truncated).
// When no DESIGN.md is present the assertion is SKIPPED — logged on stderr, never silently passed.
//
// Layout (per design-md-to-css.md): DESIGN.md at <design-dir>/DESIGN.md, overlay at
// <design-dir>/assets/design-overlay.css.
function assertOverlayRegenerable(dir, warn) {
  warn = warn || ((s) => process.stderr.write(`  · ${s}\n`));
  const designMd = join(dir, 'DESIGN.md');
  const overlay = join(dir, 'assets', 'design-overlay.css');
  if (!existsSync(designMd)) {
    warn(`no DESIGN.md in ${dir} — overlay-regeneration assertion skipped (logged, not silent)`);
    return false;
  }
  let css;
  try { css = readFileSync(overlay, 'utf8'); }
  catch { console.error(`✗ overlay: DESIGN.md present but ${overlay} is missing — generation regression (A10)`); return true; }
  const problems = validateCss(css);
  if (problems.length === 0) { console.log(`✓ overlay: ${overlay} regenerates without error (${css.trim().length} bytes, CSS parses)`); return false; }
  console.error(`✗ overlay: ${overlay} failed A10 regeneration check`);
  for (const p of problems) console.error('  - ' + p);
  return true;
}

// Deterministic "does this parse as CSS?" proxy: non-empty, balanced braces, ≥1 rule, not truncated mid-rule.
// Comments are stripped first so a brace inside /* … */ never skews the count.
function validateCss(cssRaw) {
  const problems = [];
  const css = cssRaw.replace(/\/\*[\s\S]*?\*\//g, '');
  if (css.trim().length === 0) { problems.push('overlay is empty (no CSS after stripping comments)'); return problems; }
  let depth = 0, opens = 0;
  for (const ch of css) {
    if (ch === '{') { depth++; opens++; }
    else if (ch === '}') { depth--; if (depth < 0) { problems.push('unbalanced braces: a "}" precedes its "{" (truncation/corruption)'); return problems; } }
  }
  if (depth !== 0) problems.push(`unbalanced braces: ${depth} unclosed "{" — overlay looks truncated`);
  if (opens === 0) problems.push('overlay has no CSS rule (no "{ … }" block found)');
  return problems;
}

// ── T6: --selftest — one passing + one failing fixture per gate ───────────────────────────────────────────
// Mirrors the sibling validate-scorecard-anchors.mjs' selftest: inline GOOD/BROKEN fixtures, assert
// good→0 failures and broken→a failure matching the gate's expected regex. The count is deterministic and
// reported. A self-contained palette (not grid-system.md) keeps the selftest independent of that file.
const SELFTEST_PALETTE = `
<!-- palette:start -->
\`\`\`
#000     ink
#fff     paper
#666     mute
#e6e6e6  placeholder
#f4f4f4  zebra
#d33     annotation
\`\`\`
<!-- palette:end -->
`;

// A structurally-valid base SVG. Per-gate broken fixtures mutate exactly one thing so only the targeted
// gate fires. width/height 240×80 with a matching viewBox; non-mobile unless a case overrides mobile.
function baseSvg(inner, { w = 240, h = 80, vb = '0 0 240 80' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}">
  <g data-region="field" transform="translate(0,0)">
    <title>Field</title><desc>A labelled text input</desc>
    ${inner}
  </g>
</svg>`;
}
const GOOD_INNER = `<rect x="0" y="0" width="240" height="40" fill="#fff" stroke="#000"/>
    <text x="8" y="24" stroke="none" fill="#666">Label</text>`;

function runSelftest() {
  const palette = parsePalette(SELFTEST_PALETTE, '<selftest>');
  const swallow = () => {}; // silence per-check stderr warns during selftest
  const cases = [
    // gate 1 — 8px snap
    { name: 'grid: on-grid coords', svg: baseSvg(GOOD_INNER), expect: 'pass' },
    { name: 'grid: off-grid x', svg: baseSvg(`<rect x="3" y="0" width="240" height="40" fill="#fff" stroke="#000"/>`), expect: /off-grid/ },
    // gate 2 — palette allowlist
    { name: 'palette: allowed colours', svg: baseSvg(GOOD_INNER), expect: 'pass' },
    { name: 'palette: out-of-allowlist hex', svg: baseSvg(`<rect x="0" y="0" width="240" height="40" fill="#123456"/>`), expect: /off-palette/ },
    { name: 'palette: named colour forbidden', svg: baseSvg(`<rect x="0" y="0" width="240" height="40" fill="black"/>`), expect: /off-palette/ },
    // gate 3 — #d33 quarantine
    { name: 'annotation: #d33 inside annotations region', svg:
      `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80" viewBox="0 0 240 80">
        <g data-region="annotations"><title>Notes</title><desc>Redlines</desc>
          <rect x="0" y="0" width="80" height="24" stroke="#d33" fill="none"/></g></svg>`, expect: 'pass' },
    { name: 'annotation: #d33 outside annotations', svg: baseSvg(`<rect x="0" y="0" width="80" height="24" stroke="#d33" fill="none"/>`), expect: /annotation-bleed/ },
    // gate 4 — text stroke=none
    { name: 'text: has stroke=none', svg: baseSvg(GOOD_INNER), expect: 'pass' },
    { name: 'text: missing stroke=none', svg: baseSvg(`<rect x="0" y="0" width="240" height="40" fill="#fff" stroke="#000"/>
    <text x="8" y="24" fill="#666">Label</text>`), expect: /text-halo/ },
    // gate 5 — viewBox match
    { name: 'viewBox: matches', svg: baseSvg(GOOD_INNER), expect: 'pass' },
    { name: 'viewBox: mismatch', svg: baseSvg(GOOD_INNER, { vb: '0 0 240 90' }), expect: /viewBox mismatch/ },
    { name: 'viewBox: missing', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80"><g data-region="field"><title>t</title><desc>d</desc></g></svg>`, expect: /missing viewBox/ },
    // gate 6 — mobile tap target (mobile override)
    { name: 'tap: 48×48 interactive on mobile', mobile: true, svg:
      `<svg xmlns="http://www.w3.org/2000/svg" width="375" height="812" viewBox="0 0 375 812">
        <g data-region="cta"><title>CTA</title><desc>Primary button</desc>
          <rect data-interactive="true" x="16" y="16" width="120" height="48" fill="#fff" stroke="#000"/></g></svg>`, expect: 'pass' },
    { name: 'tap: 120×40 interactive on mobile', mobile: true, svg:
      `<svg xmlns="http://www.w3.org/2000/svg" width="375" height="812" viewBox="0 0 375 812">
        <g data-region="cta"><title>CTA</title><desc>Primary button</desc>
          <rect data-interactive="true" x="16" y="16" width="120" height="40" fill="#fff" stroke="#000"/></g></svg>`, expect: /tap-target/ },
    // gate 7 — data-region title + desc
    { name: 'region: has title+desc', svg: baseSvg(GOOD_INNER), expect: 'pass' },
    { name: 'region: missing title/desc', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80" viewBox="0 0 240 80"><g data-region="field"><rect x="0" y="0" width="240" height="40" fill="#fff" stroke="#000"/></g></svg>`, expect: /missing a direct <(title|desc)>/ },
  ];

  let asserts = 0, failed = 0;
  const fail = (name, msg) => { failed++; console.error(`  ✗ ${name}: ${msg}`); };
  for (const c of cases) {
    asserts++;
    const failures = validateSvg(c.svg, { palette, filename: 'selftest.svg', mobile: c.mobile, warn: swallow });
    if (c.expect === 'pass') {
      if (failures.length !== 0) fail(c.name, `expected pass, got: ${failures.join('; ')}`);
    } else {
      if (!failures.some((f) => c.expect.test(f))) fail(c.name, `expected a failure matching ${c.expect}, got: ${failures.join('; ') || '(none)'}`);
    }
  }

  // gate 8 — palette parse (good sentinel block parses; malformed throws).
  asserts++; try { parsePalette(SELFTEST_PALETTE); } catch (e) { fail('palette-parse: good block', e.message); }
  asserts++; try { parsePalette('no sentinels here'); fail('palette-parse: absent block', 'expected a throw, none raised'); } catch { /* expected */ }

  // T5 overlay — validateCss good vs truncated.
  asserts++; if (validateCss(':root { --wf-ink:#000; }').length !== 0) fail('overlay: balanced CSS', 'expected 0 problems');
  asserts++; if (!validateCss(':root { --wf-ink:#000;').some((p) => /unbalanced/.test(p))) fail('overlay: truncated CSS', 'expected an unbalanced-braces problem');
  asserts++; if (validateCss('   ').length === 0) fail('overlay: empty CSS', 'expected a problem for empty overlay');

  if (failed === 0) {
    console.log(`✓ selftest: ${asserts} assertions passed (7 SVG gates + palette-parse + overlay, each with a passing and a failing fixture)`);
    process.exit(0);
  }
  console.error(`✗ selftest: ${failed}/${asserts} assertions failed`);
  process.exit(1);
}

// Exported for the selftest + external callers (kept even though CLI is the primary entry).
export { loadPalette, normHex, validateSvg, validateCss };

const invoked = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invoked) main();
