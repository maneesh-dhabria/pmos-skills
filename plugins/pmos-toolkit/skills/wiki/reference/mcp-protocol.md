# Generic MCP protocol — fetch / search / extract-links (D15)

The **one home** for how `/wiki` reaches a source. Cited from `SKILL.md` (`#add`, `#sync`); never
restated there (skill-patterns.md §K). The defining constraint (`02_design.html#decisions` **D15**):
**no per-tool / per-source adapter code ships.** The skill body (the LLM) discovers the right MCP
tools for a page's source at run time against a generic three-verb contract. Building and maintaining
adapters for Notion / GDocs / GitHub / Figma / Metabase / … does not scale and is the wrong
abstraction; one generic protocol + agent tool-discovery + auth-on-missing covers every present and
future MCP. The deterministic helpers (`scripts/hash.mjs`, `stitch.mjs`, `queue.mjs`, `retrieval.mjs`)
stay source-agnostic and **never touch transport**.

## The three-verb contract

Given a page URL or id, the body maps the source to whatever MCP tools are connected, using only these
generic capabilities. There is no fixed tool-name list — the mapping is discovered (below).

| Verb | What it must return | Used by |
|---|---|---|
| **fetch** `<page>` | the page's verbatim body (markdown/text) + available metadata (title, created, last-edited, nesting/parent) | `add`, `sync` — the mirror + deterministic sidecar |
| **search** `<query>` `[scope]` | candidate page ids/urls matching a query within the source | `add` hub discovery (optional), `curate` re-find |
| **extract-links** `<page>` | the outbound links in a page (child pages for crawl fan-out; external Figma/Sheets/Docs refs) | `add` `--depth` crawl + `external_links` enrichment |

A source need not expose all three. `fetch` is mandatory (no fetch ⇒ the source is not ingestible).
`extract-links` absent ⇒ `--depth` fan-out degrades to the single seed page (logged, not a crash).
`search` absent ⇒ hub discovery falls back to `extract-links` crawling only.

## Tool discovery (run-time, no hardcoded names)

1. **Identify the source** from the page URL/id shape (host, id format) — e.g. a `notion.so` URL, a
   `github.com/<org>/<repo>` path, a Figma file key. This is classification only — it selects *which*
   connected MCP to query, never *which adapter function to call*.
2. **Enumerate connected MCP tools** for that source (in Claude Code, the tools surfaced by the
   session's MCP servers). Match each to a contract verb by capability, not by a baked name table: a
   tool that retrieves a page body is `fetch`; one that lists results for a query is `search`; one that
   returns a page's links/children is `extract-links`.
3. **Apply** the matched tool with the page argument. Stitch overflow via `scripts/stitch.mjs` when a
   body exceeds one response (byte-exact, saved-file mechanism — `sidecar-schema.md` §"Resumable ingest").

If **no connected MCP** serves the source, that source is **unavailable** — surface it honestly
(`source <src> has no connected MCP; skipped — connect one and re-run`), record nothing for it, and
continue with the sources that are reachable. Never fabricate a body; never crash the whole run for one
unreachable source (anti-pattern: per-tool adapters / silent source-drop).

## Auth-on-missing (the clean-halt / resume contract)

When the source's MCP is **connected but unauthenticated** (a 401/`authenticate`-required signal in
Claude Code), do **not** loop or fail the ingest:

1. **Prompt the user to authenticate** (one `AskUserQuestion`, `(Recommended)` = the auth action):

   ```
   question: "Source <src> needs authentication before /wiki can fetch <page>. Authenticate now?"
   options:
     - Authenticate <src> now (Recommended)   # run the source MCP's authenticate flow, then resume
     - Skip this source for now               # mirror what is reachable; leave <src> docs un-ingested
   ```

2. **Clean halt, resumable.** The resumable queue (`scripts/queue.mjs`) has already checkpointed every
   completed doc; the un-authable source's docs are simply *not yet enqueued-as-done*. After the user
   authenticates, **resume at the same queue position** — `add`/`sync` re-run is idempotent (the engine
   skips already-mirrored docs, no dupes). Authenticating mid-run and continuing lands the remaining docs
   without re-fetching the done ones.
3. **Non-interactive** (`--non-interactive`): the prompt is **deferred** per the canonical block — the
   run continues with **Skip this source for now** as the deferred default (the only no-judgement option),
   the un-authable source is recorded as an Open Question on the run, and the user authenticates + re-runs
   `add`/`sync` later. The pipeline never deadlocks waiting on a credential.

The auth prompt + resume point is the only place a connected-but-locked source surfaces; an *absent* MCP
(above) is a different, non-blocking case.
