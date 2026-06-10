---
name: skill-sdlc
description: Create or revise a skill via the full SDLC pipeline — a thin alias for `/feature-sdlc skill …`. Triggers — "create a skill", "build me a slash command", "author a new skill", "turn this workflow into a skill", "apply this retro feedback to the skill", "/skill-sdlc".
user-invocable: true
argument-hint: "<description> | --from-feedback <text|path|--from-reflect>  (all other /feature-sdlc flags forward verbatim)"
---

# /skill-sdlc

<!-- non-interactive: delegated to /feature-sdlc — this alias issues no structured prompt of its own and carries no inline contract block; /feature-sdlc owns the non-interactive contract. -->

This skill is a thin alias. It runs no logic of its own.

Immediately invoke `/pmos-toolkit:feature-sdlc` with the arguments `skill` followed by the verbatim arguments passed to `/skill-sdlc` — e.g. `/skill-sdlc a skill that lints YAML` → `/pmos-toolkit:feature-sdlc skill "a skill that lints YAML"` (quoting is not required on input; the whole remainder is the seed); `/skill-sdlc --from-feedback path/to/reflect.md` → `/pmos-toolkit:feature-sdlc skill --from-feedback path/to/reflect.md`. A feedback source of `--from-reflect` forwards the same way. Every other flag (`--tier`, `--resume`, `--no-worktree`, `--format`, `--backlog`, `--non-interactive`/`--interactive`, `--reset-defaults`, …) forwards verbatim — `/feature-sdlc`'s frontmatter is the single home for the flag surface; this hint lists only what the alias itself adds. Exception: on `--resume`, forward WITHOUT the `skill` prefix (`/skill-sdlc --resume` → `/pmos-toolkit:feature-sdlc --resume`) — the run mode is read back from `state.yaml`, and a subcommand alongside `--resume` triggers a spurious warning by contract. Do nothing else — all skill-dev logic, the worktree, the resume model, the eval loop, and the learnings capture live in `/feature-sdlc`.

## Platform Adaptation

This skill has no platform-specific behavior of its own — it forwards verbatim to `/feature-sdlc skill …`, which handles all platform adaptation, subagents, and the resume model.
