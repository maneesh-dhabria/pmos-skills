---
id: 3
title: "README.md still references /push for releases — CLAUDE.md says /complete-dev is canonical"
type: tech-debt
status: done
priority: could
labels: [docs, release]
created: 2026-05-12
updated: 2026-05-23
closed: 2026-05-23
closed_reason: "README is already clean (no /push refs); .claude/commands/push.md deleted in cleanup pass."
source: docs/pmos/features/2026-05-11_feature-sdlc-skill-mode/verify/2026-05-12-review.html
spec_doc:
plan_doc:
pr:
parent:
dependencies: []
---

## Context

`/verify` for `feature-sdlc-skill-mode` (2026-05-12 report, §4 advisory A3) flagged that `README.md` (around lines ~148 and ~169 — the "Local Development" / "Adding New Skills" sections) still tells users to use the project-scoped `/push` slash command, which contradicts `CLAUDE.md`'s `## Release entry point` ("`/complete-dev` is the canonical release skill … point at `/complete-dev`, not `/push`"). Pre-existing; the surrounding README region was edited by the 2.38.0 change but these two mentions were not.

## Acceptance Criteria

- The two stale `/push` mentions in `README.md` are replaced with `/complete-dev` (preserving the surrounding instructions: version-bump prompts, manifest sync, JSON schema validation, branch reconciliation, commit-message review, stale-branch cleanup, sequential push to all remotes).
- `grep -n '/push' README.md` returns nothing release-related.
