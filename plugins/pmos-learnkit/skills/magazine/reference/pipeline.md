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
it can run long in the background. Run per item, recording each transition through
`scripts/magazine-state.js`.

1. **Discover** — `scripts/fetch-feed.js <url> --since <cursor> --max <N>` per feed,
   each in isolation. A dead/malformed feed exits non-zero with a reason; skip and
   report it, never abort the issue (FR-7). `discover()` each returned GUID
   (idempotent dedup) → status `discovered`.
2. **Crawl** — for every item, `scripts/extract-article.js <link>` (status →
   `downloaded`), caching the text to `crawl-cache/<guid>.txt`. Exit 2 = thin /
   paywalled → flag the item `preview-only`. Exit 1 = hard failure → fall back to
   the RSS `body`/`description`. Always prefer the crawled article over the RSS stub
   (FR-8).
3. **Transcribe** — podcast items only: `scripts/transcribe.sh <enclosure> <guid>
   --model <feed.whisper_model|base>` (status → `transcribed`). Exit 3 = no whisper
   on PATH → keep the show-notes and attach an honest "install whisper" hint; never
   fabricate (FR-9, NFR-1). Audio is deleted right after; the transcript caches
   forever.

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
