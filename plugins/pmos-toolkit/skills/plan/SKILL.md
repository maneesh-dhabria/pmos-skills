---
name: plan
description: Create an execution plan from a spec — deep code study, TDD tasks with inline verification, decision logging, risk assessment, and a concrete final verification checklist. Third stage in the requirements -> spec -> plan pipeline. Always full format. Use when the user says "break this into tasks", "create the implementation steps", "how do we implement this", or has a spec ready for task breakdown.
user-invocable: true
argument-hint: "<path-to-spec-doc> [--feature <slug>] [--backlog <id>] [--fix-from <task-id>] [--non-interactive | --interactive]"
---

# Implementation Plan Generator

Create a comprehensive, engineer-ready implementation plan from a spec. The plan must be good enough that a skilled developer with **zero codebase context** can execute it end-to-end without asking questions. This is the THIRD stage in a 3-stage pipeline:

```
/requirements  →  [/msf-req, /creativity]  →  /spec  →  [/simulate-spec]  →  /plan  →  /execute  →  /verify
                   optional enhancers                  optional validator     (this skill)
```

The plan translates a spec into **bite-sized, TDD-driven tasks** with exact file paths, exact commands, and inline verification at every step. It inherits architecture decisions from the spec and adds implementation-specific decisions.

Natural language is the primary interface: every option below has a natural-language equivalent ("re-plan from T5 onward" ≡ `--fix-from T5`, "add tasks without renumbering" ≡ Append mode) — infer the option from the request; an explicit flag overrides inference.

**Announce at start:** "Using the plan skill to create an implementation plan."

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** State your assumption, document it in the output, and proceed. The user reviews after completion.
- **No subagents:** Perform research and analysis sequentially as a single agent.
- **No Playwright MCP:** Note browser-based verification as a manual step for the user.

---

## Track Progress

This skill has multiple phases. Create one task per phase using your agent's task-tracking tool (e.g., `TaskCreate` in Claude Code, `TodoWrite` equivalent in older harnesses). Mark each task in-progress when you start it and completed as soon as it finishes — do not batch completions.

---

## Backlog Bridge

This skill optionally integrates with `/backlog`. See `plugins/pmos-toolkit/skills/backlog/pipeline-bridge.md`.

**At skill start:**
- If `--backlog <id>` was passed: load the item file as supplementary context.

**At skill end (after writing the plan doc):**
- If `<id>` was set, invoke `/backlog set {id} plan_doc={doc_path}`, then `/backlog set {id} status=planned`. On failure, warn and continue.
<!-- defer-only: ambiguous -->
- Run the auto-capture flow per `pipeline-bridge.md`: detect deferred-work bullets in the plan output, propose them as new backlog items via `AskUserQuestion`. On user confirmation, invoke `/backlog add` for each with `source:` pre-filled.

---

## Phase 0: Pipeline Setup (inline — do not skip) {#pipeline-setup}

Use workstream context (loaded by step 3 below) to inform task design — tech stack, constraints, and deployment patterns shape implementation planning.

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

### Phase 0 — additional /plan steps (after the canonical block above)

7. **Concurrency guard.** If `{feature_folder}/.plan.lock` exists, warn the user that another /plan run may be in progress and confirm before proceeding (in `--non-interactive` mode, note the stale lock in `03_plan_auto.md` and proceed). Write the lockfile on entry; delete it on exit.
8. **Validate the spec.** Locate it via `_shared/resolve-input.md` with `phase=spec`, `label="spec"` — missing spec → platform-aware error (via `_shared/platform-strings.md`) with `Run /spec first.` appended. Refuse if the spec frontmatter is malformed YAML or missing `tier:` — tell the user to fix the frontmatter or re-run /spec.
9. **Resolve `output_format`** from `.pmos/settings.yaml` (default `html`; `both` is retired — treat it as `html`). State the resolved format and its source (cli / settings / default) once at Phase 0 entry.
   <!-- nl-sugar -->
   `--format <html|md>` (or "emit markdown too") overrides settings; last flag wins on conflict.

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

## Phase 1: Intake {#intake}

1. **Use the spec located in Phase 0 step 8.**
<!-- defer-only: ambiguous -->
2. **Read the spec end-to-end.** Summarize it back in 3-5 bullets and confirm understanding with the user via AskUserQuestion.
3. **Read `tier` and `type` from the spec frontmatter.** The tier was detected upstream and carries forward per `_shared/tier-matrix.md` — announce it, don't re-ask. Tier gating in Phase 3 / Phase 4 keys off `{tier}`; per-task TDD precedence keys off `{type}`.
<!-- defer-only: ambiguous -->
4. **Surface simulate-spec findings.** Glob `{feature_folder}/02_simulate-spec_*.md`. If a file exists with unresolved findings, run a batched `AskUserQuestion` per finding before proceeding — options: **Update spec to address before planning** / **Treat as Open Question in plan** / **Accept as risk** / **Skip — already resolved upstream**.
5. **Check for an existing plan.** Use `_shared/resolve-input.md` with `phase=plan`, `label="prior plan"` to locate either `{feature_folder}/03_plan.html` (preferred) or `{feature_folder}/03_plan.md` (legacy fallback).
   - If found: read it, ask if this is an update or fresh start.
   - If not found: proceed.
