---
name: survey-analyse
description: Analyse fielded survey responses (CSV / TSV / XLSX / XLS / PDF) and produce a methodologically defensible HTML report — executive summary, per-question deep dives, open-end thematic coding, cross-tab synthesis. Bundled per-question-type Python helpers compute the numbers; the LLM authors a per-run analysis.py that imports them, runs it via Bash, and narrates on top. Open-end coding dispatches a fresh subagent per text column (Braun & Clarke 6-phase). Cross-tabs apply Holm correction by default with plain-language framing. Triggers — "analyse this survey", "analyze survey responses", "what does this survey say", "write me a survey report", "make sense of these responses", "summarise the survey", "/survey-analyse". Use whenever the user hands you a response export and wants insight beyond eyeballing the CSV. Sister to /survey-design.
user-invocable: true
argument-hint: "--responses <path> [--context <path|url>] [--survey-json <path>] [--sheet <name|N>] [--weight-col <col>] [--raw-p-only] [--skip-cleaning] [--format html|md|both] [--non-interactive | --interactive]"
---

# survey-analyse

Turn a raw response export into a defensible HTML report. The skill ingests survey data, confirms a column-by-column schema with the user, cleans data-quality outliers, runs per-question analysis through bundled deterministic helper modules, themes open-ends via per-question subagents, runs Holm-corrected cross-tabs against user-confirmed segments, and renders a single HTML report — saved to a dated run folder. **Numbers are deterministic; narrative is LLM-generated.** Sister to `/survey-design`.

**Announce at start:** "Using the survey-analyse skill to turn the responses into a defensible report."

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No interactive prompt tool (`AskUserQuestion`):** degrade every gate to a numbered free-form prompt per `_shared/interactive-prompts.md`; the non-interactive auto-pick contract still applies (the `(Recommended)` option is auto-picked; defer-only tags defer).
- **No subagents:** run the Phase-5 per-question thematic-coding pass *sequentially inline* — same prompt template, same return contract; no fresh-context isolation.
- **No Bash:** Phase 4 can't auto-run `analysis.py`; emit the file path + a "Run this and paste the JSON output back" instruction; user runs and pastes; skill narrates from the pasted JSON.
- **`TaskCreate` / `TodoWrite` missing:** announce phase transitions verbally; the run folder's `index.html` is the canonical progress artifact.
- **Python missing:** the skill stops at Phase 4 prelude with a clear `python3 -m pip install openpyxl` instruction (or `apt/brew install python3` if no Python at all) + the partial run-folder state preserved. Re-run after install.
- **Missing substrate assets:** the asset payload under `_shared/html-authoring/assets/` is the hard-required substrate for Phase 7 — if any of `style.css`, `viewer.js` is missing, abort with `survey-analyse: missing substrate asset <abs-path> — reinstall the pmos-toolkit plugin`. (The MD-sidecar emit path was retired in FR-12.1; `output_format=both` is treated as `html`.)

This skill is a **standalone utility** — not a pipeline stage. It does NOT load workstream context, does NOT run `_shared/pipeline-setup.md` first-run setup, and writes into `{docs_path}/survey-analyses/{YYYY-MM-DD}_<slug>/` rather than into a `/feature-sdlc` feature folder.

## Reference files (loaded on demand)

The skill reads these only when the relevant phase needs them (progressive disclosure):

- `reference/question-type-analysis.md` — the per-question-type playbook applied in Phase 4 (single-select, multi-select, Likert/rating, NPS, ranking, matrix, numeric). Cites the helper functions; one worked example per type.
- `reference/text-analysis.md` — the Braun & Clarke 6-phase contract + the verbatim Phase 5 subagent prompt template + theme-reporting JSON shape + the PII detect-and-warn protocol.
- `reference/cross-survey-stats.md` — cross-tab construction, Holm correction (plain-language framing for the report body + the technical name in the methodology section), MoE table for probability samples, weighting caveats.
- `reference/data-quality-and-reporting.md` — the pre-analysis cleaning checklist (straightliners, speeders, dupes, attention checks, "Don't know" handling) + the report skeleton + ethical / honest reporting standards.

## Track Progress

