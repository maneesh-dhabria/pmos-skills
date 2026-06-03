# magazine — command dispatch & assisted import

How `/magazine`'s argument string is dispatched, and how the assisted-import flow
turns a messy subscription list into validated `feeds.yaml` entries.

## Contents

- [Token-1 dispatch](#token-1-dispatch)
- [add / remove / list](#add--remove--list)
- [Assisted import (--from)](#assisted-import---from)
- [Feed-URL resolution heuristics](#feed-url-resolution-heuristics)

## Token-1 dispatch

Token 1 is a **subcommand selector** only when it is exactly `add`, `remove`, or
`list` AND the following token matches the expected shape:

| Token 1 | Selector when… | Else |
|---|---|---|
| `list` | sole token | build invocation |
| `add` | next token is a URL, or `--from <path>` | build invocation |
| `remove` | next token is an existing feed `name` | build invocation |

Anything else (including a bare `/magazine`) is a **build** of the current window.
Never infer a subcommand from free text — the selector is explicit.

## add / remove / list

- `add <url> [--type newsletter|podcast] [--name <slug>]` — fetch the feed XML to
  validate it, derive `name`/`type` when not given, append to `feeds.yaml`.
- `remove <name>` — drop the matching feed; its cached items/transcripts stay
  (dedup history is preserved).
- `list` — print the current feeds with name, type, url, and last-run cursor.

## Assisted import (--from)

`add --from <path>` accepts three input shapes and runs the same resolve →
validate → batch-approve flow before writing `feeds.yaml`:

1. **OPML** (`.opml`/`.xml`) — parse `<outline xmlUrl="…">` entries directly; the
   simplest case (the URL is already present).
2. **CSV** — map columns to `name`/`url`/`type`; if only names are present, resolve
   URLs via the heuristics below.
3. **Image** (screenshot of a Substack "Subscriptions" page or a podcast-app
   library) — read the image, extract the visible publication/show names, then
   resolve each to a candidate feed URL.

For every extracted entry: resolve a candidate feed URL, **validate it by fetching
the feed XML** (`scripts/fetch-feed.js <url> --max 1`), and present the resolved
set for **batch-approval** before appending. Entries that cannot be resolved or
validated are listed for the user — never silently dropped.

## Feed-URL resolution heuristics

- **Substack** publication → `https://<name>.substack.com/feed`.
- **Beehiiv / Ghost / WordPress** → try `<homepage>/feed` then `<homepage>/rss`.
- **Podcasts** → search the show name; prefer the publisher's canonical RSS over an
  aggregator deep link.
- Unknown homepage → fetch it and look for `<link rel="alternate"
  type="application/rss+xml">`.

When a resolution is uncertain, present the candidate URL for the user to confirm
or correct rather than guessing silently.
