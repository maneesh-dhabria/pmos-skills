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
| `reference/section-scaffolds.md` | governing equation + 11-row taxonomy + 4 product-type variants + copy-length rule | Phase 2 |
| `reference/hero-archetypes.md` | hero elements + 4 archetypes + 5 enforced hero rules | Phase 3 |
| `reference/style-tokens.json` + `reference/style-tokens.md` | 6 frozen, contrast-safe theme-token sets | Phase 4 |
| `reference/style-gallery.html` | offline swatch gallery of all 6 styles | Phase 4 |
| `reference/copy-gates.md` | Julian litmus + Harry Dry 3-test + 6-criteria + single-CTA + psychology levers + anti-patterns + visual self-check | Phase 6 |

## Overview

```
Phase 0  setup + load learnings + resolve input
Phase 1  research → cited brief.md          (#research-brief)   — confirm with user
Phase 2  propose section structure          (#propose-structure) — GATE: approve  (D4)
Phase 3  explore 2–3 rendered hero folds    (#hero-explore)      — GATE: pick     (D2)
Phase 4  pick visual style from the gallery (#style-pick)        — GATE: pick     (D1)
Phase 5  draft the self-contained page      (#draft)
Phase 6  self-review (copy gates + visual)  (#self-review)       — revise in place (D10)
Phase 7  capture learnings                  (#capture-learnings)
```

The three gates (Phases 2/3/4) are where the user steers. Under `--non-interactive` each AUTO-PICKs its
`(Recommended)` option (the product-type-driven default, D5) and logs an Open Question — see the inline
contract block in Phase 0.

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
4. **Write `brief.md`** in the page folder — a cited brief capturing: product name + one-line definition,
   `product_type` ∈ {B2B SaaS, Consumer app, Dev tool, Info-product} (drives every downstream default,
   D5), target audience, the core desire, the top objections, available proof, the primary conversion
   action, and the visual tone. **Cite each fact** back to its source file/line. **Missing fields are
   asked, never invented** (D6) — list unknowns explicitly in the brief and (interactive) ask, or
   (non-interactive) leave a clearly-labelled `TODO:` placeholder and log an Open Question.
5. **Confirm the brief with the user** before proceeding (interactive). Adjust on feedback. This is the
   foundation the rest of the page is built on, so it is worth a beat.

<!-- defer-only: free-form -->
Brief confirmation is a free-form review, not a fixed-option pick — present the brief and invite edits;
under `--non-interactive` proceed with the brief as written and log it as an Open Question.

## Phase 2: Propose the section structure {#propose-structure}

**Always propose + get approval before drafting (D4).** Grounded in `02_design.html#section-taxonomy`;
the taxonomy, the product-type variants, the governing equation, and the copy-length rule all live in
`reference/section-scaffolds.md` — read it and apply it; do not restate it here.

1. Start from the **product-type variant** matching the brief's `product_type` (the reference's
   "Product-type variants" section).
2. Filter every candidate row through the **governing equation** `Purchase Rate = Desire − (Labor +
   Confusion)` — a section earns its place only if it adds desire or removes labor/confusion. Cut the rest.
3. Set copy length from the **copy-length rule** (free → short, paid → longer as price rises).
4. **Present the proposed ordered section list** to the user with a one-line purpose per section and ask
   for approval / edits before any drafting.

Gate (the recommended option is the product-type-default scaffold, so it AUTO-PICKs non-interactively):

```
AskUserQuestion → "Approve this section structure for the page?"
  • "Use the proposed structure (Recommended)" — the product-type scaffold above, equation-filtered
  • "Adjust sections" — add/remove/reorder (free-form follow-up)
```

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
2. **Recommend the default for the brief's `product_type`** (e.g. Dev tool → Dark developer tool; B2B SaaS
   → Clean minimal SaaS / Enterprise trust; Info-product → Bold playful illustration / Editorial;
   Consumer → Warm consumer lifestyle) — D5.
3. **User picks one.** The pick's `id` selects the token set bound in Phase 5.

Gate (recommended = the product-type-default style, AUTO-PICKs non-interactively):

```
AskUserQuestion → "Which visual style? (preview: reference/style-gallery.html)"
  • "<product-type default style> (Recommended)"
  • "<style 2>"  • "<style 3>"  • "<style 4>"
```

(Present all 6 in the interactive prompt; the four shown here are illustrative.)

## Phase 5: Draft the page {#draft}

Generate `index.html` in the page folder — the **single self-contained file** (D3). Grounded in
`02_design.html#output`.

1. **Bind the chosen style's token set** from `reference/style-tokens.json` as CSS custom properties in an
   inline `<style>` `:root` block. All color/type/spacing/radius/shadow come from the bound vars — do not
   introduce off-palette values.
2. **Lay out the approved sections in order** (Phase 2), with the **chosen hero verbatim** (Phase 3) as
   the first fold.
3. **Write real copy** grounded in the brief — apply the hero rules and the copy craft from
   `reference/copy-gates.md` as you write (litmus, Harry Dry 3-test, one isolated CTA, benefits over
   self-praise, scannable blocks, place psychology levers deliberately by section).
4. **Use real assets only.** Bind screenshots/testimonials/metrics/logos from the brief's `reference/`. For
   any asset the brief marks unknown, emit a **clearly-labelled placeholder** (e.g. a captioned grey block
   "screenshot: product dashboard — TODO"), never a fabricated proof point (D6).
5. **Self-contained constraints (D3):** inline CSS + vanilla JS only, **no CDN / no external fetch**; the
   page must open from `file://`. Embed small images as `data:` URIs or reference files inside the page
   folder.
6. **Bake the pmos artifact contract:** include `<meta name="pmos:skill" content="landing-page">` and the
   inline `<!-- pmos-comments:start -->` … `<script id="pmos-comments" type="application/json">[]</script>`
   … `<!-- pmos-comments:end -->` block (see repo CLAUDE.md "Inline doc comments") so the page is
   annotatable like any pmos artifact.

## Phase 6: Self-review before emit {#self-review}

Apply the gates and **revise in place before surfacing the page** (D10). All gates live in
`reference/copy-gates.md` — run them, do not restate them.

1. **Copy / conversion gates** (`reference/copy-gates.md`): Julian's litmus on the headline; Harry Dry's
   3-test on every headline/claim; the 6-criteria review; single-CTA / attention-ratio; clarity rules;
   psychology levers placed (not stacked); and the anti-pattern avoid-list (reject slogans, vague copy,
   bloated header, abstract stock imagery, unattributed testimonials, low-contrast CTA, wrong copy-length,
   and any fabricated metric/testimonial/logo). Fix violations in the draft.
2. **Visual self-check (D10)** — `reference/copy-gates.md#visual-self-check`: serve the page over
   `http://localhost` (Playwright cannot open `file://` in this repo) and load it; screenshot **desktop +
   mobile** into `working/`; run a reviewer pass (≤ 2-iteration fix loop, the `/wireframes` // `/prototype`
   pattern) confirming hero + single CTA + sections + style render correctly — no overflow, CTA visible
   above the fold, contrast holds — fixing issues in place.
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
