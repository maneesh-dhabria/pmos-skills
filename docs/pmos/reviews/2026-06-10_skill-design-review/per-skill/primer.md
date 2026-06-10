# primer — review

**Grade:** C (the verification-first design is genuinely good; the SKILL.md is a compiled spec, not instructions — a meaningful rewrite would pay off)
**Size:** SKILL.md 395 lines (311 excluding non-interactive block); references 6 files / 518 lines; target ~150 lines (SKILL.md, excl. block) + ~420 reference lines after the source-floor.md rewrite.

## TL;DR

- **Biggest win available:** strip the ~60 FR/S-FR/D spec-citations and collapse Phase 5's 16-step procedure to its 5 load-bearing rules — the skill loses zero behavior and roughly halves. The FR tags point at feature-folder docs the runtime model never reads; they are provenance masquerading as instruction.
- **Biggest risk in current design:** `reference/source-floor.md` still describes the **pre-unification architecture** — four research strands, a blocking source-floor gate with "Abort (Recommended)", "<4 sources" residuals, and a conflicting `sources.json` schema — all of which SKILL.md Phase 3 (FR-13) and the unify spec (D5/FR-15, `docs/pmos/features/2026-06-03_unify-primer-learnlist/02_spec.md`) explicitly retired. A model that follows the SKILL.md pointer into that file can resurrect the deleted gate or emit the wrong schema.
- **Done well, keep:** `reference/curator-lens.md` is the Pocock pattern executed perfectly — it names itself the load-bearing quality lever ("if drafts come back as explainer-voice, edit this file first"), teaches the one distinction that matters with a worked example, and pushes everything else out of the way. The trust/taste rubric split and the orchestrator's quote-verbatim defense are also genuinely well-designed machinery.

## Findings

