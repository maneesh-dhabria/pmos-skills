# Takeaway contract — PM-lens shape + organic theme clustering

## Contents

- [The five-part PM-lens shape](#the-five-part-pm-lens-shape)
- [Worked example](#worked-example)
- [Organic theme clustering](#organic-theme-clustering)
- [Importance ranking](#importance-ranking)
- [No caps](#no-caps)

This file is the single home for the output model (§K). SKILL.md Phases 5–6 cite it; the reviewer rubric (`reference/eval-rubric.md`) checks against it.

## The five-part PM-lens shape

Decision D1: the whole artifact reads as **product guidance, not a book report**. Every takeaway carries all five parts, in order:

1. **Idea** — the book-faithful core point (what the author actually argues). Not your gloss — the author's claim.
2. **Why it matters** — the stakes, or the failure mode it addresses.
3. **Product decision / tradeoff it informs** — where in product work this changes a call.
4. **Concrete PM application** — a specific, realistic example of applying it: a discovery move, a prioritization call, a stakeholder framing, a metric choice.
5. **Evidence** — source link(s) + trust label (T1/T2/T3) backing the idea, per `reference/source-taxonomy.md` § "Grounding rule" (≥1 T1/T2, or the takeaway is flagged/dropped).

A takeaway missing any of the five is incomplete — the reviewer fails it.

## Worked example

> **Idea.** Marty Cagan argues that empowered product teams are given *problems to solve*, not features to build — outcome ownership, not output assignment. *(Inspired, Cagan)*
>
> **Why it matters.** Feature-factory teams optimize for shipping velocity and miss the actual customer outcome; the org mistakes activity for progress.
>
> **Product decision it informs.** How you frame a quarter's roadmap to a squad: a problem statement + a target metric, vs. a pre-decided feature list.
>
> **Concrete PM application.** Next planning cycle, replace "build the referral widget" with "lift activated-team invites by 15% — you choose the mechanism," and let the team run discovery on three candidate solutions before committing.
>
> **Evidence.** Cagan, *Inspired* ch. on team models (T1, author's own framing); corroborated by a SVPG essay (T2). [links]

One excellent worked example beats a gallery of thin ones — this is the bar (advisory check `d-examples-quality`).

## Organic theme clustering

Decision D3: extracted ideas are clustered into **organic themes** — as many as the book naturally has. Themes come *from the book*, not from a fixed template. A thin book may yield 3 themes; a dense one 8+ — both are correct.

Clustering rules:

- Group takeaways that serve the **same argument or product concern** under one theme.
- Name each theme for the idea it carries (e.g., "Outcome ownership over output," not "Theme 2").
- A takeaway belongs to exactly one theme (its primary home); cross-references are prose, not duplication.

## Importance ranking

The "Top N" intent is carried by **ranking, never truncation**:

- Rank **themes** by importance (most load-bearing idea first).
- Rank **takeaways within a theme** by importance.
- `--depth` scales how *deep* extraction goes (how many corroborating angles, how rich the applications) — it is **not** a hard ceiling on counts.

## No caps

There is **no limit** on theme count or takeaways-per-theme. Do not pad a thin book to hit a number; do not truncate a rich one to fit a number. Honest degradation (SKILL.md Phase 7) handles the thin case with fewer themes + a visible note — never fabricated breadth.
