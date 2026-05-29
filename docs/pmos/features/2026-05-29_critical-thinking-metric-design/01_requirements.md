# Requirements — metric-choice exercise for /critical-thinking

**Mode:** skill revision (pmos-learnkit / critical-thinking) · **Tier:** 1 (additive)

## Feedback
> "Add metric choice questions to /critical-thinking's set of exercises if they are not already a part."

## Gap confirmed
The skill ships **9 exercise shapes** (`reference/exercise-shapes.md`) graded against **8 named moves/muscles** (`reference/grading-rubrics.md`), tracked by `scripts/scorecard.js`. There is a `metrics/experimentation` *domain* that any shape can draw a scenario from, but **no shape and no muscle trains choosing the right metric for a goal**. The closest, shape 7 (calibration/forecasting), is about probability estimates, not metric selection. So the feedback's condition holds — it is not already a part.

## Scope (user-confirmed)
"Choosing the right metric for a goal" — given a goal/problem/outcome with no metric defined, propose the metric that proxies it, justify the proxy, add a guardrail, and flag a gaming risk. Graded on the selection *reasoning*, not a single correct metric (consistent with the skill's grade-the-thinking philosophy).

## Success criteria
- A new **`choose-the-metric`** shape exists in `exercise-shapes.md`, in the **Analysis** group, with Generate + Evaluate halves like every other shape.
- A new **`metric-selection`** muscle exists in `grading-rubrics.md`'s moves table; the new shape's Evaluate half targets it.
- The mix engine (SKILL.md Phase 2) picks it up automatically — it ranks muscles from the scorecard and selects shapes covering the weakest; no enumerated list to update beyond the count references.
- `scripts/scorecard.js` needs **no change** — it keys `muscle_scores` dynamically; the new muscle accrues the first time it's exercised.
- Counts that say "9 shapes" / "8 moves" are updated to 10 / 9.

## Out of scope
No metric *interpretation* drill (that's adjacent to spot-the-bias). No scorecard schema/code change. No version bump here (release-prereq for /complete-dev).
