# Cross-cutting analysis — shared-substrate use (dimension 3)

Scope: `plugins/pmos-toolkit/skills/_shared/`, `plugins/pmos-learnkit/skills/_shared/`, all 40 SKILL.md files (33 toolkit, 7 learnkit, 2 utilities), `scripts/sync-shared.sh`. All line counts measured 2026-06-10 on `main` (2775975).

---

## 1. Substrate inventory

### 1a. pmos-toolkit `_shared/` (canonical/upstream copy)

| File | Lines | Purpose (one line) | Consumers (SKILL.md + reference greps) | Status |
|---|---|---|---|---|
| `non-interactive.md` | 172 | Canonical `--non-interactive` contract + the ~27-line inline block (sentinel `non-interactive-block`) + Section D CI extractor | 31 skills across 3 plugins (34 SKILL.md carry the sentinel block) | **Used, lint-enforced** (`plugins/pmos-toolkit/tools/lint-non-interactive-inline.sh`) |
| `pipeline-setup.md` | 337 | Phase 0 setup: settings.yaml, feature-folder rules, docs_path/output_format resolution; canonical inline block (sentinel `pipeline-setup-block`) | 26 skills (21 toolkit + 5 learnkit); 10 carry the inline block | **Used, lint-enforced** (`lint-pipeline-setup-inline.sh`) |
| `html-authoring/` (12 md/js/html + 8 tests + assets) | ~1,100 | HTML artifact substrate: template, render.js, style.css, comments overlay, serve.js, chrome-strip, index-generator, conventions | 23 skills (incl. 3 learnkit) | **Used, test-backed** (`fanout.test.sh`, coverage gate) |
| `interactive-prompts.md` | 75 | Two-path prompting protocol (AskUserQuestion primary / numbered free-form fallback), validation, defaults | 16 skills | **Used; §Consumers list rotted** — names only mytasks/people/backlog while 16 skills cite it; also the target of a phantom citation (see P2) |
| `learnings-capture.md` | 121 | End-of-run learnings capture into `~/.pmos/learnings.md` (terminal gate) | 19 toolkit skills | **Used (toolkit only)** — no learnkit/utilities counterpart; 8 other skills inline the stanza instead (see P7) |
| `resolve-input.md` | 125 | Format-aware artifact resolver (html-preferred, md fallback) | 15 skills | Used |
| `apply-edit-at-anchor.md` | 172 | `/comments` resolve-shim anchor contract (id-first + ≥40-char substring) | 16 skills | Used |
| `structured-ask-edge-cases.md` | 81 | What to do when a reply falls outside offered options | 7 toolkit skills | Used |
| `msf-heuristics.md` | 78 | Shared MSF (motivation/friction/satisfaction) heuristics | msf-req, msf-wf, requirements | Used |
| `sim-spec-heuristics.md` | 176 | Scenario-trace + apply-loop substrate for simulate-spec | spec, simulate-spec, feature-sdlc | Used |
| `execute-resume.md` | 249 | `--resume` disambiguation pseudocode | **execute only** | Used by 1 skill — "shared" in name only; could live in `execute/reference/` |
| `phase-boundary-handler.md` | 151 | Phase-boundary pseudocode for /execute | execute, feature-sdlc | Used |
| `canonical-path.md` | 34 | Canonical skill-path contract | complete-dev, feature-sdlc, (learnkit primer) | Used |
| `platform-strings.md` | 24 | Platform-neutral string table | feature-sdlc, plan, spec, (learnkit primer) | Used, lint-backed (`lint-platform-strings.sh`) |
| `persona-journey-alignment.md` | 37 | Persona/journey alignment ceremony | creativity, msf-req, msf-wf | Used |
| `tracker-crudl.md` | 65 | Tracker CRUDL contract for file-backed trackers | backlog, mytasks, people | Used |
| `writing-principles.md` | 42 | Author-time prose principles (polish enforces) | changelog, polish (+ cited from `html-authoring/conventions.md` §12) | Used |
| `stacks/` (10 files) | 611 | Per-stack verification command libraries | **plan only** (+ `lint-stack-libraries.sh`) | Used by 1 skill |

### 1b. pmos-learnkit `_shared/` (synced copy + learnkit-only substrate)

