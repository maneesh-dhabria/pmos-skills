# pmos-toolkit — Skill Architecture & Design Review

**Date:** 2026-06-05
**Scope:** pmos-authored skills only — the 34 user-facing skills under `plugins/pmos-toolkit/skills/` plus the `_shared/` substrate. Excludes the vendored `.system/` third-party skills (imagegen, openai-docs, skill-creator, etc.).
**Plugin version reviewed:** 2.60.1
**Lenses:** (1) Abstraction & DRY, (2) Skill-design craft, (3) Pipeline coherence & UX, (4) Maintainability & consistency.
**Method:** 7 parallel read-only cluster audits + main-thread substrate analysis. Contested agent claims were independently verified against the filesystem before inclusion (see §0).

---

## 0. Calibration note — what the audit got wrong, and the corrections

Honesty about method first, because three agent claims were wrong and I'm not going to launder them into findings:

1. **"`_shared/` is empty / the references are aspirational."** False. `_shared/` has 46 files and is richly populated. The agent that claimed this mis-ran a check; every finding it derived from "the substrate doesn't exist" is discarded.

2. **"The duplicated non-interactive block is accidental copy-paste; extract it to `_shared/`."** Miscalibrated. The inlining is **deliberate and CI-enforced.** `_shared/non-interactive.md` Section 0 is the canonical source; 29 skills paste it verbatim between `<!-- non-interactive-block:start/end -->` markers; `tools/lint-non-interactive-inline.sh` diffs each skill's region against canonical and fails on drift. There are **six** such `lint-*-inline.sh` guards (non-interactive, pipeline-setup, platform-strings, js-stack-preambles, stack-libraries, no-modules-in-viewer). This is a conscious inline-with-lint architecture, not a mess. The legitimate critique is the *context-tax trade-off* (§2.3), not "you forgot to DRY this."

3. **"Skills reference `learnings/learnings-capture.md` but it should be `_shared/` (path looks broken)."** The path is *correct* — the file lives at `skills/learnings/learnings-capture.md` and 20 skills cite it successfully. The real (smaller) point is organizational: a shared contract lives outside `_shared/` (§2.5).

With that out of the way, the findings below are the ones that survived verification.

---

## 1. Executive summary

pmos-toolkit is, for the most part, a **maturely engineered** skill suite. The pipeline spine (requirements → spec → plan → execute → verify → complete-dev) is coherent, the `_shared/` substrate is real and well-used, and the inline-with-lint pattern shows someone thought hard about the "skills can't reliably `Read` a dependency at runtime" problem and built CI guards around their answer. The HTML-authoring substrate, the resume/state machinery in feature-sdlc, and the diagram/wireframes/prototype self-evaluation loops are genuinely good.

That said, the suite has grown to **34 user-facing skills**, and the growth shows in four structural ways:

- **One live drift bug (P0):** 8 pipeline skills cite a stale resolver (`.shared/resolve-input.md`) that predates the HTML-artifacts upgrade. The corrected resolver (`_shared/resolve-input.md`) exists but nobody points at it. (§2.4)
- **A redundancy cluster (P1):** the discovery/critique skills (grill, ideate, creativity, simulate-spec, msf-req, msf-wf) overlap in purpose and *collide on trigger phrases* ("stress-test", "pressure-test", "friction analysis"). A user can't reliably predict which fires. (§2.7)
- **A missing abstraction (P1):** backlog, mytasks, and people each hand-roll the same file-CRUD + INDEX-regen + archive-by-quarter + frontmatter-validation stack. No shared tracker substrate exists. (§2.8)
- **Scope drift (P1):** mac-health (diagnose a slow Mac) and arguably architecture (audit a codebase) sit oddly inside a *product-management delivery* plugin. (§2.6)

Plus a long tail of skill-design-craft nits: a handful of thin skills (changelog, comments, session-log) miss the structural gates the standard requires (learnings phase, track-progress, ≥5 trigger phrases), and the two biggest skills (spec at 1080 lines, plan at 922) carry inline templates that belong in `reference/`.

**Nothing here is on fire** except the resolver drift. The rest is the predictable entropy of a 34-skill suite that has been shipped incrementally to v2.60 — worth a deliberate consolidation pass, not a rewrite.

---

## 2. Architecture & organization critique (system level)

