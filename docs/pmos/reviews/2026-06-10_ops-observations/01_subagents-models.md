# Ops review — subagent usage & model selection across pmos skills

**Date:** 2026-06-10 · **Question:** "Are we using subagents properly across skills, with the right model selection to optimize context usage + token cost?" · **Scope:** all 38 skills across pmos-toolkit / pmos-learnkit / pmos-utilities, plus 15 days of real session transcripts (91 sessions >100 KB, 640 Task/Agent dispatches). Orthogonal to the 2026-06-10 skill-design review (its verbosity / gates / flags decisions are taken as settled).

## Verdict in one paragraph

The **dispatch architecture is healthy** — subagents are used for the right reasons (fresh-eyes review isolation, parallel fan-out of independent units, keeping bulk content like images and crawled articles out of the main context), the fan-outs are bounded by documented caps, and real transcripts show the controller often *economizes below* what the prose allows (medium-rigor single cross-file reviewer instead of per-file; 1–3 verify reviewers instead of 5). What is missing entirely is the **model dimension**: in 640 real dispatches over 15 days, **zero were model-pinned by any skill** — 96.6% inherited the frontier session model (claude-opus-4-8/4-7), and the only 22 pinned dispatches were ad-hoc in-session judgment, never skill prose. The repo's *only* written model-selection guidance lives inside one skill (`execute/subagent-driven.md:23-34`), is qualitative ("fast / cheap" / "most capable"), never mentions the Task tool's actual `model` parameter, and demonstrably converts to zero pins in practice. Every mechanical fan-out — magazine's per-item summarizer, reflect's per-transcript scanner, survey-analyse's per-question coder, readme's 4 persona simulators, and a 136-dispatch image-caption run that produced **97 MB of subagent transcripts entirely on Opus** — pays frontier prices for haiku/sonnet-shaped work.

---

## 1. Inventory — every specified subagent dispatch

Mechanism legend: **Task** = explicit Task-tool dispatch; **blocking** = foreground, result required to proceed. Model column: what the prose specifies (— = nothing ⇒ inherit). Context column: what the controller is told to hand the subagent.

### pmos-toolkit

