---
task_number: 12
task_name: "risk_score with churn + coupling + class dominance + sort"
task_goal_hash: c9f3d6e2b8a571406f3c2d5e8b1f4c7d0a3b6e9c2f5d8a1b4e7f0a3b6e9c2d5f8
plan_path: "docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html"
branch: "feat/architecture-deep-pass"
worktree_path: "/Users/maneeshdhabria/Desktop/agent-skills-architecture-deep-pass"
status: done
started_at: 2026-05-22T06:45:00Z
completed_at: 2026-05-22T07:10:00Z
commit_sha: 3b4eeb6
files_touched:
  - plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/risk-score-ordering/.assert
---

## Key decisions

- **Severity → disposition mapping moved out of the jq pipeline into the
  Python heredoc.** The pre-T12 path applied the map in three jq steps
  at the REPORT_JSON build (`map(. + {severity: ...})`, `map(. + {disposition: ...})`,
  `map(del(.severity))`). With T12 needing per-finding risk_score, the
  Python pass is the natural place to apply both (single allocation,
  single output). The jq pipeline simplifies to one `sort_by` with the
  new key tuple. No double-mapping.

- **Churn counts commits, not log lines.** `git rev-list --count
  --since="<N> days ago" HEAD -- <file>` returns an integer (commit
  count). The earlier draft used `git log --since=... | wc -l` which
  counts log lines and is sensitive to `--pretty` format choice;
  Loop 2 SF3 of the plan flagged this. The Python heredoc uses the
  count form directly.

- **Per-file churn cache.** `churn_cache: dict[str, int]` keyed by
  relative file path. Multiple findings on the same file (common — one
  file → many rule hits) hit the cache instead of re-shelling git.
  Q-reviewer flagged as Minor "confirmed-not-a-finding" — earns its
  keep on realistic inputs.

- **Graceful-degrade on non-git scan root.** `git rev-parse --git-dir`
  probed once at heredoc init; on failure `is_git=False` and every
  `churn_for(...)` returns 0. Spec FR-50/E4 promises churn=0 here
  (not exit 64 — that's T13's `--since` territory).

- **Combined cap of 100 applied after individual caps.** `c = min(50,
  churn)`, `coup = min(50, 5*fanin)`, then `cc = min(100, c + coup)`.
  Two-stage cap matches D2 ("combined churn+coupling sum cap 100") and
  guarantees `risk_score ≤ disposition_weight + 100` (1100 / 200 / 101
  per disposition class — class dominance invariant).

- **`--sort` flag rejects unknown values with exit 64.** FR-42 phrased
  it as "no-op flag for forward-compat"; the reviewer flagged this as
  a stricter-than-spec interpretation. Kept the rejection — silent
  acceptance of `--sort whatever` would mask user typos. Clear error
  message: `unknown sort mode: <val> (only 'risk' supported)`.

- **`.assert` snapshots `src/service.py` + restores via `trap EXIT`.**
  The `git init` + 2-commit pre-seed runs `echo "" >> src/service.py`
  for the c2 mutation. Without restore, repeat fixture runs would see
  drifted content + leftover `.git/`. The test runner does not isolate
  per-fixture (no other fixture relies on isolation). `trap cleanup
  EXIT` is necessary — Q-reviewer confirmed.

- **Churn arithmetic pin on `imp1.py`, not `service.py`.** service.py
  is on the receiving end of imports (fanin=7) so its findings could
  be should_fix on PY-rules; imp1.py is a leaf importer (fanin=0,
  coupling=0) with predictable churn=1 (only c1 touches it). Pinning
  risk_score=101 there gives a clean arithmetic check that doesn't
  drift if PY rule wiring changes.

## Deviations

None.

## Verification

- `bash -n plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh` → exit 0.
- `bash plugins/pmos-toolkit/skills/architecture/tests/run.sh` →
  **36 passed, 1 failed** (`ts-circular`, pre-existing baseline).
  Same count as T11 (36/1) — risk-score-ordering still passes with
  the extended T12 assertions.
- Smoke: `jq -e '.findings | all(has("disposition") and has("risk_score"))'`
  and `jq -e '[.findings[] | .risk_score] | all(. >= 1 and . <= 1100)'`
  both pass on the fixture.
- Class dominance verified in-fixture via the min/max jq invariant
  on each adjacent pair (must_fix > should_fix, should_fix > wont_fix).

## Review log

- **Spec compliance reviewer:** `✅ Spec compliant`. All eleven contract
  points pass: FR-40 (disposition + risk_score, severity dropped),
  FR-41 (formula + churn from L3, weights, two-stage cap), FR-41
  graceful-degrade non-git, FR-42 sort + flag, D2 class dominance,
  plan T12 steps + inline verification, PD4 module_metrics dep,
  NFR-06 idempotency. Single non-blocking note: `--sort` strict
  rejection vs FR-42's "no-op" phrasing — defensible interpretation.
- **Code-quality reviewer:** Changes required — 2 Important + 2 Minor
  + 1 Nit:
  - **Important #1** `# T12 (FR-40/41/42): annotate findings ...`
    decorator banner — applied (deleted; matches the T9/T10/T11
    pattern of dropping task/FR-ID banners).
  - **Important #2** `.assert` decorator banners (`# T11:`/`# T12:`
    headers + `# ── T11 baseline ──` / `# ── T12: ... ──` section
    dividers) — applied (deleted all; kept the imp1.py arithmetic
    comment since it encodes the WHY of the 101 expected value).
  - **Minor #1** `try/except Exception` wrappers around `subprocess.run(
    ..., check=False)` are defensive against an invariant already
    established by the `is_git` gate — deferred. The except still
    catches FileNotFoundError if `git` disappears between the rev-parse
    probe and the rev-list call (unlikely but possible at boundary);
    the cost is two extra lines.
  - **Minor #2** churn_cache earns its keep on realistic inputs
    (many findings per file) — confirmed not a finding.
  - **Nit** `SORT_MODE` is write-only (stored but never read) — by
    design per FR-42's "reserve the CLI surface". Acceptable.

## Commits

- `e16a510` — `feat(T12): risk_score with churn + coupling + class dominance + sort`
- `3b4eeb6` — `fix(T12): drop T-tag decorator banners per Q-review`
