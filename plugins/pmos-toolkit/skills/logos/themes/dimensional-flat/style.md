# Dimensional Flat — house style

Flat shapes that float, not 3-D objects. Dimensional-flat keeps the flat-fill discipline and adds *one* soft drop-shadow to lift the mark off the page — a contemporary, app-icon register. This is explicitly **not** real 3-D (decision D1): no bevels, no extrusion, no perspective. Just flat color plus a gentle shadow.

`theme.yaml` is the machine authority. The metrics gate reads `palette.max_colors` and `stroke.min_effective_px` from the YAML.

## The look

- **Flat fills, soft shadow.** Shapes stay flat-colored; depth comes only from a blurred, offset shadow beneath them.
- **One shadow, consistent direction.** A single light source — all shadows offset the same way (typically straight down).
- **Up to five colors** counted by the gate.
- **Strokes may vary** (`single_weight: false`).

## SVG technique — the soft-shadow filter (REQUIRED recipe)

Depth is produced by exactly this filter shape: blur the alpha, offset it down, then merge the shadow under the original graphic. **Filter ids are namespaced by need + variant** — the shared `logos.html` page hosts many marks and a bare `shadow` id collides.

```xml
<defs>
  <!-- pattern: <need-slug>-<variant>-depth -->
  <filter id="wallet-v1-depth" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur"/>
    <feOffset in="blur" dy="1.5" result="offsetBlur"/>
    <feMerge>
      <feMergeNode in="offsetBlur"/>   <!-- shadow underneath -->
      <feMergeNode in="SourceGraphic"/> <!-- flat mark on top -->
    </feMerge>
  </filter>
</defs>
<g filter="url(#wallet-v1-depth)"> … flat shapes … </g>
```

- `feGaussianBlur` on `SourceAlpha` (not `SourceGraphic`) → the shadow is neutral, not a colored ghost.
- `feOffset dy` pushes it down; keep `dx` at 0 for a top-down light.
- `feMerge` stacks the shadow *under* the original graphic. Without the merge you'd replace the mark with its shadow.
- Expand the filter region (`x/y/width/height`) so the blur isn't clipped.
- Author on a square `viewBox` (e.g. `0 0 64 64`); effective stroke px is `stroke-width * 16 / viewBox-height`, floor `1.0`.

## Anti-patterns

- A bare or reused filter id — collides across marks on the shared page.
- Blurring `SourceGraphic` instead of `SourceAlpha` — produces a muddy colored halo.
- Multiple shadows / inconsistent light directions.
- Real 3-D — bevels, gradients-as-lighting, perspective. That's a different (rejected) thing; D1 says soft-shadow only.

## Required fallbacks

`requires_mono: true`, `forces_icon_only: false`. **Depth dies at favicon and in mono** — the soft shadow either disappears or smears into a dark blob at 16px, and it carries no information in one-color print. So a **flat + mono fallback is mandatory**: a shadow-free, single-solid-fill rendering of the mark. Ship the dimensional primary *and* the flat mono variant. No icon-only variant is forced — there's no enclosure to strip.
