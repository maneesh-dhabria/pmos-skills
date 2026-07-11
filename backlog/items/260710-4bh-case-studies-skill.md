---
schema_version: 1
id: 260710-4bh
title: "/case-studies — a bundled, offline, searchable learnkit library of 665 curated product case studies: single-array JSON corpus imported from the case-studies-scraping repo, a viewer on the shared library-viewer substrate (columns reader), a deterministic topic-match prefilter + LLM re-rank returning a chat shortlist AND an offer to open the filtered viewer, and a --json contract at parity with /frameworks"
type: feature
kind: epic
status: released
released: v0.36.0
route: skill
priority: should
labels: [pmos-learnkit, case-studies, skill, library-viewer, curated-corpus]
created: 2026-07-10
updated: 2026-07-11
design_doc: docs/pmos/features/2026-07-10_case-studies-skill/02_design.html
feature_folder: docs/pmos/features/2026-07-10_case-studies-skill/
parent:
dependencies: []
---

## Context

New skill (`/skill-sdlc define --route skill`) in **pmos-learnkit**. The seed: ship the ~665 case studies
compiled and researched in the personal repo `~/Desktop/Projects/personal/case-studies-scraping` ("Applied
Product") as a curated, offline library — "similar to the ones we created for /frameworks and /primer" — with a
topic-search that queries the curated list and shares the relevant studies.

Studying the source repo (2026-07-10) confirmed **665 case studies**, one YAML each across 4 pillars, 17 fields
~100% populated, clean dedup (0 dup ids/urls), and four closed vocabularies (pillar×4, topics×98, region×9,
artifact_type×5) ready-made for faceting and matching. The corpus stores **curated abstracts + verified source
links, not full article text** — so browse/search/match are fully offline; reading the original is a link-out.

Studying `/frameworks` and `/primer` confirmed the template: both sit on a frozen shared substrate
`plugins/pmos-learnkit/skills/_shared/library-viewer/lib.mjs`; a new skill is a thin adapter (corpus adapter +
facet config) over it, plus a deterministic `match.mjs` prefilter (+ LLM re-rank + `--json`) and a
`validate-corpus.mjs` gate. `route: skill`, single plugin (pmos-learnkit), one release unit. No UI beyond the
generated HTML viewer. Coherence contract (INV-1..7, D1..D8, schema, matching, change surface, story map, risks)
in `02_design.html`.

Scope confirmed with the maintainer via a 3-question batch (2026-07-10): search deliverable is **Both** — a ranked
chat shortlist AND an offer to open the filtered viewer (D2); ship the `--json` mode at **full /frameworks parity**
(D4); corpus is a **one-shot import** into a bundled JSON snapshot, no live sync (D5). Plus an explicit steer:
rebuild the viewer on the shared substrate, do **not** ship the source repo's `index.html` (D3).

## Acceptance Criteria

- [ ] `data/case-studies.json` is a single flat array of 665 records imported from the source YAMLs, with the two
  derived fields `year` and `quantified`, and passes `validate-corpus.mjs` (required fields, id/url uniqueness,
  every `topics` value ⊆ the 98-tag registry, closed pillar/region/artifact_type) (INV-2, INV-3, schema).
- [ ] The viewer is a thin `build-library.mjs` over `_shared/library-viewer/lib.mjs` (no standalone template),
  emitting one self-contained offline `library.html` with facets (pillar/topics/region/artifact_type/year +
  quantified toggle), three views (list default), a dynamic `DATA.length` count, and the `columns` reader
  rendering the four prose blocks + a "Read the original ↗" link-out (D1, D3, D6; INV-1, INV-4).
- [ ] Bare `/case-studies` (or `browse`/`list`) opens the library; a quoted/bare topic string routes to retrieve
  (D8).
- [ ] A topic query returns the 3–5 most relevant studies in chat (title, company, one-line "why it fits", source
  URL) via a deterministic prefilter (topics ×3, title/company ×2, summary/what_they_built ×1) + an in-session LLM
  re-rank, AND offers to open the viewer filtered to the matched topic/pillar. Zero-score → empty pool, never
  padded; a low-signal query caps to ≤2 with a caveat (D2; INV-5).
- [ ] `/case-studies "<topic>" --json` emits the prose-free stdout contract `{query,count,low_confidence,reranked,
  matches[{id,title,company,why,score,pillar,topics,url}]}` (count ≤5), proven by a contract test (D4).
- [ ] The frozen `_shared/library-viewer/lib.mjs` and the sibling skills (/frameworks, /primer, /learn-list) are
  unchanged; no diagram/SVG machinery ships (INV-6, schema).
- [ ] Conforms to `skill-patterns.md §A–§L` + repo `CLAUDE.md`: canonical path
  `plugins/pmos-learnkit/skills/case-studies/SKILL.md`, lean body with reference/ disclosure, frozen
  non-interactive block byte-identical, every AskUserQuestion has a `(Recommended)` option or a `defer-only` tag,
  contract flags pass the §I 4-test; both halves of `skill-eval.md` and all four hygiene lints green (INV-7).
- [ ] Ships in one pmos-learnkit release unit (README row + manifest bump owned by Loop 3 /complete-dev) (D7).

## Stories

- 260710-a2b — Corpus foundation: importer → `data/case-studies.json` (665) + `corpus-vocab.mjs` + `validate-corpus.mjs` + `reference/corpus-schema.md` (route: feature). No deps.
- 260710-vdc — The `/case-studies` skill: SKILL.md + `build-library.mjs` (viewer) + `match.mjs` (retrieve + --json) + reference docs + tests (route: skill). Depends on 260710-a2b.
