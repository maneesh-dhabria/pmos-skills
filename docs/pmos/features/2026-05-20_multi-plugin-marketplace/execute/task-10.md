---
task_number: 10
task_name: "Create pmos-skills GH repo + remote rename + push monorepo + merge feature branch"
task_goal_hash: t10-cutover-remote-topology-and-push
plan_path: "docs/pmos/features/2026-05-20_multi-plugin-marketplace/03_plan.html"
branch: "feat/multi-plugin-marketplace"
worktree_path: "/Users/maneeshdhabria/Desktop/Projects/agent-skills-multi-plugin-marketplace"
status: done
started_at: 2026-05-23T00:30:00Z
completed_at: 2026-05-23T01:30:00Z
files_touched:
  - CLAUDE.md
  - .githooks/pre-push
  - tests/scripts/assert_pre_push_empty_remote.sh
  - tests/scripts/assert_pre_push_skips_legacy_tag_refs.sh
  - tests/scripts/assert_release_policy_section.sh
  - plugins/pmos-toolkit/.claude-plugin/plugin.json
  - plugins/pmos-toolkit/.codex-plugin/plugin.json
  - .claude-plugin/marketplace.json
  - .codex-plugin/marketplace.json
  - CHANGELOG.md
  - README.md
---

## T10 — Cutover: remote topology + push monorepo + release bump

### Deviation from plan

The plan called for a tri-remote topology (`origin` / `work-mirror` / `gitlab-mirror`). User direction 2026-05-23: ship the cutover with **only** `origin` (GitHub `maneesh-dhabria/pmos-skills`) + `gitlab-mirror` (GitLab `pmos1/pmos-skills`); `work-mirror` is deferred until the work account is configured. CLAUDE.md `## Release policy ### Remote topology` updated to reflect this (commit `387cf70`).

Also: plan T11 expected `/complete-dev` to be the canonical release-bump commit, run AFTER the merge to main. The pre-push hook (correctly) blocked the merge push because skill content had changed without a plugin.json version bump (FR-75). Per user direction (Bump now option), the 2.51.0 bump landed on `feat` BEFORE the merge — making the merge commit the release commit per FR-75 atomicity. T11 is reduced to: tag + push tag + install verify + archive.

### Step-by-step outcome

- **Step 1 (remote replacement, 6 commands):** done. All 4 old remotes (`all`, `github-work`, `github`, `origin`) removed; new `origin` (GitHub pmos-skills) + `gitlab-mirror` (GitLab pmos1/pmos-skills) added.

- **Step 2 (push monorepo):** done after two hook-fix iterations.
  - `git push origin main` initially failed with exit 128 — root cause: `get_version()` in `.githooks/pre-push` crashed under `set -euo pipefail` when `git show <empty-tree>:<missing-path>` returned non-zero. Patched with `|| true` wrapper; added regression test `assert_pre_push_empty_remote.sh`. Fix landed in commit `fbb7fa5`.
  - `git push origin --tags` then failed: 30+ legacy tags (v2.16.3..v2.49.0) triggered "marketplace drift" errors because the per-ref loop was reading marketplace.json from the WORKING TREE instead of the tag's tree, violating FR-43 (no retroactive validation). Patched to skip `refs/tags/*` in the per-ref loop; the top-of-file points-at-HEAD loop already handles new-tag validation. Regression test `assert_pre_push_skips_legacy_tag_refs.sh` added. Fix landed in commit `f84a24d`.
  - After fixes: `main`, `feat/multi-plugin-marketplace`, and all 32 tags pushed cleanly to both origin and gitlab-mirror.

- **Step 3 (verify post-push state):**
  - `git remote | wc -l` = 2.
  - `git ls-remote origin refs/heads/main` returns SHA.
  - `git ls-remote origin refs/tags/v2.50.0` returns SHA.
  - `git ls-remote gitlab-mirror refs/heads/main` returns SHA.
  - 32 tags on both remotes.

- **Step 4 (release bump on feat — added per defect-T9 + hook constraint):** commit `998e8af` bumps the 4-manifest invariant from 2.50.0 → 2.51.0, flips plugin.json + marketplace.json `homepage`/`repository` URLs to pmos-skills, prepends README.md migration breadcrumb, prepends CHANGELOG.md 2.51.0 entry. Hook passes (version bumped). Pushed cleanly to both remotes.

- **Step 5 (merge feat → main, push):** done in the other worktree (`/Users/maneeshdhabria/Desktop/Projects/agent-skills`). Merge commit `ee1553c` with `--no-ff` and explicit message. Pushed to both origin and gitlab-mirror.

### Post-T10 state

- Local `main` = `ee1553c` (merge commit).
- Both remotes' `main` = `ee1553c`.
- 4-manifest invariant: 2.51.0 across the board.
- 32 tags published to both remotes (legacy tags preserved per FR-43; new `pmos-toolkit/v2.51.0` will be cut in T11).

T11 (tag + install-verify + archive) is unblocked.
