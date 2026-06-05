---
name: verify
description: Post-implementation verification gate — ALWAYS run after /execute completes. Lint, test, deploy, spec compliance, multi-agent code review, interactive QA, and regression test hardening. Also run after manual coding or partial work. Works with git commits, no PR required. Use when the user says "check my work", "is this done", "verify the implementation", "did I miss anything", or "review and test everything".
user-invocable: true
argument-hint: "<path-to-spec-doc> (optional — will search {docs_path}/specs/ if omitted) [--feature <slug>] [--backlog <id>] [--skip-design-drift] [--scope phase --phase <N>] [--format <html|md|both>] [--non-interactive | --interactive]"
---

# Implementation Verification Gate

Systematically verify that an implementation matches its spec, requirements, and plan. This is a **standalone verification gate** — run it anytime after implementation is done, regardless of how the code was written.

This is an **operational workflow** — a structured sequence of verification steps with evidence collection.

**Announce at start:** "Using the verify skill to run post-implementation verification."

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** State your assumption, document it in the output, and proceed. The user reviews after completion.
- **No subagents:** Perform research and analysis sequentially as a single agent.
- **No Playwright MCP:** State the specific blocker and the setup the user must complete before browser-based verification can run. Do NOT mark any UI-surface FR verified without either Playwright evidence or an explicitly declared alternative (a specific test file that covers the rendered output). Offloading verification to the user is not a valid completion state — it resolves to `Unverified — action required` on the Phase 5 compliance tables, and Phase 4 stays open.
- **Task tracking:** Use your available task tracking tool (e.g., `TaskCreate`/`TaskUpdate` in Claude Code, `update_plan` in Codex, or equivalent). If none is available, announce phase transitions verbally.

---

## Backlog Bridge

This skill optionally integrates with `/backlog`. See `plugins/pmos-toolkit/skills/backlog/pipeline-bridge.md`.

**At skill start:**
- If `--backlog <id>` was passed: load the item file as supplementary context.

**At skill end (only if the verify pass is reported successful):**
- If `<id>` was set, invoke `/backlog set {id} status=done`. If the active branch has an associated PR (detect via `gh pr view --json url`), also invoke `/backlog set {id} pr={url}`. On failure, warn and continue.
- Run the auto-capture flow per `pipeline-bridge.md`: scan the verify output for "Known issues" / "Follow-up" sections and propose new backlog items.

---

**Create verification tasks** at the start using your available task tracking tool:

1. Gather Context
2. Static Verification (lint, types, tests)
3. Code Quality Review
4. Deploy & Integration Verification
5. Spec Compliance Check
6. Harden Test Suite
7. Final Compliance Pass
7.5. Design-System Drift Check (advisory)
8. Commit & Report

Mark each as in-progress when starting and completed when done. Skip tasks that don't apply (e.g., skip deploy if no deployment is involved).

---

## When to Use

- After `/execute` completes (double-check)
- After manual implementation
- After picking up someone else's partial work
- Before claiming a feature is done
- When you suspect gaps between spec and implementation

---

## Phase 0: Pipeline Setup (inline — do not skip)

Use workstream context (loaded by step 3 below) to verify that implementation aligns with product goals, not just spec compliance. This skill reads all prior artifacts (`01_requirements.{html,md}`, `02_spec.{html,md}`, `03_plan.{html,md}`, `execute/`) and writes review reports under `{feature_folder}/verify/`.

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

### Phase 0 addendum: output_format resolution (FR-12)

7. **Resolve `output_format`.** Read `output_format` from `.pmos/settings.yaml` (default: `html`; valid values: `html`, `md`, `both`). A `--format <html|md|both>` argument-string flag overrides settings (last flag wins on conflict, per FR-12). Print to stderr exactly: `output_format: <value> (source: <cli|settings|default>)` once at Phase 0 entry. Controls the format of the **review-report write phase only** (Phase 8 step 2). Reading prior artifacts uses the resolver; the resolver returns whatever primary the upstream skill wrote, regardless of `output_format`.

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

## Phase 1: Gather Context

### Invocation Mode: Phase-Scoped (called from /execute)

When invoked with `--scope phase --feature <slug> --phase <N>`, /verify runs the full checklist (Phases 2–7) but with three changes:

1. **Changed-files set is restricted to files touched by tasks in the named phase only.** Read `{feature_folder}/execute/task-NN.md` for each `T<N>` listed in the plan's `## Phase <N>` group; union their `files_touched` frontmatter lists.
2. **Evidence path is `{feature_folder}/verify/<YYYY-MM-DD>-phase-<N>/`** (not the default `{feature_folder}/verify/<YYYY-MM-DD>/`). Multiple phase-verify runs on the same day are namespaced by phase number, so they do not collide.
3. **Phase 4 Entry Gate uses the markdown table in `review.{html,md}` as the structural enforcement** instead of `TodoWrite`. Per-task logs under `{feature_folder}/execute/task-NN.md` already carry evidence-typed FR coverage tables for this phase, so re-creating one `TodoWrite` task per FR-ID would duplicate that contract. The `review.{html,md}` table — with one row per FR-ID, the same outcome+evidence triple, and a `Status` column drawn from the three-state outcome model — IS the gate. `TodoWrite`-as-gate is reserved for standalone feature-scope invocations (where there is no upstream per-task log to consume).

On completion, return a structured pass/fail result to the calling skill (/execute Phase 2.5):
- `ok: true|false`
- `evidence_dir: <path>`
- `failures: [...]` (when `ok == false`)

All other Phase 1+ behavior is unchanged. Standalone /verify invocations (without `--scope phase`) work exactly as before.

1. **Locate upstream documents.** Resolve each of the three inputs by following `_shared/resolve-input.md`:
   - Spec: `phase=spec`, `label="spec"` (user argument, if passed, applies to the spec)
   - Requirements: `phase=requirements`, `label="requirements doc"`
   - Plan: `phase=plan`, `label="plan"`
