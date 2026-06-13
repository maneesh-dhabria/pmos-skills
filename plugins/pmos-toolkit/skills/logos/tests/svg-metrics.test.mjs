// svg-metrics.test.mjs — unit tests for svg-metrics.mjs.
// One PASS and one FAIL fixture per hard-fail id. Run against the `flat-minimal`
// theme (max_colors=3, min_effective_px=1.0). Exports run(assert) for run.mjs.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateSvg, loadTheme } from '../scripts/svg-metrics.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_DIR = path.join(__dirname, '..', 'scripts');

// A clean, valid flat-minimal icon: single root <svg viewBox>, square, 2 colors,
// thick stroke, namespaced gradient id, real mask present so white fill is OK.
const CLEAN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <title>brand-mark v1</title>
  <defs>
    <linearGradient id="brand-mark-v1-grad"><stop offset="0" stop-color="#1C1917"/></linearGradient>
  </defs>
  <rect x="4" y="4" width="56" height="56" rx="8" fill="#1C1917"/>
  <circle cx="32" cy="32" r="16" fill="#C2410C"/>
</svg>`;

export function run(assert) {
  const theme = loadTheme('flat-minimal', SCRIPT_DIR);

  const ev = (svg) => evaluateSvg(svg, theme);
  const has = (r, id) => r.hard_fails.includes(id);

  // --- clean passes -------------------------------------------------------
  {
    const r = ev(CLEAN);
    assert.deepStrictEqual(r.hard_fails, [], 'clean icon should have no hard_fails: ' + JSON.stringify(r.hard_fails));
    assert.strictEqual(r.pass, true, 'clean icon pass=true');
    assert.strictEqual(r.metrics.distinct_colors, 2, 'clean icon has 2 distinct colors');
    assert.ok(Math.abs(r.metrics.aspect - 1) < 1e-9, 'clean icon aspect ~ 1');
    // regression: `d=` must NOT match the tail of `id="..."` — clean icon has no <path>
    assert.strictEqual(r.metrics.path_chars, 0, 'no <path d=> in clean icon -> path_chars 0 (id= not matched)');
  }

  // --- attribute-boundary regression: stroke-width is not counted as a color ---
  {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="20" height="20" fill="#1C1917" stroke="#C2410C" stroke-width="6"/></svg>`;
    const r = ev(svg);
    assert.strictEqual(r.metrics.distinct_colors, 2, 'stroke-width value not miscounted as a color');
  }

  // --- raster-embed -------------------------------------------------------
  {
    const fail = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><image href="x.png"/></svg>`;
    assert.ok(has(ev(fail), 'raster-embed'), 'raster-embed flagged on <image>');
    const fail2 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect fill="url(data:image/png;base64,AAA)" width="1" height="1"/></svg>`;
    assert.ok(has(ev(fail2), 'raster-embed'), 'raster-embed flagged on data:image');
    assert.ok(!has(ev(CLEAN), 'raster-embed'), 'clean not raster-embed');
  }

  // --- script-present -----------------------------------------------------
  {
    const fail = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><script>alert(1)</script><rect width="1" height="1" fill="#1C1917"/></svg>`;
    assert.ok(has(ev(fail), 'script-present'), 'script-present flagged');
    assert.ok(!has(ev(CLEAN), 'script-present'), 'clean not script-present');
  }

  // --- color-ceiling (max_colors=3) --------------------------------------
  {
    const fail = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="10" height="10" fill="#111111"/>
      <rect width="10" height="10" fill="#222222"/>
      <rect width="10" height="10" fill="#333333"/>
      <rect width="10" height="10" fill="#444444"/>
    </svg>`;
    const r = ev(fail);
    assert.ok(has(r, 'color-ceiling'), 'color-ceiling flagged at 4 distinct colors');
    assert.strictEqual(r.metrics.distinct_colors, 4, '4 distinct colors counted');

    // ignored tokens + hex normalization: none/currentColor/url(#x) excluded; #abc==#aabbcc
    const pass = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="10" height="10" fill="#abc"/>
      <rect width="10" height="10" fill="#AABBCC"/>
      <rect width="10" height="10" fill="none" stroke="currentColor"/>
      <rect width="10" height="10" fill="url(#brand-grad)"/>
    </svg>`;
    const rp = ev(pass);
    assert.strictEqual(rp.metrics.distinct_colors, 1, '#abc and #AABBCC collapse to 1 color');
    assert.ok(!has(rp, 'color-ceiling'), 'normalized colors under ceiling');
  }

  // --- stroke-too-thin (min_effective_px=1.0) ----------------------------
  {
    // viewBoxH=64, stroke-width=2 -> effective = 2*16/64 = 0.5 < 1.0 -> FAIL
    const fail = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><line x1="0" y1="0" x2="64" y2="64" stroke="#1C1917" stroke-width="2"/></svg>`;
    const r = ev(fail);
    assert.ok(has(r, 'stroke-too-thin'), 'stroke-too-thin flagged (eff=0.5)');
    assert.ok(Math.abs(r.metrics.min_effective_stroke - 0.5) < 1e-9, 'min effective stroke = 0.5');

    // stroke-width=6 -> effective = 6*16/64 = 1.5 >= 1.0 -> PASS
    const pass = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><line x1="0" y1="0" x2="64" y2="64" stroke="#1C1917" stroke-width="6"/></svg>`;
    assert.ok(!has(ev(pass), 'stroke-too-thin'), 'thick stroke passes');

    // no stroked elements -> no flag
    assert.ok(!has(ev(CLEAN), 'stroke-too-thin'), 'no stroked elements -> no flag');
  }

  // --- viewbox-not-square -------------------------------------------------
  {
    // aspect = 64/16 = 4 -> outside [0.8,1.25] -> FAIL
    const fail = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 16"><rect width="1" height="1" fill="#1C1917"/></svg>`;
    assert.ok(has(ev(fail), 'viewbox-not-square'), 'wide viewBox flagged');
    // square passes
    assert.ok(!has(ev(CLEAN), 'viewbox-not-square'), 'square viewBox passes');
    // aspect 1.2 (60/50) passes
    const ok = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 50"><rect width="1" height="1" fill="#1C1917"/></svg>`;
    assert.ok(!has(ev(ok), 'viewbox-not-square'), 'aspect 1.2 within tolerance');
  }

  // --- path-budget --------------------------------------------------------
  {
    const longD = 'M0 0 ' + 'L1 1 '.repeat(900); // > 4000 chars
    const fail = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="${longD}" fill="#1C1917"/></svg>`;
    const r = ev(fail);
    assert.ok(has(r, 'path-budget'), 'path-budget flagged on long d');
    assert.ok(r.metrics.path_chars > 4000, 'path_chars exceeds 4000');
    assert.ok(!has(ev(CLEAN), 'path-budget'), 'clean under path budget');
  }

  // --- id-collision -------------------------------------------------------
  {
    // bare id `grad` (no hyphen) -> FAIL
    const bare = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="grad"><stop offset="0" stop-color="#1C1917"/></linearGradient></defs><rect width="1" height="1" fill="#1C1917"/></svg>`;
    assert.ok(has(ev(bare), 'id-collision'), 'bare un-namespaced id flagged');

    // duplicate namespaced id -> FAIL
    const dup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="brand-grad"/><radialGradient id="brand-grad"/></defs><rect width="1" height="1" fill="#1C1917"/></svg>`;
    assert.ok(has(ev(dup), 'id-collision'), 'duplicate id flagged');

    // namespaced unique passes
    assert.ok(!has(ev(CLEAN), 'id-collision'), 'namespaced unique id passes');
  }

  // --- fake-negative-space ------------------------------------------------
  {
    // white fill on a child, NO mask/clipPath anywhere -> FAIL
    const fake = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#1C1917"/><circle cx="32" cy="32" r="10" fill="#FFFFFF"/></svg>`;
    assert.ok(has(ev(fake), 'fake-negative-space'), 'white-fill cutout without mask flagged');

    // white fill WITH a clipPath present -> assumed genuine, NOT flagged
    const real = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><clipPath id="brand-clip"><circle cx="32" cy="32" r="10"/></clipPath></defs><rect width="64" height="64" fill="#1C1917"/><circle cx="32" cy="32" r="10" fill="#FFFFFF"/></svg>`;
    assert.ok(!has(ev(real), 'fake-negative-space'), 'white fill with clipPath not flagged');
    assert.ok(!has(ev(CLEAN), 'fake-negative-space'), 'clean (mask present) not flagged');
  }

  // --- not-single-root-svg ------------------------------------------------
  {
    const noVb = `<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1" fill="#1C1917"/></svg>`;
    assert.ok(has(ev(noVb), 'not-single-root-svg'), 'missing viewBox flagged');
    const two = `<svg viewBox="0 0 64 64"><rect fill="#1C1917" width="1" height="1"/></svg><svg viewBox="0 0 64 64"></svg>`;
    assert.ok(has(ev(two), 'not-single-root-svg'), 'two root svgs flagged');
  }

  // --- invalid-xml --------------------------------------------------------
  {
    const broken = `<svg viewBox="0 0 64 64"><rect fill="#1C1917"</svg>`; // unbalanced angle brackets
    assert.ok(has(ev(broken), 'invalid-xml'), 'malformed markup flagged invalid-xml');
    const noRoot = `just some text, no svg here`;
    assert.ok(has(ev(noRoot), 'invalid-xml'), 'no root svg flagged invalid-xml');
  }
}
