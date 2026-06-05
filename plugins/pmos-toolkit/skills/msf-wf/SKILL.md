---
name: msf-wf
description: Evaluate generated wireframes from the end-user perspective with grounded MSF analysis plus PSYCH scoring per screen. Recommendations-only by default; pass --apply-edits (typically when invoked from /wireframes Phase 6) to apply user-approved HTML edits inline. Use when the user says "evaluate the wireframes", "check friction in the UI", "PSYCH score these screens", or "wireframe UX evaluation".
user-invocable: true
argument-hint: "<path-to-wireframes-folder> [--apply-edits] [--format <html|md|both>] [--non-interactive | --interactive]"
---

# /msf-wf — MSF + PSYCH on a Wireframes Folder

Evaluate a generated wireframes folder by walking each screen with persona-conditional MSF analysis and per-screen PSYCH scoring. Output is a single `msf-findings.html` (with `.md` sidecar when `output_format: both`) with embedded PSYCH section. Standalone runs are recommendations-only; pass `--apply-edits` (typically when invoked from `/wireframes` Phase 6) to apply user-approved HTML edits inline.

For requirements-doc-only analysis without wireframes, use `/msf-req` instead.

```
/wireframes  →  Phase 6 (delegated)  →  /msf-wf <folder> --apply-edits
                                         (this skill, parent-invoked)

/wireframes  →  ...   user runs ad-hoc:  /msf-wf <folder>
                                         (this skill, recommendations-only)
```

**Announce at start:** "Using the /msf-wf skill to evaluate user motivation, friction, satisfaction, and PSYCH scoring on the wireframes."

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** state proposed personas/dispositions and proceed; user reviews after completion. With `--apply-edits`, defer all HTML edits until user confirms in a follow-up turn.
- **No subagents:** sequential single-agent analysis (this skill never parallelizes journeys; see Anti-Patterns).

---

## Phase 0: Pipeline Setup (inline — do not skip)

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

### Phase 0a: output_format resolution (FR-12)

6. **Resolve `output_format`.** Read `output_format` from `.pmos/settings.yaml` (default: `html`; valid values: `html`, `md`, `both`). A `--format <html|md|both>` argument-string flag overrides settings (last flag wins on conflict, per FR-12). Print to stderr exactly: `output_format: <value> (source: <cli|settings|default>)` once at Phase 0 entry. The numbering continues from the pipeline-setup-block above (which ends at step 5). NOTE: this controls the format of the `msf-findings` sidecar only — wireframe HTML files emitted/edited by `--apply-edits` are never converted (per runbook edge case row 1: wireframes/prototype unmodified).

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

## Phase 1: Wrong-input Guard

Before any other phase:

- If the argument resolves to a single `.md` file → exit with: "Argument looks like a requirements doc. Use `/msf-req` instead." Do NOT continue.
- If the argument resolves to a directory → continue.
- If the argument is missing → continue to Phase 2 (resolve-input handles missing arg).

This guard runs before persona alignment, learnings load, or any analysis.

### Input Contract (when invoked as reviewer subagent)

When a parent orchestrator (currently `/wireframes`) invokes this skill as a reviewer subagent, the parent has chrome-stripped each wireframe HTML via `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/chrome-strip.js` (FR-50, T12) and passes the stripped slices (`<h1>` + `<main>`) inline as the prompt body. In that mode, this skill skips its own resolver (`_shared/resolve-input.md`) and operates directly on the stripped HTML — once per wireframe.

**Output shape (FR-51 canonical, per wireframe):** the skill MUST first enumerate every `<section>` id and every `<h2>`/`<h3>` id it can locate in the stripped slice, returning them as `sections_found: [...]`. It then evaluates against its own rubric and emits findings as `{section_id, severity, message, quote: "<≥40-char verbatim from source>"}`.

**Parent-side validation (FR-52, the skill MUST NOT self-validate):** the parent will (a) set-equality-check `sections_found` against `<wireframe>.sections.json`, (b) substring-grep every `quote` against the original (un-stripped) source HTML, (c) hard-fail on any miss (per-wireframe; abort iteration on miss). This skill does not duplicate that validation; the contract lives in the parent.

---

## Phase 2: Locate Wireframes

Resolve the wireframes folder argument. Required structure:

1. Confirm the folder exists.
2. Read **every** `.html` file in the folder, recursively (including subfolders like `wireframes/components/`). Each file represents a screen or component the user encounters.
3. Read sibling requirements doc if present, via `_shared/resolve-input.md` with `phase=requirements`, `label="sibling requirements doc"` — locates either `{feature_folder}/01_requirements.html` (preferred) or `{feature_folder}/01_requirements.md` (legacy fallback). This provides persona context to ground the analysis.
4. If the folder is missing or contains zero `.html` files → exit with an error. Do NOT silently degrade to req-doc-only analysis.
5. If the resolver returns no requirements doc → continue, but flag in the findings doc that persona alignment was inferred from wireframes only.

---

## Phase 3: Persona Alignment

Follow `../_shared/msf-heuristics.md` "Persona Alignment" section. Behavior:

