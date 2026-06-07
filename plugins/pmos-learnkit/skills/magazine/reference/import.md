# magazine — command dispatch & assisted import

How `/magazine`'s argument string is dispatched, and how the assisted-import flow
turns a messy subscription list into validated `feeds.yaml` entries.

## Contents

- [Token-1 dispatch](#token-1-dispatch)
- [add / remove / list](#add--remove--list)
- [Bundles (bundles / add --bundle)](#bundles-bundles--add---bundle)
- [Curate (regenerate the catalog)](#curate-regenerate-the-catalog)
- [Assisted import (--from)](#assisted-import---from)
- [Feed-URL resolution heuristics](#feed-url-resolution-heuristics)

## Token-1 dispatch

Token 1 is a **subcommand selector** only when it is exactly `add`, `remove`,
`list`, `bundles`, `curate`, or `watch` AND the following token matches the expected
shape:

| Token 1 | Selector when… | Else |
|---|---|---|
| `list` | sole token | build invocation |
| `add` | next token is a URL, `--from <path>`, or `--bundle <id>` | build invocation |
| `remove` | next token is an existing feed `name` | build invocation |
| `bundles` | sole token | build invocation |
| `curate` | token 1 == `curate` | build invocation |
| `watch` | next token is `--install`, `--status`, `--run-now`, or `--uninstall` | build invocation |

Anything else (including a bare `/magazine`) is a **build** of the current window.
Never infer a subcommand from free text — the selector is explicit.

## add / remove / list

- `add <url> [--type newsletter|podcast] [--name <slug>]` — fetch the feed XML to
  validate it, derive `name`/`type` when not given, append to `feeds.yaml`.
- `remove <name>` — drop the matching feed; its cached items/transcripts stay
  (dedup history is preserved).
- `list` — print the current feeds with name, type, url, and last-run cursor.

## Bundles (bundles / add --bundle)

The skill ships a verified PM feed catalog (`data/catalog/`) and 8 curated starter
bundles (`data/bundles/` — 4 newsletter + 4 podcast). Bundles let a new user go from
an empty `feeds.yaml` to a relevant subscription set in one command. The bundle
manifest is `data/bundles/bundles.yaml`; per-bundle feeds live in
`data/bundles/<medium>/<id>.opml`. All bundle data is read through
`scripts/bundles.js` — never hand-parse the manifest.

- `bundles` — list available bundles:
  ```
  node ${CLAUDE_SKILL_DIR}/scripts/bundles.js list
  ```
  Prints id, medium, feed count, title, and one-line description for each. Read-only.

- `add --bundle <id> [--medium newsletter|podcast]` — import a bundle's feeds:
  1. `node ${CLAUDE_SKILL_DIR}/scripts/bundles.js resolve <id> [--medium <m>]` returns
     the feed list as JSON (`[{name, host, url, type}]`). `type` is inferred from the
     bundle's medium — so bundle import knows newsletter-vs-podcast that generic OPML
     import has to guess. Exit 3 = unknown id (stderr lists valid ids — surface them;
     never silently no-op). Exit 4 = ambiguous id present in both media (re-run with
     `--medium`).
  2. **Validate** each resolved feed by fetching its XML
     (`scripts/fetch-feed.js <url> --max 1`) — same verification-first gate as any
     assisted import. A feed that fails validation is reported, not added.
  3. **Dedup** against the current `feeds.yaml`: skip any candidate whose `name` or
     canonicalized `url` already exists; report skipped ones as "already subscribed".
  4. **Batch-approve** the remaining (validated, new) feeds, then append to
     `feeds.yaml` with the inferred `type`. Do **not** set `default_tags` — tagging
     happens at summarize time from the closed `tags.yaml` registry.

  This reuses the existing assisted-import resolve→validate→batch-approve→append
  machinery; the only bundle-specific step is `bundles.js resolve`.

## Curate (regenerate the catalog)

`curate [--audience "<a>"] [--media newsletters|podcasts|both] [--out <dir>]` — a thin
wrapper that runs the research methodology in `reference/feed-curation.md` to
regenerate the catalog TSVs, `feeds.opml`, and the bundles. Rare / power-user path.

- Defaults: `audience="product managers"`, `media=both`,
  `out=~/.pmos/magazine/curated/<YYYY-MM-DD>/`.
- **Never writes into `${CLAUDE_SKILL_DIR}`** (read-only plugin cache, wiped on
  update). To refresh the *shipped* data, the maintainer runs from the repo with
  `--out plugins/pmos-learnkit/skills/magazine/data/` and commits via `/complete-dev`.
- It is a long, network- and token-heavy run — warn the user before starting.
- All mechanics (the 4-phase fan-out + Phase 5 bundle generation + hard rules +
  validation) live in `reference/feed-curation.md`; `curate` only parameterizes and
  dispatches it.

## Watch (background transcription)

`watch <--install|--status|--run-now|--uninstall>` manages the optional local
background podcast-transcription worker. It is a thin dispatch to
`scripts/magazine-watch.js`; all mechanics (the queue model, scheduler artifacts,
the lock, troubleshooting) live in [`reference/watch.md`](watch.md). `--install`
refuses unless whisper is detected and ≥1 podcast feed exists.

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
