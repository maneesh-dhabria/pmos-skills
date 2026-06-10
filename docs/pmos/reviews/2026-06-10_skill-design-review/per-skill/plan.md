# plan — review

**Grade:** C
**Size:** SKILL.md 642 lines (613 excluding non-interactive block); references 1 file / 236 lines (`reference/plan-templates.md`) plus ~860 lines of linked `_shared/` docs and the 264-line `execute/subagent-driven.md` it wires into; target ~280 lines.

## TL;DR

- **Biggest win available:** strip the ~99 inline FR-ID/decision-ID annotations and the prose-implemented state machines (pid lockfile, sha256 finding hashes, 5-minute wall-clock subagent timeout, `PMOS_NESTED` env marker that nothing sets). Roughly half the file is spec-traceability bookkeeping and mechanisms an LLM cannot reliably execute — the actual planning doctrine would fit in ~280 lines.
- **Biggest risk in current design:** Phase 4's review-loop machine (cap-of-4 + 13-class finding taxonomy + skip-list hash reconciliation + backup/restore choreography) asks the model to be a transaction manager. When the model inevitably approximates (it cannot compute sha256 in its head or measure wall-clock on a Task dispatch), the contract silently degrades and the user can't tell which guarantees actually held.
- **Done well, worth keeping:** the planning doctrine itself is the strongest in the repo — "Verification Must Prove Behavior" (litmus test + structural-vs-behavioral table), vertical-slice/tracer-bullet decomposition (matches Pocock's `to-issues` almost idea-for-idea), wireframes-as-reference-not-spec, and `reference/plan-templates.md` as externalized skeleton (proper progressive disclosure).

## Findings

1. **[V] FR-ID soup throughout the body.** ~99 inline references to `FR-xx`/`D-xx`/`§x.y` from `docs/pmos/features/2026-05-08_plan-skill-redesign/02_spec.md` — e.g. Phase 0 step 9: "**Validate spec frontmatter** (FR-50, FR-50a, E1)… (*deviation per Decision Log P9*)". These are build-time traceability links pasted into a runtime instruction doc. The model can't dereference them; a human reader stumbles over them every sentence. Pocock's durability rule ("reads like a clear essay") is violated wholesale. **Fix:** delete all FR/D/§ annotations from SKILL.md; traceability already lives in the feature folder. Keep only IDs that name emitted artifact fields (`**Spec refs:**` format). Saves ~60–80 lines and most of the reading friction. Quick mechanical pass, zero behavior change.

2. **[P][G] State machines written in prose that the model cannot execute.** Four mechanisms presume a process runtime the skill doesn't have:
   - `.plan.lock` with `pid + ISO timestamp + skill_version` and `--force-lock` (Phase 0 step 7, FR-66) — a skill run has no stable pid; "release on any fatal error" has no `finally` block in conversation.
   - Skip-list `finding_hash = sha256(finding_text + proposed_fix + classification)` with re-invocation hash reconciliation (FR-43/43a/43d) — the model either shells out per finding or hallucinates hashes.
   - Loop-2 subagent "5-minute wall-clock cap" (FR-42a) — un-measurable from inside a Task dispatch.
   - `PMOS_NESTED=1` nesting detection (FR-42b) — **grep confirms nothing in the repo sets this variable**; the gate is dead code.
   All four originate from the redesign spec's goal G5 ("Convergent review loops with memory", `docs/pmos/features/2026-05-08_plan-skill-redesign/02_spec.md`) — the failure modes are real (concurrent runs clobbering `03_plan.html`; loops re-raising findings the user already skipped). **Fix:** keep the WHAT+WHY, replace the HOW with what a model can do: "if `.plan.lock` exists, warn and ask before proceeding; write it on entry, delete on exit"; skip-list as a plain accumulating bullet list with a one-line summary per skipped finding (text match is fine — dedupe is best-effort, and a false re-raise costs one click); blind review as "dispatch if available, fall back to fresh-eyes self-review"; delete the timeout and `PMOS_NESTED`.

3. **[V][R] The vertical-slice rule is stated four times.** Phase 2 step 7 (tracer-bullet candidate), Phase 3 §Vertical-Slice Decomposition, structural checklist item 13 (a 9-line restatement), and the final anti-pattern bullet (another 5-line restatement) — ~80 lines for what Pocock's `to-issues` teaches in a 5-line `<vertical-slice-rules>` block plus one template. The redundancy isn't reinforcement, it's drift surface: checklist item 13 already re-derives the exception taxonomy slightly differently from §Vertical-Slice. **Fix:** one canonical section in Phase 3; everywhere else a one-line pointer ("T1 must be the tracer bullet — see §Vertical-Slice"). The content itself is excellent — this is consolidation, not deletion. (Introduced by `docs/pmos/features/2026-05-13_plan-vertical-slices/`.)

4. **[S] Findings Presentation Protocol is duplicated across ≥5 skills.** Near-identical ~20-line blocks in `plan`, `spec`, `wireframes`, `artifact`, `polish` (grep "Findings Presentation"). They have already drifted: spec's version mandates `[Blocker]/[Should-fix]/[Nit]` severity prefixes; plan's doesn't. The edge-case half of this protocol already lives in `_shared/structured-ask-edge-cases.md` — the protocol's core should sit next to it. **Fix:** extract to `_shared/findings-presentation.md` (group → one question per finding → 4 dispositions → batch ≤4 → platform fallback); each skill keeps only its per-skill disposition semantics (plan: Defer → Open Questions; spec: Defer forbidden at exit).

5. **[G] Phase 4 machinery is over-built relative to the failure it catches.** Inventory: hard cap-of-4 with a 3-option cap-hit prompt + pre-cap-abandon backup/restore (FR-67), 6 low-risk + 7 high-risk classification classes, deferred re-validation (FR-41b), blind-subagent Loop 2, sidecar review log, 7-item exit criteria. Compare `superpowers:writing-plans` Self-Review: 3 checks, "if you find issues, fix them inline. No need to re-review." The steelman is real — G5 of the redesign spec targeted loops that churned indefinitely and re-raised skipped findings — but the cure is a taxonomy the model must consult instead of a principle it can apply. **Fix:** soften to: "Auto-apply only mechanical fixes (typos, formatting, missing commands where the answer is unambiguous). Anything that changes task structure, dependencies, scope, or decisions goes to the user. When unsure, escalate. Stop looping when a pass finds only cosmetic issues; if you're past ~4 loops, tell the user and let them decide." That preserves every guarantee the taxonomy encodes in ~5 lines. Keep the broken-ref hard-fail (FR-31a) — it's mechanical, cheap, and feeds /verify.

6. **[F] 15 flags, 5 discoverable.** `argument-hint` shows `--backlog --feature --format --non-interactive --interactive`; the body adds `--force-lock`, `--fix-from`, `--widen-to`, `--cross-phase-downstream`, `--edit`, `--replan`, `--append`, `--reset-decisions`, `--reset-skip-list`, `--decide` (the last appears once, shape never defined: "explicit `--decide <option>` flags"). Most are escape hatches natural language already covers ("re-plan from T5 onward", "add tasks without renumbering"). See inventory table below. The `--fix-from` family is genuine pipeline coupling — `/execute` writes `03_plan_defect_<task-id>.md` and tells the user to run `/plan --fix-from` (execute/SKILL.md:217) — keep it, but fold its two modifier flags into natural language.

7. **[Ph] Insertion seams in the section order.** "Phase 5: (folded into Phase 4 per FR-46)" is a tombstone section that exists to say it doesn't exist — delete it (the one-line note in Phase 4 suffices). "Operational Modes", "Closing Report", "Sidecar Contracts", then Phase 6 and Phase 7 *after* the closing report — the file's spine no longer reads in execution order. "Phase 0 — additional /plan steps" carries the note "The numbering continues from the /plan addendum above (steps 7-9)" *inside step 10* — classic incremental-edit residue. **Fix:** reorder to Phase 0–4 → modes → Phase 6 → Phase 7 → closing report; renumber so the closing is last.

8. **[P] Regex YAML parsing prescription.** Phase 0 step 9 dictates "parse via regex — extract YAML between leading `---` markers, line-by-line `^([a-z_]+):\s*(.*)$`" with exact refusal wording. The model reads YAML natively; the load-bearing content is "refuse if the spec frontmatter is malformed or missing `tier`". Same pattern at Phase 0 step 10's "Print to stderr exactly:" — a conversation has no stderr; this is CLI fiction (assess once globally with the non-interactive block, but the `output_format` echo is plan-local and can become "state the resolved format and its source").

9. **[R] `reference/plan-templates.md` is the right pattern with the wrong residue.** Externalizing the skeleton is exactly Pocock's `improve-codebase-architecture` move — keep it. But the template leaks the same FR-IDs into *emitted plans* (e.g. the TDD field explanation embeds FR-37/FR-104a/FR-105 — meaningless to a plan reader), and the 12-line `/diagram`-subagent paragraph (timeouts, retry counts, wall-clock caps) specifies a branch the same paragraph says /plan "rarely" takes. **Fix:** strip IDs from template prose; replace the diagram paragraph with one line pointing at spec/SKILL.md's canonical section.

10. **[G — special attention] subagent-driven templates: mostly defensible protocol, ~30% coaching ballast.** `execute/subagent-driven.md` (owned by /execute; /plan wires the mode via `execution_mode:` frontmatter, which `/execute` and `/feature-sdlc` Phase 6 both read — real coupling, don't delete). Judged against "prescriptive prompts vs intent statements": the *protocol* parts earn their prescription — the status enum (DONE/DONE_WITH_CONCERNS/NEEDS_CONTEXT/BLOCKED) is parsed by the controller; "do NOT commit, controller commits" preserves T<N> resume; "never leak session context / never make the subagent read the plan file" and the spec-before-quality review order are named failure modes, all reinforced by the good Red-flags list. The *coaching* parts are ballast: the implementer's self-review checklist ("is this my best work?"), the "Bad work is worse than no work" paragraph, and the code-organization section restate what a capable model does — each could be one intent line ("escalate instead of guessing; don't restructure beyond your task"). The model-selection table is durable (relative tiers, no model names — good). Verdict: keep the contract skeleton, compress each inner prompt body to intent + report format; ~260 → ~170 lines.

11. **[X] Cross-platform posture is mostly honest.** Platform Adaptation notes match real degradation paths (no-subagent → self-review fallback in Phase 4; no-prompt-tool → numbered disposition table in the Findings protocol; subagent-driven degrades to inline). `_shared/platform-strings.md` handles the closing offer per-platform. Remaining offenders are the exit-code/stderr semantics (finding 8) and the `Task`/`Explore` tool-name references in Phase 4 — acceptable given the fallback is stated.

12. **[P] Tier gates and per-task field contracts are domain complexity, not distrust — keep.** The Tier 1/2/3 emission rules, the `**Depends on:**`/`**Idempotent:**`/`**Requires state from:**` fields (consumed by /execute's wave planner and resume), and the Done-when ≥1-executable-assertion rule are cross-skill contracts with named consumers. This is the "long because the domain is complex" half of the file; the findings above target the other half.

## Flags inventory

| Flag | Purpose | Verdict |
|---|---|---|
| `--backlog <id>` | link plan to backlog item; write-back at close | keep (pipeline contract with /backlog) |
| `--feature <slug>` | select feature folder | keep (pipeline-wide convention) |
| `--format <html\|md\|both>` | override `output_format` | fold into natural language / settings ("emit markdown too") — and `both` is already retired to `html` in-body, so the flag's value set is half-dead |
| `--non-interactive` / `--interactive` | mode resolution | keep (repo-wide W14 contract) |
| `--force-lock` | clear stale `.plan.lock` | delete with lock simplification (finding 2) |
| `--fix-from <task-id>` | re-plan from /execute-reported defect | keep — /execute writes the defect file and names this invocation (coupling) |
| `--widen-to <task-id>` | widen fix-from scope upstream | fold into natural language ("the root cause is T5 — re-plan from there") |
| `--cross-phase-downstream` | extend fix-from into later phases | fold into natural language |
| `--edit` / `--replan` / `--append` | operational mode selection | fold into natural language; mode is already auto-detected from existing-plan state and the existing-plan prompt in Phase 1 step 5 |
| `--reset-decisions` | replan without preserving Decision Log | fold into natural language |
| `--reset-skip-list` | clear skip-list sidecar | fold into natural language |
| `--decide <option>` | resume a non-interactive halt | delete or specify — shape never defined anywhere |

## Gates & rubrics inventory

| Check | Hard or soft | Failure it catches | Verdict |
|---|---|---|---|
| Phase 1 gate: confirm spec understanding with user | hard | planning against a misread spec | keep-hard (cheap, one prompt) |
| Phase 2 gate: read every impacted file first | hard | plans written from a skim — the core failure /plan exists to prevent | keep-hard |
| Greenfield reference-system gate (FR-91) | hard | inventing structure with no precedent cited | soften to advisory — one sentence of principle does the work |
| Tier gates (decision-log floors, loop counts, section mandates) | hard | Tier-3 features shipping with bugfix-grade rigor | keep-hard (pipeline-wide tiering contract) |
| Done-when ≥1 executable assertion (FR-22a) + walkthrough (FR-22b) | hard | "works correctly"-grade completion criteria | keep-hard (cheap, catches the vaguest plans) |
| Broken-ref hard-fail on `**Spec refs:**` anchors (FR-31a) | hard | plans citing spec sections that don't exist; feeds /verify re-check | keep-hard (mechanical, cheap) |
| Spec drift sha256 (FR-31b) | hard | mid-run spec edits invalidating tasks | soften — "re-read the spec date/sections at review time; flag if changed"; model-computed hashes are fiction |
| Review-loop cap-of-4 + cap-hit prompt + backup/restore (FR-40/67) | hard | indefinite review churn (redesign-spec goal G5) | soften — advisory bound + "stop on cosmetic-only loop"; delete the backup/restore choreography |
| Finding auto-classification, 13 classes (FR-41/41a) | hard | auto-applying a task-split nobody approved | soften to the one principle + default-escalate (finding 5) |
| Loop-2 blind subagent (FR-42) + timeout (42a) + nesting gate (42b) | soft | author blindness | keep the blind review as intent; delete timeout + `PMOS_NESTED` (dead) |
| Skip-list hash reconciliation (FR-43a/c/d) | hard | re-raising findings the user skipped | soften to plain accumulating list, best-effort text dedupe |
| Concurrency lock (FR-66) | hard | two /plan runs clobbering each other | soften to warn-if-lockfile-exists |
| Peer-plan conflict scan (FR-54) | soft | two in-flight plans touching the same files | keep-soft (cheap grep, real failure) |
| Wireframe coverage (FR-16/16a) | hard | wireframed screens silently unimplemented; feeds /verify 3f | keep-hard (carries the wireframe→verify chain) |
| Idempotency recovery hard-fail (FR-35, in template) | hard | non-resumable tasks breaking /execute resume | keep-soft — demand the field, advise the recovery step |
| Risks severity formula + High-must-cite-mitigation (FR-80/81) | hard | unowned High risks | keep the citation rule; the derivation formula can be one line |
| Structural checklist (13 items) + design self-critique (4 items) | soft | missing tasks / wrong decomposition | keep, but dedupe items 11/13 against the sections they restate |
| Exit criteria (7 items, user-confirmed) | hard | self-declared completion | keep-hard |
| Verification-must-prove-behavior litmus + table | soft | structural-only tests that pass on broken code | keep — best content in the file |

## Fix list

| Fix | Type | Impact | Risk |
|---|---|---|---|
| Strip FR/D/§ annotations from SKILL.md and plan-templates.md | quick-win | high | none — traceability lives in the feature folder |
| Replace lock/hash/timeout/nesting state machines with model-executable equivalents (finding 2) | structural | high | low — `--force-lock` dies with it; skip-list format is plan-internal (no other skill reads it) |
| Soften Phase 4 to principle-based review (finding 5) | structural | high | medium — relaxes G5 guarantees from the redesign spec; mitigated by default-escalate + user-confirmed exit |
| Consolidate vertical-slice rule to one section | quick-win | med | none |
| Extract Findings Presentation Protocol to `_shared/` | structural | med | low — touches 5 skills; resolves existing severity-tag drift |
| Delete Phase 5 tombstone; reorder so closing report is last; fix step-numbering residue | quick-win | med | none |
| Fold `--edit/--replan/--append/--widen-to/--cross-phase-downstream/--reset-*` into natural language; define or delete `--decide` | structural | med | low — keep `--fix-from` itself (named by /execute) |
| Replace regex-YAML-parse and stderr-print prescriptions with intent | quick-win | low | none |
| Trim template's /diagram paragraph to a pointer | quick-win | low | none |
| Compress subagent-driven.md coaching prose to intent lines (keep protocol skeleton + Red flags) | quick-win | low | none — file owned by /execute; coordinate there |
