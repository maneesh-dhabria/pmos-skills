---
schema_version: 1
id: 260616-tqf
kind: epic
title: "Curated-references overlay + shared library-viewer substrate — improve /primer & /learn-list sourcing indirectly, and give /learn-list a reference viewer"
type: feature
status: released
released: 0.27.0
priority: should
labels: [pmos-learnkit, topic-research, curated-references, library-viewer, browse, primer, learn-list]
route: skill
created: 2026-06-16
updated: 2026-06-17
source: docs/pmos/features/2026-06-16_curated-references-overlay/02_design.html
feature_folder: docs/pmos/features/2026-06-16_curated-references-overlay/
design_doc: docs/pmos/features/2026-06-16_curated-references-overlay/02_design.html
parent:
dependencies: []
---

## Context

Two related deliverables, seeded by the validated spike at
`notion-writing-backup/docs/curated-references-integration-brief.md`:

**A — Curated-references overlay (indirect improvement to /primer & /learn-list).** Let the two
learning skills draw on a personal, pre-curated reference corpus *in addition to* live web
research — systematically, with **no trust regression** (every cited source is still fetched &
verified at run time), and **without coupling the general-purpose skills to one person's data**.
The behavioural change lands entirely in the shared `_shared/topic-research/` substrate: the
corpus becomes an optional *if-present* third candidate source in `sourcing.md`'s per-topic
"Gather candidates" step, surfaced by a deterministic rarity-weighted tag prefilter + one
research-phase subagent, then hard-gated / tier-ranked / fetch-verified / grounded by the
*existing* loop exactly like live candidates. `/primer` and `/learn-list` stay clean, general,
shippable; they gain only a one-line sourcing note + a `--no-curated` suppression.

**B — Shared library-viewer substrate + /learn-list reference viewer.** `/frameworks`, `/primer`,
and (now) `/learn-list` each need the same "faceted, searchable, sortable, offline single-file
listing page". Rather than rediscover it a fourth time, **extract** the pattern into a new
`_shared/library-viewer/` substrate (guidelines + a zero-dep reusable engine), **prove** it by
refactoring the richest existing viewer (`/frameworks`) onto it, then **retrofit** `/primer` and
**build** `/learn-list`'s new reference viewer on top of it. The viewer ships the scrubbed
curated corpus as its base data.

**PII constraint (hard).** The shipped corpus and the viewer carry ONLY static + LLM-as-judge
enriched fields `{id, url, title, source_type, publication_date, tags, summary,
summary_grounded}` — re-minted content-derived ids, generic `meta.source`, **nothing
notion-specific** (no page/database ids, occurrences, snapshots, workspace, urls). Enforced by a
deterministic scrub-gate test.

## Acceptance Criteria

- AC1 — The curated corpus ships as `plugins/pmos-learnkit/skills/_shared/topic-research/curated-references.json`, PII-scrubbed to the field allowlist with content-derived ids and generic provenance; a deterministic scrub-gate test fails on any disallowed/notion-specific field.
- AC2 — A zero-dep `curated-references-match.mjs` prefilter returns top-K candidates by rarity-weighted tag overlap (IDF), pre-rejects bot-wall titles, down-weights `summary_grounded:false`, and skips hard-blocked domains — deterministically (determinism test).
- AC3 — `sourcing.md` step 1 gains the overlay as an optional *if-present* third candidate source via the curated-references subagent, with the over-fetch pool cap raised to ~3–4×; the substrate stays skill-agnostic (D12 assert green).
- AC4 — A coverage gate skips injection (and logs) for low-coverage topics; `--no-curated` / `curated_references` settings suppress the overlay. `/primer` + `/learn-list` SKILL.md carry the one-line sourcing note (the only skill-file edits).
- AC5 — A new `_shared/library-viewer/` substrate (guidelines + zero-dep reusable engine + tests) exists with a frozen public API; the engine is skill-agnostic.
- AC6 — `/frameworks` browse page is refactored onto the substrate with **zero feature regression** (existing `build-library.test.sh` stays green; live dogfood confirms facets/views/diagrams/reader).
- AC7 — `/primer` browse page is refactored onto the substrate, preserving the dual-population Curated/Yours behaviour; its `build-library.test.sh` stays green.
- AC8 — `/learn-list` gains a `browse`/`list`/bare verb + `#browse` phase that builds & opens a faceted offline reference viewer reading the curated corpus; degrades to an empty-state when the corpus is absent; surfaces NO disallowed field.
- AC9 — All shipped offline pages open from `file://` with zero external requests; skill-eval `[D]` floor + the four lints pass for every touched skill.

## Stories

- `260616-v4h` — Curated-references overlay engine (deps: none).
- `260616-f7w` — Extract `_shared/library-viewer/` substrate + retrofit `/frameworks` (deps: none).
- `260616-w1v` — Retrofit `/primer` browse viewer onto the substrate (deps: `260616-f7w`).
- `260616-y9f` — Build the `/learn-list` reference viewer on the substrate + curated corpus (deps: `260616-f7w`, `260616-v4h`).

Each story has a `/plan` + `tasks.yaml` authored this loop under `stories/`.

## Notes

Define (Loop 1, route:skill) authored the cross-skill design contract (`02_design.html`), the
four stories, and their plans + `tasks.yaml`. Docs-only definition merge to main. Build via Loop 2
(`/feature-sdlc build --next` — picks `v4h`/`f7w` first, then `w1v`, then `y9f` as deps clear),
release via Loop 3 (`/complete-dev --epic 260616-tqf`). All four stories touch only
`pmos-learnkit`, so the epic releases as one pmos-learnkit train (substrate sync to consumers
runs at release per repo policy).