- First, extract any personas explicitly named in the sibling `01_requirements.{html,md}` (if present, located via the Phase 2 resolver), or in wireframe copy (header text, "for [user-type]" labels, etc.).
- Propose those for confirmation.
- If neither source names personas, propose 2–5 inferred personas (max 2 scenarios each) from the wireframe flow + workstream context.
<!-- defer-only: ambiguous -->
- Confirm via `AskUserQuestion`. **Mandatory in both standalone and parent-invoked modes** — never skipped, even when `--apply-edits` was passed.

---

## Phase 4: Journey Confirmation

<!-- defer-only: ambiguous -->
Follow `../_shared/persona-journey-alignment.md` Step 2, with `source` = the wireframe screen-flow (entry points, navigation, completion screens) + the requirements doc if available — list and confirm journeys via `AskUserQuestion` before proceeding.

---

## Phase 5: MSF Pass A (grounded)

For each persona × scenario × journey, walk the M / F / S consideration questions in `../_shared/msf-heuristics.md`.

**Walk journeys sequentially**, not in parallel. The findings doc is a single shared file; concurrent subagent edits cause merge corruption. The original /msf parallelization was a recurring source of bugs — keep this serial. (See Anti-Patterns.)

The analysis is **grounded**, not abstract:

- Cite specific screens / steps when answering each consideration. Example: "On step 3 (`05_payment_desktop-web.html`), the user is asked for credit card before any value is delivered — kills motivation for the new-user persona."
- Reference actual UI elements, copy, and flow ordering rather than abstract claims.
- Ground every M / F / S finding in either a wireframe element or a req-doc claim, not author imagination.

If a question isn't applicable for a given persona/scenario, say so briefly.

---

## Phase 6: PSYCH Pass B

Walk through each screen following the user's attention path (left-to-right, top-to-bottom). Score notable UI elements as +Psych or −Psych. Scores are **directional indicators**, not scientific measurements — they point at where motivation rises or falls, not at exact values.

**+Psych (adds motivation):**
- Positive emotions: attractive visuals, social proof, credibility signals
- Motivational boosts: urgency, progress indicators, value previews, completion cues
- Rewards: immediate value delivery, clear outcomes, "aha" moments

**−Psych (drains motivation):**
- Physical effort: form fields, data entry, clicks, scrolling, waiting
- Decisions to make: choices, configurations, ambiguous options, unfamiliar terminology
- Questions to figure out: unclear UI, unknown costs, jargon, missing feedback

**Starting Psych by entry context:**
- High-intent (user chose to act): 60
- Medium-intent (exploring): 40
- Low-intent (casual/first-time): 25

**Default entry context:** Medium (40). Document the assumption as a header line at the top of `msf-findings.{html,md}` (rendered as a paragraph immediately after `<h1>` in the HTML primary):

```
Entry context: Medium (40, default). Override by editing this line and re-running.
```

The user can override by editing the line and re-running.

Use +1 to +10 / −1 to −10 per element. Track a running total. Flag any screen dropping below 20 as a directional **danger zone** and below 0 as a directional **bounce risk**.

Focus on elements that stand out as clearly positive or negative. Skip neutral / expected elements — padding the score table with forced insights is an anti-pattern.

**Output format:** see `reference/psych-output-format.md` for the dual-table layout (per-screen scoring table + journey rollup).

---

## Phase 7: Save Findings

Save a **single** consolidated findings doc per the substrate at `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/`. The wireframe HTML files themselves are never converted — only the findings sidecar is governed by this runbook (per runbook edge case row 1).

**Save path:**
- If invoked inside a pipeline feature folder (`{feature_folder}` resolved in Phase 0) → `{feature_folder}/msf-findings.html`.
- Else (ad-hoc) → `~/.pmos/msf/YYYY-MM-DD_<slug>.html`, where `<slug>` is derived from the wireframes folder name (lowercase, hyphenated).

**Atomic write (FR-10.2):** write `msf-findings.html` and the companion `msf-findings.sections.json` via temp-then-rename — never serve a half-written file.

**Asset substrate (FR-10):** when writing into a feature folder, copy `assets/*` from `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/` to `{feature_folder}/assets/` if not already present. The substrate currently includes `style.css`, `viewer.js`, `serve.js`, `build_sections_json.js`, `comments.js`, `comments.css`, and the launcher trio (`comments-open.command`, `comments-open.sh`, `comments-open.bat`); new substrate files added in future releases ride along automatically. Idempotent — `cp -n` skips identical files. Ad-hoc saves to `~/.pmos/msf/` write a self-contained HTML referencing `~/.pmos/msf/assets/` (first ad-hoc run seeds the cache).

**Asset prefix (FR-10.1):** `assets/` for top-level feature-folder writes.

**Cache-bust (FR-10.3):** append `?v=<plugin-version>` to all asset URL references emitted into the HTML.

**Heading IDs (FR-03.1, enforced by `/verify`):** every `<h2>` and `<h3>` carries a stable kebab-case `id` per `_shared/html-authoring/conventions.md` §3 (lowercase, non-alphanumeric runs → `-`, trim, dedupe collisions with `-2`/`-3`/...). `assert_heading_ids.sh` (T22) blocks any artifact missing an id.

