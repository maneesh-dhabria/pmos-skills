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

Interactive `discover` requires an **explicit window** (D1/D7). There is **no**
cursor or full-history fallback — the cursor is watch-internal poll memory (see
"Cursor", below). A bare `discover` exits 64 demanding a window. The window is:

1. `--feed <name>` — restrict to one feed (optional, orthogonal to the date window).
2. **Lower bound (required).** One of:
   - **`--days N`** — a trailing window, `now − N days` .. now. When the user gives no
     explicit window, the skill chooses `N` from `interest.yaml :: defaults.days`
     (captured at first-run, FR-Q3) → built-in **7**, and passes it as `--days N`.
     The *skill* supplies the value; the *script* never silently defaults — so a
     plain `/magazine` still needs no interactive prompt, yet a bare CLI call errors.
   - **`--from <YYYY-MM-DD>`** (inclusive of the whole day) or the ISO **`--since <ISO>`**.
     An explicit `--from`/`--since` takes precedence over `--days`.
3. **Upper bound (optional).** `--to <YYYY-MM-DD>` (inclusive end-of-day) or the ISO
   **`--until <ISO>`**. Omitted → open-ended up to now. The lower bound is exclusive,
   the upper inclusive (so a `--from A --to B` range includes all of day B).
4. **Per-feed cap (`--max-per-feed N`)** — cap items taken from any single feed.
   Resolution: `--max-per-feed` flag → else `interest.yaml :: defaults.max_per_feed`
   → else uncapped. Keeps a prolific feed from ballooning the issue.

Each item is filtered by **both** bounds (`fetch-feed.js` applies the lower *and*
upper bound). After windowing, subtract already-`rendered` GUIDs, then **snapshot the
resulting item set** under a run-id (the discover's ISO timestamp) as the single
`state.snapshot`, overwriting any prior one. That snapshot defines the issue, does
not change mid-run, and **scopes what `prep` crawls** (D2). A wider, overlapping
window legitimately re-references in-window items already processed in a prior run —
`discover` stays GUID-idempotent, so they keep their advanced status and still render
(D6); snapshot-scoping bounds only what `prep` *crawls*, never what the issue
*contains*.

**Cursor (watch-internal only).** The per-feed `state.json` cursor is the
`/magazine watch` worker's forward-only poll memory (advanced inside `enqueue`/
`drain`). Interactive `discover`/render **neither read nor advance it** — the issue's
completeness guarantee is the snapshot, not the cursor. `advanceCursors()` is retained
for the watch path; do not call it on the interactive path.

## Stage A — deterministic prep

Headless-capable, parallel, resumable. Uses only the bundled scripts (no LLM), so
it can run long in the background.

**Entrypoint (FR-P4).** Drive Stage A through `scripts/magazine-run.js` rather than
hand-writing per-phase drivers against the module APIs:

```
node scripts/magazine-run.js discover [--feed <url>|--feeds <file>] (--days N | --from <date> --to <date> | --since <ISO> --until <ISO>) [--max-per-feed <N>]
node scripts/magazine-run.js prep     [--min-chars <N>]
node scripts/magazine-run.js status
```

A window is **required** (see [Windowing](#windowing)); a bare `discover` exits 64.

`magazine-run.js` shells the individual scripts below (it does **not** re-implement
them) and records every transition through `scripts/magazine-state.js`. Calling the
individual scripts directly is still supported for one-off work — when you do, follow
the **"redirect, don't pipe"** rule in step 2.

1. **Discover** — `scripts/fetch-feed.js <url> --since <ISO> [--until <ISO>] --max <N>`
   per feed, each in isolation (the entrypoint passes the resolved window bounds —
   never a cursor). A dead/malformed feed exits non-zero with a reason; skip and
   report it, never abort the issue (FR-7). `discover()` each returned GUID
   (idempotent GUID dedup) → status `discovered`. URLs **and titles** are returned
   with XML entities already decoded (`&amp;`→`&`, `&apos;`→`'`), so query params
   are curl-safe and titles render cleanly instead of showing literal `&apos;`
   (FR-P5, FR-Q1). **Cross-feed dedup (FR-Q2):** when the same article is
   syndicated across two feeds under different GUIDs, `discover()` keys a
   canonicalized link (scheme/`www.`/tracking-param/trailing-slash insensitive) and
   records the second sighting as `status: duplicate` (`duplicate_of` set) —
   catalogued in the ledger but kept out of the issue snapshot, so the agent no
   longer hand-dedupes overlapping feeds each run.
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
   right after; the transcript caches forever. **Known cost (FR-Q5):** each episode
   spawns a fresh whisper process, so the model + backend (e.g. a ~1.4 GB ggml model
   + Metal init) reload per episode — measurable overhead on a many-episode run. This
   is accepted: **speed is explicitly not a goal** and the forever-cache means a
   re-run never re-transcribes. A persistent `whisper-server` / batched invocation is
   a deliberate future option, not a v1 commitment — see "Known limitations".

## Stage B — in-session agent

Subagent fan-out, incremental. Runs in the host session because it is LLM work.

4. **Summarize + tag** — one subagent per ready item (`model: haiku` — mechanical,
   parent-validated). Input: the crawled article
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
7. **Finalize on completion** — the issue is done when every `state.snapshot` item is
   `rendered` or `failed`. Interactive render does **not** advance the per-feed cursor
   (it is watch-internal poll memory — see [Windowing](#windowing)); the snapshot, not
   the cursor, is the interactive completeness guarantee. Resuming re-discovers the
   same window idempotently and processes only the items behind.

## Resume

Any interrupt (crash, `/compact`, user stop) is recovered by re-running `/magazine`
with the **same window**: re-discover (idempotent) rebuilds the same snapshot, then
process only items whose status is behind. Cached `crawl-cache/` and `transcripts/`
mean no re-crawl / re-transcribe. Because the window is explicit and discover is
GUID-idempotent, resume never drops or double-counts (NFR-2) — it no longer depends
on a cursor on the interactive path.

## Degraded items

A per-item failure (paywall, download error, transcribe failure, summarize
failure) becomes a **degraded, reason-flagged card** — `status: failed` with a
`failed_reason`, rendered with a visible warning. Nothing is ever silently dropped
(FR-15); failures stay in the ledger for a later retry.

## Known limitations

Accepted v1 trade-offs, recorded so a future run revisits them deliberately rather
than rediscovering them:

- **Per-episode whisper reload (FR-Q5).** `transcribe.sh` runs one whisper process
  per episode, reloading the model + backend each time. Real overhead on a
  many-episode catch-up, but accepted because speed is not a goal and transcripts
  cache forever. *Future option:* a persistent `whisper-server` or a single batched
  invocation over the run's audio set — opt-in, behind a flag, so the simple
  one-shot path stays the default. (Still future — distinct from the queue/worker
  below, which amortizes latency by moving transcription *off the issue-build path*,
  not by batching the model.)

- **Cold transcription at issue time → optional background worker.** The latency of
  transcribing a backlog at issue time is addressed by the optional
  `/magazine watch` worker (the ledger reframed as a multi-producer/multi-consumer
  queue; see [`watch.md`](watch.md)) — it keeps podcasts pre-transcribed in the
  background so interactive builds are mostly cache hits. Opt-in and off by default;
  the synchronous `prep` path still works without it.
