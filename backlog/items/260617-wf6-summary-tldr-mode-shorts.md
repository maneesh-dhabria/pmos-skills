---
schema_version: 1
id: 260617-wf6
kind: story
parent: 260617-jy8
title: "/summary-tldr --mode shorts — self-contained swipeable ≤140-char card carousel + relevant-media pairing"
type: feature
priority: should
route: skill
dependencies: [260617-xn4]
plugin: pmos-toolkit
status: released
feature_folder: docs/pmos/features/2026-06-17_summary-tldr-modes/
plan_doc: docs/pmos/features/2026-06-17_summary-tldr-modes/stories/260617-wf6/03_plan.html
tasks: docs/pmos/features/2026-06-17_summary-tldr-modes/stories/260617-wf6/tasks.yaml
worktree:
claimed_by:
driver_holder: build:loop-main
labels: [pmos-toolkit, summary-tldr, modes, shorts, carousel]
created: 2026-06-17
updated: 2026-06-18
released: v2.87.0
---

<!-- status: planned at define (Loop 1); tasks.yaml authored, route:skill. Build via /skill-sdlc build --story 260617-wf6 -->
<!-- status: done at build (Loop 2, 2026-06-18) on feat/260617-wf6 (a9fb459). All 6 ACs met: shorts.js
     derive(≤140 exit4 / ≥2-floor exit3)+pairMedia+emit; card-carousel-guidelines.md (no app named); mode.js
     shorts→implemented; SKILL.md #shorts-mode; tests 45/45 + shorts.js 30-check selftest. skill-eval [D] EXIT 0,
     4 lints + comments-coverage PASS. Live Playwright dogfood (real source w/ figures): 5 cards, ←/→ + counter +
     boundaries, source-figure + this-run-mindmap pairing, unrelated decoy rejected, 0 console errors. Caught+fixed
     a render-token gotcha (template leading doc-comment leak via {{inline_comments_json}} `-->`; stripLeadingDocComment
     + 2 guards). Worktree KEPT for Loop-3. EPIC jy8 now fully built (1aq+xn4+gfx+wf6) → /complete-dev --epic 260617-jy8. -->

## Context

Leaf story of epic `260617-jy8` — implements `--mode shorts`: a swipeable carousel of bite-size (≤140-char)
cards, one key takeaway per card, each pairing **relevant existing media** when one is available (a source figure,
the generated mindmap SVG, or the video), else text-only. Depends on `260617-xn4` (the mode-dispatch scaffold).
NO per-card video generation (D7/D8). Cards derive from the grounded keyfact extraction (D3), not the compressed
prose. Emitted as a self-contained sibling artifact. The canonical grounded text summary still emits first (D2).
Design seed: `docs/pmos/features/2026-06-17_summary-tldr-modes/02_design.html` (`#frs-shorts`, `#decisions` D7/D8/D11/D12).

> Author guidance: study the bite-size-news card-carousel experience and derive house guidelines for it; do NOT
> name any specific app in the skill docs or output (per the maintainer).

## Acceptance criteria

1. **Cards from keyfacts (FR-D1, D3/D7/D12).** Shorts mode derives `≤140`-char cards (one key takeaway each, BLUF,
   front-loaded) from the grounded keyfact extraction — not the compressed prose. A ≥2-card floor applies; below it,
   degrade per AC4. The 140-char limit is enforced deterministically (truncation is a fail, not silent).
2. **Self-contained sibling carousel (FR-D2, D7).** Emits `<slug>-shorts.html` — a standalone, **zero-dep, offline**
   (no CDN) interactive carousel: swipe (pointer/touch) + keyboard nav (←/→), card counter, accessible. It is
   compatible with the inline-comments overlay substrate (assets copied alongside; `<meta name="pmos:skill"
   content="summary-tldr">`). Linked from the canonical summary artifact + the `/summary-tldr` library index.
3. **Relevant-media pairing (FR-D3, D8).** Each card pairs relevant existing media when available — reusing
   `/explainer-video`'s `ingest.mjs` figure inventory of the source, plus any mindmap SVG / video produced this
   run — matched by relevance (keyfact ↔ figure alt/caption/proximity). A card with no relevant media is full
   text. Media is never fabricated; broken/again-fetched media is never embedded.
4. **Graceful degradation (FR-D4, D11/D12).** <2 derivable cards, or a media-extraction failure → a clear note;
   the canonical text summary still ships; the carousel either ships text-only or is skipped with a logged reason.
5. **Tests + regression.** Card-derivation (≤140 enforcement, ≥2 floor), carousel-emit, and media-pairing tests
   pass; existing `/summary-tldr` tests stay green; a live dogfood opens `<slug>-shorts.html` in a browser and
   confirms swipe/keyboard nav + at least one media-paired card on a real source with figures.
6. **Skill-eval + conventions.** Conforms to `skill-patterns.md §A–§L` + host `CLAUDE.md` (canonical path,
   non-interactive inline block byte-identical, every `AskUserQuestion` has a Recommended option or defer-only
   tag). Passes the `[D]` half of `skill-eval.md`. Version bump / changelog / README row / manifest sync are
   **release prerequisites for /complete-dev**, not `/execute` tasks.
