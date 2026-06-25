---
schema_version: 1
id: 260624-aa8
kind: story
parent: 260624-kkw
title: "/artifact-critique SKILL.md — ingest (path/paste/Notion/PDF/image) + doc-type detection + single-pass axis scoring + per-axis deep-dive + ranked weakest-claims + synthesize + HTML emit with embedded findings block + two-tier quality gate + voice rubric & few-shot"
type: feature
priority: should
route: skill
dependencies: [260624-fbd]
plugin: pmos-toolkit
status: done
feature_folder: docs/pmos/features/2026-06-24_artifact-critique/
plan_doc: docs/pmos/features/2026-06-24_artifact-critique/stories/260624-aa8/03_plan.md
tasks: docs/pmos/features/2026-06-24_artifact-critique/stories/260624-aa8/tasks.yaml
worktree: .claude/worktrees/feat-260624-aa8
claimed_by: build:6681ff46-e6d7-4cb7-854d-4ca3ea2b44ff
driver_holder: build:6681ff46-e6d7-4cb7-854d-4ca3ea2b44ff
labels: [pmos-toolkit, artifact-critique, new-skill]
created: 2026-06-24
updated: 2026-06-25
---

<!-- status: planned at define (Loop 1); route:skill. Build via /skill-sdlc build --story 260624-aa8 -->

## Context

