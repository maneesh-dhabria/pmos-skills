# Landing-page brief — pmos-skills

**Mode:** interactive (dogfood) · **Run Outcome:** clean · **Open Questions:** 0

Built by `/landing-page` (Phase 1, `#research-brief`) as the load-bearing dogfood for story 260624-pe2.
The "product" is **this repository** — the pmos-skills plugin marketplace for Claude Code. Every fact
below is cited to a source in the repo.

## Product

- **Name:** pmos-skills — *"A plugin marketplace that turns Claude Code into a product-delivery operating
  system."* — cited: `.claude-plugin/marketplace.json` (marketplace `name: pmos-skills`), repo `CLAUDE.md`
  "Plugin charters".
- **product_type:** **Dev tool** — a CLI/agent plugin marketplace installed into Claude Code; audience is
  technical (PMs and builders working in a terminal/agent). Drives the dark-developer-tool style + the
  dev-tool section scaffold (D5). — cited: `CLAUDE.md` "Canonical skill path", `pmos-gamekit` charter
  "launched from a skill via a zero-dependency local server".

## Audience

Product managers and builders who already work inside Claude Code and want an **opinionated, repeatable**
way to go from idea → shipped feature, to learn a topic from verified sources, and to keep their
environment healthy — without hand-rolling the process each time. — cited: `CLAUDE.md` plugin-charters
table.

## Core desire

Replace ad-hoc prompting with a **versioned pipeline**: requirements → spec → plan → execute → verify →
release, plus learning and utility skills, all installable and self-updating from one marketplace. —
cited: `CLAUDE.md` "pmos-toolkit … ship a feature … the delivery pipeline".

## What it is (the five plugins / the demo surface)

Source: `.claude-plugin/marketplace.json` + `plugins/` directory listing.

| Plugin | "Help me…" | Flagship |
|---|---|---|
| **pmos-toolkit** | ship a feature | `/feature-sdlc`, `/requirements`, `/spec`, `/plan`, `/execute`, `/verify`, `/complete-dev` |
| **pmos-learnkit** | learn a topic | `/primer`, `/learn-list`, `/magazine` |
| **pmos-utilities** | maintain my environment | `/mac-health`, `/reflect`, `/converter` |
| **pmos-gamekit** | play a casual game | `/solitaire`, `/flappy-bird`, `/2048`, `/sudoku` |
| **pmos-managerkit** | do manager work | `/interview-feedback` |

## Top objections (dev-tool — compressed, devs already get the "why")

1. *"Is it locked to one vendor?"* → MIT-licensed, plain Markdown skills, installs over standard Claude
   Code marketplaces. — cited: `CLAUDE.md` "Plugin marketplaces" + `plugin.json` manifests.
2. *"Will it bloat my setup?"* → each plugin versions independently; install only the kits you want. —
   cited: `CLAUDE.md` "Plugin manifest version sync" (independent semver tracks).
3. *"Is the process real or just prompts?"* → every skill is gated (skill-eval binary rubric, hygiene
   lints, non-interactive contract). — cited: `CLAUDE.md` "Skill-authoring conventions".

## Available proof (real — no fabrication, D6)

- **5 plugins, 50+ skills** shipped in-repo. — cited: `plugins/` + `.claude-plugin/marketplace.json`.
- **Independent semver per plugin** (e.g. pmos-toolkit 2.88.0, pmos-learnkit 0.29.0). — cited: recent
  release history in repo `CLAUDE.md` "Release policy".
- **No invented user counts, logos, or testimonials.** Where social proof would normally sit, the page
  uses a labelled placeholder (D6).

## Primary conversion action

**Install the marketplace** — copy the one-line `claude` marketplace-add command. Secondary: browse the
source on GitHub. — cited: standard Claude Code marketplace install flow.

## Visual tone

Dark, precise, terminal-adjacent; product-as-demo with real command/skill snippets; bento grid of the
five plugins. → **style: `dark-developer-tool`** (exemplars Vercel/Supabase). → **hero archetype B
(outcome + live demo)** — the product *is* the demo. — cited: `reference/hero-archetypes.md`,
`reference/style-tokens.md`.

## Decisions carried into the page

- **Sections (Phase 2, dev-tool variant):** Navbar → Hero → Adoption strip (placeholder) → *light* Problem
  → Solution/how-it-works (the pipeline) → Features-as-objection (the 5 plugins, bento) → Proof
  (real counts) → FAQ/objections → final CTA → Footer. Pricing omitted (free / OSS). — cited:
  `reference/section-scaffolds.md` "Dev tool" variant + governing equation.
- **Hero (Phase 3):** archetype B; headline names exactly what is sold (Julian litmus); one isolated
  first-person CTA "Install the marketplace". — cited: `reference/hero-archetypes.md` "Hero rules".
- **Style (Phase 4):** `dark-developer-tool` — bound from `reference/style-tokens.json` (AA-safe). — D1/D5.
