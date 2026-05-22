---
task_number: 4
task_name: ".githooks/pre-push extension + 4 tests"
task_goal_hash: t4-pre-push-multi-plugin
plan_path: docs/pmos/features/2026-05-20_multi-plugin-marketplace/03_plan.html
branch: feat/multi-plugin-marketplace
worktree_path: /Users/maneeshdhabria/Desktop/Projects/agent-skills-multi-plugin-marketplace
status: done
started_at: 2026-05-22T10:00:00Z
completed_at: 2026-05-22T10:15:00Z
files_touched:
  - .githooks/pre-push
  - tests/scripts/assert_pre_push_3_way_version_match.sh
  - tests/scripts/assert_pre_push_tag_format.sh
  - tests/scripts/assert_pre_push_tag_version_match.sh
  - tests/scripts/assert_pre_push_preserves_existing_tags.sh
  - tests/fixtures/multi-plugin/pre-push/{3-way,tag-format,tag-version,existing-tags}/...
---

## T4 — pre-push hook 3-way + tag rules

**Decisions:**
- jq availability gate placed at the top of the new block (after L22) per FR-45 — preserves L1-22 verbatim per FR-46a.
- Tag-validation block sits *outside* the `while read` loop because tag checks are invocation-scoped (tags pointed at HEAD), not ref-scoped.
- 3-way marketplace check sits *inside* the existing `for plugin in $plugins` loop at L41 (FR-46a "extend, don't rewrite") — single jq call per plugin per manifest.
- `git ls-remote --tags origin 2>/dev/null || true` degrades gracefully when no origin configured (fresh fixture repos for tag-format/tag-version tests).

**LOC budget:** 28 added (cap 40); total 104 LOC (cap 116).

**Verification:**
- All 4 new tests PASS.
- No regression: assert_pre_commit_*, assert_sync_shared_*, assert_marketplace_json_schema all PASS.
