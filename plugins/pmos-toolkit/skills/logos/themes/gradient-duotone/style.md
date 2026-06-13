# Gradient Duotone — house style

Two colors, one smooth transition. A duotone mark fills its shapes with a single two-stop `linearGradient` running between two accents — energetic, modern, and still controlled because the gradient is *one* ramp, not a rainbow. The whole mark shares one gradient direction so it reads as a coherent surface, not a pile of separately-tinted parts.

`theme.yaml` is the machine authority. The metrics gate reads `palette.max_colors` and `stroke.min_effective_px` from the YAML.

## The look

- **Exactly two gradient stops.** From accent A (`violet`) to accent B (`magenta`). No third stop, no mid-color — that's what keeps it a *duo*tone.
- **One gradient direction across the mark.** All shapes reference the same gradient (or parallel copies of it) so light reads consistently.
- **Up to five colors** counted by the gate — the two stops, ink for any detail, and knockout headroom.
- **Strokes may vary** (`single_weight: false`) since gradient fills, not strokes, carry the form.

## SVG technique — namespaced gradient ids (REQUIRED)

Many marks share one `logos.html` page, so **every `<linearGradient>` id is namespaced by need + variant** — never a bare `grad` or `g1`. A duplicate id silently makes one mark steal another's gradient.

```xml
<defs>
  <!-- pattern: <need-slug>-<variant>-duo -->
  <linearGradient id="checkout-v2-duo" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#7C3AED"/>
    <stop offset="1" stop-color="#DB2777"/>
  </linearGradient>
</defs>
<path d="…" fill="url(#checkout-v2-duo)"/>
```

- Author on a square `viewBox` (e.g. `0 0 64 64`). Effective stroke px is `stroke-width * 16 / viewBox-height`; floor `1.0`.
- Use `objectBoundingBox` coordinates (`x1..y2` in 0–1) so the gradient tracks the shape regardless of placement on the page.

## Anti-patterns

- A bare or reused gradient id — collides across marks on the shared page.
- Three or more stops — that's no longer a duotone.
- Per-shape gradient directions that make the mark look assembled from mismatched parts.
- Shipping without the mono fallback (see below).

## Required fallbacks

`requires_mono: true`, `forces_icon_only: false`. The gradient must have a **flat mono fallback**: a second rendering of the mark with a single solid fill (ink, or one accent flattened), for print, favicon, embroidery, and one-color contexts where the gradient muddies or drops out. Ship the duotone primary *and* the flat mono variant. No icon-only variant is forced — duotone marks have no enclosure to strip.
