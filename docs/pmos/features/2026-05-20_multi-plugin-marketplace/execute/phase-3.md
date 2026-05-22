---
phase_number: 3
phase_name: "Policy docs — CLAUDE.md edits + CONTRIBUTING.md"
tasks: [T7, T8]
verify_status: passed
verify_scope: phase-inline
verified_at: 2026-05-22T11:30:00Z
commits: [5217425, 9a6d010, 0a8ad22, 197169c, cdf18ef]
---

## Phase 3 — verified green

**Tasks landed:**
- T7 (5217425, fixup 0a8ad22) — CLAUDE.md generalized (FR-70/71/72/73) + new ## Release policy section (FR-74, 6 subsections) + 2 grep tests (FR-75)
- T8 (9a6d010, fixup 197169c) — CONTRIBUTING.md (NEW, 61 lines) + .githooks/README.md extended with pre-commit drift + pre-push 4-manifest contract sections
- Task logs (cdf18ef) — T7/T8 logs with spec/quality review notes

**Phase 3 acceptance tests (2 new PASS):**
- assert_claude_md_generalized — PASS (10 templated refs, 0 unauthorized hardcoded, 1 marker block)
- assert_release_policy_section — PASS (heading + 6 subsections all present)

**T8 inline-verification greps (all exit 0):**
- `core.hooksPath .githooks` found in CONTRIBUTING.md
- `brew install jq` / `apt install jq` / `dnf install jq` — all three present
- `pre-commit` and `pre-push` both present in `.githooks/README.md`

**Phase 1/2 regression (no new failures):**
Full sweep: 30 PASS, 4 FAIL. All 4 FAIL are pre-existing (not introduced by Phase 3):
- `assert_survey_design_skill.sh` — pinned to v2.36.0 plugin.json (current is 2.49.0); drift unrelated to marketplace work
- `assert_t39/t40/t41.sh` — fixture-based /plan tests; expect plan files under `tests/fixtures/repos/python/docs/pmos/features/2026-05-09_fixture-bugfix/` that aren't produced in this run

**Spec-review findings (carried forward to /verify):**
- T7: Plugins list lists only `pmos-toolkit`; spec FR-74 literal also names `pmos-learnkit`. Plan §T7 Step 4 explicitly specified single-entry. `pmos-learnkit` not scaffolded — deferred.
- T8: jq-missing stderr string drift between spec FR-45 and `.githooks/pre-push:23`. Cross-task issue (T4 hook vs T8 doc); deferred to /verify.

**Code-quality review findings (applied):**
- T7: `grep -c ... || echo 0` antipattern caused noisy stderr on no-match. Fixed to `|| true` (commit 0a8ad22).
- T8: "3-way version + tag" header was inconsistent with the body's 4 manifests. Renamed to "4-manifest" in both CONTRIBUTING.md and .githooks/README.md (commit 197169c).

**Phase exit criteria met:**
- `grep '## Release policy' CLAUDE.md` returns the heading ✓
- `cat CONTRIBUTING.md` documents `core.hooksPath` + jq prereqs ✓

**Next:** HALT for compact. Phase 4 (Cutover — T9 verify sweep, T10 new repo + remote rename, T11 dogfood release + archive) is destructive and requires explicit user buy-in plus a fresh context window.
