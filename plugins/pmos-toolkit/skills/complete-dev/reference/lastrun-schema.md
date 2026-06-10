# `.pmos/complete-dev.lastrun.yaml` — schema

Per-developer, per-repo memory of the run-shaping choices made on the most recent `/complete-dev` invocation. Read by Phase 0; consulted by Phase 0a's "Confirm run defaults" prompt; written at the end of Phase 17 once the release lands.

**Gitignored** — different developers may want different defaults (different remotes pushed, different deploy paths), so this is personal state, not team-shared.

## Path

`.pmos/complete-dev.lastrun.yaml` (relative to repo root)

## Schema (v1)

```yaml
version: 1
last_updated: 2026-05-13T14:23:00Z      # ISO-8601; UTC; bumped on every successful Phase 17 write
defaults:
  verify_already_ran: true               # Phase 1 gate. true = skip prompt; false = still ask.
  merge_style: rebase-then-ff            # Phase 3. One of: rebase-then-ff | merge-ff-or-noff | branch-only
  worktree_disposition: remove           # Phase 16a. One of: remove | keep
  deploy_path: skip-ci-handles           # Phase 5. One of: skip-ci-handles | run-local-deploy | run-uv-publish | skip-deploy | <free-form path label>
  version_bump: minor                    # Phase 9. One of: patch | minor | major | skip
  changelog_disposition: accept          # Phase 8. One of: accept | edit | rerun | skip
  push_target: all-remotes               # Phase 14. One of: all-remotes | origin-only
detected_signals:                        # Echo of Phase 5's detected deploy signals — informational, surfaced in the Phase 0a confirm
  deploy:
    - "plugin manifests (push to remotes)"
```

## Read contract

- **File present + valid:** parse into a `run_defaults` dict. Phase 0a seeds the confirm prompt from it.
- **File absent:** fall through to the built-in default dict (see "Built-in defaults" below). Phase 0a still presents the consolidated confirm, just seeded from built-ins.
- **File present but malformed** (not parseable YAML; missing `version` key; `version > 1`): stderr warn `lastrun.yaml malformed or unknown version — falling back to built-in defaults` and fall through. Never error out; this file is advisory, not authoritative.
- **CLI flags override:** `--skip-changelog` forces `changelog_disposition: skip` for THIS run only; `--skip-deploy` forces `deploy_path: skip-deploy`; `--no-tag` is orthogonal (not in lastrun). Overrides are surfaced in the Phase 0a confirm with a `(overridden by --flag)` annotation.

## Write contract

Written only at the **end of Phase 17 (final verification)** — i.e., after the release has actually shipped. A failed/cancelled run does NOT update lastrun (otherwise we'd memorialize broken choices).

Write protocol: atomic temp-then-rename to survive crash mid-write.

```
write .pmos/complete-dev.lastrun.yaml.tmp
rename .pmos/complete-dev.lastrun.yaml.tmp .pmos/complete-dev.lastrun.yaml
```

On rename failure, surface the error and continue — the release has already succeeded; failing to update lastrun is not a release-blocking error.

## Built-in defaults

When no lastrun exists (first run in a repo), these defaults seed Phase 0a:

```yaml
defaults:
  verify_already_ran: true              # bias toward "user knows /verify ran"; they can edit
  merge_style: rebase-then-ff           # matches Phase 3 Recommended (guard-PASS)
  worktree_disposition: remove          # matches Phase 16a Recommended
  deploy_path: <Phase 5 recommended>    # computed from detected signals; "skip-ci-handles" if CI auto-deploy detected
  version_bump: minor                   # matches Phase 9 Recommended for new-skill ships
  changelog_disposition: accept         # matches Phase 8 Recommended
  push_target: all-remotes              # matches Phase 14 Recommended
```

## Field reference

| Field | Phase | Effect when Phase 0a confirmed |
|---|---|---|
| `verify_already_ran: true` | 1 | Phase 1 prompt suppressed; pipeline proceeds as if user picked "Already ran, continue". |
| `verify_already_ran: false` | 1 | Phase 1 prompt still fires (user wants to be asked). |
| `merge_style: rebase-then-ff` | 3 | When shared-branch guard PASSes, Phase 3 prompt suppressed; rebase-then-ff executed. **Guard-FAIL re-prompts** with safer Recommended (destructive escape hatch). |
| `merge_style: merge-ff-or-noff` | 3 | Merge into main (ff if possible, --no-ff otherwise). |
| `merge_style: branch-only` | 3 | Stay on feature branch; push only this branch. |
| `worktree_disposition: remove` | 16a | Phase 16a prompt suppressed; worktree removed after push-tag succeeds. |
| `worktree_disposition: keep` | 16a | Worktree retained; user manually removes later. |
| `deploy_path` | 5 | Phase 5 prompt suppressed if detected signals are unchanged from lastrun (`detected_signals.deploy` matches). If signals changed, Phase 5 re-prompts — environment has shifted. |
| `version_bump` | 9 step 5 | Phase 9 step 5 prompt suppressed. **Stale-bump recovery (step 4a) still prompts** — destructive. |
| `changelog_disposition: accept` | 8 | Phase 8 "Use this entry?" prompt suppressed; entry committed as drafted. |
| `changelog_disposition: edit / rerun / skip` | 8 | Phase 8 still fires (edit needs free-form input; rerun is non-default; skip is destructive). |
| `push_target: all-remotes` | 14 | Phase 14 "Push to N remotes?" prompt suppressed; dry-run summary still printed. |
| `push_target: origin-only` | 14 | Phase 14 prompt suppressed; only origin pushed. |

## Destructive-prompt allowlist (always re-prompted, even when confirmed)

Phase 0a confirmation NEVER short-circuits these — they involve destructive operations or free-form input that lastrun cannot meaningfully memorize:

- Phase 3 Step A: shared-branch guard FAIL → re-prompt with merge Recommended (rebase becomes a "WARNING: rewrites SHAs" option)
- Phase 6 learnings findings — content review, batched per finding
- Phase 9 step 4a stale-bump recovery — destructive (revert + re-bump)
- Phase 11 commit message draft — free-form text input
- Phase 13 tag-already-exists collision — destructive (force-replace risk)
- Phase 15 push failure — destructive (rollback risk)
- Phase 15a push-retry cleanup

## Non-interactive mode interaction

Phase 0a only fires in interactive mode. In `--non-interactive` mode the existing AUTO-PICK-Recommended contract (the `<!-- non-interactive-block -->`) handles every prompt — equivalent to Phase 0a's "Confirm all" outcome with built-in defaults. lastrun is still **read** in non-interactive mode (it can refine built-in defaults) but the confirm prompt is skipped; chat logs `Phase 0a auto-confirmed (non-interactive); defaults source: <lastrun|built-in>` for observability.

## `--reset-defaults` flag

Pass `--reset-defaults` to ignore the on-disk lastrun and seed Phase 0a from built-ins instead. Useful when defaults have drifted from a stale prior run (e.g., a repo's deploy norm changed). The flag does not delete the file — it just bypasses the read for this run; Phase 17 will overwrite with the new choices as usual.
