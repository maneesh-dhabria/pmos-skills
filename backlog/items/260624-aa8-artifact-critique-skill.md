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
status: planned
feature_folder: docs/pmos/features/2026-06-24_artifact-critique/
plan_doc: docs/pmos/features/2026-06-24_artifact-critique/stories/260624-aa8/03_plan.md
tasks: docs/pmos/features/2026-06-24_artifact-critique/stories/260624-aa8/tasks.yaml
worktree:
claimed_by:
driver_holder:
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

- [ ] `plugins/pmos-toolkit/skills/artifact-critique/SKILL.md` registers as `/artifact-critique`
   (canonical path; `name:` matches dir; description triggers on "critique this PRD/strategy/POV doc",
   "review this product doc", "axis-by-axis critique", "what's weak in this strategy doc"). Phases 0–7
   per `02_design.html#skill-shape`. Cites `_shared/critique-rubric/` (Inv-1 — never restates the axes,
   heuristics, scale, map, or schema).
- [ ] **Ingest (D6):** resolves a doc path (md/html/pdf) or pasted content; traverses Notion exports;
   reads embedded diagrams/images and factors them into scoring; names unreadable visuals and does NOT
   score their possible content `ABSENT` (Inv-5); full-doc-in-context default with map-reduce
   **verbatim-quote** evidence-gathering only past the real context limit; never silently truncates.
   (`reference/ingest.md`.)
- [ ] **Doc-type detection:** classifies PRD/strategy/POV/roadmap/hybrid and **declares it in the opening
   line** (user-correctable interactively; recorded as an assumption non-interactively); resolves the
   applicable-axis set from `doc-types.md` (union for hybrids); placeholder/`<WIP>` sections treated as
   decision-blocking gaps, not absence.
- [ ] **Axis scoring + deep-dives + weakest-claims:** single-pass reviewer scores all 10 axes (ordinal
   verdict + reason) against `axes.md` + `heuristics.md`; each applicable axis gets a verbatim ≥40-char
   block-quote + interrogation + "What I'd want to see:"; weakest-claims returns 0–3, ranked, with
   follow-ups, **never padded**; `STRONG` freely given (Inv-2/3/4).
- [ ] **Emit (D3):** `output_format`-respecting artifact via the html-authoring substrate (HTML primary,
   inline comments overlay, wordmark/footer, `<meta pmos:skill>`); a **"Copy markdown" affordance**;
   the embedded `<script id="pmos-critique-findings" type="application/json">` block
   (`pmos-critique-findings/v1`, sentinel-wrapped) as the `/artifact` hand-off contract; advisory
   hand-off prose. `--format html|md` overrides settings; `both` treated as `html`.
- [ ] **Two-tier quality gate (`02_design.html#eval-checks`):** `scripts/critique-eval.mjs` deterministic
   **hard gate** (E-schema, E-axes-complete, E-applicable-consistency, E-quote-len, E-quote-in-source,
   E-gap-named, E-weakest-ranked, E-opening; exit 0/1/2 — never silent pass) + a **separate advisory
   reviewer** per `_shared/reviewer-protocol.md` (grounding/fairness/voice; flags manufactured/nitpick
   findings; ≤2 loops). Fixtures from `fbd`'s vendored corpus-samples.
- [ ] **Voice (locked):** `reference/voice-rubric.md` — unnamed "seasoned product leader" persona + explicit
   voice rules (take a position; no hedging; credit strengths before attacking; ground in a quote;
   ventriloquize the executive reader) + ≤~12 curated few-shot exemplar lines from the anonymized
   samples; **no "Gokul Rajaram" attribution**; pmos wordmark/footer.
- [ ] **Non-interactive contract (W14):** inlines the canonical `<!-- non-interactive-block -->`
   byte-identical to `skills/_shared/non-interactive.md`; doc-type-correction + any prompts degrade per
   the contract (doc-type recorded as assumption; OQ-buffered). Every `AskUserQuestion` has a
   `(Recommended)` option or a `defer-only` tag.
- [ ] **Standalone + hard-gate posture:** runs standalone on any doc path (like `/grill`, `/design-crit`);
   passes `skill-eval` (`[D]` + `[J]`); 4 hygiene lints + audit-recommended + comments-coverage green.
   Honesty-about-limits (Inv-5) and dangling-cite guard (Inv-6 — no `/artifact` cite) hold.
- [ ] Conforms to `feature-sdlc/reference/skill-patterns.md §A–§L` + host `CLAUDE.md` (canonical skill
    path; manifest version-sync, README row, changelog are `/complete-dev`'s at epic release — not tasks
    here).