### 2.1 The shape of the suite

The 34 skills cluster cleanly into:

| Cluster | Skills | Role |
|---|---|---|
| **Pipeline spine** | requirements, spec, plan, execute, verify, complete-dev | The req→ship backbone |
| **Orchestrator + aliases** | feature-sdlc, skill-sdlc, prototype-sdlc | Drive the spine end-to-end |
| **Discovery / critique** | ideate, grill, creativity, simulate-spec, msf-req, msf-wf | Pressure-test ideas & artifacts |
| **Visual / design** | wireframes, prototype, diagram, design-crit | Produce & critique UI artifacts |
| **Docs / writing** | artifact, polish, readme, changelog, comments | Author & refine documents |
| **Trackers** | backlog, mytasks, people | Persist state (items, tasks, contacts) |
| **Knowledge / session** | reflect, session-log, product-context | Capture context & retros |
| **Standalone utilities** | architecture, mac-health, survey-design, survey-analyse | Self-contained tools |

The spine is the strongest part of the suite. The standalone-utility and discovery clusters are where the entropy lives.

### 2.2 The `_shared/` substrate — a real strength

`_shared/` is not decoration. It carries genuine contracts: `resolve-input.md`, `pipeline-setup.md` (cited by 21 skills), `non-interactive.md` (29 skills), `interactive-prompts.md`, `apply-edit-at-anchor.md`, `msf-heuristics.md`, `sim-spec-heuristics.md`, the entire `html-authoring/` substrate (template + assets + tests), and per-stack `stacks/*.md`. This is the right instinct and most of it is wired correctly.

### 2.3 The inline-with-lint pattern — credit, with one open question

The single most-debated design choice in the suite is that ~84 lines of non-interactive contract (and the pipeline-setup block) are **pasted verbatim** into 21–29 skills rather than `Read` at runtime. This is deliberate: the canonical text lives in `_shared/`, and a `lint-*-inline.sh` guard fails CI if any copy drifts.

**Why it's defensible:** a skill cannot be trusted to `Read` a dependency mid-run on every invocation; inlining guarantees the contract is in-context. The lint guard removes the usual cost of duplication (silent drift).

**The open question worth surfacing:** the guard catches drift but does **not** propagate edits. Changing Section 0 means re-pasting into 29 files by hand, then relying on lint to catch misses. And the context tax is real — ~84 lines × 29 skills ≈ 2,400 lines of identical contract across the corpus, loaded into context on every run. That's a conscious trade (correctness over economy), but it's worth a one-time decision review: *could a `sync` script (propagate, not just detect) plus a shorter inlined stub get most of the correctness benefit at a fraction of the tax?* Today there are lint scripts but no sync script in `tools/`. This is a judgment call, not a bug — but it's the biggest single lever on the suite's context budget.

### 2.4 🔴 P0 — Live resolver drift (`.shared/` vs `_shared/`)

This is the one finding I'd fix this week.

There are **two** resolver-contract files:

- `skills/_shared/resolve-input.md` — current. Prefers `.html`, falls back to `.md`, implements FR-30..33 / D21 (the html-artifacts upgrade). Its own header states: *"Skills cite it by path: `_shared/resolve-input.md`."*
- `skills/.shared/resolve-input.md` — stale. A 4-step `.md`-first resolver with an mtime picker and legacy-folder fallback. **No knowledge of `.html` artifacts.**

The problem: **8 pipeline skills actually cite the stale dot-path**, not the corrected one:

```
verify/SKILL.md:190        ../.shared/resolve-input.md
spec/SKILL.md:153          ../.shared/resolve-input.md
plan/SKILL.md:169          ../.shared/resolve-input.md
execute/SKILL.md:193       ../.shared/resolve-input.md
wireframes/SKILL.md:188    ../.shared/resolve-input.md
prototype/SKILL.md:143     ../.shared/resolve-input.md
creativity/SKILL.md:38     ../.shared/resolve-input.md
simulate-spec/SKILL.md:139 ../.shared/resolve-input.md
```

The HTML-aware resolver was written into `_shared/resolve-input.md`, but the skills were never repointed from `.shared/` to `_shared/`. The canonical file believes it's in use; nobody uses it. In practice the spine is following the **pre-html-artifacts** resolution discipline for locating upstream documents.

