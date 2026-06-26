# T6 — Live dogfood: prevention floor + drift-lint (story 260624-aqb)

The TN−1 load-bearing dogfood. Exercises the real drift-lint (`tools/lint-slop-rules.sh`)
against the real generated floor (`_shared/slop-engine/design-slop-rules.md`) and the real
registry (`_shared/slop-engine/registry.mjs`) — proving the lint actually fails on drift and
that regeneration restores sync. Deterministic + offline (the lint reads the registry via node
+ greps the floor; no network).

To respect Inv-1 (story A is the sole author of `registry.mjs`), drift is simulated by editing
the **floor** (deleting a DON'T line) rather than forking the registry — the plan permits this
equivalent ("delete its DON'T line from the floor"). Regeneration restores the floor from the
unchanged registry, so no forked registry is ever left behind.

## Step 1 — drift the floor → lint FAILS (exit 1, names the rule)

Deleted the `flat-type-hierarchy` DON'T line from `design-slop-rules.md` without regenerating:

```
$ bash tools/lint-slop-rules.sh
FAIL: rule `flat-type-hierarchy` — skillGuideline missing from the floor: "flat type hierarchy"

FAIL: 1 of 37 skillGuideline(s) absent from design-slop-rules.md — DRIFT.
      Regenerate the floor:  node plugins/pmos-toolkit/skills/_shared/slop-engine/gen-rules-doc.mjs > plugins/pmos-toolkit/skills/_shared/slop-engine/design-slop-rules.md
exit=1
```

→ The lint fails LOUDLY, names the offending rule, and points at the fix. **Observed = expected.**

## Step 2 — regenerate from the registry → lint PASSES (exit 0)

```
$ node plugins/pmos-toolkit/skills/_shared/slop-engine/gen-rules-doc.mjs > .../design-slop-rules.md
$ bash tools/lint-slop-rules.sh

PASS: 37 skillGuideline(s) all present in design-slop-rules.md — registry ↔ floor in sync.
exit=0
```

→ Regenerating the floor from the (unchanged) registry restores sync. **Observed = expected.**

## Step 3 — idempotent revert (no drift left behind)

```
$ diff -q design-slop-rules.md <canonical floor captured before step 1>
(identical)  → generator idempotent; drift fully reverted; registry untouched (Inv-1).
```

## Objective gates

- Engine + floor test suite (`_shared/slop-engine/tests/`): **9/9 pass** (cg6's 6 engine tests +
  this story's 3: generator idempotence, committed-floor-equals-generator-output, full guideline
  coverage).
- Lint contract suite (`tools/tests/lint-slop-rules.test.sh`): **5/5 pass** (in-sync→0, drift→1
  naming the rule, real pair→0, missing floor→2).
- `tools/lint-slop-rules.sh` on the real registry↔floor pair: **exit 0** (37/37 guidelines present).
- skill-eval: /wireframes **EXIT 0**, /execute **EXIT 0** (Track Progress added), /prototype EXIT 1 =
  the single pre-existing `c-reference-toc` residual on 5 untouched `reference/*.md` files (out of
  scope — record, don't weaken).
- 4 repo lints (flags-vs-hints, phase-refs, non-interactive-inline, slop-rules) + audit-recommended
  (3/3) + comments-coverage: all clean.
- Inv-3: `grep -ri impeccable` over this story's new/edited files returns nothing.

## Registry smell flagged back to story A (not fixed here — Inv-1)

Two `skillGuideline` values are 2-word fragments — below the design's "3–6-word substring" contract:
`marketing-buzzword` → "marketing buzzwords"; `aphoristic-cadence` → "aphoristic cadence". The lint
handles them correctly **by construction** (the generator writes the floor from the same field, so
the verbatim substring is always present), so this is not a lint defect. Per the plan's Risk note,
short guidelines are a *registry smell to flag, not a reason to weaken the lint* — recorded here for
story A / a future registry pass; this consumer story does not edit `registry.mjs`.

**Verdict:** satisfied · accepted_residuals: [prototype c-reference-toc (pre-existing, 5 untouched reference files)]
