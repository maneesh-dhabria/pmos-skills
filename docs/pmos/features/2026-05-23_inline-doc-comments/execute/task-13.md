---
task_number: 13
task_name: "--batch mode + wave planner (P6 port from /execute)"
task_goal_hash: t13-2026-05-24-batch-wave-planner
plan_path: "docs/pmos/features/2026-05-23_inline-doc-comments/03_plan.html"
branch: "feat/inline-doc-comments"
worktree_path: null
status: done
started_at: 2026-05-24T07:00:00Z
completed_at: 2026-05-24T07:30:00Z
execution_mode: subagent-driven
depends_on: [T12]
commits:
  - d2ba33b feat(T13): --batch wave planner ported from /execute
  - a38eab7 fix(T13): address code-review gaps — allSettled + cycle fallback + RTL sort
files_touched:
  - plugins/pmos-toolkit/skills/comments/scripts/wave-planner.js
  - plugins/pmos-toolkit/skills/comments/scripts/resolver.js
  - plugins/pmos-toolkit/skills/comments/tests/wave-planner.test.js
  - tests/scripts/assert_wave_planner.sh
reviews:
  spec_compliance: pass
  code_quality: pass (after fix iteration; 3 Important + 6 Minor — 2 fixed inline, 1 deferred to T14 with TODO)
verification:
  - "assert_wave_planner.sh: PASS 7/7 cases (5 required + orphan-exclusion + cycle-fallback)"
  - "assert_resolver_confirm_each.sh: PASS (T10 regression)"
  - "assert_anchor_resolver.sh: PASS 7/7 (T12 regression)"
deferred:
  - "Important #3: resolver.js extraction into _resolveBatch / _resolveConfirmEach helpers — TODO(T14) marked at top of --batch branch; cleaner with 3 mode branches in mind."
---

## T13 outcome

`planWaves(threads, overlapRelation, depEdges?)` lands in `comments/scripts/wave-planner.js` — Kahn's-algorithm layering + greedy packing, ported verbatim from `execute/subagent-driven.md` (sha1 `23ada3a9cd18b5552f5522c911fb4ccda51933ea`, recorded as provenance comment).

FR-25 overlap relation: text/text half-open intersect; SVG/SVG bbox area > 0; text/SVG treated as soft-conflict (segregates into separate waves per case-d intent). Within-wave RTL: text-before-SVG, then by `start_offset` DESC, then by id ASC. Orphan threads excluded (T12 surfaces them via `anchor_orphaned`).

`resolver.js` gains `mode === 'batch'` branch (~175 LOC): pre-resolves all anchors, plans waves, dispatches per-wave via `Promise.allSettled`, presents one accept/reject/defer prompt per wave, applies RTL on Accept, persists + git-adds once at end-of-run. Per-thread dispatch failures within a wave skip individually without blocking wave-mates.

## Key decisions

- **`Promise.allSettled`, not `Promise.all`:** wave-mate isolation must not depend on every dispatcher being well-behaved. Rejected settlement values mapped to the same `AGENT_ERRORED` shape the inner try/catch already produces.
- **`depEdges` accepted but vacuous today:** /comments threads have no dep edges between them, so Kahn's collapses to single-layer in the fast path. The parameter + cycle-fallback are wired so future callers can supply edges without re-touching the planner.
- **SVG-with-`dom_range`-but-no-bbox fallback** logs a `console.warn` rather than failing silently — surfaces planner-classification anomalies.
- **`resolver.js` LOC growth deferred:** 330 → 507. TODO(T14) marker added; refactor will be cleaner with `--auto` mode in hand and 3 branches to extract.

## Reviewer findings

**Spec-compliance:** ✅ all 5 required test sub-cases + 2 bonus; provenance SHA present; FR-25 rules per spec; within-wave RTL sort verified; resolver `--batch` added BEFORE confirm-each loop (T10 regression preserved); T9 / T12 untouched.

**Code-quality, round 1:** 0 Critical, 3 Important (allSettled gap, defensive RTL sort divergence, file growth), 6 Minor (cycle-fallback comment/code contradiction, stale TODO, dead `_internal` exports, etc).

**Code-quality, round 2 (post-fix):** PASS — Important #1 and #2 fixed; Important #3 deferred to T14 with code TODO; minor cleanups (#5 contradiction, #6 stale comment, #8 silent SVG reclassification) applied.

## Notes for downstream

- **T14 owes the refactor extraction** (`_resolveBatch` / `_resolveConfirmEach` / `_resolveAuto`) when `auto` mode lands. The single function is already at the edge of comfortable.
- **T14 owes Modify-edit-then-resubmit UX** per the corrected TODO at resolver.js:454.
- `wave-planner._internal` surface (`_kahnLayers`, `_packLayer`, `_rightToLeft`, `_stableOrder`, `_bboxOverlap`, `_textOverlap`, `_kind`) is scaffolding for T18–T21 fanout reuse.
