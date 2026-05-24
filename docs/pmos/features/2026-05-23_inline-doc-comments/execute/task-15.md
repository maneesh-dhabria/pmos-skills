---
task_number: 15
task_name: "Clarification flow + re-dispatch cap=2 + branch extraction"
task_goal_hash: t15-clarify-cap-redispatch-cap-plus-extraction
plan_path: docs/pmos/features/2026-05-23_inline-doc-comments/03_plan.html
branch: feat/inline-doc-comments
worktree_path: /Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-doc-comments
status: done
started_at: 2026-05-24T22:50:00Z
completed_at: 2026-05-24T23:30:00Z
files_touched:
  - plugins/pmos-toolkit/skills/comments/scripts/resolver.js
  - plugins/pmos-toolkit/skills/comments/SKILL.md
  - plugins/pmos-toolkit/skills/comments/tests/resolver-clarify-redispatch.test.js
  - tests/scripts/assert_resolver_clarify.sh
implementer_commits:
  - 2bb0beb  # feat(T15): clarification cap=1 + re-dispatch cap=2 + branch extraction
  - 051e497  # fix(T15): address code-review gaps — empty refinement note + SKILL.md drift
---

## What was implemented

### Part A — Branch extraction (T14 reviewer mandate)

`_resolveSingleThread(thread, ctx, strategy)` shared helper (~109 LOC) consolidates the per-thread dispatch loop body across `confirm-each` / `--auto` / `--non-interactive`. Three thin wrappers call it in a loop; the `batch` branch is independent (different control flow — wave-planner-driven).

Strategy knobs: `{ promptOnSuccess, onClarification }`.

Cleanups (T14 Minor findings 1, 2, 4): `summaryA`/`summaryN`/`repoRootA`/`repoRootN` → plain `summary`/`repoRoot`; vestigial `while (outcome === null)` → clean `for (;;)`; 4-mode `if`-chain → `const VALID_MODES = new Set([...])`.

Net file size: `resolver.js` 817 → 724 lines (−93). Behavior unchanged (T10/T13/T14 regressions green).

### Part B — T15 features

- **FR-29 (clarification cap = 1):** `MAX_CLARIFY` 2 → 1 (was a pre-existing bug — FR-29 specs cap=1, code allowed 2). On 2nd clarification request from the subagent: append system message body `"clarification cap exceeded — operator input required"` (exported as `CLARIFY_CAP_EXCEEDED_BODY`), thread `status` stays `"open"`, `resolvedCount` not incremented, `askUser` not invoked.
- **S10 (re-dispatch cap = 2):** New `"Reject with refinement"` option on confirm-each post-success prompt. On each rejection: 2nd `askUser` captures the refinement note; if non-empty after trim → appended as `role: "user"` message, `redispatchCount++`, subagent re-dispatched; if empty/whitespace → treated as a regular Reject (skipped reason `"operator_reject_empty_refinement"`, no re-dispatch, no counter increment).
- **E10 (3rd presentation):** After 2 rejections, the option list collapses to exactly `["Modify", "Skip"]` (no Re-dispatch).

Mode coverage: confirm-each gets the full flow; `--auto` inherits the clarification cap but has no post-success prompt; `--non-interactive` defers on any clarification (cap irrelevant); `--batch` unchanged.

## Tests

- New: `plugins/pmos-toolkit/skills/comments/tests/resolver-clarify-redispatch.test.js` — 4 sub-cases (originally 3 per plan Step 1; added (d) for the empty-refinement-note edge case during fix loop).
- New: `tests/scripts/assert_resolver_clarify.sh` — BASH_SOURCE-fallback + walk-up boilerplate per `assert_resolver_confirm_each.sh`.
- All 5 test suites (clarify, modes, confirm-each, wave-planner, anchor-resolver) green at completion.

## Runtime evidence

N/A — pure library code; no API/UI surface. Test sub-cases (a)–(d) exercise the new flow end-to-end against the T9 spec fixture with mocked `dispatchSubagent`/`askUser`/`runGit`.

## Reviewer findings

**Spec-compliance (round 1):** ✅ — all FR-29 / S10 / E10 invariants verified by direct code inspection; 3 plan sub-cases present with required assertions (byte-exact system message via exported constant; `deepStrictEqual` on options array).

**Code-quality (round 1):** **Changes required** — 0 Critical, 2 Important, 4 Minor:
1. *Important:* "Reject with refinement" with empty/whitespace note silently re-dispatched and burned a `redispatchCount`. **→ FIXED in commit fix(T15).**
2. *Important:* SKILL.md lines 44/78/84 still documented pre-T15 `MAX_CLARIFY=2` and conflated clarification cap with re-dispatch cap. **→ FIXED in commit fix(T15).**
3. *Minor:* `MAX_REDISPATCH` not exported (symmetry with `MAX_CLARIFY`). **Deferred to T16.**
4. *Minor:* Dead strategy knob `checkAnchorAlways` documented but never read. **Deferred to T16.**
5. *Minor:* `promptOptions` allocated inside `for (;;)` every iteration. **Deferred to T16.**
6. *Minor:* Test (a) askUser mock branches on options content rather than call ordinality. **Deferred to T16.**

**Code-quality (round 2 — post-fix):** **Approved.** Important #1 + #2 fixed; new test sub-case (d) covers the empty-note path; SKILL.md doc-drift resolved on all 3 lines; 5 test suites green.

## Notes for downstream

- **T16 owes** the 4 deferred Minors from the T15 code-quality review (export `MAX_REDISPATCH`; remove/implement the `checkAnchorAlways` dead knob; consider `_buildPromptOptions(redispatchCount)` extraction if T16 adds more option shapes; tighten the (a) askUser mock to ordinality-based dispatch).
- **`_resolveSingleThread` extracted** — future per-mode behavior tweaks (T16, T17) can land as strategy-knob additions rather than another 100-line copy.
- The `Accept`/`Reject`/`Modify`/`Skip` legacy options remain; `"Reject with refinement"` is an ADDITION, slotted before `"Skip"` while `redispatchCount < MAX_REDISPATCH`.
