---
name: requirements
description: Brainstorm, shape, and create a requirements document — problem definition, high-level solution direction, user journeys, research synthesis. First stage in the requirements -> spec -> plan pipeline. Auto-tiers by scope (bug fix / enhancement / feature). Use this skill when the user says things like "I have a feature idea", "let's brainstorm", "what should we build", "define what we need", "help me figure out the requirements", or shares initial thoughts about a problem to solve.
user-invocable: true
argument-hint: "<initial thoughts or observations to seed the requirements> [--feature <slug>] [--backlog <id>] [--depth brief|standard|deep] [--tier <N>] [--skip-folded-msf] [--non-interactive | --interactive]"
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

## Flags & natural language

Every option also has a natural-language form — infer it from the request; an explicit flag overrides. Canonical phrasings: "go deep on this" ≡ `--depth deep`, "keep it brief" ≡ `--depth brief`, "skip the UX pass" ≡ `--skip-folded-msf`. Two flags stay parsed for back-compat but are deliberately not advertised:

<!-- nl-sugar -->
- `--msf-auto-apply-threshold N` — confidence override for the folded-MSF apply-loop (default 80; semantics in `_shared/folded-phase.md`).
<!-- nl-sugar -->
- `--format <html|md|both>` — output-format override; `md`/`both` are retired values, treated as `html` (see Phase 0 step 7).

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

## Phase 0: Pipeline Setup (inline — do not skip) {#pipeline-setup}

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

7. **Resolve `output_format`.** Read `output_format` from `.pmos/settings.yaml` (default: `html`; valid values: `html`, `md` — legacy `both` is treated as `html`, retirement note in `_shared/html-authoring/README.md`). A `--format` argument-string flag overrides settings (last flag wins on conflict). Print to stderr exactly: `output_format: <value> (source: <cli|settings|default>)` once at Phase 0 entry.

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

## Phase 1: Intake & Tier Detection {#intake-tier-detection}

### Determine Input Mode

The user's input can take several forms. Handle each via mode-specific phase routing:

| Input Mode | What you receive | Phase routing |
|------------|-----------------|---------------|
| **Raw thoughts** | Rough observations, problem statement, or scattered ideas | Full flow (Phase 2 research → Phase 3 brainstorm → Phase 4 write) |
| **Existing doc update** | Path to existing `01_requirements.{html,md}` + new observations (resolver picks the format that exists) | **Skip Phase 2 full research**; read prior Research Sources and refresh only delta-relevant areas (Phase 2 update-path). Phase 3 brainstorm runs on the delta only. |
<!-- defer-only: ambiguous -->
| **Multiple text inputs** | Several pasted texts, screenshots, or references | **Add a synthesis step at the start of Phase 1**: synthesize all inputs into a coherent problem statement; confirm understanding via `AskUserQuestion`; then proceed to Phase 2 |
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
4. **Resolve the tier** per `_shared/tier-matrix.md` — the signal table, the `--depth` ↔ tier mapping, and carry-forward semantics live there. This skill's deltas:
   - `--tier <N>` (the machine passthrough `/feature-sdlc` sends when its tier is already resolved) → use it without re-asking; announce "Tier N carried forward from the orchestrator". Still scan the signals: if a strictly higher tier fires, escalate to it and note the divergence in the doc frontmatter — the orchestrator logs `child_tier_divergence` and does not override.
   - `--depth brief|standard|deep` (or its natural-language form) → maps to tier 1/2/3 and overrides signal detection.
   <!-- defer-only: ambiguous -->
   - Otherwise detect from the signal table, then **announce + confirm**: `This looks like a Tier N requirement ([type]). Using the [tier name] template. Override?` Use `AskUserQuestion` if ambiguous. **Confirm before creating tasks** (next step) — re-tiering after task creation forces a clean-and-recreate.
5. **Create phase tasks** using your available task tracking tool, scaled to the **confirmed** tier. Mark each task in-progress when you start it and completed when done.