**Fix:** repoint all 8 citations to `_shared/resolve-input.md`, delete `.shared/` (it contains only this one stale file), and add a lint grep (`assert_no_dot_shared.sh`) so the dot-path can never reappear. Confirm the spine still resolves `.html` artifacts after repointing. This is exactly the silent-failure class CLAUDE.md warns about — a wrong path that doesn't error, it just quietly does the old thing.

### 2.5 `learnings/` substrate lives outside `_shared/`

`skills/learnings/learnings-capture.md` is a shared contract cited by 20 skills, yet it sits at a top-level `skills/learnings/` dir instead of `skills/_shared/learnings-capture.md`. The citations work (the agents who called this "broken" were wrong), but it's an organizational inconsistency: shared substrate is split across two homes. Secondary point that *is* real — the **treatment** of learnings capture is inconsistent: requirements inlines the contract; spec/plan/and ~18 others cite the external file. Pick one (cite the external file) and move the file under `_shared/`. (P2)

### 2.6 Scope drift — does everything belong in a *PM delivery* plugin?

- **mac-health** — out of scope. Diagnosing CPU/memory/battery/orphaned-processes on a Mac has zero connection to requirements→ship. It's also written as a passive shell-command reference, not an agent-driven workflow. Move to a `dev-environment` plugin, or drop. (P1)
- **architecture** — borderline. It's well-built (293-line body over a hardened 248-file audit engine), but "audit a codebase against L1/L2/L3 principles" is a code-quality task, not a product task. It's already consumed by `/verify` (Phase 4.7 dispatches it). Two honest options: (a) demote it to a `/verify` sub-skill / reference, or (b) split it into a `codebase-health` plugin. Keeping it as a top-level *PM* slash command is the weakest option. (P1, scope decision)
- **survey-design / survey-analyse** — in scope (PMs run surveys) and cleanly paired. Keep.

The test isn't "is it good?" (it is) — it's "does its presence in *this* plugin's `/` picker make the plugin's identity coherent?" For mac-health the answer is no.

### 2.7 🟠 P1 — The discovery/critique cluster overlaps and collides

Six skills do some flavor of "pressure-test / critique," and their descriptions fight for the same user phrasing:

| Phrase users say | Skills that claim it |
|---|---|
| "stress-test" / "pressure-test" | ideate, grill, simulate-spec |
| "what are we missing" / "alternatives" | creativity, ideate |
| "friction analysis" / "evaluate UX" | msf-req, msf-wf |

The skills *are* genuinely different (ideate = pre-requirements idea; grill = interactive decision-tree interrogation of any artifact; simulate-spec = scenario-trace on a spec; creativity = technique-driven idea generation on requirements; msf-req = friction analysis of requirements text; msf-wf = MSF+PSYCH on wireframes). But a user can't infer that from the trigger words. **The sharpest redundancy is creativity vs msf-req** — both take a requirements doc, both emit recommendations, both sit between /requirements and /spec. A user with a PRD saying "improve this" genuinely cannot tell which to run.

**Recommendation (two moves):**
1. Add an input-type disambiguator to each description's lead ("...of an *uncommitted idea*", "...via *interactive decision-tree interrogation*", "...*scenario-trace* on a *spec*", etc.) so triggers stop colliding.
2. Consider merging creativity + msf-req into one `requirements-review` skill with `--mode friction|creativity|both`. They share persona-alignment and journey-confirmation prose already (copy-pasted across creativity/msf-req/msf-wf — see §3).

### 2.8 🟠 P1 — Missing shared "tracker" substrate

backlog, mytasks, and people are ~99% structurally identical: file-per-item (YAML frontmatter + body), `INDEX.md` regeneration, archive-by-quarter folders, slug/ID allocation, enum validation with identical error strings. None of it is shared — it's hand-maintained three times. There's no `_shared/tracker-crudl.md`.

Consequences: no schema versioning on any tracker, no concurrent-run safety on INDEX rewrites, validation bugs must be fixed in three places, and cross-tracker queries ("people mentioned in active backlog items") are impossible without bespoke glue. They diverge on storage location too (backlog = in-repo; mytasks/people = `~/.pmos/`), with no abstraction naming that split.

