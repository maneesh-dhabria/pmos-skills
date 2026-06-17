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
status: done
released: 2.85.0
feature_folder: docs/pmos/features/2026-06-16_shape-skill/
plan_doc:
tasks: docs/pmos/features/2026-06-16_shape-skill/stories/260616-xqm/tasks.yaml
worktree:
claimed_by:
driver_holder:
labels: [pmos-toolkit, shape, feature-sdlc, pipeline, gating]
created: 2026-06-16
updated: 2026-06-17
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

## Build outcome (2026-06-17, Loop-2)

**BUILT — all ACs met.** Branch `feat/260616-xqm` @ `053615c` (worktree
`agent-skills-260616-xqm`, branched from main + merged dep `feat/260616-p7b` to bring `/shape` in;
KEPT for Loop-3). Edits to `feature-sdlc/SKILL.md` + three `reference/` files + one dogfood harness.

- [x] AC1 — `/shape` is a gated Phase-1 front: SKILL.md `## Phase 1a: /shape gate {#shape-gate}` runs
  before `/ideate` (now Phase 1b, the solution-exploration step); D9 tiering — explicit `--tier 1` →
  `skipped-tier1` (auto), Tier 2 / Tier 3 / unresolved-conservative-3 / `new-bet` context bucket →
  **mandatory** (no skip prompt). Always available standalone. Pipeline diagram + mode × phase table
  updated (`1a` /shape, `1b` /ideate).
- [x] AC2 — additive + version-gated: `state-schema.md` `schema_version` v6→v7 (cohort bump), `shape`
  added to the Phase-id/hardness table + the feature/skill-new/prototype `phases[]` lists (before
  `ideate`; omitted in skill-feedback), `shape` substructure + `skipped-tier1` status, a v6→v7
  migration block that is a **pure cohort bump (does NOT back-fill `shape`)**, and a pre-v7
  absence-skip back-compat note mirroring the `ideate` precedent. The resume cursor advances past the
  absent phase → in-flight worktrees / defined epics keep the old order, no migration.
- [x] AC3 — `--non-interactive`: the mandatory Tier-2/3 gate routes to `/shape`'s autonomous path
  (D10) — no deadlock, no hard-refuse; `status = completed`, unresolved items land as the brief's
  Open Questions.
- [x] AC4 — diagram + table reflect the new ordering; `skill-eval-check.sh --target claude-code`
  EXIT 1 with exactly **2 PRE-EXISTING accepted residuals** (`c-reference-toc` on the untouched
  `compact-checkpoint.md`; `e-scripts-dir` for `skill-eval-check.sh` living in `tools/`) — every file
  I edited passes. 4 repo lints green (phase-refs, flags-vs-hints, non-interactive-inline,
  audit-recommended 14 calls / 4 Rec / 10 defer-only / 0 unmarked).

**Dogfood (load-bearing — back-compat absence-skip):** `shape-frontgate-dogfood.mjs` parses the real
`state-schema.md` membership + simulates the documented resume cursor over two fixtures — a pre-v7
in-flight run (no `shape` entry → cursor lands on `wireframes`, /shape gate never fires) and a fresh
v7 run (`shape` present, first gate after init). 23/23 PASS; it fails on any drift in the schema
doc's phase ordering or the absence-skip wording, pinning the cross-version contract. **Verdict: SHIP.**

**Next:** epic `260616-bq9` is now fully built (p7b + 4pg + xqm) → Loop-3
`/complete-dev --epic 260616-bq9`.