| File | Lines | Consumers in learnkit | Status |
|---|---|---|---|
| `topic-research/` (6 docs + 1 test) | ~510 | primer, learn-list | **Used; learnkit-only** (deliberate, D12 skill-agnostic test) |
| `pipeline-setup.md`, `interactive-prompts.md`, `non-interactive.md`, `resolve-input.md`, `canonical-path.md`, `platform-strings.md`, `apply-edit-at-anchor.md`, `html-authoring/` | ~2,000 | all 5–6 HTML-emitting learnkit skills | Used, but **stale vs toolkit** (see §3) |
| `execute-resume.md` (249), `phase-boundary-handler.md` (151), `msf-heuristics.md` (92), `sim-spec-heuristics.md` (176), `structured-ask-edge-cases.md` (81), `stacks/` (611) | **1,360** | **zero learnkit consumers** | **Dead cargo** — rode in on the wholesale `sync-shared.sh` scaffold (commit d5bcda9) and were never used |

pmos-utilities has **no `_shared/`** — mac-health and reflect are deliberately self-contained (reflect:288 says so explicitly). Correct posture, but it interacts badly with `sync-shared.sh` (§4).

---

## 2. Duplication map — what is copied across skills that should be shared

Sorted by total duplicated lines. "Drift" = copies have meaningfully diverged.

