# wireframes — review

**Grade:** C (the reference architecture is genuinely good; the 758-line SKILL.md has accreted contradictions, a likely-broken hard gate, and phase-numbering chaos that a meaningful rewrite would fix)
**Size:** SKILL.md 758 lines (~729 excluding the non-interactive block; ~717 also excluding the sanctioned pipeline-setup block); references 52 files / ~5,229 lines (41 pattern files ≈ 3,100 + 10 reference docs ≈ 2,129); target ~280 lines for SKILL.md, ~4,900 for references (delete 1 dead file, no other reference cuts needed).

## TL;DR

- **Biggest win available:** SKILL.md → ~280 lines by (a) renumbering the phases once and deleting the four mangled cross-references (`2ac`, `2af`, `2ba`, "Phase 7 polish"), (b) collapsing Phase 6's folded-msf-wf contract walls into a reference file, (c) deleting the duplicated rigor-tier definitions and the half-stale Anti-Patterns list. The body, not the reference tree, is where the verbosity lives.
- **Biggest risk in current design:** Phase 6 contains a hard-fail gate that validates reviewer output against `<NN>_<slug>.sections.json` — a file **no phase of this skill generates** (the html-artifacts migration explicitly excluded wireframes, FR-15). On a literal read, Tier 2/3 runs hard-fail every wireframe or the model silently improvises. Adjacent: three places still reference the retired `msf-findings.md` that D3 (same phase!) says is no longer written.
- **One thing done well worth keeping:** the `patterns/` library (41 files, ~75 lines each: when-to-use / when-NOT / anatomy / states / heuristic-cross-referenced best practices / skeleton) loaded 1–3 files per component, never wholesale. This is progressive disclosure done exactly right — durable domain knowledge in references, selection logic in SKILL.md. It's the Pocock `improve-codebase-architecture` move at larger scale.

## Verdict on the 52-file reference tree (special-attention item)

**Progressive disclosure, not sprawl — with one dead file.** Breakdown:

| Cluster | Files / lines | Verdict |
|---|---|---|
| `patterns/` (nav, forms, data-display, feedback, actions, layout, content + README) | 42 / ~3,240 | **Keep.** A curated UI-pattern canon (NN/g, HIG, Material, ARIA APG sources). Branch-loaded: Phase 2 tags inventory rows with 1–3 patterns; Phase 3/4 subagents receive only those. README explicitly forbids passing the whole library ("too large and dilutes attention"). Durable — improves as models improve. |
| DESIGN.md cluster (`design-md-spec`, `-resolver`, `-extractor`, `-to-css`, `components-md-spec`) | 5 / 1,262 | **Keep content; relocate.** Real cross-skill contract (consumed by `/prototype` and `/verify` too — see Findings #9). Spec docs are long because the domain (token schema, x-extends cascade, staleness, extraction budgets) is complex, not because they distrust the model. The resolver's failure-mode tables are the right kind of prescriptive. |
| `eval-rubric.md` | 1 / 114 | **Keep.** ~38 heuristics (Nielsen + Fitts/Hick + WCAG + Gestalt + state coverage), severity calibration, JSON output shape. This is the reviewer's whole brief — compact for what it covers. |
| `html-template.md` | 1 / 211 | **Keep.** Verbatim skeleton + vocabulary cheat-sheet. The "Strict format requirements" section states its failure mode explicitly ("Subagents drift on these unless the format is shown verbatim") — prescription earned. |
| `canvas-aggregation.md`, `screenshot-ingestion.md` | 2 / 264 | **Keep, fix drift.** Branch-loaded correctly. Canvas doc describes section-level extraction as primary while `extract-screens.js` treats file-level as primary (script comment line 11 calls sections "advanced") and the schema example shows `desktop-web.html` filenames Phase 3 never emits. |
| `style-extraction.md` | 1 / 172 | **Delete to a 5-line tombstone.** Marked SUPERSEDED since v2.7.0, retained only "for plans that link to it." 167 lines of dead procedure a future maintainer can mistake for live. |

The sprawl accusation lands on **SKILL.md itself**, not the tree.

## Findings

1. **[G][R] Phase 6 hard gate validates against files this skill never creates.** SKILL.md:501 mandates FR-52 validation: "read `{feature_folder}/wireframes/<NN>_<slug>.sections.json`; assert `sections_found` set-equality … any miss/extra → hard-fail". No phase (3, 5, 6) instructs anyone to write per-wireframe `sections.json`; Phase 3's "File Requirements" list doesn't mention it; the html-artifacts rollout explicitly excluded wireframes (`docs/pmos/features/2026-05-09_html-artifacts/execute/task-08.md`: "FR-15 | Wireframes/prototype unmodified", "Per-skill edge cases … /wireframes+/prototype skip"). `/msf-wf` SKILL.md:100 even says "the contract lives in the parent" — and the parent's half is broken. Either (a) add sections.json emission to Phase 3 per `_shared/html-authoring/conventions.md` FR-70/71, or (b) drop set-equality and keep only the quote-substring grounding check (which needs no companion file). (b) is cheaper and keeps the real failure-catch (reviewer hallucinating findings).
2. **[R] `msf-findings.md` is simultaneously retired and required.** SKILL.md:529 (D3): "The legacy combined `msf-findings.md` is no longer written." Yet :507 says output is "a single `msf-findings.md`", :562 says "Confirm `{feature_folder}/wireframes/msf-findings.md` exists" (a verification step that now always fails), :608 links it from the spec handoff, and :618 `git add`s it at yet a third path (`{feature_folder}/msf-findings.md`). Meanwhile `/msf-wf` itself now writes `msf-findings.html` (msf-wf SKILL.md:194). Pick the D3 directory convention (`msf-wf-findings/<id>.md`) and fix all four references. Classic incremental-edit incoherence: T5 delegation, then T7 folding, then the HTML-artifacts migration each layered without reconciling.
3. **[Ph] Phase numbering is incoherent enough to mis-route a careful reader.** "Phase 2" contains subsections **2a-pre, 2a, 2b, 2c, 2d**; then a *top-level* "**Phase 2a**: Resolve DESIGN.md" follows with steps numbered **2.5a–2.5f**, and "**Phase 2b**: Resolve Composition Context" with steps **2.6a–2.6c**. So "2a" names two different things and "Phase 2a" contains "2.5c". Cross-references use a third scheme: "Phase 2ac" (:381), "Phase 2af" (:646), "Phase 2ba" (:27). The bootstrap section (:25) excludes "Phase 7 polish" — Phase 7 is canvas aggregation; "polish" is an orphan from the pre-canvas numbering. The :231 note "Decimal phase number is intentional — so external references still resolve" documents the debt instead of paying it. Fix: renumber 0–10 once; grep-fix the two known external couplings (`/prototype` Phase 1a references `--bootstrap-design-only` and `.layout-anchor` by name, not by phase number — safe).
4. **[P][V] Phase 6's folded-contract prose is a 60-line wall of internal jargon.** The "Reviewer-subagent contract" paragraph (:501) is ~300 words of inline bash, escaped-JSON prompt template, and a 4-step validation algorithm in a single sentence-run. Below it: FR-65 pre-apply guard, D3 output slug, D16 per-finding commits, FR-50/M1/D35 failure capture — each citing spec IDs a user can't resolve from here. The *intents* are sound (don't clobber uncommitted edits; ground reviewer claims; commits-as-resume-cursor) and two are real cross-skill contracts (D16 → `/complete-dev` FR-68; failure capture → `/feature-sdlc` state schema). Fix: move mechanics to `reference/folded-msf-wf.md`, leave ~10 lines of intent + invocation + the two coupling warnings in SKILL.md. Don't delete the contracts — relocate them.
5. **[S] The reviewer-loop/rigor machinery is septuplicated across the plugin with no shared substrate.** `artifact`, `diagram`, `feature-sdlc`, `plan`, `prototype`, `primer`, and `wireframes` each carry their own "reviewer subagent + severity exit + 2-loop cap" prose; `wireframes` and `diagram` also carry rigor-tier ladders; the Findings Presentation Protocol (Fix/Modify/Skip/Defer, batch ≤4) recurs in `wireframes` Phase 4, `prototype` Phase 8, and `msf-wf`. `_shared/interactive-prompts.md` covers field-capture only, not findings disposition. Worse, *within this file* the three rigor tiers are defined twice nearly verbatim (Rigor & Corner-Cut Protocol :59–63 and Phase 4a :406–408). Fix: `_shared/reviewer-loop.md` (loop shape, severity exit, cap, findings-disposition ask) + delete the in-file duplication (~25 lines here alone). Steelman on the cap itself: ≤2 loops is empirically grounded — `docs/pmos/features/2026-05-03_diagram-skill/02_spec.md:385` validated convergence within 2 loops on 4/5 hand-tested inputs, and `2026-04-30_prototype-skill/02_spec.md:222` set the same cap. Keep the cap; share the prose.
6. **[F] `--msf-auto-apply-threshold N` is an orphaned flag.** Defined at :554 as "(int, default 80) — overrides the apply threshold", but no threshold mechanism exists in this skill or in `/msf-wf` — the documented apply flow is per-finding AskUserQuestion disposition, not score-gated auto-apply. A user setting it changes nothing. Delete (or implement the threshold it gestures at — but nothing else references one).
7. **[V] The Anti-Patterns list (24 items, :658–682) is half ballast and contains two orphans from before the /msf-wf split.** ":672 Do NOT enumerate identical elements separately (5 nav links each at -1)" and ":673 Do NOT default the entry-context to High (60) or Low (25)" are PSYCH-scoring internals that moved to `/msf-wf` in T5 (the second even admits "this default lives in /msf-wf"). Another ~10 items restate rules already gated in their phases (don't skip Phase 2a, don't exceed 2 loops, don't skip index.html…). Trim to the ~8 that encode non-obvious judgment (Lorem-ipsum, IA-preservation for screenshots, one-host-frontend-only, workstream-pointer-only).
8. **[R] The canvas link is emitted twice into index.html.** Phase 5a (:459): the index header link to `canvas.html` "is rendered unconditionally (Phase 7 always emits the file)". Phase 7 (:593): "also append a row to `index.html` … linking to `canvas.html`". Following both yields duplicate links; the :459 parenthetical about a "briefly 404ing" link shows 5a was patched to pre-render what 7 appends, without deleting 7's instruction. Keep one (5a's unconditional render; delete 7's append).
9. **[S] The DESIGN.md cluster is shared infrastructure living in one skill's folder.** `design-md-spec/resolver/extractor/to-css` + `components-md-spec` (1,262 lines) are consumed by `/prototype` (DESIGN.md + COMPONENTS.md + design-overlay.css, per v2.8.0) and `/verify` (drift check reads `x-source`) via cross-skill relative paths into `wireframes/reference/`. Ownership should match consumption: move to `plugins/pmos-toolkit/skills/_shared/design-md/` and repoint the three consumers. Structural, but it makes the "wireframes has 52 reference files" optics honest — 5 of the 10 reference docs aren't really wireframes-only.
10. **[P] Phase 5a over-prescribes the index page.** Exact card contents, "200×140 px iframe preview", search box, footer fields, single-device tab-row omission *plus* a mandated footnote documenting the omission. The model knows how to build a nav index; 3 lines of intent ("card grid linking every file, filterable by device and name, works from file://") + the one real rule (index is navigation-only, no state-switchers) would survive model upgrades better. Contrast with html-template.md's footer-format strictness, which earns its keep by stating the drift failure mode.
11. **[F] `--skip-folded-msf-wf` leaks implementation jargon into the user surface.** "Folded" is pipeline-consolidation vocabulary (W2/D13); a user wanting to skip the UX evaluation won't find it. Rename `--skip-ux-eval` (keep the old spelling as an accepted alias for `/feature-sdlc` callers) or just honor natural language ("skip the MSF pass").
12. **[V] Frontmatter description is ~190 words and the argument-hint lists 8 flags.** The description narrates internals (canvas.json drag persistence, 2-loop cap, DESIGN.md journeys) that belong in the body; triggering needs ~60 words. Pocock descriptions are 2–4 sentences.
13. **[S] Apply-edit-at-anchor section partially violates its own NFR-08.** :692 says the phase "MUST cite that file rather than restate the contract", then :733–753 restate the resolution order, the closed error_enum, and the idempotency shape — all owned by `_shared/apply-edit-at-anchor.md`. Keep only the genuinely wireframes-specific parts (shim path, applyable-vs-infeasible split, the two emit references); delete the restated ~20 lines.
14. **[X] Platform adaptation is present and honest for the core flow** (inline reviewer fallback, file:// fallback, no-prompt-tool assumption-mode — good), **but Phase 6's machinery has no degradation path**: chrome-strip via `${CLAUDE_PLUGIN_ROOT}` bash, `state.yaml.phases…folded_phase_failures[]`, commits-as-resume-cursor are Claude-Code/feature-sdlc-shaped with no "if you can't do this" note. A Codex run hits Phase 6 and has no sanctioned cheaper path other than the skip flag it can't discover (see #11).

## Flags inventory

| Flag | Purpose | Verdict |
|---|---|---|
| `--devices=desktop-web,…` | Pre-select target devices | Fold into natural language — Phase 2c asks via AskUserQuestion anyway; "desktop and mobile" in the prompt works |
| `--feature <slug>` | Pipeline feature-folder routing | Keep — repo-wide pipeline contract (`_shared/pipeline-setup.md`) |
| `--screenshots <path>` | Seed IA anchors from existing UI | Keep — path-valued; inline image attachments already accepted as the natural-language form |
| `--bootstrap-design-only` | `/prototype` Phase 1a programmatic handoff (DESIGN.md+COMPONENTS.md only) | Keep — machine-facing; document it as such. **Coupling:** `/prototype` invokes it by name; do not rename without updating prototype |
| `--skip-folded-msf-wf` | Skip Phase 6 UX evaluation | Rename (`--skip-ux-eval`) — current name leaks internal "folded-phase" jargon |
| `--msf-auto-apply-threshold N` | "Overrides the apply threshold" | **Delete** — orphaned; no threshold mechanism exists here or in `/msf-wf` |
| `--non-interactive` / `--interactive` | W14 mode contract | Keep — repo-wide enforced contract |
| `--app <path>` (resolver doc: "not yet exposed; reserved") | Reserved | Delete the reservation note or expose it; reserved-forever flags are noise |

## Gates & rubrics inventory

| Check | Hard or soft | Failure it catches | Verdict |
|---|---|---|---|
| Phase 1 journey-confirmation gate | Hard | Wireframing invented/missed flows (fans out to N subagents) | Keep-hard |
| Phase 2 inventory + states + devices confirmation | Hard | Wrong scope multiplied across parallel generation | Keep-hard (merge the 2a-pre triage announce into this gate — one confirmation, not two) |
| Phase 2.5c DESIGN.md confirm | Hard | Wrong brand contract persisted to the *repo* (outlives the run; `/prototype` + `/verify` consume it) | Keep-hard |
| 2.6a COMPONENTS.md accept/edit/skip | Hard | Stale component inventory → invented variants | Soften — auto-accept fresh extraction, prompt only on stale |
| Rigor & Corner-Cut announcement rule | Soft | Silent rigor downgrades compounding across phases | Keep the principle (one paragraph); delete the duplicate tier ladder in Phase 4a |
| Phase 4 reviewer loop, ≤2 caps | Hard cap | Unbounded refinement; cap empirically grounded (diagram spec: 4/5 inputs converge ≤2 loops; prototype spec same cap) | Keep-hard, move shared prose to `_shared/reviewer-loop.md` |
| `eval-rubric.md` severity calibration + "empty array is valid" | Soft | Reviewer noise / finding-padding | Keep |
| Phase 6 FR-52 sections.json set-equality | Hard | Reviewer hallucinating section refs | **Broken as specced** — file never generated (Finding #1). Fix generation or soften to quote-grounding only |
| Phase 6 quote substring-grep (≥40 chars) | Hard | Reviewer fabricating findings | Keep-hard (works without sections.json) |
| FR-65 pre-apply `git status` guard | Hard | Clobbering uncommitted user edits | Keep-hard |
| D16 per-finding commits | Hard | Loses resume cursor (FR-57) + `/complete-dev` release-notes input (FR-68) | Keep — but flag coupling; relocate prose to reference |
| Canvas success criteria / exit-0 soft-fails | Soft | Canvas blocking the run | Keep — exemplary "additive, never blocks" design |
| Phase 9 pointer-only workstream rule | Hard | Token/brand drift between workstream and DESIGN.md | Keep-hard |
| Phase 10 learnings-capture reflection | Soft | Lost session learnings | Keep (substrate-shared) |

## Fix list

| Fix | Type | Impact | Risk |
|---|---|---|---|
| Resolve `msf-findings.md` contradiction — adopt D3 path, fix :507/:562/:608/:618 | quick-win | high | none — currently self-contradictory |
| Fix Phase 6 sections.json gate — drop set-equality, keep quote-grounding (or wire sections.json emission into Phase 3) | quick-win (drop) / structural (wire) | high | low — gate is currently unsatisfiable |
| Delete `--msf-auto-apply-threshold` | quick-win | med | none — no-op flag |
| Renumber phases 0–10; fix `2ac`/`2af`/`2ba`/"Phase 7 polish" orphans | structural | high | low — external couplings are by flag/file name, not phase number; grep `/prototype`, `/msf-wf`, `/feature-sdlc` after |
| Move Phase 6 folded-contract mechanics to `reference/folded-msf-wf.md`; leave 10-line intent | structural | high | low — content moves verbatim; keep D16/FR-68 coupling note in SKILL.md |
| Delete duplicate rigor-tier ladder in Phase 4a; point at the top protocol | quick-win | med | none |
| Extract `_shared/reviewer-loop.md` (loop + cap + findings-disposition); repoint 7 skills | structural | high | med — touch 7 skills; do under `/skill-sdlc` with the eval rubric |
| Trim Anti-Patterns 24→~8; delete the two /msf-wf orphans (:672–673) | quick-win | med | none |
| Remove Phase 7's duplicate index-link append (keep 5a's unconditional render) | quick-win | low | none |
| Tombstone `style-extraction.md` to 5 lines | quick-win | low | none — already marked superseded |
| Move DESIGN.md cluster to `_shared/design-md/`; repoint `/prototype` + `/verify` | structural | med | med — three consumers; sanctioned `_shared` sync path exists |
| Rename `--skip-folded-msf-wf` → `--skip-ux-eval` (alias old) | quick-win | low | low — alias preserves `/feature-sdlc` callers |
| Trim frontmatter description to ~60 words | quick-win | low | low — keep trigger phrases |
| Soften Phase 5a index spec to intent + the nav-only rule | quick-win | low | low |
| Delete restated contract lines in apply-edit section (:733–753), per its own NFR-08 | quick-win | low | none — `_shared/apply-edit-at-anchor.md` is normative |
