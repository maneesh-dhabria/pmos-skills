---
name: landing-page
description: Generate a high-converting, self-contained product landing page through a guided six-phase workflow — research the product (a local repo, a GitHub URL, a doc, or a description) into a cited design brief, propose and approve the section structure, explore 2–3 rendered hero-fold options, pick one of six bundled visual styles, then draft and self-review a single inline-CSS / vanilla-JS HTML page (no CDN) grounded in established conversion craft (Julian Shapiro's Desire − Labor − Confusion, Harry Dry's headline tests, von Restorff single-CTA). Output is a per-page folder with brief.md + index.html. Use this when the user wants to create a landing page, build a landing page for a product, make a marketing or product page, or invokes /landing-page.
user-invocable: true
argument-hint: '[<repo path | GitHub URL | doc | "product description">] [--docs-path <dir>] [--non-interactive]'
---

# /landing-page

Turn a product (a repo, a GitHub URL, a doc, or a plain description) into a high-converting,
**self-contained** landing page through a guided six-phase workflow. The page is one HTML file with
inline CSS + vanilla JS and **no CDN dependency** (D3); it ships inside a per-page folder alongside the
cited brief it was built from (D8).

The craft is not improvised — every phase is grounded in the design doc
[`docs/pmos/features/2026-06-24_landing-page/02_design.html`](../../../../docs/pmos/features/2026-06-24_landing-page/02_design.html)
and consumes the **bundled references** in `reference/` (one fact, one home — this body cites them, it does
not restate them):

| Reference | Carries | Cited by |
|---|---|---|
| `reference/section-scaffolds.md` | governing equation + do>show>tell principle + 12-row taxonomy (incl. "Who this is for / not for") + 4 product-type variants + copy-length rule | Phases 2, 5 |
| `reference/multi-product.md` | multi-product detection heuristic + 3 organizing principles (suite / hub / single-focus) | Phases 1, 2 |
| `reference/hero-archetypes.md` | hero elements + 4 archetypes + 5 enforced hero rules | Phase 3 |
| `reference/style-tokens.json` + `reference/style-tokens.md` | 6 frozen, contrast-safe theme-token sets | Phase 4 |
| `reference/style-gallery.html` | offline swatch gallery of all 6 styles | Phase 4 |
| `reference/media-strategy.md` | media format menu + capability detection + video pipeline (Playwright + ffmpeg) + degrade ladder + embed rules | Phases 0, 4.5 |
| `reference/copy-gates.md` | Julian litmus + Harry Dry 3-test + 6-criteria + single-CTA + persona-jargon rule + do>show>tell show-ratio + asset-fidelity rules + psychology levers + anti-patterns + visual self-check (mobile a hard dimension) | Phases 5, 6 |

## Overview

```
Phase 0   setup + load learnings + resolve input + media-capability detect (#setup)
Phase 1   research → cited brief.md          (#research-brief)    — persona + signature moments; confirm
Phase 1.5 logo (optional)                    (#logo)              — GATE: detect → wordmark/​/logo/​skip (D5)
Phase 2   propose ≥3 structure variants      (#propose-structure) — GATE: pick variant (D4)
Phase 3   explore 2–3 rendered hero folds    (#hero-explore)      — GATE: pick     (D2)
Phase 4   pick visual style (live preview)   (#style-pick)        — GATE: pick     (D1) + #style-preview (D8)
Phase 4.5 media-strategy per moment/page     (#media-strategy)    — GATE: format (D6)
Phase 5   draft the self-contained page      (#draft)
Phase 6   self-review (copy gates + visual)  (#self-review)       — revise in place (D10), mobile a hard gate
Phase 7   capture learnings                  (#capture-learnings)
```

The steering gates are Phases 1.5/2/3/4/4.5. Under `--non-interactive` each AUTO-PICKs its `(Recommended)`
option (the product-type-driven or no-heavy-op-safe default, D5/D6) and logs an Open Question — see the
inline contract block in Phase 0.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion` tool:** the three gates (Phases 2/3/4) and the Phase 1 brief confirmation degrade
  to numbered free-form prompts (present the options as a numbered list; accept a number or free text). The
  non-interactive auto-pick contract still applies (Recommended → AUTO-PICK).
- **No Playwright / headless browser (Phase 6 visual self-check, D10):** skip the render+screenshot pass and
  fall back to the text copy-gates + a structural-HTML check (assert the hero, the single primary CTA, the
  approved sections in order, and the bound style tokens are present in the markup). **Log** the skipped
  visual pass to chat — never drop it silently (`reference/copy-gates.md#visual-self-check`).
