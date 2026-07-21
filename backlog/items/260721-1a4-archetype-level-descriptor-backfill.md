---
schema_version: 1
id: 260721-1a4
kind: story
parent: 260721-k1x
title: "Backfill data-level descriptors across the 8 bundled archetype scorecards (47 dimensions) so the calibration fix fires on default paths"
type: enhancement
priority: must
route: skill
dependencies: [260721-sak]
plugin: pmos-managerkit
status: in-progress
feature_folder: docs/pmos/features/2026-07-21_interview-scoring-calibration/
plan_doc: docs/pmos/features/2026-07-21_interview-scoring-calibration/stories/260721-1a4/03_plan.html
tasks: docs/pmos/features/2026-07-21_interview-scoring-calibration/stories/260721-1a4/tasks.yaml
worktree: .claude/worktrees/feat-260721-1a4
claimed_by: build:d5978308-5866-4ca8-bdc7-8e51f6619786
driver_holder: build:d5978308-5866-4ca8-bdc7-8e51f6619786
build_branch:
build_commit:
labels: [pmos-managerkit, interview-guidelines, scoring, calibration, corpus, backfill, skill, from-feedback]
created: 2026-07-21
updated: 2026-07-21
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260721-1a4 -->

## Context

Measured across the bundled corpus: **8 archetypes · 47 dimensions · 0 level descriptors.**

```
analytical 5 · behavioral 5 · case-presentation 5 · case-study 5
product-sense 5 · recruiter-screen 5 · technical 5 · work-history 12
```

`260721-sak` gives sheets a place to carry the bar and `260721-jb6` teaches `/interview-feedback` to quote it —
but consumption is presence-guarded, so on a default run against a bundled archetype there would be **nothing to
quote**. Without this story the epic's headline fix is dormant on 100% of default paths (D6).

Split out of `sak` deliberately: 188 descriptors is authored judgement content, not contract work, and fusing it
in would make one `skill-eval` span "author the anchor contract" *and* "make 188 separate calibration
judgements". Separate story, separate reviewable diff.

### ⚠ Scope-critical open question — settle in `/plan` before authoring a single descriptor

`level-ladder.md` already varies competency **weights** across `apm · pm · senior-pm · group-pm · director · vp`.
"Solid, some prompting OK" plainly means something different for an APM than for a Director. **If descriptors must
vary by seniority, this story goes from 188 to ~1,128 descriptors** and needs re-scoping — or a parameterized
descriptor with a seniority-sensitive clause (one descriptor set, a calibrating rider). The `/plan` phase must
resolve this with the maintainer and record the choice before authoring starts. AC1's count is stated against the
188 baseline and must be restated if the answer changes.

## Surfaces

- `plugins/pmos-managerkit/skills/_shared/interview-guidelines/guidelines/*/scorecard.html` — 8 files
- possibly `plugins/pmos-managerkit/skills/_shared/interview-guidelines/level-ladder.md` — read-only reference for
  the seniority question; not modified by this story

## Acceptance Criteria

- [ ] **AC1 (FR-3)** Every one of the 47 dimensions across all 8 bundled `guidelines/<archetype>/scorecard.html`
  files carries a non-empty `data-level` descriptor on **every** `data-v` option of its scale (188 descriptors at
  the flat baseline; restate if the seniority question in `/plan` changes the shape).
- [ ] **AC2 (FR-3)** Every one of the 8 files exits 0 under `validate-scorecard-anchors.mjs` (the FR-2 rule from
  `260721-sak`), including the all-or-none and non-empty-descriptor checks.
- [ ] **AC3** Level-3 descriptors are written at the **pass line**, not the ceiling: "unprompted", "up front",
  "led with it", "without being asked" and equivalents appear only at the top level of each scale. A grep for
  those phrases across the 8 files returns hits only in the highest `data-v` of each dimension.
- [ ] **AC4** Descriptors are derived from each archetype's existing strong/weak markers and probe intent — not
  invented fresh. Each is behavioural and observable in a transcript (what the candidate *did*), not a trait
  judgement.
- [ ] **AC5** Purely additive: no dimension is added, removed, renamed or reweighted; `data-weight`,
  `data-budget`, `data-scale`, `data-v` values and dimension ids are byte-identical before and after. `git diff`
  shows `data-level` attribute insertions only.
- [ ] **AC6** `work-history`'s 12 dimensions (including its `role-evidence` / `trajectory-synthesis` families) are
  covered on the same terms as the other seven; no archetype is partially done.
