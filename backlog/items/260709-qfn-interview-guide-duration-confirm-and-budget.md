---
schema_version: 1
id: 260709-qfn
title: "/interview-guide — confirm round duration (defer-only, never assume), --duration contract flag, time-budgeted interviewer reference, data-duration + per-dim data-budget anchors, validator gates, duration-fit self-review axis"
type: feature
kind: story
status: planned
route: skill
priority: should
labels: [pmos-managerkit, interview-guide, skill]
created: 2026-07-09
updated: 2026-07-09
parent: 260709-xhr
feature_folder: docs/pmos/features/2026-07-09_interview-guide-duration/
design_doc: docs/pmos/features/2026-07-09_interview-guide-duration/02_design.html
plan_doc: docs/pmos/features/2026-07-09_interview-guide-duration/stories/260709-qfn/03_plan.html
tasks_file: docs/pmos/features/2026-07-09_interview-guide-duration/stories/260709-qfn/tasks.yaml
dependencies: []
---

## Context

Story A of epic 260709-xhr. The authoring half: `/interview-guide` learns what a round duration is, refuses to
assume one, and time-budgets the round against it. Also lands the shared-substrate anchors and the validator gates
that story 260709-d0w consumes.

Fused into one story per design D9/G3: the `scorecard-skeleton.html` anchor and the validator cannot be
`skill-eval`'d independently of the skill that emits them, and `/interview-guide` is their sole writer.

Coherence contract: `02_design.html` — INV-1..7, D2..D8, amendments A1/A2/A3.

## Change surface

- `plugins/pmos-managerkit/skills/_shared/interview-guidelines/scorecard-skeleton.html`
- `plugins/pmos-managerkit/skills/interview-guide/scripts/validate-scorecard-anchors.mjs`
- `plugins/pmos-managerkit/skills/interview-guide/SKILL.md`
- `plugins/pmos-managerkit/skills/interview-guide/reference/self-eval-rubric.md`
- `plugins/pmos-managerkit/skills/interview-guide/reference/output-shapes.md`
- `plugins/pmos-managerkit/skills/interview-guide/reference/case-authoring.md`

## Acceptance Criteria

- [ ] Phase `Collect` gains a duration step: an `AskUserQuestion` offering 30 / 45 / 60 / 90 minutes and a free-form
  "Other", preceded by the literal line `<!-- defer-only: free-form -->` and carrying **no `(Recommended)` option**.
  `audit-recommended.sh` stays green via the tag (INV-1, D4).
- [ ] `--duration <mins>` appears in `argument-hint` and the Flags section as a contract flag; when passed it pins
  the value and the Collect prompt does **not** fire, in interactive mode as well as headless (D3 / A1).
- [ ] A free-form "Other" answer is normalized by `validate-scorecard-anchors.mjs --check-duration '<raw>'`, which
  exits non-zero on non-positive / non-integer input; the model never parses minutes itself. A parse failure
  re-prompts rather than guessing. The operator's raw phrasing is preserved as prose in the reference header
  (INV-6, §H, A1).
- [ ] `--check-duration` **warns without blocking** outside a 15–240 minute sane band (A1).
- [ ] Under `--non-interactive` with no `--duration`: the prompt DEFERs, an open question is logged, artifacts (a)
  and (b) are emitted with no time budget and no `data-duration` anchor, and the run summary surfaces the deferral.
  No archetype default duration exists anywhere in the skill (D2, INV-1, INV-2).
- [ ] Phase `Interviewer Reference` emits a per-area minute budget, explicit open/close overhead, and a probe ladder
  trimmed to fit — rendering **the scoring sheet's** numbers as prose rather than authoring its own (D5, A3).
- [ ] Phase `Scoring Sheet` emits root `data-duration="<int>"` on the `data-card="scorecard"` element and
  `data-budget="<int>"` on each `data-dim` section (D8, A3).
- [ ] `scorecard-skeleton.html`'s doc-comment documents both anchors as **optional and additive**, in the same style
  as the `role-evidence` / `trajectory-synthesis` families. All 8 bundled `guidelines/<archetype>/scorecard.html`
  files remain valid unchanged; the weight-sum gate and dim-based scorer are unaffected (INV-5).
- [ ] `validate-scorecard-anchors.mjs` hard-gates: `data-duration`, when present, is a positive integer; per-dim
  `data-budget` values are positive integers summing to ≤ `data-duration`. Non-zero exit blocks the run
  (INV-6, A2).
- [ ] `--selftest` covers the new gates (good + broken fixtures for the sum overrun, the non-integer duration, the
  band warning, and `--check-duration` parse failure). Its assertion count **rises** and the suite stays green.
- [ ] `reference/self-eval-rubric.md` gains a fourth, **reporting-only** duration-fit axis ("can this round be run
  in the confirmed minutes?"). It never blocks; it is skipped when duration is absent (D6, A2).
- [ ] `reference/output-shapes.md` lists both new anchors and names the scoring sheet as the single
  machine-readable home for duration data (A3).
- [ ] `reference/case-authoring.md` states that the live-round duration and the candidate take-home work window are
  distinct, separately-sourced inputs; neither derives from the other. For `case-presentation`, the round duration
  budgets presentation vs. Q&A (INV-4, D7).
- [ ] Conforms to `skill-patterns.md §A–§L` + repo `CLAUDE.md`; both halves of `skill-eval.md` and all four hygiene
  lints stay green; the frozen non-interactive block stays byte-identical (INV-7).
