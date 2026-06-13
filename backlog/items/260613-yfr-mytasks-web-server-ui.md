---
schema_version: 1
id: 260613-yfr
kind: story
parent: 260613-5av
title: "Web server + UI — zero-dep serve.js + JSON API + single-file Todoist-class app + /mytasks web launcher"
type: feature
priority: should
status: in-progress
route: skill
dependencies: [260613-7n1, 260613-044]
feature_folder: docs/pmos/features/2026-06-13_mytasks-web/
plan_doc: docs/pmos/features/2026-06-13_mytasks-web/stories/260613-yfr/03_plan.html
tasks: docs/pmos/features/2026-06-13_mytasks-web/stories/260613-yfr/tasks.yaml
worktree: agent-skills-260613-yfr
claimed_by: build:loop-mdh
driver_holder: build:loop-mdh
labels: [pmos-toolkit, mytasks, web-ui, server]
created: 2026-06-13
updated: 2026-06-13
released:
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 260613-yfr -->

## Context

Story 3 (the web surface) of epic `260613-5av`, depends on `260613-7n1` (schema) and
`260613-044` (CLI semantics, esp. the recurrence-on-complete spawn it reuses). The D9
claim-time dependency merge brings both branches into this worktree before build. Delivers the
primary mode of interaction: a lightweight local server that persists the same markdown task
files, and a Todoist-class single-file web app over it. One `/execute` run = one PR. Design
contract: `docs/pmos/features/2026-06-13_mytasks-web/02_design.html` (§3 architecture, §3.3 API,
§5 web UX); standing criteria `skill-patterns.md §A–§L`, repo `CLAUDE.md`.

## Acceptance Criteria

- [ ] **Server:** `serve.js` adapted from the `comments` substrate — zero-dep Node,
      localhost-only (`127.0.0.1`) bind, atomic temp-then-rename writes, regenerates `INDEX.md`
      after every mutation, optimistic-concurrency (`expected_version` → `409` + reload), PID-file
      reuse, idle auto-shutdown (`--idle`), `--port=0`. Stateless wrt task data (re-reads files per
      request). NEVER deletes task files (done/drop are status changes; archive stays move-not-delete).
- [ ] **JSON API:** endpoints per design §3.3 — `GET /api/tasks` (parsed, filterable),
      `GET /api/tasks/:id`, `POST /api/tasks` (mints `<YYMMDD>-<rand3>`; parses quick-add tokens),
      `PATCH /api/tasks/:id` (expected_version), `POST /api/tasks/:id/{checkin,complete,drop}`,
      `POST /api/tasks/reorder`, `GET /api/meta` (projects + labels). Every mutation: validate enums
      → atomic write → rebuild-index → return new version. `complete` reuses Story-B recurrence spawn.
- [ ] **Web app:** single-file HTML+JS served at `/`; sidebar = smart views (Today / Upcoming /
      Overdue / Waiting / Check-ins due) + Projects (+ Inbox) + Labels; task list with LNO colored
      flags + drag-to-reorder within a project (smart date-views stay date-sorted); right detail
      panel (title, notes, project, labels, importance, due/start, people, recurrence, check-ins log,
      nested subtasks add/complete inline); quick-add bar with `@`/`#`/`+` + NL-date token grammar.
- [ ] **Freshness:** web re-fetches on window focus + light periodic poll while visible, so terminal
      edits appear without manual reload; `409` shows a reload banner.
- [ ] **Server-required UX (D11):** opening the app without a running server shows a blocking
      "run `/mytasks web`" modal (no `file://` degrade mode).
- [ ] **Launch:** new `/mytasks web` subcommand (Phase routing + new phase) prechecks `node`,
      reuses a live `serve.js` via PID file or spawns fresh, opens the default browser at
      `http://127.0.0.1:<port>/`; launcher trio (`mytasks-open.command`/`.sh`/`.bat`),
      bash-3.2-safe with `BASH_SOURCE[0]` fallback.
- [ ] **Behavioral tests:** server endpoint + concurrency + atomic-write tests (a `tests/run.mjs`
      `--selftest` or equivalent), and a live browser smoke (drive the served app to create →
      subtask → complete → reorder, à la the /solitaire Playwright gate) — the live gate catches
      bugs the static checks miss.
- [ ] **Quality:** passes `skill-eval` ([D]+[J]) per `skill-patterns.md §A–§L`; non-interactive
      block byte-identical; argument-hint contract flags only (§I); asset bundle within the
      comments-authoring size posture; repo lints green; no release-prereq tasks in the plan.

## Notes

Depends on `260613-7n1` + `260613-044`. Design + API + UX:
`docs/pmos/features/2026-06-13_mytasks-web/02_design.html`. Reuses (does not reimplement) the
`comments` `serve.js` atomicity/concurrency/PID/idle machinery and the Story-B recurrence-on-
complete spawn. Build last; ships the epic at Loop 3 (`/complete-dev --epic 260613-5av`). A
live browser smoke is load-bearing (lesson from /solitaire + /explainer-video — the served
surface hides bugs [D]/[J]/vm-selftests are blind to).
