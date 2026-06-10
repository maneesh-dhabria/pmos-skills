---
name: primer
description: Produces a verified-source, audience-shaped HTML primer on any topic — researched, outlined, drafted, and self-evaluated into a single teachable artifact. Use to ramp-up before a meeting / a scope / a doc review, when the user needs to learn a topic quickly with citations they can trust. Triggers when the user says "write me a primer on X", "ramp me up on Y", "generate a primer", "I need to learn about Z before a meeting", "/primer", "create a teachable artifact on this topic", "deep primer on X", or "brief primer on Y". Shapes depth, jargon, and examples to the chosen audience (senior-pms vs all-pms) and supports explicit sizing via --depth brief|standard|deep (the default depth tier is persisted per-project after the first run). Prefers primary sources over secondary commentary.
user-invocable: true
argument-hint: <topic> [--audience <senior-pms|all-pms>] [--depth <brief|standard|deep>] [--autonomous] [--non-interactive] [--interactive]
---

# Primer

**Announce at start:** "Using primer to research and draft a teachable artifact on the requested topic."

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

<!-- defer-only: ambiguous -->
- **No `AskUserQuestion` available:** Intake confirmation, audience selection, and Phase 0.5 consolidated confirm all degrade to numbered free-form prompts per `_shared/interactive-prompts.md`. The non-interactive auto-pick contract (Recommended → AUTO-PICK) still applies.
- **No `Task` subagent:** Research, drafting, and eval phases run inline in the host conversation; the try-both research pattern in Phase 2 collapses to a single sequential pass (web search first, then context7 if available).
- **No `WebFetch`:** Phase 2 research falls back to context7 MCP (if available) plus any user-supplied URLs/snippets pasted into the conversation; surface the degraded-source warning in the eval phase (see `reference/source-floor.md` §WebFetch unavailable).
- **No `context7` MCP:** Phase 2 research falls back to `WebFetch` plus user-supplied material; if neither is available, refuse with a clear message naming the missing tools and exit 64.
- **No Playwright MCP:** social sources are fetched through the shared free-fetch ladder in `_shared/topic-research/sourcing-ladder.md` (fxtwitter, threadreaderapp, r.jina.ai over `WebFetch`) with `reference/social-sourcing.md` carrying `/primer`'s citation discipline. Only the **last-resort** rung (un-unrolled X threads; member-only LinkedIn posts) is lost without Playwright; such candidates are dropped silently rather than blocking the run.

## Track Progress

This skill has 5 sequential phases (Intake, Research, Outline, Draft, Eval + Write) plus an intake/setup phase (Phase 0 + Phase 0.5) and a closing Capture Learnings phase, with eval gates inside Phase 5. Create one task per phase using the host agent's task-tracking tool (e.g., `TaskCreate` in Claude Code). Mark each task in-progress when you start it and completed as soon as it finishes — do not batch completions.

## Phase 0: Pipeline setup + Load Learnings

Inline `_shared/pipeline-setup.md` to: read `.pmos/settings.yaml` (REQUIRE `version` and `docs_path`; default `output_format` to `html` when absent), resolve `{docs_path}`, and resolve the per-run artifact folder `{primer_dir} = {docs_path}/primer/` (mkdir -p if missing).

Resolve `output_format` with precedence `settings.output_format > default "html"`. On Phase 0 entry, print to stderr: `output_format: <v> (source: <settings|default>)`. (html is the only emitted format — MD export retired, FR-12.1.)

Read `~/.pmos/learnings.md` if present; note any entries under `## /primer` heading and factor them into your approach. **The skill body wins on conflict** — surface any conflict between a learning and the skill body to the user before applying the learning.

Capture a Phase-0 wall-clock timestamp (used in Phase 5 step 14 to compute `last_elapsed_seconds`).

The canonical non-interactive block below handles `mode` resolution + per-checkpoint classifier + OQ buffer + end-of-skill summary. Do not paraphrase or move this block.

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

## Phase 0.5: Consolidated confirm

Read `.pmos/primer.lastrun.yaml` if present. The file shape:

```yaml
last_topic: "<string>"
last_audience: senior-pms | all-pms
last_output_format: html   # html is the only emitted format (MD export retired, FR-12.1)
last_depth: brief | standard | deep
last_artifact_path: "<path>"
last_elapsed_seconds: <int>
```

If the file is present AND `--autonomous` is NOT set, surface a single prompt seeded from the prior values:

- `AskUserQuestion` — `"Use last-run defaults? audience=<v>, output_format=<v>, depth=<v>"` options:
  - `Use last values (Recommended)` — apply lastrun `audience` + `output_format` + `depth` for this run.
  - `Edit audience` — re-prompt later in Phase 1 for audience (senior-pms / all-pms).
  - `Edit depth` — re-prompt later in Phase 1 for depth (brief / standard / deep).

This prompt carries a `(Recommended)` option, so it auto-picks under `--non-interactive` and does not need a `defer-only` tag.

If `--autonomous` is present, skip this gate entirely; apply lastrun values when present, otherwise apply built-in defaults (`audience=senior-pms`, `output_format=html`, `depth` from settings or first-run prompt below).