| # | Pattern | Skills (count) | ~Dup lines | Drift? |
|---|---|---|---|---|
| P1 | **FR-10 HTML-emit/asset-copy block** (Atomic write FR-10.2 / Asset substrate FR-10 / Asset prefix FR-10.1 / Cache-bust FR-10.3 / Heading IDs FR-03.1 / Index regen FR-22 / pmos:skill meta / retired FR-12.1 sidecar) | requirements, spec, plan, verify, grill, msf-req, msf-wf, simulate-spec, artifact, readme, design-crit, survey-design, survey-analyse, architecture, ideate, polish, feature-sdlc (**17 full**; wireframes/prototype/diagram partial) | **~220** (10–17 lines each) | **Yes.** requirements:249 spells per-file install modes (`install -m 0755` for `.command`/`.sh`, `cp -n` for `.bat`) and offers `rsync --update`; grill:182 lists the trio bare with `cp -n` only; spec:263 says "(via `cp -n`)". A future asset addition must be hand-fanned to 17 files (the v2.42 release notes call this exact fan-out: "manifest mention fanned out to 11 files"). |
| P2 | **Findings Presentation Protocol** (severity-batched Fix / Modify / Skip / Defer dispositions, ≤4 per AskUserQuestion call, platform fallback table, anti-pattern para) | spec(23), plan(23), prototype(26), wireframes(19, cross-file rollup variant), design-crit(56), polish(18 + 88-line `reference/findings-protocol.md`), diagram(~6), complete-dev(~6), feature-sdlc(~8 FR-24), requirements + survey-design + reflect (Fix/Modify/Skip/Defer inline) — **~12 surfaces** | **~210** | **Yes.** spec:417 adds `[Blocker]/[Should-fix]/[Nit]` severity tags and "Defer … must be resolved before exit, since Open Questions are forbidden"; plan:441 has no severity tags and defers to Open Questions; diagram:279 renames the options ("Apply fix as proposed / Modify fix / Skip / Defer to user notes"); feature-sdlc:372 renames again ("Apply as recommended / … / Skip — drop with reason"). **Phantom citation:** survey-design:284 routes to "the `_shared/interactive-prompts.md` findings/dispositions protocol" — **no such protocol exists in that file** (it covers two-path prompting, validation, defaults only). |
| P3 | **Folded-phase mechanics** (skip-flag escape, `git status --porcelain` pre-apply guard, per-finding commits with `Depends-on:` bodies, `folded_phase_failures[]` capture, D11 advisory-continue, flag-handling stanza) | requirements Phase 5a (~50), spec Phase 6a + folded-arch (~85), wireframes Phase 6 (~50), verify folded-arch (~45) | **~230**, skeleton ~80% identical (only `{artifact, flag, commit-prefix}` vary) | **Yes — and rotted.** The folded sections still target markdown artifacts: requirements:592 guards `git status --porcelain 01_requirements.md` and applies edits to `01_requirements.md`, while Phase 4 of the same skill (line 245) writes `01_requirements.html` (HTML-primary since v2.33). Same `.md` targets in spec:494 (`02_spec.md`) — the pre-apply guard checks a file the skill no longer writes. |
| P4 | **Reviewer-subagent Input Contract** (parent chrome-strips via FR-50, `sections_found` FR-51 output shape, parent-side FR-52 validation) | grill:96, msf-req:63, msf-wf:94, simulate-spec:133, verify:150 (**5 skills**) | **~50** (8–12 each); the 3 core paragraphs are byte-near-identical | **Minimal** — verify adds a legitimate scope carve-out (FR-50.1, code-diff path excluded). Cleanest extraction candidate of all: high copy fidelity today, but the next FR-5x revision must touch 5 files. |
| P5 | **Tier definitions** (Tier 1 bug / Tier 2 enhancement / Tier 3 feature signal tables) | requirements:128 (signals + sections + tasks tables, ~25), spec:110 (combined scope table, ~12), prototype:165 (option labels, ~8), wireframes tier gating (~6), feature-sdlc tier passthrough logic | **~55** | **Yes.** requirements defines firing signals ("touches ≥3 surfaces, OR new persona, OR new top-level data-model concept, OR irreversible"); spec redefines Tier 3 as "new capability, new surface, major redesign"; prototype's labels are a third paraphrase. The per-artifact *sections/length* tables are legitimately local; the tier *boundary semantics* are not and have drifted. |
| P6 | **Learnings-capture stanza** | 19 toolkit skills cite `_shared/learnings-capture.md` (1–2-line pointer — good); changelog:120 and comments:130 (toolkit!) inline a ~6-line "Reflect on whether this run surfaced…" stanza instead; all 5 learnkit skills + reflect inline it because **no learnkit/utilities `learnings-capture.md` exists** | **~50** | **Yes** (two citation styles inside one plugin; learnkit wording varies per skill). |
| P7 | **Rigor-tier ladder** (high/medium/low-rigor reviewer fan-out) | wireframes **defines it twice in one file** — §Rigor & Corner-Cut Protocol (59–61) and again §4a (406–408) with re-paraphrased low-rigor briefs ("contrast against dark/light surfaces" vs "color contrast against dark/light surfaces … 'wireframe 01 didn't actually change' type findings"); **prototype has no rigor ladder at all** despite an identical per-file reviewer loop | ~20 | **Yes** (in-file drift between the two copies; asymmetry vs prototype). |
| P8 | **'Track Progress' boilerplate** | 27 skills × 3–7 lines | ~110 | No real drift — but this is rubric-mandated boilerplate (`skill-eval.md` checks for it), i.e., duplication by contract. A 1-line form would satisfy the same check. |
| P9 | **Chrome-strip dispatch preamble** | 9 skills mention `chrome-strip`; mostly *inside* P4's Input Contract or P1's emit text; feature-sdlc + artifact + readme carry the parent-side dispatch wording | ~25 net of P1/P4 | Minor. |
| — | **Vertical-slice rule** | **plan only** (§Vertical-Slice Decomposition, 236–270) — execute references the plan's task shape but does not restate the rule | 0 | **Suspect cleared** — not duplicated. |
| — | **Non-interactive inline block** | 34 SKILL.md × ~27 lines ≈ 920 | — | **Deliberate** (hand-maintained, lint-detected). Excluded per criteria.md. But note its *canonical source* has cross-plugin drift: toolkit `non-interactive.md` has 5 sections (added Section D extractor); learnkit's copy has 4 — the learnkit lint baseline is a stale contract. |

**Total accidental duplication (P1–P7, P9): ~870 lines across the two plugins**, essentially all in pmos-toolkit pipeline skills.

---

## 3. Shared but unused / rotted

