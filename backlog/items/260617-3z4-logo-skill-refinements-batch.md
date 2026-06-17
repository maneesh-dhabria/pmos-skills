---
schema_version: 1
id: 260617-3z4
kind: story
parent: 260617-n7a
title: "/logo refinements batch — rename /logos→/logo + concept/style exploration & approval + clarify gate + mark-type aspect gate + learnings-approval"
type: enhancement
priority: should
route: skill
dependencies: []
plugin: pmos-toolkit
status: done
feature_folder: docs/pmos/features/2026-06-17_logo-skill-refinements/
plan_doc: docs/pmos/features/2026-06-17_logo-skill-refinements/stories/260617-3z4/03_plan.html
tasks: docs/pmos/features/2026-06-17_logo-skill-refinements/stories/260617-3z4/tasks.yaml
worktree: .claude/worktrees/feat-260617-3z4
build_branch: feat/260617-3z4
build_commit: cd2847f
claimed_by: null
driver_holder: null
labels: [pmos-toolkit, logo, exploration, rename]
created: 2026-06-17
updated: 2026-06-18
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260617-3z4 -->
<!-- BUILT (Loop 2) 2026-06-18 on feat/260617-3z4 @ cd2847f. All 7 ACs green.
     T1 rename /logos→/logo (git mv; name: logo; logo.html / <slug>.logo.json / logo-cache /
     pmos:skill content="logo"; README rows + sibling /logo run.mjs citation swept; only
     changelog/backlog history retains /logos). T2 svg-metrics --mark-type: lockup
     (combination/emblem/wordmark) [0.8,4.0], square types [0.8,1.25], absent=back-compat,
     unknown→exit 64, hard-fail id stays viewbox-not-square; TDD-first, +6 cases. T3 new
     integer Phase 3 {#explore}: deterministic thin-brief clarify gate (consolidated
     AskUserQuestion, each Q a Recommended) + 2–3 distinct concept directions + candidate
     styles approved on two separate axes (idea, then look; --theme pre-selects, never skips);
     generate/evaluate/deliver/learnings renumbered Phases 4–7, slugs preserved; learnings
     inlines surface-bullets/y-n-edit-approval/never-silent-write; desc/Track-Progress/
     Platform-Adaptation/Anti-patterns updated. No bump/changelog (D8 — /complete-dev's).
     Gates: selftest 52/52, 4 lints + audit-recommended + skill-eval [D] exit 0,
     comments-coverage PASS, live mark-type gate verified (lockup passes wide, favicon/default
     fire, bogus exit 64). Worktree KEPT for Loop-3. Completes epic 260617-n7a (singleton)
     → /complete-dev --epic 260617-n7a. -->

## Context

The whole epic (260617-n7a) is one story: the rename and the new exploration phase both rewrite the one skill's
`SKILL.md`, the aspect-gate fix edits its `scripts/svg-metrics.mjs` + tests, and everything ships as one `/logo`
release. Decisions (D1–D8), FRs (FR1–FR7), and invariants (Inv-1..Inv-7) are in the `design_doc:` (../../02_design.html).
One `/execute` run. **Do the rename first** so the new-phase + gate edits land on the renamed paths.

## Acceptance Criteria

- **AC1 (FR1, rename):** skill is `plugins/pmos-toolkit/skills/logo/` (via `git mv`), `name: logo`; output `logo.html` + `<slug>.logo.json`; cache `~/.pmos/logo-cache/`; default out `{docs_path}/logo/<run-slug>/`; `<meta name="pmos:skill" content="logo">`; learnings header `## /logo`; live `/logos`/`skills/logos` refs swept (root README, pmos-toolkit README skill row, sibling-skill citations); no `/logos` alias; a repo grep for live `/logos\b`/`skills/logos`/`logos-cache`/`content="logos"` returns only intentional-historical hits. (FR1.1–FR1.6, Inv-4)
- **AC2 (FR2, clarify):** a deterministic thin-brief check fires ONE consolidated `AskUserQuestion` (usage context, color/vibe + hard constraints, must-work-in-one-color) when the brief lacks usage AND color/vibe signal; rich briefs skip (logged); `--non-interactive` defers to the OQ buffer and proceeds on best-fit. Answers thread into the style-profile. (FR2.1–FR2.4)
- **AC3 (FR3/FR4, two-axis exploration):** a new phase (between decompose and generate) researches the subject + `--ref` signals + clarify answers and proposes 2–3 distinct **concept** directions (idea/metaphor/symbolism + conventional colors) AND 2–3 candidate **styles** (from the 6 bundled themes, serving the leading concept, each stating its color ceiling and flagging when the concept's palette exceeds it). Concept and style are approved on **two separate axes**; `--theme` overrides as the pre-selected style without skipping approval; `--non-interactive` AUTO-PICKs best-fit + records alternatives to the sidecar/OQ. Concepts are genuinely distinct ideas, not recolors. (FR3.1–FR3.4, FR4.1–FR4.4, D2/D3/D7)
- **AC4 (FR5, generation consumes direction):** the generation phase authors variants *within* the approved concept × style (diverging on structure, not re-deciding the idea) and passes each need's mark type to the evaluator. (FR5.1–FR5.2)
- **AC5 (FR6, aspect gate):** `svg-metrics.mjs --mark-type <type>` gives lockup types (combination/emblem/wordmark) `[0.8,4.0]` and square types `[0.8,1.25]`; absent flag = back-compat `[0.8,1.25]`; unknown value exits 64 with the valid list; the icon-only variant of a lockup is gated as a square icon; `eval/code-metrics.md` documents the bound table; hard-fail id stays `viewbox-not-square`. New `svg-metrics.test.mjs` cases (lockup-passes, icon-fails-wide, default-unchanged) added TDD-first; `node tests/run.mjs` green. (FR6.1–FR6.5, Inv-3/Inv-5)
- **AC6 (FR7, learnings approval):** the learnings phase text inlines the surface-bullets / get-y-n-edit-approval / never-silent-write rule (still citing the shared file for format); `--non-interactive` records bullets to the OQ buffer, no auto-write. (FR7.1–FR7.2)
- **AC7 (conformance):** phase renumber keeps stable `{#slug}` anchors; `SKILL.md` Track-Progress, Platform-Adaptation, Anti-patterns, argument-hint, and description updated for the new gates; conforms to `skill-patterns.md §A–§L` + host `CLAUDE.md`; the 4 hygiene lints (lint-non-interactive-inline, audit-recommended, lint-flags-vs-hints, lint-phase-refs) + `skill-eval-check.sh --target claude-code skills/logo` + selftest all green; non-interactive inline block byte-identical (Inv-6/Inv-7). No version-bump/changelog/README-version/manifest tasks (D8 — `/complete-dev`'s).