If no lastrun file exists AND `--autonomous` is not set, defer Phase 0.5 silently — the Phase-1 audience prompt will fire instead.

**Depth resolution (S-FR-8.1, S-FR-8.2).** Resolve `depth ∈ {brief, standard, deep}` with precedence: `cli --depth > settings.default_primer_depth > lastrun.last_depth > first-run prompt`. After resolution, print to stderr exactly: `depth: <tier> (source: <cli|settings|lastrun|prompt>)`.

**First-run depth prompt.** If `--depth` is NOT given AND `settings.default_primer_depth` is absent AND `lastrun.last_depth` is absent AND `--autonomous` is NOT set, surface:

- `AskUserQuestion` — `"Preferred default depth for primers in this project?"` options:
  - `standard (Recommended)` — 4,000–6,000 word target; source floor 10. Default for typical senior-PM topics.
  - `brief` — 2,000–3,000 word target; source floor 6. Fast ramp for narrow topics; pre-meeting in ~15 min.
  - `deep` — 7,000–10,000 word target; source floor 15. Broad multi-camp topics needing decision guides, benchmarks, case studies.

This prompt carries a `(Recommended)` option so it auto-picks `standard` under `--non-interactive`. On answer, write `default_primer_depth: <tier>` to `.pmos/settings.yaml` via atomic temp-then-rename — preserves all other settings keys. Subsequent runs read silently; `--depth` flag still overrides per-run.

Under `--autonomous` with no prior signal: apply `depth=standard` silently; do NOT write to settings (autonomous runs should not mutate project settings).

## Phase 1: Intake

Parse the argument string. Recognised tokens: positional `<topic>` (1st arg, may be multi-word — strip surrounding quotes); flags `--audience <v>`, `--depth <v>`, `--autonomous`, `--non-interactive`, `--interactive`. Any unknown flag → emit a platform-aware error listing the valid set (per `_shared/platform-strings.md`) and exit 64.

**Unknown depth value (S-FR-8.4).** If `--depth` is given but is not one of `{brief, standard, deep}` (e.g., `--depth quick`), reject with platform-aware error: `unknown depth '<v>'. Valid: brief, standard, deep.` Exit 64.

**Derive `<slug>`** from `<topic>` per `_shared/canonical-path.md` slug rules: lowercase the topic; replace any run of non-alphanumeric chars with a single `-`; collapse consecutive `-`; trim leading/trailing `-`; truncate to ≤64 chars.

**Canonical artifact path:** `{docs_path}/primer/{YYYY-MM-DD}_<slug>.html` where `YYYY-MM-DD` is today's UTC date.

**Topic vagueness heuristic (FR-4.1).** If `<topic>` has <3 whitespace-separated tokens AND no clear noun phrase (i.e., no token of length ≥4 that looks like a content word), surface the following:

<!-- defer-only: ambiguous -->
- `AskUserQuestion` — `"Topic looks ambiguous. Pick a refinement or write your own:"` with 3 LLM-generated candidate refinements + `Other (free-form)`. Under `--autonomous` the deferred default is to proceed with the topic as given (log to OQ buffer with reason `topic-vague`).

**Topic-richness check (S-FR-5.1 / S-FR-5.2).** Run IMMEDIATELY after the vagueness heuristic resolves (whether or not vagueness fired), BEFORE audience resolve. The classifier is the **shared topic-research substrate** — **inline `_shared/topic-research/intake.md` §"Topic-richness classifier"** and run its verbatim prompt; it returns the typed verdict `{verdict ∈ rich|narrow-by-design|thin, rationale, reframings[]}`. `intake.md` also carries the depth→coverage dial matrix that Phases 2–3 size against. The substrate is skill-agnostic — it only emits the verdict; the reaction below is `/primer`'s own.

`/primer`'s reaction to the verdict (this skill owns it, not the substrate): on `verdict == "rich"` → proceed silently to audience resolve. On `verdict == "narrow-by-design"` → set `state.richness = "narrow-by-design"` (consumed by Phase 3 outline gen) and proceed. On `verdict == "thin"`:

<!-- defer-only: ambiguous -->
- `AskUserQuestion` — `"Topic '<topic>' looks too narrow to support a primer-shaped artifact. Pick a reframing or proceed:"` with options: the 3 LLM-generated reframings (verbatim from the richness step), `Keep as-is (will produce a thin primer)`, `Abort`. Under `--autonomous` / `--non-interactive` the deferred default is `Keep as-is`, logged to OQ buffer with reason `topic-thin`.

**Audience resolve.** Precedence: cli `--audience > lastrun.last_audience (from Phase 0.5) > interactive prompt`. When the interactive prompt is required:

- `AskUserQuestion` — `"Audience preset?"` options:
  - `senior-pms (Recommended)` — PM-fluent reader; no inline definitions of common PM terms.
  - `all-pms` — every term-of-art defined on first use; concrete next-steps closing.

This prompt has a `(Recommended)` option (no `defer-only` tag needed); under non-interactive mode it auto-picks `senior-pms`.

