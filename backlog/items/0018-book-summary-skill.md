---
schema_version: 1
id: 0018
kind: epic
title: /book-summary — curate verified public summaries of a book into PM-framed, themed takeaways
type: feature
priority: should
status: released
released: pmos-learnkit/v0.21.0
route: skill
feature_folder: docs/pmos/features/2026-06-12_book-summary-skill/
requirements_doc:
spec_doc:
design_doc: docs/pmos/features/2026-06-12_book-summary-skill/02_design.html
labels: [pmos-learnkit, book-summary, learning-artifact, verification-first]
created: 2026-06-12
updated: 2026-06-12
released:
---

## Context

A new pmos-learnkit skill. Given a book name, `/book-summary` curates **publicly available** material about the book — author interviews, podcast episodes, YouTube summaries/talks, reputable articles/reviews, official/publisher summaries, and corroborating LinkedIn/Twitter posts — and distils it into ranked, **theme-grouped, PM-framed takeaways**. It is a verification-first learning artifact in the same family as `/primer`, `/learn-list`, and `/magazine` (see `plugins/pmos-learnkit/skills/`).

Singleton epic (D18) wrapping one build story — a single brand-new skill. Route: skill.

Design contract: `docs/pmos/features/2026-06-12_book-summary-skill/02_design.html`.

### Maintainer decisions captured at define (2026-06-12)

- **PM lens:** PM-lens *throughout* — every takeaway is reframed for product work (the decision/tradeoff it informs, when to apply it, a concrete PM example). The artifact reads as "what this book means for your product practice."
- **Sources:** *tiered + cross-verified* — prefer author/primary sources; use social posts only to corroborate; label each takeaway's evidence strength; verification-first (never ship a claim not grounded in a source fetched this run).
- **Takeaways:** *adaptive, grouped by theme, no caps* — as many themes as the book naturally has, as many takeaways per theme as warranted; ranked by importance; let it evolve organically per book.

## Acceptance Criteria

- [ ] A registered, eval-passing pmos-learnkit skill `/book-summary` exists at `plugins/pmos-learnkit/skills/book-summary/SKILL.md` (passes `skill-eval.md`, floor 43/47).
- [ ] Given a book title, the skill resolves the book + author(s) unambiguously (disambiguation prompt when needed) and anchors all later identity-match verification to that canonical identity.
- [ ] Sources are discovered across the channels named in the seed (author interviews, podcasts, YouTube, articles, LinkedIn, Twitter), tiered (primary / reputable-secondary / corroborating-social), and verified-first — every emitted source link is fetched and identity-matched this run.
- [ ] Takeaways are organic, theme-grouped, importance-ranked, with **no caps** on theme count or takeaways-per-theme; each takeaway carries the PM-lens contract (idea → why it matters → product decision/tradeoff → concrete PM application → evidence + trust label).
- [ ] Output is a single self-contained HTML artifact + verified-source ledger + regenerated library listing, written per the `_shared/html-authoring/` checklist; honest degradation for thin-sourced books (never fabricate).

## Notes

Stories: 0019 (the whole skill — single build story).
Route: skill (new skill in pmos-learnkit; reuses `_shared/topic-research/` verification machinery + `_shared/html-authoring/` substrate; adds book-specific discovery/extraction phases + reference files).
Lean define: the design doc (`02_design.html`) is the cross-cutting contract; no separate epic `/spec` (skill spec folds into the story `/plan`).
