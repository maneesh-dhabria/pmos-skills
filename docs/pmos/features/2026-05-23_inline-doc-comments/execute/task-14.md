---
task_number: 14
task_name: "--auto and --non-interactive resolver modes"
task_goal_hash: t14-auto-noninteractive-modes
plan_path: docs/pmos/features/2026-05-23_inline-doc-comments/03_plan.html
branch: feat/inline-doc-comments
worktree_path: /Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-doc-comments
status: done
started_at: 2026-05-24T22:30:00Z
completed_at: 2026-05-24T22:45:00Z
files_touched:
  - plugins/pmos-toolkit/skills/comments/scripts/resolver.js
  - plugins/pmos-toolkit/skills/comments/tests/resolver-modes.test.js
  - tests/scripts/assert_resolver_modes.sh
implementer_commit: a1c1a67
---

## What was implemented

Two new resolver modes on the existing `mode === "confirm-each"` / `"batch"` allowlist:

- **`--auto` (FR-26)** — same dispatch + clarification loop as confirm-each, post-success Accept/Reject prompt skipped. Clarification path STILL prompts (cap=`MAX_CLARIFY=2`).
- **`--non-interactive` (FR-32, S12)** — apply on success without prompting; on clarification, append a `role:"system"` message with body exactly `"deferred — operator input required (re-run interactively for this thread)"`, leave `status: open`, record `thread.id` in `deferred[]`. End-of-run summary lists deferred; return object exposes a `deferred: [...]` field parallel to `skipped`.

Mode guard updated from 2-mode to 4-mode allowlist with explicit valid-list in the error message.

## Tests

- New: `plugins/pmos-toolkit/skills/comments/tests/resolver-modes.test.js` — 4 sub-cases per plan Step 1; all PASS.
- New: `tests/scripts/assert_resolver_modes.sh` — repo-walk-up boilerplate per `assert_resolver_confirm_each.sh`; PASSes from `/tmp` cwd.
- Regression: `assert_resolver_confirm_each.sh`, `assert_wave_planner.sh`, `assert_anchor_resolver.sh` — all green (confirm-each and batch branches untouched byte-for-byte).

## Runtime evidence

N/A — pure library code; no API or UI surface. Test sub-cases (a)–(d) exercise the new branches end-to-end against the T9 spec fixture with mocked `dispatchSubagent`/`askUser`/`runGit`.

## Key decisions

- **Two new branches, not a refactor of confirm-each.** The plan's TODO at `resolver.js:172` calls for a `_resolveBatch`/`_resolveConfirmEach`/`_resolveAuto` extraction once T14's modes land. Implementer left that TODO marker untouched — extraction is deferred to a follow-up cleanup task (post-T14, candidate for T17 or a dedicated refactor task). Three nearly-identical 100-line branches is the deliberate intermediate state.
- **`deferred: [...]` field on the return object.** Parallel to `skipped`. Tests assert against the structured field rather than parsing stdout; the printed summary mirrors the field.
- **System message body is byte-exact.** `"deferred — operator input required (re-run interactively for this thread)"` — verbatim from FR-32 spec text. Test (c) substring-asserts the exact string.
- **`--auto` clarification path preserved.** Per FR-26's explicit carve-out ("AskUserQuestion-based clarification still surfaces — --auto applies confidently-resolved edits only, not ambiguous ones"). Distinguishes `--auto` from `--non-interactive`.

## Reviewer findings

**Spec-compliance** (round 1): ✅ All FR-26 / FR-32 / S12 invariants verified by direct code inspection; 4 plan sub-cases present with required assertions; byte-exact deferred message; invariants (sidecar serializer, single `git add`, never `git commit`, T10+T13 branches untouched) preserved.

**Code-quality** (round 1): **Approved** — 0 Critical, 0 Important, 4 Minor (all explicitly deferrable per the reviewer):

1. `resolver.js:535` — vestigial `while (outcome === null)` loop in the non-interactive branch; every path sets `outcome` and `break`s and `body` is `const` → could collapse to a straight-line block. Cosmetic; copy-paste artifact from `--auto`.
2. `resolver.js:499, 519, 617, 643` — `summaryA`/`summaryN`/`repoRootA`/`repoRootN` suffixing is unnecessary (each branch returns before the post-loop scope where `summary`/`repoRoot` would collide). Rename for symmetry → deferred to extraction (point 3).
3. `resolver.js:400-645` — `--auto` and `--non-interactive` are each ~115 lines and ~85% byte-identical to `confirm-each`'s dispatch loop. Third near-duplicate after T13's `batch`. Pre-existing TODO at `resolver.js:172` already calls for `_resolveBatch`/`_resolveConfirmEach`/`_resolveAuto` extraction. **Reviewer verdict: acceptable as intermediate state; the next mode/feature touching this file MUST do the extraction before adding a fourth copy.**
4. `resolver.js:131-141` — 4-mode `if`-chain ripe for `const VALID_MODES = new Set([...])`. Nit.

(Test-side nit: stdout monkey-patch try/finally structure in sub-case (d) is currently correct but fragile if a future edit adds another throw path before `finally`.)

## Notes for downstream

- **T15 (clarification flow + cap=2)** already has its mechanics in place via `MAX_CLARIFY` and the existing clarification re-dispatch loop in confirm-each + auto. T15 will tighten the contract / add the explicit cap-exceeded test cases and ensure `--non-interactive` clarification handling matches the cap semantics (current non-interactive defers on the FIRST clarification — no cap involved, matches FR-32 verbatim).
- **`_resolve<Mode>` extraction** — picked up the T13 deferral; now owes the next mode-touching task. T15 modifies the clarification flow inside the loop body, so a natural extraction trigger.
- **`assert_resolver_modes.sh`** registered in `tests/scripts/`; `/verify` Phase 7 will pick it up via the standard test-suite invocation.

