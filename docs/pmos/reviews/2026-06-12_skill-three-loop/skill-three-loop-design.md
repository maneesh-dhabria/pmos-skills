# Design: three-loop **skill** delivery — `route: skill` over define / build / release

**Date:** 2026-06-12 · **Status:** **SHIPPED — pmos-toolkit v2.66.0** (2026-06-12; merged to main, tagged `pmos-toolkit/v2.66.0`, pushed to origin + gitlab-mirror). Design agreed, deep-grilled same day (7/7 branches — amendments G1–G7 below; D1/D3/D5/D6 amended, Q1–Q6 resolved), then implemented across 8 skill files via a lean `/skill-sdlc --from-feedback` run (all 6 change sets F1–F6; hygiene lints green, skill-eval `[J]` reviewer found + fixed 2 internal contradictions). · **Inputs:** [backlog-three-loop-design.md](../2026-06-10_ops-observations/backlog-three-loop-design.md) (the feature three-loop this extends), the shipped `/feature-sdlc` `define`/`build` modes (pmos-toolkit v2.64.0), the `skill-new`/`skill-feedback` pipeline modes, the grill report (`.pmos/grills/2026-06-12_skill-three-loop-design.md`), and the maintainer's request (2026-06-12): *"I want the same three-loop structure for `/skill-sdlc` — calling `/skill-sdlc --from-feedback` does not trigger it."*

## Problem

The three-loop backlog (define → build → release) is wired **only to the `feature` pipeline**. `/skill-sdlc` is a thin alias for `/feature-sdlc skill …`, which resolves to `pipeline_mode ∈ {skill-new, skill-feedback}` — a **single monolithic run**: one combined requirements doc, one spec, one plan, one `/execute`, one `/skill-eval`, one `/verify`, one `/complete-dev`, for the *whole* batch of skills.

So a multi-skill feedback batch (the 2026-06-10 review rewrote **28 skills** in one pass) cannot today be:
1. **shaped once** as a backlog epic and split into per-skill units,
2. **ground through unattended** one skill at a time (pick → execute → skill-eval → verify), returning blockers to the human,
3. **shipped as one release train** (one plugin version bump for the whole batch).

`/skill-sdlc --from-feedback` runs (1)+(2)+(3) as one indivisible session. There is no stop-at-plan / pick-up-at-execute entry point, no per-skill claim/resume, no unattended driver, no release shelf — exactly the gaps the feature three-loop closed, but for skill work.

## The mapping — why this fits cleanly