6. **Defect-driven re-plan (`--fix-from <task-id>`).** /execute writes `{feature_folder}/03_plan_defect_<task-id>.md` when a task fails for plan reasons, and names this invocation. Read the defect file; if it does not exist, refuse with a platform-aware error: `No defect file found at {path}. /execute writes this file on planning defect; nothing to fix from.` Enter Edit mode scoped to the named task; do not regenerate untouched tasks. Widen the scope when the user asks — "the root cause is upstream, re-plan from T3" moves the rewrite start upstream; "this contract change ripples into later phases" extends the rewrite into downstream phases.
   <!-- nl-sugar -->
   (`--widen-to <upstream-task-id>` and `--cross-phase-downstream` are parsed as explicit spellings of those two requests.)

**Scope check:** If the spec covers multiple independent subsystems, suggest breaking this into separate plans — one per subsystem. Each plan should produce working, testable software on its own.

**Gate:** Do not proceed until you have confirmed your understanding of the spec with the user.

---

## Phase 2: Deep Code Study {#code-study}

Study the existing code that will be impacted. This is NOT a skim — you must read the actual files.

1. **Identify impacted surfaces.** From the spec, list every file, module, database table, API endpoint, and UI page that will be created or modified.
2. **Read each impacted file.** For existing files, note:
   - Current structure and patterns used
   - How similar features were implemented (look for precedent)
   - Test files that cover the impacted code
   - Integration points with other modules
3. **Read adjacent code.** Check imports, callers, and consumers of the code you'll modify.
4. **Check project conventions.** Read `CLAUDE.md`, `.claude/rules/`, and recent commits for patterns to follow.
5. **Trace data flow pipelines.** If the feature involves a write→read pipeline (search indexing, sync, export, import, queue, cache, aggregation), verify the full chain exists: write entry point → storage target → read entry point. Grep for each link. If any link is missing, add a task to implement it. (Skip for purely CRUD or purely UI features.)
6. **Read wireframes (if present).** Check `{feature_folder}/wireframes/` for HTML wireframes. If present, open each affected screen and note what the wireframe specifies. Treat wireframes as **reference, not specification**:

   - **Authoritative for:** IA, screen inventory, component presence, copy and labels, state coverage (loading/empty/error/success), navigation entry/exit, journey shape. Tasks must implement these.
   - **NOT authoritative for:** visual style, color, typography, spacing, iconography, component library. Tasks should adapt the wireframe to the host app's existing design system and conventions — never copy visual treatment verbatim when it conflicts with the host app.

   Every UI task in Phase 3 must cite the wireframe(s) it implements via a `**Wireframe refs:**` field — same discipline as `**Spec refs:**`. This preserves the wireframe→implementation→verification chain for /verify Phase 4 sub-step 4f. If the host app has established patterns that differ from the wireframe's visual treatment, the task should explicitly say "follow host-app convention X" rather than "match wireframe."
7. **Identify the tracer-bullet candidate.** Scan the spec for the narrowest user-observable behavior — the smallest end-to-end path through every layer the feature touches; if several qualify, pick the one through the riskiest unproven integration point (a new protocol, an unfamiliar library, a cross-service handshake). Record a one-line note in Code Study Notes: `Tracer-bullet candidate: <narrowest behavior> — exercises <layers>; risk it derisks: <unproven integration>.` Phase 3 builds T1 against this candidate (see §Vertical-Slice Decomposition).
8. **Detect stack signals.** Glob host-repo root for manifest files: `package.json`, `Gemfile`, `go.mod`, `requirements.txt`, `pyproject.toml`, `Cargo.toml`, `pom.xml`, `composer.json`, `docker-compose.yml`, `Makefile`, `Dockerfile`. Compute file-count weight per stack; ties break alphabetically (in `--non-interactive` mode, log the tiebreak to `03_plan_auto.md`). Log signals to a "Stack signals" subsection of Code Study Notes.

   **JS-stack lockfile disambiguation:** `package-lock.json` → npm; `pnpm-lock.yaml` → pnpm; `yarn.lock` + no `.yarnrc.yml` → yarn-classic; `yarn.lock` + `.yarnrc.yml` → yarn-berry; `bun.lockb` → bun. When `package.json` is present with no lockfile, default to npm and surface as a low-risk Phase 4 finding.

   <!-- defer-only: ambiguous -->
   **Stack-ambiguity prompt** — interactive mode only: if signals are mixed (e.g., monorepo with both npm and python), surface via `AskUserQuestion`: `Detected mixed stack signals. Pick the primary for plan generation:` with options `<stack-1>` / `<stack-2>` / `Mono-repo: pick all` / `Other`.

   **Greenfield substitute.** When no signals are observed, choose a reference system — the closest existing system you can cite — and record the choice in Code Study Notes. Structural choices should be justified against ≥1 reference system; absence of stack signals is not a license to invent.