**Recommendation:** extract `_shared/tracker-crudl.md` (item schema shape, slug/ID rules, INDEX-regen contract, archive layout, validation patterns). Each tracker collapses to: storage path + enum set + skill-specific phases. This unblocks schema versioning for all three at once.

### 2.9 Consistency: phase numbering & frontmatter drift

- **Phase numbering is a free-for-all.** Across the spine you find `0, 0.5, 0a, 0b, 0c, 0d, 1, 1.5, 2, 2a, 3, 3a, 3b, 3c, 4, 5, 6, 6a, 6.5, 6.6, 7...`. spec uses 6.5/6.6 for folded phases; requirements uses 5.5; feature-sdlc has 22 distinct phase tokens. It works, but reading two spine skills side-by-side is needlessly hard. Adopt one convention (suggest: integer phases + lettered sub-phases `6a/6b`, never decimals).
- **Frontmatter key drift:** spec frontmatter emits `requirements:` while plan emits `requirements_ref:` for the same upstream pointer. Standardize on one key — downstream parsing is fragile otherwise.

### 2.10 The `.system/` vendored dir (scope note)

`skills/.system/` holds third-party OpenAI/Codex skills (imagegen, openai-docs, plugin-creator, skill-creator, skill-installer) behind a `.codex-system-skills.marker`. Dot-prefixing keeps them from registering as pmos slash commands — correct. No action; noted so the next reader doesn't mistake them for pmos-authored.

---

## 3. Cross-cutting refactor themes (ranked)

1. **🔴 Repoint the 8 stale `.shared/resolve-input.md` citations to `_shared/resolve-input.md`; delete `.shared/`; add a lint guard.** (§2.4) — the only correctness bug.
2. **🟠 Disambiguate the discovery/critique cluster** (trigger-phrase clarifiers + creativity/msf-req merge). (§2.7)
3. **🟠 Extract `_shared/tracker-crudl.md`** and refactor backlog/mytasks/people onto it. (§2.8)
4. **🟠 Resolve the scope question for mac-health (drop/move) and architecture (demote/split).** (§2.6)
5. **🟡 Consolidate persona-alignment + journey-confirmation prose** (copy-pasted across creativity, msf-req, msf-wf) into `_shared/persona-journey-alignment.md`; have all three cite it. The MSF *heuristics* are already shared; the alignment ceremony is not.
6. **🟡 Move inline templates to `reference/`:** spec's Tier 1/2/3 markdown templates (~320 lines) and plan's task template (~100 lines) + operational-modes block (~70 lines). These are the main reason spec (1080) and plan (922) blow past the 800-line soft ceiling.
7. **🟡 Fix the thin-skill structural gaps:** changelog (no learnings phase, no track-progress, <5 triggers, malformed non-interactive markers), comments (missing `user-invocable: true`, identity-confused — see table), session-log (no triggers, no phases, orphaned `instructions.md`).
8. **🟡 Standardize phase numbering and the `requirements`/`requirements_ref` frontmatter key.** (§2.9)
9. **⚪ Decide the inline-with-lint context-tax trade-off** — add a propagate-sync script, or accept the tax explicitly and document why. (§2.3)
10. **⚪ Move `learnings-capture.md` under `_shared/` and make all skills cite (not inline) it.** (§2.5)

---

## 4. Per-skill findings (all 34)

Verdicts are mine, reconciled from the cluster audits. "Top issue" is the single highest-leverage fix.

### Pipeline spine

| Skill | Lines | Verdict | Top issue |
|---|---|---|---|
| requirements | 776 | needs-work | Cites stale `.shared/` resolver (via creativity path pattern); self-contradicting Phase 5 anti-pattern ("do NOT self-fix" amid inline-fix instructions); learnings contract inlined while siblings cite external. |
| spec | 1080 | overbuilt | ~320 lines of inline Tier templates → move to `reference/`. Cites stale `.shared/` resolver (line 153). Frontmatter `requirements:` vs plan's `requirements_ref:`. |
| plan | 922 | needs-work | Inline task template (~100L) + operational-modes (~70L) → `reference/`. Execution-mode is selected at *close* but feature-sdlc needs it at *start* — move detection to Phase 0. Cites stale `.shared/` resolver (line 169). |
| execute | 561 | solid | Verify-fix loop → defect-handoff cross-ref is buried; otherwise clean. Cites stale `.shared/` resolver (line 193). |
| verify | 793 | overbuilt | Phase 4 "Red Flags" (16-row rationalization table) is training material inlined into the body → `reference/`. Reviewer contract differs from feature-sdlc Phase 2a (FR-50/51/52) — align or carve out explicitly. Cites stale resolver (line 190). |
| complete-dev | 829 | solid | The no-`version`-in-marketplace.json rule is buried 50 lines into Phase 9 — forward-reference it at Phase 0. Move Phase 14 dry-run rendering to a reference template. |

