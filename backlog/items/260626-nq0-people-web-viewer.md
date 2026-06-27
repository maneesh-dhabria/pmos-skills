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
status: released
feature_folder: docs/pmos/features/2026-06-26_trackers-index-merge-tax/
plan_doc: docs/pmos/features/2026-06-26_trackers-index-merge-tax/stories/260626-nq0/03_plan.html
tasks: docs/pmos/features/2026-06-26_trackers-index-merge-tax/stories/260626-nq0/tasks.yaml
worktree:
build_branch: feat/260626-nq0
build_commit: d515db8e
claimed_by:
driver_holder:
labels: [pmos-toolkit, people, web-viewer]
created: 2026-06-26
updated: 2026-06-27
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

## Build outcome (Loop 2, 2026-06-27)

BUILT on `feat/260626-nq0` (impl commit `d515db8e`, worktree kept). route:skill inner pipeline (skill-tier-resolve T2 → execute → skill-eval → verify). The only NEW BUILD in epic 8pa.

- **NEW serve-web-lib.mjs** — pure derivation: `parsePeople` + `buildModel`, `PERSON_WHITELIST` = the 7 `schema.md` index-view columns; `buildModel` constructs each person by picking ONLY whitelist fields (never spreads raw frontmatter), sort by name asc, team/relationship facets.
- **NEW serve-web.mjs** — Node-stdlib http server (loopback, ephemeral port, `--no-open` seam, `--people-dir`/`$PMOS_PEOPLE_DIR` override → default `~/.pmos/people`). Routes: `GET /` → viewer.html, `GET /api/people` → fresh derive, favicon 204, else 404; read-only (GET/HEAD).
- **NEW web/viewer.html** — single-file zero-dep UI (sortable 7-column table, search + team/relationship facets, offline banner), mirrors `/backlog`'s viewer.
- **NEW tests/serve-web.test.mjs** — derivation + PII-safety (payload whitelist-only; planted Notes/alias/workstream PII never leaks) + server (live read, no INDEX, 404, read-only). **52/0**.
- **SKILL.md** — `web` verb + Phase 1 web-default launch with headless inline fallback (INV-2); argument-hint, routing table, References updated.

**Discovery:** `/people` was a markdown-only skill (no `scripts/`) — 5cq's derive-on-read was an LLM procedure, not JS. nq0 adds the first JS to `/people` (a new YAML person-file parser modeled on `/backlog`'s, since there was no S3 JS parser to reuse).

Gates: serve-web.test.mjs **52/0** (exit 0); skill-eval `--target claude-code` EXIT1 — the 3 fails (learnings-load / capture-learnings / track-progress) are **pre-existing & byte-identical on the 5cq-merged base** (verified via `git archive 2722c94c` → same 3 fails, EXIT1), zero new failures from nq0; [J] judge pass (web verb + Phase + trio follow the `/backlog` pattern, conforms to skill-patterns §A–§L); 4 hygiene lints + audit-recommended all PASS. Load-bearing dogfood: seeded `~/.pmos/people/*.md`, launched the real server — `/api/people` derived 2 people fresh from files (sorted, whitelist-only keys), **no PII leak** (comp-band/workstream/alias absent), **no INDEX.md written**; inline fallback render produced the byte-identical `schema.md` index-view table.

Epic 260626-8pa now **4/4 FULLY BUILT** (psr + 5cq + 3d4 + nq0). Ships Loop-3 via `/complete-dev --epic 260626-8pa`.
