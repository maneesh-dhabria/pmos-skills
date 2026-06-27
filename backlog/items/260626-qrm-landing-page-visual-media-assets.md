---
schema_version: 1
id: 260626-qrm
kind: story
title: "/landing-page — visual, media & assets"
type: enhancement
priority: should
status: released
route: skill
parent: 260626-7s4
dependencies: [260626-h70]
worktree:
build_branch: feat/260626-qrm
build_commit: c70ebaf2
plan_doc: docs/pmos/features/2026-06-26_landing-page-enhancements/stories/260626-qrm-visual-media-assets/03_plan.html
tasks_file: docs/pmos/features/2026-06-26_landing-page-enhancements/stories/260626-qrm-visual-media-assets/tasks.yaml
claimed_by:
driver_holder:
pr:
labels: [landing-page, pmos-toolkit, skill, visual, media]
created: 2026-06-26
updated: 2026-06-27
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

## Build outcome (Loop 2, 2026-06-27)

BUILT on `feat/260626-qrm` (impl commit `c70ebaf2`, worktree kept). route:skill inner pipeline
(skill-tier-resolve T2 → execute → skill-eval → verify). Story B of epic 260626-7s4 — **COMPLETES the
epic** (2/2). Claim-time merged `feat/260626-h70` (D9) so this builds on top of A's SKILL.md edits, not a
stale base. Procedure-only skill revision — edits the downstream visual/media/asset phases of
`/landing-page`; one fact, one home (rules land in `reference/*`, SKILL.md body cites them).

- **Phase 0 (`#setup`)** — detects media capabilities once (`ffmpeg` via `command -v`; headless browser +
  localhost serve) and caches `media_caps` for Phases 4.5/6 [AC1]; degrade decisions cite
  `media-strategy.md`, not inlined.
- **Phase 1.5 (`#logo`, new)** — detect existing brand mark in researched assets → gate offering a
  no-heavy-op **wordmark (Recommended)** / `/logo` / skip; AUTO-PICKs the wordmark non-interactively (never
  spawns a heavy skill, C4); binds header + favicon in Phase 5 [AC2].
- **Phase 4 (`#style-pick`)** — new `#style-preview` step renders the chosen hero in 2–3 candidate styles
  side-by-side into `working/style-options.html` (live decision surface; gallery stays the reference) [AC3].
- **Phase 4.5 (`#media-strategy`, new)** + **new `reference/media-strategy.md`** — per-moment/page format
  gate (**static device-framed = Recommended**, never blocks on capture); reference carries the format menu,
  capability detection, the **Playwright `recordVideo` → ffmpeg** video pipeline, the degrade ladder
  (no ffmpeg → WebP; no headless → captioned still + logged skip), and embed rules (`data:`/relative, never
  remote). Video is **captured from the real product, never mocked** (C3) [AC4/AC5/AC6].
- **`copy-gates.md` (`#asset-fidelity`, new)** — preserve native aspect ratio (`object-fit`, never
  stretch/skew), device frames, mobile-appropriate crop/alt image; cited from Phase 5 + media-strategy [AC7].
- **`copy-gates.md` `#visual-self-check`** — **mobile is now a HARD pass dimension** (overflow / CTA-below-fold
  / skew-clip block emit within the ≤2-iteration loop); degraded no-headless fallback preserved + logged [AC8].
- **Phase 5/6 (D10)** — Phase 5 reads host `DESIGN.md` if present (canonical `wireframes/...design-md-resolver.md`)
  to bias tokens/spacing; Phase 6 grades against the shared `design-crit/reference/eval.md` (§V/§G/§A)
  checklist rather than re-deriving layout rules (cite, don't restate, C2) [AC9].

Gates: landing-page **selftest 215/0** (extended for media-strategy + asset-fidelity + mobile-hard);
skill-eval `--target claude-code` **[D] 21/21 EXIT0** (zero residuals); 4 hygiene lints + audit-recommended
all PASS (audit: **5 gate calls, all Recommended** — the original 3 + new logo/media gates); every new anchor
(`#logo`, `#media-strategy`, `#style-preview`, `#asset-fidelity`, `#format-menu`, `#degrade-ladder`) resolves;
no orphaned cites; no rule duplicated body-vs-reference (C2). All 11 ACs satisfied [AC10/AC11]. 0 new deps;
no contract flags added (new behavior is gate-driven, argument-hint unchanged).

**Epic 260626-7s4: FULLY BUILT 2/2** (h70 content + qrm visual). → Loop-3 `/complete-dev --epic 260626-7s4`.