### Orchestrator + aliases

| Skill | Lines | Verdict | Top issue |
|---|---|---|---|
| feature-sdlc | 903 | overbuilt (justified) | 42% of the body is Phase 0 setup. Extract Phase 0a base-drift check (~42L) and the `--minimal` block to `reference/`. Prose phase order doesn't match the state-schema order — align. |
| skill-sdlc | 16 | solid | Textbook thin alias. No action. |
| prototype-sdlc | 24 | solid | Clean alias with a good branch-extension note. No action. |

### Discovery / critique

| Skill | Lines | Verdict | Top issue |
|---|---|---|---|
| ideate | 228 | solid | Cites `_shared/non-interactive.md` but does **not** inline the block — so FR-08 pre-rollout-BC treats it as un-rolled-out and falls back to interactive. Inline the block or finish the rollout. |
| grill | 261 | solid | Trigger collision on "stress-test" — add "via interactive decision-tree interrogation" to the description lead. |
| creativity | 254 | needs-work | Redundant with msf-req (same input, same slot). Refusal marker is in the body, not the description, so users don't see it until runtime. Persona/journey prose copy-pasted. No track-progress section. |
| simulate-spec | 574 | solid | Good `_shared/sim-spec-heuristics.md` reuse. Missing track-progress for an 11-phase skill. Cites stale resolver (line 139). |
| msf-req | 168 | needs-work | Redundant with creativity (see §2.7). Refusal hidden in body. Persona/journey prose duplicated. No track-progress. |
| msf-wf | 331 | needs-work | Distinct from msf-req (PSYCH scoring) and worth keeping, but shares the duplicated persona/journey prose; no track-progress; clarify in description it runs *after* /wireframes. |

### Visual / design

| Skill | Lines | Verdict | Top issue |
|---|---|---|---|
| wireframes | 813 | solid | Well-built orchestrator; clean html-authoring + DESIGN.md reuse. Phase 6 folded-failure is advisory-continue (documented risk). Cites stale resolver (line 188). |
| prototype | 732 | solid | Disciplined DESIGN.md ownership and component reuse. Phase 4d token-duplication guard is advisory-only. Cites stale resolver (line 143). |
| diagram | 610 | solid | Best-isolated skill in the suite — clean theme system, versioned sidecar, hard vision-review gate. No action. |
| design-crit | 475 | needs-work | `--depth`/`--output-format` spec (~50L) inlined in Phase 0 → `reference/`. Missing the `<meta pmos:skill>` tag documentation. Silent side-effect: regenerates `{feature_folder}/index.html` — document it. |

### Docs / writing

| Skill | Lines | Verdict | Top issue |
|---|---|---|---|
| artifact | 629 | solid | Clean carve-out from the spine. No reference/ dir but the long body is justified by 10+ flows. No major issue. |
| polish | 413 | solid | Exemplary progressive disclosure (7 reference files, lean body, real learnings gate). Use as the template for others. |
| readme | 542 | needs-work | Description opens with a noun phrase, not a "Use when" trigger. §1–§10 mixes structural sections with sequential phases — hard to trace one run. Inlines the pipeline-setup block instead of relying on the canonical cite. |
| changelog | 140 | underbuilt | Malformed non-interactive markers (start, no end). 0 quoted trigger phrases. No learnings phase, no track-progress, no platform-adaptation. |
| comments | 101 | identity-confused | Missing `user-invocable: true`. Declares itself "a utility, not a pipeline stage" yet exposes a `/comments` command. Either make it a first-class skill (add the gates) or move it to `_shared/` infra. Heavy JS test coverage but prose-thin SKILL.md restates what resolver.js already does. |

### Trackers