- **No `Bash` (cannot serve over `http://localhost`):** Playwright in this repo cannot open `file://`
  (blocked) — if you cannot start a local server, treat it as the no-headless-browser case above.
- **No `WebFetch` / offline:** web research is opt-in and default-off anyway (Phase 1); proceed from the
  provided context only and note the gap in the brief.
- **No task-tracking tool:** the per-page folder's `brief.md` + the on-disk artifacts are the canonical
  progress record; work the phases in order without it.

## Track Progress

This skill has multiple phases. Create one task per phase using your agent's task-tracking tool (e.g.,
`TaskCreate` in Claude Code). Mark each in-progress when you start it and completed as soon as it finishes
— do not batch completions.

## Load learnings

Read `~/.pmos/learnings.md` if it exists. Note any entries under `## /landing-page` and factor them into
your approach for this run. Skill body wins on conflict; surface any conflict to the user before applying.

## Phase 0: Setup + resolve input {#setup}

1. **Resolve `{docs_path}`.** Read `.pmos/settings.yaml` for `docs_path` (default `docs/pmos`). A
   `--docs-path <dir>` argument overrides it (last value wins). If `.pmos/settings.yaml` is missing, use
   the default and continue — this skill does not require pipeline setup.
2. **Resolve the input source** from the argument string (everything that is not a recognised flag):
   - a **local path to a directory** → treat as a repo to research (Phase 1 reads it);
   - a **GitHub URL** → the product's repo (clone/read per Phase 1, web fetch opt-in);
   - a **path to a doc** (`.md`/`.txt`/`.html`/PDF) → a product brief/spec to mine;
   - any **other free text** → a plain product description.
   - **No input given** → ask the user for one (interactive) or, non-interactive, emit an Open Question and
     stop (you cannot research nothing).
3. **Web-research toggle.** Web fetching is **opt-in, default OFF** (D6 — never invent, never silently
   reach the network). Turn it on only when the user names a reference to fetch or approves it. The
   natural-language form ("also research X online", "pull in their docs") enables it for this run.
   <!-- nl-sugar -->
   `--research` / `--no-research` are parsed as silent aliases for that toggle (default off).
4. **Detect media capabilities once, cache for Phases 4.5 + 6 (D6).** Probe the host environment a single
   time so the downstream media and visual-check phases never re-detect or block on a missing tool:
   - **ffmpeg** — `command -v ffmpeg >/dev/null 2>&1` (the repo's standard probe, as in
     `explainer-video/scripts/narrate.sh`). Gates the video trim/compress/poster step.
   - **headless browser** — Playwright / a headless Chromium available **and** a way to serve over
     `http://localhost` (`command -v npx` for `http-server`, or `python3 -m http.server`). Gates both video
     capture (Phase 4.5) and the visual self-check (Phase 6); `file://` is blocked for Playwright in this repo.

   Cache the two booleans (`media_caps: { ffmpeg, headless_browser }`) for Phase 4.5 and Phase 6. **Do not
   inline the degrade decisions here** — the format-by-capability ladder lives once in
   `reference/media-strategy.md#degrade-ladder` (cited by 4.5/6), not restated in this body (C2).

<!-- non-interactive-block:start -->
1. **Mode resolution.** Compute `(mode, source)` with precedence: `cli_flag > parent_marker > settings.default_mode > builtin-default ("interactive")` (FR-01).
   - `cli_flag` is `--non-interactive` or `--interactive` parsed from this skill's argument string. Last flag wins on conflict (FR-01.1).
   - `parent_marker` is set if the original prompt's first line matches `^\[mode: (interactive|non-interactive)\]$` (FR-06.1).
   - `settings.default_mode` is `.pmos/settings.yaml :: default_mode` if present and one of `interactive`/`non-interactive`. Unknown values → warn on stderr `settings: invalid default_mode value '<v>'; ignoring` and fall through (FR-01.3).
   - If `.pmos/settings.yaml` is malformed (not parseable as YAML, or missing `version`): print to stderr `settings.yaml malformed; fix and re-run` and exit 64 (FR-01.5).
   - On Phase 0 entry, always print to stderr exactly: `mode: <mode> (source: <source>)` (FR-01.2).