| Tier | Tasks to create |
|------|----------------|
| **Tier 1** | Intake, Write Document, Final Review |
| **Tier 2** | Intake, Research (Code), Research (Industry), Brainstorm, Write Document, Review Loops, Final Review |
| **Tier 3** | Intake, Research (Code), Research (Industry), Brainstorm, **UX Analysis**, **Success Metrics**, **Alternate/Error Journeys**, Write Document, Review Loops, Final Review |

The tier also picks the document shape (templates in `reference/requirements-templates.md`):

| Tier | Sections | Length |
|------|----------|--------|
| **Tier 1** | Problem, Root Cause, Fix Direction, Acceptance Criteria, optional Decision/Open Questions/Investigated | ~0.5–1 page |
| **Tier 2** | Problem, Why Now, Goals (with measured-by), Non-Goals, Solution Direction, User Journeys, Design Decisions, Open Questions | ~1–2 pages |
| **Tier 3** | All Tier 2 sections + UX Analysis (Motivation/Friction/Satisfaction), Success Metrics table, Research Sources, alternate + error journeys | ~2–4 pages |

---

## Phase 2: Research {#research}

**Skip for Tier 1.** For Tier 2 and Tier 3, run both lenses below. Tier 3 goes deeper on the industry lens (more sources, more alternatives).

Dispatch subagents to explore (model: inherit — open-ended exploration of unfamiliar code and external sources, no deterministic validator behind it). **Subagent return schema** (each subagent must return):
1. **Summary** — ≤5 bullets capturing the most relevant findings.
2. **Sources table** — `| Path/URL | 1-line takeaway |` per row.
3. **Flagged gaps** — anything the subagent looked for but didn't find.

The parent agent merges by section without re-summarization. If summaries overlap, dedupe by source path/URL.

### Lens A — Existing Implementation & Patterns

- Search the codebase for features similar to what's being described.
- Read existing UI pages, API endpoints, and data models in the relevant area.
- Note user flows that already exist and how adjacent features work.
- Identify patterns, conventions, and constraints from the existing system.

### Lens B — Industry Research (Tier 2+)

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

## Phase 3: Collaborative Brainstorming {#brainstorming}

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

## Phase 4: Write the Document {#write-document}

**Emit per the `_shared/html-authoring/README.md` checklist** (template slot-fill, atomic write with the `.sections.json` companion, idempotent asset copy — which carries the inline-comments substrate, `comments.js` et al. — cache-busted asset URLs, index regeneration per `index-generator.md`). Deltas for this skill:

- **Artifact:** `{feature_folder}/01_requirements.html`.
- **`{{pmos_skill}}` = `requirements`** — the emitted `<meta name="pmos:skill" content="requirements">` is what the `/comments` resolver routes apply-edit dispatches on, so it MUST be set per-skill.
- **Heading ids:** every `<h2>`/`<h3>` carries a stable kebab-case `id` per the derivation rule in `_shared/html-authoring/conventions.md` §3 — stable ids let cross-doc anchors (`02_spec.html#fr-10`) survive regeneration. Enforced by `/verify` and CI (`assert_heading_ids.sh`).

### Pre-write safety

Before writing, run `git status` on `{feature_folder}/01_requirements.html`. **If the file is dirty (uncommitted changes), snapshot-commit before overwriting:**

```
git add {feature_folder}/01_requirements.html {feature_folder}/01_requirements.md
git commit -m "snapshot: pre-/requirements-rewrite"
```

(`git add` on a non-existent path is a no-op, so this works for legacy MD-only folders as well.) Then overwrite with the new content — git provides version history. Never silently overwrite a dirty artifact.

### Commit message verb

After the write, commit with a verb conditional on whether the file existed at Phase 1 entry:

- **Existed →** `docs: update requirements for <feature>`
- **Did not exist →** `docs: add requirements for <feature>`

### Templates

