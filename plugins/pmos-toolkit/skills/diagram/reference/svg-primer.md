# SVG Primer — Authoring Notes for `/diagram`

Common SVG gotchas the agent must respect. Treat this as a checklist before writing the SVG.

## Required scaffolding

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="1280" height="800" viewBox="0 0 1280 800"
     font-family="Inter, ui-sans-serif, system-ui, sans-serif">
  <title>One-sentence diagram description (for screen readers).</title>
  <defs>
    <marker id="arrow" viewBox="0 0 8 6" refX="8" refY="3"
            markerWidth="8" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 8 3 L 0 6 z" fill="context-stroke"/>
    </marker>
  </defs>
  <style>
    .node-primary { fill: #FFFFFF; stroke: #0F172A; stroke-width: 2; rx: 8; ry: 8; }
    .node-default { fill: #FFFFFF; stroke: #475569; stroke-width: 1.5; rx: 4; ry: 4; }
    .label-primary { font-size: 16px; font-weight: 600; fill: #0F172A; }
    .label-default { font-size: 14px; font-weight: 400; fill: #1C1917; }
    .label-edge { font-size: 12px; font-weight: 400; fill: #57534E; }
    .connector { stroke: #57534E; stroke-width: 1.5; fill: none; }
    .connector-emphasis { stroke: #C2410C; stroke-width: 2; fill: none; }
    .legend-box { fill: #FFFFFF; stroke: #57534E; stroke-width: 1; rx: 4; ry: 4; }
    .edge-pill { fill: #F6F5F3; stroke: #57534E; stroke-width: 1; rx: 4; ry: 4; }
  </style>
  <!-- content -->
</svg>
```

The `<title>` element is mandatory (a11y).
Set `font-family` on the root `<svg>` so all `<text>` inherits it.

## Coordinate system

- Origin is top-left, x grows right, y grows down. **No flipping.**
- viewBox = "min-x min-y width height". For canonical canvases use `0 0 1280 H`.
- Snap every drawn coordinate to multiples of 4 (the grid-snap metric checks post-transform values).

## Text gotchas

- `<text>` baseline is the y attribute. To center text vertically inside a rect, add `dominant-baseline="middle"` and set y to the rect's vertical center.
- For horizontal centering: `text-anchor="middle"` and set x to the rect's horizontal center.
- Estimating text width: use `font-size * 0.55 * char_count` as a conservative pixel width for Inter (proportional). Always pad node width by ≥ 16px beyond estimated text width.
- Don't rely on `<text textLength>` — renderers handle it inconsistently. Author with adequate node width instead.

## Connectors

- Prefer `<path>` with `M` / `L` / `H` / `V` for orthogonal routes. Each segment endpoint must land on the grid.
- For curves, `<path d="M x1 y1 C cx1 cy1, cx2 cy2, x2 y2"/>` — keep control points symmetric for clean curves.
- Always set `fill="none"` on path connectors — otherwise the path fills.
- Attach arrowheads via `marker-end="url(#arrow)"` (and `marker-start` for bidirectional, but prefer not).
- A connector should END 2-4px outside the target node bbox so the arrowhead doesn't overlap the node border.

## Markers

- One `<marker>` definition in `<defs>`, reused everywhere.
- `orient="auto-start-reverse"` makes the marker rotate to follow the path direction.
- `fill="context-stroke"` makes the marker pick up the connector's stroke color (so an `accent`-colored connector gets an `accent` arrowhead automatically).

## Avoid

- `<image>` — no raster images allowed in /diagram output.
- `<foreignObject>` — breaks rendering portability.
- `<animate>`, `<animateTransform>` — diagrams are static.
- `filter`, `feGaussianBlur`, drop shadows — anti-pattern per §5.9.
- `pattern` fills — anti-pattern per §5.9.
- `<g transform="matrix(...)">` — the metric runner only supports translate/scale/rotate; matrix() will hard-fail.

## File hygiene

- UTF-8 encoded.
- LF line endings.
- One element per line for legibility (the metric runner doesn't care, but humans review the source).
- No trailing whitespace.
- Final newline.
