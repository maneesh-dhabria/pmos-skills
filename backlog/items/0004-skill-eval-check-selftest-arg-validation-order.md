---
id: 4
title: "skill-eval-check.sh --selftest aborts before reaching selftest dispatch (arg-validation order bug)"
type: bug
status: wontfix
priority: should
labels: [skill-eval, feature-sdlc, tooling]
created: 2026-05-13
updated: 2026-06-12
source: docs/pmos/features/2026-05-13_polish-editorial-pass/ (caught while debugging the [D]-body-check race during /skill-sdlc for /polish)
spec_doc:
plan_doc:
pr:
parent:
dependencies: []
---

## Context

`bash plugins/pmos-toolkit/skills/feature-sdlc/tools/skill-eval-check.sh --selftest` fails with `ERROR: no <skill_dir> given` and exit code 2 — the selftest can never be invoked from the CLI as documented.

The validation at line 36 (`[[ -n "$SKILL_DIR" ]] || die "no <skill_dir> given"`) runs **before** the selftest branch at line 52 (`if [[ $SELFTEST -eq 1 ]]; then …`). So `--selftest` alone — with no positional `<skill_dir>` — always trips the validation. Verified against both pre- and post-`fix(skill-eval): de-flake [D] body checks` versions (it's a pre-existing ordering bug, unrelated to the SIGPIPE de-flake).

This matters because `--selftest` is the contract that enforces the bijection between `DET_CHECKS` (the script) and the `[D]`-tagged rows in `feature-sdlc/reference/skill-eval.md` — if it can't run, the bijection can silently drift on future edits.

## Acceptance Criteria

- `bash skill-eval-check.sh --selftest` (no positional arg) runs the selftest and exits `0` on bijection success / `1` on drift, never `ERROR: no <skill_dir> given`.
- Scoring mode (`--target <p> <skill_dir>`) still requires `<skill_dir>` and still errors when it's missing.
- Either reorder the validation so the selftest branch runs first, or special-case `[[ $SELFTEST -eq 1 ]]` to skip the `<skill_dir>` check.

## Notes

Fix is ~3 lines. Should probably ship with the next `/feature-sdlc skill --from-feedback` pass on `feature-sdlc` itself.