**Unknown audience value (FR-4).** If `--audience` is given but is not one of `{senior-pms, all-pms}` (e.g., `--audience eng-leads`), reject with platform-aware error: `unknown audience '<v>'. Valid: senior-pms, all-pms. Use --audience all-pms as the broadest preset.` Exit 64.

**Path collision (FR-4.2).** If `{date}_{slug}.html` already exists at the canonical path:

<!-- defer-only: destructive -->
- `AskUserQuestion` — `"<path> already exists. Choose:"` options: `Append -2 suffix (Recommended)` (find the lowest unused integer suffix `-2`, `-3`, …) / `Overwrite (git-snapshot first)` (first runs `git stash push --keep-index -m "primer-overwrite-{slug}-{date}"`) / `Abort`.

See `reference/audience-presets.md` for the full per-preset required-sections / vocab posture / closing-shape contract that downstream phases consume.

## Phase 2: Canon & Outline (shared front half)

This phase is the **shared topic-research substrate** — `/primer` inlines the substrate docs (which emit typed outputs) and applies its own reactions. The substrate is skill-agnostic; do not edit it to special-case `/primer`.

**Step 1 — Canon discovery.** **Inline `_shared/topic-research/canon-discovery.md`** and follow it — find the field's practitioners + canonical books + 2–4 existing curations by live search (never from memory), sized to the resolved `--depth` (its dial matrix in `intake.md`). It emits the `canon` set `{practitioners[], books[], curations[]}`. Books are attributed in prose and cited later by their free entry-point URL (see Step 3).

**Step 2 — Outline.** **Inline `_shared/topic-research/outline.md`** and follow it — derive the outline by cascade (canonical → curation → provisional), record the **provenance rung**, **dedupe topics before sourcing**, and run the confirm gate. The substrate emits `{topics[], provenance_rung}`. The provenance rung is surfaced in the artifact TL;DR (Phase 4).

`/primer`'s reactions to the substrate output (this skill owns them):

- **Audience-preset shaping.** Bias the topic set toward the resolved audience preset's required-sections floor per `reference/audience-presets.md` (4 named H2s for both presets, plus 1–2 optional additions). The substrate gives the field's topic structure; the preset shapes which teach-sections `/primer` requires on top. Target a 10–14 H2 outline.
- **Narrow-by-design carve-out (S-FR-5.6).** If `state.richness == "narrow-by-design"` (from the Phase-1 verdict), include a one-line `## Decision guide deferred — topic narrow-by-design` note in place of the usual decision-guide H2. All other required sections per `reference/audience-presets.md` remain present.

**Outline confirm gate (FR-6.1).** The substrate's confirm gate is realized as `/primer`'s richer gate (it keeps the Re-prompt/Abort options primer relies on):

<!-- defer-only: ambiguous -->
- `AskUserQuestion` — `"Outline ready (provenance: <rung>). Approve, edit, or re-prompt?"` options:
  - `Approve outline (Recommended)` — proceed to Phase 3 sourcing with this outline as-is.
  - `Edit` — accept a free-form user reply; apply the edits and re-render the outline once (if the user wants further edits, re-surface this gate).
  - `Re-prompt with feedback` — accept free-form guidance and regenerate the outline from scratch under the new framing.
  - `Abort` — exit cleanly; canon work is preserved in working memory but no artifact is written.

Under `--autonomous` (or non-interactive mode), the AUTO-PICK is `Approve outline`.

## Phase 3: Verified per-topic sourcing (shared front half)

Sourcing runs **after** the outline is confirmed (so we never source the wrong topics). **Inline `_shared/topic-research/sourcing.md`** and follow it — for each confirmed outline topic, run the rank-then-verify loop and emit one verified, ranked, annotated shortlist per topic (the candidate pool is pre-stocked from `canon.curations`). Emit the est-cost line before sourcing. The anti-slop hard gate + tier ranking live in `_shared/topic-research/source-tiers.md`; the verification pass-bar + free-fetch ladder + book summaries in `_shared/topic-research/sourcing-ladder.md`.

`/primer`'s reactions to the substrate output (this skill owns them):

- **Per-H2 evidence map (FR-15).** Each outline topic's verified shortlist is the **evidence set for the corresponding `<h2>`** in Phase 4. Keep the per-topic structure — do NOT flatten into an undifferentiated pool. `/primer` reads + synthesizes **every** verified source across all shortlists (there is no short-circuit; the `--depth` dial is the sole cost governor per the est-cost line).
- **`sources.json` assembly (FR-5.3).** Assemble `sources.json` from the union of all per-topic shortlists — each entry carries `{url, takeaway, topic, tier, paywalled?, free_alt?, book_summary?}`. Persist to `{docs_path}/primer/{date}_{slug}.sources.json` (actual write happens in Phase 5 atomic trio; FR-RECOVERY may persist earlier). The `takeaway` is the grounded ≤2-sentence summary Phase 4 cites from (rubric R2: no-plagiarism).
- **Citation rule for books/paid courses (S-FR-1.8).** Books/paid courses are cited with the **free entry-point URL** as the `<a href>`; the book itself is attributed in prose ("Ramanujam, *Monetizing Innovation* (Wiley, 2016)"). No paid landing-page URLs. The free-entry URL MUST be a verbatim `sources.json[].url` member for the R1 reviewer check.
- **Source-floor as an eval-time coverage signal (FR-13).** The floor (brief=6, standard=10, deep=15 total verified sources across all topics) is **NOT a sourcing gate and never short-circuits or caps sourcing.** After sourcing settles, count the merged verified sources; if `count < floor`, surface a **thin-source disclosure** per `reference/source-floor.md` §"Thin-source disclosure" — informational, never blocking. (The retry-once protocol is preserved as an *option* in that disclosure, not a gate.)

