---
schema_version: 1
id: 260702-cqf
kind: story
parent: 260702-3bb
title: "Extract the PM-round guidelines corpus + skeletons + effectiveness rubric to pmos-managerkit _shared/interview-guidelines/ and retrofit /interview-feedback to consume it (no behavior change)"
type: enhancement
priority: should
route: skill
dependencies: []
plugin: pmos-managerkit
status: planned
feature_folder: docs/pmos/features/2026-07-02_interview-guide/
plan_doc: docs/pmos/features/2026-07-02_interview-guide/02_design.html
tasks: docs/pmos/features/2026-07-02_interview-guide/stories/260702-cqf/tasks.yaml
worktree:
claimed_by:
driver_holder:
labels: [pmos-managerkit, interview-feedback, interview-guide, substrate, skill]
created: 2026-07-02
updated: 2026-07-02
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260702-cqf -->

## Context

Behavior-preserving substrate lift. Today the researched interview-guidelines assets live inside
`plugins/pmos-managerkit/skills/interview-feedback/reference/`:

- `guidelines/<archetype>/{interviewer-reference.html, scorecard.html}` for 7 archetypes
  (recruiter-screen, product-sense, analytical, technical, behavioral, case-study, case-presentation)
  + `guidelines/case-study/additional/README.md`
- `reference-skeleton.html`, `scorecard-skeleton.html` (the authoring/anchor contracts)
- `interviewer-effectiveness.html` (the coaching rubric)
- `reference-resolution.md` (the resolution contract)

Story 2 (`/interview-guide`) needs the same corpus. Per the design doc (D2) and CLAUDE.md's shared-substrate
rule, these move to a **new** `plugins/pmos-managerkit/skills/_shared/interview-guidelines/` (first `_shared/` dir
in this plugin — created by hand, not via `sync-shared.sh`, which is intersection-only and cross-plugin). Then
`/interview-feedback` is retrofitted to read from the new home with **zero behavior change**.

Decisions/invariants: `design_doc:` (`../../02_design.html`) — D2, INV-1.

## Acceptance Criteria

- [ ] **AC1 (move).** The corpus (`guidelines/` all 7 archetypes + `additional/`), `reference-skeleton.html`,
  `scorecard-skeleton.html`, `interviewer-effectiveness.html`, and `reference-resolution.md` now live under
  `plugins/pmos-managerkit/skills/_shared/interview-guidelines/`. `git mv` preserves history.
- [ ] **AC2 (retrofit paths).** Every reference in `/interview-feedback` to the moved files is updated to the new
  `_shared/` path: `SKILL.md` (Phase Resolve reference-resolution, Phase Setup skeleton instantiation, Phase Coach
  effectiveness rubric), `scripts/fill-scorecard.mjs` (skeleton path), `scripts/questionnaire.mjs` (if it reads
  the scorecard), and `reference-resolution.md`'s own internal paths. Grep for `reference/guidelines`,
  `reference/*skeleton`, `interviewer-effectiveness` returns no stale in-skill path.
- [ ] **AC3 (behavior-preserving).** `/interview-feedback`'s `setup` and `score` no-op paths produce
  byte-identical output to pre-move (INV-1). All selftests green with no assertion changes beyond path updates:
  `transcribe.sh --selftest` 13/13, `check-citations.mjs` 7/7, `fill-scorecard.mjs` 28/28, `tests/run-tests.sh`
  9/9.
- [ ] **AC4 (NI + refusal frozen).** The `/interview-feedback` non-interactive block and the tier-3 refusal marker
  are byte-identical (INV-2/INV-5 of that skill) — this story touches only reference paths, not prompt logic.
- [ ] **AC5 (conformance).** `/interview-feedback` still conforms to `skill-patterns.md §A–§L`; passes
  `skill-eval.md` (`[D]`+`[J]`); 4 hygiene lints + `audit-recommended` green. No release-prerequisite tasks in
  waves (§G).

## Notes

- This is a **move + path retrofit**, not a rewrite. The safest sequence: `git mv` the assets → grep-and-update
  every path in `/interview-feedback` → run all four selftests → confirm byte-identical fixtures.
- No `sync-shared.sh` involvement: the substrate is managerkit-internal (two sibling skills, same plugin), so it
  is created by hand as a first `_shared/` dir (design-doc bootstrap note).
- Confidentiality unchanged: no candidate data touched.
