# Plan Templates

The plan document skeleton emitted by `/plan` Phase 3, including the per-task (T1 / TN) templates. Phase 3 reads this file and emits the structure, applying the Tier Gates (which sections are mandatory per `{tier}`) from the body. `requirements_ref` / `spec_ref` point at the committed upstream artifacts; the plan starts at `**Status:** Draft`.

## Contents

The single fenced template below covers, in order: frontmatter · `## Overview` (Done-when + walkthrough + execution order) · `## Decision Log` · `## Code Study Notes` · `## Prerequisites` · `## File Map` · `## Risks` · `## Rollback` · `## Tasks` (T1 tracer-bullet template + TN Final Verification) · `## Review Log`.

---

```markdown
---
tier: 1|2|3
type: bugfix|enhancement|feature
feature: <slug>
spec_ref: 02_spec.{html,md}
requirements_ref: ../requirements/01_requirements.{html,md}
date: YYYY-MM-DD
status: Draft
commit_cadence: per-task
contract_version: 1
execution_mode: inline | subagent-driven   # set in the closing phase (default: inline). /execute and /feature-sdlc Phase 6 read this.
---

# <Feature Name> — Implementation Plan

---

## Overview

[2-4 sentences: what this builds, the approach, and the execution order]

**Done when:** [One sentence defining completion for the entire plan. State lower-bounds + qualitative gates ONLY (FR-22). MUST include ≥1 quantitative or executable assertion (FR-22a). e.g., "SOP Editor renders remediated images on all 110 routes, 0 same-step duplicates in DB, all 17 tests pass, Docker stack healthy, p95 render < 800ms."]

**Done-when walkthrough:** [REQUIRED at all tiers (FR-22b). Concrete narrative tracing each clause of the Done-when line through the system — what command, what response shape, what users see. Replaces the legacy Manual spot check line.]

**Execution order:**
[ASCII diagram or numbered list showing task dependencies.
 Mark parallelizable tasks with [P].]

[For plans with ≥ ~12 tasks, also include a Mermaid block (FR-25) auto-rendered from per-task `**Depends on:**` lines. GitHub renders ```mermaid blocks natively.]

**Diagram emission via `/diagram` subagent (FR-60..FR-65, D2).** /plan rarely emits diagrams beyond the FR-25 dependency graph. When it does (rendering the dep-graph to SVG instead of inline Mermaid), follow the canonical pattern documented in `/spec/SKILL.md` § "Diagram Emission via `/diagram` Subagent": dispatch `/pmos-toolkit:diagram` as a **blocking Task subagent** with `--theme technical --rigor medium --out {docs_path}/diagrams/<slug>.svg --on-failure exit-nonzero`; per-call timeout 300s; up to 2 retries (3 attempts total); inline-SVG fallback after 3 failures; per-skill-run wall-clock cap 30 min via `diagram_subagent_state`; figcaption provenance per attempt or fallback. Inline Mermaid in markdown remains acceptable for the standard dep-graph (GitHub renders it natively); the subagent path applies only when the plan elects to emit pre-rendered SVG instead.

---

## Decision Log

> Inherits architecture decisions from spec. Entries below are implementation-specific decisions made during planning.

[Tier 1: skip the table entirely if no implementation-specific decisions. Tier 3: ≥3 entries required.]

| # | Decision | Options Considered | Rationale |
|---|----------|-------------------|-----------|
| D1 | [What was decided] | (a) ..., (b) ..., (c) ... | [Why — include trade-offs] |

---

## Code Study Notes

> Glossary inherited from spec — see 02_spec.{html,md} for domain terminology. The plan introduces no new domain terms.

### Patterns to follow

- `path/to/file.py:42-58` — [pattern], reused at TN

### Existing code to reuse

- `path/to/existing.py` — [responsibility]; tasks `T2`, `T5` import from here

### Constraints discovered

- [Hidden invariant or gotcha discovered in Phase 2]

### Stack signals

- [Per-stack signals from Phase 2 step 8. Cite the relevant `_shared/stacks/<stack>.md` file.]

[Each subsection MAY be "None observed" but cannot be omitted.]

---

## Prerequisites

[What must be true before starting: running services, seed data, env vars, existing branches, etc.]

---

## File Map

> Generated index pointing back to per-task **Files:** sections — tasks are source of truth (FR-23).

