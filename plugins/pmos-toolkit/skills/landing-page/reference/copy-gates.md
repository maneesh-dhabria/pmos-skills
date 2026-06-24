# Copy & conversion gates

The pre-emit self-review `/landing-page` runs at **Phase 6** — deterministically-described checks the
skill applies to the draft and revises in place **before** surfacing the page. Grounded in
[`02_design.html`](../../../../docs/pmos/features/2026-06-24_landing-page/02_design.html) §7
(`#copy-gates`). These also form the skill-eval acceptance surface: the generated page must structurally
contain a hero with a single primary CTA, the approved sections in order, and the bound style's tokens.

## Contents

- [Headline litmus](#headline-litmus)
- [Harry Dry's 3 tests](#harry-drys-3-tests)
- [Julian's 6-criteria review](#julians-6-criteria-review)
- [Single-CTA / attention ratio](#single-cta--attention-ratio)
- [Clarity rules](#clarity-rules)
- [Psychology levers by section](#psychology-levers-by-section)
- [Anti-pattern avoid-list](#anti-pattern-avoid-list)
- [Visual self-check](#visual-self-check)

## Headline litmus

**Julian's litmus** — *"read only this, do they know exactly what's sold?"* No slogans, no vague
aspiration. Inject specificity (who it's for, what it does, the outcome). Fails the gate → rewrite.

## Harry Dry's 3 tests

Run on **every headline and claim**:

1. **Can I visualize it?** — concrete, picturable, not abstract.
2. **Can I falsify it?** — backed by numbers / dates / specifics, not unfalsifiable puffery.
3. **Can nobody else say this?** — true of *this* product, not a swap-in-any-competitor line.

## Julian's 6-criteria review

Score the page on each (Interest is 1–10):

| Criterion | Question |
|---|---|
| **Conversion** | Does it drive the one action? |
| **Interest** (1–10) | Does it hold attention? |
| **Clarity** | Is it instantly understood? |
| **Expansion** | Does each section deepen desire / remove doubt? |
| **Brevity** | Is anything cuttable without loss? |
| **Disbelief** | Is every claim believable / proven? |

## Single-CTA / attention ratio

**One isolated primary CTA** (von Restorff) — the single highest-contrast action. On a campaign page,
enforce a **1:1 attention ratio**: strip nav links and competing CTAs so there is exactly one thing to do.

## Clarity rules

- **Clarity > cleverness, always.**
- Sell **benefits**, not self-congratulation ("we're the leading…").
- **No wall of text** — scannable; one idea per block.
- Handle **only major objections** — not every edge case.

## Psychology levers by section

Place deliberately, never stacked indiscriminately:

- **Social proof** — logo strip, quantified testimonials.
- **Authority** — credentials, instructor bio, press, certifications.
- **Reciprocity** — a free tool / sample / lesson before the ask.
- **Scarcity** — cohort size, deadline — **only if true**.
- **Commitment** — micro-yes steps before the big ask.
- **Liking** — human tone, real faces, shared values.
- **Unity** — "for people like you" identity framing.

## Anti-pattern avoid-list

Reject on sight: corporate **slogans**; **vague phrasing**; a **bloated header**; **abstract stock
imagery**; **vague testimonials** (no name/role/photo); a **low-contrast CTA**; the **wrong copy-length
for the price** (see `section-scaffolds.md` copy-length rule); and — per D6 — **fabricated metrics,
testimonials, or logos**. Where a real asset is missing, emit a clearly-labelled **placeholder**, never an
invented proof point.

## Visual self-check

After the text gates, the skill renders `index.html` headless (Playwright), screenshots desktop + mobile
into `working/`, and runs a reviewer pass (≤2-iteration fix loop, the `/wireframes` // `/prototype`
pattern) confirming hero/CTA/sections/style render correctly — no overflow, contrast OK, CTA visible above
the fold — fixing issues in place. **Graceful degradation:** with no headless browser, fall back to the
text gates + a structural-HTML check and **log** the skipped visual pass (never silently drop it).
