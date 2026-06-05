# magazine — issue & library output contract

The output is rendered by `scripts/render-issue.js` (zero-dep). Both files are
self-contained (inline CSS + JS) and work from `file://` with no server (NFR-3).
Every reader affordance added in the Wave-1 output-UX pass (view-switcher,
read-state, dropdown filters, keyboard skim, collapsing cards) is a
**progressive enhancement** gated on a `body.js` class the inline script adds on
load: with JavaScript disabled, the grid, every bullet, and the read links still
work (NFR — progressive enhancement).

## Contents

- [Issue HTML](#issue-html) — the per-run digest
- [Card structure](#card-structure) — one item
- [Filter bar](#filter-bar) — client-side filtering
- [Reading modes & state](#reading-modes--state) — layout, read-state, keyboard
- [Library index](#library-index) — cross-issue search
- [render-issue.js inputs](#render-issuejs-inputs)

## Issue HTML

Path: `{docs_path}/magazine/{YYYY-MM-DD}_issue.html`. Layout, top to bottom:

- **Header** — "Magazine", issue date, item count, and a **catch-up budget**
  ("~N min to skim · Xh Ym of audio", summed from `reading_time`); a
  **view-switcher** (Grid / Cards / List); a **reading counter** ("N of M left");
  a **hide-read** toggle.
- **Filter bar** (sticky) — feed + tag + type + read-state dropdowns + date range
  + a live result counter.
- **Carousel nav** (shown only in Cards view) — ◀ / position / ▶.
- **Top picks lane** — the `top_pick` items, rendered above the grid.
- **All items grid** — every item as a card.
- **Footer** — provenance.

Carries `<meta name="pmos:skill" content="magazine">` in the head.

## Card structure

Each card shows, in order:

- a **mark-read** ✓ button (top-right; JS only);
- a source-**type badge** (`newsletter` / `podcast`);
- the **title**;
- a **meta line** — a per-feed color **dot** + feed name · date · reading-time/episode-length;
- a **degraded warning** when `degraded` is set (⚠ + reason);
- bullet takeaways — **first 3 shown, "Show more"** reveals the rest (JS only; all show with JS off);
- **tag chips** — each tinted with a deterministic per-tag color (stable across issues);
- a **read/listen link** (verb chosen by `type`).

Cards carry `data-guid`, `data-type`, `data-feed`, `data-date`, and `data-tags`
attributes — the filter, read-state, and keyboard JS read these. A `top_pick`
card gets the `pick` class; a `degraded` card gets the `degraded` class (dashed
border, dimmed); a read card gets the `read` class (dimmed; hidden when
hide-read is on). `data-type` drives a subtle left-border accent (newsletter vs
podcast).

## Filter bar

All filtering is client-side over the rendered cards — no server, no rebuild:

- **Feed** — multi-select dropdown; empty selection = all feeds.
- **Tag** — multi-select dropdown; empty = all tags; a card matches if it has any selected tag.
- **Type** — dropdown (all / newsletter / podcast).
- **Status** — dropdown (all / unread / read), reading the localStorage read-state.
- **Date range** — two `<input type="date">`; inclusive bounds on the card date.
- **Result counter** — `#count` shows "showing X of Y" live.

Filters compose (AND across dimensions, OR within a multi-select). Hidden cards
get a `hidden` class. The feed/tag controls keep their `f-feed` / `f-tag` class
hooks; type/status add `f-type` / `f-read`.

## Reading modes & state

Reader affordances, all client-side and persisted in `localStorage` (device-local):

- **View-switcher** (`mag:view` = `grid` | `carousel` | `listicle`) — Grid is the
  default and the no-JS fallback. Carousel ("Cards") shows one item at a time with
  ◀▶ buttons and `←`/`→` keys (it pages the all-items set; the top-picks lane is
  hidden in this view to avoid showing picks twice). Listicle is a single column.
- **Read-state** (`mag:read:<issue_date>` = JSON array of read guids) — click a
  card's ✓ or press `m` to toggle; the header counter decrements; the **hide-read**
  toggle (`mag:hideRead`) removes read cards from view.
- **Keyboard skim** — `j` / `k` move the focused card next/prev, `o` opens its
  link, `f` focuses the filter, `m` toggles read; in Carousel `←`/`→` navigate.
  Ignored while typing in an input/select.

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
