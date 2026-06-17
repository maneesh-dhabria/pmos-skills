---
schema_version: 1
id: 260617-gfx
kind: story
parent: 260617-jy8
title: "/summary-tldr --mode video — delegate to /explainer-video on the original source; link + provenance"
type: feature
priority: should
route: skill
dependencies: [260617-xn4]
plugin: pmos-toolkit
status: done
feature_folder: docs/pmos/features/2026-06-17_summary-tldr-modes/
plan_doc: docs/pmos/features/2026-06-17_summary-tldr-modes/stories/260617-gfx/03_plan.html
tasks: docs/pmos/features/2026-06-17_summary-tldr-modes/stories/260617-gfx/tasks.yaml
worktree: .claude/worktrees/feat-260617-gfx
claimed_by:
driver_holder: build:loop-main
labels: [pmos-toolkit, summary-tldr, modes, video]
created: 2026-06-17
updated: 2026-06-17
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260617-gfx -->

## Context

Leaf story of epic `260617-jy8` — implements `--mode video`. Depends on `260617-xn4` (the mode-dispatch
scaffold). Video mode hands off to `/explainer-video` on the **original source** (D9 — `/explainer-video` does
its own grounded ingest, satisfying "use the original doc"), then links the produced `.mp4` + provenance into the
canonical summary + library. The canonical grounded text summary still emits first (D2). Design seed:
`docs/pmos/features/2026-06-17_summary-tldr-modes/02_design.html` (`#frs-video`, `#decisions` D9/D11).

## Acceptance criteria

1. **Delegate on the original source (FR-C1, D9).** `--mode video` runs the canonical text emit first, then the
   **main agent** (never a subagent) hands off to `/explainer-video <original-source> --non-interactive`, with the
   video length mapped from `--compression` (tight→quick, standard→standard, detailed→deep) and a `--video-length
   quick|standard|deep` override honored. The source passed is the user's original source, not the compressed
   summary.
2. **Link + provenance, no re-host (FR-C2).** The produced `.mp4` (in `/explainer-video`'s own output dir) is
   linked from the canonical summary artifact and the `/summary-tldr` library index, with provenance (source,
   length, path, timestamp). The video file is not copied/duplicated into the summary-tldr dir.
3. **Graceful dep degradation (FR-C3, D11).** If `/explainer-video`'s deps are missing (no ffmpeg/ffprobe,
   Playwright, or a local TTS engine) or it returns non-zero, `/summary-tldr` reports the precise reason + install
   hint and the canonical text summary still ships (additive mode; never blocks). No fabricated/empty video link.
4. **Tests (FR-C4).** Mode-routing + length-mapping + degradation tests pass; existing `/summary-tldr` tests stay
   green; a dogfood runs `--mode video` end-to-end on a real source on a host with deps (or records
   DEFERRED-TO-RELEASE with the missing binary if deps are absent, per `/explainer-video`'s own smoke contract).
5. **Skill-eval + conventions.** Conforms to `skill-patterns.md §A–§L` + host `CLAUDE.md`. Passes the `[D]` half
   of `skill-eval.md`. Version bump / changelog / README row / manifest sync are **release prerequisites for
   /complete-dev**, not `/execute` tasks.
