---
name: case-studies
description: Your searchable, offline library of 665 curated product case studies — real companies, real decisions, drawn from primary sources (blogs, talks, filings, handbooks, papers). Describe a topic in plain words and get the handful worth reading, each with a one-line "why it fits" and a link to the original; or browse the whole filterable collection (pillar, topic, region, artifact type, year) offline from file://. Each study carries a curated abstract, what-they-built, evidence, and why-it-matters plus topic/pillar/region tags, and a --json mode lets other skills ask "which case studies for this?" programmatically. Fully offline over the bundled snapshot — no account or network (only opening a source link touches the web). Use when the user wants real-world examples of how companies solved a product problem or wants to browse the library. Triggers on "/case-studies", "browse case studies", "case studies about X", "how did companies do Y", "show me examples of Z", or "find a case study on pricing".
user-invocable: true
argument-hint: "[\"<topic>\" | browse | list] [--json] [--non-interactive] [--interactive]"
---

# Case Studies

**Announce at start:** "Using case-studies to find real-world product case studies that fit this topic."

A searchable, offline library of **665 curated product case studies** — each a real company decision distilled from a primary source into a curated abstract, a *what they built*, the *evidence*, and *why it matters*. The value is **precise retrieval + trustworthy framing over a real-world corpus**, not a list dump: describe a topic in plain words and get the handful of studies actually worth reading, each with a one-line reason it fits and a link to the original. Other skills can ask the same question programmatically via `--json`.

The corpus ships pre-built under `${CLAUDE_SKILL_DIR}/data/case-studies.json` — a bundled snapshot of 665 records. Runtime retrieval, browse, and `--json` are **fully offline** over that shipped corpus — no network, no account. The corpus holds **abstracts + source links, not the full source text**, so reading an *original* opens an external link in the browser (the only path that touches the web). To refresh or grow the snapshot, re-run the importer per `reference/corpus-expansion.md` and re-validate.

`--json` is the machine contract — other skills and scripts pass it literally.

The deep mechanics live one hop away in `reference/` — keep this body lean:

- `${CLAUDE_SKILL_DIR}/reference/matching.md` — the two-stage ranking algorithm (scorer weights, floor, pool semantics) and the full `--json` contract.
- `${CLAUDE_SKILL_DIR}/reference/corpus-expansion.md` — how to refresh/grow the bundled snapshot: re-running the importer, the direct-authoring recipe, and the `validate-corpus.mjs` gate.
- `${CLAUDE_SKILL_DIR}/reference/corpus-schema.md` — the `case-studies.json` record contract.

The scripts under `${CLAUDE_SKILL_DIR}/scripts/` are zero-dep Node `.mjs` with a `--selftest` mode each. Drive matching and library-build through them — never hand-parse `case-studies.json`.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion` tool:** the "open the filtered viewer?" offer degrades to a numbered free-form prompt per `_shared/interactive-prompts.md`. The non-interactive auto-pick contract (Recommended → AUTO-PICK) still applies. No runtime path issues a confirmation prompt — every path reads the shipped corpus.
- **No browser / Playwright:** `browse` still writes `library.html`; opening it is a manual step the skill prints as a `file://` path.

## Track Progress

Every runtime path (retrieve / browse) is one or two tool calls — no task ceremony. Refreshing or growing the corpus is an authoring session, not a runtime path; track that work with the checklist in `reference/corpus-expansion.md` if you take it on.

## When NOT to use

- The user wants to **learn a topic in depth** (a primer, a reading list, a multi-source explainer) → that is `/primer` or `/learn-list`, not a case-study lookup.
- The user wants a **PM thinking tool / framework** for a decision ("which framework applies?") → that is `/frameworks`, not this skill.
- The user wants to **apply** a lesson to their own data and produce an artifact (e.g. "write my pricing memo") → this skill finds and frames real examples; building the artifact is `/artifact`.
- The topic isn't about product/company decisions (a general-knowledge question, a software-design pattern) → out of corpus scope; say so rather than forcing a match.

## Phase 0: Setup + Load Learnings {#setup}

Inline `_shared/pipeline-setup.md` to read `.pmos/settings.yaml` (require `version`) and resolve `{docs_path}`. The browse library is written to `{docs_path}/case-studies/library.html` (`mkdir -p` if missing); the shipped source corpus lives read-only under `${CLAUDE_SKILL_DIR}/data/`. All output is HTML.

Read `~/.pmos/learnings.md` if present; note any entries under the `## /case-studies` heading and factor them into your approach. **The skill body wins on conflict** — surface any conflict between a learning and the body to the user before applying it.

The canonical non-interactive block below handles `mode` resolution, the per-checkpoint classifier, the OQ buffer, and the end-of-skill summary. Do not paraphrase or move it.

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

## Phase 1: Resolve command {#resolve-command}

Dispatch the argument string by its **first token**:

- `browse` | `list` (or bare `/case-studies` with no topic text) → `#browse`.
- anything else (a quoted or bare topic string) → `#retrieve`.

