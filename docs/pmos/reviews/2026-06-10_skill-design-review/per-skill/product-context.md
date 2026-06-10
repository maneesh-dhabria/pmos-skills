# product-context — review

**Grade:** C (the store earns its keep; the 366-line SKILL.md doesn't — half of it is templates and scripted dialogue that belong in a reference file or in the model's judgment)
**Size:** SKILL.md 366 lines (337 excluding non-interactive block); references 0 files / 0 lines; target ~180 lines (~150 excluding the block) + a `reference/templates.md`.

## Does persistent workstream state still earn its keep? (the assigned special question)

**Yes — the data store does.** Feature folders and `state.yaml` did not obsolete it, because the three stores sit at different altitudes:

- `~/.pmos/workstreams/{slug}.md` — cross-repo, cross-session **product** memory (segments, metrics, scars, stack). The only store that survives a repo switch.
- `{docs_path}/features/{date}_{slug}/` — per-**feature** artifacts.
- worktree `state.yaml` — per-**run** pipeline resume state (schema v4, gitignored).

Consumption is real, not vestigial: pipeline-setup Section 0 step 3 loads the workstream in **every** pipeline skill's Phase 0; 9 skills (requirements, spec, plan, execute, verify, session-log, simulate-spec, msf-wf, design-crit) run Section C enrichment; feature-sdlc explicitly passes it through to children (its SKILL.md line 127). Deleting /product-context would orphan a substrate contract that the whole pipeline reads.

