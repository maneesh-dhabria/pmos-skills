# Repo → sessions resolver (reference)

The multi-signal resolver implemented in `scripts/resolve_repo_sessions.mjs`. Loaded on demand
by the Resolve phase. Run it; don't reimplement it.

```
node <skill>/scripts/resolve_repo_sessions.mjs <repo> [--days N] [--since ISO] [--sessions N] [--include-headless]
```

## Why multi-signal (not path-prefix)

A repo's real history is **not** confined to its own session dir. Worktrees scatter it, and
merged worktrees are deleted from disk while their session logs persist. Validated on
`poker-coach`: 10 of ~29 sessions lived in two sibling worktree dirs, one of them already
deleted. A path-prefix resolver silently builds playbooks on a fraction of the story.

## The three signals (any one attributes a session)

1. **nested-prefix** — `cwd === repo` OR `cwd` starts with `repo + "/"` (covers the repo itself
   and `repo/.claude/worktrees/*`). **Confident.**
2. **sibling-token-strip** — `cwd` is a sibling dir `<repo>-<slug>` under the *same parent*
   (`dirname(cwd) === dirname(repo)` and `basename(cwd)` starts with `basename(repo) + "-"`).
   Name-based, so it still matches a worktree dir that has been deleted. **Strong structural
   signal.**
3. **branch-in-merge-history** — the session's `gitBranch` (non-`HEAD`) appears in the repo's
   `git -C <repo> log --merges` subjects or reflog. Recovers merged-and-deleted worktrees whose
   `cwd` no longer relates to the repo path.

All comparisons use realpath canonicalization (falling back to `path.resolve` for paths that no
longer exist). A session matched by ≥1 signal is attributed once (deduped).

## Confidence & ambiguity (FR-22)

- **nested** → confident.
- **sibling + branch** (both agree) → confident.
- **sibling only** (branch not corroborated) → **attributed, `low_confidence: true`**. A
  `<repo>-<slug>` dir under the same parent is a strong convention signal; excluding it would
  recreate the undercount the resolver exists to prevent. Surface the count; let the author drop
  any that are actually unrelated repos.
- **branch only** (cwd unrelated; only a possibly-shared branch name matched) → **`ambiguous`,
  NOT attributed**. A generic branch name like `feat/ux-fix` can exist in several repos'
  histories. Surface for confirm (interactive) / record-and-skip (non-interactive). Never
  silently attribute.

## Coverage line (FR-13)

Print before any heavy read:

```
found <session_dirs> session dirs (<via_worktree> via worktree/sibling/merged),
<interactive> interactive sessions (<headless_dropped> headless dropped, <low_confidence> low-confidence)
```

The script returns this as the `coverage` object plus `attributed[]` (each with `signals`,
`low_confidence`) and `ambiguous[]`. The scout (`scripts/scout.mjs`) consumes these and maps the
attributed sessions onto the milestone spine (`reference/evolution-sources.md`).
