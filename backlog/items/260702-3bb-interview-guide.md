---
schema_version: 1
id: 260702-3bb
title: "/interview-guide — author interview guides (interviewer reference + scoring sheet + candidate-facing case document) grounded in the shared PM-round guidelines corpus"
type: feature
kind: epic
status: released
released: 0.3.0
route: skill
priority: should
labels: [pmos-managerkit, interview-guide, interview-feedback, hiring, skill]
created: 2026-07-02
updated: 2026-07-02
design_doc: docs/pmos/features/2026-07-02_interview-guide/02_design.html
requirements_doc: docs/pmos/features/2026-07-02_interview-guide/01_requirements.html
feature_folder: docs/pmos/features/2026-07-02_interview-guide/
parent:
dependencies: []
---

## Context

New pmos-managerkit skill `/interview-guide` (charter: help me do manager work). It authors interview guides
**before** a round runs — the mirror of `/interview-feedback`, which scores a candidate **after**. Given a role
and the competencies a round must assess, it produces three grounded, self-contained HTML artifacts:

- **(a) Interviewer Reference** — how to run and probe the round, what strong/average/poor looks like per
  competency, common mistakes, a nudge ladder, calibration.
- **(b) Scoring Sheet** — competency-aligned dimensions, scales, green/red flags, overall hire criteria.
- **(c) Case Document** — candidate-facing, 1–2 pages, **case rounds only** — authored from a user-supplied
  business context.

The already-researched 7-archetype PM-round corpus + skeletons + the interviewer-effectiveness rubric currently
live inside `/interview-feedback`. The user's brief asks to "abstract that to a shared reference." So the epic
first lifts that corpus into `plugins/pmos-managerkit/skills/_shared/interview-guidelines/` (a behavior-preserving
retrofit of `/interview-feedback`), then builds `/interview-guide` on top of it.

Full decisions (D1–D12), invariants (INV-1..5), output shapes, and the story split are in the `design_doc:`
(`02_design.html`). Gold-standard output example: the porter case-study guidelines dir
(`interviewing-pms/.../guidelines/case-study/` — interviewer-brief + scoring-sheet + question).

**Recorded open questions (user away at define):** the four shaping decisions were resolved to their Recommended
options — D2 extract-to-shared · D3 corpus-canonical (offline, no citation gate) · D7 case-authored-from-context ·
D6 generative + self-review (manager is the gate). All low-risk defaults; confirm at build/review.

## Acceptance Criteria

- [ ] The guidelines corpus + `reference-skeleton.html` + `scorecard-skeleton.html` + `interviewer-effectiveness.html`
  are moved to `plugins/pmos-managerkit/skills/_shared/interview-guidelines/`; `/interview-feedback` consumes them
  from there with **no behavior change** (no-op path byte-identical; all its selftests green) — INV-1.
- [ ] `/interview-guide` produces (a) + (b) for any round, and (c) for case rounds only (D9), grounded in the
  corpus (D3), across both input modes (round-requirements + best-practices, D4).
- [ ] The generated Scoring Sheet carries the `scorecard-skeleton` machine anchors so `/interview-feedback score`
  can consume it verbatim (INV-2 / D8).
- [ ] A self-evaluation pass runs over the drafts (completeness · competency-alignment · case realism); the
  manager reviews/edits (D6). No enforced citation refusal gate.
- [ ] Non-interactive: non-case generation runs unattended (Recommended → AUTO-PICK); a missing case
  business-context DEFERs, never fabricated (D11).
- [ ] Both stories conform to `skill-patterns.md §A–§L`; pass `skill-eval` (`[D]`+`[J]`); 4 hygiene lints +
  `audit-recommended` green (INV-4). Single plugin, one release unit (INV-5).

## Stories

- **260702-cqf** — substrate: extract interview-guidelines corpus to `_shared/` + retrofit `/interview-feedback`
  (no deps).
- **260702-jz4** — the `/interview-guide` skill (deps: 260702-cqf).

## Release prerequisites

- pmos-managerkit `plugin.json` ×2 version bump (Story 2 is a new user-invocable skill → minor bump from 0.2.0).
- README row for `/interview-guide`; changelog entry; manifest version-sync.
- All owned by `/complete-dev` (Loop 3) — never in a build wave (§G).
