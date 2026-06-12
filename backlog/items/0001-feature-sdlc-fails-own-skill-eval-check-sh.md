---
id: 1
title: "/feature-sdlc fails its own skill-eval-check.sh — e-scripts-dir (script at tools/ not scripts/) + c-portable-paths (heuristic flags prose example paths)"
type: tech-debt
status: wontfix
priority: should
labels: [skill-eval, dogfooding, feature-sdlc]
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

`/verify` for `feature-sdlc-skill-mode` (2026-05-12 report, §4 advisory A1+A2) found that running `plugins/pmos-toolkit/skills/feature-sdlc/tools/skill-eval-check.sh --target claude-code plugins/pmos-toolkit/skills/feature-sdlc` exits 1 — the eval host fails its own rubric:

- **`e-scripts-dir`** — `skill-eval-check.sh` lives at `feature-sdlc/tools/`, but `skill-patterns.md §E` + the `e-scripts-dir [D]` check mandate `scripts/`. Decide: move the script to `scripts/`, OR amend §E + the check (and `skill-patterns.md`) to accept `tools/` (the repo already uses `plugins/pmos-toolkit/tools/audit-recommended.sh`). Pick one and apply it everywhere — `tools/` is currently half-blessed (`find` excludes `tests/*` but not `tools/*`).
- **`c-portable-paths`** — the `grep '(/Users/|/home/)…'` heuristic false-positives on prose/example paths: `skill-patterns.md:133` (the literal anti-pattern example `/Users/alice/...`) and example YAML values in `state-schema.md`. Any future skill whose docs cite an example absolute path would also be flagged in Phase 6a. Narrow the heuristic (only flag paths in markdown links / non-`${…}` bundle refs) and change the anti-pattern example to `/path/to/...` or `<absolute-path>`.

Non-blocking for the 2.38.0 ship (logged as advisory; `feature-sdlc` is an orchestrator host, and Phase 6a applies the rubric to *authored* skills with an `accepted_residuals` escape hatch). Could itself be fixed via `/feature-sdlc skill --from-feedback`.

## Acceptance Criteria

- A decision is recorded for the `e-scripts-dir` question and applied consistently (script location + `skill-patterns.md §E` + the `[D]` check + `skill-eval-check.sh` find-excludes all agree).
- `c-portable-paths` no longer flags prose/example absolute paths; `skill-patterns.md`'s anti-pattern example uses a non-`/Users/` placeholder.
- `bash plugins/pmos-toolkit/skills/feature-sdlc/tools/skill-eval-check.sh --target claude-code plugins/pmos-toolkit/skills/feature-sdlc` exits 0 (modulo any deliberately-accepted residual).