| # | Skill · phase | Role | Mechanism / fan-out | Model | Context passed | Cite |
|---|---|---|---|---|---|---|
| 1 | execute `--subagent-driven` | implementer | Task per plan task, parallel waves | table: cheap/standard/most-capable per task shape | task text **pasted** ("do not make the subagent read the plan file") + scene-setting | `execute/SKILL.md:351`, `subagent-driven.md:23-34` |
| 2 | execute `--subagent-driven` | spec-compliance, code-quality, final reviewers | Task per task (spec→quality serialized) + 1 final | "most-capable" (all review roles) | diff + spec excerpt / CLAUDE.md | `subagent-driven.md:130,176,217` |
| 3 | execute inline mode | optional per-task reviewer | Task, sequential | — | task spec + diff | `execute/SKILL.md:312-326` |
| 4 | plan Loop 2 | blind reviewer (fresh eyes) | Task (Explore or general-purpose), "no shared context" | — | "only the plan + spec" | `plan/SKILL.md:376-378` |
| 5 | spec Phase 2 | 2 researchers (codebase patterns; industry) | 2 parallel Tasks, Tier 2-3 | — | return-contract prompt; subagent reads repo itself | `spec/SKILL.md:134-154` |
| 6 | spec §6 | /diagram child skill | blocking Task per diagram, ≤3 attempts, 30-min run cap | — | diagram description | `spec/SKILL.md:306-336` |
| 7 | spec Phase 6b / verify Phase 4b | /architecture child (which itself dispatches a judge — nested) | blocking Task, 300s / 600s | — | spec path / git refs | `spec/SKILL.md:563`, `verify/SKILL.md:475` |
| 8 | verify Phase 3 | 5 code reviewers (CLAUDE.md-compliance, bug-scan, git-history, comment-compliance, cross-file) | 3–5 parallel Tasks | — | diff + relevant CLAUDE.md files | `verify/SKILL.md:205-230` |
| 9 | wireframes Phase 2a | house-style extractor | 1 read-only Task | — | repo paths | `wireframes/SKILL.md:284` |
| 10 | wireframes Phase 3 | generators | Task per *component* (~5/message) | — | inventory row + pattern files + house style | `wireframes/SKILL.md:362` |
| 11 | wireframes Phase 4 | reviewer | high: per file ×≤2 loops; medium: ONE cross-file; low: ONE mandatory cross-file | — | rubric + pattern files (file read by subagent) | `wireframes/SKILL.md:406-432,59-61` |
| 12 | wireframes Phase 6 | /msf-wf reviewer | Task per wireframe | — | chrome-stripped HTML **pasted inline** per file | `wireframes/SKILL.md:501` |
| 13 | prototype Phase 1a | DESIGN.md resolver + token gen | 1 read-only Task | — | paths | `prototype/SKILL.md:156` |
| 14 | prototype Phase 3 | mock-data generator | ONE Task (mandatory; inline bypass must be logged to `.deviations.md`) | — | entity schema + domain notes | `prototype/SKILL.md:209-236` |
| 15 | prototype 4b/4c | runtime.js + components.js generators | 2 parallel Tasks | — | reference template specs + Phase 1a blocks | `prototype/SKILL.md:255-297` |
| 16 | prototype Phase 5 | per-device HTML generator | Task per device | — | screens summary + mock-data JSON **pasted** (needed verbatim for inline-script fallback) | `prototype/SKILL.md:316-321` |
| 17 | prototype Phase 6 | reviewer | Task per device file ×≤2 loops | — | eval-rubric + DESIGN.md anti-patterns + x-interaction block | `prototype/SKILL.md:397-425` |
| 18 | prototype Phase 7 | friction walker | Task per journey, own Playwright session each | — | journey + prototype URL | `prototype/SKILL.md:451` |
| 19 | artifact refinement | reviewer (max 2 iters) | foreground Task, `general-purpose` | — | chrome-stripped draft **pasted** + reviewer-prompt.md + eval.md + sections.json | `artifact/SKILL.md:230-241` |
| 20 | artifact T.2 | researcher | 1 foreground Task (skippable `--quick`) | — | gap questions | `artifact/SKILL.md:420-422` |
| 21 | design-crit Phase 4 | 3 reviewers (per-screen, per-component, per-journey) | 3 Tasks (or inline) | — | all screenshots + rubric | `design-crit/SKILL.md:220-224` |
| 22 | survey-design Phase 4 / 6 | reviewer (≤2 iters); simulated respondent | 1 Task; Task per persona (default 1) | — | survey.json + 2 reference files ("contents or, if the subagent can read files, the paths") | `survey-design/SKILL.md:242-251,299` |
| 23 | survey-analyse Phase 5 | thematic coder (Braun & Clarke) | fresh Task per open-end question | — | verbatims **pasted**, chunked ≤200/call | `survey-analyse/SKILL.md:116-121` |
| 24 | readme §2 | 4 persona readers + 1 [J] reviewer | **5 concurrent Tasks in one message**, 120s timeout each; theater-check single re-dispatch | — | full **un-stripped README pasted byte-for-byte into each of the 5** | `readme/SKILL.md:126-133` |
| 25 | readme §5 | repo-miner | 1 Task (scaffold mode) | — | repo paths; returns structured JSON | `readme/SKILL.md:217-228` |
| 26 | polish Phase 2a | editor (critique-only) + rewriter | 2 sequential Tasks | — (claims `temperature: 0` — a parameter the Task tool does not expose) | verbatim doc **pasted** to each (editor chunked ≥4,000 words) | `polish/SKILL.md:142-145` |
| 27 | feature-sdlc requirements gate | /grill reviewer | Task | — | chrome-stripped HTML **pasted inline** (FR-51 template) | `feature-sdlc/SKILL.md:559-563` |
| 28 | feature-sdlc skill mode | skill-eval [J] reviewer | Task | — | "the raw SKILL.md text; the raw content of each reference/ file (path-labelled)" **pasted** | `feature-sdlc/SKILL.md:723` |
| 29 | comments resolve | per-thread apply-edit agent (routes into originating skill's shim) | Task per thread; `--batch` = parallel waves; ≤1 clarify + ≤2 re-dispatch caps | — | §9.1 JSON payload (anchor + newest message) — compact | `comments/SKILL.md:95-117,141` |
| 30 | architecture `--deep` | module classifier | Task; vocabulary file is the SYSTEM prompt; orchestrator-validated | — | denylist-wrapped reads; returns JSON candidates | `architecture/SKILL.md:137-147` |
| 31 | architecture `--from-spec` / `--since` | judge | blocking Task, 300s | — | spec §Modules / changed files + merged ruleset | `architecture/SKILL.md:240,286` |
| 32 | diagram Phase 5 | vision reviewer (high-rigor only; inline below) | Task `general-purpose` | — | rendered PNG + source SVG | `diagram/SKILL.md:238,271` |
| 33 | requirements research | explorers | Tasks w/ 3-field return schema | — | research questions | `requirements/SKILL.md:159` |
| 34 | creativity | per-journey analysts | Tasks ("serialize edits to shared files") | — | personas + scenarios | `creativity/SKILL.md:90,128` |

### pmos-learnkit / pmos-utilities

| # | Skill · phase | Role | Mechanism / fan-out | Model | Context passed | Cite |
|---|---|---|---|---|---|---|
| 35 | primer Phase 5 | rubric reviewer (the ONLY dispatch — Phases 2–4 are explicitly inline per spec D2) | 1 Task | — | rubric.md **inlined verbatim** + draft prose + sources.json | `primer/SKILL.md:279,375` |
| 36 | learn-list Phase 4 | per-topic sourcer (shared topic-research substrate) | Task per topic in `standard`/`deep`; sequential in `brief` | — | sourcing.md contract | `learn-list/SKILL.md:112` |
| 37 | magazine Phase 4 (Stage B) | per-item summarizer+tagger | Task per ready item (20–50/issue typical) | — | reads crawled article/transcript from cache file (path — good) | `magazine/SKILL.md:283` |
| 38 | playbook | per-playbook deep-reader | Task per playbook, strict output contract | — | playbook path | `playbook/SKILL.md:84` |
| 39 | frameworks sync | corpus ingestion workers | Tasks, N frameworks each | — | strict output contract | `frameworks/SKILL.md:271` |
| 40 | reflect Phase 2 | per-transcript scanner | Task per transcript, 5 in-flight, 60s timeout | — | transcript jsonl path (subagent reads it — good) | `reflect/SKILL.md:109-118` |

**Model column total: 40 dispatch surfaces, 0 pin a model, 1 (execute) carries qualitative sizing guidance.** The Task tool *does* accept a `model` parameter (`sonnet`/`opus`/`haiku` observed in real ad-hoc dispatches) — no skill ever uses it.

---

## 2. Written policy check (investigation item 4)

- `feature-sdlc/reference/skill-patterns.md` — the canonical authoring guide — has **no model-selection guidance for subagents**. Its only `model` mention (line 58) is the frontmatter field list. Its subagent content (line 175) covers only the no-subagent degradation posture.
- `_shared/` (both plugins) — nothing.
- `feature-sdlc/reference/skill-eval.md` (41-check rubric) — no check touches dispatch economics or model choice. So `/skill-sdlc`-authored skills are never pushed to think about it — and observably don't (the memory-book skill authored via `/feature-sdlc skill` in session `f7769191` shipped a 136-dispatch caption fan-out with no model sizing).
- The one exception: `execute/subagent-driven.md:23-34` — a genuinely good 3-row table ("least powerful model that can do the job"). Two defects: (a) it is local to one skill; (b) "any review role → most-capable" is too blunt — it lumps mechanical rubric checking with design judgment.

**Finding: no repo-wide model-selection policy exists. This is the root cause of everything in §4.**

---

## 3. Transcript ground-truth (15 days, ~/.claude-personal/projects)

Method: scanned all 91 sessions >100 KB modified in the last 15 days; parsed every `Task`/`Agent` `tool_use` event (input.model, subagent_type, prompt length, description), `message.model` on assistant events, and `<session>/subagents/agent-*.jsonl` sizes as a token-cost proxy.

### Headline numbers

| Metric | Value |
|---|---|
| Task/Agent dispatches (15 days) | **640** |
| Dispatches with no `model` param (inherit frontier) | **618 (96.6%)** |
| Dispatches pinned by *skill prose* | **0** |
| Dispatches pinned ad-hoc in-session | 22 (16 `sonnet`, 6 `opus`) |
| Main-session assistant events on opus-4-8 / opus-4-7 / fable-5 | 28,130 / 4,483 / 389 |
| Assistant events on haiku or sonnet (any session) | **0** |
| `subagent_type` distribution | 563 general-purpose, 40 Explore, 29 unset, 8 pr-review-toolkit |

### Notable sessions

- **`f7769191` (mini-first-birthday-v2, `/feature-sdlc skill` → memory-book run):** 68 dispatches, **136 subagent transcripts totaling ~97 MB**, every one on `claude-opus-4-8` (verified in the subagent jsonl `message.model`). ~60 of these were "Caption batch NNN" — mechanical image-captioning with ~700-char prompts, 5 photos each. The subagent isolation itself was *excellent* (97 MB of image bytes never touched the main 10 MB transcript) — but this is the single largest haiku-shaped opus bill in the dataset.
- **`3b0bf92e` (dr-stone game, full pipeline run):** 71 dispatches, 217 KB of dispatch prompts, 15 MB of subagent transcripts beside a 15.9 MB main transcript — per-file content reviewers ("Review auth-01…", ~1.6 KB prompts each), all inherited opus.
- **`5bf58aac` (this repo — the skill-design review itself):** 36 dispatches (27 per-skill reviewers + fixers), 72 subagent transcripts, 13.6 MB, all on fable-5 inherit.
- **Typical full pipeline run** (`0966de31`, `4777c46f`, `340bbd55`, `d4ad2fb2`, `127c24f4`): only **6–16 dispatches** per run. The controller consistently chose the *medium-rigor single cross-file wireframe reviewer* (1 dispatch, ~1.3 KB prompt) over the per-file high-rigor default, and fired 1–3 verify reviewers instead of the specified 3–5. **Real usage economizes below spec** — the caps and rigor tiers are working.
- **Typical `/primer` run** (6 sessions in pmos-content): exactly **1 reviewer dispatch** (~4–5 KB prompt) per spec; main transcript ~0.8–1 MB, of which ~150–160 KB is inline WebSearch/WebFetch tool-result content sitting in the host conversation (the D2 "research runs inline" decision).
- **Magazine feed-curation** (`b066e667`): 34 dispatches (research + 14 "Verify feeds batch" workers), 7.3 MB subagent transcripts — bulk web verification correctly isolated; all on inherited opus.
- The 22 ad-hoc pins are instructive: the operator/model spontaneously chose `sonnet` for exactly the roles this review flags (mechanical claim-grounding, batch quest authoring, code mapping) and `opus` for blind primer evals — the right instinct, exercised 22 times out of 640 because nothing in the skills asks for it.

---

## 4. Economics assessment

### (a) Main-context work that should be a subagent

1. **`/primer` Phases 2–4 run research inline by design** (`primer/SKILL.md:375`: "Do NOT spawn subagents in Phases 2–4"; provenance: 2026-05-23 spec D2). Meanwhile `/learn-list` Phase 4 fans the *same shared topic-research substrate* out one-subagent-per-topic (`learn-list/SKILL.md:112`). Observed cost: ~150 KB of fetched-page tool results per primer run held in the host conversation for the rest of the session. The substrate emits typed shortlists — exactly the compact return a fan-out wants. **Inconsistency, not just inefficiency: two consumers of one substrate made opposite calls.** Steelman: D2 predates the substrate unification (0.9.0); at `--depth brief` inline is right. Fix: match learn-list — fan out per-topic at `standard`/`deep`, stay inline at `brief`.
2. Everything else heavy already isolates well (magazine crawl cache + per-item subagents; wireframes/prototype generators; verify reviewers). No other material pollution found.

### (b) Subagent overhead for trivial work

- **`/prototype` Phase 1a** (one read-only subagent to resolve DESIGN.md + generate tokens, `prototype/SKILL.md:156`) and **`/wireframes` Phase 2a** extractor — borderline: each reads 2–3 known files. Defensible (keeps DESIGN.md bulk out of main), cheap either way. No action.
- **`/diagram` editorial wrapper** already documents the right instinct: copy generation and the 4-item wrapper rubric "run inline rather than via subagent (D7)" because "the prompt is short and structured" (`diagram/SKILL.md:347,372`). This is the repo's only written dispatch-vs-inline economics reasoning — it should be promoted to policy.
- **`/spec`'s blocking `/diagram` child per diagram** (`spec/SKILL.md:306-336`) is the heaviest per-unit dispatch in the repo: each child runs framing brainstorm + draft + raster render + 7-item vision rubric + ≤2 refinement loops, with a 30-minute per-run cap acknowledging the weight. The isolation rationale (renderer crashes don't kill the spec writer — spec D2) is sound; the *rigor* is not tuned: spec-embedded diagrams could dispatch `/diagram --rigor medium` (no vision-reviewer subagent, 1 loop) and save a nested dispatch + render loop per diagram. Verdict: keep the dispatch, lower the default child rigor.
- No outright "dispatch costs more than the work" cases found — the caps (≤2 loops, ≤2 iters, 60s/120s timeouts, 5-in-flight) are real cost governors and they show up in transcripts.

