---
schema_version: 1
id: 260702-6ks
title: "/one-on-one skill — per-report rolling records, add/note/plan/log/career verbs, bundled coaching corpus"
type: feature
kind: story
status: done
released: 0.4.0
route: skill
priority: should
labels: [pmos-managerkit, one-on-one, skill]
created: 2026-07-02
updated: 2026-07-05
parent: 260702-z77
dependencies: []
claimed_by: "build:b0e236c5-8aab-4a88-8bd7-4d40d8d8e0bc"
driver_holder: "build:b0e236c5-8aab-4a88-8bd7-4d40d8d8e0bc"
design_doc: docs/pmos/features/2026-07-02_one-on-ones/02_design.html
plan_doc: docs/pmos/features/2026-07-02_one-on-ones/stories/260702-6ks/03_plan.html
feature_folder: docs/pmos/features/2026-07-02_one-on-ones/
worktree:
branch: feat/260702-6ks
---

## Context

The whole `/one-on-one` skill for pmos-managerkit, built as one vertical slice (one `SKILL.md`, one PR). Singleton
epic (D18). Grounded in the epic `design_doc:` (`02_design.html`) — read it for the data model, verb contracts,
coaching corpus, and decisions. Independent of `/interview-feedback` (INV-2); identity via `/people` (INV-1); no
`/mytasks` (INV-3); records under `~/.pmos/one-on-ones/` (INV-4).

## Acceptance Criteria

- [x] **AC1 — data model & store.** A record parser/serializer reads/writes `~/.pmos/one-on-ones/<report>.md`
  (frontmatter + the three body zones: persistent header, running-agenda inbox, reverse-chron session log) per
  `02_design.html#data-model`. Round-trips byte-stably; creates `~/.pmos/one-on-ones/` on first write; never writes
  inside the repo (INV-4). Unit-tested.
- [x] **AC2 — `add`.** `/one-on-one add <name>` resolves/creates a `/people` identity (offers create when absent,
  DEFERs under `--non-interactive` — never fabricates) and scaffolds the record with cadence, role, goals, and
  operating-manual fields.
- [x] **AC3 — `note` (quick-capture).** `/one-on-one note <report> "<item>"` appends one item to the inbox in a
  single command; unattended-safe. Optional intent tag (blocker/growth/morale/feedback-up).
- [x] **AC4 — `plan`.** `/one-on-one plan <report>` emits a human-first prep agenda assembled from the header
  (goals, standing themes, performance + coaching feedback), open action items, and inbox items — plus
  actively-coached suggestions from the corpus (intent-tagged questions, human-first opener, and flags for
  status-heavy recent sessions + stale action items). Emits a commentable HTML prep artifact via the html-authoring
  substrate (per `02_design.html#prep-output`).
- [x] **AC5 — `log`.** `/one-on-one log <report>` appends a dated session entry (topics, decisions, action items
  with owner+status, questions) newest-first and clears discussed inbox items; under `--non-interactive` a missing
  session body DEFERs.
- [x] **AC6 — context management.** Verbs/flags to set-or-update goals, standing themes, **performance feedback**,
  and **coaching feedback** in the persistent header (manager-entered only).
- [x] **AC7 — `career`.** `/one-on-one career <report>` runs Laraway's 3-part career conversation
  (Life Story → Dreams → Career Action Plan) as a session distinct from weekly prep; writes a career-plan block to
  the header.
- [x] **AC8 — coaching corpus.** A bundled `reference/` corpus carries the intent-tagged question bank + named
  models + the 12 durable principles, honoring the 4 attribution caveats from `02_design.html#coaching-corpus`
  (10/90 = Horowitz not Grove; Laraway = "vision + short-term plan"; Hogan "Bias Toward" flagged unverified;
  Manager Tools 10/10/10 documented-canon).
- [x] **AC9 — independence & anchors.** No import of / `_shared` cite to / scorecard read from `/interview-feedback`
  (INV-2, grep-clean). Identity via `/people`; no `/mytasks` (INV-3).
- [x] **AC10 — conformance.** `skill-patterns.md §A–§L`; the inline non-interactive block; every `AskUserQuestion`
  carries a `(Recommended)` or a `defer-only` tag; passes `skill-eval` (`[D]`+`[J]`); 4 hygiene lints +
  `audit-recommended` green.

## Notes

Sizing: one `/execute` run. ~5 zero-dep Node scripts (record parse/serialize, add, note, plan-assemble,
log) + `SKILL.md` + `reference/` corpus + tests. Reuse the ~/.pmos personal-store + zero-dep-Node + html-authoring
patterns already established by `/people`, `/mytasks`, and `/interview-feedback` (patterns only — no code coupling).

---

