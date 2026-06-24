# Design Brief — `/wiki`: a self-assembling onboarding wiki over a PM's own working docs

**Date:** 2026-06-24
**Plugin:** pmos-toolkit
**Status:** Problem shaped via `/shape` (8 forks, user-confirmed); ready for `/skill-sdlc define` (several open items deliberately left for spec — see §10)
**Author seed:** Reverse-engineered from two prior implementations in `porter/llm-wiki-prototype` — (1) the original FastAPI "code" web-app (`web/` + `scripts/` + `adapters/`, `claude -p` chokepoint, three-pane UI, D1–D26) and (2) the skill-native `kb/` system (4 local skills `/wiki-init` · `/wiki-sync` · `/wiki` · `/wiki-lint` over a flat-file substrate, D1–D15). The skill-native system is the architectural ancestor; the web prototype is studied as a foil. The live `kb/` corpus (158 PTL docs, a 519 KB generated viewer, a hand-quality onboarding primer) is the concrete evidence of what the system actually produces.

> **One-line shape:** A PM ramping onto a new charter can't build a *trustworthy mental map* of it fast enough. `/wiki` lets them point at their own docs (Notion / Google Docs / GitHub / Figma / Metabase / … — any source with an MCP), incrementally ingest them through a resumable pipeline, and browse the result as one rich, faceted, skimmable, annotatable single-file HTML wiki — filterable to one workstream or across all of them.

---

## 1. Problem this skill solves

A PM (or chief-of-staff) ramping onto a new charter inherits 150+ of their **own** working docs — a Notion hub, scattered Google Docs, Figma links, dashboards — with no map. Reading linearly is too slow; native search returns *pages, not understanding*; and nothing lets them skim the corpus document-by-document, filter it to one charter, see what's current, prune the noise, and capture their own open questions as they go. They hit this in **week 1 of a new charter, and again every few months** when the next charter lands.

**Felt problem.** *"I have a pile of my own docs and no fast, trustworthy way to build — and keep — a mental map of this workstream."*

**JTBD.** *When I'm ramping into a new charter facing a tree of my own working docs, give me a queryable, citation-grounded, skimmable wiki that I assemble incrementally, filter to one workstream or cut across all, and keep fresh — without re-architecting per source or per charter.*

This is an **internal productivity tool** for the PM, shipped in `pmos-toolkit`. The honest charter reconciliation: you onboard to a charter *so you can ship features in it* — `/wiki` is the upstream context-gathering step of the delivery pipeline, sitting alongside `product-context`, `people`, `mytasks`. **Charter-fit is a routing watch-item** for `/feature-sdlc` (CLAUDE.md gates plugin membership on the charter test).

**Gap vs. the existing toolkit** — nothing today ingests a personal corpus into a browsable wiki:

| Skill | Does | Gap vs. `/wiki` |
|---|---|---|
| `product-context` | captures product context as an artifact | hand-authored; not a corpus ingester or a browsable library |
| `research` / learnkit `topic-research` | gathers **verified public** sources on a topic | public web, not the PM's confidential working docs |
| `/frameworks`, `/primer browse`, `/learn-list` | faceted browse over a curated library (`library-viewer`) | catalog of *cards*, not ingested *document bodies* with section summaries + citations |
| `/primer` | one teachable artifact on a topic | single synthesized doc, not a navigable multi-doc corpus |

`/wiki` reuses the `library-viewer` + inline-`comments` substrate those learnkit skills are built on, but points it at an *ingested personal corpus* instead of a curated public catalog.

---

## 2. Evidence base — what the two prototypes taught us

The prototypes already solved most of the hard architecture twice. Carry these forward verbatim; they are *not* up for re-litigation:

- **Workstream = a sidecar *tag*, not a folder** (skill-native D1/D2). One shared tree; scoping and cross-charter cuts are filters, not joins. Re-filing a doc is a one-field edit, zero file moves.
- **Curated-emergent taxonomy** (D2 + FR-20/34): propose draft vocab from corpus signal → classify *strictly* against it → park low-confidence as `uncategorized` rather than force-tag. **Never force-tag.**
- **Resumable, smallest-first, checkpointed enrichment queue** (D8): a half-finished sync always leaves a usable wiki; resume at the first un-enriched doc, no dupes. **This is load-bearing for token/usage caps** (see §5).
- **Two-factor drift** (D10): `last_edited_time` (cheap pre-filter) confirmed by a *normalized* content hash (strips fetch timestamp, sorts frontmatter, collapses whitespace). Degrades to hash-only when edit-time is absent.
- **Byte-exact overflow stitch** (FR-11/38): large pages that overflow the MCP get reassembled by pure byte concatenation — corruption-proof. The real MCP mechanism is a *saved-file* path, not inline windows (Phase-0 finding).
- **MCP-direct fetch, no `claude -p` chokepoint** (D12): the LLM *is* the skill body; deterministic work (hashing, stitch, queue, ranking) lives in helper scripts the body calls but never reimplements.
- **The anti-slop summary contract** (v0.9.0): lead with substance, **metrics with their numbers** ("downtime 679→323, −52%"), structure over prose, **ban meta-phrasing** ("this document covers…"), per-tier compression budgets. This is what makes skim mode useful instead of sludge.

Two things were **unsolved in both** prototypes and are net-new here: **source-platform nesting capture** (`ancestor_path` was always empty) and **external-reference surfacing** (Figma/Sheets links were dropped in synthesis).

---

## 3. Decisions (confirmed this session)

