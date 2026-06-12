---
schema_version: 1
id: 0612-jjs
kind: epic
title: Year-prefixed backlog ids — extend the <MMDD>-<rand3> scheme to <YYMMDD>-<rand3>
type: enhancement
priority: should
status: defined
route: skill
plugin: pmos-toolkit
feature_folder: docs/pmos/features/2026-06-12_yymmdd-ids/
requirements_doc:
spec_doc:
design_doc: docs/pmos/features/2026-06-12_yymmdd-ids/02_design.html
labels: [backlog, mytasks, three-loop, ids, tracker-crudl]
created: 2026-06-12
updated: 2026-06-12
released:
---

## Context

Maintainer feedback (2026-06-12): include the year in `/backlog`'s id numbering —
`mmdd-rnd` → `yymmdd-rnd`. The coordination-free `<MMDD>-<rand3>` scheme shipped one bump
ago in epic 0020 (`pmos-toolkit/v2.68.0`); its `MMDD` date-hint omits the year, so a bare
`0612` is ambiguous across years. Prepending a 2-digit year (`260612-k3f`) makes the
date-hint self-dating. A direct, mechanical extension of 0020 — not a redesign.

Singleton epic (D18) wrapping one build story (`0612-d14`). Route: skill (edits
`_shared/tracker-crudl.md` §2, `backlog/scripts/mint-id.mjs`,
`feature-sdlc/scripts/check-id-uniqueness.mjs`, `mytasks/SKILL.md`, tests, prose —
all pmos-toolkit; single `tracker-crudl.md` copy so no cross-plugin `_shared` sync).

Design contract: `docs/pmos/features/2026-06-12_yymmdd-ids/02_design.html`.

### Maintainer decisions captured at define (2026-06-12)

- **D1 — Additive triple-accept, no migration.** Only new ids carry the year; validator
  widens to accept all three forms (legacy 4-digit · current `<MMDD>-<rand3>` · new
  `<YYMMDD>-<rand3>`). Existing ids/filenames/refs never rewritten.
- **D2 — Scope = `/backlog` AND `/mytasks`** both mint year-prefixed ids going forward.
- **D3 (veto-able at build) — `/mytasks` adopts the same `<YYMMDD>-<rand3>` scheme**, not a
  year+serial hybrid (it has no date prefix today). Trade-off: loses human-incrementable
  serials. Isolated — drop the mytasks task at build to keep `/mytasks` on serials.
- **D4 — Ids stay NOT a sort key.** The §2.2 "no lexical-sort, sort on `created:`"
  invariant is preserved; `rand3` keeps ids non-monotonic. No `/backlog next` change.

## Acceptance Criteria

- [ ] New ids minted as `<YYMMDD>-<rand3>` in `/backlog` (and `/mytasks` per D3); no max+1
- [ ] Triple-accept validator accepts all three forms; every existing id parses, never rewritten
- [ ] Format + validator changed only in the single canonical home (`tracker-crudl.md` §2), cited not restated (§K)
- [ ] All id-consuming sites scheme-agnostic; `id-scheme.test.sh` green incl. the new triple-accept regression check; `/backlog add` stays frictionless
- [ ] `skill-eval.md` green (floor 43/47) for the edited skills

## Notes

Stories: 0612-d14 (the whole change — single skill story).
Lean define: the design doc (`02_design.html`) is the cross-cutting contract; no separate epic
`/spec` (skill spec folds into the story `/plan`). Id `0612-jjs` is itself in the soon-to-be-legacy
`<MMDD>-<rand3>` form — grandfathered-valid under the very triple-accept validator this epic ships.
