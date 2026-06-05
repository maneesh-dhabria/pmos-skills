---
name: requirements
description: Brainstorm, shape, and create a requirements document — problem definition, high-level solution direction, user journeys, research synthesis. First stage in the requirements -> spec -> plan pipeline. Auto-tiers by scope (bug fix / enhancement / feature). Use this skill when the user says things like "I have a feature idea", "let's brainstorm", "what should we build", "define what we need", "help me figure out the requirements", or shares initial thoughts about a problem to solve.
user-invocable: true
argument-hint: "<initial thoughts or observations to seed the requirements> [--feature <slug>] [--backlog <id>] [--skip-folded-msf] [--msf-auto-apply-threshold N] [--non-interactive | --interactive] [--format <html|md|both>]"
---

# Requirements Document Generator

Brainstorm with the user, research existing patterns, and produce a requirements document that defines the **problem** and **high-level solution direction**. This is the FIRST stage in the pipeline:

```
/requirements  →  [/msf-req, /creativity]  →  /spec  →  /plan  →  /execute  →  /verify
 (this skill)      optional enhancers
```

A requirements doc answers "What are we building and why?" — it contains ZERO implementation details. No database schemas, no API contracts, no code. Those belong in the spec.

**The acid test (dual):** (a) Could a product designer read every sentence and use it to evaluate design options? (b) Could a spec author write `02_spec.{html,md}` from this doc with no remaining "why are we building this?" or "what's the user trying to do?" questions? If either fails, the doc isn't done.

**Announce at start:** "Using the requirements skill to brainstorm and create a requirements document."

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** State your assumption, document it in the output, and proceed. The user reviews after completion.
- **No subagents:** Perform research and analysis sequentially as a single agent.
- **No Playwright MCP:** Note browser-based verification as a manual step for the user.
- **Task tracking:** Use your available task tracking tool (e.g., `TaskCreate`/`TaskUpdate` in Claude Code, `update_plan` in Codex, or equivalent). If none is available, announce phase transitions verbally.

---

## Backlog Bridge

This skill optionally integrates with `/backlog`. See `plugins/pmos-toolkit/skills/backlog/pipeline-bridge.md` for the full contract.

**At skill start:**
- If `--backlog <id>` was passed: load the item via `cat <repo>/backlog/items/{id}-*.md` and use its content as the seed alongside any user-provided argument. Remember `<id>` for use at the end of the skill.
- If no argument was provided AND `<repo>/backlog/items/` exists: run the auto-prompt flow per `pipeline-bridge.md`. If the user picks an item, set `<id>` and use its content as the seed.

**At skill end (after the requirements doc is written AND committed):**
- **Guard:** Only invoke `/backlog set {id} source={doc_path}` when (a) the doc was actually written this run AND (b) the commit succeeded. Skip silently if either fails.
- **Re-run idempotency:** If the same `--backlog id` was used in a prior run and the source path differs, append a one-line history entry to the backlog item: `- {YYYY-MM-DD}: requirements doc rewritten by user`.

---

## Phase 0: Pipeline Setup (inline — do not skip)

<!-- pipeline-setup-block:start -->
1. **Read `.pmos/settings.yaml`.**
   - If missing → you MUST invoke the `Read` tool on `_shared/pipeline-setup.md` Section A and run first-run setup before proceeding. (Skipping this Read is the most common cause of folder-naming defects.)
2. Set `{docs_path}` from `settings.docs_path`.
3. If `settings.workstream` is non-null → load `~/.pmos/workstreams/{workstream}.md` as context preamble; if frontmatter `type` is `charter` or `feature` and a `product` field exists, also load `~/.pmos/workstreams/{product}.md` read-only.
4. Resolve `{feature_folder}`:
   - If `--feature <slug>` was passed → glob `{docs_path}/features/*_<slug>/`. **Exactly 1 match required**; on 0 or 2+ → you MUST `Read` `_shared/pipeline-setup.md` Section B before acting.
   - Else if `settings.current_feature` is set AND `{docs_path}/features/{current_feature}/` exists → use it.
   - Else → ask user (offer: create new with derived slug, pick existing from folder list, or specify via Other...).
5. **Edge cases — you MUST `Read` `_shared/pipeline-setup.md` Section B before acting:** slug collision, slug validation failure, legacy date-less folder encountered, ambiguous `--feature` lookup, any folder creation.
6. Read `~/.pmos/learnings.md` if present; note entries under `## /<this-skill-name>` and factor them into approach (skill body wins on conflict; surface conflicts to user before applying).
<!-- pipeline-setup-block:end -->

### Phase 0a: output_format resolution (FR-12)

