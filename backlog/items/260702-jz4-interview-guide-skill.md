---
schema_version: 1
id: 260702-jz4
kind: story
parent: 260702-3bb
title: "Build /interview-guide — author interviewer reference + scoring sheet + (case-round) candidate case document from a role + competencies, consuming the shared guidelines substrate"
type: feature
priority: should
route: skill
dependencies: [260702-cqf]
plugin: pmos-managerkit
status: planned
feature_folder: docs/pmos/features/2026-07-02_interview-guide/
plan_doc: docs/pmos/features/2026-07-02_interview-guide/02_design.html
tasks: docs/pmos/features/2026-07-02_interview-guide/stories/260702-jz4/tasks.yaml
worktree:
claimed_by:
driver_holder:
labels: [pmos-managerkit, interview-guide, hiring, skill]
created: 2026-07-02
updated: 2026-07-02
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260702-jz4 (dep 260702-cqf must be done — claim-time dep-merge, D9) -->

## Context

The new skill. Authors three artifacts per round, grounded in the shared guidelines corpus (moved by 260702-cqf,
which is dep-merged into this build before skill-eval). Sibling to `/interview-feedback`; output interoperates
with it (D8). Full decisions/invariants/output-shapes: `design_doc:` (`../../02_design.html`).

**Two input modes (D4):** round-requirements (user supplies competencies / points at a role) · best-practices
(user picks an archetype; instantiate the canonical guide tailored to role + seniority).

**Three outputs (D5):** (a) Interviewer Reference (all rounds) · (b) Scoring Sheet (all rounds, carries
`scorecard-skeleton` anchors) · (c) Case Document (case rounds only, D9 — authored from a user-supplied business
context, D7).

## Acceptance Criteria

- [ ] **AC1 (skill scaffold).** `plugins/pmos-managerkit/skills/interview-guide/SKILL.md` exists with correct
  frontmatter (`name: interview-guide`, `user-invocable: true`, description with triggers, argument-hint of
  contract flags only), the canonical inlined non-interactive block (byte-identical to
  `skills/_shared/non-interactive.md`), and a Platform Adaptation section. `name` matches the directory
  (`a-name-matches-dir`).
- [ ] **AC2 (inputs + modes).** The skill collects role, competencies, round type, and (case rounds) a business
  context; supports both round-requirements and best-practices modes (D4). Each `AskUserQuestion` has a
  `(Recommended)` option or a `defer-only` tag; the case business-context ask is `defer-only: free-form`.
- [ ] **AC3 (interviewer reference).** Emits a self-contained, print-friendly Interviewer Reference (a) grounded
  in the corpus for the chosen archetype: what the round tests, strong/average/poor markers per competency,
  probing/nudge ladder, common interviewer mistakes, calibration.
- [ ] **AC4 (scoring sheet + interop anchors).** Emits a Scoring Sheet (b) whose dimensions map to the stated
  competencies, with scales, green/red flags, and overall hire criteria — carrying the full
  `scorecard-skeleton` machine-anchor set (`data-dim`, `data-weight`, `data-scale`, `data-v`,
  `data-input="notes:<dim>"`, `data-flags`, `data-input="reco"`). A structural validator script asserts the
  anchors are present (INV-2) and passes.
- [ ] **AC5 (case document, case rounds only).** For archetype ∈ {case-study, case-presentation} (or an explicit
  case request), emits a candidate-facing Case Document (c), 1–2 pages, authored from the supplied business
  context, WITH a matching interviewer reference-solution and rubric authored together. Non-case rounds emit only
  (a)+(b) (D9). Under `--non-interactive` with no business context supplied, the case DEFERs (never fabricated,
  D11).
- [ ] **AC6 (self-review).** A self-evaluation pass scores the drafts against a bundled rubric (completeness ·
  competency-alignment · case realism) and surfaces gaps for the manager to address; no enforced citation refusal
  gate (D6).
- [ ] **AC7 (consumes shared substrate).** The skill reads templates/corpus from
  `../_shared/interview-guidelines/` (the 260702-cqf home) — no duplicated corpus, no path into
  `/interview-feedback`'s own dir.
- [ ] **AC8 (output location).** Writes to `./interview-guides/<role-kebab>/<round>/` by default, or into a
  `/interview-feedback` role's `guidelines/<round>/` when pointed at one (D10), honoring that dir's gitignore
  guard (INV-3).
- [ ] **AC9 (conformance).** Conforms to `skill-patterns.md §A–§L`; passes `skill-eval.md` (`[D]`+`[J]`); 4
  hygiene lints (`lint-non-interactive-inline`, `lint-flags-vs-hints`, `lint-phase-refs`, `audit-recommended`)
  green. No release-prerequisite tasks in waves (§G).

## Notes

- Build after 260702-cqf is `done` — claim-time dep-merge (D9) brings the `_shared/interview-guidelines/` corpus
  into this worktree before skill-eval, so AC7's cite resolves.
- Reference files to author under `interview-guide/reference/`: authoring templates for (a)/(b)/(c) (or reuse the
  moved skeletons directly), a `self-eval-rubric.md`, and a `case-authoring.md` guide (how to ground a case in a
  business context — model on the porter bidding case).
- Scripts under `interview-guide/scripts/`: a scorecard-anchor structural validator (AC4/INV-2) with a
  `--selftest`; optionally a self-eval helper.
- Model the three output aesthetics on the porter gold-standard
  (`interviewing-pms/.../guidelines/case-study/`) and the moved corpus HTML.
