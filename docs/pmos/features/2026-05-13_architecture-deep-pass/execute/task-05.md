---
task_number: 5
task_name: "U007 default-off + carve-outs (LOC > 100 + no module docstring ≥ 40 chars + not __init__.py)"
task_goal_hash: fd6cf6a9d08736e2a208fd51faf251dca70dad933694e6cdd21dbcb4f90491b0
plan_path: "docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html"
branch: "feat/architecture-deep-pass"
worktree_path: "/Users/maneeshdhabria/Desktop/agent-skills-architecture-deep-pass"
status: done
started_at: 2026-05-22T02:00:00Z
completed_at: 2026-05-22T02:38:00Z
commit_sha: 263eea0
files_touched:
  - plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh
  - plugins/pmos-toolkit/skills/architecture/principles.yaml
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/u007-default-off/src/big.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/u007-default-off/.assert
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/u007-init-py/src/foo/__init__.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/u007-init-py/.assert
---

## Key decisions

- **`effective_severity` keyed lookup, not `effective_disposition`** — the
  loader already publishes `effective_severity` (block/warn/info) via the
  v1→v2 disposition→severity remap at L117. Reusing that pathway means L3
  promotions (`rules.U007.disposition: should_fix`) flow through automatically
  with no parallel mapping table.

- **`.py`-only docstring carve-out** — `ast.get_docstring` is Python-specific.
  JS/TS/Vue files have no equivalent module-level construct, so the docstring
  branch short-circuits for non-`.py` and U007 falls back to the
  LOC + `__init__.py` carve-outs only. Matches FR-33 / D7's Python-centric
  wording.

- **Hoisted `import ast`** to the top-level imports line of the L1 evaluator
  heredoc (Q2 review fix). Per-iteration re-import was functionally fine but
  inconsistent with the existing convention at L536.

- **`except (SyntaxError, ValueError)` on `ast.parse`** (Q1 review fix) —
  Python source with embedded NUL bytes raises `ValueError`, not `SyntaxError`.
  Best-effort: malformed Python should not crash the L1 evaluator.

## Deviations

None. The plan called for `disposition: wont_fix` on U007 in principles.yaml;
that value was already present from T1's schema-v2 bump, so principles.yaml
needed no edit. Recorded in `files_touched` only because the file is part of
the T5 contract surface.

## Verification

- `bash plugins/pmos-toolkit/skills/architecture/tests/run.sh` → **27 passed,
  1 failed** (the failure is `ts-circular`, pre-existing and unrelated to T5;
  baseline before T5 showed `25 passed, 1 failed`).
- `bash -n plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh` →
  exit 0.
- Two new fixtures (`u007-default-off`, `u007-init-py`) pass; both exercise
  the wrapper (default-off path) AND the direct `run-audit.sh` invocation
  with `--include-info-comments` (enabled + carve-out paths).

## Review log

- **Spec compliance reviewer:** `✅ Spec compliant`. Verified the disposition
  gate uses `effective_severity` from the merged dict (post-L3-override); the
  carve-out triple is strict `AND`; LOC counter uses `l.strip()` non-blank
  semantics; docstring check uses `ast.get_docstring` then strips whitespace
  and compares ≥40; basename check uses `os.path.basename(rel) == "__init__.py"`.
- **Code-quality reviewer:** Changes required — 3 fixes (broaden exception;
  hoist import; WHY comment for `.py` gate). All three applied in `263eea0`.
  Re-verification was spot-checked rather than re-dispatched given the
  mechanical nature of the fixes; diff matches review prescriptions byte-for-byte.

## Commits

- `39068bc` — `feat(T5): U007 default-off with --include-info-comments + carve-outs`
- `263eea0` — `fix(T5): broaden ast.parse exception + hoist import + WHY comment`
