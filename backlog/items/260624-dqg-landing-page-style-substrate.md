---
schema_version: 1
id: 260624-dqg
kind: story
parent: 260624-ajy
title: "Bundled style system + reference substrate — 6 frozen theme-token sets + offline style-gallery.html swatch gallery + section-scaffolds/hero-archetypes/copy-gates reference files + selftest; no SKILL.md"
type: feature
priority: should
route: skill
dependencies: []
plugin: pmos-toolkit
status: done
released: v2.90.0
feature_folder: docs/pmos/features/2026-06-24_landing-page/
plan_doc: docs/pmos/features/2026-06-24_landing-page/stories/260624-dqg/03_plan.md
tasks: docs/pmos/features/2026-06-24_landing-page/stories/260624-dqg/tasks.yaml
worktree:
claimed_by:
driver_holder: build:360c93c8-71d2-4f84-a4b4-db50aec1d4f9
labels: [pmos-toolkit, landing-page, substrate, style-system, new-substrate]
created: 2026-06-24
updated: 2026-06-24
---

## Story

Build the bundled, data-driven style system and the reference substrate for `/landing-page`, as files under
`plugins/pmos-toolkit/skills/landing-page/{reference,tests}/` with **no `SKILL.md`** (Story 260624-pe2 authors
that and consumes these). This is the independently-shippable, self-tested half: it must produce a previewable,
offline style gallery and a complete set of craft references from data, with no LLM enrichment present.

Scope is fixed by `02_design.html` §5 (style system / theme tokens / gallery), §3 (section taxonomy), §4 (hero
archetypes), §7 (copy gates), and §11 (substrate map / story A rows). Cites `design_doc:` anchors
`#style-system`, `#styles`, `#section-taxonomy`, `#hero-fold`, `#copy-gates`, `#substrate-map`.

## Acceptance criteria

1. **6 frozen theme-token sets** (`reference/style-tokens.md` or `.json`) — one per §5 style (Clean minimal SaaS,
   Dark developer tool, Bold playful illustration, Editorial/typographic, Warm consumer lifestyle, Enterprise
   trust). Each set defines CSS-variable values for palette (`--bg/--fg/--accent/--muted` + surfaces), type
   (display/body font stacks, scale, weight), spacing/density, radius, shadow, and an imagery directive. Sets are
   pure data the generator binds; adding a style = adding a set, no skill-body edit.
2. **Contrast-safe palettes** — every token set's fg/bg and CTA pairings pass WCAG AA contrast; the selftest
   asserts this (AC6).
3. **Offline `reference/style-gallery.html`** — one self-contained file (inline CSS/JS, no CDN) rendering all 6
   styles as labelled hero+section **swatches** (not full pages) from their token sets, so the preview matches
   what the generator binds. Opens from `file://`. Favors restraint/point-of-view over commodity effects (§5).
4. **Section-scaffold reference** (`reference/section-scaffolds.md`) — the §3 default taxonomy (11 rows) + the 4
   product-type variant scaffolds (B2B SaaS / consumer / dev tool / info-product) + the governing equation filter.
5. **Hero-archetype + copy-gates references** (`reference/hero-archetypes.md`, `reference/copy-gates.md`) — the 4
   §4 archetypes + hero rules; and the §7 gates (Julian litmus + 6-criteria, Harry Dry 3-test, von Restorff
   single-CTA, psychology-by-section, anti-pattern avoid-list).
6. **Selftest** (`tests/`) — asserts the gallery renders 6 distinct named styles offline, each token set is
   well-formed (all required vars present) and contrast-passing, and the reference files contain the required
   sections/rows. Pure; no network, no LLM.

## Notes

File-disjoint from Story B (no `SKILL.md`); independently shippable. D9 claim-time dep-merge makes these present
in B's worktree before its skill-eval.

### Build verdict — 2026-06-24 (Loop 2, branch `feat/260624-dqg`, kept for Loop 3)

**SATISFIED** — all 6 ACs met; `node tests/selftest.mjs` exits 0 (**200 assertions**: 6 token sets full schema +
WCAG-AA contrast computed in-script (§H), gallery 6 distinct named offline swatches + 0 http refs, all reference
sections/rows). Delivered under `plugins/pmos-toolkit/skills/landing-page/`: `reference/{style-tokens.json,
style-tokens.md, style-gallery.html, section-scaffolds.md, hero-archetypes.md, copy-gates.md}` +
`tests/selftest.mjs`. Live Playwright render (localhost; `file://` blocked in MCP) confirmed all 6 swatches
populate from tokens, dark theme binds `--bg #0d1117`, 0 page errors (favicon-only) — evidence at
`stories/260624-dqg/style-gallery-render.png`. **No SKILL.md** (D7 — Story B/pe2 owns it).

**skill-eval (Phase 6a): N/A** — this substrate story authors no SKILL.md by design (D7), so `skill-eval-check.sh`
errors `no SKILL.md` and the 4 hygiene lints (all SKILL.md-targeted) have nothing to score; the substrate's quality
gate is the pure selftest (green). skill-eval + the lints apply at Story B. **Release prerequisites** (version bump,
changelog, README row, manifest sync) deferred to `/complete-dev --epic 260624-ajy` (Loop 3).