7. **Resolve `output_format`.** Read `output_format` from `.pmos/settings.yaml` (default: `html`; valid values: `html`, `md`, `both`). A `--format <html|md|both>` argument-string flag overrides settings (last flag wins on conflict, per FR-12). Print to stderr exactly: `output_format: <value> (source: <cli|settings|default>)` once at Phase 0 entry. The numbering continues from the pipeline-setup-block above (which ends at step 6).

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

---

## Phase 1: Intake & Tier Detection

### Determine Input Mode

The user's input can take several forms. Handle each via mode-specific phase routing:

| Input Mode | What you receive | Phase routing |
|------------|-----------------|---------------|
| **Raw thoughts** | Rough observations, problem statement, or scattered ideas | Full flow (Phase 2 research → Phase 3 brainstorm → Phase 4 write) |
| **Existing doc update** | Path to existing `01_requirements.{html,md}` + new observations (resolver picks the format that exists) | **Skip Phase 2 full research**; read prior Research Sources and refresh only delta-relevant areas (Phase 2 update-path). Phase 3 brainstorm runs on the delta only. |
<!-- defer-only: ambiguous -->
| **Multiple text inputs** | Several pasted texts, screenshots, or references | **Add Phase 1a synthesis step**: synthesize all inputs into a coherent problem statement; confirm understanding via `AskUserQuestion`; then proceed to Phase 2 |
| **Spec or detailed brief** | Already well-formed requirements that need shaping | **Skip Phase 3 brainstorm**; structure inputs into the template; Phase 5 review applies a gap-analysis lens specifically |

### Steps

<!-- defer-only: ambiguous -->
1. **Read the user's input.** If the argument is unclear about which product/service/surface the requirements concern, use `AskUserQuestion` to clarify upfront — do not guess.
2. **Scope decomposition check.** Decompose into separate per-feature pipelines **only when ALL three** of the following hold:
   - The input describes work targeting **different primary user roles**, AND
   - The pieces can **ship independently** (no required ordering for value), AND
   - The pieces have **non-overlapping acceptance criteria**.
   If all three hold → propose N feature slugs, ask which to start with, run `/requirements` once per folder. **If any one fails** → treat as a single Tier 3 feature with multiple journeys; do not decompose.
3. **Check for existing requirements.** Resolve the prior artifact via `_shared/resolve-input.md` with `phase=requirements`, `label="prior requirements doc"` (prefers `01_requirements.html`, falls back to `01_requirements.md`, errors on neither — but in this skill, "neither" is the fresh-start case, not an error).
   - If found: read it, summarize what's there, ask the user if this is an update or fresh start.
   <!-- defer-only: ambiguous -->
   - **If found AND any of `02_spec.{html,md}` or `03_plan.{html,md}` also exist in the folder:** issue a downstream-drift warning via `AskUserQuestion` BEFORE any further work:
     > Updating requirements will desync the spec and/or plan. Continue / cancel / run /verify after?
4. **Detect the tier** based on these explicit signals. Pick the **highest-tier signal that fires**:

| Tier | Signals (any one fires the tier) |
|------|----------------------------------|
| **Tier 1: Bug / Minor Fix** | Isolated defect; reversible; no new user-visible flow; touches ≤1 surface |
| **Tier 2: Enhancement / UX Fix** | Touches 1–2 existing surfaces; no new persona; no new data model; existing flow extended |
| **Tier 3: Feature / Product Launch** | Touches ≥3 surfaces, OR introduces a new persona, OR introduces a new top-level data-model concept, OR is irreversible at the product level |

| Tier | Sections | Length |
|------|----------|--------|
| **Tier 1** | Problem, Root Cause, Fix Direction, Acceptance Criteria, optional Decision/Open Questions/Investigated | ~0.5–1 page |
| **Tier 2** | Problem, Why Now, Goals (with measured-by), Non-Goals, Solution Direction, User Journeys, Design Decisions, Open Questions | ~1–2 pages |
| **Tier 3** | All Tier 2 sections + UX Analysis (Motivation/Friction/Satisfaction), Success Metrics table, Research Sources, alternate + error journeys | ~2–4 pages |

<!-- defer-only: ambiguous -->
5. **Announce + confirm tier.** Echo: `This looks like a Tier N requirement ([type]). Using the [tier name] template. Override?` Use `AskUserQuestion` if ambiguous. **Confirm before creating tasks** (next step) — overriding tier after task creation forces a clean-and-recreate.

6. **Create phase tasks** using your available task tracking tool, scaled to the **confirmed** tier:

| Tier | Tasks to create |
|------|----------------|
| **Tier 1** | Intake, Write Document, Final Review |
| **Tier 2** | Intake, Research (Code), Research (Industry), Brainstorm, Write Document, Review Loops, Final Review |
| **Tier 3** | Intake, Research (Code), Research (Industry), Brainstorm, **UX Analysis**, **Success Metrics**, **Alternate/Error Journeys**, Write Document, Review Loops, Final Review |