Use the template matching the confirmed tier from `reference/requirements-templates.md` (Tier 1 Bug/Minor Fix, Tier 2 Enhancement/UX Fix, Tier 3 Feature/Product Launch — plus the all-tiers Document Guidelines). Delete sections marked optional for that tier. The MD-shape templates are authoritative for content; the HTML rendering (sections + heading ids, per the reference file's note) applies on top.

---

## Phase 5: Review {#review}

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

### Final-loop polish lens (runs as part of the LAST loop only)

When the loop is producing only cosmetic findings, also run:
- **Conciseness** — Can sections be tightened without losing essence?
- **Coherence** — Any conflicting requirement statements?
- **New-person test** — Can someone new to the team understand what we're trying to achieve with no blind spots?

### Concrete ambiguity heuristics

A doc is unambiguous if **all** of the following hold:
- No `etc.` or `and more` — every list is exhaustive or labeled "examples".
- Every quantitative claim has a number ("most users" → "60% of users in Q2 study").
- Every `should` and `might` either becomes `must` or moves to Open Questions.
- No orphan pronouns — every `it`, `they`, `this` has a clear antecedent in the same paragraph.

### Findings presentation

Present every loop's findings per `_shared/findings-dispositions.md` (severity tags, the four dispositions, batching, non-interactive classification, platform fallback, edge cases). Deltas for this skill: deferrals go to the doc's Open Questions (the substrate default); after applying dispositions, update the Review Log row to cite them, then ask the user if they see additional gaps before declaring the loop complete.

### Review Log table (Tier 2-3)

Track every loop in the doc (Tier 1 skips the Review Log — single quick pass):

```
| Loop | Findings | Changes Made |
|------|----------|-------------|
```

After applying dispositions, commit: `git commit -m "docs: requirements review loop N for <feature>"`

### 6-gate exit (ALL must hold to stop reviewing)

1. **Both lenses ran** in the most-recent loop (structural + product-critique). For the loop you intend to be terminal, the polish lens also ran.
2. **Findings logged** — either listed under each lens, or explicitly noted as "no findings under lens X".
3. **Dispositions captured** for every finding via the interactive prompt tool (Fix/Modify/Skip/Defer).
4. **User explicitly confirmed** they have no further concerns. (Single yes/no — do NOT infer from silence or "looks good".)
5. **Decision coverage:** every non-trivial design choice from research/brainstorm appears as a Decision row OR an Open Question. (Tier 2 needs ≥1; Tier 3 typically ≥3 but not a hard floor.)
6. **Zero open clarifications** addressed to the user (no inline `[TODO]`, `[??]`, or open interactive prompts waiting for reply).

If any gate is unmet, run another loop. Do not self-declare exit.

---

## Phase 6: Folded MSF-req {#folded-msf}

This phase folds `/msf-req` into the pipeline as an apply-loop folding. **All mechanics — escape flag, tier gating, pre-apply clobber guard, auto-apply threshold, per-finding commits, failure capture + advisory continue, resume-via-git-log — follow `_shared/folded-phase.md`.** The heuristics it applies are `_shared/msf-heuristics.md` (motivation/friction/satisfaction). This folding's parameters:

- **Folded skill:** msf-req. **Escape flag:** `--skip-folded-msf` (machine-coupled; never renamed). Threshold override: `--msf-auto-apply-threshold N`.
- **Tier gating:** substrate default (Tier 1 skip, Tier 2 opt-in, Tier 3 default-on).
- **Host artifact** (apply-loop edit target and clobber-guard target): `{feature_folder}/01_requirements.html` — the just-written artifact, never a legacy `.md` path.
- **Per-finding commit message:** `requirements: auto-apply msf-req finding F<N>`.
- **State key:** `state.yaml.phases.requirements.folded_phase_failures[]`.
- **Findings doc:** `<feature_folder>/msf-req-findings.md` — never the legacy `msf-findings.md` slug. Deliberately Markdown: the folded run's findings are applied to the host artifact in-loop and this doc is a working log, while standalone `/msf-req` emits the reviewable `msf-req-findings.html` artifact (its own emit contract).

---

## Phase 7: Workstream Enrichment {#workstream-enrichment}

**Skip if Tier 1** (bug fixes don't reshape product understanding) **or if no workstream was loaded in Phase 0.** Otherwise this phase is mandatory — do not skip just because the core deliverable is complete.

Follow `_shared/pipeline-setup.md` Section C. For this skill, the signals to look for are:

- User segments mentioned in the requirements → workstream `## User Segments`
- Problem statements that refine the product's purpose → workstream `## Value Proposition` or `## Description`
- Success metrics → workstream `## Key Metrics`

---

## Phase 8: Capture Learnings {#capture-learnings}

Read and follow `_shared/learnings-capture.md` (relative to the skills directory) — the shared capture ceremony (read/summarize `~/.pmos/learnings.md`, reflect, propose 0–3 global + 0–3 repo-specific learnings, never auto-write). Reflect specifically on what this `/requirements` session surfaced under `## /requirements`.

When the session surfaced a non-obvious lesson worth keeping (repeated correction, surprising behavior, validated approach), emit one line: `Learning: <new entry written to ~/.pmos/learnings.md under ## /requirements>`. A smooth, routine session needs no line — run the ceremony, note nothing, move on.

---

## Phase 9: Handoff {#handoff}

Tell the user, scaling the message by tier:

- **Tier 1 / Tier 2:** "Requirements captured and committed. When ready, run `/spec` to create the detailed technical specification."
- **Tier 3:** "Requirements captured and committed. Optional next steps: `/creativity` (alternative angles), `/msf-req` (UX friction analysis). When ready: `/spec`."

If `--backlog <id>` was set and the doc + commit succeeded, invoke `/backlog set {id} source={doc_path}` per the Backlog Bridge contract above.

---

## Anti-Patterns (DO NOT)

- **The terminal state is handoff to `/spec`** — do NOT start writing a spec or implementation plan from this skill.
- Do NOT include implementation details (DB schemas, API routes, code) — that's the spec's job. Architecture-level diagrams dressed as "high-level approach" count: diagrams here depict user-observable behavior only.
- Do NOT default to generic B2B-SaaS competitors (Linear/Stripe/Notion) when researching — pick in-domain peers.
- Do NOT self-declare the 6-gate exit — gate 4 requires explicit user confirmation.

---

## Apply comment-resolver edit

This phase is the `/requirements` entrypoint that `/comments resolve` dispatches into when walking open threads in a requirements artifact's inline `pmos-comments` JSON block. The contract — input/output JSON shapes, closed `error_enum` set, idempotency rules, subagent invocation convention, anchor-resolution order (id-first → ≥40-char quote substring → `anchor_orphaned`, never mutating on a miss) — lives in the shared contract doc and is the single source of truth:

- **Contract (normative):** `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md`.

This section MUST cite that file rather than restate the contract. `/requirements`-specific implementation only:

- **Shim:** `plugins/pmos-toolkit/skills/requirements/scripts/apply-edit-at-anchor.js` — exports `apply(input)`, returns one of the three contract output shapes (success / failure / clarification). Success responses include the optional `applied_artifact` field (full post-edit HTML); the shim's minimal edit inserts an HTML annotation comment immediately before the resolved anchor element — real prose rewriting is deferred to a future release.
- **Tests:** per-skill contract test `plugins/pmos-toolkit/skills/requirements/tests/apply-edit-at-anchor.test.js` (5 cases: id-first happy, orphan, idempotent, infeasible, clarification); wrapper `tests/scripts/assert_apply_edit_at_anchor_requirements.sh`.

---

*Spec lineage: `docs/pmos/features/2026-05-08_requirements-refactor` (tier system, review gates, research lenses), `2026-05-10_pipeline-consolidation` (folded MSF-req), `2026-05-08_msf-skill-split` (findings slug), `2026-05-09_html-artifacts` + `2026-05-28_inline-html-artifacts` (HTML-primary emit, format retirement), `2026-05-23_inline-doc-comments` (comment resolver), `2026-05-08_non-interactive-mode` (mode block).*
