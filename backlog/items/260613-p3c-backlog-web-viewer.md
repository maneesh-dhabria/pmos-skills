---
schema_version: 1
id: 260613-p3c
kind: epic
title: "/backlog web — read-only single-file HTML viewer served by a lightweight live-read server"
type: feature
status: released
priority: should
labels: [pmos-toolkit, backlog, web-ui]
route: skill
created: 2026-06-13
updated: 2026-06-13
source: docs/pmos/features/2026-06-13_backlog-web-viewer/01_requirements.html
feature_folder: docs/pmos/features/2026-06-13_backlog-web-viewer/
requirements_doc: docs/pmos/features/2026-06-13_backlog-web-viewer/01_requirements.html
design_doc: docs/pmos/features/2026-06-13_backlog-web-viewer/02_design.html
parent:
dependencies: []
released: pmos-toolkit/v2.77.0
---

## Context

Add a read-only web viewer for the backlog as a new `web` verb on the `/backlog` skill (D1).
`/backlog web` starts a zero-dependency Node server (loopback, ephemeral port) that
live-reads `backlog/items/*.md` + `claims/` on each request (D2), derives the model
server-side reusing the skill's existing rules (D5), and serves a single self-contained
HTML viewer (D4). Read-only — no mutation endpoints (D3, "only a viewer").

Views (user-selected): epic→story tree + progress, three release queues (groom/next/
releases), and filters by status/route/plugin. Dependency graph deferred (D6).

Single in-scope skill (`/backlog`) → one story; the parts are not independently
skill-eval'able, so the G3 default of one-story-per-skill holds.

## Acceptance Criteria

- `/backlog web` launches a local server + opens a browser to a working single-file viewer; Ctrl-C stops it.
- The viewer shows every epic + story with accurate status and per-epic progress, derived with the same rules as the terminal verbs.
- A browser refresh after an on-disk change reflects it (live read).
- No server request mutates any file under `backlog/`.
- Conforms to `skill-patterns.md §A–§L` and CLAUDE.md skill-authoring conventions.

## Stories

- 260613-14b — Build the `web` verb: live-read server + single-file viewer + SKILL wiring + tests (route: skill, planned).
