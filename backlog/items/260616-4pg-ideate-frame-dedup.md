---
schema_version: 1
id: 260616-4pg
kind: story
parent: 260616-bq9
title: "/ideate frame-dedup — Frame phase consumes /shape's HMW+JTBD problem-brief when present instead of re-deriving it"
type: enhancement
priority: should
route: skill
dependencies: [260616-p7b]
plugin: pmos-toolkit
status: in-progress
feature_folder: docs/pmos/features/2026-06-16_shape-skill/
plan_doc:
tasks: docs/pmos/features/2026-06-16_shape-skill/stories/260616-4pg/tasks.yaml
worktree: /Users/maneeshdhabria/Desktop/Projects/agent-skills-260616-4pg
claimed_by: build:cron-4pg
driver_holder: build:cron-4pg
labels: [pmos-toolkit, shape, ideate, frame-dedup]
created: 2026-06-16
updated: 2026-06-17
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260616-4pg. DEP: 260616-p7b (/shape's frame must exist). Independent of 260616-xqm. -->

## Context

Third story of epic `260616-bq9` (depends on `260616-p7b`; independent of `260616-xqm` — buildable
in parallel once `/shape` lands). `/ideate`'s Frame phase currently re-derives the HMW + JTBD
framing from scratch. When a `/shape` problem-brief is present (passed by the pipeline or
discoverable), `/ideate` should **consume that frame** instead of re-deriving it — no duplicated
framing work, and the solution-exploration step inherits the problem shape `/shape` converged on.

Absence of a `/shape` frame must be a clean fallback: `/ideate` re-derives as it does today, so the
skill remains usable standalone.

## Scope (this story)

- `plugins/pmos-toolkit/skills/ideate/SKILL.md` — Frame phase: detect + adopt a `/shape`
  problem-brief (HMW + JTBD + chosen framing) when present; fall back to deriving when absent.
- Cross-reference contract with `/shape`'s artifact (what fields `/ideate` reads).

## Acceptance Criteria

- `/ideate` consumes `/shape`'s HMW+JTBD frame when a problem-brief is present instead of
  re-deriving it; the framing is not duplicated.
- When no `/shape` frame is present, `/ideate` falls back to deriving the frame as today (standalone
  usability preserved).
- `/ideate` still passes `skill-eval.md`.