9. **Peer-plan conflict scan.** Glob `{docs_path}/features/*/03_plan.{html,md}` (excluding the current feature folder). Filter by frontmatter `status` ∈ {`Draft`, `Planned`, `Executing`}. Grep each peer plan for impacted file paths from step 1. On match, add a Risks-table row + an Open Question.

10. **Wireframe coverage.** If `{feature_folder}/wireframes/` exists, every `*.html` file under it must be referenced by ≥1 task's `**Wireframe refs:**` field OR listed in a `## Wireframes Out of Scope` subsection of the plan. When no UI signal is detected (no UI tasks in the spec) but the wireframes folder exists, auto-emit `## Wireframes Out of Scope` with all wireframes listed.

<!-- defer-only: ambiguous -->
11. **Spec re-open during planning.** When Phase 2 code study contradicts a spec decision (e.g., spec says "use Postgres" but `docker-compose.yml` shows MySQL), halt via `AskUserQuestion`: `Spec decision conflicts with repo standard. {Spec text} vs {observed standard}. How to resolve?` Options: **Halt /plan and update spec** (terminates this run; user re-runs /spec then /plan) / **Document override in spec via Decision Log entry** (open spec, add the entry citing the divergence with rationale, save, continue planning) / **Accept spec as-is despite divergence** (record decision in plan's Decision Log; proceed with spec's choice) / **Skip — not actually a conflict**. In `--non-interactive` mode this is a high-risk decision with no Recommended option → follow the non-interactive halt protocol (see "Operational Modes").

12. **Summarize findings** in a "Code Study Notes" section for the plan.

**Gate:** You must have read every impacted file before writing a single line of the plan.

---

## Phase 3: Write the Plan {#write-plan}

**Emit per `_shared/html-authoring/README.md` checklist.** Deltas: artifact = `03_plan.html` (+ companion `03_plan.sections.json`), `{{pmos_skill}}` = `plan`, save path = `{feature_folder}/`, asset prefix = `assets/`. Overwrite an existing plan in place. The checklist's asset copy ships the inline-comments overlay (`comments.js` + launchers) along with the viewer assets — the checklist owns that list; do not restate it here.

### Tier Gates (Phase 3 emission rules per `{tier}` from Phase 1)

Tier boundary semantics and the detect-once rule live in `_shared/tier-matrix.md`; the bullets below are /plan's per-artifact reaction:

- **Tier 1 (bugfix):** ≥1 task floor; **no Decision-Log floor** (skip the table when there is exactly one obvious fix); reduced TN = `T0 + lint + test + Done-when walkthrough`.
- **Tier 2 (enhancement):** ≥1 Decision-Log entry; 1 review loop; Risks and Rollback are optional unless triggered by content; full TN.
- **Tier 3 (feature):** ≥3 Decision-Log entries; 2–4 review loops; mandatory Risks table; Rollback is conditional on data/deploy involvement; full TN.

**Done-when rules (all tiers):** the `**Done when:**` line states lower bounds and qualitative gates only, and MUST include ≥1 quantitative or executable assertion — e.g., "all 17 tests pass", "lint exits 0", "p95 < 500ms". The plan MUST include a "Done-when walkthrough" — a concrete narrative tracing the Done-when line through the system (replaces the legacy "Manual spot check" line).

### Code Study Notes structure

The `## Code Study Notes` section MUST contain four subsections — each may be marked "None observed" but cannot be omitted:

- `### Patterns to follow` — with `file:line` refs
- `### Existing code to reuse` — file paths + one-line responsibility
- `### Constraints discovered` — gotchas, hidden invariants
- `### Stack signals` — the per-stack signals from Phase 2 step 8

### Readability promise

The plan must be executable by a developer with the codebase open but no prior conversation context. The plan inlines decisions and exact paths; the codebase remains source of truth for conventions.

### Glossary inheritance

The plan inherits its glossary from the spec via citation (`see 02_spec.{html,md} §X for glossary`) and introduces no new domain terms. Phase 4 treats a novel domain term as a finding — low-risk if a re-word fits existing vocabulary; high-risk if the concept is genuinely new (route through spec).

### Tests are illustrative

