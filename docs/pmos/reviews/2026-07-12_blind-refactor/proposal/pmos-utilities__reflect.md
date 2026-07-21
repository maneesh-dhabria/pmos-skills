# Proposal — pmos-utilities__reflect

**Unit:** pmos-utilities__reflect (`plugins/pmos-utilities/skills/reflect/SKILL.md`; skill currently ships no `scripts/` and the plugin ships no `skills/_shared/`)
**Status:** CAPPED (pass 2 — hard cap reached). Pass 1: 11 findings, all accepted. Pass 2: 9 findings, all accepted. Total 20 accepted, 0 rejected, 0 invalid.

## Findings ledger

| ID | Severity | Disposition | Folded into |
|----|----------|-------------|-------------|
| reflect-F1 | Blocker | Accepted | C1 |
| reflect-F2 | Should-fix | Accepted | C2 |
| reflect-F3 | Should-fix | Accepted | C3 |
| reflect-F4 | Should-fix | Accepted | C4 |
| reflect-F5 | Should-fix | Accepted | C5 |
| reflect-F6 | Should-fix | Accepted | C6 |
| reflect-F7 | Should-fix | Accepted | C7 |
| reflect-F8 | Nit | Accepted | C10 |
| reflect-F9 | Nit | Accepted | C8 |
| reflect-F10 | Nit | Accepted | C9 |
| reflect-F11 | Nit | Accepted | C2 |
| reflect-F12 | Should-fix | Accepted | C1 (amended) |
| reflect-F13 | Should-fix | Accepted | C11 (new; amends C2/C9) |
| reflect-F14 | Should-fix | Accepted | C12 (new) |
| reflect-F15 | Should-fix | Accepted | C13 (new) |
| reflect-F16 | Should-fix | Accepted | C14 (new) |
| reflect-F17 | Nit | Accepted | C3 (amended) |
| reflect-F18 | Nit | Accepted | C2 (amended) |
| reflect-F19 | Nit | Accepted | C1 (amended) |
| reflect-F20 | Nit | Accepted | C6 (amended) |

No rejections. All changes below are DESCRIBED, not implemented.

---

## Accepted changes (full detail)

### C1 — Single canonical transcript-root resolution (F1 Blocker; amended per F12 Should-fix, F19 Nit)

**File:** `plugins/pmos-utilities/skills/reflect/SKILL.md`
**Sections (three hardcoded-root sites, per F12):** the `--project` flag-table row (line 38: "`all` = every project under `~/.claude-personal/projects/`"), the multi-session enumeration step (line 88: globs `~/.claude-personal/projects/<project>/*.jsonl`), and the single-session locate step (line 129: lists `~/.claude/projects/<slug>/*.jsonl`).
**Before → after:** Today three sites name two different, contradictory hardcoded config roots — on any machine at most one is right, and the multi-session zero-candidate handler exits 0 cleanly, masking the wrong-root failure. Replace ALL THREE with citations to ONE new "Transcript root resolution" subsection (living in the setup phase, slug anchor `{#transcript-root}`) that resolves the root as `${CLAUDE_CONFIG_DIR:-~/.claude}/projects/`. Fallback probe (per F19, fully specified):
- Single-session / `--project current`: when the env var is unset and `~/.claude/projects/<slug>/` yields no jsonl, probe sibling dirs matching `~/.claude*/projects/<slug>/`; the tiebreak is the newest **jsonl file mtime within** each candidate dir — never the dir's own mtime (dir mtime does not update on appends to an existing session file).
- `--project all` (no slug exists): the probe key becomes "any `projects/*/*.jsonl` under the root"; the root whose newest jsonl is most recent wins. Exactly ONE root is chosen per run — no cross-root union (stated explicitly; union would silently mix alias histories).
- The chosen root is noted in the output header in all modes.
The `--project` table row's scope definitions name no literal path: `current` = "this project's dir under the resolved transcript root", `all` = "every project dir under the resolved transcript root — see `{#transcript-root}`".
**Rationale:** One fact (where transcripts live), one home (§K). `CLAUDE_CONFIG_DIR` varies per alias on real setups; the env var is the authoritative signal, the probe the fallback. F12 caught that the flag table was becoming a second home for the fact just canonicalized; F19 caught that dir-mtime vs file-mtime pick different roots on real multi-alias machines and that `--project all` had no defined resolution.
**Blast radius:** this file only; `tools/lint-phase-refs.sh` re-run for the new anchor and the table-row cite.

