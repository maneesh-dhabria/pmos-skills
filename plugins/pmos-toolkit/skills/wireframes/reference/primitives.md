# Primitives — copy-paste monochrome SVG building blocks

**26 primitives across 7 groups.** Every block below obeys [`grid-system.md`](./grid-system.md) — the single
home for the palette, the 8px grid, the type scale, and the component sizes. This file does **not** restate the
hex values or dimensions; it composes them. Drop a primitive onto a `assets/canvas-*.svg` blank, reposition it
by editing its wrapper `translate(...)`, and it stays lint-clean.

Conventions carried from `grid-system.md`, so each snippet stays short:

- Every primitive is wrapped in `<g transform="translate(0,0)">` — author at origin, position by the transform.
- The wrapper carries the single system `font-family`; each `<text>` carries `stroke="none"` (the anti-halo rule).
- Every `x`/`y`/`width`/`height` is a multiple of 8; fills and strokes are palette tokens only.
- **Annotation** primitives (and only those) are wrapped in `<g data-region="annotations">` with a `<title>` and
  a `<desc>` — the one place `#d33` is permitted.

Run any composed screen through `scripts/lint-wireframe-svg.mjs` before you ship it; these primitives are built
to pass it.

---

## Inputs

**1. Text input (labelled)**
```svg
<g transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <text x="0" y="16" font-size="12" fill="#666" stroke="none">Email</text>
  <rect x="0" y="24" width="240" height="40" fill="#fff" stroke="#000"/>
  <text x="8" y="48" font-size="14" fill="#666" stroke="none">you@example.com</text>
</g>
```

**2. Checkbox + label**
```svg
<g transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="24" height="24" fill="#fff" stroke="#000"/>
  <text x="32" y="16" font-size="14" fill="#000" stroke="none">Remember me</text>
</g>
```

**3. Radio button + label**
```svg
<g transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <circle cx="12" cy="12" r="12" fill="#fff" stroke="#000"/>
  <circle cx="12" cy="12" r="4" fill="#000"/>
  <text x="32" y="16" font-size="14" fill="#000" stroke="none">Standard shipping</text>
</g>
```

**4. Primary button (filled)**
```svg
<g transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="120" height="40" fill="#000"/>
  <text x="24" y="24" font-size="14" fill="#fff" stroke="none">Continue</text>
</g>
```

## Layout

**5. Card**
```svg
<g transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="360" height="200" fill="#fff" stroke="#e6e6e6"/>
  <text x="16" y="40" font-size="20" fill="#000" stroke="none">Card title</text>
  <text x="16" y="72" font-size="14" fill="#666" stroke="none">Supporting copy sits under the title.</text>
</g>
```

**6. Divider**
```svg
<g transform="translate(0,0)">
  <line x1="0" y1="0" x2="360" y2="0" stroke="#e6e6e6" stroke-width="1"/>
</g>
```

**7. Two-column split (16px gutter)**
```svg
<g transform="translate(0,0)">
  <rect x="0" y="0" width="176" height="120" fill="#f4f4f4"/>
  <rect x="192" y="0" width="176" height="120" fill="#f4f4f4"/>
</g>
```

## Navigation

**8. Top app bar**
```svg
<g transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="1280" height="56" fill="#fff" stroke="#e6e6e6"/>
  <text x="24" y="32" font-size="20" fill="#000" stroke="none">Product</text>
  <rect x="1216" y="8" width="40" height="40" fill="#e6e6e6"/>
</g>
```

**9. Tab bar (active underline)**
```svg
<g transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <text x="0" y="16" font-size="14" fill="#000" stroke="none">Overview</text>
  <text x="96" y="16" font-size="14" fill="#666" stroke="none">Activity</text>
  <text x="192" y="16" font-size="14" fill="#666" stroke="none">Settings</text>
  <rect x="0" y="24" width="64" height="8" fill="#000"/>
</g>
```

**10. Breadcrumb**
```svg
<g transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <text x="0" y="16" font-size="12" fill="#666" stroke="none">Home / Reports / Q3</text>
</g>
```

