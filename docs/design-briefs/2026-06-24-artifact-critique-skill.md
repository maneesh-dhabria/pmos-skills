# Design Brief — `/artifact-critique`: opinionated, axis-by-axis product-doc critique

**Date:** 2026-06-24
**Plugin:** pmos-toolkit
**Status:** Design grilled & locked (deep grill 2026-06-24, 13 branches); ready for `/skill-sdlc define`
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

### 2.3 Verdict vocabulary — single ordinal scale + reason tag *(locked, grill Q6)*
Coach's *observed* labels (`SPECIFIC`/`GOOD`/`MIXED`/`VAGUE`/`OUTPUT`/`ABSENT`/`N/A`) don't form a clean scale — `SPECIFIC` and `GOOD` are the same verdict, and `OUTPUT` is a Metrics-only *failure shape*, not a quality level. We lock a **single ordinal scale**, and carry shape-specific critiques as a free-text **reason** on the verdict line (not as separate labels):

| Verdict | Meaning |
|---|---|
| `STRONG` | present, concrete, evidenced — a **first-class, freely-given** verdict (grill Q11) |
| `MIXED` | partially there; strengths + real gaps |
| `WEAK` | gestured at, not concrete/quantified |
| `ABSENT` | expected for this doc-type but not addressed (a real defect) |
| `N/A` | not applicable to this doc-type (but **stated**, never silently skipped) |

The sharp shape-language Coach uses ("output, not outcome"; "wedge, not a moat"; "benchmarking, not positioning") lives in the one-line summary/reason, keeping the at-a-glance scorecard a clean ordinal. **`ABSENT` vs `N/A` is decided deterministically by the doc-type applicability map** (§2.6, grill Q5) — never ad hoc.

### 2.4 Critique structure (identical skeleton every time)
1. **Opening framing** — names the doc-type and commits: *"On a careful read, this is a [type]… I'll push hardest on [three things]."*
2. **Verdict by Axis** — the scannable scorecard (10 × verdict + one-line summary).
3. **Per-axis deep-dives** — each header is *itself a verdict* ("Metrics — Outputs dressed as outcomes"; "Scope — Feature backlog dressed as strategy"). Each pulls a **verbatim block-quote** from the source, interrogates it, and closes with a prescriptive **"What I'd want to see:"** ask (a concrete artifact, e.g. "a current baseline, a 6-month target, and a rollback threshold per north-star metric").
4. **Weakest Claims (up to three)** — ranked load-bearing assertions, each with bulleted follow-up interrogation questions ("Follow-ups worth pressing"). May legitimately return fewer than three — or none ("no load-bearing claim is unsupported") — on a strong doc; never padded to hit a quota (grill Q11).
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

### 2.6 Doc-type awareness → **applicability map** *(locked, grill Q5 & Q10)*
Coach detects the type in sentence one (`STRATEGY DOC · REVIEW` vs `PRD Review`) and adapts: marks Pricing `N/A` for internal tools; reframes Strategy as **build-vs-buy + opportunity cost** for internal platforms; flags "PRD content smuggled into a strategy doc"; treats `<Work in Progress>`/placeholder sections as decision-blocking gaps.

We make this **deterministic**: `doc-types.md` declares, per type (PRD / strategy / POV / roadmap), which axes are **expected** vs **not-applicable**. The skill **auto-detects the type and declares it in the opening line**, user-correctable in interactive mode / recorded as an assumption in non-interactive (grill Q10). **Hybrids** (e.g. "strategy with a heavy PRD lean") take the **union** of applicable axes, so nothing expected gets a free `N/A`. The map then drives the verdict: missing + expected → `ABSENT`; missing + not-applicable → `N/A`. The map text doubles as the author-facing explanation ("PRDs are expected to address Risks").

### 2.7 Tone
Opinionated but **fair** — credits genuine strengths *before* attacking ("the triad design is good… the measurement infrastructure isn't"). Grounds every critique in a verbatim quote + the source's own section numbers (§4.1, A9). **Ventriloquizes the executive reader** ("The CPO should ask…") to generate pressure-test questions. Memorable aphorisms. Models the missing artifact (drafts a Behavior Contract row) rather than only naming the gap.

---

## 3. Decisions

