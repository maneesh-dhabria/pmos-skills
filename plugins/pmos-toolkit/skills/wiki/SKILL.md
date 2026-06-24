---
name: wiki
description: Build and maintain a living wiki from your scattered team docs (Notion, Google Docs, GitHub, Figma, and any other connected MCP source) — mirror each source page, distil a re-derivable understanding layer (summaries, glossary, workstreams), and serve it as one offline, greppable, ask-able HTML wiki. Five verbs — add (ingest a source/page), sync (re-derive only what drifted), view (open the offline wiki), ask (grounded, cited Q&A over the corpus), curate (correct titles/workstreams/exclusions). Uses a generic MCP protocol — no per-source adapter code — so any present or future MCP works the moment it is connected. Use when the user says "build a wiki of our docs", "pull our Notion/Confluence/Drive into a wiki", "make our scattered docs searchable", "ask my docs a question", "keep my docs wiki in sync", or "/wiki". NOT for authoring a single new doc (/artifact), summarising one document (/summary-tldr), or teaching a topic from sources (/primer).
user-invocable: true
argument-hint: "<add|sync|view|ask|curate> [target] [--depth N] [--all] [--non-interactive | --interactive]"
---

# /wiki

**Announce at start:** "Using /wiki to build and serve a living wiki from your connected doc sources."

`/wiki` turns the docs scattered across your team's tools into one **living wiki**: a verbatim mirror of every source page plus a derived, re-derivable *understanding layer* (summaries, a glossary, workstream tags, an entity index), served as a single offline HTML file you can browse, grep, and ask questions of. It reaches sources through a **generic MCP protocol** (`reference/mcp-protocol.md`) — there is no per-source adapter code, so Notion, Google Docs, GitHub, Figma, Confluence, Metabase, or any MCP connected tomorrow all work the same way.

