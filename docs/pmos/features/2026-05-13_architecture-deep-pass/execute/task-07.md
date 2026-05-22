---
task_number: 7
task_name: "Depth-2 monorepo detection + warn-only when --monorepo absent"
task_goal_hash: 74f049280274e085abaa0c85f56e2d6207d4cc196d724b83d2f7342c619c9eb7
plan_path: "docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html"
branch: "feat/architecture-deep-pass"
worktree_path: "/Users/maneeshdhabria/Desktop/agent-skills-architecture-deep-pass"
status: done
started_at: 2026-05-22T03:35:00Z
completed_at: 2026-05-22T04:10:00Z
commit_sha: a1873d8
files_touched:
  - plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/monorepo-no-flag/backend/pyproject.toml
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/monorepo-no-flag/frontend/package.json
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/monorepo-no-flag/frontend/tsconfig.json
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/monorepo-no-flag/.assert
---

## Key decisions

- **Warn-mode gate hoisted above all evaluators (Q-review fix).** The
  initial implementation placed the gate after T3/L1/L2/ruff had
  already scanned the entire tree — observably correct (findings: [])
  but wasted work on real monorepos. Restructured so the gate runs
  immediately after `LOADER_JSON` is captured; downstream evaluators
  are wrapped in `if [ "$WARN_MODE" != "1" ]; then ... fi`. The
  canonical emit-triplet block at end-of-script handles warn-mode via
  `findings_json='[]'` + `$loader.monorepo_detected` already populated
  — one source of truth, no duplication.

- **`_DEPTH2_DENY` filter in the walk.** A bare depth-2 walk
  false-positives on committed `node_modules/` (whose top-level entry
  ships a `package.json`) or stray `.venv/` directories. Filter set
  inlined ahead of the walk (`.git`, `node_modules`, `.venv`, `venv`,
  `dist`, `build`, `.next`, `.nuxt`, `__pycache__`, `.pytest_cache`,
  `.ruff_cache`, `.mypy_cache`, `coverage`, `target`, plus dotfiles).

- **Single-stack-per-child semantics.** When a child dir has both ts
  and py manifests, ts wins (the `elif` order in the walk). Mixed
  stacks are not split into two entries — matches FR-34's
  one-stack-per-child wording.

## Deviations

None. T7 specified "warn-only and skip remaining phases"; the
Q-review fix delivers genuine skip semantics rather than the initial
"scan then discard" implementation. Both satisfy the spec; the new
shape is just measurably correct on monorepo-scale inputs.

## Verification

- `bash plugins/pmos-toolkit/skills/architecture/tests/run.sh` →
  **32 passed, 1 failed** (`ts-circular`, pre-existing baseline).
- `bash -n run-audit.sh` → exit 0.
- Warn-mode happy path: `cd /tmp/mr && bash run-audit.sh audit .`
  emits FR-35 warning to stderr; JSON shows `monorepo_detected | length
  == 2`, `findings | length == 0`, `stacks_detected | length == 0`.
- False-positive guard: `node_modules/foo/package.json` does NOT
  trigger warn-mode (filter eats `node_modules`).

## Review log

- **Spec compliance reviewer:** `✅ Spec compliant`. Noted the
  pre-fix inefficiency (L1 evaluator runs before warn-gate); folded
  into Q-review fix.
- **Code-quality reviewer:** Changes required — 3 Important + 4 Minor.
  Important: (1) hoist warn-mode gate above heavy evaluators, (2)
  collapse the 150-LOC emit-triplet duplication, (3) filter
  DENY_SEGMENTS in the depth-2 walk. Minor: harden `.assert` rc
  capture, drop dead `json_file` + `START_EPOCH`, clean
  `docs/pmos/architecture/` before each run, drop fictional
  `[build-system]` from fixture pyproject. Fixes #1 and #2 collapsed
  into a single restructure (hoisting the gate naturally eliminates
  the duplicate emit block). All Important + Minor applied in `a1873d8`.

## Commits

- `47f1037` — `feat(T7): depth-2 monorepo detection + warn-only path`
- `a1873d8` — `fix(T7): hoist warn-mode gate; filter DENY_SEGMENTS; harden .assert`