### C2 — One integer phase sequence with slug anchors + a canonical mode-routing table (F2 Should-fix, F11 Nit; amended per F18 Nit)

**File:** `plugins/pmos-utilities/skills/reflect/SKILL.md`, all phase headings.
**Before → after:** The file currently interleaves two pipelines sharing integers (two Phase 1, two Phase 2, two Phase 4, two Phase 5; multi-session "Phase 4" physically sits between single-session Phases 3 and 4) with bare-number cross-refs ("goes directly to Phase 1 below", "Phase 2 multi-session dispatch"), and the run-shaping flag parser is buried under "Phase 0: Load Learnings". Renumber into ONE monotonically increasing sequence in file order, every heading gaining a stable `{#kebab-slug}` anchor — proposed: Phase 0 "Parse Flags & Resolve Mode" `{#parse-flags}` (flag table + validation + frozen NI block + C1's `{#transcript-root}` + the `{#mode-routing}` table below), then `{#load-learnings}`, `{#enumerate-candidates}`, `{#dispatch-subagents}`, `{#locate-transcript}`, `{#detect-invocations}`, `{#peek-frontmatter}`, `{#aggregate-findings}`, `{#analyze-invocations}`, `{#emit-multi-session}`, `{#emit-retro-blocks}`, `{#capture-learnings}`. All cross-refs cite slugs, never bare numbers.

**Mode routing (F18 amendment — supersedes pass-1's guard wording, which was internally inconsistent: it said the parent runs "only" two phases while declaring two others both-modes):** add ONE canonical mode-routing table `{#mode-routing}` in the flag-parser phase listing every phase × (single-session / multi-session / both). Each phase's guard is then a single line citing it — e.g. "Runs in single-session mode only — see `{#mode-routing}`" — never a re-enumeration (§K: mode membership is one fact per phase, one home). The table states: the multi-session parent runs `{#parse-flags}`, `{#load-learnings}`, `{#enumerate-candidates}`, `{#dispatch-subagents}`, `{#peek-frontmatter}`, `{#aggregate-findings}`, `{#emit-multi-session}`, `{#capture-learnings}`; subagents apply the `{#analyze-invocations}` rubric per transcript; `{#locate-transcript}`, `{#detect-invocations}`, `{#analyze-invocations}`, `{#emit-retro-blocks}` are single-session-only (parent-side).
**Rationale:** Direct §J violation as shipped; the missing skip-guards leave mode routing to model inference. Promoting the flag parser (F11) restores heading-scan discoverability and makes the "NI block runs AFTER flag parsing" contract structural. The routing table prevents an implementer from copying a false "parent runs only…" sentence into every phase.
**Blast radius:** `tools/lint-phase-refs.sh` must pass on the renumbered file (also the regression check against ghost refs). The frozen NI block moves position but stays byte-identical, so `tools/lint-non-interactive-inline.sh` stays green. No external skill cites reflect's phase numbers.

### C3 — Real script for dedup hashing, scoring, and tiering; honest language for exits and timeouts (F3 Should-fix; amended per F17 Nit)

**Files:** `plugins/pmos-utilities/skills/reflect/SKILL.md` + NEW `plugins/pmos-utilities/skills/reflect/scripts/aggregate-findings.mjs`.
**Before → after (four sub-fixes):**
1. Ship `scripts/aggregate-findings.mjs`: reads per-transcript findings (YAML/JSON on stdin), applies the boilerplate-strip regex (`^The /\S+ skill\b\s*|^The skill\b\s*|^An?\s+|^The\s+`), computes the `(skill, severity, first-100-stripped-chars)` aggregation key, emits aggregated rows with verbatim constituents as JSON. The aggregation phase is rewritten from "apply this regex … BEFORE computing the first-100-chars hash component" (in-head hashing) to "pipe the findings through `scripts/aggregate-findings.mjs`". §H: hashing/arithmetic = script — identical inputs must aggregate identically for the recurring-pattern report to be trustworthy.
2. **(F17)** The script ALSO emits per-row `score` (session_count × severity weight, blocker=3 / friction=2 / nit=1) and `tier` (`recurring` when session_count ≥ 2; else `unique-notable` when severity is blocker or friction; else `dropped`), rows pre-sorted by score descending. The multi-session emission phase renders the script's rows in order — zero model-side arithmetic remains (the emission phase currently asks the model to compute the weighted sort and the two-tier partition in-head at line 221).
3. Rewrite skill-authored "exit 64 with usage hint on violation" validation prose (line 43 area) to "report the usage error and stop the run, recording `Run Outcome: error` per the non-interactive contract" — the model has no process to exit. The frozen NI block's own exit-64 language is byte-frozen and untouched.
4. Reword the per-subagent "Timeout … 60s wall-clock" as an explicitly advisory cutoff: if a subagent hasn't returned after roughly 60s, mark that transcript scanned-failed and move on; the Task tool has no enforceable timeout, so this is a monitoring heuristic, not a guarantee.
**Rationale:** As shipped this is pseudo-determinism — precise-looking contracts (regex hashing, exit codes, timeouts, weighted sorts) with no enforcing mechanism. This very file already produced one wrong prose calculation (F9's 300s), which is §H's whole argument.
**Blast radius:** new `scripts/` dir under the skill; script invoked as plain `node scripts/aggregate-findings.mjs` (no bashisms). No lint gates script existence; skill-eval §H checks improve. F17's amendment lands before any implementation exists, so no rework.

### C4 — Delete the dead `--msf-auto-apply-threshold` flag (F4, Should-fix)

**File:** `plugins/pmos-utilities/skills/reflect/SKILL.md`, frontmatter argument-hint (line 5) + flag-parser table row (line 41).
**Before → after:** The flag is defined and hinted ("Confidence threshold for any folded MSF apply-loops invoked by /reflect") but no phase ever invokes an MSF apply-loop or reads the value; its only justification is an unresolvable spec ID. Delete the table row and the hint entry. No deprecation alias — a flag that never had behavior has no users to break (§I's rename protection covers flags with consumers).
**Rationale:** A hinted contract flag that silently no-ops violates §I and misinforms users.
**Blast radius:** `tools/lint-flags-vs-hints.sh` — must be removed from BOTH hint and body in the same edit to stay green. No external call sites pass this flag.

### C5 — Installed-plugin-aware frontmatter lookup (F5, Should-fix)

**File:** `plugins/pmos-utilities/skills/reflect/SKILL.md`, frontmatter-peek phase (currently line 150).
**Before → after:** Today the lookup tries repo-relative `plugins/pmos-toolkit/skills/<name>/SKILL.md` etc. — paths that only exist inside the agent-skills repo — with "(or wherever the plugins are installed)" as a hand-wave, so the primary runtime context (arbitrary project post-session) routinely degrades to "frontmatter cannot be located". Replace with an ordered lookup: (1) the plugin cache under the active config dir — glob `${CLAUDE_CONFIG_DIR:-~/.claude}/plugins/cache/**/pmos-*/skills/<name>/SKILL.md` plus the marketplaces mirror `.../plugins/marketplaces/**/plugins/pmos-*/skills/<name>/SKILL.md`; (2) repo-relative `plugins/<plugin>/skills/<name>/SKILL.md` when cwd is the agent-skills repo (sentinel: `.claude-plugin/marketplace.json` at root); (3) keep the graceful degradation but add one stderr line naming the dirs probed so wrong-root failures are diagnosable. Config-dir resolution is cited from C1's `{#transcript-root}`, not restated (§K). Note the `pmos-*` glob already satisfies C12's no-hardcoded-plugin-list rule.
**Rationale:** The lookup that matters most in practice is currently the one left unspecified.
**Blast radius:** none — frontmatter-only contract and "do not read the body" anti-pattern unchanged. Depends on C1 landing first.

### C6 — Structured, defer-only learnings approval gates — one per destination (F6 Should-fix; amended per F20 Nit)

**File:** `plugins/pmos-utilities/skills/reflect/SKILL.md`, Capture Learnings phase (currently line 295).
**Before → after:** The approval gate is prose ("always show the user the exact bullets and get approval (`y/n/edit`)") — invisible to the NI classifier, so under `--non-interactive` the model must improvise between hanging and auto-writing (the forbidden action). Replace with **TWO sequential `AskUserQuestion` calls** (F20: the two destinations carry different contracts — `~/.pmos/learnings.md` is create-if-missing, repo `CLAUDE.md`/`AGENTS.md` is never-create — and a single trichotomy cannot express the common "global yes, repo no" answer without abusing free-form Edit):
- **Ask 1 (global learnings):** presents the exact proposed global bullets; options "Write as shown / Edit before writing / Skip (write nothing)"; issued whenever ≥1 global bullet is proposed. Preceded by the literal adjacent tag line `<!-- defer-only: free-form -->`.
- **Ask 2 (repo files):** same option shape scoped to the repo-file bullets; issued only when an eligible repo file already exists AND ≥1 repo bullet is proposed — skipped entirely otherwise. Also tagged `<!-- defer-only: free-form -->`.
Zero-bullet destinations issue no ask. NI runs deterministically DEFER both: bullets land in the Open Questions buffer; nothing is written anywhere. Keep the "never auto-write" sentence — it now provably holds.
**Rationale:** The frozen NI contract classifies only AskUserQuestion calls; free-form is the right class because the edit path is inherently user-authored. Two asks beat multiSelect: the destinations' bullets are disjoint proposals, not options within one decision.
**Blast radius:** `plugins/pmos-toolkit/tools/audit-recommended.sh` — both call sites carry adjacent defer-only tags, keeping it green. Intentionally no Recommended option. Interacts with C14's third ask in the same phase — the phase gains a short "gates in this phase" ordering note.

### C7 — Strip unresolvable spec-ID jargon from skill-authored prose (F7, Should-fix)

**File:** `plugins/pmos-utilities/skills/reflect/SKILL.md`, body-wide (headings and inline: T14/T17/T18, W8, D7/D10/D18/D32, FR-40/42/44/45/46/49, FR-RETRO-MSF, NFR-02, E16, "new in v2.34.0").
**Before → after:** Delete every private spec ID and version-provenance token from skill-authored headings and prose, restating each obligation in plain words at its point of use (e.g. "Cap-confirmation (D18, FR-40)" → "Cap-confirmation"; "per D32" → "to keep wall-clock bounded"; heading "(T14, new in v2.34.0 per W8)" → dropped). Two exemptions: (a) the frozen non-interactive block keeps its FR-*/E13/NFR-07 cites byte-identical; (b) all behaviors the IDs decorated (zero-candidate clean exit, >20 cap confirmation, partial-failure continuation, dates annotation) are kept — only the ids go. FR-RETRO-MSF disappears entirely via C4. Design rationale stays in the feature spec under `docs/pmos/features/` — its one home (§K).
**Rationale:** For the executing model the IDs are unactionable noise; for readers, dead links; they also inflate perceived edit risk.
**Blast radius:** none mechanical (no lint parses these IDs); executed as one combined prose pass with C2, C8, and C12.

### C8 — Rolling-pool progress format + corrected worst-case arithmetic, deduplicated (F9, Nit)

**File:** `plugins/pmos-utilities/skills/reflect/SKILL.md`, dispatch phase (lines 118, 122) + emission phase's duplicate progress spec (lines 241–249).
**Before → after:** (1) Drop "wave" terminology — dispatch is a rolling pool, so `Wave i/N` (N undefined) is unemittable; progress line becomes `progress: <complete>/<total> done, <in-flight> in flight (T+<sec>s)`, emitted on each subagent return and each new dispatch. (2) Correct "5×60s = 300s worst-case for 20 candidates with one wave" to "20 candidates at 5 in flight with the ~60s advisory cutoff → worst-case ≈ 4×60s = 240s" (ceil(20/5) = 4), framed as a heuristic budget per C3(4). (3) Delete the second copy of the progress-emit spec in the emission phase and replace with a slug cite to the dispatch phase (§K — the format currently lives in two places and would drift).
**Rationale:** Arithmetic in prose was wrong exactly as §H predicts; wave semantics contradict the specified dispatch model.
**Blast radius:** folds into C3(4) and C2's anchors; `tools/lint-phase-refs.sh` validates the new cross-cite.

### C9 — Positional skill filter becomes an nl-sugar alias of `--skill` with defined precedence (F10, Nit)

**File:** `plugins/pmos-utilities/skills/reflect/SKILL.md`, argument-hint (line 5) + the skill-filter definition (see C11 for where it now lives).
**Before → after:** Remove `[skill-name to filter, optional]` from the argument-hint; `--skill <name>` remains the sole hinted contract form. The positional stays accepted in the body as a parsed alias marked `<!-- nl-sugar -->`, plus one precedence sentence: if both are supplied and differ, the explicit flag wins and a stderr warning names the ignored positional. Precedence applies uniformly to both modes via C11's canonical filter definition.
**Rationale:** §I hybrid-NL-first verbatim — hint lists contract flags only; silent aliases carry the marker; precedence is no longer improvised.
**Blast radius:** `tools/lint-flags-vs-hints.sh` accepts exactly this shape.

### C10 — Bootstrap `_shared/non-interactive.md` into pmos-utilities (F8, Nit)

**File:** NEW `plugins/pmos-utilities/skills/_shared/non-interactive.md` — byte-identical copy of pmos-toolkit's `skills/_shared/non-interactive.md`. Plus a one-clause edit to reflect's Capture Learnings sentence "self-contained (no `_shared/` substrate)" to reflect that `_shared/` now carries exactly the NI contract file.
**Before → after:** The frozen block's cite to "Section D of this file (`_shared/non-interactive.md`)" currently dangles within pmos-utilities (the plugin ships no `_shared/` at all). Place the file manually per the repo's documented intersection-only-sync bootstrap procedure; thereafter `scripts/sync-shared.sh` keeps it aligned. The frozen block itself is NOT edited — changing the path in place would break the drift lint.
**Rationale:** Exactly the dangling-cite class CLAUDE.md documents from the learnkit/book-summary precedent; the prescribed fix is a manual byte-identical bootstrap copy.
**Blast radius:** `tools/lint-non-interactive-inline.sh` stays green (block untouched); the file enters the cross-plugin sync intersection for pmos-utilities.

### C11 — Give the `--skill` filter a multi-session home (F13, Should-fix — amends C2/C9)

**File:** `plugins/pmos-utilities/skills/reflect/SKILL.md`, flag-parser phase + subagent brief (line 115) + aggregation phase + single-session detect phase (line 144).
**Before → after:** Today the filter's only application is the single-session detect phase ("If the user passed a skill name argument, filter to that skill only."), which C2's new mode guards instruct the multi-session path to SKIP — structurally killing the flag table's own advertised use case ("Combine with `--last` for 'recurring spec issues across sessions'"). Fix: (1) ONE canonical "skill filter" definition lives in the flag-parser phase next to the `--skill` row (with a slug anchor), carrying C9's positional-alias precedence rule; (2) the subagent brief gains one clause — "if a `--skill <name>` filter is active, extract findings for that skill only and return an empty list when it never ran"; (3) the aggregation phase states it inherits the already-filtered inputs (no re-filter — one enforcement point); (4) the single-session detect sentence becomes a cite to the canonical definition.
**Rationale:** Pass-1's C2 skip-guards would have converted "vaguely honored by inference" into "explicitly skipped" — a genuine regression of an advertised contract. Filtering in the subagent (not at aggregation) shrinks per-transcript output and keeps haiku extraction cheap; aggregation-side filtering would pay full scan cost to discard.
**Blast radius:** amends C2 and C9 wording; `tools/lint-phase-refs.sh` for the new slug cites; no new lint surface.

### C12 — Generic `pmos-*` plugin set everywhere; drop all hardcoded plugin lists (F14, Should-fix)

**File:** `plugins/pmos-utilities/skills/reflect/SKILL.md` — description (line 3), intro (line 10), subagent brief (line 115 "toolkit, learnkit, utilities"), detect-phase signal list (lines 136–138), frontmatter-lookup path list (line 150).
**Before → after:** Four-plus surfaces enumerate exactly three plugins (`pmos-toolkit`, `pmos-learnkit`, `pmos-utilities`) while the repo ships FIVE (`pmos-gamekit`, `pmos-managerkit` missing everywhere) — so a session full of /interview-feedback or /solitaire friction produces a retro that silently omits them. Rewrite every surface to state the set generically — "every installed `pmos-*` plugin" — with ONE generic matcher (`pmos-*:*` command/Skill namespaces; frontmatter lookup already generalized to a `pmos-*` glob by C5) and ZERO hardcoded plugin lists anywhere in the file. The description drops its parenthetical enumeration entirely.
**Rationale:** Classic enumerated-set staleness — the exact class the repo's [J] coherence gate and durable lessons exist for. A generic matcher also future-proofs plugin #6.
**Blast radius:** description edit touches the triggering surface (skill-eval description checks re-run); folds into C7's combined prose pass; no lint parses plugin names.

### C13 — Description gains the multi-session capability + a trigger phrase (F15, Should-fix)

**File:** `plugins/pmos-utilities/skills/reflect/SKILL.md`, frontmatter description (line 3).
**Before → after:** The description claims current-session-only ("invoked in the current session. Reads the session transcript…") — the entire multi-session pipeline (`--last/--days/--since/--project all`, subagent fan-out, recurring-pattern aggregation) is absent from both the capability claim and the trigger phrases, so a user asking "what keeps going wrong with /spec across my sessions" never triggers the skill and a reader is told it can't do what its argument-hint advertises. Add one clause — "…invoked in the current session, or across recent sessions via `--last N` / `--days N` / `--since DATE`, aggregating recurring patterns" — and one trigger phrase, e.g. "what keeps going wrong with <skill> across my sessions". Executed as a single description rewrite combined with C12's de-enumeration.
**Rationale:** The description is the routing contract; as shipped it affirmatively denies ~40% of the skill's surface. Pass 1 restructured the body thoroughly but never touched the one surface the router reads.
**Blast radius:** triggering behavior (intended improvement); skill-eval description/trigger checks; one file.

### C14 — The 300-line consolidation prompt becomes a tagged, defer-only destructive gate (F16, Should-fix)

**File:** `plugins/pmos-utilities/skills/reflect/SKILL.md`, Capture Learnings phase (line 292).
**Before → after:** "If it exceeds 300 lines, propose a per-section consolidation to the user before appending." is a second prose-only prompt in the same phase C6 fixed — NI-invisible, and it guards a DESTRUCTIVE rewrite (summarizing away accumulated user learnings, worse stakes than the append). Replace with a structured `AskUserQuestion` ("learnings.md is at N lines (>300). Consolidate before appending?" · options "Consolidate as proposed / Append without consolidating / Skip the append") preceded by the literal adjacent tag `<!-- defer-only: destructive -->`. Under NI the classifier DEFERs: the consolidation proposal lands in the OQ buffer and no rewrite occurs — and since C6's gates already defer the append itself, NI runs write nothing at all (stated explicitly in the phase).
**Rationale:** Identical defect class to accepted F6 with strictly worse stakes. `destructive` is the correct reason code here (the hazard is the rewrite), unlike C6's `free-form` (where the hazard is the user-authored edit path).
**Blast radius:** `audit-recommended.sh` sees a third tagged call site in this phase (green by construction); the phase's "gates in this phase" ordering note (see C6) covers all three asks.

---

## Rejections

None across both passes. All 20 findings were verified against the files (every ≥40-char quote present at the cited line) and accepted. Three pass-2 nits (F18, F19, F20) were defects in pass-1's own proposal wording rather than in the shipped file; the affected changes (C1, C2, C6) are amended above and the amended text supersedes the pass-1 versions.

## Open questions

None — no unresolved disagreements. Every finding from both passes was accepted with a concrete fix.

## Sequencing note for the implementer

One combined edit pass is recommended: C2 (renumber + anchors + `{#mode-routing}` table, absorbing F11/F18) as the skeleton; C1 (three-site root canonicalization with F19's mtime/`--project all` semantics), C5, C11 (filter home) applied within it; C7/C8/C12/C13 as one combined prose/description pass; C3 (script incl. F17's score/tier), C4, C6+C14 (the three Capture-Learnings gates together), C9 as scoped functional edits; C10 as a separate file add. Post-edit gates: `tools/lint-phase-refs.sh`, `tools/lint-flags-vs-hints.sh`, `tools/lint-non-interactive-inline.sh`, `plugins/pmos-toolkit/tools/audit-recommended.sh` (pass the SKILL.md FILE), and `skill-eval-check.sh` on the skill DIR.
