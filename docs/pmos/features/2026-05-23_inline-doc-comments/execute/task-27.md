---
task_number: 27
task_name: "check-comments-coverage.sh + /verify gate integration + meta-test"
task_goal_hash: t27-check-coverage-script-verify-gate-meta-test
plan_path: docs/pmos/features/2026-05-23_inline-doc-comments/03_plan.html
branch: feat/inline-doc-comments
worktree_path: /Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-doc-comments
status: done
started_at: 2026-05-25T09:00:00Z
completed_at: 2026-05-25T09:30:00Z
implementer_commit: HEAD
files_touched:
  - scripts/check-comments-coverage.sh
  - plugins/pmos-toolkit/skills/verify/SKILL.md
  - tests/scripts/assert_check_comments_coverage.sh
---

## What was implemented

**`scripts/check-comments-coverage.sh`** (103 LOC, executable) — refined from spec §14.4 template with the 14th surface (/feature-sdlc orchestrator) + dual-surface emit refs. 4 check sections, read-only filesystem probes:

1. **Contract tests** — 13 originating skills + 1 orchestrator each must have `tests/apply-edit-at-anchor.test.js`. Missing → exit 1 + stderr `comments-coverage: FAIL — missing contract tests for: <list>`.
2. **Emit references** — each skill's subtree must mention `comments.js` (plain `'comments\.js'` grep; broader than spec template to handle prose-style asset-substrate blocks in SKILL.md). Orchestrator additionally requires both `00_pipeline.html` AND `00_open_questions_index.html` mentions in its SKILL.md. Missing → exit 1.
3. **Resolver integration test** (T17 ship-blocker) — `comments/tests/resolver.integration.test.js` must exist. Missing → exit 1.
4. **Calibration tests** (T26) — both `comments/tests/scorer.test.js` and `comments/tests/reanchor.integration.test.js` must exist. Missing → exit 1.

Success path stdout: `comments-coverage: PASS — 14 contract tests (13 skills + 1 orchestrator) + 15 emit references (13 skill + 2 orchestrator surfaces) + 1 resolver integration + 2 anchor calibration tests`.

**`verify/SKILL.md` gate integration**: new "Phase 7 Hard Gates" subsection added after the existing Phase 7 numbered checklist (before Phase 7.5 advisory drift check). One bullet invoking the coverage script; cites FR-62; documents that the bypass requires a spec amendment.

**Meta-test** (`tests/scripts/assert_check_comments_coverage.sh`, 195 LOC) — 4 sub-cases via ephemeral `mktemp -d` fixtures per case (trap-based cleanup; no cross-case state bleed):
- (A) golden — real repo → exit 0 + PASS line.
- (B) missing contract test for /requirements → exit 1 + grep-stderr.
- (C) missing comments.js emit reference for /ideate → exit 1 + grep-stderr.
- (D) missing `resolver.integration.test.js` → exit 1 + grep-stderr.

## Tests

All 4 PASS:
- Real-repo `bash scripts/check-comments-coverage.sh plugins/pmos-toolkit/skills` → PASS line, exit 0.
- `assert_check_comments_coverage.sh` — 4/4 sub-cases pass.
- T17 `assert_resolver_integration.sh` + T26 `assert_scorer_calibration.sh` regressions: green (no production code changed).

## Runtime evidence

N/A — read-only filesystem probes + ephemeral fixture meta-tests. Real-repo PASS line emitted at every invocation is the canonical evidence.

## Reviewer findings

**Combined spec + code-quality review:** **Spec ✅ + Quality Approved.**

- Spec: every section, dual-surface orchestrator check, /verify gate placement, all 4 meta-test sub-cases verified.
- Quality: 0 Critical, 0 Important, 3 Minor (cosmetic):
  1. Sub-case A captures `rc=$?` after a command-substitution under outer `set -e`; would abort if A failed (dormant in practice; B/C/D correctly wrap with `set +e`/`set -e`).
  2. Sub-case C grep alternation `'missing comments\.js|missing comments.js'` — equivalent under `-E`; harmless redundancy.
  3. `expected_skills` list hard-coded in both script and meta-test (DRY violation). Acceptable for a coverage gate where the list itself is the contract.

Strengths flagged: broader `'comments\.js'` grep defensible; orchestrator dual-surface tightening with explicit `00_pipeline.html` + `00_open_questions_index.html` greps; BASH_SOURCE-fallback + walk-up sentinel per CLAUDE.md; fixture-builder light-but-realistic (copies real SKILL.md when marker present, else inlines stub).

## Notes for downstream

- **The coverage gate is now live** in /verify Phase 7 Hard Gates. The next /verify run on this branch will exercise it.
- **T28 next:** manual smoke — launcher trio on macOS/Linux/Windows + Chrome E2E + Safari fallback. Realistically a documentation-heavy task (instructions for manual ops).
- **T29 final:** the catch-all verification task.
