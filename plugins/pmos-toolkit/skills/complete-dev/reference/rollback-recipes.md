# Rollback recipes

Used by `/complete-dev` Phase 15 (push failure) and Phase 16a (worktree recovery). Tag names follow FR-58: always `<plugin>/v<version>` (e.g. `pmos-toolkit/v2.50.0`), never bare `v<version>`.

## Rule of thumb

**Rollback is destructive. The default path is "fix and retry," not "undo."** Use rollback only when the user explicitly chooses it.

## Recipe 1: Fix-and-retry push (preferred)

Symptom: `git push origin main` failed with hook rejection, auth error, or conflict.

Steps:
1. Show user the error verbatim.
2. Diagnose:
   - **Pre-push hook rejection** (e.g., manifest version mismatch) → fix the source issue, re-stage, amend the relevant commit OR add a fix commit.
   - **Non-fast-forward** → user pulls first: `git pull origin main --rebase`. Resolve conflicts if any.
   - **Auth failure** → user fixes credentials.
3. Delete the local tag if Phase 13 created one (Phase 15a handles this): `git tag -d <plugin>/v<version>`.
4. Re-enter Phase 13 (if HEAD changed → re-tag), then Phase 14 (re-summarize), then Phase 15 (re-push).

This path preserves all ceremony work (merge, README, changelog, version bump, learnings).

## Recipe 2: Skip a non-origin remote

Symptom: origin pushed, but `git push <other-remote> main` failed (e.g., github-work auth issue).

Steps:
1. Origin is the source of truth. Don't roll back.
2. Tell the user the failed remote and a manual retry command: `git push <remote> main && git push <remote> <plugin>/v<version>`.
3. Continue with remaining remotes.

## Recipe 3: Full rollback to pre-merge SHA (DESTRUCTIVE)

Symptom: user explicitly chose "rollback to pre-merge" in Phase 15's failure menu.

**Show this confirmation BEFORE acting:**

```
DESTRUCTIVE OPERATION:
  Will reset main to <pre-merge-sha> (<commit-message>).
  Loses commits: <merge-commit>, <readme-commit>, <changelog-commit>, <version-bump-commit>, <learnings-commit>.
  Local tag <plugin>/v<version> will be deleted.
  Worktree at <path> is still present (cleanup runs at Phase 16a, after push succeeds) — this rollback does NOT touch it; remove it manually later if no longer needed.

Type 'rollback' to confirm.
```

Steps (only after explicit confirmation):
1. `git tag -d <plugin>/v<version>` (delete local tag)
2. `git reset --hard <pre-merge-sha>` (resets main pointer; loses commits)
3. **Do NOT push the rollback automatically.** Tell the user:
   - "main has been reset locally. Origin still has the old state. If you want to keep origin in its pre-/complete-dev state, do nothing further. If you want to re-push the (rolled-back) state, that requires a force-push which is dangerous."
4. End the skill in error state — do not proceed with any further phase.

## Recipe 4: Tag conflict pre-existing on remote

Symptom: Phase 13 detected no local tag, but `git push origin <plugin>/v<version>` reports "remote already has tag."

Steps:
1. This means a previous /complete-dev run pushed the tag and we're trying again with the same version.
2. Ask user: skip tag push (tag already on remote) / force-replace remote tag (DESTRUCTIVE) / cancel.
3. Force-replace requires `git push --force origin <plugin>/v<version>` — only with explicit user confirmation; warn that downstream consumers pinning to tags will see a different commit.

## Recipe 5: Worktree-still-needed recovery

Symptom: the worktree is gone but the user wants the isolated workspace back.

Note: worktree cleanup runs at Phase 16a — AFTER push tag succeeds — so on a push failure the worktree is normally still intact. **First check `git worktree list`**; if the worktree is still there, no recovery is needed. This recipe applies only when it was actually removed (Phase 16a completed, `--force-cleanup`, or manual removal). Recovery requires re-creating it:

```bash
git worktree add <path> <feature-branch>
```

If the feature branch was deleted (Phase 16a removes it after a clean worktree removal; Phase 12 prunes stale branches), this fails. The user has to re-create the branch from a SHA: `git branch <feature-branch> <sha>` then re-add the worktree. Document the SHA at the start of /complete-dev for emergency use.

## Anti-patterns

- Auto-rollback on first sign of trouble. Push failures are recoverable 95% of the time; rollback loses real work.
- Rolling back without showing the user the SHA + commit list being lost.
- Force-pushing rolled-back state to origin without explicit user confirmation per push.
- Treating non-origin remote failures as "must rollback" — they're not. Origin is canonical.