| Item | Evidence | Severity |
|---|---|---|
| **learnkit dead cargo: 6 substrate items, ~1,360 lines, zero consumers** | `execute-resume.md` (249), `phase-boundary-handler.md` (151), `msf-heuristics.md` (92), `sim-spec-heuristics.md` (176), `structured-ask-edge-cases.md` (81), `stacks/` (611). Zero greps from any learnkit skill. Arrived via wholesale `sync-shared.sh` at scaffold (d5bcda9). | High — inflates the synced surface and makes every future sync a bigger diff for no benefit. |
| **learnkit copies stale vs toolkit** | Forward-ported once to v2.57.0 parity (604bbb1); toolkit then moved: `non-interactive.md` (toolkit added Section D), `msf-heuristics.md` (117 diff lines; toolkit refactor 73675d7 post-sync), `phase-boundary-handler.md`, `html-authoring/conventions.md` (toolkit added §12 Prose quality → cites `../writing-principles.md`, **which doesn't exist in learnkit** — a sync would import a dangling reference), `template.html` (toolkit added the `pmos-wordmark` header), `style.css`, `index-generator.md`. toolkit also has `assets/fonts/` that learnkit lacks. | High — two "canonical" substrates now disagree about the artifact contract. |
| `interactive-prompts.md` §Consumers | Lists 6 flows in 3 skills (mytasks/people/backlog); 16 skills actually cite the file. | Low (stale doc-rot). |
| Single-consumer "shared" files | `execute-resume.md` (execute only) and `stacks/` (plan only) sit in `_shared/` but are de-facto skill-private. They get synced (and can be deleted by sync, §4) for no sharing benefit. | Medium — move to `execute/reference/` and `plan/reference/` respectively, or accept and document. |
| **Drift hook absent** | CLAUDE.md "Drift hook contract — pre-commit only (FR-30)": no pre-commit hook is installed in `.git/hooks/` and no hook source ships in `scripts/` or `tools/`. The observed cross-plugin drift in §3 row 2 is the direct consequence. | High — the documented guard does not exist on this clone. |
| Path rot in CLAUDE.md | Cites `tools/lint-non-interactive-inline.sh` / `tools/audit-recommended.sh`; actual location is `plugins/pmos-toolkit/tools/`. | Low. |

---

## 4. Is the `_shared/` mechanism itself sound?

**`scripts/sync-shared.sh` (24 lines): no longer sound as written.** It `rsync -a --delete`s the *entire* `_shared/` tree from `--from=<plugin>` to **every** peer plugin. That design assumed identical substrate membership across plugins. Membership has since diverged in both directions, so **every possible invocation is now destructive**:

- `--from=pmos-toolkit` → **deletes `plugins/pmos-learnkit/skills/_shared/topic-research/`** (the learnkit-only substrate both `/primer` and `/learn-list` load), and overwrites learnkit's `non-interactive.md` lint baseline.
- `--from=pmos-learnkit` → **deletes toolkit's `learnings-capture.md` (19 consumers), `tracker-crudl.md` (3), `writing-principles.md` (2 + a conventions.md citation), `persona-journey-alignment.md` (3), and `html-authoring/assets/fonts/`**, and regresses 7 files to v2.57-era content.
- Either direction also `mkdir -p`s a full `_shared/` into **pmos-utilities**, whose two skills are deliberately self-contained.

The companion guard (FR-30 pre-commit drift hook) is not installed and has no in-repo source, so nothing detects the drift that has already accumulated. **Verdict: the plugin-local-copy model is fine (skills must be able to resolve `../_shared/` inside their own plugin at install time), but whole-tree `--delete` sync over diverged membership is a loaded footgun.** Fix: drive sync from an explicit manifest of cross-plugin files (sync only those, never `--delete` unlisted paths), or replace sync with a CI check that diffs only the intersection set and reports.

The **inline-block + lint** posture, by contrast, is working and is the right template: 4 precedents already exist in `plugins/pmos-toolkit/tools/` (`lint-non-interactive-inline.sh`, `lint-pipeline-setup-inline.sh`, `lint-platform-strings.sh`, `lint-stack-libraries.sh`), all detect-don't-rewrite, all sentinel-scoped. The repo's stated rationale (small, rarely-changing blocks; a body-rewriter risks more than the re-paste tax saves) holds — *provided each shared block is genuinely small*. P1/P3 qualify; a 200-line block would not.

---

## 5. Recommended target substrate layout

### New shared files (create in pmos-toolkit `_shared/`, sync per manifest)

| New file | Replaces | Consumers point how | Lint needed? |
|---|---|---|---|
| `html-authoring/emit-block.md` — canonical FR-10 emit block with `{artifact_name}`, `{asset_prefix}`, `{pmos_skill_slug}` placeholders, between `<!-- html-emit-block:start/end -->` sentinels | P1 (~220 lines → ~17 × 4-line stanzas: pointer + 3 parameters) | Each skill inlines the block with its 3 parameters filled, or (preferred) carries a 3-line parameter table + pointer — the emit contract is already test-backed by `fanout.test.sh`, so a pointer suffices | **Yes** — clone `lint-pipeline-setup-inline.sh` → `lint-html-emit-inline.sh` if inlined; none if pointer-style (fanout test is the guard) |
| `findings-dispositions.md` — the canonical protocol (grouping, ≤4/batch, Fix/Modify/Skip/Defer semantics, platform fallback, anti-pattern), plus a "skill deltas" convention (severity tags, Defer target) | P2 (~210 lines → ~12 × 3–5-line delta stanzas) | Pointer + per-skill delta list (spec keeps its severity tags + no-OQ rule as a delta). This **makes survey-design's phantom citation true** — point it (and the others) at the new file. Fold polish's `reference/findings-protocol.md` into it. | No (pointer-style; `structured-ask-edge-cases.md` already proves pointers work here) |
| `folded-phase.md` — skeleton: skip-flag, pre-apply guard, per-finding commits + `Depends-on:`, `folded_phase_failures[]` capture, D11 advisory; parameterized on `{artifact, flag, folded_skill, commit_prefix}` | P3 (~230 lines → 4 × ~10-line parameter stanzas) | Pointer + parameter stanza per skill. **Fix the `.md`→`.html` target rot in the same change** (one place instead of four). | No — but add the four `{artifact}` values to `check-comments-coverage.sh` or a tiny grep-lint so the HTML-primary target can't silently regress |
| `reviewer-input-contract.md` — the 3 FR-50/51/52 paragraphs | P4 (~50 lines → 5 × 2-line pointers; verify keeps its FR-50.1 carve-out locally) | Pointer | No |
| `tier-definitions.md` — the single Tier 1/2/3 boundary table (signals only) | P5 boundary semantics (~30 of the 55 lines; per-artifact sections/length tables stay local) | requirements/spec/prototype/wireframes cite it; per-skill tables remain | No |
| **learnkit:** add `learnings-capture.md` (or include it in the sync manifest) | P6 — converts 7 inline stanzas to pointers; also align changelog + comments (toolkit) to the pointer style the other 19 toolkit skills already use | Pointer | No |
| **wireframes:** delete the §4a restatement of the rigor ladder (point at §Rigor & Corner-Cut Protocol); **prototype:** add a 3-line pointer to the same ladder | P7 | In-file fix; optionally promote the ladder to `_shared/rigor-ladder.md` if a third skill adopts it (rule of three) | No |

### Deletions / moves

1. Delete learnkit's 6 dead-cargo items (~1,360 lines): `execute-resume.md`, `phase-boundary-handler.md`, `msf-heuristics.md`, `sim-spec-heuristics.md`, `structured-ask-edge-cases.md`, `stacks/`.
2. Move toolkit `execute-resume.md` → `execute/reference/`, `stacks/` → `plan/reference/stacks/` (single consumers; or document why they stay shared).
3. Refresh `interactive-prompts.md` §Consumers (or drop the section — it rots by construction).

### Maintenance contract (matches repo posture)

- **Pointer-first.** Default to a 1–3-line pointer + per-skill delta stanza (the `learnings-capture.md` / `structured-ask-edge-cases.md` model). No lint needed; the shared file is the single source.
- **Inline only when a subagent or platform must see the text without file access** (the non-interactive block's actual justification). Every inline block gets sentinels + a detect-only lint in `plugins/pmos-toolkit/tools/` (clone of `lint-pipeline-setup-inline.sh`). Never auto-propagate — consistent with the W14 posture.
- **Rewrite `sync-shared.sh` around an explicit manifest** (`_shared/SYNC-MANIFEST` listing cross-plugin files); sync copies only listed files, never `--delete`s unlisted paths, and skips plugins not in the manifest header (excludes pmos-utilities). Add a CI job that diffs the manifest set across plugins and fails on drift — this replaces the missing FR-30 pre-commit hook with something that can't be left uninstalled.

### Expected payoff

~870 lines of accidental duplication collapse to ~150 lines of pointers/parameters; ~1,360 lines of dead learnkit cargo deleted; the next emit-contract change touches 1 file + 1 test instead of 17 SKILL.md files; and the sync path stops being able to delete a live substrate.
