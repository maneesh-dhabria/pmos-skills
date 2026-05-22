---
task_number: 4
task_name: "U004 suppression by exempt_ranges + idiomatic-exemption surfacing under Won't Fix"
task_goal_hash: a93a14ce3de4c15d86570d7672e1090393c5e7a0dd1d7c7adbea2fd9e7ef0c90
plan_path: "docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html"
branch: "feat/architecture-deep-pass"
worktree_path: "/Users/maneeshdhabria/Desktop/agent-skills-architecture-deep-pass"
status: done
started_at: 2026-05-22T01:10:00Z
completed_at: 2026-05-22T01:38:00Z
commit_sha: 4256a46
files_touched:
  - plugins/pmos-toolkit/skills/architecture/tools/run-audit.sh
  - plugins/pmos-toolkit/skills/architecture/tests/fixtures/typer-mixed/.assert
---

## Key decisions

- **AST walker relocated**, not duplicated: T3's idiom AST walker block (~165 lines)
  was physically moved from after the L1 evaluator to before it, so its
  `idiomatic_exemptions_json` is in scope when the L1 heredoc runs U004.
  Alternative considered (compute twice) — rejected as wasteful and non-idempotent.
- **Combined `{findings, idiomatic}` return** from the L1 heredoc lets bash re-merge
  the per-suppression provenance back into `exemptions.idiomatic[*].suppressed[]`
  without losing T3's existing keys. Two `jq` calls split the combined JSON.
- **Additive `suppressed[]` key** on each `exemptions.idiomatic[*]` entry. T3's
  shape (`file`, `framework`, `exempt_ranges`) is unchanged — `suppressed[]` is
  always present (`[]` when no U004 hits inside any range), so consumers can rely
  on the key. NFR-08 audit-trail satisfied: capability (`exempt_ranges`) and
  actual side-effect (`suppressed`) sit side-by-side.
- **HTML insertion** via string-concat onto `render_section("Won't Fix", …)`'s
  return — keeps the conditional empty-case behavior simple
  (`"" + ("\n" + idiomatic_html if idiomatic_html else "")`). When
  `exemptions.idiomatic[]` is empty, byte-output of the Won't Fix block is
  unchanged (output-triplet/ fixture confirms).
- **Suppression bounds inclusive** (`start <= line <= end`) — matches the
  function-scoped semantics from T3 (D13).

## Runtime evidence

`bash plugins/pmos-toolkit/skills/architecture/tests/run.sh` (post-T4):

```
25 passed, 1 failed   (only ts-circular, pre-existing — confirmed by stash+run
                       on HEAD before any T4 changes; unrelated to U004 / idiomatic)
```

`typer-mixed/.assert` new assertions (all green):
- `[.findings[] | select(.rule_id=="U004") | .file] | length == 1` — only helper
  `_internal`'s `print` at line 10 survives.
- `[.findings[] | select(.rule_id=="U004" and .line == 5)] | length == 0` AND
  `[.findings[] | select(.rule_id=="U004" and .line == 7)] | length == 0` —
  the @app.command()-decorated `hello`'s `print("hi")` (line 7, the actual U004
  match site) is suppressed; line 5 (the decorator itself) was never a U004
  candidate but the assertion future-proofs against any walker-edge regression.
- `.exemptions.idiomatic[0].suppressed[0]` has `rule_id == "U004"` and
  `line == 7` (NFR-08 audit trail).
- HTML triplet contains `id="idiomatic-exemptions"` AND a `cli.py` row.

## Reviewer outcomes

- **Spec-compliance** (subagent `a255ed4`): ✅ Spec compliant — all 10 checks
  passed; FR-32 / NFR-08 / E9 / D13 / D6 satisfied; T3 contract preserved; no
  scope creep.
- **Code-quality** (subagent `a4a9964`): Approved — 0 Critical, 0 Important,
  3 Minor:
  1. `suppressed_by_file[e["file"]] = []` could be `.setdefault(e["file"], [])`
     to harden against future multi-record-per-file emissions from the AST
     walker. Latent today (T3 emits one record per file).
  2. Readability nit on the wont-fix concat expression — could extract to a
     local for scannability. Cosmetic.
  3. The two `jq` invocations on `$l1_pass_json` could be one. Marginal.
  All three deferred (per protocol — Minor noted, proceed).

## Deviations from plan

None substantive. The plan's `.assert` step says "assert U004 at line == 5 is
absent" (the decorator line); the actual U004 grep hit in the fixture is at
line 7 (the decorated function's print). Added the line-7 assertion as well —
this is the assertion that exercises the suppression. The line-5 assertion is
kept as a defensive future-proof.
