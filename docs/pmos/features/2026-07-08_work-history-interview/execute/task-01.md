---
task_number: 1
task_name: "260708-we4 — /interview-guide work-history archetype (all 7 tasks T1–T7)"
plan_path: "docs/pmos/features/2026-07-08_work-history-interview/stories/260708-we4/03_plan.html"
branch: "feat/260708-we4"
worktree_path: "/Users/maneeshdhabria/Desktop/Projects/agent-skills/.claude/worktrees/feat-260708-we4"
status: done
files_touched:
  - plugins/pmos-managerkit/skills/_shared/interview-guidelines/scorecard-skeleton.html
  - plugins/pmos-managerkit/skills/_shared/interview-guidelines/guidelines/work-history/level-ladder.md
  - plugins/pmos-managerkit/skills/_shared/interview-guidelines/guidelines/work-history/interviewer-reference.html
  - plugins/pmos-managerkit/skills/_shared/interview-guidelines/guidelines/work-history/scorecard.html
  - plugins/pmos-managerkit/skills/interview-guide/scripts/validate-scorecard-anchors.mjs
  - plugins/pmos-managerkit/skills/interview-guide/SKILL.md
  - docs/pmos/features/2026-07-08_work-history-interview/stories/260708-we4/tasks.yaml
---

# 260708-we4 execution log — /interview-guide work-history archetype

All 7 tasks implemented (route: skill). Design contract: `02_design.html` decisions D6 (candidate-blind
role blocks), D7 (static level→weight table, model never computes), D8 (--level-rubric override sum-gate),
D9 (level-verdict distinct from reco); AC1–AC10.

## Task-by-task

- **T1 (AC2) — scorecard-skeleton.html additive extension.** Extended the leading doc-comment's
  machine-anchor list with two OPTIONAL section families (`role-evidence`, `trajectory-synthesis`),
  explicitly stating they carry NO `data-dim`/`data-weight` so the weight-sum gate and the dim-based
  scorer are unaffected. Added the two template sections before the reco section, plus `.role`/
  `.trajectory`/`.field` CSS. The existing 2 example dims + reco contract are untouched. Backward-compat
  proven: all 7 bundled archetype scorecards validate byte-unchanged; the skeleton's own 2 validator
  failures are PRE-EXISTING (literal `data-dim="<id>"`/`data-weight="<n>"` in the doc comment) — proven
  identical on base HEAD, and the skeleton is a `{{…}}`-placeholder template never validated directly.

- **T2 (AC4) — level-ladder.md (the static weight table, single home).** 12 Reforge/Mehta competencies
  (4 buckets) × 6 levels (`apm`, `pm`, `senior-pm` [default], `group-pm`, `director`, `vp`). Every level
  COLUMN pre-sums to exactly 100 (execution-heavy early → strategy/influence/people-heavy late).
  Includes the `--seniority` alias map, scope anchors (feature→area→product→portfolio→org), per-level
  great/average/poor marker deltas, and the operator-override extension point consumed by T6. §H: the
  model reads a row; the arithmetic lives here + in the validator, never in the model.

- **T3 (AC1) — interviewer-reference.html.** Instantiates `reference-skeleton.html`,
  `data-archetype="work-history"`. The round is a METHOD (chronological Topgrading-style deep-dive), so
  the areas are the method phases: career-arc scan → per-role funnel (peel-the-onion) → contribution
  attribution ("we" vs "I") → results & measurement (the inflation catch) → level & trajectory
  (partial-arc catch) → management read (boss-rating 1–10) + reference verification. Plus a 7-row bias
  register (halo/confirmation/leading/recency/vagueness/individual-contribution/partial-arc) and a
  provenance block (Topgrading/Who, Lenny Rachitsky, Reforge/Mehta, Ben Kuhn, Schmidt & Hunter/Google
  re:Work). ~14KB, in line with peer references.

- **T4 (AC1,AC3,D6,D9) — work-history/scorecard.html.** Built from the extended skeleton,
  `data-archetype="work-history"`: 4 CANDIDATE-BLIND placeholder role-evidence blocks (Role 1–4, all
  slots empty) + exactly 1 trajectory-synthesis. The 12 competency `data-dim`s carry the `senior-pm`
  default weight row (sum 100). `level-verdict` is surfaced in the trajectory block as its OWN input,
  and the reco section explicitly notes it "informs but is not the same axis" (D9). Validator: ✓ valid
  (12 dimensions, weights sum to 100, reco present) + WH assertion.

