# Badge Emblem — house style

An enclosure makes the mark feel earned. Badge and emblem logos wrap an inner symbol inside a ring, shield, or seal — often with a curved wordmark following the enclosure — for a crafted, heritage, official register. The look is denser than the other themes by design, and that density is exactly the risk: an emblem that sings at 256px can turn to mush at favicon size.

`theme.yaml` is the machine authority. The metrics gate reads `palette.max_colors` and `stroke.min_effective_px` from the YAML.

## The look

- **Inner mark + enclosure.** A central symbol (the icon) sits inside a ring / shield / seal. The two are designed together but are separable — that separability is what the icon-only fallback exploits.
- **Optional curved wordmark.** Text on a circular path (`<textPath>`) hugging the enclosure top and bottom.
- **Up to four colors** counted by the gate — ink plus two accents plus knockout.
- **Strokes may vary** (`single_weight: false`); enclosure rings and inner detail legitimately differ in weight.

## SVG technique

- Author on a square `viewBox` (e.g. `0 0 64 64`). Effective stroke px is `stroke-width * 16 / viewBox-height`; floor `1.0`.
- Build the enclosure as a single `<circle>`/`<path>` so the icon-only variant is a clean delete of that element plus the wordmark.
- For a curved wordmark, define a `<path>` in `<defs>` and reference it from `<textPath href="#…">`. **Namespace that path id by need + variant** — the shared `logo.html` page hosts many emblems and a bare `ring` id collides.
- Keep inner detail coarse. Every hairline you add is a pixel that dies at small sizes.

## Legibility warning

**Emblems lose legibility at the 16px favicon.** The enclosure, the wordmark, and fine inner detail collapse into a dark blob at small sizes. This is intrinsic to the style — do not try to thin your way out of it. The answer is the mandatory icon-only variant below, which is what actually ships as the favicon.

## Anti-patterns

- A bare enclosure / wordmark-path id — collides across emblems on the shared page.
- Treating the emblem as the favicon — use the icon-only variant instead.
- Cramming legible-only-at-poster-size detail into the inner mark.
- More than two accents.

## Required fallbacks

`requires_mono: true`, `forces_icon_only: true`. Two mandatory variants, not optional:

1. **Icon-only** — the inner mark *without* the enclosure ring/shield/seal and without the wordmark. This is the small-size and favicon deliverable, since the full emblem turns to mush at 16px.
2. **Flat mono** — a single-solid-fill rendering for print, embroidery, and one-color contexts.

Ship the full emblem as the primary, plus both variants.
