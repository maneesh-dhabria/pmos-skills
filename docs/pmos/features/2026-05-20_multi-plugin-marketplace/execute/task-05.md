---
task_number: 5
task_name: "/complete-dev arg parsing + diff-routing + 3 tests"
task_goal_hash: t5-complete-dev-plugin-arg
plan_path: docs/pmos/features/2026-05-20_multi-plugin-marketplace/03_plan.html
branch: feat/multi-plugin-marketplace
worktree_path: /Users/maneeshdhabria/Desktop/Projects/agent-skills-multi-plugin-marketplace
status: done
started_at: 2026-05-22T10:16:00Z
completed_at: 2026-05-22T10:30:00Z
files_touched:
  - plugins/pmos-toolkit/skills/complete-dev/SKILL.md
  - plugins/pmos-toolkit/skills/complete-dev/scripts/diff_router.sh
  - tests/scripts/assert_complete_dev_auto_detect.sh
  - tests/scripts/assert_complete_dev_refuse_ambiguous.sh
  - tests/scripts/assert_complete_dev_substrate_smart_detect.sh
  - tests/fixtures/multi-plugin/complete-dev/{auto-detect,refuse-ambiguous,substrate-smart-detect}/...
---

## T5 — /complete-dev --plugin arg + diff_router.sh

**Decisions:**
- diff_router.sh is production code (per P6), invoked by SKILL.md Phase 0 at runtime via `bash ${CLAUDE_PLUGIN_ROOT}/skills/complete-dev/scripts/diff_router.sh`.
- 28 LOC; reads both staged + unstaged diff; defensive `|| true` on grep filters.
- E10 (unknown --plugin) + E15 (CLAUDE.md-only diff) handled as prose instructions in SKILL.md; `## Release policy` parser is prose (warn-but-proceed), no helper.
- T6's path-templating scope strictly preserved — no hardcoded `pmos-toolkit/` references touched.

**Verification:**
- 3/3 new tests PASS. FR-50..FR-55 cited (6 occurrences). argument-hint includes `[--plugin <name>]`.
- No regression: 14 existing tests still PASS.