Mark each task as in-progress when you start it and completed when done.

---

## Phase 2: Research

**Skip for Tier 1.** For Tier 2 and Tier 3, do both 2a and 2b. Tier 3 goes deeper on 2b (more sources, more alternatives).

Dispatch subagents to explore. **Subagent return schema** (each subagent must return):
1. **Summary** — ≤5 bullets capturing the most relevant findings.
2. **Sources table** — `| Path/URL | 1-line takeaway |` per row.
3. **Flagged gaps** — anything the subagent looked for but didn't find.

The parent agent merges by section without re-summarization. If summaries overlap, dedupe by source path/URL.

### 2a. Existing Implementation & Patterns
- Search the codebase for features similar to what's being described.
- Read existing UI pages, API endpoints, and data models in the relevant area.
- Note user flows that already exist and how adjacent features work.
- Identify patterns, conventions, and constraints from the existing system.

### 2b. Industry Research (Tier 2+)

Goal: avoid inventing in a vacuum. Learn from how others have solved this problem before locking in a direction.

<!-- defer-only: ambiguous -->
**Pick competitors from the user's actual domain** — derive from workstream context, repo description, or ask the user via `AskUserQuestion`. Do NOT default to generic B2B-SaaS tools (Linear/Stripe/Notion/etc.) unless they're genuinely in-domain for this product. A fintech app, a creator tool, a developer infra project, or a consumer product needs domain-relevant peers, not the most-familiar names.

Investigate, with named examples:
- **Competitor / peer approaches:** How do 2–4 in-domain products solve this exact problem? What does their UX flow look like? What did they choose NOT to do?
- **Alternative solution shapes:** Surface at least 2–3 genuinely different approaches (not variations of one). E.g., modal vs. inline vs. dedicated page; sync vs. async; rules engine vs. ML vs. heuristics. Note tradeoffs of each.
- **Established patterns / frameworks / libraries:** Known design patterns, OSS libraries, or standards that apply (OAuth flows, CRDTs, command palettes, etc.).
- **Anti-patterns and failure modes:** What have others gotten wrong here? Post-mortems, deprecated approaches, common complaints.

Depth: Tier 2 → 2–3 competitors, 2 alternatives, brief. Tier 3 → 3–4 competitors, 3+ alternatives, deeper writeup.

Collect sources (URLs, product names, library docs, blog posts) — these go into the Research Sources table.

### Update-path: refresh stale research selectively

If Phase 1 detected an existing `01_requirements.{html,md}` (via the resolver) and the user picked "update":

1. Read the prior Research Sources table.
2. For each row, check if its takeaway still holds (file still exists, URL still resonant for the delta).
3. **Refresh only delta-relevant areas.** Do not re-research areas the prior table covered well that aren't affected by the user's update.
4. Append new sources; mark stale ones with strikethrough rather than deleting.

### Research Output

Summarize findings before asking questions. Ground the conversation in what already exists and what the industry does. Include:
- What already exists in the codebase that's relevant
- How comparable products solve this, and what alternative approaches exist (Tier 2+)
- Sources researched (to avoid duplication in future sessions)

---

## Phase 3: Collaborative Brainstorming

<!-- defer-only: ambiguous -->
Act as a **product director** and **senior analyst**. Ask questions via `AskUserQuestion`.

### Question batching rule

<!-- defer-only: ambiguous -->
**One question per topic.** Use `AskUserQuestion`'s multi-question form (up to 4 questions per call) ONLY when the questions are genuinely related and the user can answer all in one pass without context switching. Don't batch unrelated questions for throughput; don't serialize related questions for caution.

### Coverage checklist (NOT a script)

The areas below are **areas the doc must cover** — not questions to ask reflexively. For each area, first check if user input + research already answered it. **Only ask if a real gap exists.**

- **Problem & Users** — concrete problem statement; persona + context; current workaround and pain points; why-now trigger.
- **Solution Direction** — 2–3 candidate approaches with trade-offs and your recommendation; key user journeys for the recommended approach; explicit out-of-scope items with reasons.
- **UX lenses (Tier 3 mandatory; Tier 2 only if friction is the core problem)** —
  - Motivation: job to be done, importance/urgency, alternatives.
  - Friction: cognitive load, perceived effort, perceived loss.
  - Satisfaction: does it fulfill the job; reassurance signals.
- **Decisions** — for each non-trivial choice: options, trade-offs, your recommendation and why.

**Brainstorm guidance:**
- **Propose 2–3 approaches** before settling on a direction; lead with the recommended option and explain why.
- **Incremental validation (Tier 3):** present each section of the solution direction and get approval before moving on. Do NOT write the full doc then ask "does this look right?"
- **State assumptions** rather than asking obvious questions. Do NOT ask questions for the sake of asking.

### Tier-based stop conditions

