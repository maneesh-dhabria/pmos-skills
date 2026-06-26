---
schema_version: 1
id: 260626-tf4
kind: story
title: "/mytasks web UI overhaul — inline everything: sidebar projects/labels/people CRUD, inline title edit + @/#/+ autocomplete, nested collapsed subtasks, LNO badge redesign, type/recur/checkin/datepicker controls"
type: enhancement
priority: should
status: in-progress
route: skill
parent: 260626-a8a
dependencies: [260626-71x]
worktree: .claude/worktrees/feat-260626-tf4
plan_doc: docs/pmos/features/2026-06-26_mytasks-web-enhancements/stories/260626-tf4/03_plan.html
tasks_file: docs/pmos/features/2026-06-26_mytasks-web-enhancements/stories/260626-tf4/tasks.yaml
claimed_by: build:e385ea38
driver_holder: build:e385ea38
pr:
labels: [pmos-toolkit, mytasks, web-ui, frontend]
created: 2026-06-26
updated: 2026-06-27
---

## Context

The interaction overhaul of the web app — `scripts/webapp/app.js`, `app.css`, `index.html`. Consumes the
foundation endpoints from `260626-71x` (`/api/people`, `/api/projects`, `/api/labels`, `/api/meta` union,
`/api/tasks?include_children=1`). Zero new dependencies — native browser elements only (I4). Every mutation
keeps `expected_version` (I3).

Epic design: `docs/pmos/features/2026-06-26_mytasks-web-enhancements/02_design.html` (§6). Decisions D1
(type stays 6-enum, editable in UI), D2 (LNO badge: green L / blue N / nothing for overhead).

## Acceptance Criteria

- [ ] **A1 — Sidebar inline-add projects.** A `+ Add project` affordance under the Projects nav turns into an
  inline text input (no modal/dialog); Enter creates it via `POST /api/projects` and it appears immediately
  and stays selected. Same pattern for **labels** under the Labels nav (`+ Add label` → `POST /api/labels`).
- [ ] **A2 — People sidebar nav section.** A new "People" sidebar section lists people (from `/api/people`);
  `+ Add person` inline-adds one (`POST /api/people`); clicking a person opens an inline edit (name + optional
  fields) saved via `PATCH /api/people/:handle`. No dialog box.
- [ ] **A3 — Inline title editing.** Clicking a task row's title text turns it into an inline editable field
  (contenteditable or input) saved on blur/Enter via PATCH; a **pencil icon** on the row opens the full edit
  toolbar (the detail pane). Default click on the text area = inline edit; pencil = toolbar.
- [ ] **A4 — `@`/`#`/`+` autocomplete in inline edit + quick-add.** While editing a title (and in quick-add),
  typing `@` shows a people dropdown, `#` a projects dropdown, `+` a labels dropdown (sourced from `/api/meta`
  + `/api/people`); selecting inserts the token. Keyboard-navigable (↑/↓/Enter/Esc).
- [ ] **A5 — +Add Task button below the list.** A persistent `+ Add task` control renders **below the last
  task row** (in addition to the existing bottom quick-add bar); it inline-adds a task into the current view
  (project/label preset from the active view).
- [ ] **A6 — LNO badge redesign (D2).** Row importance is a bordered-circle letter badge: **green "L"** for
  `leverage`, **blue "N"** for `neutral`, **nothing** for `overhead`. Clicking cycles importance
  (leverage→neutral→overhead→leverage); a small legend/tooltip explains the letters. The old grey flag is
  removed.
- [ ] **A7 — Bigger completion checkbox + strikethrough.** The complete checkbox is visibly larger /
  easier to hit; a completed task renders its title with strikethrough styling.
- [ ] **A8 — Nested collapsed subtasks.** Subtasks render **inline, nested under their parent**, collapsed by
  default behind an expand/collapse chevron showing a count (e.g. "▸ 2 subtasks"); they are **not** shown as
  separate top-level rows. Uses `/api/tasks?include_children=1`. Adding a subtask inline still works.
- [ ] **A9 — Parent shown in the toolbar for a subtask.** Opening a subtask's edit toolbar shows its parent
  task (name + a link/affordance to open the parent). Today the detail pane gives no parent context.
- [ ] **A10 — Check-in from the interface.** The detail/toolbar check-in action accepts an optional **note**
  (text input) before posting to `/api/tasks/:id/checkin`; the check-in log re-renders. (Today the button
  posts an empty note only.)
- [ ] **A11 — Type control.** The edit toolbar exposes `type` as a dropdown of the 6 enum values (D1),
  PATCH-saved.
- [ ] **A12 — Recurrence control.** Recurrence is editable inline / in the toolbar via a control producing a
  value in the closed `recur` grammar (`schema.md`) — a preset dropdown (none/daily/weekly/biweekly/monthly)
  plus a free field for `every N …` / `every <weekday>`; invalid input is rejected with the server's grammar
  error surfaced.
- [ ] **A13 — Edit-toolbar field upgrades.** Project = **dropdown** of available projects (from `/api/meta`,
  "Inbox" = clear); Due & Start = native **datepickers** (`<input type=date>`); People = **dropdown /
  multi-select** sourced from `/api/people` (handles), replacing the free-text comma field.
- [ ] No regression to existing flows (smart views, drag-reorder, optimistic 409 reload banner, quick-add).
- [ ] Conforms to `skill-patterns.md §A–§L`; non-interactive block stays inline byte-identical; skill-eval
  `[D]`+`[J]` pass; 4 lints + audit green.
- [ ] Load-bearing dogfood: Playwright against a real `/mytasks web` server proving each AC (create project &
  label & person from sidebar; inline edit a title; `@`/`#`/`+` dropdown; +Add task below list; L/N badge +
  cycle; bigger checkbox + strikethrough on complete; expand/collapse subtasks; open a subtask → parent shown;
  check-in with note; change type; set recurrence; project dropdown + datepickers + people dropdown). Console
  error-free.
