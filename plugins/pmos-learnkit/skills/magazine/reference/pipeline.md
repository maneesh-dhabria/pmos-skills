# magazine — the two-stage pipeline

How an issue is built. Speed is explicitly not a goal: the pipeline may run long,
runs resumably, and updates the issue as items complete.

## Contents

- [Windowing](#windowing) — what defines an issue
- [Stage A — deterministic prep](#stage-a--deterministic-prep) — discover, crawl, transcribe
- [Stage B — in-session agent](#stage-b--in-session-agent) — summarize, curate, render, commit
- [Resume](#resume) — how an interrupt recovers
- [Degraded items](#degraded-items) — never drop silently

## Windowing

A run's scope is, in precedence order:

1. `--feed <name>` — restrict to one feed.
2. `--days N` — items published in the last N days.
3. default — items newer than each feed's `state.json` cursor ("since last run").
4. `--max-per-feed N` — cap items taken from any single feed.

After windowing, subtract already-`rendered` GUIDs, then **snapshot the resulting
item set** — that snapshot defines the issue and does not change mid-run.

## Stage A — deterministic prep

Headless-capable, parallel, resumable. Uses only the bundled scripts (no LLM), so
it can run long in the background.

**Entrypoint (FR-P4).** Drive Stage A through `scripts/magazine-run.js` rather than
hand-writing per-phase drivers against the module APIs:

```
node scripts/magazine-run.js discover [--feed <url>|--feeds <file>] [--since <ISO>] [--max <N>]
node scripts/magazine-run.js prep     [--min-chars <N>]
node scripts/magazine-run.js status
```

`magazine-run.js` shells the individual scripts below (it does **not** re-implement
them) and records every transition through `scripts/magazine-state.js`. Calling the
individual scripts directly is still supported for one-off work — when you do, follow
the **"redirect, don't pipe"** rule in step 2.

1. **Discover** — `scripts/fetch-feed.js <url> --since <cursor> --max <N>` per feed,
   each in isolation. A dead/malformed feed exits non-zero with a reason; skip and
   report it, never abort the issue (FR-7). `discover()` each returned GUID
   (idempotent dedup) → status `discovered`. URLs are returned with XML entities
   already decoded (`&amp;`→`&`), so enclosure/link query params are curl-safe
   (FR-P5).
2. **Crawl** — for every item, `scripts/extract-article.js <link>` (status →
   `downloaded`). **Redirect stdout to a file, never capture it through a pipe**:
   `extract-article.js <link> > crawl-cache/<safe-guid>.txt` (FR-P1). A long article
   piped into a captured buffer truncates at the pipe size (~8–64 KB) and the tail is
   silently lost — `magazine-run.js prep` always redirects to a file for this reason.
   Exit 2 = thin/paywalled → flag the item `preview-only`. Exit 1 = hard failure →
   fall back to the RSS `body`/`description`. Always prefer the crawled article over
   the RSS stub (FR-8).
3. **Transcribe** — podcast items only: `scripts/transcribe.sh <enclosure> <guid>
   --model <feed.whisper_model|base>` (status → `transcribed`). The GUID is
   sanitized for the on-disk path (`substack:post:1` → `substack_post_1`, FR-P6).
   For whisper.cpp, the model **name** is resolved to a ggml file (see
   `config-schema.md` → `whisper_model`); exit 3 = no whisper **or** no resolvable
   model → keep the show-notes and attach an honest "install whisper / set
   `WHISPER_MODEL_DIR`" hint; never fabricate (FR-9, FR-P2, NFR-1). Audio is deleted
   right after; the transcript caches forever.

## Stage B — in-session agent

Subagent fan-out, incremental. Runs in the host session because it is LLM work.

4. **Summarize + tag** — one subagent per ready item. Input: the crawled article
   (`crawl-cache/`) or transcript (`transcripts/`), never the RSS stub alone.
   Output: 3–5 bullet takeaways (soft ≤240 chars each), a read/listen link, and
   tags chosen **only** from `tags.yaml`. No fitting tag → `uncategorized` +
   a `suggest-add` note. Thin/empty source → a degraded card, never a fabricated
   summary. Status → `summarized`.
5. **Curate Top picks** — one subagent ranks summarized items against
   `interest.yaml`; sparse interests → rank on item-intrinsic importance (never
   random). Mark the top items `top_pick`.
6. **Render incrementally** — after each item (or small batch) completes, build the
   items JSON and run `scripts/render-issue.js issue <items.json>` to re-emit the
   self-contained issue HTML, then `render-issue.js library <issues.json>` to update
   the library index. Status → `rendered`. On `file://` the user reloads to see new
   cards (v1 has no meta-refresh — grill decision).
7. **Commit on completion** — only when every snapshot item is `rendered` or
   `failed`, call `advanceCursors()` so the next "since last run" starts cleanly.

## Resume

Any interrupt (crash, `/compact`, user stop) is recovered by re-running `/magazine`:
re-discover (idempotent), then process only items whose status is behind. Cached
`crawl-cache/` and `transcripts/` mean no re-crawl / re-transcribe. Because the
cursor advances only on full completion, resume never drops or double-counts
(NFR-2).

## Degraded items

A per-item failure (paywall, download error, transcribe failure, summarize
failure) becomes a **degraded, reason-flagged card** — `status: failed` with a
`failed_reason`, rendered with a visible warning. Nothing is ever silently dropped
(FR-15); failures stay in the ledger for a later retry.
