# Spec — unify /primer + /learn-list via shared topic-research substrate

**Date:** 2026-06-03
**Last updated:** 2026-06-03
**Status:** Draft
**Tier:** 3
**Requirements:** `01_requirements.md` (D1–D14)
**Acceptance criteria:** revised skills conform to `reference/skill-patterns.md §A–§F`.

## 1. Architecture overview

```
                         _shared/topic-research/   (NEW — skill-agnostic substrate)
                         ┌─────────────────────────────────────────────┐
                         │ intake.md        — dials + richness verdict   │
                         │ canon-discovery.md — practitioners+books+harvest│
                         │ outline.md       — cascade+provenance+dedupe   │
                         │ sourcing.md      — rank-then-verify shortlists  │
                         │ source-tiers.md  — anti-slop hard gate (moved)  │
                         │ sourcing-ladder.md — pass-bar/ladder (moved)    │
                         └───────────────▲───────────────▲───────────────┘
                                         │ inline         │ inline
                    ┌────────────────────┘                └────────────────────┐
        primer/SKILL.md  (overlay)                       learn-list/SKILL.md (overlay)
        • consume shortlist → per-H2 evidence            • rank → annotate (≤2 sent)
        • synthesize ALL sources (no short-circuit)      • adjacent rabbit-holes section
        • R1–R10 reviewer · inline SVG                   • follow-list · paste-block
        • audience teach-sections                        • PM-shaped description (rewritten)
        • closing adjacency POINTER section
        • floor = eval-time coverage signal
```

**Dependency direction (D12, load-bearing):** substrate → nothing. Skills → substrate. The substrate has **zero** knowledge of which skill inlines it; it emits typed outputs and the skill owns the reaction.

**Substrate = inlinable markdown** (same contract as `_shared/pipeline-setup.md`): a `SKILL.md` says "Inline `_shared/topic-research/<doc>.md` and follow it." No code module, no parameters.

## 2. Functional requirements

### Substrate authoring + skill-agnosticism

- **FR-1 — `intake.md`.** Defines the unified intake: the `--depth brief|standard|deep` effort dial and the `--audience senior-pms|all-pms` reader axis; a **depth→coverage dial matrix** (topics-per-outline, sources-per-topic, adjacency hops, canon depth per tier — D10, re-expressing `modes.md`); and the **topic-richness classifier** emitting a typed verdict `∈ {rich, narrow-by-design, thin}` with a 1-sentence rationale and (on `thin`) 2–3 reframings. `brief` still prompts `--audience` (D11). Non-interactive auto-picks `senior-pms`.
- **FR-2 — `canon-discovery.md`.** Defines canon discovery: name practitioners + books, **harvest 2–4 existing curations** (awesome-lists, syllabi, "best X" posts), dedupe recurring entries. Emits a canon set + harvested-curation entries.
- **FR-3 — `outline.md`.** Defines outline derivation by **cascade** (≥2 canonical sources agree → use; else curation consensus; else best-effort tagged `provisional`); **records the provenance rung**; **dedupes topics before any downstream use**; defines the **confirm gate** (present outline; approve/edit; non-interactive auto-proceeds). Emits an ordered, deduped outline + its provenance rung.
- **FR-4 — `sourcing.md`.** Defines **rank-then-verify per-topic shortlists**: gather ≤3× candidates → apply hard gate (cheap, pre-fetch) → tier-rank → fetch-verify only top-N against the pass-bar → annotate from fetched content. Emits a verified, ranked shortlist per topic. Includes the **est-cost log line** before sourcing (D13). The per-topic shortlist is the unit for both skills (D4) — no flattening.
- **FR-5 — relocation.** `git mv` `learn-list/reference/source-tiers.md` and `sourcing-ladder.md` → `_shared/topic-research/`. Update every inline reference in `learn-list/SKILL.md` (and any other referrer) to the new path. `learn-list/reference/modes.md` is **deleted**; its dial content folds into `intake.md` (FR-1).
- **FR-6 — skill-agnosticism (D12, enforced).** No file under `_shared/topic-research/` may contain the case-insensitive tokens `primer` or `learn-list`, nor any `if <skill>… else…` per-skill branching, nor a per-skill reaction table. Verified by `assert_substrate_skill_agnostic.sh` (FR-21).

