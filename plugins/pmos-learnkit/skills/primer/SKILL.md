---
name: primer
description: Produces a verified-source, audience-shaped HTML primer on any topic — researched, outlined, drafted, and self-evaluated into a single teachable artifact. Use to ramp-up before a meeting / a scope / a doc review, when the user needs to learn a topic quickly with citations they can trust. Triggers when the user says "write me a primer on X", "ramp me up on Y", "generate a primer", "I need to learn about Z before a meeting", or "/primer". Shapes depth, jargon, and examples to the chosen audience (senior-pms vs all-pms) and supports explicit sizing via --depth brief|standard|deep (the default depth tier is persisted per-project after the first run). Prefers primary sources over secondary commentary. Ships a pre-built corpus of curated PM primers plus a `browse`/`list` verb (also bare `/primer`) that builds a single filterable, searchable, offline library page of all primers — curated and your own. Also triggers on "browse my primers", "primer library", or "list primers".
user-invocable: true
argument-hint: "[<topic> | browse | list] [--audience <senior-pms|all-pms>] [--depth <brief|standard|deep>] [--autonomous] [--non-interactive] [--interactive]"
---

# Primer

**Announce at start:** "Using primer to research and draft a teachable artifact on the requested topic."

The one rule everything else serves: **every claim a reader might act on traces to a source fetched this run.** The front half (canon → outline → verified sourcing) is the shared `_shared/topic-research/` substrate — the same mechanism `/learn-list` uses; it emits typed outputs and `/primer` owns only its reactions plus the back half (curator-voiced draft, eval, write).

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

<!-- defer-only: ambiguous -->
- **No `AskUserQuestion` available:** intake confirmation, audience selection, and the lastrun consolidated confirm degrade to numbered free-form prompts per `_shared/interactive-prompts.md`. The non-interactive auto-pick contract (Recommended → AUTO-PICK) still applies.
- **No `Task` subagent:** the Phase 5 reviewer runs inline in the host conversation; research and drafting already run inline.
- **No browser / no Playwright (browse phase):** `build-library.mjs` still writes `library.html`; opening it is best-effort. If no opener is available, print the absolute path and stop — the page is on disk and opens from `file://` whenever the user is ready. Never treat a failed open as a run failure.
- **No `WebFetch`:** Phase 3 verification is impossible — fall back to context7 MCP (if available) plus user-supplied URLs/snippets, and surface the degraded-source warning per `reference/source-floor.md` §"WebFetch unavailable".
- **No `context7` MCP:** research falls back to `WebFetch` plus user-supplied material; if neither is available, refuse with a clear message naming the missing tools and exit 64.
- **No Playwright MCP:** social sources are fetched through the shared free-fetch ladder in `_shared/topic-research/sourcing-ladder.md` with `reference/social-sourcing.md` carrying `/primer`'s citation discipline. Only the last-resort rung (un-unrolled X threads; member-only LinkedIn posts) is lost; such candidates are dropped silently rather than blocking the run.

## Track Progress

This skill has 7 sequential phases (Setup, Intake, Canon & Outline, Sourcing, Draft, Eval + Write, Capture Learnings). Create one task per phase using the host agent's task-tracking tool (e.g., `TaskCreate` in Claude Code). Mark each task in-progress when you start it and completed as soon as it finishes — do not batch completions.

## Phase 0: Setup + Load Learnings {#setup}

Inline `_shared/pipeline-setup.md` to: read `.pmos/settings.yaml` (REQUIRE `version` and `docs_path`), resolve `{docs_path}`, and resolve `{primer_dir} = {docs_path}/primer/` (mkdir -p if missing). HTML is the only emitted format; print to stderr `output_format: html`.

Read `~/.pmos/learnings.md` if present; factor in any entries under `## /primer`. The skill body wins on conflict — surface conflicts to the user before applying a learning.

Capture a Phase-0 wall-clock timestamp (used by the lastrun update in Phase 5 to compute `last_elapsed_seconds`).

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

## Phase 1: Intake {#intake}

