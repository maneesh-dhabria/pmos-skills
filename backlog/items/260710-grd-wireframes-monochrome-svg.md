---
schema_version: 1
id: 260710-grd
title: "/wireframes — realign core generation with the reference wireframe skill: monochrome 8px-snapped inline SVG on fixed canvases, a normative grid/palette/type substrate, a deterministic SVG lint, an SVG-native eval rubric, worked examples, 41 migrated pattern skeletons, and a screen manifest the downstream consumers read"
type: feature
kind: epic
status: defined
route: skill
priority: should
labels: [pmos-toolkit, wireframes, prototype, design-crit, skill, from-design-brief]
created: 2026-07-10
updated: 2026-07-10
design_doc: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/02_design.html
feature_folder: docs/pmos/features/2026-07-10_wireframes-monochrome-svg/
parent:
dependencies: []
---

## Context

Design-brief-driven refactor (`/skill-sdlc define --route skill`) of `/wireframes` (pmos-toolkit). The seed is
`docs/design-briefs/2026-07-10-wireframes-monochrome-svg.md`, adopted verbatim as `02_design.html` §1–§9 per the
design-doc-seed sub-mode.

The seed came out of a deep study of the reference wireframe skill
(`paperclipai/paperclip` → `packages/skills-catalog/catalog/bundled/product/wireframe`). That skill is a **drawing
instrument**: strictly monochrome, 8px-snapped, coordinate-disciplined SVG composed from 24 copy-paste primitives,
with a normative `grid-system.md` and four worked examples. Ours is a **mid-fi pipeline stage**: branded,
Tailwind-styled HTML that deliberately resembles the host app.

Grounding the seed against the live tree confirmed all but one of its claims:

1. `assets/wireframe.css:102` — `.wf-anno { outline: 1px dashed var(--wf-accent); … }` draws annotations in
   `#2563eb`, **the same blue as `.mock-button--primary`**. That is verbatim the "annotation colour bleeding into
   UI" composition mistake the reference names.
2. There is **no grid system at all** — no base unit, no snap rule, no gutter, no column math, no component-size
   table anywhere in the skill.
3. All 41 pattern files carry `## Skeleton` blocks that are CSS class names, not geometry; and the rubric ids
   `A1`–`A5` / `D1`–`D4` the migration must retire live at `reference/eval-rubric.md:62–93`.
4. There are **zero** worked examples, and `reference/html-template.md` admits the cost: *"Strict format
   requirements — Subagents drift on these unless the format is shown verbatim."*
5. **Stale in the seed (corrected at §10 A0):** the seed placed `/design-crit`'s `window.pmosDesignScan()` in
   `assets/capture.mjs`. It actually lives in `assets/slop-prepass.mjs`; `capture.mjs` has zero hits.

Four architectural decisions were deliberated and confirmed with the maintainer before the define run (D1–D4):
inline-SVG-inside-the-HTML-shell rather than standalone `.svg` (D1); monochrome by default with a `--fidelity`
opt-in (D2); accessibility review moves to `/prototype` and this skill gets an SVG-native rubric (D3); all 41
pattern files migrate in one epic (D4). A focused `/grill` pass then amended the design — see
`02_design.html#amendments`.

`route: skill`, single plugin (pmos-toolkit), one release unit. No new skill, no UI. `/creativity`, `/wireframes`
and `/prototype` are suppressed in this pipeline (skill modes have no UI). Coherence contract — decisions,
amendments, change surface, and story map — lives in `02_design.html`.

## Acceptance Criteria

- [ ] Core generation emits **monochrome, 8px-snapped, primitive-composed inline SVG** on a fixed canvas per
  viewport, inside the existing HTML shell. One `.html` per `(component × device)` as before (D1).
- [ ] The palette is closed and enforced, not merely documented: `#000` ink, `#fff` paper, `#666` mute, `#e6e6e6`
  placeholder, `#f4f4f4` zebra, `#d33` annotation. `#d33` appears **only** inside `[data-region="annotations"]`,
  and `.wf-anno` is re-coloured to it — the accent-blue bleed is gone.
