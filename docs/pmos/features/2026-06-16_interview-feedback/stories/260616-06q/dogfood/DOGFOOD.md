# Dogfood — 260616-06q (Bundled PM round guideline starter set)

Story B of epic 260616-9bt. Built 2026-06-17 (Loop-2). Authors the 7 bundled PM round
guideline pairs that `/interview-feedback setup` scaffolds from. Content-only on top of
Story A's locked contract — no SKILL.md or script edits. No candidate content here.

## What shipped

15 files under `reference/guidelines/`, one directory per archetype (ids bound to Story A's
`role.json` enum, SKILL.md:164):

| Archetype | Dimensions (weights sum 100) |
|---|---|
| recruiter-screen | motivation-and-fit 25 · communication-clarity 20 · role-and-domain-understanding 20 · seniority-signal 20 · logistics-alignment 15 |
| product-sense | user-empathy · problem-structuring · product-creativity · prioritization · success-metrics (20 each) |
| analytical | metric-definition 20 · problem-structuring 20 · hypothesis-and-diagnosis 25 · estimation 15 · tradeoff-reasoning 20 |
| technical | system-understanding 25 · technical-tradeoffs 25 · eng-collaboration 20 · feasibility-judgment 15 · data-api-literacy 15 |
| behavioral | leadership-and-influence 25 · conflict-navigation 20 · ownership 20 · stakeholder-management 20 · self-awareness 15 |
| case-study | problem-framing 20 · analytical-depth 25 · structure-and-clarity 20 · recommendation-quality 25 · communication 10 (+ `additional/` doc slot) |
| case-presentation | presentation-structure 20 · executive-communication 25 · handling-pushback 25 · depth-under-scrutiny 20 · message-prioritization 10 (panel) |

Each archetype ships `scorecard.html` (instantiates Story A's canonical §16.1 skeleton) +
`interviewer-reference.html` (purpose, per-area green/red signals, probe ladders, calibration,
common mistakes). `case-study/additional/README.md` documents the per-role additional-doc slot.

## Cross-story integration check (AC5) — load-bearing

For all 7 archetypes, ran Story A's `fill-scorecard.mjs` against the bundled scorecard **unmodified**:

| Check | Result (all 7) |
|---|---|
| `parse` → `anchored:true` with the archetype's dims | ✅ |
| weight sum = 100 | ✅ |
| reference `data-area` ids == scorecard `data-dim` ids (1:1) | ✅ |
| `fill <sc> <values.json>` exit 0, output re-parses `anchored:true` | ✅ |
| score `data-selected` + note injected into `notes:<dim>` + green flag `<li>` appended + reco selected | ✅ |

`RESULT: fail=0` — the Story A `score` path fills every bundled scorecard with zero special-casing.

## Drift found & fixed

`analytical/interviewer-reference.html` originally marked its calibration block with
`data-area="calibration"` — but `data-area` is the per-dimension anchor (= a scored dimension).
That made its area-id set diverge from the scorecard's dim-id set. Fixed to `<section class="calib">`
(matching the other 6, which keep calibration in non-`data-area` sections), restoring the 1:1 map.

## Gate summary (at build)

- skill-eval `[D]` (`--target claude-code`): **EXIT 0** (SKILL.md untouched by this story; all
  applicable checks pass). The `[J]` half scores template quality/consistency.
- `tests/run-tests.sh`: **8/8 PASS** (unchanged — script behavior not touched).
- 4 repo lints: non-interactive-inline (49 skills byte-identical), audit-recommended (0 calls),
  flags-vs-hints, phase-refs — all **PASS**.
- Self-containment: 0 external asset references across all 14 HTML templates (offline-safe).
- Scope: completes epic 260616-9bt's two stories (A=vwn core, B=06q bundled set). Epic NOT
  released this iteration — awaits `/complete-dev --epic` (first managerkit release = v0.1.0 baseline).
