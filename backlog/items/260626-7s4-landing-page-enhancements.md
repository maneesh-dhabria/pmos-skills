---
schema_version: 1
id: 260626-7s4
title: "/landing-page enhancements — show-balance, persona, media, multi-product"
type: enhancement
kind: epic
status: released
released: pmos-toolkit/v2.94.0
route: skill
priority: should
labels: [landing-page, pmos-toolkit, skill, idea]
created: 2026-06-26
updated: 2026-06-27
source: "user feedback from poker-coach landing-page run (2026-06-26)"
design_doc: docs/pmos/features/2026-06-26_landing-page-enhancements/02_design.html
parent:
dependencies: []
---

## Context

Grounded feedback from a real `/landing-page` run (the poker-coach page) exposed structural gaps in the
skill: skewed screenshots, broken mobile layout, an over-reliance on *tell* (signature product moments like
pot-equity feedback, coaching, and opponent-type selection were never *shown*), jargon-heavy copy with no
narrowed persona, a redundant below-hero proof strip, no "who this is for / not for" section, only one
proposed structure, a style preference *asked* rather than *shown*, no logo step, no media-format choice
(static / carousel / video), no handling for multi-product repos, and no pmos attribution footer.

Full design + decisions (D1–D11), feedback→fix map, and constraints: `design_doc` above.

Decisions locked at define time (via AskUserQuestion): **video in scope** (Playwright `recordVideo` +
ffmpeg, graceful degrade); **multi-product in scope now** (organizing-principle detection + per-product
sections); **two-story split, Content → Visual** (Story B depends on A; both edit the same SKILL.md so they
build sequentially).

## Acceptance Criteria

- [ ] do>show>tell elevated to a governing principle; brief captures "signature moments to demonstrate"; Phase 6 show-ratio check (D1)
- [ ] Persona narrowed to 1–2 with jargon calibration; novice persona → undefined domain jargon rejected/defined (D2)
- [ ] New "Who this is for / not for" section row + Phase 2 coherence/dedup pass (no proof/value-prop double-counting) (D3)
- [ ] Phase 2 proposes ≥3 distinct structure variants with a recommended default (D4)
- [ ] Optional logo Phase 1.5: detect → offer `/logo` → bind output incl. footer (D5)
- [ ] Media-strategy gate (Phase 4.5): static device-framed / carousel / video; video via Playwright `recordVideo` + ffmpeg; graceful degrade ladder (D6)
- [ ] Asset fidelity (native aspect ratio, device frames, mobile-appropriate assets); mobile a hard visual-gate dimension (D7)
- [ ] Phase 4 renders a live hero-in-style preview (`working/style-options.html`), not just a static gallery link (D8)
- [ ] Multi-product detection + organizing-principle pick (suite page / product-index / single-focus) + per-product sections (D9)
- [ ] Shared design-authoring substrate adopted: DESIGN.md house-style + shared responsive checklist cited in Phase 5/6 (D10)
- [ ] Attribution footer "Built with pmos-toolkit" + repo link baked into every emitted page (D11)
- [ ] Output stays a single self-contained `file://` HTML; skill passes `skill-patterns.md §A–§L` + `skill-eval.md` (C1, C5)

## Stories

- `260626-h70` — Content, persona & structure (route: skill, no deps)
- `260626-qrm` — Visual, media & assets (route: skill, depends 260626-h70)

## Notes

Next: `/skill-sdlc build --next` (picks 260626-h70 first; 260626-qrm unblocks once h70 is done).
