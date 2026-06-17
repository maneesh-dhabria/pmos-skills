---
name: research
description: Conduct deep, multi-source research on a topic and produce a cited, decision-framed HTML report. Unlike a neutral knowledge dump, every run is anchored to a specific PM decision and the report is recommendation-bearing — options, graded evidence, risks, confidence, and an explicit "so what". Use when the user says "research <topic>", "do deep research on", "research to support a decision", "build me a research report on", or "/research". For teaching a topic use /primer; for a reading list use /learn-list.
user-invocable: true
argument-hint: "[<topic>] [--depth brief|standard|deep] [--decision <text>] [--sources web,files,local,notion,drive] [--format <html|md>] [--non-interactive | --interactive]"
---

# Research

`/research` runs **decision-support research**: a plan-gated, fan-out → verify → synthesize
pipeline that turns a topic into a cited, recommendation-bearing HTML report. Its unique
job is to **inform a specific decision** — every run names the decision it supports, and
the report carries options, graded evidence, risks, confidence, and an explicit "so what
for the decision", not a neutral survey.

**Distinct from its neighbours:** the built-in `deep-research` does generic fan-out;
`/research` adds the decision lens, a plan-approval gate, and pmos HTML/tier conventions.
`/primer` teaches a topic; `/learn-list` curates what to read — `/research` reads and
synthesizes *for* a decision. When the user actually wants to learn or to get a reading
list, suggest a hand-off to those skills rather than producing a report.

**Announce at start:** "Using the research skill to investigate {topic} for {the decision}."

## Pipeline position

Standalone — invoke whenever you have a decision that needs evidence. Not a pipeline
stage. The report can be cited into `/requirements` or a `/spec` later (suggest-handoff),
but `/research` does not write pipeline artifacts itself.

## Flags & natural language

Every option has a natural-language form — infer it from the request; an explicit flag
overrides. "research X to decide whether to build it" sets `--decision`; "a quick read"
≡ `--depth brief`; "go deep / be exhaustive" ≡ `--depth deep`; "use my Notion" adds
`notion` to `--sources`. Contract flags (the only ones in `argument-hint`, per §I):

