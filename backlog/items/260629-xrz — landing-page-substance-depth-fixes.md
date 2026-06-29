---
schema_version: 1
id: 260629-xrz
title: "/landing-page substance-depth fixes — per-product personas, do>show>tell hard gate + claim mapping, embed show-surface, Phase-6 judgment checks, dev-tool hero subhead (5 reflect findings)"
type: enhancement
kind: epic
status: defined
route: skill
priority: should
labels: [pmos-toolkit, landing-page, skill, from-feedback]
created: 2026-06-29
updated: 2026-06-29
released:
source: "from-feedback (/reflect retro of /landing-page, 1 run on the pmos-skills 5-plugin marketplace page, 2026-06-29). The skill shipped a clean, valid, self-contained page on the first pass and every deterministic gate (structure, single-CTA, mobile-overflow, asset-fidelity) went green — but the build was shallow on substance: it collapsed a 5-plugin marketplace into one 'product builder' persona, undersold learnkit, used an unrelated framework SVG to stand in for the delivery pipeline, and told (named skills, listed features) where it should have shown. The user pushed back twice, forcing a deep rebuild (per-plugin personas, real artifact screenshots) and a third pass adding live interactive embeds. 5 findings — 2 blockers (F1 multi-product persona cap forces global collapse, F2 do>show>tell defaulted to tell while the show-ratio advisory never fired), 2 friction (F3 interactive embeds absent from the show-surface menu, F4 Phase-6 self-review is all deterministic / no judgment), 1 nit (F5 weak hero one-liner/subhead despite passing the copy gates). Maintainer decisions (define run): D1 one primary persona per product overriding the global 1-2 cap (grilled via AskUserQuestion vs full-triad / capped); D2 Phase-2 maps every feature/value claim to a show-surface as a drafting precondition; D3 do>show>tell promoted to a HARD asset-gated binary-presence Phase-6 gate, §H-clean no-arithmetic (grilled vs keep-advisory-escalate); D4 embed-the-real-artifact (iframe, page-folder-relative, load-on-open <details>+data-src) as the top do-rung of the ladder; D5 two new Phase-6 judgment checks — value-coverage HARD structural for multi-product + asset-claim-match ADVISORY (grilled vs both-advisory); D6 dev-tool hero subhead must name buyer + category explicitly. All edits in plugins/pmos-toolkit/skills/landing-page/{SKILL.md, reference/multi-product.md, reference/section-scaffolds.md, reference/copy-gates.md}; no _shared/ change, no script change, no new flag."
design_doc: docs/pmos/features/2026-06-29_landing-page-substance-depth/02_design.html
parent:
dependencies: []
---

## Context

A single `/landing-page` run shipped a clean, valid, self-contained page on the first pass — and every
**deterministic** gate went green — but the build was **shallow on substance**. The retro surfaced five
**substance-depth** gaps the skill's form-only gates can't catch: whether the hero conveys each product's distinct
value, whether a claim is shown or merely asserted, whether a captioned visual depicts what it claims. All five fix
the `/landing-page` skill (`SKILL.md` + three of its bundled references):

- **F1 [blocker]** — the multi-product persona cap actively caused the failure: Phase 1 / `multi-product.md` selects
  "1–2 personas" and writes a single brief, forcing a 5-plugin marketplace into one collapsed persona.
- **F2 [blocker]** — do>show>tell is a stated governing principle yet the build defaulted to **tell** (named
  `/grill`, `/msf-req` …, listed features, showed no real artifact); the `copy-gates.md` show-ratio check was only
  advisory (§H) and never fired.
- **F3 [friction]** — the section taxonomy read as a ceiling: live interactive embeds (iframe a real primer, embed a
  playable game) weren't in the show-surface menu — the strongest possible proof for a repo whose value is producing
  real openable artifacts.
- **F4 [friction]** — Phase-6 self-review is all deterministic, no judgment: no check for hero value-coverage
  (per-product) or asset-claim-match (the Hooked-model-SVG-as-pipeline mismatch).
- **F5 [nit]** — the hero one-liner/subhead were weak ("does not communicate the full value") despite passing the
  Julian/Harry-Dry copy gates; the buyer+category disambiguator landed in body copy, not the headline.

