---
schema_version: 1
id: 260626-8pa
kind: epic
title: "Get derivable status off the merge path across the three trackers (/backlog, /mytasks, /people) + harden tracker-crudl.md"
type: tech-debt
status: released
released: pmos-toolkit/v2.96.0
priority: should
labels: [pmos-toolkit, backlog, mytasks, people, tracker-crudl, merge-path]
route: skill
created: 2026-06-26
updated: 2026-06-27
source: docs/pmos/shape/2026-06-26_backlog-index-merge-tax.html
feature_folder: docs/pmos/features/2026-06-26_trackers-index-merge-tax/
design_doc: docs/pmos/features/2026-06-26_trackers-index-merge-tax/02_design.html
parent:
dependencies: []
---

## Context

Shaped problem (`source:` above): each of the three trackers — `/backlog`, `/mytasks`, `/people` —
maintains a **committed, hand/model-regenerated `INDEX.md` cache** that **no consumer reads** (every
programmatic read — list / next / releases / show / the web viewers — already derives from the
per-item YAML), yet **every mutating handler rewrites it**. In this repo's parallel-worktree +
release-train model, a single committed file that every operation rewrites is a structural
**merge-conflict magnet**, and the regeneration is a per-mutation tax with no offsetting benefit.

The same anti-pattern lives in the shared substrate **`_shared/tracker-crudl.md` §5** (the
"regenerable cache" contract that *mandates* the committed INDEX + "regenerate before any read"),
so the three trackers inherit it by construction. Fixing the three skills without fixing the
substrate would let the pattern reappear in the next tracker built on it.

**Scope (confirmed with maintainer):** all three trackers **and** the substrate. The substrate fix
is the load-bearing change — it stops this from happening again.

**Out of scope (parked per the shape brief):** archiving / sharding completed items for parse speed
(SP3 — currently unvalidated; 143 small files parse fast). Do not let the perf concern drive this
epic.

Full design, decision log, cross-skill invariants, and the per-skill change-sets live in the
`design_doc:` (02_design.html). Story split + stories below are filled at definition.

## Story split

Judgement split (route:skill default = 1 skill : 1 story), with the **substrate rewrite riding the
foundation `/backlog` story** (lens-ledger precedent — a shared-substrate change rides the skill story
that exercises it, per `design_doc:` #story-split). Four stories, single plugin (pmos-toolkit):

1. **260626-psr** — `/backlog` index removal + **`_shared/tracker-crudl.md` §5/§6 rewrite** + the one
   external consumer edit (`feature-sdlc/SKILL.md:448`). **No deps** — foundation; hosts the substrate
   invariants (INV-1/2/3) every other story inherits.
2. **260626-3d4** — `/mytasks` index removal (`regenerateIndex`→`renderIndex`, migration relocated to
   load-time normalization) + web-default. **Deps: 260626-psr** (so the rewritten §5 merges in at claim).
3. **260626-5cq** — `/people` index removal (retire rebuild-index from add/set/refine + Phase 8) +
   inline derived render. **Deps: 260626-psr**.
4. **260626-nq0** — `/people` **NEW** zero-dep web viewer (parity with /backlog + /mytasks web-default).
   **Deps: 260626-5cq** (people read path must be derive-on-read before adding the web surface).

Build order: psr → (3d4 ∥ 5cq) → nq0.

## Stories

| id | title | route | deps | status |
|---|---|---|---|---|
| 260626-psr | /backlog index removal + tracker-crudl.md §5/§6 rewrite + feature-sdlc:448 edit | skill | — | planned |
| 260626-3d4 | /mytasks index removal + renderIndex + web-default | skill | 260626-psr | planned |
| 260626-5cq | /people index removal + inline derived render | skill | 260626-psr | planned |
| 260626-nq0 | /people NEW web viewer (web-default + inline fallback) | skill | 260626-5cq | planned |
