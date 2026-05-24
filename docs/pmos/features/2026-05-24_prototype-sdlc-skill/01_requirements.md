---
title: /prototype-sdlc — requirements
tier: 2
mode: skill-new (--minimal, inline pipeline)
---

# /prototype-sdlc — requirements

## Problem

Users want a fast lane for the **discovery half** of a feature: requirements → grill → spec → wireframes → prototype, **without** committing to a full implementation pipeline yet. Today the only path is `/feature-sdlc`, which carries `/plan → /execute → /verify → /complete-dev` baggage even when the user only wants a stakeholder-walkable prototype.

## Goals

1. Provide `/prototype-sdlc <seed>` as a discovery-only pipeline orchestrator.
2. Pipeline order: `/requirements → /grill (Tier 2+) → /spec → /wireframes → /prototype`.
3. Inherit /feature-sdlc's state.yaml + resume + worktree + gates + compact-checkpoint + non-interactive + `--minimal` + `--no-worktree` + `--tier N` + `--format`.
4. Stop after `/prototype` — no `/plan`, `/execute`, `/skill-eval`, `/verify`, `/complete-dev`, `/retro`. Final-summary surfaces the produced spec/wireframes/prototype artifacts and the user's branch (uncommitted, for them to continue manually or via `/feature-sdlc --resume`-style continuation).
5. Zero duplication of state-machine / resume / worktree code — implemented as a `prototype` subcommand inside `/feature-sdlc` plus a thin alias `/prototype-sdlc` (mirrors `/skill-sdlc → /feature-sdlc skill`).

## Non-goals

- Re-implementing /feature-sdlc's state machine in a sibling skill.
- A `--continue` flag that pushes a prototype-mode run on to /plan (out of scope; user can manually `/feature-sdlc --resume` the same worktree if they want to extend, post-2026-05).
- Changes to /requirements, /grill, /spec, /wireframes, /prototype themselves.

## User journeys

### J1 — Bare prototype run
```
/prototype-sdlc users can rename items inline in the list view
```
→ worktree + branch → /requirements (Tier autodetect) → [/grill if Tier ≥2] → /spec → /wireframes (heuristic gate) → /prototype gate → final summary with links.

### J2 — Tier-1 bug-shaped seed (no grill)
```
/prototype-sdlc fix the inline-rename truncation on iPad
```
→ same flow, /grill skipped (Tier 1).

### J3 — Resume after compact
```
/prototype-sdlc --resume
```
→ cd to worktree, state.yaml read, cursor advances to first non-completed phase.

### J4 — List
```
/prototype-sdlc list
```
→ Same table format as `/feature-sdlc list` (filters `feat/*` worktrees).

### J5 — Non-interactive CI
```
/prototype-sdlc --non-interactive "redesign settings page"
```
→ Grill auto-skipped (logged), gate defers per canonical block, final summary with OQ index.

## Acceptance criteria

Must conform to `reference/skill-patterns.md §A–§F` (the standing skill-authoring rubric, cited per /feature-sdlc FR-61). Specifically:

- AC-1: `/prototype-sdlc` SKILL.md ≤80 lines (thin-alias shape).
- AC-2: Frontmatter `description` carries ≥5 user-spoken trigger phrases ("prototype this idea end-to-end", "build me a clickable prototype from this", "wireframes + prototype for", "/prototype-sdlc", "discovery pipeline for").
- AC-3: `argument-hint` enumerates every flag the underlying mode honors.
- AC-4: `/feature-sdlc` recognises `prototype` as a subcommand selector token (FR-02 dispatch table). `pipeline_mode = prototype`.
- AC-5: `phases[]` for `prototype` mode (OQ-1 resolved: spec INCLUDED): `worktree, init-state, ideate, requirements, grill, creativity, spec, wireframes, prototype, final-summary`.
- AC-6: `_minimal_active` in prototype mode auto-skips `creativity` (3a). `wireframes`/`prototype` are **hard** phases (not gateable away — they're the deliverable).
- AC-7: Phase 9 final-summary lists wireframe + prototype artifact paths; emits no merge/tag information.
- AC-8: State.yaml schema_version bumps to **5** (additive: prototype-mode `phases[]`); auto-migration v4→v5 preserves existing in-flight feature/skill runs.
- AC-9: Both `plugin.json` manifests bump (minor) and stay in sync.
- AC-10: README "Pipeline orchestrators" gains a `/prototype-sdlc` row.
- AC-11: `~/.pmos/learnings.md` does NOT get a separate `## /prototype-sdlc` header — the alias rides on `/feature-sdlc`'s learnings (mirrors /skill-sdlc D19/FR-81).

## Open questions (resolved)

- **OQ-1 — RESOLVED:** /spec included (matches user's stated order).
- **OQ-2 — RESOLVED:** /spec is hard (not --minimal-skipped). Only `creativity` (3a) is --minimal-skipped.
- **OQ-3 — RESOLVED:** No auto-merge. final-summary emits links only.
