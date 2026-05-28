# Inline SVG style conventions — /primer

The Phase 4 drafter inlines this file when writing diagrams. Diagrams ship inline in the primer HTML; no external assets, no JS.

## Palette (neutral, inherits primer page)

- Stroke: `#222` (default), `#666` (secondary), `#b00020` (emphasis / failure path).
- Fill: `none` for shapes-as-containers; `#f4f4f4` for muted boxes; `#fff8dc` for highlighted boxes.
- Text: `currentColor` (inherits prose color); never hardcode text fills.

## Sizing

- Always set `viewBox="0 0 W H"` — no fixed `width`/`height` attributes; let CSS scale.
- Recommended canvas: `viewBox="0 0 600 300"` for in-prose diagrams; `viewBox="0 0 600 500"` for 2×2 / quadrant layouts.
- Stroke width: `1.5` for primary lines, `1` for secondary, `2.5` for emphasis.

## Background isolation (mandatory)

Diagrams MUST be self-contained — readable on any page background, including dark mode. The primer's `assets/style.css` flips `--pmos-bg` to `#0b0b0c` under `prefers-color-scheme: dark`; SVGs that rely on the page background showing through go invisible (dark strokes vanish on near-black). Reviewer rubrics (R10 et al.) read markup, not rendered output, so this cannot be caught after the fact — bake the background into every SVG.

Two requirements, both mandatory:

1. **First drawn child** of every `<svg>` (after `<defs>`/`<title>`/`<desc>` metadata) is a full-viewBox background rect: `<rect x="0" y="0" width="<W>" height="<H>" fill="#fbfaf6"/>` where `W`/`H` match the `viewBox` dimensions. This is what actually paints under the diagram contents.
2. **CSS-style fallback** on the `<svg>` element itself: `style="background:#fbfaf6;border-radius:8px"`. This handles edge cases where the viewBox doesn't fully fill the rendered SVG box (aspect-ratio mismatch) and gives the diagram a subtle frame distinct from the page.

The `#fbfaf6` value is the primer's light-mode page background — diagrams render identically in light and dark mode, looking intentional rather than pasted on.

## Accessibility

- First child of every `<svg>`: `<title>Short label</title>` — mandatory.
- For diagrams with non-trivial structure: add `<desc>` after `<title>` with a 1–2 sentence textual description (the screen-reader equivalent of the diagram).
- Set `role="img"` and `aria-labelledby="<id>-title"` on the `<svg>` for screen readers; give the `<title>` element a matching `id`.

## Typography

- Inherit prose font: do NOT set `font-family`. Use `font-size="14"` for labels, `font-size="12"` for annotations.
- Avoid `<tspan>` styling beyond `font-weight`; the primer prose CSS handles the rest.

## Shapes

- Boxes: `<rect rx="4" ry="4">` (rounded corners). Width snaps to multiples of 20px for visual alignment.
- Arrows: terminate with a shared `<marker id="arrowhead">` defined once per SVG; reuse via `marker-end="url(#arrowhead)"`.
- Avoid filters, gradients, animations — static, single-file, no JS.

## Patterns (pick the one that matches the section's concept shape)

- **Flow / sequence:** left-to-right boxes connected by arrows; one row. Use when explaining a process or lifecycle.
- **Comparison / 2×2:** four quadrants in a 2×2 grid; axes labelled below and to the left. Use for tradeoff frameworks (e.g., build-vs-buy).
- **Hierarchy:** top-down tree with bracketed groupings. Use for taxonomies or org structures.
- **Loop / cycle:** circular arrangement of 3–5 boxes; arrows form a cycle. Use for iterative processes (e.g., build-measure-learn).
- **State machine:** boxes as states; labelled transitions as arrows. Use when discrete states matter (e.g., feature-flag lifecycle).

## Anti-patterns

- Decorative diagrams that repeat what the prose just said.
- Diagrams with >15 labelled elements — split into 2–3 smaller diagrams instead.
- External SVG references (`<use href="external.svg#x">`) — breaks the single-file contract.
- Embedded raster (`<image href="data:image/png...">`) — bloats artifact, defeats accessibility.
- Diagrams without `<title>` — inaccessible to screen readers; fails the contract.
- Hardcoded text colors / fonts that fight the inherited prose CSS.
- Diagrams without the mandatory background rect + `style="background:..."` fallback — render invisibly under `prefers-color-scheme: dark` (page bg becomes `#0b0b0c`, dark strokes disappear). See "Background isolation".

## Minimal worked example

```html
<svg viewBox="0 0 600 200" role="img" aria-labelledby="rollout-flow-title" style="background:#fbfaf6;border-radius:8px">
  <title id="rollout-flow-title">Percentage rollout lifecycle</title>
  <desc>Three stages: internal-only at 0%, beta cohort at 5%, full rollout at 100%, connected left-to-right by arrows.</desc>
  <defs>
    <marker id="arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="#222"/>
    </marker>
  </defs>
  <rect x="0" y="0" width="600" height="200" fill="#fbfaf6"/>
  <rect x="20"  y="80" width="140" height="40" rx="4" fill="#f4f4f4" stroke="#222" stroke-width="1.5"/>
  <text x="90"  y="105" text-anchor="middle" font-size="14">Internal · 0%</text>
  <rect x="230" y="80" width="140" height="40" rx="4" fill="#fff8dc" stroke="#222" stroke-width="1.5"/>
  <text x="300" y="105" text-anchor="middle" font-size="14">Beta · 5%</text>
  <rect x="440" y="80" width="140" height="40" rx="4" fill="#f4f4f4" stroke="#222" stroke-width="1.5"/>
  <text x="510" y="105" text-anchor="middle" font-size="14">Full · 100%</text>
  <line x1="160" y1="100" x2="230" y2="100" stroke="#222" stroke-width="1.5" marker-end="url(#arrowhead)"/>
  <line x1="370" y1="100" x2="440" y2="100" stroke="#222" stroke-width="1.5" marker-end="url(#arrowhead)"/>
</svg>
```

This is ~65 lines of source for a 3-stage flow. Keep diagrams in this size range; complex topics split into multiple smaller diagrams.
