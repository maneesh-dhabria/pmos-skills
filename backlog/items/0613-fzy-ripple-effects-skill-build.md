---
schema_version: 1
id: 0613-fzy
kind: story
parent: 0613-dnv
title: Author the /ripple-effects skill end-to-end — proposal → Futures-Wheel effect simulation → scored consequence tree → grill loop → report
type: feature
priority: should
status: done
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-13_ripple-effects-skill/
plan_doc: docs/pmos/features/2026-06-13_ripple-effects-skill/stories/0613-fzy/03_plan.html
tasks: docs/pmos/features/2026-06-13_ripple-effects-skill/stories/0613-fzy/tasks.yaml
worktree: ../agent-skills-0613-fzy
claimed_by:
driver_holder:
labels: [pmos-toolkit, ripple-effects, grill-family]
created: 2026-06-13
updated: 2026-06-13
released:
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 0613-fzy -->


## Context

The single build story for epic `0613-dnv`. Authors the new pmos-toolkit `/ripple-effects` skill against the design contract `docs/pmos/features/2026-06-13_ripple-effects-skill/02_design.html` and the standing skill-authoring criteria (`feature-sdlc/reference/skill-patterns.md §A–§L`, repo `CLAUDE.md` conventions). One `/execute` run = one PR.

**Leanness is a first-class constraint (D6):** the skill body must stay as simple and short as `/grill`'s (~184 lines). The design doc holds the rationale; the SKILL.md describes the method at a high level and relies on model intelligence to simulate — no transcribed algorithm, scoring formula, or enumerated procedure.

## Acceptance Criteria

(Inherited verbatim from epic `0613-dnv` — they are the change-set for this story.)

- [x] AC1 — A registered, eval-passing `/ripple-effects` skill exists at `plugins/pmos-toolkit/skills/ripple-effects/SKILL.md` (passes `skill-eval.md`, floor 43/47; frontmatter `name: ripple-effects` matches dir; argument-hint flags all handled in the body).
- [x] AC2 — **Intake** accepts a file path, a pipeline-doc stem (resolved via `_shared/resolve-input.md`), or inline text/URL (ask-for-paste fallback); summarizes the proposal in 3–5 bullets and confirms the read before simulating.
- [x] AC3 — **Simulation** (Futures Wheel + "and then what?"): first-order effects across the adapted-STEEP product lens set (Users, Business, Team/Org, Technical, Market, Ethics/Risk), recursively expanded to second- and third-order, capped by `--orders` (default 3) with breadth by `--depth` (brief/standard/deep, same semantics as `/grill`); convergent chains merged. Described at a high level — model-driven, not a prescribed algorithm (D6).
- [x] AC4 — **Scoring**: every notable effect tagged likelihood (H/M/L) × impact (H/M/L) × desirability (good/bad/mixed); interrogation ordered by leverage (high-impact + uncertain/negative first) but surfaces every notable effect, not a filtered top-N (D1). Qualitative tags only — no arithmetic.
- [x] AC5 — **Consequence map** presented (chat + saved report) BEFORE interrogation, as a scored nested 1st→2nd→3rd-order tree.
- [x] AC6 — **Grill loop**: one `AskUserQuestion` per notable effect (leverage-ordered), each tying the ripple to a refinement (mitigate / accept / design-around / invalidate) with a recommended answer + alternatives + Elaborate + Skip; branches on the answer (mitigation can spawn a new chain; a surprise can insert a missed effect); code-answerable questions resolved by grep/read, not asked; deep mode has no question budget (same stop rules as `/grill`).
- [x] AC7 — **Report** (optional save, `--save`/`--no-save` + `output_format`): single self-contained HTML — scored consequence tree + interrogation transcript + refinements/residual-risks — via `_shared/html-authoring/` (inline-comments overlay, `pmos:skill` meta, asset prefix, cache-bust, kebab heading ids, sections.json, index regen). **Tree-only, no SVG diagram** (D2).
- [x] AC8 — **Standalone sibling** (D3): own interrogation loop citing `/grill` as prior art; NO `_shared/` substrate extraction; no `/grill` edits.
- [x] AC9 — **Conventions**: `--non-interactive` per the W14 contract (canonical inline block byte-identical; per-consequence questions `defer-only`); §H–§L satisfied; §L dispatch documented (inline default + optional code-explore helper); `--depth`/`--orders`/`--save`/`--format`/`--non-interactive` in argument-hint and handled.
- [x] AC10 — **Lean body** (D6): SKILL.md comparable in length/simplicity to `/grill`'s (~184 lines); high-level method description relying on model intelligence, not a transcribed step-by-step recipe/formula. Over-specification fails this AC.
- [x] AC11 — Release prerequisites (version bump, changelog row, README/manifest sync, learnings header) listed under the spec's `## Release prerequisites` only, NOT as `/execute` wave tasks (skill-mode scope rule).

## Notes

Plan + `tasks.yaml` authored at define time (this loop). Build happened in Loop 2 via `/feature-sdlc build --next --non-interactive` (under the `/loop` cron).

## Build verification (Loop-2, 2026-06-13)

**Verdict: PASS → story `done`.** Implementation on branch `feat/0613-fzy` (worktree `../agent-skills-0613-fzy`, HEAD `d327a4b`); merges to main only at Loop-3 release. Single file, 163 lines — `plugins/pmos-toolkit/skills/ripple-effects/SKILL.md`. No bundled scripts, no `reference/` dir, no `_shared/` extraction, no `/grill` edits (AC8 — branch diff touches only the new SKILL.md). Auto-registers via the `./skills/` manifest glob.

**Gates:** skill-eval `[D]` 18/18 (exit 0) + `[J]` 19/19 gated applicable (37/37 total applicable; floor 33 — N/A: `c-progressive-disclosure`, `c-body-size-judge`, `e-deps-documented`, `e-script-selftest`, no scripts/reference). One remediation iteration (iteration 1): `j-phase-slug-anchors` (bare "Phase 5" prose ref → slug-cited `Phase 5 {#report}` + cross-skill `grill/SKILL.md#grill-loop`) and `l-dispatch-model-tier` (optional code-explore helper given a `sonnet`/inherit tier in Platform Adaptation + Phase 4 §L note) — both re-scored to pass, zero accepted residuals. 4 hygiene lints green (flags-vs-hints, phase-refs, non-interactive-inline, audit-recommended — 3 defer-only calls, 0 unmarked). NI block byte-identical to `/grill`.

**ACs verified:** AC1 registered + eval-passing, name==dir, all argument-hint flags handled (lint-flags-vs-hints). AC2–AC6 method present (intake confirm-before-simulate; Futures-Wheel sim across the 6-lens adapted-STEEP set with `--orders`/`--depth` dials; qualitative H/M/L × desirability scoring, no arithmetic; consequence map before grill; one-question-per-effect leverage-ordered grill loop). AC7 report via `_shared/html-authoring` cited, tree-only no SVG (D2). AC8 standalone (diff-verified). AC9 W14 + §H–§L conformance. AC10 lean (163 lines ≈ /grill's 184; high-level method, no transcribed algorithm). AC11 zero release-prereq tasks leaked (`g-release-prereqs-scope` `[J]` pass; build diff touches no `plugin.json`/README/changelog). No renderer/browser evidence required — D2 tree-only, zero bundled scripts.

**Ships at Loop-3** `/complete-dev --epic 0613-dnv` (separate user-initiated release — the build loop never ships; this write-back only marks the story done).