**WebFetch unavailable (FR-5.4).** If `WebFetch` is missing, follow the degraded path in `reference/source-floor.md` §"WebFetch unavailable (FR-5.4)" — verification is impossible, so surface the degraded-source warning rather than emitting unverified links.

## Phase 4: Draft

Single-pass draft against the approved outline. Word target derives from the resolved depth tier (S-FR-8.7).

**Word target by depth tier.**

| Depth    | Word target  |
|----------|--------------|
| brief    | 2,000–3,000  |
| standard | 4,000–6,000  |
| deep     | 7,000–10,000 |

These are SOFT targets — the Phase-5 reviewer reports actual `word_count` on the R10 object as an informational field; there is NO hard-block on miss. Resolved depth comes from Phase 0.5 resolution (`cli > settings > lastrun > prompt`). The previous "default ~3000 words" sizing is now `depth=brief|standard` territory; `deep` is new in v0.2.0 and unlocks the 7K–10K range for broad senior-PM topics.

**Curator-lens framing (FR-7).** Read `reference/curator-lens.md` and inline its §"Phase-4 framing prompt" verbatim into the draft-generation context, with `<topic>` and `<audience>` substituted. This framing prompt teaches the LLM to write as a curator (selects + frames + attributes named camps) rather than an explainer (argues a thesis). It is the load-bearing quality lever — if drafts come back as explainer-voice, edit `reference/curator-lens.md` first before any other part of the pipeline.

**Per-H2 evidence (FR-15).** Each `<h2>` synthesizes from its outline topic's verified shortlist (Phase 3) — that shortlist is the section's evidence set. Read and synthesize **every** verified source in the shortlist; the per-topic size is already bounded by the `--depth` dial matrix.

**Citation discipline (FR-7.1).** Every `<a href="X">` URL X in the draft body MUST be a verbatim member of `sources.json[].url` (assembled from the per-topic shortlists in Phase 3). **No novel URLs introduced in Phase 4** — draw only from `sources.json[].url`. The Phase-5 reviewer's `cites-real-urls` (R1) check enforces this as a trust-tier hard-block; Phase 4 prevents the violation in the first place.

**Audience vocab posture.** Apply the posture from `reference/audience-presets.md` for the resolved preset: `senior-pms` writes without inline definitions of common PM terms; `all-pms` defines every term-of-art on first use.

**Inline SVG diagrams (FR-D01).** Where a section's concept has a structural shape that prose explains awkwardly — a loop, a comparison across named camps, a hierarchy, a sequence, a state machine, a 2×2 — embed a small inline `<svg>` diagram within that section. Diagrams MUST be:

- **Inline** — literal `<svg>...</svg>` in the draft HTML; no `<img src>`, no `<object>`, no external assets. Preserves the single-file primer contract.
- **Accessible** — first child is `<title>short label</title>`; optional `<desc>` for longer alt text. Screen readers and no-CSS renders stay usable.
- **Styled per `reference/diagram-style.md`** — inline-read its conventions (palette, viewBox sizing, stroke widths, font-family inheritance, accessibility, the minimal worked example) before drafting. Do NOT invoke `/diagram` as a subagent — Phase 4 runs inline per spec D2.

Diagrams are an **affordance**, not a per-section requirement. Pick them where they earn their place — one well-chosen diagram saves a paragraph; a forced diagram is decoration that displaces citation density (see Anti-patterns).

**Adjacency pointer section (FR-16).** Close the draft with a `## Where this connects — adjacent topics` section of **pointers, not teaching** — one line per adjacent topic (what it is + why it's adjacent), so a reader knows where to go next without `/primer` expanding scope. Depth-scaled per the `intake.md` dial matrix (adjacency hops): `brief` = omit the section entirely; `standard` = a short list (~2–3 pointers, 1 hop); `deep` = a richer list (~4–6 pointers, up to 2 hops). These are pointers — do NOT source, verify, or teach them; a pointer that names a topic worth its own `/primer` or `/learn-list` run is exactly the right shape. (This is distinct from `/learn-list`'s verified "adjacent rabbit holes" — `/primer` only points.)

**Non-goals (spec §3).** No separate diagram-pass — diagrams ship inline during the single-pass draft when a visual aids comprehension (see "Inline SVG diagrams" above). No persona-pass. No blind-primer. Single linear draft against the outline; reviewer enters in Phase 5.

