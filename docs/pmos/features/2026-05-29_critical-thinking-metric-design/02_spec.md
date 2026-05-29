# Spec — choose-the-metric shape + metric-selection muscle

## Design decisions
1. **Shape name `choose-the-metric`, muscle `metric-selection`.** The user said "metric choice"; the shape verb-phrases it ("choose the metric"), the muscle nouns the skill it trains. Trigger phrase "metric-choice drill" added to the description so users can request it by name.
2. **Group = Analysis.** It's a reason-from-scratch analytical shape (like reframe / second-order), not MC and not a Core full-rubric shape.
3. **Free-form, not MC.** The user must *generate* the metric — handing candidate metrics would collapse the exercise into pick-and-defend. Generate half explicitly forbids offering candidates.
4. **Distinct from calibration (shape 7).** Calibration = probability of an outcome; choose-the-metric = which metric defines the outcome. No overlap.
5. **No code change.** `scorecard.js load()` already `Object.assign(seed(), data)` and `applySession` lazily creates `muscle_scores[m]` — a brand-new muscle id just works. Verified by re-running the existing 10 unit tests (all pass).

## Changes
| File | Change |
|---|---|
| `reference/exercise-shapes.md` | Intro "Nine"→"Ten"; Analysis group line adds `choose-the-metric`; new `## 10. choose-the-metric` section |
| `reference/grading-rubrics.md` | "The 8 named moves"→"9"; new `metric-selection` row |
| `SKILL.md` | description: add `metric-choice` to the exercise list + a trigger phrase; ref-file list "9 shapes"→"10", "8 moves"→"9" |

## Grading contract for the new shape
Target move `metric-selection` (+ `evidence-vs-inference`). Strong = outcome-proxy metric (not vanity/activity) + justification + guardrail + a gaming/Goodhart risk. Weak = vanity metric or no guardrail. Mandatory probe when guardrail or gaming-risk absent: "How could that number go up while the goal gets worse?" — honors Anti-Pattern 1 (always name a gap) and the universal rule.

## Verification
- `node tests/scorecard.test.js` → 10/10 (unchanged; proves no code regression).
- grep: no remaining "9 v1 shapes" / "8 named moves" stale counts.
