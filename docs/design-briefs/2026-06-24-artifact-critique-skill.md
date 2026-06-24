# Design Brief — `/artifact-critique`: opinionated, axis-by-axis product-doc critique

**Date:** 2026-06-24
**Plugin:** pmos-toolkit
**Status:** Design aligned; ready for `/skill-sdlc define`
**Author seed:** Reverse-engineered from "Coach — opinionated product reviews" (Gokul Rajaram), studied across 5 real reviews (allocation-engine PRD, metric-store strategy POV, partner-suspension strategy, voice-issue-recognition PRD, V-Prime strategy+roadmap). The product takes a product document (PRD / strategy / POV / roadmap, ≤50k chars) and returns an opinionated critique plus an optional rewrite. This brief specifies the **critique half** as a pmos skill; the rewrite half is delegated to `/artifact`.

---

## 1. Problem this skill solves

A PM finishes a PRD or strategy doc and wants the review a seasoned product leader would give it before it goes to exec sign-off: *where is this weak, what's missing entirely, and which load-bearing claims won't survive scrutiny?* The existing toolkit critiques **slices** of this, never the whole product-doc as an opinionated peer:

| Skill | Critiques | Mode | Gap vs. this |
|---|---|---|---|
| `/polish` | prose quality (clarity, concision, AI-slop) | binary writing rubric, single doc | judges *writing*, not *product thinking* |
| `/grill` | a committed artifact | live one-question-at-a-time interrogation | needs a human in the loop; no written scorecard |
| `/msf-req` | requirements doc, **end-user** lens | Motivation/Satisfaction/Friction | user-experience lens, not strategy/PRD rigor |
| `/simulate-spec` | a spec, against scenarios | scenario trace + pseudocode | implementation-readiness, not doc quality |
| `/design-crit` | an app/UI | Nielsen + WCAG + PSYCH | UX of a built thing, not a document |
| `/artifact` (refine) | a doc it generated | per-section eval + reviewer loop | improves toward a template; not an adversarial standalone verdict |

None produces the thing Coach produces: **a standalone, opinionated, scannable verdict-by-axis scorecard with a forced-ranking of the weakest claims, delivered as a written artifact the author can act on without a live session.** That is the missing primitive.

---

## 2. The reverse-engineered Coach framework (evidence base)

Consistent across all 5 reviews. This is the substance the skill must replicate.

### 2.1 Two modes, signed persona
Coach ships **REVIEW** (critique) and **REWRITE** (rebuilt "good" version), 20 min apart on the same input, same chrome. First-person, opinionated senior-PM voice; footer *"Built with care and craft by Gokul Rajaram."* We replicate **REVIEW only** (see §3 D1).

### 2.2 The fixed 10-axis rubric (the coverage surface)
Every doc is scored on the **same 10 axes, in this order**, regardless of type:

`Customer · Solution · Scope · Metrics · Pricing · Strategy · GTM · Stage · AI · Risks`