Plan-emitted tests are illustrative reference shape, not literal. /execute may adapt to host conventions (fixture names, framework version, helper signatures). Phase 4 checks shape preservation (same inputs/outputs/assertions), not literal text match.

### Plan Document Structure

The full plan document skeleton — including the per-task (T1 / TN) templates — lives in [`reference/plan-templates.md`](reference/plan-templates.md). **Read that file and emit the structure** as the plan body, applying the Tier Gates above. Do not re-derive the skeleton from memory — the reference file is the source of truth.

### Task Design Rules

#### Vertical-Slice Decomposition

**Rule.** Each task is a thin **vertical slice** that cuts through every layer it needs (schema, API, UI, tests) to deliver one user-observable behavior end-to-end. A horizontal cut — a task that touches only one layer — is the wrong shape. Slices may be **narrow**: hardcoded inputs, single-row fixtures, one happy-path branch are fine in early slices; widen in subsequent tasks.

**Tracer bullet (T1).** The first task is a **tracer bullet** — the minimal end-to-end path that proves the architecture works. Prefer the narrowest, dullest, hardcoded-where-needed slice that still exercises every integration layer the feature touches. The point of T1 is not to deliver value; it is to prove that the chosen architecture survives contact with reality. Risky unproven integration points (a new protocol, an unfamiliar library, a cross-service handshake) MUST be inside T1's path. If the spec has multiple narrow end-to-end candidates, pick the one that exercises the riskiest unproven point.

**Preference.** Prefer **many thin slices** over few thick ones. A plan with 8 tasks where T1-T2 ship a working tracer bullet beats a plan with 4 fat tasks where nothing is end-to-end until T4.

**Done-when (per slice).** A completed slice is independently demoable or verifiable on its own. The check: could you ship just this slice and it would still be a coherent (if narrow) improvement? If the answer requires "wait for the next task to land," the slice is too horizontal.

**Exception path.** Refactors, schema-only spikes, pure-CSS changes, and config/IaC tasks cannot be vertical — there is no end-to-end behavior to deliver. Such tasks MUST declare the exception with a one-line rationale in the **Slice shape** field (see below). A task without an explicit exception declaration is assumed to be a vertical slice.

**Slice shape field.** Each task MAY include a `**Slice shape:** vertical | refactor-prep | spike | css-only | config` field. When omitted, `vertical` is assumed. Non-vertical tasks MUST include the field with a one-line rationale, e.g., `**Slice shape:** refactor-prep — extracts the auth helper T3's vertical cut depends on.` Phase 4 review enforces this.

This section is the single home of the vertical-slice rule — every other mention (Phase 2 step 7, structural checklist, anti-patterns, phase groupings) points here.

#### Optional: `## Phase N` Groupings (for large plans)

For plans with **more than ~12 tasks**, group tasks under `## Phase N: <name>` headings. Each phase boundary triggers full `/verify` + a `/compact` handshake when /execute reaches the end of the phase (see `execute/SKILL.md` Phase 2a).

**Template:**

```markdown
## Tasks

## Phase 1: Tracer bullet — single record end-to-end
[Phase rationale: prove the full request → persistence → render path for one record with hardcoded inputs; riskiest integration points inside this slice; demoable at phase end.]

### T1: ... (tracer bullet — minimal end-to-end path)
### T2: ... (widen T1 with realistic input validation)

## Phase 2: Widen — list, filter, edit
[Phase rationale: with the skeleton proven, widen read and mutate paths — each task still a user-observable vertical slice.]
```

**Rules:**
- Phases are **optional**. Plans ≤ 8 tasks should skip them.
- Each phase boundary triggers **full /verify** (multi-agent code review + interactive QA) — slow. Make phases **deployable slices** of 5–10 tasks. Avoid 1–2 task phases (verify cost dwarfs the work).
- Phases are contiguous: a task belongs to exactly one phase; phase numbering starts at 1; no gaps. Phase 1 always begins at T1.
- Phases group **vertical slices**, not layers — see §Vertical-Slice Decomposition.

Plans without `## Phase N` headings continue to work — /execute treats them as a single implicit phase verified once at the end.

**TDD (red/green):** Every task that produces code must follow: write failing test -> verify it fails -> implement -> verify it passes -> commit. Show the actual test code, not "write a test for X."

**Bite-sized steps:** Each step is one action (2-5 minutes). Tasks map to ~1 hour of work. Steps within tasks map to ~1-5 minutes.

**Per-task spec refs:** Every task MUST cite which spec sections or FR-IDs it implements. Format: `**Spec refs:** FR-01, FR-02, Section 10.2`

**No placeholders:** Every step must contain the actual content. These are plan failures — never write them:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "handle edge cases"
- "Write tests for the above" (without actual test code)
- "Similar to Task N" (repeat it — tasks may be read independently)
- Tests that only verify existence or status codes without asserting on actual data and behavior