- [ ] **AC7** The seniority-variance decision is recorded in the story's `03_plan.html` with its rationale, and the
  authored descriptors are consistent with it. All four repo hygiene lints green.
  **RESOLVED 2026-07-21 — shape B (flat + rider)**, see `03_plan.html#t0-decision`. The recording half of AC7 is
  already satisfied; what remains is consistency: descriptors written for each archetype's default level, plus the
  one seniority clause added to `_shared/interview-guidelines/scorecard-skeleton.html`'s `data-level` contract.

## Notes

### 2026-07-21 — build attempt: BLOCKED at T0 (maintainer decision required)

Unattended `build --next` picked this story (D22: in-flight epic `260721-k1x`, `must` > `z5n`'s `should`),
claimed it, and stopped at **T0** without authoring a descriptor. T0 is the plan's own gate — *"a maintainer
decision, not an authoring task, and it gates everything after it"* — and under `--non-interactive` a scope
decision the define loop explicitly reserved for a human is **deferred, never auto-picked**. Choosing it
autonomously could 2–6x the story's size and silently redefine AC1.

**No files were modified. No worktree was created.** The claim has been released.

#### What the build DID do: ground T0 in measurement

The plan's `~1,128` figure assumes the seniority axis applies to all 8 archetypes. **It does not.** Measured
across the bundled corpus:

| Archetype | dims | `data-v` options | `data-level` today | own seniority ladder? |
|---|---:|---:|---:|---|
| analytical, behavioral, case-presentation, case-study, product-sense, technical | 5 each | 20 each | 0 | **no** |
| recruiter-screen | 5 | 20 | 0 | **no** — its `seniority-signal` is a *dimension name*, not a level axis |
| work-history | 12 | 48 | 0 | **yes** — `level-ladder.md`, 6 levels |
| **total** | **47** | **188** | **0** | 1 of 8 |

So the real cost of each shape is:

| Shape | Descriptors | Note |
|---|---:|---|
| **A — Flat** | **188** | one set per dimension; seniority expressed via weights + archetype choice |
| **B — Flat + rider** | **188** + 1 clause | one descriptor set; a seniority-sensitive clause in the skeleton contract states how the bar shifts |
| **C — Per-seniority where a ladder exists** | **428** | work-history 48×6 = 288, flat 140 elsewhere |
| **C′ — Per-seniority everywhere** (the plan's `~1,128`) | 1,128 | **requires inventing a seniority axis for 6 archetypes that have none** — not a backfill, a new design |

The plan's headline scare number is therefore the cost of an option nobody should pick. The genuine choice is
A / B / C.

#### Recommendation (NOT applied — yours to make)

**B, with the rider scoped to work-history.** `level-ladder.md` already varies *weights* by level, so the bar
already shifts with seniority through the weighting; a single seniority clause names that explicitly instead of
duplicating 240 near-identical work-history descriptors. Keeps AC1 at 188, keeps one fact in one home
(`skill-patterns.md §K`), and leaves C available later as its own story if calibration data shows the flat
descriptors mis-fire at the APM and Director ends.

#### Also found — fix when this story is unblocked

- The story's **Surfaces** section points at `_shared/interview-guidelines/level-ladder.md`. The file is actually
  at `_shared/interview-guidelines/guidelines/work-history/level-ladder.md` (it is work-history-scoped, which is
  itself the evidence for the table above).
- AC1's "188" is correct as the flat baseline — confirmed by direct count, not inferred.
- AC2's validator (`interview-guide/scripts/validate-scorecard-anchors.mjs`, from `260721-sak`) is present and
  shipped, so the rest of the story is unblocked the moment T0 lands.

### 2026-07-21 — T0 RESOLVED, story unblocked

Maintainer decision, taken in an interactive checkpoint: **shape B — flat + seniority rider.** 188 descriptors
(AC1 unchanged), plus one seniority clause in `scorecard-skeleton.html`'s `data-level` contract stating that a
descriptor is the bar for the archetype's default level and that a `level-ladder.md` weight row shifts that bar
rather than the prose. Full rationale, the corpus measurement, and what it binds for T1–T5:
`03_plan.html#t0-decision`.

B keeps the flat `data-level` attribute, so neither `validate-scorecard-anchors.mjs` (`sak`) nor `jb6`'s
calibration gate needs to change — a `data-level-<level>` family would have forced both.

**Build posture:** full autopilot — all 8 archetypes in one unattended run, gated by AC2's validator, AC3's
pass-line grep, AC5's additive-only diff, and `skill-eval`; no per-archetype review checkpoint.
**Scheduled for the loop tick after `260721-z5n`.**

Status returned to `planned`.
