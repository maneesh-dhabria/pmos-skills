---
schema_version: 1
id: 260721-k1x
title: "/interview-feedback scoring calibration — level-descriptor anchors, sweep-then-score method, four calibration gates, rubric materialization, completeness + citation-stamp hygiene"
type: enhancement
kind: epic
status: defined
route: skill
priority: must
labels: [pmos-managerkit, interview-feedback, interview-guide, scoring, calibration, skill, from-feedback]
created: 2026-07-21
updated: 2026-07-21
source: "from-feedback (/reflect retro of one /interview-feedback run, 2026-07-21). The grounding half of the skill's contract held perfectly — inputs resolved, Gemini transcript treated tier-1, check-citations.mjs exited 0 every pass. The scoring half failed twice and only user pushback caught it: challenge 1 ('only initial probed answers, or did he eventually get there?') moved Dim 1 and flipped the reco off No-Hire; challenge 2 ('are you sure about the others — look at the entire transcript') moved Dim 2/3/4/6 and flipped it to Hire. Weighted score 2.10 -> 3.00; reco swung two full bands on identical evidence. 3 findings ([blocker] time-biased + bar-inflated scoring; [friction] unfilled observer placeholder shipped as complete; [nit] hardcoded citation count hand-patched 19->22->24) and 7 named safeguards. Maintainer decisions (define run): D1 new data-level anchors authored by /interview-guide; D3 four-gate set (sweep / adversarial below-bar / note-vs-score / reco-vs-modal); D4 completeness gate + draft stamp; D5 check-citations.mjs --stamp owns the proof comment. Grill (--depth deep, 9 branches) added D6 (backfill is its own story), D7 (untested dims excluded + renormalized + 30% coverage gate), D8 (rubric-less guide -> synthesize/write-inline/agree; headless AUTO-PICK per maintainer override), D9 (sweep renders as collapsed <details>), D10 (data-note-matches-level, script-compared, rationale-on-mismatch), D11 (output (b) gets the method, not the gate) — and split the epic 2 -> 4 stories."
design_doc: docs/pmos/features/2026-07-21_interview-scoring-calibration/02_design.html
parent:
dependencies: []
---

<!-- status: defined at Loop 1; 4 stories minted + planned. Build via /skill-sdlc build --next -->

## Context

`/interview-feedback` (pmos-managerkit) makes two claims. It proves a **quote is real** — the citation gate
(`check-citations.mjs`, blocking STOP-before-done) verifies every transcript-tier citation verbatim, and it held
on every pass of the failing run. It does **not** prove the **score follows from the evidence at the rubric's own
bar**, and that surface is entirely unguarded. One run failed on it twice, in two separately-fixable ways:

1. **Time-bias** — the run scored the *first probed answer* per dimension and discounted where the candidate
   eventually landed, because scoring happened linearly *while reading*. An eventual insight cannot be credited if
   it has not been collected yet. A **reading-order** defect.
2. **Bar-inflation** — the run applied a senior-signal "did he lead with it, unprompted, up front?" standard as the
   *pass line*, when the sheet's own level-3 reads "solid, some prompting OK". The level-4 ceiling was borrowed
   down to level 3, so every gap scored a 2. A **calibration** defect.

The load-bearing discovery, made in triage, is that **the bar has no machine home**. The strongest proposed
safeguard — "paste the scorecard's own level-3 text and score against that wording" — has nothing to read. The
bundled `scorecard-skeleton.html` scale is bare integers (`<span data-v="1">1</span>…`), and so is every archetype
sheet derived from it: **8 archetypes · 47 dimensions · 0 level descriptors**. The level-3 wording the failing run
was measured against came from a hand-authored sheet, not from anything the skill guarantees.