1. **[R] `reference/source-floor.md` contradicts the SKILL.md it serves.** SKILL.md Phase 3: "The floor … is **NOT a sourcing gate and never short-circuits or caps sourcing** … informational, never blocking." source-floor.md §Gate trigger / §Gate options: "If `count < floor`, fire the source-floor gate … **Abort (Recommended)** — exit cleanly." The file also still describes the four-strand Phase-2 research (strands a–d, short-circuit rules) that the unify spec replaced ("The four-strand Phase-2 research is replaced by the shared canon→outline→sourcing flow" — FR-15, 2026-06-03_unify-primer-learnlist/02_spec.md), plus stale "<4 sources" copy from the original floor=4 era (2026-05-23 spec FR-5.2). Two incompatible `sources.json` schemas now coexist: SKILL.md Phase 3 says entries carry `{url, takeaway, topic, tier, paywalled?, free_alt?, book_summary?}` with substrate T1–T4 tiers; source-floor.md says `{url, title, fetched_at, byte_size, takeaway, tier: "primary"|"secondary", source_strand}` plus a `practitioner_index`. **Fix:** rewrite source-floor.md to ~30 lines — floor table (6/10/15), thin-source disclosure banner, WebFetch-unavailable degradation — and delete the strands, the gate, the retry protocol, and the duplicate schema. State the schema once, in SKILL.md Phase 3.
2. **[V] Spec-citation soup.** ~60 inline tags — FR-8.3, S-FR-6.2, FR-D01, "per spec D2", "grill-Q3, v0.3.0" — thread through every phase. They are commit-history bookkeeping, not model instruction; they make each sentence ~30% longer and signal "legal contract", the exact register the north star avoids. The behavior text is complete without them. **Fix:** delete every FR/S-FR/D/grill tag from SKILL.md and rubric.md (keep them in the feature folders, where they live). ~35 lines saved, large readability gain, zero behavior change.
3. **[R] Stale step cross-references inside Phase 5 — insertion without renumbering.** Phase 0 says the timestamp is "used in Phase 5 **step 14**" but `last_elapsed_seconds` is written in step 15; Phase 5 step 5 says "execute the FR-RECOVERY path (**step 15** below)" but FR-RECOVERY is step 16. Both off-by-one, classic incremental-edit drift (a step was inserted, references weren't). The worked example also says "iteration-2 all-pass" two paragraphs after step 4 declares "no iteration-2 retry". **Fix:** renumber (or better: name the steps and reference by name — names survive insertion).
4. **[P] Phase 5 step 13 (listing regen) is 35 lines of micromanaged manifest mechanics** — id-derivation rules, sort tie-breaks, the full token list repeated from step 9, what `viewer.js` will do. The intent is one sentence: "Regenerate `primers.html` so every primer is reachable from one listing page, newest first, rendered through the substrate template with the same tokens as step 9 — don't use index-generator.md's phase grouping (meaningless for a flat collection)." The atomic-write discipline is likewise stated twice (steps 8 and 13). **Fix:** collapse to intent + the one non-obvious rule (don't use index-generator's phase grouping, and why); trust the model with `mv` semantics it already executed in step 8.
5. **[S] Primer half-uses the substrate intake.** `/learn-list` inlines `_shared/topic-research/intake.md` whole; `/primer` inlines only its §Topic-richness classifier and re-implements depth/audience resolution itself across Phase 0.5 + Phase 1 (the audience prompt now exists verbatim in three places: intake.md, primer Phase 1, and audience-presets.md's preamble). intake.md even anticipates the lastrun case ("a skill may persist its own per-project default and pass it in; honor that as the fallback"). **Fix:** let intake.md own dial resolution for primer too, with primer supplying its persisted defaults — deletes most of Phase 0.5 and the Phase-1 audience-resolve block.
6. **[Ph] Phase 0.5 is a fractional phase doing intake work.** Lastrun-defaults confirm, first-run depth prompt, depth-precedence resolution — all of it is intake. With finding 5 applied it folds into Phase 1 and the fractional number disappears. (The "Track Progress" preamble already has to explain the numbering awkwardness: "5 sequential phases … plus an intake/setup phase (Phase 0 + Phase 0.5)".)
7. **[F] `--format` is a zombie flag.** Step 14: "Retired (FR-12.1) — `output_format=both` (and `md`) is treated as `html`". The argument-hint still advertises `--format <html|md|both>`, Phase 0 still resolves and stderr-logs it, Phase 0.5 still offers "Edit output_format", and lastrun still persists it — all to feed a value that is ignored. **Fix:** drop the flag (or error on `md`/`both`) and delete the resolution plumbing. Note the sibling asymmetry: in `/learn-list`, `--format both` actually works.
8. **[F] `--autonomous` vs `--non-interactive` is two overlapping "don't ask me" modes.** Their differences are subtle (autonomous skips the Phase 0.5 gate entirely and suppresses the settings write; non-interactive auto-picks Recommended options and logs to the OQ buffer) and nowhere explained side-by-side. A user cannot predict which to pass. **Fix:** fold `--autonomous` into `--non-interactive` (the OQ buffer already records what autonomous silently does); keep one mode.
9. **[V] Anti-Patterns is 14 bullets, several restating mandates already given.** "No novel URLs" appears three times in the file (Phase 4 citation discipline, anti-pattern 1, anti-pattern 5); the social-fetch rules appear in full in social-sourcing.md, then again as three anti-pattern bullets. The genuinely non-obvious ones (fabricated authority worse than thin sourcing; don't skip the richness check because narrow-by-design is consumed downstream; breadth-beats-depth in sourcing) earn their place. **Fix:** cut to ~6 bullets, each carrying its failure mode, drop pure restatements.
10. **[P] The two "informational note" mandates over-specify wording.** Steps 6–7 require prepending *exactly* `"Note: <X>/<N> H2s have zero worked examples. "` etc. These notes are explicitly non-blocking; mandating byte-exact phrasing for advisory text is prescription with no failure mode behind it. **Fix:** "mention example density / word count at the write gate when they're off" — one line each.
11. **[X] Cross-platform is mostly good** (the Platform Adaptation block is specific and names degradation paths — better than most). Residuals: the byte-identical non-interactive block prints `pmos-toolkit: /<skill> finished` — wrong plugin name in a learnkit skill (global-block issue, flagged here for the global assessment, not counted against primer); `TaskCreate` is named with an "e.g." hedge, fine.
12. **[V] The worked example (30 lines) is good pedagogy but written at spec register** — it narrates stderr lines and FR numbers rather than what a reader needs (what each phase produces). Keep it; compress to ~15 lines once the FR tags go.

## Flags inventory

| flag | purpose | verdict |
|---|---|---|
| `--depth brief\|standard\|deep` | effort/sizing dial, persisted per-project | keep — typed, persisted, shared with /learn-list; natural-language cues already map to it ("brief primer on X" triggers per the description), so the flag is the explicit override, which is the right shape |
| `--audience senior-pms\|all-pms` | reader shaping | keep — two-value enum tied to a real contract (audience-presets.md) |
| `--format html\|md\|both` | output format | **delete** — `md`/`both` are silently coerced to `html` (Phase 5 step 14); a flag that accepts values it ignores is worse than no flag |
| `--autonomous` | skip confirm gates | **fold into `--non-interactive`** — overlapping semantics, unpredictable difference |
| `--non-interactive` / `--interactive` | repo-wide mode contract | keep — global contract, assessed once globally |

## Gates & rubrics inventory

| check | hard or soft | failure it catches | verdict |
|---|---|---|---|
| Topic vagueness heuristic (<3 tokens, "no content word ≥4 chars") | soft prompt | garbage-topic runs | soften wording — "if the topic looks ambiguous, ask" is more durable than a token-length pseudo-algorithm; keep the prompt |
| Topic-richness classifier (substrate) | soft, typed verdict | thin topic → thin primer indistinguishable from intentional | keep — verdict is consumed downstream (narrow-by-design carve-out) |
| Outline confirm gate | soft (auto-proceeds NI) | sourcing the wrong topics (the expensive step) | keep — cheap insurance, well-motivated in outline.md |
| Path-collision prompt | hard prompt | silent overwrite / data loss | keep-hard |
| Source floor 6/10/15 | informational (post-D5) | thin evidence base | keep as signal — already correctly demoted; fix the reference that still calls it a gate (finding 1) |
| Trust tier R1/R2/R3/R6/R7 + hard-block | hard | fabricated URLs, plagiarism, hand-waved claims, structure drift | keep-hard — this is the product; removing it makes /primer a prettier hallucination |
| Quote-verbatim ≥40-char test (orchestrator) | hard | hallucinated reviewer fails | keep — the cleverest piece of machinery here; cheap, model-version-robust |
| check_id set-match validation | hard | malformed reviewer output | keep — one line of cost |
| Iteration cap = 1 | hard | unbounded refinement loops (rejected explicitly in the 2026-05-23 spec) | keep — stated failure mode, cited origin |
| Taste-tier override gate (R4/R5/R8/R9/R10) | soft | subjective quality residuals | keep-soft — correct tier for subjective checks |
| Worked-example / word-count notes (exact prepend text) | informational | mis-sized / example-free drafts | soften — keep the signal, drop the byte-exact wording mandate |
| FR-RECOVERY draft path | hard | shipping a trust-failed artifact | keep-hard — the banner + failing-checks dump is the right "fail loudly" shape |
| Learnings capture (Phase 6) | soft | lost cross-run lessons | keep — "zero learnings is valid; the gate is the reflection" is the right calibration |

## Fix list

| fix | type | impact | risk |
|---|---|---|---|
| Rewrite `reference/source-floor.md` to post-unification reality (~30 lines: floor table, disclosure, WebFetch-unavailable); delete strands/gate/duplicate schema | structural | high | low — SKILL.md already states the new contract; this removes the contradiction |
| Strip all FR/S-FR/D/grill citation tags from SKILL.md + rubric.md | quick-win | high | none — provenance lives in the feature folders |
| Fix stale step refs (Phase 0 → "step 14"; step 5 → "step 15"; worked-example "iteration-2") — reference steps by name | quick-win | med | none |
| Collapse Phase 5 step 13 (listing regen) to intent + the one non-obvious rule | structural | med | low — behavior identical; trusts the model with mechanics it already does in step 8 |
| Delete `--format` plumbing (or hard-error on md/both) | quick-win | med | low — flag is already a no-op; update argument-hint + lastrun shape in same pass |
| Fold `--autonomous` into `--non-interactive` | structural | med | med — touches the mode contract; coordinate with the global non-interactive posture |
| Let `_shared/topic-research/intake.md` own depth/audience resolution (primer passes persisted defaults); fold Phase 0.5 into Phase 1 | structural | med | med — touches lastrun mechanics; substrate already anticipates it |
| Cut Anti-Patterns 14 → ~6 bullets; drop restated mandates | quick-win | med | none |
| Trim social-sourcing.md's stale "Phase-2 Step-0 / strand-(a)/(b)" references | quick-win | low | none |
| Soften the two byte-exact informational-note mandates | quick-win | low | none |
