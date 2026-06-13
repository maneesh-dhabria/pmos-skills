---
schema_version: 1
id: 0613-kr0
kind: epic
title: /logos — propose & generate on-brand SVG logo candidates from a brief (text / URL / existing assets)
type: feature
priority: should
status: released
route: skill
feature_folder: docs/pmos/features/2026-06-13_logos-skill/
requirements_doc:
spec_doc:
design_doc: docs/pmos/features/2026-06-13_logos-skill/02_design.html
labels: [pmos-toolkit, logos, svg, brand, generation]
created: 2026-06-13
updated: 2026-06-13
released: pmos-toolkit/v2.72.0
---

## Context

A new pmos-toolkit skill. Given an initial brief — free text, a web URL, and/or existing logo/image assets — `/logos` **decomposes the brief into a set of distinct logo needs** (e.g. a brand mark, a feature icon, a few nav/toolbar glyphs), then for **each need proposes 2–3 concept variants and authors each as an actual `.svg` file**, and showcases everything in a single self-contained `logos.html`.

It is a **generation** skill in the same SVG-authoring family as `/diagram` (pmos-toolkit): the LLM authors clean vector markup directly in-session ($0, no paid image-gen API), and a hybrid evaluator (deterministic SVG code-metrics + a renderer-backed vision check) gates every candidate. It inherits `/diagram`'s renderer hard-gate (Playwright → rsvg-convert → cairosvg) so it can rasterize for the favicon-legibility and monochrome-still-reads checks that logos specifically demand.

Singleton epic (D18) wrapping one build story — a single brand-new skill. Route: skill.

Design contract: `docs/pmos/features/2026-06-13_logos-skill/02_design.html`.

### Maintainer decisions captured at define (2026-06-13)

- **3D / "Airbnb-style":** *dimensional-flat via SVG* — approximate depth with gradients + `feGaussianBlur` soft-shadow filters; **always also emit a flat + monochrome fallback**. True photoreal 3D is raster and out of SVG scope; the skill is honest about this.
- **Eval posture:** *require a renderer (like /diagram)* — hard-gate on Playwright/rsvg-convert/cairosvg so candidates can be rasterized for the favicon-16px legibility check, the monochrome-must-read check, and a brief-fit vision rating. Half the value of a logo eval lives in the raster.
- **Reference inputs:** *all four supported* — (1) web URL (Playwright screenshot + scrape declared CSS colors / `theme-color` → palette + type-feel), (2) local logo/image file (parse SVG if vector; k-means palette if raster), (3) existing SVG logos as a style seed (read corner radii / stroke weight / geometry straight from path commands), (4) plain-text brief / mood adjectives only (no asset). Extracted attributes are bundled into a **style-profile** every candidate is conditioned on and checked against.
- **Mark types:** *all seven types* (wordmark, lettermark, pictorial, abstract, mascot, combination, emblem), with mascot + detailed-pictorial **best-effort** (accept cruder output). Wordmarks use system-font `<text>` + geometric letterforms (faithful licensed-font outlining is not reproducible). Combination/emblem/wordmark marks must also emit an **icon-only variant**.
- **Bundled themes:** ship a starter set of style themes — flat-minimal (default), line/outline (single stroke weight), geometric/monogram, gradient/duotone, badge/emblem, dimensional-flat (filter-based soft depth) — each as a reusable theme the user can pick or let the skill choose per need.

## Acceptance Criteria

- [ ] A registered, eval-passing pmos-toolkit skill `/logos` exists at `plugins/pmos-toolkit/skills/logos/SKILL.md` (passes `skill-eval.md`, floor 43/47).
- [ ] Given a brief (text and/or URL and/or asset file path(s)), the skill **decomposes it into N named logo needs** with rationale, and surfaces them for confirmation (interactive) / auto-proceeds with the decomposition recorded (non-interactive).
- [ ] When a reference asset/URL is provided, the skill **extracts a style-profile** (palette hex[], corner-style, stroke-ratio, type-feel, mood adjectives) and conditions + checks every candidate against it. With no asset, it derives the profile from the text brief.
- [ ] For **each logo need**, the skill generates **2–3 concept variants**, each written as a standalone, self-contained `.svg` file (valid XML, single root `<svg>` with `viewBox`, no raster embeds, no `<script>`, namespaced gradient/clip ids).
- [ ] Each candidate is scored by a **hybrid evaluator**: deterministic SVG code-metrics as hard gates (no raster embed, ≤N colors, min effective stroke width, square-ish icon viewBox, path-budget) **plus** a renderer-backed vision check (favicon-16px legibility, monochrome-still-reads, brief-fit). Renderer absent → **REFUSE TO RUN** with an install hint (like /diagram).
- [ ] Combination/emblem/wordmark marks additionally emit an **icon-only variant**; every non-flat-theme candidate additionally emits a **flat monochrome fallback**.
- [ ] A single self-contained **`logos.html`** showcases every need × every variant with the SVG embedded inline, on light + dark backgrounds, at full + favicon size, with per-file download links — authored through the `_shared/html-authoring/` substrate (inline comments overlay, `pmos:skill` meta).
- [ ] The skill bundles the **starter theme set** and lets the user pick a theme per need or auto-select; honors `--non-interactive` (W14 contract) and the repo skill-authoring conventions (canonical path, frontmatter name matches dir, argument-hint flags handled).

## Stories

- `0613-36f` — Author the `/logos` skill end-to-end (singleton build story). route: skill.
