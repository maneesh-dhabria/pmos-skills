---
schema_version: 1
id: 260624-ajy
kind: epic
title: "/landing-page — guided product landing-page generator (context ingestion → approved section structure → 2-3 hero-fold explorations → visual-style selector → single-file HTML draft)"
type: feature
status: defined
priority: should
labels: [pmos-toolkit, landing-page, html-artifact, marketing, new-skill]
route: skill
created: 2026-06-24
updated: 2026-06-24
defined: 2026-06-24
source:
feature_folder: docs/pmos/features/2026-06-24_landing-page/
design_doc: docs/pmos/features/2026-06-24_landing-page/02_design.html
parent:
dependencies: []
---

## Context

A new pmos-toolkit skill, **`/landing-page`**, that turns a product (a code repo — local or
GitHub — a doc, or a free-form description) into a high-converting single-file HTML landing page
through a guided, opinionated workflow. Grounded in established landing-page craft (Julian Shapiro's
guide, growth.design conversion psychology, modern SaaS reference pages) rather than generic AI
layout.

The workflow the maintainer envisions:

1. **Ingest context** — the user points the skill at a repo / doc / description; the skill extracts
   what the product is, who it's for, and its value proposition.
2. **Propose section structure first** — the skill proposes an ordered section taxonomy and seeks
   approval before drafting.
3. **Explore the hero fold (2-3 options)** — getting the hero right is the highest-leverage decision;
   the skill explores distinct hero treatments and asks the user to pick / refine.
4. **Visual-style selector** — the skill offers a small set of nameable visual styles (with sample
   previews) and asks the user to choose the output aesthetic before drafting.
5. **Draft** — emit a single self-contained HTML file to
   `{docs_path}/landing-page/<date>-<title>.html`.

## Decisions (define run 2026-06-24 — §9 of the design doc)

- **D1** — visual-style selector = **bundled offline swatch gallery + reusable theme tokens** (not full
  sample pages, not description-only).
- **D2** — hero-fold exploration = **2–3 actually-rendered mini-previews** (not text-only).
- **D3** — output tech = **self-contained inline CSS + vanilla JS**, no CDN (truly portable single file).
- **D4** — section-structure step = **always propose + approve** before drafting.
- **D8** — **per-page folder + persisted, cited `brief.md`** (not a flat HTML file).
- **D9** — Phase-1 web research = **opt-in, default off**.
- **D10** — Phase-6 **visual self-check** (render + screenshot + reviewer ≤2-loop, text fallback).

## Stories

- **260624-dqg** — bundled style system + reference substrate (6 theme-token sets + offline
  `style-gallery.html` + section-scaffolds/hero-archetypes/copy-gates references + selftest; no `SKILL.md`).
  Independently shippable. `route: skill`, no deps.
- **260624-pe2** — the `/landing-page` SKILL.md (six-phase guided workflow + per-page-folder output + opt-in
  web research + visual self-check + non-interactive contract + skill-eval). Depends on `260624-dqg`.

Both `route: skill`, single plugin (pmos-toolkit). File-disjoint vertical split so neither conflicts on
`SKILL.md`; D9 claim-time dep-merge makes the substrate present in B's worktree before its `skill-eval`.
