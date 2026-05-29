# exercise-shapes.md — the v1 exercise library

Ten exercise shapes. Each has a **Generate** half (how to build the scenario) and an **Evaluate** half (how to grade the answer). Generation invents a fresh PM scenario at runtime from one of the six PM domains (product design · prioritization/tradeoffs · metrics/experimentation · influence/stakeholder · strategy-under-ambiguity · GTM) — never from a static template bank; grading applies the moves + rule in [grading-rubrics.md](grading-rubrics.md) and updates the [scorecard](scorecard-schema.md). All free-form prompts MUST state the expected answer shape/length. Use `AskUserQuestion` only for the two MC shapes; otherwise present a numbered free-form prompt.

Groups: **Core** (pick-and-defend, hard-mode, bring-your-own) · **Targeted** (assumption-hunt, spot-the-bias, what-would-change-your-mind) · **Analysis** (calibration, second-order map, reframe, choose-the-metric).

---

## 1. pick-and-defend  · Core · MC + own-words
**Generate.** Invent a scenario in a chosen domain; present the dilemma + 3–4 genuinely defensible options (no obviously-wrong filler). Ask via `AskUserQuestion` for the pick, then: "In 2–3 sentences, defend your choice — and name the strongest case for the option you rejected."
**Evaluate.** Target moves: `steelman-alternatives`, `surface-assumptions`. Strong = defends with a reason tied to a stated assumption AND steelmans a rejected option. Probe if no steelman: "What's the best argument for [rejected option]?" Muscles: alternatives, assumptions.

## 2. hard-mode open response · Core · free-form
**Generate.** Invent a scenario in a chosen domain; present only the dilemma (no options). "Decide what you'd do and explain your reasoning in 4–6 sentences." This is the full-rubric shape.
**Evaluate.** Target moves: all 8 as applicable. Strong = names assumptions, considers an alternative, traces a 2nd-order effect, and states a disconfirmer. Name the weakest 1–2 moves. Muscles: whichever moves were in scope.

## 3. bring-your-own-dilemma · Core · free-form (user-supplied)
**Generate.** Ask the user to paste a real product decision they're facing (1–3 sentences) + their current leaning. No generated scenario.
**Evaluate.** Run the full moves rubric live on their reasoning. Output: which moves they've made, which load-bearing assumption is untested, and the cheapest way to test it before deciding. End with the one question to resolve first. Muscles: all in scope.

---

## 4. assumption-hunt · Targeted · free-form list
**Generate.** Present a short, confident PM memo/decision (4–6 sentences) generated for a chosen domain, written as if already decided. "List the load-bearing assumptions this rests on, and the cheapest test for each."
**Evaluate.** Target move: `surface-assumptions` (+ `evidence-vs-inference`). Strong = separates true load-bearing assumptions (if false, the decision collapses) from nice-to-haves, and proposes a cheap test. Probe if they list restatements instead of assumptions. Muscle: assumptions.

## 5. spot-the-bias · Targeted · MC
**Generate.** Present a 2–4 sentence snippet of PM reasoning that contains exactly one planted fallacy (sunk cost / survivorship / confirmation / base-rate neglect / correlation-as-causation). `AskUserQuestion` with 3–4 named biases. Then: "In one sentence, say why."
**Evaluate.** Target move: `spot-bias`. Strong = names the bias AND explains the mechanism in the snippet. Even on a correct pick, require the one-sentence why; mark weak if absent. Muscle: spot bias.

## 6. what-would-change-your-mind · Targeted · free-form
**Generate.** Present a strong opinion/position generated for a chosen domain (stated as conviction). "Name the specific evidence that would make you change your mind — be concrete."
**Evaluate.** Target move: `falsifiability`. Strong = a concrete, observable disconfirmer (a metric threshold, a user signal), not "if I were wrong." Probe if the answer is unfalsifiable. Muscle: falsifiability.

---

## 7. calibration / forecasting · Analysis · probability + reasoning
**Generate.** Present a generated scenario framed as a near-future yes/no outcome ("Will this experiment beat control by launch?"). Ask: "Give a probability (0–100%) and one sentence of reasoning." Record the elicited `p`. (Outcome is the user's own later judgment or a stated resolution; capture `{p, outcome}` when known — see scorecard.)
**Evaluate.** Target move: `evidence-vs-inference`. Strong = a probability that reflects stated evidence, not 50% hedging or 99% overconfidence; reasoning cites a base rate or signal. Feed `{p, outcome}` to the Brier calculation. Muscle: evidence-vs-inference (+ calibration trend).

## 8. second-order consequence map · Analysis · free-form
**Generate.** Present a proposed change in a chosen domain. "Trace the 2nd- and 3rd-order effects — what happens after the obvious first effect, and after that?"
**Evaluate.** Target moves: `second-order-effects`, `causal-reasoning`. Strong = goes ≥2 steps deep and names at least one unintended/adverse consequence, with a plausible mechanism. Probe if they stop at the first-order effect. Muscle: 2nd-order effects, causal reasoning.

## 9. reframe-the-question · Analysis · free-form
**Generate.** Present a stakeholder request phrased as a solution ("Build feature X"), generated for a chosen domain. "Before answering — what's the underlying problem or decision? Reframe the question, then say how that changes the answer."
**Evaluate.** Target move: `reframe-question`. Strong = surfaces the real job/decision behind the request and shows how the reframe changes what you'd build. Probe if they jump straight to executing the literal ask. Muscle: problem-framing.

## 10. choose-the-metric · Analysis · free-form
**Generate.** Present a goal, problem statement, or desired outcome in a chosen domain (bias toward metrics/experimentation, product design, GTM) with **no metric defined** ("We want onboarding to feel effortless" / "Make the marketplace feel trustworthy"). "What single metric would best tell you you're achieving this? In 3–5 sentences: name it, say why it's a faithful proxy for the goal, name one guardrail metric, and one way the metric could be gamed." Do NOT hand the user candidate metrics — they must generate the metric.
**Evaluate.** Target move: `metric-selection` (+ `evidence-vs-inference`). Strong = picks a metric that proxies the *outcome* (not a vanity/activity count), justifies why it tracks the goal, pairs it with a guardrail against the obvious failure mode, and names a concrete gaming/Goodhart risk. Mark weak if the metric is vanity (e.g. raw signups for an "activation" goal) or if no guardrail is offered. Probe if either is absent: "How could that number go up while the goal gets *worse*?" Muscle: metric-selection.
