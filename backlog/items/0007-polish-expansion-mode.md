---
id: 7
title: "/polish — symmetric \"expansion\" mode (grow a doc that's too thin)"
type: feature
status: wontfix
priority: could
labels: [polish, editorial-pass, idea]
created: 2026-05-13
updated: 2026-06-12
source: docs/pmos/features/2026-05-13_polish-editorial-pass/01_requirements.html (explicit non-goal §non-goals)
spec_doc:
plan_doc:
pr:
parent:
dependencies: []
---

## Context

The 2.40.0 editorial-reduction pass cuts docs that bloated over time. The symmetric problem — a draft that's *too thin* (hand-wavy section, undefined term, decision recorded without rationale, an "etc." that should be a list) — has no automated lever. The user noticed it in the very prompt that produced 2.40.0: PRDs and design docs often need both *prune* and *flesh out*, sometimes in the same pass.

A natural extension: a `--expand <pct|range>` flag and / or a Phase 2.5 "grow" option, dispatched to an analogous **gap-spotter subagent** (finds: undefined acronyms / terms used but not introduced, decisions stated without rationale, examples promised but missing, "TODO" placeholders, sentences ending in "etc." or "and so on", references to a concept without a defining first occurrence) producing structured notes, then a **filler subagent** that proposes additions (always `risk: high` — additions are inherently more dangerous than cuts and always go through the Phase 5 surface path; no auto-apply, ever). Voice markers still apply.

## Acceptance Criteria

- Decide whether expansion lives in the same `editor_notes.json` schema (a new `kind: expand`/`define`/`exemplify`) or a sibling `gap_notes.json` — the former is simpler, the latter cleaner.
- Default-off, opt-in, never silent — same posture as reduction.
- Every proposed addition is surfaced individually for approval; no `risk: low` expansions exist (the rewriter must NOT silently insert prose).
- Phase 7 summary line gets a parallel `Editorial expansion:` row when active.
- Decide interaction with reduction: can a single run do both? (Probably yes; reduction runs first on the original, then expansion runs on the reduced output — but the reduction target should account for the expected expansion volume.)

## Notes

Out of scope for 2.40.0 — explicit non-goal in the requirements doc. Demand-signal driven; promote when a user asks for "fill in the gaps in this PRD" style help.
