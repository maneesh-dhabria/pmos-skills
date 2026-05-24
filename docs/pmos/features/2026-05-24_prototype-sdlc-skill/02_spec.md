---
title: /prototype-sdlc — technical spec
tier: 2
based_on: 01_requirements.md
---

# /prototype-sdlc — spec

## Architecture

Two-file change set:

1. **NEW** `plugins/pmos-toolkit/skills/prototype-sdlc/SKILL.md` — thin alias (≤80 lines, mirrors `/skill-sdlc`).
2. **EDIT** `plugins/pmos-toolkit/skills/feature-sdlc/SKILL.md` — add `prototype` to the Phase 0 subcommand dispatcher and add a `prototype` column to the Mode × phase table; supplementary edits to reference/state-schema.md.

`/prototype-sdlc` itself owns **zero** state-machine, resume, or worktree logic — everything forwards to `/feature-sdlc prototype …`.

## FRs

### FR-PSDLC-01: alias body

`plugins/pmos-toolkit/skills/prototype-sdlc/SKILL.md` contains:

- YAML frontmatter:
  - `name: prototype-sdlc`
  - `description:` ≥5 trigger phrases ("prototype this idea end-to-end", "build a clickable prototype from this", "wireframes + prototype for X", "discovery pipeline", "I want stakeholders to walk through this", "/prototype-sdlc")
  - `argument-hint:` `[--from-feedback <src>] [--tier N] [--resume] [--no-worktree] [--no-ideate] [--format html|md|both] [--non-interactive] [--interactive] [--backlog <id>] [--minimal] [list] <seed>`
- Body: a single instruction paragraph telling Claude to immediately invoke `/pmos-toolkit:feature-sdlc` with the argument string `prototype` followed by the verbatim arguments. With examples (mirroring `/skill-sdlc`).
- A "Platform Adaptation" stanza noting it has no platform-specific behavior — forwards verbatim to `/feature-sdlc prototype …`.

### FR-PSDLC-02: /feature-sdlc Phase 0 dispatch

In `feature-sdlc/SKILL.md` Phase 0 Subcommand Dispatch:

- Token-1 disambiguation grows `prototype` as a recognised subcommand selector (alongside `skill` and `list`), with identical disambiguation rules (sole token; next token is a flag; remainder is exactly one quoted arg).
- Dispatch table gains:
  - **`prototype <description>`:** `pipeline_mode = prototype`; description is the seed for Phase 2 `/requirements`.
  - **`prototype` with no description:** stderr usage error; exit 64.
  - **`prototype --resume`:** ignore the subcommand (mirror `skill --resume` behavior); read mode from state.yaml.

### FR-PSDLC-03: Mode × phase table extension

Add a `prototype` column to the table. Required phases (`✓`):

| Phase | feature | skill-new | skill-feedback | **prototype** |
|---|---|---|---|---|
| 0c /feedback-triage | — | — | ✓ | — |
| 0d /skill-tier-resolve | — | ✓ | ✓ | — |
| 1.5 /ideate gate | ✓ | ✓ | — | ✓ |
| 2 /requirements | ✓ | ✓ | ✓ | ✓ |
| 2a /grill | ✓ | ✓ | ✓ | ✓ |
| 3a /creativity | ✓ | ✓ | ✓ | ✓ |
| 3b /wireframes | ✓ (soft gate) | — | — | **✓ (hard, always-run)** |
| 3c /prototype | ✓ (soft gate) | — | — | **✓ (hard, always-run)** |
| 4 /spec | ✓ | ✓ | ✓ | ✓ |
| 5 /plan | ✓ | ✓ | ✓ | — |
| 6 /execute | ✓ | ✓ | ✓ | — |
| 6a /skill-eval | — | ✓ | ✓ | — |
| 7 /verify | ✓ | ✓ | ✓ | — |
| 8 /complete-dev | ✓ | ✓ | ✓ | — |
| 8a /retro gate | ✓ | ✓ | ✓ | — |
| 9 final-summary | ✓ | ✓ | ✓ | ✓ |

**Execution order in prototype mode:** `worktree → init-state → ideate → requirements → grill → creativity → spec → wireframes → prototype → final-summary`. (Note: /spec is placed **after** /grill and **before** /wireframes per OQ-1 resolution, NOT in its usual Phase 4 slot. This is a prototype-mode-specific ordering — see FR-PSDLC-06.)

### FR-PSDLC-04: 3b/3c hardness change in prototype mode

In Phase 3b /wireframes and 3c /prototype: when `pipeline_mode == prototype`, these are hard (not soft-gated) — they are the deliverable. Specifically:

- **3b /wireframes** in prototype mode: skip the always-ask FR-FRONTEND-GATE prompt; always run. Logged: `[orchestrator] prototype mode: 3b runs unconditionally (no gate)`.
- **3c /prototype** in prototype mode: skip the soft-Skip-Recommended prompt; always run. Logged: `[orchestrator] prototype mode: 3c runs unconditionally (no gate)`.
- On failure: hard-phase failure dialog (Retry / Pause / Abort — no Skip).
- The compact checkpoint still fires before 3b and before 3c per the existing rules.

