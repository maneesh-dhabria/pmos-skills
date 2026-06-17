---
schema_version: 1
id: 260613-dnp
kind: story
parent: 260613-vba
title: Refactor /artifact research phase to delegate to _shared/research/ substrate
type: feature
priority: should
status: planned
route: skill
dependencies: [260613-m64]
feature_folder: docs/pmos/features/2026-06-13_research-skill/
plan_doc: docs/pmos/features/2026-06-13_research-skill/stories/260613-dnp/03_plan.html
tasks: docs/pmos/features/2026-06-13_research-skill/stories/260613-dnp/tasks.yaml
worktree:
claimed_by: build:cron-dnp
driver_holder: build:cron-dnp
labels: [pmos-toolkit, artifact, research]
created: 2026-06-13
updated: 2026-06-17
released:
---

<!-- status: planned (2026-06-17 follow-up define touch, dep 260613-m64 now done). Plan +
     tasks.yaml emitted under stories/260613-dnp/. The substrate (_shared/research/) lands in the
     BUILD worktree via the D9 claim-time merge of feat/260613-m64; T1 step 0 asserts its presence.
     Next: Loop-2 build pick. -->
<!-- prior: ready (ACs defined); plan deferred-by-design until 260613-m64 landed (D16). -->

## Context

Story 2 of epic `260613-vba`. Once the `_shared/research/` substrate exists (Story `260613-m64`),
refactor `/artifact`'s approval-gated research phase (epic `0010`) to consume that substrate
instead of its own inline research logic — so the repo has exactly one research engine.
Depends on `260613-m64`; D9 claim-time merge makes the substrate present in this worktree.

## Acceptance Criteria

- [ ] `/artifact`'s research phase cites and uses `_shared/research/` (sourcing, source-tiers,
      fan-out) instead of inline-restating the research method.
- [ ] No behavioural regression in `/artifact`'s research phase (approval gate, fan-out,
      `research/` folder output, verifiable provenance all preserved).
- [ ] `/artifact` and `/research` share one source-tier gate and one rank-then-verify rule
      (§K one-fact-one-home — substrate is the canonical home, both cite it).
- [ ] `/artifact` passes `skill-eval` ([D]+[J]) after the refactor; no dangling cites
      (route:skill epic coherence [J] gate clean).

## Notes

Planned 2026-06-17 (follow-up define touch). 6 tasks: T1–T4 cite-not-restate edits to
`research-phase.md` + `SKILL.md` (preserving /artifact deltas: warrant check, approval gate,
deep-only gating, general-purpose dispatch, single loose-sidecar output); T5/T6 are
`kind: verification` (deep-tier dogfood + skill-eval [D]+[J]). Build only after `260613-m64`
is `done` (it is) — substrate arrives via the D9 claim-time dep-merge into the build worktree.