- [ ] Grid, palette, type scale, canvas tokens, and standard component sizes ship as a normative
  `reference/grid-system.md` — the single authoritative home (§K) — and are **enforced by a deterministic script**,
  never by prose (§H).
- [ ] `#generate` starts from a worked example, not from blank; four complete examples ship, one of which is a
  multi-state screen the reference cannot show.
- [ ] All 41 pattern skeletons are recomposed from named primitives, with every heuristic cite re-pointed at the
  new rubric. Zero dangling cites to the retired ids (D4).
- [ ] Accessibility review moves to `/prototype`; `/wireframes` gains an SVG-native rubric whose deterministic
  parts (palette allowlist, tap-target geometry) live in the lint, not the rubric prose (D3, §H).
- [ ] A per-screen `<script type="application/json" id="pmos-wireframe-meta">` manifest is the machine-readable
  home for `{fields, components, states, annotations}`; `/prototype` reads it first and keeps the tag-grep as a
  legacy fallback, so the entity model can never silently come back empty.
- [ ] `/design-crit`'s SVG blindness is resolved explicitly — either an SVG dialect or a logged exemption. No
  silent caps.
- [ ] Every existing capability survives: state-switcher, folded `/msf-wf`, canvas aggregation, comments
  instrumentation and anchoring, screenshot ingestion, `--bootstrap-design-only`, DESIGN.md / COMPONENTS.md
  resolution, workstream persistence, the non-interactive contract.
- [ ] `--fidelity` is resolved per §I on its merits (contract flag vs. `nl-sugar`) rather than by assumption, and
  whichever it is, `lint-flags-vs-hints.sh` stays green.
- [ ] Conforms to `skill-patterns.md §A–§L` + repo `CLAUDE.md`; both halves of `skill-eval.md` and all four hygiene
  lints stay green; the frozen non-interactive block stays byte-identical; `check-comments-coverage.sh` and the
  `apply-edit-at-anchor` tests (5 existing + ≥1 new SVG-payload fixture) pass.
- [ ] Ships in one pmos-toolkit release unit.

## Stories

Eight stories, all `route: skill`, all pmos-toolkit (single release unit — D17). Split is judgement per G3:
substrate and its enforcing lint **fuse** (`p5x`) because a palette the lint parses out of `grid-system.md` cannot
be `skill-eval`'d apart from the file it parses (§K, amendment A3) — the same reasoning that fused the scorecard
anchor with its validator in epic `260709-xhr`.

- 260710-p5x — grid/palette/type substrate (single home) + ~24 SVG primitives + canvas assets + the deterministic
  lint that parses its allowlist out of that home (route: skill). No deps. **Root story.**
- 260710-dsc — SVG-native, judgment-only eval rubric; retires A1–A5 and D1–D4 (route: skill). Depends on p5x.
- 260710-xrh — house-style table, monochrome `wireframe.css`, `.wf-anno`→`#d33`, chrome→canvas map, `--fidelity`
  as nl-sugar, stale "mid-fi/Tailwind" prose retired (route: skill). Depends on p5x.
- 260710-rgb — `html-template.md` rewritten for the SVG payload + the `pmos-wireframe-meta` screen manifest
  (route: skill). Depends on p5x, xrh.
- 260710-7ns — four worked examples, one multi-state (route: skill). Depends on p5x, rgb.
- 260710-8z9 — 41 pattern skeletons recomposed + every heuristic cite re-pointed (route: skill). Depends on p5x, dsc.
- 260710-n67 — consumer + resolver updates: the apply-edit shim's `data-anchor` branch (**Blocker**), `/prototype`
  manifest reader, `/design-crit` decision, `build-canvas.js` canvas tokens, `/msf-wf` rubric re-point
  (route: skill). Depends on rgb, dsc.
- 260710-xwa — `index.html` narrative story column (route: skill). Depends on rgb.

**Hard ordering.** `p5x` is the root — nothing is linted, composed, or cited before the palette has one home.
`dsc` lands before `8z9` so the 41-file re-citation folds into the migration's own edit pass (D4's sequencing
consequence, now enforced by the dependency graph rather than by prose).
