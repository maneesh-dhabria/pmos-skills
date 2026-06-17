---
schema_version: 1
id: 260617-evo
kind: story
parent: 260617-pbk
title: "/playbook evolution-mode rewrite — default-evolution, marketplace skill-picker, mine-everything, new milestone schema + voice self-check, remove case-study mode"
type: feature
priority: should
route: skill
dependencies: []
plugin: pmos-learnkit
status: done
feature_folder: docs/pmos/features/2026-06-17_playbook-evolution-mode/
plan_doc: docs/pmos/features/2026-06-17_playbook-evolution-mode/stories/260617-evo/03_plan.html
tasks: docs/pmos/features/2026-06-17_playbook-evolution-mode/stories/260617-evo/tasks.yaml
worktree: .claude/worktrees/feat-260617-evo
claimed_by: build:loop-main
driver_holder: build:loop-main
build_branch: feat/260617-evo
build_commit: af22119
labels: [pmos-learnkit, playbook, evolution-mode, new-skill]
created: 2026-06-17
updated: 2026-06-18
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260617-evo -->

## Context

Singleton story of epic `260617-pbk` — the full `/playbook` rewrite from per-problem case-study to
evolution-only. One skill, fully interdependent changes → one vertical slice, scored once against
`skill-eval.md` at build. Design seed (D1–D13, FR-1..FR-11, the evolution schema, the two-source
mining strategy, the voice self-check, the kept-vs-removed inventory):
`docs/pmos/features/2026-06-17_playbook-evolution-mode/02_design.html` (epic `design_doc`).

## Acceptance criteria

1. **Default evolution + target resolution (FR-1/2/3, D2).** Bare `/playbook` in a non-marketplace
   repo runs evolution against the repo with no target prompt. In a skills-marketplace repo
   (detected via `.claude-plugin/marketplace.json` OR `.codex-plugin/marketplace.json` OR
   `plugins/*/skills/*/SKILL.md`) it presents one `AskUserQuestion` listing every installed skill
   plus "The whole repo / a plugin (Recommended)". `--skill <name>` (or NL) pre-selects and skips
   the prompt; an unknown name errors with the available-skill list.
2. **Skill-scoped mining (FR-4, D3).** When `target=skill:<name>`, the milestone spine and session
   window are filtered to feature folders + sessions touching that skill's files only.
3. **Mine everything (FR-5, D4).** `--days`/`--sessions`/`--since` are removed from the
   argument-hint and the body; the full history is mined; the spine derives from committed
   artifacts (changelog + features/*).
4. **Two-source mining doc (FR-8, D5).** `reference/evolution-sources.md` exists, documents the
   docs-vs-sessions split, and is cited by the mining + synthesize phases (no dangling cite).
5. **Scout rewrite (#scout).** `scripts/scout.mjs` builds a milestone spine (changelog + features/*
   inventory) + maps each milestone to its originating session(s); no scoring / boundary_confidence
   / merge_suggestion; the cheap-scout invariant holds (no raw session bodies at scout time). Its
   test is rewritten to assert the spine contract; resolver + session-log-format tests stay green.
6. **Evolution article schema (FR-6, D6).** `article-schema.md` is rewritten: mandatory cold-reader
   "What this is" first; one section per milestone anchored on 1–2 inflection decisions, each with a
   verbatim opening-prompt quote and a "Where the pipeline mattered" callout naming the pmos skill;
   a cross-cutting "How the pipeline shaped the whole arc"; a short understated close.
7. **Voice rules + pre-emit self-check (FR-7, D7).** `article-schema.md §Voice` carries the 4 rules
   (plain title / cold-reader-first / understated / implied lesson) and the synthesize phase runs a
   binary self-check that regenerates on fail.
8. **Screenshot sourcing + hygiene (FR-9, D9).** The screenshot step names committed
   `docs/pmos/features/*/wireframes*.html` (served + Playwright @1280×800) as a preferred source
   before text-degrade, and cleans up the `.playwright-mcp/` cache; capture never hard-fails.
9. **Removal (D11) + kept-intact (D10).** `reference/clustering.md`, the clustering/scoring scout
   logic, the ranked Propose+Pick phases, the per-problem schema sections, the thin-thread gate, and
   the `--days/--sessions/--since` flags are gone; the resolver, anonymizer + `REVIEW-BEFORE-SHARING`
   share gate, tweet-thread emit, substrate render, non-interactive block, `--include-headless`, and
   `--format` are retained and pass their existing tests.
10. **Single output folder (FR-11, D12).** One `…_<repo|skill>-evolution/` folder per run with the
    overwrite/suffix/cancel prompt; tweet-thread.md kept in the layout.
11. **Skill-eval + conventions.** Conforms to `skill-patterns.md §A–§L` and host `CLAUDE.md`
    (canonical path, manifest version-sync, non-interactive inline block byte-identical, every
    AskUserQuestion has a Recommended option or defer-only tag). Passes the `[D]` half of
    `skill-eval.md`. Version bump / changelog / README row / manifest sync are **release
    prerequisites for /complete-dev**, not `/execute` tasks.
