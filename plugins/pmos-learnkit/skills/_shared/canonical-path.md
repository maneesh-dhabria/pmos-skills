# Canonical path contract

All worktree paths in pmos-toolkit pipeline state files (`<worktree>/.pmos/feature-sdlc/state.yaml :: worktree_path`) are stored as `realpath()` output. This is the **single source of canonicalization** — both `/feature-sdlc` and `/complete-dev` cite this document and use the same invocation.

## Why

macOS canonicalizes `/tmp` → `/private/tmp`. A path written as `/tmp/foo` and later compared against `realpath($PWD)` would false-fire as drift. Realpath at write time + byte equality at read time eliminates the false positive without per-read system calls.

## Invocation

Preferred (POSIX coreutils, present on macOS + most Linux):

```bash
realpath -- "$path"
```

Fallback when `realpath` is unavailable:

```bash
python3 -c 'import os, sys; print(os.path.realpath(sys.argv[1]))' "$path"
```

If neither is available, abort with `realpath unavailable; install coreutils or python3`. Never fall back to bare string equality — that's the bug this doc exists to prevent.

## Comparison

Compare two canonical paths via byte equality. Once `realpath`-canonical, paths are stable across reads (idempotent: `realpath(realpath(p)) == realpath(p)`).

## Cited by

- `/feature-sdlc` Phase 0.a Step 3 (write `state.worktree_path`).
- `/feature-sdlc` Phase 0.b drift check (`realpath($PWD) == state.worktree_path`).
- `/feature-sdlc` Phase 1 init (write `worktree_path` for `--no-worktree=false` case).
- `/complete-dev` Phase 4 (compute `<root-main-path>` from `git worktree list` first entry, canonicalize for the fallback `cd` instruction).
