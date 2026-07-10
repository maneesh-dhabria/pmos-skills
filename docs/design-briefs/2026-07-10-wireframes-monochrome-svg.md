# Design Brief — `/wireframes`: realign core generation with the reference wireframe skill (monochrome SVG)

**Date:** 2026-07-10
**Plugin:** pmos-toolkit
**Skill:** `pmos-toolkit/wireframes` (existing — core generation refactor)
**Status:** Approved design brief — four architectural decisions deliberated and confirmed (D1–D4); ready for `/skill-sdlc define` (three open items deliberately left for spec — see §9)
**Type:** Existing-skill refactor; crosses into `/prototype` + `/design-crit` reference docs (§6)
**Reference studied:** `paperclipai/paperclip` → `packages/skills-catalog/catalog/bundled/product/wireframe` — SKILL.md, `references/{components,examples,grid-system}.md`, `assets/{template.svg,template-mobile.svg,site-template.html}`

> **One-line shape:** Our `/wireframes` emits branded, Tailwind-styled mid-fi HTML; the reference skill emits strictly monochrome, 8px-snapped, primitive-composed SVG whose purpose is to stop reviewers arguing about colour. Adopt the reference's *drawing discipline* — closed palette, grid system, copy-paste primitives, worked examples — as an inline SVG payload inside our existing HTML shell, so every downstream consumer (`/prototype`, `/verify`, `/msf-wf`, `/plan`, `/design-crit`, `/comments`, `/artifact`) keeps working unchanged.

---

## 1. Problem this refactor solves

The reference skill and ours share a name and solve different problems. The reference is a **drawing instrument**: low-fi, strictly monochrome, coordinate-disciplined SVG. Ours is a **mid-fi pipeline stage**: branded HTML that deliberately resembles the host app.

The reference is stronger on five axes, and each strength is additive to our pipeline:

| Axis | Reference | Ours today |
|---|---|---|
| Black & white | Closed 6-token palette; `#d33` quarantined to the annotation layer | `--wf-accent: #2563eb`, success/error colours, gradients, shadows, dark mode. **`.wf-anno` draws in the same blue as `.mock-button--primary`** — the exact "annotation colour bleeding into UI" defect the reference names as a composition mistake |
| Components shipped | 24 copy-paste SVG primitives + blank canvas assets | 41 pattern docs whose `## Skeleton` blocks are *class names*, not geometry |
| Grid as reference | Normative `grid-system.md` + 8px guides drawn into `template.svg` | **Nothing.** No base unit, no snap rule, no gutter, no column math, no component-size table |
| Tokens + examples co-located | Token table inline in SKILL.md, demonstrated immediately below it | Tokens live as CSS custom properties the generator links but never reads |
| Worked examples | 4 complete screens; *"start from the example and modify, rather than building from blank"* | **Zero** |

The absence of worked examples is already costing us, and the skill admits it. `reference/html-template.md` carries a section titled *"Strict format requirements — Subagents drift on these unless the format is shown verbatim,"* and `#review`'s Rigor & Corner-Cut Protocol calls out high-variance findings like *"one wireframe with 31 aria-labels, another with 1."* That is the signature of fan-out generation without an exemplar.

## 2. Goals

1. Core wireframe generation is **monochrome, 8px-snapped, primitive-composed SVG** on a fixed canvas per viewport.
2. Grid, palette, type scale, and viewport tokens are **shipped as references and enforced by a script**, not by prose.
3. Generators start from **worked examples**, not from blank.
4. Every existing `/wireframes` capability survives: state-switcher, folded `/msf-wf`, canvas aggregation, comments instrumentation, screenshot ingestion, `--bootstrap-design-only`, DESIGN.md/COMPONENTS.md resolution, workstream persistence, non-interactive contract.
5. No downstream skill breaks.

## 3. Non-goals

- Adopting the reference's `here-now` publishing section — we have no such skill.
- Standalone `.svg` files as a deliverable (rejected — see D1).
- Discarding the 41 pattern files' judgment layer. The reference's `components.md` has no when/why; ours does, and that is our advantage over it.
- Discarding DESIGN.md / COMPONENTS.md. They are load-bearing for `/prototype`, `/verify`'s drift check, `/landing-page`, and `--bootstrap-design-only`.
- Deleting the state-switcher. The reference has no state concept; we do.