Stop interviewing when:
- **Tier 1:** Problem + Root Cause + Fix Direction are pinned.
- **Tier 2:** Problem + Goals + Solution Direction + at least 1 user journey are pinned.
- **Tier 3:** All mandatory sections have a non-placeholder answer or an Open Question entry.

---

## Phase 4: Write the Document

Save to `{feature_folder}/01_requirements.html` per the substrate at `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/`.

**Atomic write (FR-10.2):** write `01_requirements.html` and the companion `01_requirements.sections.json` via temp-then-rename — never serve a half-written file.

**Asset substrate (FR-10):** copy `assets/*` from `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/` to `{feature_folder}/assets/` if not already present. The substrate currently includes `style.css`, `viewer.js`, `serve.js`, `build_sections_json.js`, and the inline-doc-comments substrate (FR-01, FR-40): `comments.js`, `comments.css`, plus the launcher trio `comments-open.command` and `comments-open.sh` (both via `install -m 0755`) and `comments-open.bat` (`cp -n`). New substrate files added in future releases ride along automatically. Idempotent — `cp -n` (no-clobber) or `rsync --update` skips identical files.

**Comments meta tag (FR-01, FR-40):** set `{{pmos_skill}}` to `requirements` when expanding `template.html` so the emitted artifact carries `<meta name="pmos:skill" content="requirements">`. The `/comments` resolver routes apply-edit dispatches via this meta tag, so it MUST be set per-skill.

**Asset prefix (FR-10.1):** for top-level feature-folder artifacts the prefix is `assets/`. Compute per-file relative prefixes for any nested-folder artifacts.

**Cache-bust (FR-10.3):** append `?v=<plugin-version>` to all asset URL references emitted into the HTML (the substrate `template.html` already does this for the loader pair; skill-emitted inline `<link>` / `<script>` references must follow suit).

**Heading IDs (FR-03.1):** every `<h2>` and `<h3>` MUST carry a stable kebab-case `id`. See "Heading IDs" note in the Templates section below.

**Index regeneration (FR-22, §9.1):** after the artifact write completes, regenerate `{feature_folder}/index.html` by inlining the manifest per `_shared/html-authoring/index-generator.md` (no on-disk `_index.json` is written; the manifest is inlined as `<script type="application/json" id="pmos-index">`, FR-41). Honour the §9.1 phase-rank ordering policy.

**Mixed-format sidecar (FR-12.1):** retired — `output_format=both` is treated as `html` until a future feature re-introduces MD export.

### Pre-write safety

Before writing:

1. Run `git status` on `{feature_folder}/01_requirements.html` (and `.md` if `output_format: both`).
2. **If the file is dirty (uncommitted changes):** snapshot-commit before overwriting:
   ```
   git add {feature_folder}/01_requirements.html {feature_folder}/01_requirements.md
   git commit -m "snapshot: pre-/requirements-rewrite"
   ```
   (`git add` on a non-existent path is a no-op, so this works for legacy MD-only folders as well.)
3. Then overwrite with the new content. Git provides version history.

### Commit message verb

After the write, commit with a verb conditional on whether the file existed at Phase 1 entry:

- **Existed →** `docs: update requirements for <feature>`
- **Did not exist →** `docs: add requirements for <feature>`

### Templates

Use the template matching the detected tier. Delete sections marked optional ("omit if empty") for that tier.

**Heading IDs (FR-03.1, enforced by `/verify`).** Every `<h2>` and `<h3>` carries a stable kebab-case `id`. Compute via `_shared/html-authoring/conventions.md` §3 — lowercase the heading text, replace every non-alphanumeric run with a single `-`, trim leading/trailing `-`, dedupe collisions with `-2`/`-3`/... suffixes. Stable IDs let cross-doc anchors (`02_spec.html#fr-10`, `03_plan.html#t8`) resolve deterministically across regenerations. `assert_heading_ids.sh` (T22) blocks any artifact missing an id.

The Tier templates below describe the **section structure** (what content goes where); when emitting HTML, wrap each `## ` section as a `<section id="...">` with an `<h2 id="...">` heading per the conventions doc above. The MD-shape templates remain authoritative for content; the HTML rendering applies on top.

#### Tier 1 Template: Bug / Minor Fix

```markdown
# <Bug/Fix Name> — Requirements

**Date:** YYYY-MM-DD
**Last updated:** YYYY-MM-DD
**Status:** Draft
**Tier:** 1 — Bug Fix

## Problem
[2-4 sentences. What's broken, what's the impact.]

### Who experiences this?
[User role + context]

### Reproduction / Root Cause
[How to reproduce. What's causing it if known.]

### Investigated
[Optional. File paths and issue/PR links touched during root-cause analysis. Two-line section. Omit if empty.]

## Fix Direction
[High-level approach. Not the code — the strategy.]

## Acceptance Criteria
- [ ] [Specific, testable criterion 1]
- [ ] [Specific, testable criterion 2]

## Decisions
[Optional. Use the table format from Tier 2 if multiple fix approaches were considered. Omit if empty.]

## Open Questions
[Optional. Use the table format from Tier 2 if any unknowns remain. Omit if empty.]
```

