---
id: 0008
title: skill-eval-check.sh --selftest failure surfacing — bijection break (e.g., §[A-F] vs §G) exits 1 with no stdout; stderr alone is easy to lose
type: tech-debt
status: wontfix
priority: could
labels: [feature-sdlc, skill-eval, dev-ergonomics]
created: 2026-05-13
updated: 2026-06-12
source: 2026-05-13 /complete-dev session for feat/fsdlc-base-drift-and-release-scope
spec_doc:
plan_doc:
pr:
parent:
dependencies: []
---

## Context

While extending the skill-eval rubric to add §G (release-prerequisites scope), `tools/skill-eval-check.sh --selftest` exited 1 silently the first time it ran. The bijection check
(`grep -oE 'skill-patterns\.md §[A-F]'`) didn't match the new §G rows, so the per-row count came back 0 and the `SELFTEST FAIL` line was emitted on stderr. Under common
caller patterns (`2>&1 | tail -N`, or `>/dev/null` redirects, or hooks that swallow stderr) the failure can disappear, leaving only the non-zero exit code.

Compounding factors:
- The script has no `--selftest --verbose` toggle that mirrors stderr to stdout, so adding `2>&1` is the only escape.
- `set -euo pipefail` is on at the top of the script; the per-row inner pipelines (`grep | sort -u | wc -l | tr -d ' '`) interact with pipefail in non-obvious ways during error paths (see item 0005 for a related SIGPIPE risk in `HAS_SCRIPTS` detection).
- The shape of the failure message (`SELFTEST FAIL: check '<id>' names 0 skill-patterns §-rules (expected 1)`) is descriptive enough once seen, but it's hard to see if it never reaches a TTY.

## Acceptance Criteria

- [ ] On any selftest failure, the failure line(s) appear on **stdout** as well as stderr (or the script always prints a one-line summary on stdout — `SELFTEST FAIL: N issue(s); details on stderr`).
- [ ] The bijection regex matching skill-patterns §-letters does not hard-code an upper-bound letter — either it accepts `§[A-Z]` or it derives the bound from the skill-patterns.md table of contents.
- [ ] A `--selftest` smoke test exists in `tests/` that inserts a new fake §-letter row and asserts the selftest fails loudly (visible on stdout).
- [ ] Document the failure-surfacing contract in the script header comment so future contributors know they don't need `2>&1`.

## Notes

Related: item 0004 (selftest arg-validation order bug), item 0005 (find-pipe SIGPIPE risk). Together these three suggest a small "skill-eval-check.sh hardening" milestone — could be one /spec, one /plan, one /execute pass.
