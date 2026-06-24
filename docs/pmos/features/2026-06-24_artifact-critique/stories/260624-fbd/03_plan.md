# Plan — Story A · critique-rubric substrate (260624-fbd)

Epic `260624-kkw` · route: skill · pmos-toolkit · **foundational substrate, no deps**.
Design contract: [`02_design.html`](../../02_design.html) — anchors `#framework`, `#resolved`,
`#axes-checks`, `#doc-types`, `#findings-schema`, `#corpus`, `#invariants`, `#substrate-map`.
Implementation standard: `feature-sdlc/reference/skill-patterns.md §A–§L` (substrate — §H data a
script reads, §K this dir is the single rubric home that `aa8` cites, never forks).

## Overview

Author `plugins/pmos-toolkit/skills/_shared/critique-rubric/` — the single home (Inv-1) for the
10-axis rubric, the cross-cutting heuristic spine, the verdict scale, the doc-type applicability map
(which drives ABSENT vs N/A deterministically), and the `pmos-critique-findings/v1` structured
schema. Plus vendored **anonymized** corpus samples (no real/confidential doc committed) that serve
as `aa8`'s few-shot exemplar source and eval fixtures. No SKILL.md — substrate, not a command.

This is the foundation: story `aa8` (the `/artifact-critique` SKILL.md) claim-time-merges this branch
(D9) so the substrate is present in its worktree before its `skill-eval`, and cites these files
rather than restating them.

## Files

| File | Purpose |
|---|---|
| `_shared/critique-rubric/heuristics.md` | the §2.4 doc-type-agnostic reasoning spine (named, citable heuristics) |
| `_shared/critique-rubric/axes.md` | fixed 10 axes (in order) + per-axis checks (cite heuristics) + "what I'd want to see" templates |
| `_shared/critique-rubric/doc-types.md` | verdict scale + applicability map (E/N/A/C + conditional rules + hybrid-union) + `pmos-critique-findings/v1` schema |
| `_shared/critique-rubric/selftest.mjs` | internal-consistency self-check (fail-first) + Inv-6 dangling-cite grep |
| `…/corpus-samples/*.{md,json}` | vendored anonymized excerpt + critique-output pairs (≥2 doc-types + AI case) |

## Tasks

See [`tasks.yaml`](./tasks.yaml). T1 heuristics.md → (T2 axes.md ∥ T3 doc-types.md) → T4 anonymized
corpus-samples → T5 internal-consistency self-check (fail-first; the closing gate).

## Decisions carried from the design

- **2-story split, substrate first** — the rubric data is substantial and separable from skill
  orchestration; it lands and is internally validated before `aa8` builds on it (define grill Q1).
- **Embedded findings carrier** — the schema authored here (`doc-types.md` §3) is the
  `<script type="application/json">` block `aa8` bakes into the HTML (define grill Q2).
- **Vendor anonymized samples** — never commit a real corpus doc; anonymized mini-samples make the
  build + tests self-contained (define grill Q3).

## Risks

- **Applicability map miscalibration** (an axis wrongly E/N/A) → wrong ABSENT/N/A verdicts downstream.
  Mitigation: ground each cell in the brief's §2.6 + the anonymized samples; T5 asserts the map covers
  every axis; `aa8`'s eval fixtures exercise the conditional rules (Pricing-N/A, AI-E) end to end.
- **Schema drift** between `doc-types.md` and what `aa8`'s `critique-eval.mjs` validates. Mitigation:
  the schema lives ONCE here (Inv-1/§K); `aa8`'s eval script imports/reads it rather than re-declaring.

## Verification

- T5 self-check exits 0 (axes ⊆ map ⊆ schema enum; heuristic refs resolve; all samples parse).
- Inv-6 grep: only this epic's surfaces reference `critique-rubric` (no `/artifact` cite).
- Conforms to skill-patterns §A–§L as substrate (leading ToC where >100 lines; one-fact-one-home).
- **Release prerequisites** (version bump / changelog / README row / manifest version-sync) are NOT
  in scope here — `/complete-dev` owns them at epic release.
