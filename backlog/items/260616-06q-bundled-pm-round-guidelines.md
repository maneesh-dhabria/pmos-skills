---
schema_version: 1
id: 260616-06q
title: "Bundled PM round guideline starter set"
type: feature
kind: story
status: done
released: 0.1.0
route: skill
priority: should
labels: [interview-feedback, pmos-managerkit, content, guidelines]
created: 2026-06-16
updated: 2026-06-17
parent: 260616-9bt
dependencies: [260616-vwn]
worktree:
build_branch: feat/260616-06q
build_commit: 0d306bd
claimed_by: null
driver_holder: null
design_doc: docs/pmos/features/2026-06-16_interview-feedback/02_design.html
plan_doc: docs/pmos/features/2026-06-16_interview-feedback/stories/260616-06q/03_plan.html
tasks_file: docs/pmos/features/2026-06-16_interview-feedback/stories/260616-06q/tasks.yaml
---

## Context

Story B of epic 260616-9bt. Authors the 7 bundled PM round guideline templates that
`/interview-feedback setup` scaffolds from when the HM has no guidelines of their own.
Depends on Story A (260616-vwn) for the canonical scorecard + reference skeletons and the
archetype enum (design §16.5, §16.7).

## Acceptance Criteria

- [ ] **7 round archetypes** (§6), each shipping a **reference** + a **scorecard**, both instantiating Story A's canonical skeletons (§16.7): Recruiter screen · Product sense/design · Analytical/metrics/execution · Technical/system (PM) · Behavioral/leadership/values · Case study or take-home (carries an additional-doc slot) · Case presentation to panel.
- [ ] Each scorecard carries the §16.1 machine anchors (`data-dim/data-weight/data-scale/data-v/data-input/data-flags`) so the Story A filler targets them with zero special-casing.
- [ ] Each reference follows the design's "reference half" shape (model-answer guidance, good/avg/poor markers, probes, common mistakes) — researched/grounded, role-agnostic where possible, PM-shaped where not.
- [ ] Archetype ids match the Story A `role.json` enum exactly.
- [ ] `setup` can scaffold any of the 7 into a role's `guidelines/<round>/` and the Story A `score` path fills the resulting scorecard unmodified (cross-story integration check).

## Notes

route: skill — but largely content authoring on top of Story A's contract. skill-eval applies to
any SKILL.md changes; if this story only adds `reference/` template files (no SKILL.md edit), the
[D] checks pass trivially and the [J] half scores the template quality/consistency.

## Build outcome (2026-06-17, Loop-2)

BUILT on `feat/260616-06q` @ `0d306bd` (16 files: 7 scorecard + 7 interviewer-reference +
case-study/additional/README + dogfood). All ACs met.

- **7 archetype pairs** under `reference/guidelines/<archetype>/` (ids bound to Story A's
  `role.json` enum, SKILL.md:164): recruiter-screen, product-sense, analytical, technical,
  behavioral, case-study (with `additional/` doc slot), case-presentation (panel). Each scorecard
  instantiates Story A's canonical §16.1 skeleton (`data-dim/data-weight/data-scale/data-v/
  data-input/data-flags`, weights sum 100); each reference carries per-area green/red signals,
  probe ladders, calibration, common mistakes.
- **Cross-story integration (AC5, load-bearing):** Story A `fill-scorecard.mjs` parses + fills all
  7 bundled scorecards **unmodified** — `parse` `anchored:true`, `fill` exit 0 + re-parses
  anchored, score selected + note injected + green flag appended + reco set (`fail=0`). Fixed
  analytical reference drift (`data-area="calibration"` → `class="calib"`) to keep area-ids ==
  dim-ids 1:1.
- **Gates green:** skill-eval `[D]` (`--target claude-code`) EXIT 0 (SKILL.md untouched);
  `tests/run-tests.sh` 8/8; 4 lints PASS (non-interactive-inline 49 skills byte-identical,
  audit-recommended, flags-vs-hints, phase-refs); 0 external asset refs across 14 HTML templates.
- Evidence (no candidate content): `stories/260616-06q/dogfood/DOGFOOD.md`.
- **Scope:** completes epic 260616-9bt's two stories (A=vwn core, B=06q bundled set). Epic NOT
  released this iteration — awaits `/complete-dev --epic 260616-9bt` (first managerkit release =
  v0.1.0 baseline, no bump).

Worktree kept for the next loop. Claim `build:cron-06q` released.
