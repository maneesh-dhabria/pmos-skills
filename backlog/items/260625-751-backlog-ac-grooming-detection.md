---
schema_version: 1
id: 260625-751
kind: story
parent: 260625-sm0
title: "/backlog grooming AC detection — accept checkbox/dash/numbered criteria; reconcile schema.md; regression-test the format matrix"
type: bug
priority: should
route: skill
dependencies: []
plugin: pmos-toolkit
status: done
feature_folder: docs/pmos/features/2026-06-25_backlog-ac-grooming-format/
plan_doc: docs/pmos/features/2026-06-25_backlog-ac-grooming-format/stories/260625-751/03_plan.md
tasks: docs/pmos/features/2026-06-25_backlog-ac-grooming-format/stories/260625-751/tasks.yaml
worktree: .claude/worktrees/feat-260625-751
labels: [pmos-toolkit, backlog, grooming, viewer, derivation]
created: 2026-06-25
updated: 2026-06-25
---

## Context

`hasAcceptanceCriteria(body)` in `plugins/pmos-toolkit/skills/backlog/scripts/serve-web-lib.mjs` requires a
checkbox marker (`/-\s*\[[ xX]\]/`) for an AC section to count, so numbered/dash-bullet ACs read as
ungroomed and false-flag `planned` stories in `/backlog` + `/backlog groom`. Fix the detector to be
format-robust; reconcile `schema.md`; regression-test. Root cause + decisions: `../../02_design.md`.

## Acceptance criteria

- [x] **AC1 (D1) — format-robust detection.** `hasAcceptanceCriteria(body)` returns `true` for an
  `## Acceptance Criteria` section (case-insensitive heading, existing `im` flag preserved) that contains
  ≥1 enumerated criterion in **any** form — checkbox (`- [ ]` / `- [x]`), plain bullet (`-` / `*`), or
  numbered (`1.` / `2.`) — and `false` for an absent or content-empty section (heading only, or prose with
  no list items). Checkbox support is retained.
- [x] **AC2 (D1) — groom queue correct.** `buildModel().queues.groom.needs_grooming` no longer includes a
  `planned`/`ready` story that has a non-empty enumerated AC section, regardless of marker style; a `draft`
  story or a story with a content-empty AC section still appears.
- [x] **AC3 (D3) — doc/code reconciled.** `schema.md` notes that grooming AC detection accepts checkbox,
  dash, or numbered criteria (checkbox remains the recommended canonical form); no contradiction between
  the documented form and the detector.
- [x] **AC4 (D4) — regression test the format matrix (failing-first).** `tests/serve-web.test.mjs` gains
  cases: a numbered-AC story and a dash-bullet-AC story both yield `has_ac=true` and are excluded from
  `needs_grooming`; a heading-only AC section yields `has_ac=false`. Existing tests stay green.
- [x] **AC5 (D5) — single home, no viewer/server change.** The change is confined to `serve-web-lib.mjs` +
  `tests/serve-web.test.mjs`; `viewer.html` and `serve-web.mjs` are untouched. Pure zero-dep; no new deps.
- [x] **AC6 — live dogfood.** Rebuilding the model from the real `backlog/items/` shows the numbered/dash-AC
  stories excluded from `needs_grooming` while a genuinely AC-less story still flags.
- [x] **AC7 — conformance.** Conforms to `feature-sdlc/reference/skill-patterns.md §A–§L` + host `CLAUDE.md`
  (canonical skill path; **no** version-bump / changelog / README / manifest-sync tasks in the plan —
  `/complete-dev` owns those at epic release). `/backlog` `skill-eval` `[D]` passes; 4 hygiene lints + audit
  clean.

## Notes

**Built 2026-06-25 (Loop-2).** Branch `feat/260625-751` (worktree KEPT for Loop-3). Commits:
`3c6e1e61` (T1 failing-first matrix), `571b71ad` (T2 fix), `dfdc647d` (T3 schema doc), `a5a33622`
(T4 dogfood).

- **Root cause / fix (T2):** `hasAcceptanceCriteria` in `serve-web-lib.mjs` replaced the checkbox-only
  test `/-\s*\[[ xX]\]/` with `!!ac && /^\s*(?:[-*]\s+|\d+[.)]\s+)/m` — a non-empty `## Acceptance
  Criteria` section with ≥1 enumerated criterion in **any** form (checkbox, plain/bold dash or star
  bullet, or numbered `1.` / `2)`) now counts as groomed. Heading-only / prose-only sections still read
  ungroomed. No signature change; `sectionBody` case-insensitive `im` flag preserved.
- **Single home (AC5):** change confined to `serve-web-lib.mjs` (6 lines) + `schema.md` (2 lines) +
  `tests/serve-web.test.mjs` (39 lines). `viewer.html` and `serve-web.mjs` untouched; pure zero-dep.
- **Doc reconcile (T3):** `schema.md` (beside the `## Acceptance Criteria` example) now states detection
  accepts checkbox/dash/numbered; checkbox stays the recommended canonical form.
- **Gates:** `serve-web.test.mjs` **51/51** (8 new, committed red first — numbered/dash were FAIL before
  the fix); live dogfood **6/6** (`stories/260625-751/dogfood/`) sources the REAL numbered-AC
  (`260617-1aq`) and dash-AC (`0001`) bodies from the repo backlog and proves OLD detector flags
  `[DASH, DRAFT, EMPTY, NUM]` vs NEW `[DRAFT, EMPTY]` — **29 of 84** real AC sections (35%) use
  non-checkbox markers, so the false positive was common. `skill-eval` `[D]` EXIT 1 = **2 pre-existing
  accepted residuals** (`d-learnings-load-line`, `d-capture-learnings-phase`) — SKILL.md untouched, zero
  new residuals. 4 lints (flags-vs-hints, phase-refs, non-interactive-inline) + audit-recommended all
  PASS.

**Next:** `/complete-dev --epic 260625-sm0` (Loop-3) — single-story epic now 1/1.
