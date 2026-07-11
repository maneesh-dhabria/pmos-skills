---
schema_version: 1
id: 260709-xhr
title: "/interview-guide — confirm the expected interview duration (never assume) and honor it: defer-only duration prompt, --duration contract flag, time-budgeted reference, data-duration + per-dim data-budget anchors, duration-fit self-review axis, and /interview-feedback consuming the anchor"
type: feature
kind: epic
status: released
released: v0.7.0
route: skill
priority: should
labels: [pmos-managerkit, interview-guide, interview-feedback, skill, from-feedback]
created: 2026-07-09
updated: 2026-07-11
design_doc: docs/pmos/features/2026-07-09_interview-guide-duration/02_design.html
feature_folder: docs/pmos/features/2026-07-09_interview-guide-duration/
parent:
dependencies: []
---

## Context

Feedback-driven revision (`/skill-sdlc define --route skill`) of `/interview-guide` (pmos-managerkit). The seed:
*"please confirm with the user using AskUserQuestion or equivalent on expected interview duration. DO NOT assume.
You can show them ranges (30 mins, 45 mins, 60 mins, 90 mins, Others). The guide and evaluation should honor those."*

Grounding the seed against the live tree turned a one-skill ask into a two-skill loop closure:

1. `/interview-guide` has **no concept of duration at all** — Phase `Collect` resolves role, archetype,
   competencies, seniority and case-or-not, never how long the round runs.
2. Its sibling `/interview-feedback` **already confirms duration** (shipped 2026-07-07, epic `260707-rbc` F2 /
   INV-3 / D3, v0.5.0) after a real run mis-scored an on-time 90-min round as a 2× overrun. Its `SKILL.md:152`
   says the duration "MUST be confirmed with the interviewer, **not** trusted from the scorecard header."
3. **There is no scorecard header to trust** — `_shared/interview-guidelines/scorecard-skeleton.html` carries no
   duration anchor. `/interview-feedback` asks cold because the authoring side never wrote the answer down.

So the seed names the authoring half of a gap whose scoring half already shipped. `route: skill`, single plugin
(pmos-managerkit), one release unit. No new skill, no UI. Coherence contract (INV-1..7, D1..D9, amendments A1..A4,
change surface, story map) in `02_design.html`.

Scope confirmed with the maintainer via a 4-question batch: cover **both** skills (D1); headless with no duration
**DEFERs**, no archetype defaults (D2); "honor" means **time-budget the round** (D5); round duration and the case
take-home work window stay **distinct** (D7). A focused `/grill` pass then amended D3, D6 and D8 and confirmed D9
(see `02_design.html#amendments`).

## Acceptance Criteria

- [ ] `/interview-guide` confirms the round duration via `AskUserQuestion` (30 / 45 / 60 / 90 min + free-form
  "Other"), tagged `<!-- defer-only: free-form -->` with **no `(Recommended)` option**, so the classifier can never
  AUTO-PICK a duration (INV-1, D4).
- [ ] `--duration <mins>` is a documented contract flag (§I 4-test: typed value + headless determinism) that pins
  the value and **suppresses the prompt in every mode**, interactive included (D3 / A1).
- [ ] Under `--non-interactive` with no `--duration`: DEFER, log an open question, emit (a)+(b) with no time budget
  and no duration anchor, and surface the deferral in the run summary. No archetype default durations exist
  anywhere (D2, INV-1, INV-2).
- [ ] The interviewer reference time-budgets the round — per-area minute allocations, explicit open/close overhead,
  and a probe ladder trimmed to what fits (D5).
- [ ] The scoring sheet is the **single machine-readable home** for duration data: root `data-duration="<int>"` on
  `data-card="scorecard"`, plus `data-budget="<int>"` on each `data-dim`. The reference renders the sheet's numbers
  as prose, so the two artifacts cannot drift (D8 / A3).
- [ ] `validate-scorecard-anchors.mjs` **hard-gates the arithmetic** (positive integers; per-dim budgets sum to ≤
  `data-duration`), owns the raw→integer parse for "Other" via `--check-duration`, and **warns without blocking**
  outside a 15–240 min sane band. The model never parses or totals minutes (INV-6, §H, A1/A2).
- [ ] The self-review rubric gains a **reporting-only** duration-fit axis; the manager remains the gate (D6 / A2).
- [ ] Round duration and the case take-home work window remain distinct, separately-sourced inputs (INV-4, D7).
- [ ] `/interview-feedback` reads `data-duration` as the **proposed** value in its existing duration prompt and
  scores coverage per dimension against `data-budget` where present — while keeping its `defer-only: free-form` tag,
  its `--non-interactive` DEFER, and its mismatch flag. The anchor is never silently trusted (INV-3).
- [ ] `data-duration` / `data-budget` are additive and optional: every previously-emitted sheet and all 8 bundled
  `guidelines/<archetype>/scorecard.html` files stay valid with no migration; the weight-sum gate and dim-based
  scorer are unaffected (INV-5).
- [ ] Conforms to `skill-patterns.md §A–§L` + repo `CLAUDE.md`; both halves of `skill-eval.md` and all four hygiene
  lints stay green; the frozen non-interactive block stays byte-identical; no regressions to `rbc`'s F1/F3/F4
  surfaces (INV-7).
- [ ] Ships in one pmos-managerkit release unit.

## Stories

- 260709-qfn — `/interview-guide` confirms + honors round duration; substrate anchors + validator (route: skill). No deps.
- 260709-d0w — `/interview-feedback` reads the by-design duration anchor (route: skill). Depends on 260709-qfn.
