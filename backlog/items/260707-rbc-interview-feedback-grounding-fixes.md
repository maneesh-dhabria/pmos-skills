---
schema_version: 1
id: 260707-rbc
title: "/interview-feedback — analytical & grounding correctness fixes: brief-baseline submission bucketing, confirmed-duration scoring, blocking citation gate + no-stitch-across-labels, normalized verbatim extraction"
type: bug
kind: epic
status: defined
route: skill
priority: must
labels: [pmos-managerkit, interview-feedback, grounding, skill, from-feedback]
created: 2026-07-07
updated: 2026-07-07
design_doc: docs/pmos/features/2026-07-07_interview-feedback-grounding-fixes/02_design.html
feature_folder: docs/pmos/features/2026-07-07_interview-feedback-grounding-fixes/
parent:
released:
dependencies: []
---

## Context

Feedback-driven revision (`/skill-sdlc define --from-feedback`) of the existing `/interview-feedback` skill
(pmos-managerkit), from a real two-candidate run (Piyush, Hrithik). The grounding mechanics existed but three
user-initiated redo cycles were required: a 90-min duration correction, a "did you dictate the submission?"
challenge that inverted a core finding, and a "please repair" for 8 failed citations on a deliverable already
declared complete.

`route: skill`, single plugin (pmos-managerkit), one release unit. No new skill, no UI — a corrective revision
to Phases Score + Ground plus `fill-scorecard.mjs`. Coherence contract (INV-1..5, D1..D5, findings F1..F4,
story map) in `02_design.html`. Story split confirmed with the maintainer: **single story** (D1) — all four
findings are one coherent PR / one `/execute` run against the same `SKILL.md`.

## Acceptance Criteria

- [ ] Phase Score reads the candidate-facing brief and buckets brief-published structure as a neutral
  expected baseline — an explicit fourth submission bucket alongside discussed / interviewer-directed /
  independent — never as interviewer-seeding (F1 / INV-2).
- [ ] Time-sensitive dimensions (coverage, talk-time, pace) are scored against a **confirmed** round duration,
  not the scorecard header; a transcript-length vs. design-length mismatch is flagged (F2 / INV-3).
- [ ] `check-citations.mjs` is a mandatory exit-0 gate before either artifact is presented as done, and Phase
  Ground forbids stitching a quote across `Name:` speaker labels (F3 / INV-1 / INV-4).
- [ ] Phase Ground documents whitespace-normalized (`\s+`→space) extraction of the ≥40-char window — an
  authoring-side step aligning the author's extraction with what the gate compares (F4).
- [ ] Conforms to `skill-patterns.md §A–§L` + repo `CLAUDE.md` conventions; both halves of `skill-eval.md` and
  all four hygiene lints stay green; no regressions to preserve-guard, foreign-scorecard inference, tier-3
  refusal, or the non-interactive contract (INV-5).
- [ ] Ships in one pmos-managerkit release unit.

## Stories

- 260707-mx5 — apply F1–F4 to `/interview-feedback` (route: skill). No deps.
