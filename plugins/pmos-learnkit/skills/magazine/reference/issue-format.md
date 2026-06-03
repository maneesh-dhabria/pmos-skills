# magazine — issue & library output contract

The output is rendered by `scripts/render-issue.js` (zero-dep). Both files are
self-contained (inline CSS + JS) and work from `file://` with no server (NFR-3).

## Contents

- [Issue HTML](#issue-html) — the per-run digest
- [Card structure](#card-structure) — one item
- [Filter bar](#filter-bar) — client-side filtering
- [Library index](#library-index) — cross-issue search
- [render-issue.js inputs](#render-issuejs-inputs)

## Issue HTML

Path: `{docs_path}/magazine/{YYYY-MM-DD}_issue.html`. Layout, top to bottom:

- **Header** — "Magazine", issue date, item count.
- **Filter bar** (sticky) — feed multi-select + tag chips + date range.
- **Top picks lane** — the `top_pick` items, rendered above the grid.
- **All items grid** — every item as a card.
- **Footer** — provenance.

Carries `<meta name="pmos:skill" content="magazine">` in the head.

## Card structure

Each card shows, in order:

- a source-**type badge** (`newsletter` / `podcast`);
- the **title**;
- a **meta line** — feed name · date · reading-time/episode-length;
- a **degraded warning** when `degraded` is set (⚠ + reason);
- **3–5 bullet** takeaways;
- **tag chips**;
- a **read/listen link** (verb chosen by `type`).

Cards carry `data-feed`, `data-date`, and `data-tags` attributes — the filter JS
reads these. A `top_pick` card gets the `pick` class; a `degraded` card gets the
`degraded` class (dashed border, dimmed).

## Filter bar

All filtering is client-side over the rendered cards — no server, no rebuild:

- **Feed multi-select** — checkboxes; empty = all feeds.
- **Tag chips** — toggle; empty = all tags; a card matches if it has any selected tag.
- **Date range** — two `<input type="date">`; inclusive bounds on the card date.

Filters compose (AND across dimensions, OR within tags). Hidden cards get a
`hidden` class.

## Library index

Path: `{docs_path}/magazine/index.html`. A searchable table across **every** past
issue: Date · Feed · Title · Tags · Issue-link. A single search box filters rows
client-side by title, feed, or tag. **Per-issue dedup**: an item appearing in more
than one issue (same link) is listed once (FR-20).

## render-issue.js inputs

`render-issue.js issue <items.json>`:

```json
{ "issue_date": "2026-06-03",
  "items": [ { "guid": "...", "feed": "lenny", "type": "newsletter",
    "title": "...", "link": "https://...", "published": "2026-06-02T09:00:00Z",
    "reading_time": "6 min", "bullets": ["...","..."], "tags": ["pricing"],
    "top_pick": true, "degraded": "no transcript — install whisper" } ] }
```

`render-issue.js library <issues.json>`:

```json
{ "issues": [ { "date": "2026-06-03", "file": "2026-06-03_issue.html",
    "items": [ { "title": "...", "feed": "lenny", "tags": ["pricing"],
      "date": "2026-06-02", "link": "https://..." } ] } ] }
```
