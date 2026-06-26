---
schema_version: 1
id: 260626-nq0
kind: story
parent: 260626-8pa
title: "/people — NEW zero-dep web viewer (serve-web.mjs + viewer.html), derives from person files per request, web-default + inline fallback"
type: feature
priority: should
route: skill
dependencies: [260626-5cq]
plugin: pmos-toolkit
status: planned
feature_folder: docs/pmos/features/2026-06-26_trackers-index-merge-tax/
plan_doc: docs/pmos/features/2026-06-26_trackers-index-merge-tax/stories/260626-nq0/03_plan.html
tasks: docs/pmos/features/2026-06-26_trackers-index-merge-tax/stories/260626-nq0/tasks.yaml
worktree:
build_branch:
build_commit:
labels: [pmos-toolkit, people, web-viewer]
created: 2026-06-26
updated: 2026-06-26
---

<!-- status: planned at define (Loop 1). Depends on 260626-5cq (people read path must already be derive-on-read before adding the web-default surface). Build via /skill-sdlc build --story 260626-nq0. -->

## Context

The only NEW BUILD in the epic. After S3 (260626-5cq) makes `/people` derive-on-read, this story brings
`/people` to parity with `/backlog` and `/mytasks` by adding a zero-dependency local web viewer so bare
`/people` defaults to the web UI (INV-2). Modeled on `/backlog`'s `serve-web.mjs` / `serve-web-lib.mjs` /
`web/viewer.html` trio: the server derives the people view **fresh per request directly from
`~/.pmos/people/*.md`** — it never reads or writes an index. Cross-skill contract + decision log live in the
`design_doc:` (../../02_design.html, #change-people-web). One `/execute` run.

## Acceptance Criteria

- **AC1 (FR-10):** new `people/scripts/serve-web.mjs` + `people/scripts/serve-web-lib.mjs` + `people/web/viewer.html` — zero external dependencies (Node stdlib + single-file HTML), matching `/backlog`'s trio in shape.
- **AC2 (FR-10/INV-3):** the server derives the people listing fresh per request directly from `~/.pmos/people/*.md`; it never reads or writes any `INDEX.md` or other static export.
- **AC3 (FR-3/INV-2):** a `web` verb launches the viewer, and bare `/people` defaults to it; under `--non-interactive` / headless / no browser it degrades to the inline derived render from S3.
- **AC4 (FR-8):** `people/tests/serve-web.test.mjs` (modeled on `backlog/tests/serve-web.test.mjs`) passes — asserts the derived API payload comes from person files and includes a PII-safety check (no unintended fields leak beyond the viewer's whitelist).
- **AC5 (FR-9):** the new surface conforms to `skill-patterns.md §A–§L` + CLAUDE.md skill-authoring conventions; SKILL.md gains the `web` verb + web-default behavior; `/skill-eval` passes.
