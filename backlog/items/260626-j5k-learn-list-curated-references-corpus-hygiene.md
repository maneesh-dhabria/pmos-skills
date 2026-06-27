---
schema_version: 1
id: 260626-j5k
title: "/learn-list curated-references corpus hygiene — title backfill + tag vocabulary"
type: tech-debt
kind: epic
status: released
route: skill
priority: should
labels: [learn-list, primer, pmos-learnkit, skill, corpus]
created: 2026-06-26
updated: 2026-06-27
released: pmos-learnkit/v0.31.0
source: "user-driven corpus-quality review of /learn-list library-viewer (2026-06-26); Playwright backfill proven over 50-record sample"
design_doc: docs/pmos/features/2026-06-26_learn-list-corpus-hygiene/02_design.html
parent:
dependencies: []
---

## Context

Two corpus-quality fixes to the shipped reference corpus
`plugins/pmos-learnkit/skills/_shared/topic-research/curated-references.json` (1,817 records). This file
backs `/learn-list browse` (its library-viewer) and the `/primer` library viewer, and feeds the IDF prefilter
(`curated-references-match.mjs`) consumed by `/learn-list` and `/primer`.

The corpus was imported once, verbatim, from a Notion spike YAML via `import-curated-references.mjs`, which
only scrubs PII and drops dead (404) pages — it never re-fetched titles or normalized tags. Two consequences,
both end-user-facing in the browse viewers:

1. **Junk titles** — 611 / 1,817 (34%) records carry a non-title as their display label: 305 empty, 179
   `"Just a moment..."` (Cloudflare), 98 `"Amazon.com"`, 11 `"403 Forbidden"`, 10 `"429 Too Many Requests"`,
   8 WAF pages. 54% of these still have a real grounded summary — only the title is broken.
2. **Tag sprawl** — 511 distinct tags, of which 57% appear ≤2 times and 42% exactly once; only ~99 appear
   ≥10 times. The facet list in the viewer is unusable at this width, and brand/company tags (amazon,
   netflix, openai, anthropic, claude, figma, kafka, redis, kubernetes …) add noise without topic value.

**Proven feasible (2026-06-26):** a read-only Playwright prototype (scratchpad `backfill-prototype.mjs`)
recovered real titles for 45/50 sampled junk records (90% reachable, 70% clean on first pass). The remaining
misses are all addressable (Cloudflare settle-wait, host-only-title retry, Amazon non-headless/slug fallback,
longer timeout). Body content comes back too, so `summary_grounded:false` records can be re-summarized in the
same pass.

## Acceptance Criteria

- [ ] Junk-title rate drops from 34% toward <5%; remaining genuinely-dead pages are dropped, not shipped with an error-page label
- [ ] Tag count collapses from 511 to a closed ~120-tag vocabulary; synonym/plural variants and brand tags eliminated
- [ ] Normalization applied at import time (`import-curated-references.mjs`) so a future corpus refresh stays clean
- [ ] T1 PII scrub gate still passes GREEN over the regenerated corpus
- [ ] Browse viewers (`/learn-list browse`, `/primer` library) and the IDF prefilter remain correct against the regenerated corpus
- [ ] Conforms to `skill-patterns.md §A–§L`; passes `skill-eval.md`

## Stories

- `260626-af6` — Playwright title + content backfill (route: skill, no deps)
- `260626-ex8` — Closed tag vocabulary + synonym normalization (route: skill, depends 260626-af6)

## Notes

Story order matters: run `af6` (backfill) before `ex8` (tag vocab) so records re-summarized during the
backfill get re-tagged under the new closed vocabulary in one pass. `ex8` declares a dependency on `af6`
so `/backlog next` picks `af6` first.

Read-only prototype + 50-record proof report live in the session scratchpad (`backfill-prototype.mjs`,
`backfill-report.json`) — to be re-authored as the shipped script during `af6`'s build.

Next: `/skill-sdlc define 260626-j5k` to run the three-loop Define pass (epic design + per-story plans),
or `/skill-sdlc build --next` after defining.
