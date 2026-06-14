---
schema_version: 1
id: 260613-5av
title: "/mytasks web UI — Todoist-class local web interface + lightweight server, with subtasks, projects, recurrence (terminal parity retained)"
type: feature
kind: epic
status: released
priority: should
labels: [mytasks, pmos-toolkit, skill, web-ui, server, idea]
created: 2026-06-13
updated: 2026-06-13
released: pmos-toolkit/v2.76.0
route: skill
source: "skill-sdlc define (2026-06-13 session); design-doc seed adopted verbatim"
design_doc: docs/pmos/features/2026-06-13_mytasks-web/02_design.html
pr:
parent:
dependencies: []
---

## Context

Enhance the existing pmos-toolkit `/mytasks` skill with a **Todoist-class web interface**
as the **primary** mode of interaction, backed by a **lightweight local server** that
updates and persists the same markdown task files. The terminal keeps full parity — every
web capability stays reachable from the Claude Code CLI.

The complete, user-approved design (12 locked decisions D1–D12, architecture, schema
changes, web UX, terminal parity, the folded-in id correctness fix, scope guard) is the
design-doc seed adopted verbatim as the epic `design_doc`:
`docs/pmos/features/2026-06-13_mytasks-web/02_design.html`.

**Non-negotiable invariants carried forward** (from the design):
- Markdown task files at `~/.pmos/tasks/items/{id}-{slug}.md` remain the single source of
  truth; the web layer is a view/editor over them, never a separate store.
- Hard isolation from `/backlog` (no code path reads/writes `<repo>/backlog/`).
- `~/.pmos/` stays local-first; sync stays opt-in, never enforced.

**Key decisions** (full table in the design doc §2): D1 subtasks = full child task files
with `parent: <id>`; D2 `project` replaces `workstream` (one-time migration); D3 project is
fully manual (defaults to Inbox/none); D4 server adapts the `comments` `serve.js`; D5 keep
LNO importance; D6 smart-views+projects+labels sidebar; D7 manual order within a project
(`order:` field); D8 recurring tasks in v1, **spawn-new-instance** on complete; D9 quick-add
grammar `@person` / `#project` / `+label` / NL dates; D11 server-required UI (no `file://`
degrade); D12 the id-scheme correctness fix is folded into this work.

## Acceptance Criteria

- [ ] **Schema extended (Story A):** `schema.md` adds `project` (replaces `workstream`),
      `parent`, `order`, `recur`; `schema_version` bumped; empty-optional bare-key binding
      preserved; subtask + recurrence semantics documented.
- [ ] **Migration (Story A):** an idempotent `workstream:`→`project:` rename across
      `items/**.md` + `archive/**.md`, folded into `rebuild-index`.
- [ ] **ID correctness fix (Story A):** Phase 6 locate/normalize triple-accepts
      `<YYMMDD>-<rand3>` / `<MMDD>-<rand3>` / legacy `0001` per `_shared/tracker-crudl.md §2.1`
      (no zero-pad-to-4 mangling); stale `0042`/`0001` examples refreshed in `schema.md`,
      `output-formats.md`, `tests/scenarios.md`, `tests/fixtures/**` (≥1 legacy-id fixture kept).
- [ ] **Terminal parity (Story B):** `set <id> project=|parent=|recur=|order=`; `add --parent <id>`;
      quick-add token grammar (`@`/`#`/`+` + NL dates) honored in bare-text capture; `show`/`list`/
      named views render project, nested subtasks, recurrence; recurrence-on-complete spawn works
      from CLI `done`.
- [ ] **Server (Story C):** zero-dep Node `serve.js` adapted from `comments` — localhost-only,
      atomic temp-then-rename writes, regenerates INDEX after every mutation, optimistic-concurrency
      `409` + reload, PID-file reuse, idle auto-shutdown; JSON API per design §3.3; never deletes
      task files.
- [ ] **Web app (Story C):** single-file HTML+JS app served at `/`; smart-views + projects + labels
      sidebar; task list with LNO flags + drag-to-reorder within a project; detail panel (project,
      labels, importance, due/start, people, recurrence, check-ins, nested subtasks); quick-add bar
      with token grammar; refresh-on-focus + light poll; server-required modal when opened without a
      server.
- [ ] **Launch (Story C):** new `/mytasks web` subcommand spawns/reuses `serve.js` and opens the
      browser; launcher trio (`.command`/`.sh`/`.bat`), bash-3.2-safe with `BASH_SOURCE[0]` fallback.
- [ ] **Files stay source of truth:** server is stateless wrt task data; terminal edits and web edits
      never diverge (server re-reads files per request; INDEX regenerated after writes).
- [ ] **Quality gate (every story):** passes `skill-eval` ([D]+[J]) per `skill-patterns.md §A–§L`;
      non-interactive block inlined byte-identical; canonical skill path; repo lints green; manifest
      version-sync handled by release.

## Stories

- `260613-7n1` — **Foundation:** schema extension (`project`/`parent`/`order`/`recur`) +
  `workstream→project` migration + the id-scheme correctness fix. route: skill, no deps. **Planned**
  (plan_doc + tasks.yaml authored). Build first.
- `260613-044` — **Terminal parity:** CLI subcommands/flags for projects, subtasks, recurrence,
  manual order; quick-add token grammar; show/list rendering of the new structure; recurrence-on-
  complete spawn from CLI. route: skill, depends on `260613-7n1`. **Planned** (plan_doc + tasks.yaml).
- `260613-yfr` — **Web server + UI:** `serve.js` + JSON API + single-file web app + launcher trio +
  `/mytasks web` subcommand. route: skill, depends on `260613-7n1`, `260613-044`. **Planned**
  (plan_doc + tasks.yaml).

## Notes

Story split + skip-grill confirmed with user via AskUserQuestion on 2026-06-13 (define session):
three stories (Foundation → CLI parity → Web), grill skipped (design freshly brainstormed +
approved). Design-doc seed adopted verbatim as `02_design.html`. Build order: 7n1 → 044 → yfr
(044 deps 7n1; yfr deps both). All three ship in one epic release (Loop 3,
`/complete-dev --epic 260613-5av`).
