---
task_number: 8
task_name: "CONTRIBUTING.md (NEW) + .githooks/README.md extended"
task_goal_hash: t8-contributing-githooks-readme
plan_path: docs/pmos/features/2026-05-20_multi-plugin-marketplace/03_plan.html
branch: feat/multi-plugin-marketplace
worktree_path: /Users/maneeshdhabria/Desktop/Projects/agent-skills-multi-plugin-marketplace
status: done
started_at: 2026-05-22T11:05:00Z
completed_at: 2026-05-22T11:20:00Z
files_touched:
  - CONTRIBUTING.md
  - .githooks/README.md
---

## T8 — CONTRIBUTING.md + .githooks/README.md hook contracts

**Decisions:**
- Created `CONTRIBUTING.md` (61 lines, under 80-line target). Sections: repo intro + install line, one-time setup (`git config core.hooksPath .githooks` + jq install for macOS/Debian/Fedora), hook contracts brief pointing at `.githooks/README.md`, Windows = WSL out-of-scope note (NFR-04), PR workflow (fork → branch → bump 4 manifests → sync-shared if `_shared/` touched → PR → solo-maintainer review).
- Extended `.githooks/README.md` with two new contract sections: pre-commit drift hook (FR-30..FR-34: what it does, single-plugin short-circuit, `scripts/sync-shared.sh --from=<plugin>` fix, `--no-verify` bypass) and the extended pre-push hook (FR-30 + FR-40..FR-46a: 4-manifest 3-way version match, namespaced `<plugin>/v<semver>` tag, jq prereq). FR refs cited inline so the doc is auditable.

**Verification (inline greps, all exit 0):**
- `grep -q 'core.hooksPath .githooks' CONTRIBUTING.md` → OK
- `grep -qE 'brew install jq|apt install jq|dnf install jq' CONTRIBUTING.md` → OK
- `grep -qE 'pre-commit|pre-push' .githooks/README.md` → OK

**TDD:** opted out per task `TDD: no` (FR-105 doc-class exemption — no behavioral assertions to write red/green).

**Code-quality review findings (applied/deferred):**
- (applied) Important: "3-way version + tag" header was inconsistent with the body, which enumerates 4 manifests. Renamed to "4-manifest version + tag" in both `CONTRIBUTING.md` and `.githooks/README.md`. Also added `/complete-dev automates the bump` to the CONTRIBUTING pre-push bullet. Committed as `fix(T8): rename pre-push section "3-way" → "4-manifest" for consistency`.
- (deferred to follow-up) Important: jq-missing error string drift between FR-45 spec text and actual `.githooks/pre-push:23` output. Cross-task issue (T4 hook author vs T8 doc author); flag to /verify for resolution either by updating the hook string or relaxing FR-45's verbatim contract.
- (skipped — nit) T11-cutover marker on `CONTRIBUTING.md:6` install line; PR-workflow precision phrasing; bash fence language tag.

**Deviations:** none.
