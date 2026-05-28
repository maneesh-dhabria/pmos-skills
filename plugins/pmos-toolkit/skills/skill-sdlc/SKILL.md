---
name: skill-sdlc
description: Create or revise a skill via the full SDLC pipeline — a thin alias for `/feature-sdlc skill …`. Triggers — "create a skill", "build me a slash command", "author a new skill", "turn this workflow into a skill", "apply this retro feedback to the skill", "/skill-sdlc".
user-invocable: true
argument-hint: "[--from-feedback] <description|feedback> [--from-reflect] [--tier N] [--no-worktree] [--format html|md|both] [--non-interactive|--interactive] [--backlog id] [--minimal]"
---

# /skill-sdlc

This skill is a thin alias. It runs no logic of its own.

Immediately invoke `/pmos-toolkit:feature-sdlc` with the arguments `skill` followed by the verbatim arguments passed to `/skill-sdlc` — e.g. `/skill-sdlc "a skill that lints YAML"` → `/pmos-toolkit:feature-sdlc skill "a skill that lints YAML"`; `/skill-sdlc --from-feedback path/to/reflect.md` → `/pmos-toolkit:feature-sdlc skill --from-feedback path/to/reflect.md`. Do nothing else — all skill-dev logic, the worktree, the resume model, the eval loop, and the learnings capture live in `/feature-sdlc`.

## Platform Adaptation

This skill has no platform-specific behavior of its own — it forwards verbatim to `/feature-sdlc skill …`, which handles all platform adaptation, subagents, and the resume model.
