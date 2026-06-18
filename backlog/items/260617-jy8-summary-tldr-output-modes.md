---
schema_version: 1
id: 260617-jy8
kind: epic
title: "/summary-tldr output modes (narrative/mindmap/video/shorts) + /diagram mindmap auto-layout capability"
type: feature
status: released
priority: should
labels: [pmos-toolkit, summary-tldr, diagram, modes]
route: skill
created: 2026-06-17
updated: 2026-06-18
defined: 2026-06-17
source: docs/pmos/features/2026-06-17_summary-tldr-modes/02_design.html
feature_folder: docs/pmos/features/2026-06-17_summary-tldr-modes/
design_doc: docs/pmos/features/2026-06-17_summary-tldr-modes/02_design.html
parent:
dependencies: []
released: v2.87.0
---

## Context

`/summary-tldr` today emits only a grounded TEXT TL;DR (with a `--style` sub-style + an optional `/diagram`
add-on). The maintainer wants a new **output-mode dimension** — `--mode narrative|mindmap|video|shorts` (also an
interactive picker) — so the same grounded source can be rendered as a mindmap tree, an explainer video, or a
swipeable card carousel, **in addition** to the canonical text.

A define-time read-only spike found `/diagram` **cannot produce a good mindmap today**: no auto-layout engine
(every node is hand-placed), hard-fails above 30 nodes, and `--approach` forces a *framing*, not a *layout*. So
the mindmap mode needs a **new `/diagram` capability** — making this a **two-skill epic** (both in pmos-toolkit).

Key decisions (full set D1–D12 + invariants INV1–INV6 in the `design_doc`):
- The grounded **text summary is always emitted first** as the canonical, crash-safe artifact, in every mode (D2).
- Non-narrative renderings derive from the **grounded this-run extraction of the original doc**, not the lossy
  compressed prose; **video re-ingests the original source** via `/explainer-video` (D3).
- Mindmap **delegates to a new `/diagram --mode mindmap`** backed by a **vendored, zero-dependency** tidy-tree /
  radial layout — **no npm, no npx, no network, no browser** (D5; npx rejected — d3-hierarchy has no CLI bin and
  `npx -p` fetches over the network, breaking the offline+deterministic posture; mermaid rejected — puppeteer +
  theme clash).
- **Shorts** = a self-contained sibling carousel of ≤140-char cards, each pairing **relevant existing media**
  (figure inventory / the generated mindmap / video) when available, else text-only — **no per-card video gen** (D7/D8).
- **Video** delegates to `/explainer-video` on the original source; length maps from `--compression` (D9).
- **Single mode per run** (v1); graceful degradation keeps the canonical text shipping when a mode's deps/inputs
  are missing (D10/D11/D12).

**Out of scope:** multi-mode-per-run, per-card video generation, cloud/browser-render deps, re-hosting the video,
cross-document synthesis.

## Story split

Four vertical slices on two skills in one plugin (`pmos-toolkit`), a clean DAG: a foundational `/diagram`
mindmap capability (`1aq`), the `/summary-tldr` mode-dispatch scaffold + narrative back-compat + mindmap mode
(`xn4`, deps `1aq`), then two independent leaf modes — video (`gfx`) and shorts (`wf6`), each depending only on
the scaffold (`xn4`). Each story is independently shippable and scored once against `skill-eval.md`.

## Stories
- 260617-1aq — /diagram --mode mindmap (vendored zero-dep auto-layout → themed SVG) (route: skill) — ready
- 260617-xn4 — /summary-tldr --mode scaffold + narrative refactor + mindmap mode (route: skill, deps 260617-1aq) — ready
- 260617-gfx — /summary-tldr --mode video (delegate to /explainer-video on the original source) (route: skill, deps 260617-xn4) — ready
- 260617-wf6 — /summary-tldr --mode shorts (self-contained card carousel + relevant-media pairing) (route: skill, deps 260617-xn4) — ready