**Exact file paths** in every task. **Exact commands** with expected output in every verification step.

**Incremental verification:** Every task has an "Inline verification" section. Do not batch all testing to the end.

**Prescribe the interface, leave the implementation:** Specify function names, signatures, test assertions, file paths, and commands. Leave internal algorithm details and refactoring decisions to the implementor.

**Task code block size:** if a single task's pasted code block exceeds ~80 lines, choose one of: (a) split the task into smaller tasks, (b) reference an external scratch file the implementor opens, or (c) prescribe the interface and let the implementor write the body. Long pasted code blocks bias plan length and substitute for engineering judgment.

### Verification Must Prove Behavior

Every task's verification must answer: **"If the implementation had a subtle bug, would this catch it?"** If not, the verification is structural (proves existence) not behavioral (proves correctness) — and that's a plan failure.

**The litmus test:** Could the implementation be wrong in a plausible way and still pass this verification? If yes, the verification is insufficient — add behavioral tests until every plausible failure mode is covered. The goal is not "at least one behavioral test" — it is **enough behavioral tests to prove the feature works end-to-end**.

A good task verification has two parts:
1. **Automated tests** — assert on behavior with realistic data, not just status codes or "it compiles." Write as many as needed to cover the task's functionality: happy paths, edge cases, relationship loading, data integrity.
2. **Proof-of-life check** — exercises the feature end-to-end (curl, CLI run, manual browser check) with exact expected output

**Common structural-only verifications to avoid (plan failures):**

| Task type | Structural (proves existence only) | Behavioral (proves correctness) |
|-----------|-------------------------------|--------------------------------|
| API endpoint | `assert status == 200` on empty DB | Seed/use real data, assert response body has correct fields, relationships populated, enums as strings |
| DB migration | migration-up command succeeds | Query tables, verify constraints reject bad data, verify seed data values (not just counts) |
| Frontend component | `npm run build` passes | Mount with realistic props and assert rendered output; or explicit manual step: "navigate to /path, verify X renders, click Y, verify Z" |
| Infrastructure | `docker compose config` parses | Start service, verify it connects to dependencies, verify port binding with actual request |
| CLI command | `--help` exits 0 | Run with real inputs, assert on output content |
| Config/schema | Import doesn't error | Instantiate with realistic values, assert fields, verify integration with consuming code |

When writing a task's test step, check: does the test use realistic data and assert on the actual output shape and content? A test that passes against an empty database or with no assertions on the response body is not a behavioral test.

### Decision Log Rules

Capture every non-trivial implementation choice (entry floors per Tier Gates above):
- Task ordering decisions
- TDD vs implement-then-test for specific areas
- Where to put functions/files
- Which existing patterns to follow
- What to defer vs include

Each entry MUST have "Options Considered" and "Rationale."

---

## Phase 4: Review Loops {#review-loops}

