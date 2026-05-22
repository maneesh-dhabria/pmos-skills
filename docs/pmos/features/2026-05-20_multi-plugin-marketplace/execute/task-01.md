---
task_number: 1
task_name: "Marketplace manifests — rename + bump + Codex create + schema test"
task_goal_hash: pending
plan_path: "docs/pmos/features/2026-05-20_multi-plugin-marketplace/03_plan.html"
branch: "feat/multi-plugin-marketplace"
worktree_path: "/Users/maneeshdhabria/Desktop/Projects/agent-skills-multi-plugin-marketplace"
status: done
started_at: 2026-05-22T09:20:00Z
completed_at: 2026-05-22T09:35:00Z
commit: b76de64
files_touched:
  - .claude-plugin/marketplace.json
  - .codex-plugin/marketplace.json
  - tests/scripts/assert_marketplace_json_schema.sh
---

# T1 done

## Key decisions
- Anchor version 2.49.0 (from `plugins/pmos-toolkit/.claude-plugin/plugin.json`), per plan P7 — T11 bumps to 2.50.0 atomically.
- Codex manifest omits `$schema` (Codex docs don't publish one); structurally mirrors Claude Code manifest per Decision P2 / R6 mitigation.
- Homepage URL stays `https://github.com/maneesh-dhabria/pmos-toolkit` until T11.

## Deviations
None.

## TDD evidence
- Before impl: 3 FAILs (top-level name, plugins[pmos-toolkit].version, codex manifest does not parse), exit 1.
- After impl: `PASS: assert_marketplace_json_schema.sh (anchor=2.49.0)`, exit 0.

## Verification outcome
- `jq empty .claude-plugin/marketplace.json && jq empty .codex-plugin/marketplace.json` → OK
- `jq -r '.name' .claude-plugin/marketplace.json` → pmos-skills
- `jq -r '.plugins[0].version' .codex-plugin/marketplace.json` → 2.49.0
- `bash tests/scripts/assert_marketplace_json_schema.sh` → PASS, exit 0

## Review outcomes
- Spec-compliance reviewer: ✅ 8/8 checks passed, no gaps.
- Code-quality reviewer: ⚠️ approved-with-nits. Minor only: prefers `set -euo pipefail` over `set -e`; suggests `cd "$(git rev-parse --show-toplevel)"` CWD guard. Both FYI; not blockers per the plan's PASS criteria. Accepted as-is.

## Commit
`b76de64 feat(T1): multi-plugin marketplace manifests + schema test`
