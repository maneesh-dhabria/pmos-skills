# Output styles

`/summary-tldr` offers four output styles, selected with the `--style` contract flag. Phase 4 (Summarize) reads this file to render the chosen style.

## Table of Contents

- [Global rule: front-load the conclusion (BLUF)](#global-rule-front-load-the-conclusion-bluf)
- [Style 1 — Key-takeaways bullets (`--style bullets`, DEFAULT)](#style-1--key-takeaways-bullets---style-bullets-default)
- [Style 2 — Executive narrative (`--style exec`)](#style-2--executive-narrative---style-exec)
- [Style 3 — Nested / hierarchical bullets (`--style nested`)](#style-3--nested--hierarchical-bullets---style-nested)
- [Style 4 — Layered / progressive (`--style layered`)](#style-4--layered--progressive---style-layered)
- [Choosing a style](#choosing-a-style)

## Global rule: front-load the conclusion (BLUF)

Every style leads with the bottom line. State the single most important conclusion in the first line — before any supporting detail, context, or method. The reader who stops after one line should still walk away with the source's core claim.

This is the inverted-pyramid / BLUF (Bottom Line Up Front) discipline, and it is non-negotiable across all four styles. Never bury the conclusion under setup. Never open with meta-description ("This article discusses…", "The author explores…") — assert the actual claim the source makes.

## Style 1 — Key-takeaways bullets (`--style bullets`, DEFAULT)

**What it is.** A one-line BLUF followed by a tight bulleted list of the key points — usually 3–7 bullets, each a self-contained assertion.

**Best for.** Articles, blog posts, news pieces, single-topic essays — sources with a handful of discrete takeaways and no deep internal hierarchy.

**Worked example** (summarizing a news article on a rate decision):

> **The Fed held rates at 5.25–5.50% for the fourth straight meeting, signalling cuts won't begin until inflation data confirms a durable downtrend.**
>
> - Core PCE rose 2.8% year-over-year in December, still above the 2% target.
> - Powell explicitly ruled out a March cut, pushing market expectations to June.
> - The dot plot still projects three cuts in 2026, unchanged from December.
> - Two-year Treasury yields jumped 12bp on the announcement as traders repriced.

## Style 2 — Executive narrative (`--style exec`)

**What it is.** A coherent prose abstract of 2–4 short paragraphs, conclusion first. Reads as a polished briefing, not a list — connective tissue between points matters.

**Best for.** Work documents, business memos, strategy docs, board updates — sources where the relationships between points carry meaning and a decision-maker wants a readable narrative.

**Worked example** (summarizing a go-to-market strategy doc):

> The team recommends launching the self-serve tier in Q3, ahead of the enterprise push, because early-adopter signups already exceed the sales pipeline by 4:1 and require no new headcount to support.
>
> Self-serve onboarding has been validated with 200 beta accounts at a 38% activation rate, beating the 25% target. Enterprise deals, by contrast, remain gated on a SOC 2 audit that won't close until Q4, making a self-serve-first sequence the only path to revenue this fiscal year.

## Style 3 — Nested / hierarchical bullets (`--style nested`)

**What it is.** Top-level theme bullets, each with indented sub-bullets carrying the supporting detail. The BLUF still leads, then themes group the content.

**Best for.** Long, structured documents, meeting transcripts, multi-section reports — sources with clear internal sections or several distinct threads.

**Worked example** (summarizing an engineering all-hands transcript):

> **Q2 shipped the migration on time; Q3 focus shifts to reliability and the mobile rewrite.**
>
> - **Migration (done)**
>   - All 14 services moved off the legacy monolith; p99 latency dropped 40%.
>   - Two rollback incidents, both resolved within the hour.
> - **Q3 priorities**
>   - Reliability: target 99.95% uptime, on-call rotation expands to 8 engineers.
>   - Mobile rewrite in React Native begins in July, GA targeted for October.

## Style 4 — Layered / progressive (`--style layered`)

**What it is.** A tiered summary the reader can stop at any depth: a one-line headline, then a few bullets, then an optional detail tier for those who want more. Each layer is complete on its own.

**Best for.** Very long sources — books, podcast episodes, long-form reports — where different readers want wildly different depths from the same summary.

**Worked example** (summarizing a book on habit formation):

> **TL;DR — Small habits compound: a 1% daily improvement makes you 37× better over a year, so design systems, not goals.**
>
> **Key points**
>
> - Habits run on a four-step loop: cue → craving → response → reward.
> - Make good habits obvious, attractive, easy, and satisfying; invert all four to break bad ones.
> - Identity drives behaviour — "I am a runner" sticks where "I want to run" fades.
>
> **Going deeper**
>
> - The "two-minute rule" shrinks any new habit to a version doable in two minutes, so starting beats optimizing.
> - Environment design beats willpower: a habit's friction predicts its survival more than motivation does.
> - Plateaus are the "valley of disappointment" — results lag effort, and most people quit before the curve turns.

## Choosing a style

| Source type | Recommended `--style` |
|---|---|
| Article, blog post, news | `bullets` (default) |
| Work / business / strategy doc | `exec` |
| Long structured doc, transcript | `nested` |
| Book, podcast, long report | `layered` |

When the source type is ambiguous, fall back to `bullets`. When the source is very long and the reader's depth need is unknown, prefer `layered` — it lets each reader self-select.
