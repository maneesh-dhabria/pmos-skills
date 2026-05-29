# Plan + eval — choose-the-metric

Tier 1 additive. All edits under `plugins/pmos-learnkit/skills/critical-thinking/`.

| # | File | Op | Status |
|---|------|----|--------|
| T1 | `reference/exercise-shapes.md` | add shape 10 + intro/group counts | ✅ done |
| T2 | `reference/grading-rubrics.md` | add `metric-selection` move + count | ✅ done |
| T3 | `SKILL.md` | description + ref-list counts | ✅ done |
| — | `scripts/scorecard.js` | **no change needed** (dynamic muscle keys) | ✅ verified |

## Eval gate
- **Deterministic:** `node tests/scorecard.test.js` → **10 passed, exit 0**. No code touched; muscle is data-driven.
- **Stale-count grep:** clean — only intentional "9 named moves" / "10 shapes" remain; no orphaned "8"/"9-shape" strings.
- **Skill-authoring rubric (CLAUDE.md):** frontmatter `name: critical-thinking` matches dir; description third-person with triggers (added "metric-choice drill"); progressive disclosure intact (one-line in SKILL.md, detail in reference/); no broken ref links; canonical path respected.
- **Single responsibility / no-contradiction:** new shape is one more Analysis exercise within the existing purpose; distinct from calibration & spot-the-bias; boundary documented in spec.

**Result: PASS.** Version bump (0.6.0 → 0.7.0) deferred to `/complete-dev` per skill-mode release-prereq discipline.
