---
name: prototype-sdlc
description: Run the discovery half of the SDLC pipeline — requirements → grill → spec → wireframes → prototype — without committing to implementation. A thin alias for `/feature-sdlc prototype …`. Stops after a clickable prototype lands in the feature folder; no /plan, /execute, /verify, or /complete-dev runs. Triggers — "prototype this idea end-to-end", "build a clickable prototype from this", "wireframes + prototype for X", "discovery pipeline for X", "I want stakeholders to walk through this before we commit", "spec + prototype only", "/prototype-sdlc".
user-invocable: true
argument-hint: "[--tier N] [--resume] [--no-worktree] [--no-ideate] [--format html|md|both] [--non-interactive|--interactive] [--backlog id] [--minimal] [list] <seed>"
---

# /prototype-sdlc

This skill is a thin alias. It runs no logic of its own.

Immediately invoke `/pmos-toolkit:feature-sdlc` with the arguments `prototype` followed by the verbatim arguments passed to `/prototype-sdlc` — e.g.

- `/prototype-sdlc "users can rename items inline"` → `/pmos-toolkit:feature-sdlc prototype "users can rename items inline"`
- `/prototype-sdlc --resume` → `/pmos-toolkit:feature-sdlc prototype --resume`
- `/prototype-sdlc list` → `/pmos-toolkit:feature-sdlc prototype list`

Do nothing else — all worktree, resume, state, gate, compact-checkpoint, and final-summary logic lives in `/feature-sdlc`. The `prototype` subcommand there drives the discovery-half pipeline (requirements → grill → creativity → spec → wireframes → prototype → final-summary) and stops; no /plan, /execute, /skill-eval, /verify, /complete-dev, or /reflect runs.

The branch + worktree are left intact at the end. To extend the run into full implementation, edit `state.yaml.pipeline_mode` from `prototype` to `feature` and `/feature-sdlc --resume` from the same worktree. To discard, `git worktree remove <path>`.

## Platform Adaptation

This skill has no platform-specific behavior of its own — it forwards verbatim to `/feature-sdlc prototype …`, which handles all platform adaptation, subagents, gates, and the resume model.
