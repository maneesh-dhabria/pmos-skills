# Case authoring — grounding a case round in a real business context

How to author output (c), the candidate-facing case document + its interviewer reference-solution, from
an operator-supplied business context. The governing rule (design D11): **a case is only ever authored
from a supplied business context — never fabricated.** No context ⇒ no case (the run emits (a)+(b) and
defers).

Model this on a strong take-home case: a real product decision, a clear deliverable, honest constraints,
and a time window a candidate can actually work inside.

## Two distinct time inputs — do not conflate them

A case round has **two separately-sourced durations, and neither derives from the other** (INV-4, D7):

- the **candidate take-home / case work window** — how long the candidate has to prepare the deliverable
  (e.g. "3 days, ~4 hours of work"). It lives in the candidate-facing document's Constraints and is set by
  what the case realistically demands, not by the round length.
- the **live-round `--duration`** — how long the interview session itself runs (Phase
  [Collect](../SKILL.md#collect) step 6). It budgets the interviewer reference's per-area minutes and, for
  **`case-presentation`**, splits the round between the candidate's **presentation** and the interviewer's
  **Q&A**.

Emit each from its own input. A 90-minute live presentation round can carry a 3-day take-home window; the
two numbers are unrelated and are never inferred from one another.

## Inputs

- **the business context** (`--business-context <path>` or the operator's pasted answer) — a product
  area, a real decision the team faced, a dataset, or a scenario. This is the ground truth; everything in
  the case traces to it.
- **the role + seniority** — sets the bar: a staff case has more ambiguity and less scaffolding than a
  new-grad one.
- **the scoring-sheet dimensions** — the case must exercise the same competencies the round scores.

## The candidate-facing document (`case-document.html`)

Author what the candidate receives — and only that:

1. **Framing (2–4 sentences).** The company/product situation drawn from the business context: who the
   users are, what's happening, why a decision is needed now. Enough to reason with; not a data dump.
2. **The ask.** The single decision or deliverable — "recommend whether to…", "design…", "prioritize…",
   "size the opportunity for…". One primary ask; at most one secondary.
3. **Constraints & materials.** Time window (e.g. "3 days, ~4 hours of work"), the format expected
   (memo / deck / model), and any data or artifacts provided. State what is deliberately left open — a
   good case rewards a candidate who names the ambiguity and picks a path.
4. **What we're looking for (light).** One or two lines on how the work will be assessed, in the
   candidate's language — enough to orient without handing them the rubric.

**Never** put the reference-solution, the traps, or the scoring dimensions in this file. It is what the
candidate sees.

## The interviewer reference-solution (`case-reference-solution.html`)

Author the interviewer-only companion from the same context:

1. **What a strong answer looks like** — the shape of a good response: the decision a strong candidate
   lands on (or the range of defensible ones), the reasoning path, the tradeoffs they should surface.
2. **Traps the prompt sets** — the ambiguities and easy-but-wrong paths; what a weak answer does here.
3. **Dimension mapping** — per section, a `data-maps-dim="<id>"` note tying that part of the case to a
   scoring-sheet dimension, so the interviewer scores the case on the same competencies as the live round
   (the interop loop).
4. **Debrief probes** — questions to ask if there's a live walkthrough, to test whether the candidate
   owns the reasoning or pattern-matched a template.

## Realism bar (checked in self-review)

- Grounded: every element traces to the supplied context; nothing is invented whole-cloth.
- A real decision: genuine tradeoffs, not a single obvious answer.
- Answerable: a competent candidate can produce the deliverable in the stated window.
- Fair: the ambiguity is deliberate and named, not a gotcha the candidate can't see.

## Confidentiality

The business context may be confidential. Use it only to author the case; never send it to an external
service, and never leak more of it into the candidate-facing file than the candidate is meant to see.
Do not record business-context content in `~/.pmos/learnings.md`.
