---
name: msf-req
description: Evaluate a requirements document from the end-user perspective using Motivation/Satisfaction/Friction analysis. Produces a recommendations-only findings doc; never edits the source. Use when the user says "evaluate UX of the requirements", "will the proposed solution work for users", "persona check on this PRD", or "friction analysis on requirements".
user-invocable: true
argument-hint: "<path-to-requirements-doc> [--format <html|md|both>]"
---

# /msf-req — Motivation / Friction / Satisfaction on a Requirements Doc

<!-- non-interactive: refused; reason: recommendations-only with free-form persona inference and journey confirmation; alternative: run /wireframes --apply-edits via parent flow -->

Evaluate a requirements document by simulating end-user experience across personas and journeys. Identifies hidden friction, motivation gaps, and satisfaction shortfalls before `/spec`. Produces recommendations only — never edits the source requirements doc.

Best applied to **Tier 3 requirements** (features / product launches) after `/requirements` and before `/spec`. For wireframe-grounded analysis, use `/msf-wf` instead.

```
/requirements  →  [/msf-req, /creativity]  →  /spec  →  /plan  →  /execute  →  /verify
                   (this skill) ↑
```

**Announce at start:** "Using the /msf-req skill to evaluate user motivation, friction, and satisfaction on the requirements doc."

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No `AskUserQuestion`:** state the proposed personas/dispositions and proceed; the user reviews after completion.
- **No subagents:** sequential single-agent analysis.

---

## Phase 0: Pipeline Setup (inline — do not skip)

Use workstream context (loaded by step 3 below) to inform analysis — product constraints and stakeholder concerns shape what counts as friction.

<!-- pipeline-setup-block:start -->
1. **Read `.pmos/settings.yaml`.**
   - If missing → you MUST invoke the `Read` tool on `_shared/pipeline-setup.md` Section A and run first-run setup before proceeding.
2. Set `{docs_path}` from `settings.docs_path`.
3. If `settings.workstream` is non-null → load `~/.pmos/workstreams/{workstream}.md` as context preamble; if frontmatter `type` is `charter` or `feature` and a `product` field exists, also load `~/.pmos/workstreams/{product}.md` read-only.
4. Resolve `{feature_folder}`:
   - If `--feature <slug>` was passed → glob `{docs_path}/features/*_<slug>/`.
   - Else if the argument's path resolves to a file inside `{docs_path}/features/<slug>/` → use that folder.
   - Else → ad-hoc invocation; `{feature_folder}` is unset.
5. Read `~/.pmos/learnings.md` if present; note entries under `## /msf-req` and factor them into approach (skill body wins on conflict).
<!-- pipeline-setup-block:end -->

### Phase 0 addendum: output_format resolution (FR-12)

6. **Resolve `output_format`.** Read `output_format` from `.pmos/settings.yaml` (default: `html`; valid values: `html`, `md`, `both`). A `--format <html|md|both>` argument-string flag overrides settings (last flag wins on conflict, per FR-12). Print to stderr exactly: `output_format: <value> (source: <cli|settings|default>)` once at Phase 0 entry. The numbering continues from the pipeline-setup-block above (which ends at step 5 in this skill).

---

## Phase 1: Wrong-input Guard

Before any other phase, inspect the argument:

- If the argument resolves to a **directory** → exit with: "Argument looks like a wireframes folder. Use `/msf-wf` instead." Do NOT continue.
- If the argument resolves to a single `.html` or `.md` file → continue.
- If the argument is missing → continue to Phase 2 (resolve-input handles missing arg).

This guard runs before persona alignment, learnings load, or any analysis.

### Input Contract (when invoked as reviewer subagent)

When a parent orchestrator (currently `/feature-sdlc`) invokes this skill as a reviewer subagent, the parent has chrome-stripped the artifact via `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/chrome-strip.js` (FR-50, T12) and passes the stripped slice (`<h1>` + `<main>`) inline as the prompt body. In that mode, this skill skips its own resolver (`_shared/resolve-input.md`) and operates directly on the stripped HTML.

**Output shape (FR-51 canonical):** the skill MUST first enumerate every `<section>` id and every `<h2>`/`<h3>` id it can locate in the stripped slice, returning them as `sections_found: [...]`. It then evaluates against its own rubric and emits findings as `{section_id, severity, message, quote: "<≥40-char verbatim from source>"}`.

**Parent-side validation (FR-52, the skill MUST NOT self-validate):** the parent will (a) set-equality-check `sections_found` against `<artifact>.sections.json`, (b) substring-grep every `quote` against the original (un-stripped) source HTML, (c) hard-fail on any miss. This skill does not duplicate that validation; the contract lives in the parent.

---

## Phase 2: Locate Requirements

Follow `../_shared/resolve-input.md` with `phase=requirements`, `label="requirements doc"`. Read the resolved file end-to-end before Phase 3.

**Tier check (E1):** if the requirements doc has a `Tier:` tag in frontmatter or header and the value is `Tier 1`, emit a one-line warning before continuing: `Note: MSF analysis is best-suited to Tier 3 features. This doc is tagged Tier 1 — proceeding anyway, but findings may be over-engineered for the scope.` Continue regardless of tier.

---

## Phase 3: Persona Alignment

Follow `../_shared/msf-heuristics.md` "Persona Alignment" section. Behavior:

- First, extract any personas/journeys explicitly named in the requirements doc (sections like "Users", "Personas", "Stakeholders", or named in user journeys).
- Propose those for confirmation.
- If the requirements doc names no personas, propose 2–5 inferred personas (max 2 scenarios each) and confirm via `AskUserQuestion`.

