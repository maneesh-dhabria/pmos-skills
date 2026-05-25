---
task_number: 25
task_name: "Pre-commit comments-drift hook + installer + conventions §7"
task_goal_hash: t25-pre-commit-drift-hook-installer-conventions
plan_path: docs/pmos/features/2026-05-23_inline-doc-comments/03_plan.html
branch: feat/inline-doc-comments
worktree_path: /Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-doc-comments
status: done
started_at: 2026-05-25T07:10:00Z
completed_at: 2026-05-25T07:45:00Z
implementer_commit: HEAD
files_touched:
  - .githooks/pre-commit
  - .githooks/pre-commit-comments-drift
  - scripts/install-comments-hooks.sh
  - plugins/pmos-toolkit/skills/_shared/html-authoring/conventions.md
  - tests/scripts/assert_comments_drift_hook.sh
---

## What was implemented

**Hook** (`.githooks/pre-commit-comments-drift`): iterates `git diff --cached --name-only` filtered to `docs/pmos/*.html` and `docs/pmos/*.comments.json`; for each staged HTML, asserts its sibling `.comments.json` is also staged when it exists on disk; for each staged sidecar, asserts its sibling `.html`/`.htm` is staged. Mismatch → exit 1 with grep-able stderr `comments-drift: <path> is staged but its sibling <sibling> is not`. `grep -qFx` (fixed-string + full-line) used to prevent regex-meta false matches.

**Installer** (`scripts/install-comments-hooks.sh`): idempotent. Conditionally sets `git config core.hooksPath = .githooks`. `chmod +x` the sub-hook. Guard: `grep -q "pre-commit-comments-drift" .githooks/pre-commit`; if absent, `awk` rewrites the hook inserting a source block AFTER `set -euo pipefail` (short-circuits before the existing `_shared/` drift check + `exit $fail`). Re-runnable; second run is a no-op.

**`.githooks/pre-commit` modification:** the installer-injected source block calls the sub-hook with `|| exit $?` semantics. Existing `_shared/` drift logic + `exit $fail` tail preserved byte-exact. `$?` inside the awk-generated `print "..."` survives correctly as a literal two-character sequence → real shell parameter expansion in the emitted hook.

**`conventions.md` §7** ("Comments sidecar pair convention"): documents the `git mv` lockstep requirement, FR-15 drift-hook enforcement, and `--no-verify` bypass per S5. Points operators at `scripts/install-comments-hooks.sh` for one-time install.

## Tests

`tests/scripts/assert_comments_drift_hook.sh` — 5 sub-cases, each in an ephemeral `mktemp -d` repo:
- (A) staged HTML, unstaged sibling sidecar → exit 1 + grep-stderr ✓
- (B) both staged → exit 0 ✓
- (D) installer idempotency — source block appears exactly once after two install runs ✓
- (E) non-`docs/pmos/` staged file → exit 0 (hook no-op) ✓
- (F) sidecar staged, HTML deleted on disk → exit 0 (no sibling to require) ✓

(C) `--no-verify` is fully a git-layer bypass; the hook needs no logic for it.

Regressions green:
- `assert_pre_commit_drift_detected.sh` (existing `_shared/` drift hook)
- `assert_pre_commit_short_circuit.sh` (existing short-circuit logic)

## Runtime evidence

N/A — pure shell hook + installer. Tests exercise the hook directly against ephemeral repos.

## Reviewer findings

**Combined spec + code-quality review:** **Spec ✅ + Quality Approved.**

- Spec: all deliverables present + behavior verified by sub-case A/B/D/E/F + regression on existing `_shared/` drift hook.
- Quality: 0 Critical, 0 Important, 2 Minor + 1 Nit:
  1. `while IFS= read -r ... <<< "$VAR"` with empty `$VAR` produces one iteration with empty value; guarded by `[ -z "$x" ] && continue`. Belt-and-suspenders given upstream `grep -E … || true`; fine.
  2. `git config core.hooksPath` conditional (only set when not already `.githooks`). Already correct in the implementation.
  3. *Nit:* `chmod +x` runs unconditionally — idempotent, no concern.

Strengths flagged: `grep -qFx` defensive matching; awk source-block insertion correctness (`$?` survives as literal); test harness uses BASH_SOURCE-fallback + walk-up per CLAUDE.md.

## Notes for downstream

- **Installer is documented in conventions.md §7** — operators see it before /verify Phase 7.
- **Hook is now active in this repo** after the implementer ran the installer during test setup. New commits on this branch must pass both `_shared/` drift + comments-drift. Verified: this very commit passes both.
- **T26 next:** anchor calibration corpus (50-span fixture + Bitap threshold tune + re-anchor integration test).
- **`--no-verify` carve-out:** spec S5 documents the bypass as intentional for unusual archive/migration scenarios. Operators using it should record the rationale in commit message.
