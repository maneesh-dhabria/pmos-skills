# artifact — review

**Grade:** C+ (would benefit from a meaningful rewrite of SKILL.md; the data-file architecture underneath is genuinely good)
**Size:** SKILL.md 574 lines (~545 excluding non-interactive block, L41–69); references 13 files / 2,406 lines (4 templates 727, 4 evals 1,553 — these are data, not prose; 4 presets 79; reviewer-prompt 47); target ~280–300 lines for SKILL.md.

## TL;DR

- **Biggest win available:** ~150 lines of SKILL.md restate substrate contracts that already live (verbatim, with tests) in `_shared/html-authoring/` — the v2.42.0 parity work fanned the emit contract out instead of citing it, and the duplication has *already drifted into self-contradiction* (output_format=both is declared retired at L204 and honored at L286/L325). Promote the emit contract to one citation or a lint-guarded canonical block.
- **Biggest risk in current design:** incoherence from layered edits — three internal contradictions/stale references (the `both` sidecar, the retired `.comments.json` sidecar at L553, colliding FR-22 meanings) mean a model following the file literally will do the wrong thing on at least one path today.
- **Done well, worth keeping:** templates/evals/presets as *data files* loaded on demand is exactly the Pocock `improve-codebase-architecture` pattern — SKILL.md defines the engine once; 4 doc types × 2 tiers × 4 presets ride along as declarative content, and user-authored templates at `~/.pmos/artifacts/` extend it without touching the skill. The reviewer-prompt.md is tight (47 lines) and the eval criteria are real PM craft (Cagan risk dims, Adzic impact-laddering, walking-skeleton marking), not filler.

## Findings

