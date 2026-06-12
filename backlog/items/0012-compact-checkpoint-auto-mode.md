---
schema_version: 1
id: 0012
kind: story
title: compact-checkpoint auto-mode support
type: enhancement
priority: should
status: done
route: skill
parent: 0011
dependencies: []
worktree:
plan_doc: docs/pmos/features/2026-06-12_compact-mode-setting/stories/0012-compact-checkpoint-auto-mode/03_plan.html
tasks_file: docs/pmos/features/2026-06-12_compact-mode-setting/stories/0012-compact-checkpoint-auto-mode/tasks.yaml
claimed_by: null
pr:
labels: [compact, feature-sdlc]
created: 2026-06-12
updated: 2026-06-12
---

## Context

Update `plugins/pmos-toolkit/skills/feature-sdlc/reference/compact-checkpoint.md` to support the new `compact_mode` setting from `.pmos/settings.yaml`. In `auto` mode, the AskUserQuestion before heavy phases is skipped entirely and a log line is emitted instead.

Epic design: `docs/pmos/features/2026-06-12_compact-mode-setting/02_design.html`
Cross-skill invariants: I1, I2, I4, I5, I6 (see design doc)

## Acceptance Criteria

- [ ] `reference/compact-checkpoint.md` has a "Reading `compact_mode`" section documenting: field values (`manual`|`auto`), default (absent field OR absent file = `manual`), case-sensitivity, call convention (caller reads settings at Phase 0 and applies inline), log channel (visible chat)
- [ ] In `auto` mode: AskUserQuestion is skipped; a standalone chat log line is emitted BEFORE the heavy phase: `compact_mode: auto — checkpoint at <phase-label> skipped; autocompact active` (e.g. `… at execute skipped …`)
- [ ] In `manual` mode: existing AskUserQuestion behavior is unchanged (Continue Recommended / Pause / Continue without compacting)
- [ ] Tier-1 bypass logic unchanged (still skips in both modes, evaluated before compact_mode check)
- [ ] Invalid/unrecognised `compact_mode` values fall through to `manual` with a visible chat warning: `compact_mode: unrecognised value '<v>'; treating as manual`
- [ ] Documents trust-based nature of `auto`: skill trusts autocompact is configured; documents the failure mode (unmanaged context if autocompact not active)
- [ ] Conforms to `skill-patterns.md §A–§L` (non-interactive block exempt — compact-checkpoint.md is a reference file, not a SKILL.md)