---

## 4. Decisions

### D1 — HTML shell, inline SVG payload

Keep one `.html` per `(component × device)`. Unchanged: `<head>` + `<meta name="pmos:skill" content="wireframes">`, comments substrate, `wf-chrome` state tabs, footer, `index.html`, `canvas.html`. **Changed:** the body of each `<section class="wf-state">` becomes an inline monochrome `<svg>` at the device's canvas token.

```
NN_dashboard_desktop-web.html
├─ <header class="wf-chrome">              ← state tabs, annotation toggle
├─ <main class="wf-frame--desktop-web">
│   └─ <section class="wf-state active" data-state="default">
│       └─ <svg viewBox="0 0 1280 800" stroke="#000" fill="#fff">
│            <g data-region="sidebar" data-anchor="sidebar">…</g>
│            <g data-region="metrics" data-anchor="metrics">…</g>
│            <g data-region="annotations">   ← #d33 lives ONLY here
│          </svg>
│   └─ <section data-state="empty">   <svg …>
│   └─ <section data-state="loading"> <svg …>
└─ <footer class="wf-footer">
```

**Why not standalone `.svg`:** an `<img src="x.svg">` is opaque to the DOM. It kills `data-anchor` comment anchoring inside screens, kills text selection, and degrades `/verify`'s Playwright copy-diff (SKILL.md:325). Inline SVG preserves the reference's coordinate discipline *and* keeps every consumer working. `retrofitSvg()` (`_shared/html-authoring/assets/svg-anchor.js`) already injects `data-anchor` onto `<g>` and top-level `<rect>`/`<path>`, and the reference's `data-region="sidebar"` convention maps onto it exactly — **our comments story improves.**

Verified against consumers: nothing anywhere greps `.wf-state`; `build-canvas.js` discovers screens by filename with a `<title>` fallback; `extract-screens.js` never requires `.wf-state`.

No `--emit-svg` flag in this epic.

### D2 — Monochrome default; `--fidelity mid` opts into brand

