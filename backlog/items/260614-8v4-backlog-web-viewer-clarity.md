---
schema_version: 1
id: 260614-8v4
kind: story
title: "/backlog web viewer — plain labels, legend, kind pills, grouped status filter, @null fix, Releases cleanup"
type: enhancement
priority: should
status: planned
route: skill
feature_folder: docs/pmos/features/2026-06-14_backlog-web-clarity/
parent: 260614-q3h
dependencies: []
plan_doc: docs/pmos/features/2026-06-14_backlog-web-clarity/stories/260614-8v4-backlog-web-viewer-clarity/03_plan.html
tasks_file: docs/pmos/features/2026-06-14_backlog-web-clarity/stories/260614-8v4-backlog-web-viewer-clarity/tasks.yaml
labels: [backlog, pmos-toolkit, design-crit, ux]
created: 2026-06-14
updated: 2026-06-14
released:
---

## Context

The single fused `route: skill` story for epic `260614-q3h`. Implements the translation layer over the `/backlog web` viewer per `02_design.html` (FR-1..FR-9). All edits land in three files: `web/viewer.html` (presentation), `scripts/serve-web-lib.mjs` (derivation: `null`-literal coercion, grouped-status facet, Releases not-started exclusion), and `tests/serve-web.test.mjs` (coverage). No server/protocol change.

## Acceptance Criteria

- [ ] FR-1 plain column labels + subtitles (Needs you / Ready to build / Releases).
- [ ] FR-2 one-line legend under the title (Epic⊃Story, Define→Build→Release, Tree vs Queues).
- [ ] FR-3 `EPIC` / `story` kind pills in the tree; singleton epics distinguishable.
- [ ] FR-4 status filter split into lifecycle-ordered Epic-status / Story-status groups.
- [ ] FR-5 `@null` never renders — `parseScalar` coerces `null`/`~`/empty to empty (canonical); viewer guard treats `"null"`/`"undefined"` as empty.
- [ ] FR-6 Releases excludes 0-done epics, shows done/total badge, sub-header "In progress".
- [ ] FR-7 tooltips on progress bar + route chip.
- [ ] FR-8 new tests for FR-5/FR-4/FR-6; existing `tests/serve-web.test.mjs` stays green.
- [ ] FR-9 passes `skill-eval` ([D]+[J]) and the 4 repo lints.
