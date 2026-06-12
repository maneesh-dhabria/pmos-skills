---
schema_version: 1
id: 0011
kind: epic
title: compact-mode setting for /compact checkpoints
type: enhancement
priority: should
status: released
route: skill
feature_folder: docs/pmos/features/2026-06-12_compact-mode-setting/
requirements_doc:
spec_doc:
design_doc: docs/pmos/features/2026-06-12_compact-mode-setting/02_design.html
labels: [compact, settings, ux]
created: 2026-06-12
updated: 2026-06-12
released:
---

## Context

When a user has configured an autocompact window in Claude Code, the two pipeline compact checkpoints (`reference/compact-checkpoint.md` and `_shared/phase-boundary-handler.md`) still instruct them to manually run `/compact`. This is unnecessary — autocompact handles context window management automatically.

This epic introduces a `compact_mode: manual | auto` field in `.pmos/settings.yaml`. In `auto` mode, checkpoints skip the manual `/compact` instruction; in `manual` mode (the default), current behavior is preserved.

Design doc: `docs/pmos/features/2026-06-12_compact-mode-setting/02_design.html`

## Acceptance Criteria

- [ ] `.pmos/settings.yaml` supports a `compact_mode` field (`manual` | `auto`; absent = `manual`)
- [ ] Both compact surfaces (compact-checkpoint.md, phase-boundary-handler.md) respect the setting
- [ ] Default behavior (`manual`) is unchanged for all existing users

## Notes

Triage: docs/pmos/features/2026-06-12_compact-mode-setting/0c_feedback_triage.html
Stories: 0012 (S1 — compact-checkpoint), 0013 (S2 — phase-boundary-handler)
Route: skill (two reference file changes + minimal settings schema addendum in each)
