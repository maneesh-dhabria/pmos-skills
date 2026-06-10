# changelog — review

**Grade:** B (the core is already Pocock-shaped; ~45 lines of ceremony and duplication sit on top of a ~40-line skill)
**Size:** SKILL.md 132 lines (103 excluding non-interactive block); references 0 files / 0 lines; target ~90 lines (~60 excluding the block).

## TL;DR

- **Biggest win available:** the actual skill — Phases 1–5 plus Rules — is ~45 lines and would pass a Pocock review nearly as-is. Everything above Phase 0 (announce, When-to-use, Track Progress, Platform Adaptation, the pre-block "Determine changelog_path" section) is ~35 lines of ceremony that restates the description, the substrate, or what any capable model does anyway.
- **Biggest risk:** none structural. The one real coupling is `/complete-dev` Phase 8, which invokes `/pmos-toolkit:changelog` inline and short-circuits the Phase 4 confirm via `run_defaults.changelog_disposition: accept` — Phase 4 must stay a classifiable checkpoint, so don't fold it away when trimming.
- **Worth keeping:** the Rules section is the best writing in the file — "Search now combines keyword and semantic results, not Implemented RRF fusion in SearchService" is exactly the one-principle-plus-one-example style the north star asks for. The "date must be the actual current date" rule catches a real LLM failure mode (inferring dates from commit timestamps).

## Findings

1. **[V][Ph] ~35 lines of pre-phase ceremony for a 6-phase linear skill.** "Track Progress" (7 lines) asks for a task per phase when the phases are read-log → draft → confirm → prepend; the tracking costs more than it buys for a 2-minute skill. "When to use this" largely restates the frontmatter description (which already lists six trigger phrasings); its only new information is the `/complete-dev` caller note. Platform Adaptation spends 3 of its 5 bullets saying "not used / works without" — silence would carry the same information. **Fix:** drop Track Progress; collapse When-to-use to the two lines that add information (the /complete-dev coupling and the "internal refactors → nothing to log" boundary); cut Platform Adaptation to the two bullets that change behavior (AskUserQuestion degradation, settings.yaml first-run). −25 lines.
2. **[V][R] "Determine changelog_path" is stated twice.** The standalone section (lines 38–50) defines resolution; Phase 0 step 1 then restates "resolve `{changelog_path}` per the 'Determine changelog_path' section above." A reader bounces between two places for one operation. **Fix:** merge the section into Phase 0 — the sibling-prefer probe becomes Phase 0 step 1's edge case. −6 lines, one home for the logic.
3. **[G] Sibling-prefer probe — keep, but compress.** Origin verified: `docs/pmos/features/2026-05-08_update-skills-retro-pipeline-friction/changelog/01_requirements.md` — a repo with `docs_path: .pmos` that already maintained `docs/changelog.md`; the skill wrote a second changelog in the wrong place. Real failure, earned check. But 13 lines (normalization steps, exact advisory string, two MUST/DO-NOT clauses) over-specify what is "prefer an existing docs/changelog.md sibling; tell the user once; don't edit settings." No test pins the advisory string. **Fix:** compress to ~5 lines stating the rule + why; keep "same path for read and write within a run" — that's the actual invariant.
4. **[S] Phase 6 learnings stanza duplicates `_shared/learnings-capture.md`.** Ten-plus other skills (artifact, grill, execute, diagram, …) point at the substrate; changelog inlines its own ~8-line variant of the same contract (read file, append only non-obvious lessons, report at close). Two phrasings of one contract will drift. **Fix:** "Phase 6: capture learnings per `_shared/learnings-capture.md`; /changelog-flavored examples: a recurring category the user pulls out, a phrasing convention." −6 lines.
5. **[P] Phase 1's scope heuristic could state the why.** "Read the top entry for the last date" silently assumes dated newest-first entries; when a repo's changelog was hand-edited out of order this fails quietly. One clause — "entries are newest-first, so the top date is the high-water mark; if the file looks unordered, ask" — makes the heuristic self-correcting. +1 line well spent.
6. **[R] Minor: the References-section rule lives only in Rules**, not in the Phase 3 format block where the model drafts the entry. A drafting model reads the template, not the rules-footer. **Fix:** add `**References:** …` to the Phase 3 template (as session-log already does) and keep the "only if it exists in repo" constraint in Rules.

## Flags inventory

| Flag | Purpose | Verdict |
|---|---|---|
| `--non-interactive` / `--interactive` | W14 mode contract | **Keep (repo contract)** — assessed globally. Phase 4 confirm is the only checkpoint; auto-pick semantics matter because /complete-dev drives this skill headless. |

No skill-specific flags — correct for this skill; "what changed in this release" is natural language all the way down.

## Gates & rubrics inventory

| Check | Hard or soft | Failure it catches | Verdict |
|---|---|---|---|
| Sibling-prefer probe + one-line advisory | Soft (non-blocking, no settings edit) | Writing a second changelog at `{docs_path}/changelog.md` when `docs/changelog.md` already exists (documented 2026-05-08 friction) | **Keep, compress** (finding 3) |
| Phase 4 confirm-before-write | Soft checkpoint (auto-pickable) | Bad entry landing in a user-facing file unreviewed | **Keep** — /complete-dev's `changelog_disposition: accept` short-circuit depends on this being a discrete, classifiable step |
| "Date must be the actual current date" | Hard rule | Model inferring the date from commit timestamps — a real, observed LLM failure mode | **Keep-hard** — one line, real failure |
| "Skip internal refactors / aim 3–7 bullets" | Soft advisory | Changelog bloat / commit-log regurgitation | **Keep as advisory** — these are taste rules, correctly phrased as aims |
| Phase 6 learnings reflection | Soft | Lost cross-run lessons | **Keep via substrate pointer** (finding 4) |

## Fix list

| Fix | Type | Impact | Risk |
|---|---|---|---|
| Drop Track Progress; trim When-to-use and Platform Adaptation to information-bearing lines | quick-win | high | none — no contract touched; non-interactive block and checkpoints unchanged |
| Merge "Determine changelog_path" into Phase 0; compress sibling-prefer probe to ~5 lines | quick-win | med | low — keep the read/write-consistency invariant verbatim |
| Replace Phase 6 stanza with `_shared/learnings-capture.md` pointer | quick-win | med | none — substrate already canonical for 10+ skills |
| Add References line to Phase 3 template | quick-win | low | none |
| Add the "newest-first, top date = high-water mark" why-clause to Phase 1 | quick-win | low | none |
