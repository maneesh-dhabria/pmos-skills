---
schema_version: 1
id: 260721-sak
kind: story
parent: 260721-k1x
title: "/interview-guide authors the bar — data-level descriptor anchors on every scale option + all-or-none validator gate"
type: enhancement
priority: must
route: skill
dependencies: []
plugin: pmos-managerkit
status: done
feature_folder: docs/pmos/features/2026-07-21_interview-scoring-calibration/
plan_doc: docs/pmos/features/2026-07-21_interview-scoring-calibration/stories/260721-sak/03_plan.html
tasks: docs/pmos/features/2026-07-21_interview-scoring-calibration/stories/260721-sak/tasks.yaml
worktree: .claude/worktrees/feat-260721-sak
claimed_by: build:d5978308-5866-4ca8-bdc7-8e51f6619786
driver_holder: build:d5978308-5866-4ca8-bdc7-8e51f6619786
build_branch: feat/260721-sak
build_commit: 4b0dc4ea
labels: [pmos-managerkit, interview-guide, scoring, calibration, anchors, skill, from-feedback]
created: 2026-07-21
updated: 2026-07-21
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260721-sak -->

## Context

The bar has no machine home. `/interview-feedback` cannot "quote the sheet's own level-3 text" because the sheet
does not carry one — `scorecard-skeleton.html`'s scale is bare integers:

```html
<div class="scale" data-scale="1-4">
  <span data-v="1">1</span><span data-v="2">2</span><span data-v="3">3</span><span data-v="4">4</span>
</div>
```

`/interview-guide` authors the sheets and already emits `data-duration` (root) and `data-budget` (per-dim); the bar
belongs in the same place, authored once and read — never re-derived. This story owns the **anchor contract** and
its validator; it does not touch the bundled corpus (that is `260721-1a4`) and does not touch the consumer (that
is `260721-jb6`).

Independently shippable: a sheet whose scale carries descriptors is strictly better than one without, whether or
not a consumer reads them yet. Decisions D1 and the FR-1/FR-2 detail live in the `design_doc:` (`../../02_design.html`).

**All-or-none per dimension** is the load-bearing validator rule: a partially-described scale is exactly the
ambiguity that invites borrowing the level-4 ceiling down to the level-3 pass line, which is the bar-inflation
defect this epic exists to close.

## Surfaces

- `plugins/pmos-managerkit/skills/interview-guide/SKILL.md` — Phase Scoring Sheet (`#scoring-sheet`)
- `plugins/pmos-managerkit/skills/interview-guide/scripts/validate-scorecard-anchors.mjs` — the gate + `--selftest`
- `plugins/pmos-managerkit/skills/interview-guide/reference/output-shapes.md` — checklist row
- `plugins/pmos-managerkit/skills/_shared/interview-guidelines/scorecard-skeleton.html` — the anchor contract's
  single home (§K); documented in its contract comment, cited by both skills, restated by neither

## Acceptance Criteria

- [ ] **AC1 (FR-1)** Phase Scoring Sheet emits `data-level="<descriptor>"` on every `data-v` option it authors,
  drawn from the archetype's strong/weak markers and the seniority calibration. A freshly-authored sheet for any
  archetype carries a non-empty descriptor on every option of every dimension.
- [ ] **AC2 (FR-1)** `scorecard-skeleton.html` documents `data-level` in its contract comment alongside
  `data-scale`/`data-v`/`data-weight`/`data-budget`; `reference/output-shapes.md` gains the corresponding
  checklist row. The contract is stated in exactly one place and cited, not duplicated (§K).
- [ ] **AC3 (FR-2)** `validate-scorecard-anchors.mjs` asserts `data-level` is **all-or-none per dimension** — a
  dimension with descriptors on some but not all of its `data-v` options is a non-zero exit that blocks emit, with
  a message naming the dimension and the missing levels.
- [ ] **AC4 (FR-2)** The validator rejects a present-but-empty descriptor (`data-level=""` or whitespace-only) with
  a distinct message; a dimension with **no** `data-level` at all is accepted (all-or-none, not
  all-or-fail — the corpus is backfilled in `260721-1a4`).
- [ ] **AC5 (FR-2)** `--selftest` gains four fixtures — fully-described, undescribed, partially-described,
  empty-descriptor — and asserts the expected exit code for each. Existing weight-sum-100 and
  budget-sum-≤-duration assertions still pass unchanged.
- [ ] **AC6** No change to `data-duration`/`data-budget` behaviour, to weights, or to the level ladder. All 8
  bundled archetype sheets still validate green under the new rule (they carry zero `data-level`, which is a
  legal all-or-none state until `1a4` lands).
- [ ] **AC7** `/interview-guide` `skill-eval` passes; all four repo hygiene lints green; the frozen
  non-interactive block byte-identical; no new user-facing flag.