**Verb dispatch (before anything else).** If the first token is exactly `browse` or `list`, **or** the invocation carries no topic at all (bare `/primer` with only flags or nothing), this is a library request, not a research run: go straight to the **Browse the library** phase ([`#browse`](#browse)) and skip Phases 2–6 entirely. Otherwise the first token is the `<topic>` and the research pipeline below runs.

**Parse arguments.** Positional `<topic>` (1st arg, may be multi-word — strip surrounding quotes); flags `--audience <v>`, `--depth <v>`, `--autonomous`, `--non-interactive`, `--interactive`. Any unknown flag, or `--depth` / `--audience` with a value outside its enum → platform-aware error naming the valid set (per `_shared/platform-strings.md`); exit 64. Derive `<slug>` per `_shared/canonical-path.md` slug rules; the canonical artifact path is `{docs_path}/primer/{YYYY-MM-DD}_<slug>.html` (today's UTC date).

**Lastrun consolidated confirm.** Read `.pmos/primer.lastrun.yaml` if present (shape: `last_topic`, `last_audience`, `last_depth`, `last_artifact_path`, `last_elapsed_seconds`). If present and `--autonomous` is NOT set, surface one prompt seeded from the prior values:

- `AskUserQuestion` — `"Use last-run defaults? audience=<v>, depth=<v>"` options: `Use last values (Recommended)` / `Edit audience` (re-prompt below) / `Edit depth` (re-prompt below).

Under `--autonomous`, skip this gate: apply lastrun values when present, else built-in defaults (`audience=senior-pms`, `depth` per the precedence below — silently, without writing settings). If no lastrun file exists, skip silently — the dial resolution below prompts instead.

**Dial resolution (the substrate owns the dials).** **Inline `_shared/topic-research/intake.md`** and follow it — it is the single home for `--depth`/`--audience` semantics, the phrasing cues that suggest a depth, the depth→coverage dial matrix Phases 2–3 size against, and the topic-richness classifier. `/primer` supplies its persisted defaults into intake's fallback chain:

- **depth:** `cli --depth > settings.default_primer_depth > lastrun.last_depth > first-run prompt (below)`. After resolution, print to stderr exactly: `depth: <tier> (source: <cli|settings|lastrun|prompt>)`.
- **audience:** `cli --audience > lastrun.last_audience > intake.md's audience prompt` (Recommended = `senior-pms`; auto-picked under non-interactive mode).

**First-run depth prompt.** Only when no flag, no settings default, no lastrun, and not `--autonomous`:

- `AskUserQuestion` — `"Preferred default depth for primers in this project?"` options: `standard (Recommended)` (typical senior-PM topics) / `brief` (fast ramp, narrow topics) / `deep` (broad multi-camp topics). On answer, write `default_primer_depth: <tier>` to `.pmos/settings.yaml` via atomic temp-then-rename, preserving other keys. Subsequent runs read it silently; `--depth` still overrides per-run.

**Topic vagueness.** If the topic looks too vague to research (e.g., one or two generic words), ask:

<!-- defer-only: ambiguous -->
- `AskUserQuestion` — `"Topic looks ambiguous. Pick a refinement or write your own:"` with 3 LLM-generated candidate refinements + `Other (free-form)`. Deferred default: proceed with the topic as given (OQ reason `topic-vague`).

**Richness reaction (this skill's reaction; the classifier is intake.md's).** `rich` → proceed. `narrow-by-design` → set `state.richness = "narrow-by-design"` (consumed by Phase 2 outline shaping) and proceed. `thin` →

<!-- defer-only: ambiguous -->
- `AskUserQuestion` — `"Topic '<topic>' looks too narrow to support a primer-shaped artifact. Pick a reframing or proceed:"` with the 3 reframings from the classifier verbatim, `Keep as-is (will produce a thin primer)`, `Abort`. Deferred default: `Keep as-is` (OQ reason `topic-thin`).

**Path collision.** If the canonical path already exists:

<!-- defer-only: destructive -->
- `AskUserQuestion` — `"<path> already exists. Choose:"` options: `Append -2 suffix (Recommended)` (lowest unused integer suffix) / `Overwrite (git-snapshot first)` (runs `git stash push --keep-index -m "primer-overwrite-{slug}-{date}"`) / `Abort`.

See `reference/audience-presets.md` for the per-preset required-sections / vocab posture / closing-shape contract downstream phases consume.

## Browse the library {#browse}

Reached from the Phase-1 verb dispatch (`browse` | `list` | bare `/primer`). This is a read-only, terminal path — no research, no `AskUserQuestion`, no file mutation beyond the regenerable page.

Build the library page from the committed corpus (shipped at `${CLAUDE_SKILL_DIR}/data/primers-index.json` + `data/primers/*.html`) plus any user-generated primers already in `{docs_path}/primer/`:

```
node ${CLAUDE_SKILL_DIR}/scripts/build-library.mjs --out {docs_path}/primer/library.html
```

`build-library.mjs` (zero-dep Node ESM) emits **one** self-contained `library.html` that works offline from `file://`, built on the shared `_shared/library-viewer/` substrate at full feature parity with `/frameworks`: every primer becomes a card (title, category, audience, depth, source-count, word-count, date). Selecting a card **opens the primer in-page** in the substrate's sidebar reader — a lazy, sandboxed `<iframe>` of the primer's own standalone HTML (only the opened primer loads; never all 60+), with an **"Open in new tab"** affordance and an empty-state when nothing is selected. The shipped corpus shows under **Collection = Curated**; primers found in the output directory show under **Collection = Yours**. Three views (compact / detailed / list, list default), client-side facets — **Collection / Area / Depth** single-select (Area shows display labels via `valueLabels` while filtering on the raw value) and **Category / Audience** multi-select dropdowns (Category type-to-filter) — free-text search, and removable applied-filter chips. The masthead subtitle count is dynamic (`{count}` → `#subtitleCount`, read from the corpus length at runtime — never hard-coded). The page is gitignored (committed corpus, regenerable output — mirrors `/frameworks`).

After writing, open it best-effort (`open`/`xdg-start`/`start`, or the platform default) and **print the absolute path** so the user can open it themselves. Opening is never load-bearing — see the Platform Adaptation note. Then exit cleanly (the research phases do not run).

## Phase 2: Canon & Outline (shared front half) {#canon-outline}

**Inline `_shared/topic-research/canon-discovery.md`** and follow it — find the field's practitioners + canonical books + existing curations by live search (never from memory), sized by the dial matrix. It emits the `canon` set. **Then inline `_shared/topic-research/outline.md`** and follow it — derive the outline by cascade, record the provenance rung (surfaced in the artifact TL;DR), dedupe topics before sourcing, and run the confirm gate.

`/primer`'s reactions to the substrate output:

- **Audience-preset shaping.** Bias the topic set toward the resolved preset's required-sections floor per `reference/audience-presets.md`; target a 10–14 H2 outline. The substrate gives the field's structure; the preset adds the teach-sections `/primer` requires.
- **Narrow-by-design carve-out.** If `state.richness == "narrow-by-design"`, include a one-line `## Decision guide deferred — topic narrow-by-design` note in place of the usual decision-guide H2; all other required sections remain.
- **Outline confirm gate** — realized as `/primer`'s richer version:

<!-- defer-only: ambiguous -->
- `AskUserQuestion` — `"Outline ready (provenance: <rung>). Approve, edit, or re-prompt?"` options: `Approve outline (Recommended)` / `Edit` (apply free-form edits, re-render once; re-surface if more edits wanted) / `Re-prompt with feedback` (regenerate under new framing) / `Abort` (exit cleanly; nothing written).

## Phase 3: Verified per-topic sourcing (shared front half) {#sourcing}

Sourcing runs **after** the outline is confirmed (never source the wrong topics). **Inline `_shared/topic-research/sourcing.md`** and follow it — per confirmed topic, run the rank-then-verify loop and emit one verified, ranked, annotated shortlist (candidate pool pre-stocked from `canon.curations`; est-cost line before the first fetch). The anti-slop hard gate + tier ranking live in `_shared/topic-research/source-tiers.md`; the verification pass-bar + free-fetch ladder + book summaries in `_shared/topic-research/sourcing-ladder.md`. Run the loop inline (no subagents; tool-level fetch parallelism only).

<!-- nl-sugar -->
**Optional curated-references overlay.** When `_shared/topic-research/curated-references.json` is present, the substrate augments each topic's candidate pool from that pre-curated corpus and hard-gates / fetch-verifies it identically to live sources — mechanism (prefilter, coverage gate, suppression) lives in `_shared/topic-research/curated-references.md`; nothing in this skill changes. Suppress it with `--no-curated` (a boolean suppression toggle inferred from natural language — parsed as a silent alias per §I, not an advertised contract flag).

`/primer`'s reactions to the substrate output:

- **Per-H2 evidence map.** Each topic's verified shortlist is the evidence set for the corresponding `<h2>` in Phase 4 — keep the per-topic structure, never flatten. Read + synthesize **every** verified source; the `--depth` dial is the sole cost governor (no short-circuit).
- **`sources.json` assembly** — the canonical schema, stated once here: the union of all per-topic shortlists, each entry `{url, takeaway, topic, tier, paywalled?, free_alt?, book_summary?}`. Persisted to `{docs_path}/primer/{date}_{slug}.sources.json` in Phase 5's atomic trio (the recovery path may persist it earlier). The `takeaway` is the grounded ≤2-sentence summary Phase 4 cites from.
- **Books/paid courses** are cited with the **free entry-point URL** as the `<a href>` (the book attributed in prose, e.g. "Ramanujam, *Monetizing Innovation* (Wiley, 2016)"); no paid landing-page URLs. The free-entry URL MUST be a verbatim `sources.json[].url` member.
- **Source floor as an eval-time coverage signal.** The floor (brief=6, standard=10, deep=15 total verified sources) is NOT a sourcing gate and never short-circuits or caps sourcing. After sourcing settles, if `count < floor`, surface the thin-source disclosure per `reference/source-floor.md` — informational, never blocking.

**WebFetch unavailable:** follow `reference/source-floor.md` §"WebFetch unavailable" — verification is impossible, so surface the degraded-source warning rather than emitting unverified links.

## Phase 4: Draft {#draft}

Single-pass draft against the approved outline, held in working memory (the file write happens in Phase 5). Soft word targets by depth — the reviewer reports actual `word_count` informationally, no hard block: **brief** 2,000–3,000 / **standard** 4,000–6,000 / **deep** 7,000–10,000.

- **Curator-lens framing.** Inline `reference/curator-lens.md` §"Phase-4 framing prompt" verbatim into the draft context, with `<topic>` and `<audience>` substituted. It teaches curator voice (selects + frames + attributes named camps) over explainer voice — **the load-bearing quality lever**; if drafts come back explainer-voiced, edit that file first.
- **Per-H2 evidence.** Each `<h2>` synthesizes from its topic's verified shortlist — every source in it.
- **Citation discipline.** Every `<a href>` URL MUST be a verbatim member of `sources.json[].url` — no novel URLs in Phase 4. The reviewer's R1 check enforces this when it runs; at `brief`/`standard` (reviewer skipped) this draft-time rule is the sole enforcement.
- **Audience vocab posture** per `reference/audience-presets.md` for the resolved preset.
- **Inline SVG diagrams** where a concept has a structural shape prose explains awkwardly (loop, comparison, hierarchy, sequence, state machine, 2×2): literal inline `<svg>` (no external assets — preserves the single-file contract), `<title>` first child for accessibility, styled per `reference/diagram-style.md`. Do NOT invoke `/diagram`. Diagrams are an affordance, not a per-section requirement — one well-chosen diagram saves a paragraph; a forced one is decoration displacing citation density.
- **Adjacency pointers.** Close with `## Where this connects — adjacent topics`: pointers, not teaching — one line per adjacent topic, hops per the intake.md dial matrix (`brief` omits the section; `standard` ~2–3 pointers; `deep` ~4–6). Do NOT source, verify, or teach them (unlike `/learn-list`'s verified rabbit holes — `/primer` only points).

## Phase 5: Eval + Write {#eval-write}

**Reviewer trigger (opt-in).** The reviewer (steps 1–5) runs only at `--depth deep` or on explicit user request. At `brief`/`standard`, skip to the write gate — the draft-time trust rules (citation discipline, grounded takeaways, required-sections contract, `sections.json` construction) enforce the same invariants at construction time, and observed runs at these depths returned all-pass every time. When skipped, the write-gate question reads `"Draft ready (reviewer skipped at this depth). Approve, iterate, or abort?"` and the informational notes are omitted.

1. **Reviewer dispatch.** Dispatch a fresh `Task` subagent whose prompt inlines `reference/rubric.md` **verbatim**, with the draft prose, the assembled `sources.json`, the resolved preset and depth. It returns one JSON array — one object per check `{check_id, verdict, evidence, quote}`, plus informational fields on R10 (`examples_per_h2_distribution`, `word_count`, `diagrams_per_h2_distribution`) per the rubric. The reviewer scores only — it MUST NOT edit the draft. It does not re-fetch URLs: R1 is a membership test against `sources.json[].url`.
2. **Orchestrator-side validation** (the orchestrator, not the reviewer): (a) the returned `check_id` set MUST equal rubric.md's 10 IDs — on mismatch, hard-fail with the precise diff; (b) every `fail` quote MUST be a ≥40-char verbatim substring of the draft (or of `sources.json[].takeaway` for R2) — a fail whose quote misses is treated as `pass` (defense against hallucinated quotes).
3. **Auto-apply, once.** If any fail survives, `/primer` (the writer) patches the draft inline, then re-dispatches the reviewer **once**. Iteration cap = 1 — the original spec explicitly rejects unbounded refinement loops.
4. **Trust-tier hard-block.** If any trust check (R1, R2, R3, R6, R7) still fails after the re-run, execute the recovery path (below) and exit.
5. **Taste-tier residuals.** If only taste checks (R4, R5, R8, R9, R10) fail:

   <!-- defer-only: ambiguous -->
   - `AskUserQuestion` — `"Taste-tier residuals: <failing check_ids>. Accept and ship, iterate manually, or abort?"` options: `Accept as known risk and write (Recommended)` (ships with a "Known residuals" footer note) / `Iterate manually` (exit to chat with the evidence) / `Abort`.

6. **Write gate.** When not hard-blocked, before the final write:

   <!-- defer-only: ambiguous -->
   - `AskUserQuestion` — `"All checks resolved. Approve, iterate, or abort?"` options: `Approve and write (Recommended)` / `Iterate manually` / `Abort`. Under `--autonomous` this AUTO-PICKs approve; the hard-block and residual disclosure above still apply. When the reviewer ran, mention in the question text any off signals from R10's informational fields (worked-example-free H2s ≥30%; word count outside the depth target) — informational only, never blocking.

7. **Write (atomic trio).** On approve, write `{date}_{slug}.html`, `.sections.json`, and `.sources.json` via temp-then-rename — all three temps succeed before any `mv`; on any rename failure, `rm` the temps and abort (no partial states).

   **The primer HTML MUST be rendered by the deterministic substrate renderer — never hand-authored.** Do NOT clone an existing primer file and swap its body: that path reproduces stale chrome and silently drops the `<main class="pmos-artifact-body">` wrapper (the bug that left custom-generated primers full-bleed and unnumbered while curated ones rendered as an 880px column with `[NN]` section signatures). Render through `render.js` → `renderArtifact()` with a **content-only** `{{content}}` fragment — the body sections **only**, with **no** `<header class="pmos-artifact-toolbar">`, **no** `<main class="pmos-artifact-body">`, and **no** `<h1 class="pmos-doc-title">`. Those three come from `template.html` itself (lines `<main class="pmos-artifact-body" data-pmos-role="body">` → `<h1 class="pmos-doc-title">{{title}}</h1>` → `{{content}}` → `</main>`); authoring them into `content` double-nests or omits them.

   ```js
   const { renderArtifact } = require('${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/render.js');
   const fs = require('fs');
   let template = fs.readFileSync('${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/template.html', 'utf8');
   // GOTCHA (regression-tested by the substrate's render tests): strip template.html's
   // leading <!-- … --> doc-comment before rendering — otherwise the {{content}}/{{inline_css}}
   // tokens inside that comment get substituted too and the body emits twice.
   template = template.replace(/^\s*<!--[\s\S]*?-->\s*/, '');
   const pv = JSON.parse(fs.readFileSync('${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json','utf8')).version; // fail-fast if unparseable
   const html = renderArtifact({
     template,
     title: '<primer title> — Primer',
     content,                                    // body sections ONLY (the {{content}} fragment)
     sourcePath: '{date}_{slug}.html',
     assetPrefix: 'assets/',
     pluginVersion: pv,                          // the LEARNKIT version → asset ?v= cache-bust
     pmosSkill: 'primer',
     pluginName: 'pmos-learnkit',
     pluginNameNbsp: 'pmos&#8209;learnkit',
     pluginUrl: 'https://github.com/maneesh-dhabria/pmos-skills/tree/main/plugins/pmos-learnkit#readme', // footer wordmark + attribution
     repoUrl: 'https://github.com/maneesh-dhabria/pmos-skills',                                          // header brand-mark wordmark
   });
   ```

   **Post-render structural self-check (HARD — catches a hand-authored emit before it lands).** Before the `mv`, assert against the rendered `html` string: it contains **exactly one** `<main class="pmos-artifact-body" data-pmos-role="body">` AND **exactly one** `<h1 class="pmos-doc-title">`, and the `content` fragment you passed contains **zero** of `pmos-artifact-toolbar` / `pmos-artifact-body` / `pmos-doc-title` (proves you passed a content-only fragment, not a full document). Any assertion failing means the render was bypassed/hand-authored — discard the temp, re-render through `renderArtifact()`, do not `mv` a non-conforming file.

   Copy `assets/*` from the learnkit html-authoring substrate to `{docs_path}/primer/assets/` via `cp -n`. Every `<h2>`/`<h3>` carries a stable kebab-case `id` per `_shared/html-authoring/conventions.md §3`, and `sections.json`'s id set MUST equal the on-page id set in document order (rubric R7 enforces).
8. **Listing regen.** Regenerate the unified library page by invoking the browse generator — `node ${CLAUDE_SKILL_DIR}/scripts/build-library.mjs --out {docs_path}/primer/library.html` — so the just-written primer (now on disk in `{docs_path}/primer/` under `Collection = Yours`) appears alongside the shipped corpus on one page. This **replaces** the old bespoke `primers.html` generator (one listing page, one code path — see [`#browse`](#browse)); the script already excludes the library page itself and any `*.draft.html`. Best-effort remove a stale `{docs_path}/primer/primers.html` if present. (The recovery path in step 10 still skips this regen.)
9. **Update lastrun.** Write `.pmos/primer.lastrun.yaml` (`last_topic`, `last_audience`, `last_depth`, `last_artifact_path`, `last_elapsed_seconds` from the Phase-0 timestamp). Gitignore is handled at the repo level by /complete-dev.
10. **Recovery path (trust hard-block).** When step 4 triggers: persist `sources.json` to its canonical path (research is not discarded); write the rejected draft to `{date}_{slug}.draft.html` with a sticky-top red banner `<div class="primer-rejected-banner" role="alert">REJECTED BY REVIEWER — DO NOT TRUST</div>` (inline CSS, e.g. `position:sticky;top:0;z-index:100;background:#b00020;color:#fff;font-size:1.25rem;padding:1rem;text-align:center`) followed by a `## Failing checks` section (each failing trust check with verdict + quote + evidence) above the full draft body. Print verbatim: `Trust-tier check '<name>' failed after auto-apply iteration. Hard-block: no primer artifact written. Draft preserved at <path>.draft.html for review. Manually patch and rerun, or rerun fresh.` Do NOT regenerate `library.html`; do NOT update lastrun.

## Phase 6: Capture Learnings {#capture-learnings}

**This skill is not complete until the learnings reflection has produced a one-line output.** Reflect on whether this session surfaced anything worth keeping under `## /primer` in `~/.pmos/learnings.md` — surprising source-quality patterns, audience-shaping heuristics, rubric edge-cases, framing-prompt failures that ended in recovery. Emit exactly one of:

- `Learning: <new entry written to ~/.pmos/learnings.md under ## /primer>`
- `No new learnings this session because <specific reason tied to this session>` — the reason must be specific, not boilerplate.

Empty reflection (no line) counts as unfinished work. Skip silently only if the run errored before Phase 5 completion (the partial OQ buffer captures the failure context instead).

## Anti-Patterns (DO NOT)

1. **Inventing URLs, practitioners, or books.** Every `<a href>` is a verbatim `sources.json[].url` member; canon comes from live search via the substrate, and anything that fails the verification pass-bar is dropped from citations AND prose. Fabricated authority is a trust violation worse than thin sourcing.
2. **Shipping past a trust-tier failure.** After the auto-apply iteration, a failing trust check has exactly one exit: the recovery path. Shipping a trust failure is the worst-case outcome for /primer.
3. **Skipping the topic-richness check** because "the user knows their topic" — `narrow-by-design` is a real verdict Phase 2 consumes; skipping makes a thin primer indistinguishable from a deliberately shape-different one.
4. **Depth-fetching one source instead of breadth.** The floor counts distinct usable sources; multiple shallow on-topic sources beat one deep one.
5. **Mixing curator and explainer voice, or conflating audience presets.** The curator framing in `reference/curator-lens.md` and one-preset-per-artifact (`reference/audience-presets.md` §Anti-patterns) are the quality floor; half-defining terms loses both audiences.
6. **Forcing diagrams.** Inline SVGs only where a structural shape earns one — decoration displaces citation density.
7. **Mishandling social sources.** Never the paid X API or a bare `x.com` fetch (login wall); use the free-fetch ladder. Always paraphrase into the takeaway (verbatim post text is an R2 violation) and cite the original canonical post URL, never the fetch proxy (`api.fxtwitter.com`, `threadreaderapp.com`, `r.jina.ai`). Full discipline: `reference/social-sourcing.md`.
8. **Spawning subagents outside Phase 5.** Only the reviewer is a subagent; Phases 1–4 run inline (the sourcing loop uses tool-level fetch parallelism, not dispatch).
9. **Hand-authoring the primer HTML shell instead of rendering through `renderArtifact()`.** Cloning an existing primer file (or writing the `<head>`/toolbar/`<main>`/footer by hand) reproduces whatever chrome that example happened to carry and silently drops the `<main class="pmos-artifact-body">` wrapper — the exact divergence between custom-generated and curated primers (full-bleed + unnumbered vs. the centered, `[NN]`-signed 880px column). The shell is the deterministic substrate's job: pass `renderArtifact()` a **content-only** `{{content}}` fragment and let `template.html` own the toolbar, body wrapper, doc-title, and footer (Phase 5 step 7 + its post-render structural self-check).

## Worked example

Topic: `"feature flagging at scale"`, first run in a project.

- **Phases 0–1.** Settings give `docs_path=docs/pmos`; no lastrun, so the first-run depth prompt fires → `standard` (written to settings). Stderr: `depth: standard (source: prompt)`. Richness verdict: `rich`. Audience auto-resolves `senior-pms`. Path: `docs/pmos/primer/2026-05-23_feature-flagging-at-scale.html`.
- **Phase 2.** Canon discovery names ~5 practitioners + 3 books + 3 curations; the outline cascades 12 topics (provenance `curation-consensus`); preset shaping adds the required teach-sections; user approves at the confirm gate.
- **Phase 3.** Est-cost line: `est. ~60 source verifications across 12 topics; proceeding`. Rank-then-verify yields per-topic shortlists; one content-farm listicle is dropped pre-fetch by the hard gate. 18 verified sources ≥ floor 10 → no thin-source disclosure.
- **Phase 4.** ~4,800-word curator-voiced draft; 14 citations, all verbatim `sources.json[].url` members; two inline SVGs (a rollout-lifecycle flow, a build-vs-buy 2×2) per `reference/diagram-style.md`; closes with `## Where this connects` (3 pointers).
- **Phase 5.** User asked for a review pass. Iteration 1: one R3 fail ("most teams use percentage rollouts", uncited) with a valid ≥40-char quote; auto-apply adds the citation; re-run all-pass. Write gate approves; atomic trio + `library.html` regen (new primer appears under Collection = Yours) + lastrun update. ~7 minutes wall-clock.

---

*Spec lineage: behavior contracts originated in `docs/pmos/features/2026-05-23_pmos-learnkit-primer/` (v0.1–v0.3 FR/S-FR/D tags), `2026-05-28_primer-inline-diagrams/`, `2026-05-29_primer-social-sourcing/`, and the front-half unification in `2026-06-03_unify-primer-learnlist/`. Tags live there, not in this body (the inline non-interactive block keeps its tags — it is canonical and lint-pinned).*
