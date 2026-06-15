---
schema_version: 1
id: 260613-dnp
kind: story
parent: 260613-vba
title: Refactor /artifact research phase to delegate to _shared/research/ substrate
type: feature
priority: should
status: in-progress
route: skill
dependencies: [260613-m64]
feature_folder: docs/pmos/features/2026-06-13_research-skill/
plan_doc:
tasks:
worktree: feat/260613-dnp
claimed_by: build:dnp-loop
driver_holder: build:dnp-loop
labels: [pmos-toolkit, artifact, research]
created: 2026-06-13
updated: 2026-06-15
released:
---

<!-- status: ready (ACs defined); plan DEFERRED until 260613-m64 lands — the /artifact refactor
     depends on the realized shape of _shared/research/. Plan this story in a follow-up define
     touch (epics stay open for planning after `defined`, D16), or at build pick once m64 is done. -->

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

Plan deferred by design — see the status comment above. Build only after `260613-m64` is `done`.