After writing the initial plan, review it in iterative loops. Tier-2 plans typically converge in 1 loop; Tier-3 in 2–4. The loop bound of 4 is a **cost governor, not a quality gate** (a call-site delta to `_shared/reviewer-protocol.md`'s default 2-loop cap): stop looping when a pass finds only cosmetic issues. The final loop doubles as the conciseness / spec-coverage / coherence pass — there is no separate review phase after this one.

<!-- defer-only: ambiguous -->
**Bound hit (interactive):** if loop 4 still produces findings, surface via `AskUserQuestion`: `Review-loop bound reached (4 loops). Findings still open. How to proceed?` Options: **Continue** (one more loop) / **Accept and proceed** (fold remaining findings into Open Questions, ship as-is) / **Abandon** (stop without declaring the plan ready; tell the user what state the file is in).

**Bound hit (non-interactive):** auto **Accept and proceed**, AND insert a `## Convergence Warning` section at the **top of the plan body** (not a sidecar — visibility to /verify and humans is the priority) listing the open findings that were dropped.

### What may be auto-applied

Auto-apply only mechanical fixes: typos, formatting, a missing command in a verification step where the answer is unambiguous, a wireframe-ref addition when the file is unambiguous. Anything that changes task structure, dependencies, scope, sections, or decisions goes to the user. **When unsure, escalate** — never auto-apply an ambiguous finding. Re-check auto-applied fixes in the next loop, not within the same one.

### Loop 2 — blind subagent review

Loop 1 is self-review (both checklists below). Loop 2, if reached, dispatches a fresh reviewer subagent given **only** the plan + spec, per `_shared/reviewer-protocol.md` (chrome-strip input, `sections_found` + quote-grounded findings, parent-side validation; call-site delta: /plan's loop bound is 4, not the default 2). The dispatch inherits the parent model — blind design review is genuine judgment, not mechanical extraction. On platforms without subagents, or when /plan is itself running as a subagent, fall back to a self-review with the prompt "review as if seeing this for the first time."

### Skip list

When the user picks `Skip` or `Defer` on a finding, append a one-line summary (finding + disposition + date) to `{feature_folder}/03_plan_skip-list.md` — a plain accumulating bullet list. On later runs, read it first and don't re-raise findings that match a skipped entry (best-effort text match — a false re-raise costs the user one click). The list is preserved across Edit / Replan / Append runs; clear it only when the user asks.
<!-- nl-sugar -->
(`--reset-skip-list` is the explicit spelling of "clear the skip list".)

### Review log sidecar

Detailed loop-by-loop findings live in `{feature_folder}/03_plan_review.md`, appending a `## Loop N` block per loop across runs. The plan body's `## Review Log` table is a summary index pointing at the sidecar.

### Mechanical hard-fails

Two checks are cheap, deterministic, and hard-fail the loop:

1. **Broken refs:** any task's `**Spec refs:**` citing a `02_spec.{html,md}#anchor` that does not resolve against the spec's heading ids is a high-risk finding. This check feeds /verify's re-check downstream.
2. **Unmitigated High risks:** any High-severity row in the Risks table that lacks a per-task Mitigation citation.

**Spec drift (advisory):** at review time, re-read the spec's frontmatter date and section list; if the spec changed since Phase 1, raise a high-risk finding — re-run /plan or record the divergence as a Decision Log entry.

### Two Types of Review

Each loop runs BOTH checks:

**A. Structural Checklist** (catches missing/incomplete tasks):
1. Every spec section / FR-ID mapped to a task?
2. Every task has inline verification with exact commands?
3. TDD red/green in every task that produces code?
4. Exact file paths in every task?
5. Exact commands with expected output in every verification step?
6. No placeholder language anywhere?
7. **Type consistency:** Do types, method signatures, and property names used in later tasks match what was defined in earlier tasks? A function called `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 is a plan bug.
8. Final verification task is concrete and complete?
9. **Verification quality:** Does every task's test assert on behavioral output with realistic data — not just status codes, exit codes, or "it compiles"? Apply the litmus test: could a subtly broken implementation still pass?
10. **Wireframe linkage:** If `{feature_folder}/wireframes/` exists, does every UI-touching task cite a `**Wireframe refs:**` line? Tasks without wireframe refs are gaps unless the task is non-UI.
11. **Final-verification polish coverage:** Does TN include the hard-reload-every-route step, the force-an-error-path step, the UX polish checklist line, and (if wireframes exist) the wireframe diff line?
12. **Refactor-before-modify:** Does any task modify a function whose existing structure isn't preserved by the modification? If yes, the prerequisite refactor must be its own numbered sub-step before the additive change.
13. **Vertical-slice shape:** Is each task a vertical slice or a declared `**Slice shape:**` exception, is every `## Phase N` grouping a deployable slice (not a layer), and is T1 a tracer bullet? Any miss is a finding — the rule and its exception taxonomy live in Phase 3 §Vertical-Slice Decomposition.

**B. Design-Level Self-Critique** (catches wrong/shallow task decomposition):
1. **Reviewer perspective:** If you were sent this plan for review, what comments would you add? Read it as a critical reviewer, not the author — flag tasks with unclear scope, missing verification steps, implicit dependencies, and assumptions about what's "obvious."
2. Are there tasks that are too large (>1 hour of focused work) and should be split? Are there tasks that are trivially small and should be merged?
3. Are there implicit dependencies between tasks that aren't reflected in the ordering? Would an engineer hit a blocker mid-task because a prerequisite wasn't completed?
4. Does the task ordering minimize context-switching? Are related changes grouped together?

### Loop Protocol

1. Run BOTH checklists above
2. Log findings in the Review Log table
<!-- defer-only: ambiguous -->
3. **Present findings per `_shared/findings-dispositions.md`** (severity tags, ≤4-finding batches via `AskUserQuestion`, the four dispositions, platform fallback). /plan deltas: Skip/Defer dispositions also append to the skip list above; mechanical fixes within "What may be auto-applied" may be applied without a prompt and reported in the loop summary.
4. Apply the user's dispositions, fix issues inline — do NOT create a new file
5. Commit: `git commit -m "docs: plan review loop N for <feature>"`

### Exit Criteria (ALL must be true)

- Every spec section / FR-ID maps to a task (zero gaps)
- Decision log meets its tier floor, every entry with rationale
- No placeholder language exists anywhere
- Every task has inline verification with exact commands
- Final verification task includes all applicable items
- Last loop found only cosmetic issues
- **User has confirmed they have no further concerns** (do not self-declare exit)

---

## Operational Modes

Mode is auto-detected from the existing-plan state plus the Phase 1 step 5 prompt; say what you want in plain language ("update T4", "throw the tasks away and re-plan", "add tasks for the spec amendment without renumbering"):

- **Fresh** — no existing `03_plan.{html,md}`. Generate from scratch.
- **Edit** — bounded re-write of a single task or task-range (also entered via `--fix-from`); preserve untouched tasks verbatim including their step bodies.
- **Replan** — discard existing tasks; preserve Decision Log + Risks (discard them too only when the user says so). Skip list preserved.
- **Append** — add new tasks at the bottom (TN+1, TN+2, …) without renumbering existing tasks; the final-verification task moves to stay last. Useful for spec amendments mid-execution.
<!-- nl-sugar -->
(`--edit`, `--replan`, `--append`, and `--reset-decisions` are parsed as explicit spellings of the above.)

### Non-interactive halt protocol

<!-- defer-only: ambiguous -->
Under `--non-interactive` (resolved by the Phase 0 block, which owns mode resolution and routing), choices follow `(Recommended)` options via `AskUserQuestion` classification. /plan's layer on top: when a **high-risk decision has no Recommended option** —
- **Halt** with exit code 2.
- Write `{feature_folder}/03_plan_blocked.md` containing the question, options considered, and a one-line "what changed" hint.
- The user resumes by re-running /plan interactively and answering the blocked question.

`--non-interactive` also writes an audit sidecar `{feature_folder}/03_plan_auto.md` listing every Recommended pick the run made.

### Sidecars

/plan writes up to four sidecar files in `{feature_folder}/` (write each whole-file via temp-then-rename so a crash never leaves a half-written sidecar):

| Sidecar | When written | Lifecycle |
|---------|--------------|-----------|
| `03_plan_review.md` | Always | Accumulates `## Loop N` blocks across runs |
| `03_plan_skip-list.md` | On Skip/Defer dispositions | Accumulates across runs; cleared only on user request |
| `03_plan_auto.md` | `--non-interactive` only | Overwritten per run (audit of Recommended picks) |
| `03_plan_blocked.md` | Non-interactive halt | Overwritten per run; deleted on next successful interactive resume |

### Learnings consumption

`~/.pmos/learnings.md` entries under `## /plan` are loaded in Phase 0 step 6 (canonical block). When a learnings entry conflicts with this skill body, the skill body wins; surface the conflict to the user before applying the skill rule. In `--non-interactive` mode, log the conflict to `03_plan_auto.md` and apply the skill rule without prompting.

---

## Phase 5: Workstream Enrichment {#workstream-enrichment}

**Skip if no workstream was loaded in Phase 0.** Otherwise, follow `_shared/pipeline-setup.md` Section C. For this skill, the signals to look for are:

- Technical dependencies discovered → workstream `## Tech Stack`
- Infrastructure details → workstream technical context sections

This phase is mandatory whenever Phase 0 loaded a workstream — do not skip it just because the core deliverable is complete.

---

## Phase 6: Capture Learnings {#capture-learnings}

**This skill is not complete until the learnings-capture process has run.** Read and follow `_shared/learnings-capture.md` (relative to the skills directory) now. Reflect on whether this session surfaced anything worth capturing — surprising behaviors, repeated corrections, non-obvious decisions. Proposing zero learnings is a valid outcome for a smooth session; the gate is that the reflection happens, not that an entry is written.

---

## Phase 7: Closing Report {#closing-report}

After the plan is written and reviewed:

**Commit:**

```
git add {feature_folder}/03_plan.html {feature_folder}/03_plan.sections.json {feature_folder}/03_plan.md {feature_folder}/03_plan_review.md {feature_folder}/03_plan_skip-list.md {feature_folder}/index.html {feature_folder}/assets
git commit -m "docs: add implementation plan for <feature>"
```

(Sidecars are committed alongside the plan when present; the commit subject names the feature, not the task numbers.)

**Report to user:**

- Plan location
- Task count + tier
- Key decisions (top 3 from decision log)
- Open risks flagged
- Sidecar paths if non-empty (`03_plan_review.md`, `03_plan_skip-list.md`, `03_plan_auto.md`, `03_plan_blocked.md`)

**/backlog write-back:** if the plan was generated with `--backlog <id>`, set the backlog item's status to `planned` and write `plan: <feature_folder>/03_plan.{html,md}` (whichever was the primary write) per `backlog/pipeline-bridge.md` (the bridge contract owns the write-back, /plan invokes it).

**Execution-mode selection.** Before the closing offer, ask the user how `/execute` should run, with a one-line description of each option:

`AskUserQuestion`:
```
question: "How should /execute run this plan?"
options:
  - Inline execution (Recommended)
    description: One agent works the plan task-by-task in this session — simplest, lowest token cost.
  - Subagent-driven execution
    description: A fresh subagent per task; independent tasks run in parallel waves; each task gets a spec + code-quality review — faster on wide plans, higher token cost.
```

Record the choice in the plan doc's frontmatter `execution_mode:` (`inline` or `subagent-driven`; default `inline`) and re-commit the plan if it changed. `/execute` reads this (it also accepts an explicit `--subagent-driven | --inline` override), and `/feature-sdlc` Phase 6 reads it to decide whether to pass `--subagent-driven`. In `--non-interactive` mode the Recommended option (`inline`) is auto-picked per the non-interactive classifier.

**Closing offer (platform-aware via `_shared/platform-strings.md`):** read `execute_invocation` for the active platform and emit the offer with that string substituted; **append ` --subagent-driven` to the invocation when `execution_mode == subagent-driven`**. e.g. claude-code with `execution_mode: inline`: `Plan complete and saved. Run /pmos-toolkit:execute to implement it, or review the plan first?` — and with `execution_mode: subagent-driven`: `Run /pmos-toolkit:execute --subagent-driven to implement it, or review the plan first?`. The offer wording is otherwise identical across platforms.

---

## Anti-Patterns (DO NOT)

- Do NOT write the plan without reading impacted code first
- Do NOT skip the decision log or write entries without rationale
- Do NOT create a new plan file in each review loop — update the original
- Do NOT claim the plan is complete without sharing review findings with the user
- Do NOT violate the Task Design Rules above — exact commands with expected output, inline verification per task (never batched to the end), behavioral tests with realistic data, interfaces prescribed and internals left to judgment
- Do NOT combine unrelated changes into a single task — each task should be independently committable
- Do NOT forget the "Done when" one-liner — it defines what success looks like for the whole plan
- Do NOT skip the Cleanup subsection in final verification — temp files, containers, and debug logging accumulate
- Do NOT omit `**Wireframe refs:**` on UI tasks when wireframes exist, and do NOT instruct tasks to copy the wireframe's visual style verbatim — the authoritative/not-authoritative split is in Phase 2 step 6; the ref is what carries polish expectations into /verify Phase 4 sub-step 4f
- Do NOT let TN's frontend smoke test stop at "renders correctly" — it must include hard-reload, an error-path probe, the UX polish checklist, and (if wireframes exist) a wireframe diff. Polish belongs in the plan, not as a verify afterthought.
- Do NOT create `## Phase N` groupings of 1–2 tasks — each phase boundary triggers full /verify, which dwarfs the implementation cost of a tiny phase. Target 5–10 tasks per phase, or skip phases entirely for small plans.
- Do NOT skip the execution-mode selection question (Inline vs Subagent-driven) at close — the recorded `execution_mode:` frontmatter value is what `/execute` and `/feature-sdlc` Phase 6 read; omitting it silently forces inline everywhere.
- Do NOT decompose by layer — see Phase 3 §Vertical-Slice Decomposition for the rule, the tracer bullet, and the only legitimate exceptions.

---

## Apply comment-resolver edit

This is the `/plan` entrypoint that `/comments resolve` dispatches into when walking open threads in a plan artifact's inline `pmos-comments` JSON block. The contract — input/output JSON shapes, closed `error_enum` set, idempotency rules, subagent invocation convention — lives in the shared contract doc and is the single source of truth:

- **Contract (normative):** `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md`.

This section MUST cite that file rather than restate the contract. Anything below is `/plan`-specific implementation guidance only.

### When invoked

The resolver dispatches a subagent with the contract's input JSON. The subagent's tools include this skill's Node shim, `plugins/pmos-toolkit/skills/plan/scripts/apply-edit-at-anchor.js` — `apply(input)` returns the contract's three output shapes; its anchor resolution (id-first, then ≥40-char substring-contains quote-fallback, else `anchor_orphaned` with no mutation) is documented in the shim's own header. The shim's minimal edit inserts an HTML annotation comment immediately before the resolved anchor element — real prose rewriting is deferred to a future feature.

### Tests

- Per-skill contract: `plugins/pmos-toolkit/skills/plan/tests/apply-edit-at-anchor.test.js` (5 cases: id-first happy, orphan, idempotent, infeasible, clarification).
- Wrapper: `tests/scripts/assert_apply_edit_at_anchor_plan.sh`.

---

*Spec lineage: `docs/pmos/features/2026-05-08_plan-skill-redesign` (v2 redesign — tier gates, review loops, operational modes, sidecars, fix-from), `2026-05-13_plan-vertical-slices` (vertical-slice decomposition), `2026-05-08_non-interactive-mode` (inline block + halt protocol), `2026-05-23_inline-doc-comments` / `2026-05-28_inline-html-artifacts` (comment resolver, inline comments), `2026-05-09_html-artifacts` (emit substrate). Traceability for individual rules lives in those feature folders, not inline here.*