### (c) Reviewer/judge model sizing — who actually needs frontier

The decisive observation: **most pmos reviewers are wrapped in deterministic parent-side validators** (≥40-char quote substring-grep, `sections_found` set-equality, `check_id` set-equality, "fail without verbatim quote ⇒ treated as pass"). A cheaper model's characteristic failure — a sloppy or hallucinated finding — is *caught and rejected by the validator*. These reviewers are precisely the ones safe to downsize:

| Cheap-safe (haiku/sonnet) — validated or mechanical | Why |
|---|---|
| magazine Stage B per-item summarizer (`magazine/SKILL.md:283`) | bounded summarization, closed tag registry, degraded-card rule; 20–50 dispatches/issue |
| reflect per-transcript scanner (`reflect/SKILL.md:109`) | extraction/classification, 60s cap, compact YAML return |
| survey-analyse per-question coder (`survey-analyse/SKILL.md:116`) | output validated (every response_id checked against input) |
| readme 4 personas + [J] reviewer (`readme/SKILL.md:126`) | full FR-SR-3/FR-11 quote + set-equality validation parent-side |
| skill-eval [J] reviewer (`feature-sdlc/SKILL.md:723`) | binary checks; FR-43 quote-grounding converts unsupported fails to passes |
| artifact reviewer (`artifact/SKILL.md:237`) | FR-5 section + quote validation parent-side |
| msf-wf / grill-as-reviewer (FR-51/52 surfaces) | same validation contract |
| frameworks ingestion workers, learn-list per-topic sourcers | strict output contracts, mechanical verification loops |
| execute implementers for "1–2 file mechanical" tasks | already the table's own advice — just never lands as a pin |

