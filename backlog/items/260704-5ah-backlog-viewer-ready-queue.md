---
schema_version: 1
id: 260704-5ah
title: "/backlog viewer — READY TO BUILD column should list ALL ready stories in #next order (pick marked), not just the single next pick"
type: feature
kind: epic
status: inbox
route: skill
priority: should
labels: [pmos-toolkit, backlog, web-viewer, ux]
created: 2026-07-04
updated: 2026-07-04
design_doc:
feature_folder:
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
  list (e.g. `queues.ready_queue: [...]` in D22 order: in-flight-epic-first → priority → score desc → updated
  desc), alongside the existing single `pick`. Readiness rule unchanged (planned · deps all done/released ·
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
- [ ] Conforms to `skill-patterns.md §A–§L`; `skill-eval` (`[D]`+`[J]`) passes; hygiene lints + audit green.
  Single plugin (pmos-toolkit), one release unit.

## Notes

Route: skill (edits the pmos-toolkit backlog skill). Likely a single-story epic (D18 singleton wrap) — one
build. Define via `/skill-sdlc define 260704-5ah` (injects route: skill).
