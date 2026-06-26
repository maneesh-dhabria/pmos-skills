---
schema_version: 1
id: 260626-a8a
kind: epic
title: "/mytasks web UI enhancements — inline-everything interaction overhaul (sidebar projects/labels/people, inline task editing + @/#/+ autocomplete, nested subtasks, type/recur/checkin controls, redesigned LNO badge) + /mytasks import"
type: enhancement
status: defined
priority: should
labels: [pmos-toolkit, mytasks, web-ui, from-feedback]
route: skill
created: 2026-06-26
updated: 2026-06-26
defined: 2026-06-26
source: docs/pmos/features/2026-06-26_mytasks-web-enhancements/
feature_folder: docs/pmos/features/2026-06-26_mytasks-web-enhancements/
design_doc: docs/pmos/features/2026-06-26_mytasks-web-enhancements/02_design.html
parent:
dependencies: []
---

## Context

From hands-on use of the `/mytasks` web UI (shipped epic `260613-5av`, currently at `pmos-toolkit/v2.93.0`).
The terminal verbs are full-featured, but the web app (`scripts/webapp/app.js` + `serve.js`) is missing the
inline, low-friction interactions that make a Todoist-class app pleasant — and several capabilities reachable
from the terminal (check-in with a note, type change, recurrence, people) have no web affordance at all.

This epic raises the web UI to "inline everything": create projects/labels/people from the sidebar without
a dialog; edit a task's title inline with `@`/`#`/`+` autocomplete; nest subtasks under their parent
(collapsed by default) instead of showing them as separate rows; reach type, recurrence, and check-ins from
the interface; and replace the always-grey LNO flag with a clearer importance badge. It also adds a new
`/mytasks import` command that turns a pasted text outline into projects/tasks/subtasks/labels.

**No new persistent task fields.** The schema (`schema.md`) is unchanged — `type`, `importance`, `recur`,
`parent`, `project`, `labels`, `people` already exist; this epic only adds **web affordances** for fields
that were terminal-only, plus a small **registry** for empty projects/labels (so a freshly-created container
shows in the sidebar before any task uses it) and a **people read/write endpoint** over the shared
`~/.pmos/people/` store. Terminal ↔ web parity is preserved (both read/write the same markdown files).

## Decisions (resolved during this define run, 2026-06-26)

- **D1 — Task type stays the existing 6-value enum** (`execution`, `follow-up`, `reminder`, `idea`, `read`,
  `call`). The "IC / Coordinate / Groom" relabel from the seed is **dropped** — no schema change, no
  migration. The requirement "change task type from the UI" is satisfied by making `type` a visible,
  editable dropdown in the web edit toolbar (maintainer, 2026-06-26).
- **D2 — LNO importance badge redesign:** replace the always-present grey flag with a bordered-circle letter
  badge — **green "L"** for `leverage`, **blue "N"** for `neutral`, **nothing** for `overhead`. Click still
  cycles importance; a legend + tooltip explains it (maintainer, 2026-06-26).
- **D3 — `/mytasks import` parsing:** honor obvious structure first (indentation / bullets / `- [ ]` /
  leading `#project` / `+label` tokens / trailing dates), fall back to AI inference for ambiguous lines,
  then **confirm the parsed tree** (printed inline + `AskUserQuestion` for genuine ambiguities) before
  writing anything (maintainer, 2026-06-26).
- **D4 — Staged into 3 stories:** foundation (server/API + data layer) → web UI overhaul → `import`. Each is
  independently shippable; the UI story depends on the foundation, import depends on the foundation
  (maintainer, 2026-06-26).
- **D5 — Projects/labels registry:** a lightweight `~/.pmos/tasks/registry.json` records user-created empty
  projects/labels so the sidebar can show a container before any task references it. `/api/meta` returns the
  **union** of registry entries and values derived from task files. Deleting the last task in a project does
  not silently drop the project (it stays in the registry until explicitly removed). Terminal stays
  registry-agnostic — it derives projects/labels from task files as today; the registry only adds, never
  hides (D5 detail in design §4).
- **D6 — People over the web** are read/written against the **shared `~/.pmos/people/` store** (the same
  files `/people` manages), via a new `/api/people` endpoint that does frontmatter round-trip and regenerates
  the people `INDEX.md`. The web people sidebar is a thin CRUD surface; `/people` (CLI) and the web never
  diverge (design §4).

## Cross-skill invariants (cited by the stories)

- **I1 — Files are the source of truth; the server is stateless.** Every endpoint re-reads `~/.pmos/tasks/`
  (and `~/.pmos/people/`) per request and writes via the existing atomic temp-then-rename helpers in
  `lib.js`. No in-memory task state of record.
- **I2 — Terminal ↔ web parity.** Anything the web does to a task is expressible as the same field edit the
  CLI makes; the web never invents fields outside `schema.md`. New web-only surfaces (registry, people CRUD)
  are additive and do not change the task file shape.
- **I3 — Optimistic concurrency preserved.** Every mutation still carries `expected_version`; the 409 +
  reload-banner path is unchanged.
- **I4 — Zero-dependency.** `serve.js`/`app.js` stay dependency-free (no npm, no build step, no CDN). New
  controls use native browser elements (`<input type=date>` for datepickers, plain `<datalist>`/custom
  dropdowns for autocomplete).
- **I5 — `/mytasks import` is agent-driven, not a server endpoint.** Parsing the pasted blob (with AI
  fallback) and the confirmation gate run in the skill/agent layer; writes reuse `lib.js` and `mint-id.mjs`.
  See design §7.

## Stories

- `260626-71x` — **Foundation: server/API + data layer.** `/api/people` (GET list + POST create + PATCH edit
  over `~/.pmos/people/`); projects/labels registry (`registry.json`) + `/api/projects` + `/api/labels` POST
  and `/api/meta` union; `/api/tasks` subtask-children support for nesting. Server tests in `tests/run.mjs`.
  (route: skill, no deps)
- `260626-tf4` — **Web UI overhaul (inline everything).** Sidebar inline-add for projects/labels + a people
  nav section (CRUD); inline title editing with `@`/`#`/`+` autocomplete; pencil→edit-toolbar; +Add Task
  below the list; LNO badge redesign (D2); bigger checkbox + strikethrough on complete; nested collapsed
  subtasks; parent shown in the toolbar when a subtask is open; check-in with a note; type dropdown; inline
  recurrence; edit-toolbar upgrades (project dropdown, Due/Start datepickers, people dropdown). Depends on
  `260626-71x`.
- `260626-j9v` — **`/mytasks import`.** New `import` subcommand: paste a text outline inline → parse
  (indentation/markers + AI fallback, D3) into projects/tasks/subtasks/labels → confirm the tree (printed +
  `AskUserQuestion`) → write items (mint ids, set `parent`/`project`/`labels`) → rebuild index. Parser
  fixtures in `tests/`. Depends on `260626-71x` (reuses the registry write path for new projects/labels).

All three target `pmos-toolkit` → one release at Loop-3.
