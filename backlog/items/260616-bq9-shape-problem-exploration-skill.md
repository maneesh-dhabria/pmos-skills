---
schema_version: 1
id: 260616-bq9
kind: epic
title: "/shape — collaborative problem-space exploration skill (lens-ledger floor/ceiling probing) + feature-sdlc front-gate + ideate frame-dedup"
type: feature
status: defined
priority: should
labels: [pmos-toolkit, shape, problem-discovery, lens-ledger]
route: skill
created: 2026-06-16
updated: 2026-06-16
defined: 2026-06-16
source: docs/design-briefs/2026-06-16-shape-skill-design.md
feature_folder: docs/pmos/features/2026-06-16_shape-skill/
design_doc: docs/pmos/features/2026-06-16_shape-skill/02_design.html
parent:
dependencies: []
---

## Context

New pmos-toolkit skill `/shape`: a collaborative thought-partner that probes the user like a
seasoned product leader to **shape the problem** before any solution work begins. Fills a
genuine gap — `/requirements` (doc-production), `/ideate` (solution generation), `/grill`
(interrogates a committed artifact), and `/creativity` (alternative angles) all presume the
problem is known. None co-explores the problem space.

Spine: CONTEXT-GATE → FRAME (HMW+JTBD) → LADDER (why/how, 5-Whys) → DECOMPOSE → REFRAME
(competing framings + ripple-on-the-framing) → CONVERGE → WRITE problem-brief → HANDOFF.
Interaction: `/grill` cadence (one question/turn), adaptive answers (recommended only on
convergence moves, open probing on exploration moves). Terminal state is a **shaped problem,
never a solution** (the disciplining constraint).

Floor-not-ceiling probing is the load-bearing design: a **lens deck** (the seasoned-leader
probes — customer & pain, framing & hypothesis, success & guardrails, strategy & fit, risks/
urgency/reversibility, constraints & dependencies) is the FLOOR (every applicable lens must be
dispositioned: Answered / Parked / Open / N/A), pushed past the ceiling by a mandatory
"what did the deck miss?" meta-probe + adaptive lens spin-up, and shrunk by a context-gate
classifier (side-project / feature / new-bet / internal) so a weekend project isn't grilled on
strategy. The floor/ceiling/context-gate mechanism is extracted to a reusable shared substrate
`_shared/lens-ledger.md`.

Full decision log (D1–D9) + sharpened lens deck in the design brief
(`docs/design-briefs/2026-06-16-shape-skill-design.md`), adopted verbatim as the epic
`design_doc:` (02_design.html).

Spans 3 surfaces (story-split carved during define):
1. `/shape` skill **+ `_shared/lens-ledger.md` substrate in the same surface** (so the cite and the
   file ship together — closes the dangling-cite bootstrap gap).
2. `/feature-sdlc` Phase-1 front-gate rewiring — `/shape` becomes the gated front (Tier 1 skip,
   **Tier 2 + Tier 3 mandatory**), **additive + version-gated** (resume states predating the phase
   skip it; no migration); `/ideate` becomes the solution-exploration step.
3. `/ideate` frame-dedup — consume `/shape`'s HMW+JTBD frame instead of re-deriving.

Grill (define-loop) resolved 3 blockers + 6 should-fix/nit into the design seed: surface ownership
merged (1+2→1), D5 persistence sharpened (classification persists, self-healing correction), **D10
non-interactive degradation** added (autonomous lens subagents + reviewer-judgement convergence,
escalate only on major gaps), D8 made additive/version-gated, full 4-bucket downshift matrix,
ceiling-breaker sufficiency-attestation escape, operational problem/solution boundary + 2 skill-eval
deltas, and the `/shape`-vs-Shape-Up naming tension recorded.

Explicitly deferred: a symmetric solution-shaping twin skill (D7) — reuse the lens-ledger
pattern inside existing skills later if dogfooding proves a gap.

## Acceptance Criteria

- A new `/shape` skill ships in pmos-toolkit at the canonical path, conforming to `skill-patterns.md §A–§L`, passing `skill-eval.md`.
- The lens-ledger floor/ceiling/context-gate mechanism lives in `_shared/lens-ledger.md` and is cited (not restated) by `/shape`.
- `/shape` produces a single commentable problem-brief HTML artifact rendering the full lens ledger (incl. N/A + Parked dispositions), and produces no solution content.
- `/feature-sdlc` runs `/shape` as a gated Phase-1 front: auto-skip Tier 1, mandatory Tier 2 and Tier 3; `/ideate` follows as the solution-exploration step.
- `/ideate` consumes `/shape`'s HMW+JTBD frame when present instead of re-deriving it.
