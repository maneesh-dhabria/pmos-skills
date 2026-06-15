# Dogfood evidence — /verify Phase-7 dogfood-verdict gate (story 260613-2m7)

Load-bearing dogfood for the `/verify` change (AC7). Archetype: **CLI/tool → real-invocation
against representative inputs** (the deliverable is a deterministic verification gate, so the
dogfood exercises the gate logic on fixture feature folders rather than a live UI). Both an
objective gate matrix and an independent blind-judge verdict are recorded.

## Scenario + fixtures

Two representative fixture feature folders (plus a missing-verdict edge fixture), each holding a
TN−1 dogfood task's `**Verdict:**` line — the exact line the new gate reads:

- `fixtures/A_satisfied/`   — `**Verdict:** satisfied · accepted_residuals: []`
- `fixtures/B_unsatisfied/` — `**Verdict:** not-satisfied · accepted_residuals: [actionability-below-bar]` + a `gaps:` block (no *critical* objective gate failed)
- (edge) a Tier-2/3 folder with **no** verdict line at all → the gate's `missing` branch

`gate-check.sh` implements the deterministic core of the Phase-7 gate + Phase-8 verdict mapping
**exactly as authored in `verify/SKILL.md`** and prints the resolved verdict block. It is dogfood
evidence, not shipped with the skill. Re-run: `bash gate-check.sh <fixture-folder>`.

## Objective gates (reproducible)

| # | Gate | Result |
|---|------|--------|
| O1 | Fixture A (satisfied verdict) → bare `PASS` | PASS — `VERDICT: PASS`, gate green |
| O2 | Fixture B (not-satisfied) → `PASS-WITH-GAPS` (not FAIL — no critical objective gate failed) | PASS — `VERDICT: PASS-WITH-GAPS`, capped |
| O3 | Fixture B → each `gaps:` entry enumerated one-per-line in the verdict block | PASS — `- gap: actionability-below-bar: …` |
| O4 | Fixture B → still-failing accepted residual surfaced as a **loud** `KNOWN / accepted` line, non-blocking, noted as carried to `/complete-dev` | PASS — `- KNOWN / accepted: actionability-below-bar (… surfaced in /complete-dev summary)` |
| O5 | Residual line carries the residual id, not a leaked verdict prefix (regression guard for the iteration-1 fix) | PASS — no `**Verdict` prefix leak |
| O6 | Edge: Tier-2/3 folder with **no** verdict → `missing` → `PASS-WITH-GAPS`, never a silent pass (AC3 non-skippable) | PASS — `dogfood-verdict-missing: … (Tier 2/3 non-skippable gate)` |
| O7 | skill-eval `[D]` floor (≥43/47) on `verify/` | PASS — `skill-eval-check.sh` EXIT 0; 2 fails (`c-reference-toc`, `d-progress-tracking`) proven byte-identical on pre-edit `e66c7b0` → accepted residuals |
| O8 | 4 hygiene lints green | PASS — lint-flags-vs-hints, lint-phase-refs, lint-non-interactive-inline (NI block byte-identical, 42/42), audit-recommended (1 call, defer-only, none added) |

### Iterate-until-satisfied (cap 2) — one iteration used

Iteration 1 surfaced a **real bug in the dogfood harness** (not the SKILL.md gate logic):
`grep -oE '…[^\n]*'` treats `\n` inside a bracket as the literal chars `n`/`\`, so it truncated
the verdict line at the first `n` (in "**n**ot-satisfied"). Fixture A passed only because
"satisfied · accepted_residuals" happens to contain no `n`; Fixture B leaked the verdict prefix
into the residual line. Fixed by `[^\n]*` → `.*` (grep is line-oriented). Re-run: O1–O6 all green.
This is exactly the loop's purpose — exercising the gate on a real not-satisfied path caught a
defect a happy-path-only check would have missed. No second iteration needed.

## Subjective blind-judge verdict

Independent fresh subagent, blind to authorship, given the gate text + the fixture outputs + AC1–AC4
and a rubric; it scored and returned a structured verdict (made no edits), per `_shared/dogfooding.md#judge`.

| Dimension | Verdict | Rationale (abridged) |
|---|---|---|
| ac1-gate-correctness | acceptable | satisfied→pass; missing/not-satisfied→cap PASS-WITH-GAPS (FAIL on critical); per-gap enumeration; bare PASS removed for missing/not-satisfied; fixtures confirm deterministically. |
| ac2-residual-reconciliation | acceptable | reuses the route:skill skill-eval residual pattern (cited, not forked); still-failing residual → loud `KNOWN / accepted`, non-blocking, carried to `/complete-dev`; newly-failing blocks. |
| ac3-tier-coverage | acceptable | non-skippable T2/3 stated twice (mirrors browser-evidence gate); T1-no-task → N/A clean pass. Both branches present. |
| ac4-leanness-cite | acceptable | cites `_shared/dogfooding.md` for verdict + dual-criteria shape; verify-side delta only; no restated protocol. |
| clarity | acceptable | deterministic on one literal line; explicit decision table; edge cases spelled out; fixtures corroborate. |

**VERDICT: satisfied** — `overall_satisfied: true`, every dimension acceptable, **no blockers, gaps = []**.

**Verdict line:** `**Verdict:** satisfied · accepted_residuals: []` (one cap-2 iteration used to fix
the harness; the blind judge found zero residual gaps — no further iteration needed).
