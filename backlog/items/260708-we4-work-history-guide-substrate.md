---
schema_version: 1
id: 260708-we4
kind: story
title: /interview-guide work-history archetype + scorecard-skeleton per-role/trajectory extension + level ladder
type: enhancement
status: done
priority: should
route: skill
parent: 260708-23a
dependencies: []
feature_folder: docs/pmos/features/2026-07-08_work-history-interview/
design_doc: docs/pmos/features/2026-07-08_work-history-interview/02_design.html
plan_doc: docs/pmos/features/2026-07-08_work-history-interview/stories/260708-we4/03_plan.html
worktree: /Users/maneeshdhabria/Desktop/Projects/agent-skills/.claude/worktrees/feat-260708-we4
released:
claimed_by:
driver_holder:
labels: [pmos-managerkit, interview-guide, work-history, substrate]
created: 2026-07-08
updated: 2026-07-08
---

## Context

Story 1 of epic 260708-23a. Adds the `work-history` archetype to `/interview-guide` plus the shared-substrate changes it needs. Route: skill. Single plugin: pmos-managerkit. No dependencies. Design contract + all decisions (D1–D9): `02_design.html`.

## Acceptance criteria

1. **Archetype corpus** — `plugins/pmos-managerkit/skills/_shared/interview-guidelines/guidelines/work-history/interviewer-reference.html` + `scorecard.html` exist, instantiating `reference-skeleton.html` / the extended `scorecard-skeleton.html`. The interviewer reference encodes the method skeleton (open → career-arc scan → deep-dive per-role battery → level-targeted competency probes → wrap), the funnel/peel-the-onion technique, resume-inflation catches, the "we vs I" discipline, the boss-rating 1–10 probe (D4), soft-pedalled reference verification, and the bias register (halo, confirmation, leading, recency, vagueness, individual-contribution, partial-arc). Provenance cites Topgrading/"Who", Lenny Rachitsky, Reforge/Mehta, Ben Kuhn, Schmidt & Hunter / Google re:Work.
2. **Scorecard-skeleton extension (additive, backward-compatible)** — `scorecard-skeleton.html` gains the `data-card="role-evidence"` (per-role, with `role:company|title|tenure|scope|contribution|result`, `data-field="result-measured"`, green/red flags) and `data-card="trajectory-synthesis"` (`trajectory:scope-arc|patterns|level-fit`, `data-field="level-verdict"`) section families, documented in the skeleton comment. The existing `data-dim` competency contract and reco section are unchanged.
3. **Candidate-blind role blocks (D6)** — the work-history `scorecard.html` ships a fixed N≈4 placeholder `role-evidence` blocks (Role 1–4) plus exactly one `trajectory-synthesis` block.
4. **Level ladder + static weight table (D7)** — a `level-ladder` reference (in the archetype corpus) carries a hardcoded per-level competency→weight table (APM/PM/Sr/GPM/Dir/VP), each row pre-summing to 100; `--seniority` selects the row and marker text. The model never computes weights.
5. **`--level-rubric <path>` override (D8)** — `/interview-guide` accepts `--level-rubric <path>`; operator free-form markdown is interpreted into a per-level weight set; `validate-scorecard-anchors.mjs` deterministically gates sum-to-100 and **refuses+re-prompts** on a non-summing/malformed result, falling back to the default ladder with a clear error. A non-summing override is refused, never emitted.
6. **level-verdict distinct from reco (D9)** — the scorecard surfaces `level-verdict` (below/at/above target) as its own input that feeds, but is not computed from, the overall `reco`.
7. **Registration** — `work-history` is added to `/interview-guide`'s archetype enum (`SKILL.md` § Archetypes) + best-practices tailoring, marked **non-case** (no output (c)). `--seniority` levels documented to include the full ladder.
8. **Validator** — `validate-scorecard-anchors.mjs` gains a presence-guarded work-history assertion (≥1 `role-evidence` block, exactly 1 `trajectory-synthesis` block, required sub-anchors) keyed on `data-archetype="work-history"`; for every other archetype the assertion is skipped and existing scorecards still validate byte-unchanged.
9. **No regressions** — `/interview-guide` skill-eval passes; the other seven archetypes' scorecards are unchanged.
10. **Dogfood** — live-generate a work-history guide for a real Staff-PM resume; eyeball level-scaling. The resume is external input — never committed.

## Notes

Release prerequisites (version bump, changelog, README row, manifest sync) are `/complete-dev`'s job — not in any execute wave.
