---
name: msf-req
description: Evaluate a requirements document from the end-user perspective using Motivation/Satisfaction/Friction analysis. Produces a recommendations-only findings doc; never edits the source. Use when the user says "evaluate UX of the requirements", "will the proposed solution work for users", "persona check on this PRD", or "friction analysis on requirements".
user-invocable: true
argument-hint: "<path-to-requirements-doc> [--feature <slug>]"
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

## Flags & natural language

Every option also has a natural-language form — infer it from the request; an explicit flag overrides. `--feature <slug>` resolves the feature folder when the path argument alone is ambiguous. One flag stays parsed for back-compat but is deliberately not advertised:

<!-- nl-sugar -->
- `--format <html|md|both>` — output-format override; `md`/`both` are retired values, treated as `html` (see Phase 0 step 6).

The retired pre-split `/msf` flags (`--apply-edits`, `--wireframes`, `--skip-psych`, `--default-scope`) are rejected with a pointer to this argument-hint.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No `AskUserQuestion`:** state the proposed personas/dispositions and proceed; the user reviews after completion.
- **No subagents:** sequential single-agent analysis.

---

## Phase 0: Pipeline Setup (inline — do not skip) {#pipeline-setup}

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

6. **Resolve `output_format`.** Read `output_format` from `.pmos/settings.yaml` (default: `html`; valid values: `html`, `md` — legacy `both` is treated as `html` per `_shared/html-authoring/README.md`). A `--format` argument-string flag overrides settings (last flag wins on conflict). Print to stderr exactly: `output_format: <value> (source: <cli|settings|default>)` once at Phase 0 entry.

---

## Phase 1: Wrong-input Guard {#wrong-input-guard}

Before any other phase, inspect the argument:

- If the argument resolves to a **directory** → exit with: "Argument looks like a wireframes folder. Use `/msf-wf` instead." Do NOT continue.
- If the argument resolves to a single `.html` or `.md` file → continue.
- If the argument is missing → continue to Phase 2 (resolve-input handles missing arg).

This guard runs before persona alignment, learnings load, or any analysis.

### Input Contract (when invoked as reviewer subagent)

When a parent orchestrator (currently `/requirements`' folded MSF phase, `requirements/SKILL.md#folded-msf`) invokes this skill as a reviewer subagent, follow the reviewer side of `_shared/reviewer-protocol.md` — chrome-stripped slice as prompt body, `sections_found` enumeration first, `{section_id, severity, message, quote}` findings with ≥40-char verbatim quotes, and no self-validation (the validation contract lives in the parent). In this mode skip the Phase 2 resolver and operate directly on the stripped HTML.

---

## Phase 2: Locate Requirements {#locate-requirements}

Follow `../_shared/resolve-input.md` with `phase=requirements`, `label="requirements doc"`. Read the resolved file end-to-end before Phase 3.

**Tier check:** if the requirements doc has a `Tier:` tag in frontmatter or header and the value is `Tier 1`, emit a one-line warning before continuing: `Note: MSF analysis is best-suited to Tier 3 features. This doc is tagged Tier 1 — proceeding anyway, but findings may be over-engineered for the scope.` Continue regardless of tier.

---

## Phase 3: Persona & Journey Alignment {#persona-journey-alignment}

Follow `../_shared/persona-journey-alignment.md` Steps 1–2 (extract-before-invent, 2–5 personas with ≤2 scenarios each, journey proposal — infer 2–4 from goals + functional sections if the doc names none, `AskUserQuestion` confirmation), with `source` = the requirements doc. The confirmation step is mandatory — never skipped.

---

## Phase 4: MSF Pass {#msf-pass}

For each persona × scenario × journey, walk the M / F / S consideration questions in `../_shared/msf-heuristics.md` (Motivation Considerations, Friction Considerations, Satisfaction Considerations).

Because the source is text-only (no UI to ground in), state assumptions about flow ordering and surface them in the findings doc for user verification. Cite specific requirements-doc sections, FR-IDs, or user-journey steps when answering each consideration.

If a question isn't applicable for a given persona/scenario, say so briefly rather than skipping silently.

---

## Phase 5: Save Findings {#save-findings}

**Emit per the `_shared/html-authoring/README.md` checklist** (template slot-fill, atomic write with the `.sections.json` companion, idempotent asset copy — which carries the inline-comments substrate, `comments.js` et al. — cache-busted asset URLs, heading ids per `conventions.md` §3, index regeneration per `index-generator.md` when writing into a feature folder). Deltas for this skill:

- **Save path:** pipeline runs (`{feature_folder}` resolved in Phase 0 step 4) → `{feature_folder}/msf-req-findings.html` — slug-distinct from /msf-wf's `msf-wf-findings.html`; running both on one feature must not overwrite. Ad-hoc runs → `~/.pmos/msf/YYYY-MM-DD_<slug>.html` (`<slug>` from the argument's filename, lowercase-hyphenated; substrate referenced via the `~/.pmos/msf/assets/` cache, seeded on first ad-hoc run).
- **Overwrite protection:** if a findings doc already exists at the save path (`.html` or legacy `.md`), copy it to `<save_path>.bak` before overwriting. The `.bak` lasts one cycle. Skip if no prior file exists.

