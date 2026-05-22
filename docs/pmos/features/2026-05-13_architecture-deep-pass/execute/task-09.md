---
task_number: 9
task_name: "U011 cross-file dup-signature evaluator"
task_goal_hash: e3c1a8b5d4f29076e1b8a2c5d6f9e8c3b4a7d2e1f0a3b6c9d8e7f4a1b2c5d6e9
plan_path: "docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html"
branch: "feat/architecture-deep-pass"
worktree_path: "/Users/maneeshdhabria/Desktop/agent-skills-architecture-deep-pass"
status: done
started_at: 2026-05-22T04:50:00Z
completed_at: 2026-05-22T05:20:00Z
commit_sha: 80b8b18
files_touched:
  - plugins/pmos-toolkit/skills/architecture/principles.yaml
  - plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/dup-signature/src/a.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/dup-signature/src/b.py
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/dup-signature/pyproject.toml
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/dup-signature/.assert
---

## Key decisions

- **Two-pass shape in a standalone heredoc.** U011 needs to collect
  every function signature across all `.py` files before it can decide
  whether any key spans ≥2 distinct files. That doesn't fit the L1
  evaluator's per-file loop — kept it as a separate Python heredoc
  immediately after the L1 evaluator, inside the same WARN_MODE guard.

- **Canonical key shape.** `func_name(_:T1, _:T2, ...) -> R` with:
  positional + posonly (`_:`), `*args` (`*:`), kwonly (`_:`), `**kwargs`
  (`**:`), and `ast.unparse(node.returns)` for the return type. Defaults
  and decorators are NOT in the key — spec is silent on both. The
  static-vs-instance method false-positive risk (a `@staticmethod` and
  a regular method colliding) is documented for a follow-up; not in
  scope for T9.

- **E13 carve-out is structural, not a special case.** Same-file
  duplicates fall out automatically: when a key has only one distinct
  file, the `len(distinct_files) < 2` short-circuit skips emission.
  No `if same_file:` branch — fewer code paths, easier to reason about.
  The fixture's `@overload f(x: int) -> int` + `def f(x): ...` pair
  exercises this two ways (different keys *and* one-file-only).

- **jq concat merge over the existing aggregation pattern.** Used
  `jq -n --argjson a --argjson b '$a + $b'` matching depcruise/ruff
  precedent (L1279/L1362). Single-line merge into `findings_json`;
  downstream sort + emit picks U011 up unchanged.

- **`severity: "warn"` on emit.** Maps to disposition `should_fix` via
  the canonical `_DISP_TO_SEV` remap downstream. No principles.yaml
  side-channel.

## Deviations

None. The principles-16-rules fixture did not need a rename — its
assertion is `tier_1 <= 15` (FR-21 cap, not a literal count), so going
from 10 → 11 U-rules is still in cap.

## Verification

- `bash -n plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh`
  → exit 0.
- `bash plugins/pmos-toolkit/skills/architecture/tests/run.sh` →
  **34 passed, 1 failed** (`ts-circular`, pre-existing baseline).
  +1 over T8's 33 passed (the new `dup-signature` fixture).
- `python3` AST parse of `src/a.py` + `src/b.py` succeeds; key shapes
  match by inspection: `_resolve_audio_units(_:,_:int)->Foo` collides
  across files (the `self` param has no annotation, so its slot is
  `_:` in both files — matches as designed).
- E13: same-file `f(...)` pair has different keys (`f(_:int)->int`
  for the `@overload`, `f(_:)->` for the impl) AND, even if the keys
  collided, distinct_files == {a.py} only, so U011 would still skip.

## Review log

- **Spec compliance reviewer:** `✅ Spec compliant`. Verified all
  seven contract points: U011 principles entry, sig_key shape across
  posonly/positional/vararg/kwonly/kwarg/returns, cross-file gating
  via a set (not a list), one finding per occurrence, peer-list
  excludes own file, severity `warn`, warn-mode guard.
- **Code-quality reviewer:** Changes required — 1 Important + 2 Minor
  + 1 Nit:
  - **Important** decorative U011 evaluator header — applied (collapsed
    to one E13 carve-out line).
  - **Minor** jq-merge narration — applied (dropped; the jq expression
    is self-evident).
  - **Minor** `.assert` 4-line decorative preamble — applied
    (collapsed to one line).
  - **Nit** `_:` placeholder doesn't distinguish positional from
    kwonly args — deferred. Spec calls names "stripped" without
    mentioning slot distinction; if a future test surfaces a false
    positive (`def f(x, *, y)` colliding with `def f(x, y)`), we'll
    promote `kw:` prefix at that point. Not worth a churn cycle on a
    silent corner.

## Commits

- `ee40080` — `feat(T9): U011 cross-file dup-signature evaluator`
- `80b8b18` — `fix(T9): drop decorative comments per Q-review`
