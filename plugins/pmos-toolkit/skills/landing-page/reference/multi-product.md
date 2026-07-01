# Multi-product organizing principles

When the input is **not a single product** but a repo or plugin that ships several user-facing things, one
flat landing page mis-serves all of them. The `/landing-page` skill detects this at **Phase 1** and applies
an organizing principle at **Phase 2** (D9). Grounded in
[`02_design.html`](../../../../docs/pmos/features/2026-06-26_landing-page-enhancements/02_design.html) §2 (D9).
This file carries the detection heuristic + the three organizing principles; the SKILL.md body cites it.

## Contents

- [Detection heuristic](#detection-heuristic)
- [Per-product persona override](#per-product-persona-override)
- [The three organizing principles](#the-three-organizing-principles)
- [Non-interactive default](#non-interactive-default)

## Detection heuristic

At Phase 1, after researching the input, classify it as **single-product** or **multi-product**. It is
multi-product when the research surfaces **two or more distinct user-facing products** under one root:

- a **monorepo** with N user-facing apps (separate app dirs each with their own entrypoint / README /
  product identity — e.g. `apps/web`, `apps/mobile`, `apps/admin` that are genuinely different products,
  not one product's tiers);
- a **plugin / toolkit** exposing N user-facing skills or commands, each with its own value prop (this
  repo's own `plugins/<plugin>/skills/*` shape);
- a **brand / company** doc describing a portfolio of products rather than one.

It is **single-product** (the default — do not over-detect) when the parts are facets of **one** product:
multiple features, multiple pricing tiers, multiple platforms (web + iOS + Android) of the **same** app, or
internal packages that are not independently marketed. When unsure, treat as single-product and note the
ambiguity in the brief — a wrongly-split page is worse than a focused one.

Record the verdict in `brief.md` as `product_count: single | multi` with the detected product list (names +
one-line each) when multi.

## Per-product persona override

The global Phase 1 persona rule (`SKILL.md#research-brief` step 5, D2) selects **1–2 personas** for a single
product. **When `product_count: multi`, that cap is OVERRIDDEN:** each detected product gets **one primary
persona** of its own — with its **own jargon tolerance** (`novice` / `fluent`) and its **own signature
moments** — written as a **distinct brief slice**. The cap is a single-product rule; applying it across N
products is exactly the failure this overrides — a five-product toolkit collapsed into one "product builder"
persona undersells every product but the one the persona happens to fit.

So: single product → 1–2 personas (unchanged). N products → **N primary personas, one per product**, each in
its product's brief slice. This is a *precondition* for Phase 2, not a post-hoc note — Phase 2 may not run
until every detected product has its own slice (persona + jargon tolerance + signature moments). The brief
slices keep the one-fact-one-home discipline: each slice cites `copy-gates.md#persona-jargon-rule` for how its
persona calibrates copy, no rule restated per product.

## The three organizing principles

When multi-product, propose one of these (Phase 2 gate; the visitor/maintainer picks). Each detected product
gets its **own brief slice** — persona, signature moments, sections — not a shared one.

| Principle | Shape | Best when |
|---|---|---|
| **(a) Suite / overview page** | One page, **one section per product**, under a shared hero that sells the suite. Each product section is a compressed mini-page (value prop + one signature moment shown + a deep-link CTA). | The products are complementary and bought together; the *suite* is the story (e.g. an integrated toolkit). |
| **(b) Product-index / hub** | A thin hub page that **links to a per-product page** for each — the hub sells the umbrella + routes; each product gets a full single-product page of its own. | The products are independent, each deserves its own full page, and the audiences differ. |
| **(c) Single-focus** | **Pick the one most-prominent product** and build a normal single-product page for it; mention the others only as a footer/nav afterthought. | One product dominates, or the maintainer wants to ship one page now and others later. |

Principle (b) implies **N+1 outputs** (the hub + one page per product); (a) and (c) stay a single
`index.html`. Whichever is chosen, the per-product brief slices keep the one-fact-one-home discipline — each
slice cites the same references, no rule is restated per product.

## Non-interactive default

Under `--non-interactive`, the Phase 2 gate AUTO-PICKs **(c) single-focus on the single most-prominent
product** (the cheapest, always-valid choice — it never fans out into N pages unattended) and **logs an Open
Question** naming the other detected products so the maintainer can choose a suite/hub layout on a later
interactive run. "Most-prominent" = the product the research surfaced as the root identity (top-level README
headline, the repo/plugin name, the most-developed app) — recorded in the brief with its rationale.
