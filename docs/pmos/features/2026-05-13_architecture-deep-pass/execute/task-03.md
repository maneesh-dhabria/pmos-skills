---
task_number: 3
task_name: "Idiom AST walker — Typer/Click/Fire/argparse decorator detection with name-resolution map"
task_goal_hash: pending
plan_path: "docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html"
branch: "feat/architecture-deep-pass"
worktree_path: "/Users/maneeshdhabria/Desktop/agent-skills-architecture-deep-pass"
status: done
started_at: 2026-05-22T00:05:00Z
completed_at: 2026-05-22T00:55:00Z
files_touched:
  - plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/typer-mixed/src/cli.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/typer-mixed/.assert
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/click-cli/src/cli.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/click-cli/src/aliased.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/click-cli/.assert
commit_sha: 7bc0e9d
---

## Key decisions

- **Range start = min(decorator_list[*].lineno, FunctionDef.lineno)** — the decorator line is the first exempt line. End = `FunctionDef.end_lineno` (Py 3.8+).
- **Cycle-guard on self-referential resolution**. `import click` writes `name_map["click"] = "click"`; `resolve_to_framework` short-circuits when `head == cur` and `head ∈ CLI_FRAMEWORKS` to avoid an infinite loop.
- **First-resolved-framework-wins per file**. A file mixing `@click.command` and `@typer.command` will be labelled by whichever AST-walks first. Acceptable per FR-31's single-framework-per-file assumption; flagged as a quality-review NIT for future doc-comment.
- **Final emission merges via jq `--argjson`**. The new `idiomatic_exemptions_json` is merged into `exemptions` after Phase 3 via `jq -n --argjson s "$exemptions_summary_json" --argjson i "$idiomatic_exemptions_json" '$s + {idiomatic: $i}'`, then surfaced in the triplet's `exemptions.idiomatic[]`.
- **fire/argparse code path is generic, not specialised**. The framework set is enforced by membership in `CLI_FRAMEWORKS = {"typer","click","fire","argparse"}`; the walker doesn't branch on library identity. Real-world `fire`/`argparse` usage is usually call-based, not decorator-based — flagged as SHOULD-FIX by spec reviewer, deferred to T24 (fixture sweep) per plan.

## Deviations from plan

- Plan example noted `start=4, end=5` for typer-mixed. Actual fixture file places the `@app.command` decorator on line 5, so the as-shipped exempt range is `{start: 5, end: 7}`. The fixture's `.assert` uses the actual line numbers; plan example was illustrative.

## Two-stage review outcomes

- **Spec review (subagent a6ffff2c)**: PASS_WITH_NOTES — FR-30 / FR-31 / D13 / E9 all verified by line cite; output correctly surfaced as `exemptions.idiomatic[]`; idempotence sort keys confirmed. One SHOULD-FIX (fire/argparse fixture coverage) deferred to T24. Two NITs (single-framework-per-file comment; plan example update).
- **Quality review (subagent a491c220)**: APPROVED_WITH_NITS — heredoc hygiene (`<<'PY'`), AST error handling, jq `--argjson` merge, empty-results JSON emission all correct. One NIT applied pre-commit: dropped dead `parse_errors` counter (mirrors T2/0017876 dead-var pattern). Remaining NITs (3-pass AST walk, nested-Call decorator unwrap, comment density) noted as non-blocking.

## Runtime evidence

```
$ jq '.exemptions.idiomatic' typer-mixed-audit.json
[{"file":"src/cli.py","framework":"typer","exempt_ranges":[{"start":5,"end":7}]}]

$ jq '.exemptions.idiomatic' click-cli-audit.json
[{"file":"src/aliased.py","framework":"click","exempt_ranges":[{"start":3,"end":5}]},
 {"file":"src/cli.py","framework":"click","exempt_ranges":[{"start":3,"end":5}]}]

$ bash plugins/pmos-toolkit/skills/architecture/tests/run.sh | tail -3
ok  vue-mixed
---
25 passed, 1 failed
```

The 1 failure (`ts-circular`) is a pre-existing baseline failure unrelated to T3 (TS001 detector dependency on depcruise) — confirmed against pre-T3 HEAD.

## Verification outcome

- Pre-impl: 23 passed, 3 failed (typer-mixed + click-cli failed with `null` exempt-key; ts-circular baseline).
- Post-impl: 25 passed, 1 failed (typer-mixed + click-cli pass; ts-circular baseline unchanged).
- Idempotence verified by running click-cli audit twice and diffing `jq -S` output.