The skill story of epic `260624-kkw`. Authors the new pmos-toolkit skill `/artifact-critique` on top
of the `260624-fbd` substrate (claim-time merged into this worktree per D9, so `_shared/critique-rubric/`
is present before this skill's `skill-eval`). Design contract: `02_design.html` — see `#skill-shape`,
`#findings-schema`, `#eval-checks`, `#voice`, `#invariants`, `#substrate-map`. Depends on `fbd`.

## Acceptance criteria

- [x] `plugins/pmos-toolkit/skills/artifact-critique/SKILL.md` registers as `/artifact-critique`
   (canonical path; `name:` matches dir; description triggers on "critique this PRD/strategy/POV doc",
   "review this product doc", "axis-by-axis critique", "what's weak in this strategy doc"). Phases 0–7
   per `02_design.html#skill-shape`. Cites `_shared/critique-rubric/` (Inv-1 — never restates the axes,
   heuristics, scale, map, or schema).
- [x] **Ingest (D6):** resolves a doc path (md/html/pdf) or pasted content; traverses Notion exports;
   reads embedded diagrams/images and factors them into scoring; names unreadable visuals and does NOT
   score their possible content `ABSENT` (Inv-5); full-doc-in-context default with map-reduce
   **verbatim-quote** evidence-gathering only past the real context limit; never silently truncates.
   (`reference/ingest.md`.)
- [x] **Doc-type detection:** classifies PRD/strategy/POV/roadmap/hybrid and **declares it in the opening
   line** (user-correctable interactively; recorded as an assumption non-interactively); resolves the
   applicable-axis set from `doc-types.md` (union for hybrids); placeholder/`<WIP>` sections treated as
   decision-blocking gaps, not absence.
- [x] **Axis scoring + deep-dives + weakest-claims:** single-pass reviewer scores all 10 axes (ordinal
   verdict + reason) against `axes.md` + `heuristics.md`; each applicable axis gets a verbatim ≥40-char
   block-quote + interrogation + "What I'd want to see:"; weakest-claims returns 0–3, ranked, with
   follow-ups, **never padded**; `STRONG` freely given (Inv-2/3/4).
- [x] **Emit (D3):** `output_format`-respecting artifact via the html-authoring substrate (HTML primary,
   inline comments overlay, wordmark/footer, `<meta pmos:skill>`); a **"Copy markdown" affordance**;
   the embedded `<script id="pmos-critique-findings" type="application/json">` block
   (`pmos-critique-findings/v1`, sentinel-wrapped) as the `/artifact` hand-off contract; advisory
   hand-off prose. `--format html|md` overrides settings; `both` treated as `html`.
- [x] **Two-tier quality gate (`02_design.html#eval-checks`):** `scripts/critique-eval.mjs` deterministic
   **hard gate** (E-schema, E-axes-complete, E-applicable-consistency, E-quote-len, E-quote-in-source,
   E-gap-named, E-weakest-ranked, E-opening; exit 0/1/2 — never silent pass) + a **separate advisory
   reviewer** per `_shared/reviewer-protocol.md` (grounding/fairness/voice; flags manufactured/nitpick
   findings; ≤2 loops). Fixtures from `fbd`'s vendored corpus-samples.
- [x] **Voice (locked):** `reference/voice-rubric.md` — unnamed "seasoned product leader" persona + explicit
   voice rules (take a position; no hedging; credit strengths before attacking; ground in a quote;
   ventriloquize the executive reader) + ≤~12 curated few-shot exemplar lines from the anonymized
   samples; **no "Gokul Rajaram" attribution**; pmos wordmark/footer.
- [x] **Non-interactive contract (W14):** inlines the canonical `<!-- non-interactive-block -->`
   byte-identical to `skills/_shared/non-interactive.md`; doc-type-correction + any prompts degrade per
   the contract (doc-type recorded as assumption; OQ-buffered). Every `AskUserQuestion` has a
   `(Recommended)` option or a `defer-only` tag.
- [x] **Standalone + hard-gate posture:** runs standalone on any doc path (like `/grill`, `/design-crit`);
   passes `skill-eval` (`[D]` + `[J]`); 4 hygiene lints + audit-recommended + comments-coverage green.
   Honesty-about-limits (Inv-5) and dangling-cite guard (Inv-6 — no `/artifact` cite) hold.
- [x] Conforms to `feature-sdlc/reference/skill-patterns.md §A–§L` + host `CLAUDE.md` (canonical skill
    path; manifest version-sync, README row, changelog are `/complete-dev`'s at epic release — not tasks
    here).

## Build notes (Loop-2, 2026-06-25)

Built on `feat/260624-aa8` (commit `793b9631`; `fbd` dep-merged at claim time per D9 so
`_shared/critique-rubric/` was present for `skill-eval`). Authored the new skill
`plugins/pmos-toolkit/skills/artifact-critique/`: SKILL.md (9 phases) + `reference/ingest.md` +
`reference/voice-rubric.md` + `scripts/critique-eval.mjs` + `tests/critique-eval.test.mjs`.

- **skill-eval `[D]` EXIT 0, zero residuals** — a-name-matches-dir, desc 824 chars, Platform Adaptation,
  Track Progress, learnings load + Capture-Learnings phase, scripts/, i-hint-contract-only,
  j-phase-refs-resolve all pass.
- **`critique-eval.mjs` hard gate** — reads the axis enum from `doc-types.md` at runtime (Inv-1, never
  hardcoded); all 8 design §4.4 checks incl. **E-quote-in-source** over the live source; exit 0/1/2.
  `tests/critique-eval.test.mjs` **23/23** fail-first assertions over `fbd`'s corpus fixtures.
- **4 hygiene lints + audit PASS** — NI block byte-identical to canonical; flags-vs-hints in sync; every
  phase ref resolves; 1 `AskUserQuestion` `defer-only: ambiguous`, 0 unmarked.
- **Substrate selftest PASS** — Inv-6 dangling-cite guard stays clean now that `artifact-critique/` is the
  expected new citer; no `/artifact` cite ships.
- **comments-coverage PASS (untouched)** — `/artifact-critique` deliberately NOT added to the roster: that
  roster is the 13 doc-authoring skills whose artifacts get comment-*resolved back into themselves* (each
  needs an apply-edit-at-anchor shim); the sibling `design-crit` (also standalone critique HTML) is not on
  it. Critique-only (D1/Inv-6) → no comment-resolution apply-edit contract to assert.
- **Standalone dogfood** — critiqued a fresh synthetic **roadmap** (a doc-type the corpus lacks, so a new
  applicability column: Pricing/AI → N/A); produced a valid `pmos-critique-findings/v1`; gate exit 0;
  Inv-3/4/5 confirmed. (`stories/260624-aa8/dogfood/` + `dogfood-run.md`.)
- **AC7** — generalized the named-person ban (removed the literal forbidden string); `grep` across the
  skill tree is clean.
- **Blind adversarial judge SHIP 5/5/5/5/5** (0 Blockers; 1 cosmetic nit on the already-consistent
  `--format both` nl-sugar bullet — no action).

Skill files live on `feat/260624-aa8` (worktree kept) — they merge to main at Loop-3 `/complete-dev`.
**Epic `260624-kkw` now FULLY BUILT (fbd + aa8) → next Loop-3: `/complete-dev --epic 260624-kkw`.**
