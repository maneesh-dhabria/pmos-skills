---
schema_version: 1
id: 260705-hbe
title: "/mytasks goal & milestone core — new goal file kind (~/.pmos/tasks/goals/), embedded dated milestones, dated/open-ended type, cadence, goal+milestone CRUD verbs, lib.js load/save, schema.md binding, tests"
type: feature
kind: story
status: done
route: skill
priority: should
labels: [pmos-toolkit, mytasks, goals, milestones, skill]
created: 2026-07-05
updated: 2026-07-06
parent: 260705-n2n
released: v2.102.0
dependencies: []
design_doc: docs/pmos/features/2026-07-05_mytasks-goals-milestones/02_design.html
plan_doc: docs/pmos/features/2026-07-05_mytasks-goals-milestones/stories/260705-hbe/03_plan.html
feature_folder: docs/pmos/features/2026-07-05_mytasks-goals-milestones/
worktree: .claude/worktrees/feat-260705-hbe
claimed_by:
driver_holder:
---

## Context

Story 1 of epic 260705-n2n. Builds the goal entity + milestones + CRUD — the durable-home half of Job A.
Grounds in `02_design.html` §2 (model), INV-1/INV-2/INV-3, decisions D2/D6. No attachment (S2), no signals (S3).

## Acceptance Criteria

- [x] **AC1 — goal file kind (§2.1, D6).** Goals persist at `~/.pmos/tasks/goals/{id}-{slug}.md` with frontmatter
  `schema_version, id (<YYMMDD>-<rand3> per tracker-crudl §2), title, type, status, cadence, target?, created,
  updated` and an embedded `milestones:` frontmatter list. `lib.js` gains a goals loader/saver mirroring the
  items loader (id/slug/archive reuse); goals are a second tracker collection.
- [x] **AC2 — milestones embedded (INV-1/INV-2).** Each milestone: `{ref, description, due (ISO), met (bool),
  met_date}`. Frontmatter list is the machine source of truth; the `## Milestones` body block is regenerated
  from it (never hand-parsed). Refs are stable, never reused after deletion.
- [x] **AC3 — closed enums (§2.2).** `type ∈ {dated, open-ended}`, `status ∈ {active, achieved, dropped}`,
  `cadence ∈ {daily, weekly, biweekly, monthly}` (reuses check-in enum). Validation rejects unknown values;
  the skill never invents enum values. `target` required-ish for `dated`, bare key for `open-ended`.
- [x] **AC4 — goal CRUD verbs.** `/mytasks goal add` (rich-capture via `_shared/interactive-prompts.md`),
  `goal show <id>`, `goals` (list), `goal edit <id>`, `goal drop <id>`, `goal achieve <id>` — with NL-first
  forms per the skill convention. `achieved`/`dropped` goals archive per tracker-crudl §6 (INV-3).
- [x] **AC5 — milestone verbs.** `/mytasks milestone add <goal>` (description + due), `milestone met <goal>
  <ref>` (sets `met: true` + `met_date`), `milestone edit/drop <goal> <ref>`. Body `## Milestones` mirror
  regenerated on each write.
- [x] **AC6 — tests.** Unit tests for goal load/save round-trip, milestone list round-trip + body-mirror
  regeneration, enum validation, id/slug minting, archive on drop/achieve. `node --test` (or repo convention);
  green. `lib.js --selftest` guarded by a main-module check (must not fire on import).
- [x] **AC7 — docs.** `schema.md` gains a Goals section (binding the tracker-crudl contract for the new
  collection); SKILL.md documents the new verbs. Conforms to `skill-patterns.md §A–§L`.
- [x] **AC8 — release-prereq scope (§G).** No version-bump/changelog/README/manifest/learnings tasks in any
  build wave — those are `/complete-dev`'s (Loop 3). List under the plan's Release prerequisites only.

## Build outcome (Loop 2 — 2026-07-05)

Built on `feat/260705-hbe` (impl commit 14e3eaf3). All 8 ACs satisfied.

- **lib.js** — goals collection added alongside `items/`: `parseGoal`/`serializeGoal` (dedicated,
  milestones-aware — the flat items parser can't represent the nested `milestones:` list), `mintId`
  (shared `<YYMMDD>-<rand3>` Crockford-base32 alphabet, mirrors serve.js `inlineMint`), `validateGoal`
  (3 closed enums + ISO/target rules + duplicate-ref check), `regenerateMilestonesBody` (regenerates the
  `## Milestones` body mirror from frontmatter, preserves `## Notes` — INV-1), `nextMilestoneRef` off a
  monotonic `milestone_seq` (refs never reused after deletion, even the highest — INV-2),
  `goalsDir`/`loadAllGoals`/`loadGoal`/`saveGoal`/`archiveGoal` (move-not-delete to `archive/YYYY-QN/` — INV-3),
  and a `require.main === module`-guarded `--selftest` (never fires on import — AC6).
- **tests/run.mjs** — `testGoals()` (round-trip byte-stability, milestone round-trip + body-mirror regen,
  enum validation, id/slug mint, ref-stability incl. dropping the highest, `milestone_seq` persistence,
  archive on drop/achieve). Full suite: **177 passed, 0 failed**.
- **schema.md** — "Goal Schema" section binding tracker-crudl for the new collection.
- **SKILL.md** — Phase 15 (goal CRUD) + Phase 16 (milestone verbs); routing table, `argument-hint`
  (typed-value contract flags `--type`/`--cadence`/`--target`/`--due`), and References updated.
- **Live dogfood** — dated goal + 2 milestones + open-ended goal; mark-met, drop-highest + re-add
  (ref `m3` not `m2`), achieve → archived to `archive/2026-Q3/`, absent from live list. All INV holds.
- **Lints** — lint-flags-vs-hints, lint-phase-refs, audit-recommended (2 calls / 1 Recommended / 1
  defer-only), lint-non-interactive-inline (59 skills): all PASS. skill-eval-check **15 pass / 3 fail**;
  the 3 (learnings-load-line, Capture-Learnings phase, Track Progress) are **pre-existing + structural** to
  a verb-dispatch skill (HEAD failed them too — no regression).

Unblocks sibling story **260705-ebm** (goal:/milestone: attachment). Impl awaits Loop-3 `/complete-dev --epic`.
