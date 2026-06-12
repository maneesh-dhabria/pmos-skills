# Code Metrics — Deterministic SVG Hard Gates

The deterministic half of `/logos`' Phase 4 hybrid evaluator. Every metric here is a **hard gate**: it computes a fact about the SVG source and either passes or fails — no scores, no taste. The arithmetic lives in the script, never the model (§H).

This file documents the contract of `scripts/svg-metrics.mjs` (authored separately). SKILL.md Phase 4 and `eval/rubric.md` cite the metric ids below by name.

- [Invocation](#invocation)
- [Hard-fail metrics](#hard-fail-metrics)
- [Arithmetic-in-script principle](#arithmetic-in-script)
- [Auto-reject into the refine loop](#auto-reject)

---

## Invocation {#invocation}

```bash
node scripts/svg-metrics.mjs <file.svg> --theme <theme>
```

Returns JSON:

```json
{
  "hard_fails": ["color-ceiling: 6 distinct colors exceed flat-minimal ceiling 3"],
  "metrics": {
    "color_count": 6,
    "min_effective_stroke_px": 1.4,
    "viewbox_aspect": 1.0,
    "path_data_chars": 880,
    "drawable_count": 14
  },
  "pass": false
}
```

`pass` ⇔ `hard_fails == []`. A non-empty `hard_fails` is the source of truth for what the refine loop must repair; `metrics` carries the computed values for the sidecar and for the findings prose.

The `--theme <theme>` argument loads `themes/<theme>/theme.yaml`, which supplies the per-theme ceilings the metrics read against (`palette.max_colors`, `stroke.min_effective_px`).

---

## Hard-fail metrics {#hard-fail-metrics}

Each metric emits one of these exact ids on failure. The id leads the `hard_fails` string; a human-readable detail follows the colon.

### `invalid-xml`

The file is not well-formed XML. Parse failure terminates evaluation immediately — no later metric can run on an unparseable document.

### `not-single-root-svg`

The document lacks a single root `<svg>` element, or that root carries no `viewBox`. The `viewBox` is required because every downstream ratio (stroke, aspect) is computed against its height — without it the geometry is unanchored.

### `raster-embed`

Any `<image>` element or any `data:image` URI is present. `/logos` ships pure vector marks; an embedded raster defeats favicon-size crispness and bloats the inlined `logos.html`.

### `script-present`

Any `<script>` element is present. Logo SVGs are static; scripting is a sanitization and a portability hazard once the mark is inlined on a shared page.

### `color-ceiling`

The count of **distinct** `fill`, `stroke`, and gradient `<stop>` colors exceeds the active theme's `palette.max_colors` (e.g. ≤3 for a flat theme, ≤5 for a gradient/duotone theme). `none`, `transparent`, and `currentColor` are not colors and do not count.

### `stroke-too-thin`

The minimum **effective** stroke width is below `theme.stroke.min_effective_px`. Effective width normalizes the authored `stroke-width` to a 16px favicon render:

```
effective_px = stroke-width × 16 ÷ viewBox-height
```

A hairline that looks fine at full size vanishes at 16px; this catches it deterministically rather than waiting for the vision pass.

### `viewbox-not-square`

For an **icon-context** mark (favicon, nav glyph, feature icon — any need whose usage is not a wide wordmark), the viewBox aspect ratio `width ÷ height` falls outside `[0.8, 1.25]`. Icon-context marks must sit in a near-square box so they crop cleanly into square favicon and toolbar slots. Wordmark-context needs are exempt.

### `path-budget`

The mark's total drawing weight exceeds the budget. Either cap trips the fail:

- **> 4000** characters of total `d` path-data across all `<path>` elements, **OR**
- **> 60** drawable elements (`path`, `rect`, `circle`, `ellipse`, `polygon`, `polyline`, `line`).

A logo is a mark, not an illustration. An over-budget candidate is almost always a traced raster or an over-detailed mascot that will mud at 16px; the refine loop must simplify it.

### `id-collision`

Any gradient, `clipPath`, `filter`, or `mask` `id` is either **non-unique within the file** OR **not namespaced** (missing the need+variant prefix, e.g. `reports-icon-v2-`). Phase 5 inlines many marks on one `logos.html`; a bare `id="grad"` reused across two marks silently cross-wires `url(#grad)` fills. The gate forces every def id to be both unique and prefixed.

### `fake-negative-space`

A shape is filled with the **page background color** to simulate a cutout. Real negative space uses a `clipPath`, a `mask`, or genuine path holes (even-odd / nonzero) — those survive being placed on a dark background or a tinted card. A page-colored fill reads as a hole only against the one background it was painted to match, then becomes an opaque blob everywhere else (light/dark swatch, favicon tile).

---

## Arithmetic-in-script principle {#arithmetic-in-script}

§H: every number in this file is computed by `svg-metrics.mjs`, never by the model. Distinct-color counts, the `stroke-width × 16 ÷ viewBox-height` effective-stroke ratio, the `width ÷ height` aspect ratio, path-data character totals, and drawable counts are all deterministic arithmetic the model must not reproduce by eye. The model's only job in Phase 4 is the vision rubric (`eval/rubric.md`) — legibility, monochrome-reads, brief-fit. A model that "estimates" a color count or a stroke ratio is doing the script's job, badly.

---

## Auto-reject into the refine loop {#auto-reject}

`pass == false` (any hard fail) auto-rejects the candidate into the Phase 4 refine loop (≤2 loops). Most hard fails map to a **deterministic safe edit** the script can re-verify after the fix — collapse a color to a theme token (`color-ceiling`), thicken a hairline (`stroke-too-thin`), namespace a colliding id (`id-collision`), square the viewBox (`viewbox-not-square`), simplify an over-budget path (`path-budget`), or replace a page-colored fill with a real mask (`fake-negative-space`). The loop applies the disposed edit, re-runs the script, and breaks early once `hard_fails == []` and the vision `blocker_count == 0`. Any residual fail after 2 loops is carried forward as a recorded warning on the candidate — never a silent retry.