`--json` is a modifier on the retrieve path only (structured output, no chat prose, no library open), parsed off the argument string before dispatch. `--json` on a browse/list invocation is ignored with a one-line stderr note.

## Phase 2: Retrieve — "<topic>" → ranked case studies {#retrieve}

Run the two-stage matcher exactly as specified in `${CLAUDE_SKILL_DIR}/reference/matching.md` (weights, floor, pool semantics, the `--json` contract — all live there):

1. **Prefilter.** Deterministic scorer over the shipped corpus:
   ```
   node ${CLAUDE_SKILL_DIR}/scripts/match.mjs --query "<topic>" [--json]
   ```
2. **Re-rank (human path).** LLM re-rank the full candidate pool (≤15) against the topic, write a **≤1-sentence "why it fits"** per pick, cap at **5**; on `low_confidence` present ≤2 closest with an explicit caveat — **never pad**, and a nothing-scores query returns zero matches, not invented ones.
3. **Present + offer the viewer (human path).** Show the ranked list (title · company · why · pillar) in chat, each with its "Read the original ↗" link. Then offer to open the filtered library via `AskUserQuestion` — identify the query's dominant topic/pillar from the picks and pre-filter the viewer to it (D2):
   - Question: "Open the browsable library filtered to **<dominant topic/pillar>**?"
   - Options: **Open filtered library (Recommended)** — build + open `library.html` per `#browse`, deep-linked to the dominant facet · **Stay in chat** — keep just the shortlist above.
4. **`--json` path.** Emit **only** the contract object to stdout — no chat prose, no library open; set `reranked: true` if you re-ranked it (the script alone emits `reranked: false`).

## Phase 3: Browse — the filterable library {#browse}

Build and open the self-contained library:

```
node ${CLAUDE_SKILL_DIR}/scripts/build-library.mjs --out {docs_path}/case-studies/library.html
```

`build-library.mjs` reads `data/case-studies.json` and emits a single self-contained `library.html` that works offline from `file://` (atomic write). Print the `file://` path. The library offers:

- **Three listing views** — List (one row per study; **the default**), Detailed (grouped cards), and Compact (grouped comma-separated links). A **group-by** control switches the axis between Pillar (default), Region, and Year.
- **A sidebar reader** — clicking a study opens a two-pane reader that shifts the listing aside (not an overlay) and **highlights the selection without jumping the page**; it renders the four prose blocks (Summary · What they built · Evidence · Why it matters) as labelled columns plus a **"Read the original ↗"** link to the source, with **Copy markdown** and **Share** actions.
- **Filters** — search · **pillar** (single-select) · and **multi-select dropdowns** for **topics** (with a type-to-filter search), **region**, **artifact type**, and **year**, plus a **quantified** toggle (reports hard numbers vs. directional). Selecting within a facet is OR, across facets is AND. An always-visible **applied-filters bar** shows every active filter as a removable, facet-labeled ✕ chip plus a **Clear all** control.
- **A PMOS masthead** whose study count is read live from the corpus.

The library page is fully regenerable from the corpus — rebuilding it is the only side effect of browse; there is no other mutation.

## Phase 4: Capture Learnings {#capture-learnings}

Reflect on whether this session surfaced anything worth recording about `/case-studies` itself — a matching miss, a topic-coverage gap, or a snag hit while refreshing the corpus. If so, append it under the `## /case-studies` heading in `~/.pmos/learnings.md` (create the heading if missing). Zero learnings is valid — the gate is that the reflection happens, not that an entry is written.

## Anti-Patterns (DO NOT)

- **DO NOT hand-parse `case-studies.json`** — go through the `.mjs` scripts so reads stay deterministic and tested; refresh the corpus per `reference/corpus-expansion.md`.
- **DO NOT block retrieve / browse / `--json` on the network.** They read the shipped corpus only and must work fully offline; only *opening an original source link* touches the web.
- **DO NOT pad matches past the confidence floor.** Below-floor input presents ≤2 closest with a `low_confidence` caveat, not a fabricated top-5; nothing-scores means zero matches, not invented ones.
- **DO NOT fabricate a study's abstract, evidence, or a source URL.** The corpus is grounded in primary sources; retrieval re-ranks what exists, it never invents.
- **DO NOT hot-link external images or ship the source `index.html`** — the library is rebuilt from the corpus through the shared substrate; it inlines everything and works offline.

---

*Spec lineage: epic `260710-4bh` (design `docs/pmos/features/2026-07-10_case-studies-skill/02_design.html`, INV-1..7 / D1..D8); story `260710-a2b` founded the corpus (importer → `data/case-studies.json` + `corpus-vocab.mjs` + `validate-corpus.mjs`); story `260710-vdc` (this skill) built the surface — SKILL.md, the viewer over the shared `_shared/library-viewer` substrate, `match.mjs` + `--json`, reference docs, and tests.*
