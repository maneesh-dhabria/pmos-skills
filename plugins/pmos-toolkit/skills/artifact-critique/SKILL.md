---
name: artifact-critique
description: Critique a product document — PRD, strategy doc, POV, or roadmap — the way a seasoned product leader would before exec sign-off, producing a scannable 10-axis verdict scorecard, quote-grounded per-axis deep-dives with a prescriptive "what I'd want to see", and a forced-ranking of the weakest load-bearing claims, as a written HTML artifact carrying an embedded machine-readable findings block. Standalone utility — runs on any doc path or pasted content, independent of the requirements→spec→plan pipeline. Critique-only; the rewrite is delegated to /artifact. Use when the user says "critique this PRD", "review this product doc", "axis-by-axis critique", "what's weak in this strategy doc", "review this POV", "give me a product-leader read on this doc", or provides a doc path/paste and asks for an opinionated critique.
user-invocable: true
argument-hint: "<path-to-doc | pasted content> [--type prd|strategy|pov|roadmap] [--format html|md] [--out <dir>] [--non-interactive | --interactive]"
---

# Artifact Critique

Give a product document the opinionated, axis-by-axis review a seasoned product leader would give before exec sign-off — *where is this weak, what's missing entirely, and which load-bearing claims won't survive scrutiny?* — as a written artifact the author can act on without a live session.

The skill is **standalone**. It works on any product doc:

1. **A doc path** — `.md`, `.html`, or `.pdf`, including a Notion-export folder.
2. **Pasted content** — the doc text directly in the invocation.

It scores the doc on a **fixed 10-axis rubric**, grounds every critique in a verbatim quote, forced-ranks the weakest claims, and writes one HTML artifact carrying an embedded `pmos-critique-findings/v1` block that a future `/artifact` rewrite step consumes.

```
                    (standalone utility — runs independently of the pipeline)
/artifact (generate) → /artifact-critique (review) → /artifact refine (rewrite to findings) → loop
                              ↑
                       runs standalone on any doc path or paste — like /grill, /design-crit
```

**The rubric is not restated here.** The 10 axes, the cross-cutting heuristic spine, the verdict scale, the doc-type applicability map, and the findings schema all live in `../_shared/critique-rubric/` (Inv-1, CLAUDE.md §K) — this skill **orchestrates** and **cites**, never forks them.

**Announce at start:** "Using artifact-critique to read the doc, score it across the 10 axes, and produce an opinionated critique with an embedded findings block."

## Flags & natural language

Every option also has a natural-language form — infer it from the request; an explicit flag overrides. Canonical phrasings: "this is a strategy doc, not a PRD" ≡ `--type strategy` (the doc-type correction is natural-language first; the flag is the typed, headless-deterministic form). `--type` is a typed override that **suppresses auto-detection** and is recorded as the resolved type; absent it, Phase 2 auto-detects and declares the type in the opening line. One flag stays parsed for back-compat but is deliberately not advertised:

<!-- nl-sugar -->
- `--format <html|md|both>` — output-format override; `both` is a retired value, treated as `html` (see Phase 0).

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No interactive prompt tool:** the only interactive prompt is the Phase 2 doc-type confirmation. State the auto-detected type as an assumption, record it in the findings `doc.type_confidence: "inferred"` and the OQ buffer, and proceed — never block. `--type` on the CLI still wins.
- **No subagents:** run the Phase 3 axis scoring and the Phase 7 advisory reviewer inline in the main agent rather than dispatching a separate reviewer.
- **No PDF/image reader:** if a `.pdf` page or an embedded diagram cannot be rendered, **name the unreadable visual** in `limits[]` and do NOT score its possible content `ABSENT` (Inv-5); proceed on the readable text.
- **`.pmos/settings.yaml` missing:** run `_shared/pipeline-setup.md` Section A first-run setup before resolving paths, or fall back to `./docs/` for the out dir.
- **No distinct stderr channel (e.g. a harness that merges stderr into chat):** surface the Phase 0 resolution lines — `mode: <m> (source: …)` and `output_format: <v> (source: …)` — inline as a brief code block at Phase 0 entry, then continue. The frozen `_shared/non-interactive.md` inline block still says "print to stderr"; this only adapts *where* those two lines land for a no-stderr harness — it does not modify the block.
- **A first-class Artifact / canvas publish tool is the emit surface (no template renderer):** instead of the multi-file `_shared/html-authoring/` emit (which links `assets/style.css` + the inline-comments substrate), write a **single self-contained HTML** — inline `<style>`/`<script>`, no external asset links — that **retains the embedded `pmos-critique-findings` block** (the `/artifact` hand-off contract) and inlines the comments overlay (`comments.js`/`comments.css`) best-effort, then publish it via that tool **in the same phase** (do not require the user to initiate publication separately). The multi-file `assets/` substrate emit stays the **default** for `--out` / pipeline-folder writes; name any comments-overlay capability you could not inline in `## Limits` (Phase 7).
- **No Node.js exec (`scripts/critique-eval.mjs` cannot run):** skip the Tier-1 deterministic gate, but **manually validate its checks by inspection** — especially `E-quote-in-source` (every quote a real ≥40-char substring of the source), plus `E-axes-complete` and `E-applicable-consistency` — then add a `## Limits` entry (`deterministic gate not run (Node unavailable) — findings manually validated`) and proceed. Never block; never silently omit the limitation (Inv-5).

## Track Progress

This skill has multiple phases. Create one task per phase using your agent's task-tracking tool (e.g., `TaskCreate` in Claude Code, `TodoWrite` in older harnesses, equivalent elsewhere). Mark each task in-progress when you start it and completed as soon as it finishes — do not batch completions.

## Load Learnings

Read `~/.pmos/learnings.md` if it exists. Note any entries under `## /artifact-critique` and factor them into your approach for this session.

---

## Phase 0: Load context, output format {#load-context}

**Out directory.** If `--out <path>` was passed, honour it. Otherwise resolve `{docs_path}` per `_shared/pipeline-setup.md` (workstream-aware); the critique is written to `{docs_path}/artifact-critique/{YYYY-MM-DD}_{doc-slug}/`. Fallback when no workstream is linked: `./docs/artifact-critique/{YYYY-MM-DD}_{doc-slug}/` in the current repo root. `{doc-slug}` is a kebab slug of the doc title or source filename.

**Output format.** Read `output_format` from `.pmos/settings.yaml` (default: `html`; valid values: `html`, `md` — legacy `both` is treated as `html` per `_shared/html-authoring/README.md`). A `--format` argument-string flag overrides settings (last flag wins on conflict). Unknown value → print `--format must be one of: html, md (got '<v>')` to stderr and exit 64. Print to stderr exactly: `output_format: <value> (source: <cli|settings|default>)` once at Phase 0 entry.

**Doc-type override.** If `--type <prd|strategy|pov|roadmap>` was passed, record it as the resolved doc-type (`type_confidence: "detected"`, source = cli) and skip Phase 2 auto-detection. An unknown value → print `--type must be one of: prd, strategy, pov, roadmap (got '<v>')` to stderr and exit 64.

---

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

---

## Phase 1: Ingest {#ingest}

Resolve and read the document per `reference/ingest.md` (the full extraction contract — path/paste, Notion-export traversal, PDF/image handling, the full-doc-in-context default and the map-reduce verbatim-quote fallback past the real limit). The phase produces, in context:

- The **extracted source text**, with a stable **section map** (heading → `§N` ref) so every quote can cite its `quote_section`.
- A note of any **unreadable visuals** (a diagram that didn't render, a scanned PDF page) — named for `limits[]`, never scored `ABSENT` (Inv-5).
- The **`char_count`** and `source_path` for the findings `doc` block.

Never silently truncate: a doc past the real context limit triggers the map-reduce evidence pass in `reference/ingest.md` (chunks return verbatim quotes + section refs, never summaries), not a quiet cut.

---

## Phase 2: Doc-type detection {#doc-type}

Classify the doc as **PRD / strategy / POV / roadmap**, or a **hybrid** of two when it genuinely spans both (a strategy doc with an embedded PRD; a POV that turns into a roadmap). Record `type`, `type_confidence`, and `hybrid_of` for the findings block.

**Declare it in the opening line** of the critique: "On a careful read, this is a `<type>`…". Then:

- **Interactive:** confirm the detected type once, so a misread doesn't cascade into a wrong applicable-axis set:

<!-- defer-only: ambiguous -->
  `AskUserQuestion` — `"I read this as a <type> doc. Correct?"` options **Yes, it's a <type> (Recommended)** / **It's a different type** (then pick prd/strategy/pov/roadmap, or name the hybrid). The Recommended option carries the auto-detected type.
- **Non-interactive / no prompt tool:** record the detected type as an assumption (`type_confidence: "inferred"`), buffer it in the OQ log, and proceed.
- **`--type` was passed:** skip this phase entirely; the CLI value is the resolved type.

**Resolve the applicable-axis set** from `../_shared/critique-rubric/doc-types.md` §2 (the applicability map) for the resolved type — **union across both types for a hybrid** (any axis `E` in either type is `E`). The `C` (conditional) cells resolve per that file's rules (Pricing → `N/A` for internal tools; AI → `E` iff the doc proposes an AI/LLM feature). This resolved set is what decides **`ABSENT` vs. `N/A`** in Phase 3 — never an ad-hoc judgment. A `<Work in Progress>` / "TBD" / template-stub section is a **decision-blocking gap** (scored `WEAK`/`ABSENT` on its merits), not a stated `N/A` (doc-types.md §2, "Placeholder ≠ absence").

---

## Phase 3: Axis scoring — single-pass {#axis-scoring}

Read `../_shared/critique-rubric/axes.md` (per-axis scope + which heuristics apply + the "what I'd want to see" template) and `../_shared/critique-rubric/heuristics.md` (the doc-type-agnostic reasoning spine) into context. **Do not restate either here** — they are the single home (Inv-1).

Score **all 10 axes in the fixed order** (`Customer · Solution · Scope · Metrics · Pricing · Strategy · GTM · Stage · AI · Risks`) in a **single pass** — one reviewer reads the whole doc and assigns every axis a verdict, so cross-axis reasoning stays intact (per-axis fan-out is deferred purely as a latency optimization, never for correctness). For each axis emit a `{verdict, reason, applicable}` triple:

- **verdict** ∈ the ordinal scale in `doc-types.md` §1 (`STRONG / MIXED / WEAK / ABSENT / N/A`). `STRONG` is **freely given** when the axis is present, concrete, and evidenced (Inv-4 — never rationed to look tough).
- **ABSENT vs. N/A is read from Phase 2's resolved applicable set**, not decided here: an applicable axis the doc never addresses ⇒ `ABSENT`; a non-applicable axis ⇒ `applicable: false`, `verdict: "N/A"` (the two must agree — the gate's `E-applicable-consistency`).
- **reason** — a one-line, position-taking gap statement carrying the sharp shape-language ("outputs, not outcomes"; "a wedge, not a moat"). Every `ABSENT`/`WEAK` axis MUST have a non-empty reason (the gate's `E-gap-named`).

The verdict-by-axis scorecard (10 rows: axis · verdict · one-line summary) is the scannable top of the critique.

---

## Phase 4: Per-axis deep-dive {#deep-dive}

For each **applicable** axis, write a deep-dive whose header is itself the verdict. Each deep-dive:

1. Pulls a **verbatim ≥40-char block-quote** from the source (with its `§N` section ref) — the evidence the verdict rests on. The quote must be a real substring of the source; the Phase 7 gate verifies it (Inv-3). For an `ABSENT` axis there is no quote (`quote: null`) — the finding *is* the absence; name what a present version would have quoted.
2. **Interrogates** the quote against the axis's heuristics (`axes.md` → `heuristics.md`) — what does it assert vs. demonstrate, what mechanism is missing, what would a pre-mortem surface.
3. Closes with a prescriptive **"What I'd want to see:"** — a concrete artifact (a baseline + target + threshold; an if/then/because with a named mechanism; an IN/OUT/CUT list), not a vague direction.

Honesty about limits (Inv-5): if the content might live in an unreadable visual or an annexure, say "not visible in this doc" — never assert `ABSENT` as fact for content you couldn't read.

---

## Phase 5: Weakest claims {#weakest-claims}

Forced-rank the **0–3** most load-bearing assertions in the doc whose failure would most damage it. For each: the verbatim `claim`, a **≥40-char source quote** + `§N`, and 1–3 sharp follow-up questions the author must answer.

**Never padded to a quota (Inv-4).** If the doc has only one claim worth ranking, return one; if it is solid throughout, return zero. The deterministic gate accepts an empty list — it never *requires* a non-empty one. Ranks are unique `1..n`.

---

## Phase 6: Synthesize {#synthesize}

Compose the two framing bookends:

- **Opening** (`opening.pushing_hardest_on`, 1–3 entries) — "On a careful read, this is a `<type>`… I'll push hardest on `<up to three things>`." Names the doc-type (Phase 2) and commits to the sharpest angles.
- **Bottom line** (`bottom_line`) — synthesis that **credits the strengths first** (Inv-4 / voice: credit before attacking), then names the **3 must-dos**. This is the executive read.

Hold to the locked voice in `reference/voice-rubric.md` (unnamed seasoned-product-leader persona; take a position; no hedging; ground every critique in a quote; ventriloquize the executive reader).

---

## Phase 7: Emit + two-tier quality gate {#emit}

**Emit the critique** per the `_shared/html-authoring/README.md` checklist (template slot-fill; atomic write with the `.sections.json` companion; idempotent asset copy — which carries the inline-comments substrate, `comments.js` et al.; cache-busted asset URLs; kebab heading ids per `conventions.md` §3; `<meta name="pmos:skill" content="artifact-critique">`; wordmark/footer). Asset prefix `assets/` for a top-level write, `../assets/` when nested. Regenerate `{feature_folder}/index.html` only when the out dir is a pipeline sub-folder; standalone `--out` writes do not. When a first-class Artifact / canvas publish tool is the only emit surface (no template renderer), follow the **self-contained-HTML fallback in `## Platform Adaptation`** instead of the multi-file write — both the default multi-file path and the self-contained path keep the embedded `pmos-critique-findings` block, so the `/artifact` hand-off survives either way.

The HTML body carries, in order: the opening framing, the verdict-by-axis scorecard (a clean ordinal table), the per-axis deep-dives, the weakest-claims ranking, the bottom line, and a `## Limits` list. Plus two required affordances:

1. **The embedded findings block** — a dedicated `<script id="pmos-critique-findings" type="application/json">` between `<!-- pmos-critique-findings:start -->` / `<!-- pmos-critique-findings:end -->` sentinels, a valid `pmos-critique-findings/v1` instance. **The schema is read from `../_shared/critique-rubric/doc-types.md` §3 (Inv-1) — never re-declared here.** This block is the `/artifact` hand-off contract.
2. **A "Copy markdown" affordance** — a button that copies the full critique rendered as markdown (so the author can paste it into Slack / a doc comment without a sidecar file).

In **`--format md`**: emit the same critique as markdown with the identical findings JSON in a fenced ` ```json ` block; the scorecard renders as a markdown table.

Close with **advisory hand-off prose**: one paragraph pointing the author at `/artifact` to rewrite against the findings block. (Critique-only — no `/artifact` change ships in v1; Inv-6.)

### Two-tier quality gate (run before finalizing)

**Tier 1 — deterministic hard gate (`scripts/critique-eval.mjs`).** Run it on the extracted source text + the findings JSON (skill-patterns §H — a script counts, the model never does):

```
node {skill_dir}/scripts/critique-eval.mjs --source <extracted-source-file> --findings <findings.json>
```

It asserts E-schema, E-axes-complete, E-applicable-consistency, E-quote-len, E-quote-in-source, E-gap-named, E-weakest-ranked, E-opening. **Exit 0** → proceed. **Exit 1** → it lists the failing checks; fix the findings (a hallucinated quote, a missing axis, a mis-ranked claim) and re-run — never finalize a critique that fails the gate. **Exit 2** → script error; surface it, never silently pass. If Node cannot exec in this harness at all, follow the **Node-unavailable path in `## Platform Adaptation`** (skip the script, manually validate the checks by inspection, record the limit in `## Limits`) — never finalize as though the gate had passed.

**Tier 2 — advisory reviewer (separate agent, `_shared/reviewer-protocol.md`, ≤2 loops).** Dispatch a reviewer subagent (or run inline if subagents are unavailable) against the critique per `reference/voice-rubric.md` § "Advisory reviewer". It scores grounding quality, **fairness** (strengths credited before attacks), and **voice adherence**, and flags any **manufactured / nitpick** finding (Inv-4). It is **non-blocking** — surface its notes in the chat summary and let the author decide; the reviewer never edits the artifact. Cap at 2 loops (a cost governor, not a gate). **Always print one line reporting the reviewer outcome, even when it found nothing**, so a silent run never reads as "no review happened":

```
Tier 2 advisory reviewer: ran <inline|subagent> — <N findings | no findings>
```

Print to chat, at the end of Phase 7: the path of the emitted critique, the Tier-1 verdict (`critique-eval: PASS` / the failing checks), and the always-emitted Tier-2 reviewer-outcome line above (`ran inline|subagent` per how it was dispatched; `N findings` or `no findings`).

---

## Phase 8: Capture Learnings {#capture-learnings}

**This skill is not complete until the learnings-capture process has run.** Read and follow `_shared/learnings-capture.md` (relative to the skills directory) now. Reflect on whether this session surfaced anything worth capturing about `/artifact-critique` itself — a doc-type that detected wrong, a quote-grounding edge, an axis whose applicability rule misfired, a voice-drift the reviewer caught. Proposing zero learnings is a valid outcome for a smooth session; the gate is that the reflection happens, not that an entry is written.

---

## Anti-patterns

- **Restating the rubric.** The axes, the heuristic spine, the verdict scale, the applicability map, and the findings schema live in `../_shared/critique-rubric/` and nowhere else (Inv-1). Cite them; never copy them into this skill — a forked copy drifts.
- **Padding the scorecard.** A `STRONG` verdict and a zero-length weakest-claims list are both legitimate. Manufacturing a finding to look thorough violates Inv-4 and the advisory reviewer flags it.
- **Deciding `ABSENT` vs. `N/A` ad hoc.** It is read from the Phase 2 resolved applicable set (from `doc-types.md` §2), deterministically — never an in-the-moment judgment.
- **Quoting text that isn't there.** Every deep-dive and weakest-claim is grounded in a verbatim ≥40-char quote that `critique-eval.mjs` verifies is a real substring of the source (Inv-3). A failing quote hard-fails the gate — do not finalize around it.
- **Asserting a gap you couldn't verify.** Content that may live in an unreadable visual or an annexure is "not visible in this doc", never `ABSENT` as fact (Inv-5). Name the unreadable visual; don't score its imagined contents.
- **Hedged, generic-helpful output.** The product's signature is opinionated, position-taking critique. Take a side, ground it in a quote, credit strengths before attacking — the voice rubric and the advisory reviewer exist to resist drift.
- **Rewriting the doc.** This skill critiques; the rewrite is `/artifact`'s (D1). Hand off via the embedded findings block + advisory prose — do not produce a revised draft here.

---

*Spec lineage: `docs/pmos/features/2026-06-24_artifact-critique/02_design.html` (the epic design_doc — 10-axis framework, verdict scale, findings schema `pmos-critique-findings/v1`, applicability map, eval checks, voice); seed brief `docs/design-briefs/2026-06-24-artifact-critique-skill.md` (deep grill 2026-06-24, 13 branches). Rubric substrate: `_shared/critique-rubric/` (story 260624-fbd). Emit contract: `_shared/html-authoring/README.md`. Reviewer contract: `_shared/reviewer-protocol.md`.*
