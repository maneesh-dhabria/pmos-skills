---
task_number: 6
task_name: "/complete-dev path templating + 3-way version-bump + tag format + push-all-remotes + 2 tests"
task_goal_hash: t6-complete-dev-templating
plan_path: docs/pmos/features/2026-05-20_multi-plugin-marketplace/03_plan.html
branch: feat/multi-plugin-marketplace
worktree_path: /Users/maneeshdhabria/Desktop/Projects/agent-skills-multi-plugin-marketplace
status: done
started_at: 2026-05-22T10:31:00Z
completed_at: 2026-05-22T10:50:00Z
files_touched:
  - plugins/pmos-toolkit/skills/complete-dev/SKILL.md
  - tests/scripts/assert_no_hardcoded_pmos_toolkit_path_in_complete_dev.sh
  - tests/scripts/assert_skill_substrate_refs_unchanged.sh
---

## T6 — /complete-dev templating + 4-manifest bump + namespaced tag + push-all-remotes

**Decisions:**
- Actual hardcoded-site count was 12, not 14 (plan reference based on pre-T5 line numbers; file shrank/shifted post-T5). All 12 replaced; zero `<!-- allow-hardcoded -->` blocks needed.
- Line-178 legacy fallback rephrased to `${plugin_name} default = sole entry under plugins/, or pmos-toolkit when ambiguous` — preserves single-plugin back-compat without a hardcoded path.
- Phase 9 version-bump now uses atomic jq write-and-rename across 4 targets (2× plugin.json + 2× marketplace.json plugins[].version, FR-57). Cross-references pre-push 3-way hook (T4).
- Phase 13/15/15.5/16/17 tag handling uses `${plugin_name}/v<version>` everywhere (FR-58).
- Phase 15/16 publish: `for remote in $(git remote)` loop with per-remote warn-and-continue (FR-59); origin first, origin failure still aborts.
- Phase 14 --dry-run summary shows plugin, 4 bump targets, templated tag, every-remote push-targets (FR-60).
- Substrate refs `${CLAUDE_PLUGIN_ROOT}/skills/_shared`: 32 (floor 28) — untouched.

**Verification:**
- 2/2 new tests PASS. `grep -c '\${plugin_name}' SKILL.md` = 32.
- 28/32 existing tests PASS; 4 pre-existing failures (assert_survey_design_skill, assert_t39/t40/t41) confirmed pre-T6 by stash-and-rerun — they require fixture-repo /plan invocations that aren't T6-related.
