---
schema_version: 1
id: 260613-14b
kind: story
title: "Build /backlog web: live-read zero-dep server + single-file HTML viewer + SKILL wiring + tests"
type: feature
status: in-progress
priority: should
labels: [pmos-toolkit, backlog, web-ui]
route: skill
created: 2026-06-13
updated: 2026-06-14
parent: 260613-p3c
dependencies: []
feature_folder: docs/pmos/features/2026-06-13_backlog-web-viewer/
design_doc: docs/pmos/features/2026-06-13_backlog-web-viewer/02_design.html
plan_doc: docs/pmos/features/2026-06-13_backlog-web-viewer/stories/260613-14b/03_plan.html
tasks_file: docs/pmos/features/2026-06-13_backlog-web-viewer/stories/260613-14b/tasks.yaml
worktree: /Users/maneeshdhabria/Desktop/Projects/agent-skills-260613-14b
claimed_by: build:loop-mdh
driver_holder: build:loop-mdh
---

## Context

The whole `/backlog web` viewer ships as one story (one `/execute`, one `/skill-eval`):
a derivation module, a zero-dep live-read http server, a single-file HTML viewer, the
`web` verb wired into `backlog/SKILL.md`, and tests. Grounded in
`02_design.html` (decisions D1–D7, server/api/viewer contracts). Tasks T1–T5 in `tasks.yaml`.

## Acceptance Criteria

- `scripts/serve-web-lib.mjs` parses `backlog/items/*.md` and derives the `/api/backlog` model (epics, stories, rollups done/total/blocked, queues groom/next/releases, facets) matching `schema.md` + `#next`/`#releases` rules; malformed items skipped, not fatal; covered by tests.
- `scripts/serve-web.mjs` serves `GET /` (viewer.html) + `GET /api/backlog` (fresh parse per request — live read) on 127.0.0.1 ephemeral port; `--no-open`/`--port` args; 404 otherwise; read-only (no write path); headless tests pass.
- `web/viewer.html` is a single self-contained file (inline CSS+JS, no CDN) rendering the Tree view (epic→story + progress + status badges), the Queues view (groom/next/releases), and a persistent status/route/plugin filter bar with a Refresh; no write controls; graceful `file://` empty-state.
- `backlog/SKILL.md` has a `web` row in `#routing`, a `## web {#web}` handler (no prompts), `web` + `--no-open`/`--port` in `argument-hint`, and References bullets — conforming to `skill-patterns.md §I`.
- Live dogfood (T5): the served viewer renders the real repo backlog in a browser; Queues match `/backlog next --json` + `releases --json`; a filter narrows; Refresh re-reads after an add. Live-only bugs fixed (cap-2).
- `/skill-eval` `[D]`+`[J]` pass for `backlog`; repo lints green.
