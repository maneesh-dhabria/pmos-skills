# idea-type-classifier.md — seed → idea-type rules

Classify the seed into one of `new` / `extend` / `fix` / ambiguous. First-match-wins on the ordered rules below. Drives the Expand phase's auto-pick of technique pair.

## Rules (first-match-wins)

| # | Pattern (case-insensitive regex on seed) | Type |
|---|---|---|
| 1 | `\b(fix|broken|bug|wrong|painful|complain(t|s|ing)?|hate|frustrat|users? (are |get )stuck)\b` | `fix` |
| 2 | `\b(improve|enhance|better|extend|add to|build on|on top of|update|polish)\b` | `extend` |
| 3 | `\b(new|build|invent|create|launch|introduc|what if we|imagine if|ship a|design a|propose a|brand[- ]new)\b` | `new` |
| 4 | (matches none of the above OR matches multiple top-level frames) | ambiguous |

The order matters. A seed that contains both "fix" and "new" (e.g., "fix the onboarding by building a new flow") classifies as `fix` because rule 1 fires first — the *primary motivation* is the broken thing, not the green-field framing.

## Disambiguation prompt (ambiguous case)

When rule 4 fires, emit one `AskUserQuestion`:

```
question: "How would you describe this idea?"
options:
  - Building something new (Recommended if the seed mentions invention/creation)
    description: A from-scratch concept. Picks First Principles + Crazy 8s.
  - Improving / extending something that exists
    description: Variation on a substrate. Picks SCAMPER + Analogous Inspiration.
  - Fixing something broken
    description: Root-cause-driven. Picks Premortem-as-generator + Inversion.
```

The recommended option is computed by counting which rule had the *most* near-misses (e.g., the seed contains "redesign" → close to both `extend` and `fix`; pick `extend` as Recommended because "redesign" implies a substrate exists). If no near-miss signal, the Recommended falls back to `new` (the most common single-skill case).

## Override

After auto-pick, the Frame-phase announce-line lets the user override the technique pair directly:

```
Using SCAMPER + Analogous Inspiration because this looks like an extension — override?
```

User can reply with any of: `"ok"` / `"continue"` / no reply (accept), `"use X instead"` (replace one technique), `"use X + Y"` (replace both), `"reclassify as <type>"` (re-classify and re-pick). Conversational handling — no structured ask, no chain of prompts.

## Examples

| Seed | Match | Type | Default pair |
|---|---|---|---|
| "fix our slow onboarding" | rule 1 (`fix`, `slow` proxies) | `fix` | Premortem-as-generator + Inversion |
| "improve the dashboard for power users" | rule 2 (`improve`) | `extend` | SCAMPER + Analogous |
| "what if we tracked decisions like commits" | rule 3 (`what if we`) | `new` | First Principles + Crazy 8s |
| "users complain about settings being hard to find" | rule 1 (`complain`, `hard`) | `fix` | Premortem + Inversion |
| "a tool for team rituals" | rule 4 (no signal) | ambiguous | (ask) |
| "redesign the export flow" | rule 4 (no rule matches `redesign` alone), but near-miss on rule 2 | ambiguous | (ask, Recommended: extend) |

## Why first-match-wins (not best-match-wins)

The user typed the seed in a particular order. The earliest-firing rule reflects the *load-bearing word* — "fix the onboarding by building a new flow" puts `fix` first because that's the motivation. A best-match scorer could pick `new` here, leading the Expand phase to ignore the existing onboarding entirely. First-match-wins is opinionated but predictable.