**Index regeneration (FR-22, §9.1):** when writing into a feature folder, regenerate `{feature_folder}/index.html` via `_shared/html-authoring/index-generator.md` (manifest inlined as `<script type="application/json" id="pmos-index">`, no on-disk `_index.json`, FR-41).

**Mixed-format sidecar (FR-12.1):** retired — `output_format=both` is treated as `html` until a future feature re-introduces MD export.

**Overwrite protection (E4):** if a findings doc already exists at the save path (either `.html` or legacy `.md`), copy it to `<save_path>.bak` before overwriting. The `.bak` is preserved for one cycle (next run overwrites it). Skip the backup step if no prior file exists.

**File structure:**

1. Header line: `Entry context: Medium (40, default). Override by editing this line and re-running.`
2. **Section A — MSF Analysis:** persona × scenario × journey × consideration matrix from Phase 5.
3. **Section B — PSYCH Scoring:** per-screen scoring tables and journey rollups per `reference/psych-output-format.md`. Includes "Unsurfaced findings" rollup if more than 12 findings were prioritized for the chat summary.
4. **Section C — Recommendations:** prioritized Must / Should / Nice table per `../_shared/msf-heuristics.md`.
5. **Section D — Applied changes** (only if `--apply-edits` ran in Phase 8): journey, screen, finding, fix, status.

The findings doc has **no line cap**.

**No actionable findings — terminal state.** When analysis surfaces nothing rated Must / Should / Nice, emit "no actionable findings" in chat and save the findings doc with empty recommendation tables. Do not pad with manufactured items.

---

## Phase 8: Apply Edits (conditional)

**This phase runs only when `--apply-edits` was passed.** If absent, skip directly to Phase 9 with a followup message in chat:

> To apply: re-run `/msf-wf <folder> --apply-edits`, or run `/wireframes <feature>` to regenerate.

When `--apply-edits` is present:

<!-- defer-only: ambiguous -->
1. For each finding rated Must or Should (and Nice when explicitly requested), present via `AskUserQuestion` with options:
   - **Fix as proposed** — agent applies the stated change via `Edit` to the relevant `.html` file
   - **Modify** — user provides a refined fix in free-form next turn
   - **Skip** — finding dispositioned away; logged in findings doc with disposition="Skip"
   - **Defer** — logged under Open Questions in the findings doc

2. Batch up to 4 findings per interactive-prompt call. For more findings, issue multiple sequential calls.

3. Apply approved edits inline using `Edit` against the wireframe HTML files in the resolved wireframes folder. Spot-check each edit against `../wireframes/reference/eval-rubric.md` after editing — do NOT trigger `/wireframes` Phase 4 review-loops.

4. Log every applied change in the findings doc Section D ("Applied changes") with: journey, screen, finding, fix, disposition.

When `--apply-edits` is **absent**, the skill MUST NOT call `Edit` or `Write` against any file in the wireframes folder. Findings doc remains the only output.

---

## Phase 9: Executive Summary in Chat

Render the executive summary per `../_shared/msf-heuristics.md` "Executive Summary Template". Cap chat output at **200 lines**.

**Summary Overrides (wf-mode):**

- Include danger-zone screens (PSYCH < 20 directional) and bounce-risk screens (< 0 directional) in the summary's top-issues list.
- Cap surfaced findings at 12; rest are logged in the findings doc under "Unsurfaced findings".
- If `--apply-edits` ran: include a one-line summary of applied vs. deferred dispositions.

---

## Phase 10: Capture Learnings

**This skill is not complete until the learnings-capture process has run.** Read and follow `_shared/learnings-capture.md` (relative to the skills directory) now. Reflect on whether this session surfaced anything worth capturing under `## /msf-wf` in `~/.pmos/learnings.md` — recurring PSYCH driver patterns, persona-conditional findings PSYCH alone missed, wireframe heuristics that fired repeatedly. Proposing zero learnings is a valid outcome.

---

## Anti-Patterns (DO NOT)

- Do NOT skip the persona-alignment confirmation step — analyzing without confirmed personas produces generic findings.
- Do NOT pad PSYCH scores by inventing positive elements to balance negatives — score only what's notable, leave the column empty if a screen is genuinely neutral.
- Do NOT walk journeys in parallel via subagents — the findings doc is a single shared file; concurrent edits cause merge corruption (this is a recurring sharp edge).
- Do NOT call `Edit` or `Write` against any wireframe HTML file when `--apply-edits` is absent. Recommendations-only is the contract.
- Do NOT accept the flags `--default-scope`, `--wireframes`, or `--skip-psych`. The only flag recognized is `--apply-edits`. The argument-hint advertises only `<path-to-wireframes-folder> [--apply-edits]`.
- Do NOT trigger `/wireframes` Phase 4 review-loops after editing wireframes — spot-check inline against `../wireframes/reference/eval-rubric.md`.
- Do NOT silently skip the wrong-input guard — a single `.md` argument means the user wanted `/msf-req`.
- Do NOT pad recommendations to fill the Must / Should / Nice template — emit "no actionable findings" instead.
