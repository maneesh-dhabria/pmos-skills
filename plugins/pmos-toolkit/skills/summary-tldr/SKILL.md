---
name: summary-tldr
description: Produces a faithful, grounded TL;DR of any single piece of user-supplied content — a web URL or article, raw pasted text, a PDF, a markdown file, an image, an email thread, a tweet thread, a podcast, or a video — at a user-confirmed compression target and in a chosen output style, then runs a first-time-reader review pass and saves a self-contained HTML artifact. Use when someone wants the actual claims, numbers, and takeaways of something they have no time to read in full — not a description of what it is about. Triggers when the user says "summarize this", "give me a TL;DR of <url>", "tldr this article", "key takeaways from this PDF", "summarize this podcast / email thread / tweet thread", "what does this actually say", "condense this for me", or "/summary-tldr". Every claim traces to source content fetched or extracted this run; nothing ships from memory. Offers compression bands (tight/standard/detailed), four output styles, shapes vocabulary to the audience, and can hand the result to /diagram.
user-invocable: true
argument-hint: "<source: URL | file path (pdf/md/image/txt) | pasted text> [--compression tight|standard|detailed] [--style bullets|exec|nested|layered] [--audience <who>] [--diagram] [--out <path>] [--non-interactive | --interactive]"
---

# Summary TL;DR

**Announce at start:** "Using summary-tldr to produce a grounded, compression-confirmed TL;DR of your source and save it as a self-contained HTML doc."

The one rule everything else serves: **a reader who never saw the original comes away with the source's actual claims, numbers, and takeaways — never a description of what the document is about.** `/summary-tldr` is a content/authoring utility beside `/polish`, `/artifact`, and `/diagram`. It is standalone — not a stage in the requirements→spec→plan pipeline, and it does not load workstream context. It summarizes ONE source per run; it does not synthesize across documents, rewrite the original (that is `/polish`), or translate.

## Flags & natural language

Natural-language-first (`skill-patterns.md §I`): every option also has a natural-language form — infer it from the request; an explicit flag overrides. Canonical phrasings: "just the gist" / "really tight" ≡ `--compression tight`, "give me the detail" ≡ `--compression detailed`, "as bullets" ≡ `--style bullets`, "write it as a paragraph" ≡ `--style exec`, "for an exec" / "for engineers" ≡ `--audience <who>`, "and draw it" ≡ `--diagram`. Contract flags (each passes the §I 4-test — typed value, machine coupling, or headless determinism): `--compression` and `--style` and `--audience` (typed values), `--out` (typed path), `--diagram` (pre-answers the Phase 7 diagram gate, `#diagram`), `--non-interactive`/`--interactive` (headless determinism). All are listed in `argument-hint`; there is no natural-language sugar flag to hide.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

<!-- defer-only: ambiguous -->
- **No `AskUserQuestion` available:** the input-kind disambiguation (Phase 2), the compression confirm (Phase 3), the style ask (Phase 4), and the diagram gate (Phase 7, `#diagram`) degrade to numbered free-form prompts per `_shared/interactive-prompts.md`. The non-interactive auto-pick contract (Recommended → AUTO-PICK) still applies.
- **No `WebFetch`:** URL sources cannot be ingested — refuse the URL input with a one-line note and ask for a paste; never summarize a remembered version of the page.
- **No vision `Read`:** image sources cannot be ingested — refuse with guidance; never invent the image's text.
- **No `Task` subagent:** the Phase 4 map-reduce chunk-summarize and the Phase 5 reviewer run inline in the host conversation instead of as dispatched subagents.
- **`/magazine` not installed (cross-plugin):** podcast and video sources degrade to "paste a transcript" inputs (Phase 2) — `transcribe.sh` lives in `pmos-learnkit`.

## Track Progress

This skill has 8 sequential phases (Setup, Ingest, Compress, Summarize, Review, Emit, Diagram, Capture Learnings). Create one task per phase using the host agent's task-tracking tool (e.g., `TaskCreate` in Claude Code). Mark each task in-progress when you start it and completed as soon as it finishes — do not batch completions.

**Emit precedes the diagram by design (crash-safety).** The Phase 5-approved summary is written to disk in Phase 6 (`#emit`) *before* the optional, slow, multi-turn `/diagram` loop runs in Phase 7 (`#diagram`). The approved text is therefore persisted by construction — a compaction or crash during the diagram loop cannot lose it, because the real artifact already holds it. No `.summary.tmp` side-file exists; the on-disk artifact is the single source.

## Phase 1: Setup & load learnings {#setup}

