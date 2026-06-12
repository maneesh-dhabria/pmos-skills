---
schema_version: 1
id: 0613-36f
kind: story
parent: 0613-kr0
title: Author the /logos skill end-to-end — brief → logo-need decomposition → per-need SVG variants → eval → logos.html
type: feature
priority: should
status: done
route: skill
dependencies: []
feature_folder: docs/pmos/features/2026-06-13_logos-skill/
plan_doc: docs/pmos/features/2026-06-13_logos-skill/stories/0613-36f/03_plan.html
tasks: docs/pmos/features/2026-06-13_logos-skill/stories/0613-36f/tasks.yaml
worktree: ../agent-skills-0613-36f
claimed_by:
driver_holder:
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

- [x] AC1 — A registered, eval-passing `/logos` skill exists at `plugins/pmos-toolkit/skills/logos/SKILL.md` (passes `skill-eval.md`, floor 43/47; frontmatter `name: logos` matches dir; argument-hint flags all handled in the body).
- [x] AC2 — Brief intake accepts text and/or web URL and/or local asset path(s); the skill **decomposes the brief into N named logo needs** with rationale and a confirm gate (interactive) / recorded auto-decomposition (non-interactive).
- [x] AC3 — **Style-profile extraction**: from a URL (Playwright screenshot + scraped CSS colors / `theme-color`), a local image (SVG parse if vector, k-means palette if raster), or an existing SVG seed (corner radii / stroke weight / geometry from path commands); text-only briefs derive the profile from mood adjectives. Every candidate is conditioned on AND checked against the profile.
- [x] AC4 — Per need, **2–3 concept variants** authored as standalone self-contained `.svg` files: valid XML, single root `<svg viewBox>`, no `<image>`/`data:image` raster embeds, no `<script>`, unique/namespaced gradient+clip ids.
- [x] AC5 — **Hybrid evaluator** gates each candidate: deterministic SVG code-metrics hard gates (no raster embed; ≤N distinct colors; min effective stroke ≥~1px at 16px render; square-ish icon viewBox; path-data budget) **plus** renderer-backed vision checks (favicon-16px legibility, monochrome-still-reads, brief-fit). Renderer detection (Playwright → rsvg-convert → cairosvg) is a **hard gate** — none present ⇒ REFUSE TO RUN with an install hint. ≤2 refinement loops per candidate.
- [x] AC6 — **Variant deliverables**: combination/emblem/wordmark marks emit an icon-only variant; every non-flat-theme candidate emits a flat **monochrome fallback**.
- [x] AC7 — Bundled **starter theme set** (flat-minimal default, line/outline, geometric/monogram, gradient/duotone, badge/emblem, dimensional-flat); theme pickable per need or auto-selected.
- [x] AC8 — A single self-contained **`logos.html`** embeds every need × variant inline, on light + dark, at full + favicon size, with per-file download links — via `_shared/html-authoring/` (inline-comments overlay, `pmos:skill` meta, asset prefix, cache-bust).
- [x] AC9 — `--non-interactive` honored per the W14 contract (canonical inline block, AUTO-PICK Recommended, open-questions buffer); repo skill-authoring conventions satisfied (canonical path, manifest version-sync handled by /complete-dev not the plan).
- [x] AC10 — Release prerequisites (version bump, changelog row, README/manifest sync, learnings header) are listed under the spec's `## Release prerequisites` only, NOT as `/execute` wave tasks (skill-mode scope rule).

## Notes

Plan + `tasks.yaml` authored at define time (Loop 1). Build happened in Loop 2 via `/feature-sdlc build --next --non-interactive` (under the `/loop` cron).

## Build verification (Loop-2, 2026-06-13)

**Verdict: PASS → story `done`.** Implementation on branch `feat/0613-36f` (worktree `../agent-skills-0613-36f`, commit `c46b617`); merges to main only at Loop-3 release. 22 files / 1839 LOC: `SKILL.md` (7 integer phases 0–6, renderer hard-gate, hybrid eval), 6 bundled themes + `_schema.json`, `scripts/svg-metrics.mjs` (10 hard-gate metrics) + `scripts/extract-palette.mjs` (zero-dep PNG k-means, graceful degradation), `eval/{code-metrics,rubric}.md`, `tests/` (`run.mjs --selftest`).

**Gates:** skill-eval `[D]` 18/18 (exit 0, zero fails) + `[J]` 23/23 gated + 6/6 advisory (floor 43/47 cleared; the lone `[J]` "fail" on `a-name-verb-or-gerund` was discarded — its quote was <40 chars AND the rubric itself blesses the parallel noun-name `wireframes`/`/diagram`). 4 hygiene lints green (flags-vs-hints, phase-refs, non-interactive-inline, audit-recommended). `tests/run.mjs` selftest 44/44 green.

**ACs verified live (no deferrals — renderer present on host):** AC1 registered + eval-passing; AC4/AC5 deterministic gates exercised against all 6 themes + per-metric fixtures; AC3 palette extractor verified on an in-memory PNG; **AC5 renderer-backed path live** — `rsvg-convert` rasterized a fixture SVG → real 64×64 RGBA PNG (the very path `/explainer-video` had to defer to release); AC8 `render.js` verified — leading-comment-strip gotcha applied, no body doubling, `pmos:skill` meta + inline-comments overlay present, `{{content}}` fully substituted. AC10 honored — zero release-prereq tasks in `tasks.yaml`; `g-release-prereqs-scope` `[J]` pass.

**Ships at Loop-3** `/complete-dev --epic 0613-kr0` (separate user-initiated release — the build loop never ships; this write-back only marks the story done).