**Output.** Hold `{date}_{slug}.draft-prose` in working memory; the actual file write happens in Phase 5 (atomic trio).

## Phase 5: Eval + Write

The substantive phase. Execute in order.

1. **Reviewer dispatch (FR-8).** Dispatch a fresh subagent via `Task` tool. The subagent prompt MUST inline `reference/rubric.md` **verbatim**. Inputs: the Phase-4 draft prose, the assembled `sources.json` structure (the union of the per-topic verified shortlists, each entry carrying `{url, takeaway, topic, tier}`), the resolved audience preset name, and the resolved depth tier. The subagent returns a single JSON array — one object per check_id with `{check_id, verdict: 'pass'|'fail', evidence, quote}` (schema per `reference/rubric.md` §"Output contract"). **The R10 (`primer-shaped`) object additionally carries two informational fields per S-FR-6.2 / S-FR-8.7:**

   - `examples_per_h2_distribution: [{h2_id, h2_title, count}]` — per-H2 count of named-company / hypothetical worked examples.
   - `word_count: <int>` — actual draft word count (for soft comparison against the depth tier table).

   Both fields are INFORMATIONAL ONLY — they do NOT affect the R10 verdict. **The reviewer scores only — it MUST NOT edit the draft** (mirrors the /skill-eval D10 separation pattern).

2. **Reviewer URL verification (FR-8.1).** As part of its R1 check, the reviewer cross-checks every `<a href>` URL in the draft against `sources.json[].url`. The reviewer does NOT re-fetch URLs — Phase 2 owns URL resolution; the reviewer trusts the `sources.json` membership test.

3. **Orchestrator-side JSON validation (FR-8.2).** /primer (NOT the reviewer) validates the returned JSON before acting on it:
   - **(a) check_id set match.** The returned `check_id` set MUST equal the 10 IDs declared in `reference/rubric.md` (R1–R10). On any mismatch, hard-fail with the precise diff: `reviewer returned check_ids that do not match rubric.md: missing=[…], extra=[…]`.
   - **(b) Quote verbatim test.** For every `fail` verdict, the `quote` field MUST be a ≥40-char verbatim substring of the draft (or of `sources.json[].takeaway` for the `no-plagiarism` check). A `fail` whose quote is empty or fails the substring test is **treated as `pass`** by the orchestrator (defense against hallucinated quotes).

4. **Auto-apply iteration 1 (FR-8.3).** If iteration 1 returned any `fail`, /primer (the writer — not the reviewer) authors a fix patch inline against the draft, addressing each surviving fail. Re-dispatch the reviewer **once** on the patched draft. **Iteration cap = 1** (no iteration-2 retry; the spec rejects unbounded refinement loops).

5. **Trust-tier hard-block (FR-8.4).** After iteration 1's re-run, if ANY trust-tier check is still failing (R1 `cites-real-urls`, R2 `no-plagiarism`, R3 `no-hand-wavy-claims`, R6 `structurally-complete`, R7 `sections-json-ids-match`), execute the FR-RECOVERY path (step 15 below) and exit.

6. **Taste-tier accept-as-known-risk (FR-8.5).** If after iteration 1 only taste-tier checks (R4, R5, R8, R9, R10) are failing, surface:

   <!-- defer-only: ambiguous -->
   - `AskUserQuestion` — `"Taste-tier residuals: <list of failing check_ids>. Accept and ship, iterate manually, or abort?"` options:
     - `Accept as known risk and write (Recommended)` — proceed; the artifact ships with a "Known residuals" footer note listing the failing taste-tier check IDs.
     - `Iterate manually` — exit to chat with the failing check IDs and reviewer evidence; the user patches and re-runs /primer.
     - `Abort` — exit cleanly; no artifact written.

7. **Phase-5 interactive write gate (FR-8.6).** When not hard-blocked, before the final write, surface:

   <!-- defer-only: ambiguous -->
   - `AskUserQuestion` — `"All checks resolved. Approve, iterate, or abort?"` options:
     - `Approve and write (Recommended)`
     - `Iterate manually`
     - `Abort`

   Under `--autonomous` this gate AUTO-PICKs `Approve and write`. Trust-tier hard-block (step 5) and taste-tier residual disclosure (step 6) still apply.

   **Worked-examples informational note (S-FR-6.3).** If the R10 object's `examples_per_h2_distribution` shows ≥30% of H2s with `count == 0`, prepend to the `AskUserQuestion` `question:` text exactly: `"Note: <X>/<N> H2s have zero worked examples. "` Options are unchanged. This is INFORMATIONAL ONLY — the gate never blocks on example density; the prepended note simply gives the user a signal before approval.

   **Word-count informational note (S-FR-8.7).** Similarly, if the R10 object's `word_count` falls outside the resolved depth tier's target range, prepend: `"Note: draft is <N> words; <depth> target is <range>. "` Informational only.

