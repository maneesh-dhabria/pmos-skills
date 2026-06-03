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

- `name` is the cursor key in `state.json` and the source badge on each card.
- `type` decides Stage A: `podcast` items go through `transcribe.sh`; `newsletter`
  items skip transcription.
- `whisper_model` defaults to `base` (fast, good-enough) when absent.

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
```

Empty/sparse → Top-picks ranks on item-intrinsic importance instead, so the lane
is never random.

## state.json

The resume + dedup ledger. Managed exclusively through `scripts/magazine-state.js`
(atomic temp-then-rename writes). Per-item records are keyed by GUID.

```json
{
  "cursors": { "lenny": "2026-05-27T00:00:00.000Z" },
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
rendered`, plus `failed` (carries `failed_reason`) from any state. A `failed` item
that later succeeds clears its `failed_reason`.

**Cursor rule:** `advanceCursors()` moves each feed cursor to the newest
`published` among its `rendered` items, and is called **only when the whole issue
completes** — so an interrupt + resume never drops or double-counts (FR-16, NFR-2).

**Dedup:** `discover(guid, …)` is idempotent — re-discovering a known GUID is a
no-op, so already-rendered items never reappear. v1 accepts duplicate GUIDs for the
same article syndicated across two feeds (no URL canonicalization — grill decision).

## caches

- `transcripts/<guid>.txt` — whisper transcripts, cached **forever**. Resume and
  re-summarize never re-transcribe.
- `crawl-cache/<guid>.txt` — extracted article text, cached forever. A link is
  never re-crawled.
- Audio is downloaded to a temp path and **deleted immediately** after a successful
  transcript (FR-6) — only the text is kept.