- **T5 (AC5,AC8,D8) — validate-scorecard-anchors.mjs extension.** Added `validateWorkHistory()` (via
  `extractSections()`), wired into `validate()` **guarded on `data-archetype="work-history"`** — every
  other archetype skips it and validates byte-unchanged. It requires ≥1 role-evidence block (each with
  its six `role:` sub-anchors, `result-measured` field, and both flag lists) and exactly one
  trajectory-synthesis (three `trajectory:` sub-anchors + `level-verdict`). Added `checkOverride()` +
  the `--check-override '<json>'` CLI: a deterministic §H sum-gate refusing any weight set that isn't
  all non-negative integers summing to 100. Selftest extended and PASS: WH good ✓, WH broken caught 6
  (incl. all expected), override 6 cases; base product-sense good/broken fixtures unchanged.

- **T6 (AC5,AC7) — SKILL.md registration + --level-rubric.** Added `work-history` to § Archetypes
  (marked **non-case**, with the extended-scorecard + ladder-weighting notes). Expanded `--seniority`
  to cite the full `apm→vp` ladder (§K — cites `level-ladder.md`, does not restate the table). Added
  `--level-rubric <path>` to the argument-hint, the Flags list, and a new Phase Scoring Sheet subsection
  `{#work-history-weights}` documenting the interpret → `--check-override` sum-gate → refuse+re-prompt
  (interactive) / fall-back-to-ladder (non-interactive) contract (§H + D8; a non-summing override is
  never emitted). No new `AskUserQuestion` calls introduced.

- **T7 (AC9,AC10) — verify + dogfood.** Backward-compat: all 7 other archetypes validate ✓ unchanged.
  Dogfood: generated a Staff/`group-pm` work-history scoring sheet into the scratchpad (external output;
  NEVER committed, INV-3/D6) — validator ✓ (weights sum 100), level-scaling confirmed
  (execution ↓: feature-spec 9→6, delivery 10→7; leadership/strategy ↑: team-leadership 7→12,
  business-outcome 11→13), 4 blank role blocks + 1 trajectory intact.

## Verification (fresh evidence)

- `validate-scorecard-anchors.mjs --selftest` → SELFTEST PASS (good ✓, broken caught 4, WH good ✓,
  WH broken caught 6, override 6 cases ✓)
- work-history scorecard.html → ✓ valid (12 dimensions, weights sum to 100)
- All 7 other archetypes (`analytical` … `technical`) → ✓ valid, unchanged
- skeleton on base HEAD vs. worktree → identical 2 pre-existing failures (not a regression)
- `--check-override` CLI → summing set exit 0, non-summing exit 1
- Dogfood group-pm sheet (scratchpad, uncommitted) → ✓ valid, weights sum 100, scaling as expected
- `skill-eval-check.sh --target claude-code` → 21/21 pass, 0 fail, exit 0
- 4 hygiene lints → all PASS (flags-vs-hints, phase-refs, audit-recommended [3 calls: 2 Recommended +
  1 defer-only], non-interactive-inline — all 60 skills canonical)
- Non-interactive block byte-identical (sha `3c0b3254ad128087c908876fbdd956286c42ff2c`)
- [J] adversarial design-conformance review (D6/D7/D8/D9 + additive/backward-compat) dispatched

## Deviations

- **Level count.** AC4 enumerates "APM/PM/Sr/GPM/Dir/VP"; T2 detail wrote "Director/VP" as one grouping.
  Implemented as **6 distinct rows** (director and vp separate) — strictly more complete, satisfies both
  framings, each row still sums to 100.
- **Reference structure.** The interviewer reference is organized by METHOD PHASE rather than 1:1 with
  the 12 competency `data-dim`s. This is the honest shape for a work-history round (a chronological
  method that surfaces evidence for the competencies, which are scored on the paired scorecard against
  the ladder), and AC1 asks for the method skeleton, not a 12-area mirror.
