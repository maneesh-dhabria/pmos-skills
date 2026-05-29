# grading-rubrics.md — the critical-thinking moves + grading rule

The skill grades the **reasoning**, never the **choice**. There is no right answer to most scenarios; there are stronger and weaker ways to reason about them. This file defines the named moves and the universal grading rule that every exercise's Evaluate half uses.

## The 8 named moves

| Move | What a strong answer does |
|---|---|
| `surface-assumptions` | Names the load-bearing assumptions the position rests on (not just restates the situation). |
| `steelman-alternatives` | Gives the strongest version of at least one option it is rejecting — not a strawman. |
| `second-order-effects` | Traces consequences beyond the immediate effect (what happens next, and after that). |
| `evidence-vs-inference` | Separates what is known/measured from what is being inferred or assumed. |
| `falsifiability` | States what evidence would change its mind (an honest disconfirmer). |
| `spot-bias` | Identifies a cognitive bias or fallacy at work (sunk cost, survivorship, confirmation, base-rate neglect, etc.). |
| `reframe-question` | Questions whether the stated question is the right one; reframes to the underlying decision/problem. |
| `causal-reasoning` | Distinguishes correlation from causation; reasons about mechanism, not just association. |

## The universal grading rule (FR-7)

For every answer:

1. **Score the moves, not the pick.** Judge which of the shape's target moves are present and how well-executed — independent of which option/answer the user chose.
2. **Always name ≥1 gap.** Every verdict MUST call out at least one move that was missing or weak, and one concrete way to strengthen it. A flawless answer is rare; find the next stretch.
3. **No pure praise.** "Great reasoning!" with no specific, move-level critique is a failure of the skill — it trains nothing. Be specific and a little demanding.
4. **Be concise.** 2–4 sentences of verdict + the one gap. This is practice, not an essay.
5. **Probe when a key move is absent.** If the shape's primary move is missing, ask one pointed follow-up ("What would have to be true for the option you rejected to be the right call?") rather than just marking it down.

## Move → scorecard

For each target move of a shape, mark the muscle `seen += 1`, and `strong += 1` only if the move was clearly present and well-executed. This feeds `muscle_scores` (see [scorecard-schema.md](scorecard-schema.md)) and the mix engine's weighting toward weak muscles.