2. **Read all three documents** (whichever exist). You need these for the compliance check.
2a. **Locate wireframes (if present).** Check `{feature_folder}/wireframes/` for HTML wireframes produced by `/wireframes`. If the folder exists, list every screen file and treat wireframes as a fourth source document — but understand what they are and aren't:

   **Wireframes are authoritative for:** information architecture, screen inventory, component presence, copy and labels, state coverage (loading / empty / error / success), navigation entry/exit points, user-journey shape.

   **Wireframes are NOT authoritative for:** visual style, color palette, typography choice, exact spacing, component library, iconography, or pixel-level layout. Those follow the host application's existing design system and conventions — even when the wireframe shows something different. The /wireframes skill itself produces a `DESIGN.md` (canonical brand contract) and a `design-overlay.css` (generated CSS variable overlay) precisely because wireframes are intended to be adapted to the host app's style, not copied verbatim. Visual fidelity comes from DESIGN.md; the wireframe's role is information architecture and state coverage.

   When there's a conflict between a wireframe's visual treatment and the host app's established patterns, **the host app wins** unless the spec explicitly calls out a visual-style change as a goal. This shapes how Phase 4 sub-step 3f and Phase 5 sub-step 4d classify deltas.
3. **Identify what changed.** Run `git diff main...HEAD --stat` (or appropriate base) to see which files were modified. This scopes the verification.
4. **Check if lint/type/tests were already run.** Ask the user or check recent terminal history. Skip steps already completed — but re-run if you're not confident they were clean.

### Input Contract (when invoked as reviewer subagent)

