---
name: prototype-sdlc
description: Run the discovery half of the SDLC pipeline — requirements → grill → spec → wireframes → prototype — without committing to implementation. A thin alias for `/feature-sdlc prototype …`. Stops after a clickable prototype lands in the feature folder; no /plan, /execute, /verify, or /complete-dev runs. Triggers — "prototype this idea end-to-end", "build a clickable prototype from this", "wireframes + prototype for X", "discovery pipeline for X", "I want stakeholders to walk through this before we commit", "spec + prototype only", "/prototype-sdlc".
user-invocable: true
argument-hint: "<seed> | --resume | list  (all other /feature-sdlc flags forward verbatim)"
---

# /prototype-sdlc

<!-- non-interactive: delegated to /feature-sdlc — this alias issues no structured prompt of its own and carries no inline contract block; /feature-sdlc owns the non-interactive contract. -->

This skill is a thin alias. It runs no logic of its own.

Immediately invoke `/pmos-toolkit:feature-sdlc` with the arguments `prototype` followed by the verbatim arguments passed to `/prototype-sdlc` — e.g. `/prototype-sdlc users can rename items inline` → `/pmos-toolkit:feature-sdlc prototype "users can rename items inline"` (quoting is not required on input; the whole remainder is the seed). Two arguments forward WITHOUT the `prototype` prefix:

- `/prototype-sdlc --resume` → `/pmos-toolkit:feature-sdlc --resume` — the run mode is read back from `state.yaml`, and a subcommand alongside `--resume` triggers a spurious warning by contract.
- `/prototype-sdlc list` → `/pmos-toolkit:feature-sdlc list` — `list` is a top-level subcommand there (it shows ALL in-flight `feat/*` worktrees, prototype runs included); prefixing it with `prototype` would mis-dispatch.

Every other flag (`--tier`, `--no-worktree`, `--format`, `--backlog`, `--non-interactive`/`--interactive`, `--reset-defaults`, …) forwards verbatim — `/feature-sdlc`'s frontmatter is the single home for the flag surface; this hint lists only what the alias itself adds. Do nothing else — all worktree, resume, state, gate, and summary logic lives in `/feature-sdlc`'s `prototype` mode.

The branch + worktree are left intact at the end. To extend the run into full implementation, edit `state.yaml.pipeline_mode` from `prototype` to `feature` and `/feature-sdlc --resume` from the same worktree. To discard, `git worktree remove <path>`.

## Platform Adaptation

This skill has no platform-specific behavior of its own — it forwards verbatim to `/feature-sdlc prototype …`, which handles all platform adaptation, subagents, gates, and the resume model.
