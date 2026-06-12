# Grill Report — skill-three-loop-design.md

**Depth:** deep • **Questions asked:** 7 • **Date:** 2026-06-12
**Target:** docs/pmos/reviews/2026-06-12_skill-three-loop/skill-three-loop-design.md

## Resolved (with the amendments each forces on the doc)

| # | Decision | Amends |
|---|---|---|
| **G1 — Premise** | **Full unattended build**, same as feature. Loop 2 grinds skill-stories via `/loop`/cron; `skill-eval` PASS + `verify` PASS ships-to-branch with no human until release. | Confirms D2/D4; raises the stakes on every gate below. |
| **G2 — Epic contract** | A **design-doc seed becomes the epic `design_doc:`**; stories cite it by anchor (the role the epic spec plays in feature mode). Raw feedback **synthesizes a light epic-design page** naming cross-skill invariants + shared-substrate shape. | **Amends D1/D3** — there *is* an epic design artifact (not a full `/spec`). **Closes the `/plan` seam** — `/plan` cites `design_doc:` as its spec source. |
| **G3 — Split grain** | **Default 1-skill-1-story, but the split is a judgement step** — fuse tightly-coupled skills (alias+target, co-designed pair) into one story when not independently verifiable; independently-shippable substrate stays its own story + deps + D9 merge. | **Amends D3** — drop the "deterministic" framing. |
| **G4 — Routing** | **Design-doc seed → loop by default**; raw feedback → triage, then **offer epic-vs-batch at N≥3** in-scope skills (Recommended=epic), else monolithic. | **Resolves Q1, amends D6.** No silent change for small raw feedback. |
| **G5 — Changelog** | Stories **self-classify user-facing \| maintenance**; epic changelog renders user-facing as capability entries, rolls maintenance into one "Skill quality & internals" line. | **Amends D5** — honours `/changelog`'s "not how it was built" contract. |
| **G6 — Release gate** | `[D]` on merged tree **+ one epic-level cross-skill coherence `[J]` pass** (shared-contract agreement, alias/target consistency, `design_doc` invariants) — *not* a per-skill rerun. | **Amends D5/Q5** — D14's "0/27 rerun" rationale doesn't cover coherence (a different check, not a rerun). |
| **G7 — v1 scope** | **Both** revision epics (`--from-feedback`/design-doc) **and** `skill-new` epics (light epic `/requirements` framing the new-skill set). | **Resolves Q2** (both Q2a paths). |

**Closed by inference:** **Q4** — accept per-story `[J]` (only per-skill gate under full-unattended, can't defer). **Q6** — keep monolithic (the small-raw-feedback path from G4).

## Gaps surfaced (notes for spec, not open decisions)
- **Design-doc detection heuristic** (G4): specify what marks a seed file as a design doc vs raw feedback — suggest a file with a decisions table / multi-skill scope / explicit story candidates.
- **Worktree cost at scale**: full-unattended + 1-skill-1-story → a 28-skill epic spins up 28 worktree create+merge cycles. Accepted under G1 (same as feature build); record as an NFR.
- **Mode-promotion control flow**: `/feature-sdlc skill --from-feedback` must promote into `define --route skill` (G4) — a branch inside `skill-feedback` mode, not the alias. The alias stays thin.
- **Coherence-`[J]` failure path**: red coherence pass at release reuses D14 behaviour — train stops, epic → `blocked`, findings to `groom`.

## Open / Deferred
None — the tree resolved fully.

## Recommended next step
Fold G1–G7 into the design doc, then seed the implementation run via `/skill-sdlc --from-feedback` with the doc.