8. **Atomic write trio — temp-then-rename (FR-9).** On Approve, write three files to temp paths first: `{date}_{slug}.html.tmp`, `{date}_{slug}.sections.json.tmp`, `{date}_{slug}.sources.json.tmp`. Only after all three succeed do you `mv` each to its final name. If any rename fails, `rm` all `.tmp` files and abort (no partial states on disk).

9. **Render via substrate template.** Render the HTML through `_shared/html-authoring/template.html` with these token values:
   - `{{plugin_name}}` = `pmos-learnkit`
   - `{{plugin_name_nbsp}}` = `pmos&#8209;learnkit`
   - `{{plugin_url}}` = `https://github.com/maneesh-dhabria/pmos-skills/tree/main/plugins/pmos-learnkit#readme`
   - `{{plugin_version}}` = read from `plugins/pmos-learnkit/.claude-plugin/plugin.json` `:: version` — **fail-fast if plugin.json is missing or unparseable**.
   - Standard substrate tokens (title, content, source_path, asset_prefix) per `_shared/html-authoring/template.html`.
   - The substrate writer sets `data-pmos-plugin="pmos-learnkit"` on the root container per template convention.

10. **Asset substrate.** Copy `assets/*` from `plugins/pmos-learnkit/skills/_shared/html-authoring/assets/` to `{docs_path}/primer/assets/` via `cp -n` (no-clobber, idempotent across runs).

11. **Heading IDs (FR-9.1).** Every `<h2>` and `<h3>` in the rendered body carries a stable kebab-case `id` per `_shared/html-authoring/conventions.md §3`. `sections.json` contains `{id, level, title, parent_id}` for every heading; the `sections.json[].id` set MUST equal the on-page id set in document order. The R7 trust-tier `sections-json-ids-match` check enforces this.

