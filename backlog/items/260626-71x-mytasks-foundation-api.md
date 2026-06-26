---
schema_version: 1
id: 260626-71x
kind: story
title: "/mytasks foundation — server/API + data layer: /api/people CRUD, projects/labels registry + /api/meta union, /api/tasks subtask-children support"
type: enhancement
priority: should
status: planned
route: skill
parent: 260626-a8a
dependencies: []
worktree:
plan_doc: docs/pmos/features/2026-06-26_mytasks-web-enhancements/stories/260626-71x/03_plan.html
tasks_file: docs/pmos/features/2026-06-26_mytasks-web-enhancements/stories/260626-71x/tasks.yaml
claimed_by: build:e385ea38
driver_holder: build:e385ea38
pr:
labels: [pmos-toolkit, mytasks, web-ui, server]
created: 2026-06-26
updated: 2026-06-26
---

## Context

Add the server-side substrate the UI overhaul (`260626-tf4`) and `import` (`260626-j9v`) consume. Touches
`plugins/pmos-toolkit/skills/mytasks/scripts/serve.js`, `lib.js`, `tests/run.mjs`, and documents the new
endpoints + registry in `SKILL.md` / `schema.md`. **No task-file schema change** (I2) — the only new on-disk
artifact is `~/.pmos/tasks/registry.json` (D5). People are read/written against the shared `~/.pmos/people/`
store (D6).

Epic design: `docs/pmos/features/2026-06-26_mytasks-web-enhancements/02_design.html` (§4, §5). Invariants:
I1 (stateless/files-of-record), I2 (parity, additive), I3 (optimistic concurrency), I4 (zero-dep).

## Acceptance Criteria

- [ ] **A1 — `/api/people` GET** returns `{people:[{handle,name}, …]}` sorted by name, read live from
  `~/.pmos/people/*.md` (excluding `INDEX.md`); empty/missing store → `{people:[]}` (no error).
- [ ] **A2 — `/api/people` POST** `{name, handle?, designation?, role?, team?, email?, aliases?}` creates a
  person markdown file at `~/.pmos/people/{handle}.md` (handle auto-derived from name per the `/people`
  `lookup.md` kebab rule when not supplied), writes via the atomic helper, regenerates the people `INDEX.md`,
  returns the created record. Duplicate handle → 409 with the existing record; missing `name` → 400.
- [ ] **A3 — `/api/people/:handle` PATCH** `{fields}` updates an existing person (name/designation/role/team/
  email/aliases), bumps `updated:`, regenerates the people `INDEX.md`; unknown handle → 404. People records
  written this way are byte-shape-compatible with `/people` (round-trips through the same frontmatter
  parse/serialize; a record created in the web is editable from `/people` and vice-versa).
- [ ] **A4 — Projects/labels registry.** A new `~/.pmos/tasks/registry.json` (`{projects:[], labels:[]}`,
  created on first write) records user-declared empty containers. `POST /api/projects {name}` and
  `POST /api/labels {name}` add a (slug-normalized, deduped) entry and return the updated list; a name that
  already exists (in registry or derived from tasks) is a no-op success.
- [ ] **A5 — `/api/meta` returns the union** of registry entries and values derived from task files, each
  sorted, deduped: `{projects:[…], labels:[…]}`. A project/label that exists only because a task uses it
  still appears (back-compat); a registry-only empty project also appears. Removing the last task in a
  project does NOT drop it if it is in the registry.
- [ ] **A6 — `/api/tasks` subtask support for nesting.** The list response lets the client nest children
  under parents: either (a) each task already carries `parent`, and a new `?include_children=1` ensures that
  when a parent matches a filtered/smart view, its subtasks are included in the response (even if a child
  would not match the filter on its own); or (b) an equivalent grouping field. Default behavior (no flag) is
  unchanged — no regression to existing list/filter results.
- [ ] **A7 — Tests** in `tests/run.mjs` cover: people GET/POST/PATCH (incl. handle derivation, duplicate
  409, missing-name 400, round-trip shape vs the `/people` parser), registry add + dedupe + `/api/meta`
  union, `include_children` inclusion + the no-flag no-regression case. All existing `tests/run.mjs`
  scenarios stay green.
- [ ] **A8 — Docs.** `SKILL.md` `#web` (and a new endpoint list) + `schema.md` document the `/api/people`,
  `/api/projects`, `/api/labels` endpoints and `registry.json` (its purpose, shape, and that it only ever
  *adds* visibility — terminal stays registry-agnostic, D5).
- [ ] Zero new dependencies (I4); all writes atomic + stateless re-read (I1); `expected_version` unchanged on
  task mutations (I3).
- [ ] Conforms to `skill-patterns.md §A–§L`; non-interactive block stays inline byte-identical; skill-eval
  `[D]`+`[J]` pass; 4 lints + audit green.
- [ ] Load-bearing dogfood: drive each new endpoint against a real `~/.pmos` (curl/node) — create a person,
  add an empty project, show it in `/api/meta`, and prove a created person is visible to `/people` (and a
  `/people`-created person to `/api/people`).
