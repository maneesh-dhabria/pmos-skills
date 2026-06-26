---
schema_version: 1
id: 260625-sm0
kind: epic
title: "/backlog grooming false-positive — AC detection requires checkbox markers, so numbered/dash ACs read as ungroomed"
type: bug
status: released
released: v2.93.0
priority: should
labels: [pmos-toolkit, backlog, grooming, viewer, derivation]
route: skill
created: 2026-06-25
updated: 2026-06-25
defined: 2026-06-25
source: docs/pmos/features/2026-06-25_backlog-ac-grooming-format/02_design.md
feature_folder: docs/pmos/features/2026-06-25_backlog-ac-grooming-format/
design_doc: docs/pmos/features/2026-06-25_backlog-ac-grooming-format/02_design.md
parent:
dependencies: []
---

## Context

`/backlog`'s groom/dashboard view derives "needs grooming" via `hasAcceptanceCriteria(body)` in
`serve-web-lib.mjs`, which counts an AC section as present only when it contains a markdown checkbox
(`/-\s*\[[ xX]\]/`). Stories whose ACs are written as numbered lists or bold-dash bullets (the form
`/feature-sdlc define`'s story-split emits) read as `has_ac=false`, so fully-groomed `planned` stories
false-flag as "needs grooming". Viewer-only false positive — `next`/`releases`/build don't gate on
`has_ac`. See `design_doc` for root cause + decision log (D1–D5).
