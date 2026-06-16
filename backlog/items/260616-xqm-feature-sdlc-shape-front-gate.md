---
schema_version: 1
id: 260616-xqm
kind: story
parent: 260616-bq9
title: "/feature-sdlc Phase-1 front-gate rewiring — /shape as the gated problem-shaping front (Tier 1 skip, Tier 2 + Tier 3 mandatory), additive + version-gated; /ideate becomes the solution-exploration step"
type: feature
priority: should
route: skill
dependencies: [260616-p7b]
plugin: pmos-toolkit
status: planned
feature_folder: docs/pmos/features/2026-06-16_shape-skill/
plan_doc:
tasks: docs/pmos/features/2026-06-16_shape-skill/stories/260616-xqm/tasks.yaml
worktree:
labels: [pmos-toolkit, shape, feature-sdlc, pipeline, gating]
created: 2026-06-16
updated: 2026-06-16
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260616-xqm. DEP: 260616-p7b (/shape must exist). -->

## Context

Second story of epic `260616-bq9` (depends on `260616-p7b` — `/shape` must exist to wire it in).
Rewires `/feature-sdlc` so `/shape` becomes the **gated Phase-1 front** of the pipeline (before
`/ideate` + `/requirements`), and `/ideate` is reframed as the **solution-exploration step** that
consumes `/shape`'s frame (the consuming change itself ships in `260616-4pg`).

**Gating posture (D9):** Tier 1 → auto-skip, Tier 2 → **mandatory**, Tier 3 / new-bet →
**mandatory**. Always available standalone. Under `--non-interactive` the mandatory gate triggers
`/shape`'s autonomous path (D10) — it never deadlocks the pipeline.

**Additive + version-gated (D8 — no breaking change):** the new phase is inserted additively and
the state `schema_version` bumps; resume states predating the phase **skip it** (back-compat by
absence), so in-flight worktrees and already-defined epics keep the old phase order. No migration.

## Scope (this story)

- `/feature-sdlc` phase machinery + `reference/state-schema.md` — insert the Phase-1 `/shape`
  gate; bump `schema_version`; absence-skip for legacy resume states.
- Pipeline-position diagram + the mode × phase gate table updated to show `/shape` as Phase-1 front
  and `/ideate` as the solution-exploration step.
- Gate-recommendation logic honours D9 tiering and routes `--non-interactive` to `/shape`'s
  autonomous path.

## Acceptance Criteria

- `/feature-sdlc` runs `/shape` as a gated Phase-1 front: auto-skip Tier 1; **mandatory Tier 2 and
  Tier 3**; `/ideate` follows as the solution-exploration step. Always available standalone.
- The insertion is **additive + version-gated**: `schema_version` is bumped and resume states that
  predate the new phase skip it — no in-flight worktree or existing epic changes behavior.
- Under `--non-interactive`, the mandatory Tier-2/3 gate invokes `/shape`'s autonomous path (no
  deadlock, no hard-refuse).
- The pipeline diagram + mode × phase gate table reflect the new ordering; `/feature-sdlc` still
  passes `skill-eval.md`.
