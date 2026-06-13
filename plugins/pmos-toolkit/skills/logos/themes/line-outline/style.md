# Line Outline — house style

The stroke is the mark. Line-outline logos draw the form with a single consistent line weight and leave the interior open — think a continuous-contour glyph, an iconographic outline, a one-line gesture. The discipline is restraint: one weight, one path family, no fill doing the work the line should do.

`theme.yaml` is the machine authority. The metrics gate reads `palette.max_colors` and `stroke.min_effective_px` from the YAML.

## The look

- **Outline over fill.** Closed shapes are drawn with `stroke` and `fill="none"` (or a flat knockout). The contour is the brand.
- **One stroke weight, everywhere.** `single_weight: true` — the gate fails any second `stroke-width`. Consistency is what makes line-art read as a system.
- **At most two colors.** Ink plus one accent. Usually the whole mark is a single color; the accent highlights at most one element.
- **Rounded joins.** Use `stroke-linejoin="round"` and `stroke-linecap="round"` so the line feels drawn, not extruded.

## SVG technique

- Author on a square `viewBox` (e.g. `0 0 64 64`). Effective stroke px is `stroke-width * 16 / viewBox-height`.
- **The favicon is the constraint.** `min_effective_px` is raised to `1.25` (vs `1.0` elsewhere) — a thin outline that's fine at 256px disappears at 16px. On a 64-unit canvas the thinnest stroke is `5` units. Test the mark at 16×16 before shipping.
- Prefer one continuous `<path>` where the concept allows — a single unbroken contour is stronger than stitched segments.
- Avoid stroke-width tricks (`vector-effect="non-scaling-stroke"`) that defeat the effective-px math the gate relies on.
- No fills sneaking in to define shapes the outline should define.

## Anti-patterns

- Mixed stroke weights "for emphasis" — breaks the single-weight contract.
- Filling the interior to fake a flat-minimal mark — pick the right theme.
- Hairlines below the `1.25px` effective floor — they vanish at small sizes.
- More than one accent color.

## Required fallbacks

None mandated. `requires_mono: false`, `forces_icon_only: false` — a single-weight outline is already mono-safe (drop the accent to ink) and reads as a standalone icon. The favicon floor (`min_effective_px: 1.25`) is the real guard here, not a separate variant.
