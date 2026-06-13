# Deep-Research Best Practices — design research for a new `/research` skill

*Exploratory research to seed the design doc for a pmos-toolkit `/research` skill: a PM-facing slash command that conducts deep, cited research on any topic and emits a self-contained HTML research report. This is research, not a build. All recommendations are prescriptive.*

Date: 2026-06-13

---

## 1. Existing implementations in this repo

### 1a. The `deep-research` skill (env-loaded, not a repo file)

The `deep-research` skill is **registered in the harness** (it appears in the available-skills list and as a `Skill` tool target) but its `SKILL.md` is **not present anywhere on the filesystem** — `find /`, `mdfind`, and a grep across every `~/.claude*/plugins/marketplaces/**/SKILL.md` all return nothing. It is a managed/built-in skill whose body is not stored as a flat file we can read. Its full behavior is therefore only available through its **registered description**, which is the authoritative pipeline statement:

> "Deep research harness — fan-out web searches, fetch sources, adversarially verify claims, synthesize a cited report. When the user wants a deep, multi-source, fact-checked research report on any topic. BEFORE invoking, check if the question is specific enough to research directly — if underspecified (e.g., 'what car to buy' without budget/use-case/region), ask 2-3 clarifying questions to narrow scope. Then pass the refined question as args, weaving the answers in."

**Its exact pipeline, as declared:**

