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
- [Persona-jargon rule](#persona-jargon-rule)
- [do > show > tell show-ratio](#show-ratio)
- [Asset fidelity](#asset-fidelity)
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

## Persona-jargon rule

Calibrate vocabulary to the brief's selected persona(s) and their **jargon tolerance** (`novice` / `fluent`,
captured in Phase 1 — D2). When **any** selected persona is `novice`, **undefined domain jargon is rejected**:
a term like *equity*, *GTO*, *idempotent*, *RAG* must be either **inline-defined on first use** (a parenthetical
or a one-line gloss) or **replaced with plain language**. When **all** selected personas are `fluent`, the
jargon is allowed unglossed — fluent readers are slowed by over-explanation. The persona list lives in the
brief; this is the rule that consumes it. A novice-persona page that ships an undefined domain term fails this
gate — fix it in the draft.

## do > show > tell show-ratio {#show-ratio}

An **advisory (judgment) check, never a hard arithmetic gate** (§H — do not count tokens and threshold). Walk
the drafted sections against the brief's **signature moments to demonstrate** and the do>show>tell principle
(`section-scaffolds.md#governing-principles`): flag any section that **tells** a benefit a captured asset
could **show** — a prose claim ("real-time pot-equity readout") where a screenshot, annotated shot, carousel,
video, or interactive snippet of that exact moment exists or could be captured. Each flag is a suggestion to
upgrade tell→show (or show→do), surfaced to the user; it does not block emit. A page that asserts every
signature moment in prose while showing none is the failure shape this check exists to catch.

## Asset fidelity {#asset-fidelity}

Applied in **Phase 5** as the draft binds screenshots / product shots / logos, and re-checked in the Phase 6
visual self-check. An image that is stretched, skewed, or illegible on a phone undoes the credibility a real
screenshot buys (D7):

- **Preserve native aspect ratio — never stretch or skew.** Store each asset's intrinsic width/height and
  render with `object-fit: contain` (show the whole shot) or `object-fit: cover` (fill a fixed frame, cropping
  evenly) inside any fixed-size frame. Never set both `width` and `height` to values that distort the image.
- **Frame product shots.** Place app/site screenshots in a **device frame** (browser chrome or phone bezel)
  so they read as the real product, not a floating rectangle.
- **Mobile-appropriate assets.** A wide desktop screenshot is often illegible on a phone — provide a
  **portrait crop or an alternate image** for narrow viewports (e.g. a `<picture>` source or a CSS
  `background-image` swap), rather than scaling the wide shot down to an unreadable strip.
- **Captured media follows the same rules.** Video posters and carousel stills (`media-strategy.md`) preserve
  aspect ratio and use device frames too — this is the one home for the fidelity rules they cite.

A draft that stretches an asset, omits a device frame on a product shot, or ships a desktop-only image that
clips on mobile fails this gate — fix it in the draft.

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
the fold — fixing issues in place.

**Mobile is a HARD pass dimension, not informational (D7).** The mobile screenshot must pass, or the page is
**not emitted** until it does (within the existing ≤2-iteration fix loop). A mobile **failure** is any of:
horizontal overflow / a scrollbar; the primary CTA not visible above the fold; or any image skewed, clipped,
or stretched (the `#asset-fidelity` rules). Desktop and mobile are both blocking; a page that looks right on
desktop but overflows on a phone does not ship. If two iterations cannot clear a mobile failure, surface it
loudly with the offending screenshot rather than emitting silently.

**Graceful degradation:** with no headless browser, fall back to the text gates + a structural-HTML check
(hero, one primary CTA, approved sections in order, bound style tokens, and the responsive/asset markup —
`<picture>`/`object-fit`/viewport meta — present) and **log** the skipped visual pass (never silently drop
it). The mobile gate is then best-effort-structural; the skip is logged so the user knows it was not rendered.
