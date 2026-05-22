---
task_number: 17
task_name: "--deep runtime probe + module_metadata payload + size cap"
task_goal_hash: b3c6f9d2e5a83061c4d7e0f3a6b9c2d5e8f1a4b7c0d3e6f9a2c5b8e1d4a7c0f3
plan_path: "docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html"
branch: "feat/architecture-deep-pass"
worktree_path: "/Users/maneeshdhabria/Desktop/agent-skills-architecture-deep-pass"
status: done
started_at: 2026-05-22T09:10:00Z
completed_at: 2026-05-22T09:45:00Z
commit_sha: d255e4b
files_touched:
  - plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/deep-pass-no-tool-use/pyproject.toml
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/deep-pass-no-tool-use/src/main.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/deep-pass-no-tool-use/.assert
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/deep-pass-size-cap/pyproject.toml
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/deep-pass-size-cap/.assert
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/deep-pass-prep/pyproject.toml
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/deep-pass-prep/src/main.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/deep-pass-prep/.assert
---

## Key decisions

- **Probe via `SKILL_NO_SUBAGENT=1` env var.** Test stub; in production
  the SKILL.md orchestrator sets the same var when the Task tool is
  unavailable. On probe failure the pipeline does NOT exit —
  mechanical findings still flow; only `deep_pass.skipped_reason`
  carries the signal. Spec FR-21 requires this.

- **NFR-09 layer-1 denylist applied at metadata build time, not at the
  Phase-3 walker.** The walker already excludes secret paths in
  practice, but the spec mandates defense-in-depth — the denylist must
  fire here too in case future walker changes regress. Six chained
  `select(... | not)` clauses cover all 8 patterns
  (`.env` / `.env.*` collapsed into one regex). Kept the chain over a
  single `|`-alternation regex because future denylist additions are
  more readable line-by-line.

- **Size cap counted AFTER denylist filter** so secret-bearing paths
  can't push a project over the 5k cap. Soft-warn KB estimate uses
  150 bytes/entry per spec D15. `ARCH_DEEP_NO_CAP=1` bypasses both
  thresholds.

- **T17 transitional state: probe-success also defaults to
  `skipped_reason=no_subagent_tool_use`.** Until T18 wires the actual
  Task dispatch, no subagent is *actually* used — the enum value is
  factually correct. Spec FR-29 lists `no_subagent_tool_use` as the
  legal value for this condition. T18 will replace this with real
  dispatch + `skipped_reason: null` on success.

- **Q-fix collapsed the dual-write of `deep_pass_skipped_reason`.**
  Original had `=""` init → conditional set in probe → late default
  via `[ -z ]`. Reviewer flagged this as confusing; collapsed to a
  single default-on-init (`="no_subagent_tool_use"`) with the
  SKILL_NO_SUBAGENT branch short-circuiting the heavy work
  (denylist + size-cap + --deep-prep). Net: one assignment, no
  recheck.

- **`--deep-prep <tmpfile>` writes JSON sidecar payload + exit 0.**
  T18 wires the partner `--deep-finalize` mode that reads
  `<tmpfile>.result`. Spec PD6.

- **Size-cap fixture builds 5,001 files dynamically** in `.assert`
  with trap cleanup. 5,001 committed files would bloat the repo;
  generation takes ~30s but stays well within the suite's runtime
  budget.

- **`deep_pass_json='null'` hoist above WARN_MODE guard.** Same pattern
  as `cycles_json`, `module_metrics_json`, `findings_with_risk_json`,
  `diff_json` (T10/T11/T12/T14). The `--argjson deep_pass` reference
  in REPORT_JSON would `set -u` trap without the default when --deep
  is absent.

## Deviations

- **Plan step "filter against the NFR-09 denylist (`**/.env`,
  `**/*.pem`, etc.)"** implemented via jq regex chain rather than a
  Python heredoc; both meet the spec contract. jq keeps the implementation
  inline + bash 3.2 safe.

## Verification

- `bash -n plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh`
  → exit 0 (pre + post Q-fix).
- `bash plugins/pmos-toolkit/skills/architecture/tests/run.sh` →
  **46 passed, 1 failed** (`ts-circular`, pre-existing baseline).
  +3 over T16's 43 passed (deep-pass-no-tool-use, deep-pass-size-cap,
  deep-pass-prep).
- Smoke (no-tool-use): `SKILL_NO_SUBAGENT=1 audit . --deep` →
  `deep_pass.skipped_reason == "no_subagent_tool_use"`; findings preserved.
- Smoke (size-cap): 5,001-file fixture exits 64 with the spec-L174
  literal; `ARCH_DEEP_NO_CAP=1` succeeds.
- Smoke (--deep-prep): tmpfile contains `{module_metadata, seed_hint,
  vocab_path}` with `vocab_path` ending in
  `reference/deepening-vocabulary.md`.

## Review log

- **Spec compliance reviewer:** `✅ Spec compliant`. All 10 contract
  points pass: flag parsing, boundary check, runtime probe (FR-21),
  NFR-09 denylist (8 patterns), size cap (FR-23) including KB
  estimate + `ARCH_DEEP_NO_CAP` bypass, post-filter module_count,
  --deep-prep writer, deep_pass REPORT_JSON shape (FR-29), null on
  --deep absence, fixtures non-trivial. Transitional probe-success
  default explicitly accepted as a T17→T18 stepping stone (the enum
  value is honest — no subagent is *actually* used yet).
- **Code-quality reviewer:** `🛠 Changes required` — 1 Important + 1
  Important + 4 Minor + 1 Nit:
  - **Important #1** `T17 (FR-…)` decorator banner — applied (dropped;
    replaced with plain header).
  - **Important #2** dual-write of `deep_pass_skipped_reason` — applied
    (collapsed to default-on-init; SKILL_NO_SUBAGENT short-circuits
    heavy work).
  - **Minor #1-#4** chatty WHY comments — applied (trimmed to one
    transitional-state explainer at the top; dropped layer-1 callout
    and PD6/T18 forward refs).
  - **Nit** jq denylist regex collapse — deferred (per-line chain is
    easier to extend with future patterns; reviewer marked as accept).

## Open carry to later tasks

- **T18:** wire real Task dispatch + replace transitional
  `no_subagent_tool_use` default with `null` on success.
- **reference/deepening-vocabulary.md** does NOT exist yet; T17
  records the path but doesn't read the body. T18 (Task dispatch)
  must ship this file.

## Commits

- `6f9133d` — `feat(T17): --deep runtime probe + module_metadata payload + size cap`
- `d255e4b` — `fix(T17): collapse dual-write + drop decorator banner per Q-review`