| Action | File | Responsibility | Task |
|--------|------|---------------|------|
| Create | `exact/path/file.py` | [What this file does] | T2 |
| Modify | `exact/path/existing.py:123-145` | [What changes and why] | T3 |
| Test   | `tests/path/test_file.py` | [What it tests] | T2 |
| Move   | `from/old/path.py` → `to/new/path.py` | [Why moved] | T4 |
| Rename | `old_name.py` → `new_name.py` | [Why renamed] | T4 |
| Delete | `obsolete/path.py` | [Why removed] | T5 |

File-action verbs (FR-24): `Create`, `Modify`, `Delete`, `Move`, `Rename`, `Test`. Move/Rename rows MUST show source AND destination.

---

## Risks

> 5-column Risks table. Severity is **derived** from Likelihood + Impact (FR-80):
> any-H + no-L → High; any-H + any-L → Medium; both M → Medium; M + L → Low; both L → Low.
> Phase 4 hard-fails any High-severity risk that lacks a per-task Mitigation citation (FR-81).

| # | Risk | Likelihood | Impact | Severity | Mitigation | Mitigation in: |
|---|------|-----------|--------|----------|------------|----------------|
| R1 | [What could go wrong] | Low/Medium/High | Low/Medium/High | Low/Medium/High | [How to handle it] | T<n> |

---

## Rollback

- If TN fails after migration XXX: `<downgrade-command-from-stack-file>`
- If seed data corrupted: `<reset-script-or-stack-command>`
- If deploy fails: `docker compose up -d <previous-image>`

[Conditional: include only when the plan involves database migrations, deployments, or data mutations. Delete the section otherwise — do NOT leave a placeholder line decorated with a conditional caveat in the rendered plan.]

---

## Tasks

