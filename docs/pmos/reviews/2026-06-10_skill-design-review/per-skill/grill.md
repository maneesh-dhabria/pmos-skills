# grill — review

**Grade:** B (well-designed core; ~50 lines of substrate duplication and over-specification worth trimming)
**Size:** SKILL.md 206 lines (177 excluding non-interactive block); references 0 files / 0 lines; target ~120 lines (~90 excluding the block).

## TL;DR

- **Biggest win available:** Phase 3b step 5 inlines the full FR-10 HTML-emit block (~20 lines) that `_shared/html-authoring/README.md` already documents as a 6-step checklist — and the same inline block exists in 12 SKILL.md files (`grep -l "Asset substrate (FR-10)"`). Replacing it with a substrate pointer + grill's 3 genuine deltas saves ~18 lines here and ends the 12-file fanout tax on every substrate change.
- **Biggest risk:** contract mismatch with the orchestrator — `/feature-sdlc` (Phase 1a, line 523) invokes `/pmos-toolkit:grill --deep`, but grill defines only `--depth=quick|standard|deep`. An undefined flag the caller depends on is exactly the silent-drift class this repo lints against elsewhere.
- **Worth keeping:** the things that distinguish this from Pocock's 5-line `grill-me` are mostly earned — Phase 1's decision-tree triage table (skip stated-and-justified; answer-from-code; order by leverage), the sharp-not-hedged Recommended-option shape, depth control, the Grill Report, and the Anti-Patterns section, which is the most Pocock-like writing in the file.

## What the ~200 extra lines bought (vs. grill-me's 5)

Pocock's grill-me is 5 lines because it has no pipeline, no artifacts, no depth control, and no downstream consumers. Grill's additions, sorted by value:

| Purchase | Lines | Verdict |
|---|---|---|
| Phase 1 triage table (5 decision classes, leverage ordering) | ~12 | **Keep** — distilled judgment Pocock covers 1/5th of ("explore the codebase instead"). "Don't grill what's already defended" and "don't grill leaves before the root" are real failure modes in naive grilling. |
| Anti-Patterns (don't hedge, don't batch, don't implement, terminal state = report) | ~8 | **Keep** — each names a real drift mode. |
| Recommended-option shape (Recommended / alternatives / Elaborate / Skip) | ~8 | **Keep** — "be sharp, not hedged… take a position" is the skill's voice; the Elaborate/Skip escape hatches are good UX. |
| Depth tiers + budgets | ~8 | **Keep** — the explicit "deep has **no limit**" is earned: commit `a96e97e` (v2.15.1) removed a question cap because deep mode stopped early. A documented past failure, not arbitrary. |
| Grill Report template + opt-in save | ~20 + ~50 | **Keep template; compress save** — persistence is what makes grill outputs pipeline inputs (grill reports seed /requirements, /spec; see `[ideate-grill: …]` passthrough in feature-sdlc). But ~half of Phase 3b is duplicated substrate (below). |
| Reviewer-subagent Input Contract (FR-50/51/52) | ~8 | **Keep — load-bearing coupling.** feature-sdlc Phase 2a chrome-strips, passes the slice inline, and hard-validates `sections_found` + quotes parent-side. Do not delete; do relocate (below). |
| Resolver integration, output_format, non-interactive block | ~45 | Repo contracts — assessed globally, not grill defects. |
| Stem→phase switch table, internal tracking table, repeated one-question-per-turn | ~22 | **Ballast** — see findings 3–5. |

Net: roughly 120 of the 200 extra lines are earning their keep; ~50 are compressible without behavior change.

## Findings

1. **[S] Phase 3b step 5 duplicates the html-authoring substrate.** The "Asset substrate (FR-10)" bullet (asset file enumeration, `cp -n` idempotency, cache-bust, heading IDs, index regen, retired FR-12.1 note) restates `_shared/html-authoring/README.md`'s authoring checklist. 12 skills carry this same inline block. Grill's only genuine deltas: the 3-tier save-path resolution, the `../assets/` prefix (grills/ is one level deep), and "repo/home saves don't regen an index." **Fix:** "Emit per `_shared/html-authoring/README.md` checklist" + the 3 deltas. ~18 lines saved; substrate changes stop fanning out.
2. **[F][R] Undefined `--deep` flag in the orchestrator contract.** feature-sdlc line 523 calls `/pmos-toolkit:grill --deep`; grill's argument-hint and Phase 0 define only `--depth=`. A capable model guesses right, but the repo's own posture (lint-enforced byte-identical blocks, audit scripts) says contracts shouldn't rely on guessing. **Fix:** one line in Phase 0 step 2 — "`--deep` is an alias for `--depth=deep`" — or fix the feature-sdlc call site.
3. **[P][V] Phase 0's stem→phase switch table over-specifies a trivial mapping.** Three rows of `01_requirements → phase=requirements`. Any model maps a numbered stem to its phase. **Fix:** "If the argument is a pipeline-doc stem, resolve via `_shared/resolve-input.md` with the matching phase; otherwise read the path directly." −8 lines.
4. **[V] One-question-per-turn is stated three times** — Platform Adaptation ("never batch"), Phase 2 step 3 ("Do NOT batch"), Anti-Patterns ("Do NOT batch questions"). Defensive triple-statement is the verbosity smell the review is hunting. **Fix:** keep the Anti-Patterns line (where a scanning model will find it); drop the other two.
5. **[P] Phase 2 step 5's internal findings table is bookkeeping-for-bookkeeping's-sake.** "Track findings in a running internal table" with a 5-column schema for state the model holds anyway, and which the Phase 3 report template already forces into shape at emit time. **Fix:** delete; the report template is the real contract.
6. **[R] The reviewer-subagent Input Contract is mis-shelved.** It sits as a subsection inside "Phase 1: Build the Decision Tree," where a standalone-flow reader hits FR-50/51/52 machinery mid-essay. It's the one part of the file that exists for a different caller. **Fix:** move to its own top-level section ("When invoked by /feature-sdlc as a reviewer") or a one-page reference file. **Do not delete** — feature-sdlc Phase 2a hard-fails on this output shape.
7. **[V] Phase 3b slug + dedupe rules (4–5 meaningful words, ASCII, `-2`/`-3` suffixing)** restate a convention every artifact-emitting skill follows. Minor; fold to "derive a kebab-case slug; dedupe with numeric suffix."
8. **[F] argument-hint advertises `--format <html|md|both>` but `both` is retired** (Phase 3b: "treated as `html` until a future feature re-introduces MD export"). The hint sells an option that silently aliases. Minor; repo-wide FR-12 wording, flag once globally.

## Flags inventory

| Flag | Purpose | Verdict |
|---|---|---|
| `--depth=quick\|standard\|deep` | Effort control for the interrogation | **Keep** — genuinely changes behavior; natural language ("grill me deeply") also works and the hint documents the canonical form. Add `--deep` alias or fix feature-sdlc (finding 2). |
| `--save` / `--no-save` | Skip the persist prompt | **Keep** — needed for non-interactive/orchestrated runs; interactive users can just answer the prompt. |
| `--format <html\|md\|both>` | Output-format override (FR-12) | **Keep (repo contract)** — but `both` is dead weight in the hint (finding 8). |
| `--non-interactive` / `--interactive` | W14 mode contract | **Keep (repo contract)** — note grill in non-interactive mode defers every question (each is defer-only: free-form), which is why feature-sdlc auto-skips Phase 2a under `--non-interactive`. Coherent by design. |

## Gates & rubrics inventory

| Check | Hard or soft | Failure it catches | Verdict |
|---|---|---|---|
| Phase 0 step 3: summarize-before-grilling | Soft | Interrogating a misread artifact (wasted turns) | **Keep** — 3 lines, real failure mode, cheap. |
| Depth question budgets (3–5 / 6–12) | Soft (advisory; "next branch is low-leverage" qualifier) | Endless quick/standard sessions | **Keep as advisory.** |
| Deep-mode "no limit" rule | Hard-ish (explicit negation of a budget) | Model self-truncating the tree — documented failure, fixed in v2.15.1 (`a96e97e`) | **Keep-hard** — this sentence exists because the failure happened. |
| FR-51 output shape (`sections_found` + ≥40-char quotes) when reviewer-invoked | Hard (validated parent-side, FR-52) | Hallucinated section refs / fabricated quotes in reviewer findings | **Keep-hard** — validation correctly lives in the parent; grill only carries the shape. |
| output_format stderr echo (FR-12) | Hard (repo contract) | Silent format drift | Keep; assess globally, not per-skill. |
| Phase 4 learnings reflection | Soft | Lost session learnings | Keep (repo contract; "zero learnings is valid" keeps it honest). |

## Fix list

| Fix | Type | Impact | Risk |
|---|---|---|---|
| Replace Phase 3b FR-10 inline block with substrate pointer + 3 grill deltas | structural (pattern applies to 12 skills) | high | low — README.md already states the checklist; verify it mentions FR-41 manifest-inlined index (it still says `_index.json`; update README once) |
| Define `--deep` alias or fix feature-sdlc call site | quick-win | high | none |
| Collapse stem→phase switch table to one sentence | quick-win | med | none |
| De-duplicate one-question-per-turn to a single statement | quick-win | low | none |
| Delete Phase 2 internal tracking table | quick-win | low | none |
| Move reviewer Input Contract out of Phase 1 to its own section | quick-win | med | low — content unchanged, placement only; feature-sdlc cites the contract, not the line number |
| Drop `both` from argument-hint (or annotate "= html") | quick-win | low | none — repo-wide decision, coordinate globally |