2. **Per-checkpoint classifier.** Before issuing any `AskUserQuestion` call, classify it (FR-02):
   - The defer-only tag, if present, is the literal previous non-empty line: `<!-- defer-only: <reason> -->` where `<reason>` ∈ {`destructive`, `free-form`, `ambiguous`} (FR-02.5).
   - Decision (in order): tag adjacent → DEFER; multiSelect with 0 Recommended → DEFER; 0 options OR no option label ends in `(Recommended)` → DEFER; else AUTO-PICK the (Recommended) option (FR-02.2).

3. **Buffer + flush.** Maintain an append-only OQ buffer in conversation memory. On each AUTO-PICK or DEFER classification, append one entry per the schema in spec §11.2. At end-of-skill (or in a caught error before exit), flush (FR-03):
   - Primary artifact is single Markdown → append `## Open Questions (Non-Interactive Run)` section with one fenced YAML block per entry; update prose frontmatter (`**Mode:**`, `**Run Outcome:**`, `**Open Questions:** N` where N counts deferred only — see FR-03.4) (FR-03.1).
   - Skill produces multiple artifacts → write a single `_open_questions.md` aggregator at the artifact directory root; primary artifact's frontmatter `**Open Questions:** N — see _open_questions.md` (FR-03.5).
   - Primary artifact is non-MD (SVG, etc.) → write sidecar `<artifact>.open-questions.md` (FR-03.2).
   - No persistent artifact (chat-only) → emit buffer to stderr at end-of-run as a single block prefixed `--- OPEN QUESTIONS ---` (FR-03.3).
   - Mid-skill error → flush partial buffer under heading `## Open Questions (Non-Interactive Run — partial; skill errored)`; set `**Run Outcome:** error`; exit 1 (E13).

4. **Subagent dispatch.** When dispatching a child skill via Task tool or inline invocation, prepend the literal first line: `[mode: <current-mode>]\n` to the child's prompt (FR-06).

5. **Call-site auditing (CI only).** This runtime classifier reads the call it is about to make — it does not run awk. Static/offline auditing of `AskUserQuestion` call sites across SKILL.md files is performed by `tools/audit-recommended.sh`, which sources the shared call-site extractor from Section D of this file (`_shared/non-interactive.md`). Runtime and audit therefore share one decision contract without inlining the extractor into every skill (FR-02.6).

6. **Refusal check.** If this SKILL.md contains a `<!-- non-interactive: refused; ... -->` marker (regex: `<!--[[:space:]]*non-interactive:[[:space:]]*refused`), and `mode` resolved to `non-interactive`: emit refusal per Section A and exit 64 (FR-07).

7. **Pre-rollout BC.** If the `--non-interactive` argument is present BUT this SKILL.md does NOT contain the `<!-- non-interactive-block:start -->` marker (i.e., this skill hasn't been rolled out yet): emit `WARNING: --non-interactive not yet supported by /<skill>; falling back to interactive.` to stderr; continue in interactive mode (FR-08).

8. **End-of-skill summary.** Print to stderr at exit: `pmos-toolkit: /<skill> finished — outcome=<clean|deferred|error>, open_questions=<N>` (NFR-07).
<!-- non-interactive-block:end -->

## Phase 1: Research the product → cited brief {#research-brief}

Build understanding **before** designing (D8). Grounded in `02_design.html#ingestion`.

1. **Create the per-page folder** `{docs_path}/landing-page/<YYYY-MM-DD>-<title-slug>/` (D8) with
   subdirs `reference/` and `working/`. `<title-slug>` is a kebab slug of the product name.
2. **Research the resolved input:**
   - **local repo** → read README, package/manifest, docs, and the obvious entry points; infer what the
     product is, who it's for, the core value, features, and any proof (stars, users, testimonials).
   - **GitHub URL** → same, fetching only if web research is enabled (else ask the user to point at a
     local clone or paste the README).
   - **doc / description** → mine it directly.
3. **Extract source material** into the page folder's `reference/` (the README, a screenshot list, any
   quoted testimonials/metrics) so the brief is auditable and the draft has real assets to bind.
