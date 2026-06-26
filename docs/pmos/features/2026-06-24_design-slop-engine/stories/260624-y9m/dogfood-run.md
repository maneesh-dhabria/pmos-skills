# T6 — Live dogfood: /verify frontend slop gate (story 260624-y9m)

The TN−1 load-bearing dogfood per `_shared/dogfooding.md`. Exercises the real Node-path
slop gate (`plugins/pmos-toolkit/skills/verify/scripts/slop-gate.mjs`) — the same runner
`/verify` Phase 4d (`#slop-gate`) invokes — over two UI artifacts that isolate the two
finding lanes. Deterministic + offline (Inv-4): no Playwright, no browser, no network.

## Branch 1 — quality `[Blocker]` gates (AC8a)

Artifact: `tests/fixtures/contrast-fail.html` — a realistic marketing page carrying a
**planted WCAG AA contrast failure** (`.fineprint` `#cbd5e1` on `#ffffff` ≈ 1.5:1, need
4.5:1) and **no slop tells**.

```
$ node scripts/slop-gate.mjs --source tests/fixtures/contrast-fail.html
counts: { quality: 1, slop: 0, blockers: 1 }
blockers: [ low-contrast · category=quality · severity=Blocker · "1.5:1 (need 4.5:1) — text #cbd5e1 on #ffffff" ]
[slop-gate] 1 blocking quality fault(s) — GATE FIRES (verdict drops below PASS)
exit=2
```

→ The `quality` finding routes as `[Blocker]` (`#slop-routing`); exit 2 is the deterministic
gate-fires signal. In `/verify` this becomes a critical 5e gap and drops the Phase 8 verdict
below bare PASS (`#commit-report`). **Observed = expected.**

## Branch 2 — slop tell is advisory, verdict stays clean (AC8b)

Artifact: `tests/fixtures/gradient-only.html` — the **same page with contrast corrected**
(`.fineprint` darkened to `#1f2937`, above AA) and a single `gradient-text` slop tell added
(purple→pink heading clipped to text).

```
$ node scripts/slop-gate.mjs --source tests/fixtures/gradient-only.html
counts: { quality: 0, slop: 3, blockers: 0 }
slop: [ gradient-text · Should-fix, ai-color-palette · Should-fix, gradient-text · Should-fix ]
[slop-gate] 0 blocking quality fault(s), 3 slop finding(s) — no quality blocker; slop advisory only
exit=0
```

→ The `slop` findings surface loudly as advisory `[Should-fix]` in the 5f Slop-Findings lane
but **never gate** (D-TIER, grill-confirmed: taste must not stop a ship); exit 0. In `/verify`
the verdict is a clean PASS. **Observed = expected.**

## Inv-5 graceful degradation (AC4)

```
$ node scripts/slop-gate.mjs --source tests/fixtures/contrast-fail.html --engine /no/such/detect.mjs
[slop-gate] slop gate skipped — engine/parser unavailable: slop-engine detector not found at /no/such/detect.mjs
report: { ran: false, skipped: true, counts: { blockers: 0 } }
exit=0
```

→ Tooling absence is a non-fatal logged skip, exit 0 — a correct PASS is **never flipped to
FAIL** on engine/parser absence. **Observed = expected.**

## Objective gates

- Contract suite `tests/slop-gate.test.mjs`: **5/5 pass** (Node-path detect, category→severity
  determinism, Inv-5 skip, Inv-4 offline neg-control).
- Both fixture branches deterministic (identical output across repeated runs — pinned by test 3).

## Judge (independent read)

The gate's behaviour matches the D-TIER contract end-to-end: quality faults can gate
(`[Blocker]` → exit 2 → verdict drop), slop tells are surfaced-but-advisory (exit 0), and the
two lanes are reported distinctly so they can never be conflated. No defect surfaced.
`overall_satisfied: yes`.

**Verdict:** satisfied · accepted_residuals: []
