---
schema_version: 1
id: 260710-dsc
title: "/wireframes — rewrite eval-rubric.md as an SVG-native, judgment-only rubric: retire A1–A5 and D1–D4, enumerate the survivor id set, and rebuild #review's hard-fail set and second-loop trigger on it"
type: feature
kind: story
status: in-progress
route: skill
priority: should
labels: [pmos-toolkit, wireframes, skill]
created: 2026-07-10
updated: 2026-07-11
parent: 260710-grd
claimed_by: build:0d5e385f-c675-46f6-a126-345344fa277d
driver_holder: build:0d5e385f-c675-46f6-a126-345344fa277d
worktree: .claude/worktrees/feat-260710-dsc
feature_folder: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/
design_doc: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/02_design.html
plan_doc: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/stories/260710-dsc/03_plan.html
tasks_file: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/stories/260710-dsc/tasks.yaml
dependencies: [260710-p5x]
---

## Context

A wireframe is structure, not implementation. SVG has no `<label>`, no `<th>`, no `<dt>`, no `:focus-visible`, and
no touch targets in the DOM sense. The accessibility heuristics currently in `reference/eval-rubric.md` are asking
a reviewer to check properties the artifact cannot have. Accessibility review belongs at `/prototype`, which emits
real HTML and already owns it (design D3).

This story lands **before** the 41-file pattern migration (260710-8z9) on purpose: those files cite the rubric ids
in their `## Best practices` and `## Common mistakes` lists, and retiring ids without the new set in place would
leave the migration nothing to re-point at. D4's sequencing consequence, now enforced by the dependency graph.

Per amendment A2, this rubric is **judgment-only**. Everything deterministic — the palette allowlist, the 44px
tap-target geometry check, `<title>`/`<desc>` presence — lives in `lint-wireframe-svg.mjs` (story 260710-p5x), not
here. §H: never ask the model to do arithmetic a script can do.

Coherence contract: `02_design.html` — D3, D4; amendments A1, A2.

## Change surface

- `plugins/pmos-toolkit/skills/wireframes/reference/eval-rubric.md`
- `plugins/pmos-toolkit/skills/wireframes/SKILL.md` (the `#review` phase: hard-fail set, second-loop trigger)

## Acceptance Criteria

- [ ] `A1` (semantic HTML), `A3` (focus visibility), `A4` (labels), `A5` (touch targets) and `D1`–`D4` (device
  patterns) are **removed** from the rubric. `A2` (contrast) is removed **as a reviewer heuristic** — it is
  trivially satisfied by the closed monochrome palette and is enforced by the lint's allowlist instead (D3, A1).
- [ ] The rubric **enumerates its survivor id set explicitly** — `N1`–`N10`, `F1`–`F2`, `G1`–`G4`, `S1`–`S4`,
  `C1`–`C3` — so the epic's dangling-cite gate has a positive allowlist to check against, not only a negative
  denylist (A1).
- [ ] New SVG-native **judgment** checks are added: whether each `data-region` group is named meaningfully; whether
  the numbered annotation list is an adequate text alternative for the screen; whether the composition respects the
  negative-space rule. Nothing in the rubric asks the reviewer to measure, count, or total anything (A2, §H).
- [ ] The rubric states, in one line, that the deterministic checks live in `scripts/lint-wireframe-svg.mjs` and
  cites it — one fact, one home (§K).
- [ ] `#review`'s hard-fail set and its second-loop trigger conditions are **restated on the new ids**. No surviving
  reference anywhere in the phase to a retired id.
- [ ] Severity calibration is rebuilt: the old rubric marked `A1`/`A4` violations and `D2`/`D3` device-pattern
  violations as **high**. Those rows are gone; the new high-severity set is stated explicitly rather than left
  implicit.
- [ ] `grep -Eo '\b(A1|A2|A3|A4|A5|D1|D2|D3|D4)\b'` over `reference/eval-rubric.md` and over the `#review` phase
  yields **zero matches** (A1 — note the ERE, and note `A2` is in the retired set).
- [ ] Conforms to `skill-patterns.md §A–§L` + repo `CLAUDE.md`; `skill-eval.md` and all four hygiene lints stay
  green; the frozen non-interactive block stays byte-identical.