**11. Pagination**
```svg
<g transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="40" height="40" fill="#000"/>
  <text x="16" y="24" font-size="14" fill="#fff" stroke="none">1</text>
  <rect x="48" y="0" width="40" height="40" fill="#fff" stroke="#e6e6e6"/>
  <text x="64" y="24" font-size="14" fill="#000" stroke="none">2</text>
  <rect x="96" y="0" width="40" height="40" fill="#fff" stroke="#e6e6e6"/>
  <text x="112" y="24" font-size="14" fill="#000" stroke="none">3</text>
</g>
```

## Content

**12. Heading + body block**
```svg
<g transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <text x="0" y="24" font-size="28" fill="#000" stroke="none">Section heading</text>
  <text x="0" y="64" font-size="14" fill="#666" stroke="none">Body copy explains the section in a sentence or two.</text>
</g>
```

**13. List row (avatar + title + separator)**
```svg
<g transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="360" height="48" fill="#fff"/>
  <circle cx="24" cy="24" r="16" fill="#e6e6e6"/>
  <text x="56" y="32" font-size="14" fill="#000" stroke="none">List item title</text>
  <line x1="0" y1="48" x2="360" y2="48" stroke="#e6e6e6" stroke-width="1"/>
</g>
```

**14. Table header row**
```svg
<g transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="480" height="40" fill="#f4f4f4"/>
  <text x="16" y="24" font-size="12" fill="#666" stroke="none">NAME</text>
  <text x="240" y="24" font-size="12" fill="#666" stroke="none">STATUS</text>
  <text x="400" y="24" font-size="12" fill="#666" stroke="none">DATE</text>
</g>
```

**15. Table data row (columnar body row)**
```svg
<g transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="480" height="48" fill="#fff"/>
  <text x="16" y="32" font-size="14" fill="#000" stroke="none">Acme Pilot Q3</text>
  <text x="240" y="32" font-size="14" fill="#666" stroke="none">Active</text>
  <text x="400" y="32" font-size="14" fill="#666" stroke="none">2026-09-30</text>
  <line x1="0" y1="48" x2="480" y2="48" stroke="#e6e6e6" stroke-width="1"/>
</g>
```

Pairs with the header row (14). Alternate the `<rect>` fill between `#fff` (paper) and `#f4f4f4` (zebra) down the
table; keep the cell `x` offsets identical to the header so the columns line up.

**16. Key-value stat**
```svg
<g transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <text x="0" y="32" font-size="28" fill="#000" stroke="none">1,284</text>
  <text x="0" y="56" font-size="12" fill="#666" stroke="none">Active users</text>
</g>
```

## Media

**17. Image placeholder (crossed box)**
```svg
<g transform="translate(0,0)">
  <rect x="0" y="0" width="240" height="160" fill="#e6e6e6"/>
  <line x1="0" y1="0" x2="240" y2="160" stroke="#666" stroke-width="1"/>
  <line x1="240" y1="0" x2="0" y2="160" stroke="#666" stroke-width="1"/>
</g>
```

**18. Avatar**
```svg
<g transform="translate(0,0)">
  <circle cx="20" cy="20" r="20" fill="#e6e6e6"/>
</g>
```

**19. Video placeholder (play button)**
```svg
<g transform="translate(0,0)">
  <rect x="0" y="0" width="320" height="176" fill="#e6e6e6"/>
  <circle cx="160" cy="88" r="24" fill="#fff" stroke="#000"/>
  <path d="M152 76 L152 100 L176 88 Z" fill="#000"/>
</g>
```

## Overlay

**20. Modal dialog**
```svg
<g transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="400" height="240" fill="#fff" stroke="#000"/>
  <text x="24" y="48" font-size="20" fill="#000" stroke="none">Confirm action</text>
  <text x="24" y="88" font-size="14" fill="#666" stroke="none">This cannot be undone.</text>
  <rect x="160" y="184" width="104" height="40" fill="#fff" stroke="#000"/>
  <text x="184" y="208" font-size="14" fill="#000" stroke="none">Cancel</text>
  <rect x="272" y="184" width="104" height="40" fill="#000"/>
  <text x="296" y="208" font-size="14" fill="#fff" stroke="none">Delete</text>
</g>
```

