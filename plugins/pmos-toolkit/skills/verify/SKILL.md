---
name: verify
description: Post-implementation verification gate — ALWAYS run after /execute completes. Lint, test, deploy, spec compliance, multi-agent code review, interactive QA, and regression test hardening. Also run after manual coding or partial work. Works with git commits, no PR required. Use when the user says "check my work", "is this done", "verify the implementation", "did I miss anything", or "review and test everything".
user-invocable: true
argument-hint: "<path-to-spec-doc> (optional — resolved from the feature folder if omitted) [--feature <slug>] [--backlog <id>] [--skip-design-drift] [--skip-folded-arch] [--scope phase --phase <N> — internal, passed by /execute] [--format <html|md>] [--non-interactive | --interactive]"
---

# Implementation Verification Gate

Systematically verify that an implementation matches its spec, requirements, and plan. This is a **standalone verification gate** — run it anytime after implementation is done, regardless of how the code was written.

This is an **operational workflow** — a structured sequence of verification steps with evidence collection.

Natural-language phrasings map to the flags — "skip the architecture check" ≡ `--skip-folded-arch`, "skip the design-drift check" ≡ `--skip-design-drift`; an explicit flag overrides the inferred reading.

**Announce at start:** "Using the verify skill to run post-implementation verification."

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** State your assumption, document it in the output, and proceed. The user reviews after completion.
- **No subagents:** Perform research and analysis sequentially as a single agent.
- **No Playwright MCP:** "Unavailable" must be proven, not assumed — walk the browser-tool resolution ladder in Phase 4 sub-step 4d and paste the failed call/command output for each rung. Only after ALL rungs demonstrably fail may a specific test file covering the rendered output count as alternative evidence for a UI-surface FR, and that downgrade caps the final verdict at `PASS-WITH-GAPS` (Phase 8 verdict rule). Offloading verification to the user is not a valid completion state — it resolves to `Unverified — action required` on the Phase 5 compliance tables, and Phase 4 stays open.
- **Task tracking:** Use your available task tracking tool (e.g., `TaskCreate`/`TaskUpdate` in Claude Code, `update_plan` in Codex, or equivalent). If none is available, announce phase transitions verbally.

---

## Backlog Bridge

This skill optionally integrates with `/backlog`. See `plugins/pmos-toolkit/skills/backlog/pipeline-bridge.md`.

