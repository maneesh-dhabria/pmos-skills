# Plan — unify /primer + /learn-list via shared topic-research substrate

**Date:** 2026-06-03
**Spec:** `02_spec.md` (FR-1..23)
**Execution mode:** inline (hand-driven this session)
**Tier:** 3
**Release-prereqs:** in spec §7 — NOT in any wave below (skill-patterns §G).

## Code study notes

- Substrate = inlinable markdown (contract: `_shared/pipeline-setup.md`). Skills say "Inline `_shared/topic-research/<doc>.md`".
- Existing learn-list reference files are already well-structured: `source-tiers.md` (hard gate + tiers) and `sourcing-ladder.md` (pass-bar + rank-then-verify + curation harvest + book summaries) move almost verbatim; `modes.md` dial matrix folds into `intake.md` re-keyed to `--depth`.
- primer Phase 2 (four-strand + source-floor + ≥3 short-circuit) + Phase 3 (outline) are the front-half blocks to replace with substrate inlines. R1–R10 reviewer (Phase 5) untouched.
- Paths use relative `_shared/…` / `reference/…` form (existing convention; learn-list anti-pattern #8 forbids absolute paths).

## Wave 1 — Substrate creation + relocation (parallelizable; distinct files)

- **T1 — `_shared/topic-research/intake.md`** (FR-1, D10/D11). Define `--depth brief|standard|deep` + `--audience senior-pms|all-pms`; the depth→coverage dial matrix (topics/sources-per-topic/adjacency-hops/canon-depth per tier, re-keyed from `modes.md`); the topic-richness classifier emitting `{verdict ∈ rich|narrow-by-design|thin, rationale, reframings[]}`. `brief` still prompts audience; non-interactive auto-picks `senior-pms`. **Skill-agnostic** (FR-6). *Verify: file exists; contains the three dials/matrix/classifier; no `primer`/`learn-list` token.*
- **T2 — `_shared/topic-research/canon-discovery.md`** (FR-2). practitioners + books + curation harvest (2–4) + dedupe. Emits canon set + curation entries. Skill-agnostic. *Verify: exists; no skill token.*
- **T3 — `_shared/topic-research/outline.md`** (FR-3). Cascade derivation + provenance rung + dedupe-before-downstream + confirm gate. Emits ordered deduped outline + provenance rung. Skill-agnostic. *Verify: exists; no skill token.*
- **T4 — `_shared/topic-research/sourcing.md`** (FR-4, D4/D13). Rank-then-verify per-topic shortlists + pass-bar + est-cost log line; references the moved `source-tiers.md`/`sourcing-ladder.md`. Emits verified ranked shortlist per topic. Skill-agnostic. *Verify: exists; no skill token; est-cost line present.*
- **T5 — relocation** (FR-5). `git mv learn-list/reference/source-tiers.md sourcing-ladder.md → _shared/topic-research/`; `git rm learn-list/reference/modes.md`. *Verify: new paths exist; old paths gone.*

## Wave 2 — Enforcement test (after Wave 1)

- **T6 — `assert_substrate_skill_agnostic.sh`** (FR-21, TDD). Greps the six `_shared/topic-research/*.md` for case-insensitive `primer`/`learn-list` → exit 1 on any hit. Self-test: temporarily inject a token → fails; remove → passes. Lives at `plugins/pmos-learnkit/skills/_shared/topic-research/tests/`. *Verify: script passes against the real substrate.*

## Wave 3 — Skill overlays (parallelizable; primer + learn-list are distinct files; after Wave 1)

- **T7 — `primer/SKILL.md`** (FR-7,11,13,14,15,16,20). Replace Phase-2 four-strand research + Phase-3 outline with substrate inlines (intake→canon→outline→sourcing); keep R1–R10 reviewer. floor = eval-time coverage signal (FR-13); **remove the ≥3-source short-circuit** (FR-14); per-H2 evidence = the topic's verified shortlist (FR-15); add closing **adjacency pointer section** depth-scaled (FR-16); richness reaction (rich/narrow-by-design carve-out/thin reframings) stays in this file (FR-11); update Platform Adaptation + argument-hint. *Verify: inlines substrate; no "short-circuit" text; adjacency section present; floor described as signal.*
- **T8 — `learn-list/SKILL.md`** (FR-8,9,12,17,18,19,20). Adopt `--depth`/`--audience`; **reject `--mode`/`--level`** with replacement-naming errors (FR-9); inline substrate (intake→canon→outline→sourcing) referencing moved paths; richness soft reaction (FR-12); adjacency hops re-keyed to `--depth` (FR-19); **rewrite the PM-shaped `description`** with ≥5 triggers (FR-18); back half (annotate/rabbit-holes/follow-list/paste-block) unchanged (FR-17); update argument-hint + Platform Adaptation. *Verify: new flags; rejection strings; PM description; inlines substrate; back-half intact.*

## Wave 4 — Caller sweep + tests (after Wave 3)

- **T9 — retired-flag caller sweep** (FR-10). `grep -rn -- '--mode\|--level'` across `plugins/ README* docs/`; update any live `/learn-list` caller to `--depth`/`--audience`; leave rejection-error definitions + spec/requirements prose. *Verify: no live callers remain.*
- **T10 — `learn-list/tests/structure.test.sh`** (FR-22). Assert: `--depth`/`--audience` present in argument-hint; `--mode`/`--level` rejection strings present; substrate inline references + moved paths resolve. *Verify: test passes.*
- **T11 — primer smoke** (FR-23, light). Grep-assert primer inlines substrate + has adjacency directive + no short-circuit remnant. (Folded into T10's script or a sibling.) *Verify: passes.*

## Wave 5 — Final verification

- **T12 — run spec §6 verification plan** end-to-end (all 7 checks). Resolve any failure before declaring done.

## Final verification checklist (spec §6, verbatim)

1. `bash assert_substrate_skill_agnostic.sh` → pass.
2. `bash learn-list/tests/structure.test.sh` → pass.
3. `grep -ri -- '--mode\|--level' plugins/ README* docs/` → no live `/learn-list` callers.
4. Both `SKILL.md` inline `_shared/topic-research/*`; front-half logic not restated.
5. Six substrate docs exist; `learn-list/reference/{source-tiers,sourcing-ladder,modes}.md` gone.
6. primer: no "short-circuit"; adjacency section; floor = eval-time signal.
7. skill-eval binary rubric: both skills PASS.

## Risks

- **R1 — primer front-half surgery is the biggest edit.** primer's Phase 2/3 are tightly woven with the R1–R10 reviewer + sources.json contract. Mitigation: preserve the citation-discipline contract (every `<a href>` ∈ verified shortlist); the shortlist replaces the four-strand pool as the source of `sources.json`.
- **R2 — accidental skill token in substrate.** Easy to write "as /primer does…" in a substrate doc. Mitigation: T6 grep is the backstop; run it after every substrate edit.
- **R3 — moved-path referrers.** Other files may reference the old `learn-list/reference/source-tiers.md` path. Mitigation: grep for the old paths during T5/T9.