#### Tier 2 Template: Enhancement / UX Fix

```markdown
# <Feature Name> — Requirements

**Date:** YYYY-MM-DD
**Last updated:** YYYY-MM-DD
**Status:** Draft
**Tier:** 2 — Enhancement

## Problem
[2-4 sentences. Specific user pain or gap.]

### Who experiences this?
[Persona + context]

### Why now?
[What changed that makes this a priority? What's the trigger?]

## Goals & Non-Goals

### Goals
- [Observable user outcome 1] — measured by [signal]
- [Observable user outcome 2] — measured by [signal]

### Non-Goals
- NOT doing [X] — because [reason]

## Solution Direction
[High-level approach. ASCII diagrams of user-observable behavior (screens, journeys, states) where useful — NOT internal architecture.]

## User Journeys

### Primary Journey
[Step-by-step from entry point to completion]

### Error / Edge Cases
[What goes wrong, what the user sees]

## Design Decisions

| # | Decision | Options Considered | Rationale |
|---|----------|-------------------|-----------|
| D1 | [What was decided] | (a) ..., (b) ... | [Why] |

## Open Questions

| # | Question |
|---|----------|
| 1 | [Unresolved decision] |

(Default 2-col. Add `Owner` and `Needed By` columns ONLY if the user mentioned a teammate/stakeholder during brainstorm, OR `~/.pmos/people/` is non-empty, OR the user mentioned a deadline.)

---

**For UX friction analysis, run `/msf-req` after this doc is committed.**
```

#### Tier 3 Template: Feature / Product Launch

```markdown
# <Feature Name> — Requirements

**Date:** YYYY-MM-DD
**Last updated:** YYYY-MM-DD
**Status:** Draft
**Tier:** 3 — Feature

## Problem
[2-4 sentences. Specific user pain or gap. No solution language.]

### Who experiences this?
[User role/persona + context. Be specific.]

### Why now?
[What changed that makes this a priority?]

## Goals & Non-Goals

> Goals are observable user outcomes; Acceptance Criteria (engineering contracts) belong in `/spec`. Tier 1 carries both because it bypasses `/spec`.

### Goals
- [Observable user outcome 1] — measured by [metric]
- [Observable user outcome 2] — measured by [metric]

### Non-Goals (explicit scope cuts)
- NOT doing [X] in this iteration — because [reason]
- NOT solving [adjacent problem] — because [reason]

## User Experience Analysis

### Motivation
- **Job to be done:** [What the user is trying to accomplish]
- **Importance/Urgency:** [How critical? What happens if they don't do it?]
- **Alternatives:** [What else could they do? How does this compare?]

### Friction Points

| Friction Point | Cause | Mitigation |
|---------------|-------|------------|
| [e.g., "Will I lose my data?"] | [Uncertainty about save] | [Auto-save + confirmation] |

### Satisfaction Signals
- [How we know the user feels good about the experience]

## Solution Direction
[High-level approach. ASCII diagrams of user-observable behavior or wireframe links where useful. NO internal architecture diagrams — those belong in `/spec`.]

## User Journeys

### Primary Journey (Happy Path)
[Numbered steps. Each step = user action + system response.]

### Alternate Journeys
[Valid variations — user takes different route]

### Error Journeys
[What goes wrong. What the user sees. What they can do.]

### Empty States & Edge Cases

| Scenario | Condition | Expected Behavior |
|----------|-----------|-------------------|
| [name] | [trigger] | [what user sees] |

## Design Decisions

| # | Decision | Options Considered | Rationale |
|---|----------|-------------------|-----------|
| D1 | [What was decided] | (a) ..., (b) ..., (c) ... | [Why — include trade-offs] |

## Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| [e.g., AHT for issue selection] | [current] | [goal] | [how measured] |

## Research Sources

| Source | Type | Key Takeaway |
|--------|------|-------------|
| [file path or URL] | Existing code / External | [What we learned] |

## Open Questions

| # | Question |
|---|----------|
| 1 | [Unresolved decision] |

(Default 2-col. Add `Owner` and `Needed By` columns ONLY if the user mentioned a teammate/stakeholder during brainstorm, OR `~/.pmos/people/` is non-empty, OR the user mentioned a deadline.)
```

### Document Guidelines (all tiers)

