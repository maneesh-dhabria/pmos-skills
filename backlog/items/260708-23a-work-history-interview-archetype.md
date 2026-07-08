---
schema_version: 1
id: 260708-23a
kind: epic
title: Work-history deep-dive interview archetype for /interview-guide + shared substrate + /interview-feedback scorer
type: enhancement
priority: should
status: defined
route: skill
feature_folder: docs/pmos/features/2026-07-08_work-history-interview/
requirements_doc: docs/pmos/features/2026-07-08_work-history-interview/01_requirements.html
spec_doc:
design_doc: docs/pmos/features/2026-07-08_work-history-interview/02_design.html
labels: [pmos-managerkit, interview-guide, interview-feedback, work-history, topgrading, three-loop]
created: 2026-07-08
updated: 2026-07-08
---

## Context

pmos-managerkit's `/interview-guide` authors interviewer kits for seven round archetypes, but **none is a work-history deep-dive** — the chronological, role-by-role walk through a candidate's real past work that assesses their actual PM skill and reads the trajectory across roles. The closest surface (`behavioral`) is competency-organised STAR anecdotes, not a tenure walk; and "level" is only a free-form `--seniority` knob, no PM ladder — even though the work-history round is where level is proven.

This epic adds a new `work-history` archetype **inside the existing `/interview-guide`** (best-practices mode) + a bundled corpus in `_shared/interview-guidelines/`, registered in `/interview-feedback` so the round can be scored afterward. Route: skill (the epic carries a `design_doc:`, not an epic-level `/spec`).

Design contract: `docs/pmos/features/2026-07-08_work-history-interview/02_design.html`.

### Maintainer decisions captured at define (2026-07-08)

- **D1 — new `work-history` archetype in the existing `/interview-guide`** (not a standalone skill); corpus in `_shared/interview-guidelines/guidelines/work-history/`; registered in both skills' enums.
- **D2 — per-role evidence + trajectory synthesis scoring** (not a flat competency sheet): a role-by-role grid → cross-role trajectory + level-fit judgement → competency scores citing that evidence.
- **D3 — level ladder grounded in Reforge / Ravi-Mehta** (12 competencies, 4 buckets) with per-level scope anchors, operator-overridable, built on top of `--seniority`.
- **D4 — boss-rating (1–10) probe in; TORC soft-pedalled** (reference verification framed matter-of-factly, not as a threat).
- **D5 — per-role & trajectory blocks are additive non-`data-dim` sections** so existing archetypes + the dim-based scorer are byte-unaffected.

### Grill decisions (2026-07-08, `grills/2026-07-08_02-design.html`)

- **D6 — candidate-blind role blocks:** `/interview-guide` can't know a candidate's role count at author time → ship a fixed N≈4 placeholder `role-evidence` blocks + one `trajectory-synthesis` block.
- **D7 — static per-level weight table:** the level ladder is a hardcoded per-level competency→weight table (each row pre-summing to 100); `--seniority` selects a row. The model never computes weights (§H).
- **D8 — real `--level-rubric` override now (not a documented extension point):** operator free-form markdown is *interpreted* into a per-level weight set, then a *deterministic* validator gates sum-to-100 and refuses+re-prompts on failure, falling back to the default ladder. Reconciles the free-form choice with the §H no-model-arithmetic gate.
- **D9 — `level-verdict` is a distinct scorecard input** (below/at/above target) that *feeds* the overall reco but is not computed from it.

## Story split

- **260708-we4** — `/interview-guide` work-history archetype + `scorecard-skeleton` per-role/trajectory extension + level ladder + `--level-rubric`. No deps.
- **260708-s5g** — `/interview-feedback` register archetype + extend `fill-scorecard.mjs` for per-role/trajectory fill + tests. Depends on `260708-we4`.

## Notes

- Preceded by focused research (Topgrading/CIDS, "Who", Lenny Rachitsky, Reforge/Mehta, Ben Kuhn) + a design discussion; the four decisions are locked, not to be re-opened at build.
- Dogfood target: live-generate a guide for a real Staff-PM resume and score a mock transcript. The dogfood resume is external input — **never committed**.