| Skill | Lines | Verdict | Top issue |
|---|---|---|---|
| backlog | 519 | solid | Reimplements tracker CRUDL (see §2.8). Otherwise the best of the three — good pipeline-bridge linkage. |
| mytasks | 684 | needs-work | The CRUDL duplication is most acute here; tight /people integration is good. Extract `_shared/tracker-crudl.md`. |
| people | 404 | solid | Clean reactive-create entry point for /mytasks. No schema version field. Benefits from the shared tracker substrate. |

### Knowledge / session

| Skill | Lines | Verdict | Top issue |
|---|---|---|---|
| reflect | 353 | solid | Sophisticated multi-session aggregation; fits the feedback-loop identity. No action. |
| session-log | 130 | underbuilt | 0 trigger phrases, no phases (just "Process"), orphaned `instructions.md` not referenced by SKILL.md. UX overlap with reflect needs clarifying ("what you built" vs "tool critique"). |
| product-context | 421 | solid | Missing Phase 0 learnings-load and a capture phase. Otherwise a clean init/update/show consolidation. |

### Standalone utilities

| Skill | Lines | Verdict | Top issue |
|---|---|---|---|
| architecture | 293 | overbuilt / scope-borderline | Excellent engine, wrong shelf — demote to a /verify sub-skill or split into a `codebase-health` plugin. (§2.6) |
| mac-health | 257 | out-of-scope | Doesn't belong in a PM delivery plugin; also a passive command-reference, not an agent workflow. Move or drop. (§2.6) |
| survey-design | 481 | solid | Move Phase 3 schema spec (~115L) to `reference/survey-schema.md` to get under the body ceiling. |
| survey-analyse | 205 | solid | Good reproducibility contract (deterministic `analysis.py`, LLM narrates on top). Asymmetric edge-case docs vs survey-design. |

---

## 5. Prioritized refactor roadmap

| # | Pri | Item | Effort | Risk if skipped |
|---|---|---|---|---|
| 1 | 🔴 P0 | Repoint 8 `.shared/resolve-input.md` citations → `_shared/`; delete `.shared/`; add lint guard | S (½ day) | Spine silently runs the pre-HTML resolver |
| 2 | 🟠 P1 | Trigger-phrase disambiguation across discovery/critique cluster | S | Users can't predict which skill fires |
| 3 | 🟠 P1 | Merge creativity + msf-req into `requirements-review --mode` (or document the split) | M | Two skills compete for the same job |
| 4 | 🟠 P1 | Extract `_shared/tracker-crudl.md`; refactor backlog/mytasks/people | M–L | 3× maintenance, no schema versioning |
| 5 | 🟠 P1 | Scope decision: mac-health (drop/move), architecture (demote/split) | S (decision) + M (move) | Plugin identity blurs as suite grows |
| 6 | 🟡 P2 | Consolidate persona/journey prose → `_shared/persona-journey-alignment.md` | S | Drift across 3 skills |
| 7 | 🟡 P2 | Move inline templates to `reference/` (spec, plan, design-crit, survey-design) | M | Bodies exceed the 800-line ceiling |
| 8 | 🟡 P2 | Fix thin-skill gaps (changelog, comments, session-log) | M | Fail the repo's own skill-eval rubric |
| 9 | 🟡 P2 | Standardize phase numbering + `requirements_ref` frontmatter key | M | Cross-skill reading friction |
| 10 | ⚪ P3 | Inline-with-lint trade-off review (add sync script or accept tax) | S (decision) | ~2,400 lines of context tax persists |
| 11 | ⚪ P3 | Move `learnings-capture.md` under `_shared/`; cite uniformly | S | Substrate split across two homes |

Suggested sequencing: do #1 immediately (it's a real bug), batch #2/#5 (cheap, high-clarity), then take #3/#4 through the repo's own `/feature-sdlc skill` pipeline since they're structural refactors that should be eval-gated.

---

## Appendix — what I'd hold up as the reference implementations

When refactoring the weaker skills, copy these:
- **polish** — progressive disclosure done right (lean body, 7 reference files, real learnings gate).
- **diagram** — self-contained tool with versioned sidecar, theme isolation, and a hard quality gate.
- **complete-dev** — multi-phase ceremony with genuine safety gates (dry-run summary before destructive actions, per-developer run memory).

These three prove the suite's standard is high where attention has been paid. The roadmap above is mostly about paying that attention to the long tail.
