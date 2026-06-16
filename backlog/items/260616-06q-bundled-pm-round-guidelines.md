---
schema_version: 1
id: 260616-06q
title: "Bundled PM round guideline starter set"
type: feature
kind: story
status: planned
route: skill
priority: should
labels: [interview-feedback, pmos-managerkit, content, guidelines]
created: 2026-06-16
updated: 2026-06-16
parent: 260616-9bt
dependencies: [260616-vwn]
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
