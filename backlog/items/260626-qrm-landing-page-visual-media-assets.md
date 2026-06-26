---
schema_version: 1
id: 260626-qrm
kind: story
title: "/landing-page — visual, media & assets"
type: enhancement
priority: should
status: planned
route: skill
parent: 260626-7s4
dependencies: [260626-h70]
worktree:
plan_doc: docs/pmos/features/2026-06-26_landing-page-enhancements/stories/260626-qrm-visual-media-assets/03_plan.html
tasks_file: docs/pmos/features/2026-06-26_landing-page-enhancements/stories/260626-qrm-visual-media-assets/tasks.yaml
claimed_by:
pr:
labels: [landing-page, pmos-toolkit, skill, visual, media]
created: 2026-06-26
updated: 2026-06-26
---

## Context

The visual/media half of epic `260626-7s4`. Depends on `260626-h70` (Content) — both edit the same
`SKILL.md`, so this story merges h70's branch at claim time (D9 claim-time merge) and builds on top, avoiding
a parallel same-file conflict. Touches the downstream visual + media + asset phases of `/landing-page`.

Epic design (cite by anchor, do not restate): `docs/pmos/features/2026-06-26_landing-page-enhancements/02_design.html`
— decisions D5 (logo), D6 (media strategy + video), D7 (asset fidelity + mobile), D8 (live style preview),
D10 (shared design substrate). Constraints C1–C5.

Acceptance criteria are the standing skill contract: conform to `skill-patterns.md §A–§L` and pass `skill-eval.md`.

## Acceptance Criteria

- [ ] Phase 0 detects media capabilities (ffmpeg present? headless browser/Playwright present?) and caches for 4.5/6 (D6)
- [ ] New optional Phase 1.5 logo: detect existing logo in researched assets → offer `/logo` (gated; recommended = simple-wordmark no-heavy-op default) → bind output (SVG/favicon/mono) in Phase 5 + footer (D5)
- [ ] Phase 4 renders a live hero-in-style preview `working/style-options.html` (chosen hero in 2–3 candidate styles), side-by-side; gallery remains the full reference (D8)
- [ ] New Phase 4.5 media-strategy gate: per-moment / page choice of static device-framed image / carousel / video; recommended default = static device-framed (D6)
- [ ] Video path: Playwright `recordVideo` captures a real product flow → ffmpeg trims/compresses/poster → embedded muted-loop `<video>` or animated WebP; degrade ladder: no ffmpeg → GIF/WebP if Playwright; no headless browser → captioned static + logged skip (D6)
- [ ] New `reference/media-strategy.md`: format menu + capability detection + degrade ladder + embed rules (data: URI / page-folder-relative, never remote) (D6, C1)
- [ ] Asset fidelity in Phase 5 + `copy-gates.md`: preserve native aspect ratio, `object-fit` in fixed frames, device frames, mobile-appropriate assets (portrait crop / alt image) — never stretch/skew (D7)
- [ ] Visual self-check: mobile becomes a hard pass dimension (no overflow, CTA visible, no skew/clip); failure blocks emit within the ≤2-iteration fix loop (D7)
- [ ] Phase 5/6 cite the shared design-authoring substrate: read host `DESIGN.md` if present (bias tokens/spacing) + cite the shared responsive checklist used by /wireframes /prototype /design-crit (D10); spec resolves the canonical shared file/section
- [ ] Output stays single self-contained `file://` HTML, media embedded/relative (C1); no rule duplicated (C2); no fabricated demo content — video is captured from the real product (C3); new heavy ops (recording, /logo) non-interactive-safe (C4)
- [ ] Conforms to `skill-patterns.md §A–§L`; passes `skill-eval.md` (C5)

## Notes

`/plan` scoped by (design_doc anchors D5/D6/D7/D8/D10 + these ACs). `tasks.yaml :: spec:` → `../../02_design.html`.
Claim-time: merge `feat/260626-h70` into this worktree before building (D9 transitive-dep merge).
