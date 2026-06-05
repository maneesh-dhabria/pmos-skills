# Diagram House Style

This file is the single source of truth for `/diagram` visual style. Every section here is enforced by code metrics (`eval/code-metrics.md`), the binary vision rubric (`eval/rubric.md`), or both. Do not deviate.

When you generate a diagram you MUST cite back to the relevant subsections — for example: "Using token `accent` per §5.1; legend per §5.6; canvas 16:10 per §5.7."

---

## 5.1 Design tokens (HARD-LOCKED)

### Palette — 6 semantic roles

| Token | Hex | Purpose |
|---|---|---|
| `surface` | `#FFFFFF` | Page background, default node fill |
| `surface-muted` | `#F6F5F3` | Pill backgrounds (edge labels), legend background, secondary surfaces |
| `ink` | `#1C1917` | Primary text, primary node strokes/borders |
| `ink-muted` | `#57534E` | Secondary text, connector strokes, legend borders, edge label text |
| `accent` | `#C2410C` | Single emphasis color — primary node highlight, "active" path |
| `warn` | `#B91C1C` | Errors, warnings, "stop" states — use sparingly |

**Contrast (WCAG AA verified):**

| Foreground | Background | Ratio | Body (≥4.5:1) | Large 16+ (≥3:1) |
|---|---|---|---|---|
| `ink` | `surface` | 19.0:1 | ✓ | ✓ |
| `ink` | `surface-muted` | 17.6:1 | ✓ | ✓ |
| `ink-muted` | `surface` | 7.5:1 | ✓ | ✓ |
| `ink-muted` | `surface-muted` | 7.0:1 | ✓ | ✓ |
| `accent` | `surface` | 5.2:1 | ✓ | ✓ |
| `warn` | `surface` | 6.4:1 | ✓ | ✓ |
| `surface` | `accent` | 5.2:1 | ✓ | ✓ |
| `surface` | `warn` | 6.4:1 | ✓ | ✓ |

Any text/background pair NOT in this table is forbidden. The contrast metric in `eval/code-metrics.md` fails any combination it can't verify ≥ AA.

### Typography

- **Font stack:** `Inter, ui-sans-serif, system-ui, -apple-system, sans-serif`
- **Sizes:** `12 / 14 / 16 / 20` only. Never below 12.
- **Weights:** `400` (regular) / `600` (semibold) only.
- **Recommended use:**
  - 20 / 600 → diagram title (one per diagram, optional)
  - 16 / 600 → primary node label
  - 14 / 400 → secondary node label, section heading
  - 12 / 400 → edge label, legend label, caption

### Stroke weights

`1 / 1.5 / 2` only.
- 1 → legend borders, edge label pill borders
- 1.5 → connectors (default)
- 2 → primary node borders, emphasis connectors

### Corner radii

`0 / 4 / 8` only.
- 0 → axis-aligned dividers
- 4 → edge label pills, legend block, secondary nodes
- 8 → primary nodes, container boxes

### Spacing scale (4-px grid)

`4 / 8 / 16 / 24 / 32` only. Every coordinate snaps to multiples of 4.

---

## 5.2 Layout (FLEXIBLE APPLICATION within locked tokens)

- Reading direction matches content:
  - **Top-down** for hierarchy, decision trees.
  - **Left-right** for flows, sequences, pipelines.
  - **Radial** for concept maps, mind maps (inside the 1:1 canvas).
- Pick **one** direction per diagram. Don't mix.
- Whitespace:
  - ≥ **24px** between distinct groups.
  - ≥ **16px** between sibling nodes.
- Connector style is a judgment call **by content type**:
  - Orthogonal right-angle for flows, architectures, sequences, decision trees.
  - Curves acceptable for mind maps, dependency graphs, networks.
  - Mixed orthogonal + curves in one diagram is forbidden.

---

## 5.3 Color usage (FLEXIBLE within locked tokens)

Color is a category signal, not decoration.

