---
task_number: 8
task_name: "--monorepo fan-out + per-stack triplet + index.{html,json}"
task_goal_hash: c6f8e2d4a91b53a78d0e4f1cb87e6f9d2a3b5c8e0f1d2a3b4c5d6e7f8a9b0c1d
plan_path: "docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html"
branch: "feat/architecture-deep-pass"
worktree_path: "/Users/maneeshdhabria/Desktop/agent-skills-architecture-deep-pass"
status: done
started_at: 2026-05-22T04:15:00Z
completed_at: 2026-05-22T04:45:00Z
commit_sha: 5c8607a
files_touched:
  - plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/monorepo-fan-out/backend/pyproject.toml
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/monorepo-fan-out/frontend/package.json
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/monorepo-fan-out/frontend/tsconfig.json
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/monorepo-fan-out/.assert
---

## Key decisions

- **Self-terminal FANOUT_MODE branch.** Mirrors T7's hoisted warn-mode
  shape — the fan-out body is a `python3 <<'PY'` heredoc that does the
  whole job (recursive invocations + index emit) and ends with
  `exit 0`. The normal/no-monorepo and warn-mode paths flow through
  untouched. No `if FANOUT_MODE != "1" then ... fi` wrapping ~150 LOC
  of canonical emit — same restructure-vs-wrap call T7 made.

- **Child invocation: argv-omit AND env-scrub `--monorepo`.** Per the
  FR-36 amendment, the child must run as a single-stack scan. Stripped
  two ways for robustness: `--monorepo` is absent from the child argv,
  and `MONOREPO` is removed from `child_env` so a stale shell export
  can't re-trigger the depth-2 walk in the child.

- **Parent-flag propagation for `--no-adr` / `--non-interactive`
  (Q-review fix).** The first implementation hard-coded both flags on
  every child invocation, silently stripping ADR promotion even when
  the parent never asked for that. Fixed: propagate each flag iff the
  parent itself had it (`NO_ADR_ENV` / `NONINTERACTIVE_ENV` plumbed
  through the heredoc env block; argv built conditionally in Python).

- **`failed_stacks` tracking + `sys.exit(1)` (Q-review fix).** A failed
  child previously produced a partial index with rc=0 — silent
  half-success. Now: each `CalledProcessError` records the stack name,
  the loop continues so the index reflects what *did* succeed, and the
  branch exits 1 at the very end if any child failed. Surfaces the
  failure without masking the partial result.

- **ARCH_DOCS_PATH `expanduser().resolve()` (Q-review fix).** The
  parent already passes an absolute path today, but a future direct
  caller setting a relative or `~`-relative `ARCH_DOCS_PATH` would
  otherwise resolve against the child's stack-subdir cwd. Cheap belt
  and suspenders.

- **Stem-glob regex** `^{date}_{san}(?:-\d+)?\.json$` excludes
  `.sections.json` sidecars and prefix-overlap stack names (e.g., a
  hypothetical `backend` vs `backend-api`). Sorted ascending so the
  latest collision-suffixed file wins via `candidates[-1]`.

- **Index has no `.md` sidecar.** Only the per-stack triplets are full
  triplets. The index is HTML+JSON only — matches spec FR-37 scope.

## Deviations

None against spec. The Q-review prescription for Important #1 ("drop
`--no-adr --non-interactive` entirely") was applied as a softer
"propagate from parent" — the reviewer's own hint line suggested this
shape. Net behavior matches the reviewer's intent: nothing is added to
the child argv that the parent did not itself request.

## Verification

- `bash -n plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh`
  → exit 0.
- `bash plugins/pmos-toolkit/skills/architecture/tests/run.sh` →
  **33 passed, 1 failed** (`ts-circular`, pre-existing baseline).
  +1 over T7's 32 passed (the new `monorepo-fan-out` fixture).
- End-to-end smoke: `/tmp/mr-fan/` with backend/pyproject.toml +
  frontend/{package,tsconfig}.json → audit emits 6 per-stack triplet
  files + `{date}_index.html` + `{date}_index.json`; index JSON shows
  `stacks | length == 2`, both names present, `schema_version == 2`,
  `summary.total_must_fix` non-null.
- `monorepo-no-flag` (T7 regression check) still passes — warn-mode
  block at L432–L439 byte-identical.

## Review log

- **Spec compliance reviewer:** `✅ Spec compliant` (one Minor note on
  the `.html`-only collision probe, flagged as inherent to the
  canonical emit pattern — not a T8 regression, no fix required).
- **Code-quality reviewer:** Changes required — 2 Important + 2 Minor
  + 1 Nit:
  - **Important #1** child invocation flags — applied (propagated from
    parent rather than dropped entirely; matches reviewer's hint).
  - **Important #2** silent partial index on child failure — applied
    (`failed_stacks` + post-emit `sys.exit(1)`).
  - **Minor #1** `.resolve()` ARCH_DOCS_PATH — applied
    (`expanduser().resolve()`).
  - **Minor #2** five narrative `# T8 (FR-36/37)` comment decorators —
    applied (deleted; kept the substantive ones at L102/L104/L120/L137
    that encode hidden constraints).
  - **Nit** `\x22` escapes for `"` inside f-strings — left as-is
    (cosmetic, doesn't affect correctness; the file already uses this
    escape style consistently to avoid bash heredoc quote-counting
    surprises on macOS bash 3.2).

## Commits

- `968bee5` — `feat(T8): --monorepo fan-out + index.{html,json}`
- `5c8607a` — `fix(T8): propagate parent flags + surface child failures + resolve ARCH_DOCS_PATH`
