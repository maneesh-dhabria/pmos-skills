# techniques.md — supported ideation techniques

The 6 ideation techniques `/ideate` auto-picks from, with one prompt template each. The Frame-phase classifier (`idea-type-classifier.md`) maps idea-type to a default pair; the user can override.

## Contents

- [HMW riffs](#hmw-riffs)
- [SCAMPER](#scamper)
- [Crazy 8s (adapted)](#crazy-8s-adapted)
- [First Principles](#first-principles)
- [Analogous Inspiration](#analogous-inspiration)
- [Premortem-as-generator](#premortem-as-generator)
- [Inversion](#inversion)
- [Default pairs by idea-type](#default-pairs-by-idea-type)
- [Variant-quality rules](#variant-quality-rules)

## HMW riffs

"How Might We…" reframing. Take the framed HMW statement from Phase 1 and produce 6–10 *alternative HMWs* by varying scope, perspective, or constraint. Best as a co-technique (pairs with SCAMPER or First Principles) — rarely a sole technique.

**Prompt:** "The original HMW is: <HMW>. Produce 8 alternative HMWs that vary one dimension each: broader scope, narrower scope, different user, different constraint, different success signal, inverted goal, adjacent domain, time-shifted. Each ≤120 chars."

## SCAMPER

Substitute / Combine / Adapt / Modify (Magnify-Minify) / Put-to-other-uses / Eliminate / Reverse. Best fit for "improve / extend an existing thing". The 7 prompts map cleanly to 7 variants.

**Prompt:** "Apply SCAMPER to the framed idea. Produce 7 variants — one per letter — each a concrete one-liner ≤120 chars. Format: `S: <substitute idea>`, `C: <combine idea>`, etc. Skip a letter only if no plausible application exists."

**Why SCAMPER for `extend`:** the existing thing is the substrate; SCAMPER systematically varies it without inventing in a vacuum.

## Crazy 8s (adapted)

Google Design Sprint's "8 wildly different one-liners in 60 seconds" exercise — adapted for chat. Best for `new` ideas (when there's no substrate to vary). Produces breadth fast.

**Prompt:** "Generate 8 wildly different one-line concepts for the framed idea. Each ≤120 chars. Diversity beats polish — adjacent-impossible, contradictory, low-tech, no-tech, AI-maximalist, AI-minimalist all welcome. No two variants should rephrase the same underlying concept."

## First Principles

Strip the idea to physics/math/human-need primitives, then rebuild from there. Best paired with Crazy 8s for `new` ideas — First Principles produces depth, Crazy 8s produces breadth.

**Prompt:** "Decompose the framed idea into its 3–5 most fundamental primitives (what is the user actually trying to do, in the simplest terms? what physical/economic/cognitive constraint is being navigated?). Then generate 5 variants by recombining the primitives in non-default ways. Each variant ≤120 chars."

## Analogous Inspiration

How does industry X solve a structurally similar problem? LLMs are exceptionally good at this — pattern-match the framed problem against domains the user wasn't thinking about (logistics, gaming, biology, music, finance, urban planning, sports, manufacturing).

**Prompt:** "Name 4 domains far from the user's stated context that solve a structurally similar problem (similar shape: many-to-one routing, eventually-consistent state, scarcity allocation, attention bidding, etc.). For each domain, propose one variant transposing its solution shape onto the framed idea. Each ≤120 chars, format: `<domain>: <transposed idea>`."

**Why Analogous for `extend`:** cross-domain transfer surfaces angles in-domain peers have already exhausted.

## Premortem-as-generator

Not the same as the pressure-test battery premortem (which scores a chosen idea). As a generator, use the *failure-modes* of an existing thing as the seed for variants — best for `fix` ideas where the problem statement is "this is broken in way X".

**Prompt:** "The user describes the failure modes: <seed>. Generate 6 variants that each target a *different* root cause of the failure (not all paraphrases of the loudest cause). Each variant ≤120 chars."

## Inversion

Munger inversion as a generator (the pressure-test battery also uses it as a scorer). "What is the opposite of the framed idea?" then "what's interesting about the opposite?" Best paired with Premortem-as-generator for `fix` ideas.

**Prompt:** "State the framed idea in one sentence. State its conceptual opposite in one sentence. Then generate 4 variants that take the opposite seriously as a design direction — each ≤120 chars. Goal: surface the design space the user reflexively excluded."

## Default pairs by idea-type

| Idea-type | Auto-pick | Rationale |
|---|---|---|
| `new` | First Principles + Crazy 8s | Depth + breadth on a blank substrate |
| `extend` | SCAMPER + Analogous Inspiration | Systematic variation + cross-domain transfer of the existing thing |
| `fix` | Premortem-as-generator + Inversion | Root-cause hunting + "what guarantees recurrence?" |
| ambiguous | (disambiguate before picking) | Bad framing wastes both techniques |

Override is one-shot — the user names a different pair; the skill replaces the auto-pick and proceeds without further negotiation.

## Variant-quality rules

The Expand-phase output must satisfy:

1. **Count:** ≥8 and ≤15 distinct variants. Below 8: LLM over-convergence; the skill MUST regenerate. Above 15: decision fatigue at convergence; trim to the strongest 15 before presenting.
2. **Distinctness:** no two variants should be paraphrases of the same idea. A useful test: could a reasonable person pick variant A *because* it's not variant B? If no → merge them.
3. **Length:** each variant ≤120 chars. Variants longer than that compress poorly into the artifact's "Idea variants considered" section.
4. **Concreteness:** each variant names a specific shape ("a Slack bot that…", "a CLI that…", "a weekly digest…"). Abstract variants ("better collaboration") are not variants — they're values.
5. **Format:** plain numbered list in chat, with one-line rationale only when non-obvious. The artifact's "Idea variants considered" section captures the final flagged set.

## Techniques the skill deliberately does NOT support

- **Six Thinking Hats** — ceremonial; LLM "switching hats" is cosplay, not signal.
- **Disney Method (Dreamer / Realist / Critic)** — overlapping with the 3-phase loop, redundant.
- **6-3-5 Brainwriting** — requires 6 people passing paper; no single-user analog.
- **Reverse Brainstorming / Worst Possible Idea** — subsumed by Inversion; no incremental value.
- **Red Team as a separate role** — overlaps `/grill`; producing one adversarial mode here is enough.

Adding new techniques is a deliberate evolution of this file — not an in-skill improvisation.
