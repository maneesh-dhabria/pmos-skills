---
id: 2
title: "feature-sdlc/reference/failure-dialog.md has no leading ToC (119 lines) → fails c-reference-toc"
type: tech-debt
status: wontfix
priority: could
labels: [skill-eval, feature-sdlc, docs]
created: 2026-05-12
updated: 2026-06-12
source: docs/pmos/features/2026-05-11_feature-sdlc-skill-mode/verify/2026-05-12-review.html
spec_doc:
plan_doc:
pr:
parent:
dependencies: []
---

## Context

`/verify` for `feature-sdlc-skill-mode` (2026-05-12 report, §4 advisory A3) noted that `plugins/pmos-toolkit/skills/feature-sdlc/reference/failure-dialog.md` is 119 lines with no leading table-of-contents / jump-list, so `skill-eval-check.sh`'s `c-reference-toc [D]` check fails on it. Pre-existing — not introduced by the 2.38.0 change; surfaced only because that change made `feature-sdlc` the eval host.

## Acceptance Criteria

- `failure-dialog.md` gains a leading kebab-anchored jump-list (per `skill-patterns.md §C` / the `c-reference-toc` check).
- `skill-eval-check.sh` no longer reports `c-reference-toc fail … failure-dialog.md`.
