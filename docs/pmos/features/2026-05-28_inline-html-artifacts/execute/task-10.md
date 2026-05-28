---
task_number: 10
task_name: "Migration script + tests + drift-hook removal runbook entry"
task_goal_hash: t10-migration-script
plan_path: "docs/pmos/features/2026-05-28_inline-html-artifacts/03_plan.html"
branch: "feat/inline-html-artifacts"
worktree_path: "/Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-html-artifacts"
status: done
started_at: 2026-05-28T03:00:00Z
completed_at: 2026-05-28T03:25:00Z
files_touched:
  - scripts/migrate-sidecars-to-inline.sh
  - scripts/tests/migrate-sidecars-to-inline.test.sh
  - scripts/tests/fixtures/migration/a.html
  - scripts/tests/fixtures/migration/b.html
  - scripts/tests/fixtures/migration/b.html.comments.json
  - scripts/tests/fixtures/migration/c.html
  - scripts/tests/fixtures/migration/c.html.comments.json
  - scripts/install-comments-hooks.sh  # DELETED
  - docs/pmos/features/2026-05-28_inline-html-artifacts/execute/T10_migration_runbook.md
---

## Outcome

Three pieces landed together:
1. `scripts/migrate-sidecars-to-inline.sh` (~100 LOC bash, executable) — scans target directory for `*.comments.json`, injects each into the sibling artifact's inline `<script id="pmos-comments">` block, deletes the sidecar. `--dry-run` flag, idempotent, summary line.
2. `scripts/tests/migrate-sidecars-to-inline.test.sh` (~50 LOC bash) + 3-fixture pair set under `scripts/tests/fixtures/migration/` covering: (a) artifact already has inline block + no sidecar (untouched), (b) sidecar→inline standard path, (c) pre-feature artifact with no inline block (E13 missing-block injection).
3. `scripts/install-comments-hooks.sh` deleted; T10_migration_runbook.md documents the per-operator `.git/hooks/pre-commit` uninstall step (since `.git/hooks/` is per-clone).

## Key decisions / deviations

- **DEVIATION (node invocation).** Plan's Step 3 used a heredoc-style `node -e "…"` with template-literal-style escaping that interleaves bash and JS quoting. I rewrote it to use `node --input-type=module -e '…' "$sidecar" "$artifact"` — file paths come in as `process.argv[1]` / `[2]` rather than being interpolated into the JS source, which avoids the entire class of bugs where an artifact path containing a quote/dollar-sign would inject into the inline JS. Functionally identical; just safer.
- **DEVIATION (E13 fallback).** Plan's Step 3 used `html.replace('</body>', block + '</body>')` for both standard + missing-block cases. For an artifact with no `</body>` (truly minimal/malformed), that replace is a no-op — the inline block silently vanishes. Added an `if (html.includes('</body>'))` branch + EOF-append fallback so the E13 path is robust.
- **DEVIATION (test assertions).** Beefed up the test beyond the plan's substring matches:
  - Verify dry-run does NOT mutate (no `pmos-comments:start` appearing in b.html / c.html after dry-run).
  - Verify a.html still has exactly **one** inline block after the real run (the migration didn't accidentally double-inject).
  - Verify the migrated inline block carries the sidecar's thread ID (`fixb_t01`, `fixc_t01`) — proves payload survived the round-trip, not just that *some* block was injected.
- **Idempotency-recovery path.** If an artifact has an inline block AND a lingering sidecar (e.g., a previous run died mid-way), the script prints `cleaned-sidecar:` and deletes the sidecar only — counts as 1 migrated. This is the path that lets a failed/aborted prior run recover cleanly on the next invocation.
- **Drift-hook installer was deleted via `git rm`** before the commit so the file moves from tracked → tombstoned in the same commit (the plan's Step 7 explicit `git rm`).

## Verification

```
$ chmod +x scripts/migrate-sidecars-to-inline.sh
$ bash scripts/tests/migrate-sidecars-to-inline.test.sh
OK: dry-run announces b + c, leaves files untouched
OK: real run migrates b + c, preserves a, deletes sidecars, threads survive
OK: second run is a no-op
OK: migration test

$ test -x scripts/migrate-sidecars-to-inline.sh && echo OK exec
OK exec

$ ! [ -f scripts/install-comments-hooks.sh ] && echo OK installer gone
OK installer gone
```

