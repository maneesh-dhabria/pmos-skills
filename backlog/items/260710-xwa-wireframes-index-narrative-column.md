---
schema_version: 1
id: 260710-xwa
title: "/wireframes — fold a narrative story column into index.html: per screen, the wireframe beside its ingested source screenshot and the numbered annotation list read from the screen manifest"
type: feature
kind: story
status: planned
route: skill
priority: could
labels: [pmos-toolkit, wireframes, skill]
created: 2026-07-10
updated: 2026-07-10
parent: 260710-grd
feature_folder: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/
design_doc: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/02_design.html
plan_doc: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/stories/260710-xwa/03_plan.html
tasks_file: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/stories/260710-xwa/tasks.yaml
dependencies: [260710-rgb]
---

## Context

The reference skill ships `assets/site-template.html` — a *review document* that lays each screen out as
`wireframe | reference screenshot | annotations + "Why this changes"`. We have the raw material and waste it: the
skill ingests screenshots into `assets/source-screens/` via `--screenshots` and then never displays them beside the
output. `index.html` is a launcher; `canvas.html` is a spatial board. Neither tells the story of what changed and
why.

Maintainer decision (amendment A7): **fold the story column into the existing `index.html`** rather than adding a
third surface to keep in sync with every future emit change.

Depends on 260710-rgb: the annotation list is read from that story's `pmos-wireframe-meta` manifest rather than
re-derived, so the narrative and the artifact cannot drift (§K).

Coherence contract: `02_design.html` — §9 Q1; amendment A7.

## Change surface

- `plugins/pmos-toolkit/skills/wireframes/SKILL.md` (`#index-serve`, `SKILL.md:254`)

**There is no index template file to edit.** Plan-time recon confirmed `reference/` holds no index template;
`#index-serve` describes `index.html` inline in the phase prose ("a navigation-only surface: a card grid linking
every `(component × device)` file…"). The narrative layout is authored fresh there. (The reference skill's
`assets/site-template.html` is *its* artifact, not one we ever vendored.)

## Acceptance Criteria

- [ ] `index.html` gains a per-screen narrative row: the wireframe, its ingested source screenshot from
  `assets/source-screens/` when one exists, and the numbered annotation list.
- [ ] The annotation list is **read from the screen's `pmos-wireframe-meta` manifest**, not re-derived or
  hand-authored — one fact, one home (§K).
- [ ] A screen with no ingested screenshot renders cleanly with the column absent — not with a broken image, an
  empty box, or a placeholder implying one was expected. Screenshot ingestion is optional and stays optional.
- [ ] `index.html` remains a working launcher: the existing links to each per-screen file and to `canvas.html` are
  preserved. The narrative is additive.
- [ ] The page is readable from `file://` with no server. Note that `index.html` retains its Tailwind CDN load —
  this story does not de-Tailwind it, and no prose claims otherwise (amendment A5).
- [ ] Comments instrumentation on `index.html` is unaffected; `check-comments-coverage.sh` passes.
- [ ] Conforms to `skill-patterns.md §A–§L` + repo `CLAUDE.md`; `skill-eval.md` and all four hygiene lints stay
  green; the frozen non-interactive block stays byte-identical.
