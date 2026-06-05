# W11 — visual-identity decision record

Mockups produced to choose the PMOS visual identity (W11 / D2 in the
`2026-06-05_pmos-toolkit-master-plan.md`). Each `*.html` is a full self-contained
artifact mock; open `index.html` to compare them side by side.

Display faces in these mockups load from Google Fonts **for preview only**. The
shipped substrate base64-inlines a subset instead (no server, no internet, no CDN).

## Directions drawn

| File | Direction | Accent | Display face | Signature |
|---|---|---|---|---|
| `a-slate-teal.html` | Slate & Teal | `#0F766E` | Space Grotesk | `§N` + left-bar |
| `b-editorial-aubergine.html` | Editorial Aubergine | `#86198F` | Fraunces serif | oversized `§N` |
| `c-spec-sheet-mono.html` | Spec-Sheet Mono | `#C2410C` | JetBrains Mono | `[N]` + heavy rules |
| `d-stripe-clean.html` | Stripe Clean | `#635BFF` | Inter + gradient | rotated marker |
| `e-claude-warm.html` | Claude Warm | `#C96442` | Newsreader serif | `§N` eyebrow on cream |
| `f-vercel-geist.html` | Vercel / Geist Minimal | `#0070F3` | Geist Sans + Mono | `01/02` counters |
| **`g-mono-minimal.html`** | **Mono Minimal (C × F)** | **`#C2410C`** | **JetBrains Mono** | **`[01]` + hairlines** |

## Decision

**G — Mono Minimal (C × F)** chosen (2026-06-05). C's monospace character + burnt-orange
accent, delivered with F's hairline restraint and zero-padded `[NN]` counters.

**Shipped as:** burnt-orange `#C2410C` accent + stone neutrals + bundled JetBrains Mono 700
(subset, base64-inlined ~5KB) for the display role, across the html-authoring substrate
(`style.css`, `template.html`, viewer mast) and the default `technical` diagram theme; the
shared token bridge lives at `diagram/themes/_shared-palette.yaml`. Font delivery = base64-inline
(self-contained; no CDN). The `editorial` diagram theme keeps its deliberate alternate palette.

These files are a record only — not part of the shipped substrate.
