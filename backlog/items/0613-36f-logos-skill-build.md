---
schema_version: 1
id: 0613-36f
kind: story
parent: 0613-kr0
title: Author the /logos skill end-to-end — brief → logo-need decomposition → per-need SVG variants → eval → logos.html
type: feature
priority: should
status: in-progress
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-13_logos-skill/
plan_doc: docs/pmos/features/2026-06-13_logos-skill/stories/0613-36f/03_plan.html
tasks: docs/pmos/features/2026-06-13_logos-skill/stories/0613-36f/tasks.yaml
worktree: ../agent-skills-0613-36f
claimed_by: build:3e313489-a624-4b93-b86e-c56f8eb34df6
driver_holder: build:3e313489-a624-4b93-b86e-c56f8eb34df6
labels: [pmos-toolkit, logos, svg]
created: 2026-06-13
updated: 2026-06-13
released:
---

<!-- status: planned at define (Loop 1); plan_doc + tasks.yaml authored. Build via /feature-sdlc build --story 0613-36f -->


## Context

The single build story for epic `0613-kr0`. Authors the new pmos-toolkit `/logos` skill against the design contract `docs/pmos/features/2026-06-13_logos-skill/02_design.html` and the standing skill-authoring criteria (`feature-sdlc/reference/skill-patterns.md §A–§L`, repo `CLAUDE.md` conventions). One `/execute` run = one PR.

## Acceptance Criteria

(Inherited verbatim from epic `0613-kr0` — they are the change-set for this story.)

- [ ] AC1 — A registered, eval-passing `/logos` skill exists at `plugins/pmos-toolkit/skills/logos/SKILL.md` (passes `skill-eval.md`, floor 43/47; frontmatter `name: logos` matches dir; argument-hint flags all handled in the body).
- [ ] AC2 — Brief intake accepts text and/or web URL and/or local asset path(s); the skill **decomposes the brief into N named logo needs** with rationale and a confirm gate (interactive) / recorded auto-decomposition (non-interactive).
- [ ] AC3 — **Style-profile extraction**: from a URL (Playwright screenshot + scraped CSS colors / `theme-color`), a local image (SVG parse if vector, k-means palette if raster), or an existing SVG seed (corner radii / stroke weight / geometry from path commands); text-only briefs derive the profile from mood adjectives. Every candidate is conditioned on AND checked against the profile.
- [ ] AC4 — Per need, **2–3 concept variants** authored as standalone self-contained `.svg` files: valid XML, single root `<svg viewBox>`, no `<image>`/`data:image` raster embeds, no `<script>`, unique/namespaced gradient+clip ids.
- [ ] AC5 — **Hybrid evaluator** gates each candidate: deterministic SVG code-metrics hard gates (no raster embed; ≤N distinct colors; min effective stroke ≥~1px at 16px render; square-ish icon viewBox; path-data budget) **plus** renderer-backed vision checks (favicon-16px legibility, monochrome-still-reads, brief-fit). Renderer detection (Playwright → rsvg-convert → cairosvg) is a **hard gate** — none present ⇒ REFUSE TO RUN with an install hint. ≤2 refinement loops per candidate.
- [ ] AC6 — **Variant deliverables**: combination/emblem/wordmark marks emit an icon-only variant; every non-flat-theme candidate emits a flat **monochrome fallback**.
- [ ] AC7 — Bundled **starter theme set** (flat-minimal default, line/outline, geometric/monogram, gradient/duotone, badge/emblem, dimensional-flat); theme pickable per need or auto-selected.
- [ ] AC8 — A single self-contained **`logos.html`** embeds every need × variant inline, on light + dark, at full + favicon size, with per-file download links — via `_shared/html-authoring/` (inline-comments overlay, `pmos:skill` meta, asset prefix, cache-bust).
- [ ] AC9 — `--non-interactive` honored per the W14 contract (canonical inline block, AUTO-PICK Recommended, open-questions buffer); repo skill-authoring conventions satisfied (canonical path, manifest version-sync handled by /complete-dev not the plan).
- [ ] AC10 — Release prerequisites (version bump, changelog row, README/manifest sync, learnings header) are listed under the spec's `## Release prerequisites` only, NOT as `/execute` wave tasks (skill-mode scope rule).

## Notes

Plan + `tasks.yaml` authored at define time (this loop). Build happens in Loop 2 via `/feature-sdlc build --story 0613-36f` (or `--next`).
