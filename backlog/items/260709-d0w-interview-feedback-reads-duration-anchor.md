---
schema_version: 1
id: 260709-d0w
title: "/interview-feedback — read the by-design duration anchor: data-duration proposes the confirmed duration, per-dim data-budget grounds coverage scoring, confirm-never-trust preserved"
type: feature
kind: story
status: done
released: v0.7.0
route: skill
priority: should
labels: [pmos-managerkit, interview-feedback, skill]
created: 2026-07-09
updated: 2026-07-11
parent: 260709-xhr
feature_folder: docs/pmos/features/2026-07-09_interview-guide-duration/
design_doc: docs/pmos/features/2026-07-09_interview-guide-duration/02_design.html
plan_doc: docs/pmos/features/2026-07-09_interview-guide-duration/stories/260709-d0w/03_plan.html
tasks_file: docs/pmos/features/2026-07-09_interview-guide-duration/stories/260709-d0w/tasks.yaml
dependencies: [260709-qfn]
---

## Context

Story B of epic 260709-xhr. The scoring half: `/interview-feedback` already confirms round duration (shipped
2026-07-07 as epic `260707-rbc` F2 / INV-3 / D3) but has nothing to propose, because nothing ever wrote the
by-design duration down. Story 260709-qfn writes it. This story reads it.

**Depends on 260709-qfn** (design D9, confirmed under grill as amendment A4). The dep is deliberate even though this
story degrades gracefully without the anchor: the claim-time transitive dep-merge puts qfn's *merged* `SKILL.md` and
`scorecard-skeleton.html` into this story's worktree, so it is written against the anchor **as actually shipped**
rather than against a fixture of it. Without the dep, an attribute rename in qfn would leave this story reading
something nobody writes — a silent no-op its own fixtures would still pass.

Coherence contract: `02_design.html` — INV-3, INV-5, D8, amendment A3.

## Change surface

- `plugins/pmos-managerkit/skills/interview-feedback/SKILL.md` (Phase `Score`)

## Acceptance Criteria

- [ ] Phase `Score` reads the root `data-duration` anchor from the resolved round scorecard when present.
- [ ] When present, that value is the **proposed** duration shown in the existing duration `AskUserQuestion`, and
  the denominator for talk-time / pace and for the transcript-length vs. design-length mismatch flag.
- [ ] The duration prompt keeps its literal `<!-- defer-only: free-form -->` tag, keeps carrying no safe default,
  and still **DEFERs** under `--non-interactive`. The anchor is never silently trusted — the interviewer still
  confirms (INV-3; `rbc` F2 / INV-3 / D3 preserved verbatim).
- [ ] Where per-dimension `data-budget` anchors are present, **coverage is scored per dimension against the budget
  the guide authored**, not against the round total (D8, A3).
- [ ] A scorecard carrying **no** `data-duration` behaves exactly as it does today: the prompt asks cold, no
  coverage-against-budget scoring, no warning, no regression (INV-5). Covered by a fixture.
- [ ] A scorecard whose `data-duration` disagrees with the interviewer's confirmed answer surfaces the existing
  mismatch flag; the confirmed answer wins.
- [ ] No change to `rbc`'s F1 (brief-baseline submission bucketing), F3 (blocking citation gate / no-stitch) or F4
  (normalized verbatim extraction) surfaces; `check-citations.mjs` and `fill-scorecard.mjs` behavior unchanged.
- [ ] Conforms to `skill-patterns.md §A–§L` + repo `CLAUDE.md`; both halves of `skill-eval.md` and all four hygiene
  lints stay green; the frozen non-interactive block stays byte-identical (INV-7).
