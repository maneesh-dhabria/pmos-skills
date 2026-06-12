---
schema_version: 1
id: 0013
kind: story
title: phase-boundary-handler auto-mode support
type: enhancement
priority: should
status: done
route: skill
parent: 0011
dependencies: []
worktree:
plan_doc: docs/pmos/features/2026-06-12_compact-mode-setting/stories/0013-phase-boundary-handler-auto-mode/03_plan.html
tasks_file: docs/pmos/features/2026-06-12_compact-mode-setting/stories/0013-phase-boundary-handler-auto-mode/tasks.yaml
claimed_by:
pr:
labels: [compact, execute]
created: 2026-06-12
updated: 2026-06-12
---

## Context

Update `plugins/pmos-toolkit/skills/_shared/phase-boundary-handler.md` to support the new `compact_mode` setting from `.pmos/settings.yaml`. In `auto` mode, the `HALT_FOR_COMPACT` message removes the `/compact` instruction since autocompact handles context management. The hard-stop is preserved in both modes.

Epic design: `docs/pmos/features/2026-06-12_compact-mode-setting/02_design.html`
Cross-skill invariants: I1, I2, I3, I4, I5, I6 (see design doc)
Independent of S1 (0012) — adds its own settings note inline.

## Acceptance Criteria

- [ ] `_shared/phase-boundary-handler.md` has a "Reading `compact_mode`" section documenting: field values (`manual`|`auto`), default (absent field OR absent file = `manual`), case-sensitivity, call convention (caller reads settings at Phase 0 and applies inline), log channel (visible chat)
- [ ] In `auto` mode: `HALT_FOR_COMPACT` message is: "Phase N verified green. Re-invoke `/execute --resume` to continue with phase N+1 (autocompact handles context)."
- [ ] In `manual` mode: existing `HALT_FOR_COMPACT` message is unchanged: "Phase N verified green. Run `/compact` to clear context, then re-invoke `/execute --resume` to continue with phase N+1."
- [ ] Hard-stop (HALT_FOR_COMPACT return value) is preserved in both modes — only the message string differs
- [ ] `RETURN HALT_FOR_COMPACT` type is unchanged; `RETURN CONTINUE` and `RETURN ESCALATE` are unaffected
- [ ] Invalid/unrecognised `compact_mode` values fall through to `manual` with a visible chat warning
- [ ] Documents trust-based nature of `auto`: skill trusts autocompact is configured; failure mode documented (unmanaged context if autocompact not active)
- [ ] Conforms to `skill-patterns.md §A–§L` (non-interactive block exempt — phase-boundary-handler.md is a reference file, not a SKILL.md)
