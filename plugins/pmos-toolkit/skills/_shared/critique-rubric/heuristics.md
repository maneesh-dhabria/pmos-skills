# Critique heuristics — the reasoning spine

> Canonical home (Inv-1) for the **doc-type-agnostic** reasoning that `/artifact-critique` applies on
> every axis. These are the real intelligence behind the scorecard: an axis verdict is only as good as
> the heuristic that produced it. The skill **cites these handles, never restates them** (CLAUDE.md §K);
> `axes.md` maps each of the 10 axes onto the subset of handles that apply to it.
>
> Each entry below has a **stable handle** (the backticked id in its heading — the citation token
> `axes.md` and the skill use), the **rule**, a **sharp line** (the senior-operator aphorism that makes
> the point land), and **what it demands** (the concrete thing a STRONG verdict requires). The handles
> are a closed set; `selftest.mjs` fails the build if `axes.md` cites a handle not defined here.

## Contents

- [`assertion-vs-evidence`](#assertion-vs-evidence--assertion-vs-evidence) — claims need quotes, data, incidents
- [`hypothesis-falsifiability`](#hypothesis-falsifiability--falsifiable-hypothesis-with-a-named-mechanism) — a solution is an if/then, not a feature list
- [`outcome-vs-output`](#outcome-vs-output--outcome-metrics-not-output-metrics) — metrics need baseline/target/timeframe/counter/threshold
- [`durable-vs-current`](#durable-vs-current--durable-vs-current-advantage) — a wedge is not a moat
- [`stage-fit`](#stage-fit--stage-fit) — scope and rigor must match lifecycle stage
- [`ai-risk-surface`](#ai-risk-surface--ai-as-a-risk-surface) — any AI feature needs a Behavior Contract
- [`pre-mortem`](#pre-mortem--pre-mortem) — surface failure modes by assuming failure
- [`alternatives-considered`](#alternatives-considered--alternatives-considered) — show the roads not taken
- [`scope-discipline`](#scope-discipline--scope-inoutcut-discipline) — explicit IN / OUT / CUT
- [`multi-sided-completeness`](#multi-sided-completeness--multi-sided-completeness) — every affected party accounted for
- [`no-burial`](#no-burial--no-burial-of-load-bearing-content) — load-bearing content belongs in the body

---

### `assertion-vs-evidence` — Assertion vs. evidence

**Rule.** A claim about users, demand, or pain must be backed by *evidence the reader can inspect* —
verbatim user quotes, support-ticket counts, incident logs, segment sizing, a funnel number — not a
category description that merely *sounds* researched.

**Sharp line.** "That's asserted, not demonstrated."

**What it demands.** For every load-bearing claim about the world: the source, the sample, and the
artifact. "Users are frustrated by X" must become "14 of the last 30 churn interviews named X
unprompted (transcript link)." A category description ("enterprise buyers care about security") is the
absence of evidence, not its presence.

---

### `hypothesis-falsifiability` — Falsifiable hypothesis with a named mechanism

**Rule.** A solution must be stated as a falsifiable **if/then with a named mechanism**: *if* we do X,
*then* metric Y moves, *because* of mechanism Z. A bare description of what will be built is not a
hypothesis — there is nothing it could turn out to be wrong about.

**Sharp line.** "A list of features is not a hypothesis."

**What it demands.** An explicit causal claim and the mechanism it rides on, stated so that a result
could falsify it. "We'll add inline previews" is a feature; "inline previews will cut time-to-first-share
by 30% because the current 3-click gap is where 60% drop off" is a hypothesis.

---

### `outcome-vs-output` — Outcome metrics, not output metrics

**Rule.** Every success metric must be an **outcome** (something that changes in the user's or
business's world), fully specified with **baseline + target + timeframe + counter-metric + a
kill/scale/graduate threshold**. Shipping, usage of the thing you shipped, and activity counts are
*outputs* dressed as outcomes.

**Sharp line.** "Outputs dressed as outcomes — what changes for the user, and how would we know?"

**What it demands.** Per north-star metric: where it is today (baseline), where it should be and by when
(target + timeframe), the metric that must *not* degrade (counter-metric), and the pre-committed number
that triggers kill / scale / graduate. "Increase adoption" fails on all five; "lift 30-day retention
from 42% → 50% in two quarters without raising support contacts/user, kill below 44% at the midpoint"
passes.

---

### `durable-vs-current` — Durable vs. current advantage

**Rule.** Distinguish a **current** advantage (true today, trivially copied) from a **durable** one
(protected by a structural moat — network effects, switching costs, proprietary data, scale economics,
regulation). Pricing, a feature, or "we're faster" are rarely durable on their own.

**Sharp line.** "Affordable pricing is a wedge, not a moat."

**What it demands.** Name the moat and why it compounds, or concede the advantage is a wedge and state
what durable position the wedge buys time to build. An advantage that a well-funded competitor erases in
a quarter is not a strategy.

---

### `stage-fit` — Stage-fit

**Rule.** The scope, rigor, and certainty demanded of a doc must **match the product's lifecycle stage**.
Pre-PMF, the job is cheap falsification of the riskiest assumption; at scale, the job is reliability and
guardrails. A mismatch in either direction is a defect.

**Sharp line.** "This is a Series-A scope on a pre-PMF problem."

**What it demands.** The doc states its stage and its scope is consistent with it: a pre-PMF doc that
specifies five-9s SLAs and a full pricing tier ladder is over-built; a scaling doc that still treats core
reliability as "TBD" is under-built.

---

### `ai-risk-surface` — AI as a risk surface

**Rule.** Any feature backed by AI / an LLM is a **risk surface**, not just a capability. It needs a
**Behavior Contract** (explicit GOOD / BAD / REJECT examples of model behavior), a fallback / kill-switch,
eval metrics with a quality bar, and a red-team list of adversarial and failure inputs.

**Sharp line.** "A wrong answer here is a learning harm, not a UX bug."

**What it demands.** GOOD/BAD/REJECT exemplars that define acceptable output; what happens when the model
is unavailable or low-confidence (fallback); the offline + online eval metrics and the bar to ship; and
the enumerated ways it can be abused or fail. An AI feature with none of these is scored on its risk
absence, not its demo.

---

### `pre-mortem` — Pre-mortem

**Rule.** Assume the launch failed and work backwards: *"It is six weeks post-launch and this flopped —
what happened?"* The exercise manufactures the failure modes an optimistic plan omits.

**Sharp line.** "It's six weeks later and this failed — what happened?"

**What it demands.** A named set of plausible failure modes (adoption, technical, market, org) each with a
leading indicator and a mitigation. A doc with risks but no pre-mortem usually lists only the risks it was
already comfortable with.

---

### `alternatives-considered` — Alternatives considered

**Rule.** A decision is only as credible as the **alternatives it visibly rejected**. The doc should show
the two or three roads not taken and why the chosen one wins — including the cheapest "do nothing / buy it"
option.

**Sharp line.** "What did you decide *against*, and why?"

**What it demands.** An explicit alternatives section (or inline trade-off) naming real options, their
costs, and the disqualifying reason — not a strawman. The absence of rejected alternatives signals a
decision rationalized after the fact.

---

### `scope-discipline` — Scope IN/OUT/CUT discipline

**Rule.** Scope must be stated as three explicit lists: **IN** (this release), **OUT** (deliberately not
now), and **CUT** (was in, removed, and why). An implicit or open-ended scope is how timelines and
quality silently slip.

**Sharp line.** "What's explicitly *out* — and what got cut to get here?"

**What it demands.** Named IN/OUT/CUT lists with the v1 cut decisions and their rationale. "Everything in
the vision" is not a scope; a one-line "out of scope: X, Y" with no CUT history is half a scope.

---

### `multi-sided-completeness` — Multi-sided completeness

**Rule.** For any product touching more than one party (buyer vs. user, the two sides of a marketplace,
the admin vs. the end-user, the partner vs. the customer), the doc must account for **every affected
side** — incentives, workflow, and failure modes for each.

**Sharp line.** "You've designed for the buyer; who speaks for the other side of this?"

**What it demands.** Each side named with its job-to-be-done and what would make it defect. A two-sided
proposal that only models the side the author works closest to is structurally incomplete.

---

### `no-burial` — No burial of load-bearing content

**Rule.** The load-bearing content — the risks, the financial model, the dependency that can sink the
plan — must live **in the body where a reader will hit it**, not in an annexure, a footnote, or a linked
appendix. Burial is how uncomfortable facts get a free pass.

**Sharp line.** "The thing that can kill this is on page 14 — move it to page 1."

**What it demands.** Risk, cost, and dependency content surfaced in the main flow at the point it bears on
a decision. Content that is technically present but structurally hidden is treated as a weakness of
presentation, scored where it bites.