The skill pipeline already contains a per-skill decomposition artifact: the **`0c_feedback_triage.html`** doc that `skill-feedback` mode emits in [Phase 0c](../../../../plugins/pmos-toolkit/skills/feature-sdlc/SKILL.md#feedback-triage). It parses raw feedback into **per-skill approved change sets, each with its own tier**. That is already a story-split by construction — one in-scope skill = one change set = one **story**.

| Feature three-loop | Skill three-loop (`route: skill`) |
|---|---|
| Epic = a feature; requirements + spec define it | Epic = a **batch of skill changes** (one plugin / release unit); a **`design_doc:`** defines it — an adopted design-doc seed, a page synthesized from the triage, or `skill-new` epic requirements (G2/G7) |
| Epic-level spec carved into stories | Stories carved from the triage change-sets, **judgement split** (default 1-skill-1-story, fuse coupled skills — G3), citing `design_doc:` by anchor |
| Story AC = user-value acceptance criteria | Story AC = **approved findings (verbatim)** + `skill-patterns.md` + `design_doc:` invariants |
| Story inner pipeline = `/execute` → `/verify` | Story inner pipeline = `skill-tier-resolve` → `/execute` → **`/skill-eval`** → `/verify` |
| Release = `/complete-dev --epic` (merge train + deterministic gate + 1 bump) | Same — deterministic gate additionally runs `skill-eval-check.sh` `[D]` half on the merged tree |

The data model already anticipated this: `route: feature | skill | lite` is already a field on epics and stories ([backlog schema](../2026-06-10_ops-observations/backlog-three-loop-design.md) D2/D15). Only the **orchestrator dispatch** (which inner phases run) and the **story-split-from-triage** step are missing.

## Proposed decisions

| # | Decision | Rationale |
|---|---|---|
| **D1** *(amended G2)* | **A skill-epic is a batch of skill changes that share one plugin (release unit).** Cross-plugin skill work = sibling epics (mirrors feature D17). **The epic carries a `design_doc:` — the shared coherence contract stories cite by anchor (the role the epic spec plays in feature mode).** Its source by sub-mode: a **design-doc seed** (`--from-feedback <design-doc>`) is adopted verbatim as `design_doc:`; **raw feedback** synthesizes a **light epic-design page** (cross-skill invariants + shared-substrate shape) from the triage; **`skill-new`** runs a light epic `/requirements` (G7). No full epic-level `/spec` (skill spec is per-skill and folds into `/plan`, which cites `design_doc:`). | Keeps `/complete-dev`'s single-plugin invariant; gives unattended build a real cross-skill coherence contract (the per-skill triage doc has none — its critique is per-skill by construction) without a redundant full-spec phase. |
| **D2** | **A skill-story is one skill's change** = one worktree = one branch = one `/execute` run = one `/skill-eval`. ACs = the approved findings for that skill (verbatim) + `skill-patterns.md`. Tier is **per-story** (per-skill), resolved at build time. | The triage doc already produces exactly this grain; `skill-eval` is naturally per-skill; one-skill-one-PR matches Backlog.md's session-sizing rule (feature D1). |
| **D3** *(amended G2/G3)* | **`define --route skill` discovery = feedback-triage / epic-requirements builds the `design_doc:`, then split.** Execution order: `worktree(define/<epic>) → resolve-epic → [feedback-triage → synthesize design page \| adopt design-doc seed \| skill-new: epic /requirements] → story-split → per-story /plan → definition-merge (docs-only) → stop`. **The story-split is a judgement step (not deterministic): default 1-skill-1-story, but fuse tightly-coupled skills (alias+target, a co-designed pair, a skill + the substrate extracted from it) into one story when they can't be independently verified; independently-shippable substrate stays its own story + `dependencies:` + D9 merge.** Story ACs = approved findings (verbatim) + `skill-patterns.md` + the `design_doc:` invariants. | Reuses Phase 0c as the per-skill change-set source; the judgement split mirrors feature define's vertical-slice rule — rigid 1-skill-1-story would skill-eval an alias+target in isolation and pass each while the pair is incoherent. |
| **D4** | **`build` dispatches the inner pipeline on the picked story's `route`.** `route: feature\|lite` → `pick, claim, build-worktree, execute, verify, write-back` (today). `route: skill` → inserts `skill-tier-resolve` before `execute` and `skill-eval` (hard) after it: `pick, claim, build-worktree, skill-tier-resolve, execute, skill-eval, verify, write-back`. `/verify` re-runs the `[D]` half + reconciles `accepted_residuals[]` exactly as skill-feedback mode does today. | Build mode already calls `/execute`+`/verify` generically; the only skill-specific phases are tier-resolve + skill-eval, both already specified and idempotent. Per-story skill-eval is strictly better than one-batch eval (each skill independently gated). |
| **D5** *(amended G5/G6)* | **Release (`/complete-dev --epic`).** Merge story branches in dep order → integrated gate = `skill-eval-check.sh --target <p>` `[D]` half across the merged tree **PLUS one epic-level cross-skill coherence `[J]` pass** (shared-contract agreement, alias/target consistency, `design_doc:` invariants — *not* a per-skill rerun; one dispatch for the whole epic). Red on either ⇒ train stops, epic → `blocked`, findings to `groom` (D14 behaviour). → **one changelog where stories self-classify user-facing \| maintenance** (user-facing → capability entries; maintenance → rolled into one "Skill quality & internals" line) → one plugin version bump + tag → `released:` write-back. | The merged-tree `[D]` pass already exists in `/complete-dev`'s epic gate ("skill-eval where applicable"). The coherence `[J]` is the only judgement gate that sees the *assembled* batch — D14's "0/27 rerun" yield doesn't cover it (a coherence check is a new check, not a rerun) and under full-unattended build no human reviews before release. Changelog split honours `/changelog`'s "not how it was built" contract. |
| **D6** *(amended G4)* | **Trigger surface (the crux the maintainer hit).** Add `define`/`build` forwarding to the `/skill-sdlc` alias (defaulting `--route skill`). **Routing of `/skill-sdlc --from-feedback <source>` is signal-driven:** a **design-doc seed** (a file with a decisions table / multi-skill scope / explicit story candidates) → **route into the loop by default** (it's already an epic design); **raw feedback / `--from-reflect`** → run triage, then if **N ≥ 3 in-scope skills** offer epic-vs-batch (Recommended = epic), else stay monolithic. The promotion lives **inside `/feature-sdlc skill` mode** (a branch from `skill-feedback` into `define --route skill`), not the alias — the alias stays thin. | A design doc *is* a planned multi-skill epic; bare skill-count is a coarser signal. No silent behaviour change for small raw feedback; the loop is discoverable from the monolithic door. Fixes the exact surprise the maintainer hit. |

## Grill resolutions (locked 2026-06-12, deep grill — 7/7 branches)

| # | Was | Resolution |
|---|---|---|
| **G1** | premise unstated | **Full unattended build**, same posture as feature build (D2/D4 confirmed). Loop 2 grinds skill-stories via `/loop`/cron; `skill-eval` PASS + `verify` PASS ships-to-branch with no human until release. Raises the stakes on the design contract (G2) and the release gate (G6). |
| **Q1 → G4** | route trigger open | **Design-doc seed → loop by default; raw feedback → offer epic-vs-batch at N ≥ 3 in-scope skills, else monolithic.** See amended D6. **Post-ship amendment (G8, v2.66.1, 2026-06-12):** the `N ≥ 3` threshold and the epic-vs-batch offer were **retired** — maintainer prefers **always-loop**, so `--from-feedback` now promotes to `define --route skill` in *every* case (a single-skill batch is a valid one-story epic via the D18 singleton wrap), with `--monolithic` the only escape to the classic single-run pipeline. There was never a technical blocker to single-skill loops; the threshold was only a don't-surprise-small-fixes UX guard, now removed by preference. |
| **Q2 → G7** | skill-new epic open | **Both in v1** — revision epics (`--from-feedback`/design-doc) AND `skill-new` epics (light epic `/requirements` frames the new-skill set, then split). |
| **Q3** | substrate story-vs-dep open | **Substrate story + `dependencies:` + D9 merge** when independently shippable; **fuse into one story** when a skill and its substrate can't be independently verified (folded into the G3 judgement split). The litmus holds: a SKILL.md citing a new substrate section is a *story*-level dep on the substrate story, not a task-level one, so D24 is satisfied and D9 makes the substrate present in the consumer's worktree before its `skill-eval`. |
| **Q4** | per-story eval cost open | **Accept per-story `[J]`** — under full-unattended it is the *only* per-skill quality gate, so it cannot be deferred. (The `--batch-eval` escape is dropped.) |
| **Q5 → G6** | release `[D]`-only vs `[J]` | **`[D]` + one epic-level coherence `[J]` pass** (see amended D5). D14's "0/27 rerun" rationale doesn't cover a cross-skill coherence check (new check, not a rerun). |
| **Q6** | keep monolithic? | **Keep both** — monolithic is the small-raw-feedback / 1–few-skills path (feature D8 analog); the loop is additive. Resolved by G4's routing. |

### Spec-time notes (gaps surfaced, not open decisions)

- **Design-doc detection heuristic** (G4): specify what marks a seed *file* as a design doc vs raw feedback — a decisions table, multi-skill scope, or explicit story candidates. Cheap to get wrong → mis-routes; pin it in the spec.
- **Worktree cost at scale**: full-unattended + default 1-skill-1-story → a 28-skill epic spins up ~28 worktree create+merge cycles. Accepted under G1 (same posture as feature build); record as an NFR so it's a known cost.
- **Mode-promotion control flow** (G4): the `skill-feedback → define --route skill` promotion is a branch *inside* `/feature-sdlc skill` mode; the `/skill-sdlc` alias stays logic-free. Flag for the spec's dispatch section.
- **Coherence-`[J]` failure path** (G6): red coherence pass at release reuses D14 — train stops, epic → `blocked`, findings to `groom`. No new machinery.

## Per-skill change list (proposed)

| Skill | Change |
|---|---|
| **/feature-sdlc** | `define` gains a `route: skill` branch — `resolve-epic` + `feedback-triage`-as-epic-design (reusing Phase 0c) + deterministic story-split (1 story/in-scope-skill, ACs = approved findings) + light epic `/requirements` for `skill-new` (Q2); `build` dispatches inner phases on the picked story's `route` (insert `skill-tier-resolve` + `skill-eval` for `route: skill`, D4); state-schema `phases[]` gains the `route: skill` build variant. |
| **/skill-sdlc** | Forward `define`/`build` subcommands (default `--route skill`) in addition to today's `skill …` forwarding; the threshold-offer of Q1 lands in the forwarded `define`/triage flow (alias stays logic-free — the offer lives in `/feature-sdlc`). |
| **/backlog** | **New epic field `design_doc:`** (G2 — the coherence contract; sits beside `requirements_doc:`/`spec_doc:` in the schema, populated by `define --route skill`); `next --route skill` filtering already supported; epic auto-wrap (D18) unchanged; `releases`/`groom` render skill epics (plugin from `labels`/`route`); `route: skill` story ACs render the approved-findings list. |
| **/complete-dev** | `--epic` gate adds the `skill-eval-check.sh --target <p>` `[D]` pass across the merged tree **and one epic-level coherence `[J]` dispatch** (G6); changelog assembly splits story summaries **user-facing vs maintenance** (G5); single-plugin invariant already enforced. (The merged-tree `[D]` pass is already half-present — "skill-eval where applicable" in `#epic-train` step 2.) |
| **/plan** | Story-scoped `/plan` for a `route: skill` story cites the epic **`design_doc:`** as its spec source (G2 retires the earlier triage-doc seam — `/plan` keeps its spec-coupled shape, the `design_doc:` *is* the spec it studies + the `tasks.yaml :: spec:` field). Confirm `/plan` accepts a design-doc path as the spec anchor. |
| **/verify** | Already re-runs `[D]` skill-eval + reconciles residuals in skill modes; confirm it fires inside `build` for `route: skill` stories (the build phase set must include it — it does, D4). |
| **/skill-eval** *(phase, not a standalone skill)* | Runs per-story inside `build` instead of once per batch — no change to the phase logic itself, only to where the orchestrator invokes it. |

## Risks & mitigations

1. **Story-split quality for skills** — the split is a judgement step (G3): default 1-skill-1-story, fuse coupled skills. Risk is a bad fuse/over-split. Mitigation: same sizing rule as feature define ("one `/execute` run"), the D24 litmus, and Phase 0c's existing keep/drop approval gating the underlying change-sets.
2. **Shared-substrate entanglement** (Q3) — two skill-stories editing the same `_shared/` file conflict at the merge train. Mitigation: substrate-as-its-own-story + `dependencies:` + D9 dep-merge; the D14/D5 deterministic gate catches semantic drift post-merge.
3. **Per-story eval cost** (Q4) — 28 judge dispatches for a 28-skill epic. Mitigation: unattended (no human wall-clock); optional `--batch-eval` escape.
4. **Two doors confusion** (D6/Q1) — users unsure whether to use `--from-feedback` (monolithic) or `define` (loop). Mitigation: the threshold-offer (Q1b) makes the loop discoverable from the monolithic door without changing its default.
5. **`/plan` seed shape** — *retired by G2.* The epic `design_doc:` is the spec `/plan` studies and records in `tasks.yaml :: spec:`; `/plan` keeps its spec-coupled shape. Only confirm it accepts a design-doc path as the spec anchor.

## Implementation note

Per the repo's own convention (and feature three-loop's precedent), implement this via **`/skill-sdlc --from-feedback`** with this document as the seed — ironically the very mode being extended. It touches **3 core skills** (`/feature-sdlc`, `/skill-sdlc`, `/complete-dev`) plus state-schema, with `/backlog`/`/plan`/`/verify` likely verification-only — so it is itself a multi-skill epic, and (once shipped) a dogfooding candidate for the very loop it adds.

**Before implementing:** resolve Q1–Q6 with the maintainer (a `/grill` pass on this doc is the natural next step, mirroring how backlog-three-loop-design.md was deep-grilled before its `/skill-sdlc` run).
