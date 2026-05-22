---
task_number: 14
task_name: "--baseline single-stack diff"
task_goal_hash: e7c4b9d2f5a83061b9c3d6e8f2a4c7d0a3b6e9c2d5f8a1b4e7c0a3f6e9b2c5d8
plan_path: "docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html"
branch: "feat/architecture-deep-pass"
worktree_path: "/Users/maneeshdhabria/Desktop/agent-skills-architecture-deep-pass"
status: done
started_at: 2026-05-22T07:45:00Z
completed_at: 2026-05-22T08:05:00Z
commit_sha: d2dac8a
files_touched:
  - plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/baseline-schema-v1/baseline.json
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/baseline-schema-v1/pyproject.toml
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/baseline-schema-v1/src/main.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/baseline-schema-v1/.assert
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/baseline-diff/baseline.json
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/baseline-diff/pyproject.toml
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/baseline-diff/src/kept.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/baseline-diff/src/new.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/baseline-diff/.assert
---

## Key decisions

- **Tuple identity `(rule_id, file, line)` only.** Per FR-51 / E15
  additive-field forward-compat: `risk_score`, `disposition`,
  `message` and any future field are NOT part of identity. A baseline
  carrying v2 + `severity` (legacy) or current with a new top-level
  key both round-trip cleanly because `tuple_set()` only reads three
  fields via `.get()`.

- **Diff runs AFTER T12 risk-score + T13 --since filter.** Input is
  `findings_with_risk_json` (post-prune, post-risk-score). This means
  T15's `--since` + `--baseline` AND-intersect falls out for free:
  diff is computed against the already-pruned set.

- **Two-message split for v1 vs other-non-2.** Spec L170 documents the
  v1-specific hint (`severity` → `disposition` rename); other versions
  get the FR-51 generic form. The `if sv == 1` branch reads as the
  spec; no comment needed.

- **`diff_json='null'` hoist above WARN_MODE guard.** Same pattern as
  T10/T11/T12 (`cycles_json`, `module_metrics_json`,
  `findings_with_risk_json`) — when `--baseline` isn't passed, the jq
  REPORT_JSON references `$diff_json` and would trip `set -u` without
  the default. Default is JSON literal `null` (not `[]`) so consumers
  can distinguish "no baseline supplied" from "baseline says no
  deltas".

- **`if ! diff_json=$(... <<'PY' ... PY); then exit 64; fi` form.**
  Initial implementation used `set +e; diff_json=$(...); rc=$?; set
  -e; if [ "$rc" -ne 0 ]; then exit "$rc"; fi` with a 1-line WHY
  comment about the heredoc + set-e dance. Q-reviewer flagged the
  Important refactor — the `if !` form expresses the same intent in
  one bash idiom, no `set +e` toggle, no rc capture, no comment.
  Python's `sys.exit(64)` already prints to stderr before exit; bash
  propagates via `exit 64`. Net -3 LOC + comment.

- **Bash `[ ! -f "$BASELINE" ]` pre-check kept.** Reviewer's Minor #3
  argued for dropping it in favor of Python's `OSError` catch. The
  bash check buys a cleaner stderr (`baseline file not found: <path>`
  vs Python's `baseline file unreadable or malformed: [Errno 2] No
  such file or directory: '<path>'`). UX over consolidation; the
  boundary check is at the right place (user-supplied path).

- **`tuple_set` / `to_obj` helpers + sort with None-coercion kept.**
  Reviewer's Nit #1 flagged the `t[0] or ""` coercion as defensive
  against an invariant — but the v2 contract guarantees `rule_id` /
  `file` / `line`, NOT `int`/`str` typing for line specifically (it
  could be `null` if a finding is file-level). The `or 0` coercion is
  load-bearing for that edge case. Kept.

- **Spec L172 (non-git scan root + --baseline → exit 64) NOT
  implemented in T14.** Spec-compliance reviewer flagged this as
  potentially T15 scope; plan T14 lists only FR-51 + E15 (not L172).
  Briefly added the guard then backed it out when it would have
  required pre-seeding `.git/` in the `baseline-schema-v1` fixture
  (whose .assert depends on the schema-check firing first, not the
  non-git guard). Tracked as a T15 follow-up — T15 modifies the same
  Phase-6 block for AND-intersect ordering, natural place to add the
  L172 guard for both `--since` and `--baseline`.

## Deviations

- **Plan step "record in `config.flags.baseline`" not implemented.**
  Not part of FR-51's contract; spec-compliance reviewer flagged as
  non-blocking. Defer until a downstream consumer needs it.

## Verification

- `bash -n plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh` → exit 0.
- `bash plugins/pmos-toolkit/skills/architecture/tests/run.sh` →
  **40 passed, 1 failed** (`ts-circular`, pre-existing baseline).
  +2 over T13's 38 passed (the new `baseline-schema-v1` +
  `baseline-diff` fixtures).
- Smoke: missing path → `bash run-audit.sh . --baseline /tmp/nx.json;
  echo $?` → 64.
- Smoke: v2 baseline → `.diff.new`, `.diff.dropped`, `.diff.unchanged`
  all present in JSON sidecar.

## Review log

- **Spec compliance reviewer:** `✅ Spec compliant`. All 11 contract
  points pass: flag, diff shape, tuple identity, schema_version exit
  hints (v1 verbatim + generic), E15 additive-field forward-compat,
  placement, missing-file handling, malformed-JSON handling,
  no-baseline `null` rendering, determinism (sorted tuples), fixture
  non-triviality. Informational: plan-step `config.flags.baseline`
  not implemented (non-blocking, not in FR-51); spec L172 non-git
  guard flagged for T15.
- **Code-quality reviewer:** Changes required — 1 Important + 3 Minor
  + 2 Nits:
  - **Important** `set +e/-e` dance → `if !` form — applied (collapsed
    to one bash idiom; -3 LOC + WHY comment).
  - **Minor #1** WHY comment about heredoc rc capture — applied
    (evaporates with the refactor above).
  - **Minor #2** `diff_json='null'` hoist load-bearing for the jq
    no-baseline path — confirmed keep (reviewer agreed).
  - **Minor #3** drop `[ ! -f ]` bash pre-check in favor of Python
    `OSError` — deferred (UX of cleaner stderr beats internal
    consolidation; user-path boundary check is right where the
    boundary lives).
  - **Nit #1** None-coercion in sort keys — deferred (`line` can be
    `null` for file-level findings; the `or 0` is load-bearing).
  - **Nit #2** spec-mandated v1 vs other-non-2 split — confirmed
    keep.

## Commits

- `6ef00de` — `feat(T14): --baseline single-stack diff`
- `d2dac8a` — `fix(T14): collapse set +e/-e dance into if-! form per Q-review`
