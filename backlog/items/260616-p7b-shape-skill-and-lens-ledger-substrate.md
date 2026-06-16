---
schema_version: 1
id: 260616-p7b
kind: story
parent: 260616-bq9
title: "/shape skill + _shared/lens-ledger.md substrate — collaborative problem-space exploration with floor/ceiling/context-gate probing, full lens ledger artifact, autonomous non-interactive path"
type: feature
priority: should
route: skill
dependencies: []
plugin: pmos-toolkit
status: planned
feature_folder: docs/pmos/features/2026-06-16_shape-skill/
plan_doc:
tasks: docs/pmos/features/2026-06-16_shape-skill/stories/260616-p7b/tasks.yaml
worktree:
labels: [pmos-toolkit, shape, problem-discovery, lens-ledger, substrate, new-skill]
created: 2026-06-16
updated: 2026-06-16
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260616-p7b -->

## Context

Foundational story of epic `260616-bq9`. Ships the new `/shape` skill **and** the
`_shared/lens-ledger.md` substrate **in one surface** so the cite and the file land together
(closes the dangling-cite bootstrap gap — both live in pmos-toolkit's canonical home, so the
cross-plugin `sync-shared.sh` gap does not apply).

`/shape` is a collaborative thought-partner that probes the user like a seasoned product leader to
**shape the problem** before any solution work. Spine: CONTEXT-GATE → FRAME (HMW+JTBD) → LADDER →
DECOMPOSE → REFRAME → CONVERGE → WRITE → HANDOFF. Terminal state is a **shaped problem, never a
solution** (the disciplining constraint, made enforceable by the operational problem/solution
boundary in the design's §5).

The load-bearing design is the **floor-not-ceiling lens ledger** (extracted to
`_shared/lens-ledger.md`): (1) floor = every applicable lens dispositioned Answered/Parked/Open/N-A;
(2) mandatory ceiling-breaker meta-probe with a sufficiency-attestation escape; (3) context-gate
classifier (side-project/feature/new-bet/internal) driving the full 4-bucket × 6-lens downshift
matrix. Under `--non-interactive` (D10) the three mechanisms run **autonomously** — parallel lens
subagents draft dispositions, a reviewer subagent applies seasoned-leader judgement to converge +
run the ceiling-breaker, unresolved lenses become Open questions, and only a *major* gap escalates.

Design seed: `docs/pmos/features/2026-06-16_shape-skill/02_design.html` (epic `design_doc`),
authored from `docs/design-briefs/2026-06-16-shape-skill-design.md` and sharpened by the
define-loop grill.

## Scope (this story)

- `plugins/pmos-toolkit/skills/shape/SKILL.md` — mechanisms only (floor-disposition gate ·
  mandatory ceiling-breaker · context gate · autonomous non-interactive path), cites the deck and
  the substrate; `§A–§L` skill-patterns conformant; inlined non-interactive block.
- `plugins/pmos-toolkit/skills/shape/reference/problem-lenses.md` — the 6-lens deck + the full
  4-bucket downshift matrix.
- `plugins/pmos-toolkit/skills/_shared/lens-ledger.md` — the reusable floor/ceiling/context-gate
  mechanism (canonical home, cited not restated by SKILL.md).
- `plugins/pmos-toolkit/skills/shape/reference/artifact-template.html` — problem-brief template
  (full lens ledger incl. N/A + Parked, HMW/JTBD/decomposition/framings/chosen-framing/open-Qs).
- Comment-resolver shim + tests + comments coverage; skill-eval deltas (off-deck/attestation
  reward + solution-shaped-statement failure).

## Acceptance Criteria

- A new `/shape` skill ships at the canonical path `plugins/pmos-toolkit/skills/shape/SKILL.md`,
  conforming to `skill-patterns.md §A–§L`, passing `skill-eval.md`.
- The floor/ceiling/context-gate mechanism lives in `_shared/lens-ledger.md` and is **cited, not
  restated** by `/shape`; the file ships in the same change as its first cite (no dangling cite).
- `/shape` produces a single commentable problem-brief HTML artifact rendering the **full lens
  ledger** (including N/A + Parked dispositions) and produces **no solution content** (enforced by
  the operational problem/solution boundary + the new skill-eval check).
- The ceiling-breaker is satisfied by either ≥1 genuine off-deck probe **or** a justified
  sufficiency attestation; the context gate applies the documented 4-bucket downshift matrix.
- Under `--non-interactive`, `/shape` runs the autonomous lens-subagent + reviewer-judgement path
  (D10): it does not deadlock, does not hard-refuse, records assumptions, logs unresolved lenses as
  Open questions, and escalates only on a major blocking gap.