**21. Scrim / modal backdrop**
```svg
<g transform="translate(0,0)">
  <rect x="0" y="0" width="1280" height="800" fill="#f4f4f4"/>
</g>
```

The dimmed surface behind a modal, sized to the canvas token (1280×800 desktop / 375×812 mobile — resize the
`<rect>` to match). Draw it **first**, then the Modal dialog (20) on top. It is non-interactive; a tap on the
scrim cancels the modal. `#f4f4f4` (zebra/muted surface) reads as "dimmed" in monochrome without introducing a
new token.

**22. Toast / snackbar**
```svg
<g transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="320" height="48" fill="#000"/>
  <text x="16" y="32" font-size="14" fill="#fff" stroke="none">Changes saved</text>
</g>
```

**23. Tooltip**
```svg
<g transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <rect x="0" y="0" width="160" height="32" fill="#000"/>
  <text x="8" y="24" font-size="12" fill="#fff" stroke="none">Copy to clipboard</text>
  <path d="M16 32 L24 40 L32 32 Z" fill="#000"/>
</g>
```

## Annotation

`#d33` is permitted here and nowhere else — each block is a `data-region="annotations"` group with a `<title>`
and a `<desc>`.

**24. Redline callout**
```svg
<g data-region="annotations" transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <title>Redline callout</title>
  <desc>A design note pinned to a region; the only place #d33 may appear.</desc>
  <rect x="0" y="0" width="240" height="80" fill="none" stroke="#d33" stroke-dasharray="4 4"/>
  <text x="0" y="104" font-size="12" fill="#d33" stroke="none">Spacing should be 16, not 12.</text>
</g>
```

**25. Numbered marker**
```svg
<g data-region="annotations" transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <title>Numbered marker</title>
  <desc>A sequence marker keyed to a numbered annotation list.</desc>
  <circle cx="16" cy="16" r="16" fill="#d33"/>
  <text x="16" y="24" font-size="14" fill="#fff" stroke="none" text-anchor="middle">3</text>
</g>
```

**26. Measurement note**
```svg
<g data-region="annotations" transform="translate(0,0)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <title>Measurement note</title>
  <desc>A dimension callout marking a spacing or size spec.</desc>
  <line x1="0" y1="8" x2="80" y2="8" stroke="#d33" stroke-width="1"/>
  <line x1="0" y1="0" x2="0" y2="16" stroke="#d33" stroke-width="1"/>
  <line x1="80" y1="0" x2="80" y2="16" stroke="#d33" stroke-width="1"/>
  <text x="24" y="32" font-size="12" fill="#d33" stroke="none">80px</text>
</g>
```

---

## Common composition mistakes

The lint (`scripts/lint-wireframe-svg.mjs`) catches each of these; fix them before you ship a screen.

- **`<text>` stroke halo.** A `<text>` that inherits an ink `stroke` from its group paints a blurry halo around
  the glyphs. Every `<text>` must carry `stroke="none"` (gate 4). This is the single most common defect.
- **Off-grid coordinates.** An `x`/`y`/`width`/`height` that is not a multiple of 8 (e.g. `13`, `20`, `44`)
  breaks the lattice — snap to the nearest 8 (gate 1). Line endpoints and `path` data are exempt; box geometry
  is not.
- **Stray fills.** A colour outside the six palette tokens — a named colour like `black`, or an off-palette hex
  like `#333` — is rejected (gate 2). Use only the tokens in `grid-system.md`.
- **Multiple typefaces.** Mixing font families reads as two design systems. Use the single system stack from
  `grid-system.md` on every primitive; do not introduce a second `font-family`.
- **Annotation-colour bleed.** `#d33` on a wireframe primitive (not inside a `data-region="annotations"`
  subtree) defeats the monochrome contract — the redline colour has leaked into the UI (gate 3). Keep every
  `#d33` inside an annotations group.
- **Missing `viewBox`.** An SVG without a `viewBox` (or one that disagrees with its `width`/`height`) scales
  unpredictably. Every screen declares a `viewBox` that matches its canvas dimensions (gate 5).
