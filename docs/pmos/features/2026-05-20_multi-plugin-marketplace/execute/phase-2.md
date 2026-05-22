---
phase_number: 2
phase_name: "/complete-dev generalization + pre-push extension"
tasks: [T4, T5, T6]
verify_status: passed
verify_scope: phase-inline
verified_at: 2026-05-22T10:55:00Z
commits: [7d77dda, 0d96aa2, T6-commit]
---

## Phase 2 — verified green

**Tasks landed:**
- T4 (7d77dda) — pre-push hook 3-way + tag rules + 4 tests
- T5 (0d96aa2) — /complete-dev --plugin arg + runtime diff_router.sh + 3 tests
- T6 (latest) — /complete-dev path templating + 4-manifest bump + namespaced tags + push-all-remotes + 2 tests

**Phase 2 acceptance tests (9 PASS):**
- assert_pre_push_3_way_version_match — PASS
- assert_pre_push_tag_format — PASS
- assert_pre_push_tag_version_match — PASS
- assert_pre_push_preserves_existing_tags — PASS
- assert_complete_dev_auto_detect — PASS
- assert_complete_dev_refuse_ambiguous — PASS
- assert_complete_dev_substrate_smart_detect — PASS
- assert_no_hardcoded_pmos_toolkit_path_in_complete_dev — PASS
- assert_skill_substrate_refs_unchanged — PASS (32 token refs, 0 hardcoded)

**Phase 1 regression (7 PASS):**
- assert_marketplace_json_schema, assert_sync_shared_* (4), assert_pre_commit_* (2) — all PASS.

**Pre-existing test failures (NOT regressions, confirmed pre-T6 via stash-and-rerun):**
- assert_survey_design_skill, assert_t39/t40/t41 — require fixture-repo /plan invocations unrelated to this feature.

**Phase 2 exit criteria** (per plan): "all 7 new tests in this phase exit 0" — actually 9 tests landed in this phase; all 9 pass. /complete-dev --plugin pmos-toolkit --dry-run was NOT executed (would require running the actual SKILL.md at chat-level); SKILL.md edits verified by grep + the 9 tests above.

Phase 2 sealed. Phase 3 next: T7 (CLAUDE.md edits), T8 (CONTRIBUTING.md).
