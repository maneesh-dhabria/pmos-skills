# Hero archetypes + hero rules

The hero fold is the page's **single most important decision**, so `/landing-page` Phase 3 always explores
it with real renders (D2), not descriptions. Grounded in
[`02_design.html`](../../../../docs/pmos/features/2026-06-24_landing-page/02_design.html) §4
(`#hero-fold`).

## Contents

- [Hero elements](#hero-elements)
- [The 4 archetypes](#the-4-archetypes)
- [Hero rules (enforced)](#hero-rules-enforced)
- [Phase-3 mechanism](#phase-3-mechanism)

## Hero elements

All above the fold: **headline · subhead · primary CTA · optional secondary CTA · hero visual · trust
strip.** The recommended archetype comes from the brief's `product_type` (D5); the user picks among 2–3
rendered options.

## The 4 archetypes

| Archetype | Shape | Best for |
|---|---|---|
| **A. Benefit-led + product shot** | Bold outcome headline + crisp UI screenshot/GIF | B2B SaaS, productivity |
| **B. Outcome + live demo** | "The product is the demo" framing + demo frame | Dev tools, complex products |
| **C. Bold statement + illustration** | Provocative one-liner + custom illustration | Info-product, brand-led, consumer |
| **D. Social-proof-forward** | Headline + immediate user-count / logo wall / rating | Category leaders, waitlists |

## Hero rules (enforced)

Applied **regardless of archetype** — the generator and the §7 copy gates both check them:

1. **Julian's litmus** — the headline must pass: *"if the visitor reads only this text, will they know
   exactly what you sell?"* No slogans; inject specificity.
2. **Subhead ≤ 2 sentences** — it supports the headline, it doesn't restate it.
3. **Exactly one visually-isolated primary CTA** (**von Restorff**) — the single highest-contrast element
   in the fold. An optional secondary CTA is visually quieter (ghost/text link).
4. **CTA copy is first-person + outcome-led** — "Start free", "Book my demo", "Join the course" — **never**
   "Submit" / "Learn more".
5. **The visual shows the product in action** — a real screenshot, demo frame, or purposeful
   illustration; **never abstract stock imagery**.

## Phase-3 mechanism

Emit `working/hero-options.html` in the page folder (a **working artifact**, not the final output)
containing **2–3 fully-styled hero renders** stacked for side-by-side comparison, each labelled with its
archetype and rendered in the eventual style's tokens. The user picks one (and may request copy/layout
tweaks); the chosen hero is carried **verbatim** into Phase 5 (draft).
