---
id: 5
title: "skill-eval-check.sh HAS_SCRIPTS detection uses `find … | grep -q .` — same SIGPIPE/pipefail pattern as the body-check race"
type: tech-debt
status: wontfix
priority: could
labels: [skill-eval, feature-sdlc, tooling, robustness]
created: 2026-05-13
updated: 2026-06-12
source: docs/pmos/features/2026-05-13_polish-editorial-pass/ (sibling of the `body | grep -q` race fixed in pmos-toolkit 2.40.0)
spec_doc:
plan_doc:
pr:
parent:
dependencies: []
---

## Context

The `body | grep -q` race in `skill-eval-check.sh` was de-flaked in pmos-toolkit 2.40.0 by caching the body once and reading the `[D]` body checks from a here-string. The same SIGPIPE / `set -o pipefail` pattern still lives in the `HAS_SCRIPTS` detection a few lines earlier (≈ line 141–143):

```bash
if find "$SKILL_DIR" -type f \( -name '*.sh' -o -name '*.py' -o -name '*.js' \) \
     -not -path "$SKILL_DIR/assets/*" -not -path "$SKILL_DIR/reference/*" -not -path "$SKILL_DIR/references/*" \
     -not -path "$SKILL_DIR/tests/*" | grep -q .; then HAS_SCRIPTS=1; fi
```

`grep -q .` closes the pipe on the first matching line; `find` gets SIGPIPE on its next write; under `pipefail` the whole pipeline reports failure → `HAS_SCRIPTS=0` even though the skill *does* bundle a script. Not currently observed flaky in this repo (`find` typically produces a small enough output to fit in the pipe buffer before `grep -q` reads it), but it's the same fragility pattern and will start firing as soon as a skill ships a deeper `tools/` / `scripts/` tree, or someone runs it on a slower filesystem (network mount, container with stricter scheduling).

## Acceptance Criteria

- Replace `find … | grep -q .` with a SIGPIPE-safe form (here-string of cached output, or `find … -print -quit` which exits naturally on the first hit, or `[[ -n "$(find …)" ]]`).
- A targeted test or comment in the script asserts the pattern is no longer used; `bash -n` clean.
- Re-run `skill-eval-check.sh` against `/feature-sdlc` itself (which has `tools/`) and confirm `e-scripts-dir` decisions are stable across 10 consecutive runs.

## Notes

Trivial fix (1–3 lines). Pair this with item 0004 in the next `/feature-sdlc skill --from-feedback` pass on `feature-sdlc`.