4. **Detect single- vs multi-product** (D9). Apply `reference/multi-product.md#detection-heuristic` to the
   research: a monorepo with N user-facing apps, or a plugin exposing N user-facing skills, is
   **multi-product**; facets/tiers/platforms of one product are **single-product** (the default — do not
   over-detect). Record `product_count: single | multi` in `brief.md` (+ the product list when multi). The
   chosen organizing principle is decided at Phase 2.
5. **Write `brief.md`** in the page folder — a cited brief capturing: product name + one-line definition,
   `product_type` ∈ {B2B SaaS, Consumer app, Dev tool, Info-product} (drives every downstream default, D5),
   and:
   - **Persona(s) (D2):** select **1–2 personas**, each with a **jargon tolerance** (`novice` / `fluent`).
     These replace a loose "target audience" and calibrate copy (the persona-jargon rule that consumes them
     lives in `reference/copy-gates.md#persona-jargon-rule` — cited, not restated here). Interactive: ask
     which personas. Non-interactive: pick the `product_type` default persona and log an Open Question.
   - **Signature moments to demonstrate (D1):** the **2–4 product moments worth showing** (e.g. a live
     readout, a key interaction, a result screen) — the raw material for do>show>tell
     (`reference/section-scaffolds.md#governing-principles`). Phase 2 maps each to a show-surface.
   - plus the core desire, the top objections, available proof, the primary conversion action, and the
     visual tone.

   **Cite each fact** back to its source file/line. **Missing fields are asked, never invented** (D6) — list
   unknowns explicitly in the brief and (interactive) ask, or (non-interactive) leave a clearly-labelled
   `TODO:` placeholder and log an Open Question.

   **Multi-product (D1) — one brief slice per product, as a Phase-2 precondition.** When `product_count:
   multi`, the single-product **1–2 personas** cap above is overridden per
   `reference/multi-product.md#per-product-persona-override`: each detected product gets **its own brief
   slice** — one primary persona + that persona's jargon tolerance + the product's own signature moments +
   sections. **Phase 2 may not begin until every detected product has its slice** (this is a precondition,
   not a post-hoc note — a single global persona across N products is the failure it prevents). The
   single-product path is unchanged.
6. **Confirm the brief with the user** before proceeding (interactive). Adjust on feedback. This is the
   foundation the rest of the page is built on, so it is worth a beat.

<!-- defer-only: free-form -->
Brief confirmation is a free-form review, not a fixed-option pick — present the brief and invite edits;
under `--non-interactive` proceed with the brief as written and log it as an Open Question.

## Phase 1.5: Logo (optional) {#logo}

A landing page reads as more credible with a real brand mark. This **optional** phase sources one without
ever blocking an unattended run (D5). Grounded in `02_design.html` (D5).

1. **Detect an existing logo.** Scan the researched assets in the page folder's `reference/` (and the brief)
   for a brand mark — an `svg`/`png` named like a logo, a favicon, a README badge, a wordmark in the
   product's own site. If one is found, **bind it** in Phase 5 (and skip the gate below).
2. **If none is found, offer to make one** via the gate. The **`(Recommended)`** option is a
   **no-heavy-op-safe default** — a **simple text wordmark** the draft can render from the product name +
   the bound style's display font (no external skill, no image generation). So under `--non-interactive` the
   gate AUTO-PICKs the wordmark and **never spawns a heavy skill** (C4).

   ```
   AskUserQuestion → "No brand mark found. How should the page handle the logo?"
     • "Simple text wordmark (Recommended)"   — render from product name + display font; zero heavy ops
     • "Generate a logo with /logo"            — run the /logo skill for an SVG/favicon/monochrome set
     • "Skip — no logo"                        — header reads as plain product name
   ```

   On **Generate**: invoke `/pmos-toolkit:logo` (prepend `[mode: …]` + `[output_format: …]`); capture its
   SVG + favicon + monochrome variants into the page folder's `reference/`.
3. **Bind in Phase 5.** Whichever path ran, the resolved mark (wordmark text, sourced asset, or `/logo`
   output) is bound into the **header** and the **attribution footer** in Phase 5 (favicon as a `data:` URI
   or page-folder-relative file — never remote, C1). Skip → header shows the plain product name.

Record the logo decision + bound asset path in `brief.md`.

## Phase 2: Propose the section structure {#propose-structure}