| # | Decision | Choice & rationale |
|---|---|---|
| **D0** | Separate skill vs. mode of `/artifact` | **Separate standalone skill** (grill Q1). Judging a foreign doc is a distinct act from authoring one, and it must run standalone on docs `/artifact` never made — matching `/grill`, `/design-crit`, `/polish`. Accept the Phase-0/substrate duplication as the cost of a clean charter. |
| **D1** | Critique vs. rewrite | **Critique-only.** `/artifact-critique` produces the REVIEW (verdicts + deep-dives + weakest-claims). The **rewrite is delegated to `/artifact`** — that skill already authors to a bar. **The hand-off vehicle is the persisted critique document itself** (grill Q4): `/artifact-critique` emits a structured, machine-parseable critique (per-axis verdict + reason + "what I'd want to see" + ranked weakest-claims) that a future `/artifact` rewrite step consumes. In v1 the standalone hand-off is advisory prose; the *structured findings block* is the durable contract. No `/artifact` change required in v1. |
| **D2** | Shared substrate | **Author the rubric at `_shared/critique-rubric/` now, but only `/artifact-critique` consumes it in v1** (grill Q3). The "both skills share it" end-state is the intent, but having `/artifact` consume `heuristics.md` is a refactor of a shipped 38.5K skill with its own per-section eval — that adoption is an **explicit later story** tied to `/artifact-sdlc`, not v1 scope. Files: (a) `axes.md` — the 10 axes + per-axis checks; (b) `heuristics.md` — the §2.5 spine; (c) `doc-types.md` — the applicability map (§2.6) + verdict-scale definition (§2.3). **Guard against a dangling cite** — don't have `/artifact` reference the substrate until its adoption story lands. One fact, one home (CLAUDE.md §K). |
| **D3** | Output format | **Honor `output_format` (`html`\|`md`); drop `both`** (grill Q2). The repo retired the MD sidecar (`both`→`html`); resurrecting it would deviate from a repo-wide invariant. HTML-primary via the html-authoring substrate (inline comments, wordmark/footer, `<meta pmos:skill>`); the HTML artifact carries a **"Copy markdown" affordance** so the paste-into-Slack/doc workflow survives without a sidecar. `--format html\|md` overrides settings. |
| **D4** | Rubric shape — replicate vs. generalize *(your open question)* | **Replicate the 10 named axes exactly AND extract the cross-cutting heuristics as a named spine — keep both layers.** *What generalizing-away-the-axes would cost:* (1) **the coverage-of-absence guarantee** — the fixed list is what forces an `ABSENT` verdict on an axis the author never wrote; a purely heuristic rubric can only critique what's *present*, and "you have no Risks section / no Pricing analysis" is the single highest-value finding Coach produces; (2) **scannability** — the 10-label verdict table is the product's signature, a reader sees where the doc is weak in 3 seconds; (3) **shared vocabulary** — "your Metrics axis is OUTPUT, not OUTCOME" is a precise, memorable handle for author + exec; (4) **clean doc-type adaptivity** — marking a named axis `N/A` is crisper than dropping an abstract dimension. The heuristics (§2.5) are the *reasoning*; the axes (§2.2) are the *coverage checklist*. Coach uses both internally — so do we. This is also exactly why the spine is separable into `_shared/` (D2): `/artifact` wants the reasoning, not the verdict-rendering. |
| **D5** | Positioning & pipeline | **Closely tied to `/artifact`; a stage in a future `/artifact-sdlc` pipeline.** Envisioned arc: `/artifact` (generate) → `/artifact-critique` (review) → `/artifact refine` (rewrite to findings) → loop. `/artifact-sdlc` does not exist yet; this brief assumes it as the eventual orchestrator (mirrors `/feature-sdlc`, `/skill-sdlc`). `/artifact-critique` must also run **standalone** (like `/grill`, `/design-crit`) on any doc path the user passes. Cross-references in the brief; no hard coupling required for v1. |
| **D6** | Input handling | Accept a doc **path** (md / html / pdf / docx-pdf) or pasted content. Must traverse **Notion exports** (the markdown lives under `Private & Shared/…`, images alongside). **Read embedded diagrams/images** (render PDF pages, read SVG/PNG alongside Notion markdown) and factor them into axis scoring (grill Q13) — when a visual is unreadable, say so and do **not** assert `ABSENT` for content that may live in it (ties to D7). **Long docs:** load the **full doc in context** by default (modern windows hold ~110pp); only past the genuine context limit, **map-reduce evidence-gathering** — chunks return verbatim quotes + section refs (never summaries), then one reviewer synthesizes from the collected quotes (grill Q8). The old "summarize-then-review" fallback is dropped — it breaks the verbatim-quote gate. Never silently truncate. |
| **D7** | Honesty about its own limits | Like Coach's rewrite `[placeholder]` discipline: when the critique *infers* a gap it cannot verify from the doc (e.g. "no baseline exists" — maybe it does, elsewhere), it says *"not visible in this doc"* rather than asserting absence as fact. Mirrors the silent-failure / faithful-reporting posture. |

---

## 4. Skill shape (proposed)

