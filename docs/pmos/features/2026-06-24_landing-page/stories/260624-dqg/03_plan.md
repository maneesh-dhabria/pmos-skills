# Plan — Story 260624-dqg: bundled style system + reference substrate (no SKILL.md)

**Spec:** [`../../02_design.html`](../../02_design.html) — anchors `#style-system`/`#styles` (§5),
`#section-taxonomy` (§3), `#hero-fold` (§4), `#copy-gates` (§7), `#substrate-map` (§11).
**Tasks:** [`tasks.yaml`](./tasks.yaml).

## Overview

Story A is the independently-shippable, self-tested half of `/landing-page`: a **data-driven style
system** plus a **craft-reference substrate**, all under
`plugins/pmos-toolkit/skills/landing-page/{reference,tests}/` with **no `SKILL.md`** (Story B,
260624-pe2, authors that and consumes these — D7/D9 claim-time dep-merge).

Why this split (per §11 substrate-map): the token sets + gallery + reference files are pure data and
documentation with no LLM at runtime, so they can be built, selftested, and shipped on their own. The
deliverables: 6 frozen theme-token sets carrying the full CSS-var schema (§5), an offline
self-contained `style-gallery.html` rendering 6 labelled swatches **from** those tokens (so the preview
== what the generator binds), the §3 section-scaffold / §4 hero-archetype / §7 copy-gate reference
files, and a pure Node selftest that gates token shape, WCAG-AA contrast, the gallery, and the
reference sections.

## Tasks (mirror of tasks.yaml)

- **T1** — Scaffold `landing-page/{reference,tests}` + author the 6 frozen theme-token sets
  (`reference/style-tokens.json` + `style-tokens.md` doc). *(AC1)*
- **T2** — Stand up `tests/selftest.mjs` fail-first (pure; no network/LLM/browser) — token-shape +
  WCAG-AA contrast helper + gallery + reference-section assertions. *(AC2, AC6)*
- **T3** — Build `reference/style-gallery.html` — offline self-contained swatch gallery rendering 6
  labelled styles from the tokens. *(AC3)*
- **T4** — Author `reference/section-scaffolds.md` — 11-row §3 taxonomy + 4 product-type variants +
  governing equation. *(AC4)* — parallel with T5.
- **T5** — Author `reference/hero-archetypes.md` (4 archetypes + rules) and `reference/copy-gates.md`
  (litmus / 3-test / 6-criteria / von Restorff / psychology / anti-patterns). *(AC5)* — parallel with T4.
- **T6** — Green bar: make `selftest.mjs` pass against all artifacts + verify gallery opens offline;
  assert no `SKILL.md`. *(AC2, AC3, AC4, AC5, AC6)*

Dependency shape: T1 → T2 → T3 (gallery binds the tokens; selftest is fail-first before it). T4 and T5
are parallel and depend on nothing (pure authoring). T6 fans in T2+T3+T4+T5 to the green bar.

## Decisions / risks

- **Token data as `.json` (canonical) + `.md` (companion doc).** The story AC allows `.md` *or*
  `.json`; we make `.json` the machine-bound single source (skill-patterns.md §K — one fact, one home)
  because both the gallery and the future generator bind the same values, and the selftest parses them
  deterministically. `style-tokens.md` is the human-readable mirror for reference-file hygiene. Risk: drift
  between the two — mitigated by the selftest reading the JSON, and the `.md` being a derived view.
- **Contrast check = computed, not model-judged (§H).** The selftest carries an inline relative-luminance
  + WCAG contrast-ratio helper and asserts ≥4.5:1 (normal) / ≥3:1 (large) for fg/bg and CTA pairings.
  No external library, no network. This is the AC2/AC6 gate. Risk: a hand-tuned palette failing AA —
  caught fail-first, fixed in the token data.
- **Gallery opens from `file://` with a fetch-with-fallback.** The single-file gallery inlines or
  fetches the sibling JSON with a file:// fallback so it renders offline (D3 — no CDN, no build). Each
  swatch carries `data-style="<name>"` so the selftest can assert 6 distinct named styles without a
  browser (HTML string parse).
- **Pure, no-LLM, no-browser selftest.** Runnable as `node tests/selftest.mjs`; this keeps Story A
  shippable and gates Story B at claim-time dep-merge.

## Final verification checklist

- [ ] `node tests/selftest.mjs` exits 0 — pure, no network / LLM / headless browser (AC6).
- [ ] 6 frozen token sets present in `style-tokens.json`, names verbatim to §5, full CSS-var schema each (AC1).
- [ ] Every token set well-formed **and** WCAG-AA contrast-passing, asserted by the computed helper (AC2/AC6).
- [ ] `style-gallery.html` opens from `file://` with no CDN/network and renders 6 **distinct named** swatches (AC3).
- [ ] `section-scaffolds.md` = 11-row taxonomy + 4 product-type variants + governing equation (AC4).
- [ ] `hero-archetypes.md` = 4 archetypes + hero rules; `copy-gates.md` = litmus + 6-criteria + Harry Dry 3-test
      + von Restorff single-CTA + psychology-by-section + anti-pattern avoid-list (AC5).
- [ ] Reference-file hygiene: each `.md` one level deep, leading ToC, portable paths.
- [ ] **No `SKILL.md`** exists under `plugins/pmos-toolkit/skills/landing-page/` (D7 — Story B owns it).
