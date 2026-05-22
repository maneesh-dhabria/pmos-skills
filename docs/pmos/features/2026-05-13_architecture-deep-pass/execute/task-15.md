---
task_number: 15
task_name: "--baseline + --since AND-intersect + index-baseline guard"
task_goal_hash: f1a4c7d2e8b5306194c7d0e3f6a9b2c5d8e1f4a7c0b3e6d9f2a5c8b1e4d7a0f3
plan_path: "docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html"
branch: "feat/architecture-deep-pass"
worktree_path: "/Users/maneeshdhabria/Desktop/agent-skills-architecture-deep-pass"
status: done
started_at: 2026-05-22T08:20:00Z
completed_at: 2026-05-22T08:35:00Z
commit_sha: 6ea4300
files_touched:
  - plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/since-baseline-and/.assert
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/baseline-diff/.assert
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/baseline-schema-v1/.assert
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/baseline-index-no-monorepo/pyproject.toml
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/baseline-index-no-monorepo/src/main.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/baseline-index-no-monorepo/baseline.json
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/baseline-index-no-monorepo/.assert
---

## Key decisions

- **AND-intersect needed no code change.** T13's `--since` filter at
  L1984-2002 mutates `findings_json`; T12's risk-score consumes the
  filtered set into `findings_with_risk_json`; T14's `--baseline` diff
  consumes `findings_with_risk_json`. The pipeline order is structural;
  AND-intersect falls out for free. T15 only adds the test coverage.

- **Index-baseline detection via bash jq probe, not in the Python
  heredoc.** `jq -e '.stacks | type == "array"' "$BASELINE"` reads the
  baseline once before the Python parser runs. Malformed JSON makes
  `jq -e` exit non-zero (guard does not fire); the Python parser at
  L2082+ then emits the canonical `baseline file unreadable or
  malformed` diagnostic. Net: no spurious fire on bad JSON, no need to
  plumb `MONOREPO` into the heredoc env.

- **Guard ordering inside the BASELINE block: file-exists →
  index-shape → non-git → schema → diff.** Index-shape before non-git
  means an operator pointing a monorepo index at a non-git tree gets
  the actionable diagnostic (`--monorepo`) instead of the generic
  non-git one. One WHY comment at L2072-2073 documents this so a
  future reviewer doesn't swap the order.

- **`$MONOREPO` is numeric-default-0 at L20**, only ever set to `1` by
  `--monorepo`. The bash `[ "$MONOREPO" -ne 1 ]` form is `set -u`-safe
  and bash 3.2 compatible.

- **T14 follow-up — spec L172 non-git + --baseline guard included.**
  T14 flagged this as deferred to T15; T15's Phase-6 block modifications
  are the natural home. Stderr `scan root is not a git repo;
  --baseline unavailable` mirrors T13's `--since unavailable` form (the
  spec gives both via the `--since/--baseline` template at L172).

- **`git init` preamble added to two pre-existing fixtures
  (`baseline-diff`, `baseline-schema-v1`).** The new non-git guard would
  otherwise reject them. Mirrors the pattern already used by
  `risk-score-ordering` and `since-baseline-and` (mktemp snapshot →
  trap-restore → `rm -rf .git`). Self-contained per-fixture preamble
  preferred over a shared helper — three call sites doesn't warrant
  indirection.

- **`baseline-index-no-monorepo/.assert` bypasses the wrapper.** Same
  reason as `since-not-git/.assert` and `baseline-schema-v1/.assert`:
  the wrapper does `2>/dev/null`, so the documented stderr literal
  can't be asserted through it. Direct `bash run-audit.sh audit . --baseline baseline.json 2>&1` invocation captures stderr.

## Deviations

None.

## Verification

- `bash -n plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh` → exit 0.
- `bash plugins/pmos-toolkit/skills/architecture/tests/run.sh` →
  **41 passed, 1 failed** (`ts-circular`, pre-existing baseline).
  +1 over T14's 40 passed (`baseline-index-no-monorepo`). The plan's
  "42 passed" expectation mis-counted: extending an existing fixture
  (`since-baseline-and`) doesn't add to the pass count.
- Smoke (AND-intersect): `since-baseline-and/.assert` second invocation
  passes — `diff.new == [touched_more.py]`, `findings == [touched_more.py]`.
- Smoke (index baseline): `baseline-index-no-monorepo/.assert` →
  exit 64 + literal stderr.

## Review log

- **Spec compliance reviewer:** `✅ Spec compliant`. All five contract
  points pass: AND-intersect ordering structural via existing pipeline,
  index-baseline guard fires only on `(stacks array) AND (MONOREPO != 1)`,
  non-git + --baseline guard with spec-L172 literal, guard ordering
  documented and correct, fixtures non-trivial. Informational: FR-53
  sentence 2 (per-stack baseline pairing under `--monorepo` mode) is
  not implemented in T15 — confirm a downstream task picks it up;
  otherwise FR-53 is half-shipped.
- **Code-quality reviewer:** `✅ LGTM`. No findings. The lone comment
  explains ordering WHY (non-obvious); no banners; bash 3.2 safe;
  `jq -e` stacks probe well-ordered against the Python malformed-JSON
  path (no spurious fire); fixture preambles self-contained by
  convention; `baseline-index-no-monorepo/.assert` matches
  `baseline-schema-v1`'s rc-capture pattern (peer-consistent).

## Open carry to later tasks

- **FR-53 sentence 2:** per-stack baseline pairing under `--monorepo`
  mode (each per-stack JSON sidecar gets its own `diff{}`) — not in T15
  scope. Belongs in a future task that owns monorepo-mode emission;
  flag for replan if no T16+ picks it up.

## Commits

- `6ea4300` — `feat(T15): --since + --baseline AND-intersect + index-baseline guard`