**What does NOT earn its keep** is one overlap: the Product template's `## Key Decisions` plus Section C's decision-enrichment gives a decision **three homes** (workstream, `{docs_path}/session-log.md`, and the feature folder's spec/decision log). Recommend a stated principle: the workstream holds product-level facts and *pointers*; per-feature decisions live in the feature folder. See finding 6.

## TL;DR

- **Biggest win available:** move the three templates (~105 lines, lines 239–353) to `reference/templates.md` loaded when the branch is taken — the exact pattern Pocock's `improve-codebase-architecture` uses for its HTML scaffold. SKILL.md drops below 240 lines in one mechanical move with zero behavior change.
- **Biggest risk:** the non-interactive contract is decorative here. The block is inlined, but the skill's prompts are prose blockquotes ("Does this look right?", the dinner-party question), not `AskUserQuestion` calls — so the classifier has nothing to classify and `init --non-interactive` has undefined behavior. An orchestrated headless run would stall or improvise.
- **Worth keeping:** the Anti-Patterns section (lines 356–366) is the most Pocock-like writing in the file — ten one-line rules, each naming a real drift mode ("scan first, ask second", "never replace without showing the diff"). Also keep the dinner-party question verbatim: the origin spec (`docs/pmos/features/2026-04-11_context-skill/02_spec.md` line 227) chose that framing deliberately because it yields richer descriptions than "describe your product."

## Findings

1. **[V][P] Three inline templates (~105 lines) defeat progressive disclosure.** Product, Charter, and Feature templates load on every invocation — including `show`, which never instantiates one. The Feature template appears to have no instantiation path at all in this SKILL.md (init routes only to Product or Charter; nothing creates a `type: feature` workstream), making it ~25 lines of dead weight or an undocumented flow. **Fix:** move all three to `reference/templates.md`; keep Template Rules (4 lines, real judgment) in SKILL.md; either document who creates `type: feature` workstreams or delete that template.
2. **[S] The Diff Format section duplicates pipeline-setup Section C.2 nearly verbatim** — down to the same example text ("Small business owners (1-50 employees)… 40% reduction in manual invoice processing"). Two copies of one contract, guaranteed to drift; the substrate copy is the one 9 other skills follow. **Fix:** replace lines 211–225 with "Present changes as a concrete diff per `_shared/pipeline-setup.md` Section C.2." −13 lines.
3. **[G][X] Non-interactive block present, contract unimplementable.** No prompt in this skill is an `AskUserQuestion` call with a `(Recommended)` option, so the auto-pick path can never fire; init's questions are inherently free-form. Per the repo's own W14 posture, the honest postures are: `show` works headless as-is; `update` with docs could auto-apply or defer (writes to global state — arguably destructive → defer); `init` should carry a `<!-- non-interactive: refused … -->`-style marker or an explicit "init requires a human; error with exit 64 under non-interactive" line. **Fix:** add a 3-line per-subcommand non-interactive statement. This is a per-skill gap, not the global contract's fault.
4. **[F] `--add-stakeholder` is invisible.** It routes in Phase 2's mode table but is absent from the frontmatter `argument-hint`, so no user discovers it. Both `--add-charter` and `--add-stakeholder` are also pure natural-language candidates — "add Sarah, eng lead, as a stakeholder" already lands in the open-ended update path, which reads the file and proposes a diff. The flags buy a shortcut past one round of inference. **Fix:** fold both into natural language (keep the two scripted follow-up questions — "what does {Name} care about?" is good interviewing); or, if kept, add `--add-stakeholder` to the hint.
5. **[R] The skill forbids its own vocabulary.** Anti-pattern: "Do NOT use the word 'charter' in user-facing prompts — use 'area'." Yet the user-facing flag is `--add-charter` and the template heading is `## Charters`. A colleague following this file hits a direct contradiction. **Fix:** if the flags survive finding 4, rename to `--add-area`; otherwise one sentence — "file format says Charters; spoken prompts say area" — resolves it.
6. **[S][R] Decision triple-storage (see special question above).** Section C maps `/spec` and `/execute` decisions into the workstream while session-log writes them to the session log and the feature folder holds the authoritative spec. **Fix:** add one Template Rule: "`## Key Decisions` holds product-level decisions only; link per-feature decisions to their feature folder rather than copying."
7. **[P][V] Phase 1 scripts the interview word-for-word (~55 lines for Steps 1–4).** The BookCompanion synthesized-draft mock, the exact "Does this look right?" confirmations, and the full ingestion pitch ("Things that work great: landing pages, pitch decks, …") prescribe HOW for a conversation any capable model conducts from intent. The load-bearing parts are: scan-before-ask (step 1's signal list is genuinely useful), the two mandated questions (name + dinner-party — origin-verified, keep verbatim), the scope question with its product/charter routing, and "present the draft before writing." **Fix:** compress Steps 2 and 4 to intent + the mandated wordings. −25 lines.
8. **[V][S] The inline `settings.yaml` scaffold (lines 141–152) re-documents `docs_path` semantics** (default, `.pmos` caveat, legacy `docs/` rule, migration pointer) that pipeline-setup Sections A and D own. Note this skill writes a 2-key settings file while Section A.4 writes 4 keys (`version`, `current_feature`) — the two writers have already drifted. **Fix:** "write `.pmos/settings.yaml` per `_shared/pipeline-setup.md` Section A.4 with `workstream: {slug}`" — one writer, one schema. −10 lines and a real bug-class closed.
9. **[R] Register drift vs. siblings:** no Track Progress, no When-to-use, no learnings phase, a differently-worded Platform Adaptation block, and the announce line placed mid-file after the pipeline diagram. Mostly harmless (Track Progress's absence is arguably correct — see changelog/session-log reviews), but the inconsistency signals this skill predates the conventions and never got re-passed. The header pipeline diagram is also stale (omits grill/wireframes/prototype and the optional-enhancer set has changed). **Fix:** drop the diagram (the description covers positioning); align the Platform Adaptation block wording when next touched.

## Flags inventory

| Flag / subcommand | Purpose | Verdict |
|---|---|---|
| `init` | Create workstream + link repo | **Keep** — clean subcommand, natural ("set up context") also routes |
| `update [docs/URLs]` | Enrich from conversation or documents | **Keep** |
| `show` | Display linked workstream (+ parent) | **Keep** |
| `--add-charter "X"` | Append a charter scaffold | **Fold into natural language** (finding 4); if kept, rename `--add-area` (finding 5) |
| `--add-stakeholder "X"` | Append a stakeholder | **Fold into natural language**; currently undiscoverable — not in argument-hint (finding 4) |
| `--non-interactive` / `--interactive` | W14 mode contract | **Keep (repo contract)** — but per-subcommand behavior is currently undefined (finding 3) |

## Gates & rubrics inventory

| Check | Hard or soft | Failure it catches | Verdict |
|---|---|---|---|
| Init guard (settings.yaml exists → refuse, point at update/show) | Hard | Double-init clobbering a linked workstream | **Keep-hard** — 3 lines, real destructive path |
| Update guard (no settings.yaml → suggest init) | Soft | Updating nothing | **Keep** |
| Show-diff-before-write / never-silently-update | Hard (stated twice: Phase 2 + Anti-Patterns) | Silent corruption of cross-repo global state that every pipeline skill then inherits | **Keep-hard** — this is the skill's central safety property; state it once in Anti-Patterns |
| "Do not block pipeline skills when no context exists" | Hard principle | Workstream becoming a mandatory dependency (origin spec's "No degradation" principle) | **Keep-hard** — load-bearing for the whole pipeline's standalone story |
| Optional-sections-only-with-real-info | Soft | Placeholder-bloated workstream files | **Keep as Template Rule** |
| Non-interactive block | Hard (global) | — | Assessed globally; per-skill gap is finding 3 |

## Fix list

| Fix | Type | Impact | Risk |
|---|---|---|---|
| Move 3 templates to `reference/templates.md`; resolve the orphaned Feature template | structural | high | low — content unchanged; verify no other skill reads templates out of this SKILL.md (`grep -rn "Product Template" plugins/`) |
| Define per-subcommand non-interactive behavior (show OK / update defer / init refuse) | quick-win | high | low — touches W14 posture; use the self-documenting marker convention from CLAUDE.md |
| Point Diff Format at pipeline-setup C.2; write settings.yaml per Section A.4 (single writer, closes the 2-key/4-key drift) | quick-win | high | low — confirm Section A.4's `current_feature` field is acceptable at init time (may be null) |
| Fold `--add-charter`/`--add-stakeholder` into natural language (or fix hint + rename) | quick-win | med | low — grep callers first; no pipeline skill passes these flags today |
| Compress Phase 1 Steps 2/4 to intent + mandated questions; drop stale header diagram | quick-win | med | none |
| Add "Key Decisions = product-level only; link per-feature decisions" Template Rule | quick-win | med | none |