| Keep frontier (inherit) — genuine judgment | Why |
|---|---|
| plan Loop 2 blind reviewer | whole-design coherence judgment |
| execute code-quality + final reviewers | design judgment over a full diff |
| architecture judge + `--deep` classifier | deep/shallow/leaky is subtle architecture judgment |
| design-crit per-screen/journey reviewers | multimodal UX judgment against a layered rubric |
| spec Phase 2 industry researcher; artifact T.2 | open-ended synthesis |
| polish editor | voice-preserving editorial judgment (rewriter could arguably drop to sonnet — it applies pre-approved notes) |
| diagram Phase 5 vision reviewer | could be sonnet (7 binary items, vision-capable) — middle tier |

Rough sizing: of the 640 observed dispatches, ~70–80% by count (and a much higher share of the fan-out volume — caption batches, verify-feeds batches, per-item summaries, per-transcript scans) fall in the cheap-safe bucket. At current haiku-vs-opus pricing that is roughly an order-of-magnitude cost difference on that traffic, plus faster wall-clock on the wide fan-outs.

### (d) Paste-entire-artifact vs pass-a-path

Subagents share the filesystem; the parent-side quote validators grep against the parent's *own* read of the file, so soundness does not require byte-pasting into the prompt.

| Dispatch | Today | Verdict |
|---|---|---|
| readme §2 | full un-stripped README pasted **×5 concurrent calls** (justified in prose as "required for FR-SR-3 substring grep to be sound" — it isn't; the file read gives the same bytes) | **Switch to path.** 5× duplication of the largest input in the skill |
| feature-sdlc skill-eval reviewer | "raw SKILL.md text + raw content of each reference/ file" pasted — unbounded (wireframes' reference tree is 52 files) | **Switch to paths.** Ground truth: the real dispatch observed in `f7769191` ("Skill-eval [J] review") had a **2.6 KB prompt** — the controller already deviated to paths and it worked |
| feature-sdlc grill gate / wireframes→msf-wf | chrome-stripped HTML pasted inline; the strip already lands in a `/tmp` file (`/tmp/grill-stripped.html`) | **Pass the /tmp path** (keep paste below ~10 KB stripped size if preferred) |
| polish editor + rewriter | verbatim doc pasted twice | Editor → path; rewriter must emit the full doc anyway, marginal — leave |
| execute implementer | task text pasted, plan deliberately NOT given | **Correct — keep.** The paste is *smaller* than the file; this is the documented right call |
| prototype Phase 5 device generator | mock-data JSON pasted | **Correct — keep** (the subagent must inline the JSON verbatim into the HTML fallback) |
| survey-analyse coder | verbatims pasted, chunked ≤200 | **Correct — keep** (rows come from parsed CSV, not a re-readable artifact) |

### Steelman ledger (dispatches that look expensive but are right)

- **Fresh-eyes reviewers** (plan Loop 2, skill-eval D10 "reviewer makes no edits", artifact/polish two-role splits) exist for context-isolation *correctness* — a reviewer sharing the author's context rubber-stamps. The dispatch is right; only model choice and paste-vs-path are at issue.
- **The 97 MB caption session is a success story for isolation** — 136 subagents kept ~97 MB of image-read content out of a 10 MB main transcript. The failure is purely the missing `model: haiku` on each.
- **comments-resolve per-thread dispatch** is the skill's core routing mechanism (refuses to run without subagents, `comments/SKILL.md:35`) and payloads are compact JSON. Sound.
- **Rigor tiers + loop caps work in practice** — transcripts show medium-rigor single-reviewer being chosen and the ≤2-loop caps holding. The prior review's conclusion that the 2-loop caps are "documented cost governors" is confirmed by usage.

---

## 5. Ranked recommendations

**R1 (P1) — Adopt a repo-wide model-selection policy in `skill-patterns.md`, and add a `model:` line to every dispatch spec.** Draft paragraph, suitable to land verbatim in `feature-sdlc/reference/skill-patterns.md` (and mirror as a skill-eval check):

> **Subagent model selection.** Every Task-tool dispatch in a skill MUST state a model tier: `haiku` (or the platform's fastest model) for mechanical extraction, captioning, batch verification, and any reviewer whose output is deterministically validated parent-side (quote substring-grep, set-equality, schema conformance — the validator catches a cheap model's failures); `sonnet` (mid-tier) for bounded generation against a template or contract (wireframe/prototype generators, per-item summarizers, thematic coding, simulated personas) and for vision rubric checks; `inherit` (omit the param) only for genuine judgment — blind design review, code-quality review, architecture judging, open-ended research synthesis, voice-preserving editing. Default rule: *if the parent validates the output mechanically, the subagent does not need the frontier model.* Dispatch-vs-inline follows /diagram D7: a short structured prompt with a small output runs inline; dispatch when the work would otherwise pull bulk content (files, images, fetched pages) into the parent context, or when fresh-eyes isolation is the point. Pass file paths, not pasted file bodies — subagents share the filesystem; paste only what the subagent must reproduce verbatim or what doesn't exist as a file.

**R2 (P1) — Pin cheap models on the high-volume fan-outs first** (largest spend, lowest risk, all parent-validated): magazine Stage B per-item (`magazine/SKILL.md:283`), reflect per-transcript (`reflect/SKILL.md:113`), survey-analyse per-question (`survey-analyse/SKILL.md:120`), readme 5-call simulated-reader (`readme/SKILL.md:126`), frameworks ingestion (`frameworks/SKILL.md:271`), learn-list per-topic (`learn-list/SKILL.md:112`). One-line edits each once R1's vocabulary exists.

**R3 (P1) — Fix the paste-vs-path offenders:** readme ×5 README paste → path; skill-eval reference-file paste → paths (real usage already proves paths work — 2.6 KB observed prompt); grill/msf-wf stripped-HTML → pass the `/tmp` strip file path. Keep execute's task-text paste and prototype's mock-data paste (justified).

**R4 (P2) — Generalize, then fix, `execute/subagent-driven.md`'s table:** promote it to the R1 policy home, and split "any review role → most-capable" into *validated-rubric reviewer → cheap* vs *judgment reviewer → inherit*. Also make it name the actual `model` parameter — qualitative guidance produced zero pins in 640 dispatches.

**R5 (P2) — Align `/primer` with `/learn-list`:** fan out per-topic sourcing at `standard`/`deep` (the shared substrate already supports it; D2 predates unification), keeping ~150 KB/run of fetched-page content out of the host conversation. Inline stays correct at `brief`.

**R6 (P3) — Tune nested-dispatch rigor:** `/spec`'s blocking `/diagram` children default to the child's `high` rigor (vision-reviewer subagent + 2 loops per diagram); pass `--rigor medium` for spec-embedded diagrams. Add a skill-eval [J] check: "every Task dispatch states a model tier and whether inputs are paths or pasted (with the paste justified)."

---

*Evidence basis: 91 session transcripts (>100 KB, ≤15 days), 640 parsed Task/Agent tool_use events, subagent jsonl model verification on the 3 largest subagent transcripts, and full-text grep of all 38 SKILL.md files + reference/ + _shared/ in the three plugins. Analysis scripts: /tmp/analyze_session.py, /tmp/agg.py (session-local, not committed).*