This skill runs 8 sequential phases. Create one task per phase using `TaskCreate`; mark each in-progress on start and completed on finish — don't batch. The run folder's `index.html` mirrors the task state for the user.

## Phase 0 — Setup

1. **Read `.pmos/settings.yaml`.** Take `docs_path` from it. If the file or the key is absent, default `docs_path = docs/pmos/` and warn once: `survey-analyse: no .pmos/settings.yaml; using docs_path=docs/pmos/`. Do NOT run `_shared/pipeline-setup.md` Section A — this skill is not a pipeline stage and must work in any repo.
2. **Parse flags** from the argument string: `--responses <path>` (required), `--context <path|url>`, `--survey-json <path>`, `--sheet <name|N>`, `--weight-col <col>`, `--raw-p-only`, `--skip-cleaning`, `--format html|md|both`, `--non-interactive | --interactive`. Missing `--responses` → stderr usage line; exit 64.
3. **Resolve `output_format`.** Read `output_format` from `.pmos/settings.yaml :: output_format` (default `html`); `--format` overrides (last flag wins). Print to stderr once: `output_format: <value> (source: <cli|settings|default>)`.
4. **Resolve the run folder.** Derive `<slug>` (lowercase-hyphenated ASCII) from the survey title / context doc / responses-filename stem. Run folder is `{docs_path}/survey-analyses/{YYYY-MM-DD}_<slug>/`. If it already exists, append `-2`, `-3`, … until unique — **never overwrite** an existing analysis folder.
5. **Phase tracking.** Create one task per phase via `TaskCreate` if available; otherwise announce verbally.
6. **Learnings.** Read `~/.pmos/learnings.md` if present; note any entries under `## /survey-analyse` and factor them in (skill body wins on conflict; surface conflicts to user before applying).

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

## Phase 1 — Ingest responses

1. **Read the input file** via `scripts/helpers/ingest.py::read_responses(path, sheet=...)`:
   - `.csv` / `.tsv` → stdlib `csv` module (auto-detect delimiter on TSV);
   - `.xlsx` / `.xls` → `openpyxl`. Multi-sheet: prompt `AskUserQuestion` with the sheet names unless `--sheet` was set.
   - `.pdf` → best-effort text extraction then heuristic table parsing. If extraction returns ≥1 plausible table with row count consistent with the survey: proceed with a chat-side warning ("PDF ingestion is best-effort; verify the normalised responses.csv before committing"). If not: fall back to a Read-tool LLM-tabulation pass. If still ambiguous: stop and ask the user to export CSV/XLSX from their survey platform.
2. **Normalise** to `<run_folder>/responses.csv` (header row preserved as `header_order`). Strip BOMs, trim cells, leave values as strings (the schema phase decides types).
3. **Empty / unparseable input** → stop, surface the parser's error verbatim, and ask the user to re-export.

## Phase 2 — Schema + context intake (always user-confirmed)

