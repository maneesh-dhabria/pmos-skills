---
schema_version: 1
id: 260708-s5g
kind: story
title: /interview-feedback — register work-history archetype + extend fill-scorecard.mjs for per-role evidence & trajectory synthesis
type: enhancement
status: planned
priority: should
route: skill
parent: 260708-23a
dependencies: [260708-we4]
feature_folder: docs/pmos/features/2026-07-08_work-history-interview/
design_doc: docs/pmos/features/2026-07-08_work-history-interview/02_design.html
plan_doc: docs/pmos/features/2026-07-08_work-history-interview/stories/260708-s5g/03_plan.html
worktree:
labels: [pmos-managerkit, interview-feedback, work-history, scorer]
created: 2026-07-08
updated: 2026-07-08
---

## Context

Story 2 of epic 260708-23a. Teaches `/interview-feedback` to score a work-history round. **Depends on Story 260708-we4** (the extended `scorecard-skeleton.html` shape + archetype corpus) — D9 claim-time merge brings Story 1's branch into this worktree before skill-eval. Route: skill. Single plugin: pmos-managerkit. Design contract: `02_design.html`.

## Acceptance criteria

1. **Archetype registration** — `work-history` is added to `/interview-feedback`'s archetype enum (`SKILL.md` § role.json: the bundled round-type set), with `guidelines_path: guidelines/work-history/`. `setup` can scaffold a work-history round.
2. **Scorer extension (presence-guarded)** — `scripts/fill-scorecard.mjs` gains a pass that, **only when** the scorecard carries `data-card="role-evidence"` / `data-card="trajectory-synthesis"` sections, fills: per-role evidence (scope, individual contribution, result + `result-measured` marker, per-role flags), the trajectory synthesis (scope-arc, patterns, level-fit, `level-verdict`), in addition to the existing competency `data-dim` pass. The competency/dim pass and the overall-reco insertion are unchanged.
3. **Citation grounding preserved** — every filled note making a subjective claim carries a `<cite>`; transcript-tier citations remain verbatim ≥40-char substrings enforced by `check-citations.mjs`, including the new per-role and trajectory notes.
4. **Backward-compat (hard)** — scoring any of the seven existing archetypes' scorecards is **byte-unchanged**; a golden-file test on an existing archetype scorecard proves the new pass is inert when the sections are absent.
5. **Tests** — `tests/` gains coverage for the work-history fill pass (per-role + trajectory anchors filled; citations validated) and the backward-compat golden file; `run-tests.sh` passes.
6. **No regressions** — `/interview-feedback` skill-eval passes.
7. **Dogfood** — score a short mock work-history transcript end-to-end; confirm the per-role grid, trajectory synthesis, and competency scores all fill with cited notes.

## Notes

Release prerequisites are `/complete-dev`'s job — not in any execute wave.