- **Goals vs. Acceptance Criteria boundary:** Goals are observable user outcomes ("users find the right issue 80% of the time"). Acceptance Criteria are engineering contracts ("search returns results in <300ms") — those belong in `/spec`. Tier 1 carries both because it bypasses `/spec`.
- **Diagrams:** allowed if they describe what the user sees/does (screens, journeys, state transitions). Banned if they describe internal architecture (services, queues, DBs) — those belong in `/spec`.
- **Wireframes link rule (conditional):** If wireframes exist for this feature folder, link them and avoid prose visual description. If not, describe screens at a behavior level only — do not invent visual detail.
- Scannable — bullet points over paragraphs.
- User-perspective language — "the agent sees X", not "the system stores Y".
- No implementation details — no DB schemas, no API routes, no code snippets.
- Bold the key constraint or decision in each paragraph — readers scan, they don't read linearly.
- One requirement per bullet — if it needs a paragraph, it's multiple requirements.
- Non-goals MUST include a "because" reason — naked exclusions invite re-litigation.
- **Status lifecycle:** Draft on initial write → In Review when entering Phase 5 → Approved when Phase 5 user-confirms.
- **`Last updated` field** refreshes on every commit.

---

## Phase 5: Review (replaces former Phase 5 + Phase 6)

After writing the initial document, run iterative review loops. There is **no minimum loop count** — the 6-gate exit (below) is the real forcing function. A clean first loop can be terminal.

### Per-loop checks (run BOTH lenses every loop)

**A. Structural lens** (catches missing/incomplete sections):
1. Every user journey walked through (happy path + errors + empty states)?
2. Edge cases and error states covered?
3. Non-goals explicitly stated with reasons?
4. Decisions have options considered + rationale?
5. No implementation details leaking in?
6. New-person readability test — can someone unfamiliar understand what we're building?

**B. Product-level self-critique** (catches shallow/incomplete thinking):
1. **Reviewer perspective:** If you were sent this document for review, what comments would you add? Read it as a critical reviewer, not the author — flag vague language, missing rationale, unstated assumptions, and gaps between steps.
2. For each user journey — is there a moment where the user would feel confused, stuck, or unsure what to do next? Are there gaps between steps that assume the user "just knows"?
3. Are there competing priorities or tensions in the requirements that haven't been acknowledged? (e.g., "simple onboarding" vs. "highly configurable" — which wins when they conflict?)
4. Would a skeptical stakeholder ask "why not just do X instead?" — are those alternatives addressed?

### Final-loop polish lens (formerly Phase 6 — runs as part of the LAST loop only)

When the loop is producing only cosmetic findings, also run:
- **Conciseness** — Can sections be tightened without losing essence?
- **Coherence** — Any conflicting requirement statements?
- **New-person test** — Can someone new to the team understand what we're trying to achieve with no blind spots?

### Concrete ambiguity heuristics (replaces "no ambiguous language")

A doc is unambiguous if **all** of the following hold:
- No `etc.` or `and more` — every list is exhaustive or labeled "examples".
- Every quantitative claim has a number ("most users" → "60% of users in Q2 study").
- Every `should` and `might` either becomes `must` or moves to Open Questions.
- No orphan pronouns — every `it`, `they`, `this` has a clear antecedent in the same paragraph.

### Findings presentation protocol

For every loop that produces findings:

1. **Group findings by category** (e.g., "Missing journeys", "Unstated rationale", "Ambiguous language"). Small categories can be merged; never present more than 4 findings in a single batch.
<!-- defer-only: ambiguous -->
2. **One question per finding** via `AskUserQuestion`. Use this shape:
   - `question`: one-sentence restatement of the finding + the proposed fix (concrete, not "tighten section 3")
   - `options` (up to 4):
     - **Fix as proposed** — agent applies the stated change
     - **Modify** — user edits the proposal (free-form reply expected next turn)
     - **Skip** — not an issue; drop it (note briefly in Review Log)
     - **Defer** — log in Open Questions with rationale
3. **Batch up to 4 questions per interactive-prompt call.** If there are more findings, issue multiple calls sequentially, one category per call.
4. **Skip the interactive prompt only for findings that need open-ended input** (e.g., "what's the right retention window?"). For those, ask inline as a normal follow-up after the batch — do not shoehorn into options.
5. **After dispositions arrive,** apply them in order, update the Review Log row to cite dispositions, then ask the user if they see additional gaps before declaring the loop complete.

**Platform fallback (no interactive prompt tool):** list findings as a numbered table with columns [Finding | Proposed Fix | Options: Fix/Modify/Skip/Defer]; ask the user to reply with the disposition numbers. Do NOT silently self-fix.