The axis list is **fixed precisely so that omissions surface** — an axis the author never addressed gets an `ABSENT` verdict. (Catching what's *missing* is the highest-value output; see §3 D4.)

### 2.3 Closed verdict vocabulary (no numeric score)
Per axis, one label + a one-line summary. Observed values across the 5 docs:

| Verdict | Meaning | Seen on |
|---|---|---|
| `SPECIFIC` / `GOOD` | present, concrete, evidenced | Scope (×3), Pricing |
| `MIXED` | partially there; strengths + real gaps (the default) | most axes |
| `VAGUE` | gestured at, not concrete/quantified | Strategy, Risks |
| `OUTPUT` | metrics-specific: measures activity, not outcome | Metrics |
| `ABSENT` | essentially not addressed | Pricing, Risks |
| `N/A` | doesn't apply to this doc-type (but **stated**, never silently skipped) | Pricing (internal tools), AI (non-AI docs) |

### 2.4 Critique structure (identical skeleton every time)
1. **Opening framing** — names the doc-type and commits: *"On a careful read, this is a [type]… I'll push hardest on [three things]."*
2. **Verdict by Axis** — the scannable scorecard (10 × verdict + one-line summary).
3. **Per-axis deep-dives** — each header is *itself a verdict* ("Metrics — Outputs dressed as outcomes"; "Scope — Feature backlog dressed as strategy"). Each pulls a **verbatim block-quote** from the source, interrogates it, and closes with a prescriptive **"What I'd want to see:"** ask (a concrete artifact, e.g. "a current baseline, a 6-month target, and a rollback threshold per north-star metric").
4. **Three Weakest Claims** — forced-ranking of the load-bearing assertions, each with bulleted follow-up interrogation questions ("Follow-ups worth pressing").
5. **Bottom line / "signals worth flagging"** — synthesis; credits strengths, names the 3 must-dos.

### 2.5 Cross-cutting heuristics (the reasoning spine — doc-type-agnostic)
These recur on *every* axis and are the real intelligence. They are what we extract as shared substrate (§3 D2):

- **Assertion vs. evidence/demonstration** — *"asserted, not demonstrated."* Demands verbatim user quotes / incident data / ticket counts, not category descriptions. (*"'Students going to tuitions…' is a category description, not customer evidence."*)
- **Hypothesis falsifiability** — every solution needs a stated *if/then* with a named **mechanism**. *"A list of features is not a hypothesis."*
- **Outcome vs. output metrics** — every metric needs **baseline + target + timeframe + counter-metric + kill/scale/graduate threshold**. *"'Better' is not a position." "A rollback criterion with no threshold is not a criterion."*
- **Durable vs. current advantage** — *"Affordable pricing is a wedge, not a moat."*
- **Stage-fit** — scope/rigor must match lifecycle stage. *"Pre-PMF by name, but the feature list is Series-A in scope."*
- **AI as a risk surface** — any AI feature needs a **Behavior Contract** (GOOD/BAD/REJECT cases), fallback/kill-switch wiring, eval metrics, red-team list. *"A wrong doubt solution is not a UX bug — it's a learning harm."*
- **Pre-mortem presence** — "It's 6 weeks post-launch and it failed. What happened?" Generates the missing failure modes itself.
- **Alternatives-considered** — *"One-solution-considered docs back-fit features to a foregone conclusion."*
- **Scope IN/OUT/CUT discipline** — an explicit OUT list and v1 cut decisions.
- **Multi-sided completeness** — every affected party (driver *and* merchant *and* customer), not just the easy one.
- **No-burial** — load-bearing content (esp. financials/risk) must be in the body, not an annexure. *"The highest-stakes financial decision in the doc and it's in an annexure."*

### 2.6 Doc-type awareness
Coach detects the type in sentence one (`STRATEGY DOC · REVIEW` vs `PRD Review`) and adapts: marks Pricing `N/A` for internal tools; reframes Strategy as **build-vs-buy + opportunity cost** for internal platforms; flags "PRD content smuggled into a strategy doc"; treats `<Work in Progress>`/placeholder sections as decision-blocking gaps.

### 2.7 Tone
Opinionated but **fair** — credits genuine strengths *before* attacking ("the triad design is good… the measurement infrastructure isn't"). Grounds every critique in a verbatim quote + the source's own section numbers (§4.1, A9). **Ventriloquizes the executive reader** ("The CPO should ask…") to generate pressure-test questions. Memorable aphorisms. Models the missing artifact (drafts a Behavior Contract row) rather than only naming the gap.

---

## 3. Decisions

| # | Decision | Choice & rationale |
|---|---|---|
| **D1** | Critique vs. rewrite | **Critique-only.** `/artifact-critique` produces the REVIEW (verdicts + deep-dives + weakest-claims). The **rewrite is delegated to `/artifact`** — that skill already authors structured artifacts to a bar (templates, per-section eval, reviewer loop). Building a second rewriter would duplicate it. A critique run ends by **suggesting** `/artifact refine <doc>` (or `/artifact <type>`) to act on the findings. |
| **D2** | Shared substrate (the key architectural move) | **Extract the rubric + heuristics into `_shared/` so both skills consume one source of truth.** Proposed: `plugins/pmos-toolkit/skills/_shared/critique-rubric/` holding (a) `axes.md` — the 10 axes, their per-axis checks, and the closed verdict vocabulary; (b) `heuristics.md` — the §2.5 cross-cutting spine; (c) `doc-types.md` — type detection + per-type axis adaptation (N/A rules, reframes). `/artifact-critique` reads it to **judge**; `/artifact` reads the same `heuristics.md` to **author/refine to the bar** (its per-section eval criteria reference the spine instead of restating it). One fact, one home (CLAUDE.md §K). |
| **D3** | Output format | **Both HTML + markdown.** HTML via the pmos html-authoring substrate (inline comments, wordmark/footer, `<meta pmos:skill>`) so the critique is commentable and matches Coach's rendered look; MD sidecar for diffing/pasting. Honor `output_format` settings + `--format html\|md`. |
| **D4** | Rubric shape — replicate vs. generalize *(your open question)* | **Replicate the 10 named axes exactly AND extract the cross-cutting heuristics as a named spine — keep both layers.** *What generalizing-away-the-axes would cost:* (1) **the coverage-of-absence guarantee** — the fixed list is what forces an `ABSENT` verdict on an axis the author never wrote; a purely heuristic rubric can only critique what's *present*, and "you have no Risks section / no Pricing analysis" is the single highest-value finding Coach produces; (2) **scannability** — the 10-label verdict table is the product's signature, a reader sees where the doc is weak in 3 seconds; (3) **shared vocabulary** — "your Metrics axis is OUTPUT, not OUTCOME" is a precise, memorable handle for author + exec; (4) **clean doc-type adaptivity** — marking a named axis `N/A` is crisper than dropping an abstract dimension. The heuristics (§2.5) are the *reasoning*; the axes (§2.2) are the *coverage checklist*. Coach uses both internally — so do we. This is also exactly why the spine is separable into `_shared/` (D2): `/artifact` wants the reasoning, not the verdict-rendering. |
| **D5** | Positioning & pipeline | **Closely tied to `/artifact`; a stage in a future `/artifact-sdlc` pipeline.** Envisioned arc: `/artifact` (generate) → `/artifact-critique` (review) → `/artifact refine` (rewrite to findings) → loop. `/artifact-sdlc` does not exist yet; this brief assumes it as the eventual orchestrator (mirrors `/feature-sdlc`, `/skill-sdlc`). `/artifact-critique` must also run **standalone** (like `/grill`, `/design-crit`) on any doc path the user passes. Cross-references in the brief; no hard coupling required for v1. |
| **D6** | Input handling | Accept a doc **path** (md / html / pdf / docx-pdf) or pasted content. Must traverse **Notion exports** (the markdown lives under `Private & Shared/…`, images alongside). Soft-note when input exceeds Coach's ~50k-char ceiling (chunk or summarize-then-review); do not silently truncate. |
| **D7** | Honesty about its own limits | Like Coach's rewrite `[placeholder]` discipline: when the critique *infers* a gap it cannot verify from the doc (e.g. "no baseline exists" — maybe it does, elsewhere), it says *"not visible in this doc"* rather than asserting absence as fact. Mirrors the silent-failure / faithful-reporting posture. |

---

## 4. Skill shape (proposed)

**Charter (one line):** Give a product document the opinionated, axis-by-axis review a seasoned product leader would — a scannable verdict scorecard, quote-grounded per-axis critique, and a forced-ranking of the weakest claims — as a written artifact, then hand off to `/artifact` to rewrite.

**Phases (draft):**
0. Load context (pipeline-setup), resolve `output_format`/`--format`, read learnings.
1. **Ingest** — resolve the doc (path/paste/Notion-export traversal), extract text + section structure, note char-count vs. ceiling.
2. **Doc-type detection** — classify (PRD / strategy / POV / roadmap / hybrid); resolve per-type axis adaptation from `_shared/critique-rubric/doc-types.md`.
3. **Axis scoring** — for each of the 10 axes, apply `axes.md` checks + `heuristics.md` spine; assign a closed-vocab verdict + one-line summary. (Candidate for a parallel per-axis subagent fan-out, §L dispatch — each axis scored independently, then synthesized.)
4. **Per-axis deep-dive** — verbatim quote → interrogation → "What I'd want to see:" prescription.
5. **Three Weakest Claims** — forced-rank load-bearing assertions + follow-up questions.
6. **Synthesize** — opening framing ("push hardest on three things") + bottom-line.
7. **Emit** — HTML (+ MD) artifact; closing hand-off line to `/artifact refine`.

**Quality gate (its own eval):** a binary rubric checking the critique *did its job* — every axis has a verdict; ≥N findings are grounded in a ≥40-char verbatim quote (reuse `_shared/reviewer-protocol.md` grounding bar); every "ABSENT/VAGUE" verdict names what specifically is missing; the three-weakest-claims section exists and is ranked.

---

## 5. Open items for `define`

- **Substrate placement & naming** — `_shared/critique-rubric/` vs. folding into an existing `_shared/` file; confirm `/artifact` is willing to consume `heuristics.md` for its per-section eval (cross-skill cite — place the file in pmos-toolkit's `_shared/` where both already live, so no cross-plugin sync gap).
- **Verdict vocabulary** — lock the closed set (`STRONG`/`SPECIFIC`, `MIXED`, `VAGUE`, `OUTPUT`, `ABSENT`, `N/A`) and whether `OUTPUT` is Metrics-only or a general "wrong-shape" label.
- **Persona/voice** — replicate the opinionated first-person register; do **not** copy the "Gokul Rajaram" attribution (use the pmos wordmark/footer per the artifact convention).
- **Subagent fan-out** — confirm per-axis parallel scoring is worth it vs. a single-pass reviewer (§L tier: likely `sonnet` per-axis, `inherit` for synthesis).
- **`/artifact-sdlc`** — out of scope for this brief; note as the eventual orchestrator so `/artifact-critique`'s hand-off contract is designed to slot in.

---

## Appendix — source corpus

`/Users/maneeshdhabria/Downloads/critique/` — 5 folders, each an input product doc + Coach REVIEW (and, for 4 of 5, a REWRITE) PDF:
`allocation 2.0` (internal infra PRD) · `metric store strategy` (internal strategy POV) · `partner suspension strategy` (strategy/heavy-PRD, ~110pp) · `voice issue recognition` (V0/PMF experiment PRD, AI/LM) · `vprime` (EdTech strategy + roadmap). Per-folder reverse-engineering reports were produced by 5 independent subagents and synthesized above.