1. **[S] The v2.42.0 parity case study: the emit contract should live in `_shared/` once, and the evidence is in this file.** SKILL.md L173–223 (Phase 2.7) restates the authoring contract that `_shared/html-authoring/README.md` already states as a 6-item checklist: atomic write (FR-10.2), asset-substrate copy (FR-10), comments meta tag (FR-01/FR-40), asset prefix, cache-bust, heading IDs, index regen. `grep -l "Cache-bust" */SKILL.md` hits **11 skills**; the per-skill deltas are exactly three values (output filename, `pmos_skill` content value, artifact's template-store carve-out). The repo already has the right machinery for this — the pipeline-setup block and non-interactive block are sentinel-guarded canonical inline blocks with drift lints. Either (a) reduce Phase 2.7 boilerplate to "Emit per `_shared/html-authoring/README.md` checklist with `pmos_skill=artifact`; the template store at `~/.pmos/artifacts/.../template.md` keeps MD shape" (~6 lines, saves ~50 here and ~500 repo-wide), or (b) make it a third lint-guarded inline block. Option (a) is better: unlike the non-interactive block, the emit contract is *already* backed by tests (`fanout.test.sh`, `assert_heading_ids.sh`, `/verify` FR-72), so behavioral drift is caught downstream even without inlining. The cost of the current approach is not hypothetical — see finding 2.

2. **[R] Internal contradiction: `output_format=both` is both retired and honored.** L204 ("Mixed-format sidecar (FR-12.1): retired — `output_format=both` is treated as `html`") and L259 (re-emit comment) say retired; but Phase 4 L286 ("plus `{slug}.md` sidecar when `output_format=both`"), Refine flow L325 ("and (when `output_format=both`) a `prd.refined.md` sidecar"), Phase 0a L39 (valid values include `both`), and the frontmatter `argument-hint` (`--format <html|md|both>`) all still honor it. This is the v2.58.0 retirement pass (2026-05-28_inline-html-artifacts) scrubbing some mentions and missing others — the textbook failure mode of restated-contract duplication. Fix: scrub L286, L325, Phase 0a, and the argument-hint in one pass.

3. **[R] Stale retired-contract reference: `.comments.json` sidecar.** L553: "dispatches into when walking open threads in an artifact's `.comments.json` sidecar." The sidecar contract was retired in v2.58.0 (comments now persist as the inline `pmos-comments` JSON block — per repo CLAUDE.md and `2026-05-28_inline-html-artifacts/02_spec.html`). The shared contract `_shared/apply-edit-at-anchor.md` L9/L43 carries the same staleness, so the root fix is upstream — but this skill's sentence should say "inline `pmos-comments` block". Note the section *correctly* cites the shared contract per NFR-08 and then restates the id-first/quote-fallback resolution order anyway (L565–569), which `/spec` also restates — trim to the citation + the shim path + tests.

4. **[P/R] FR-number soup from four different specs, with a collision.** The file cites FR tags from at least four features without namespacing: FR-12 (output-format), FR-1…FR-8 (2026-05-13_artifact-html-output), FR-10/FR-40/FR-50-52 (2026-05-09_html-artifacts), FR-22/FR-30/FR-60 (2026-05-23_inline-doc-comments). **FR-22 appears twice meaning different things**: index regeneration (L202) and the comment-resolver entrypoint (L551). A colleague reading this cannot tell which spec any tag belongs to, and the tags are provenance, not instruction. Fix: drop inline FR tags (or keep one "spec lineage" footnote linking the three feature folders); the tags do no runtime work.

5. **[V] ~70 lines of restated reviewer-loop machinery duplicates `_shared/html-authoring/chrome-strip.md`.** Phase 3 step 0 (chrome-strip bash) and step 1a (validate `section` ∈ sections.json, `quote` ≥40-char verbatim substring) restate the contract chrome-strip.md already documents as FR-50/51/52/72, including the same validation algorithm. Also a path drift: SKILL.md invokes `{feature_folder}/assets/chrome-strip.js` while chrome-strip.md's canonical invocation is `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/chrome-strip.js`. The *validation itself* should stay (see gates inventory — it is a hallucination guard the spec calls "the proven mechanism"), but as a 4-line cite-and-configure, not a restatement.

6. **[S] The Findings Presentation Protocol is defined nowhere and used everywhere.** "Batch ≤4 per AskUserQuestion; options Apply as proposed / Modify / Skip / Defer; Defer appends to `## Deferred Improvements`" appears 3× inside this file (Phase 3 residuals, Phase 5, U.3) and in **10 SKILL.md files** repo-wide (artifact, complete-dev, design-crit, diagram, feature-sdlc, plan, polish, prototype, spec, wireframes). `_shared/interactive-prompts.md` exists and is the natural home. Define once, cite by name.

7. **[P] FR-2 pre-rename assertion prescribes literal bash where intent would survive better.** L177–188 hardcodes two `grep -oE` pipelines plus exact error strings. The check is *worth keeping* (heading ids are load-bearing — sections.json, comment anchoring, and `/verify` FR-03.1 all depend on them, and the spec records this as "D1 hardening from grill"), but the prescription should be "before renaming the temp file, verify every `<h2>`/`<h3>`/`<section>` carries an `id`; on miss, regenerate with a conventions.md §3 reminder" — 3 lines, no shell dialect coupling, same failure caught.

8. **[R] Scope vs `/polish` is actually crisp — but only in the reviewer's head, not the file.** /artifact judges *structure and content* against per-section eval criteria (is evidence cited? are goals outcome-shaped?); /polish judges *prose* (slop, concision, voice). The refine flow ("Internal QA only") is where a user could misroute. One sentence in the Refine flow — "for prose/style work, use `/polish`; refine re-judges structure against eval.md" — closes it. Related: the four presets' `# Voice` sections partially restate `_shared/writing-principles.md` (active voice, sentence length, no filler) without citing it; presets are legitimately user-selectable styles so some independence is by design, but a one-line "baseline: writing-principles.md; the rules below override" in each preset would keep the two from drifting.

9. **[F] Flag hygiene: one undocumented, one retired-but-advertised, one buried.** `--feature` is consumed at L133 (Phase 2.3) but absent from the `argument-hint`; `--format` advertises `both` which is retired (finding 2); `--quick` is documented only inside Template Add (L408), not in the hint. Also `create <type>` and bare `<type>` are redundant routes — harmless, but the routing table spends a row on it. See flags inventory.

10. **[V] The Track Progress section (L22–23) is 9 lines of task-tracker micromanagement.** Enumerating every phase name into TaskCreate instructions and "do not batch completions" is restating what a capable model does with any multi-phase document. One line ("track phases with your task tool") or zero. Pocock's diagnose has 6 phases and zero task-tracking instructions.

11. **[Ph] Phase-numbering incoherence (insertion smells).** Phase 0a (fractional — the output_format bolt-on); "Phase 6: Capture Learnings" uses a colon while every other phase uses an em-dash (a previous skill-eval remediation commit, 7cde921, touched exactly this — the convention is fragile); `templates/prd/eval.md` L4 calls the gap interview "Phase 2a" while SKILL.md calls it "2.5"; and the comment-resolver entrypoint is an unnumbered orphan section after a `---` at the file's end. The U.x/T.x/P.x sub-flow numbering, by contrast, is fine — distinct flows earn distinct schemes. Fix: fold 0a into Phase 0, renumber eval.md's cross-reference, give the resolver section a phase name or move it above Template Management.

12. **[V] Phase U.4 carries two full worked examples (~30 lines) for one table.** The HTML `<section id="comment-resolution-log">` example plus the legacy MD table example. With `both` retired (finding 2), the MD fallback path shrinks; one example and one sentence ("legacy MD primary: same table in markdown") suffices.

13. **[X] Cross-platform posture is good; two soft couplings.** The Platform Adaptation block (L14–19) gives real degradation paths (no-prompt-tool → `assumed:` frontmatter; no-subagents → inline reviewer, same eval) and matches what the skill actually does. Soft couplings: Node is required for `build_sections_json.js`/`chrome-strip.js` (substrate-wide decision, not this skill's), and FR-2's literal bash assumes a POSIX shell (finding 7 fixes this for free).

14. **[V/D] Durability nits.** The frontmatter example pins `"template_version": "pmos-toolkit@2.41.0"` and `"generated_at": "2026-05-02"` — fine as examples but they read as stale facts; use placeholder tokens. The description embeds "(max 2 iters)" — an implementation detail in the triggering surface; trigger phrases are otherwise good.

**Steelman / what is NOT a defect:** the 2-loop hard cap traces to the original spec (`docs/pmos/features/2026-05-02_artifact-skill/02_spec.md` L385: "Hard cap: 2 loops", mirroring /wireframes Phase 4) — a deliberate diminishing-returns decision, not arbitrary. The FR-5 reviewer-return validation traces to "D2 hardening from grill" in `2026-05-13_artifact-html-output/02_spec.html`, whose requirements call the quote-grep "hallucination guard is the proven mechanism". The 1,553 lines of eval.md are domain complexity, not distrust — they are the product. And the long SKILL.md is *partly* honest: this skill genuinely has 3 flows + 2 CRUD managers + a resolver entrypoint.

## Flags inventory

| Flag | Purpose | Verdict |
|---|---|---|
| `--tier lite\|full` | bypass tier auto-detect | keep — but natural language ("make it lite") should be stated as equivalent |
| `--preset <slug>` | bypass preset prompt | keep — slug-addressable, used programmatically |
| `--format <html\|md\|both>` | output format override | **fix** — remove `both` (retired FR-12.1); keep `html\|md` |
| `--feature <slug>` | feature-folder selection (pipeline-wide) | keep — **add to argument-hint**; currently invisible |
| `--quick` (template add) | scaffold-only, skip research | keep — but surface in argument-hint or fold into natural language ("quick template") |
| `--non-interactive` / `--interactive` | mode contract | keep — repo-wide contract, assessed globally |
| `create <type>` subcommand | alias of bare `<type>` | fold — bare `<type>` suffices; keep `create` as accepted synonym without a routing-table row |

## Gates & rubrics inventory

| Check | Hard or soft | Failure it catches | Verdict |
|---|---|---|---|
| 2.1 template validation (files exist, frontmatter fields, eval§↔template§ match) | hard | user-authored template with missing eval section → reviewer loop judging against nothing | keep-hard |
| FR-2 pre-rename heading-id/section-id assertion | hard | emitted HTML without ids → comment anchoring + sections.json + /verify FR-03.1 all break downstream | keep-hard, **rewrite as intent** (drop literal bash; finding 7) |
| FR-5 reviewer-return validation (section ∈ sections.json; quote ≥40-char verbatim) | hard | reviewer hallucinates a finding location → Edit auto-apply mutates the wrong text | keep-hard (origin: D2 grill hardening, "proven mechanism") |
| Phase 3 2-loop cap | hard | infinite refinement / diminishing returns | keep (origin: 2026-05-02 spec L385) |
| Auto-apply high+medium, log low | soft policy | over-prompting the user on nits | keep |
| Gap-interview semantic precondition check (2.5) | soft (LLM judgment, "be generous") | interviewing the user about evidence already in context | keep — good WHAT+WHY shape already |
| Tabular-schema adherence (reviewer rule 4) | soft (medium finding) | preset drift on user-defined schemas | keep — lives in reviewer-prompt.md where it belongs |
| T.5 template-write validation | hard | corrupt user template persisted to ~/.pmos | keep-hard |
| eval.md per-section criteria (×4 templates, 1,553 lines) | data consumed by reviewer | low-quality drafts | keep — this is the skill's value, not machinery |
| Anti-patterns block (Phase 3) | advisory | 3rd loop, silent low-fixes, prompt swap | soften — first bullet restates the cap; merge to one line each |
| apply-edit-at-anchor tests (5 cases + wrapper) | CI | resolver contract regression | keep |

## Fix list

| Fix | Type | Impact | Risk |
|---|---|---|---|
| Scrub `output_format=both` contradiction (L286, L325, Phase 0a, argument-hint) | quick-win | high | none — `both` already declared retired; aligns prose with behavior |
| Fix stale `.comments.json` sidecar sentence (L553; + upstream `_shared/apply-edit-at-anchor.md`) | quick-win | high | none — doc-only, matches v2.58.0 reality |
| Replace Phase 2.7 emit boilerplate with a citation to `_shared/html-authoring/README.md` checklist + 3 skill-specific values; repeat pattern across the other 10 surfaces in a follow-up | structural | high | low-med — emit behavior is test-backed (fanout.test.sh, /verify FR-72); coordinate with skill-eval rubric so the citation form passes |
| Define Findings Presentation Protocol once in `_shared/interactive-prompts.md`; cite from 3 in-file uses (10 skills repo-wide) | structural | med-high | low — wording is already near-identical everywhere |
| Drop/namespace inline FR tags; resolve the FR-22 collision with one lineage footnote | quick-win | med | none — tags are provenance, not behavior |
| Rewrite FR-2 assertion and FR-4/FR-5 preamble as intent + cite chrome-strip.md (fix the chrome-strip.js path drift while there) | quick-win | med | low — same checks, fewer lines, no shell coupling |
| Add `--feature`/`--quick` to argument-hint; remove `both` from `--format` | quick-win | med | none |
| One-line /polish disambiguation in Refine flow; presets cite writing-principles.md as baseline | quick-win | med | none |
| Delete Track Progress section (or reduce to 1 line); condense U.4 to one example | quick-win | low-med | none |
| Fold Phase 0a into Phase 0; fix "Phase 6:" colon; sync eval.md "Phase 2a" → "2.5" | quick-win | low | none — watch skill-eval phase-format checks |
| Placeholder-ize frontmatter example version/date; drop "(max 2 iters)" from description | quick-win | low | none |
