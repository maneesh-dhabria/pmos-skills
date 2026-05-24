---
task_number: 16
task_name: "error_enum closed-set + idempotency + schema-version refuse-load"
task_goal_hash: t16-error-enum-idempotency-schema-refuse
plan_path: docs/pmos/features/2026-05-23_inline-doc-comments/03_plan.html
branch: feat/inline-doc-comments
worktree_path: /Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-doc-comments
status: done
started_at: 2026-05-24T23:35:00Z
completed_at: 2026-05-25T00:05:00Z
files_touched:
  - plugins/pmos-toolkit/skills/comments/scripts/resolver.js
  - plugins/pmos-toolkit/skills/comments/scripts/cli.js
  - plugins/pmos-toolkit/skills/comments/tests/schema.test.js
  - plugins/pmos-toolkit/skills/comments/tests/resolver-clarify-redispatch.test.js
  - tests/scripts/assert_schema.sh
  - tests/scripts/schema-version-refuse.test.sh
  - tests/scripts/assert_schema_version_refuse.sh
implementer_commits:
  - 6791754  # feat(T16): error_enum closed-set + idempotency + schema refuse-load
  - 695de9b  # fix(T16): schema-version refuse — throw not exit; cli.js translates
---

## What was implemented

### Part A — T16 features

**error_enum closed-set (§9.2, FR-NEW-B):** 4 enum values all handled. Every failure-path branch appends a `role:"system"` message before pushing to `skipped[]`; thread `status` stays `"open"`; resolver continues.
- `anchor_orphaned` — both pre-validate (resolver-side) and subagent-returned paths; system_reply prefixed with the spec's suggested-action ("re-anchor the thread or close it manually").
- `edit_conflicted` (NEW path) — `console.warn("resolver: WARNING wave-planner bug — same-wave threads modified overlapping ranges: thread=<id>")` then standard failure skip.
- `agent_judged_infeasible` — rationale + suggested next action propagated via system_reply into the skipped reason + system message.
- `agent_errored` — already wrapped via try/catch from earlier tasks; now also appends a system message for consistency.

**§9.3 idempotency (semantic-match):** `_semanticMatchScore(userMessageBody, anchoredRegionText)` lowercases + tokenizes on `/[\s\p{P}]+/u`, strips ~150-word `STOPWORDS` set, returns `keywordsFound / keywordsTotal` (substring match in region). Pre-dispatch short-circuit: score ≥ 0.80 → no-op (status="resolved", system message `"Edit already present in artifact; marking resolved without changes."`, subagent NOT dispatched). Score in [0.60, 0.80) → dispatch normally (no short-circuit). Score < 0.60 → dispatch normally. Text anchors only — SVG anchors skip the check. `STOPWORDS` + `_semanticMatchScore` exported under `_internal` for testability.

**schema-version refuse-load (E4 / S3):** `CURRENT_SCHEMA_VERSION = 1` exported. On `sidecar.schema_version > CURRENT`: **throws** `Error` with `.code = "ESCHEMA_NEWER"` and `.exitCode = 64`. `cli.js` catches errors with `.exitCode` set and translates to `"comments-resolver: <message>"` on stderr + `process.exit(err.exitCode)`. Generic errors keep the existing exit-1 behavior. `< CURRENT` → continue (back-compat shim slot, empty at v1).

### Part B — T15 deferred Minors (subsumed)

1. `MAX_REDISPATCH` exported (symmetry with `MAX_CLARIFY`).
2. Dead strategy knob `checkAnchorAlways` removed from `_resolveSingleThread`'s JSDoc + comments.
3. `_buildPromptOptions(redispatchCount, maxRedispatch)` extracted; replaces per-iteration inline allocation; returns the 5-option list under cap, `["Modify", "Skip"]` over.
4. `resolver-clarify-redispatch.test.js` `askUser` mocks (sub-cases a/d) refactored from `options.indexOf("Accept") !== -1` branching to ordinality-based `askCallNumber` switch.

## Tests

- New: `plugins/pmos-toolkit/skills/comments/tests/schema.test.js` — in-process: semantic-match unit + (a) anchor_orphaned + (b) agent_judged_infeasible + (c) agent_errored + (d) edit_conflicted + (e1/e2/e3) idempotency + schema_version=1 pass-through + (post-fix) schema_version=99 throws ESCHEMA_NEWER with exitCode=64.
- New: `tests/scripts/schema-version-refuse.test.sh` — out-of-process: invokes `cli.js resolve <artifact> --confirm-each` against a schema_version=99 sidecar; asserts exit 64 + stderr grep-pattern.
- All 7 test suites green at completion.

## Runtime evidence

N/A — pure library code; no API/UI surface. In-process sub-cases exercise all error_enum branches + semantic-match thresholds + schema-refuse throw. Out-of-process sub-case (f) exercises the end-to-end throw→cli.js translate→exit 64 chain.

## Reviewer findings

**Spec-compliance (round 1):** ✅ — every error_enum branch verified by code inspection; semantic-match thresholds (≥0.80, [0.60, 0.80), <0.60) correct; schema-refuse stderr bytes byte-exact in round 1 (later moved into the thrown Error message per the round-1 quality fix); all 4 Part B carryovers confirmed.

**Code-quality (round 1):** **Changes required** — 0 Critical, 1 Important, 6 Minor:
1. *Important:* `process.exit(64)` inside `resolver.js` library code violates the file's throw-then-translate convention; makes `resolve()` un-callable from non-CLI hosts. **→ FIXED in commit fix(T16).**
2. *Minor:* STOPWORDS literal has 233 entries but Set dedupes to 225 (10 duplicates). **Deferred to T17.**
3. *Minor:* Substring match in `_semanticMatchScore` (vs word-boundary) — `user` matches `username`. Spec-acceptable but worth a comment. **Deferred to T17.**
4. *Minor:* id-anchored semantic-match is meaningless when `pre.dom_range` covers only the 12-char `id="..."` slice; could cheaply guard `if (anchoredText.length < 40)`. **Deferred to T17.**
5. *Minor:* `console.warn` on `edit_conflicted` only fires in `_resolveSingleThread`; batch-path symmetric warning omitted. **Acceptable per implementer's note; deferred.**
6. *Minor:* `_buildPromptOptions(redispatchCount, maxRedispatch)` over-abstracted (helper is module-private, constant module-level). **Keep; trivially unit-testable.**
7. *Minor:* `resolver.js` at 864 LOC approaching unwieldy; STOPWORDS literal (35 lines) candidate for `scripts/stopwords.js` extraction. **Deferred.**

**Code-quality (round 2 — post-fix):** **Approved.** Throw shape correct (`.code="ESCHEMA_NEWER"`, `.exitCode=64`); cli.js catch-block routing clean (exitCode-present vs generic); new in-process `assert.rejects` sub-case present; schema-version-refuse.test.sh now invokes cli.js end-to-end; 7 suites green.

## Notes for downstream

- **T17 owes** the 4 deferred Minors clustered around semantic-match (STOPWORDS dedupe; substring-vs-word-boundary comment; <40-char anchor guard; possible `scripts/stopwords.js` extraction).
- **cli.js error-translation contract** — any future thrown error with a `.exitCode` numeric property is automatically translated. `ESCHEMA_NEWER` is the first; T17+ may add more (e.g., `EBADSIDECAR` for malformed JSON).
- **`resolver.js` size** at 864 LOC; the STOPWORDS literal is the cheapest extraction candidate when the file next needs trimming.
