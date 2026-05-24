# Pipeline status — prototype-sdlc-skill

**Slug:** prototype-sdlc-skill
**Branch:** feat/prototype-sdlc-skill
**Mode:** skill-new (--minimal)
**Tier:** 2
**Architecture:** thin alias of /feature-sdlc with new `prototype` subcommand
**Skill location:** plugins/pmos-toolkit/skills/prototype-sdlc/
**Target platform:** claude-code (+ codex mirror)

| Phase | Status | Artifact |
|---|---|---|
| 0a worktree | ✅ completed | — |
| 0d skill-tier-resolve | ✅ completed | — |
| 1 init-state | 🟡 in_progress | 00_pipeline.md, state.yaml |
| 1.5 ideate | ⏳ pending | — |
| 2 requirements | ⏳ pending | 01_requirements.* |
| 2a grill | ⏳ pending | grills/* |
| 3a creativity | ⏭ skipped (--minimal) | — |
| 4 spec | ⏳ pending | 02_spec.* |
| 5 plan | ⏳ pending | 03_plan.* |
| 6 execute | ⏳ pending | — |
| 6a skill-eval | ⏳ pending | — |
| 7 verify | ⏳ pending | — |
| 8 complete-dev | ⏳ pending | — |
| 8a retro | ⏭ skipped (--minimal) | — |
| 9 final-summary | ⏳ pending | — |

## Seed

Build a `/prototype-sdlc` pipeline skill consisting of:
`requirements → grill (Tier 2+) → spec → wireframes → prototype`

Same pipeline features as `/feature-sdlc` (state + resume + gates).

## Architecture decision

`/prototype-sdlc` is a **thin alias** (~30 lines, modeled on `/skill-sdlc`) that forwards to `/feature-sdlc prototype <seed>`. The work splits into:

1. **New file** `plugins/pmos-toolkit/skills/prototype-sdlc/SKILL.md` — alias body.
2. **Modify** `plugins/pmos-toolkit/skills/feature-sdlc/SKILL.md`:
   - Phase 0 dispatch: recognise `prototype` selector → `pipeline_mode = prototype`.
   - Phase × mode table: add `prototype` column. Runs `requirements`, `grill`, `wireframes`, `prototype` only. Skips `creativity` (still presentable in interactive non-minimal), suppresses `spec`, `plan`, `execute`, `skill-eval`, `verify`, `complete-dev`, `retro`.
   - Phase 3b/3c gates: in prototype mode, wireframes/prototype are **hard** (not gated soft) — they're the point of the run.
   - Phase 9 final-summary: emit links to wireframes + prototype artifacts; no merge/tag.
3. **Modify** `reference/state-schema.md` — add `prototype` to the modes that get a `phases[]` set.
4. **Bump both** `plugin.json` manifests (minor).
5. **README** row + `description` frontmatter triggers.