| # | Decision | Rationale |
|---|---|---|
| **D1** | **Context bucket = internal tool** (not feature-in-product) | A PM's personal onboarding tool; downshifts multi-tenant / distribution / market lenses. |
| **D2** | **Single skill with commands** — `/wiki <command>` | User-confirmed; prototype D3 ("modes are flags") generalized to one skill. Exact verb set is an open item (§10.1). |
| **D3** | **Heart = the generated viewer.** Browse & skim to build the map is the core loop; Q&A is a first-class but secondary mode. | The fold-in list is ~10/12 browse/skim UX. The viewer *is* the product. |
| **D4** | **Viewer-first, reuse substrate** — built on `library-viewer` + inline-`comments`. | Faceting, time-filter, workstream-filter, and annotations come largely free. Needs `library-viewer` extended from *cards* to *document bodies* (§10.2). |
| **D5** | **Viewer skeleton is bundled with the skill** — zero-dep single-file HTML, proposed/recommended on first run. | Matches gamekit/library-viewer pattern; user wants a recommended skeleton shipped, not BYO. |
| **D6** | **Atomic unit = the document; understanding is a derived, cited, regenerable layer.** | Documents are the only stored ground truth + the resume/skim unit. Topic pages, primer, glossary, entity index, and Q&A are *synthesized from docs with citations* and re-derived on change → no drift, freshness = re-derive. (Rejects the web-prototype's first-class topic pages, which drifted from sources.) |
| **D7** | **Workstream is inferred from ingestion and user-editable** — no up-front `/wiki-init <ws> --seeds`. | Adding docs over time *builds* context; the user shouldn't pre-classify. Inferred classification is correctable. |
| **D8** | **Source-agnostic ingestion, gated by MCP availability.** Any source with a connector/MCP is ingestible: Docs (Notion/GDocs/Confluence), Code (GitHub), Design (Figma), Analytics (Snowflake/Metabase), Apps (store links), internal tools. | A PM's holistic understanding spans all of these. v1 supports whatever MCPs exist; the registry/adapter seam keys off "is there an MCP?" |
| **D9** | **Resumable ingestion/summarization pipeline is mandatory.** | Token limits / usage caps mean a large doc set can't be fetched + enriched in one go. Resume from the last completed doc, no dupes (carries prototype D8). |
| **D10** | **Kickstart needs ≥1 doc; a seed may be a single page or a hub page whose child links fan out** into the crawl pipeline. | The PM points at one Notion page that links to others → those become crawl candidates. |
| **D11** | **Substrate lives where the skill is instantiated/triggered** (cwd-relative), resolved via `.pmos/settings`. | Storage location follows where it was triggered, not a forced-external path. |
| **D12** | **Confidentiality is the end-user's decision** — a configurable default + a visible warning, *not* a fail-closed never-push gate. | User owns the risk/convenience trade-off. (Honest caveat retained: an accidental commit of the substrate can leak confidential docs irreversibly; the skill should warn, default to gitignored, but not hard-refuse.) |
| **D13** | **Q&A in v1** — cited, grounded answers over the document layer, scoped by workstream or `--all`. | User-confirmed; secondary to browse but present at launch. |

---

## 4. The data model (the spine)

Two layers; only the first is durable ground truth.

```
<substrate root, cwd-relative, gitignored by default>/
  config            inferred workstreams, thresholds, exclude patterns, source registry
  vocab             curated-emergent controlled vocabulary (workstream-scoped tags); user-editable
  sources/<src>/<id>        verbatim mirror — byte-exact, reversible (the DOCUMENT layer)
  index/<src>/<id>          sidecar: summary, section-summaries, glossary terms, external links,
                            created/last_edited, length tier, source hash, inferred workstream tag,
                            title (original + LLM), exclude flag, citations-anchors
  derived/                  the UNDERSTANDING layer (regenerable, never hand-edited as ground truth):
                            topic pages, onboarding primer, glossary, entity / who-owns-what index
  .ingest-state             resumable queue checkpoint (smallest-first, no dupes)
  wiki.html                 the bundled single-file viewer (the heart)
```

- **Document layer** = the skim/browse unit and the resume unit. Each doc carries deterministic fields (computed free at ingest, so an interrupted run still yields a greppable wiki) and LLM-enriched fields (summary, section summaries, glossary, classification — queued).
- **Understanding layer** = derived-with-citations and re-generated when documents change. Nothing here is separately authored ground truth, so it can never drift from or contradict the docs. Freshness is "re-derive," not "re-sync two stores."

---

## 5. Skill shape (proposed — verbs are an open item)

`/wiki <command>` — a single skill. Proposed command surface (to be finalized in `define`/spec):

- **add / ingest** `<page-url|id>[,…] [--depth N]` — the everyday verb (user adds docs over time). Accepts a single page or a hub page that fans out to child links. Runs the **resumable pipeline**: crawl → byte-exact mirror + deterministic sidecar → queued LLM enrichment (summary, section summaries, glossary, external-link extraction, inferred workstream). Halts cleanly on a usage cap; resumes at the next un-enriched doc.
- **refetch / sync** `[<page>|--all]` — manual-only re-crawl + re-enrich of drifted docs (two-factor drift). User indicates which docs (or everything) to refresh.
- **view / browse** `[<ws>|--all]` — (re)generate and open the single-file HTML wiki. **`--all` cuts across workstreams; a workstream arg scopes.** Hosts skim mode, facets, glossary, annotations.
- **ask** `[<ws>|--all] "<query>"` — grounded, cited answer over the document layer. Secondary mode (D13).
- **curate** — surface + apply classification edits: re-tag a doc's inferred workstream/topic, mark a doc irrelevant (exclusion list), promote a glossary term, accept/reject vocab proposals. (The user-editable side of D7.)

Non-interactive contract, `(Recommended)`-tagged prompts, and the canonical inline blocks per repo skill-authoring conventions apply.

---

## 6. The viewer (the heart) — where the fold-in fixes land

One faceted, skimmable, annotatable single-file HTML wiki, built on `library-viewer` (extended to render document bodies) + inline-`comments`:

**Free / near-free from existing substrate**
- **Annotate & add questions/clarifications** → inline-`comments` threads (persist in the HTML itself).
- **Time-based filters** + **workstream filter** → `library-viewer` facets.
- **Mark page irrelevant / exclusion list** → facet + `exclude` sidecar flag (hidden by default, restorable).

**Viewer-render additions (net-new render work)**
- **Inshorts / skim mode** — summary/abstract only, document-by-document.
- **Section-level summaries** — per-H1/H2 within a doc.
- **Glossary as its own section** — promoted terms with hand-written definitions.
- **Created / last-modified header** under each title.
- **Page-title toggle** — LLM-generated vs. retain-original.
- **External-reference links surfaced in each summary** — Figma / Sheets / Docs links extracted into the sidecar and shown.

**Net-new ingestion work (unsolved in both prototypes)**
- **Source-platform nesting** captured as a classification signal *and* a crawler-candidate source.
- **Empty / low-substance docs ignored** — beyond the prototype's *thin-source notice*, actually skip/de-emphasize.
- **Taxonomy options proposed** — pre-bundled vs. emergent presented at init; default is curated-emergent (propose → human-curate).

---

## 7. Ingestion pipeline (resumable, multi-source, MCP-gated)

- **Source registry keyed on MCP availability** (D8): each source type is an adapter conforming to a `fetch / search / extract_links` contract (carries forward the prototype's `FetchResult` superset). v1 implements whatever MCPs are present; absent MCP → that source is unavailable, surfaced honestly, not a crash.
- **Resumable queue** (D9): smallest-first, checkpointed after each doc; `RateLimitHalt` exits clean and resumable. Verbatim mirror + deterministic sidecar written *before* any LLM work, so an interruption never loses a fetched doc.
- **Overflow stitch** for large docs (byte-exact, saved-file mechanism).
- **Deterministic-vs-LLM split**: hashing, stitch, queue, drift, retrieval ranking are helper-script work; the skill body does the MCP fetch + enrichment authoring + classification + citation phrasing.

---

## 8. Anti-patterns to carry into the skill

1. **Topic pages as a second source of truth.** The understanding layer is *derived*; never let it be hand-edited ground truth that drifts from the docs (the web prototype's failure).
2. **Force-tagging low-confidence docs.** Park as `uncategorized` + propose; the human is the only writer to vocab.
3. **Summary sludge.** Enforce the anti-slop contract — metrics with numbers, no "this document covers…" meta-phrasing.
4. **Losing a fetched doc on interruption.** Mirror + deterministic sidecar land before LLM work; resume is per-doc, no dupes.
5. **Silent confidentiality assumptions.** Default gitignored + warn, but the user owns the call (D12) — don't pretend a hard gate exists when it doesn't, and don't hide the leak risk.

---

## 9. Where it physically lives

- **Skill:** `plugins/pmos-toolkit/skills/wiki/SKILL.md` (+ `reference/`, `scripts/`, `tests/`).
- **Bundled viewer skeleton:** ships with the skill; emitted into the substrate root on first `view`.
- **Reused substrate:** `library-viewer` (currently in `pmos-learnkit/_shared/`) + `html-authoring` + `comments`. Cross-plugin reuse via `scripts/sync-shared.sh` — and per the CLAUDE.md bootstrap-gap note, the first time pmos-toolkit needs a learnkit-only `_shared` file it must be placed there manually (byte-identical) before the sync intersection keeps it aligned.
- **Substrate (corpus):** cwd-relative, resolved via `.pmos/settings`, gitignored by default (D11/D12).

---

## 10. Open items for `define` / spec (deliberately not over-decided)

1. **Final command/verb set** — `add` / `sync` / `view` / `ask` / `curate` is a proposal; confirm names + whether `add` and `sync` are one verb.
2. **`library-viewer` extension vs. fork** — it renders flat catalog *cards*; a wiki needs document *bodies* + section summaries. Scope the extension (or decide to purpose-build) without regressing `/frameworks` / `/primer` / `/learn-list`.
3. **Incremental re-derivation cost** — re-deriving the whole understanding layer on every doc change is token-expensive under caps. Spec an *incremental* derivation (only affected topic pages/primer sections) — this is the freshness analog of the resumable ingest queue.
4. **Multi-MCP auth feasibility** — the prototype left "can a Claude routine hold MCP auth" open for *one* source; v1 multi-source compounds it. **Recommend a Phase-0 spike** (as the prototype did) before trusting the design.
5. **Workstream inference mechanism** — how a doc's workstream is inferred at ingest (corpus signal? hub provenance? seed grouping?) and the edit affordance.
6. **Q&A depth in v1** — retrieval model (ripgrep + BM25 over sidecars, per prototype) and citation-anchor strategy (heading-path fallback when block IDs absent).

---

## Appendix — source corpus studied

- `porter/llm-wiki-prototype/docs/pmos/features/2026-05-27_onboarding-wiki/` — skill-native requirements/spec/plan (D1–D15, FR-01–40, G1–G7, Phase-0 runbook).
- `porter/llm-wiki-prototype/docs/pmos/features/2026-05-13_llm-wiki-prototype/` — original web prototype (D1–D26).
- Live artifacts: `kb/config.yaml` (workstreams + exclude_patterns), `kb/vocab.yaml` (16 curated PTL topics), `kb/views/ptl-wiki.html` (519 KB generated viewer: sidebar search + topic + date filters, per-page summary, thin-source notice), `kb/primer/ptl.md` (hand-quality onboarding primer), `kb/proposals/vocab-draft.yaml` (glossary seed candidates).
- This repo's substrate: `pmos-learnkit/_shared/library-viewer/`, `_shared/html-authoring/`, `pmos-toolkit/skills/comments/`.
