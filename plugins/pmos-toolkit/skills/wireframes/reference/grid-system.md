# Grid system — the normative house style for monochrome SVG wireframes

**These are the only values permitted in a `/wireframes` SVG.** Every coordinate, dimension, colour,
and type size a wireframe emits must come from this file. It is the single canonical home (§K) for the
palette, the 8px grid, the canvas presets, the type scale, and the component-size table. The deterministic
lint (`scripts/lint-wireframe-svg.mjs`) enforces these values; it **parses its colour allowlist out of the
palette block below** rather than hardcoding the hexes, so editing the palette here is the only edit needed
to move the enforcer with it (§K, amendment A3). Do not restate these values elsewhere — reference this file.

---

## Palette — the closed 6-token set

Monochrome by construction: ink, paper, and three greys, plus **one** reserved annotation red. No other
colour literal may appear in a wireframe SVG. Fills and strokes use only these tokens.

The block below is **machine-read** by the lint. Its shape is a contract: the `palette:start` / `palette:end`
HTML-comment sentinels wrap a single fenced code block with one `#hex  <token-name>` entry per line
(hex, then whitespace, then the token name). The lint reads it with a trivial regex — no markdown parser,
no generated JSON sidecar to drift. **If you edit the palette, edit only inside these sentinels.**

<!-- palette:start -->
```
#000     ink          — text, borders, filled controls, icons
#fff     paper        — canvas background, control fills that read as "empty"
#666     mute         — secondary text, disabled state, subtle borders
#e6e6e6  placeholder  — image/media placeholder blocks, grid guides
#f4f4f4  zebra        — alternating row fills, muted surface panels
#d33     annotation   — redline callouts ONLY, inside a [data-region="annotations"] subtree
```
<!-- palette:end -->

**Annotation quarantine.** `#d33` is the single non-monochrome token. It may appear **only** within a
`data-region="annotations"` subtree — never on a wireframe primitive itself. A redline that bleeds its colour
into the UI defeats the "the wireframe is monochrome" contract; the lint hard-fails it.

---

## The 8px grid

- **Base unit: 8px.** Every `x`, `y`, `width`, and `height` on every element is an integer multiple of 8.
  Spacing, sizes, and positions all snap to the 8px lattice. This is a hard gate, not a guideline — the lint
  rejects any off-grid coordinate.
- **Snap rule.** When a natural measurement lands between grid lines, round to the nearest multiple of 8
  (round half up). Never emit `13`, `20`, `44` as a coordinate — snap to `16`, `24`, `48`.
- **Grid guides** on the blank canvases are drawn as a `data-region="grid"` group at
  `stroke="#e6e6e6" stroke-width="0.5"` — the one place a sub-8 value (the hairline stroke width) is allowed,
  because it is a rendering hint, not a layout coordinate.

## Outer margins & gutters

| Canvas   | Outer margin | Gutter |
|----------|--------------|--------|
| desktop  | 24           | 16     |
| wide     | 24           | 16     |
| tablet   | 24           | 16     |
| mobile   | 16           | 16     |

All multiples of 8. Content lives inside the outer margins; the margin rulers on the blank canvases mark them.

## Desktop 12-column math

The desktop canvas (1280 wide) carries a 12-column grid:

```
outer margin  = 24  (each side)
content width = 1280 − (2 × 24) = 1232
gutter        = 16  (× 11 gutters = 176)
column width  = (1232 − 176) / 12 = 88
```

Every value is a multiple of 8 (24 = 3×8, 16 = 2×8, 88 = 11×8), so column edges land on the 8px lattice.
Column *n* (1-indexed) starts at `24 + (n − 1) × (88 + 16)`. The other canvases (wide/tablet/mobile) use the
same 8px grid and margins but are not column-gridded here — compose them directly on the 8px lattice.

---

## Canvas presets

| Preset  | Width | Height | viewBox               |
|---------|-------|--------|-----------------------|
| desktop | 1280  | 800    | `0 0 1280 800`        |
| wide    | 1440  | 900    | `0 0 1440 900`        |
| tablet  | 768   | 1024   | `0 0 768 1024`        |
| mobile  | 375   | 812    | `0 0 375 812`         |

Every SVG declares a `viewBox` that **matches** its declared `width`/`height` (the lint gates this). The four
blank canvases in `assets/canvas-*.svg` are pre-built at these dimensions with 8px grid guides and dashed
margin rulers.

> **Mobile note.** 375 is not a multiple of 8. It is the one sanctioned exception: it is the real iPhone CSS
> width, fixed by the device, not a layout choice. Coordinates *inside* the mobile canvas still snap to 8;
> only the canvas's own outer `width`/`viewBox` carries the odd device value.

---

## Type scale

Four sizes, one system font stack, monochrome ink (or mute for secondary text):

| Role           | size | weight |
|----------------|------|--------|
| caption/label  | 12   | 400    |
| body           | 14   | 400    |
| subheading     | 20   | 600    |
| heading        | 28   | 700    |

Font stack (single, system): `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
**One typeface only** — mixing families is a composition mistake the primitives guide calls out.

**Text stroke rule.** Every `<text>` element carries `stroke="none"`. SVG text inherits `stroke` from its
group; an inherited ink stroke paints a halo around glyphs that reads as bold/blurry. `stroke="none"` is a
hard gate on every `<text>`.

---

## Standard component sizes

Snap all components to these (all multiples of 8, except the mobile tap-target floor which is a minimum):

| Component            | Width | Height | Notes                                    |
|----------------------|-------|--------|------------------------------------------|
| text input          | 240   | 40     | single line                              |
| button              | 120   | 40     | label-sized; min 88 wide                 |
| icon button         | 40    | 40     | square                                   |
| checkbox / radio    | 24    | 24     |                                          |
| row height (list)   | —     | 48     | comfortable touch row                    |
| top bar / app bar   | —     | 56     |                                          |
| card padding        | 16    | 16     | inner inset                              |
| avatar              | 40    | 40     | circle                                   |

**Mobile tap targets.** On the mobile canvas, every interactive primitive (button, input, icon button, tab,
checkbox) must be **≥44px in its smaller dimension**. 44 is the accessibility floor; snap up to 48 when you
can. The lint gates this on mobile canvases only.

---

## Coordinate & structural conventions

- **Origin.** Every reusable primitive is authored at origin and wrapped in `<g transform="translate(0,0)">`
  so it is copy-pastable — position it by editing the group's `translate`, not its internal coordinates.
- **Regions.** Group semantically related elements under `data-region="<name>"`. Every `data-region` group
  carries a `<title>` and a `<desc>` (accessibility + anchor grounding); the lint gates their presence.
- **Annotations** live under `data-region="annotations"` — the only place `#d33` is allowed.
- **Grid guides** live under `data-region="grid"`.

## Negative space

Whitespace is a design element, not leftover. Keep at least one 8px unit (prefer 16) of clear space around
every component; do not pack controls edge-to-edge. A crowded wireframe reads as a spec for a crowded UI.
Group with spacing, not with borders, wherever a border is not load-bearing.
