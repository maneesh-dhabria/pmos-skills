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
status: done
released: 0.3.0
feature_folder: docs/pmos/features/2026-07-02_interview-guide/
plan_doc: docs/pmos/features/2026-07-02_interview-guide/02_design.html
tasks: docs/pmos/features/2026-07-02_interview-guide/stories/260702-jz4/tasks.yaml
worktree:
branch: feat/260702-jz4
claimed_by: "build:b0e236c5-8aab-4a88-8bd7-4d40d8d8e0bc"
driver_holder: "build:b0e236c5-8aab-4a88-8bd7-4d40d8d8e0bc"
labels: [pmos-managerkit, interview-guide, hiring, skill]
created: 2026-07-02
updated: 2026-07-05
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

## Build outcome (Loop-2, 2026-07-05)

BUILT via `/feature-sdlc build --next --non-interactive` (route:skill). Impl on **feat/260702-jz4 `2bbb9c4d`,
UNMERGED** (for Loop-3); this write-back on main. Claim `build:b0e236c5-…` released. Dep cqf's branch
dep-merged into the worktree at claim-time (D9), so the `../_shared/interview-guidelines/` corpus was present
for AC7.

Files authored under `plugins/pmos-managerkit/skills/interview-guide/`:
- `SKILL.md` — two modes (round-requirements | best-practices, D4); three outputs (a interviewer reference,
  b scoring sheet with the full `scorecard-skeleton` anchors, c case document case-rounds-only, D9); NI block
  byte-identical to canonical; Platform Adaptation; §J phase anchors; contract flags only (§I) + nl-sugar marks.
- `scripts/validate-scorecard-anchors.mjs` — §H hard gate on output (b): asserts the anchor set + weights sum
  to 100 (arithmetic is the script's job, not the model's); `--selftest` over good+broken fixtures (PASS).
- `reference/{output-shapes.md, case-authoring.md, self-eval-rubric.md}` — anchor contracts + checklists;
  ground-a-case-in-a-business-context (never fabricate, D11); self-review axes (completeness · alignment ·
  case realism; manager is the gate, D6).

All 9 ACs met:
- **AC1** SKILL.md exists, `name: interview-guide` == dir (`a-name-matches-dir` pass), frontmatter + argument-hint
  correct, NI block byte-identical (`lint-non-interactive-inline` PASS, 57 skills), Platform Adaptation present.
- **AC2** Collect phase gathers role / competencies / archetype / seniority / (case) business-context; two modes
  documented; 3 `AskUserQuestion` — 2 `(Recommended)` + 1 `defer-only: free-form` (the case-context ask);
  `audit-recommended` PASS (0 unmarked). *Catch:* the defer-only tag must be the **literal preceding line** of
  the `AskUserQuestion:` line (`NR==pending_line+1`) — a tag before the code-fence intervening line failed; moved
  it inside the fence directly above `AskUserQuestion:`.
- **AC3** Interviewer Reference phase grounds output (a) in the corpus archetype; markers/probes/mistakes/calibration
  per `output-shapes.md`; area ids = sheet dim ids 1:1.
- **AC4** Scoring Sheet phase emits full anchor set; validator script + `--selftest` + dogfood all pass.
- **AC5** Case phase case-rounds-only ({case-study, case-presentation} or `--case`); authored from supplied
  business context; NI-with-no-context DEFERs (D11 — never fabricated).
- **AC6** Self-Review phase scores drafts vs `self-eval-rubric.md`; no enforced citation gate (D6); manager is gate.
- **AC7** All substrate reads via `../_shared/interview-guidelines/` only; **no** path into `/interview-feedback`'s
  own dir (negative grep clean). Dogfood 3: product-sense reference `data-area` ids ⇔ sheet `data-dim` ids 1:1.
- **AC8** Write phase → `./interview-guides/<role-kebab>/<round>/` default, or into a `/interview-feedback` role's
  `guidelines/<round>/` via `--role-dir` honoring its gitignore guard (INV-3).
- **AC9** `skill-eval [D] --target claude-code` exit 0; all 4 hygiene lints green; §G clean (zero release-prereq
  files — no plugin.json / CHANGELOG / README touched).

**Dogfood (live, gates-blind):** authored a real Senior-PM product-sense scoring sheet → validator PASS (5 dims,
weights=100, reco present); an interop parse (mimicking `fill-scorecard.mjs`) discovered the same anchors →
sheet is consumable by `/interview-feedback score`; reference-area ⇔ sheet-dim ids 1:1 for the product-sense
archetype. The case-study path under NI with no business context correctly DEFERs (that IS the designed outcome).

Completes epic **260702-3bb** (cqf + jz4 both built) → ready for Loop-3 `/complete-dev --plugin pmos-managerkit`
(minor bump from managerkit's current version; merges feat/260702-cqf + feat/260702-jz4).
