---
task_number: 16
task_name: "--scaffold-l3 with idiomatic exemption seeding"
task_goal_hash: a2e5f8c1d4b7036281c4d7e0f3a6b9c2d5e8f1a4b7c0d3e6f9a2c5b8e1d4a7f0
plan_path: "docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html"
branch: "feat/architecture-deep-pass"
worktree_path: "/Users/maneeshdhabria/Desktop/agent-skills-architecture-deep-pass"
status: done
started_at: 2026-05-22T08:45:00Z
completed_at: 2026-05-22T08:58:00Z
commit_sha: b887d14
files_touched:
  - plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/scaffold-l3-fresh/pyproject.toml
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/scaffold-l3-fresh/src/cli.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/scaffold-l3-fresh/.assert
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/scaffold-l3-existing/pyproject.toml
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/scaffold-l3-existing/src/main.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/scaffold-l3-existing/.pmos/architecture/principles.yaml
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/scaffold-l3-existing/.assert
---

## Key decisions

- **Insertion point: right after L1 idiom detection finalizes
  `idiomatic_exemptions_json` (L1233).** Early enough to skip U011 +
  risk-score + --since + --baseline + REPORT_JSON + triplet emit; late
  enough to have the idiomatic map populated. One WHY comment names
  the position constraint so a future reader doesn't move it.

- **YAML emitted via line-list builder, not `yaml.safe_dump`.** The
  spec template includes a *commented* example block before
  `rules: []` — round-tripping that through PyYAML would drop the
  comments. Line-list keeps the output deterministic and matches the
  spec template byte-for-byte. Dedup + sort the `(file, framework)`
  pairs via `set` + `sorted()` for stable output across runs.

- **Empty-idiom case emits literal `idiomatic: []`.** The scaffold is
  still useful as a starting point when a project has no detected
  idioms; the empty list is valid YAML and the user can hand-edit.

- **Env-var passthrough into the Python heredoc**
  (`IDIOMATIC_JSON_ENV`, `TARGET_PATH_ENV`). Consistent with all other
  heredocs in this file and avoids quote-injection from
  `$idiomatic_exemptions_json` content.

- **Refuse-overwrite check via `[ -e "$scaffold_target" ]` (not
  `[ -f ]`).** `-e` catches the case where the path exists as a
  directory or symlink too — slightly safer for the boundary check.

- **Fixture style follows established convention.** `scaffold-l3-fresh`
  uses the `$AUDIT` wrapper (happy path; no stderr assertions).
  `scaffold-l3-existing` bypasses the wrapper for stderr capture (rc +
  literal stderr assertion) — same pattern as
  `baseline-index-no-monorepo` and `baseline-schema-v1`.

## Deviations

None.

## Verification

- `bash -n plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh` → exit 0.
- `bash plugins/pmos-toolkit/skills/architecture/tests/run.sh` →
  **43 passed, 1 failed** (`ts-circular`, pre-existing baseline).
  +2 over T15's 41 passed (`scaffold-l3-fresh` + `scaffold-l3-existing`).
- Smoke: scaffold against this repo (after delete) writes
  `schema_version: 2` + idiomatic entries; re-run refuses with the
  documented stderr.

## Review log

- **Spec compliance reviewer:** `✅ Spec compliant`. All eight contract
  points pass: flag parsed as no-arg, target path correct, YAML shape
  correct (schema_version 2, commented example, rules slot,
  exemptions.idiomatic[]), refuse-overwrite emits spec-L169 literal
  with exit 64, triplet emission skipped, success message + exit 0,
  placement doesn't break earlier FRs, fixtures non-trivial.
- **Code-quality reviewer:** `✅ LGTM`. The WHY comment justifies the
  non-obvious position; heredoc bash 3.2 safe; line-list builder is
  load-bearing for the conditional `if not pairs` branch (multi-line
  string would still need concatenation); success message
  appropriately terse; fixture style consistent with prior peers.

## Commits

- `b887d14` — `feat(T16): --scaffold-l3 with idiomatic exemption seeding`