- Number of colors used = number of categories the content actually has, drawn from the 6-token palette.
- 1-color (monochrome `ink` + `accent` only) is fine for content with no real categories.
- 2–4 colors is fine for content with meaningful categories.
- 5+ colors is forbidden — split into multiple diagrams.
- Whenever ≥ 2 categorical colors are used, a legend block (§5.6) is **mandatory**.

---

## 5.4 Arrowheads (TOKEN)

One style only:
- Filled solid triangle, **8px wide × 6px tall**.
- Color matches the connector stroke (`ink-muted` for default connectors, `accent` for emphasis).
- One `<marker>` definition reused across all connectors in the diagram. Define it once in `<defs>`:

```xml
<defs>
  <marker id="arrow" viewBox="0 0 8 6" refX="8" refY="3"
          markerWidth="8" markerHeight="6" orient="auto-start-reverse">
    <path d="M 0 0 L 8 3 L 0 6 z" fill="context-stroke"/>
  </marker>
</defs>
```

`fill="context-stroke"` makes the marker inherit the connector's stroke color.

---

## 5.5 Edge labels (TOKEN)

Used when a connector needs explanatory text ("creates", "1..*", "depends on", "async").

- 12px / 400 weight, color `ink-muted`.
- Background: `surface-muted` pill, `4px` corner radius, `1px ink-muted` border.
- Padding: 4px horizontal, 2px vertical.
- Centered on the connector midpoint.
- **Rotation rule:** if the connector angle is ≤ 30° from horizontal, the label may rotate to follow it. Otherwise the label stays horizontal and the connector routes around the label rectangle.

---

## 5.6 Legend block (TOKEN)

Required whenever ≥ 2 categorical colors are used.

- Anchored top-right, inside content padding (≥ 16px from canvas edge).
- Each row: `16×16` color swatch + `8px` gap + `12px / 400 ink` label.
- Row gap: 4px.
- Container: `surface` background, `1px ink-muted` border, `4px` corner radius, `8px` internal padding.
- If a "primary" emphasis color (`accent`) is used distinct from category colors, include it as the first row labeled "primary" or similar.

---

## 5.7 Canonical canvases (TOKEN)

Width is always 1280. Choose by content shape and announce the choice.

| Aspect | viewBox | Use for |
|---|---|---|
| 16:10 | `0 0 1280 800` | General flows, architectures, sequences (default) |
| 1:1 | `0 0 1280 1280` | Hierarchies, concept maps, radial layouts |
| 4:5 | `0 0 1280 1600` | Tall trees, deep dependency stacks |

Always include `xmlns="http://www.w3.org/2000/svg"`. Set `<svg width="1280" height="..." viewBox="...">` so the SVG renders crisply at native resolution.

Inside-canvas content padding: ≥ 32px on all sides (so the legend at top-right and the outermost nodes don't kiss the edge).

---

## 5.8 Accessibility — contrast (HARD-LOCKED)

All text / background pairings must pass WCAG AA:
- ≥ 4.5:1 for body text (12, 14 px).
- ≥ 3:1 for ≥ 16 px text.

The palette in §5.1 is pinned to satisfy this. The contrast metric in `eval/code-metrics.md` will hard-fail any out-of-table combination.

Also include a `<title>` element as the first child of `<svg>` summarizing the diagram in one sentence — screen readers read this.

---

## 5.9 Anti-patterns (DO NOT)

- Drop shadows, gradients, 3-D bevels, skeuomorphic icons.
- Connectors crossing through unrelated nodes ("edge tunnels").
- Text smaller than 12 px or rotated more than 30°.
- Decorative emoji or clip-art (informational pictograms allowed only inside the legend).
- Mixed reading directions in one diagram.
- Mixed connector styles (orthogonal + curves) in one diagram.
- Rainbow palettes — colors outside the 6-token set.
- More than one accent color (`accent` is singular by definition).
- Filled "watermark" backgrounds, repeating textures.
- More than 30 primary nodes (split the diagram).
