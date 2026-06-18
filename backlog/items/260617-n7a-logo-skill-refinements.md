---
schema_version: 1
id: 260617-n7a
kind: epic
title: "/logo skill refinements — rename /logos→/logo + concept/style exploration & approval + mark-type aspect gate + learnings-approval"
type: enhancement
status: released
priority: should
labels: [pmos-toolkit, logo, exploration, rename]
route: skill
created: 2026-06-17
updated: 2026-06-18
defined: 2026-06-17
source: docs/pmos/features/2026-06-17_logo-skill-refinements/02_design.html
feature_folder: docs/pmos/features/2026-06-17_logo-skill-refinements/
design_doc: docs/pmos/features/2026-06-17_logo-skill-refinements/02_design.html
parent:
dependencies: []
released: v2.88.0
---

<!-- status: defined at Loop 1; one story 260617-3z4 planned (route:skill). Build via /skill-sdlc build --story 260617-3z4 -->

## Context

`/logos` (built in `2026-06-13_logos-skill`) decomposes a brief into N named logo needs, extracts a style-profile,
authors 2–3 self-contained SVG variants per need conditioned on a bundled *theme*, gates each through a deterministic
`svg-metrics.mjs` script + a renderer-backed vision check, and emits a self-contained showcase. From one retro run the
maintainer found that the skill's biggest gap is **upstream of generation**: it picks the *idea* and the *visual style*
silently and never seeks the user's input — no research, no clarification, no approval — so the first time the user
sees a direction is when eight finished SVGs already exist.

This epic does two things:

- **Rename `/logos` → `/logo`** (drop the plural) — full rename, no back-compat alias (D1).
- **Add a concept- and style-exploration phase with explicit approval** in front of generation (D2/D3), plus smaller
  fixes: a clarification gate (D4), a mark-type-aware aspect gate (D5, F1), and an inlined learnings-approval rule
  (D6, F2). The multi-color/palette tension (F3) folds into the concept-first selection (D7).

The maintainer's key reframe: a "theme" today is only a rendering **style** (flat / gradient / strokes / badge / …),
never the **concept** the mark expresses. Exploration must surface **both axes** — concept AND style — and approve them
separately before generation. Decisions D1–D8, FR1–FR7, and the coherence invariants (Inv-1..Inv-7) live in the
`design_doc:` (02_design.html).

All changes edit the one skill's files (SKILL.md, scripts/svg-metrics.mjs, tests, eval docs) plus a repo-wide live
`/logos` ref sweep, and both the rename and the new phase rewrite `SKILL.md`, so this is a **one-story skill epic**
(D24 litmus: tightly coupled, not independently shippable). **Out of scope:** authoring new themes (D7); a
`--concept` typed contract flag (concept stays interactive/inferred); per-need concept approval (deferred); version-bump
/ changelog / per-plugin README version row / manifest sync (`/complete-dev`'s, D8).

## Story split

- **260617-3z4** — `/logo` refinements batch (rename + concept/style exploration + clarify gate + mark-type aspect
  gate + learnings-approval). `route: skill`, plugin `pmos-toolkit`, no dependencies. One `/execute` run.

## Acceptance Criteria

- `/logos` is renamed to `/logo` everywhere live: `skills/logo/` dir, `name: logo`, output `logo.html` / `<slug>.logo.json`, cache `~/.pmos/logo-cache/`, docs `{docs_path}/logo/`, `pmos:skill content="logo"`, learnings `## /logo`; README skill row + live cross-skill refs updated; no `/logos` alias; no dangling live `/logos` reference.
- A new exploration phase (before generation) researches the subject and proposes 2–3 distinct **concept** directions AND 2–3 candidate **styles**, approved on two separate axes; generation consumes the approved direction instead of inventing it silently.
- A consolidated clarification prompt fires when the brief is thin (usage context, color/vibe + constraints, mono requirement); skipped when rich; defers under `--non-interactive`.
- `svg-metrics.mjs --mark-type <type>`: lockup types (combination/emblem/wordmark) get aspect `[0.8,4.0]`; square types keep `[0.8,1.25]`; absent flag is back-compat `[0.8,1.25]`; unknown value exits 64; icon-only of a lockup gated as square.
- The learnings phase inlines the surface-bullets / get-approval / never-silent-write rule (not just a pointer to the shared file).
- Skill conforms to `skill-patterns.md §A–§L` + host `CLAUDE.md`; 4 hygiene lints + audit + skill-eval + selftest green; non-interactive inline block byte-identical. No version-bump/changelog/README-version tasks here — those are `/complete-dev`'s.