### FR-PSDLC-05: --minimal in prototype mode

`_minimal_active = true` in prototype mode auto-skips:
- 3a /creativity (already standard behavior).

It does NOT skip 3b/3c (they're hard in prototype mode per FR-PSDLC-04) or 8a /retro (absent from prototype mode).

### FR-PSDLC-06: Phase ordering shim

The existing `feature-sdlc` SKILL.md numbers /spec as Phase 4 (post-3c). In prototype mode this would mean spec runs AFTER wireframes/prototype, which inverts the OQ-1-resolved order.

**Implementation: a small prototype-mode ordering shim** at the top of the post-3a section. Before running 3b/3c/4, the orchestrator checks `pipeline_mode == prototype` and, if so, runs Phase 4 (/spec) FIRST, then 3b, then 3c, then jumps to 9 (final-summary). Documented under a new H2 in feature-sdlc/SKILL.md: `## Prototype-mode phase ordering`.

### FR-PSDLC-07: state-schema.md update

`plugins/pmos-toolkit/skills/feature-sdlc/reference/state-schema.md` — add a `prototype` entry to "Phase identifiers + hardness" tables. Bump `schema_version` to **5**. Auto-migration v4→v5 is purely additive (introduce `pipeline_mode = prototype` as a valid value); existing v4 state files continue to load without rewrite. The cohort-marker line in the v3→v4 migration block gets a v4→v5 successor: `migration: state.schema v4 → v5 (added: pipeline_mode=prototype valid value)`.

### FR-PSDLC-08: Phase 9 final-summary in prototype mode

`pipeline_mode == prototype`:
- No branch+tag info (no /complete-dev ran).
- Artifact link list: `01_requirements.*`, `02_spec.*`, `03_wireframes.*` (from /wireframes), `04_prototype.*` (from /prototype), plus the grills/ subdir and (if Phase 1.5 ran) `00d_ideate.*`.
- Final one-liner: `Prototype-mode pipeline complete for <slug>. Branch feat/<slug> contains the discovery artifacts; not merged. To extend to full implementation: cd into the worktree and run /feature-sdlc --resume after editing state.yaml.pipeline_mode to 'feature'. To discard: git worktree remove <path>.`

(The state.yaml edit instruction is a documented manual path — a `/feature-sdlc continue-from-prototype` flow is OUT OF SCOPE per non-goal §1.)

### FR-PSDLC-09: argument-hint frontmatter on /feature-sdlc

Add `prototype` and `list` to /feature-sdlc's existing `argument-hint`. (`list` is already in `## Release prerequisites` — confirm it's in the actual frontmatter too.)

### FR-PSDLC-10: README row + description trigger phrases

`README.md` "Pipeline orchestrators" gains a `/prototype-sdlc` row pointing at the new skill directory. `/feature-sdlc`'s `description` frontmatter gains trigger phrases for `prototype` subcommand usage ("create a prototype end-to-end", "discovery pipeline only").

### FR-PSDLC-11: Manifest version bumps

Bump BOTH `plugins/pmos-toolkit/.claude-plugin/plugin.json` and `plugins/pmos-toolkit/.codex-plugin/plugin.json` by one minor version, in one commit, kept in sync. `/complete-dev` will compute the from→to numbers.

### FR-PSDLC-12: No learnings header

Do NOT add `## /prototype-sdlc` to `~/.pmos/learnings.md`. The alias rides on `/feature-sdlc`'s section (mirrors /skill-sdlc D19/FR-81).

## Out of scope

- Per-mode SKILL.md split (keep `feature-sdlc/SKILL.md` as the single multi-mode file).
- Continue-from-prototype flow.
- Touching child skills (/requirements, /grill, /spec, /wireframes, /prototype).
- HTML substrate format for this feature's tracking artifacts (using .md is fine for orchestrator-internal docs).

## Test plan

- **Manual smoke 1:** `/prototype-sdlc "a simple text annotation widget"` from a clean repo → worktree created, requirements written, /grill prompts, /spec written, /wireframes runs, /prototype runs, final-summary emits paths, NO complete-dev runs.
- **Manual smoke 2:** `/prototype-sdlc --resume` after killing the session mid-/spec → drift check passes, cursor advances to /spec.
- **Manual smoke 3:** `/prototype-sdlc list` → table includes the prototype-mode worktree (slug column shows it; phase column shows current).
- **Manual smoke 4:** `/feature-sdlc prototype "X"` invoked directly (bypassing the alias) → identical behavior.
- **Manual smoke 5:** `/prototype-sdlc skill X` → token-1 disambiguation: `prototype` is the selector; `skill X` is the seed. Pipeline_mode=prototype, seed = `skill X`. (Edge case; documents that the disambiguation is on the FIRST token only.)
- **Spec compliance:** `tools/skill-eval-check.sh` passes against `plugins/pmos-toolkit/skills/prototype-sdlc/SKILL.md`.
- **Manifest sync:** pre-push hook passes (both plugin.json files at the same version).