### Unified intake + flag retirement

- **FR-7 — primer intake.** `/primer` keeps `--depth` + `--audience` (no surface change) but now resolves them by inlining `intake.md`; its per-project depth persistence (`default_primer_depth`) is preserved.
- **FR-8 — learn-list intake.** `/learn-list` adopts `--depth brief|standard|deep` (was `--mode quick|standard|deep`; `quick`→`brief`) and `--audience senior-pms|all-pms` (was `--level beginner|practitioner`). `argument-hint` frontmatter updated.
- **FR-9 — retired-flag rejection (D8).** Passing `--mode` or `--level` to `/learn-list` → platform-aware error naming the replacement (`unknown flag '--mode'. Use --depth brief|standard|deep instead.` / `unknown flag '--level'. Use --audience senior-pms|all-pms instead.`), exit 64. No silent alias.
- **FR-10 — retired-flag caller sweep (D14).** During `/execute`, grep the whole repo for `/learn-list` invocations using `--mode`/`--level` (READMEs, other skills, tests, examples, docs) and update them to `--depth`/`--audience`. Record what was changed.

### Richness classifier — shared signal, per-skill reaction (D6)

- **FR-11 — primer reaction.** `/primer` consumes the verdict: `rich` → proceed; `narrow-by-design` → outline carve-out (no decision-guide H2, as today); `thin` → offer reframings (as today). The reaction text lives in `primer/SKILL.md`, not the substrate.
- **FR-12 — learn-list reaction.** `/learn-list` consumes the verdict softly: any verdict proceeds; `thin` simply yields a smaller honest list, never blocks. Reaction text lives in `learn-list/SKILL.md`.

### primer back-half overlay

- **FR-13 — floor as eval-time coverage signal (D5).** `/primer`'s source-floor (6/10/15 by depth) no longer gates or short-circuits sourcing; it becomes a **coverage signal** evaluated after sourcing — below floor → surface a thin-source disclosure (existing mechanism), never block or early-stop.
- **FR-14 — remove short-circuit.** Delete `/primer`'s "≥3-source short-circuit" and any flattened-pool compile trigger. `/primer` reads + synthesizes **every** verified source across all per-topic shortlists.
- **FR-15 — per-H2 evidence mapping.** Each outline topic's verified shortlist is the evidence set for the corresponding `<h2>`. The four-strand Phase-2 research is replaced by the shared canon→outline→sourcing flow; the R1–R10 reviewer + citation discipline (every `<a href>` ∈ verified shortlist) is unchanged.
- **FR-16 — adjacency pointer section.** `/primer` emits a closing "Where this connects — adjacent topics" section of *pointers* (1 line each, no teaching), depth-scaled: `brief` = none, `standard` = short list, `deep` = richer. Distinct from learn-list's "adjacent rabbit holes."

### learn-list back-half overlay + identity

- **FR-17 — back half unchanged in shape.** rank → annotate (≤2 sentences) → adjacent rabbit-holes → follow-list → paste-block, all preserved. Book-summary parity rule preserved (now sourced via the moved `sourcing-ladder.md`).
- **FR-18 — PM-shaped description/triggering rewrite (D3 consequence).** `/learn-list`'s frontmatter `description` is rewritten to be PM-audience-shaped (drops topic-agnostic framing), retains ≥5 user-spoken trigger phrases, and reflects the new `--depth`/`--audience` flags. Name still matches dir (`learn-list`).
- **FR-19 — adjacency hops keyed to depth.** learn-list's adjacency walk hops (0/1/2) re-key from `--mode` to `--depth` (brief=0, standard=1, deep=2) via the `intake.md` dial matrix.

### skill-patterns conformance (§A–§F)

- **FR-20 — both skills conform to `skill-patterns.md §A–§F`:** §A frontmatter (name matches dir; `argument-hint` enumerates every flag); §B description & triggering (rewritten learn-list description; primer description still accurate); §C progressive disclosure (front-half logic in inlined substrate, not restated); §D body & content; §E scripts/tooling (tests updated); §F platform-conditional notes (both skills' Platform Adaptation sections updated for the substrate's tool needs — WebFetch/WebSearch/Task/context7).

