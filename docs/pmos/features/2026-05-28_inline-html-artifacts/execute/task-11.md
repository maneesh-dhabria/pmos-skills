---
task_number: 11
task_name: "Update check-comments-coverage.sh"
task_goal_hash: t11-coverage-gate
plan_path: "docs/pmos/features/2026-05-28_inline-html-artifacts/03_plan.html"
branch: "feat/inline-html-artifacts"
worktree_path: "/Users/maneeshdhabria/Desktop/Projects/agent-skills-inline-html-artifacts"
status: done
started_at: 2026-05-28T03:30:00Z
completed_at: 2026-05-28T03:35:00Z
files_touched:
  - scripts/check-comments-coverage.sh
---

## Outcome

Added an NFR-03 size soft-warn block to `scripts/check-comments-coverage.sh`. The block walks every `docs/pmos/**/*.html`, extracts the inline `pmos-comments:start … pmos-comments:end` region via `awk`, measures bytes via `wc -c`, and prints a `WARN:` line to stderr when an artifact's block exceeds 200 KiB. The warn is non-fatal (exit code unchanged) — it surfaces the budget breach without stalling the verify pipeline.

## Key decisions / deviations

- **DEVIATION (no blocks to remove).** Plan Step 2 said "Remove the 3 blocks — FSA fallback / drift hook / localStorage". Inspection shows the script never carried those blocks in the first place: its 4 checks were always (a) 14 contract tests, (b) 15 emit references, (c) resolver integration test, (d) calibration scorer + reanchor tests. The grep verification `! grep -n "FSA|fsa|drift.hook|localStorage"` passes trivially. The plan's removal step was anticipating an earlier shape of the script that never landed. Documenting the deviation; no work to do for Step 2.
- **Soft-warn to stderr, not stdout.** Stdout is reserved for the single `PASS` summary line (parsable by /verify Phase 5). Pushing the WARN to stderr keeps stdout machine-readable.
- **`if [[ -d docs/pmos ]]` guard.** The script accepts a `ROOT` arg pointing into `plugins/pmos-toolkit/skills`, so the NFR-03 block — which always looks at `docs/pmos` — is guarded so it cleanly no-ops when run from a worktree that doesn't have the docs tree present.
- **200 KiB ceiling.** Plan snippet said `LIMIT=204800` (= 200 × 1024). Kept as-is. NFR-03 in the spec sets the inline-block soft ceiling; 200 KiB matches roughly 1000 average-length threads, which is where review fatigue dominates well before a network/parse penalty does.

## Verification

```
$ bash scripts/check-comments-coverage.sh
comments-coverage: PASS — 14 contract tests (13 skills + 1 orchestrator) + 15 emit references (13 skill + 2 orchestrator surfaces) + 1 resolver integration + 2 anchor calibration tests

$ grep -nE "FSA|fsa|drift.hook|localStorage" scripts/check-comments-coverage.sh
(no matches — exit 1)
```

