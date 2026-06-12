---
schema_version: 1
id: 0019
kind: story
title: Build the /book-summary pmos-learnkit skill — verified multi-source curation → PM-framed themed takeaways
type: feature
status: done
priority: should
route: skill
parent: 0018
dependencies: []
worktree: feat/0019
plan_doc: docs/pmos/features/2026-06-12_book-summary-skill/stories/0019-book-summary-skill-build/03_plan.html
tasks_file: docs/pmos/features/2026-06-12_book-summary-skill/stories/0019-book-summary-skill-build/tasks.yaml
claimed_by:
released:
labels: [pmos-learnkit, book-summary, learning-artifact, verification-first]
created: 2026-06-12
updated: 2026-06-12
source: 2026-06-12 /skill-sdlc define "I want to create a new skill called /book-summary …"
pr:
---

## Context

The single build story for epic 0018. Authors the brand-new `/book-summary` pmos-learnkit skill end-to-end, per the epic design contract `docs/pmos/features/2026-06-12_book-summary-skill/02_design.html`. One skill = one `/execute` run = one branch (`feat/0019`). The skill is `skill-eval`'d (Phase 6a) before it can ship.

Reuses the existing verification + authoring substrate (`_shared/topic-research/` source-tiering + verification pass-bar, `_shared/html-authoring/` artifact emission, `_shared/non-interactive.md`, `_shared/pipeline-setup.md`) and adds book-specific discovery/extraction phases plus its own `reference/` files. No epic-level `/spec`; the design doc + these ACs + `skill-patterns.md §A–§L` are the implementation contract.

## Acceptance Criteria

- [x] **AC1 — Registered & eval-passing.** `plugins/pmos-learnkit/skills/book-summary/SKILL.md` exists, frontmatter `name: book-summary` matches dir, `user-invocable: true`, has `## Platform Adaptation`, a learnings-load line, a numbered Capture-Learnings phase, `## Track Progress`, kebab `{#slug}` phase anchors, and the canonical non-interactive inline block byte-identical to `_shared/non-interactive.md`. Passes `skill-eval-check.sh` `[D]` half and the `[J]` rubric (floor 43/47).
- [x] **AC2 — Book resolution.** Given a book title (optionally `by <author>`), the skill resolves a canonical {title, author(s), year, publisher}; ambiguous titles trigger a disambiguation `AskUserQuestion` (defer-only: ambiguous). The canonical identity anchors every later identity-match check.
- [x] **AC3 — Tiered, verification-first sourcing.** Sources are discovered across author-primary, reputable-secondary, and corroborating-social channels (interviews, podcasts, YouTube, articles, LinkedIn, Twitter); ranked by tier with the anti-slop hard gate applied pre-fetch; only top survivors are fetched + identity-matched; **every emitted source link is fetched this run** and the takeaway it supports is grounded in the fetched content. No claim ships from memory. A `*.sources.json` ledger records each verified source with tier + verification outcome.
- [x] **AC4 — Organic, PM-framed takeaways.** Takeaways are clustered into organic themes (no cap on theme count or takeaways-per-theme), importance-ranked. Each takeaway carries the full PM-lens contract: idea (book-faithful) → why it matters → product decision/tradeoff it informs → concrete PM application → evidence (source + trust label). A takeaway grounded only in T3 social sources is flagged or dropped, never silently shipped.
- [x] **AC5 — Output & dials.** Emits a single self-contained HTML artifact at `{docs_path}/book-summary/{YYYY-MM-DD}_{slug}.html` (+ `.sections.json` + `.sources.json`) and regenerates a `book-summaries.html` library listing, per the `_shared/html-authoring/README.md` checklist (`{{pmos_skill}}=book-summary`, assets copied, cache-bust, kebab heading ids, comments overlay). `--depth brief|standard|deep` and `--audience senior-pms|all-pms` are honored and depth persists per-project. Thin-sourced books degrade visibly (fewer themes, explicit thin-sourcing note) — never fabricated.
- [x] **AC6 — Self-review.** A reviewer pass (≤2 loops) verifies: every source fetched + identity-matched, every takeaway grounded in ≥1 T1/T2 source, PM-lens present on every takeaway, no-caps honored, themes coherent. Residual failures are surfaced, not hidden.

## Notes

- Reference files to author (book-specific; cite shared substrate, state deltas only): `reference/source-taxonomy.md` (T1/T2/T3 tiers + anti-slop gate, citing `_shared/topic-research/source-tiers.md`), `reference/takeaway-contract.md` (PM-lens per-takeaway shape + organic theme-clustering rules), `reference/audience-presets.md` (book-summary audience shaping, citing primer's pattern), `reference/eval-rubric.md` (self-review checks).
- Reuse, do not fork: `_shared/topic-research/sourcing-ladder.md` (verification pass-bar + free-fetch ladder), `_shared/html-authoring/` (emit), `_shared/non-interactive.md` (inline block), `_shared/pipeline-setup.md` (settings/docs_path).
- Release prerequisites (NOT in `/plan` waves — `/complete-dev` owns these): pmos-learnkit version bump (currently 0.19.0), both `plugin.json` manifests, marketplace entries already point at `./skills/` (no marketplace edit needed for a new skill in an existing plugin), changelog entry, README row, `~/.pmos/learnings.md` header bootstrap.
- Out of scope: summarizing a book the user supplies as a file/PDF (this skill curates *public* material about a named book); generating a full chapter-by-chapter outline; paid-source scraping (respect paywalls; use free-fetch ladder + free alternatives).

## Build result (build loop, 2026-06-12)

- **PASS.** Authored `plugins/pmos-learnkit/skills/book-summary/` (SKILL.md 8 phases + 4 reference files) on `feat/0019`. All 6 ACs met.
- **skill-eval Phase 6a: 46/47 gated checks pass (floor 43).** `[D]` 21/21 + `g-plan-grep-clean` clean; `[J]` 18/19 gated + 6/6 advisory.
- **Surfaced residual (accepted, non-blocking):** `a-name-verb-or-gerund` — the `[J]` judge flags `book-summary` as a noun compound. Fix is *contraindicated*: AC1 mandates `name: book-summary` (matching dir), design I3 fixes the canonical path, and the repo's learnkit naming is noun-based (`primer`, `magazine`, `frameworks`; the rubric's own pass-examples include the noun `wireframes`). Renaming would break `a-name-matches-dir` + violate the story contract. Recorded as known residual; re-confirmed not re-failed by `/verify`'s `[D]` re-run.
- Code on `feat/0019` awaiting epic 0018 release train (`/complete-dev --epic 0018`).
