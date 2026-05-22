---
task_number: 11
task_name: "module_metrics + godmodule_candidates with Laplace smoothing"
task_goal_hash: b8e2c5d1a9f476302e8b1c4d7a0e3f6c9d2a5b8e1f4c7d0a3b6e9c2f5d8a1b4e7
plan_path: "docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html"
branch: "feat/architecture-deep-pass"
worktree_path: "/Users/maneeshdhabria/Desktop/agent-skills-architecture-deep-pass"
status: done
started_at: 2026-05-22T06:00:00Z
completed_at: 2026-05-22T06:25:00Z
commit_sha: 3962fc6
files_touched:
  - plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/risk-score-ordering/pyproject.toml
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/risk-score-ordering/src/__init__.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/risk-score-ordering/src/adapter.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/risk-score-ordering/src/service.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/risk-score-ordering/src/imp1.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/risk-score-ordering/src/imp2.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/risk-score-ordering/src/imp3.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/risk-score-ordering/src/imp4.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/risk-score-ordering/src/imp5.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/risk-score-ordering/src/imp6.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/risk-score-ordering/src/imp7.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/risk-score-ordering/src/imp_adapter.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/risk-score-ordering/.assert
---

## Key decisions

- **Module-resolution logic reused from cycle-py (T10).** `rel_to_module`
  and `rel_to_package` mirror cycle-py's helpers; relative-import level
  math is identical. Tolerable duplication (two isolated heredocs, no
  shared interpreter); the day a third consumer arrives, both move to
  a shared `_pyimports.py` sidecar — flagged for later but not now.

- **Defaults hoisted above WARN_MODE guard.** `module_metrics_json='[]'`
  and `godmodule_candidates_json='[]'` initialize alongside `cycles_json`
  before the `if [ "$WARN_MODE" != "1" ]` block, so the warn-mode
  short-circuit (--monorepo fan-out for non-py stacks) doesn't trip
  `set -u` when REPORT_JSON references them. Caught via
  monorepo-fan-out fixture regression.

- **HTML fallback `<p>No Python modules detected.</p>` rather than
  skipping the section.** Keeps the `<h2 id="architecture-metrics">`
  anchor stable so sections.json consumers and in-page links don't
  break when run against a TS-only project.

- **`public_symbols` walks `tree.body` only.** Module-level
  FunctionDef/AsyncFunctionDef/ClassDef where name doesn't start with
  `_`. Not `ast.walk` — nested defs / class methods don't count.

- **LOC = non-blank lines.** `sum(1 for ln in src.splitlines() if ln.strip())`.
  Comments count (no easy AST-level logical-LOC for Python); spec was
  silent on comment stripping, so the simplest definition wins.

- **Laplace formula exactly per D22.** `score = (fanin + 1) * (public_symbols + 1) - 1`.
  Fixture pins both ends: `service.py` (fanin=7, pub=5) → 47;
  `adapter.py` (fanin=1, pub=0) → 1 (the floor).

## Deviations

None.

## Verification

- `bash -n plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh` → exit 0.
- `bash plugins/pmos-toolkit/skills/architecture/tests/run.sh` →
  **36 passed, 1 failed** (`ts-circular`, pre-existing baseline).
  +1 over T10's 35 passed (the new `risk-score-ordering` fixture).
- Smoke: `jq -e '.module_metrics | length > 0 and .[0].fanin != null'` and
  `jq -e '.godmodule_candidates | length <= 10 and (.[0].score >= .[-1].score)'`
  both pass on the new fixture.

## Review log

- **Spec compliance reviewer:** `✅ Spec compliant`. All eleven contract
  points verified: module_metrics shape, public_symbols semantics,
  fanout/fanin, LOC, Laplace formula, top-10 ordering, HTML section,
  idempotency, POSIX paths, no T12 scope creep.
- **Code-quality reviewer:** Changes required — 1 Important + 5 Minor
  + 2 Nits:
  - **Important** `# ── Phase 5: module_metrics + godmodule_candidates (FR-43/44, D22) ───`
    decorator — applied (deleted; matches the T9/T10 pattern of dropping
    task/FR ID banners).
  - **Minor #1** "score formula is T12 scope creep" — **rejected.** The
    Laplace formula is explicitly T11 spec (D22, FR-44); the reviewer
    misread it. Implementation matches the plan verbatim.
  - **Minor #2** magic constants `10` and `5` — deferred. Both are
    direct from spec (godmodule_candidates top-10; HTML preview top-5);
    naming them adds ceremony without clarifying intent.
  - **Minor #3** double-try fallback IO on parse error — applied
    (collapsed to `loc[mod] = 0` on AST failure; if the first `open()`
    raised OSError the second one will too, so the second try was
    defensive against the AST grammar, not against IO).
  - **Minor #4** `[ -n "$module_data" ]` guard on rc==0 — applied
    (dropped the redundant `-n` check; python3 returning rc=0 with a
    partial line is a bug we want surfaced, not masked).
  - **Minor #5** module-resolution duplication with cycle-py —
    acknowledged; deferred. Two consumers; isolated heredocs; promote
    to `_pyimports.py` when a third arrives.
  - **Nit #1** trailing comment on the WARN_MODE-hoist — deferred.
    The placement is self-explanatory once a reader sees `cycles_json`
    on the same line.
  - **Nit #2** `grows` → `rows` rename — deferred. Cosmetic.

## Commits

- `538b7e8` — `feat(T11): module_metrics + godmodule_candidates with Laplace smoothing`
- `3962fc6` — `fix(T11): drop Phase 5 decorator + collapse redundant fallback IO per Q-review`
