---
name: book-summary
description: Curates publicly available material about a named book — author interviews, podcasts, talks, reputable reviews, and corroborating social posts — and distils it into verified, theme-grouped, PM-framed takeaways in a single self-contained HTML artifact. Use when a PM wants the durable ideas of a book translated into product practice without reading it cover-to-cover. Triggers when the user says "summarize Inspired for me", "give me the key takeaways from Thinking, Fast and Slow", "what are the big ideas in <book>", "book takeaways for a PM", "distil <book> into product lessons", "/book-summary", or "what should a PM learn from <book>". Every emitted source is fetched and identity-matched this run; nothing ships from memory. Shapes depth and vocabulary to the audience (senior-pms vs all-pms) and sizing (--depth brief|standard|deep, persisted per-project).
user-invocable: true
argument-hint: "<book title> [--depth <brief|standard|deep>] [--audience <senior-pms|all-pms>] [--non-interactive] [--interactive]"
---

# Book Summary

**Announce at start:** "Using book-summary to curate verified public material on the requested book and distil it into PM-framed takeaways."

The one rule everything else serves: **every claim a reader might act on traces to a source fetched this run.** `/book-summary` belongs to the same verification-first family as `/primer`, `/learn-list`, and `/magazine` — it reuses that trust machinery (`_shared/topic-research/`) and adds a book-specific discovery → extraction → PM-translation path. It curates *public material about a named book*; it does not summarize a user-supplied PDF, reproduce the book's text, or transcribe audio.

## Flags & natural language

Every option also has a natural-language form — infer it from the request; an explicit flag overrides. Canonical phrasings: "go deep on this" ≡ `--depth deep`, "just the quick version" ≡ `--depth brief`, "for PMs of all levels" / "explain the terms" ≡ `--audience all-pms`. Contract flags (per `skill-patterns.md §I` 4-test): `--depth` and `--audience` (typed values), `--non-interactive`/`--interactive` (headless determinism). One natural-language sugar is parsed but deliberately absent from the hint:

<!-- nl-sugar -->
- `by <author>` — an optional positional suffix that pre-disambiguates book resolution (Phase 2). It carries no machine coupling, no destructive opt-in, no typed value, no headless effect — pure NL sugar, so it stays out of `argument-hint`.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

<!-- defer-only: ambiguous -->
- **No `AskUserQuestion` available:** book disambiguation and the depth/audience confirm degrade to numbered free-form prompts per `_shared/interactive-prompts.md`. The non-interactive auto-pick contract (Recommended → AUTO-PICK) still applies.
- **No `WebSearch`:** discovery (Phase 3) is impossible — refuse with a clear message naming the missing tool and exit 64; never substitute remembered sources.
- **No `WebFetch`:** verification (Phase 4) is impossible — fall back to user-supplied URLs/snippets only, and emit the honest-degradation result rather than citing unfetched links.
- **No `Task` subagent:** the Phase 7 reviewer runs inline in the host conversation; discovery, extraction, and distillation already run inline.

## Track Progress

This skill has 8 sequential phases (Setup, Resolve, Discover, Verify, Extract, Distil, Eval+Write, Capture Learnings). Create one task per phase using the host agent's task-tracking tool (e.g., `TaskCreate` in Claude Code). Mark each task in-progress when you start it and completed as soon as it finishes — do not batch completions.

## Phase 1: Setup & load learnings {#setup}

Inline `_shared/pipeline-setup.md` to: read `.pmos/settings.yaml` (REQUIRE `version` and `docs_path`), resolve `{docs_path}`, and resolve `{book_summary_dir} = {docs_path}/book-summary/` (mkdir -p if missing). HTML is the only emitted format; print to stderr `output_format: html`.

Read `~/.pmos/learnings.md` if present; factor in any entries under `## /book-summary`. The skill body wins on conflict — surface conflicts to the user before applying a learning.

**Parse arguments.** Positional `<book title>` (strip surrounding quotes; an optional trailing `by <author>` is captured as the author hint — `<!-- nl-sugar -->`). Flags `--depth <v>`, `--audience <v>`, `--non-interactive`, `--interactive`. Any unknown flag, or `--depth`/`--audience` with a value outside its enum → platform-aware error naming the valid set (per `_shared/platform-strings.md`); exit 64.