- `--depth brief|standard|deep` — the effort dial (workers, sources, verification rigor,
  report length, whether `/polish` runs). Resolved via `_shared/tier-matrix.md` + the
  [depth matrix](#depth-matrix). Invalid value → stderr + exit 64.
- `--decision <text>` — the decision the research supports (asked in [intake](#intake) if absent).
- `--sources web,files,local,notion,drive` — source scope. `web`/`files`/`local` default
  on; `notion`/`drive` are approval-gated (§ [sources](#sources)). Unknown token → stderr + exit 64.
- `--format <html|md>` — output format; overrides `.pmos/settings.yaml :: output_format`.
- `--non-interactive | --interactive` — the W14 mode contract.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion` tool:** the [intake](#intake), [plan-approval](#plan), and
  source-approval gates degrade to numbered free-form prompts per
  `_shared/interactive-prompts.md`; the non-interactive auto-pick contract still applies.
- **No subagents:** collapse the fan-out to sequential inline research per
  `_shared/research/fan-out.md` § no-subagent degradation — same quality gates, no parallelism.
- **No web access:** research is limited to user files + local repo/docs; log the
  degradation and lower the report's confidence band accordingly.
- **`.pmos/settings.yaml` missing:** run `_shared/pipeline-setup.md` Section A first-run setup.
- **Connected source (Notion/Drive) unavailable** (headless, not authenticated): skip it,
  log `source <name> unavailable; skipped`, never block.

## Track Progress

This skill has multiple phases. Create one task per phase using your task-tracking tool
(`TaskCreate` in Claude Code). Mark each in-progress when started, completed when done —
do not batch. The fan-out wave creates one sub-task per worker.

## Load Learnings

Read `~/.pmos/learnings.md` if present; note any entries under `## /research` and factor
them in. Skill body wins on conflict; surface conflicts before applying.

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

## Depth-tier matrix {#depth-matrix}

The depth dial is the **sole governor of cost** (a deep run is ~15× a single chat — tiering
is mandatory). Resolve `--depth` via `_shared/tier-matrix.md`; this table is the per-phase
specialization. All counts come from this matrix — never have the model invent them (§H).

| Dial | Fan-out workers | Sources (target) | Verification | Plan gate / polish | Report length |
|---|---|---|---|---|---|
| brief | 0 (inline, sequential) | ~5–8 | citation-only (every claim sourced) | lightweight confirm · reference `/polish` guidelines | ~1–2 pp |
| standard | 3–5 | ~12–20 | triangulation (≥2 independent for key claims) | approval gate · reference guidelines | ~3–5 pp |
| deep | ~5 + 1 gap-fill wave | 25+ | adversarial refutation pass per major claim | approval gate + preliminary scoping subagent · **runs `/polish`** | ~6–12 pp |

## Phase 0: Setup {#setup}

Read `.pmos/settings.yaml` → `{docs_path}`, `output_format` (default `html`; `--format`
overrides). Resolve the depth dial (above). Load learnings. Print the non-interactive
`mode:` + `output_format:` lines. Resolve the output dir
`{docs_path}/research/{YYYY-MM-DD}-<topic-slug>/` (created at first write).

## Phase 1: Intake & Scope-Clarify {#intake}

Take the topic + any expectations from the seed. Then a single consolidated
`AskUserQuestion` (each question carries a `(Recommended)` default — never `defer-only`,
since each has a sensible recommendation) to pin down:

- **The decision** this research supports (seed `--decision` if given; recommend the
  decision inferred from the topic).
- **Depth / coverage** (recommend the resolved `--depth`, default `standard`).
- **Scope boundaries** — what's explicitly in / out (recommend the topic as-stated).
- **Source selection** — recommend `web,files,local`; offer `notion`/`drive` (approval-gated).
- **Output constraints** — length / style (recommend the depth row's length).

Validate enum flags before asking; invalid → stderr + exit 64. Emit a **scoped brief**
(decision, sub-topics, scope, sources, output shape) to chat.

**Non-interactive:** the intake ask AUTO-PICKs every `(Recommended)` default and records
the picks in the OQ buffer; the run proceeds with the inferred decision + `standard` depth
unless flags say otherwise.

## Phase 2: Research Plan + Approval {#plan}

Decompose the topic into independent sub-questions / perspectives (STORM-style) per
`_shared/research/fan-out.md` § decompose. At **deep**, first dispatch ONE preliminary
scoping subagent (sonnet) to shape a better plan. Propose a **plan outline**: the
sub-questions, the source scope, and the worker count (from the [depth matrix](#depth-matrix)).

**HARD approval gate before fan-out at standard+ (§H deterministic gate)** — fan-out
spends the 15×, so it never starts unapproved:

<!-- defer-only: destructive -->
```
question: "Approved research plan: <N> sub-questions, <sources>, ~<W> workers (<depth>). Proceed with fan-out?"
options:
  - Proceed with fan-out
  - Edit the plan
  - Cancel
```

At **brief**, this degrades to a lightweight one-line confirm. **Non-interactive:** the
gate is `defer-only: destructive` → DEFERRED; the run proceeds with the proposed plan as
the deferred default and flags it in the OQ buffer (fan-out spend is bounded by the depth
cap, so proceeding is the no-judgement default). Persist the approved plan before fan-out.

## Phase 3: Fan-out Research {#fan-out}

Per the approved plan, dispatch **one research worker (sonnet) per sub-question** following
`_shared/research/fan-out.md` § worker-contract — each worker uses
`_shared/research/sourcing.md` + `source-tiers.md` as its evidence rules (cited, not
restated — §K), returns **structured findings** (not prose), and saves an interim report to
`<out>/interim-reports/<NN>-<sub-question-slug>.{html,md}`. Worker count per the depth
matrix (brief = 0, inline sequential). Emit the est-cost line before the first fetch.

## Phase 4: Gap-fill / Saturation {#gap-fill}

A "what's-missing" critic pass reads the interim reports and names coverage gaps
(unaddressed criterion, key claim with one source, one-sided options table). At **deep**,
dispatch **one capped follow-up wave** to fill them; stop on saturation. Brief/standard
skip the extra wave. One wave is the cap (§H — never loop unbounded).

## Phase 5: Verification {#verify}

Tier-scaled, citing `_shared/research/source-tiers.md` (the hard gate — do NOT restate it, §K):

- **brief** → citation-only: every claim has a reachable + attributable, fetched source.
- **standard** → triangulation: ≥2 independent sources for each key claim.
- **deep** → adversarial refutation: for each major claim, search for counter-evidence;
  keep, qualify, or drop the claim on what you find.

Any claim that fails its tier's bar is dropped or flagged **unverified** — it never ships
as if cited. A hallucinated (unfetched) source is a hard failure.

## Phase 6: Synthesis + Write the Report {#synthesis}

Assemble the report from the interim docs in the **decision-support shape** (tables +
nested bullets over narrative):

1. **TL;DR + confidence** — the recommendation in 3–5 bullets + an overall confidence band.
2. **Decision frame** — the decision, the options on the table, the criteria.
3. **Options comparison table** — options × criteria, evidence-graded.
4. **Evidence by sub-question** — one section per sub-question, findings with inline citations.
5. **What would change my mind** — load-bearing assumptions + the signal that flips the call.
6. **Risks & unknowns.**
7. **Source-quality appendix** — every source, its tier, and access date.

Emit self-contained HTML via `_shared/html-authoring` — **strip the template's leading
doc-comment before `renderArtifact()`** (else `{{content}}`/`{{inline_css}}` in the comment
get re-substituted and the body duplicates — see `reference_html_authoring_render_token_gotcha`),
write `.sections.json` companion, `cp -n` assets, kebab heading ids, `?v=<plugin-version>`
cache-bust, bake `<meta name="pmos:skill" content="research">` — to
`{docs_path}/research/{YYYY-MM-DD}-<topic-slug>/research-report.html`, and regen the dir's
`index.html`. Then a **report reviewer subagent (sonnet)** scores-only with ≥40-char
verbatim quote-grounding per `_shared/reviewer-protocol.md`; orchestrator-side quote +
section validation; **auto-apply cap = 1**.

## Phase 7: Polish {#polish}

ALL output follows the `/polish` writing guidelines (tables over prose, no hedging,
grounded claims). **INVOKE `/polish` only at deep** (mechanical findings auto-apply,
voice-risk findings gated); brief/standard reference the guidelines without invoking — a
cost control (§H tier-scaled).

## Phase 8: Capture Learnings {#capture-learnings}

**This skill is not complete until learnings-capture has run.** Inline
`_shared/learnings-capture.md` and reflect on anything worth capturing about `/research`
itself (mis-scoped sub-questions, a depth dial that over/under-shot, a source that
should've been gated). Zero learnings is a valid outcome; the gate is that the reflection happens.

## Subagent dispatch (§L)

Per `_shared/research/fan-out.md` § roles: orchestrator **inherit**; preliminary scoping,
research workers, verifier/refutation, and report reviewer all **sonnet**. No-subagent
platforms collapse fan-out to sequential inline (`fan-out.md` § degrade).

## Anti-patterns (DO NOT)

1. **Emit a source you did not fetch this run.** A plausible-but-unfetched URL is a
   hallucinated citation — the worst failure mode. The `source-tiers.md` hard gate is binary.
2. **Start fan-out without the plan-approval gate** (standard+). It spends the 15×.
3. **Restate the source-tier or rank-then-verify rules in this file.** They live once in
   `_shared/research/` (§K); cite them.
4. **Invent worker/source counts.** They come from the [depth matrix](#depth-matrix) (§H).
5. **Write a neutral knowledge dump.** Every report is anchored to a decision and is
   recommendation-bearing — if it has no "so what", it failed its job.
6. **Touch a connected source (Notion/Drive) without approval**, or block when one is
   unavailable — degrade and log.

## Sources & approval {#sources}

- **Default (no approval):** `web` (search + fetch), user-provided files/URLs, local
  `repo`/`docs`/`pmos`.
- **Approval-gated per run:** connected MCP sources. **v1 = Notion + Google Drive**
  (highest-value PM doc stores); Gmail / GitHub / Slack are **out of scope (v2)**. Ask
  before touching any connected source:

<!-- defer-only: destructive -->
  `AskUserQuestion` — "Use connected <Notion|Drive> for this run?" options **Use it** /
  **Skip it**. Non-interactive → DEFERRED, default skip (privacy + headless availability).

  Degrade gracefully when a source is unavailable (headless / unauthenticated → not used, logged).
