# P1 + P2 Fix Campaign — Implementation Plan

> **For agentic workers:** this plan is executed by a controller session dispatching parallel subagents per work package (superpowers:subagent-driven-development pattern, adapted: packages are prose-refactor work, not TDD code tasks). Steps use checkbox syntax for tracking. **The controller must read this file in full, plus `report.md` (Decisions section) in this folder, before dispatching anything.**

**Goal:** Apply every P1 (mechanical hygiene) and P2 (design change) item from the 2026-06-10 skill-design review across pmos-toolkit + pmos-learnkit in one coordinated campaign instead of per-skill `/skill-sdlc` runs.

**Architecture:** Four ordered waves. Wave 0 lands policies, lints, and the learnkit `_shared` resync (everything later work depends on). Wave 1 creates the canonical shared-substrate files (then `_shared/` is frozen). Wave 2 rewrites ~28 skills in parallel batches with disjoint directory ownership, each consuming the new substrate. Wave 3 is integration: cross-skill reference repair, every gate green, adversarial behavior-preservation review, docs/memory updates.

**Tech stack:** markdown skill rewrites + bash lints; instructions sourced from `per-skill/<skill>.md` review files in this folder (they survive compaction — agents read them, the plan doesn't duplicate them).

---

## Binding decisions (made with maintainer 2026-06-10 — do not re-litigate)

1. **Gates policy:** deterministic = hard gate, judgment = advisory, arithmetic = script.
2. **Flag policy:** hybrid NL-first. Every skill must honor natural-language equivalents. Flags passing the 4-test (machine coupling / destructive opt-in / typed value / headless determinism) stay documented contracts and appear in argument-hints; all other flags become undocumented silent aliases (kept working, removed from argument-hints; body states "infer X from the request; explicit `--flag` overrides").
3. **Effort dial:** `--depth brief|standard|deep` is the one user-facing vocabulary. Machine-coupled flags are **never renamed** (e.g. `--skip-folded-*`, `--subagent-driven`, `--backlog`, `--apply-edits` stay exactly as-is — other skills pass them as literal strings). User-facing legacy spellings (`--rigor`, boolean `--deep`, `--tier lite|full` where user-facing) become silent aliases for `--depth`.
4. **Negation:** new/changed user-facing negations use `--no-*`; machine-coupled `--skip-*` flags keep their names.
5. **Phases:** integer top-level phases; every phase heading gains a stable kebab slug (`## Phase 7: Version bump {#version-bump}`); ALL cross-references (cross-skill, log-line contracts, schemas, reference files) cite the slug, never a bare number. Renumber only the skills their reviews flagged as accreted.
6. **FR-tag policy:** strip inline `FR-xx`/`D-xx`/`T-xx`/`W-xx`/`G-xx`/`§x.y` spec tags from runtime prose; each skill keeps one short "Spec lineage" footnote listing its source feature folders. **Exception:** before stripping any tag, grep `tests/` and `*/tests/` for that literal string — checked-in fixtures assert some of them (e.g. wireframes' W2 fixture). A tag a test greps for stays (or the test is updated in the same package).
7. **skill-eval softening:** the 6 taste-[J] checks identified in `cross-cutting/platform-gates.md` move to a new "Advisory signals" section — reported, never gated. New totals: 35 gated checks (21 [D] + 14 [J]), floor ≥31; advisory 6 reported as notes. `skill-eval-check.sh --selftest` asserts the 21 [D] count — preserve that invariant and update its prose-vs-table count assertion.
8. **Substrate canonicity:** when drifted copies disagree, the most recently shipped spec's version wins; per-consumer deltas are stated at the consumer's call site, not in the substrate file.
9. **Commit cadence:** controller commits after each completed package, `refactor(<scope>): <summary> [design-review P1/P2]`. Never let two waves' changes share a commit.
10. **Out of scope (P3 — do NOT do):** non-interactive block shrink, Codex smoke run, mytasks/backlog full NL command-surface redesign, architecture L1→ruff/ESLint delegation, creativity write-side modernization (feature-folder save / auto-commit removal), readme `--update` hook implementation. Also out of scope: releases (`/complete-dev` runs are the maintainer's, after review).

## Execution protocol (every dispatched agent inherits this)

- **Verify before edit.** Reviews are 2 days old and frameworks shipped v0.18.0 since; confirm every claim against current source. If a claimed fix is wrong, refuse it and report why (this happened once in P0 — it's the system working).
- **Ownership is the skill directory.** A package owner touches only its listed paths. Cross-boundary stragglers are reported back to the controller, who fixes them in Wave 3.
- **`_shared/` is frozen after Wave 1.** Wave 2 agents add pointers to it; they never edit it.
- **Never touch the inline non-interactive block** (between `<!-- non-interactive-block:start/end -->`) — byte-identical by lint.
- **Behavior preservation is the contract.** Machine-coupled flags, log-line contracts, state-schema fields, output filenames, exit codes: preserved or explicitly aliased. The reviews' "Fix list" tables mark what's quick-win vs structural; both are in scope here, but anything labeled a P3 item in report.md is not.
- **After editing, run:** the skill's own tests (if `tests/` exists), `bash plugins/pmos-toolkit/tools/lint-non-interactive-inline.sh`, `bash plugins/pmos-toolkit/tools/audit-recommended.sh`, and (once Wave 0 lands) `bash tools/lint-flags-vs-hints.sh <skill-dir>` + `bash tools/lint-phase-refs.sh <skill-dir>`. Report pass/fail.
- **Final message:** numbered list of edits (file: what), declined fixes with reasons, test results, stragglers for the controller.

---

## Wave P — Pre-flight (controller, sequential)

- [ ] **P.1** Create branch and commit the P0 batch (currently 52 modified + 2 untracked on `main`):
```bash
git checkout -b refactor/skill-design-p1p2
git add -A
git commit -m "fix: P0 correctness batch + review artifacts + /repo-audit skill [design-review]"
```
- [ ] **P.2** Sanity: `bash plugins/pmos-toolkit/tools/audit-recommended.sh` → PASS; `bash plugins/pmos-toolkit/tools/lint-non-interactive-inline.sh` → PASS; `bash plugins/pmos-toolkit/skills/verify/tests/test-phase-4-7-smoke.sh` → 5/5.

## Wave 0 — Foundations (4 packages, parallelizable except 0.4 after 0.1)

- [ ] **0.1 Policies → skill-patterns.md** (owner: `plugins/pmos-toolkit/skills/feature-sdlc/reference/skill-patterns.md`)
  Add three short policy sections, written in the document's existing register: (a) gates policy (decision 1, with the polish/diagram/magazine precedents as examples); (b) flag policy (decisions 2–4, the 4-test, argument-hint = contract-flags-only); (c) phase policy (decision 5, slug anchors, integer phases); (d) "one fact, one home" — a fact stated in two places must cite one canonical home (this campaign's root-cause lesson). Source context: `report.md` findings 4–7.
- [ ] **0.2 Two new lints** (owner: `tools/` at repo root — create the dir; plus `.github/workflows/`)
  - Create `tools/lint-flags-vs-hints.sh`: for every `plugins/*/skills/*/SKILL.md`, (a) every flag in frontmatter `argument-hint` must be defined in the body; (b) every flag the body defines in a flag table/list must appear in argument-hint OR carry an adjacent `<!-- nl-sugar -->` marker (the silent-alias class). Must catch the known dead-flag class and caller/callee mismatches like the old `--deep`/`--depth` break. Bash-3.2-safe.
  - Create `tools/lint-phase-refs.sh`: extract every `Phase <N><letter?>` reference and `{#slug}` anchor across `plugins/*/skills/**/*.md`; resolve in-file references against that file's headings and `/<skill> Phase…`/`{#slug}` cross-references against the named skill's headings; exit 1 on unresolvable. A ~30-line prototype is described in `cross-cutting/flags-phases.md` — start there.
  - Wire both into a new `.github/workflows/skill-hygiene.yml` (same shape as `audit-recommended.yml`). Expect both lints RED at creation (they gate Waves 2–3; record the initial failure counts in the package report). While here: repo-root `CLAUDE.md` cites `tools/lint-non-interactive-inline.sh` / `tools/audit-recommended.sh` but they live at `plugins/pmos-toolkit/tools/` — fix the paths in CLAUDE.md.
- [ ] **0.3 learnkit + utilities `_shared` resync** (owner: `plugins/pmos-learnkit/skills/_shared/`, `plugins/pmos-utilities/`, learnkit SKILL.md non-interactive blocks, `plugins/pmos-toolkit/tools/lint-non-interactive-inline.sh`)
  - Overwrite `plugins/pmos-learnkit/skills/_shared/non-interactive.md` with the current toolkit copy; re-paste the canonical block byte-identical into frameworks/primer/magazine SKILL.mds (and any other learnkit skill carrying a stale block); fix mac-health's third-generation variant in `plugins/pmos-utilities/`.
  - Extend `lint-non-interactive-inline.sh` to scan `plugins/*/skills` (all plugins) and run it → must PASS.
  - Delete learnkit `_shared` dead cargo (per `cross-cutting/substrate.md`: execute-resume, phase-boundary-handler, msf-heuristics, sim-spec-heuristics, structured-ask-edge-cases, stacks/ — **verify zero learnkit consumers via grep before each deletion**; anything with a consumer stays and gets reported).
  - Re-run `bash scripts/sync-shared.sh --from=pmos-toolkit --dry-run` and report what would now sync (sanity that the intersection shrank to genuinely-shared files).
- [ ] **0.4 skill-eval rubric softening** (owner: `plugins/pmos-toolkit/skills/feature-sdlc/reference/skill-eval.md` + `tools/skill-eval-check.sh`; run AFTER 0.1 so the policy text exists to cite)
  Apply decision 7. The 6 check IDs are listed in `cross-cutting/platform-gates.md` (verify each exists; the set is the pushy-description / context-economy / imperative-form / explain-why / flowcharts / examples family). Move them to an "Advisory signals (reported, not gated)" section; update header counts to 35 gated (21 [D] + 14 [J]) / floor ≥31 / 6 advisory; add a count self-assertion to `--selftest` (prose header vs table count) and run `--selftest` → PASS.
- [ ] **0.5 Controller commits each package as it lands** (4 commits).

## Wave 1 — Substrate extractions (1 package, single agent — files interlock)

- [ ] **1.1 Create five canonical substrate surfaces** (owner: `plugins/pmos-toolkit/skills/_shared/` only; consumers untouched — pointers land in Wave 2). Source: `cross-cutting/substrate.md` has the full consumer/drift map per pattern.
  - `_shared/findings-dispositions.md` — the Fix-as-proposed (Recommended) / Modify / Skip / Defer protocol: severity-ordered batches ≤4, one finding per question, non-interactive auto-pick/defer behavior, the severity vocabulary (adopt spec's `[Blocker]/[Should-fix]/[Nit]` as canonical per decision 8 — spec's is the most recent).
  - `_shared/folded-phase.md` — folded-phase mechanics: escape flag convention, per-finding commits, `folded_phase_failures[]` capture, advisory-continue, pre-apply clobber guard (targeting `.html` artifacts — the P0 fixes are the current truth).
  - `_shared/tier-matrix.md` — tier definitions + detection signals + boundary semantics, reconciling the 5 drifted copies (requirements' wording is most recent — verify in git log).
  - `_shared/reviewer-protocol.md` — reviewer-subagent Input Contract (the FR-50/51/52 family: quote-grounding ≥40-char substring, section validation, return shape) + the 2-loop cap with its cost-governor rationale.
  - HTML emit: **no new file** — confirm `_shared/html-authoring/README.md`'s 6-item checklist is current and add one "How consumers cite this" paragraph showing the pointer-plus-deltas pattern (filename, `pmos:skill` meta value, save path are the per-skill deltas).
  - Copy to learnkit `_shared/` whichever of these learnkit skills will consume (check per-skill reviews for primer/magazine/frameworks emit-block usage; copy only those).
  - Each file ends with a "Consumers" list (skill names only, no phase numbers).
- [ ] **1.2 Controller commit.** `_shared/` is now frozen.

## Wave 2 — Per-skill rewrites (28 packages in 4 batches of ~7, disjoint ownership)

Every package's instruction source is `per-skill/<skill>.md` in this folder — the agent reads it (Findings + Fix list + Flags/Gates inventories), applies everything except items marked P3/out-of-scope above, and additionally applies the five global treatments: (1) FR-tag strip per decision 6; (2) substrate pointers replacing the five duplicated patterns; (3) flag policy per decisions 2–4 (argument-hint slimmed to contract flags, `<!-- nl-sugar -->` markers, NL-first sentence); (4) phase slugs per decision 5 (renumber only if the review flagged accretion); (5) de-triplication of in-file rule repeats. Target line counts come from each review's Size line.

**Batch A — pipeline core:**
- [ ] **A1 requirements** — also: extract 3 tier templates to `reference/requirements-templates.md` (mirrors spec/plan pattern); retired-`01_requirements.md` contradiction sweep; consume folded-phase + tier-matrix + findings-dispositions.
- [ ] **A2 spec** — also: heading-anchor algorithm stated once; `<img>`-vs-inline-SVG contradiction resolved; stale "canonical across /spec and /plan" diagram claim; consume all five substrates. Target ~300.
- [ ] **A3 plan** — also P2: replace the four prose state machines (pid lock → warn-if-lockfile-exists; sha256 skip-list → plain accumulating list; 5-min wall-clock cap → drop; dead `PMOS_NESTED` gate → delete) and soften Phase 4's review machine to the default-escalate principle (keep the two cheap mechanical hard-fails); vertical-slice rule stated once; subagent-driven.md coaching-prose trim (~30%), protocol parts kept.
- [ ] **A4 execute** — also: de-fossilize Phase 3 checklist to stack-neutral intents (keep the frontend fallback ladder); extract the ~70-line /plan-contract block to `reference/plan-contract.md`; restore the per-task loop heading; add the ~8-line TDD test-quality philosophy (behavior-vs-implementation, horizontal-slice anti-pattern) — also consumed by the implementer template.
- [ ] **A5 verify** — also: extract folded-phase mechanics + /execute + reviewer invocation contracts (~150 lines) to reference files loaded on those branches; consume reviewer-protocol + folded-phase. Keep the Phase 4 evidence-gate core verbatim (review: battle-derived).
- [ ] **A6 complete-dev** — also: collapse the seven per-phase "Short-circuit when Phase 0a confirmed" paragraphs into one rule citing lastrun-schema; diff_router branch table → 4-line intent. Target ~620 (domain-justified length).
- [ ] **A7 feature-sdlc + skill-sdlc + prototype-sdlc** (one agent) — also P2: token-1 dispatch grammar → principle + examples, fixing alias forwarding (`/prototype-sdlc list`, `--resume` spurious warning, unquoted seeds); failure-dialog.md stale phase lists → defer to state-schema hardness column; alias argument-hint drift fixed by pointing at the orchestrator. Target ~400.

**Batch B — authoring/visual:**
- [ ] **B1 wireframes** — also: the one-time coherent renumber with slugs (its review documents the three colliding schemes); folded-msf-wf mechanics (~60 lines) → reference file; rigor-tier ladder defined once; consume reviewer-protocol. Target ~280. **Caution:** `tests/fixtures/pipeline-consolidation/test-w2-fold-msf-wf.sh` greps literal strings in this SKILL.md — run it before and after; update fixture expectations in the same package if a kept-behavior string moves.
- [ ] **B2 prototype** — also P2: add "what question must this prototype answer" to the Phase 1 confirm gate + `Verdict:` line in Phase 10 handoff; x-interaction/Babel/load-order each stated once in reference/; Anti-Patterns 27→~6; delete superseded `reference/styles-derivation.md` (verify nothing links it); adopt the wireframes rigor ladder; fold Phase 5c greps into Phase 5d runtime smoke. Target ~300.
- [ ] **B3 diagram** — also P2: non-interactive self-fixing (auto-apply refinement fixes with sidecar dispositions; Phase 5 reviewer dispatch becomes a runtime capability check); rubric rebalance per its review (keep all deterministic hard-fails; gating vision set shrinks to legibility + theme add-items; arrowhead/legend → code; primary-emphasis/clear-entry/style-atom-match → advisory; drop grid_snap from code_score); theme.yaml = single style authority; `${CLAUDE_PLUGIN_ROOT}` paths. Target ~320.
- [ ] **B4 artifact** — also: Phase 2.7 emit boilerplate → html-authoring citation + 3 deltas; FR-22 collision resolved via lineage footnote; chrome-strip bash → 3-line intent citing `chrome-strip.md`. Target ~350.
- [ ] **B5 polish** — also P2: create `scripts/metrics.js` (zero-dep node: passive-%, sentence-length stddev, heading metrics) and rewire rubric checks 2/3/11 to consume its output (LLM judge keeps only worst-span citation); reclassify check 8 to high-risk/surfaced; delete the 22-item Anti-Patterns restatement; Phase 2a → ~8 lines pointing at `reference/editorial-pass.md`. Target ~170 + script.
- [ ] **B6 readme** — full rewrite to ~200-line intent doc per its review (graded D; the deterministic substrate underneath is good — keep all scripts/rubric.yaml/personas); soften simulated-reader hard-fail-pause to drop-with-warn; consume reviewer-protocol for the quote contract. Run all its selftests after.
- [ ] **B7 design-crit + msf-wf + msf-req** (one agent) — also P2: promote `msf-wf/reference/psych-output-format.md` + scoring rules to `_shared/psych-scoring.md` — **exception to the Wave-1 freeze, pre-authorized for this package only** — with design-crit + msf-wf consuming it (kills design-crit's third PSYCH implementation); PSYCH arithmetic → judgment-assigned Watch/Bounce/Cliff bands with totals as illustration; design-crit's depth-control prose → its 4-sentence contract; port the surfaced/unsurfaced echo line to msf-wf Phase 9; design-crit's unanchored MSF 1–5 scale → adopt the 24-consideration walk or delete (its J7/J8 already cover most).

**Batch C — utilities:**
- [ ] **C1 backlog** — de-dup against schema.md/tracker-crudl.md (cite, don't restate); verb-router intro keeps `add`/`set`/`promote`/`rebuild-index` exact (machine-coupled); add the small intent-routing guard (query-shaped text → views, not capture). Target ~235.
- [ ] **C2 mytasks + people** (one agent) — same cite-don't-restate treatment (enums ×3, INDEX ×2, id/slug ×2, ~60 lines of literal output templates → reference); intent-routing guards in both Phase 0s; align /people set/refine with lookup.md's documented fuzzy-resolve behavior and relax `tests/scenarios.md` literal-string asserts in the same package. Targets ~250 / ~180.
- [ ] **C3 comments** — export `loadThreads`/`persistThreads` as public API in `scripts/resolver.js` (tests exist — run all 10 suites); state who drives at runtime (model orchestrates dispatch, controller owns serialize/stage); body trims per review. 
- [ ] **C4 architecture** — also P2: merge the two judge-mode sections; consolidate rule prose to `principles.md` alone (retire `l1-rationales.md` + `check-principles-drift.sh` + md-coverage test + pre-commit installer — verify nothing else invokes them); Phases 1–6 → "run `run-audit.sh`, read the triplet" (~25 lines); re-import the post-`--deep` grilling offer. Target ~200.
- [ ] **C5 survey-design + survey-analyse** (one agent) — survey-design: the ×4/×3/×3 self-repeats → one canonical statement each, E1–E22 table kept, scoring-rubric-never-consulted deleted; cite `_shared/findings-dispositions.md` (replacing the P0 inline stopgap). survey-analyse: minor residue only. Target ~200 / current.
- [ ] **C6 grill + creativity + ideate + simulate-spec** (one agent) — grill: emit block → pointer, stem→phase table + tracking table deleted, one-question-per-turn once. Target ~120. creativity: Tier-2's 14 lenses → `reference/techniques.md` with floor-not-ceiling note. Target ~95 (P3 write-side untouched). ideate: Phase 3 → ~5 lines pointing at `eleven-star-ladder.md`; strip phase numbers from reference-file headings. Target ~150. simulate-spec: make `_shared/sim-spec-heuristics.md` actually canonical (move full bucket checklists/adversarial categories/pseudocode discipline there — **second pre-authorized `_shared` edit**; reconcile the four SKILL.md↔substrate divergences with an explicit standalone-vs-folded deltas section); delete the vestigial reviewer Input Contract copy (verify no caller). Target ~200.
- [ ] **C7 changelog + session-log + product-context** (one agent) — changelog/session-log: drop Track Progress ceremony, de-triplicate, learnings stanza → `_shared/learnings-capture.md` pointer. Targets ~60 / ~50 (excl. block). product-context: 3 templates → `reference/templates.md` (delete the orphaned Feature template); pipeline-setup A.4 becomes the single settings.yaml writer (delete the drifted local writer); per-subcommand non-interactive behavior (show=headless-ok, update=defer, init=refuse marker).

**Batch D — learnkit:**
- [ ] **D1 primer + learn-list** (one agent) — primer: rewrite `reference/source-floor.md` ~140→~30 (delete four-strands/blocking-gate/conflicting schema — contradicts the shipped non-blocking design); FR strip (~60 tags); Phase 5's 16 steps → intent + the one non-obvious rule; dial resolution → cite `_shared/topic-research/intake.md`. Target ~190. learn-list: fix `_shared/topic-research/sourcing-ladder.md`'s D12-spirit leaks (consumer section names, stale "mode" vocab, consumer phase numbers in headings) — **third pre-authorized `_shared` edit (learnkit)**; verify with `topic-research/tests/assert_substrate_skill_agnostic.sh`.
- [ ] **D2 magazine** — Phases 2–3 de-narration (~35 lines → 4 sentences); Phase 1 dispatch → 7-line routing table; trust rule ("never fabricate; degrade honestly") hoisted to one prominent statement; FR strip; whisper-probe memorial deleted. Run its structure tests.
- [ ] **D3 frameworks** — **re-verify everything against v0.18.0 first** (shipped after the review). Then: Phases 2/5 → pointers to matching.md/ingestion.md; stale `/diagram`-generates-diagrams anti-pattern bullet; drop no-op `--format`; match.mjs scoring fix (length-insensitive normalization, full pool to re-rank below floor, zero-score exclusion) + `--json` hardening (reranked boolean, absolute diagram paths, null convention) **only if still present in v0.18.0** — run `match.mjs` empirically before and after.
- [ ] **D4 critical-thinking + playbook** (one agent) — critical-thinking: degradation rule ×4 → once; Phase 0.3 read-only contradiction; make calibration resolvable (shape-7 generator pre-commits a hidden resolution, reveals after the user states p). playbook: FR strip + phase restatements → intent + pointer + inviolable rule (159→~105); fix the comments contract — render through `_shared/html-authoring/template.html` + render.js so emitted articles are actually annotatable (it's currently a 15th emit surface outside the fanout test — add it to the fanout test's surface list, or honestly delete the comment-resolver section; prefer the render fix). **Heed the render.js token gotcha:** strip template.html's leading doc-comment before renderArtifact() or the body duplicates.

After each batch: controller commits per package, runs `bash tools/lint-phase-refs.sh` and `bash tools/lint-flags-vs-hints.sh` on the batch's skills, and fixes/queues stragglers the agents reported.

## Wave 3 — Integration & verification (controller + 4 reviewer agents)

- [ ] **3.1 Cross-skill reference repair.** Run both new lints repo-wide; fix every remaining orphan centrally (expected: cross-skill phase refs broken by B1's wireframes renumber and A-batch restructures — e.g. feature-sdlc's state-schema/failure-dialog, plan↔verify refs).
- [ ] **3.2 Full gate sweep** — all must pass:
```bash
bash plugins/pmos-toolkit/tools/audit-recommended.sh
bash plugins/pmos-toolkit/tools/lint-non-interactive-inline.sh   # now all-plugins
bash tools/lint-flags-vs-hints.sh
bash tools/lint-phase-refs.sh
bash plugins/pmos-toolkit/skills/feature-sdlc/tools/skill-eval-check.sh --selftest plugins/pmos-toolkit/skills/feature-sdlc
bash plugins/pmos-toolkit/skills/_shared/html-authoring/tests/fanout.test.sh
bash scripts/check-comments-coverage.sh
bash plugins/pmos-toolkit/skills/verify/tests/test-phase-4-7-smoke.sh
# plus every per-skill tests/ dir touched in Wave 2 (comments 10 suites, readme selftests,
# wireframes W2 fixture, magazine/primer/learn-list structure tests, survey selftest.sh,
# topic-research agnosticism test)
```
- [ ] **3.3 Adversarial behavior-preservation review.** Dispatch 4 reviewer agents, one per Wave-2 batch, each given `git diff main...HEAD -- <batch's skill dirs>` plus the per-skill review files, hunting ONLY for: lost behavior (a contract/flag/log-line/output filename that existed before and is neither present nor aliased), substrate pointers that don't resolve, and new contradictions introduced by the rewrite. Fix everything confirmed.
- [ ] **3.4 Run `/skill-sdlc`-grade eval on the 5 biggest rewrites** (readme, spec, plan, feature-sdlc, wireframes): `bash plugins/pmos-toolkit/skills/feature-sdlc/tools/skill-eval-check.sh <skill-dir>` — [D] checks must pass; soft-check regressions reported, not gated.
- [ ] **3.5 Docs + memory.** Update repo `CLAUDE.md` (Skill-authoring conventions: the three new policies, the two new lints, the new `_shared/` files); append a "P1/P2 executed <date>" status block to `report.md`; update the auto-memory file `project_2026_06_10_skill_design_review.md` (P1–P3 section → what's now done, what remains P3).
- [ ] **3.6 Final commit + handoff.** `git log --oneline main..HEAD` summary to the maintainer. Releases (two plugins' `/complete-dev` runs) and the merge decision are the maintainer's. Do not push.

## Self-review notes (already applied)

- Every P1 item from report.md maps to a package: FR strip + de-triplicate (global treatments in all Wave 2 packages), 5 extractions (1.1), 2 lints (0.2), learnkit resync (0.3). Every P2 item maps: flag policy (global treatment + 0.1), phase renumber/anchors (global + B1), gates codification + taste-[J] softening (0.1/0.4), polish metrics script (B5), PSYCH bands + psych-scoring substrate (B7), plan state machines (A3), diagram NI self-fixing (B3), prototype question gate (B2), readme rewrite (B6), architecture judge-merge (C4).
- Known risk: Wave 2's global treatments interact with checked-in fixture greps (wireframes, mytasks/people scenarios, verify smoke). Each affected package carries an explicit caution; 3.2 re-runs everything.
- Known unknown: frameworks v0.18.0 drift — D3 re-verifies before acting.
