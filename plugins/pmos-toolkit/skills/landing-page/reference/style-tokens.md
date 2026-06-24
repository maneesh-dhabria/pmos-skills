# Style tokens — the 6 frozen landing-page themes

Companion to [`style-tokens.json`](./style-tokens.json) (the machine source of truth). Six frozen,
contrast-pre-checked theme-token sets — one per visual style in
[`../../../../docs/pmos/features/2026-06-24_landing-page/02_design.html`](../../../../docs/pmos/features/2026-06-24_landing-page/02_design.html)
§5 (`#styles`). Each set is **pure data**: the `/landing-page` generator (Story B `SKILL.md`) emits inline
CSS from the chosen set at draft time, and [`style-gallery.html`](./style-gallery.html) renders the same
sets as swatches — so **what the user previews is exactly what the generator binds**.

## Contents

- [The invariant](#the-invariant)
- [Token schema](#token-schema)
- [The six styles](#the-six-styles)
- [Contrast guarantee](#contrast-guarantee)

## The invariant

> **A new style = one token set in `style-tokens.json` + one swatch in `style-gallery.html`. Never edit
> the skill body.** Themes are data; the SKILL.md binds them generically by `id`. This is the §K
> "one fact, one home" rule — the token set is the single home both the gallery and the generator read.

## Token schema

Every set carries the full CSS-variable schema (`required_vars` in the JSON). The selftest
(`tests/selftest.mjs`) fails if any required var is missing or empty.

| Group | Vars |
|---|---|
| Palette | `--bg` · `--fg` · `--accent` · `--accent-fg` (text on the accent/CTA) · `--muted` · `--surface` · `--surface-2` · `--border` |
| Type | `--font-display` · `--font-body` · `--scale-base` · `--scale-ratio` · `--weight-display` · `--weight-body` (dev-tool adds `--font-mono`) |
| Density | `--space-unit` · `--section-pad` (+ a `label`) |
| Radius | `--radius` |
| Shadow | `--shadow` |
| Imagery | a directive string — what the visual slots should contain |

## The six styles

### 1. Clean minimal SaaS — `clean-minimal-saas`
White + one accent, airy. Geometric sans (Inter), low density, crisp product UI. *Linear, Vercel, Notion.*

| Token | Value |
|---|---|
| `--bg` / `--fg` / `--accent` / `--accent-fg` | `#ffffff` / `#0a0a0a` / `#4338ca` / `#ffffff` |
| display / body | Inter / Inter · scale 16px ×1.25 · weights 700 / 400 |
| radius / density | 10px · low (`--section-pad: 6rem`) |
| imagery | Crisp product-UI screenshots on generous whitespace; one accent only; no stock photography. |

### 2. Dark developer tool — `dark-developer-tool`
Near-black + neon accent, mono code, bento density. *Vercel, Supabase.*

| Token | Value |
|---|---|
| `--bg` / `--fg` / `--accent` / `--accent-fg` | `#0d1117` / `#e6edf3` / `#3fb950` / `#06240d` |
| display / body / mono | Inter / Inter / `ui-monospace…` · scale 16px ×1.2 · weights 700 / 400 |
| radius / density | 8px · medium-bento (`--section-pad: 5rem`) |
| imagery | Live code samples, terminal/demo frames, bento grids; product-as-demo, never abstract. |

### 3. Bold playful illustration — `bold-playful-illustration`
Bright warm, high-contrast, big friendly display. *growth.design, Duolingo.*

| Token | Value |
|---|---|
| `--bg` / `--fg` / `--accent` / `--accent-fg` | `#fffaf2` / `#1a1730` / `#d6336c` / `#ffffff` |
| display / body | Poppins / Inter · scale 17px ×1.333 · weights 800 / 400 |
| radius / density | 18px · medium (`--section-pad: 5.5rem`) |
| imagery | Custom flat illustrations, big friendly display type, high-contrast warm accents. |

### 4. Editorial / typographic — `editorial-typographic`
Cream + serif display, breathing room, type-led. *Premium editorial.*

| Token | Value |
|---|---|
| `--bg` / `--fg` / `--accent` / `--accent-fg` | `#faf6ef` / `#211d18` / `#2c3e50` / `#ffffff` |
| display / body | Playfair Display (serif) / system sans · scale 18px ×1.414 · weights 700 / 400 |
| radius / density | 4px · low-breathing (`--section-pad: 7rem`) |
| imagery | Type-led layouts, minimal restrained imagery, large drop-cap headlines, wide margins. |

### 5. Warm consumer lifestyle — `warm-consumer-lifestyle`
Soft warm, photographic, rounded humanist sans. *Consumer / wellness / D2C.*

| Token | Value |
|---|---|
| `--bg` / `--fg` / `--accent` / `--accent-fg` | `#fdf8f4` / `#2b2420` / `#c2410c` / `#ffffff` |
| display / body | Nunito / Nunito · scale 17px ×1.25 · weights 700 / 400 |
| radius / density | 16px · medium (`--section-pad: 5.5rem`) |
| imagery | Real-people photography, warm soft tones, rounded humanist sans, lifestyle context. |

### 6. Enterprise trust — `enterprise-trust`
Navy/blue, restrained, denser. *Enterprise B2B.*

| Token | Value |
|---|---|
| `--bg` / `--fg` / `--accent` / `--accent-fg` | `#ffffff` / `#0f172a` / `#1d4ed8` / `#ffffff` |
| display / body | IBM Plex Sans / system sans · scale 16px ×1.2 · weights 600 / 400 |
| radius / density | 6px · higher (`--section-pad: 4.5rem`) |
| imagery | Logo walls, certification/security badges, restrained corporate blues, quantified ROI charts. |

## Contrast guarantee

Every set's `--fg`/`--bg` and `--accent-fg`/`--accent` (CTA) pairings clear **WCAG AA** (≥4.5:1 normal
text). `tests/selftest.mjs` recomputes the relative-luminance contrast ratio for each set and fails the
build if any pairing drops below the floor — the math is done by the script, never model-judged
(skill-patterns.md §H). The design bias (§5) is **restraint + a point of view over commodity effects** —
the palettes are distinctive but never rely on low-contrast "designy" CTAs.
