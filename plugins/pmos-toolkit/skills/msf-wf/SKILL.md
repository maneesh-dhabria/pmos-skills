---
name: msf-wf
description: Evaluate generated wireframes from the end-user perspective with grounded MSF analysis plus PSYCH scoring per screen. Recommendations-only by default; pass --apply-edits (typically when invoked from /wireframes' folded MSF phase) to apply user-approved HTML edits inline. Use when the user says "evaluate the wireframes", "check friction in the UI", "PSYCH score these screens", or "wireframe UX evaluation".
user-invocable: true
argument-hint: "<path-to-wireframes-folder> [--apply-edits] [--feature <slug>] [--non-interactive | --interactive]"
---

# /msf-wf — MSF + PSYCH on a Wireframes Folder

Evaluate a generated wireframes folder by walking each screen with persona-conditional MSF analysis and per-screen PSYCH scoring. Output is a single `msf-wf-findings.html` with embedded PSYCH section. Standalone runs are recommendations-only; pass `--apply-edits` (typically when invoked from `/wireframes`' folded MSF phase) to apply user-approved HTML edits inline.

For requirements-doc-only analysis without wireframes, use `/msf-req` instead.

```
/wireframes  →  folded MSF phase (delegated)  →  /msf-wf <folder> --apply-edits
                                                  (this skill, parent-invoked)

/wireframes  →  ...   user runs ad-hoc:  /msf-wf <folder>
                                         (this skill, recommendations-only)
```

**Announce at start:** "Using the /msf-wf skill to evaluate user motivation, friction, satisfaction, and PSYCH scoring on the wireframes."

## Flags & natural language

Every option also has a natural-language form — infer it from the request; an explicit flag overrides. `--apply-edits` is the exception: it is a write-permission grant and is never inferred from natural language — recommendations-only is the default contract. `--feature <slug>` resolves the feature folder when the path argument alone is ambiguous. One flag stays parsed for back-compat but is deliberately not advertised:

<!-- nl-sugar -->
- `--format <html|md|both>` — output-format override; `md`/`both` are retired values, treated as `html` (see Phase 0 step 6).

The retired pre-split `/msf` flags (`--default-scope`, `--wireframes`, `--skip-psych`) are rejected with a pointer to this argument-hint.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** state proposed personas/dispositions and proceed; user reviews after completion. With `--apply-edits`, defer all HTML edits until user confirms in a follow-up turn.
- **No subagents:** sequential single-agent analysis (this skill never parallelizes journeys; see Anti-Patterns).

---

## Phase 0: Pipeline Setup (inline — do not skip) {#pipeline-setup}

Use workstream context to inform analysis — product constraints and tech-stack conventions shape what counts as friction in the UI.

<!-- pipeline-setup-block:start -->
1. **Read `.pmos/settings.yaml`.**
   - If missing → you MUST invoke the `Read` tool on `_shared/pipeline-setup.md` Section A and run first-run setup before proceeding.
2. Set `{docs_path}` from `settings.docs_path`.
3. If `settings.workstream` is non-null → load `~/.pmos/workstreams/{workstream}.md` as context preamble; if frontmatter `type` is `charter` or `feature` and a `product` field exists, also load `~/.pmos/workstreams/{product}.md` read-only.
4. Resolve `{feature_folder}`:
   - If the wireframes folder argument resolves to `{docs_path}/features/<slug>/wireframes/` → set `{feature_folder}` to the parent.
   - If `--feature <slug>` was passed → glob `{docs_path}/features/*_<slug>/`.
   - Else → ad-hoc invocation; `{feature_folder}` is unset.
5. Read `~/.pmos/learnings.md` if present; note entries under `## /msf-wf` and factor them into approach.
<!-- pipeline-setup-block:end -->

6. **Resolve `output_format`.** Read `output_format` from `.pmos/settings.yaml` (default: `html`; valid values: `html`, `md` — legacy `both` is treated as `html` per `_shared/html-authoring/README.md`). A `--format` argument-string flag overrides settings (last flag wins on conflict). Print to stderr exactly: `output_format: <value> (source: <cli|settings|default>)` once at Phase 0 entry. NOTE: this governs the findings artifact only — wireframe HTML files emitted/edited by `--apply-edits` are never converted.

---

<!-- non-interactive-block:start -->
1. **Mode resolution.** Compute `(mode, source)` with precedence: `cli_flag > parent_marker > settings.default_mode > builtin-default ("interactive")` (FR-01).
   - `cli_flag` is `--non-interactive` or `--interactive` parsed from this skill's argument string. Last flag wins on conflict (FR-01.1).
   - `parent_marker` is set if the original prompt's first line matches `^\[mode: (interactive|non-interactive)\]$` (FR-06.1).
   - `settings.default_mode` is `.pmos/settings.yaml :: default_mode` if present and one of `interactive`/`non-interactive`. Unknown values → warn on stderr `settings: invalid default_mode value '<v>'; ignoring` and fall through (FR-01.3).
   - If `.pmos/settings.yaml` is malformed (not parseable as YAML, or missing `version`): print to stderr `settings.yaml malformed; fix and re-run` and exit 64 (FR-01.5).
   - On Phase 0 entry, always print to stderr exactly: `mode: <mode> (source: <source>)` (FR-01.2).

2. **Per-checkpoint classifier.** Before issuing any `AskUserQuestion` call, classify it (FR-02):
   - The defer-only tag, if present, is the literal previous non-empty line: `<!-- defer-only: <reason> -->` where `<reason>` ∈ {`destructive`, `free-form`, `ambiguous`} (FR-02.5).
   - Decision (in order): tag adjacent → DEFER; multiSelect with 0 Recommended → DEFER; 0 options OR no option label ends in `(Recommended)` → DEFER; else AUTO-PICK the (Recommended) option (FR-02.2).

3. **Buffer + flush.** Maintain an append-only OQ buffer in conversation memory. On each AUTO-PICK or DEFER classification, append one entry per the schema in spec §11.2. At end-of-skill (or in a caught error before exit), flush (FR-03):
   - Primary artifact is single Markdown → append `## Open Questions (Non-Interactive Run)` section with one fenced YAML block per entry; update prose frontmatter (`**Mode:**`, `**Run Outcome:**`, `**Open Questions:** N` where N counts deferred only — see FR-03.4) (FR-03.1).
   - Skill produces multiple artifacts → write a single `_open_questions.md` aggregator at the artifact directory root; primary artifact's frontmatter `**Open Questions:** N — see _open_questions.md` (FR-03.5).
   - Primary artifact is non-MD (SVG, etc.) → write sidecar `<artifact>.open-questions.md` (FR-03.2).
   - No persistent artifact (chat-only) → emit buffer to stderr at end-of-run as a single block prefixed `--- OPEN QUESTIONS ---` (FR-03.3).
   - Mid-skill error → flush partial buffer under heading `## Open Questions (Non-Interactive Run — partial; skill errored)`; set `**Run Outcome:** error`; exit 1 (E13).

4. **Subagent dispatch.** When dispatching a child skill via Task tool or inline invocation, prepend the literal first line: `[mode: <current-mode>]\n` to the child's prompt (FR-06).

5. **Call-site auditing (CI only).** This runtime classifier reads the call it is about to make — it does not run awk. Static/offline auditing of `AskUserQuestion` call sites across SKILL.md files is performed by `tools/audit-recommended.sh`, which sources the shared call-site extractor from Section D of this file (`_shared/non-interactive.md`). Runtime and audit therefore share one decision contract without inlining the extractor into every skill (FR-02.6).

6. **Refusal check.** If this SKILL.md contains a `<!-- non-interactive: refused; ... -->` marker (regex: `<!--[[:space:]]*non-interactive:[[:space:]]*refused`), and `mode` resolved to `non-interactive`: emit refusal per Section A and exit 64 (FR-07).

7. **Pre-rollout BC.** If the `--non-interactive` argument is present BUT this SKILL.md does NOT contain the `<!-- non-interactive-block:start -->` marker (i.e., this skill hasn't been rolled out yet): emit `WARNING: --non-interactive not yet supported by /<skill>; falling back to interactive.` to stderr; continue in interactive mode (FR-08).

8. **End-of-skill summary.** Print to stderr at exit: `pmos-toolkit: /<skill> finished — outcome=<clean|deferred|error>, open_questions=<N>` (NFR-07).
<!-- non-interactive-block:end -->

## Phase 1: Wrong-input Guard {#wrong-input-guard}

Before any other phase:

- If the argument resolves to a single `.md` file → exit with: "Argument looks like a requirements doc. Use `/msf-req` instead." Do NOT continue.
- If the argument resolves to a directory → continue.
- If the argument is missing → continue to Phase 2 (resolve-input handles missing arg).

This guard runs before persona alignment, learnings load, or any analysis.

### Input Contract (when invoked as reviewer subagent)

When a parent orchestrator (currently `/wireframes`' folded MSF phase) invokes this skill as a reviewer subagent, follow the reviewer side of `_shared/reviewer-protocol.md` — chrome-stripped slice as prompt body, `sections_found` enumeration first, `{section_id, severity, message, quote}` findings with ≥40-char verbatim quotes, and no self-validation (the validation contract lives in the parent). Deltas for this skill: the parent strips and passes each wireframe HTML **individually** — run the contract once per wireframe; in this mode skip the Phase 2 resolver and operate directly on the stripped slices.

---

## Phase 2: Locate Wireframes {#locate-wireframes}

Resolve the wireframes folder argument. Required structure:

1. Confirm the folder exists.
2. Read **every** `.html` file in the folder, recursively (including subfolders like `wireframes/components/`). Each file represents a screen or component the user encounters.
3. Read sibling requirements doc if present, via `_shared/resolve-input.md` with `phase=requirements`, `label="sibling requirements doc"` — locates either `{feature_folder}/01_requirements.html` (preferred) or `{feature_folder}/01_requirements.md` (legacy fallback). This provides persona context to ground the analysis.
4. If the folder is missing or contains zero `.html` files → exit with an error. Do NOT silently degrade to req-doc-only analysis.
5. If the resolver returns no requirements doc → continue, but flag in the findings doc that persona alignment was inferred from wireframes only.

---

## Phase 3: Persona & Journey Alignment {#persona-journey-alignment}

<!-- defer-only: ambiguous -->
Follow `../_shared/persona-journey-alignment.md` Steps 1–2 (extract-before-invent, 2–5 personas with ≤2 scenarios each, journey proposal, `AskUserQuestion` confirmation), with `source` = the wireframe screen-flow (entry points, navigation, completion screens) + the sibling requirements doc (if located in Phase 2) + wireframe copy. Confirmation is **mandatory in both standalone and parent-invoked modes** — never skipped, even when `--apply-edits` was passed.

---

## Phase 4: MSF Pass A (grounded) {#msf-pass}

For each persona × scenario × journey, walk the M / F / S consideration questions in `../_shared/msf-heuristics.md`.

**Walk journeys sequentially**, not in parallel. The findings doc is a single shared file; concurrent subagent edits cause merge corruption. The original /msf parallelization was a recurring source of bugs — keep this serial. (See Anti-Patterns.)

The analysis is **grounded**, not abstract:

- Cite specific screens / steps when answering each consideration. Example: "On step 3 (`05_payment_desktop-web.html`), the user is asked for credit card before any value is delivered — kills motivation for the new-user persona."
- Reference actual UI elements, copy, and flow ordering rather than abstract claims.
- Ground every M / F / S finding in either a wireframe element or a req-doc claim, not author imagination.

If a question isn't applicable for a given persona/scenario, say so briefly.

---

## Phase 5: PSYCH Pass B {#psych-pass}

Run the PSYCH walkthrough per `../_shared/psych-scoring.md` on each screen — attention-path walk, driver palette, ±1..10 element scores, element collapsing, judgment-assigned severity bands (OK / Watch / Bounce risk / Cliff), and the dual-table output format (element audit table + screen rollup + sparkline) all live there.

Deltas for this skill:

- Entry context defaults to Medium (40); record the override line from the substrate as the first header line of the findings doc.
- The PSYCH section is Section B of `msf-wf-findings.html` (see Phase 6 file structure).

---

## Phase 6: Save Findings {#save-findings}

**Emit per the `_shared/html-authoring/README.md` checklist** (template slot-fill, atomic write with the `.sections.json` companion, idempotent asset copy — which carries the inline-comments substrate, `comments.js` et al. — cache-busted asset URLs, heading ids per `conventions.md` §3, index regeneration per `index-generator.md` when writing into a feature folder). Deltas for this skill:

- **Save path:** pipeline runs (`{feature_folder}` resolved in Phase 0) → `{feature_folder}/msf-wf-findings.html` — slug-distinct from /msf-req's `msf-req-findings.html`; running both on one feature must not overwrite. Ad-hoc runs → `~/.pmos/msf/YYYY-MM-DD_<slug>.html` (`<slug>` from the wireframes folder name, lowercase-hyphenated; substrate referenced via the `~/.pmos/msf/assets/` cache, seeded on first ad-hoc run).
- **Overwrite protection:** if a findings doc already exists at the save path (`.html` or legacy `.md`), copy it to `<save_path>.bak` before overwriting. The `.bak` lasts one cycle. Skip if no prior file exists.
- The wireframe HTML files themselves are never converted — only the findings artifact is governed by the emit checklist.

**File structure:**

1. Header line: `Entry context: Medium (40, default). Override by editing this line and re-running.`
2. **Section A — MSF Analysis:** persona × scenario × journey × consideration matrix from Phase 4.
3. **Section B — PSYCH Scoring:** per-screen scoring tables and journey rollups per `../_shared/psych-scoring.md`. Includes the substrate's "Unsurfaced findings" rollup whenever the Phase 8 surfaced cap left findings unsurfaced.
4. **Section C — Recommendations:** prioritized Must / Should / Nice table per `../_shared/msf-heuristics.md`.
5. **Section D — Applied changes** (only if `--apply-edits` ran in Phase 7): one row per applied edit — journey, screen, finding, fix, status.

The findings doc has **no line cap**.

**No actionable findings — terminal state.** When analysis surfaces nothing rated Must / Should / Nice, emit "no actionable findings" in chat and save the findings doc with empty recommendation tables. Do not pad with manufactured items.

---

## Phase 7: Apply Edits (conditional) {#apply-edits}

**This phase runs only when `--apply-edits` was passed.** If absent, skip directly to Phase 8 with a followup message in chat:

> To apply: re-run `/msf-wf <folder> --apply-edits`, or run `/wireframes <feature>` to regenerate.

When `--apply-edits` is present:

<!-- defer-only: ambiguous -->
1. Present each finding rated Must or Should (and Nice when explicitly requested) per `../_shared/findings-dispositions.md` — severity-tagged `AskUserQuestion` per finding, four canonical dispositions, batches of ≤4. Deltas: **Fix as proposed** applies the stated change via `Edit` to the relevant wireframe `.html`; **Skip** is logged in the findings doc with disposition="Skip"; **Defer** targets the findings doc's Open Questions.
2. Apply approved edits inline using `Edit` against the wireframe HTML files in the resolved wireframes folder. Spot-check each edit against `../wireframes/reference/eval-rubric.md` after editing — do NOT trigger `/wireframes`' review-loop phase.
3. Log every applied change in the findings doc Section D ("Applied changes") with: journey, screen, finding, fix, disposition.

When `--apply-edits` is **absent**, the skill MUST NOT call `Edit` or `Write` against any file in the wireframes folder. Findings doc remains the only output.

---

## Phase 8: Executive Summary in Chat {#executive-summary}

Render the executive summary per `../_shared/msf-heuristics.md` "Executive Summary Template". Cap chat output at **200 lines**.

**Summary Overrides (wf-mode):**

- Include screens banded **Watch**, **Bounce risk**, or **Cliff** (per `../_shared/psych-scoring.md`) in the summary's top-issues list.
- Cap surfaced findings at 12; the rest are logged in the findings doc under "Unsurfaced findings". Whenever any finding goes unsurfaced, print to chat exactly: `<N> findings surfaced, <M> unsurfaced — see <findings doc path>`. This line MUST fire in all modes — silent capping is forbidden.
- If `--apply-edits` ran: include a one-line summary of applied vs. deferred dispositions.

---

## Phase 9: Capture Learnings {#capture-learnings}

**This skill is not complete until the learnings-capture process has run.** Read and follow `_shared/learnings-capture.md` (relative to the skills directory) now. Reflect on whether this session surfaced anything worth capturing under `## /msf-wf` in `~/.pmos/learnings.md` — recurring PSYCH driver patterns, persona-conditional findings PSYCH alone missed, wireframe heuristics that fired repeatedly. Proposing zero learnings is a valid outcome.

---

## Anti-Patterns (DO NOT)

- Do NOT skip the persona-alignment confirmation step — analyzing without confirmed personas produces generic findings.
- Do NOT pad PSYCH scores by inventing positive elements to balance negatives — score only what's notable, leave the column empty if a screen is genuinely neutral.
- Do NOT derive PSYCH severity bands from the running total — the band is a judgment call; the numbers are cited as evidence (`../_shared/psych-scoring.md`).
- Do NOT walk journeys in parallel via subagents — the findings doc is a single shared file; concurrent edits cause merge corruption (this is a recurring sharp edge).
- Do NOT call `Edit` or `Write` against any wireframe HTML file when `--apply-edits` is absent. Recommendations-only is the contract.
- Do NOT cap surfaced findings silently — the Phase 8 surfaced/unsurfaced chat line MUST fire whenever the cap leaves findings unsurfaced.
- Do NOT trigger `/wireframes`' review-loop phase after editing wireframes — spot-check inline against `../wireframes/reference/eval-rubric.md`.
- Do NOT silently skip the wrong-input guard — a single `.md` argument means the user wanted `/msf-req`.
- Do NOT pad recommendations to fill the Must / Should / Nice template — emit "no actionable findings" instead.

---

*Spec lineage: `2026-05-08_msf-skill-split` (skill boundary, recommendations-only default, `--apply-edits` grant, serial-journeys rule, PSYCH ownership — scoring now promoted to `_shared/psych-scoring.md`), `2026-05-10_pipeline-consolidation` W2/W4 (folded invocation from /wireframes, `msf-wf-findings` slug-distinct rename), `2026-05-09_html-artifacts` + `2026-05-28_inline-html-artifacts` (FR-10/12/22 emit contract, FR-50/51/52 reviewer contract — now cited via `_shared/reviewer-protocol.md` and `_shared/html-authoring/README.md`; `md`/`both` format retirement per FR-12.1), `2026-05-08_non-interactive-mode` (mode block).*