**At skill start:**
- If `--backlog <id>` was passed: load the item file as supplementary context. Note its `kind` (`epic` vs `story`) — a **story** item drives the write-back below and joins its acceptance criteria into Phase 5a (see `#spec-compliance`).
- **`route: skill` story (three-loop build, G6):** if the loaded item is `kind: story` with `route: skill`, additionally treat this as a skill-mode verify (the same behaviour the `skill-new`/`skill-feedback` pipeline gets via a prepended orchestrator directive, but self-detected here so unattended `build` is robust): **re-run the `[D]` half of `reference/skill-eval.md`** (`feature-sdlc/tools/skill-eval-check.sh --target <platform> <skill_dir>` — a final idempotent deterministic gate; the `[J]` half is NOT re-dispatched, it ran in the story's `build` `skill-eval` phase) and **reconcile against the story's `accepted_residuals[]`** if present: a still-failing accepted residual is reported `KNOWN / accepted at build skill-eval` (non-blocking, surfaced loudly); a newly-failing `[D]` check blocks normally → drives PASS-WITH-GAPS/FAIL → `blocked` write-back. An explicit prepended skill-mode directive (if the caller adds one) takes precedence but is not required.

**At skill end — write-back keyed off the Phase 8 verdict (`#commit-report`):**
- **Story item** (`kind: story`): map the verdict to status per `pipeline-bridge.md` ("Three-loop write-back rules"). **PASS** → `/backlog set {id} status=done` (+ `pr=` if the branch has a PR via `gh pr view --json url`). **PASS-WITH-GAPS or FAIL** → `/backlog set {id} status=blocked` AND append the enumerated verdict gaps to the item's `## Notes` body — this is the return-to-human channel that resurfaces the story in `/backlog groom`. All item mutations happen in the **main checkout** (never the worktree) and auto-commit path-scoped — the mechanics live in `pipeline-bridge.md`; do not restate them here.
- **Non-story / legacy item** (or no `kind`): only on a successful pass, `/backlog set {id} status=done` (+ `pr=` if available) — the pre-three-loop behavior, unchanged.
- On any `/backlog` failure, warn and continue.
- Run the auto-capture flow per `pipeline-bridge.md`: scan the verify output for "Known issues" / "Follow-up" sections and propose new backlog items.

---

## Track Progress

This skill has multiple phases. **Create one verification task per phase** at the start using your available task-tracking tool (e.g., `TaskCreate`/`TaskUpdate` in Claude Code), and mark each in-progress when you start it and completed as soon as it finishes — do not batch completions. If no task tool is available, announce phase transitions verbally (see Platform Adaptation):

1. Gather Context
2. Static Verification (lint, types, tests)
3. Code Quality Review
4. Deploy & Integration Verification
4a/4b. Folded-Phase Checks (feature-sdlc folders only)
5. Spec Compliance Check
6. Harden Test Suite
7. Final Compliance Pass
7a. Design-System Drift Check (advisory)
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

## Phase 0: Pipeline Setup (inline — do not skip) {#pipeline-setup}

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

### output_format resolution {#output-format}

7. **Resolve `output_format`.** Read `output_format` from `.pmos/settings.yaml` (default: `html`; valid values: `html`, `md` — legacy `both` is treated as `html` per `_shared/html-authoring/README.md`). A `--format <html|md>` argument-string flag overrides settings (last flag wins on conflict). Print to stderr exactly: `output_format: <value> (source: <cli|settings|default>)` once at Phase 0 entry. Controls the format of the **review-report write phase only** (Phase 8 step 2). Reading prior artifacts uses the resolver; the resolver returns whatever primary the upstream skill wrote, regardless of `output_format`.

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

## Phase 1: Gather Context {#gather-context}

### Caller contracts (when another skill invokes /verify)

- **Phase-scoped mode** — `/execute` Phase 2a invokes `/verify --scope phase --feature <slug> --phase <N>` at plan-phase boundaries: the full checklist runs against a phase-restricted changed-files set, evidence lands in a per-phase dir, and a structured `ok / evidence_dir / failures` result is returned to the caller. Follow `reference/invocation-contracts.md` §1.
- **Reviewer-subagent mode** — a parent orchestrator (currently `/feature-sdlc`) can dispatch this skill as a reviewer over a single artifact's chrome-stripped HTML. The shared contract is `_shared/reviewer-protocol.md`; the call-site delta: that contract covers ONLY the artifact-review path — the Phase 3 code-diff reviewers below consume git diffs, not artifact HTML, and are outside it (no chrome-strip, no quote validation there). Follow `reference/invocation-contracts.md` §2.

Standalone invocations: neither contract applies — proceed.

1. **Locate upstream documents.** Resolve each of the three inputs by following `_shared/resolve-input.md`:
   - Spec: `phase=spec`, `label="spec"` (user argument, if passed, applies to the spec)
   - Requirements: `phase=requirements`, `label="requirements doc"`
   - Plan: `phase=plan`, `label="plan"`
2. **Read all three documents** (whichever exist). You need these for the compliance check.
2a. **Locate wireframes (if present).** Check `{feature_folder}/wireframes/` for HTML wireframes produced by `/wireframes`. If the folder exists, list every screen file and treat wireframes as a fourth source document — but understand what they are and aren't:

   **Wireframes are authoritative for:** information architecture, screen inventory, component presence, copy and labels, state coverage (loading / empty / error / success), navigation entry/exit points, user-journey shape.

   **Wireframes are NOT authoritative for:** visual style, color palette, typography choice, exact spacing, component library, iconography, or pixel-level layout. Those follow the host application's existing design system and conventions — even when the wireframe shows something different. The /wireframes skill itself produces a `DESIGN.md` (canonical brand contract) and a `design-overlay.css` (generated CSS variable overlay) precisely because wireframes are intended to be adapted to the host app's style, not copied verbatim. Visual fidelity comes from DESIGN.md; the wireframe's role is information architecture and state coverage.

   When there's a conflict between a wireframe's visual treatment and the host app's established patterns, **the host app wins** unless the spec explicitly calls out a visual-style change as a goal. This shapes how Phase 4 sub-step 4f and Phase 5 sub-step 5d classify deltas. (This sub-step is the canonical statement of the wireframe-authority principle — everything else in this skill cites "per 2a".)
3. **Identify what changed.** Run `git diff main...HEAD --stat` (or appropriate base) to see which files were modified. This scopes the verification.
4. **Check if lint/type/tests were already run.** Ask the user or check recent terminal history. Skip steps already completed — but re-run if you're not confident they were clean.

---

## Phase 2: Static Verification (fast, run first) {#static-verification}

Run in this order. Each step must pass before proceeding to the next. If a step fails, fix the issue, then re-run.

1. **Lint & format** — e.g., `ruff check . && ruff format --check .` (or the project-appropriate linter; check `CLAUDE.md` for the correct commands). If issues found: fix them, re-run. Do not proceed until clean.
2. **Type checks** — Python: pyright or mypy; TypeScript: `tsc --noEmit`; frontend: `npm run lint` if it includes type checking. If issues found: fix them, re-run.
3. **Unit tests** — e.g., `pytest tests/ -v` (or the project-appropriate test command). **Evidence required:** paste the summary line showing pass/fail counts — "X passed, 0 failed" is the minimum bar. If failures: fix them. Do NOT skip failing tests. Do NOT mark tests as `@pytest.mark.skip` to make the suite pass.
4. **Frontend tests & lint (if applicable)** — e.g., `cd apps/<frontend-app> && npm run lint && npm test`.

---

## Phase 3: Multi-Agent Code Quality Review {#code-quality-review}

Review the diff from five angles — this catches code quality issues that static analysis and tests miss. Works against `git diff` (`main...HEAD` on a feature branch; `HEAD~N` when the commits are on main) — no PR required. Identify all CLAUDE.md files relevant to the changed directories (root + any directory-level ones), then dispatch 3–5 parallel Task subagents (`model: sonnet` — rubric-guided review behind a deterministic confidence filter), one angle each:

1. **CLAUDE.md compliance** — violations of project conventions, naming patterns, code style rules, or architectural constraints, with file:line and the specific CLAUDE.md rule.
2. **Bug scan** — changed lines only: off-by-one errors, null/undefined access, missing error handling at system boundaries, race conditions, resource leaks. Ignore style issues.
3. **Git history context** — `git blame` / `git log` on modified files: do the changes break assumptions from previous work (renamed functions still referenced elsewhere, removed code other modules depend on, changed behavior tests don't cover)?
4. **Comment compliance** — do the changes violate guidance in the modified files' comments (TODOs, invariants, "do not change" warnings, API contracts in docstrings)?
5. **Cross-file consistency** — signature, type, and config-key changes propagated to every caller and usage.

Each finding returns file:line, reasoning, and a confidence score (0–100). **Act only on findings scoring 75+** (verified real, will directly impact functionality, or explicitly violates CLAUDE.md). Log 50–74 as "noted but not blocking." Discard below 50 (likely false positives, nitpicks, or pre-existing issues).

For each issue acted on: fix it, re-run the relevant Phase 2 static step, and — if the fix changes behavior — add a regression test (Phase 6).

---

## Phase 4: Deploy & Integration Verification {#deploy-verification}

### Phase 4 Entry Gate — Enumerate the Verification Surface

Before running any Phase 4 sub-step, enumerate every upstream requirement that has a runtime surface and create one tracked task per item via your task tracking tool (`TodoWrite` in Claude Code). This list is the gate — Phase 4 is not complete until every todo is closed with evidence or explicitly resolved to `Unverified — action required` with a named blocker. A plain bullet list in prose does not substitute for tracked tasks; the tasks are the structural enforcement. Where no task tool exists, the Phase 5 compliance table — one row per enumerated item — IS the gate (the same degradation phase-scoped mode uses).

> **Phase-scoped exception:** When invoked with `--scope phase --feature <slug> --phase <N>` (see `reference/invocation-contracts.md` §1, change #3), the markdown table in the phase's `review.{html,md}` IS the gate. Do not create tracked tasks per FR-ID for phase-scoped runs — the per-task logs already carry the same outcome+evidence contract.

**How to build the list:**

1. Read the spec's FR-IDs and edge cases. For each, classify the runtime surface:
   - **UI surface** (user sees, clicks, enters something) → todo required
   - **API surface** (new or modified endpoint) → todo required
   - **Data surface** (migration, schema change, background job output) → todo required
   - **Pure internal logic** (algorithm verified by unit test only) → NOT on the list; cite the test in Phase 5 compliance instead
2. Read the requirements doc's user journeys. Every end-to-end journey with UI or API touchpoints gets one todo.
3. For each enumerated item, create a tracked task formatted as:
   `Verify <FR-ID or Journey-ID>: <one-line description> [evidence: <type from table below>]`

**Browser-mandatory trigger (deterministic — not a judgment call):**

Compute from the Phase 1 changed-files list. If ANY changed file matches `*.html`, `*.tsx`, `*.jsx`, `*.vue`, `*.svelte`, `*.css`, `*.scss`, lives under a `frontend/`, `static/`, `public/`, `app/`, `components/`, `pages/`, or `src/ui/` directory, OR the feature emits/regenerates any `.html` artifact (check the spec's deliverables and `{feature_folder}/` outputs) — then the browser sub-steps (4d, 4e, 4f) are MANDATORY. The classification "no UI surface" is NOT available for this run, regardless of whether a dev server, Docker stack, or deploy step exists.

**A browser surface does not require a server.** If the deliverable is an HTML file, that file IS the UI surface: serve it (`python3 -m http.server`, `npx serve`) or load it directly — Playwright MCP opens `file://` URLs. "No deploy surface" describes 4b/4c, never 4d–4f.

**Evidence-type allowlist by sub-step:**

| Sub-step | Acceptable evidence |
|----------|--------------------|
| 4a. Database Migrations | Migration command output + DB schema query confirming the new shape |
| 4b. Docker Deployment | Service health check output + startup log snippet showing no errors |
| 4c. API Smoke Tests | `curl` response body compared row-by-row to the spec's API contract |
| 4d. Frontend Verification | Playwright MCP screenshot, `browser_evaluate` DOM assertion, or a specific test file covering the rendered output. **Synthesized `KeyboardEvent`s must use `bubbles: true` to reach document-level listeners; otherwise the listener won't fire and you'll log a false negative.** |
| 4e. Interactive Spot Checks | Playwright MCP interaction trace covering a user journey end-to-end, including at least one error/edge path |
| 4f. UX Polish & Wireframe Consistency | Per-page checklist results (see 4f) AND, if wireframes exist, a wireframe-vs-implementation diff note per affected screen classifying each delta as `intentional` or `regression` |

**Every enumerated todo resolves to exactly one of three outcomes:**

1. **Verified** — evidence produced and cited. The evidence type must match the allowlist row for the sub-step. Close the todo.
2. **NA — alternative evidence cited** — the runtime surface doesn't exist for this item (e.g., FR is a pure calculation change). Cite the alternative (e.g., `test_pricing.py::test_discount_applied`) or the specific reason tied to the FR text. Bare "NA" is not valid. Close the todo with the alternative recorded.
3. **Unverified — action required** — you attempted verification and were blocked. State the specific blocker and the user action needed (e.g., "user must run `make seed-dev-db` before 4e can proceed"). Leave the todo OPEN and surface it in the Phase 8 final report.

**Setup is part of Phase 4, not a prerequisite.** Starting the dev server, seeding the DB, running migrations, authenticating — all Phase 4 work. If setup is complex, write down the exact commands, execute them, and proceed. Only escalate to the user when a genuine decision is required (e.g., "which dev DB to use"), not to offload execution. "Setup would take too long" is a Phase 4 red flag, not a reason.

### Phase 4 Red Flags — rationalizations that mean you're about to skip

If any of these thoughts surface during Phase 4, stop and re-read the entry gate. Each is a rationalization the skill has seen and named:

| Thought | Reality |
|---------|---------|
| "Automated tests already pass — good enough" | Automated tests miss UX, rendering, timing, and copy issues. The entry gate still applies. Every enumerated todo still needs evidence. |
| "This is out of scope for /verify" | Phase 4 is a numbered phase in this skill. Verification cannot be out of scope for the verification skill. |
| "The user can verify this at their desk" | Playwright MCP, `curl`, and DB queries are agent-owned tools. Offloading interactive verification to the user resolves to `Unverified — action required`, not `Verified`. |
| "Setup would take too long" | Setup is Phase 4 work. If you have time to write the final report, you have time to start the server. |
| "The happy path worked; good enough" | The spec's edge cases are explicit. Test at least one error/edge path per affected flow — the entry gate names this in 4e's evidence row. |
| "I'll note it as a gap" | A gap you could have verified but didn't is not a gap — it's a skip. Either produce evidence (close as Verified), cite alternative evidence (close as NA), or name the blocker (leave open as Unverified-action-required). There is no fourth state. |
| "Polish is cosmetic — out of scope for verification" | Polish *is* the user-facing product. Sub-step 4f is mandatory for any change with a UI surface. If the user has to push you to check polish, the skill failed. |
| "Wireframes were just sketches — implementation is allowed to drift" | Style drift is *expected* (per 2a), but unexamined drift on the authoritative dimensions is a skip. Classify every delta as `intentional — style adaptation`, `intentional — decision`, or `regression`. A wireframe-diff with zero deltas listed is suspicious. |
| "I should make the implementation look exactly like the wireframe" | No — visual style follows the host app's design system, not the wireframe (per 2a). Forcing pixel-fidelity over host-app conventions is itself a `regression` against the host app's design system. |
| "Hard-reload / deep-link works in-app, that's enough" | Parameterized routes must be hard-reloaded (open URL fresh in a new tab via Playwright) for every affected route. In-app navigation hides router-resolver bugs. |
| "There's no dev server / it's just an HTML file — nothing to deploy" | The HTML file IS the runtime surface. Serve it or open it via `file://`; the browser-mandatory trigger already fired. |
| "The e2e suite already drives a browser" | Headless specs verify what they assert; they don't see rendering, copy, polish, or your new bug. The interactive walk (4e) still runs. |

### 4a. Database Migrations (if applicable)

```bash
alembic upgrade head
```

Verify the migration applied cleanly. Check for errors in output.

### 4b. Docker Deployment

Deploy to the appropriate environment (main stack or worktree stack):

```bash
docker compose build <affected-services> && docker compose up -d <affected-services>
```

Wait for services to be healthy. Check logs for startup errors.

### 4c. API Smoke Tests

For every new or modified API endpoint, verify the response shape matches the spec:

```bash
curl -sf <endpoint> | python3 -m json.tool
```

**Evidence required:** Show the actual response and compare it to the spec's API contract. Flag any mismatches.

### 4d. Frontend Verification (Playwright MCP)

**Slop gate — deterministic Node-path pre-check (runs before the browser walk; distinct from screenshot evidence) {#slop-gate}**

Before resolving a browser tool, run the vendored design-slop detector over each generated HTML artifact via the **cheap Node path** — no Playwright, no browser, no network, no LLM. It is deterministic (§H — the engine does the contrast/a11y arithmetic; the model never eyeballs it):

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/verify/scripts/slop-gate.mjs" --source <generated-or-served-html>
```

- **Tiering reuses the existing browser-mandatory trigger** (the Phase 4 entry gate above) — do NOT re-invent frontend detection. Trigger **positive** ⇒ the slop gate is **mandatory** (run it on every generated `.html` artifact and affected UI file). Trigger **negative** (non-UI change) ⇒ **skipped-with-log**: emit one sentence to the Phase 8 report — `slop gate: skipped — no UI surface (browser-mandatory trigger negative)` — the same discipline as 4f's "skip only if zero UI surface".
- **It is distinct from the Playwright sub-steps below.** The slop gate is a static pre-pass on the HTML *source*; it is NOT screenshot evidence and never substitutes for the 4d browser walk (which still runs). The two lanes are reported separately so they can never be conflated.
- **Two finding lanes — category drives severity** (see `#slop-routing`): `quality` (contrast/a11y/rendering arithmetic) findings can be `[Blocker]` and **gate**; `slop` (taste / AI-tell) findings are `[Should-fix]`/`[Nit]`, surfaced loudly but **never hard-block** (D-TIER — taste must not stop a ship). The runner's **exit code is the deterministic signal**: `2` = a `[Blocker]` quality fault is present (the gate fires; the Phase 8 verdict drops below bare PASS), `0` = no quality blocker (slop, if any, is advisory only).
- **Graceful degradation (Inv-5) — never flips a correct PASS to FAIL on tooling absence.** If `_shared/slop-engine/` is absent, `detect.mjs` throws, or the vendored parser can't process the HTML, the runner prints a non-fatal `slop gate skipped — engine/parser unavailable` note and exits `0`; `/verify` continues with prior behaviour. This mirrors the `#hard-gates` comments-coverage existence-guard and the browser-tool-ladder rung-4 logged-skip below. A check the Node parser can't reproduce (the engine's layout-dependent `BROWSER_ONLY_RULES`) is skipped on the Node path with a logged note — it runs via `/design-crit`'s browser path (story B) — never silently dropped.

Findings route per `#slop-routing` and surface as a distinct section in Phase 5 (`#slop-findings`) and the Phase 8 verdict block (`#commit-report`).

**Resolve your browser tool first (in order; stop at the first rung that works):**

1. **Playwright MCP** — if `browser_*` tools are not in your immediate tool schema, they may be DEFERRED: load them first (e.g., ToolSearch `select:browser_navigate,browser_snapshot,browser_take_screenshot,browser_console_messages`). Then prove liveness: `browser_navigate` to the target URL.
2. **Chrome DevTools MCP** (`chrome-devtools` tools) — same liveness probe.
3. **Headless scripted fallback** — `npx playwright screenshot <url> out.png`, or a ~10-line playwright/puppeteer Node script; attach the screenshot.
4. **None worked** → paste the FAILED tool-call/command output for each rung (a pasted failure is the only valid evidence of unavailability — "the tool seems unavailable" without a failed call is not a blocker, it's a skip), mark every browser todo `Unverified — action required`, and cap the final verdict at `PASS-WITH-GAPS` (Phase 8 verdict rule).

Automated test suites (headless e2e specs, RTL/vitest component tests) are alternative evidence ONLY after rung 4 — never while a browser tool works. A test-runner's missing chromium download (`npx playwright install`) says nothing about the MCP browser; they are different browsers.

For every affected UI flow:

1. **Authenticate first** (if auth is enabled)
2. **Navigate** to each affected page
3. **Walk through** every user journey from the spec
4. **Check** for console errors/warnings
5. **Take screenshots** for evidence — save them under `{feature_folder}/verify/<YYYY-MM-DD>/` (the evidence dir; the Phase 7 browser-evidence gate and the Phase 8 verdict rule look for them there)
6. **Verify** that UI matches spec's frontend design section

### 4e. Interactive Spot Checks

Run actual scenarios in the development environment. Interact with the system as a user would. Specifically:

- Test the happy path end-to-end
- Test at least one error/edge case from the spec
- Test empty states if applicable
- Verify that unrelated flows still work (no regressions)

**Do NOT rely only on automated tests.** Interactive verification (Playwright MCP driving real user journeys) catches issues that tests miss: rendering glitches, confusing UX, wrong copy, timing issues. "Interactive" means you operate the browser via MCP — not that a human operates it for you.

### 4f. UX Polish & Wireframe Consistency (mandatory for any UI-touching change)

This sub-step exists because automated tests, API smoke tests, and happy-path Playwright walks all pass while the product still ships with `<title>Vite App</title>`, `alt="image"`, leaked internal IDs in user-facing copy, and broken hard-reload. Polish is the product — it is not optional, and it is not a follow-up.

**Skip only if** the change has zero UI surface (pure backend, infra, or library-internal). Document the skip with one sentence. Otherwise this sub-step runs.

**Part 1 — Wireframe diff (only if `{feature_folder}/wireframes/` exists from Phase 1).** Wireframes are a *reference*, not a spec (per 2a). For each affected screen:

1. Open the wireframe HTML and the live implementation side-by-side via Playwright MCP.
2. Compare **only on the dimensions wireframes are authoritative for** (per 2a): IA, screen inventory, component presence, copy and labels, state coverage, affordances (CTAs, disabled states), navigation entry/exit. Do NOT diff visual style — it is expected to follow the host app and differ from the wireframe by design.
3. Record every delta on the authoritative dimensions in the wireframe-diff table (Phase 5 sub-step 5d). Classify each as one of:
   - **`intentional — style adaptation`**: wireframe showed something the host app's design system handles differently. No fix needed; this is the expected adaptation. Cite the host-app convention.
   - **`intentional — decision`**: a deliberate departure recorded during /execute or earlier (cite the decision record).
   - **`regression`**: a missed requirement on an authoritative dimension (e.g., an empty state in the wireframe is missing from the implementation, copy is wrong, a journey step was dropped). Must be fixed in this verify pass, then re-verified.
4. "Wireframe and implementation match" with no deltas listed is not acceptable evidence — name at least the authoritative dimensions checked.

**Part 2 — UX polish checklist (always runs).** Walk the changed UI surface in Playwright and check every item below. Each becomes a row in the Phase 5 sub-step 5d table.

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

**Evidence required (per the entry gate's 4f row):** the polished-checklist table with one outcome per row (`pass` / `fail` / `NA — reason`) AND, if wireframes existed, a wireframe-diff entry per affected screen. Failures become Phase 5 5d gaps and Phase 6 regression tests.

### 4g. Slop-finding routing {#slop-routing}

The slop gate (`#slop-gate`) emits findings in two categories; route them through `_shared/findings-dispositions.md` (the canonical disposition + severity + non-interactive contract — cite, don't restate). The **per-skill delta** is the deterministic category→severity map below — the engine assigns it (§H arithmetic), the model never re-judges it:

| Engine category | Severity bracket | Gating? | Disposition default |
|---|---|---|---|
| `quality` (contrast / a11y / rendering arithmetic) | `[Blocker]` (curated WCAG/render faults) or `[Should-fix]` | **CAN GATE** — a `[Blocker]` quality fault drops the Phase 8 verdict below bare PASS (`#commit-report`) | Fix-as-proposed (a contrast/clipping fault is mechanical) |
| `slop` (taste / AI-tell) | `[Should-fix]` or `[Nit]` (the 8 engine-`advisory` tells) | **NEVER hard-blocks** — surfaced loudly, advisory only (D-TIER, grill-confirmed: taste must not stop a ship) | Skip/Defer is acceptable; record the call |

The bracket is **not** read from engine severity (most rules default `warning`, which is uninformative) — it is the gate runner's frozen `BLOCKING_QUALITY` id set (§H: a script computes it, deterministically and reproducibly; the model does not). **Non-interactive** (`--non-interactive`): per `findings-dispositions.md`, `[Blocker]` quality faults are auto-fixed-as-proposed when mechanical (and otherwise surfaced as the gap that drops the verdict); `slop` findings are buffered to the report as advisory and never block — no `AskUserQuestion` is issued (the gate is automatic, the routing deterministic).

---

## Phase 4a: Folded-phase awareness {#folded-phase-awareness}

Only when the feature folder was produced by /feature-sdlc (a worktree `state.yaml` exists) — otherwise skip silently. Follow `reference/folded-phases.md` §A: prefer the slug-distinct MSF artifact paths (legacy `msf-findings.md` still passes, with a soft warning), emit the affirmative completion line when every folded phase was skipped via documented flags, warn when a Tier-3 feature shows no folded artifacts AND no documented skips, and re-emit one advisory warning per `folded_phase_failures[]` entry. Advisory throughout — never blocks PASS. Shared folding mechanics: `_shared/folded-phase.md`.

## Phase 4b: Folded /architecture --since (T2 scoped; T3 full; T1 skip) {#folded-arch}

Delegates to `/architecture --since` to lint this branch's code changes against the architectural assertions baked into `02_spec.html`. **Skip entirely if `--skip-folded-arch` was passed** (the folding's escape flag per `_shared/folded-phase.md`): emit `architecture: --skip-folded-arch flag; skipping` to stderr and proceed to Phase 5 — no dispatch, no state mutation.

- **Tier 1** — emit `arch sub-step: tier 1, skipping` to chat; no dispatch.
- **Tier 2** — Scoped run: dispatch with `--since` against the changed file set only.
- **Tier 3** — Full run: dispatch with `--since $(git merge-base HEAD main)`.

Dispatch, timeout, and aggregation mechanics: `reference/folded-phases.md` §B. Findings aggregate into the report as the `### Architecture findings` section; dispatch failures append to `state.yaml.phases.verify.folded_phase_failures[]` and emit an advisory warning — folded-phase failures never block /verify PASS.

## Phase 5: Spec Compliance Check {#spec-compliance}

This is the most important phase. Re-read each upstream document and verify every requirement is implemented.

**Three-state outcome model (applies to 5a, 5b, 5c):**

Every row in every compliance table resolves to exactly one of three outcomes. Bare "Pass", "Fail", "Complete", or "Partial" are not valid — they collapse into the three below, and every row's `Evidence` column must cite a concrete artifact.

| Outcome | Meaning | Required in Evidence column |
|---------|---------|----------------------------|
| **Verified** | Requirement/task met; evidence produced during Phase 2–4. | Test file + function, screenshot path, `curl` output excerpt, DB query result, or commit SHA. The evidence type must match what was declared in the Phase 4 entry gate allowlist if the row has a runtime surface. |
| **NA (alt-evidence)** | No runtime surface for this row, OR the row was intentionally out of scope and covered indirectly. | Named alternative: e.g., "covered by `test_pricing.py::test_discount_applied`", or the specific reason tied to the requirement text (e.g., "FR narrative change only — no code path"). Bare "NA" or "N/A" is not valid. |
| **Unverified — action required** | Verification was attempted and blocked. The row is NOT resolved. | The specific blocker and the user action needed to unblock (e.g., "Playwright MCP unavailable in this environment — user must install; re-run 4d after"). Unverified rows must also appear in the Phase 8 final report as open items. |

Every row also cross-references the todo it closed (or left open) from the Phase 4 entry gate, if applicable. If no Phase 4 todo was created (pure internal logic), the Evidence column names the unit test that covered it.

### 5a. Requirements Compliance

Read `{feature_folder}/01_requirements.{html,md}` (resolved in Phase 1 via the resolver). For every goal, user journey, and acceptance criterion:

**Story acceptance criteria (three-loop build).** When `--backlog <id>` names a `kind: story` item, add each of the story's `## Acceptance Criteria` as its own compliance row (same three-state model). A story does not reach `done` unless every AC row resolves `Verified` or `NA — alt-evidence`; an `Unverified — action required` AC forces the Phase 8 verdict to PASS-WITH-GAPS (or FAIL), which the Backlog Bridge writes back as `blocked` (see `#commit-report` and the Backlog Bridge above).

| # | Requirement | Outcome | Evidence |
|---|-------------|---------|----------|
| Goal 1 | [From requirements] | Verified / NA / Unverified | [Per the three-state model: test file, screenshot path, curl excerpt, DB query, alt-evidence citation, or blocker + user action] |
| Journey 1, Step 3 | [Specific step] | Verified / NA / Unverified | [e.g., `screenshots/j1-s3.png` from Phase 4 4d, or `Unverified — dev server wouldn't start; user must run docker compose up`] |

### 5b. Spec Compliance

Read `{feature_folder}/02_spec.{html,md}` (resolved in Phase 1 via the resolver). One row per FR-ID and edge case, using this template **verbatim — do not freelance the `Outcome` column:**

```markdown
| ID | Requirement | Outcome | Evidence |
|----|-------------|---------|----------|
| FR-01 | <one-line restatement of the FR from the spec> | Verified | <test file::function, screenshot path, curl excerpt, DB query, or commit SHA> |
| FR-02 | <one-line restatement> | NA — alt-evidence | <named alternative — e.g., `test_pricing.py::test_discount_applied`, OR specific reason tied to FR text> |
| FR-03 | <one-line restatement> | Unverified — action required | <specific blocker + user action — e.g., `Playwright MCP unavailable; user must install; re-run 4d after`> |
| E1 | <edge case from spec> | Verified | <evidence for the edge case, not the happy path> |
```

Allowed `Outcome` values are exactly `Verified`, `NA — alt-evidence`, and `Unverified — action required`. Bare `Pass`, `Fail`, `Complete`, `Partial`, `✓`, or `❌` are not valid — they collapse into the three above. Edge-case rows need evidence for the edge case specifically, not the happy path. Every `Unverified — action required` row also appears in the Phase 8 final report as an open item.

### 5c. Plan Compliance

Read `{feature_folder}/03_plan.{html,md}` (resolved in Phase 1 via the resolver). For every task:

| Task | Outcome | Evidence |
|------|---------|----------|
| T1: [Name] | Verified-complete / NA-skipped-with-reason / Unverified | [Commit SHA(s) implementing the task + at least one test or Phase 4 verification artifact; OR the decision record for an intentional skip (e.g., "merged into T3 during execution"); OR the blocker + user action] |
| T2: ... | ... | ... |

**For plan-task outcomes:**
- `Verified-complete` requires BOTH a commit reference AND a verification artifact (test, screenshot, curl excerpt). A commit alone is not evidence of correctness — only of existence.
- `NA-skipped-with-reason` requires naming the decision AND where it was recorded (plan update, session log, commit message). "NA" without a reason is not valid.
- `Unverified` means the task was claimed done but the verification couldn't be produced. This is a gap — surface it in the 5e Gap Report.

### 5d. Wireframe & UX Polish Compliance

This table consolidates the output of Phase 4 sub-step 4f. Skip only if the change had zero UI surface (note the skip and proceed to 5e).

**Part 1 — Wireframe deltas (only if `{feature_folder}/wireframes/` was loaded in Phase 1):**

| Screen | Delta (authoritative dimensions only) | Classification | Evidence / Rationale |
|--------|--------------------------------------|---------------|---------------------|
| `01_dashboard.html` vs `/dashboard` | [What differs on IA / copy / states / journeys — NOT visual style] | `intentional — style adaptation` / `intentional — decision` / `regression` | [Screenshot pair, decision record reference, host-app convention reference, or fix commit] |

Diff only the dimensions wireframes are authoritative for (per 2a) — visual-style differences are expected and not listed as deltas. If a screen had zero deltas on the authoritative dimensions, write one row stating that explicitly and naming the dimensions checked (IA, copy, states, journeys) — empty tables are not acceptable evidence.

**Part 2 — UX polish checklist results:**

| # | Check | Outcome | Evidence |
|---|-------|---------|----------|
| P1 | `document.title` set per route | Verified / Failed / NA | [`browser_evaluate` output, or fix commit if it failed and was repaired this pass] |
| P2 | No internal IDs / enum keys in user copy | ... | ... |
| ...P3–P12 | (one row per checklist item from 4f) | ... | ... |

Every `Failed` row in either part becomes a Phase 5 5e Gap Report entry AND a Phase 6 regression test.

### 5e. Gap Report

List every gap found:

| # | Gap | Severity | Source Doc | Action |
|---|-----|----------|-----------|--------|
| 1 | [What's missing] | Critical/Medium/Low | [Which doc] | [Fix or defer] |

**If critical gaps exist:** Fix them before proceeding. Re-run affected verification steps.

### 5f. Slop-Findings (machine-flagged, deterministic) {#slop-findings}

A distinct section for the `#slop-gate` output — kept separate from the human-judged 5d UX-polish table so the two lanes are never conflated (the slop gate is a static pre-pass on HTML *source*; 4f is an interactive browser walk). Skip with one logged sentence when the browser-mandatory trigger was negative — `slop gate: skipped — no UI surface` — never silently.

Two lanes, mirroring `#slop-routing`:

| Lane | Findings | Verdict effect |
|---|---|---|
| **Quality faults** | `[Blocker]` / `[Should-fix]` `quality`-category findings (id, snippet, file) | a `[Blocker]` row is a **critical gap** — it joins 5e and drops the Phase 8 verdict below bare PASS (`#commit-report`). A fixed-this-pass `[Blocker]` cites its fix commit. |
| **Slop tells** | `[Should-fix]` / `[Nit]` `slop`-category findings (id, snippet, file) | **advisory** — surfaced loudly but never a gap; recorded with its disposition (Fixed / Skipped / Deferred per `_shared/findings-dispositions.md`). |

The read surface `/complete-dev`'s summary inherits is this 5f section plus the `#commit-report` verdict block — so a skipped quality blocker and the advisory slop list both reach the release summary.

---

## Phase 6: Harden the Test Suite {#harden-tests}

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

## Phase 7: Final Compliance Pass {#final-compliance}

One last check before committing:

1. **Re-read the spec one final time.** Is there ANYTHING mentioned that isn't implemented or verified?
2. **Check for TODO/FIXME/HACK** in the changed files. Resolve them or flag them explicitly.
3. **Check for debug logging** or temporary code that should be removed.
4. **Check for hardcoded values** that should be configuration.
5. **Verify documentation is updated** (CLAUDE.md, changelogs, API docs).

### Phase 7 Hard Gates {#hard-gates}

The following script checks must pass before Phase 8 (Commit & Report). A non-zero exit blocks `/verify` completion for this feature.

**Existence guard:** the repo-root gate scripts (e.g., the comments coverage check) are agent-skills-repo-specific. Before running each one, check that the script exists at the repo root (e.g., `[ -f scripts/check-comments-coverage.sh ]`). If it does not exist in the host repo, skip the gate and note in the Phase 8 report: "comments-coverage gate skipped — agent-skills-repo-specific gate, script not present in this repo." Where the script exists, the gate remains hard.

- **Comments coverage check:** `bash scripts/check-comments-coverage.sh` — refuses /verify completion if any of the 14 `apply-edit-at-anchor` contract tests are missing (13 originating skills + 1 orchestrator), if any of the 15 emit references are absent (13 skill-level `comments.js` refs + 2 orchestrator surface refs for `00_pipeline.html` and `00_open_questions_index.html`), or if the resolver integration test or calibration tests (`scorer.test.js`, `reanchor.integration.test.js`) are missing. Bypassable only via documented spec amendment.
- **Browser evidence check:** `bash "${CLAUDE_PLUGIN_ROOT}/skills/verify/scripts/check-browser-evidence.sh" "{feature_folder}" <changed_files_list>` — write the Phase 1 changed-files list to a file first (e.g., `git diff --name-only main...HEAD > /tmp/verify-changed-files.txt`), or omit the second argument to let the script derive it from `git merge-base HEAD main`. Exits non-zero when the changed files match the browser-mandatory trigger patterns (Phase 4 entry gate) but no screenshot (`*.png`/`*.jpg`/`*.jpeg`/`*.webp`) exists under `{feature_folder}/verify/`. A failure here means the verdict cannot be bare `PASS` (Phase 8 verdict rule) — either produce the Phase 4d–4f evidence now, or downgrade to `PASS-WITH-GAPS` with every gap enumerated. Ships with this skill (host-repo-agnostic — it reads the feature folder, not repo internals), so the existence guard above does not apply: this gate runs in every host repo.
- **Dogfood verdict check (Tier 2/3 — non-skippable):** when the feature carries a **TN−1 dogfood task** (the load-bearing utility verification defined in `_shared/dogfooding.md` — `/plan` emits it as mandatory at Tier 2/3, offered at Tier 1), that task MUST carry a **satisfied verdict** before Phase 8. Read the verdict line the dogfood task writes for `/verify` — `**Verdict:** satisfied | not-satisfied · accepted_residuals: [...]` (`_shared/dogfooding.md#anatomy` item 6) — from the dogfood task's evidence in the feature folder (its `execute/` task log or a `dogfood-run.md` the iterate loop wrote; grep `{feature_folder}` for the `**Verdict:**` line). The gate is deterministic on that line:
  - **Satisfied** — objective gates green **AND** the independent judge `overall_satisfied` (the dual bar from `_shared/dogfooding.md#eval-criteria`) → gate **passes**.
  - **Missing or `not-satisfied`** → the verdict cannot be bare `PASS`: cap the Phase 8 verdict at `PASS-WITH-GAPS` (or `FAIL` if a *critical* objective gate failed), enumerating each `gaps:` entry one-per-line in the verdict block.
  - **Accepted residuals** — a `not-satisfied` verdict whose remaining gaps are all carried in `accepted_residuals[]` (the iterate loop hit its cap and accepted them per `_shared/dogfooding.md#iterate-loop` step 5) is reconciled, **not silently passed**: see the residual reconciliation below.
  - **Tier 1 with no dogfood task** → gate **N/A** (clean pass) — Tier-1 dogfood is recommended-skip per `_shared/dogfooding.md#tier-policy`.
  - **Non-skippable for Tier 2/3** (mirrors the browser-evidence gate above): no flag suppresses this gate for an enhancement/feature; a T2/3 feature folder with **no** dogfood verdict at all resolves the gate to *missing* (→ `PASS-WITH-GAPS`), never to a silent pass. Tier is the resolved `{tier}` (from a `--backlog` story's `type:` — `feature`→T3, `enhancement`→T2, `bugfix`→T1 — or the plan's tier); when a TN−1 task is present the feature is T2/3 by construction (`/plan` only emits it there), so the gate fires whenever the task exists.

  **Accepted-residual reconciliation (dogfood iterate loop).** Reuse the existing route:skill skill-eval residual pattern — the Backlog Bridge already reconciles a story's `accepted_residuals[]` the same way at build-time (see the Backlog Bridge "`route: skill` story" rule at the top of this skill; do not fork it). Applied to the dogfood verdict's `accepted_residuals[]`: re-check each accepted residual against the current run — a **still-failing accepted residual** is reported `KNOWN / accepted` (non-blocking), surfaced **loudly** in the Phase 8 verdict block + report (which `/complete-dev` reads into its summary); a **newly-failing objective gate** (not previously accepted) blocks normally → drives `PASS-WITH-GAPS`/`FAIL` → `blocked` write-back. Cite `_shared/dogfooding.md` for the verdict + dual-criteria shape — do not restate the protocol here.

---

## Phase 7a: Design-System Drift Check (advisory) {#design-drift}

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

## Phase 8: Commit & Report {#commit-report}

**Verdict rule (deterministic — compute before writing the report):** the final report carries exactly one verdict line: `PASS`, `PASS-WITH-GAPS`, or `FAIL`.

- **`PASS`** — every compliance row resolved `Verified` or `NA — alt-evidence`, all Phase 7 hard gates green, AND — whenever the browser-mandatory trigger (Phase 4 entry gate) fired — at least one screenshot file from this run exists under `{feature_folder}/verify/` AND zero UI-affecting FRs sit at `Unverified — action required` AND — whenever a TN−1 dogfood task exists (Tier 2/3) — its verdict is `satisfied` (Phase 7 dogfood-verdict gate green, no still-failing residuals) AND — whenever the slop gate ran (`#slop-gate`, browser-trigger positive) — zero unfixed `[Blocker]` quality faults remain (slop-category tells never affect this — they are advisory per `#slop-routing`). Bare `PASS` without that browser evidence, with a missing/`not-satisfied` dogfood verdict, or with an unfixed `[Blocker]` quality fault, is not available.
- **`PASS-WITH-GAPS`** — verification is materially complete but enumerated gaps remain: all browser-tool rungs failed (4d ladder, rung 4), UI-surface rows left `Unverified — action required`, a sub-step skipped with a named blocker, a missing/`not-satisfied` dogfood verdict (Tier 2/3), **or** an unfixed `[Blocker]` quality fault from the slop gate that is otherwise material (advisory `slop` tells are listed in 5f but never drive this) — with each dogfood `gaps:` entry enumerated one-per-line in the verdict block, and each still-failing `accepted_residuals[]` item surfaced as a loud `KNOWN / accepted` line (non-blocking, carried into the `/complete-dev` summary). The verdict block MUST enumerate each gap — one line per gap naming the row ID, the blocker, and the user action required. Never collapse these into a bare `PASS`. `/complete-dev` treats `PASS-WITH-GAPS` as confirmation-required, not a green light.
- **`FAIL`** — a Phase 7 hard gate failed, a critical 5e gap remains unfixed (an unfixed `[Blocker]` quality fault from the slop gate is a critical gap), or a *critical* dogfood objective gate failed.

1. **Commit all changes** (fixes, new tests, documentation updates):
   ```bash
   git add <specific-files>
   git commit -m "fix: verification fixes for <feature>"
   ```
   If there are multiple logical changes, use multiple commits.

2. **Write the review report** to `{feature_folder}/verify/{YYYY-MM-DD}-review.html` per the substrate at `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/`. If a report with that name already exists from an earlier run today, append `-2`, `-3`, etc. (e.g., `2026-04-30-review-2.html`). The report contains the same content delivered to the user in step 3. For phase-scoped invocations (`reference/invocation-contracts.md` §1), the path becomes `{feature_folder}/verify/{YYYY-MM-DD}-phase-<N>/review.html`.

   - **Atomic write (FR-10.2):** write `<name>.html` and the companion `<name>.sections.json` via temp-then-rename.
   - **Asset substrate (FR-10):** copy `assets/*` from `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/` to `{feature_folder}/assets/` if not already present. The substrate currently includes `style.css`, `viewer.js`, `serve.js`, `build_sections_json.js`, `comments.js`, `comments.css`, and the launcher trio (`comments-open.command`, `comments-open.sh`, `comments-open.bat`); new substrate files added in future releases ride along automatically. Idempotent — `cp -n` skips identical files.
   - **Asset prefix (FR-10.1):** `verify/` is one level below the feature folder, so the per-folder relative asset prefix is `../assets/`. Phase-scoped runs nest one further (`verify/<date>-phase-<N>/`), so the prefix is `../../assets/`.
   - **Cache-bust (FR-10.3):** append `?v=<plugin-version>` to all asset URL references emitted into the HTML.
   - **Heading IDs (FR-03.1, enforced by `/verify` itself — self-check):** every `<h2>` and `<h3>` carries a stable kebab-case `id` per `_shared/html-authoring/conventions.md` §3.
   - **Index regeneration (FR-22, §9.1):** after the review write completes, regenerate `{feature_folder}/index.html` via `_shared/html-authoring/index-generator.md` (manifest inlined as `<script type="application/json" id="pmos-index">`, no on-disk `_index.json`, FR-41). Phase-scoped runs do NOT regenerate (the per-phase review is a sub-artifact of the parent verify dir).
   - **Mixed-format sidecar (FR-12.1):** retired — `output_format=both` is treated as `html` until a future feature re-introduces MD export.

3. **Report to the user:**
   - Verdict line (per the verdict rule above) — with the per-gap enumeration when `PASS-WITH-GAPS`
   - Verification summary (which phases passed/failed)
   - Compliance tables (requirements, spec FR-IDs, plan tasks)
   - Gaps found and how they were resolved
   - New tests added (count and what they cover)
   - Any remaining issues that need user decision

---

## Phase 9: Workstream Enrichment {#workstream-enrichment}

**Skip if no workstream was loaded in Phase 0.** Otherwise, follow `_shared/pipeline-setup.md` Section C. For this skill, the signals to look for are:

- Implementation gaps discovered vs spec → workstream `## Key Decisions`
- New constraints or scars uncovered during verification → workstream `## Constraints & Scars`

This phase is mandatory whenever Phase 0 loaded a workstream — do not skip it just because the core deliverable is complete.

---

## Phase 10: Capture Learnings {#capture-learnings}

**This skill is not complete until the learnings-capture process has run.** Read and follow `_shared/learnings-capture.md` (relative to the skills directory) now. Reflect on whether this session surfaced anything worth capturing — surprising behaviors, repeated corrections, non-obvious decisions. Proposing zero learnings is a valid outcome for a smooth session; the gate is that the reflection happens, not that an entry is written.

---

## Evidence Standards {#evidence-standards}

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

For Phase 4 skip rationalizations specifically, see the **Phase 4 Red Flags** table — the thoughts named there are the most common skips. This section covers general-purpose anti-patterns that apply across phases.

- Do NOT mark failing tests as skip to make the suite pass
- Do NOT claim "tests pass" without showing the output
- Do NOT skip the Phase 5 spec compliance check — this is the most valuable phase
- Do NOT leave discovered issues as "known gaps" — every item resolves to one of the three Phase 5 states (Verified, NA-with-alt-evidence, or Unverified-action-required with a named blocker). There is no fourth state.
- Do NOT commit debug logging, TODOs, or temporary workarounds
- Do NOT verify only the happy path — every affected flow gets at least one error/edge case per the Phase 4 entry gate's 4e evidence row
- Do NOT assume the previous verification run is still valid — re-run after every fix
- Do NOT skip the Phase 6 hardening phase — converting bugs to tests is what prevents regressions
- Do NOT skip Phase 4 sub-step 4f for any change with a UI surface — polish + wireframe consistency is mandatory, not "if there's time." If the user has to ask "did you check polish?", the skill failed.
- Do NOT mark wireframe drift as acceptable without classifying it (`intentional — style adaptation`, `intentional — decision`, or `regression` — "close enough" is not a state), and do NOT diff visual style against the wireframe: visual style follows the host app's design system (per 2a), and pushing pixel-fidelity to the wireframe over host-app conventions is itself a failure mode.

---

*Spec lineage: `2026-05-03_verify-skill-teeth` (Phase 4 entry gate, three-state outcome model, Red Flags table, Evidence Standards), `2026-05-13_plan-vertical-slices` (phase-scoped invocation), `2026-05-10_pipeline-consolidation` + `2026-05-28_architecture-in-feature-sdlc` (folded phases), `2026-05-09_html-artifacts` + `2026-05-28_inline-html-artifacts` (HTML emit contract, reviewer input contract, comments-coverage gate FR-62), `2026-05-08_non-interactive-mode` (mode contract), `docs/pmos/reviews/2026-06-10_ops-observations/07_verify-browser.md` (browser-tool ladder, browser-mandatory trigger, verdict rule, browser-evidence gate), `2026-06-13_dogfooding-verification` (Phase-7 dogfood-verdict hard gate + accepted-residual reconciliation; contract in `_shared/dogfooding.md`).*
