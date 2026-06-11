# pressure-test-battery.md — pressure-test prompts

The three sub-batteries the pressure-test phase runs against each chosen finalist, in one non-interactive batch pass. Schemas are fixed — downstream tooling (and the `/grill` handoff) reads these table shapes.

## Contents

- [Premortem](#premortem)
- [Munger Inversion](#munger-inversion)
- [Assumption Mapping](#assumption-mapping)
- [Cross-cutting decision table (multi-finalist)](#cross-cutting-decision-table-multi-finalist)
- [Operating rules](#operating-rules)

## Premortem

**Frame (verbatim):** "It is <today + 1 year>. The idea below, shipped 12 months ago, has failed. Why?"

**Prompt template:**
```
Idea: <one-line restatement of the finalist>
Context: HMW = <HMW>, target user = <JTBD>, success signal = <signal>.

Produce a 3–6 row failure-modes table. Format (markdown):

| Mode | Likelihood (H/M/L) | Mitigation |
|------|---------------------|------------|
| <specific failure mode — what concretely happened> | <H/M/L> | <one concrete countermeasure> |

Rules:
- Modes name a *thing that happened*, not a vague risk ("nobody adopted it" not "low adoption").
- Likelihood is a judgment, not a calibration — H = "likely the way this kills the idea", L = "edge-case but worth naming".
- Mitigation is concrete and actionable — "weekly review of activation funnel", not "monitor".
- Distinct modes — no two modes name the same root cause.
- Minimum 3 rows; maximum 6. Below 3, the battery is uninformative; above 6, signal dilutes.
```

## Munger Inversion

**Frame (verbatim):** "What set of choices would *guarantee* this idea fails?"

**Prompt template:**
```
Idea: <one-line restatement>

Produce 3–5 inverted-action bullets. Each bullet is a specific choice the team could
make that would guarantee failure. Format:

- <concrete action whose effect is failure>
- ...

Rules:
- Concrete actions, not platitudes ("ship without telemetry" not "be careless").
- Inverted, not negated — the bullet describes a thing TO DO that causes failure,
  not a thing to avoid.
- Distinct from premortem failure modes — premortem is "what failed"; inversion is
  "what choices we make that cause it to fail". The two can overlap; they should
  not be identical.
```

**Why inversion pairs with premortem:** premortem hunts in the failure space; inversion hunts in the *decision* space. A failure mode the team can't trace back to a choice is hard to act on; an inversion that doesn't connect to a real failure mode is hypothetical. Both together give a 2x2 of "what failed × what we did".

## Assumption Mapping

**Frame (verbatim):** "What does this idea need to be true to work?"

**Prompt template:**
```
Idea: <one-line restatement>

Enumerate the load-bearing assumptions. Rank by impact × uncertainty. Produce a 4–8
row table:

| Assumption | Impact (H/M/L) | Uncertainty (H/M/L) | Cheapest test |
|------------|----------------|----------------------|---------------|
| <one-sentence assumption — phrase as fact, not question> | <H/M/L> | <H/M/L> | <concrete cheapest validation> |

Rules:
- Assumptions are *load-bearing* — if false, the idea doesn't work as designed. A
  nice-to-have is not an assumption.
- Phrase as fact ("Users will accept a 3-step setup") not as question ("Will users
  accept...?"). The artifact's Open Questions section is where questions go.
- Sort the table descending by impact × uncertainty (H×H first, then H×M / M×H,
  then M×M, etc.).
- "Cheapest test" is the smallest concrete validation that disproves the assumption
  — a 5-user survey, a 1-hour prototype, a metric pulled from logs, a 1-week
  ad campaign. Not "do more research".
- Minimum 4 rows; maximum 8.
```

## Cross-cutting decision table (multi-finalist)

When the user picks 2 or 3 finalists in Phase 2, run the three batteries per finalist, then emit one combined decision table comparing them:

```
| Finalist | Risk density | Assumption load | Ease of validation | Verdict |
|----------|--------------|------------------|---------------------|---------|
| <finalist-1> | <count of H-likelihood × H-impact premortem rows> | <count of H-impact × H-uncertainty assumption rows> | <count of premortem-mitigations + assumption-tests rated "cheap"> | <Lead/Backup/Drop> |
```

Scoring rules:

- **Risk density** — lower is better. A finalist with 3 H/H failure modes is denser than one with 1 H/H + 2 M/M.
- **Assumption load** — lower is better. A finalist resting on 4 H/H assumptions is more fragile than one resting on 1 H/H + 3 M/L.
- **Ease of validation** — higher is better. A finalist with many cheap tests can be de-risked fast.
- **Verdict** — `Lead` for the strongest balance, `Backup` for the second-strongest, `Drop` for any finalist that is dominated on all three axes by another. The Verdict column is the only place the skill expresses an opinion across finalists.

## Operating rules

1. **No clarifying questions during the battery.** This is a batch pass. If something is genuinely unanswerable from the framed-idea context, log it in the artifact's Open Questions section and continue — do NOT interrupt the user mid-battery.
2. **Each sub-battery is independent.** Don't make the assumption table reference premortem rows or vice versa — they are scored separately. (The artifact's Phase 5 Refine optionally cross-links them.)
3. **Run all three sub-batteries even when their outputs would overlap.** Overlap is a signal that the failure space is concentrated — that's informative.
4. **Always emit all three sections in the artifact**, even with `--no-stress-test`. The section heading stays; the body becomes a single line: `<em>Skipped — see TL;DR warning. Re-run with /ideate --refine --resume to populate.</em>`. Downstream tooling (and human readers) expect the 13-section schema to be complete.
5. **Do NOT score across multiple finalists inside any sub-battery** — the cross-cutting table is the only place cross-comparison happens.