The findings doc has **no line cap**. Contains the full persona × scenario × journey × consideration matrix plus the prioritized Must / Should / Nice recommendations table per `../_shared/msf-heuristics.md` "Executive Summary Template".

**No actionable findings — terminal state.** When analysis surfaces nothing rated Must / Should / Nice, emit "no actionable findings" in chat and save the findings doc with empty recommendation tables. Do not pad with manufactured items.

---

## Phase 6: Executive Summary in Chat {#executive-summary}

Render the executive summary per `../_shared/msf-heuristics.md` "Executive Summary Template". Cap chat output at **200 lines**.

**Summary Overrides (req-mode):**

- No PSYCH section — wireframe-grounded scoring does not apply to a text-only artifact.
- If a wireframes folder exists adjacent to the requirements doc (e.g., `<feature_folder>/wireframes/`), append a one-line suggestion at the end of the summary: `Wireframes detected at <path>; consider /msf-wf for grounded analysis.`

After saving and rendering the summary, the skill **terminates**. Do not edit the requirements doc. The user folds findings into a revised doc themselves (manually or via `/requirements`) before `/spec`.

---

## Phase 7: Capture Learnings {#capture-learnings}

**This skill is not complete until the learnings-capture process has run.** Read and follow `_shared/learnings-capture.md` (relative to the skills directory) now. Reflect on whether this session surfaced anything worth capturing under `## /msf-req` in `~/.pmos/learnings.md` — surprising persona-conditional findings, repeated friction patterns, non-obvious assumptions. Proposing zero learnings is a valid outcome.

---

## Anti-Patterns (DO NOT)

- Do NOT skip the persona-alignment confirmation step — analyzing without confirmed personas produces generic findings.
- Do NOT modify the requirements doc, ever. /msf-req is recommendations-only.
- Do NOT run PSYCH scoring — there is no UI to score. PSYCH lives in `/msf-wf` (via `_shared/psych-scoring.md`).
- Do NOT silently skip the wrong-input guard — a directory argument means the user wanted `/msf-wf`.
- Do NOT pad recommendations to fill the Must / Should / Nice template — emit "no actionable findings" instead.
- Do NOT present recommendations as a wall of text — use tables with severity and effort.

---

*Spec lineage: `2026-05-08_msf-skill-split` (skill boundary, recommendations-only contract, retired-flag rejections, tier check E1, overwrite protection E4), `2026-05-10_pipeline-consolidation` W1/W4 (folded invocation from /requirements, `msf-req-findings` slug-distinct rename), `2026-05-09_html-artifacts` + `2026-05-28_inline-html-artifacts` (FR-10/12/22 emit contract, FR-50/51/52 reviewer contract — now cited via `_shared/reviewer-protocol.md` and `_shared/html-authoring/README.md`; `md`/`both` format retirement per FR-12.1), `2026-05-08_non-interactive-mode` (refusal marker).*