Inline `_shared/pipeline-setup.md` to: read `.pmos/settings.yaml` (REQUIRE `version` and `docs_path`), resolve `{docs_path}`, and resolve `{summary_tldr_dir} = {docs_path}/summary-tldr/` (`mkdir -p` if missing). HTML is the only emitted format; print to stderr `output_format: html`.

Read `~/.pmos/learnings.md` if present; factor in any entries under `## /summary-tldr`. The skill body wins on conflict — surface conflicts to the user before applying a learning.

**Parse arguments.** Positional `<source>` (a URL, a local file path, or pasted inline content). Flags `--compression <v>`, `--style <v>`, `--audience <who>`, `--diagram`, `--out <path>`, `--non-interactive`, `--interactive`. Any unknown flag, or `--compression`/`--style` with a value outside its enum → platform-aware error naming the valid set (per `_shared/platform-strings.md`); exit 64.

**Resolve the dials.** `--compression` and `--style` may persist per-project (the `/primer` lastrun pattern, optional): `cli > .pmos/summary-tldr.lastrun.yaml > skill default`. Defaults: compression `standard`, style `bullets`. After a run, persist the resolved values atomically (temp-then-rename). Print to stderr `compression: <band> (source: <cli|lastrun|default|confirmed>)` once the band is final (Phase 3 may update it).

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

## Phase 2: Ingest the source {#ingest}

Detect the source kind, preprocess it to clean text, and record `source_kind` + an `extraction_confidence` signal — all per `reference/input-dispatcher.md`. The dispatcher reuses the `/polish` input resolver (local path → `Read`; `http(s)://` → `WebFetch`; `notion://` → Notion MCP; inline → the argument is the doc) and adds the media, email, and tweet-thread preprocessors. Podcast/video transcription resolves `/magazine`'s `scripts/transcribe.sh` at runtime (cross-plugin) and degrades to "paste a transcript" when `pmos-learnkit` is absent.

**Honest degradation (I5):** when extraction or transcription confidence is low — a scanned PDF, an illegible image, a fetch failure, no transcript path — FLAG it (summarize only what was actually extracted, and say so) or REFUSE that input with concrete guidance. Never fabricate, and never silently summarize degraded or absent text.

When the input kind is genuinely ambiguous (e.g. a pasted blob that could be an email thread or an article):

<!-- defer-only: ambiguous -->
- `AskUserQuestion` — `"What is this input?"` with the 2–4 most likely kinds + `Other (free-form)`. Under non-interactive mode this DEFERs: AUTO-PICK the highest-confidence detection and record the assumption in the OQ buffer (reason `input-kind-ambiguous`).

## Phase 3: Confirm the compression target {#compress}

For text sources, the **model never computes the numbers** — run the script (`skill-patterns.md §H`):

```
node ${CLAUDE_PLUGIN_ROOT}/skills/summary-tldr/scripts/compression.js <source_word_count> [--band <resolved-band>]
```

It returns the band's percentage range, the length-scaled `word_cap`, and the capped `final_low`–`final_high` target. Render that to the user and confirm (I3):

- `AskUserQuestion` — `"Summarize at which compression?"` options **Standard (~20–30%) (Recommended)** / **Tight (~10–20%)** / **Detailed (~30–40%, longer)**. The Detailed option carries the "this will be long" nudge. `--compression` pre-answers this and skips the prompt. Under non-interactive mode, AUTO-PICK Standard (the Recommended option).

Non-text sources (a single image, a short tweet) have no meaningful source-length %, so propose a target LENGTH directly per `reference/compression-model.md` (e.g. 40–80 words) instead of running the ratio script. The resolved target gates Phase 4 generation.

## Phase 4: Summarize (extract-then-generate) {#summarize}

Run the grounded pipeline in `reference/summary-pipeline.md`: **map-reduce chunk** if the source is long (segment → summarize each chunk → synthesize, to defeat the lost-in-the-middle bias), **extract a keyfact list** (claims, numbers, named conclusions, entities — grounding-by-construction), then **generate** to cover and assert those keyfacts at the confirmed compression target and the chosen `--style` (default `bullets`) per `reference/output-styles.md`. Every style front-loads the conclusion (BLUF). Shape vocabulary and depth to `--audience` when given.

**Grounding hard rule (I1/I2):** assert, don't describe — the summary states the source's claims directly; "this article discusses X" / "the document explains Y" meta-description is a hard fail (caught in Phase 5). No claim may be absent from the source; nothing comes from model memory; exact numbers, entities, and named conclusions are preserved.

If a bounded subagent is dispatched to summarize a chunk, dispatch it **`model: sonnet`** (§L — bounded, parent-validated work, not a frontier-judgment role).

