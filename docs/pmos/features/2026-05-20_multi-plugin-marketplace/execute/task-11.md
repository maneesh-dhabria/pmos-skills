---
task_number: 11
task_name: "Cut pmos-toolkit/v2.51.0 + verify install + update URLs + archive old repo"
task_goal_hash: t11-cut-release-and-archive
plan_path: "docs/pmos/features/2026-05-20_multi-plugin-marketplace/03_plan.html"
branch: "feat/multi-plugin-marketplace"
worktree_path: "/Users/maneeshdhabria/Desktop/Projects/agent-skills-multi-plugin-marketplace"
status: done
started_at: 2026-05-23T01:30:00Z
completed_at: 2026-05-23T02:00:00Z
files_touched: []
---

## T11 — Cut pmos-toolkit/v2.51.0 + install verify + archive old repo

### Scope reduction vs. plan

The release-bump portion of T11 (Step 1: URL flips + README breadcrumb; Step 2: 4-manifest 2.50.0→2.51.0 bump + commit) landed earlier as part of T10 commit `998e8af`, because the pre-push hook (correctly per FR-75) blocked the T10 merge push without a co-located version bump. T11 was thereby reduced to: tag + push tag + install verify + archive.

### Step outcomes

- **Step 1 (URL flips + README): done in T10** (commit `998e8af` flipped plugin.json `homepage`/`repository` + marketplace.json `homepage` to pmos-skills; README.md prepended with migration breadcrumb).
- **Step 2 (release-bump commit): done in T10** (commit `998e8af` 4-manifest invariant 2.50.0 → 2.51.0; merge commit `ee1553c` on main carries the release per FR-75 atomicity).
- **Step 2.4 (tag pmos-toolkit/v2.51.0):** done. Annotated tag created on merge commit `ee1553c` with message "pmos-toolkit 2.51.0 — multi-plugin marketplace migration to pmos-skills".
- **Step 2.6 (push tag to 2 remotes):** done. Both origin + gitlab-mirror return the same tag-object SHA `8b9a073`.
- **Step 3 (verify tag presence):** done. `git ls-remote <remote> refs/tags/pmos-toolkit/v2.51.0` on origin and gitlab-mirror returns identical SHA.
- **Step 4a (Fresh-CC install verify):** completed by user out-of-band (per user direction 2026-05-23). Confirmed `/plugin marketplace add maneesh-dhabria/pmos-skills` shows `pmos-toolkit v2.51.0` in the picker.
- **Step 4b (Fresh-Codex install verify, R6 gate):** completed by user out-of-band. Codex picker confirmed; R6 (Codex schema rejection) did not realize → archive gate cleared.
- **Step 5 (pre-archive audit):** done. `gh pr list --repo maneesh-dhabria/pmos-toolkit --state open` = 0 PRs; `gh api repos/maneesh-dhabria/pmos-toolkit/forks` = 0 forks; open issues = 0. Safe to archive.
- **Step 6 (archive + privatize):** done after a 3-call dance — GitHub blocks visibility edits on archived repos, so the actual sequence was `gh repo archive` → `gh repo unarchive` → `gh repo edit --visibility private` → `gh repo archive`. Final state per `gh api repos/maneesh-dhabria/pmos-toolkit -q '.archived, .private'` = `true, true` — matches CLAUDE.md `## Old repo posture` exactly. Also: switched `gh` active account from `maneesh-dh` (work) to `maneesh-dhabria` (personal, repo owner) for the archive calls, then switched back.

### Post-T11 state

- `pmos-toolkit/v2.51.0` published on both remotes.
- 4-manifest invariant: 2.51.0 across the board.
- Old `maneesh-dhabria/pmos-toolkit` repo: archived + private.
- Install verified on both Claude Code and Codex.
- Cutover complete.