**Charter (one line):** Give a product document the opinionated, axis-by-axis review a seasoned product leader would — a scannable verdict scorecard, quote-grounded per-axis critique, and a forced-ranking of the weakest claims — as a written artifact, then hand off to `/artifact` to rewrite.

**Phases (draft):**
0. Load context (pipeline-setup), resolve `output_format`/`--format`, read learnings.
1. **Ingest** — resolve the doc (path/paste/Notion-export traversal), extract text + section structure **and read embedded diagrams/images** (D6); note any unreadable visuals.
2. **Doc-type detection** — classify (PRD / strategy / POV / roadmap / hybrid), **declare it in the opening line** (user-correctable interactively / assumption in non-interactive); resolve the applicable-axis set from `_shared/critique-rubric/doc-types.md` (union for hybrids).
3. **Axis scoring — single-pass reviewer** (grill Q7) — one agent reads the whole doc in context and scores all axes against `axes.md` checks + `heuristics.md` spine, assigning an ordinal verdict (`STRONG/MIXED/WEAK/ABSENT/N/A`) + reason. Keeps cross-axis reasoning intact. Per-axis fan-out is deferred as a latency optimization only.
4. **Per-axis deep-dive** — verbatim quote → interrogation → "What I'd want to see:" prescription.
5. **Weakest Claims (up to three)** — ranked load-bearing assertions + follow-up questions; may return fewer/none; never padded (grill Q11).
6. **Synthesize** — opening framing ("push hardest on …") + bottom-line; cross-axis "signals worth flagging."
7. **Emit** — `output_format`-respecting artifact (HTML primary; "Copy markdown" affordance) with a **structured findings block** as the `/artifact` hand-off contract (D1); advisory hand-off prose.

**Quality gate (grill Q9) — two tiers:**
- **Deterministic script (hard gate, 100% pass):** every applicable axis has a verdict; every quote is ≥40 chars **and verified present in the source**; every `ABSENT`/`WEAK` verdict names the specific gap; the weakest-claims section exists and is ranked (0–3 allowed). Mechanical — never have the model count or string-match what a script can (CLAUDE.md §H).
- **Reviewer subagent (advisory):** a *separate* agent judges grounding quality, fairness, voice adherence, and **flags manufactured/nitpick findings** (grill Q11) per `_shared/reviewer-protocol.md`, ≤2 loops.

---

## 5. Voice *(locked, grill Q12)*

Replicate the opinionated senior-operator register via an **unnamed "seasoned product leader" persona**, held in the prompt by an **explicit voice rubric** (take a position; no hedging; credit strengths *before* attacking; ground every critique in a quote; ventriloquize the executive reader) **plus a few curated few-shot exemplar critique lines** drawn from the corpus. Do **not** copy the "Gokul Rajaram" attribution; use the pmos wordmark/footer per the artifact convention. The advisory reviewer (§4) scores voice adherence to resist drift toward generic-helpful/hedged output.

## 6. Open items for `define`

- **Structured findings schema** — design the machine-parseable findings block (per-axis `{verdict, reason, what-id-want-to-see}` + ranked weakest-claims) that is the `/artifact` hand-off contract (D1). Candidate carrier: the html-authoring `.sections.json` companion, or a dedicated embedded block.
- **`axes.md` per-axis checks** — write out the concrete checks behind each of the 10 axes (the §2.5 heuristics mapped onto axes).
- **`doc-types.md` applicability map** — author the expected/not-applicable axis sets per doc-type (PRD / strategy / POV / roadmap) + the hybrid-union rule (§2.6).
- **Few-shot exemplar curation** — pick the voice exemplars from the 5-doc corpus.
- **Deterministic eval script** — implement the hard-gate checks (§4); decide the quote-in-source verification mechanism.
- **`/artifact` rubric adoption** — explicit later story (tied to `/artifact-sdlc`); until it lands, no `/artifact` cite of `_shared/critique-rubric/` (dangling-cite guard, D2).
- **`/artifact-sdlc`** — out of scope here; the eventual orchestrator (`/artifact` → `/artifact-critique` → rewrite). The structured findings block (above) is designed so it can slot in.

---

## Appendix — source corpus

`/Users/maneeshdhabria/Downloads/critique/` — 5 folders, each an input product doc + Coach REVIEW (and, for 4 of 5, a REWRITE) PDF:
`allocation 2.0` (internal infra PRD) · `metric store strategy` (internal strategy POV) · `partner suspension strategy` (strategy/heavy-PRD, ~110pp) · `voice issue recognition` (V0/PMF experiment PRD, AI/LM) · `vprime` (EdTech strategy + roadmap). Per-folder reverse-engineering reports were produced by 5 independent subagents and synthesized above.