**Edge cases of structured asks:** when a user reply slips outside the offered options (free-form text, a non-recommended pick that may break an invariant, or leftover findings that don't share a category), follow `../_shared/structured-ask-edge-cases.md`.

### Review Log table (Tier 2-3)

Track every loop in the doc:

```
| Loop | Findings | Changes Made |
|------|----------|-------------|
```

Tier 1 skips the Review Log (single quick pass).

### Loop commit

After applying dispositions:
```
git commit -m "docs: requirements review loop N for <feature>"
```

### 6-gate exit (ALL must hold to stop reviewing)

1. **Both lenses ran** in the most-recent loop (structural + product-critique). For the loop you intend to be terminal, the polish lens also ran.
2. **Findings logged** — either listed under each lens, or explicitly noted as "no findings under lens X".
3. **Dispositions captured** for every finding via the interactive prompt tool (Fix/Modify/Skip/Defer).
4. **User explicitly confirmed** they have no further concerns. (Single yes/no — do NOT infer from silence or "looks good".)
5. **Decision coverage:** every non-trivial design choice from research/brainstorm appears as a Decision row OR an Open Question. (Tier 2 needs ≥1; Tier 3 typically ≥3 but not a hard floor.)
6. **Zero open clarifications** addressed to the user (no inline `[TODO]`, `[??]`, or open interactive prompts waiting for reply).

If any gate is unmet, run another loop. Do not self-declare exit.

---

## Phase 5a: Folded MSF-req (Tier 3 default-on; Tier 1/2 optional)

**Skip if `--skip-folded-msf` was passed** (D13 escape). Skip if `{tier}` is 1 unless user opted in. Tier-3: default-on per D2.

This phase delegates to `_shared/msf-heuristics.md` to apply MSF (motivation/friction/satisfaction) findings against the just-written `01_requirements.md`. Findings ≥ confidence threshold (default 80; override via `--msf-auto-apply-threshold N`) auto-apply as inline edits to `01_requirements.md` with a per-finding git commit; sub-threshold findings surface via the structured-ask path with options `Apply now / Defer to OQ (Recommended) / Reject` (D14).

### Pre-apply guard (FR-64)

Before opening the apply-loop:

```bash
git status --porcelain 01_requirements.md
```

If non-empty: emit `WARNING: 01_requirements.md has uncommitted edits — folded MSF-req apply-loop will skip auto-apply (per FR-64) to avoid clobbering. Run /requirements --skip-folded-msf OR commit your edits first.` Skip auto-apply (fall through to manual disposition); continue with critique + finding emission for advisory value.

### Output slug (D3 / W4)

Findings doc is written to `<feature_folder>/msf-req-findings.md` — **NOT** the legacy `msf-findings.md`. The `<skill-name-slug>-findings.<ext>` convention prevents the slug clash with /msf-wf (W4 dogfood; same pattern adopted in T7's /wireframes folded path).

### Per-finding commits (D16)

Each auto-applied finding is its own git commit:

```
requirements: auto-apply msf-req finding F<N>
```

Commit body includes `Depends-on: F<M>` when finding F<N> requires F<M> to land first. /complete-dev release-notes recipe (FR-68) consumes this. The commits-as-state pattern is the resume cursor: on `--resume`, the apply-loop greps `git log --since=<phase.started_at>` to skip already-applied findings and avoid duplicates (FR-57).

### Failure capture (FR-50, M1, D35)

On apply failure, capture `{folded_skill: msf-req, error_excerpt: <first-200-chars>, ts: <ISO-8601>}` and append to `state.yaml.phases.requirements.folded_phase_failures[]` per the dedup rule in `feature-sdlc/reference/state-schema.md`. Emit chat line at moment-of-append:

```
WARNING: msf-req crashed (advisory continue per D11): <error_excerpt>
```

Continue per D11 advisory — folded-phase failures do NOT halt /requirements. /feature-sdlc Phase 11 surfaces the failures (T12b).

### Anti-patterns

- Do NOT default output path to `msf-findings.md` — always `msf-req-findings.md` (D3).
- Do NOT batch multiple findings into one commit. Per-finding commits are the resume contract.
- Do NOT halt /requirements on substrate failure. Append to `folded_phase_failures[]` and continue per D11.

### Flag handling (Phase 0 parser additions)

`--skip-folded-msf` (boolean) — short-circuits this phase entirely.
`--msf-auto-apply-threshold N` (int, default 80) — overrides the apply threshold.

---

## Phase 6: Workstream Enrichment

**Skip if Tier 1.** Bug fixes don't reshape product understanding.

**Skip if no workstream was loaded** in Phase 0.

Otherwise, follow `_shared/pipeline-setup.md` Section C. For this skill, the signals to look for are:

- User segments mentioned in the requirements → workstream `## User Segments`
- Problem statements that refine the product's purpose → workstream `## Value Proposition` or `## Description`
- Success metrics → workstream `## Key Metrics`

This phase is mandatory whenever a workstream was loaded AND tier ≥ 2 — do not skip just because the core deliverable is complete.

---

## Phase 7: Capture Learnings

**This skill is not complete until the learnings-capture process has run AND produced a one-line output.**

Read and follow `_shared/learnings-capture.md` (relative to the skills directory) now — the shared capture ceremony (read/summarize `~/.pmos/learnings.md`, reflect, propose 0–3 global + 0–3 repo-specific learnings, never auto-write). Reflect specifically on what this `/requirements` session surfaced under `## /requirements`.

**On top of the shared ceremony, `/requirements` requires an explicit one-line output** — emit exactly one of these two lines:
- `Learning: <new entry written to ~/.pmos/learnings.md under ## /requirements>` — when the session surfaced a non-obvious lesson worth keeping (repeated correction, surprising behavior, validated approach).
- `No new learnings this session because <specific reason tied to this session>` — when the session was smooth and routine. The reason must be specific (e.g., "the tier was clear from the start and the user accepted all defaults"), not boilerplate.

**Empty reflection (no line emitted) counts as unfinished work** — the gate is the explicit one-line output, not the existence of a new entry.

---

## Phase 8: Handoff

Tell the user, scaling the message by tier:

- **Tier 1 / Tier 2:** "Requirements captured and committed. When ready, run `/spec` to create the detailed technical specification."
- **Tier 3:** "Requirements captured and committed. Optional next steps: `/creativity` (alternative angles), `/msf-req` (UX friction analysis). When ready: `/spec`."

**The terminal state is handoff to `/spec`.** Do NOT start writing a spec or implementation plan from this skill.

If `--backlog <id>` was set and the doc + commit succeeded, invoke `/backlog set {id} source={doc_path}` per the Backlog Bridge contract above.

---

## Anti-Patterns (DO NOT)

- Do NOT skip the research phase (Tier 2-3) — it grounds the brainstorm in reality.
- Do NOT batch unrelated questions into a single interactive-prompt call for throughput.
- Do NOT include implementation details (DB schemas, API routes, code) — that's the spec's job.
- Do NOT create a new document file in each review loop — update the original.
- Do NOT self-declare the 6-gate exit — gate 4 requires explicit user confirmation.
- Do NOT write decision entries without "Options Considered" and "Rationale" columns.
- Do NOT skip research source tracking (Tier 2+) — future sessions need to know what was explored.
- Do NOT ask questions for the sake of asking — only ask what genuinely helps shape requirements.
- Do NOT use vague success metrics like "improve user experience" — be specific and measurable.
- Do NOT write non-goals without a "because" reason.
- Do NOT default to generic B2B-SaaS competitors (Linear/Stripe/Notion) when researching. Pick in-domain peers.
- Do NOT infer architecture-level diagrams as "high-level approach" — diagrams in this doc must depict user-observable behavior only.
- Do NOT silently overwrite an existing `01_requirements.{html,md}` — snapshot-commit first if dirty.
- Do NOT proceed past Phase 1 if `02_spec.{html,md}` or `03_plan.{html,md}` exist without surfacing the drift warning.
- Do NOT skip the Phase 7 learnings line — empty reflection is unfinished work.

---

## Apply comment-resolver edit (FR-22, FR-30, FR-60)

This phase is the `/requirements` entrypoint that `/comments resolve` (T10) dispatches into when walking open threads in a requirements artifact's `.comments.json` sidecar. The contract — input/output JSON shapes, closed `error_enum` set, idempotency rules, subagent invocation convention — lives in the shared contract doc and is the single source of truth:

- **Contract (normative):** `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md` (T6).

Per [NFR-08](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#nfr-h), this phase MUST cite that file rather than restate the contract. Anything below is `/requirements`-specific implementation guidance only.

### When invoked

The resolver dispatches a subagent with the §9.1 input JSON. The subagent's tools include this skill's Node shim:

- **Shim:** `plugins/pmos-toolkit/skills/requirements/scripts/apply-edit-at-anchor.js` — exports `apply(input)`, returns one of the three output shapes (success / failure / clarification) per §9.1. Success responses include the optional `applied_artifact` field (full post-edit HTML); the shim's minimal edit inserts an HTML annotation comment immediately before the resolved anchor element — real prose rewriting is deferred to T12+.

### Resolution order

1. **id-first.** Locate `id="<id>"` in the artifact HTML. Match → success path, `strategy: "id-first"`, `score: 1.0`.
2. **quote-fallback.** Otherwise (or on id miss), substring-contains match `anchor.quote_anchor.text` (≥40 chars) against the candidate's text content. First exact substring hit wins.
3. **Neither hits** → emit `{ success: false, error_enum: "anchor_orphaned" }`; do NOT mutate the artifact.

### Tests

- Per-skill contract: `plugins/pmos-toolkit/skills/requirements/tests/apply-edit-at-anchor.test.js` (5 cases: id-first happy, orphan, idempotent, infeasible, clarification).
- Wrapper: `tests/scripts/assert_apply_edit_at_anchor_requirements.sh`.
