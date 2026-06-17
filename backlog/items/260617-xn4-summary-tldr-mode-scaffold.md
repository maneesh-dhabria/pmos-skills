---
schema_version: 1
id: 260617-xn4
kind: story
parent: 260617-jy8
title: "/summary-tldr --mode scaffold + narrative refactor (back-compat) + mindmap mode (delegates to /diagram --mode mindmap)"
type: feature
priority: should
route: skill
dependencies: [260617-1aq]
plugin: pmos-toolkit
status: in-progress
feature_folder: docs/pmos/features/2026-06-17_summary-tldr-modes/
plan_doc: docs/pmos/features/2026-06-17_summary-tldr-modes/stories/260617-xn4/03_plan.html
tasks: docs/pmos/features/2026-06-17_summary-tldr-modes/stories/260617-xn4/tasks.yaml
worktree: .claude/worktrees/feat-260617-xn4
claimed_by: build:loop-main
driver_holder: build:loop-main
labels: [pmos-toolkit, summary-tldr, modes, mindmap]
created: 2026-06-17
updated: 2026-06-17
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260617-xn4 -->

## Context

Core story of epic `260617-jy8` — introduces the `--mode` output dimension to `/summary-tldr`, refactors today's
behavior as `mode==narrative` (byte-for-byte back-compat), and wires the first new mode (mindmap) to the
`/diagram --mode mindmap` capability built in story `260617-1aq`. **Depends on `260617-1aq`** — claim-time
transitive merge brings the `/diagram` mindmap capability into this worktree before the mindmap-mode build (epic
`#invariants` INV1). The canonical grounded text summary is always emitted first (D2/INV3). Design seed:
`docs/pmos/features/2026-06-17_summary-tldr-modes/02_design.html` (`#frs-scaffold`, `#decisions` D1/D2/D3/D4/D10/D11).

## Acceptance criteria

1. **Mode parsing + picker (FR-B1, D10).** `--mode narrative|mindmap|video|shorts` parses (default `narrative`);
   interactive with no `--mode` → an `AskUserQuestion` picker with **Narrative (Recommended)**; `--mode` pre-answers
   and skips the prompt; non-interactive AUTO-PICKs narrative; an invalid value → platform-aware error naming the
   set, exit 64. `video`/`shorts` are accepted values but in THIS story route to a "mode not yet available — run a
   later release" graceful note (they ship in `gfx`/`wf6`); mindmap + narrative are fully implemented here.
2. **Narrative back-compat (FR-B2, INV6).** `mode==narrative` reproduces today's output exactly — same artifact,
   same `--style` behavior, same `--diagram` Phase 7 add-on. `--style` applies only in narrative; with a
   non-narrative mode it is recorded as ignored with a one-line warn (D1/INV2). `argument-hint` + Flags section
   updated; `--mode` passes the §I 4-test (typed value changing output) and is listed as a contract flag.
3. **Canonical text first (FR-B3, D2/INV3).** In every mode the grounded text summary is emitted to disk first
   (the existing Phase 6 crash-safe emit) before any mode rendering runs.
4. **Mindmap mode (FR-B4, D3/D4).** Mindmap mode derives a hierarchy from the grounded keyfact extraction (root =
   topic; branches = key arguments; leaves = takeaways/numbers) — NOT from the compressed prose — then the
   **main agent** (never a subagent) hands off to `/diagram --mode mindmap --non-interactive --on-failure drop`,
   **validates** the returned SVG (parses, theme background present, post-insert heading-id smoke green) before
   saving it as a sibling `<slug>-mindmap.svg` and linking it from the canonical doc + the library index. Same
   handoff+validate discipline as the existing Phase 7 diagram.
5. **Graceful degradation (FR-B5, D11/D12).** Too few keyfacts for a useful mindmap → a clear note + the canonical
   text summary still ships; a `/diagram` drop/failure → canonical text intact (no rollback), failure logged.
6. **Tests + regression (FR-B6, INV6).** New mode-dispatch + mindmap tests pass; the shipped `/summary-tldr`
   `tests/` stay green; a live dogfood runs both `--mode narrative` (unchanged) and `--mode mindmap` (produces a
   valid linked mindmap SVG) on a real source.
7. **Skill-eval + conventions.** Conforms to `skill-patterns.md §A–§L` + host `CLAUDE.md` (canonical path,
   non-interactive inline block byte-identical, every `AskUserQuestion` has a Recommended option or defer-only
   tag). Passes the `[D]` half of `skill-eval.md`. Version bump / changelog / README row / manifest sync are
   **release prerequisites for /complete-dev**, not `/execute` tasks.
