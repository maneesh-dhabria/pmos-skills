---
schema_version: 1
id: 260704-5ah
title: "/backlog viewer — READY TO BUILD column should list ALL ready stories in #next order (pick marked), not just the single next pick"
type: feature
kind: epic
status: released
route: skill
priority: should
labels: [pmos-toolkit, backlog, web-viewer, ux]
created: 2026-07-04
updated: 2026-07-21
released: v2.106.0
design_doc: docs/pmos/features/2026-07-21_backlog-viewer-ready-queue/02_design.html
feature_folder: docs/pmos/features/2026-07-21_backlog-viewer-ready-queue/
parent:
dependencies: []
---

## Context

The backlog web viewer's **READY TO BUILD** column (Queues view) and the inline `#dashboard` "Next" section
currently show only the **single** `#next` pick. Users read the column title as "everything buildable" and are
surprised to see one story when several are ready (observed 2026-07-04: 6 ready stories across 5 epics, column
showed 1). The column is presentation and should show the **full ordered ready queue**, with the top pick
visually marked.

**Critical nuance / invariant (must not regress):** the `#next` **machine API** (`/backlog next --json`,
consumed by `/feature-sdlc build --next` and unattended `/loop` drivers) MUST keep returning the single best
ready story — the build loop depends on an unambiguous on-deck target (D22). This is a **viewer/presentation**
change only:

- `scripts/serve-web-lib.mjs` — the `queues.next` derivation should additionally expose the full ordered ready
  list **as `queues.next.queue`** (D22 order: in-flight-epic-first → priority → score desc → updated desc), a
  sibling of the existing `pick` — which is then derived as `queue[0] ?? null` so the two cannot drift.
  *(Amended 2026-07-21 at grill: this capture originally proposed a top-level `queues.ready_queue`. Superseded
  by design D1 — a peer-level array reads as a second, independent derivation of readiness.)* Readiness rule unchanged (planned · deps all done/released ·
  unclaimed).
- `web/viewer.html` — render the ordered list in the READY TO BUILD column; mark the pick (e.g. a "next" star/
  badge) so "what build --next grabs" stays obvious. Each row keeps its copy-ready `build --story <id>`.
- Consider the inline `#dashboard` fallback + the human `#next` output too (the machine `--json` path stays
  single-pick).
- `tests/serve-web.test.mjs` — cover the new `ready_queue` derivation + ordering.

## Acceptance Criteria

- [ ] The viewer's READY TO BUILD column lists every ready story (planned · deps satisfied · unclaimed) in
  `#next`/D22 order, not just one.
- [ ] The single next pick is visually distinguished in that list.
- [ ] `/backlog next --json` (machine API) is UNCHANGED — still returns the single pick object; `build --next`
  behavior is byte-identical.
- [ ] Derivation lives in `serve-web-lib.mjs` (one home, D5), covered by `tests/serve-web.test.mjs`; the page
  only renders.
- [ ] A ready row whose claim lock is present-but-stale is shown, carrying a `stale claim` chip (D10 — surfaced
  at grill; the readiness rule is unchanged).
- [ ] Conforms to `skill-patterns.md §A–§L`; `skill-eval` (`[D]`+`[J]`) passes; hygiene lints + audit green.
  Single plugin (pmos-toolkit), one release unit.

## Notes

Route: skill (edits the pmos-toolkit backlog skill). Likely a single-story epic (D18 singleton wrap) — one
build. Define via `/skill-sdlc define 260704-5ah` (injects route: skill).

## Definition (2026-07-21)

Defined via `/feature-sdlc define 260704-5ah` (route: skill, Loop 1). Design doc:
`docs/pmos/features/2026-07-21_backlog-viewer-ready-queue/02_design.html` — 10 decisions, 10 FRs, 5 invariants.
Grilled `--depth deep`: `grills/2026-07-21_02_design.md` (4 questions, all resolved, none deferred).

**One story** (D8 / D18 singleton wrap) — `260721-eev`. The derivation change has no observable effect without
the render, and the render cannot be tested without the derivation.

Grill outcomes worth carrying: field shape amended to `queues.next.queue` (D1, supersedes an AC above); the
inline `#dashboard` fallback lists the queue too, so the headless render doesn't become the degraded copy (D7);
stale-claimed ready rows are shown chipped rather than filtered out, which would have broken INV-3 (D10, a gap
the capture did not anticipate).
