---
schema_version: 1
id: 0021
kind: story
title: Implement concurrency-safe ids — date+short-rand scheme, define merge id-uniqueness gate, derived INDEX
type: tech-debt
priority: should
status: released
released: pmos-toolkit/v2.68.0
parent: 0020
route: skill
plugin: pmos-toolkit
feature_folder: docs/pmos/features/2026-06-12_concurrency-safe-ids/
spec_doc: docs/pmos/features/2026-06-12_concurrency-safe-ids/02_design.html
plan: docs/pmos/features/2026-06-12_concurrency-safe-ids/stories/0021-concurrency-safe-ids/03_plan.html
tasks: docs/pmos/features/2026-06-12_concurrency-safe-ids/stories/0021-concurrency-safe-ids/tasks.yaml
dependencies: []
labels: [backlog, concurrency, ids, tracker-crudl]
created: 2026-06-12
updated: 2026-06-12
---

## Context

The single implementation story for epic 0020. Three layers (L1 id scheme, L2 define merge
uniqueness gate, L3 derived INDEX) across `_shared/tracker-crudl.md`, the `backlog` skill, and
`feature-sdlc` define mode, plus tests and the cross-plugin `_shared` sync. Design + ripple
surface: `../../02_design.html`.

## Acceptance Criteria

- [ ] AC1 — New ids `<MMDD>-<rand3>` Crockford base32; no max+1/counter; parallel mints differ (L1/D1)
- [ ] AC2 — Legacy 4-digit ids parse + never rewritten; validator accepts both (D1 back-compat)
- [ ] AC3 — define merge refuses loudly on pre-existing id; asserts no duplicate INDEX ids post-merge (L2/D2)
- [ ] AC4 — INDEX regenerated not hand-appended, sorted by created desc (L3/D3)
- [ ] AC5 — id-consuming sites scheme-agnostic; sync-shared.sh propagates tracker-crudl (ripple)
- [ ] AC6 — skill-eval green; backlog tests updated; /backlog add stays single-tool-call frictionless

## Notes

Single /execute run, multi-file but cohesive. _shared/tracker-crudl.md is the canonical home of the
id-format rule; sync to other plugins via scripts/sync-shared.sh --from=pmos-toolkit (never hand-copy).
Generator must avoid banned Math.random() in resume-sensitive skill scripts — pin the source in build.
