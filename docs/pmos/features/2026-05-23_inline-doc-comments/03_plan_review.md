# 03_plan_review.md — sidecar for inline-doc-comments plan

This sidecar carries detailed findings from each Phase-4 review loop. The plan body's `## Review Log` table is the summary index pointing here.

## Loop 1 — self-review (structural + design-critique)

### Structural checklist
- Every spec FR (FR-01..06, FR-10..16, FR-20..32, FR-40..45, FR-50..52, FR-60..62) cited by ≥1 task. ✓
- Every NFR (NFR-01..09) covered: NFR-01 latency via T28 + T11 demo; NFR-02 bundle size via T22 CI; NFR-03 atomicity via T7 FSA semantics; NFR-04 compat via T22 fallback; NFR-05 a11y via wireframe inheritance; NFR-06 observability via resolver chat logs in T10/T17; NFR-07 security via T4 127.0.0.1 hard-bind; NFR-08 contract-doc citation via T6; NFR-09 Node ≥18 via T5 precheck. ✓
- Every Edge case E1–E10 mapped (E1 → T24 file:// modal; E2 → T22 FSA revocation; E3 → T17 lineage collision; E4 → T16 schema refuse; E5 → T3 corrupted JSON [added in Loop 2]; E6 → T13 wave conflict; E7 → T5 launcher port retry; E8 → T17 no-sidecar; E9 → T16 malformed subagent JSON; E10 → T15 re-dispatch cap). ✓
- Inline verification on every code task: ✓
- TDD red/green pattern on every code task: ✓
- Exact file paths: ✓
- Exact commands with expected output: ✓ (every Steps block + Inline verification block has bash commands)
- No placeholder language (TBD/TODO/handle edge cases/etc.): ✓ grep confirms zero
- Type consistency T12→T13→T17: anchor return shape identical; wave-planner consumes same overlap relation. ✓
- TN concrete and complete: ✓ — 18 sub-step checklist
- Verification quality (litmus test): each task asserts on behavioral output (data shape, byte content, file presence, exit code + grep) not just structural existence. ✓
- Wireframe linkage: T7, T11, T22, T24 cite `wireframes/index.html`; T18–T21 do not (non-UI tasks). ✓ per FR-16
- TN polish coverage: hard-reload ✓ force-error ✓ UX checklist ✓ wireframe diff ✓
- Refactor-before-modify: N/A (no in-place refactor of complex functions)
- Vertical-slice shape: T1 = spike (declared), T2–T5 = refactor-prep (declared after F2 fix), T6 = refactor-prep (declared), T11 = vertical (tracer bullet), T7–T10/T12–T21/T23–T26 = vertical, T22+T24 widen overlay UX, T27–T28+TN = verification. Phase-grouped slices are each deployable user-observable improvements. ✓ after P8 added.

### Design-level self-critique
- **Reviewer perspective:** the plan reads cleanly cold; no implicit dependencies; risks are explicit. The 29-task count is on the upper end for a Tier-3 plan but justified by 14-surface fanout (T18–T21 batched 3 skills each).
- **Task size:** every task targets ~1-4 hours of focused work; T11 (tracer demo) is hands-on browser work; T18–T21 (3 skills each) is ~3 hours each — within bounds.
- **Implicit deps:** T13's wave-planner depends on /execute/SKILL.md content stability — P6 explicitly records the source SHA at task-start time (R3 mitigation).
- **Ordering:** spec §15.1 phases are followed; substrate-before-fanout is correct sequencing.

### Loop 1 findings + dispositions
| # | Severity | Finding | Disposition |
|---|---|---|---|
| L1-F1 | Medium | T1 = id-coverage spike, not tracer bullet per Phase-3 §Vertical-Slice rule | **Applied** — Decision P8 + Overview note + T1 already declares `Slice shape: spike` |
| L1-F2 | Medium | T2–T5 lacked explicit `**Slice shape:**` declarations | **Applied** — added refactor-prep declarations with one-line rationales |
| L1-F3 | Low | Two test files (T10's `assert_resolver_confirm_each.sh` and T17's `assert_resolver_integration.sh`) overlap in scope | **Skipped** — they cover different test scopes (happy-path-isolation vs full-mode-matrix); not redundant |
| L1-F4 | Low | T16/T17 share resolver shape; T17 catches T16 regressions | **Skipped** — that's the explicit design (T17 is the integration test that locks T15/T16 behavior) |

## Loop 2 — blind subagent review

Dispatched an Explore subagent with only `02_spec.html` + `03_plan.html` visible (no shared context). Per FR-42a, 5-minute wall-clock cap; subagent completed within budget. Returned 10 findings; triaged:

| # | Severity | Finding | Disposition |
|---|---|---|---|
| L2-F1 | High | FR-52 (foreign-SVG bbox-fallback capture) had zero task coverage — grep confirmed `grep FR-52 03_plan.html` returned no matches | **Applied** — added explicit test case (c2) to T24 Step 1 + implementation note to T24 Step 3 covering FR-52 bbox capture; added FR-52 to T24's Spec refs |
| L2-F2 | High | FR-65 cited in spec figcaption but not in spec FR list | **Skipped** — this is a spec-prose authoring nit (stale reference); not a plan gap. Surfaced to spec author offline. |
| L2-F3/F4 | Medium | Done-when prose said "13 contract tests" but task work actually creates 14 (13 originating skills + 1 orchestrator at /feature-sdlc/tests/) | **Applied** — corrected Done-when line + walkthrough step 7 to "13 originating + 1 orchestrator = 14 test files + 15 emit references + 1 integration test" |
| L2-F5 | Medium | T6 contract-doc content not fully specified | **Skipped** — subagent had incomplete read; T6 Step 1 already enumerates all 8 sections including idempotency 60/80% thresholds |
| L2-F6 | Medium | Wave-planner SHA-recording posture not strong enough | **Skipped** — already in plan (T13 Step 3 records source SHA in wave-planner.js header comment; R3 mitigation explicit) |
| L2-F7 | Medium | `<meta name="pmos:skill">` bake explicitly in T8 but not in T18–T21 | **Applied** — added a "Step 0" meta-tag bake requirement to T18, T19, T20, T21 (each task explicitly cites the FR-01 + FR-22 routing requirement); T21's Step 0 carries the /feature-sdlc dual-surface note |
| L2-F8 | Low | Bash wrapper naming inconsistency between Done-when prose and T17 Files section | **Applied** — corrected Done-when prose to use `assert_resolver_integration.sh` (matches T17) |
| L2-F9 | Low | T5 stale-PID-file test coverage | **Skipped** — subagent had incomplete read; T5 Step 1 sub-case (d) already covers stale-PID cleanup |
| L2-F10 | Medium | T3 comments.js unit tests don't cover E5 corrupted-JSON parse failure | **Applied** — added test case (e2) to T3 Step 1: load corrupted JSON, expect `SidecarCorruptedError`, assert blocking modal mounts via DOM stub |

### Loop 2 exit criteria
- Both reviewers (self + blind) ran without raising any HIGH-risk findings without applied fixes.
- No remaining gaps in FR coverage.
- Done-when math reconciled.
- All applied changes preserve the test-shape principle (FR-103 — tests illustrative).

## Exit determination

Per Phase 4 Exit Criteria:
- Every spec FR / NFR / S-decision mapped to a task: ✓
- Decision log has ≥3 entries with rationale: ✓ (P1–P8)
- No placeholder language: ✓
- Every task has inline verification with exact commands: ✓
- Final verification task complete: ✓ (TN/T29)
- Last loop (L2) found only fixable findings, all applied: ✓
- User confirmed no further concerns: ✓ (Loop-2 dispositioning batch accepted "Apply all 5 + Loop 1 F1/F2 + commit + exit")

**Status: Loop 2 closed. Plan ready for execution.**