`#resolve-design-md` still runs and persists. `design-overlay.css` is still generated (`/prototype`'s `reference/design-artifact-resolver.md`:58–73 reads it directly and caches on its mtime). **Per-screen wireframes stop linking it** unless `--fidelity mid`.

This splits one conflated decision into two: *resolving* DESIGN.md ≠ *applying* it. Brand belongs at `/prototype`, which emits real HTML.

- `--fidelity lo|mid`, default `lo`. Contract flag (typed value → passes the §I 4-test) → goes in `argument-hint`.
- Natural-language forms: "brand it", "match the app's look" ⇒ `mid`.
- `--bootstrap-design-only` is unaffected.

### D3 — Accessibility moves to `/prototype`; SVG-native rubric here

A wireframe is structure, not implementation. SVG has no `<label>`, `<th>`, `<dt>`, no `focus-visible`, no touch targets.

- **Retired from `reference/eval-rubric.md`:** `A1` (semantic HTML), `A3` (focus visibility), `A4` (labels), `A5` (touch targets), `D1`–`D4` (device patterns).
- `A2` (contrast) is trivially satisfied by the closed monochrome palette; it survives only as a palette-allowlist lint, not a review concern.
- **New SVG-native checks:** `<title>`/`<desc>` on every `data-region` group; the numbered annotation list as the text alternative; 44px minimum tap-target as a **geometry** check on the mobile canvas (deterministic, scriptable).
- `#review`'s hard-fail set and second-loop trigger conditions are rebuilt on the new IDs.

An honest scope reduction, taken on purpose. `/prototype` already owns accessibility review over real HTML.

### D4 — All 41 pattern files migrate in one epic

Every pattern's `## Skeleton` is rewritten from CSS-class HTML to a composition of named primitives. One coherent cutover, no dual-dialect tolerance to build and later remove.

**Sequencing consequence of D3:** the 41 files cite heuristic IDs (`G2`, `F1`, `N9`, `A4`, `D1`…) in their `## Best practices` and `## Common mistakes` lists. Retiring `A1`/`A3`/`A4`/`A5`/`D1`–`D4` would leave dangling cites. Because the whole library is being rewritten anyway, the re-citation happens **inside the same edit pass** — no separate cross-reference sweep. But this hard-orders the work: **the rubric must land before the pattern migration.**

---

## 5. Scope — proposed stories

Dependency-ordered. S7 is the bulk; S8 crosses into `/prototype` and `/design-crit`.

| # | Story | Deliverables | Dep |
|---|---|---|---|
| **S1** | Grid + primitive substrate | `reference/grid-system.md` (8px base, margins, gutters, 12-col math, component-size table, coordinate conventions, negative space); `reference/primitives.md` (~24 monochrome SVG primitives, `<g transform="translate(0,0)">`-wrapped, plus "Common composition mistakes"); `assets/canvas-{desktop,wide,tablet,mobile}.svg` with 8px guides and dashed margin rulers | — |
| **S2** | Deterministic lint | `scripts/lint-wireframe-svg.mjs` — 8px-snap on every `x`/`y`/`width`/`height`; hex allowlist (`#000 #fff #666 #e6e6e6 #f4f4f4 #d33`); `#d33` only inside `[data-region="annotations"]`; `stroke="none"` on every `<text>`; `viewBox` present and matching `width`/`height`. Wired into `#review` as a **`[D]` hard gate**. Per §H: arithmetic belongs in a script, never in the model | S1 |
| **S3** | SVG-native eval rubric | `reference/eval-rubric.md` rewritten per D3; new heuristic IDs; `#review` hard-fail set + second-loop trigger restated | S1 |
| **S4** | House style + fidelity dial | House-style token table inlined in SKILL.md (~15 lines, non-negotiable; authoritative copy in `grid-system.md`, cited per §K); `assets/wireframe.css` stripped to monochrome + chrome-only colour; **`.wf-anno` re-coloured to `#d33` and quarantined**; `--fidelity lo\|mid` parsed, `argument-hint` updated; overlay link becomes conditional; chrome→canvas mapping table (`desktop-web`+`desktop-app` → 1280×800; `mobile-web`+`ios-app`+`android-app` → 375×812; new `tablet` → 768×1024; new `wide` → 1440×900) | — |
| **S5** | Template + screen manifest | `reference/html-template.md` rewritten for SVG payload; new inline `<script type="application/json" id="pmos-wireframe-meta">` carrying `{fields, components, states, annotations}`; numbered-annotation-list output convention adopted from the reference (per-screen, in the footer and in the skill's reply) | S1, S4 |
| **S6** | Worked examples | `reference/examples.md` — 4 complete screens in *our* format: desktop dashboard, mobile form, modal overlay, **and one multi-state screen (empty/loading/error)** that the reference cannot show. `#generate` instruction: *"start from the nearest example and modify; do not build from blank"* | S1, S5 |
| **S7** | Pattern migration ×41 | Every `## Skeleton` recomposed from primitives; every heuristic cite re-pointed at the S3 rubric. Parallelisable (~7 batches), each batch reviewed against the primitive library | S1, S3 |
| **S8** | Consumer updates | `/prototype` SKILL.md:183,219 + `reference/mock-data-prompt.md`:8–10 read `pmos-wireframe-meta` first, tag-grep as legacy fallback; `/design-crit` `assets/capture.mjs` + `_shared/slop-engine/design-slop-rules.md` made SVG-aware or explicitly exempt for wireframes (with a logged reason — no silent caps) | S5 |

---

## 6. Contracts changed

| Contract | Change | Blast radius |
|---|---|---|
| Per-screen HTML body | Tailwind-classed DOM → inline `<svg>` | `/prototype` field extraction, `/design-crit` slop scan (both handled in S8) |
| `<script id="pmos-wireframe-meta">` | **New** | `/prototype`, `mock-data-prompt.md` |
| `eval-rubric.md` heuristic IDs | `A1/A3/A4/A5/D1–D4` retired | All 41 pattern files (S7), `#review`, `/msf-wf` spot-check (reads our rubric) |
| `design-overlay.css` link | Unconditional → `--fidelity mid` only | Wireframe HTML only. File still generated; `/prototype` unaffected |
| `assets/wireframe.css` | Palette collapsed to monochrome; `.wf-anno` → `#d33` | Chrome retains colour; `/prototype`'s eval-rubric V4 asserts *zero* `.wf-anno` leakage into prototypes — unchanged |
| `argument-hint` | `+ --fidelity <lo\|mid>` | `lint-flags-vs-hints.sh` |
| Tailwind CDN | No longer needed for screen content | Removes a network dependency from `file://` review |

**Untouched:** `pmos:skill` meta, comments substrate + `scripts/apply-edit-at-anchor.js` + its 5 tests, `canvas.html`/`canvas.json` + `assets/canvas/build-canvas.js`, `msf-wf-findings/`, `.layout-anchor`, `--bootstrap-design-only`, the inline pipeline-setup block, the inline non-interactive block.

---

## 7. Risks

1. **`/prototype` silent-empty entity model.** It greps wireframe HTML for `<th>`, `<label>`, `<dt>`, `data-field` (SKILL.md:183,219; `mock-data-prompt.md`:8–10). Those tags do not exist in SVG — a form field becomes `<text>`. Left unaddressed this yields an *empty* mock-data model rather than an error. **Mitigation:** S5's manifest + S8's reader change. Highest-risk item; S8 must not be deferred.

2. **Quote-grounding weakens.** `_shared/reviewer-protocol.md` requires ≥40-char quote grounding, and `_shared/apply-edit-at-anchor.md`'s resolver falls back to ≥40-char substring match. SVG `<text>` nodes are routinely shorter. **Mitigation:** `retrofitSvg()`'s `data-anchor` ids make the *id-first* resolution path dominant, and the annotation manifest supplies long-form prose to ground against. Verify with the existing 5 `apply-edit-at-anchor` tests plus a new SVG-payload fixture.

3. **`/msf-wf --apply-edits`** (SKILL.md:184–188) performs substring `Edit`s against wireframe HTML. SVG text is still substring-addressable, but edits become coordinate-adjacent. Needs a fixture test.

4. **`/design-crit`'s `window.pmosDesignScan()`** is a CSS/DOM tell-detector; it sees nothing inside an `<svg>`. Decide in S8: SVG dialect, or explicit logged exemption.

5. **41-file mechanical diff.** A bad batch poisons generation everywhere. Review each batch against `primitives.md`; the S2 lint runs on every emitted example.

6. **Fixed canvas means no reflow.** Intentional and correct per the reference, but a visible behaviour change for anyone re-running an existing feature folder. Announce it.

---

## 8. Acceptance

**`[D]` deterministic gates**
- `scripts/lint-wireframe-svg.mjs` passes on all 4 worked examples and all emitted screens.
- `skill-eval-check.sh` on `plugins/pmos-toolkit/skills/wireframes/` (dir arg).
- `audit-recommended.sh` on `…/wireframes/SKILL.md` (file arg).
- `lint-flags-vs-hints.sh` — `--fidelity` hinted and handled in the body.
- `lint-phase-refs.sh` — every `{#slug}` and cross-skill anchor resolves.
- `lint-non-interactive-inline.sh` — block byte-identical.
- `apply-edit-at-anchor` tests (5 existing + ≥1 new SVG-payload fixture).
- `check-comments-coverage.sh`.
- Zero dangling heuristic cites: grep all 41 pattern files for retired IDs (`A1|A3|A4|A5|D1|D2|D3|D4`) → no hits.

**`[J]` judgment gates**
- Coherence pass at `/complete-dev --epic`: no count-claim drift (e.g. "24 primitives" vs. the actual inventory — precisely the class of prose-only defect the `[J]` gate caught on epic `260709-23a`).
- Live dogfood: run `/wireframes` end-to-end on a real feature; open `index.html` and `canvas.html`; confirm arrows, state tabs, annotation toggle, and comment anchoring all still work.

---

## 9. Open questions (deliberately left for spec)

1. **A narrative review surface.** The reference's `assets/site-template.html` is a *review document*: per screen, a three-column grid of `wireframe | reference screenshot | annotations + "Why this changes"`. We already ingest screenshots into `assets/source-screens/` and then never show them beside the output. Our `index.html` is a launcher and `canvas.html` is a spatial board; neither tells the story. Fold into `index.html`, add a third surface, or defer to a follow-up epic?
2. **Tablet / wide canvases** are new expressive capability (S4). Do they become selectable devices in `#component-breakdown` step 4, or canvas-only options?
3. **What `--fidelity mid` actually means** — does it re-enable Tailwind for screen content, or does mid-fi mean "monochrome SVG payload + brand tokens applied to the chrome only"?
