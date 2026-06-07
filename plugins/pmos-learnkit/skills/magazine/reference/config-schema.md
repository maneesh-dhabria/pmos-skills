# magazine — config & state schemas

All config and state live under `~/.pmos/magazine/`. The skill creates the
directory on first run. This file is the single source of truth for every file's
shape.

## Contents

- [feeds.yaml](#feedsyaml) — the subscription list
- [tags.yaml](#tagsyaml) — the closed tag registry
- [interest.yaml](#interestyaml) — declared interests for Top-picks curation
- [state.json](#statejson) — the per-item lifecycle ledger
- [caches](#caches) — transcripts/ and crawl-cache/

## feeds.yaml

The subscription list. Mutated only via `/magazine add|remove|list` (and assisted
import — see `import.md`). Never hand-edited mid-run.

```yaml
feeds:
  - name: lenny            # unique slug, used in state cursors + card badges
    url: https://www.lennysnewsletter.com/feed
    type: newsletter       # newsletter | podcast
    default_tags: [product, growth]   # optional; seeds tagging when LLM is unsure
    priority: high         # optional; high|normal|low — biases Top-picks tie-breaks
  - name: acquired
    url: https://feeds.transistor.fm/acquired
    type: podcast
    whisper_model: small   # optional per-feed override; default base
```

- `name` is the **single canonical key** (FR-R4): the cursor key in `state.json`,
  the ledger item's `feed`, and the source badge on each card — one slug everywhere.
  Older ledgers that keyed cursors by feed URL are remapped to the slug automatically
  on the next `discover`/`enqueue`. Re-importing a publication under a different slug
  resets its "since last run" anchor (see [state.json → Cursor rule](#statejson)).
- `type` decides Stage A routing (FR-R1): **only `podcast` items are transcribed**;
  `newsletter` items are crawled — *even when they carry an audio enclosure* (every
  Substack post does). An enclosure is necessary but not sufficient to transcribe.
- `whisper_model` defaults to `base` (fast, good-enough) when absent. It is a model
  **name** (`base`/`small`/`medium`/…), or an explicit ggml path. **The transcription
  drain + the background watcher thread this value into `transcribe.sh --model`**
  (FR-R2) — they no longer fall back to a bare `base` that a whisper.cpp user's model
  dir may not contain.
  - **openai-whisper** takes the name directly.
  - **whisper.cpp** (`whisper-cli`/`main`) needs a ggml model **file**, so
    `transcribe.sh` resolves the name to `ggml-<name>.bin`, searching in order:
    `$WHISPER_MODEL_DIR`, `~/.pmos/magazine/models/`,
    `$(brew --prefix)/share/whisper-cpp/models/`, then `./models/`. whisper.cpp users
    should drop their `ggml-*.bin` in one of those dirs or set `WHISPER_MODEL_DIR`.
    You may also set `whisper_model` to an explicit `/path/to/ggml-*.bin`, which is
    passed through unchanged. **The background scheduler does NOT inherit your shell's
    `WHISPER_MODEL_DIR`** — for the watcher, place the ggml in a default search dir
    (or set an explicit path in `whisper_model`). If no model resolves, transcription
    exits 3 and the item keeps its show-notes with an honest hint (never a fabricated
    summary); the watcher logs the exit to `watch.log` rather than failing silently.

## tags.yaml

The **closed** central registry. LLM-seeded on first run and batch-approved by the
user; the summarizer may only assign tags from this set. Always carries an
`uncategorized` bucket so "no fit" never blocks an item.

```yaml
tags:
  - product
  - growth
  - pricing
  - hiring
  - uncategorized          # always present
seeded_at: 2026-06-03
```

When the summarizer finds no fitting tag it assigns `uncategorized` and records a
`suggest-add` note for the user to approve into the registry later — it never
invents a tag inline.

## interest.yaml

**Declared** interests captured via a first-run interview. Feeds the Top-picks
curation subagent. This is NOT an engagement-learned signal in v1.

```yaml
topics: [pricing, plg, onboarding]
priority_feeds: [lenny]
defaults:                  # captured at first-run; the default build window
  days: 7                  # lookback when no --days flag is passed
  max_per_feed: 5          # per-feed cap when no --max-per-feed flag is passed
```

Empty/sparse `topics`/`priority_feeds` → Top-picks ranks on item-intrinsic
importance instead, so the lane is never random.

`defaults` (FR-Q3) stores the build window so a plain `/magazine` needs no
interactive prompt: the lookback resolves `--days` flag → `defaults.days` →
built-in `7`, and the cap resolves `--max-per-feed` flag → `defaults.max_per_feed`
→ uncapped (see `pipeline.md` → Windowing). First-run setup captures both; a flag
always overrides for a one-off run without rewriting the stored default. Absent
`defaults` (pre-FR-Q3 configs) falls through to the built-ins.

## state.json

The resume + dedup ledger. Managed exclusively through `scripts/magazine-state.js`
(atomic temp-then-rename writes). Per-item records are keyed by GUID; a `links`
index maps each item's canonicalized link to its first GUID for cross-feed dedup.

```json
{
  "cursors": { "lenny": "2026-05-27T00:00:00.000Z" },
  "links": { "example.com/ep?id=42": "substack:post:198591907" },
  "items": {
    "post-0001": {
      "feed": "lenny",
      "link": "https://.../pricing",
      "title": "Pricing strategy",
      "published": "2026-06-02T09:00:00.000Z",
      "status": "rendered",
      "issue": "2026-06-03"
    },
    "ep-42": {
      "feed": "acquired", "link": "https://.../ep42", "published": "2026-06-01T00:00:00.000Z",
      "status": "failed", "failed_reason": "no transcript — whisper not installed"
    }
  }
}
```

**Lifecycle** (`status`): `discovered → downloaded → transcribed → summarized →
rendered`, plus `failed` (carries `failed_reason`) from any state, plus `duplicate`
(carries `duplicate_of`, see Dedup below). A `failed` item that later succeeds
clears its `failed_reason`.

**Transcription queue (`transcribing`).** Podcast items (those with an
`enclosure`) at `discovered` are the pending transcription queue. A consumer
(background worker or interactive `prep`) atomically **claims** one
(`discovered → transcribing`, recording `claim: {by: <pid>, at: <ISO>}`) under the
`~/.pmos/magazine/.watch.lock`, transcribes it *outside* the lock, then **releases**
it (`transcribing → transcribed` on success; back to `discovered` for a retryable
miss). A claim whose owner PID is dead or whose `at` exceeds a 30-min TTL is
auto-reclaimed to `discovered`. The lock is node-level (`O_EXCL`; macOS has no
`flock`) and held only for the claim/release mutation. The background worker logs
to `~/.pmos/magazine/watch.log`. See [`watch.md`](watch.md). **Back-compat:** a
podcast left at `downloaded` by an older `prep` with a cached transcript is treated
as already-done; the new state/field are additive.

**Cursor rule:** `advanceCursors()` moves each feed cursor to the newest
`published` among its `rendered` items, and is called **only when the whole issue
completes** — so an interrupt + resume never drops or double-counts (FR-16, NFR-2).

**Dedup (two layers):**
- *GUID dedup* — `discover(guid, …)` is idempotent: re-discovering a known GUID is
  a no-op, so already-rendered items never reappear.
- *Cross-feed link dedup (FR-Q2)* — the same article syndicated across two feeds
  arrives under **different** GUIDs, which GUID dedup can't catch. `discover()`
  also keys a **canonical link** (lowercased host, `www.`/scheme/fragment dropped,
  tracking params — `utm*`/`ref`/`fbclid`/… — stripped, remaining params sorted,
  trailing slash trimmed). A second GUID landing on a known canonical link is
  recorded as `status: duplicate` with `duplicate_of` → the first GUID, and is
  kept out of the issue snapshot. It stays **catalogued, not dropped**. (This
  supersedes the v1 "accept duplicate GUIDs / no URL canonicalization" grill
  decision, which forced the agent to hand-dedupe overlapping feeds every run.)

## caches

- `transcripts/<guid>.txt` — whisper transcripts, cached **forever**. Resume and
  re-summarize never re-transcribe.
- `crawl-cache/<guid>.txt` — extracted article text, cached forever. A link is
  never re-crawled.
- Audio is downloaded to a temp path and **deleted immediately** after a successful
  transcript (FR-6) — only the text is kept.