Built 2026-07-05 via `/feature-sdlc build` (route:skill) on branch `feat/260702-6ks` (commit `dc1f27f4`,
UNMERGED — awaits Loop-3 `/complete-dev --plugin pmos-managerkit`). New skill at
`plugins/pmos-managerkit/skills/one-on-one/`: `SKILL.md`, 9 zero-dep Node CLIs under `scripts/`
(`record-lib`, `coach-lib`, `cli-lib`, `add`, `note`, `set`, `log`, `career`, `plan`, `overview`),
`reference/coaching-corpus.md` + `reference/prep-skeleton.html`, `tests/run-tests.sh`.

All 10 ACs met:
- **AC1** — `record-lib.mjs` parses/serializes `~/.pmos/one-on-ones/<handle>.md` (frontmatter + fixed
  sections: Goals, Standing themes, Operating manual, Performance/Coaching feedback, Open action items,
  Inbox, reverse-chron Sessions). Canonical form round-trips byte-stably (proven in `--selftest` + on the
  live record). Store resolves `$PMOS_ONEONONES_DIR` else `~/.pmos/one-on-ones`, created on first write;
  **refuses to write inside the repo working tree** (INV-4 guard; test asserts refusal).
- **AC2** — `add` scaffolds cadence/role/goals/operating-manual; `/people` identity + the create prompt
  live in SKILL.md Phase Add, tagged `<!-- defer-only: free-form -->` so it **DEFERs under
  `--non-interactive`** (never fabricates a person).
- **AC3** — `note` appends one `[tag] item` inbox line in a single unattended-safe command (no prompts);
  optional `--tag blocker|growth|morale|feedback-up`.
- **AC4** — `plan` assembles the human-first §5 agenda (Human first → open loops → their agenda → growth &
  feedback → coached suggestions), pulls opener + intent questions from the corpus, and raises the three
  **deterministic** flags (status-creep / stale-action / career-due, computed in `record-lib`, §H — never
  model arithmetic). Emits a self-contained, commentable HTML prep artifact (`pmos:skill` meta, Editorial
  Technical theme, offline) under `<store>/prep/`. Live dogfood: all three flags fired, ordering + token
  substitution verified.
- **AC5** — `log` prepends a dated session (topics/decisions/owner-tagged actions/questions) newest-first,
  mirrors still-open actions into the header with `since <date>` for stale tracking, and clears discussed
  inbox items; an empty session body is refused (the NI DEFER is SKILL.md's job — no fabrication).
- **AC6** — `set` maintains goals/themes/operating-manual/performance/coaching header fields
  (manager-entered; feedback fields dated + accreting).
- **AC7** — `career` records the Laraway 3-part conversation, writes a career-plan block to the header, and
  stamps `career_last_reviewed` (clearing the career-due flag; verified in the lifecycle test).
- **AC8** — `reference/coaching-corpus.md` is the single home for the 12 durable principles, named models,
  and the intent-tagged question bank (parsed by `coach-lib`). All 4 attribution caveats honored (10/90 =
  Horowitz not Grove; Laraway = vision + short-term plan, not "15-month"; Hogan "Bias Toward" flagged
  *unverified — likely Resilient Management*; Manager Tools 10/10/10 + Rands as documented-canon/paraphrase).
- **AC9** — independence grep in `run-tests.sh` is clean: no import/cite/scorecard-read from
  `/interview-feedback` (INV-2) and no `/mytasks` (INV-3); identity is the only (read-only) `/people` coupling.
- **AC10** — `skill-eval [D]` all pass (`--target claude-code`, exit 0); `[J]` self-assessed clean
  (triggering description, progressive disclosure, §H/§I/§J/§L all honored); non-interactive block
  byte-identical to canonical (lint: 57 skills match); the one `AskUserQuestion` carries a `defer-only` tag;
  `lint-flags-vs-hints` / `lint-phase-refs` / `audit-recommended` / `lint-non-interactive-inline` all green.

Diff touches **zero** release-prereq files (no `plugin.json` / `marketplace.json` / CHANGELOG / README /
learnings) — those are `/complete-dev`'s job (Loop 3). Epic 260702-z77 is a singleton, so it is now fully
built and ready for Loop-3 `/complete-dev --plugin pmos-managerkit` (managerkit minor bump from 0.2.0).

Build catches (live-dogfood, blind to `[D]`/selftest): (1) `record-lib`/`coach-lib`'s `--selftest` guard
fired on *import* when a consumer script was run with `--selftest` (they saw `argv[2]`); fixed with a
main-module check. (2) `--date` was ignored by set/log/career (they read `--today`); every entry stamped
today until fixed. (3) the prep-skeleton authoring doc-comment literally contains `{{tokens}}`, leaking a
token until the comment was stripped before substitution (the render.js token gotcha). (4) the independence
grep matched its own pattern + SKILL.md's independence prose — scoped out the self-referential test file,
whitelisted the documentation.
