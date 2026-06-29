---
schema_version: 1
id: 260629-28w
kind: story
parent: 260629-pd2
title: "/mytasks web UX fixes — toasts+undo, @ people picker, friendly dates, count badges + overdue-on-Today, empty states, chips, contrast pass"
type: enhancement
priority: should
route: skill
dependencies: []
plugin: pmos-toolkit
status: in-progress
feature_folder: docs/pmos/features/2026-06-29_mytasks-web-ux-fixes/
plan_doc: docs/pmos/features/2026-06-29_mytasks-web-ux-fixes/stories/260629-28w/03_plan.html
tasks: docs/pmos/features/2026-06-29_mytasks-web-ux-fixes/stories/260629-28w/tasks.yaml
worktree: feat/260629-28w
claimed_by: build:b0c61220-0a97-4ab0-afcb-144a7c4df518
driver_holder: build:b0c61220-0a97-4ab0-afcb-144a7c4df518
build_branch:
build_commit:
labels: [pmos-toolkit, mytasks, web, ux, skill, from-feedback]
created: 2026-06-29
updated: 2026-06-29
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260629-28w -->

## Context

The whole epic (260629-pd2) is one story: all 14 FRs revise the single skill's web SPA
`plugins/pmos-toolkit/skills/mytasks/scripts/webapp/` (`app.js`, `app.css`, `index.html`) plus the FR-2 client→
`POST /api/people` wiring in `serve.js`/`people.js`. Decisions (D1–D7), FRs (FR-1..FR-14), invariants
(INV-1..INV-5), and the three cross-cutting conventions (CC1 toast/undo, CC2 one-representation, CC3 colour
tokens) live in the `design_doc:` (`../../02_design.html`). One `/execute` run, 13 tasks in 4 waves
(study → foundations → features → conformance) — see `tasks.yaml`.

## Acceptance Criteria

- [ ] **AC1 (FR-1)** Quick-add renders live token chips for parsed `@person #project +label` + due date while
  typing; `@`/`#`/`+` open filtered autocomplete dropdowns; on submit a toast names the destination view + parsed
  fields with a friendly date. Parse behaviour does not regress.
- [ ] **AC2 (FR-2)** Typing `@` (quick-add or editor) opens a live-filtered dropdown of existing people with an
  explicit **+ Add "&lt;handle&gt;"** button; selecting assigns, Add mints a person via the existing
  `POST /api/people` and it appears in the editor People field AND the PEOPLE sidebar without reload; a typo'd
  handle creates nothing unless Add is clicked. No new server capability, no schema change.
- [ ] **AC3 (FR-3)** A single friendly date format renders everywhere (lists, rows, editor display, toasts):
  relative for near (Today/Tomorrow/Yesterday/weekday), absolute beyond (`Fri Jul 3`; year only off-current-year).
  No DD/MM or raw ISO is shown to the user; a date-formatter unit assertion passes.
- [ ] **AC4 (FR-4/FR-5)** Every smart view shows an accurate trailing count badge; the Today view surfaces
  overdue items so a cold open never reads "Nothing here." while work is due; empty views show explanatory text +
  a working CTA.
- [ ] **AC5 (FR-6/FR-12)** The detail panel is collapsed until a task is selected and the list reclaims the freed
  width; a row click outside the title opens the detail panel while rename has its own distinct control (no
  conflicting open affordances).
- [ ] **AC6 (FR-7/FR-10)** Task rows show inline chips for project/label/assignee when set; the Labels editor is
  a tokenized chip input with autocomplete — one chip representation across row, sidebar, and editor (CC2).
- [ ] **AC7 (FR-8/FR-9/FR-13/FR-14)** All 5 flagged contrast misses compute ≥4.5:1; red is reserved for overdue
  only (upcoming neutral/amber + icon); the recurrence row is full-width and shown only when Recur ≠ none (no
  clipping); row glyph controls have ≥24×24 px hit areas + a hover state.
- [ ] **AC8 (FR-11)** Completing a task shows a toast with toast-window Undo (reverts while visible); the detail
  panel updates/clears instead of showing a stale "pending" task with live controls.
- [ ] **AC9 (conformance/no-regression)** CLI flow unchanged (INV-1); no schema/data-format change (INV-2); zero
  new deps (INV-3); existing `scripts/tests` suites + new assertions green (INV-4); conforms to
  `skill-patterns.md §A–§L`, passes `skill-eval.md` (`[D]`+`[J]`), inline non-interactive block byte-identical,
  4 hygiene lints + audit-recommended green (INV-5). No release-prerequisite tasks in waves (§G).

## Notes

- Build sequence: Wave 1 study (T1) → Wave 2 foundations (T2 contrast tokens, T3 date formatter, T4 toast+undo
  helper, T5 chip renderer + autocomplete primitive) → Wave 3 features (T6 quick-add, T7 people picker, T8
  badges/overdue, T9 empty states + panel layout, T10 row chips, T11 recurrence/labels/open-affordance, T12
  completion) → Wave 4 conformance (T13). Foundations-before-features keeps shared helpers stable; `inline`
  execution ⇒ sequential, no parallel-edit conflict on `app.js`.
- FR-2 reuses the existing `POST /api/people` endpoint (story 71x) — wiring only.
- Web-UI-only: never touch the terminal CLI flow, inference heuristics, or the on-disk schema.
