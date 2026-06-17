# Geometric Monogram — house style

Build the initials, don't typeset them. A geometric monogram constructs one or two letterforms from a shared grid of circles, squares, and straight modules, so the letters read as a designed mark rather than text in a box. The grid is the whole game: every curve is a fraction of one radius, every stem is one module wide.

`theme.yaml` is the machine authority. The metrics gate reads `palette.max_colors` and `stroke.min_effective_px` from the YAML.

## The look

- **Letterforms from a grid.** Pick a base module (e.g. 8 units on a 64 canvas). Stems are one module; bowls are arcs of one or two modules' radius. The letter is assembled, not borrowed from a font.
- **One stroke weight / one stem width.** `single_weight: true` — whether the monogram is stroked or filled, every stroke and stem shares one width. The gate fails a second weight.
- **At most three colors.** Ink, one accent, optional knockout. Usually the mark is ink with the accent picking out an overlap or counter.
- **Interlock with intent.** When two initials share an edge or counter, make the overlap deliberate and on-grid — that junction is the cleverness of the mark.

## SVG technique

- Author on a square `viewBox` (e.g. `0 0 64 64`). Effective stroke px is `stroke-width * 16 / viewBox-height`; floor `1.0`.
- Snap every anchor point to the module grid. Off-grid points are what make a constructed monogram look hand-wobbled.
- Use `fill-rule="evenodd"` for counters (the hole in an A, R, or overlapping letters) — one path, no white overlay, fewer colors.
- Keep arcs as true circular segments (`A` arcs with equal rx/ry) rather than freehand béziers, so the geometry stays legible.

## Anti-patterns

- Dropping in a system font and calling it a monogram — it must be constructed on the grid.
- Variable stem widths "for typographic flair" — breaks single-weight.
- Off-grid anchor points.
- More than one accent color.

## Required fallbacks

None mandated. `requires_mono: false`, `forces_icon_only: false` — a grid-built monogram in ink is already its own mono and icon-only form (it has no enclosure or wordmark to strip). Just verify the letters stay distinguishable at 16px before shipping.
