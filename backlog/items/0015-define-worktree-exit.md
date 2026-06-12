---
schema_version: 1
id: 0015
kind: epic
title: define-mode worktree exit/cleanup at terminal docs-only merge
type: tech-debt
priority: should
status: released
route: skill
feature_folder: docs/pmos/features/2026-06-12_define-worktree-exit/
requirements_doc:
spec_doc:
design_doc: docs/pmos/features/2026-06-12_define-worktree-exit/02_design.html
labels: [feature-sdlc, define, worktree, three-loop]
created: 2026-06-12
updated: 2026-06-12
released: 2.67.1
---

## Context

Singleton epic wrapping story #0014 (lean define). The `define` loop's terminal step (`feature-sdlc/SKILL.md` `#define-mode` step 5) merges definition docs to main and STOPs without `ExitWorktree`/worktree removal, leaving the session parked in `define/<epic-id>`. This cascades into `build` running on the stale define branch and `/complete-dev --epic` needing `--no-ff` (observed live on epic 0011).

Design doc: `docs/pmos/features/2026-06-12_define-worktree-exit/02_design.html`

## Acceptance Criteria

- [ ] `define` exits + removes the `define/<epic-id>` worktree at the terminal completed merge (both route variants)
- [ ] Resume safety preserved — paused (un-merged) define runs still retain their worktree
- [ ] A single documented owner exists for define-worktree teardown

## Notes

Stories: 0014 (the whole fix — single skill story).
Route: skill (edits feature-sdlc/SKILL.md `#define-mode` step 5 + a cross-ref note in complete-dev/SKILL.md `#epic-train` step 6; both pmos-toolkit).
Lean define: no epic /requirements or /grill — story #0014's ACs are the design contract (D-lean in the design doc).
