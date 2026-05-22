---
task_number: 20
task_name: "NFR-09 secret-file Read denylist wrapper"
plan_path: "docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html"
branch: "feat/architecture-deep-pass"
worktree_path: "/Users/maneeshdhabria/Desktop/agent-skills-architecture-deep-pass"
status: done
started_at: 2026-05-22T11:30:00Z
completed_at: 2026-05-22T11:55:00Z
commit_sha: 8d7044b
files_touched:
  - plugins/pmos-toolkit/skills/architecture/tools/dispatch-deep-pass.sh
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/deep-pass-secret-deny/.env
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/deep-pass-secret-deny/src/main.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/deep-pass-secret-deny/pyproject.toml
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/deep-pass-secret-deny/mock.result
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/deep-pass-secret-deny/.assert
---

## Key decisions

- **Dual-use script via `BASH_SOURCE` guard.** `read_with_denylist()` is
  defined at the top of the file, then the main flow is reached only when
  `${BASH_SOURCE[0]} = ${0}` (i.e. invoked as `bash dispatch-deep-pass.sh
  <payload>`). When sourced (`source dispatch-deep-pass.sh`) the script
  `return 0`s right after defining the function so the caller gets just the
  helper, no arg parsing, no vocab check. This is the cleanest macOS bash 3.2
  compatible pattern — no associative arrays, no `=~`, just `case` globbing.

- **Glob set ported from T17 jq filter.** Same 8 patterns
  (`**/.env`, `**/.env.*`, `**/*.pem`, `**/*.key`, `**/credentials.json`,
  `**/credentials.yaml`, `**/.ssh/**`, `**/secrets/**`) — bash 3.2 `case` has
  no recursive `**` operator so each pattern collapses to two alternatives:
  bare-name (`.env`) and any-depth (`*/.env`). `*.pem`/`*.key` match at any
  depth because shell `*` already crosses path components in `case`.

- **Stub string is verbatim from the task brief.** `"path matched secret-file
  denylist; not read"` — kept identical across all branches so callers can
  detect denied reads with one string equality.

- **Advisory section in system prompt uses spec's literal `**/...` globs.**
  The bash `case` patterns are an implementation detail; the subagent reads
  the conventional globs (which it understands as text). One advisory
  sentence per NFR-09 mechanism (b) — "do not fabricate evidence from files
  you could not read; skip them."

- **Integration fixture: candidate's `module` IS `.env`** (a real file in
  the fixture). Validation triggers because the candidate's `evidence`
  string (`"FAKE_SECRET=hallucinated_value_xyz"`) does not appear verbatim
  in `.env`, simulating fabrication after a denied Read. The actual `.env`
  has a different real value (`REAL_SECRET=actual_value_in_file`) so the
  grep miss is genuine.

- **Vocab file not required for this fixture.** Verified
  `run-audit.sh --deep-finalize-from` never shells out to
  `dispatch-deep-pass.sh` (it reads the result file and runs the Python
  validator inline). So the vocab-missing exit-64 in dispatch is irrelevant
  to the `validation_failed` path under test. T22 ships the vocab file.

- **Unit + integration in one .assert.** Unit calls `read_with_denylist`
  via `bash -c 'source "$1"; read_with_denylist .env' _ "$SKILL_DIR/tools/..."`,
  asserting both stub-on-match (`.env`) and passthrough (`src/main.py`).
  Integration uses the same `FIXTURE=1 $AUDIT . --deep --deep-finalize-from
  mock.result` pattern as the sibling `deep-pass-validation-fail` fixture.

## Deviations

None.

## Verification

- `bash -n plugins/pmos-toolkit/skills/architecture/tools/dispatch-deep-pass.sh`
  → exit 0.
- `bash plugins/pmos-toolkit/skills/architecture/tests/run.sh` →
  **54 passed, 1 failed** (pre-existing `ts-circular` baseline).
  Delta vs T19: 53→54 passed (+1 for `deep-pass-secret-deny`).
- Inline plan check: sourcing dispatch-deep-pass.sh and calling
  `read_with_denylist .env` from the fixture → emits the stub string
  exactly; passthrough on `src/main.py` returns file content verbatim.

## Review log

- **Spec compliance reviewer:** `✅ Spec compliant`. All 8 NFR-09 globs
  covered by `case` arms; stub string verbatim; advisory block coexists
  with system prompt (two-mechanism contract honored); library
  callability via BASH_SOURCE guard; pass-through verified; fixture
  exercises both unit + integration paths per plan.
- **Code-quality reviewer:** `🛠 Changes required` — 2 Minor + 1 Nit:
  - **Minor #1** stub string repeated 6× across case arms — applied
    (hoisted to `local stub="..."`; reduces drift risk against the
    `.assert` literal).
  - **Minor #2** 6 case arms all return the same stub — applied
    (collapsed to single arm with line-continuation `\|` separators;
    makes the "kept in sync with T17" invariant one eyeball).
  - **Nit** 8 literal `printf '%s\n' '<glob>'` lines could be a
    heredoc — deferred (defer-to-author; either form is fine and the
    current shape mirrors the rest of the prompt-assembly block).
  - Accepted as-is: BASH_SOURCE guard pattern, the "kept in sync with
    T17" cross-file invariant comment, `cat "$path"` boundary
    behaviour, fixture coverage.

## Open carry to later tasks

- **T22:** ship `reference/deepening-vocabulary.md` (currently the
  dispatch wrapper exits 64 when running as a script if the file is
  absent; the function path is unaffected).
- **T23:** wire SKILL.md to (a) source `dispatch-deep-pass.sh` so the
  orchestrator can call `read_with_denylist` around the Task subagent's
  Read calls, and (b) consume the prompt sidecar (which now embeds the
  denylist advisory).

## Commits

- `8f3cadf` — `feat(T20): NFR-09 secret-file Read denylist wrapper`
- `8d7044b` — `fix(T20): collapse case arms + hoist stub var per Q-review`