The deterministic substrate — the sidecar data model, content hashing, two-factor drift, the resumable ingest queue, BM25 retrieval, and the bundled zero-dependency viewer — ships as engine scripts (`scripts/*.mjs`) and `reference/wiki-viewer.html`. **This skill body calls those scripts; it never reimplements their logic** (anti-pattern #6).

**Flags are NL-first.** Infer the verb and options from the request — an explicit flag overrides. Canonical phrasings: "pull in / ingest / add <source>" ≡ `add`; "refresh / update the wiki" ≡ `sync`; "open / browse the wiki" ≡ `view`; "ask the docs <question>" ≡ `ask`; "fix the title / re-tag / hide this doc" ≡ `curate`; "crawl <N> levels deep" ≡ `--depth N`; "search across every workstream" ≡ `--all`.

## When to use this

- The user's reference material lives across several tools and they want one searchable, browsable home for it.
- The user wants to **ask** their own docs a question and get a cited answer, offline.
- The user wants to keep an existing docs wiki fresh as the sources change.

**When NOT to use:**
- Authoring a brand-new document → `/artifact`.
- Condensing a single document → `/summary-tldr`.
- Teaching a topic from verified sources → `/primer` (a learning artifact, not a mirror).
- Reviewing a doc's quality → `/artifact-critique`.

## Track Progress

This skill has multiple phases. Create one task per phase using your agent's task-tracking tool (e.g., `TaskCreate` in Claude Code). Mark each task `in_progress` when you start it and `completed` when it finishes — never batch completions. For `add`/`sync`, the resumable ingest snapshot (`scripts/queue.mjs`) is the durable progress contract; tasks track *your* in-session progress.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion` tool:** Degrade to numbered free-form prompts per `_shared/interactive-prompts.md`. The non-interactive auto-pick contract still applies (Recommended → AUTO-PICK).
- **No MCP tools connected:** `add`/`sync` have no source to reach — surface `no connected MCP source for <target>; connect one and re-run` and exit cleanly. `view`/`ask`/`curate` over an existing corpus still work (they never touch transport).
- **No subagents:** The enrichment pass runs inline sequentially — the resumable queue still checkpoints after each document, so an interrupted run resumes cleanly.
- **TaskCreate / TodoWrite missing:** Skill body works without task tracking; the ingest snapshot is the canonical progress record.
- **No `.pmos/settings.yaml`:** Run `_shared/pipeline-setup.md` Section A first-run setup before resolving `{docs_path}`.
- **Browser / Playwright:** Not used; the viewer is a plain `file://` HTML open.

## Non-interactive mode

The defining prompt in this skill is **auth-on-missing** (a source needs authentication, `reference/mcp-protocol.md`). Under `--non-interactive` that prompt is **deferred** — the un-authable source is skipped and recorded as an Open Question, and the run never deadlocks waiting on a credential. The block below is byte-identical to `_shared/non-interactive.md` (audited by `tools/lint-non-interactive-inline.sh`).

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

## The five verbs

The first token after `/wiki` selects the verb; the rest is the target (a source id, page URL, or question). Phase 0 always runs first, then dispatch routes to exactly one verb phase.

| Verb | Phase | Does |
|---|---|---|
| `add <source\|page>` | `#add` | ingest a source / page (mirror + deterministic sidecar + queued enrichment); `--depth N` crawls children |
| `sync [source]` | `#sync` | re-derive **only drifted** documents; incremental, cost scales with what changed |
| `view` | `#view` | emit + open the offline single-file HTML wiki |
| `ask <question>` | `#ask` | grounded, cited Q&A over the corpus (BM25 over sidecars); `--all` ignores workstream scope |
| `curate <doc> …` | `#curate` | correct an LLM title, re-tag a workstream, or exclude a doc; workstream inference + confidentiality live here |

`add` and `sync` are **deliberately distinct** (AC1): `add` brings *new* material in; `sync` refreshes *existing* material by re-deriving what drifted. Never silently treat one as the other.

## Phase 0: Setup {#setup}

1. **Read `.pmos/settings.yaml`.** Missing → run `_shared/pipeline-setup.md` §A first-run setup. Set `{docs_path}` from `settings.docs_path`; the wiki substrate root is `{docs_path}/wiki/<workspace>/` (mirror under `sources/`, sidecars under `index/`, derived pages under `derived/`, ingest state in `.ingest-state.json`).
2. **Resolve mode** (interactive / non-interactive) per the inlined contract. Print `mode: <m> (source: <s>)` to stderr.
3. **Read `~/.pmos/learnings.md`** if present; note any entries under `## /wiki` and factor them into your approach. Skill body wins on conflict; surface conflicts to the user.
4. **Resolve the verb** from the first token (NL-first per the table above). No recognised verb and no corpus yet → print the five-verb usage and stop; no verb but a corpus exists → default to `view`.
5. **Confidentiality default (D12).** On first ingest into a workspace, ensure the substrate root is gitignored by default and warn once (`#confidentiality`). This is a **warning, not a hard gate** — the user may opt to commit.
6. **Taxonomy bootstrap (first ingest only).** When a workspace has no controlled vocabulary yet, offer to seed one so workstream inference (`#workstream-inference`) has anchors. Issue ONE `AskUserQuestion`:
   - **Infer workstreams from the source's top-level structure (Recommended)** — derive candidate workstreams from `ancestor_path` hubs during ingest; the user corrects later via `curate`.
   - Provide them now — user lists the workstreams.
   - Skip — leave everything *uncategorized* until `curate`.

## Phase 1: add {#add}

Ingest a source or a page into the workspace (AC2, AC3). The contract for reaching the source — tool discovery, the generic fetch/search/extract-links verbs, overflow stitching, and **auth-on-missing** — is `reference/mcp-protocol.md` (cited, not restated).

1. **Resolve the source** from the target's URL/id shape and map it to connected MCP tools (`mcp-protocol.md` § "Tool discovery"). No connected MCP → surface honestly and stop; connected-but-unauthenticated → the auth-on-missing prompt (`mcp-protocol.md` § "Auth-on-missing"), which is deferred under `--non-interactive`.
2. **Discover the page set.** A single page → just it. A hub or `--depth N` → fan out via `extract-links` up to N levels (default depth 1 = the seed only); `search` may seed discovery when the source exposes it. Absent `extract-links` degrades to the seed page (logged, not a crash).
3. **Build the resumable queue** (`scripts/queue.mjs :: IngestQueue`, smallest-first) over the discovered pages, resuming from `.ingest-state.json` if present (idempotent — already-mirrored docs are skipped, no dupes).
4. **Per document, deterministic-first** (`reference/sidecar-schema.md`):
   - `fetch` the verbatim body; stitch overflow byte-exactly via `scripts/stitch.mjs`.
   - Write the **verbatim mirror** under `sources/<src>/<id>` and the **deterministic sidecar** fields (`scripts/hash.mjs :: normalizedHash` for `source_hash`, plus `created`/`last_edited`/`length_tier`/`ancestor_path`/`original_title`/`section_offsets`) under `index/<src>/<id>` — **before any LLM work**, so an interrupted run still yields a greppable wiki.
   - Checkpoint the queue (this doc is now durably done).
5. **Enrichment pass (the understanding layer, queued).** Fill the nullable enriched sidecar fields to the **anti-slop bar in `reference/enrichment-contract.md`** — `summary`, `section_summaries`, `glossary_terms`, `external_links` (from `extract-links`), `llm_title` (only when `original_title` is vague), and `workstream` + `workstream_confidence` (`#workstream-inference`). `null` over filler, always. A rate-limit / usage cap → throw `RateLimitHalt` (`scripts/queue.mjs`) for a clean, resumable halt.
6. **Report** documents mirrored, enriched, deferred-for-auth, and the resume command if the run halted.

## Phase 2: sync {#sync}

Refresh an existing workspace by re-deriving **only what changed** (AC4) — never a blind re-ingest.

1. **Re-fetch** each document's current head via the same MCP protocol and compute its fresh normalized hash + `last_edited`.
2. **Drift check per doc** with `scripts/hash.mjs :: driftVerdict(prev, fresh)` — two-factor when both `last_edited` values are present (cheap pre-filter, hash-confirm), hash-only when either is absent (`sidecar-schema.md` § "Two-factor drift"). A touched-but-reverted edit is **not** drift.
3. **Re-derive drifted docs only.** For each drifted doc, rewrite the verbatim mirror + deterministic sidecar, then re-run enrichment for that doc to the `enrichment-contract.md` bar. Unchanged docs are left byte-untouched, so `sync` cost scales with the change set, not corpus size.
4. **Rebuild `derived/`** (topic pages, primer, glossary, entity index) from the current sidecars — it is regenerated, never hand-patched, so it cannot drift (`sidecar-schema.md` § "Two layers"). Report drifted / re-derived / unchanged counts.

## Phase 3: view {#view}

Serve the offline wiki (AC4 viewer).

1. **Assemble the corpus JSON** (`sidecar-schema.md` § "The corpus JSON"): every sidecar joined with its `body_md` mirror, plus optional `config`/`vocab`, so both skim and full views render offline. Excluded docs (`exclude != null`) are carried but hidden by default.
2. **Emit the single-file wiki** by embedding that corpus into `reference/wiki-viewer.html`'s `<script id="wiki-corpus" type="application/json">` block (the viewer is zero-dependency and already carries all fold-ins + the `pmos:skill=wiki` meta + the inline `pmos-comments` block for in-browser annotation). Write to `{docs_path}/wiki/<workspace>/wiki.html` via atomic temp-then-rename.
3. **Open** the file (`file://`) and print its absolute path. Comment threads written in the browser persist inside the HTML and are resolved via `/comments resolve <wiki.html>` (cited; not this skill's job). `--all` here renders every workstream expanded rather than the default grouped/collapsed view.

## Phase 4: ask {#ask}

Answer a question grounded in the corpus, with citations (AC5).

1. **Build the index** with `scripts/retrieval.mjs :: buildIndex(docs)` over the sidecars (titles + summaries + section summaries + glossary — **not** `body_md`, by design; the index is about distilled meaning).
2. **Retrieve** with `search(index, question, {workstream, all})` — BM25, ripgrep-style candidate gather (a doc with no query term is not a hit). Default scopes to the active workstream when one is set; `--all` searches across every workstream. Each hit carries a **heading-path citation anchor** `<doc_id>#<block_id|slug>`.
3. **Answer from the retrieved sidecars**, citing each claim by its anchor. Ground strictly in what was retrieved — if retrieval returns nothing, say so and suggest `add`-ing the relevant source rather than inventing an answer. Offer the matching `view` deep-links.

## Phase 5: curate {#curate}

Let the user correct the understanding layer (AC6, AC7). Each correction edits the sidecar in place and is picked up on the next `view`/`ask` (and survives `sync`, since user corrections are not drift).

- **Fix a title** — set `llm_title` (or restore `original_title`); the viewer toggles the two.
- **Re-tag a workstream** — overwrite `workstream` + set `workstream_confidence = 1.0` (a user decision is certain). See `#workstream-inference`.
- **Exclude / restore** — set `exclude = {reason}` to hide a doc (thin/irrelevant), or `exclude = null` to restore. Truthiness rule is `exclude != null` (`sidecar-schema.md`).

### Workstream inference {#workstream-inference}

When `add`/`sync` fills `workstream`, infer it (D16) from two evidence signals: **hub provenance** (`ancestor_path` — which source hub the doc lives under) and **tag / vocabulary overlap** (against the workspace `vocab` seeded at bootstrap). Set `workstream_confidence` accordingly. **Low confidence → leave `workstream` `null`** so the viewer shows the doc as *uncategorized* — never force a doc into a wrong bucket. The user's `curate` correction is authoritative and is preserved across future `sync`s.

### Confidentiality {#confidentiality}

The mirror contains your team's real document bodies (D12). The substrate root (`{docs_path}/wiki/<workspace>/`) is **gitignored by default**, and Phase 0 warns once on first ingest. This is the user's call, **not fail-closed**: a user who wants the wiki version-controlled may remove the ignore. Never commit a workspace's contents on the user's behalf; never transmit document bodies anywhere beyond the local substrate and the offline viewer.

## Phase 6: Capture Learnings {#capture-learnings}

**This skill is not complete until the learnings-capture process has run.** Read and follow `_shared/learnings-capture.md` now. Reflect on whether this session surfaced anything worth capturing under `## /wiki` — e.g., a source whose MCP tool-mapping was non-obvious, a drift false-positive, a workstream-inference signal that kept misfiring, or an enrichment pattern that recurs. Proposing zero learnings is valid for a smooth session; the gate is that the reflection happens.

---

## Anti-Patterns (DO NOT)

1. **Per-source adapter code.** There is **one** generic MCP protocol (`reference/mcp-protocol.md`); discovering tools at runtime is the design (D15). Never add a Notion-specific or GitHub-specific code path — it does not scale and is explicitly out of charter.
2. **Conflating `add` and `sync`.** `add` ingests new material; `sync` re-derives drifted existing material. Keep them distinct (AC1).
3. **Enrichment slop.** A generic summary, a restated heading, or a padded glossary is worse than `null`. Hold the `enrichment-contract.md` bar — specific or absent.
4. **Re-syncing the whole corpus.** `sync` re-derives only drifted docs (`driftVerdict`); a blind full re-ingest wastes work and money (AC4).
5. **Forcing a workstream.** Low-confidence inference leaves the doc *uncategorized*; a wrong bucket is worse than none (`#workstream-inference`).
6. **Reimplementing the engine.** The hashing, drift, queue, stitch, and retrieval logic live in `scripts/*.mjs` and are *called*, never rewritten in prose (§H; the scripts are the single home).
7. **Answering `ask` from outside the corpus.** Ground every claim in a retrieved sidecar with its citation anchor; empty retrieval means "I don't have that — add the source," not a guess.

---

*Spec lineage: epic 260624-c62, story 260624-rmq (`docs/pmos/features/2026-06-24_wiki/02_design.html`). Engine + viewer + frozen data model from story 260624-1e5 (`scripts/*.mjs`, `reference/wiki-viewer.html`, `reference/sidecar-schema.md`). Generic MCP protocol D15 (`reference/mcp-protocol.md`); anti-slop understanding layer D6 (`reference/enrichment-contract.md`); non-interactive contract `_shared/non-interactive.md`.*