### Tests + enforcement

- **FR-21 — `assert_substrate_skill_agnostic.sh`.** New test under `_shared/topic-research/tests/` (or the repo's integration test dir): greps the four substrate docs for `primer`/`learn-list` tokens → fail on any hit. Wired into skill-eval `[D]` checks + `/verify`.
- **FR-22 — learn-list structure test update.** `learn-list/tests/structure.test.sh` updated: asserts new `--depth`/`--audience` flags, retired-flag rejection, substrate inline references resolve, moved reference paths exist.
- **FR-23 — primer test (if present) / smoke.** Assert primer inlines the substrate, has the adjacency section directive, and no longer contains the short-circuit text.

## 3. Interface contracts (typed substrate outputs)

| Substrate doc | Emits | Consumer reads |
|---|---|---|
| `intake.md` | `{depth, audience, richness_verdict, rationale, reframings[]}` | both skills (reaction per-skill) |
| `canon-discovery.md` | `{practitioners[], books[], curations[]}` | `outline.md` (feeder), both skills |
| `outline.md` | `{topics[] (deduped, ordered), provenance_rung}` | both skills (TL;DR shows provenance) |
| `sourcing.md` | `{per_topic: {topic, shortlist[] (verified, ranked, annotated)}}` | primer (per-H2 evidence) / learn-list (list rows) |

Outputs are conceptual (in-context), not files — the substrate is inlined markdown guidance, so "emits" means "the SKILL.md proceeds with these values in working memory."

## 4. Flag parsing (both skills)

```
--depth  ∈ {brief, standard, deep}     (effort dial; primer default persisted; learn-list default standard)
--audience ∈ {senior-pms, all-pms}     (reader axis; default senior-pms; non-interactive auto-pick)
--format ∈ {html, md, both}            (unchanged)
--non-interactive | --interactive      (unchanged)
--mode  → REJECT (FR-9)                 learn-list only
--level → REJECT (FR-9)                 learn-list only
unknown → existing unknown-flag error
```

## 5. Testing strategy

- **Deterministic (`[D]`, bash):** FR-21 (substrate skill-agnostic grep), FR-22 (learn-list structure test), moved-path existence, retired-flag rejection string presence, `argument-hint` enumerates flags, name-matches-dir.
- **LLM-judge (`[J]`, skill-eval rubric):** progressive-disclosure (front-half not restated in SKILL.md), description-triggering quality (learn-list PM-shaped + ≥5 triggers), substrate docs read as mechanism-only, primer adjacency pointer (not teach) section present, no short-circuit remnant.

## 6. Verification plan (feeds /plan final checklist)

1. `bash assert_substrate_skill_agnostic.sh` → pass (no `primer`/`learn-list` in substrate).
2. `bash plugins/pmos-learnkit/skills/learn-list/tests/structure.test.sh` → pass.
3. `grep -ri -- '--mode\|--level' plugins/ README* docs/` shows no live `/learn-list` callers (only the rejection-error definitions + this spec/requirements).
4. Both `SKILL.md` inline `_shared/topic-research/*` and do not restate the front-half logic.
5. `_shared/topic-research/{intake,canon-discovery,outline,sourcing,source-tiers,sourcing-ladder}.md` all exist; `learn-list/reference/{source-tiers,sourcing-ladder,modes}.md` no longer exist.
6. primer SKILL.md: no "short-circuit" text; adjacency section directive present; floor described as eval-time signal.
7. skill-eval binary rubric: both skills PASS (Phase 6a).

## 7. Release prerequisites (for /complete-dev — not /plan waves)

- Bump `plugins/pmos-learnkit/.claude-plugin/plugin.json` + `.codex-plugin/plugin.json` to the next **minor** (0.9.0) in sync.
- README rows for `/primer` + `/learn-list` updated for the unified `--depth`/`--audience` flags + learn-list's PM framing.
- Changelog entry (user-facing).
- `~/.pmos/learnings.md` `## /primer` + `## /learn-list` headers exist (bootstrap if missing).
- No `marketplace.json` version field (per repo invariant).
