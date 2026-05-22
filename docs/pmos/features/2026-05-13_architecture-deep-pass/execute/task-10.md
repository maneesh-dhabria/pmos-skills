---
task_number: 10
task_name: "cycle-py.py Tarjan SCC + PY009 dispatcher"
task_goal_hash: a7d9c2e1f4b58306e2c1d4a7b8e5f0c3d6a9b2e5f1a4c7d0e3b6a9c2d5e8f1a4
plan_path: "docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html"
branch: "feat/architecture-deep-pass"
worktree_path: "/Users/maneeshdhabria/Desktop/agent-skills-architecture-deep-pass"
status: done
started_at: 2026-05-22T05:30:00Z
completed_at: 2026-05-22T05:55:00Z
commit_sha: 7e9cd0f
files_touched:
  - plugins/pmos-toolkit/skills/architecture/tools/cycle-py.py
  - plugins/pmos-toolkit/skills/architecture/principles.yaml
  - plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/py-cycle/src/service.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/py-cycle/src/repo.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/py-cycle/src/__init__.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/py-cycle/pyproject.toml
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/py-cycle/.assert
---

## Key decisions

- **Iterative Tarjan via explicit work stack.** No recursion — Python's
  default limit blows up on real codebases. Work stack carries
  `(node, neighbor_iterator, returned_flag)` tuples; lowlink propagates
  to parent on pop (`work[-1][0]`). Iterator state survives across child
  visits because the same iterator object stays on the stack frame.

- **Module nodes, not file nodes.** Dotted module names (`src.repo`,
  `src.service`) form the graph; `mod_to_file` maps back to relpaths
  at emit time. `__init__.py` collapses to its package name (e.g.
  `src/__init__.py` → `src`) — E10 satisfied by the structural choice,
  not a special case.

- **Heredoc, not `python3 -c`, for the dispatcher's JSON parser.**
  First attempt used `-c "..."` with `\x22` escapes for embedded
  quotes; those are bash double-quote escapes, not Python literals, so
  Python saw raw backslash-x and crashed compile (every py-stack audit
  errored). Switched to `<<'PY'` (single-quoted heredoc) with `CYCLES_JSON`
  env var input — no expansion surprises.

- **Determinism via sorted everywhere.** `sorted(nodes)` for the outer
  loop; `sorted(adj[v])` for neighbor order; `sorted(members)` per cycle;
  `cycles.sort(key=lambda c: c["members"][0])` at emit. Re-running on
  the same input produces byte-identical output (FR-46).

- **Graceful degrade on probe fail.** Missing python3 or missing
  `cycle-py.py` → ONE info-severity finding (`file: null, line: null`,
  message documents the missing dep). Per FR-46/PD10 — the audit
  continues; the user sees the gap without a hard crash.

- **Severity hard-coded `warn` in the dispatcher emit.** PY009's
  `disposition: should_fix` would map to `warn` via `_DISP_TO_SEV`
  downstream regardless; setting it at the source matches the existing
  pattern in the depcruise/ruff branches.

## Deviations

None.

## Verification

- `python3 -m py_compile plugins/pmos-toolkit/skills/architecture/tools/cycle-py.py`
  → exit 0.
- `bash -n plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh`
  → exit 0.
- `bash plugins/pmos-toolkit/skills/architecture/tests/run.sh` →
  **35 passed, 1 failed** (`ts-circular`, pre-existing baseline).
  +1 over T9's 34 passed (the new `py-cycle` fixture).
- Direct smoke: `python3 tools/cycle-py.py tests/fixtures/py-cycle/src`
  → `[{"members":["repo.py","service.py"],"cycle_length":2}]`.

## Review log

- **Spec compliance reviewer:** `✅ Spec compliant`. All eight contract
  points verified: argv+exit-64; ast.parse with the three exception
  classes; relative-import resolution; iterative Tarjan; size-≥2 SCCs;
  sorted members + cycle_length; PY009 shape matches existing PY-rules;
  probe-fail info finding; cycles[] sidecar populated; fixture asserts.
- **Code-quality reviewer:** Changes required — 1 Important + 2 Minor
  + 2 Nits:
  - **Important** decorator `(T10, FR-07/46/47, PY009)` on the cycle-py
    delegator header — applied (collapsed to `(PY009)` only; PY009 is
    a stable rule anchor, T10/FR refs rot).
  - **Minor** redundant `if m in mod_to_file` + `if len(members) < 2`
    defensive checks on internal invariants — applied (dropped both;
    `comp` is drawn from `adj.keys() == mod_to_file.keys()`, and SCCs
    were already filtered to len ≥ 2 at line 123).
  - **Minor** duplicate `cycles_json='[]'` init inside the cycle-py
    block — applied (dropped; the outer init at L1281 covers both the
    WARN_MODE short-circuit and pre-probe state).
  - **Nit** `from X import *` produces harmless `"X.*"` probe — deferred.
    The probe misses cleanly against `known_modules`; adding an
    explicit skip is cosmetic.
  - **Nit** `.replace("\\", "/")` no-op on posix — deferred. Cheap
    defense; skill is bash/macOS-only by repo norm, but keeping it
    costs nothing.

## Commits

- `eb1d77c` — `feat(T10): cycle-py.py Tarjan SCC + PY009 dispatcher`
- `7e9cd0f` — `fix(T10): drop T10/FR decorator + redundant defensive checks per Q-review`
