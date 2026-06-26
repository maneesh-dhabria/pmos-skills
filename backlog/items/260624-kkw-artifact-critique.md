---
schema_version: 1
id: 260624-kkw
kind: epic
title: "/artifact-critique — opinionated, axis-by-axis product-doc critique skill (10-axis verdict scorecard + quote-grounded deep-dives + ranked weakest-claims) on a shared _shared/critique-rubric/ substrate"
type: feature
status: released
released: v2.92.0
priority: should
labels: [pmos-toolkit, artifact-critique, critique-rubric, product-docs, new-skill]
route: skill
created: 2026-06-24
updated: 2026-06-24
defined: 2026-06-24
source: docs/pmos/features/2026-06-24_artifact-critique/02_design.html
feature_folder: docs/pmos/features/2026-06-24_artifact-critique/
design_doc: docs/pmos/features/2026-06-24_artifact-critique/02_design.html
parent:
dependencies: []
---

## Context

A new pmos-toolkit skill, **`/artifact-critique`**, that gives a product document (PRD /
strategy / POV / roadmap, ≤50k chars) the opinionated, axis-by-axis review a seasoned product
leader would — a scannable **10-axis verdict scorecard**, **quote-grounded per-axis deep-dives**
with a prescriptive "what I'd want to see", and a **forced-ranking of the weakest claims** —
delivered as a written HTML artifact the author can act on without a live session, then hands off
to `/artifact` to rewrite.

Reverse-engineered from "Coach — opinionated product reviews" (Gokul Rajaram), studied across 5
real reviews. The design is **grilled & locked** (deep grill 2026-06-24, 13 branches) in the
seed brief `docs/design-briefs/2026-06-24-artifact-critique-skill.md`, adopted verbatim as the
basis of `02_design.html` and completed during this define run.

**The missing primitive.** The toolkit critiques *slices* of a product doc but never the whole
thing as an opinionated standalone peer: `/polish` judges prose; `/grill` needs a human in the
loop; `/msf-req` is the end-user lens; `/simulate-spec` is implementation-readiness; `/design-crit`
is UX of a built thing; `/artifact refine` improves toward a template. None produces a standalone,
opinionated, scannable verdict-by-axis scorecard with a forced-ranking of the weakest claims.

**Decided (seed brief + this define run):**

- **Separate standalone skill, critique-only (D0/D1).** Judging a foreign doc is a distinct act
  from authoring one; it runs standalone on docs `/artifact` never made (matching `/grill`,
  `/design-crit`, `/polish`). The **rewrite is delegated to `/artifact`**; the hand-off vehicle is
  the persisted critique document itself, carrying a machine-parseable **structured-findings block**.
  No `/artifact` change in v1.
- **Shared substrate, one v1 consumer (D2).** Author the rubric at
  `_shared/critique-rubric/` now (`axes.md`, `heuristics.md`, `doc-types.md`); only
  `/artifact-critique` consumes it in v1. `/artifact` adopting `heuristics.md` is an **explicit
  later story** tied to a future `/artifact-sdlc` — **no `/artifact` cite of the substrate ships in
  v1** (dangling-cite guard).
- **Replicate the fixed 10 axes AND extract the cross-cutting heuristics — keep both layers (D4).**
  The fixed axis list (`Customer · Solution · Scope · Metrics · Pricing · Strategy · GTM · Stage ·
  AI · Risks`) is what forces an `ABSENT` verdict on an axis the author never wrote (coverage-of-
  absence — the highest-value finding); the heuristics (§2.5) are the reasoning spine.
- **Single ordinal verdict scale (`STRONG/MIXED/WEAK/ABSENT/N/A`) + free-text reason (locked).**
  `ABSENT` vs `N/A` decided deterministically by the doc-type applicability map.
- **HTML-primary output, `--format html|md`, drop `both` (D3).** "Copy markdown" affordance on the
  HTML so the paste-into-Slack workflow survives without a sidecar.
- **Embedded `<script type="application/json">` findings block** as the structured hand-off carrier
  (define decision) — not a `.sections.json` sidecar; the artifact stays the single source of truth.
- **Vendor anonymized corpus samples** under the feature folder (define decision) so few-shot voice
  exemplars + deterministic eval fixtures are self-contained and reproducible; **no real/confidential
  corpus doc is committed**.

## Cross-skill invariants (the `design_doc:` contract stories cite by anchor)

- **Inv-1 — one rubric, one home.** The 10 axes, the §2.5 heuristic spine, the verdict scale, and
  the doc-type applicability map live in `_shared/critique-rubric/` and nowhere else. The skill
  cites them; it does not restate or fork them (CLAUDE.md §K).
- **Inv-2 — coverage-of-absence is load-bearing.** Every *applicable* axis gets a verdict every
  run; a missing-but-expected axis is `ABSENT` (a defect), a missing-but-not-applicable axis is
  `N/A` (stated, never silently skipped). The applicable-axis set is resolved deterministically from
  `doc-types.md` (union for hybrids).
- **Inv-3 — quote grounding.** Every per-axis deep-dive and weakest-claim is grounded in a verbatim
  ≥40-char block-quote **verified present in the source** by the deterministic gate (never an LLM
  string-match — CLAUDE.md §H).
- **Inv-4 — no padding.** Weakest-claims returns 0–3; never padded to a quota. `STRONG` is a
  first-class, freely-given verdict.
- **Inv-5 — honest about limits (D7).** An inferred-but-unverifiable gap is reported as "not visible
  in this doc", never asserted as fact; an unreadable embedded visual is named, and its possible
  content is not scored `ABSENT`.
- **Inv-6 — dangling-cite guard (D2).** No artifact references `_shared/critique-rubric/` except
  `/artifact-critique` until the `/artifact` adoption story lands.

## Stories (route: skill)

1. **`260624-fbd` (foundation, no deps)** — `_shared/critique-rubric/` substrate: `axes.md`,
   `heuristics.md`, `doc-types.md` (applicability map + verdict scale + structured-findings schema)
   + vendored anonymized corpus samples. Pure reference/data; internally consistent.
2. **`260624-aa8` (deps: fbd)** — the `/artifact-critique` SKILL.md + voice rubric + few-shot
   exemplars + ingest/doc-type/axis-scoring/deep-dive/weakest-claims/synthesize/emit phases +
   two-tier quality gate (deterministic hard gate + advisory reviewer) + HTML emit with the embedded
   structured-findings block + "Copy markdown" affordance.

## Out of scope (v1) — captured, not built

- **`/artifact` rubric adoption** (consume `heuristics.md` in `/artifact refine`) — explicit later
  story tied to `/artifact-sdlc`; until it lands, no `/artifact` cite of the substrate (Inv-6).
- **`/artifact-sdlc`** orchestrator (`/artifact` → `/artifact-critique` → rewrite → loop) — the
  structured-findings block is designed so it can slot in later.
- **The REWRITE half** of Coach — delegated to `/artifact`, not replicated (D1).