**Always propose + get approval before drafting (D4).** Grounded in `02_design.html#section-taxonomy`;
the taxonomy, the product-type variants, the governing equation, the do>show>tell principle, and the
copy-length rule all live in `reference/section-scaffolds.md` — read it and apply it; do not restate it here.

1. Start from the **product-type variant** matching the brief's `product_type` (the reference's
   "Product-type variants" section). **Multi-product input (D9):** first pick the organizing principle from
   `reference/multi-product.md` (suite / hub / single-focus) and build the structure per the chosen principle
   — the gate below carries that pick.
2. Filter every candidate row through the **governing equation** `Purchase Rate = Desire − (Labor +
   Confusion)` — a section earns its place only if it adds desire or removes labor/confusion. Cut the rest.
3. **Map every feature/value claim to a show-surface (do>show>tell, D1) — a drafting precondition (D2).** Not
   only the brief's signature moments: take **every page-level feature or value claim** the chosen structure
   intends to make and map each to a concrete show-surface per
   `reference/section-scaffolds.md#governing-principles` — **embed-first** (an embedded real self-contained
   artifact is the strongest rung, then interactive snippet / video / carousel / annotated screenshot / plain
   screenshot), attached to the section that makes the claim. **A complete map is a precondition for drafting
   (Phase 5):** a claim with **no available show-surface** must be either **demoted** (cut from the page) or
   **explicitly flagged tell-only** in the structure; **Phase 5 may not begin while any feature claim remains
   unmapped.** This is a presence/completeness precondition (every claim has a mapping decision) — not an
   arithmetic ratio (§H).
4. **Coherence / dedup pass (D3).** Before presenting, sweep the proposed list: **omit the below-hero
   social-proof strip when the hero caption already carries those proof values**, and ensure **no section
   restates the hero's value prop** or duplicates another section's proof (`section-scaffolds.md` dedup note).
5. Set copy length from the **copy-length rule** (free → short, paid → longer as price rises).
6. **Propose ≥3 distinct structure variants (D4).** Instead of one ordered list, present **at least three**
   variants that differ in **section order, framing (problem-led vs outcome-led vs proof-led), and/or copy
   length**, each with a **one-line summary**, and mark the best fit for the `product_type` as the
   **recommended default**. (Reuse the Phase-3 rendered-comparison muscle only where cheap; a labelled list
   is sufficient here.)

Gate (the recommended option is the product-type-default variant, so it AUTO-PICKs non-interactively; for
multi-product the recommended carries the single-focus principle per `multi-product.md#non-interactive-default`):

```
AskUserQuestion → "Which page structure should we use?"
  • "Variant A — <one-line summary> (Recommended)"   — the product-type-default order/framing
  • "Variant B — <one-line summary>"                  — e.g. problem-led, longer copy
  • "Variant C — <one-line summary>"                  — e.g. proof-led, compressed
  • "Adjust sections"                                 — add/remove/reorder (free-form follow-up)
```

(Present the actual variant summaries; the three shown are illustrative. The recommended default is first so
`--non-interactive` AUTO-PICKs it; a multi-product run additionally logs an Open Question naming the other
detected products.)

## Phase 3: Explore the hero fold {#hero-explore}

The hero is the page's single most important decision, so explore it with **real renders, not
descriptions (D2)**. Grounded in `02_design.html#hero-fold`; the 4 archetypes, the hero elements, the 5
enforced hero rules, and the Phase-3 mechanism all live in `reference/hero-archetypes.md` — apply it.

1. Pick the **2–3 candidate archetypes** best suited to the brief's `product_type` (the reference's
   archetype table names the best-for mapping; the recommended one is the default for that type, D5).
