---
schema_version: 1
id: 260721-eev
title: "/backlog viewer — READY TO BUILD lane renders the full ordered ready queue with the pick marked"
type: feature
kind: story
status: planned
route: skill
priority: should
labels: [pmos-toolkit, backlog, web-viewer, ux]
created: 2026-07-21
updated: 2026-07-21
parent: 260704-5ah
dependencies: []
plan_doc: docs/pmos/features/2026-07-21_backlog-viewer-ready-queue/stories/260721-eev/03_plan.html
tasks_file: docs/pmos/features/2026-07-21_backlog-viewer-ready-queue/stories/260721-eev/tasks.yaml
---

## Context

The whole of epic `260704-5ah` in one story (design D8 / backlog D18 singleton wrap): the derivation change has
no observable effect without the render, and the render cannot be tested without the derivation — split, neither
half is independently verifiable.

`scripts/serve-web-lib.mjs` computes the full D22-ordered candidate list and then keeps only `candidates[0]`, so
the viewer's READY TO BUILD lane can structurally never show more than one story. The queue already exists,
correctly ordered, at the moment it is discarded. This is a presentation change, not a scheduling change.

Design: `docs/pmos/features/2026-07-21_backlog-viewer-ready-queue/02_design.html` (D1–D10, FR-1–FR-10,
INV-1–INV-5). Grill: `grills/2026-07-21_02_design.md`.

## Acceptance Criteria

- [ ] `buildModel()` emits `queues.next.queue` — story ids in D22 order, `[]` when none ready — and derives
  `pick` from it as `queue[0] ?? null` in one expression (FR-1, FR-2, D9), so INV-2 is structural.
- [ ] The viewer's READY TO BUILD lane renders one row per id, in order; the head row carries a `next` chip and
  `/feature-sdlc build --next`, every other row carries `/feature-sdlc build --story <id>`; every row shows its
  parent epic (FR-3 … FR-7).
- [ ] A ready row whose claim lock is present-but-stale carries a `stale claim` chip (FR-10, D10). Readiness is
  unchanged — it is not filtered out.
- [ ] `SKILL.md` `#dashboard` step 3's "Next" bullet describes the full ordered list with the pick marked
  (FR-8, D7).
- [ ] **INV-1:** `/backlog next --json` is untouched — output shape, value, and pick order identical;
  `#next` shows zero diff hunks; `build --next` behaviour byte-identical.
- [ ] **INV-4:** no readiness or ordering logic crosses into `viewer.html` — `serve-web-lib.mjs` stays the
  single home for read-side rules.
- [ ] `tests/serve-web.test.mjs` covers queue ordering (existing fixture → `['S2','S6']`), `pick === queue[0]`,
  and the empty case (FR-9).
- [ ] Gates green: `serve-web.test.mjs`, `skill-eval` `[D]`+`[J]`, the 4 hygiene lints, `audit-recommended.sh`.
  Any skill-eval residual proven pre-existing on pre-story main.
- [ ] Live dogfood: `/backlog web` against the real backlog renders >1 row with the head chipped `next`.

## Notes

Single plugin (pmos-toolkit), one release unit (D17). Byte-frozen regions are enumerated in the `tasks.yaml`
header — SKILL.md `#next` in full, the `candidates` filter + comparator in `serve-web-lib.mjs`, and
`serve-web.mjs`.