[For plans > ~12 tasks: group under `## Phase N: <name>` headings (FR-26, FR-27). Phases must be deployable slices of 5–10 tasks. Phase boundaries trigger full /verify + /compact handshake (FR-26a, see execute/SKILL.md Phase 2a). Soft cap of 30k tokens per phase (FR-90). Last phase's verify IS the TN per FR-26.]

### T1: [Task Name]

**Goal:** [One sentence]
**Spec refs:** [Which spec sections/FR-IDs this implements; for spec headings cite `02_spec.html#kebab-anchor` per FR-31 (or `02_spec.md#kebab-anchor` against legacy MD-primary specs)]
**Wireframe refs:** [If wireframes exist and this task touches UI: which screens (e.g., `wireframes/01_dashboard.html`). Omit field for non-UI tasks.]

**Depends on:** [Task IDs (e.g., `T2, T3`) or `none`]
**Idempotent:** [`yes` | `no — recovery: <substep>`. If `no`, FR-35 mandates a recovery substep; Phase 4 hard-fails non-idempotent without it.]
**Requires state from:** [Tasks whose runtime artifacts (e.g., generated files, DB rows) this task consumes. Omit when independent.]
**TDD:** [`yes — new-feature` | `yes — bug-fix` | `no — <reason>`. Three-valued enum per FR-37 (replaces the legacy 2-state rule). FR-104a precedence: per-task override → spec frontmatter `type:` → /backlog item `type=`. On override, emit a Decision-Log entry. FR-105 TDD-optional types: pure refactors, config/IaC, CSS-only, prototype spikes, file moves — author states the reason; Phase 4 reviews justification.]
**Data:** [Test data the task consumes (fixtures, seed rows, mock payloads). Omit when none.]

**Files:**
- Create: `path/to/file.py`
- Modify: `path/to/existing.py`
- Test: `tests/path/test.py`

**Steps:**

- [ ] Step 1: Write the failing test
  ```python
  def test_specific_behavior():
      result = function(input)
      assert result == expected
  ```
  [Tests are illustrative reference shape per FR-103, not literal. /execute may adapt fixture names / helper signatures to host conventions while preserving the same inputs/outputs/assertions.]

- [ ] Step 2: Run test to verify it fails
  Run: `<test-command-from-stack-file> tests/path/test.py::test_name -v`
  Expected: FAIL with "function not defined"

- [ ] Step 3: Write minimal implementation
  ```python
  def function(input):
      return expected
  ```

- [ ] Step 4: Run test to verify it passes
  Run: `<test-command-from-stack-file> tests/path/test.py::test_name -v`
  Expected: PASS

- [ ] Step 5: Commit
  ```bash
  git add tests/path/test.py src/path/file.py
  git commit -m "feat(T1): add specific feature"
  ```

**Bug-fix TDD shape (when `**TDD:** yes — bug-fix`):** Step 1 writes a regression test reproducing the bug; Step 2 confirms the test fails on pre-fix HEAD; Step 3 implements the fix; Step 4 confirms the test passes (FR-104).

**T0 (Prerequisite Check) — auto-generated, mandatory at all tiers (FR-12, FR-12a):**

- [ ] Run prereqs from the detected stack file (`_shared/stacks/<stack>.md` `## Prereq Commands`).
- [ ] Confirm dev-server / DB / queue is running (cite the actual commands from the stack file).

**Inline verification:**
- `ruff check src/path/file.py` — no lint errors
- `<test-command-from-stack-file> tests/path/test.py -v` — N passed, 0 failed

---

### TN: Final Verification

**Goal:** Verify the entire implementation works end-to-end.

- [ ] **Lint & format:** [from detected stack file `## Lint/Test Commands`]
- [ ] **Type check:** [project-appropriate type checker command from stack file]
- [ ] **Unit tests:** [exact command per stack file] — expect N passes, 0 failures
- [ ] **Full test suite:** [exact command per stack file] — expect no regressions
- [ ] **Database migrations:** `<migration-up-command-from-stack-file>` [emit only if migrations were added]
- [ ] **Docker deploy:** `docker compose build <services> && docker compose up -d <services>` [emit only if Docker is in scope]
- [ ] **API smoke test:** [emit verbatim from the detected stack file's `## API Smoke Patterns` section — do not hardcode language-specific defaults; FR-13]
- [ ] **Frontend smoke test (Playwright MCP):**
  1. Authenticate first (if auth enabled)
  2. Navigate to the relevant page
  3. Verify new UI elements render correctly
  4. Walk through the primary user flow
  5. Take a screenshot for verification
  6. **Hard-reload every parameterized route** the change touches (open the URL in a fresh tab, not via in-app navigation) and confirm the requested resource renders — not the index/first item. Catches router-resolver bugs that in-app nav hides.
  7. **Force at least one error path** (bad input, broken backend) and confirm the UI surfaces the failure with a recoverable CTA — not silent.
- [ ] **UX polish checklist** (any UI-touching change): `document.title` set per route, no internal IDs/enum keys leaked into copy, casing/date-format consistency, meaningful image `alt`, no dead disabled affordances, zero uncaught console errors during the journey, navigation labels match destination titles. Full checklist enforced in `/verify` Phase 4 sub-step 3f.
- [ ] **Wireframe diff** (if `{feature_folder}/wireframes/` exists): for each affected screen, open the wireframe and the live implementation side-by-side. Diff **only on the authoritative dimensions** (IA, copy, states, journeys) — NOT visual style, color, typography, spacing, or component library, which are expected to follow the host app. Classify every delta as `intentional — style adaptation`, `intentional — decision` (with rationale), or `regression` (fix before completion). Empty diff with no dimensions named is not acceptable.
- [ ] **Done-when walkthrough:** [trace each clause of the plan's Done-when line through the running system — replaces the legacy Manual spot check line per FR-22b]
- [ ] **Seed data:** `python scripts/seed_sop_db.py --reset` [emit only if data files changed]

**Cleanup (FR-92 — trigger-based emission; do NOT decorate with conditional caveats in the rendered plan):**

[Cleanup items are emitted only when their trigger fires — when the trigger does NOT fire, the line is OMITTED entirely from the rendered plan. Triggers:
- Any task creates files outside `src/`/`tests/` → emit "Remove temporary files and debug logging".
- /execute used `--worktree` → emit "Stop worktree containers if running: `docker compose -f docker-compose.worktree.yml -p <project> down`".
- Any task adds a feature flag → emit "Flip feature flags".
- Any user-facing change (UI signal OR docs files modified) → emit "Update documentation files (CLAUDE.md, changelogs, etc.)".]

[Every retained item must have an exact command and expected outcome.]

---

## Review Log

> Sidecar: detailed loop-by-loop findings live in `03_plan_review.md` (FR-45). This table is the summary index.

| Loop | Findings | Changes Made |
|------|----------|-------------|
| 1    | [Summary] | [Summary] |
| 2    | [Summary] | [Summary] |
```