2. Draft hero **copy** for each candidate that passes the enforced hero rules (Julian litmus, subhead ≤ 2
   sentences, exactly one isolated primary CTA with first-person outcome-led copy, product-in-action
   visual — see the reference's "Hero rules (enforced)").
3. **Emit `working/hero-options.html`** — 2–3 fully-styled hero renders stacked for side-by-side
   comparison, each labelled with its archetype and rendered in the (provisionally) chosen style's tokens
   (the reference's "Phase-3 mechanism"). This is a **working artifact**, not the final page.
4. **Have the user pick one** (and accept copy/layout tweaks). The chosen hero is carried **verbatim**
   into Phase 5.

Gate (recommended = the product-type-default archetype, AUTO-PICKs non-interactively):

```
AskUserQuestion → "Which hero fold should the page use? (see working/hero-options.html)"
  • "Archetype <X> — <product-type default> (Recommended)"
  • "Archetype <Y>"
  • "Archetype <Z>"
```

## Phase 4: Pick the visual style {#style-pick}

Offer the **6 bundled, contrast-safe styles** and let the user pick before generating (D1). The token sets
live in `reference/style-tokens.json` (companion table `reference/style-tokens.md`); the previewable
gallery is `reference/style-gallery.html`. The generator **binds the chosen set's CSS variables** — it
never hand-rolls a palette, so AA contrast is guaranteed by the substrate (verified by the substrate
selftest, §H — this skill does no contrast arithmetic).

1. **Show the gallery.** Point the user at `reference/style-gallery.html` (open it / serve it) so they see
   all 6 styles as labelled swatches. The 6: Clean minimal SaaS, Dark developer tool, Bold playful
   illustration, Editorial / typographic, Warm consumer lifestyle, Enterprise trust.
2. **Render a live in-style preview of _this_ hero (D8) {#style-preview}.** The gallery shows abstract
   swatches; this shows the actual decision. Take the **chosen Phase-3 hero** and render it in the **2–3
   candidate styles** (the recommended default + the 1–2 next-best for the `product_type`) into
   `working/style-options.html` — the styled hero blocks stacked **side-by-side**, each labelled with its
   style name and bound to that style's token set. This reuses the same show-don't-ask render mechanism Phase
   3 uses for hero options (`reference/hero-archetypes.md` Phase-3 mechanism). The gallery stays the **full
   reference**; this rendered preview is the **decision surface** the user picks from.
3. **Recommend the default for the brief's `product_type`** (e.g. Dev tool → Dark developer tool; B2B SaaS
   → Clean minimal SaaS / Enterprise trust; Info-product → Bold playful illustration / Editorial;
   Consumer → Warm consumer lifestyle) — D5. The recommended style is rendered first in the preview.
4. **User picks one.** The pick's `id` selects the token set bound in Phase 5.

Gate (recommended = the product-type-default style, AUTO-PICKs non-interactively):

```
AskUserQuestion → "Which visual style? (live preview: working/style-options.html · full gallery: reference/style-gallery.html)"
  • "<product-type default style> (Recommended)"
  • "<style 2>"  • "<style 3>"  • "<style 4>"
```

(Present all 6 in the interactive prompt; the four shown here are illustrative.)

## Phase 4.5: Media strategy {#media-strategy}

Decide **how each signature moment is shown** before drafting — a static device-framed image, a carousel, or
a short video — so Phase 5 binds real media rather than prose (D6). The format menu, the capability detection,
the video pipeline, the degrade ladder, and the embed rules all live in `reference/media-strategy.md` — apply
it; do not restate it here (C2).

1. **Read the cached `media_caps`** from Phase 0 (`ffmpeg`, `headless_browser`). The available formats follow
   from them via `reference/media-strategy.md#degrade-ladder` — never re-detect.
2. **Per signature moment (and per page), pick a format.** Map each brief signature moment to a surface from
   the menu (`#format-menu`): **static device-framed image** (the default), **carousel**, or **video**. Video
   content is **captured from the real product** (Playwright `recordVideo` of an actual flow → ffmpeg
   trim/compress/poster), **never mocked or fabricated** (C3). Embeds are `data:` URI or page-folder-relative,
   **never remote** (C1).
3. **Gate — recommended = static device-framed** (the cheapest always-available format; it never blocks on a
   capture or a missing tool, so it AUTO-PICKs non-interactively without ever spawning a recording, C4):

   ```
   AskUserQuestion → "How should the signature moments be shown?"
     • "Static device-framed images (Recommended)"  — screenshots in device frames; no capture needed
     • "Carousel of stills"                          — multiple framed stills per moment
     • "Captured product video"                      — Playwright recordVideo → ffmpeg; needs the caps above
   ```

   Under `--non-interactive` the static default is taken and an Open Question logs which moments could be
   upgraded to video on a later interactive run. If a moment is chosen for video but `media_caps` can't
   support it, the **degrade ladder** (`#degrade-ladder`) picks the best available format and **logs** the
   downgrade — it never silently drops the moment.

## Phase 5: Draft the page {#draft}

Generate `index.html` in the page folder — the **single self-contained file** (D3). Grounded in
`02_design.html#output`.

1. **Bind the chosen style's token set** from `reference/style-tokens.json` as CSS custom properties in an
   inline `<style>` `:root` block. All color/type/spacing/radius/shadow come from the bound vars — do not
   introduce off-palette values. **Bias toward the host `DESIGN.md` when one exists (D10):** resolve it via
   `plugins/pmos-toolkit/skills/wireframes/reference/design-md-resolver.md` (the canonical resolver `/wireframes`
   and `/verify`'s drift-check share); if present, nudge the bound palette/spacing toward its brand tokens so
   the page reads as part of the host product rather than a generic theme. Absent → use the bundled style
   as-is. (Read-if-present; never required — cite, don't restate the resolver, C2.)
2. **Lay out the approved sections in order** (Phase 2 variant), with the **chosen hero verbatim** (Phase 3)
   as the first fold. **Bind the Phase 1.5 logo** (`#logo`): the resolved mark (text wordmark, sourced asset,
   or `/logo` SVG) in the **header**, and a **favicon** (`/logo` favicon variant or a derived one) as a
   `data:` URI or page-folder-relative `<link rel="icon">` — never remote (C1). (Multi-product: lay out per
   the chosen organizing principle — one section per product for a suite page, or emit one page per product +
   the hub for the product-index principle, per `reference/multi-product.md`.)
3. **Show the signature moments, don't just tell them (do>show>tell, D1).** Render each brief signature
   moment on the show-surface chosen in Phase 2 (`reference/section-scaffolds.md#governing-principles`) —
   rather than asserting the benefit in prose. The **strongest surface is an embedded real self-contained
   artifact** (iframe a real primer, embed a playable game) using the load-on-open `<details>` + `data-src`
   pattern, page-folder-relative and never remote (`section-scaffolds.md#governing-principles` — cite, don't
   restate); failing that, a screenshot / annotated shot / carousel / interactive snippet of that moment.
4. **Write real copy** grounded in the brief — apply the hero rules and the copy craft from
   `reference/copy-gates.md` as you write (litmus, Harry Dry 3-test, one isolated CTA, persona-calibrated
   vocabulary, benefits over self-praise, scannable blocks, place psychology levers deliberately by section).
5. **Use real assets only, at full fidelity (D7).** Bind screenshots/testimonials/metrics/logos from the
   brief's `reference/`, and the signature-moment media chosen in Phase 4.5 (`reference/media-strategy.md`).
   Apply the **asset-fidelity rules** (`reference/copy-gates.md#asset-fidelity`) as you place them — preserve
   native aspect ratio (`object-fit`, never stretch/skew), frame product shots in a device frame, and provide
   a mobile-appropriate crop/alt image for narrow viewports. For any asset the brief marks unknown, emit a
   **clearly-labelled placeholder** (e.g. a captioned grey block "screenshot: product dashboard — TODO"),
   never a fabricated proof point (D6).
6. **Bake the attribution footer (D11).** Every emitted `index.html` (and each per-product page) carries a
   small footer line **"Built with pmos-toolkit"** linking to the repo via the **`{{repo_url}}`** token
   convention (default `https://github.com/maneesh-dhabria/pmos-skills`, the same wordmark/footer token the
   shared `_shared/html-authoring/template.html` uses). This is **additive** to the section-12 footer — it
   does not displace the product's own trust/legal/secondary links.
7. **Self-contained constraints (D3):** inline CSS + vanilla JS only, **no CDN / no external fetch**; the
   page must open from `file://`. Embed small images as `data:` URIs or reference files inside the page
   folder.
8. **Bake the pmos artifact contract:** include `<meta name="pmos:skill" content="landing-page">` and the
   inline `<!-- pmos-comments:start -->` … `<script id="pmos-comments" type="application/json">[]</script>`
   … `<!-- pmos-comments:end -->` block (see repo CLAUDE.md "Inline doc comments") so the page is
   annotatable like any pmos artifact.

## Phase 6: Self-review before emit {#self-review}

Apply the gates and **revise in place before surfacing the page** (D10). All gates live in
`reference/copy-gates.md` — run them, do not restate them.

1. **Copy / conversion gates** (`reference/copy-gates.md`): Julian's litmus on the headline; Harry Dry's
   3-test on every headline/claim; the 6-criteria review; single-CTA / attention-ratio; clarity rules; the
   **persona-jargon rule** (`#persona-jargon-rule` — a novice persona rejects undefined domain jargon unless
   inline-defined); the **dev-tool hero-subhead rule** (`#dev-tool-hero-subhead` — when `product_type` is a dev tool,
   the hero subhead must name the buyer and the category in the headline region: a presence check that blocks
   if absent); the **do>show>tell show-ratio gate** (`#show-ratio` — a **HARD asset-gated binary-presence
   gate**: a page that makes feature claims with ≥1 capturable/embeddable surface available MUST show ≥1
   claimed feature, else it does **not emit**; explicit `N/A`+logged escape only when no asset can exist);
   psychology levers placed (not stacked); and the anti-pattern
   avoid-list (reject slogans, vague copy, bloated header, abstract stock imagery, unattributed testimonials,
   low-contrast CTA, wrong copy-length, and any fabricated metric/testimonial/logo). Fix violations in the
   draft.
2. **Visual self-check (D10)** — `reference/copy-gates.md#visual-self-check`: serve the page over
   `http://localhost` (Playwright cannot open `file://` in this repo) and load it; screenshot **desktop +
   mobile** into `working/`; run a reviewer pass (≤ 2-iteration fix loop, the `/wireframes` // `/prototype`
   pattern) confirming hero + single CTA + sections + style render correctly — no overflow, CTA visible
   above the fold, contrast holds — fixing issues in place. **Mobile is a hard pass dimension** (see the
   reference). The reviewer pass also runs the **value-coverage** check (`#value-coverage` — HARD structural
   for multi-product: the hero/overview fold must name **each** detected product with a distinct value line,
   else block) and the **asset-claim-match** check (`#asset-claim-match` — ADVISORY judgment: each embedded
   visual must depict what its caption names; surfaced loudly, never silent, does not block). **Grade against the shared design checklist, don't re-derive layout rules (D10):** apply the
   shared visual / responsive / contrast checklist that `/wireframes`, `/prototype`, and `/design-crit` all
   honour — `plugins/pmos-toolkit/skills/design-crit/reference/eval.md` (§V visual hierarchy, §G layout, §A
   WCAG-AA accessibility incl. the contrast + target-size subset) — rather than inventing a second set of
   layout rules here (cite, don't restate — C2).
   **Degraded fallback (no headless browser):** run the text gates + a structural-HTML check (hero, one
   primary CTA, approved sections in order, bound style tokens all present in the markup) and **log** the
   skipped visual pass to chat (never silent). See Platform Adaptation.
3. **Surface the result.** Tell the user where the page folder is (`brief.md`, `index.html`,
   `reference/`, `working/hero-options.html` + screenshots) and summarise the gate outcomes.

## Phase 7: Capture Learnings {#capture-learnings}

If anything in this run was surprising, repeated, or worth doing differently next time — a research
pattern that worked, a style that fit a product type unexpectedly well, a recurring gate violation —
append it under `## /landing-page` in `~/.pmos/learnings.md` (create the file/heading if absent). One
concise bullet per learning; skip if there is nothing worth recording.

## Anti-patterns

- **Drafting before approval.** Never skip the Phase 2 structure approval or the Phase 3 hero pick — they
  are where the user steers (D4/D2). Under `--non-interactive` they AUTO-PICK the recommended default and
  log an Open Question; they are not silently bypassed.
- **Hand-rolling a palette.** Always bind a bundled token set (Phase 4). Off-palette colors break the AA
  contrast guarantee that lives in the substrate.
- **CDN / external dependency.** The page must be one self-contained file that opens from `file://` (D3).
  No web fonts, analytics, or framework `<script src>`.
- **Fabricated proof.** No invented metrics, testimonials, or logos. Missing asset → labelled placeholder
  (D6).
- **Restating the references.** This body cites `reference/*`; it does not duplicate the taxonomy, hero
  rules, or gates (one fact, one home). Update the reference, not a second copy here.
- **Dropping the visual self-check silently.** When no headless browser is available, fall back to the
  text + structural check and **log** the skip (D10).