`/interview-guide` authors the sheets and already emits `data-duration` and `data-budget`. The bar belongs in the
same place, so this epic spans the skill pair exactly as the duration/budget interop did (epic 260707-rbc ->
story 260709-qfn). The full decision set (D1–D11), FRs (FR-1..FR-10), invariants (INV-1..INV-7), the finding->FR
map, the accepted risk and the two open questions live in the `design_doc:`.

Two things the grill surfaced that the retro did not:

- **A latent §H violation live in `main` today.** `fill-scorecard.mjs` parses `data-weight` and *never computes
  anything with it* — there is no weighted-score routine in the skill at all. The retro's "2.10 -> 3.00" was
  arithmetic the model did in its head, which §H forbids. FR-6's script is a **new capability closing an existing
  bug**, not a re-homing.
- **Without the backfill story the epic is dormant.** 47 dimensions carry no descriptor, so a presence-guarded
  consumption alone would never fire on any default path. Hence story `1a4`.

## Surfaces

- `plugins/pmos-managerkit/skills/interview-guide/` — `SKILL.md`, `scripts/validate-scorecard-anchors.mjs`,
  `reference/output-shapes.md`
- `plugins/pmos-managerkit/skills/_shared/interview-guidelines/` — `scorecard-skeleton.html` (anchor contract, its
  single home) and `guidelines/*/scorecard.html` (8 archetypes, 47 dimensions)
- `plugins/pmos-managerkit/skills/interview-feedback/` — `SKILL.md`, `scripts/check-citations.mjs`,
  `scripts/fill-scorecard.mjs`, `scripts/check-scoring-calibration.mjs` (new)

Single plugin -> single release unit (D17).

## Stories

| Story | Scope | FRs | Deps |
|---|---|---|---|
| `260721-sak` | `/interview-guide` emits `data-level`; validator enforces all-or-none per dimension | FR-1, FR-2 | — |
| `260721-1a4` | Backfill 188 descriptors across the 8 bundled archetypes (47 dims) | FR-3 | `sak` |
| `260721-jb6` | `/interview-feedback` consumption, method rewrite, gate script, untested arithmetic, rubric materialization | FR-4..FR-8 | `sak` |
| `260721-z5n` | Completeness gate + `check-citations.mjs --stamp` (the friction + nit findings) | FR-9, FR-10 | — |

`sak` and `z5n` are buildable immediately; `1a4` and `jb6` unblock on `sak` and are independent of each other
(FR-4 is presence-guarded, so `jb6` is correct against an un-backfilled sheet).

## Acceptance Criteria (epic-level)

- [ ] **AC1** All four stories are `done`, and `pmos-managerkit` releases as one unit with a single version bump.
- [ ] **AC2** A `/interview-feedback` run against a sheet carrying `data-level` descriptors quotes the dimension's
  own at-bar wording before assigning a number, and cannot declare done with an unswept dimension, an undefended
  below-bar score, an unexplained note-vs-score mismatch, or an unexplained reco-vs-modal disagreement.
- [ ] **AC3** No dimension is ever scored against an absent bar (INV-1): descriptors present -> quoted; absent ->
  D8's synthesize -> write inline -> agree path runs first and blocks scoring until it completes.
- [ ] **AC4** Every arithmetic condition (modal, weighted, renormalized, untested-weight-%, band comparison) is
  computed by `check-scoring-calibration.mjs`; the model performs no arithmetic anywhere in the new surface (INV-2).
- [ ] **AC5** The citation gate's semantics are byte-for-byte unchanged — only who writes its proof-of-pass comment
  moves (INV-3). Its `--selftest`/existing tests still pass.
- [ ] **AC6** All 8 bundled archetypes pass the FR-2 validator with full `data-level` coverage; `work-history`'s
  extra dimension families are unaffected (INV-6).
- [ ] **AC7** No new user-facing flag on `/interview-feedback`; `argument-hint` unchanged; the frozen
  non-interactive block stays byte-identical (INV-7). `skill-eval` passes for both skills; all four repo hygiene
  lints green.
