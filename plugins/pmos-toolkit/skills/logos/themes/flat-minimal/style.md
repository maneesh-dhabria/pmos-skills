# Flat Minimal — house style

Flat solid fills carry the whole mark. No gradients, no shadows, no bevels — a shape is one color, an edge is one stroke. This is the default theme because it survives everything: print, favicon, monochrome fax, a 1-bit e-ink badge. When in doubt, a logo built this way still reads.

`theme.yaml` is the machine authority. This file explains the why and the SVG technique; the metrics gate (`scripts/svg-metrics.mjs`) reads `palette.max_colors` and `stroke.min_effective_px` straight from the YAML.

## The look

- **Solid fills only.** Every closed shape gets a `fill` of either `ink` (`#1C1917`) or the single accent `ember` (`#C2410C`). No `<linearGradient>`, no `<radialGradient>`, no `filter`.
- **At most three distinct colors** including the page/transparent ground — counted by the gate. In practice that means ink, one accent, and (optionally) white knockout.
- **One stroke weight.** If the mark uses strokes at all, they share a single `stroke-width`. The deterministic gate fails a second weight.
- **Geometric, not organic.** Build from circles, rounded rects, and straight-edged paths on a coherent grid. The minimalism is the brand.

## SVG technique

- Author on a square `viewBox` (e.g. `0 0 64 64`). The gate computes effective stroke px as `stroke-width * 16 / viewBox-height` and floors it at `1.0` — so on a 64-unit canvas, the thinnest stroke is `4` units.
- Prefer `fill` over `stroke` for the mark's body; reserve stroke for true outlines. Solid fills scale without thinning.
- Use `fill-rule="evenodd"` for knockout counters (the hole in an O, the gap in a monogram) rather than overlaying a white shape — one path, fewer colors.
- Keep the path count low. A flat-minimal mark that needs twelve paths is usually two ideas fighting.

## Anti-patterns

- Gradients or drop shadows "to add depth" — wrong theme; use `dimensional-flat`.
- A second accent color — flat-minimal is ink + one accent by definition.
- Hairline strokes that vanish at favicon — respect the `1.0px` effective floor.
- Decorative texture, noise, or watermark fills.

## Required fallbacks

None mandated. `requires_mono: false`, `forces_icon_only: false` — the flat fills already collapse to a single ink with no information loss, so the primary mark *is* its own mono fallback.
