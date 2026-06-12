# Audience presets + depth dial

## Contents

- [Audience presets](#audience-presets) — senior-pms / all-pms
- [Depth dial](#depth-dial) — brief / standard / deep
- [Audience × depth matrix](#audience--depth-matrix)
- [Anti-patterns](#anti-patterns)

Mirrors the `/primer` audience pattern (`primer/reference/audience-presets.md`) — same two presets, same one-preset-per-artifact rule. This file states the **book-summary deltas**: presets shape how much PM context each *takeaway* spells out (not an H2 section list — book-summary's structure is organic themes, per `reference/takeaway-contract.md`).

## Audience presets

Pick one per summary; do not mix within an artifact. Resolved in SKILL.md Phase 1.

### senior-pms (default)

Experienced PMs fluent in the PM dialect. Respect their time: no remedial definitions, lead with the non-obvious. In each takeaway's **concrete PM application**, assume fluency in PLG, ARR, RICE, activation, retention cohorts, north-star metrics, and similar staples — reference them without expanding. Define only a term genuinely narrower than common PM vocabulary, on first use.

### all-pms

PMs across all levels, including newcomers. Be inclusive and grounded: every term-of-art gets a 1-sentence inline definition on first use; expand acronyms before reusing them ("Annual Recurring Revenue (ARR)" then "ARR"). The **product decision** and **concrete PM application** parts spell out the product context so a PM in their first 6 months can follow end-to-end without opening another tab.

## Depth dial

`--depth` scales source fan-out, theme depth, and takeaway detail — **not** a hard cap on theme/takeaway counts (`reference/takeaway-contract.md` § "No caps"). Default `standard`; persisted per-project to `.pmos/book-summary.lastrun.yaml` after the first run (the `/primer` pattern).

| Depth | Fan-out & extraction |
|---|---|
| **brief** | Fewer channels, fewer sources per channel; the highest-importance themes only; tight takeaways. |
| **standard** (default) | Balanced fan-out across channels; the book's main themes with full five-part PM-lens takeaways. |
| **deep** | Wide fan-out across all channels; more corroboration; finer themes; richer applications + critiques. |

## Audience × depth matrix

Expected takeaway verbosity + vocab posture per combination:

| | brief | standard | deep |
|---|---|---|---|
| **senior-pms** | terse five-part takeaways; PM dialect assumed; non-obvious first | full five-part takeaways; PM dialect assumed | rich applications + author critiques; PM dialect assumed |
| **all-pms** | terse takeaways, terms still defined on first use | full takeaways; every term-of-art defined; product context spelled out | rich takeaways; every term defined; worked applications with context |

Across every cell the **five-part shape is mandatory** — depth and audience scale verbosity and vocab, never which parts appear.

## Anti-patterns

- **Do NOT mix presets within one summary.** Half-defining terms confuses both audiences — senior PMs find it patronising, newer PMs lose trust. Apply one preset consistently.
- **Do NOT add a third preset.** Only `senior-pms` and `all-pms` ship (deliberate non-goal, mirroring `/primer`).
- **Do NOT let depth cap themes.** `--depth brief` means *fewer high-importance themes surfaced*, not "truncate to N." Importance-ranking carries the "top" intent.
