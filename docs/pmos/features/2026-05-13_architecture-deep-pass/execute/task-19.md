---
task_number: 19
task_name: "--deep promotion (DEEP_LEAKY/SHALLOW) + size-class demotion reconciliation"
task_goal_hash: d5a8b1e4f7c0d3e6a9b2c5f8d1a4e7b0c3d6f9a2e5b8c1d4a7f0b3e6c9d2a5f8
plan_path: "docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html"
branch: "feat/architecture-deep-pass"
worktree_path: "/Users/maneeshdhabria/Desktop/agent-skills-architecture-deep-pass"
status: done
started_at: 2026-05-22T10:50:00Z
completed_at: 2026-05-22T11:25:00Z
commit_sha: 431ec4e
files_touched:
  - plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/deep-pass-happy-path/.assert
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/deep-pass-size-class-demotion/pyproject.toml
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/deep-pass-size-class-demotion/src/big.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/deep-pass-size-class-demotion/mock.result
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/deep-pass-size-class-demotion/.assert
---

## Key decisions

- **Single Python heredoc handles promotion + demotion.** Placed
  AFTER T12 risk-score (so mechanical findings are scored) and
  BEFORE T14 --baseline diff (so demoted/promoted findings flow
  through the diff). T18's FR-25 validator heredoc is untouched —
  return-shape contract preserved.

- **Promoted finding risk_score = disposition_weight only**
  (1000 for must_fix DEEP_LEAKY, 100 for should_fix DEEP_SHALLOW).
  No churn/coupling lookup. YAGNI per task guidance; class-dominance
  invariant (D2) preserved. A mechanical must_fix with full churn +
  coupling reaches 1100, ranking above a promoted DEEP_LEAKY at
  1000 — but both stay in must_fix class so within-class ordering
  is the only effect. Acceptable; if downstream needs richer
  ranking, add fanin lookup later.

- **Demoted finding risk_score reset to 1 (wont_fix weight).** The
  original churn+coupling signal is dropped on demote. Acceptable —
  demoted findings live under "Cleared by deep pass" where the
  risk_score isn't surfaced; `deep_pass_cleared: true` is the audit
  trail (D6).

- **Idempotent demotion guard**
  (`f.get("disposition") != "wont_fix"`) — re-runs don't flip the
  audit trail.

- **Heredoc runs unconditionally** (not gated by `[ "$DEEP" = "1" ]`).
  When --deep absent, `deep_pass_json='null'` (T17 hoist) → Python
  short-circuits at `if skipped is not None or not candidates: print
  + sys.exit(0)` returning findings verbatim. ~few-ms cost; single
  code path beats branching.

- **HTML emit gated by `if cleared_list:`** — empty list → empty
  string → no append → byte-identical HTML for non-deep runs.
  Same pattern as T4 idiomatic_html and T17 deep_pass null default.

- **Two-column "Cleared by deep pass" table** (Rule | File). The
  section heading carries the demotion semantics; storing
  `original_disposition` for a third column would require extra
  state with no spec mandate.

- **Q-fix #1: dropped two `T19 (FR-…)` decorator banners** at
  L2342 + L2655 per code-quality review. Replaced with plain prose
  WHY comments naming the placement rationale + the HTML
  byte-output invariant.

- **Q-fix #2: dropped the 2-line "D6 audit trail" comment** at
  L2390. The `deep_pass_cleared = True` field assignment is
  self-documenting; explaining D6 in a comment beside it was
  chatty.

- **Defensive `if not pair: continue` for unknown classifications**
  kept. Validator (T18) contract upstream guarantees
  `cls ∈ {deep, shallow, leaky}` but the boundary check is at the
  right place (consuming validator output). Q-reviewer marked as
  defer-to-author.

## Deviations

None.

## Verification

- `bash -n plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh`
  → exit 0 (pre + post Q-fix).
- `bash plugins/pmos-toolkit/skills/architecture/tests/run.sh` →
  **53 passed, 1 failed** (`ts-circular`, pre-existing baseline).
  +1 over T18's 52 passed (deep-pass-size-class-demotion).
  deep-pass-happy-path now also asserts DEEP_LEAKY promotion +
  all-must_fix disposition.
- Inline verification per plan L729:
  `jq -e '[.findings[] | select(.rule_id == "DEEP_LEAKY")] | all(.disposition == "must_fix")'`
  on happy-path → `true`.

## Review log

- **Spec compliance reviewer:** `✅ Spec compliant`. All contract
  points pass: FR-27 promotion shape correct (rule_id/disposition
  per classification + message = rationale + reshape), FR-28
  demotion gated to U001/U002/PY005/PY006 only on deep+reappears,
  D6 audit trail via `deep_pass_cleared: true`, D2 class dominance
  preserved, HTML section gated by cleared_list non-empty,
  placement order (post-risk-score, pre-baseline-diff) correct,
  idempotent demotion guard, fixtures non-trivial. Informational:
  demoted findings lose original churn+coupling — acceptable
  (not surfaced in HTML).
- **Code-quality reviewer:** `🛠 Changes required` — 2 Important + 1
  Minor + 1 Nit:
  - **Important #1** `T19 (FR-27/FR-28, D6)` banner at L2342 —
    applied (plain prose).
  - **Important #2** `T19 (FR-28, D6)` banner at L2655 — applied
    (plain prose).
  - **Minor** chatty `# Demote mechanical findings ... D6 audit
    trail` 2-line comment — applied (dropped; the
    `deep_pass_cleared = True` assignment is self-documenting).
  - **Nit** defensive `if not pair: continue` — deferred
    (boundary check, validator contract is upstream).
  - Accepted as-is: heredoc env passthrough with `or "null" or {}`
    pattern (reads cleanly), short-circuit `print + sys.exit(0)`,
    `if cleared_list:` HTML gate, demote risk_score = 1, heredoc
    runs even on non-deep (single code path).

## Open carry to later tasks

- **T20:** NFR-09 secret-file Read denylist wrapper (defense-in-depth
  layer 2) in `tools/dispatch-deep-pass.sh`.
- **T22:** ship `reference/deepening-vocabulary.md`.
- **T23:** wire SKILL.md to use the dispatch wrapper + invoke
  run-audit.sh with --deep-finalize-result.

## Commits

- `b932355` — `feat(T19): --deep promotion + size-class demotion reconciliation`
- `431ec4e` — `fix(T19): drop T19 banners + chatty audit-trail comment per Q-review`
