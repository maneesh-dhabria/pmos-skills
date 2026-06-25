# Critique axes — the fixed 10-axis coverage surface

> Canonical home (Inv-1) for the **axis set and its order**. Every product doc is scored on the same 10
> axes, in this order, regardless of type — the list is fixed precisely so that **omissions surface**: an
> axis the author never addressed gets an `ABSENT` verdict (often the highest-value output of the whole
> critique). `/artifact-critique` reads the axis set from this file and never forks it.
>
> Each axis below declares: a **one-line scope**, the **checks** it runs (expressed as `heuristics.md`
> handles — every handle cited on a `**Heuristics:**` line must exist there; `selftest.mjs` enforces it),
> and a **"What I'd want to see"** template — the concrete artifact a STRONG verdict requires, which the
> per-axis deep-dive turns into its prescriptive ask.
>
> Whether a given axis is *expected* for a given doc-type (and therefore whether "missing" reads as
> `ABSENT` vs. a stated `N/A`) is **not** decided here — it is resolved deterministically from the
> applicability map in [`doc-types.md`](./doc-types.md). This file says *what each axis checks*; that file
> says *when it applies*.

**The 10 axes, in fixed order:**
`Customer` · `Solution` · `Scope` · `Metrics` · `Pricing` · `Strategy` · `GTM` · `Stage` · `AI` · `Risks`

---

## 1. Customer

**Scope.** Who is this for, how acute is their pain, and how do we *know* — segment, sizing, and evidence
of demand rather than a category description.

**Heuristics:** `assertion-vs-evidence`, `multi-sided-completeness`

**What I'd want to see.** A named, sized target segment; verbatim user quotes or incident/ticket data
evidencing the pain (not "users want this"); and, for any multi-party product, the job-to-be-done of
*every* affected side — not just the one the author works closest to.

---

## 2. Solution

**Scope.** Is the proposed solution a falsifiable bet with a named mechanism, chosen over visible
alternatives — or just a description of what will be built?

**Heuristics:** `hypothesis-falsifiability`, `alternatives-considered`

**What I'd want to see.** An explicit if/then/because hypothesis (if we build X, metric Y moves, because
mechanism Z), plus the two or three alternatives considered and the disqualifying reason each was
rejected — including the cheapest "do nothing / buy it" option.

---

## 3. Scope

**Scope.** Is the boundary of this release explicit and stage-appropriate, with deliberate cuts named?

**Heuristics:** `scope-discipline`, `stage-fit`

**What I'd want to see.** Explicit IN / OUT / CUT lists — what ships now, what is deliberately deferred,
and what was removed (with the v1 cut rationale) — sized to the product's lifecycle stage rather than to
the full vision.

---

## 4. Metrics

**Scope.** Are success metrics real outcomes, fully specified — or output/activity counts dressed up?

**Heuristics:** `outcome-vs-output`

**What I'd want to see.** Per north-star metric: a baseline, a target, a timeframe, a counter-metric that
must not degrade, and a pre-committed kill / scale / graduate threshold. "Increase adoption" fails all
five; a quantified outcome with a guardrail passes.

---

## 5. Pricing

**Scope.** Is the pricing (or, for internal tools, the build-vs-buy economics) a durable position backed
by willingness-to-pay evidence — or a current, copyable wedge?

**Heuristics:** `durable-vs-current`, `alternatives-considered`

**What I'd want to see.** Evidence of willingness to pay (or, for an internal platform with no external
price, the build-vs-buy comparison and opportunity cost under Strategy), and an honest statement of what
makes the position durable rather than a wedge a funded competitor copies in a quarter. *(Conditional: see
`doc-types.md` — Pricing is `N/A` for internal tools with no external price, reframed as build-vs-buy.)*

---

## 6. Strategy

**Scope.** Is there a durable advantage and a defensible position — versus a feature list or a benchmark
against today's competitors?

**Heuristics:** `durable-vs-current`, `alternatives-considered`

**What I'd want to see.** A named moat (network effects, switching costs, proprietary data, scale,
regulation) and why it compounds; positioning against where the market is *going*, not just where it is;
and the strategic alternatives weighed. For internal platforms this is the home of the build-vs-buy
decision promoted from Pricing.

---

## 7. GTM

**Scope.** Is there a concrete go-to-market motion and a first-customer path — or "we'll figure out
distribution later"?

**Heuristics:** `assertion-vs-evidence`, `stage-fit`

**What I'd want to see.** A named channel and sales/adoption motion, a specific path to the first N
customers (or first internal teams), and evidence the channel works — sized to stage, not a hand-wave that
distribution will sort itself out.

---

## 8. Stage

**Scope.** Does the doc state the product's lifecycle stage, and does its scope and rigor match it?

**Heuristics:** `stage-fit`

**What I'd want to see.** An explicit stage (pre-PMF / scaling / mature) and a scope consistent with it —
cheap falsification of the riskiest assumption pre-PMF; reliability and guardrails at scale. Flag both
over-build (Series-A scope on a pre-PMF problem) and under-build (core reliability still "TBD" at scale).

---

## 9. AI

**Scope.** If the doc proposes an AI/LLM feature, is it treated as a risk surface with the controls that
implies?

**Heuristics:** `ai-risk-surface`, `pre-mortem`

**What I'd want to see.** A Behavior Contract (GOOD / BAD / REJECT exemplars), a fallback / kill-switch for
low-confidence or unavailable model states, offline + online eval metrics with a ship bar, and a red-team
list of adversarial/failure inputs. *(Conditional: see `doc-types.md` — AI is `E` iff the doc proposes an
AI/LLM feature, else `N/A`.)*

---

## 10. Risks

**Scope.** Are the real failure modes surfaced where the reader will hit them — or buried, optimistic, or
absent?

**Heuristics:** `pre-mortem`, `no-burial`

**What I'd want to see.** A pre-mortem ("six weeks later it failed — what happened?") yielding named
failure modes across adoption / technical / market / org, each with a leading indicator and a mitigation,
surfaced in the body — not financial or risk content exiled to an annexure.
