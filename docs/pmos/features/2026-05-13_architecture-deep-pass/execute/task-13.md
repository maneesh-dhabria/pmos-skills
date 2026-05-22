---
task_number: 13
task_name: "--since filter"
task_goal_hash: d4f8a1c6e2b9573086c4d5e7f1a3c6b9d2e5f8a1c4d7b0e3f6a9c2d5e8b1f4a7
plan_path: "docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html"
branch: "feat/architecture-deep-pass"
worktree_path: "/Users/maneeshdhabria/Desktop/agent-skills-architecture-deep-pass"
status: done
started_at: 2026-05-22T07:20:00Z
completed_at: 2026-05-22T07:45:00Z
commit_sha: ad98b76
files_touched:
  - plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh
  - plugins/pmos-toolkit/skills/architecture/tests/audit-wrapper.sh
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/since-baseline-and/pyproject.toml
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/since-baseline-and/src/__init__.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/since-baseline-and/src/baseline.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/since-baseline-and/src/touched.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/since-baseline-and/src/touched_more.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/since-baseline-and/.assert
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/since-not-git/pyproject.toml
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/since-not-git/src/main.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/since-not-git/.assert
---

## Key decisions

- **Filter runs BEFORE T12's risk_score Python heredoc.** Dropping
  findings up front avoids spawning per-file `git rev-list --count`
  subprocesses for findings about to be deleted. Order matters; left
  a one-line WHY comment at the block.

- **`.git`-as-file (gitlink) detection via `[ -e ]`, not `[ -d ]`.** A
  normal clone has `.git/` as a directory; a `git worktree add` checkout
  has `.git` as a regular file containing `gitdir: …`. `-e` catches
  both. The implementer hit this during a smoke run inside the active
  worktree (where `-d` rejected a valid repo); the inline comment
  documents the semantics.

- **Bad-ref handling beyond FR-50.** Spec only mandates exit 64 on
  non-git scan root. The implementation also exits 64 if `git diff`
  itself fails (unknown ref, malformed range) — `--since ref unknown
  or invalid: <git's stderr>`. Defensible safety net; spec-compliance
  reviewer marked it as a reasonable extrapolation.

- **`audit-wrapper.sh` flag pass-through.** Pre-T13 the wrapper hard-
  coded `bash run-audit.sh audit "$SCAN_ROOT"` — no way to forward
  flags from `.assert`. Added `shift || true` + `"$@"` to forward.

- **Drop-leading-`.` block in `audit-wrapper.sh` is necessary, not
  defensive.** `tests/run.sh` bakes `.` into `$AUDIT` (`audit_cmd="bash
  $SKILL_DIR/tests/audit-wrapper.sh ."`); many `.assert` scripts then
  call `$AUDIT . --since HEAD~1`, producing two leading dots at the
  wrapper. Without the drop, run-audit.sh sees two positionals and
  rejects with `too many positionals`. The Q-reviewer flagged this as
  dead code; verified live by reverting it (since-baseline-and failed
  with `audit exited non-zero`). Restored with a comment that names
  the test-runner convention so a future reader doesn't drop it again.

- **`since-not-git/.assert` bypasses the wrapper.** The wrapper does
  `2>/dev/null`, so the documented stderr line can't be asserted
  through it. Direct `bash run-audit.sh audit . --since HEAD~1 2>&1`
  invocation captures stderr. Inline comment explains the bypass.

- **Fixture trigger rule is U004 (`print()` outside scripts/tests).**
  Each `src/touched*.py` carries a one-line `print("x")` so the audit
  reliably emits a finding on it. Simpler than the U007 / PY009 paths
  and gives a deterministic `risk_score == 102` (should_fix 100 + churn
  2 + coupling 0) on `touched_more.py`.

## Deviations

None.

## Verification

- `bash -n plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh` → exit 0.
- `bash plugins/pmos-toolkit/skills/architecture/tests/run.sh` →
  **38 passed, 1 failed** (`ts-circular`, pre-existing baseline).
  +2 over T12's 36 passed (the new `since-baseline-and` + `since-not-git`
  fixtures).
- Smoke (non-git): inside a fresh `mkdir`, `bash run-audit.sh audit .
  --since HEAD~1; echo $?` → exit 64 with the documented stderr.
- Smoke (real repo): `bash run-audit.sh . --since HEAD~5` succeeds; finding
  count smaller than full run (only files changed since HEAD~5).

## Review log

- **Spec compliance reviewer:** `✅ Spec compliant`. All eight contract
  points pass: filter semantics (FR-50), exit-64 + literal stderr,
  filter placement (before risk-score), E4 graceful-degrade interaction
  (T12's churn=0 path unaffected when --since absent), plan step
  coverage, audit-wrapper.sh minimality, bad-ref handling, fixture
  correctness. Informational note: plan mentions recording `--since` in
  `config.flags.since` for JSON sidecar; not in FR-50 contract so
  deferred — revisit if T14/T15 need the hook.
- **Code-quality reviewer:** Changes required — 1 Important + 1 Minor
  + 1 Nit:
  - **Important** "drop-leading-`.` block is dead code" — initially
    applied; reverted after fixture regression proved the reviewer
    wrong about the calling convention. Net effect: restored with a
    tighter comment naming the `tests/run.sh` convention (so the next
    Q-reviewer doesn't fall into the same trap).
  - **Minor** `# T13 (FR-50, E4) — …` decorator banner — applied
    (trimmed to a 2-line WHY about ordering; FR-IDs dropped).
  - **Nit** since-not-git/.assert "bypassing audit-wrapper.sh" comment
    — confirmed keep (good WHY; matches T9-T12 keep-pattern).

## Commits

- `0188dcd` — `feat(T13): --since filter`
- `ad98b76` — `fix(T13): trim T13 banner; reframe drop-dot comment per Q-review`
