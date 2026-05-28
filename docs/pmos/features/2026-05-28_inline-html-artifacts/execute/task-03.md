---
task_number: 3
task_name: "comments.js inline read + FR-14 detection + POST submit + 409 banner"
task_goal_hash: t3-comments-inline-detect-409
plan_path: "docs/pmos/features/2026-05-28_inline-html-artifacts/03_plan.html"
branch: "feat/inline-html-artifacts"
worktree_path: "/Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-html-artifacts"
status: done
started_at: 2026-05-28T00:45:00Z
completed_at: 2026-05-28T00:54:00Z
files_touched:
  - plugins/pmos-toolkit/skills/_shared/html-authoring/assets/comments.js
  - plugins/pmos-toolkit/skills/_shared/html-authoring/tests/comments-detect.test.js
---

## Summary

`comments.js` now hydrates `_state` from the sentinel-bracketed inline JSON block (`#pmos-comments`) at mount, replacing the sidecar fetch path. New helpers landed: `readInlineState()`, `detectMode()` (file:// short-circuit + AbortController-driven 500ms HEAD probe of `/save`), `postSubmit()` (POST `/save` with `expected_version` + version+1 payload on 200, 409 banner on conflict), `_hideComposeForReadOnly()`, `_renderConflictBanner()`. Legacy FSA / localStorage / Save-sidecar download paths left in place — T9 sweeps them. Existing thread-badge rendering unchanged. Public API exposes `detectMode` + a `__pmosTest` test hook so the jsdom harness can poke internals without coupling to private bindings.

## Verification

- `node plugins/pmos-toolkit/skills/_shared/html-authoring/tests/comments-detect.test.js` → all 4 detection-table cases + inline-hydrate + post-submit-200 + 409-banner PASS.
- Regression: `render.test.js` (T1) and `serve.save.test.js` (T2) still PASS.
- detectMode wiring matches FR-14: file:// returns 'read-only' without issuing fetch; otherwise AbortController + setTimeout(500) gate the HEAD; resolve → ok? read-write : read-only; reject (network or abort) → read-only.

## Spec refs

FR-13, FR-14, FR-15, FR-16, FR-17, E2, E3, E4, E5, E6, E11.

## Deviations from plan

- **comments.js delta: +214 LOC vs plan-stated ~120.** Bulk is the conflict-banner render helper, the read-only hint + compose-hide wiring, and the `__pmosTest` test hook (one extra line in prod gated on `window.__pmosTest === true`). Legacy paths untouched per scope. Not a blocker; flag for /verify code-review awareness.
- **jsdom version pin.** Plan staged jsdom@29 at `/tmp/pmos-jsdom`; node 20.10 on this machine hits `ERR_REQUIRE_ESM` inside jsdom@29's `html-encoding-sniffer`. Implementer also staged jsdom@22 at `/tmp/pmos-jsdom22` and the test resolves either path. /verify on a fresher node will use jsdom@29. CI/coverage gate (T11) needs to know about both candidates — surface to T11 author.
- **One extra "inline-hydrate" assertion** beyond the plan's 4+2 (validates `readInlineState()` directly). Cheap; net 6 → 7 test blocks.
- **Read-only compose-hide concrete:** `display:none` + `data-pmos-readonly` attribute + appended `.pmos-readonly-hint` element. Plan said "hide compose UI" generically — chose a testable rendering using already-inline T1 CSS.

## Concerns surfaced (non-blocking)

- The `__pmosTest` hook is a single guarded line in prod (`if (typeof window !== 'undefined' && window.__pmosTest) { window.__pmosTestHook = { detectMode, _state: () => _state }; }`). Acceptable for now; T11 could optionally strip it via a build flag, but NFR-07 (zero-deps) means no build step — leaving the guarded line is the pragmatic choice.
- Two staged jsdom versions in /tmp is operator-state, not repo-state. T11 coverage script needs to document the resolution chain.

## Next

T4 (re-emit preserves threads + bumps version) — depends on T1 only. Independent of T3's file (`render.js` vs `comments.js`); could parallelize but cadence stays sequential per current run discipline.
