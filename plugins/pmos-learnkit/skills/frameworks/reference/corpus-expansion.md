# Growing the corpus — research process + entry-authoring contract

**Audience:** the `/frameworks` skill maintainer. The single documented way to grow the
shipped corpus (`data/frameworks.json` + `data/diagrams/*.svg`), maintained by **direct
authoring** — no Notion sync, no import, no network. Covers both halves: **what belongs
in the corpus** (the research process) and **how to author one entry** (the field +
SVG contract). The record schema is owned by `reference/corpus-schema.md` and enforced
by `validate-corpus.mjs`; where this doc and the schema disagree, the schema wins. A
complete addition = **one JSON record** + **one owned SVG**, validated green before ship.

## Contents

- [When to grow the corpus](#when-to-grow-the-corpus)
- [Scope & the bar](#scope--the-bar)
- [Build the de-dupe inventory](#build-the-de-dupe-inventory)
- [Domain fan-out (research)](#domain-fan-out-research)
- [Candidate output contract](#candidate-output-contract)
- [Synthesis & curation](#synthesis--curation)
- [Authoring a record — field by field](#authoring-a-record--field-by-field)
- [The closed problem_tags registry](#the-closed-problem_tags-registry)
- [The decision_type enum](#the-decision_type-enum)
- [body_md house style](#body_md-house-style)
- [The owned SVG diagram](#the-owned-svg-diagram)
- [Validate before shipping](#validate-before-shipping)
- [Definition of done](#definition-of-done)
- [Anti-patterns](#anti-patterns)

---

## When to grow the corpus

- Quarterly, or whenever you sense whitespace (a discipline like AI-PM matures; a new
  durable framework gains broad adoption).
- It is **additive discovery only** — never edits or removes existing records as a side
  effect. The research half produces a *candidate set* you curate; the authoring half
  turns each accepted candidate into a record + SVG.

## Scope & the bar

Before any research, lock scope. The knobs that matter (with the defaults that produced
the corpus to date):

| Knob | Options | Default |
|---|---|---|
| **Search width** | gaps-in-existing-categories · gaps + adjacent whitespace · everything-defensible | gaps + adjacent whitespace |
| **Bar** | named-&-canonical · all-PMs-useful · not-a-near-duplicate · emerging-OK | all four ON |
| **Volume** | tight (~15) · moderate (~30) · generous (~50) · no-cap-quality-gated | no-cap, quality-gated |
| **Exclusions** | no-pure-concepts · no-deep-finance/eng · no-region/industry-niche | all three ON |
| **Audience** | all-PMs · senior-PMs | all-PMs |

**The bar every candidate must clear (all of):**
1. **Named & canonical** *or* respected-emerging — a clear originator/author and a
   citable reference (book, HBR/paper, well-known essay). Emerging (≤5 yrs) allowed only
   if widely respected.
2. **All-PMs useful** — a working PM (incl. early-career) would actually reach for it on
   a real decision. Not trivia.
3. **Not a near-duplicate** — materially different from every existing entry; the closest
   existing entry must be named and the difference stated in one line.
4. **An actual framework / model / mental-model** — not a standalone concept or a bare
   metric definition (the corpus carries a few intentional concept entries, but the
   default is to reject them).
5. **Broadly applicable** — no deep-finance ratios, no software-engineering internals, no
   single-industry/geography niche.

## Build the de-dupe inventory

Always seed research with the **full current inventory** so you can't re-propose what
exists. Generate a flat name+alias list from the shipped corpus:

```bash
node -e '
const fs=require("fs");
const arr=JSON.parse(fs.readFileSync("data/frameworks.json","utf8"));
const rows=arr.map(f=>f.name.replace(/<br>/g,"").trim()+(f.aliases&&f.aliases.length?"  [aka: "+f.aliases.join(", ")+"]":""));
fs.writeFileSync("/tmp/fw_inventory.txt", rows.sort().join("\n"));
console.log("wrote",rows.length,"names");
'
```

> **Check aliases, not just names.** Frameworks already live in the corpus *as aliases*
> of others (e.g. `B=MAP`/`Fogg Behavior Model` under `Tiny Habits`; the Sean Ellis 40%
> test under `Superhuman PMF Engine`). Before finalizing any candidate, grep the corpus
> body too:
> ```bash
> node -e 'const a=require("./data/frameworks.json");const q=process.argv[1].toLowerCase();
> console.log(a.filter(f=>((f.name+" "+(f.aliases||[]).join(" ")+" "+f.summary+" "+f.body_md).toLowerCase()).includes(q)).map(f=>f.name))' "<candidate keyword>"
> ```

## Domain fan-out (research)

Partition PM craft into ~8 domains and research **one domain at a time, or one subagent
per domain in parallel**. A workable partition (reuse or adapt):

1. Strategy, Competition & Business Models
2. Product Discovery, User Research & Experimentation
3. Prioritization, Roadmapping & Decision-Making
4. Metrics, Growth & Analytics
5. Product Design & UX (incl. the Laws of UX canon)
6. Behavioral Psychology, Motivation & Persuasion
7. Leadership, Communication, Teams, Stakeholders & PM Career
8. Pricing/Monetization, PMF & AI/LLM-era Product Management (adjacent whitespace)

**Each research pass must:**
- Read `/tmp/fw_inventory.txt` first and never propose anything on it.
- Apply the full bar (above) and the exclusions.
- **Verify authorship/citations via web search**, not memory.
- Emit the strict output contract below.

**Operational notes (learned the hard way):**
- Web-research subagents **die silently on transient rate-limits** (return 0 tokens).
  Detect a completed agent with no usable output and **relaunch** that single domain;
  pace web calls and retry on 429.
- Expect **cross-domain duplicates** (Cynefin surfaced from 3 of 8 agents; OODA/Peak-End
  from 2). Repeated independent discovery is a strong signal — but dedupe at synthesis.
- For a robust run at scale, prefer a concurrency-capped **Workflow** (auto-retry +
  bounded parallelism) over raw parallel agents.

## Candidate output contract

```
### <Framework name>
- **What it is:** 2–3 lines.
- **Author / originator:** name(s).
- **Canonical reference:** title + year (+ URL).
- **Closest existing entry & why this is different:** one line (names a real inventory entry).
- **Why it belongs (all-PMs):** 1–2 lines.
```

Plus a transparent **"deliberately excluded"** list per domain (what was tempting but
rejected, and why) — this is how you audit that the bar held.

## Synthesis & curation

1. **Dedupe across domains** — collapse repeats to one entry; note the multi-agent signal.
2. **Alias/body re-check** — run the grep above for every survivor against the corpus.
   Drop anything already aliased.
3. **Tier** — split into **Tier 1** (broadly all-PMs) and **Tier 2** (canonical but
   specialist/enterprise/academic). Fold specialist micro-methods under an existing
   umbrella entry (e.g. SUS/SEQ/card-sorting under `UX Research Methods`) rather than
   adding them standalone.
4. **Flag citation risk** — mark any emerging/blog/VC-sourced entry as "verify URL
   before publishing," and click through before authoring.
5. **Decide the set** to author.

---

## Authoring a record — field by field

Each accepted candidate becomes one record. Only `id`, `name`, `category`, `body_md` are
strictly required, but a quality entry fills nearly everything. The authoritative shape
+ validation rules live in `reference/corpus-schema.md`; this is the authoring recipe.

```json
{
  "id": "<category-slug>/<name-slug>",
  "name": "Cynefin Framework",
  "aliases": ["Cynefin"],
  "category": "Decision Making",
  "category_code": "2.4.4",
  "super_category": "People, Personal & Career",
  "summary": "≤160-char plain-words one-liner of what it is.",
  "body_md": "- bullet prose …",
  "references": [{"type": "Article", "url": "https://hbr.org/..."}],
  "author": "Dave Snowden",
  "commentary": null,
  "diagram": "data/diagrams/decision-making__cynefin-framework.svg",
  "diagrams": ["data/diagrams/decision-making__cynefin-framework.svg"],
  "diagram_anchors": ["<≥40-char verbatim substring of body_md>"],
  "source_url": null,
  "last_synced": "2026-06-18",
  "problem_tags": ["decision-making", "high-stakes"],
  "when_to_use": "≤1 sentence.",
  "when_not_to_use": "≤1 sentence.",
  "decision_type": "decide",
  "lifecycle_stage": ["any"],
  "related": ["decision-making/one-way-vs-two-way-doors"]
}
```

- **`id`** = `<category-slug>/<name-slug>`, both kebab-cased ASCII (lowercase, spaces→`-`,
  punctuation dropped). **Stable** — the same framework always yields the same id. The
  diagram filename flattens `/`→`__`.
- **`name`** — canonical name, verbatim. **Required.**
- **`aliases`** — other names it goes by (`[]` if none). **Use this to absorb close
  variants** instead of creating a second entry (e.g. `Tiny Habits` carries `B=MAP`,
  `Fogg Behavior Model`).
- **`category`** — exactly one of the 22 existing categories (do **not** invent new ones
  without sign-off). Pick by primary cognitive job; it drives `category_code` +
  `super_category`:

  | code | super_category | categories |
  |---|---|---|
  | 2.1.1–2.1.5 | Strategy & Business | Business Model · Product Market Fit · Business Strategy · Pricing and Monetization · Industry Specific |
  | 2.2.1–2.2.6 | Product | Product Discovery and Delivery · Behavioral Psychology · Product Strategy and Roadmap · Feature Prioritization · Goal Setting · Metrics |
  | 2.3.1–2.3.5 | Analytics, Design & Finance | Product Design · Technology and Software Engineering · Analytics · Marketing and Sales · Finance |
  | 2.4.1–2.4.6 | People, Personal & Career | Personal Skills & General PM · PM Evaluation and Career Ladder · Task Management · Decision Making · Stakeholder Management · Communication and Leadership |

- **`summary`** — ≤160 chars, plain words. Pattern: *"<Originator>'s <shape>: <what it
  does>."*
- **`body_md`** — the heart of the entry. See [body_md house style](#body_md-house-style). **Required.**
- **`references`** — array of `{type, url}` (`type` ∈ `Article`, `E-Book`, `Video`,
  `Paper`, `HBR`…). A quality entry has ≥1.
- **`author`** — originator string, or `null` if genuinely diffuse/institutional.
- **`commentary`** — the curator's first-person "PM's take." **Leave it `null` when
  drafting** — the curator writes it personally so the library keeps one authentic voice.
- **`diagram` / `diagrams` / `diagram_anchors`** — see [the owned SVG](#the-owned-svg-diagram).
  `diagrams` is `[primary, ...extras]`; `diagram_anchors` runs **parallel and
  equal-length** to it; each non-null anchor is a **≥40-char verbatim substring of this
  record's `body_md`**.
- **`source_url`** — link to the framework's reference material, or `null`.
- **`last_synced`** — ISO date `YYYY-MM-DD` the record was authored or last revised.
- **`problem_tags`** — 2–4 from the [closed registry](#the-closed-problem_tags-registry).
  These weight matching ×3 — choose what a stuck PM would actually describe. Invalid tags
  fail validation.
- **`when_to_use` / `when_not_to_use`** — ≤1 sentence each; `when_not_to_use` is a real
  limitation, not a throwaway.
- **`decision_type`** — exactly one of the [enum](#the-decision_type-enum), by primary job.
- **`lifecycle_stage`** — subset of `discovery · definition · delivery · growth · any`.
- **`related`** — array of existing corpus `id`s (validated — no danglers).

### The closed problem_tags registry

The single source of truth is `data/situations.json :: problem_tags` (currently 48 tags);
validate against it, never against this copy. As of this writing:

```
business-model · product-market-fit · market-sizing · pricing · monetization · positioning ·
competitive-strategy · go-to-market · industry-analysis · moat-defensibility · product-discovery ·
product-delivery · behavioral-psychology · product-strategy · roadmap · prioritization · goal-setting ·
north-star-metric · metrics · experimentation · user-research · feature-adoption · user-satisfaction ·
product-design · ux-design · usability · technical-architecture · analytics · funnel-analysis ·
retention · activation · growth · marketing · sales · finance · unit-economics · personal-productivity ·
career-growth · pm-evaluation · task-management · decision-making · irreversible-decision · high-stakes ·
estimation · stakeholder-alignment · communication · leadership · team-health
```

Growing the vocabulary is a deliberate edit to `data/situations.json`, then a re-validate
(see `reference/situation-taxonomy.md`).

### The decision_type enum

| value | the job | examples |
|---|---|---|
| `prioritize` | rank & sequence what to work on | RICE, MoSCoW, Kano |
| `decide` | commit to a choice under uncertainty | regret-min, one-way doors |
| `diagnose` | analyze data, measure, find root cause | funnel/cohort analysis, 5 Whys |
| `estimate` | size & forecast the unknown | TAM, Fermi |
| `strategize` | set direction, position, model the business | Porter, Wardley, pricing |
| `design` | shape the product, UX, or an experiment | UX laws, experiment design, discovery methods |
| `communicate` | align stakeholders, persuade, lead | RACI, stakeholder mapping |
| `frame` | apply a mental model / lens | JTBD, behavioral lenses |
| `n/a` | residual only (target <3%) | — |

> **Distribution gate:** `validate-corpus.mjs` exits 1 if any single `decision_type`
> exceeds 30% of the corpus, or if `n/a` > 5%. When adding many entries at once, watch the
> mix — don't dump everything into `strategize`, `design`, or `frame` (those are already
> the largest buckets).

### body_md house style

- **Markdown bullet list**, not prose paragraphs. Top-level `- ` bullets; nested
  sub-bullets with tab indentation; `**bold**` for the named parts/phases.
- **First bullet = a one-sentence definition** of the framework (this is usually what
  `diagram_anchors[0]` points at, and what `summary` compresses).
- Then the **components/steps/phases**, each a bold-led bullet with a short gloss.
- Then **concrete examples** (named products/companies) — the corpus leans on worked
  examples; include 1–3.
- Preserve unicode (`×` `÷` curly quotes) verbatim — anchors must substring-match.
- Numbered lists (`1.` `2.`) are fine for sequential steps. Keep it tight (~150–400
  words); teach the mechanic, no marketing fluff.

**Worked skeleton:**
```
- <One-sentence definition of the framework — who popularized it, what it does>.
- There are <N> <parts/phases/steps>:
	- **<Part 1>:** <gloss>.
	- **<Part 2>:** <gloss>.
		- **<sub-part>:** <gloss>.
- How to apply it:
	1. <step>
	2. <step>
- Examples:
	- **<Product/Company>:** <how it uses the framework>.
```

### The owned SVG diagram

One **owned, self-contained SVG** per framework, authored directly (the `/diagram` skill
is for one-off hero diagrams; corpus diagrams are authored inline to this spec). It
renders on a **white** library card.

**Hard rules**
- Root: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" role="img" aria-label="<Name> diagram">`. **No `width`/`height`** (responsive).
- First child: a white background `<rect width="640" height="400" fill="#ffffff"/>`.
- **Self-contained:** inline shapes + `<text>` only. **No `<image>`, no `http(s)` refs, no
  `amazonaws.com`.** Target < 40 KB (most are 2–6 KB).
- Title (the framework name) at top; a one-line subtitle helps; legible labels on every
  part. Must read at thumbnail size.
- Write to `data/diagrams/<id-flattened>.svg` (`/`→`__`).

**Palette (stick to it — keeps every diagram one family)**

| role | hex |
|---|---|
| background | `#ffffff` (or panel tint `#f4f7ff`) |
| ink (primary text) | `#1d2438` |
| muted (secondary text) | `#5b6680` |
| accent (primary) | `#2563eb` |
| secondary accents | `#0ea5a4` (teal) · `#f59e0b` (amber) · `#ef4444` (red) |
| typeface | `font-family="sans-serif"` throughout |

**Pick the structural archetype that fits** (don't force a box list): 2×2 matrix · funnel
· pyramid · cycle/loop · flow / decision tree · staged ladder · Venn · list-with-icon-rows
· gauge/scale · panel comparison. Map the framework's shape to it: a reversibility lens →
two side-by-side panels; a maturity model → a staged ladder; a loop (Hooked, OODA) → a
cycle; a portfolio model (BCG) → a 2×2; a layered model (PMF Pyramid, 5 Planes) → a
pyramid; a sense-making model (Cynefin) → quadrants.

**Reference SVG (the house style — `One-Way vs Two-Way Doors`, a two-panel comparison):**
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" role="img" aria-label="One-Way Vs. Two-Way Doors diagram">
  <rect width="640" height="400" fill="#ffffff"/>
  <text x="320" y="34" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="700" fill="#1d2438">One-Way vs. Two-Way Doors</text>
  <text x="320" y="56" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#5b6680">Match the decision process to its reversibility</text>
  <rect x="40" y="80" width="265" height="285" rx="12" fill="#f4f7ff" stroke="#0ea5a4" stroke-width="2"/>
  <text x="172" y="110" text-anchor="middle" font-family="sans-serif" font-size="17" font-weight="700" fill="#0ea5a4">Two-Way Door</text>
  <text x="172" y="130" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#5b6680">Reversible · low consequence</text>
  <text x="172" y="303" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#1d2438">Decide fast — light process</text>
  <rect x="335" y="80" width="265" height="285" rx="12" fill="#f4f7ff" stroke="#ef4444" stroke-width="2"/>
  <text x="467" y="110" text-anchor="middle" font-family="sans-serif" font-size="17" font-weight="700" fill="#ef4444">One-Way Door</text>
  <text x="467" y="130" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#5b6680">Irreversible · high consequence</text>
  <text x="467" y="303" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#1d2438">Deliberate carefully</text>
</svg>
```

**The `diagram_anchors` link** — after the SVG is authored, set `diagram_anchors[0]` to a
**≥40-char verbatim substring of `body_md`** (usually the first defining bullet). The
library renders the SVG immediately after that block. `null` → falls back to top-of-body
(never broken). `diagram_anchors.length` must equal `diagrams.length`.

## Validate before shipping

After appending records + writing SVGs into `data/frameworks.json` + `data/diagrams/`:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/validate-corpus.mjs data/frameworks.json data/situations.json
node ${CLAUDE_SKILL_DIR}/scripts/build-library.mjs --out <docs>/frameworks/index.html
```

Gates that must be green: every `problem_tags` ⊆ registry · every `decision_type` ∈ enum ·
distribution gate (no value > 30%, `n/a` ≤ 5%) · every `diagram_anchors` present,
length-matched, and substring-valid · `related` ids resolve · ≥95% name+body+references
coverage · 100% diagram coverage (or a logged `ship-with-warning`).

## Definition of done

- A candidate set in the output contract above — tiered, citation-risk flagged, with a
  transparent exclusions list.
- Zero candidates that collide with an existing name **or alias**.
- Each accepted candidate authored as a record + SVG that passes `validate-corpus.mjs`
  (enum / tag / anchor / coverage / distribution gates green).
- `build-library.mjs` regenerated and spot-checked offline from `file://`.

## Anti-patterns

- **DON'T propose past the confidence bar to hit a number** — no-cap means quality-gated,
  not padded.
- **DON'T skip the alias/body grep** — names alone miss already-covered frameworks.
- **DON'T add specialist micro-tools as standalone entries** when an umbrella entry covers
  them — it bloats the corpus and hurts matching.
- **DON'T trust agent-supplied citations for emerging frameworks** — click through before
  authoring.
- **DON'T author `commentary` in the drafting step** — leave it `null` for the curator's
  voice.
- **DON'T hot-link external images** in a diagram — owned, self-contained SVG only.
