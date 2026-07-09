---
schema_version: 1
id: 260707-mx5
title: "Apply F1–F4 to /interview-feedback: fourth brief-baseline submission bucket, confirmed-duration time scoring, blocking citation gate + no-stitch-across-labels Ground rule, normalized ≥40-char extraction"
type: bug
kind: story
status: done
route: skill
priority: must
labels: [pmos-managerkit, interview-feedback, grounding, skill]
created: 2026-07-07
updated: 2026-07-08
parent: 260707-rbc
released: v0.5.0
claimed_by:
driver_holder:
dependencies: []
design_doc: docs/pmos/features/2026-07-07_interview-feedback-grounding-fixes/02_design.html
plan_doc: docs/pmos/features/2026-07-07_interview-feedback-grounding-fixes/stories/260707-mx5/03_plan.html
feature_folder: docs/pmos/features/2026-07-07_interview-feedback-grounding-fixes/
worktree:
---

## Context

The only story of epic 260707-rbc. Applies all four retro findings to
`plugins/pmos-managerkit/skills/interview-feedback/SKILL.md` (Phases Score + Ground) and
`scripts/fill-scorecard.mjs`. Grounds in `02_design.html` §findings (F1–F4), §invariants (INV-1..5),
§decisions (D1..D5). Independently shippable + skill-eval'able; no dependency.

## Acceptance Criteria

- [ ] **AC1 — Brief-baseline submission bucketing (F1 / INV-2 / §f1).** Phase Score resolves the
  candidate-facing brief (via the existing reference-resolution, D4) and reads it before bucketing a post-live
  submission. Add an explicit fourth, neutral bucket **"structure published in the brief"** to the post-live
  frame; structure/areas published in the brief are the expected baseline and are never attributed to the
  interviewer or penalized as unoriginal. `fill-scorecard.mjs`'s `submission-assessment` block renders the
  fourth bucket; the brief is a consumed input. Regression: pre-live scenario and the submission checklist gate
  are unchanged.
- [ ] **AC2 — Confirmed-duration time scoring (F2 / INV-3 / §f2).** Before scoring time-sensitive dimensions
  (coverage, talk-time, pace), the intended round duration is **confirmed with the interviewer**, not taken
  from the scorecard header. A transcript-length vs. design-length mismatch is flagged in output. Interactive:
  an `AskUserQuestion` with the header/inferred value as the Recommended option. Non-interactive: DEFER (log an
  open question + flag the mismatch), never silently AUTO-PICK the stale header (D3). The confirmed value is the
  denominator for the affected dims.
- [ ] **AC3 — Blocking citation gate (F3 / INV-1 / §f3).** `check-citations.mjs` MUST exit 0 over both output
  artifacts before either is presented as complete — a hard STOP, not an assertion. On non-zero exit the run
  does not declare done; it reports the failing citations and repairs before re-running. The existing
  `<!-- citations verified: … -->` audit comment is written only on a passing gate.
- [ ] **AC4 — No stitching across speaker labels (F3 / INV-4 / §f3).** Phase Ground adds an explicit rule: a
  transcript-tier citation is a contiguous span of a **single** speaker's utterance — never stitched across
  `Name:` labels and never appended words not in the source.
- [ ] **AC5 — Normalized verbatim extraction (F4 / §f4).** Phase Ground documents: normalize whitespace
  (`\s+`→single space, then trim — the same transform `check-citations.mjs::normalize()` applies to both sides)
  and select the ≥40-char window from that single-line view, so the authored quote matches what the gate sees.
  Authoring-side only; no `check-citations.mjs` behavior change (D2).
- [ ] **AC6 — Eval + hygiene green, no regressions (INV-5).** `name` matches dir; both halves of
  `skill-eval.md` pass (or documented accepted residuals proven pre-existing); all four hygiene lints green
  (non-interactive-inline, audit-recommended, flags-vs-hints, phase-refs); the non-interactive block stays
  byte-identical; `check-citations.mjs --selftest`, `fill-scorecard.mjs`, and `transcribe.sh --selftest` all
  still pass. Version bump / changelog / README-row / tag are `/complete-dev`'s at release — NOT build tasks.
