---
name: skill-sdlc
description: Create or revise a skill via the full SDLC pipeline — a thin alias for `/feature-sdlc skill …`, plus `define`/`build` for the three-loop skill backlog (`route: skill`). Triggers — "create a skill", "build me a slash command", "author a new skill", "turn this workflow into a skill", "apply this retro feedback to the skill", "define this skill epic", "build the next skill story", "/skill-sdlc".
user-invocable: true
argument-hint: "<description> | --from-feedback <text|path|--from-reflect> | define <epic-id|idea> | build [--next|--story <id>]  (all other /feature-sdlc flags forward verbatim)"
---

# /skill-sdlc

<!-- non-interactive: delegated to /feature-sdlc — this alias issues no structured prompt of its own and carries no inline contract block; /feature-sdlc owns the non-interactive contract. -->

This skill is a thin alias. It runs no logic of its own.

**Default forwarding (skill authoring/revision).** Immediately invoke `/pmos-toolkit:feature-sdlc` with the arguments `skill` followed by the verbatim arguments passed to `/skill-sdlc` — e.g. `/skill-sdlc a skill that lints YAML` → `/pmos-toolkit:feature-sdlc skill "a skill that lints YAML"` (quoting is not required on input; the whole remainder is the seed); `/skill-sdlc --from-feedback path/to/reflect.md` → `/pmos-toolkit:feature-sdlc skill --from-feedback path/to/reflect.md`. A feedback source of `--from-reflect` forwards the same way. Every other flag (`--tier`, `--resume`, `--no-worktree`, `--format`, `--backlog`, `--non-interactive`/`--interactive`, `--reset-defaults`, …) forwards verbatim — `/feature-sdlc`'s frontmatter is the single home for the flag surface; this hint lists only what the alias itself adds.

**Three-loop forwarding (`define`/`build`).** When the first token is `define` or `build`, forward it **without** the `skill` prefix and **inject `--route skill`** (unless the user already passed `--route`): `/skill-sdlc define <epic-id|idea>` → `/pmos-toolkit:feature-sdlc define <epic-id|idea> --route skill`; `/skill-sdlc build --next` (or `build --story <id>`) → `/pmos-toolkit:feature-sdlc build --next` / `… build --story <id>` (build's route comes from the picked story, so no injection — forward `--next`/`--story <id>` verbatim). This is the explicit door to the skill three-loop (Loop 1 / Loop 2); `/feature-sdlc` owns all the loop logic (`#define-route-skill`, `#build-mode`). The `--route skill` injection is the *only* transform the alias performs — it remains otherwise logic-free.

**Exception — `--resume`:** forward WITHOUT any subcommand prefix (`/skill-sdlc --resume` → `/pmos-toolkit:feature-sdlc --resume`) — the run mode is read back from `state.yaml`, and a subcommand alongside `--resume` triggers a spurious warning by contract. Do nothing else — all skill-dev logic, the worktree, the resume model, the eval loop, the loop machinery, and the learnings capture live in `/feature-sdlc`.

## Platform Adaptation

This skill has no platform-specific behavior of its own — it forwards verbatim to `/feature-sdlc skill …`, which handles all platform adaptation, subagents, and the resume model.
