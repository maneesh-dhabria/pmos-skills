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
status: planned
feature_folder: docs/pmos/features/2026-07-21_interview-scoring-calibration/
plan_doc: docs/pmos/features/2026-07-21_interview-scoring-calibration/stories/260721-1a4/03_plan.html
tasks: docs/pmos/features/2026-07-21_interview-scoring-calibration/stories/260721-1a4/tasks.yaml
worktree:
claimed_by:
driver_holder:
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