1. **Scope check / clarify** — before doing anything, test whether the question is specific enough. If underspecified, ask **2–3 clarifying questions** and weave the answers into a refined question. (This is a *pre-flight gate*, not a full research-plan-approval step — lighter than Gemini's.)
2. **Fan-out web searches** — decompose into multiple parallel search threads.
3. **Fetch sources** — retrieve the actual pages behind the search hits.
4. **Adversarial claim verification** — *fact-check* claims rather than trusting first-pass synthesis. This is the distinctive rigor step.
5. **Synthesize** — assemble into a single coherent report.
6. **Cite** — every claim attributed to a fetched source.

**What `/research` should inherit from it:** the fan-out → fetch → adversarial-verify → synthesize → cite spine, and the pre-flight clarify gate. **What `/research` adds:** repo conventions (phased, depth-tiered, HTML-authoring substrate, reviewer/eval pass, `/polish` handoff), a PM **decision-support** framing (recommendation + evidence grading + confidence), and an explicit **research-plan-approval** step deep-research lacks.

### 1b. `primer` (pmos-learnkit) — research → outline → draft → self-eval

Path: `plugins/pmos-learnkit/skills/primer/SKILL.md` (197 lines). **7 sequential phases**: Setup → Intake → Canon & Outline → Sourcing → Draft → Eval + Write → Capture Learnings.

The governing rule: **every claim a reader might act on traces to a source fetched this run.** Architecture worth copying:

- **Shared front half / owned back half.** The intake → canon → outline → verified-sourcing front half is the `_shared/topic-research/` substrate (shared with `/learn-list`); primer owns only its reactions + the back half (curator-voiced draft, eval, write). This is the **"one fact, one home"** discipline (CLAUDE.md §K).
- **Outline-confirm gate** (Phase 2) — the user approves/edits the outline *before* sourcing, so you never source the wrong topics. This is primer's analogue of a research-plan-approval step.
- **Sourcing runs after outline approval** — never source the wrong topics.
- **Per-H2 evidence map** — each verified shortlist is the evidence set for one `<h2>`; never flattened. Each `<a href>` must be a verbatim `sources.json[].url` member (no novel URLs at draft time).
- **Reviewer subagent (Phase 5), opt-in.** Runs only at `--depth deep` or on explicit request. A *fresh `Task` subagent* inlines a verbatim rubric, scores 10 checks, returns JSON `{check_id, verdict, evidence, quote}`, **scores only — never edits**. Orchestrator-side validation: returned `check_id` set must equal the rubric's IDs; every `fail` quote must be a ≥40-char verbatim substring of the draft (hallucinated-quote defense → treat as pass). **Auto-apply once, iteration cap = 1.**
- **Trust-tier hard-block + recovery path.** Trust checks (citation discipline, grounding, etc.) that survive the one re-run *block the write*; the rejected draft is written to `.draft.html` with a red `REJECTED BY REVIEWER` banner; the artifact is never emitted. Taste-tier residuals → ship-with-known-risk prompt.
- **Atomic trio write** — `.html`, `.sections.json`, `.sources.json` via temp-then-rename; all temps succeed before any `mv`.
- **No subagents outside the reviewer** — Phases 1–4 run inline; the sourcing loop uses *tool-level fetch parallelism*, not dispatch.

### 1c. `learn-list` (pmos-learnkit) — verification-first link curation

Path: `plugins/pmos-learnkit/skills/learn-list/SKILL.md` (252 lines). **8 phases**: Setup → Intake → Canon → Outline → Source → Adjacencies + Follow-list → Eval + Write → Capture Learnings.

The governing rule: **verification-first web pipeline, not generate-from-memory.** "Every emitted link is fetched and verified this run; the canon is found by live search, never recalled."

- **Same shared front half** (`_shared/topic-research/`); owns the back half: ranking, annotation, adjacency rabbit-holes, follow-list, paste-block.
- **Subagent fan-out (Phase 4)** — *this is the model `/research` should follow for fan-out*: "one `Task` per topic at `standard`/`deep` (sequential at `brief`), with `model: haiku`." The haiku tier is justified because the fetch+verify+annotate output is re-checked by the Phase 6 self-review. Degradation when subagents absent: collapse to sequential in-context.
- **Self-review before writing (Phase 6)** — dead-link sweep, slop spot-check, grounding, coverage. Lighter than primer's full reviewer-subagent rubric.

### 1d. The `_shared/topic-research/` substrate (skill-agnostic)

`plugins/pmos-learnkit/skills/_shared/topic-research/`:

- `intake.md` — the two dials (`--depth`, `--audience`), the **depth → coverage dial matrix**, the topic-richness classifier (returns `rich` / `narrow-by-design` / `thin` + reframings). Emits a typed `intake` result; **does not branch on the verdict** — the consuming skill reacts.
- `canon-discovery.md` — find practitioners/books/curations by live search, sized by depth.
- `outline.md` — derive outline by cascade (canonical → curation → provisional), record provenance rung, dedupe, run confirm gate.
- `sourcing.md` — **rank-then-verify**: "Rank first, then verify only the survivors (verification spend scales with output, not the candidate pool), and never emit a source you have not fetched this run." Cap candidate pool at ~3× links-to-emit; hard-gate cheaply on metadata before fetch; tier-rank; fetch-verify top-N; record grounded ≤2-sentence takeaway. Output unit = **one verified shortlist per topic, no flattening**.
- `source-tiers.md` — the anti-slop rubric. **Hard gate (binary):** attributable (named author OR recognized publication) AND real+reachable. **Tier ranking T1–T4** (Primary → Practitioner → Reputable publication → Aggregator). Slop tells; recency awareness; per-format reputation notes. "Prefer fewer, higher-tier links."
- `sourcing-ladder.md`, `source-tiers.md` carry the verification pass-bar and free-fetch ladder.

**The depth → coverage dial matrix (the sizing contract `/research` must reuse):**

| Dimension | brief | standard | deep |
|---|---|---|---|
| Topics in outline | 3–5 | 5–8 | 8–12 |
| Verified sources per topic | top 3 | top 5 | top 5–8 |
| Adjacency hops | 0 | 1 | 2 |
| Fan-out | sequential / in-context | one unit per topic | one unit per topic + per adjacency cluster |

`tier-matrix.md` maps `--depth` brief/standard/deep → Tier 1/2/3 and confirms `--depth` is the single user-facing effort dial.

**How the repo fans out + saves interim artifacts:** subagents are spawned **one `Task` per topic** with `model: haiku`, fan-out only at `standard`/`deep`. Interim research isn't persisted to files mid-run — it's held in working memory as typed structures (`intake`, `canon`, `outline`, `sourced`), then written **atomically at the end** (`.html` + `.sections.json` + `.sources.json`). The `sources.json` is the canonical evidence ledger and the membership set every citation must match.

---

## 2. Web research — deep-research agent best practices (2024–2026)

### Anthropic's multi-agent research system (orchestrator-worker)

Source: [How we built our multi-agent research system](https://www.anthropic.com/engineering/built-multi-agent-research-system). The single most concrete and directly applicable reference.

- **Orchestrator-worker pattern.** A **lead/orchestrator agent** (Claude Opus) analyzes the query, develops strategy, and spawns **specialized subagents** (Claude Sonnet) that explore different aspects **in parallel**. Lead + Sonnet subagents **outperformed single-agent Opus by 90.2%** on their internal research eval.
- **Scale effort to query complexity** (their explicit guideline — adopt this directly as the depth-tier mapping):
  - Simple fact-finding → **1 agent, 3–10 tool calls**
  - Direct comparisons → **2–4 subagents, 10–15 calls each**
  - Complex research → **>10 subagents** with clearly divided responsibilities
  - For the common case: **3–5 subagents in parallel** rather than serially.
- **Delegation must be detailed.** Each subagent gets: **objective, output format, tool/source guidance, clear task boundaries.** Without this, "subagents duplicate work, leave gaps, or fail to find necessary information."
- **Search strategy:** start with **short, broad queries, evaluate what's available, then progressively narrow.** (The classic funnel.)
- **Extended thinking as a visible planning scratchpad.** Lead uses thinking to plan, assess tools, determine query complexity and subagent count; subagents use interleaved thinking after each tool result to evaluate quality, identify gaps, refine next query.
- **Plan persisted to Memory** before spawning subagents, so a >200K-token context truncation doesn't lose the plan.
- **Parallel tool calls** — subagents use 3+ tools in parallel; up to **90% time reduction** on complex queries.
- **Stopping criteria** — the lead synthesizes subagent results and **decides whether more research is needed**; if so, spawn more subagents or refine. (Saturation/coverage judgment, not a fixed count.)
- **CitationAgent** — a dedicated final pass that takes the documents + the drafted report and **identifies specific citation locations**, ensuring every claim is attributed. Citation is a *separate stage*, not woven into synthesis.
- **Cost reality:** ~**15× more tokens** than a chat. Multi-agent is justified only when outcome value outweighs spend — a strong argument for **tiering** the fan-out.

### STORM / Co-STORM (Stanford OVAL)

Sources: [stanford-oval/storm](https://github.com/stanford-oval/storm), [Stanford STORM project](https://storm-project.stanford.edu/research/storm/), [MarkTechPost](https://www.marktechpost.com/2024/07/16/storm-an-ai-powered-writing-system-for-the-synthesis-of-topic-outlines-through-retrieval-and-multi-perspective-question-asking/).

- **Two-stage pipeline: pre-writing (research+outline) then writing (generate with citations).** Separating discovery from synthesis is the load-bearing structural idea (same as primer's outline-then-draft).
- **Perspective-guided question asking** — STORM surveys existing articles on similar topics to **discover diverse perspectives**, then uses those perspectives to drive question generation → breadth + depth instead of one shallow angle. *PM analogue: research a decision from the buyer, the competitor, the engineer, the skeptic, the analyst.*
- **Simulated conversation** — a "writer" interrogates a "topic expert grounded in internet sources," iterating with follow-up questions. Each turn is grounded in retrieved sources → avoids hallucination.
- **Co-STORM (human-in-the-loop)** — adds LLM experts + a moderator that generates thought-provoking questions + a human who steers, plus a **dynamic mind-map** organizing collected info into a hierarchy. *PM analogue: the user can steer mid-research.*
- **Grounding against hallucination:** claims are written by **populating outline sections from retrieved+cited content** — never free-generated.

### GPT Researcher

Sources: [docs.gptr.dev](https://docs.gptr.dev/docs/gpt-researcher/getting-started/introduction), [DeepWiki](https://deepwiki.com/assafelovic/gpt-researcher).

- **Planner + execution agents.** Planner **generates the research questions** that together form an objective view; execution agents seek info for **each** question, then **filter and aggregate** into a report. This is the explicit query-decomposition → parallel-execution → aggregation loop.
- **Crawler agents scrape 20+ web sources in parallel**; a **publisher aggregates with source tracking.**
- **Model cost-tiering** — cheap model (gpt-4o-mini) for most work, expensive (gpt-4o, 128K) only when needed. ~2 min, ~$0.005/run. *Validates the haiku-worker / opus-orchestrator split.*

### OpenAI Deep Research vs Gemini Deep Research

Sources: [OpenAI: Introducing deep research](https://openai.com/index/introducing-deep-research/), [How OpenAI's Deep Research works](https://blog.promptlayer.com/how-deep-research-works/), [Gemini Deep Research overview](https://gemini.google/overview/deep-research/), [Gemini API deep research docs](https://ai.google.dev/gemini-api/docs/deep-research), [Helicone comparison](https://www.helicone.ai/blog/openai-deep-research).

- **Gemini = plan-then-execute with explicit user approval.** "Before it begins, Gemini lays out a plan for your approval — so you control what it looks for and where it searches." User can add/remove/modify plan sections before execution. Max research time ~60 min, most tasks ~20 min. **This is the model for `/research`'s plan-approval step.**
- **OpenAI = ReAct-ish real-time adjustment**, but has *added* planning: you can edit the plan before kickoff, see progress live, interrupt to refine, and update accessible sources. Convergence: both now do plan-then-execute with a steering affordance.
- **Citations universal** — both emit inline citations / source links so every claim is traceable. "Every claim is backed by inline citations linking to exact sources."
- **Plan-then-execute beats pure ReAct for reports** because it lets the user catch a mis-scoped investigation before spending the (15×) token budget.

### Cross-cutting patterns (synthesis of all five)

| Pattern | Consensus best practice |
|---|---|
| **Plan vs ReAct** | **Plan-then-execute** for report generation; reserve ReAct-style adaptivity for *within* a subagent's search loop. |
| **Architecture** | **Orchestrator-worker fan-out/fan-in.** Lead plans + decomposes + synthesizes; workers each own one sub-question, run in parallel, return a structured interim finding. |
| **# parallel subagents** | 1 (simple) / 2–4 (comparison) / >10 (complex); **3–5 is the sweet spot.** |
| **Research-plan approval** | Generate a plan/outline, **show it to the user, let them edit** before spending the budget (Gemini, primer's outline gate). |
| **Query decomposition** | Decompose into sub-questions; assign one per worker with explicit objective + output format + boundaries. |
| **Source triangulation** | Multiple perspectives (STORM); ≥2 independent sources per load-bearing claim; tier sources for quality. |
| **Claim verification** | A **separate** verification/citation pass (deep-research's adversarial step; Anthropic's CitationAgent; primer's reviewer with ≥40-char quote-grounding). |
| **Iterative gap-filling** | Lead evaluates interim results, identifies gaps, **spawns more workers or stops.** A "what's missing?" critic loop. |
| **When to stop** | Coverage/saturation judgment by the orchestrator — not a fixed count. Bound it with a **hard iteration cap** to avoid runaway cost. |
| **Report structure** | Executive summary first; **tables over prose**; evidence grading; explicit confidence levels; a source-quality appendix. |

---

## 3. Concrete recommendations for `/research`

### 3.0 Unique job — how `/research` avoids duplicating deep-research / primer / learn-list

State this in the SKILL.md governing rule. The four are distinguished by **output intent**, not topic:

| Skill | Job | Output |
|---|---|---|
| `deep-research` (env) | General fact-checked research on *any* question | A cited report (generic, no repo conventions, no PM framing) |
| `/primer` | **Teach** the user a topic | A teachable, audience-shaped explainer artifact |
| `/learn-list` | **Curate what to read** | A verified, ranked reading list + follow-list |
| **`/research` (new)** | **Support a PM decision** | A **decision-support research report**: a recommendation backed by graded evidence, options compared in tables, confidence levels, and a "what would change my mind" section |

**`/research`'s governing rule:** *"Produce a decision-grade research report — every recommendation traces to triangulated, verified sources, every claim carries a confidence level, and the report ends in an actionable recommendation a PM can defend in a room."* It is `deep-research`'s rigor + the repo's HTML/eval/tier conventions + a **decision lens** (options, tradeoffs, recommendation, confidence) that none of the other three carry. It should *suggest* `/primer` (to learn the space) and `/learn-list` (to read deeper) as handoffs, never invoke them.

### 3.1 Phase-by-phase architecture

Integer top-level phases with stable `{#kebab-slug}` anchors (CLAUDE.md §J). Cite slugs, never bare numbers.

- **Phase 0: Setup + Load Learnings {#setup}** — inline `_shared/pipeline-setup.md` (read `.pmos/settings.yaml`, resolve `{docs_path}`, `{research_dir} = {docs_path}/research/`). HTML-primary; `output_format: both` writes an `.md` sidecar. Load `~/.pmos/learnings.md` `## /research`. Inline the canonical non-interactive block byte-identical (CLAUDE.md W14 posture). Capture wall-clock for lastrun.
- **Phase 1: Intake + scope clarify {#intake}** — parse `<question>` + flags. Inline `_shared/topic-research/intake.md` for the `--depth`/`--audience` dials + richness classifier. **Then run the deep-research scope-check gate:** if the question is underspecified for a *decision* (missing constraints, success criteria, region/segment, time horizon, budget), ask **2–3 clarifying questions** (`AskUserQuestion`, each with a Recommended option) and fold the answers into a refined question. Resolve `decision_frame` = the decision the PM is trying to make. Lastrun consolidated confirm + path-collision guard (copy primer's pattern).
- **Phase 2: Research plan generation + approval {#research-plan}** — **the differentiating step.** Do a *preliminary scoping search* (a small, **brief**-tier fan-out: ~3 broad searches, no deep verification) to ground the plan in what actually exists. Then generate a **research plan**: decompose `decision_frame` into 3–N **sub-questions / perspectives** (STORM-style: buyer, competitor, technical-feasibility, cost, risk/skeptic, regulatory), each with an objective + the kind of source that would answer it. Show the plan via the outline-confirm gate (primer's Phase 2 / Gemini's plan-approval): `Approve (Recommended) / Edit / Re-prompt / Abort`. **Approval gates the spend** (the 15× token cost lands after this point). Persist the approved plan to working memory (Anthropic: persist-plan-before-fan-out).
- **Phase 3: Fan-out research {#fan-out}** — orchestrator-worker. **One `Task` subagent per sub-question** (the learn-list pattern), `model: sonnet` for research workers (heavier reasoning than learn-list's haiku curation; see §L tiers below). Each worker prompt carries: the sub-question objective, the required structured output format, tool/source guidance, clear boundaries, and the `[mode: <current-mode>]` first line. Each worker runs its own **funnel** (broad → narrow), applies the `source-tiers.md` hard gate + tier ranking, **fetches and verifies** its sources (rank-then-verify per `sourcing.md`), and returns a **structured interim finding**: `{sub_question, findings: [{claim, evidence_url, tier, confidence}], gaps, sources}`. Fan-out width is depth-tiered (§3.4). At `brief`, collapse to sequential in-context. Save interim findings in working memory keyed by sub-question (no per-worker file writes — assemble atomically at the end, like primer).
- **Phase 4: Gap-fill / saturation loop {#gap-fill}** — the orchestrator reviews the interim findings, builds a coverage map against the approved plan, and asks "what's missing / what's contradicted?" If material gaps or **source conflicts** exist, spawn a **targeted second wave** of workers (Anthropic: spawn-more-or-stop). **Hard iteration cap = 1 extra wave** (mirrors primer's iteration-cap discipline and bounds the 15× cost). Stop when coverage is saturated or the cap is hit.
- **Phase 5: Adversarial claim verification {#verify}** — a **dedicated, separate** verification pass (deep-research's signature step + Anthropic's CitationAgent). A fresh reviewer/verifier `Task` subagent receives the assembled findings + the `sources.json` evidence ledger and, per load-bearing claim, checks: (a) **is it grounded** in a fetched source (≥40-char verbatim quote membership test, primer's hallucinated-quote defense)? (b) **is it triangulated** (≥2 independent sources for any claim that drives the recommendation)? (c) **counter-evidence** — actively search for sources that *contradict* the recommendation (adversarial). Returns JSON `{claim_id, verdict, confidence, supporting_urls, contradicting_urls, quote}`. **Trust-tier hard-block + recovery path** copied from primer: an ungrounded recommendation-driving claim blocks the write; rejected draft → `.draft.html` with a red banner. Rigor is tier-scaled (§3.4).
- **Phase 6: Synthesis + report write {#synthesize}** — assemble the decision-support report (structure in §3.7). Populate sections **only from verified findings** (STORM: write-from-retrieved); every `<a href>` is a verbatim `sources.json[].url` member. Assign a **confidence level** to each finding and an overall recommendation confidence. Write the **atomic trio** (`.html` + `.sections.json` + `.sources.json`) via temp-then-rename through `_shared/html-authoring/`; regenerate a `research.html` listing page. Update lastrun.
- **Phase 7: Polish (tier-gated) {#polish}** — at `deep` (and on request), hand the report's prose to `/polish` for concision + de-slop. `/polish` is single-doc and can't be subagent-invoked, so call it from the main thread post-write, then re-emit. Skip at `brief`/`standard`.
- **Phase 8: Capture Learnings {#capture-learnings}** — primer/learn-list pattern: one-line `Learning:` or specific `No new learnings because …`.

### 3.2 Subagent fan-out strategy

- **Decompose the topic into sub-questions/perspectives, not sub-topics.** A decision-research question fans out best along *perspectives* (STORM) — buyer demand, competitive landscape, technical feasibility, cost/effort, risk & failure modes, regulatory/compliance — plus the explicit options being compared. The orchestrator generates these in Phase 2 and the user approves them.
- **One worker per sub-question** (learn-list's proven pattern). Each worker is self-contained: objective + output schema + boundaries (Anthropic's delegation rule). Workers return structured findings, **not prose** — the orchestrator owns prose.
- **Workers per tier:** `brief` = 0 (sequential in-context, 1 effective agent); `standard` = 3–5 parallel workers; `deep` = 6–10 parallel workers + up to 1 gap-fill wave. (Anthropic's 1 / 2–4 / >10 ladder, clamped to keep cost sane for a PM tool.)
- **Interim reports** live in working memory keyed by sub-question (typed structs), assembled and written **atomically at the end** — the repo norm (primer/learn-list never write per-worker files). The single persisted evidence artifact is `sources.json`, the citation membership set.
- **Model tiers (§L):** orchestrator = **inherit** (the user's session model — it does the planning + synthesis + gap judgment); research workers = **sonnet** (real multi-step reasoning over fetched content, deeper than learn-list's haiku annotation); the Phase 5 verifier = **sonnet** (adversarial reasoning). The verifier and synthesis are too consequential for haiku.

### 3.3 Research-plan generation + approval, and preliminary scoping

- **Always generate an explicit research plan and gate on user approval** (Phase 2). This is `/research`'s defining UX and its cost-control valve — the 15× fan-out only fires after approval.
- **Preliminary scoping research = `brief` tier, always.** Before drafting the plan, run a *cheap* broad fan-out (~3 searches, no verification, no subagents) to ground the plan in what sources actually exist — so the plan proposes investigable sub-questions, not aspirational ones. This is invariant across `--depth` (even a `deep` run scopes briefly first); it is the only pre-approval spend.
- The approval prompt carries a Recommended option and degrades to AUTO-PICK-approve under `--non-interactive` (the scope-clarify questions also auto-pick their Recommended).

### 3.4 Verification / fact-checking rigor, per tier

Verification is **always on** (it's the skill's reason to exist) but its depth scales:

| | `brief` | `standard` | `deep` |
|---|---|---|---|
| Grounding (≥40-char quote membership) | recommendation-driving claims only | all load-bearing claims | every claim |
| Triangulation (≥2 independent sources) | recommendation only | recommendation + each option's key tradeoffs | every load-bearing claim |
| Adversarial counter-evidence search | recommendation only | recommendation + top risks | per sub-question |
| Verifier subagent | inline self-review (learn-list style) | dedicated verifier subagent | dedicated verifier + the gap-fill wave |
| Trust-tier hard-block | yes (always) | yes | yes |

The **hard gate from `source-tiers.md`** (attributable + reachable) applies at every tier — slop never ships.

### 3.5 Depth-tier mapping (the dial)

Reuse `_shared/tier-matrix.md` and the `intake.md` dial matrix; `/research`'s reactions:

| Dimension | `brief` (T1) | `standard` (T2) | `deep` (T3) |
|---|---|---|---|
| Sub-questions / perspectives | 3 | 4–6 | 6–10 |
| Parallel research subagents | 0 (sequential) | 3–5 | 6–10 + 1 gap-fill wave |
| Verified sources (total floor) | ~8 | ~15 | ~25 |
| Sources per sub-question | top 3 | top 5 | top 5–8 |
| Gap-fill wave | no | optional (if conflicts) | yes (capped at 1) |
| Verification rigor | §3.4 brief | §3.4 standard | §3.4 deep |
| Report length | ~1,000–1,500 w | ~2,500–4,000 w | ~5,000–8,000 w |
| Reviewer / verifier | inline self-review | dedicated subagent | dedicated + adversarial counter-search |
| `/polish` runs | no | no | **yes** |

Source floors are **eval-time coverage signals, not sourcing gates** (primer's posture) — under-floor surfaces a thin-source disclosure, never blocks.

### 3.6 Output report structure (tables over narrative)

A decision-support shape, distinct from primer's teachable shape:

1. **TL;DR / Recommendation** — the answer in 2–3 sentences + overall **confidence band** (High/Medium/Low) + the single biggest risk.
2. **Decision frame** — the question, constraints, success criteria (echoes Phase 1 intake), and what's out of scope.
3. **Options compared — a table** (columns: option · key pros · key cons · cost/effort · evidence strength · recommendation). Tables over prose is the house rule here.
4. **Evidence by sub-question** — one section per approved plan sub-question; each finding carries a **confidence tag** and inline citations; contradictions surfaced explicitly, not smoothed over.
5. **What would change my mind** — the assumptions the recommendation rests on + the signal that would flip it (forces intellectual honesty; PM-defensible).
6. **Risks & open questions** — including anything deferred under `--non-interactive`.
7. **Source quality appendix — a table** (source · tier T1–T4 · date/vintage · what it supports · paywalled?). Every row is a verbatim `sources.json` member.

Confidence grading vocabulary: **High** (multiple T1/T2 sources agree), **Medium** (some support, minor conflict or thin), **Low** (single source, or sources conflict). State this scale in the report.

### 3.7 Risks / pitfalls and mitigations

| Risk | Mitigation in the design |
|---|---|
| **Runaway cost** (15× tokens) | Plan-approval gate (Phase 2) before fan-out; depth-tiered worker counts; **hard iteration cap = 1 gap-fill wave**; preliminary scoping is `brief`-only. |
| **Hallucinated citations / claims** | ≥40-char verbatim quote membership test against `sources.json` (primer); dedicated adversarial verify pass (Phase 5); trust-tier hard-block + `.draft.html` recovery path. |
| **Slop sources** | `source-tiers.md` hard gate (binary) at every tier; tier ranking; fetch-before-cite. |
| **Confirmation bias / one-sided report** | STORM-style multi-perspective decomposition; **adversarial counter-evidence search**; mandatory "What would change my mind" section. |
| **Mis-scoped investigation** | Phase 1 scope-clarify (deep-research's 2–3 questions) + Phase 2 user-approved plan grounded in preliminary scoping. |
| **Subagent duplication / gaps** | Detailed delegation (objective + output schema + boundaries) per Anthropic; orchestrator coverage map in Phase 4. |
| **Overlap with primer/learn-list** | Distinct decision-support output (recommendation + options table + confidence); suggest-don't-invoke handoffs. |
| **Non-interactive misuse** | Inline the canonical non-interactive block byte-identical; all gates carry Recommended/AUTO-PICK; deferred questions land in the Open Questions section. |
| **Cross-plugin substrate dangling cite** | `/research` lives in **pmos-toolkit**; `topic-research/` lives in **pmos-learnkit**. If reused, copy the needed `_shared` files into pmos-toolkit manually first (CLAUDE.md bootstrap-gap rule) — sync-shared is intersection-only. **Recommendation: author `/research`'s own lean sourcing/source-tier logic in pmos-toolkit rather than cross-citing pmos-learnkit's substrate**, to avoid the dangling-cite class entirely. |

---

## Sources

- [Anthropic — How we built our multi-agent research system](https://www.anthropic.com/engineering/built-multi-agent-research-system)
- [stanford-oval/storm (GitHub)](https://github.com/stanford-oval/storm) · [Stanford STORM project](https://storm-project.stanford.edu/research/storm/) · [MarkTechPost on STORM](https://www.marktechpost.com/2024/07/16/storm-an-ai-powered-writing-system-for-the-synthesis-of-topic-outlines-through-retrieval-and-multi-perspective-question-asking/)
- [GPT Researcher docs](https://docs.gptr.dev/docs/gpt-researcher/getting-started/introduction) · [GPT Researcher DeepWiki](https://deepwiki.com/assafelovic/gpt-researcher)
- [OpenAI — Introducing deep research](https://openai.com/index/introducing-deep-research/) · [How OpenAI's Deep Research works (PromptLayer)](https://blog.promptlayer.com/how-deep-research-works/)
- [Gemini Deep Research overview](https://gemini.google/overview/deep-research/) · [Gemini API deep research docs](https://ai.google.dev/gemini-api/docs/deep-research)
- [Helicone — OpenAI Deep Research vs Perplexity vs Gemini](https://www.helicone.ai/blog/openai-deep-research)

### Repo files studied
- `plugins/pmos-learnkit/skills/primer/SKILL.md`
- `plugins/pmos-learnkit/skills/learn-list/SKILL.md`
- `plugins/pmos-learnkit/skills/_shared/topic-research/{intake,sourcing,source-tiers}.md` (+ `canon-discovery.md`, `outline.md`, `sourcing-ladder.md`)
- `plugins/pmos-toolkit/skills/_shared/tier-matrix.md`
- The env-loaded `deep-research` skill (registered description only — no on-disk SKILL.md)