## Phase 5: First-time-reader review pass {#review}

Before emit, run the review pass in `reference/review-rubric.md` from the perspective of a reader who never saw the original: **coverage** (every source keyfact present), **faithfulness** (every sentence traces to source; scan the 7 error types), **standalone** (no dangling references or undefined pronouns), **asserts-not-describes** (meta-description = hard fail → rewrite to the actual claim), **coherence**. Apply the inlined `/polish` writing checks the same pass — deterministic checks (clutter, AI-slop hard-bans, em-dash, hedging) auto-apply; judgment checks surface per `_shared/findings-dispositions.md`.

Dispatch the reviewer as a fresh `Task` subagent **`model: sonnet`** per `_shared/reviewer-protocol.md` (it scores only — it MUST NOT edit); any faithfulness/coverage `fail` must cite a ≥40-char verbatim source quote, and a fail whose quote misses is treated as `pass`. Auto-apply surviving fixes, re-run **once** (≤2-loop cap). Surface a coverage/faithfulness signal (matched-keyfacts ratio) to the user; residual gaps are surfaced in the artifact, never hidden.

## Phase 6: Emit the artifact {#emit}

Emit the full, Phase 5-approved summary to disk **now — before the optional diagram loop** (this is the crash-safety guarantee: the approved text is persisted by construction, so a compaction or crash during Phase 7's slow `/diagram` loop cannot lose it).

**Emit per `_shared/html-authoring/README.md` checklist.** Deltas: artifact = `{summary_tldr_dir}/{YYYY-MM-DD}-<slug>.html` (slug derived from the source title/topic; `--out` overrides the path), `{{pmos_skill}}` = `summary-tldr`, `{{plugin_version}}` read from `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json`. Write the `.html` and `.sections.json` via temp-then-rename; every `<h2>`/`<h3>` carries a stable kebab `id` per `_shared/html-authoring/conventions.md`; copy `assets/*` via `cp -n` (the comments overlay rides along); asset URLs carry `?v=<plugin-version>`.

The artifact carries a **provenance block** (`source_kind`, URL/filename, `extraction_confidence`, retrieval timestamp) and surfaces the Phase 5 coverage/faithfulness signal. Body shape: BLUF line → the summary (in the chosen style) → an **empty reserved diagram slot** → "Source & confidence" appendix. The diagram slot is an empty placeholder element with a stable id (e.g. `<figure id="summary-diagram" data-diagram-slot></figure>`) that Phase 7 fills in place; if the diagram gate resolves to Skip the empty slot is left as-is (renders to nothing).

Render the "Source & confidence" appendix as a **compact two-column `<table>`** (not a `<dl>`) — one row per fact: Source kind / Source path / Extraction confidence / Source date / Coverage signal — under an `<h2>` with a stable kebab `id` (e.g. `id="source-and-confidence"`) per `_shared/html-authoring/conventions.md`.

**Library regen.** Regenerate `{summary_tldr_dir}/summary-tldr.html` (one row per past summary, newest first) per `_shared/html-authoring/index-generator.md`; give every manifest entry the literal `phase: "Summaries"` so the viewer renders one flat group. Exclude `summary-tldr.html` itself. Atomic write.

## Phase 7: Optional diagram {#diagram}

With the summary already on disk (Phase 6), offer the optional gate:

- `AskUserQuestion` — `"Convert this summary into a diagram?"` options **Skip (Recommended)** / **Run /diagram**. `--diagram` pre-answers Run. Under non-interactive mode, AUTO-PICK Skip.

On Run, the **main agent** (never a subagent — skills cannot invoke skills) calls `/diagram --source <summary.md> --theme editorial --non-interactive --on-failure drop`, then **validates the returned SVG before injecting** (it parses, carries the dark-mode background `<rect>`, and the post-insert heading-id smoke stays green). It then **injects the validated SVG into the already-emitted on-disk artifact**: read the `.html` file → replace the reserved diagram slot (`#summary-diagram`) with the SVG → rewrite via atomic temp-then-rename → regenerate the library index. Same handoff + validation pattern as `artifact/SKILL.md#diagram-pass`.

On **any** diagram or validation failure: leave the emitted summary on disk **intact** (no rollback — the approved text is already safe), log the failure, and continue. The on-disk artifact is the single source; never write a `.summary.tmp` side-file.

## Phase 8: Capture Learnings {#capture-learnings}

**This skill is not complete until the learnings reflection has produced a one-line output.** Read and follow `_shared/learnings-capture.md`. Reflect on whether this session surfaced anything worth keeping under `## /summary-tldr` in `~/.pmos/learnings.md` (create the heading if missing) — false-positive review checks, extraction-confidence edge cases, cross-plugin `transcribe.sh` resolution gaps, a source kind that degraded surprisingly. Emit exactly one of:

- `Learning: <new entry written to ~/.pmos/learnings.md under ## /summary-tldr>`
- `No new learnings this session because <specific reason tied to this session>` — the reason must be specific, not boilerplate.

Empty reflection (no line) counts as unfinished work. Skip silently only if the run errored before Phase 7 completion (the partial OQ buffer captures the failure context instead).

## Anti-Patterns (DO NOT)

1. **Describing instead of asserting.** "This article discusses remote-work trade-offs" is a hard review fail. State the claim: "Remote work cut office costs 40% but lengthened code-review turnaround from 4 to 11 hours." The whole skill exists to make the second sentence, not the first.
2. **Summarizing from memory.** Every claim traces to source content fetched/extracted this run. A half-remembered version of a famous article is a trust violation, not a shortcut.
3. **Fabricating through a degraded source.** A scanned PDF that barely OCRs, an illegible image, a podcast with no transcript path — flag or refuse with guidance. Never invent the text you could not read (I5).
4. **Computing the compression numbers by hand.** The band → target-range → cap arithmetic is `scripts/compression.js`'s job (§H). The model renders and confirms; it does not calculate.
5. **Skipping the compression confirm.** The target is proposed and confirmed (or set by `--compression`) before generating — never summarize first and trim to fit later (I3).
6. **Single-passing a long source.** Long sources are chunk-and-synthesized (map-reduce); a single pass drops mid-document facts (the lost-in-the-middle bias).
7. **Invoking `/diagram` from a subagent.** The diagram handoff runs from the main agent only, and the returned SVG is validated before it is injected into the on-disk artifact — never blind-insert.
8. **Letting the Phase 5 reviewer edit.** The reviewer scores and cites only; this skill applies the fixes. A reviewer that edits while reviewing makes the pass unreproducible.
9. **Running the slow diagram loop before the first emit.** The approved summary is emitted to disk in Phase 6 (`#emit`) *before* the optional `/diagram` step in Phase 7 (`#diagram`). Never run the multi-turn diagram loop between Phase 5 approval and the first on-disk emit — that is the data-loss window a compaction would hit. The on-disk artifact is the single source of truth; do not introduce a `.summary.tmp` to "stage" the approved text (the real artifact already is the persistence).

## Worked example

`/summary-tldr https://example.com/the-remote-work-report --compression standard --style bullets`

- **Phases 1–2.** Settings give `docs_path=docs/pmos`; compression `standard` (source: cli), style `bullets`. The source is an `http(s)://` URL → `WebFetch`, stripped to ~3,200 words of clean text; `source_kind: web-url`, `extraction_confidence: high`.
- **Phase 3.** `compression.js 3200 --band standard` → target 640–960, `word_cap` 481 → `final` 481–481 (capped — a long report still yields a TL;DR). Confirmed.
- **Phase 4.** Source is long → map-reduce over four sections; keyfacts extracted (the 40% cost figure, the 4→11h review-turnaround number, the 3 named recommendations); generated as front-loaded bullets asserting each keyfact.
- **Phase 5.** Reviewer (sonnet) flags one faithfulness miss — a bullet said "most teams" where the source said "two of nine teams"; auto-applied; re-run all-pass. Coverage 12/12 keyfacts surfaced.
- **Phase 6 (emit).** Artifact written to `docs/pmos/summary-tldr/2026-06-13-remote-work-report.html` + `.sections.json` **first** (BLUF → bullets → empty `#summary-diagram` slot → compact "Source & confidence" `<table>`); provenance block records the URL + high confidence; `summary-tldr.html` library regenerated. The approved text is now persisted regardless of what happens next.
- **Phase 7 (diagram).** Diagram skipped (Recommended) → the empty `#summary-diagram` slot renders to nothing, the on-disk artifact is unchanged. (Had `--diagram` been passed, `/diagram` would run, the validated SVG would be injected into that same on-disk file via atomic rewrite, and the index re-regenerated.)

---

*Spec lineage: epic 0612-h2j design contract at `docs/pmos/features/2026-06-12_summary-tldr-skill/02_design.html` (D1–D4, I1–I6); story 0612-ejq. Authoring + emit substrate reused from `_shared/html-authoring/`, `_shared/non-interactive.md`, `_shared/findings-dispositions.md`, `_shared/reviewer-protocol.md`; `/polish` resolver + rubric and `/magazine` `transcribe.sh` cited per the input dispatcher.*
