# fan-out.md — orchestrator-worker research protocol

Canonical home (§K) for the **decompose → one worker per sub-question → structured
findings → interim report** protocol that powers decision-support research. Grounded in
the Anthropic multi-agent research findings (orchestrator-worker beats single-agent by
~90% on research eval; 3–5 workers is the sweet spot; >10 only for the most complex
work). Consumers (`/research`, later `/artifact`) inline this file and state only their
own per-phase deltas.

## Contents

- [Roles & model tiers (§L)](#roles)
- [Decompose into sub-questions](#decompose)
- [Worker contract (one per sub-question)](#worker-contract)
- [Interim reports](#interim-reports)
- [Gap-fill / saturation wave](#gap-fill)
- [No-subagent degradation](#degrade)

## Roles & model tiers (§L) {#roles}

| Role | Model tier | Why |
|---|---|---|
| Orchestrator (the calling skill) | inherit | holds the plan + synthesis judgement |
| Preliminary scoping (deep only) | sonnet | quick breadth pass to shape a better plan |
| Research worker (fan-out) | sonnet | search + fetch + structured findings per sub-question |
| Verifier / refutation (deep) | sonnet | adversarial counter-evidence per major claim |
| Report reviewer (synthesis) | sonnet | scores-only, ≥40-char quote-grounding, no edits |

The orchestrator inherits the parent model — synthesis is genuine judgement, never
downgraded. Workers are sonnet (search + structured extraction is well-scoped).

## Decompose into sub-questions {#decompose}

Break the topic into **independent sub-questions / perspectives** (STORM-style), one
per worker, each answerable on its own evidence. A good decomposition:

- Covers the decision's criteria (each option-evaluation axis gets a sub-question).
- Has no two sub-questions that would need to share a worker's mid-flight findings — if
  they would, merge them (workers run blind to each other).
- Sizes to the depth dial: brief = 0 (inline, sequential) / standard = 3–5 / deep = ~5
  + one gap-fill wave. Never exceed the consumer's deep cap silently — log if capped.

## Worker contract (one per sub-question) {#worker-contract}

Each worker is dispatched with: its single sub-question, the decision the research
supports, the approved source scope, and `sourcing.md` + `source-tiers.md` as its
evidence rules. It returns **structured findings, not prose**:

```
{ sub_question, claims: [{ claim, evidence: [{url, tier, quote_or_locator, access_date}], confidence }],
  gaps: [<what it could not establish>], interim_report_path }
```

A worker **fetches every source it cites** (the `source-tiers.md` hard gate) and reports
honest gaps rather than padding. It makes no synthesis decisions — it gathers and grounds.

## Interim reports {#interim-reports}

Every worker saves an **interim report** to `<out>/interim-reports/<NN>-<sub-question-slug>.{html,md}`
before returning — so a crashed or thin synthesis can be reconstructed, and the user can
audit the raw evidence per sub-question. The interim report holds the worker's full
findings (claims + evidence + gaps); the final report cites across them.

## Gap-fill / saturation wave {#gap-fill}

After the first fan-out, a **"what's missing" critic pass** (the orchestrator, or a
dedicated critic at deep) reads the interim reports and names coverage gaps: an
unaddressed criterion, a key claim with only one source, a one-sided options table. At
**deep**, dispatch **one capped follow-up wave** of workers to fill the named gaps; stop
on **saturation** (a wave that surfaces nothing materially new). Brief/standard skip the
extra wave. Never loop unbounded — one gap-fill wave is the cap.

## No-subagent degradation {#degrade}

On a platform without subagents, **collapse the fan-out to sequential inline research** —
the orchestrator works each sub-question itself, in order, still saving interim reports
and still obeying `sourcing.md` + `source-tiers.md`. Log the degradation. The protocol's
quality gates are unchanged; only the parallelism is lost.
