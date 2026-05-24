---
task_number: 12
task_name: "Proper anchor resolver — id-first + Bitap fallback + SVG path"
task_goal_hash: t12-2026-05-24-anchor-resolver-canonical
plan_path: "docs/pmos/features/2026-05-23_inline-doc-comments/03_plan.html"
branch: "feat/inline-doc-comments"
worktree_path: null
status: done
started_at: 2026-05-24T06:35:00Z
completed_at: 2026-05-24T06:55:00Z
execution_mode: subagent-driven
depends_on: [T7, T8, T9, T10]
note: "T11 (tracer demo) skipped — see DEVIATIONS.md; T12 proceeded against the substrate as-is."
commits:
  - 448584a feat(T12): anchor-resolver — id-first + Bitap + SVG (data-anchor + bbox)
  - 7de7691 fix(T12): address code-review gaps — Bitap matchedLen + minor cleanups
files_touched:
  - plugins/pmos-toolkit/skills/comments/scripts/anchor-resolver.js
  - plugins/pmos-toolkit/skills/comments/tests/anchor.test.js
  - tests/scripts/assert_anchor_resolver.sh
  - plugins/pmos-toolkit/skills/comments/scripts/resolver.js
reviews:
  spec_compliance: pass
  code_quality: pass (after fix iteration; 1 Important re Bitap matchedLen — addressed)
verification:
  - "assert_anchor_resolver.sh: PASS 7/7 cases"
  - "assert_resolver_confirm_each.sh: PASS (T10 regression green)"
  - "assert_comments_js_unit.sh: PASS 15/15 (T7 substrate regression green)"
---

## T12 outcome

Canonical `resolveAnchor()` lands in `comments/scripts/anchor-resolver.js`. 4 distinct strategies — `id-first`, `quote-fallback` (exact-scan + dmp Bitap fuzzy fallback with prefix/suffix proximity bias), `svg-data-anchor`, `svg-bbox`. Returns `{strategy, dom_range, score, shape_id?, bbox?}` on hit or `{orphan: true, score}` on miss.

`resolver.js` now pre-validates each thread's anchor before subagent dispatch; orphans skip immediately with `error_enum: anchor_orphaned`, sparing the dispatch round-trip. `diagram_anchor` threaded through to subagent input.

## Key decisions

- **Strategy split (4 not 3):** `svg-data-anchor` and `svg-bbox` returned as distinct `strategy` values rather than a unified `svg`. Refinement, not contract violation — gives downstream UI/telemetry strictly more info.
- **Bitap matchedLen contract (post code-review fix):** `_bitapFind` threads back the actual matched span length (= probe.length, capped at 32 maxBits). `resolveAnchor` reads it for `dom_range.end_offset` rather than naively using full quote length. Prevents fuzzy-hit overshoot in downstream apply-edit consumers (T9 /spec shim, T18–T21 fanout).
- **T9 shim untouched:** Per the deliberate per-skill-vs-canonical split documented at T9 — each per-skill apply-edit script keeps its in-shim minimal resolver; T12 is the canonical resolver consumed by the orchestrator-side resolver controller.
- **Pre-dispatch orphan-skip:** Reasonable interpretation of plan Step 5 ("refactor T10 resolver.js to call resolveAnchor instead of its inline regex pass"). T10 had no inline anchor regex per se — only `_readMetaSkill` for the `<meta name="pmos:skill">` lookup. Pre-dispatch validation is the natural place to call `resolveAnchor()` in the controller.

## Reviewer findings

**Spec-compliance:** ✅ all 6 (now 7) sub-cases present; orphan shape correct; schema honored; dom_range non-empty (offset pair); 3 strategies present (4 with the SVG split refinement); Step 5 refactor accomplished without breaking T10 test; T9 shim correctly untouched.

**Code-quality, round 1:** 1 Important + 4 Minor. Important = Bitap MaxBits truncation overshoot (32-char probe but full quote length used for `end_offset`). 2 minors addressed inline (stale comment, brittle `=== 1.0` test assertion); 2 minors explicitly skipped per orchestrator guidance (`_enclosingSection` retained as scaffolding for T18–T21; `_proximityBonus` substring-anywhere semantics match spec wording).

**Code-quality, round 2 (post-fix):** PASS — fix chose option (c) thread-back-matchedLen; test (g) added (62-char quote, 1-char perturbation forces Bitap; asserts span < quote.length AND <= 32).

## Notes for downstream

The `matchedLen` contract is now part of `_bitapFind` and `_quoteFallback` return shapes. Any future strategy/scorer added under `_internal` should also return `matchedLen` so `resolveAnchor`'s `end_offset` computation stays correct. `resolveAnchor` falls back to `anchor.quote_anchor.text.length` if `matchedLen` is missing/zero (safety net, not silent fallback).