1. **If `--survey-json` was passed:** read it; treat `sections[].questions[]` as the proposed schema (column = question; type = the question's `type` field). Match columns by question wording (fuzzy) or question id.
2. **Else:** call `schema.infer(rows, header_order)` for a column-by-column heuristic type inference (cardinality, value patterns, numeric vs categorical, 0–10 + "recommend" wording → NPS).
3. **Surface the schema for confirmation.** Group columns into batches of ≤4 and issue one `AskUserQuestion` per batch — each option per column lets the user keep the proposed type, change it from a dropdown of valid types, or mark the column "skip" (ignore in Phase 4). On the same prompt sequence ask, once, in a separate batch: survey purpose; key decision(s) the analysis should inform; segment columns of interest (multi-select from columns whose type is `single_select` with low cardinality); any context the user wants to flag.
4. **Write `<run_folder>/schema.json`** — `{ "columns": { <col>: { "type": ..., "scale_size": ..., "delimiter": ..., "skip": false } }, "segments": [...], "purpose": "...", "decisions": [...] }`.
5. **Why column-by-column:** the LLM-narrates-deterministic-numbers contract is only safe if the schema is right. Silent miscategorisation (Likert vs numeric; multi-select vs free-text) cascades into wrong analysis the user might trust because the report looks clean.

## Phase 3 — Clean

1. **Read `reference/data-quality-and-reporting.md`** Part A (cleaning checklist) once.
2. **Apply rules:** straightlining (per matrix block; zero / near-zero per-respondent variance); speeders (only if a duration column is present in the schema; default threshold `< 0.5 × median`); incompletes (configurable threshold; default: must have answered through the last "must-have" question — fall back to ≥80% of non-skip columns); exact-duplicates (key cols: email if present, else IP, else row-fingerprint); attention-check fails (only if the schema flags such a question; require ≥2 failed checks); numeric outliers (1.5×IQR review; flag, don't auto-exclude).
3. **`--skip-cleaning`** short-circuits this phase with a warning in the methodology section ("data was not cleaned").
4. **Write** `<run_folder>/cleaned_responses.csv` + `<run_folder>/cleaning.json` (each rule: `{rule, threshold, flagged, removed, kept_after}`).

## Phase 4 — Per-question analysis (LLM-authored analysis.py + Bash run)

1. **Read `reference/question-type-analysis.md`** once.
2. **Author `<run_folder>/analysis.py`** — a small Python script (template in the reference) that:
   - imports the bundled helpers from `${CLAUDE_PLUGIN_ROOT}/skills/survey-analyse/scripts/helpers/` (use a portable `sys.path.insert(0, …)` line; the skill resolves the absolute path at write time);
   - reads `cleaned_responses.csv` + `schema.json`;
   - dispatches each column to the right helper based on its confirmed type;
   - writes `per_question.json` keyed by column name with the helper's full return dict per column.
3. **Run it once via Bash** (`python3 analysis.py`) — a single consolidated permission ask covers the run. If the user denies: stop with the script saved; user can run it themselves and paste output back (Platform-Adaptation fallback).
4. **Helper output flows verbatim into the report.** The LLM narrates on top — it does NOT recompute frequencies, T2B, NPS, etc. from the CSV.

## Phase 5 — Open-end thematic coding (subagent per question)

For each column with `type: open_text` and `n ≥ 5` non-null responses:

1. **Dispatch a fresh subagent** with the verbatim prompt template from `reference/text-analysis.md` — includes the question wording, the verbatims (chunked at ≤200 per call; multi-call concatenation if needed), and the Braun & Clarke 6-phase contract.
2. **Subagent returns** `{themes: [{name, definition, response_ids, representative_quote_ids, sentiment_lean}], uncoded_response_ids}`. The skill validates: every `response_id` appears in the input; every `representative_quote_id` is a subset of `response_ids` for that theme.
3. **PII detection.** For every selected representative quote, run `pii.detect_pii(text)`. Count matches; surface a chat-side warning before Phase 7 if any match: `survey-analyse: <N> verbatim quotes contain potential PII (emails/phones/names) — review the report before sharing externally. (No auto-redaction.)`.
4. **Write `<run_folder>/themes.json`** — one entry per open-text column.

## Phase 6 — Whole-survey synthesis (cross-tabs + Holm)

1. **Read `reference/cross-survey-stats.md`** once.
2. **For each segment in `schema.json.segments`:** build a cross-tab against every closed-question column (single_select, likert, nps). Helper: `stats.cross_tab(rows, row_col, segment_col)`. Cells: count + column-%; small-N flag if cell `n < 30`.
3. **Family-wise Holm correction.** Collect all raw p-values from the segment's cross-tab batch (chi-square overall per question; column-z-tests pairwise). Apply `stats.holm_correct(raw_pvals)` once per segment. Significance markers (*, **, ***) use the **adjusted** p. The raw p is kept too, for the appendix. `--raw-p-only` skips Holm (use raw for the markers; record the flag in methodology).
4. **Synthesise key takeaways.** From `per_question.json` + `themes.json` + cross-tabs, identify the top 3–5 findings: each = one-sentence insight + the load-bearing number + the open-end theme that explains it (when available). Honour the "so what" test — every finding ties to one of the survey's stated decisions from Phase 2.
5. **Write `<run_folder>/synthesis.json`** — `{ findings: [...], cross_tabs: { <segment>: { <question>: { cells, p_raw, p_holm, small_n_flags } } } }`.

## Phase 7 — Report rendering

Render `<run_folder>/report.html` via the `_shared/html-authoring/` substrate at `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/`:

1. **Sections, in order, each a `<section id="…">` with kebab-case `<h2>`/`<h3>` ids:**
   - `executive-summary` — headline finding + business impact + 3–5 supporting findings (descending importance) + brief context + recommended actions.
   - `methodology` — sample, mode, dates if known, response & completion counts, cleaning rules + counts, Holm-correction note in plain language, weighting status (and `--weight-col` if used), small-N caveats, probability-vs-non-probability framing, **PII warning summary**.
   - `key-findings` — same as exec summary but expanded; each finding cites its supporting question(s).
   - `per-question` — one `<h3>` per closed question with the helper's stats rendered as the right chart (inline SVG): bar (categorical); horizontal bar with "% of respondents (multiple answers allowed)" label (multi-select); diverging stacked bar (Likert / matrix rows); headline NPS number + distribution stack; ranked bar (ranking); histogram (numeric).
   - `open-end-themes` — one `<h3>` per open-text column with theme cards (name, definition, count + %, 1–3 verbatim quotes, sentiment lean).
   - `cross-tab-appendix` — full cross-tabs with raw + Holm-adjusted p; base sizes; small-N flags.
   - `data-quality-log` — the cleaning rules + counts table.
2. **Atomic write** (`.html.tmp` → rename); the `<head>` MUST include `<meta name="pmos:skill" content="survey-analyse">` — required for `/comments resolve` routing (FR-01, FR-40); kebab-case heading ids on every `<h2>` / `<h3>` (per `_shared/html-authoring/conventions.md` §3); `?v=<plugin-version>` cache-bust on every asset URL; copy `style.css`, `viewer.js`, `comments.js`, `comments.css`, plus the launcher trio (`comments-open.command`, `comments-open.sh`, `comments-open.bat`) from `_shared/html-authoring/assets/` to `<run_folder>/assets/` (`cp -n`).
3. **Companion `report.sections.json`** — built from the same in-memory section tree (do NOT post-parse the HTML).
4. **Regenerate `<run_folder>/index.html`** via `_shared/html-authoring/index-generator.md` (manifest inlined as `<script type="application/json" id="pmos-index">`; no on-disk `_index.json`).
5. **`output_format: both`** → retired (FR-12.1); treated as `html` until a future feature re-introduces MD export.

## Phase 8 — Workstream / Learnings / Handoff

- **No workstream enrichment** (the skill does not load workstream context — by design).
- **Emit the learnings reflection line.** Either:
  - `Learning: <new entry written to ~/.pmos/learnings.md under ## /survey-analyse>` — when this session surfaced a non-obvious lesson (e.g., user's data shape, a recurring schema-inference miss, a question-type the helpers handled poorly).
  - `No new learnings this session because <specific reason>`.
- **Handoff line.** Print the path to `report.html` + the run-folder root; suggest opening the report in a browser.

## Apply comment-resolver edit

This phase is the `/survey-analyse` entrypoint that `/comments resolve` dispatches into when walking open threads in a report artifact's `.comments.json` sidecar. The contract — input/output JSON shapes, closed `error_enum` set, idempotency rules, subagent invocation convention — lives in the shared contract doc and is the single source of truth:

- **Contract (normative):** `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md`

Per [NFR-08](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#nfr-h), this phase MUST cite that file rather than restate the contract. Anything below is `/survey-analyse`-specific implementation guidance only.

### When invoked

The resolver dispatches a subagent with the §9.1 input JSON. The subagent's tools include this skill's Node shim:

- **Shim:** `plugins/pmos-toolkit/skills/survey-analyse/scripts/apply-edit-at-anchor.js` — exports `apply(input)`, returns one of the three output shapes (success / failure / clarification) per §9.1.

### Resolution order

Per the contract:

1. **id-first.** If `anchor.id_anchor` is set, locate `id="<id>"` in the artifact HTML. Match → success path, `strategy: "id-first"`, `score: 1.0`.
2. **quote-fallback.** Otherwise (or on id miss), substring-contains match `anchor.quote_anchor.text` (≥40 chars) against the candidate's text content. First exact substring hit wins.
3. **Neither hits** → emit `{ success: false, error_enum: "anchor_orphaned" }`; do NOT mutate the artifact.

### Skill-specific feasibility

Edits to chart data (any `<script type="application/json">` block or chart-config block) return `agent_judged_infeasible` with `system_reply`: `"Chart data is generated from the response set — re-run /survey-analyse with updated responses."` Detection: anchor `id_anchor` matching `chart-*`, `pmos-chart-*`, `data-block-*`, or `chart-config-*`; or `quote_anchor.text` containing chart JSON keys (`"labels"`, `"datasets"`, `"data"`, `"type"`); or post-read detection that the anchor position falls inside a `<script type="application/json">` block.

Analysis prose (executive-summary, key-findings, methodology, open-end-themes, etc.) IS editable.

### Closed error_enum

`anchor_orphaned`, `edit_conflicted`, `agent_judged_infeasible`, `agent_errored`.

### Tests

- Per-skill contract: `plugins/pmos-toolkit/skills/survey-analyse/tests/apply-edit-at-anchor.test.js` (5 cases: id-first prose happy, orphan, idempotent, infeasible chart data edit, clarification).
- Wrapper: `tests/scripts/assert_apply_edit_at_anchor_survey-analyse.sh`.

---

## Anti-Patterns (DO NOT)

1. **Do NOT have the LLM compute summary statistics by inspecting the CSV.** Numbers come from the helper modules via `analysis.py`. The LLM narrates on top. (FR-R03; the whole reproducibility contract rides on this.)
2. **Do NOT report a Likert mean without also showing the distribution and T2B.** Likert is ordinal — a bare mean implies interval-scale equivalence the data doesn't support. The helper `likert.likert_stats` returns both; surface both in the report.
3. **Do NOT report a multi-select option's percentage on the response base instead of the respondent base.** Multi-select percentages sum to >100% by design; the denominator is the count of respondents who saw the question. The helper enforces this; the chart label must say "% of respondents (multiple answers allowed)".
4. **Do NOT report NPS as an average of the 0–10 scores.** NPS = %Promoters (9–10) − %Detractors (0–6), reported as an integer in [-100, +100]. The helper `nps.nps` returns the integer.
5. **Do NOT headline a subgroup difference without showing the base size.** Cross-tabs auto-flag `n < 30` cells; the report must surface those flags inline with the cell, not bury them in a footnote.
6. **Do NOT proceed to Phase 4 without the user-confirmed schema.** Silent auto-proceed on heuristic-inferred types caused the kind of silent-miscategorisation cascade this skill is built to prevent.
7. **Do NOT auto-redact PII in verbatim quotes.** Detect-and-warn only. False-positive redactions ("Apple" → `[name]`) hurt signal more than they help; user takes responsibility for scrubbing before external sharing. (FR-R05; user-confirmed design choice.)
8. **Do NOT skip Holm correction silently.** When you run cross-tabs across many questions × segments, ~5% of "significant" results are chance. Apply Holm by default, frame in plain language; let analysts opt out via `--raw-p-only` with the implication acknowledged in the methodology section.
9. **Do NOT overwrite an existing run folder.** Append `-2`, `-3`, ... ; the run folder is the audit trail.

## Phase 9: Capture Learnings

This skill is not complete until the learnings reflection has emitted a line. Read `~/.pmos/learnings.md` if you haven't already (Phase 0 step 6). Reflect on whether this session surfaced anything worth capturing under `## /survey-analyse`.

You MUST emit exactly one of these two lines:

- `Learning: <new entry written to ~/.pmos/learnings.md under ## /survey-analyse>` — when the session surfaced a non-obvious lesson worth keeping (repeated correction; a schema-inference miss; a question-type the helpers handled poorly; a PII pattern the regex didn't catch).
- `No new learnings this session because <specific reason tied to this session>` — when the session was smooth (e.g., "the response file was clean, the schema was confirmed without edits, and the produced report passed the five zero-tolerance checks").

Empty reflection (no line emitted) counts as unfinished work.