12. **Cache-bust (FR-9.2).** All asset URL references in the rendered HTML carry `?v={{plugin_version}}` per the substrate template. The version is the **pmos-learnkit** plugin version (not pmos-toolkit's).

13. **Listing regen (`primers.html`).** Regenerate the collection listing at `{docs_path}/primer/primers.html` so every primer generated so far is reachable from one sidebar-navigation page. This is a flat primer *collection* — do NOT delegate to `_shared/html-authoring/index-generator.md` as-is (that generator groups by feature-pipeline phase — `00 Pipeline`, `01 Requirements`, … — which is meaningless for a primer library). Build the manifest inline, then render via the substrate template:
    - **Glob** `{docs_path}/primer/*.html`, excluding `primers.html` itself and any `*.draft.html` (rejected drafts are never listed — see FR-RECOVERY (e)).
    - **One manifest entry per primer:** `id` = filename stem in kebab-case (e.g. `2026-06-03_feature-flags.html` → `2026-06-03-feature-flags`); `title` = the primer's topic, read from its first `<h1>` text content (the just-written primer's `<h1>` is known in-memory; for the rest, slice each file's first `<h1>…</h1>`); `phase` = the literal string `"Primers"` for **every** entry (so `viewer.js buildSidebar` renders them all under one `Primers` group rather than per-phase groups); `path` = the filename relative to `{docs_path}/primer/`; `format` = `"html"`; `sections_path` = the sibling `<stem>.sections.json` if present, else `null`.
    - **Order newest-first:** sort entries by their `{YYYY-MM-DD}` filename-date prefix descending, ties broken by slug ascending. `viewer.js` auto-selects `artifacts[0]`, so the most-recent primer is the default selection on open.
    - **Render** through `_shared/html-authoring/template.html` per `index-generator.md §4–§5`, supplying the **same plugin token values as step 9** (`{{plugin_name}}`, `{{plugin_name_nbsp}}`, `{{plugin_url}}`, `{{plugin_version}}` — pmos-learnkit's) plus: `{{title}}` = `"Primers — pmos-learnkit"`, `{{asset_prefix}}` = `assets/`, `{{source_path}}` = `primers.html`, `{{pmos_skill}}` = `primer`, and `{{content}}` = the substrate viewer chrome (header toolbar, `<aside class="pmos-sidebar">`, `<main class="pmos-main">` iframe slot, and the inlined `<script type="application/json" id="pmos-index">` manifest block). `viewer.js` (already loaded by the template) builds the sidebar, auto-selects the first entry, and loads each primer **in place** (iframe under `serve.js`; new-tab link on `file://`).
    - **Atomic write:** temp-then-rename, same discipline as the primer trio above.

14. **MD sidecar (FR-9.3).** Retired (FR-12.1) — `output_format=both` (and `md`) is treated as `html` until a future feature re-introduces MD export.

15. **Update lastrun (FR-12).** Write `.pmos/primer.lastrun.yaml`:

    ```yaml
    last_topic: "<resolved topic>"
    last_audience: <resolved audience>
    last_output_format: <resolved output_format>
    last_depth: <resolved depth>
    last_artifact_path: "<final HTML path>"
    last_elapsed_seconds: <int from Phase-0 timestamp>
    ```

    Per the canonical lastrun pattern. Gitignore is handled at the repo level by /complete-dev.

16. **FR-RECOVERY hard-block path (FR-10).** When step 5 triggers:
    - **(a) Persist `sources.json` to its canonical (non-draft) path** `{date}_{slug}.sources.json` — research work is not discarded.
    - **(b) Write the rejected draft** to `{date}_{slug}.draft.html` with: a top-of-body banner `<div class="primer-rejected-banner" role="alert">REJECTED BY REVIEWER — DO NOT TRUST</div>`; immediately under the banner a `## Failing checks` section listing each failing trust-tier check with its reviewer verdict + quote + evidence; then the full draft body below.
    - **(c) Inline recovery banner CSS (FR-10.1)** in the `draft.html` `<style>` tag — red background, white text, large readable size, sticky-top. Suggested: `.primer-rejected-banner { position: sticky; top: 0; z-index: 100; background: #b00020; color: #fff; font-size: 1.25rem; padding: 1rem; text-align: center; }`.
    - **(d) Print to chat** verbatim: `Trust-tier check '<name>' failed after auto-apply iteration. Hard-block: no primer artifact written. Draft preserved at <path>.draft.html for review. Manually patch and rerun, or rerun fresh.`
    - **(e) Do NOT regenerate `primers.html`** for a draft (the rejected draft is never listed). **Do NOT update lastrun** (the run is incomplete).

## Phase 6: Capture Learnings

1. This skill is not complete until the learnings-capture process has run. Read and follow `learnings/learnings-capture.md` (relative to the skills directory) now. Reflect on whether this session surfaced anything worth capturing — surprising source-quality patterns, audience-shaping heuristics, rubric edge-cases, reviewer drift between iteration 1 and the trust-tier verdict, framing-prompt failures that ended in FR-RECOVERY. Proposing zero learnings is a valid outcome for a smooth run; the gate is that the reflection happens, not that an entry is always written. Skip silently if the run errored before Phase 5 completion (the partial OQ buffer captures the failure context instead).

## Anti-Patterns (DO NOT)

- Do NOT invent URLs that do not appear in `sources.json` — citation discipline is the trust-tier hard-block (FR-7.1, rubric R1). The reviewer cross-checks every `<a href>` against `sources.json[].url`; mismatches trigger FR-RECOVERY.
- Do NOT skip the Phase-5 reviewer — there is no clean exit path that bypasses it (FR-8 + FR-8.4). The artifact ships only after the reviewer has scored the draft and the orchestrator has validated the JSON.
- Do NOT write the artifact when a trust-tier check fails after auto-apply iteration 1 — the FR-RECOVERY draft path (Phase 5 step 16) is the only allowed exit (FR-8.4 + FR-10). Shipping a trust-tier failure is the worst-case outcome for /primer.
- Do NOT deep-fetch a single source repeatedly in Phase 2 — the source-floor (FR-5.2) targets breadth, not depth; multiple shallow on-topic sources beat one deep one when the gate counts usable sources.
- Do NOT introduce novel URLs in Phase 4 — the draft draws only from `sources.json[].url`. The R1 rubric check catches this, but Phase 4 must avoid producing the violation in the first place rather than relying on the reviewer to catch it.
- Do NOT conflate audience presets within one primer — `reference/audience-presets.md` §Anti-patterns covers this; half-defining terms confuses both audiences (senior PMs find it patronising; newer PMs lose trust in the doc).
- Do NOT spawn subagents in Phases 2–4 — only Phase 5 dispatches the reviewer subagent. Phases 2–4 run inline in the host conversation (per spec D2 architectural decision); `/primer` runs the shared per-topic sourcing loop inline (sequential), using tool-level fetch parallelism, not subagent dispatch.
- Do NOT mix curator and explainer voice — the Phase-4 framing prompt at `reference/curator-lens.md` is the load-bearing quality lever; deviating drops primer-quality below the rubric R10 (`primer-shaped`) floor.
- Do NOT force a diagram into every section. Inline SVG diagrams are an affordance for sections with a structural shape (loop, comparison, hierarchy, sequence, state machine, 2×2); using them as decoration or to displace citation density violates the Phase 4 framing (FR-D05). One well-chosen diagram saves a paragraph; a forced diagram is visual padding. The Phase-5 reviewer's R10 informational `diagrams_per_h2_distribution` lets the orchestrator observe drafter behavior over time, but the load-bearing prevention is the drafter picking diagrams that earn their place.
- Do NOT invent practitioners or canonical books. Canon is found by live search via `_shared/topic-research/canon-discovery.md`; a practitioner or book whose sources do not clear the verification pass-bar (`_shared/topic-research/sourcing-ladder.md`) is dropped and MUST NOT surface in citations or prose — fabricated authority is a trust violation worse than thin sourcing.
- Do NOT silently skip the Phase-1 topic-richness check on the assumption "the user knows their topic". `narrow-by-design` is a real outcome that downstream Phase-3 outline gen consumes; skipping the check makes a thin primer indistinguishable from a deliberately shape-different one.
- Do NOT fetch tweets via the paid X API or a bare `x.com` / `twitter.com` `WebFetch` — the login wall returns an empty body and the API is paid. Use the free-fetch ladder in `_shared/topic-research/sourcing-ladder.md` (fxtwitter → threadreaderapp → self-reply walk; `reference/social-sourcing.md` carries `/primer`'s citation discipline) for every tweet/thread.
- Do NOT reproduce tweet or LinkedIn post text verbatim in the draft — always paraphrase into the `takeaway` and cite the source. Verbatim social text is a trust-tier (rubric R2 `no-plagiarism`) violation just like lifting blog prose.
- Do NOT cite the fetch-proxy URL (`api.fxtwitter.com`, `threadreaderapp.com`, `r.jina.ai`) for a social source — cite the original canonical post URL (`x.com/<user>/status/<id>` or the LinkedIn post URL). The proxy is a fetch mechanism only; citing it breaks the human-clickable link and the R1 trust contract.

## Worked example

Topic: `"feature flagging at scale"`. Walks Phases 0 → 5 in compact form. Phases 2–3 are the shared topic-research substrate (canon → outline → verified per-topic sourcing); Phases 4–5 are `/primer`'s synthesis back half.

- **Phase 0.** Read `.pmos/settings.yaml`: `version=1, docs_path=docs/pmos, output_format=html` (no `default_primer_depth` on first run). Stderr: `output_format: html (source: settings)`. Learnings `## /primer` section: empty.
- **Phase 0.5.** `.pmos/primer.lastrun.yaml` absent on first run; defer the lastrun gate silently. First-run depth prompt fires: user picks `standard (Recommended)`; orchestrator writes `default_primer_depth: standard` to settings. Stderr: `depth: standard (source: prompt)`.
- **Phase 1.** Topic = `"feature flagging at scale"` (4 tokens; not vague). Topic-richness check returns `rich` (named frameworks like percentage-rollouts, multiple decision-paths around build-vs-buy, named-incident worked examples available) → proceed silently. Slug = `feature-flagging-at-scale`. Path = `docs/pmos/primer/2026-05-23_feature-flagging-at-scale.html`. Audience AskUserQuestion auto-picks `senior-pms (Recommended)`. No path collision.
- **Phase 2 (canon & outline — shared).** `canon-discovery.md` names ~5 practitioners (Birch, Cohen, Patton, Mantel, Sangu) + 3 books (*Effective Feature Management*, *Software Engineering at Google* ch. 24, *Release It*) and harvests 3 curations (an "awesome-feature-flags" list, a LaunchDarkly syllabus, a practitioner "what to read" post). `outline.md` cascades a 12-topic outline from the curation consensus — provenance rung `curation-consensus` — dedupes, and presents the confirm gate. `/primer`'s audience-preset shaping adds the required teach-sections (`## What this is`, `## Why it matters now`, `## How the smart teams are using it`, `## Tradeoffs we considered against`, `## Metrics calibration`, `## Open debates`, `## Where to dig deeper`). Verdict was `rich`, so no carve-out. User approves.
- **Phase 3 (verified sourcing — shared).** Est-cost line: `est. ~60 source verifications across 12 topics; proceeding`. Per-topic rank-then-verify yields verified shortlists (top-5 per topic at `standard`); LaunchDarkly/Unleash/Flagsmith docs + named-practitioner essays clear the hard gate; one content-farm listicle is dropped pre-fetch. Merged verified = 18 sources across the 12 topics; `sources.json` assembled from the shortlists. 18 ≥ floor (10) so no thin-source disclosure (floor is informational only).
- **Phase 4.** Draft ~4800 words (within standard tier 4,000–6,000); 14 inline `<a href>` citations, all verbatim members of `sources.json[].url`. **Two inline SVG diagrams: a percentage-rollout flow under H2 "How the smart teams are using it" (3 lifecycle stages, arrows) and a build-vs-buy 2×2 under H2 "Tradeoffs we considered against" (axes: cost-of-ownership × control-of-roadmap). Both follow `reference/diagram-style.md` conventions — inline SVG with `<title>`/`<desc>`, `viewBox` sizing, neutral palette.** Curator voice: names the LaunchDarkly / Unleash / build-in-house camps rather than picking one. Most H2s surface ≥1 named-company example (LaunchDarkly's percentage rollouts, Etsy's flagging audit, Slack's incident postmortem).
- **Phase 5.** Iteration-1 reviewer returns 1 fail (R3 `no-hand-wavy-claims` — the phrase "most teams use percentage rollouts" has no citation) plus R10 informational fields: `examples_per_h2_distribution` showing 10/12 H2s with ≥1 example, `diagrams_per_h2_distribution` showing 2/12 H2s with diagrams, `word_count: 4823` (SVG text excluded). Auto-apply patch adds a citation to the Unleash blog source. Re-dispatch reviewer; iteration-2 all-pass. Phase-5 interactive write gate AUTO-PICKs `Approve and write` (no prepended notes — example density and word count both within thresholds; diagram-density is informational-only with no note). Atomic write trio succeeds. Listing regen (`primers.html`) — the new primer appears as the first (newest) entry in the sidebar, auto-selected on open. Lastrun updated with `last_depth: standard`. Total wall-clock ~7 minutes.