**Resolve the dials.** Both presets and the depth dial live in `reference/audience-presets.md` (cite, don't restate):

- **depth:** `cli --depth > .pmos/book-summary.lastrun.yaml :: last_depth > built-in default standard`. After the first run, persist the resolved depth to `.pmos/book-summary.lastrun.yaml` (atomic temp-then-rename) — the `/primer` persistence pattern. Print to stderr `depth: <tier> (source: <cli|lastrun|default>)`.
- **audience:** `cli --audience > lastrun.last_audience > built-in default senior-pms` (Recommended; auto-picked under non-interactive mode).

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

## Phase 2: Resolve the book {#resolve-book}

Establish the **canonical identity** — `{title, author(s), year, publisher}` — that anchors every later identity-match check (`reference/eval-rubric.md` R3). Resolve via one WebSearch on the title (plus the `by <author>` hint if given); confirm a real, attributable book (not a same-titled different work).

On an **ambiguous title** (multiple distinct books share it, or no author hint):

<!-- defer-only: ambiguous -->
- `AskUserQuestion` — `"Which book did you mean?"` with the 2–4 strongest candidate matches (`<title> — <author>, <year>`) + `Other (free-form)`. Under non-interactive mode this DEFERs: AUTO-PICK the highest-relevance match and record the assumption in the OQ buffer (reason `book-ambiguous`).

Derive `<slug>` from the resolved title per `_shared/canonical-path.md` slug rules; the canonical artifact path is `{book_summary_dir}/{YYYY-MM-DD}_<slug>.html` (today's UTC date). State the resolved identity to the user before discovering.

## Phase 3: Discover sources {#discover}

Multi-channel discovery — **search, never recall.** Run WebSearch across the three channels in `reference/source-taxonomy.md` § "Channels to search": author-primary (→T1), reputable-secondary (→T2), corroborating-social (→T3). Apply the **anti-slop hard gate pre-fetch** (`reference/source-taxonomy.md` § "Anti-slop hard gate") — discard non-attributable candidates on metadata, never fetch them.

**Rank, then fetch.** Score survivors by tier + relevance from metadata; select the **top survivors per channel**, fan-out scaled by `--depth` (`reference/audience-presets.md` § "Depth dial"). Never fetch the whole candidate pool. Podcasts and YouTube enter as **text proxies only** (`reference/source-taxonomy.md` § "AV text-proxy rule"); an AV item with no usable text is dropped here and logged in Phase 4's ledger.

## Phase 4: Verify {#verify}

The verification-first contract (cite `_shared/topic-research/sourcing-ladder.md` § "The verification pass-bar" + § "The free-fetch ladder" for paywalled sources). For each selected survivor:

1. **Fetch this run** — `WebFetch` the source. No link is emitted that was not fetched this run.
2. **Identity-match** — confirm the fetched content is actually about the Phase 2 canonical `{title, author}`, not a same-titled work.
3. **Ground** — confirm the idea the source will back is present in the fetched content, not inferred.
4. **Ledger** — record every result to `{book_summary_dir}/{YYYY-MM-DD}_<slug>.sources.json`: `{url, channel, tier, identity_match, verification, grounds: [takeaway_ids]}`. AV items with no usable text get `verification: "skipped — no usable text"`.

Sources that fail the pass-bar are dropped from both citations and prose. If too few survive to support a summary, carry the thin state into Phase 7's honest degradation.

## Phase 5: Extract & theme {#extract}

From the **verified material only**, extract the book's distinct big ideas (book-faithful — the author's claims, not your gloss). Cluster them into **organic themes** and importance-rank both themes and the takeaways within them, per `reference/takeaway-contract.md` (§ "Organic theme clustering", § "Importance ranking", § "No caps"). `--depth` scales extraction depth, never a count ceiling. A thin book yields fewer themes — that is correct, not a failure.

## Phase 6: Distil PM-framed takeaways {#distil}

Apply the **five-part PM-lens contract** to every takeaway — idea → why it matters → product decision/tradeoff → concrete PM application → evidence — per `reference/takeaway-contract.md` § "The five-part PM-lens shape". Shape verbosity and vocabulary to the resolved audience × depth cell (`reference/audience-presets.md` § "Audience × depth matrix").

Apply the **grounding rule** (`reference/source-taxonomy.md` § "Grounding rule"): a takeaway resting only on T3 social material is **flagged** ("social-sourced, unverified against the author") or **dropped** — never silently shipped. Update each ledger entry's `grounds` to point at the takeaways it backs.

If the distillation needs a bounded extraction subagent for a large verified pool, dispatch it `model: sonnet` (§L — bounded, parent-validated work; not a frontier-judgment role).

## Phase 7: Eval & write {#eval-write}

**Reviewer pass (≤2 loops).** Dispatch a fresh `Task` subagent **`model: sonnet`** (bounded scoring behind a deterministic parent-side validator — §L) whose prompt inlines `reference/eval-rubric.md` verbatim, with the draft, the assembled `*.sources.json`, and the resolved preset + depth. It returns one JSON object per check `{check_id, verdict, fix_note, quote}` (`quote` = ≥40-char verbatim span grounding a fail) per `_shared/reviewer-protocol.md`. The reviewer **scores only — it MUST NOT edit**.

Parent-side (this skill): validate every `fail` quote is a ≥40-char verbatim substring of the draft or ledger — a fail whose quote misses is treated as `pass`. Auto-apply surviving fixes **once**, re-dispatch the reviewer **once** (cap = 2 loops). A surviving **hard** trust failure (R1–R3) blocks the normal write → emit honest degradation. Residual **advisory** failures (R6–R7) are surfaced in the run summary, never hidden.

**Honest degradation (D5).** When public material is thin: emit fewer themes, add an explicit "thin sourcing" banner naming what could not be verified, and never fabricate breadth or invent quotes. A book with no verifiable public material returns a clear "insufficient verified sources" result rather than a hallucinated summary.

**Write (atomic trio).** Emit per the `_shared/html-authoring/README.md` § "The authoring contract" checklist — render through `_shared/html-authoring/template.html` with the pmos-learnkit token values (`{{plugin_name}}` = `pmos-learnkit`, `{{plugin_version}}` read from `plugins/pmos-learnkit/.claude-plugin/plugin.json`, `{{pmos_skill}}` = `book-summary`). Write the `.html`, `.sections.json`, and `.sources.json` via temp-then-rename (all temps succeed before any `mv`). Every `<h2>`/`<h3>` carries a stable kebab `id` per `_shared/html-authoring/conventions.md §3`; `sections.json`'s id set equals the on-page id set in document order. Copy `assets/*` from the learnkit html-authoring substrate via `cp -n`; asset URLs carry `?v={{plugin_version}}` (cache-bust); the comments overlay rides the asset copy.

Artifact body shape: masthead (book identity) → "How to read this" / sourcing-trust note → ranked themes, each with its ranked PM-framed takeaways → a "Sources & trust" appendix mirroring the ledger.

**Library regen.** Regenerate `{book_summary_dir}/book-summaries.html` (one row per summary, newest first) per `_shared/html-authoring/index-generator.md`; give every manifest entry the literal `phase: "Book summaries"` so `viewer.js` renders one flat group. Exclude `book-summaries.html` itself and any `*.draft.html`. Atomic write.

## Phase 8: Capture Learnings {#capture-learnings}

**This skill is not complete until the learnings reflection has produced a one-line output.** Reflect on whether this session surfaced anything worth keeping under `## /book-summary` in `~/.pmos/learnings.md` (create the heading if missing) — surprising source-quality patterns per book genre, audience-shaping heuristics, AV-text-proxy edge cases, identity-match collisions. Emit exactly one of:

- `Learning: <new entry written to ~/.pmos/learnings.md under ## /book-summary>`
- `No new learnings this session because <specific reason tied to this session>` — the reason must be specific, not boilerplate.

Empty reflection (no line) counts as unfinished work. Skip silently only if the run errored before Phase 7 completion (the partial OQ buffer captures the failure context instead).

## Anti-Patterns (DO NOT)

1. **Citing a source from memory.** Every `<a href>` is a verbatim `*.sources.json[].url` member fetched + identity-matched this run. A remembered URL is a trust violation worse than thin sourcing.
2. **Shipping a T3-only takeaway as author-confirmed.** Social material corroborates; it never solely grounds a takeaway. Flag it or drop it (`reference/source-taxonomy.md` § "Grounding rule").
3. **Transcribing audio/video.** AV sources enter only as text proxies (show notes, transcripts, captions). No usable text → skip and log (D6).
4. **Capping themes or takeaways to a number.** Counts are book-driven and importance-ranked, never truncated or padded (`reference/takeaway-contract.md` § "No caps").
5. **Fabricating breadth for an obscure book.** Thin sourcing degrades visibly (fewer themes + banner), never with invented quotes or sources (D5).
6. **Dropping a PM-lens part to save space.** All five parts are mandatory at every depth; depth scales verbosity, not which parts appear.
7. **Summarizing a user-supplied file/PDF.** Out of scope — this skill curates *public* material about a *named* book. Respect paywalls; use the free-fetch ladder.

## Worked example

`/book-summary "Inspired" by Marty Cagan --depth standard`

- **Phases 1–2.** Settings give `docs_path=docs/pmos`; depth `standard` (source: default), audience `senior-pms`. Resolution confirms *Inspired: How to Create Tech Products Customers Love*, Marty Cagan, Wiley, 2017. Path: `docs/pmos/book-summary/2026-06-12_inspired.html`.
- **Phase 3.** Discovery surfaces an SVPG author essay + a Lenny's Podcast episode with a published transcript (T1), two outlet reviews (T2), and several LinkedIn book-notes (T3); one content-farm "summary" is dropped pre-fetch by the anti-slop gate.
- **Phase 4.** Survivors fetched + identity-matched; a YouTube summary with no captions is logged `skipped — no usable text`. 9 verified sources land in the ledger.
- **Phases 5–6.** Six organic themes (empowered teams, outcome over output, product discovery, …), importance-ranked; each takeaway carries the full five-part PM-lens shape; one LinkedIn-only angle is flagged social-sourced.
- **Phase 7.** Reviewer (sonnet) returns one R4 fail (a takeaway missing its "concrete PM application"); auto-apply adds it; re-run all-pass. Atomic trio written + `book-summaries.html` regen.

---

*Spec lineage: epic 0018 design contract at `docs/pmos/features/2026-06-12_book-summary-skill/02_design.html` (D1–D6, I1–I5); story 0019. Verification + authoring substrate reused from `_shared/topic-research/` and `_shared/html-authoring/`.*