**Scope:** this contract applies ONLY to the artifact-review path (FR-72 smoke + FR-92 cross-doc anchor scan when /verify is invoked as a reviewer over a single artifact's HTML). The Phase 3 "Multi-Agent Code Quality Review" block below is explicitly carved out per FR-50.1 — those reviewers consume git diffs not artifact HTML and are NOT covered by this contract. Do not apply chrome-strip or FR-52 validation to the Phase 3 code-diff path.

When a parent orchestrator (currently `/feature-sdlc`) invokes this skill as a reviewer subagent over a single artifact, the parent has chrome-stripped the artifact via `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/chrome-strip.js` (FR-50, T12) and passes the stripped slice (`<h1>` + `<main>`) inline as the prompt body. In that mode, this skill skips its own resolver (`_shared/resolve-input.md`) and operates directly on the stripped HTML.

**Output shape (FR-51 canonical):** the skill MUST first enumerate every `<section>` id and every `<h2>`/`<h3>` id it can locate in the stripped slice, returning them as `sections_found: [...]`. It then evaluates against its own rubric and emits findings as `{section_id, severity, message, quote: "<≥40-char verbatim from source>"}`.

**Parent-side validation (FR-52, the skill MUST NOT self-validate):** the parent will (a) set-equality-check `sections_found` against `<artifact>.sections.json`, (b) substring-grep every `quote` against the original (un-stripped) source HTML, (c) hard-fail on any miss. This skill does not duplicate that validation; the contract lives in the parent.

---

## Phase 2: Static Verification (fast, run first)

Run in this order. Each step must pass before proceeding to the next. If a step fails, fix the issue, then re-run.

### 1a. Lint & Format

```bash
ruff check . && ruff format --check .
```
(Or project-appropriate linter. Check `CLAUDE.md` for the correct commands.)

**If issues found:** Fix them. Re-run. Do not proceed until clean.

### 1b. Type Checks

```bash
# Python: pyright or mypy
# TypeScript: tsc --noEmit
# Frontend: npm run lint (if it includes type checking)
```

**If issues found:** Fix them. Re-run.

### 1c. Unit Tests

```bash
pytest tests/ -v  # or project-appropriate test command
```

**Evidence required:** Paste the summary line showing pass/fail counts. "X passed, 0 failed" is the minimum bar.

**If failures:** Fix them. Do NOT skip failing tests. Do NOT mark tests as `@pytest.mark.skip` to make the suite pass.

### 1d. Frontend Tests & Lint (if applicable)

```bash
cd apps/<frontend-app> && npm run lint && npm test
```

---

## Phase 3: Multi-Agent Code Quality Review

Dispatch parallel subagents to review the diff from multiple angles. This catches code quality issues that static analysis and tests miss. Works against `git diff` — no PR required.

### Setup

```bash
# Get the diff to review
git diff main...HEAD          # if on a feature branch
git diff HEAD~N               # if commits are on main (N = number of commits in this feature)
```

Identify all CLAUDE.md files relevant to the changed directories (root + any directory-level CLAUDE.md files).

### Parallel Review Agents (dispatch simultaneously)

Launch 3-5 subagents depending on the scope of changes:

| Agent | Focus | What to return |
|-------|-------|---------------|
| **CLAUDE.md compliance** | Read the diff + all relevant CLAUDE.md files. Flag any violations of project conventions, naming patterns, code style rules, or architectural constraints. | List of violations with file:line and the specific CLAUDE.md rule. |
| **Bug scan** | Read only the changed lines (shallow scan). Look for obvious bugs: off-by-one errors, null/undefined access, missing error handling at system boundaries, race conditions, resource leaks. Ignore style issues. | List of potential bugs with severity and reasoning. |
| **Git history context** | Run `git blame` and `git log` on modified files. Check if changes break assumptions from previous work — renamed functions still referenced elsewhere, removed code that other modules depend on, changed behavior that tests don't cover. | List of issues with historical context. |
| **Comment compliance** | Read code comments in modified files (TODOs, invariants, "do not change" warnings, API contracts documented in docstrings). Check if the changes violate any guidance in those comments. | List of violated comments with file:line. |
| **Cross-file consistency** | Check that changes are consistent across files — if a function signature changed, are all callers updated? If a type changed, are all usages updated? If a config key was renamed, is it renamed everywhere? | List of inconsistencies. |

### Confidence Scoring

For each issue found, score confidence (0-100):

| Score | Meaning |
|-------|---------|
| 0-25 | Likely false positive — doesn't stand up to scrutiny, or pre-existing issue |
| 25-50 | Might be real but could be a nitpick. Not explicitly called out in CLAUDE.md. |
| 50-75 | Verified real issue but minor — won't happen often in practice |
| 75-100 | Verified real issue, will directly impact functionality, or explicitly violates CLAUDE.md |

**Filter:** Only act on issues scoring 75+. Log issues scoring 50-74 as "noted but not blocking." Discard below 50.

### Fix & Re-verify

For each issue scoring 75+:
1. Fix the issue
2. Re-run the relevant static verification step from Phase 1
3. If the fix changes behavior, add a regression test (Phase 5)

---

## Phase 4: Deploy & Integration Verification

### Phase 4 Entry Gate — Enumerate the Verification Surface

Before running any Phase 4 sub-step, enumerate every upstream requirement that has a runtime surface and create one `TodoWrite` task per item. This list is the gate — Phase 4 is not complete until every todo is closed with evidence or explicitly resolved to `Unverified — action required` with a named blocker. A plain bullet list in prose does not substitute for `TodoWrite` todos; the todos are the structural enforcement.

> **Phase-scoped exception:** When invoked with `--scope phase --feature <slug> --phase <N>` (see "Invocation Mode: Phase-Scoped" above, change #3), the markdown table in the phase's `review.{html,md}` IS the gate. Do not create `TodoWrite` tasks per FR-ID for phase-scoped runs — the per-task logs already carry the same outcome+evidence contract.

**How to build the list:**

1. Read the spec's FR-IDs and edge cases. For each, classify the runtime surface:
   - **UI surface** (user sees, clicks, enters something) → todo required
   - **API surface** (new or modified endpoint) → todo required
   - **Data surface** (migration, schema change, background job output) → todo required
   - **Pure internal logic** (algorithm verified by unit test only) → NOT on the list; cite the test in Phase 5 compliance instead
2. Read the requirements doc's user journeys. Every end-to-end journey with UI or API touchpoints gets one todo.
3. For each enumerated item, create a `TodoWrite` task formatted as:
   `Verify <FR-ID or Journey-ID>: <one-line description> [evidence: <type from table below>]`

**Evidence-type allowlist by sub-step:**

| Sub-step | Acceptable evidence |
|----------|--------------------|
| 3a. Database Migrations | Migration command output + DB schema query confirming the new shape |
| 3b. Docker Deployment | Service health check output + startup log snippet showing no errors |
| 3c. API Smoke Tests | `curl` response body compared row-by-row to the spec's API contract |
| 3d. Frontend Verification | Playwright MCP screenshot, `browser_evaluate` DOM assertion, or a specific test file covering the rendered output. **Synthesized `KeyboardEvent`s must use `bubbles: true` to reach document-level listeners; otherwise the listener won't fire and you'll log a false negative.** |
| 3e. Interactive Spot Checks | Playwright MCP interaction trace covering a user journey end-to-end, including at least one error/edge path |
| 3f. UX Polish & Wireframe Consistency | Per-page checklist results (see 3f) AND, if wireframes exist, a wireframe-vs-implementation diff note per affected screen classifying each delta as `intentional` or `regression` |

**Every enumerated todo resolves to exactly one of three outcomes:**

1. **Verified** — evidence produced and cited. The evidence type must match the allowlist row for the sub-step. Close the todo.
2. **NA — alternative evidence cited** — the runtime surface doesn't exist for this item (e.g., FR is a pure calculation change). Cite the alternative (e.g., `test_pricing.py::test_discount_applied`) or the specific reason tied to the FR text. Bare "NA" is not valid. Close the todo with the alternative recorded.
3. **Unverified — action required** — you attempted verification and were blocked. State the specific blocker and the user action needed (e.g., "user must run `make seed-dev-db` before 3e can proceed"). Leave the todo OPEN and surface it in the Phase 8 final report.

**Setup is part of Phase 4, not a prerequisite.** Starting the dev server, seeding the DB, running migrations, authenticating — all Phase 4 work. If setup is complex, write down the exact commands, execute them, and proceed. Only escalate to the user when a genuine decision is required (e.g., "which dev DB to use"), not to offload execution. "Setup would take too long" is a Phase 4 red flag, not a reason.

### Phase 4 Red Flags — rationalizations that mean you're about to skip

If any of these thoughts surface during Phase 4, stop and re-read the entry gate. Each is a rationalization the skill has seen and named:

| Thought | Reality |
|---------|---------|
| "Automated tests already pass — good enough" | Automated tests miss UX, rendering, timing, and copy issues. The entry gate still applies. Every enumerated todo still needs evidence. |
| "This is out of scope for /verify" | Phase 4 is a numbered phase in this skill. Verification cannot be out of scope for the verification skill. |
| "The user can verify this at their desk" | Playwright MCP, `curl`, and DB queries are agent-owned tools. Offloading interactive verification to the user resolves to `Unverified — action required`, not `Verified`. |
| "Setup would take too long" | Setup is Phase 4 work. If you have time to write the final report, you have time to start the server. |
| "The happy path worked; good enough" | The spec's edge cases are explicit. Test at least one error/edge path per affected flow — the entry gate names this in 3e's evidence row. |
| "I'll note it as a gap" | A gap you could have verified but didn't is not a gap — it's a skip. Either produce evidence (close as Verified), cite alternative evidence (close as NA), or name the blocker (leave open as Unverified-action-required). There is no fourth state. |
| "Polish is cosmetic — out of scope for verification" | Polish *is* the user-facing product. Sub-step 3f is mandatory for any change with a UI surface. If the user has to push you to check polish, the skill failed. |
| "Wireframes were just sketches — implementation is allowed to drift" | Style drift is *expected* — wireframes are not authoritative for visual style (see 2a). But unexamined drift on the authoritative dimensions (IA, copy, states, journeys) is a skip. Classify every delta on those dimensions as `intentional — style adaptation`, `intentional — decision`, or `regression`. A wireframe-diff with zero deltas listed is suspicious. |
| "I should make the implementation look exactly like the wireframe" | No. Visual style follows the host app's design system, not the wireframe. The wireframe's color/typography/spacing/iconography is reference-only. Forcing pixel-fidelity over the host app's conventions is a different failure mode — flag it as a `regression` against the host app's design system, not the wireframe. |
| "Hard-reload / deep-link works in-app, that's enough" | Parameterized routes must be hard-reloaded (open URL fresh in a new tab via Playwright) for every affected route. In-app navigation hides router-resolver bugs. |

### 3a. Database Migrations (if applicable)

```bash
alembic upgrade head
```

Verify the migration applied cleanly. Check for errors in output.

### 3b. Docker Deployment

Deploy to the appropriate environment (main stack or worktree stack):

```bash
docker compose build <affected-services> && docker compose up -d <affected-services>
```

Wait for services to be healthy. Check logs for startup errors.

### 3c. API Smoke Tests

For every new or modified API endpoint, verify the response shape matches the spec:

```bash
curl -sf <endpoint> | python3 -m json.tool
```

**Evidence required:** Show the actual response and compare it to the spec's API contract. Flag any mismatches.

### 3d. Frontend Verification (Playwright MCP)

For every affected UI flow:

1. **Authenticate first** (if auth is enabled)
2. **Navigate** to each affected page
3. **Walk through** every user journey from the spec
4. **Check** for console errors/warnings
5. **Take screenshots** for evidence
6. **Verify** that UI matches spec's frontend design section

### 3e. Interactive Spot Checks

Run actual scenarios in the development environment. Interact with the system as a user would. Specifically:

- Test the happy path end-to-end
- Test at least one error/edge case from the spec
- Test empty states if applicable
- Verify that unrelated flows still work (no regressions)

**Do NOT rely only on automated tests.** Interactive verification (Playwright MCP driving real user journeys) catches issues that tests miss: rendering glitches, confusing UX, wrong copy, timing issues. "Interactive" means you operate the browser via MCP — not that a human operates it for you.

### 3f. UX Polish & Wireframe Consistency (mandatory for any UI-touching change)

This sub-step exists because automated tests, API smoke tests, and happy-path Playwright walks all pass while the product still ships with `<title>Vite App</title>`, `alt="image"`, leaked internal IDs in user-facing copy, and broken hard-reload. Polish is the product — it is not optional, and it is not a follow-up.

**Skip only if** the change has zero UI surface (pure backend, infra, or library-internal). Document the skip with one sentence. Otherwise this sub-step runs.

**Part 1 — Wireframe diff (only if `{feature_folder}/wireframes/` exists from Phase 1).** Wireframes are a *reference*, not a spec — see Phase 1 sub-step 2a for what they are and aren't authoritative for. For each affected screen:

1. Open the wireframe HTML and the live implementation side-by-side via Playwright MCP.
2. Compare **only on the dimensions wireframes are authoritative for** (per 2a): IA, screen inventory, component presence, copy and labels, state coverage (loading/empty/error/success), affordances (CTAs, disabled states), navigation entry/exit. Do NOT diff visual style, color, typography, spacing, iconography, or component library — those are expected to follow the host app and will differ from the wireframe by design.
3. Record every delta on the authoritative dimensions in the wireframe-diff table (Phase 5 sub-step 4d). Classify each as one of:
   - **`intentional — style adaptation`**: wireframe showed something the host app's design system handles differently. No fix needed; this is the expected adaptation. Cite the host-app convention.
   - **`intentional — decision`**: a deliberate departure recorded during /execute or earlier (cite the decision record).
   - **`regression`**: a missed requirement on an authoritative dimension (e.g., an empty state in the wireframe is missing from the implementation, copy is wrong, a journey step was dropped). Must be fixed in this verify pass, then re-verified.
4. "Wireframe and implementation match" with no deltas listed is not acceptable evidence — name at least the authoritative dimensions checked.

**The bar:** does the implementation cover what the wireframe specified at the IA/copy/states/journeys level, *adapted to the host app's design system*? Not: does it look pixel-identical to the wireframe.

**Part 2 — UX polish checklist (always runs).** Walk the changed UI surface in Playwright and check every item below. Each becomes a row in the Phase 5 sub-step 4d table.

| # | Check | How |
|---|-------|-----|
| P1 | `document.title` is set per route (not the framework default like "Vite App", "React App", "Next.js") | `browser_evaluate` `document.title` on each affected route |
| P2 | No internal IDs / enum keys leaked into user-facing copy (e.g., `practitioner_bullets` shown to user instead of "Practitioner"; `table_of_contents` instead of "Table of Contents") | Visual scan + grep the rendered DOM for snake_case strings |
| P3 | Casing/format consistency across labels, filter options, button text, dates, and headings (no SHOUTY CAPS where sentence case is used elsewhere; one date format) | Cross-check filter dropdowns, button text, and date renderings on each affected page |
| P4 | Loading, empty, and error states render — and the error state surfaces actual failures, not silent UI | Force at least one error per affected flow (bad input, broken backend, force a 4xx/5xx) and observe the UI |
| P5 | Image `alt` attributes are meaningful — never the literal string `"image"`, `"img"`, or empty for non-decorative images | `browser_evaluate` `[...document.images].map(i=>i.alt)` |
| P6 | No dead disabled affordances — every disabled CTA either has a tooltip explaining why or is replaced by an action (e.g., disabled "No Summary" pill should offer "Summarize" instead) | Visual scan; click each disabled control |
| P7 | Hard-reload works for every parameterized route the change touches | For each route, open the URL in a fresh Playwright tab (not in-app navigation) and confirm the page renders the requested resource, not the index/first item |
| P8 | Deep-link / shareable URL parity — copy the URL, open in a new context, confirm same content | Same as P7 but with explicit URL-copy step |
| P9 | Browser console has zero uncaught errors and zero unhandled promise rejections during the journey | `browser_console_messages` after walking each affected flow |
| P10 | Navigation labels match destination titles (no "Notes" sidebar pointing to an "Annotations" page) | Cross-check sidebar/menu label vs `<h1>` on the destination |
| P11 | Failure paths are visibly recoverable — if a backend operation fails, the user sees a retry CTA, not silence | Force at least one failure (network kill, bad input) and observe the UI |
| P12 | No raw external/internal anchors leak into rendered content (e.g., EPUB `#filepos2205`, file-system paths, dev-only URLs) | `browser_evaluate` `[...document.querySelectorAll('a')].map(a=>a.href)` and inspect for non-app schemes/paths |

**Evidence required (per the entry gate's 3f row):** the polished-checklist table with one outcome per row (`pass` / `fail` / `NA — reason`) AND, if wireframes existed, a wireframe-diff entry per affected screen. Failures become Phase 5 4d gaps and Phase 6 regression tests.

---

## Phase 4.5: Folded-phase awareness (new in v2.34.0 per T19/W4/E14)

When verifying a feature folder produced by /feature-sdlc v2.34.0+, check folded-phase artifacts and state.yaml signals:

### Slug-distinct artifact preference (FR-20, D4)

For MSF artifacts, prefer the slug-distinct paths (the v2.34.0 convention):

- `<feature_folder>/msf-req-findings.md` — written by /requirements Phase 5.5 folded MSF-req.
- `<feature_folder>/wireframes/msf-wf-findings/<wireframe-id>.md` — written by /wireframes Phase 6 folded MSF-wf (per-wireframe directory variant).

**Legacy fallback:** if `msf-req-findings.md` is absent but `msf-findings.md` exists, /verify still passes the artifact check but emits a soft warning:

```
legacy slug detected at <path>; new writes use msf-req-findings.md (D3 / pipeline-consolidation v2.34.0). No action required for this run.
```

### Affirmative folded-phase-completion signal (E14)

When BOTH conditions hold for a Tier-3 feature:

1. All folded phases were Skipped (state.yaml.phases.<x>.notes records `--skip-folded-{msf,msf-wf,sim-spec}` flags)
2. `state.yaml.phases.<x>.folded_phase_failures[]` is empty for all phases

…emit an affirmative line in the compliance summary:

```
✓ folded phases skipped per documented flags
```

### Advisory warning — Tier-3 feature with no folded artifacts and no documented skip (E1 softened, F4)

When a Tier-3 feature has:

- NO `msf-req-findings.md`, NO per-wireframe MSF-wf findings, NO simulate-spec patches in `02_spec.md` git history
- NO `--skip-folded-*` flags documented in state.yaml.phases.<x>.notes
- NO entries in `folded_phase_failures[]`

…emit ADVISORY (not blocking):

```
WARNING: Tier-3 feature has no folded MSF artifacts and no documented skips; folded phases may have been bypassed silently. Verify intentional.
```

### Per-failure advisory emit (FR-52, F4)

For every entry in any phase's `folded_phase_failures[]`, emit:

```
WARNING: <folded-skill> crashed in <phase> (advisory per D11): <error_excerpt>
```

These are advisory (not blocking) per D11; /verify still PASSes if everything else is green. They surface so the user sees folded-phase health at every /verify run.

## Phase 4.7: Folded /architecture --since (T2 scoped; T3 full; T1 skip)

**Skip if `--skip-folded-arch` was passed** (FR-30 escape). This phase delegates to the `/architecture` skill's `--since` mode (shipped in Wave 4 / T11) to lint code changed on this branch against the architectural assertions baked into `02_spec.html`. Findings aggregate into /verify's report alongside lint, tests, and code-review output. Per FR-25..FR-30.

### Tier gate (FR-26)

| Tier | Behavior |
|------|----------|
| 1    | Emit `arch sub-step: tier 1, skipping` to chat. No dispatch. Proceed to Phase 5. |
| 2    | Scoped run — dispatch with `--since` against the changed file set only. /architecture's pre-flight already short-circuits on empty diff. |
| 3    | Full run — dispatch with `--since` against `git merge-base HEAD main`. Larger scope but same skill invocation. |

### Pre-flight short-circuit (FR-30)

If the argument string carries `--skip-folded-arch`, emit `architecture: --skip-folded-arch flag; skipping` to stderr and proceed to Phase 5 without further work. No dispatch, no state.yaml mutation.

### Dispatch (FR-27)

Compute the since-base:

```bash
SINCE=$(git merge-base HEAD main)
```

If the resolution fails (no `main` branch, detached HEAD, etc.), log the git error and proceed to Phase 5 — folded-phase failures are advisory; we do not block /verify on a baseline-resolution miss.

Invoke `/architecture --since $SINCE` as a blocking Task subagent with **600s timeout** (longer than Phase 6.6's 300s — branch-wide scans are heavier than single-spec evaluations). The child resolves changed files, runs the judge, validates findings (file_path schema variant), and writes its triplet atomically. On the empty-diff path, /architecture emits the canonical `architecture: no changes since $SINCE; skipping` log line and exits 0 with no triplet — this is the expected success path on doc-only branches.

### Aggregation (FR-28)

On success with findings: read the triplet's `<triplet>.json` and emit a new section in /verify's primary output report:

```
### Architecture findings

Source: <triplet-path>.html
<N> findings (M must-fix, K should-fix).

| # | rule_id | severity | file_path | finding |
|---|---------|----------|-----------|---------|
| 1 | <rule>  | <sev>    | <path>    | <one-line restatement> |
```

Each row is one finding from the triplet's JSON, sorted by severity (`must_fix` → `should_fix` → `consider`). The aggregated table sits alongside the existing lint / tests / code-review aggregators (no schema conflict — these are siblings, not merges).

On success with no findings: emit `Architecture findings: 0` as a one-line aggregator entry — keeps the section's presence visible so absence of findings is distinguishable from absence of the phase.

### Advisory failure (FR-29, D11)

On dispatch failure (subagent crash, timeout, schema-conformance hard-fail, judge API error), capture `{folded_skill: "architecture", error_excerpt: <first-200-chars>, ts: <ISO-8601>}` and append to `state.yaml.phases.verify.folded_phase_failures[]` per the dedup rule in `feature-sdlc/reference/state-schema.md`. Emit at moment-of-append:

```
WARNING: architecture crashed in verify (advisory per D11): <error_excerpt>
```

Continue to Phase 5 — folded-phase failures do NOT block /verify PASS. Phase 4.5 (folded-phase awareness) will re-surface these on the next /verify run.

### Flag handling (Phase 0 parser additions)

`--skip-folded-arch` (boolean) — short-circuits this phase entirely (mirrors `/spec`'s same-named flag for Phase 6.6).

## Phase 5: Spec Compliance Check

This is the most important phase. Re-read each upstream document and verify every requirement is implemented.

**Three-state outcome model (applies to 4a, 4b, 4c):**

Every row in every compliance table resolves to exactly one of three outcomes. Bare "Pass", "Fail", "Complete", or "Partial" are not valid — they collapse into the three below, and every row's `Evidence` column must cite a concrete artifact.

| Outcome | Meaning | Required in Evidence column |
|---------|---------|----------------------------|
| **Verified** | Requirement/task met; evidence produced during Phase 2–4. | Test file + function, screenshot path, `curl` output excerpt, DB query result, or commit SHA. The evidence type must match what was declared in the Phase 4 entry gate allowlist if the row has a runtime surface. |
| **NA (alt-evidence)** | No runtime surface for this row, OR the row was intentionally out of scope and covered indirectly. | Named alternative: e.g., "covered by `test_pricing.py::test_discount_applied`", or the specific reason tied to the requirement text (e.g., "FR narrative change only — no code path"). Bare "NA" or "N/A" is not valid. |
| **Unverified — action required** | Verification was attempted and blocked. The row is NOT resolved. | The specific blocker and the user action needed to unblock (e.g., "Playwright MCP unavailable in this environment — user must install; re-run 3d after"). Unverified rows must also appear in the Phase 8 final report as open items. |

Every row also cross-references the todo it closed (or left open) from the Phase 4 entry gate, if applicable. If no Phase 4 todo was created (pure internal logic), the Evidence column names the unit test that covered it.

### 4a. Requirements Compliance

Read `{feature_folder}/01_requirements.{html,md}` (resolved in Phase 1 via the resolver). For every goal, user journey, and acceptance criterion:

| # | Requirement | Outcome | Evidence |
|---|-------------|---------|----------|
| Goal 1 | [From requirements] | Verified / NA / Unverified | [Per the three-state model: test file, screenshot path, curl excerpt, DB query, alt-evidence citation, or blocker + user action] |
| Journey 1, Step 3 | [Specific step] | Verified / NA / Unverified | [e.g., `screenshots/j1-s3.png` from Phase 4 3d, or `Unverified — dev server wouldn't start; user must run docker compose up`] |

### 4b. Spec Compliance

Read `{feature_folder}/02_spec.{html,md}` (resolved in Phase 1 via the resolver). For every FR-ID and edge case:

| ID | Requirement | Outcome | Evidence |
|----|-------------|---------|----------|
| FR-01 | [From spec] | Verified / NA / Unverified | [Per the three-state model — e.g., `test_orders.py::test_checkout_flow`, or `screenshots/fr-01-checkout.png`, or `Unverified — Stripe webhook endpoint requires live deploy`] |
| FR-02 | ... | ... | ... |
| E1 | [Edge case] | Verified / NA / Unverified | [Evidence for the edge case specifically, not the happy path] |

**Copy-pasteable template (use this verbatim — do not freelance the `Outcome` column):**

```markdown
| ID | Requirement | Outcome | Evidence |
|----|-------------|---------|----------|
| FR-01 | <one-line restatement of the FR from the spec> | Verified | <test file::function, screenshot path, curl excerpt, DB query, or commit SHA> |
| FR-02 | <one-line restatement> | NA — alt-evidence | <named alternative — e.g., `test_pricing.py::test_discount_applied`, OR specific reason tied to FR text> |
| FR-03 | <one-line restatement> | Unverified — action required | <specific blocker + user action — e.g., `Playwright MCP unavailable; user must install; re-run 3d after`> |
| E1 | <edge case from spec> | Verified | <evidence for the edge case, not the happy path> |
```

Allowed `Outcome` values are exactly `Verified`, `NA — alt-evidence`, and `Unverified — action required`. Bare `Pass`, `Fail`, `Complete`, `Partial`, `✓`, or `❌` are not valid — they collapse into the three above. Every `Unverified — action required` row also appears in the Phase 8 final report as an open item.

### 4c. Plan Compliance

Read `{feature_folder}/03_plan.{html,md}` (resolved in Phase 1 via the resolver). For every task:

| Task | Outcome | Evidence |
|------|---------|----------|
| T1: [Name] | Verified-complete / NA-skipped-with-reason / Unverified | [Commit SHA(s) implementing the task + at least one test or Phase 4 verification artifact; OR the decision record for an intentional skip (e.g., "merged into T3 during execution"); OR the blocker + user action] |
| T2: ... | ... | ... |

**For plan-task outcomes:**
- `Verified-complete` requires BOTH a commit reference AND a verification artifact (test, screenshot, curl excerpt). A commit alone is not evidence of correctness — only of existence.
- `NA-skipped-with-reason` requires naming the decision AND where it was recorded (plan update, session log, commit message). "NA" without a reason is not valid.
- `Unverified` means the task was claimed done but the verification couldn't be produced. This is a gap — surface it in the 4d Gap Report.

### 4d. Wireframe & UX Polish Compliance

This table consolidates the output of Phase 4 sub-step 3f. Skip only if the change had zero UI surface (note the skip and proceed to 4e).

**Part 1 — Wireframe deltas (only if `{feature_folder}/wireframes/` was loaded in Phase 1):**

| Screen | Delta (authoritative dimensions only) | Classification | Evidence / Rationale |
|--------|--------------------------------------|---------------|---------------------|
| `01_dashboard.html` vs `/dashboard` | [What differs on IA / copy / states / journeys — NOT visual style] | `intentional — style adaptation` / `intentional — decision` / `regression` | [Screenshot pair, decision record reference, host-app convention reference, or fix commit] |

Reminder: only diff on the dimensions wireframes are authoritative for (Phase 1 sub-step 2a). Visual-style differences (color, typography, spacing, iconography, component library) are expected and not listed as deltas — the implementation is meant to adapt the wireframe to the host app's design system.

If a screen had zero deltas on the authoritative dimensions, write one row stating that explicitly and naming the dimensions checked (IA, copy, states, journeys) — empty tables are not acceptable evidence.

**Part 2 — UX polish checklist results:**

| # | Check | Outcome | Evidence |
|---|-------|---------|----------|
| P1 | `document.title` set per route | Verified / Failed / NA | [`browser_evaluate` output, or fix commit if it failed and was repaired this pass] |
| P2 | No internal IDs / enum keys in user copy | ... | ... |
| ...P3–P12 | (one row per checklist item from 3f) | ... | ... |

Every `Failed` row in either part becomes a Phase 5 4e Gap Report entry AND a Phase 6 regression test.

### 4e. Gap Report

List every gap found:

| # | Gap | Severity | Source Doc | Action |
|---|-----|----------|-----------|--------|
| 1 | [What's missing] | Critical/Medium/Low | [Which doc] | [Fix or defer] |

**If critical gaps exist:** Fix them before proceeding. Re-run affected verification steps.

---

## Phase 6: Harden the Test Suite

For every issue discovered during verification:

1. **Write a regression test** that would have caught the issue
2. **Verify red-green:** The test must fail when you revert the fix, and pass with the fix applied
3. **Name descriptively:** `test_<function>_<bug_condition>_<expected_outcome>`

This is not optional. The goal is that the same issue can never ship again.

Also check for coverage gaps:
- Any spec requirement with no corresponding test? Write one.
- Any edge case from the spec that isn't tested? Write one.
- Any user journey that's only verified manually? Consider adding an integration or E2E test.

---

## Phase 7: Final Compliance Pass

One last check before committing:

1. **Re-read the spec one final time.** Is there ANYTHING mentioned that isn't implemented or verified?
2. **Check for TODO/FIXME/HACK** in the changed files. Resolve them or flag them explicitly.
3. **Check for debug logging** or temporary code that should be removed.
4. **Check for hardcoded values** that should be configuration.
5. **Verify documentation is updated** (CLAUDE.md, changelogs, API docs).

### Phase 7 Hard Gates

The following script checks must pass before Phase 8 (Commit & Report). A non-zero exit blocks `/verify` completion for this feature.

- **Comments coverage check** (FR-62): `bash scripts/check-comments-coverage.sh` — refuses /verify completion if any of the 14 `apply-edit-at-anchor` contract tests are missing (13 originating skills + 1 orchestrator), if any of the 15 emit references are absent (13 skill-level `comments.js` refs + 2 orchestrator surface refs for `00_pipeline.html` and `00_open_questions_index.html`), or if the resolver integration test or calibration tests (`scorer.test.js`, `reanchor.integration.test.js`) are missing. Bypassable only via documented spec amendment.

---

## Phase 7.5: Design-System Drift Check (advisory)

Keeps `DESIGN.md` and `COMPONENTS.md` in sync with the codebase so the design-system files stay self-sufficient over time. Advisory — never blocks `/verify`.

Follow `reference/design-drift-check.md` end-to-end. Summary:

1. **Skip-fast guards** — no frontend changes, no DESIGN.md, `x-source.applied: false`, or `--skip-design-drift` flag → skip silently.
2. **Locate** DESIGN.md / COMPONENTS.md via `wireframes/reference/design-md-resolver.md`. Compute drift against the workstream's `last_extraction_sha` (fall back to `x-source.sha`).
3. **Detect** token drift (Tailwind/CSS), component drift (new components, new variants), and layout drift (new route chrome shapes).
4. **High-volume escape hatch:** drift count > 20 → offer one-shot re-extraction via `/wireframes` extractors instead of per-item prompts.
<!-- defer-only: ambiguous -->
5. **Surface via `AskUserQuestion`** (max 4 per call, cap 16 total): per item — **Apply** / **Modify** / **Skip (don't track)** / **Defer**.
6. **Apply** approved changes via `Edit`; bump `x-source.sha`, `extracted_at`, and workstream `last_extraction_sha`. Stage with `/verify`'s Phase 8 commit.
7. **Report** in the Phase 8 summary (additions / modifications / deferred / ignored counts).

This phase does NOT generate wireframes, regenerate `design-overlay.css`, auto-create missing files (that's `/wireframes`), or modify the workstream `## Constraints & Scars`.

---

## Phase 8: Commit & Report

1. **Commit all changes** (fixes, new tests, documentation updates):
   ```bash
   git add <specific-files>
   git commit -m "fix: verification fixes for <feature>"
   ```
   If there are multiple logical changes, use multiple commits.

2. **Write the review report** to `{feature_folder}/verify/{YYYY-MM-DD}-review.html` per the substrate at `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/`. If a report with that name already exists from an earlier run today, append `-2`, `-3`, etc. (e.g., `2026-04-30-review-2.html`). The report contains the same content delivered to the user in step 3. For phase-scoped invocations (Phase-Scoped Mode above), the path becomes `{feature_folder}/verify/{YYYY-MM-DD}-phase-<N>/review.html`.

   - **Atomic write (FR-10.2):** write `<name>.html` and the companion `<name>.sections.json` via temp-then-rename.
   - **Asset substrate (FR-10):** copy `assets/*` from `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/` to `{feature_folder}/assets/` if not already present. The substrate currently includes `style.css`, `viewer.js`, `serve.js`, `build_sections_json.js`, `comments.js`, `comments.css`, and the launcher trio (`comments-open.command`, `comments-open.sh`, `comments-open.bat`); new substrate files added in future releases ride along automatically. Idempotent — `cp -n` skips identical files.
   - **Asset prefix (FR-10.1):** `verify/` is one level below the feature folder, so the per-folder relative asset prefix is `../assets/`. Phase-scoped runs nest one further (`verify/<date>-phase-<N>/`), so the prefix is `../../assets/`.
   - **Cache-bust (FR-10.3):** append `?v=<plugin-version>` to all asset URL references emitted into the HTML.
   - **Heading IDs (FR-03.1, enforced by `/verify` itself — self-check):** every `<h2>` and `<h3>` carries a stable kebab-case `id` per `_shared/html-authoring/conventions.md` §3.
   - **Index regeneration (FR-22, §9.1):** after the review write completes, regenerate `{feature_folder}/index.html` via `_shared/html-authoring/index-generator.md` (manifest inlined as `<script type="application/json" id="pmos-index">`, no on-disk `_index.json`, FR-41). Phase-scoped runs do NOT regenerate (the per-phase review is a sub-artifact of the parent verify dir).
   - **Mixed-format sidecar (FR-12.1):** retired — `output_format=both` is treated as `html` until a future feature re-introduces MD export.

3. **Report to the user:**
   - Verification summary (which phases passed/failed)
   - Compliance tables (requirements, spec FR-IDs, plan tasks)
   - Gaps found and how they were resolved
   - New tests added (count and what they cover)
   - Any remaining issues that need user decision

---

## Phase 9: Workstream Enrichment

**Skip if no workstream was loaded in Phase 0.** Otherwise, follow `_shared/pipeline-setup.md` Section C. For this skill, the signals to look for are:

- Implementation gaps discovered vs spec → workstream `## Key Decisions`
- New constraints or scars uncovered during verification → workstream `## Constraints & Scars`

This phase is mandatory whenever Phase 0 loaded a workstream — do not skip it just because the core deliverable is complete.

---

## Phase 10: Capture Learnings

**This skill is not complete until the learnings-capture process has run.** Read and follow `_shared/learnings-capture.md` (relative to the skills directory) now. Reflect on whether this session surfaced anything worth capturing — surprising behaviors, repeated corrections, non-obvious decisions. Proposing zero learnings is a valid outcome for a smooth session; the gate is that the reflection happens, not that an entry is written.

---

## Evidence Standards

Every claim must have evidence. No exceptions:

| Claim | Required Evidence |
|-------|------------------|
| "Tests pass" | Paste the actual output: "34 passed, 0 failed" |
| "Lint is clean" | Paste the actual output: no errors |
| "API returns correct shape" | Show the actual curl output |
| "UI renders correctly" | Screenshot via Playwright MCP |
| "Spec requirement met" | Point to specific test or interactive verification artifact |
| "No regressions" | Show full test suite output |

**Never use:** "should pass", "looks correct", "probably fine", "I believe"

---

## Anti-Patterns (DO NOT)

For Phase 4 skip rationalizations specifically, see the **Phase 4 Red Flags** table — those six thoughts are the most common skips and are named individually there. This section covers general-purpose anti-patterns that apply across phases.

- Do NOT mark failing tests as skip to make the suite pass
- Do NOT claim "tests pass" without showing the output
- Do NOT skip the Phase 5 spec compliance check — this is the most valuable phase
- Do NOT leave discovered issues as "known gaps" — every item resolves to one of the three Phase 5 states (Verified, NA-with-alt-evidence, or Unverified-action-required with a named blocker). There is no fourth state.
- Do NOT commit debug logging, TODOs, or temporary workarounds
- Do NOT verify only the happy path — every affected flow gets at least one error/edge case per the Phase 4 entry gate's 3e evidence row
- Do NOT assume the previous verification run is still valid — re-run after every fix
- Do NOT skip the Phase 6 hardening phase — converting bugs to tests is what prevents regressions
- Do NOT skip Phase 4 sub-step 3f for any change with a UI surface — polish + wireframe consistency is mandatory, not "if there's time." If the user has to ask "did you check polish?", the skill failed.
- Do NOT mark wireframe drift as acceptable without classifying it. Every delta on an authoritative dimension is `intentional — style adaptation`, `intentional — decision`, or `regression`. "Close enough" is not a state.
- Do NOT diff visual style (color, typography, spacing, iconography, component library) against the wireframe. Those follow the host app's design system, not the wireframe. Pushing pixel-fidelity to the wireframe over host-app conventions is itself a failure mode.