The six decisions (D1–D6), six FRs, finding→FR map, and five invariants are in the `design_doc:`
(`02_design.html`). This is a revision of an existing skill — the changes touch `SKILL.md`,
`reference/multi-product.md`, `reference/section-scaffolds.md`, and `reference/copy-gates.md`; the style tokens,
style gallery, hero archetypes, and media-strategy references are byte-unchanged, and there is no `_shared/`,
script, or flag change.

## Surfaces

`plugins/pmos-toolkit/skills/landing-page/` **only**:

- `SKILL.md` — Phase 1 `#research-brief` (FR-1), Phase 2 `#propose-structure` (FR-2, FR-4 cross-ref), Phase 5
  `#draft` (FR-4 cross-ref), Phase 6 `#self-review` (FR-3, FR-5, FR-6).
- `reference/multi-product.md` — per-product persona override (FR-1).
- `reference/section-scaffolds.md` — `#governing-principles` do>show>tell ladder + embed rung (FR-4).
- `reference/copy-gates.md` — `#show-ratio` advisory→hard (FR-3), value-coverage + asset-claim-match sections
  (FR-5), dev-tool hero-subhead clarity rule (FR-6).

## Stories

One story — singleton skill epic (same shape as 260629-pd2 / bm9 / 9ne). The six FRs interlock across the same four
files (FR-2's claim-map feeds FR-3's hard gate; FR-4's ladder rung is consumed by FR-2 and FR-5); the D24 litmus
fails any multi-story split.

- **260629-t8z** (route: skill, planned) — all six FRs in one `/execute` run.

## Decisions (maintainer-approved, this define run)

- **D1** — Per-product persona derivation overrides the global 1–2 cap: **one primary persona per product** (with
  jargon tolerance + signature moments), each in its own brief slice; Phase 1 emits one slice per product before
  Phase 2 (precondition). *(grilled via AskUserQuestion — chose "one primary persona per product" over full-triad /
  capped-by-count.)*
- **D2** — Phase 2 maps **every feature/value claim** (not only brief signature moments) to a concrete show-surface
  **before** drafting is permitted; an unmapped claim is demoted or flagged tell-only.
- **D3** — do>show>tell promoted to a **HARD asset-gated binary-presence** Phase-6 gate: a feature-claim page with
  ≥1 available show-surface MUST show ≥1 claim, else block; N/A + logged when no asset can exist. §H-clean —
  presence, never an arithmetic ratio. *(grilled via AskUserQuestion — chose "hard binary-presence gate" over
  "keep advisory, escalate to blocking prompt".)*
- **D4** — Add **embed the real self-contained artifact (iframe, page-folder-relative)** as the top "do" rung of the
  do>show>tell ladder in `section-scaffolds.md`, with the load-on-open `<details>`+`data-src` lazy pattern; honours
  the page's self-contained constraint (file://, no remote).
- **D5** — Phase 6 gains two judgment checks in `copy-gates.md`: **value-coverage** (HARD structural for
  multi-product — hero names each product with a distinct value line) + **asset-claim-match** (ADVISORY judgment —
  each embedded visual depicts what its caption names). *(grilled via AskUserQuestion — chose "hard structural
  value-coverage; asset-claim-match advisory" over both-advisory.)*
- **D6** — Dev-tool hero **subhead** must name the buyer + the category explicitly (don't defer the disambiguator to
  body copy) — a clarity-rule addition enforced in Phase 6.

## Invariants

- **INV-1** untouched references byte-unchanged (`style-tokens.json/.md`, `style-gallery.html`,
  `hero-archetypes.md`, `media-strategy.md`). **INV-2** no new flag; `argument-hint` + `user-invocable` unchanged.
  **INV-3** §H respected — new hard gates ride binary-presence/structural conditions, never arithmetic; the
  vision-dependent check (asset-claim-match) stays advisory. **INV-4** the page's self-contained constraint
  preserved by the embed rung (page-folder-relative, lazy, never remote). **INV-5** skill-patterns §A–§L preserved;
  one-fact-one-home; phase + reference anchors stable so cross-refs resolve.