The confirmation step is mandatory — never skipped.

---

## Phase 4: Journey Confirmation

Follow `../_shared/persona-journey-alignment.md` Step 2, with `source` = the requirements doc — list and confirm the key user journeys via `AskUserQuestion` (infer 2–4 from goals + functional sections if the doc names none).

---

## Phase 5: MSF Pass A

For each persona × scenario × journey, walk the M / F / S consideration questions in `../_shared/msf-heuristics.md` (Motivation Considerations, Friction Considerations, Satisfaction Considerations).

Because the source is text-only (no UI to ground in), state assumptions about flow ordering and surface them in the findings doc for user verification. Cite specific requirements-doc sections, FR-IDs, or user-journey steps when answering each consideration.

If a question isn't applicable for a given persona/scenario, say so briefly rather than skipping silently.

---

## Phase 6: Save Findings

Save the consolidated MSF analysis matrix.

**Save path:**
- If invoked inside a pipeline feature folder (`{feature_folder}` resolved in Phase 0 step 4) → `{feature_folder}/msf-findings.html` per the substrate at `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/`.
- Else (ad-hoc) → `~/.pmos/msf/YYYY-MM-DD_<slug>.html`, where `<slug>` is derived from the argument's filename (lowercase, hyphenated).

**Atomic write (FR-10.2):** write `msf-findings.html` and the companion `msf-findings.sections.json` via temp-then-rename — never serve a half-written file.

**Asset substrate (FR-10):** when writing into a feature folder, copy `assets/*` from `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/` to `{feature_folder}/assets/` if not already present. The substrate currently includes `style.css`, `viewer.js`, `serve.js`, `build_sections_json.js`, `comments.js`, `comments.css`, and the launcher trio (`comments-open.command`, `comments-open.sh`, `comments-open.bat`); new substrate files added in future releases ride along automatically. Idempotent — `cp -n` skips identical files. Ad-hoc saves to `~/.pmos/msf/` write a self-contained HTML (substrate referenced via the `~/.pmos/msf/assets/` cache; first ad-hoc run seeds the cache).

**Asset prefix (FR-10.1):** `assets/` for top-level feature-folder writes; `../assets/` if nested.

**Cache-bust (FR-10.3):** append `?v=<plugin-version>` to all asset URL references emitted into the HTML.

**Heading IDs (FR-03.1, enforced by `/verify`):** every `<h2>` and `<h3>` carries a stable kebab-case `id` per `_shared/html-authoring/conventions.md` §3 (lowercase, non-alphanumeric runs → `-`, trim, dedupe collisions with `-2`/`-3`/...). `assert_heading_ids.sh` (T22) blocks any artifact missing an id.

**Index regeneration (FR-22, §9.1):** when writing into a feature folder, regenerate `{feature_folder}/index.html` via `_shared/html-authoring/index-generator.md` (manifest inlined as `<script type="application/json" id="pmos-index">`, no on-disk `_index.json`, FR-41).

**Mixed-format sidecar (FR-12.1):** retired — `output_format=both` is treated as `html` until a future feature re-introduces MD export.

**Overwrite protection (E4):** if a findings doc already exists at the save path (either `.html` or legacy `.md`), copy it to `<save_path>.bak` before overwriting. The `.bak` is preserved for one cycle (next run overwrites it). Skip the backup step if no prior file exists.

The findings doc has **no line cap**. Contains the full persona × scenario × journey × consideration matrix plus the prioritized Must / Should / Nice recommendations table per `../_shared/msf-heuristics.md` "Executive Summary Template".

**No actionable findings — terminal state.** When analysis surfaces nothing rated Must / Should / Nice, emit "no actionable findings" in chat and save the findings doc with empty recommendation tables. Do not pad with manufactured items.

---

## Phase 7: Executive Summary in Chat

Render the executive summary per `../_shared/msf-heuristics.md` "Executive Summary Template". Cap chat output at **200 lines**.

**Summary Overrides (req-mode):**

- No PSYCH section — wireframe-grounded scoring does not apply to a text-only artifact.
- If a wireframes folder exists adjacent to the requirements doc (e.g., `<feature_folder>/wireframes/`), append a one-line suggestion at the end of the summary: `Wireframes detected at <path>; consider /msf-wf for grounded analysis.`

After saving and rendering the summary, the skill **terminates**. Do not edit the requirements doc. The user folds findings into a revised doc themselves (manually or via `/requirements`) before `/spec`.

---

## Phase 8: Capture Learnings

**This skill is not complete until the learnings-capture process has run.** Read and follow `_shared/learnings-capture.md` (relative to the skills directory) now. Reflect on whether this session surfaced anything worth capturing under `## /msf-req` in `~/.pmos/learnings.md` — surprising persona-conditional findings, repeated friction patterns, non-obvious assumptions. Proposing zero learnings is a valid outcome.

---

## Anti-Patterns (DO NOT)

- Do NOT skip the persona-alignment confirmation step — analyzing without confirmed personas produces generic findings.
- Do NOT modify the requirements doc, ever. /msf-req is recommendations-only.
- Do NOT accept the flags `--apply-edits`, `--wireframes`, `--skip-psych`, or `--default-scope`. The argument-hint advertises only `<path-to-requirements-doc>` and `--format <html|md|both>`.
- Do NOT run PSYCH scoring — there is no UI to score. PSYCH lives in `/msf-wf`.
- Do NOT silently skip the wrong-input guard — a directory argument means the user wanted `/msf-wf`.
- Do NOT pad recommendations to fill the Must / Should / Nice template — emit "no actionable findings" instead.
- Do NOT present recommendations as a wall of text — use tables with severity and effort.
