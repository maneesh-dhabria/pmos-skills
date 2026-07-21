---
schema_version: 1
id: 260721-jb6
kind: story
parent: 260721-k1x
title: "/interview-feedback scoring calibration — sweep-then-score method, four blocking gates via check-scoring-calibration.mjs, untested-dim arithmetic, rubric materialization for descriptor-less sheets"
type: enhancement
priority: must
route: skill
dependencies: [260721-sak]
plugin: pmos-managerkit
status: done
feature_folder: docs/pmos/features/2026-07-21_interview-scoring-calibration/
plan_doc: docs/pmos/features/2026-07-21_interview-scoring-calibration/stories/260721-jb6/03_plan.html
tasks: docs/pmos/features/2026-07-21_interview-scoring-calibration/stories/260721-jb6/tasks.yaml
worktree: .claude/worktrees/feat-260721-jb6
build_branch: feat/260721-jb6
build_commit: d47b5a80
labels: [pmos-managerkit, interview-feedback, scoring, calibration, gates, skill, from-feedback]
created: 2026-07-21
updated: 2026-07-21
---

<!-- status: built at Loop 2 on 2026-07-21; branch feat/260721-jb6 @ d47b5a80, UNMERGED/UNPUSHED. /verify verdict PASS — report at docs/pmos/features/2026-07-21_interview-scoring-calibration/stories/260721-jb6/verify/2026-07-21-review.html. Releases with epic 260721-k1x once 1a4 + z5n are done. -->

## Context

The calibration core of epic `260721-k1x`. Phase Score's entire scoring method today is one sentence — *"Score
each dimension on its own scale with grounded notes + flags, then set the overall `reco`."* That sentence permits
both defects the retro found: scoring linearly while reading (time-bias) and scoring against a stricter bar than
the sheet's own (bar-inflation). This story replaces the method and puts a second blocking gate behind it.

Depends on `260721-sak` for the `data-level` anchor contract. **Not** dependent on `260721-1a4` — FR-4 is
presence-guarded and correct against an un-backfilled sheet, so the two build in parallel.

### ⚠ Plan-critical: the weighted-score routine does not exist

`fill-scorecard.mjs` parses `data-weight` into `{id, weight, scale, …}` and **never computes anything with it**.
There is no weighted- or modal-score routine anywhere in the skill — the retro's "2.10 -> 3.00" was arithmetic the
model performed in its head, which §H forbids outright. FR-6's script is therefore a **new capability closing an
existing bug**, not a re-homing of an existing calculation. Plan and estimate it as such.

### The §H shape of each gate

Every hard condition must be presence, ordering, or an integer comparison the *script* performs. Where genuine
judgement is required, the model records a **machine-comparable value**, never a self-graded verdict — a
"stamp `consistent` per dimension" token is satisfiable without reading a word (D10). Both disagreement gates use
the same escape shape: mismatch -> a required non-empty rationale, never a hard fail, so there is no incentive to
rewrite the note to match the number.

Decisions D2, D3, D7, D8, D9, D10, D11 and FR-4..FR-8 live in the `design_doc:` (`../../02_design.html`).

## Surfaces

- `plugins/pmos-managerkit/skills/interview-feedback/SKILL.md` — Phase Score (`#score`), Phase Coach (`#coach`)
- `plugins/pmos-managerkit/skills/interview-feedback/scripts/check-scoring-calibration.mjs` — **new**
- `plugins/pmos-managerkit/skills/interview-feedback/scripts/fill-scorecard.mjs` — emit the new anchors
- `plugins/pmos-managerkit/skills/interview-feedback/reference/` — scorecard shape docs

## Acceptance Criteria

- [ ] **AC1 (FR-4)** Phase Score reads the dimension's `data-level` descriptors from the resolved sheet; where
  present they are the bar the scoring method quotes. Sheets without them route to AC5, never to uncalibrated
  scoring (INV-1).
- [ ] **AC2 (FR-5)** Phase Score's method is rewritten to: **(a)** sweep the whole transcript per dimension and
  collect every instance — early/late, prompted/unprompted, timestamped — *before* assigning any number;
  **(b)** quote the dimension's own at-bar `data-level` text and score against that wording, with
  "unprompted/up-front" language reserved for the ceiling; **(c)** floor/ceiling split — "demonstrated at all?"
  sets the floor, "how much nudging?" caps the ceiling (heavy -> 2, one pointed nudge -> 3, none -> 4), so
  prompting never zeroes out a genuine demonstration; **(d)** a never-probed competency is tagged **untested**,
  not scored below bar.
- [ ] **AC3 (FR-6)** New `scripts/check-scoring-calibration.mjs` runs as a **second blocking STOP-before-done gate**
  in Phase Score, alongside (not replacing) the citation gate, enforcing all four:
  - **sweep** — every scored `data-dim` has a `data-card="evidence-sweep"` block with ≥1 timestamped instance,
    present *before* a `data-selected` value exists (presence + ordering);
  - **adversarial** — every below-bar `data-selected` carries a non-empty `data-rebuttal` (conditional presence);
  - **note-vs-score** — the script compares `data-note-matches-level="<n>"` to `data-selected` as integers;
    mismatch requires a non-empty `data-score-rationale`;
  - **reco-vs-modal** — the script computes modal + weighted score and, on band disagreement with `reco`,
    requires a non-empty `data-reco-rationale`.
  Non-zero exit: the scorecard is not presented and the run does not declare done.
- [ ] **AC4 (FR-6/D7)** Untested dimensions are **excluded from the weighted-score denominator** and remaining
  weights renormalize; untested-weight-% is reported; crossing the **30% threshold** (one named constant in the
  script) forces either an *insufficient evidence* reco or a non-empty `data-reco-rationale`. All of it computed
  by the script — the model performs no arithmetic (INV-2).
- [ ] **AC5 (FR-7)** A resolved sheet with no `data-level` descriptors triggers rubric materialization: derive
  descriptors per dimension from the guide's own strong/weak markers, `.calib` line, archetype corpus and
  seniority; **write them into the sheet as real `data-level` anchors**; present for agreement; only then score.
  Blocking — no dimension is scored against an unagreed bar. Under `--non-interactive` the agreement gate
  AUTO-PICKs the synthesized rubric (maintainer override). `data-rubric-provenance` is stamped in every case:
  `authored` | `synthesized-agreed` | `synthesized-auto`.
- [ ] **AC6 (FR-6/D9)** `fill-scorecard.mjs` emits the new anchors — one collapsed
  `<details data-card="evidence-sweep">` per dimension under its notes, plus `data-rebuttal`,
  `data-note-matches-level`, `data-score-rationale`, `data-reco-rationale`. The artifact stays self-contained and
  the panel's default reading experience (scores + notes) is unchanged.
- [ ] **AC7 (FR-8/D11)** Phase Coach applies sweep-then-conclude ordering and the adversarial below-bar pass to
  `interviewer-notes.html` **as method**; no gate is run against (b) and no new anchors are added to it (it has no
  scoring surface).
- [ ] **AC8** `check-scoring-calibration.mjs --selftest` covers each gate's pass and fail path, plus untested
  renormalization and the 30% threshold boundary. The citation gate's semantics and existing tests are untouched
  (INV-3). No new user-facing flag; `argument-hint` unchanged; frozen non-interactive block byte-identical
  (INV-7). `skill-eval` passes; all four repo hygiene lints green.
