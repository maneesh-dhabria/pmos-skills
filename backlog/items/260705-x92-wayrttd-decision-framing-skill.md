---
schema_version: 1
id: 260705-x92
title: "/wayrttd — a fast reflexive \"What Are You Really Trying To Do?\" decision-framing skill (solution→problem inversion ladder, first-person decision-maker POV) plus an optional upfront hook into /shape"
type: feature
kind: epic
status: defined
route: skill
priority: should
labels: [pmos-toolkit, wayrttd, thinking-tool, shape, skill]
created: 2026-07-05
updated: 2026-07-05
design_doc: docs/pmos/features/2026-07-05_wayrttd-skill/02_design.html
feature_folder: docs/pmos/features/2026-07-05_wayrttd-skill/
parent:
dependencies: []
---

## Context

New skill `/wayrttd` ("What Are You Really Trying To Do?", Shreyas Doshi's Stripe thinking tool; Sketchplanations
"reach the balloon vs. stack chairs with tape" framing). A **fast, reflexive** decision-framing tool — the
lightweight counterpart to the existing deep `/shape`. Its one move is a five-step **solution→problem inversion
ladder**: capture the assumed solution X → climb "and what would that get you?" to the real goal → name Problem Y
(first-person) → re-test whether X even serves Y (surfacing cheaper/already-available paths) → a
proceed/reconsider/pivot verdict. Always written from the **POV of the person making the decision / proposing X**.

This is a **skill-new** epic, `route: skill`, single plugin (pmos-toolkit — sits with `/shape`, `/ideate`,
`/grill` on the discovery front), one release unit. Coherence contract (INV-1..6, D1..D7, story map) in
`02_design.html`. The differentiator from `/shape` (fast reflex vs. deep session) is the reason the skill exists
(D1); depth is a handoff, never absorbed (INV-5).

## Acceptance Criteria

- [ ] `/wayrttd <ask>` runs the five-step inversion ladder and terminates in a first-person "what I'm really
  trying to do" statement + a proceed/reconsider/pivot verdict on the assumed solution (INV-1..5).
- [ ] A compact commentable HTML capture is emitted on the pmos html-authoring substrate carrying
  `<meta name="pmos:skill" content="wayrttd">` (D4).
- [ ] The skill passes `skill-eval.md` (both halves) and the four hygiene lints; conforms to
  `skill-patterns.md §A–§L` and the repo `CLAUDE.md` conventions (canonical path, manifest sync, release entry).
- [ ] `/shape` offers an optional, fully skippable WAYRTTD upfront step that leaves standalone `/shape` unchanged
  when declined or absent (INV-6).
- [ ] Both stories ship in one pmos-toolkit release unit.

## Stories

- 260705-vr5 — build `/wayrttd` standalone (route: skill). No deps.
- 260705-y3f — wire `/wayrttd` as an optional upfront step in `/shape` (route: skill). Depends on 260705-vr5.
