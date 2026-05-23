# Audience presets

Two audience presets. Pick one per primer; do not mix within a single artifact. The /primer skill's Phase 1 resolves the audience from `--audience <senior-pms|all-pms>` or, when the flag is absent, via an interactive AskUserQuestion prompt (Recommended = `senior-pms`). Once resolved, the chosen preset governs the H2 section list the Draft phase emits, the vocabulary posture the prose adopts, and the closing-shape the reviewer enforces.

## senior-pms

For experienced PMs who already speak the PM dialect fluently. The primer should respect their time and intelligence — no remedial definitions, no over-explaining basics, no hedging into a 101 framing. Their value comes from sharpening intuition and surfacing what's contested, not from terminology hand-holding.

**Required H2 sections (≥3 named):**

- `## What this is` — tight framing of the topic in 1–2 paragraphs; assume the reader can fill in adjacent context.
- `## Why it matters now` — what's changed in the landscape, market, or tooling that makes this worth their attention this quarter.
- `## Open debates / things to watch` — the live disagreements, unresolved questions, and forks-in-the-road practitioners are arguing about.
- `## Where to dig deeper` — 3–7 high-signal sources (essays, papers, talks, repos) for the reader who wants to go further.

A primer MAY add 1–2 additional H2s (e.g., `## How the smart teams are using it`) when the topic warrants, but the four above are the floor.

**Vocab posture:**

No inline definitions of common PM concepts. The reader is assumed fluent in PLG, ARR, NPS, OKRs, RICE, CAC, LTV, CSAT, activation, retention cohorts, north-star metrics, and similar staples. Define only terms specific to the topic on first use — and only when the term is genuinely narrower than the common PM vocabulary (e.g., `RFM`, `NDR`, a vendor-specific framework, a niche academic construct). When in doubt, omit the definition; senior PMs would rather look up a word than read a definition they didn't need.

**Closing-shape:**

Open debates / questions for further reading — explicitly leave threads unresolved. The primer ends by naming what's still contested and pointing at sources, not by issuing a checklist. The reader should close the doc with a sharper map of the territory, not a to-do list.

## all-pms

For PMs across all experience levels, including those new to the field or new to this specific topic area. The primer should be inclusive and grounded — every term-of-art gets a brief explanation, and the doc ends with concrete handholds the reader can act on this week.

**Required H2 sections (≥3 named):**

- `## What this is (one paragraph)` — a single-paragraph definition the reader can quote verbatim to a teammate.
- `## Core concepts (with definitions)` — the 3–6 key terms or ideas the rest of the primer rests on, each defined inline.
- `## How it actually works` — the mechanics, end-to-end, in plain language; concrete examples preferred over abstractions.
- `## Concrete next actions you can take this week` — 3–5 numbered, scoped, do-able steps.

A primer MAY add 1–2 additional H2s (e.g., `## Common mistakes`, `## When this does not apply`) when the topic warrants, but the four above are the floor.

**Vocab posture:**

Every term-of-art on first use carries a 1-sentence inline definition. No acronyms without first expanding them (write "Annual Recurring Revenue (ARR)" before later using "ARR" alone). This applies even to terms a senior PM would consider table stakes — the goal is that a PM in their first 6 months can read the primer end-to-end without opening another tab. Definitions should be tight (one sentence, no nested jargon), not textbook entries.

**Closing-shape:**

Concrete actions — 3–5 numbered next steps. Each step names a thing the reader can do (a conversation to have, a metric to instrument, a doc to write, a tool to try) this week, scoped small enough to fit in a normal workday. The primer ends with momentum, not with open questions.

## Anti-patterns

- **Do NOT mix presets within one primer.** A primer either trusts the reader's vocab or it doesn't — half-defining terms (some inline, some not) confuses both audiences. Senior PMs find it patronising; newer PMs can't predict which terms will be explained and lose trust in the doc. Pick one preset per artifact and apply it consistently from first paragraph to last.
- **Do NOT add a third preset in v1.** Per spec §3 non-goals, only `senior-pms` and `all-pms` ship in v1. Resist requests to add "engineer-friendly", "exec-summary", or "intern-onboarding" variants — they fragment the rubric, complicate Phase 5 evaluation, and dilute the two presets that already exist. Revisit only after v1 ships and usage data justifies the surface-area expansion.
- **Do NOT silently drop a required H2** to keep the primer short. If a required section has nothing to say for a given topic, that's a signal the topic is wrong for the preset, not that the section is optional. Either reframe the topic or switch presets.
