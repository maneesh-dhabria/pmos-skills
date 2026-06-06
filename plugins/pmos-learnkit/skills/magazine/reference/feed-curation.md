# magazine — feed catalog curation & bundle generation

How the shipped PM feed catalog (`data/catalog/`) and starter bundles
(`data/bundles/`) are produced — and how to regenerate or re-target them for another
audience. This is the methodology behind `/magazine curate`; a user or agent can also
run it by hand by following the phases below.

Tested end-to-end producing a **303-feed verified PM catalog** (newsletters +
podcasts) with verified RSS and activity status.

## Contents

- [Goal](#goal)
- [Inputs](#inputs)
- [Method (4 phases)](#method-4-phases)
- [Phase 5 — Bundle generation](#phase-5--bundle-generation)
- [Hard rules](#hard-rules)
- [Validation](#validation)
- [Write-target safety](#write-target-safety)

## Goal

Given an **audience** (e.g. "product managers") and **topic lanes**, produce a
deduplicated, **feed-verified** catalog of newsletters and/or podcasts as TSV(s),
plus an `feeds.opml` of the active feeds and a set of curated **starter bundles**.
Never emit a feed URL that wasn't fetched and confirmed this run.

## Inputs

- `audience` — who the catalog is for. Shapes relevance filtering.
- `media` — `newsletters`, `podcasts`, or `both` (one file per medium).
- `lanes[]` — topic buckets to fan out over; each lane = one subagent's focus so they
  don't overlap. Example PM lanes: product-craft/strategy, growth/PLG/monetization,
  AI-PM, analytics/experimentation, UX/discovery, career/leadership,
  B2B/SaaS/fintech/platform, marketplaces/e-commerce, ML/recsys, founders/builders,
  business-strategy/biographies, plus one **"Top-N list miner"** lane for the long tail.
- `today` — current date (absolute). Derive `inactive_cutoff = today − 6 months`.
- `output_dir` — where the TSV(s), `feeds.opml`, and `bundles/` are written.

## Method (4 phases)

### Phase 1 — Discover (fan out, one agent per lane)
Each agent searches the web exhaustively within its lane and returns 15–30 real,
currently-active publications. Include the **Top-N list miner** lane (scrape "best X
newsletters/podcasts 20NN" roundups, Substack/Apple leaderboards, Reddit/HN threads).
Pass each agent the names already found as an **exclude list** to cut duplicate work.
Derive a best-guess RSS URL using platform conventions:
- Substack: `https://<handle>.substack.com/feed` (custom domains: `/feed` still works)
- Ghost: `/rss` · WordPress: `/feed/` · Beehiiv: `rss.beehiiv.com/feeds/<id>.xml` or `/feed`
- Podcasts: find the show's real feed via Apple Podcasts / the host (megaphone.fm,
  transistor.fm, simplecast.com, libsyn, buzzsprout, omny, art19, acast, captivate) —
  NOT the Apple/Spotify web page.

Agent output: one row per item, `|||`-delimited, no prose:
`Name|||Author or Host(s)|||RSS URL|||Access (Free/Freemium/Paid)|||3-4 line description|||Cadence|||Tags (comma-sep)`

### Phase 2 — Dedupe & consolidate (orchestrator)
Merge all lanes. Collapse duplicates by name/identity (same show under two URLs → keep
the verified/canonical feed and the richest description). Keep newsletters and
podcasts in separate piles.

### Phase 3 — Verify every feed (fan out in batches of ~18)
One agent per batch. For each feed the agent MUST:
1. `WebFetch` the URL. If valid RSS/Atom, extract the **most-recent item date**.
2. On cross-host redirect → fetch the target. On 404/403/not-a-feed → try alternates
   (`/feed`, `/rss`, `/index.xml`, `/feed.xml`, the Substack `/feed`, the host feed).
3. For `UNKNOWN`/placeholder URLs, try to discover a real feed (search + standard paths).
4. No working public feed after reasonable attempts → verdict `NOFEED`.

Agent output per feed: `Name|||VERDICT(VALID/NOFEED)|||WorkingURL|||LastPostDate(YYYY-MM-DD)`

### Phase 4 — Finalize (orchestrator, deterministic)
- **Drop** every `NOFEED` row (no verifiable feed = excluded — don't guess).
- Replace each URL with the verified working URL.
- Compute `Status`: `Inactive` if `LastPostDate < inactive_cutoff`, else `Active`.
  Recompute from the date yourself; treat unparseable-but-live feeds as `Active`.
- Write one TSV per medium with header + 9 columns:
  `Name, Author/Host(s), RSS Feed URL, Access, Description, Cadence, Tags, Status, Last Post/Episode`
- Audio-first shows → podcasts file; written publications → newsletters file.
- Generate `feeds.opml` (OPML 2.0) of **Active feeds only**, grouped into
  `<outline text="Newsletters">` / `<outline text="Podcasts">` folders; each leaf
  `<outline type="rss" text="Name — Author" title="Name" xmlUrl="..."/>`. XML-escape
  `& < > "`.

## Phase 5 — Bundle generation

After the catalog is finalized, derive the curated starter bundles. A bundle is a
small (~10–20), thematically-coherent subset of **Active** feeds, shipped as one OPML
per bundle under `bundles/<medium>/<id>.opml` plus a `bundles/bundles.yaml` manifest.

Two selection rules (documented per-bundle in the manifest `rule:` field so the cut is
transparent, not magic):

- **Essentials** — a hand-picked set (~12) of the widely-recognized canon for the
  audience (typically the most prominent entries at the top of the catalog).
- **Thematic** — every Active feed whose `Tags` match the bundle's defining tag set
  (case-insensitive), ordered by catalog position (prominence), capped at ~18.

Default PM bundle set (one `essentials` + three thematic per medium):

| medium | id | defining tags |
|---|---|---|
| newsletter | essentials | (hand-pick) |
| newsletter | growth-monetization | growth, plg, monetization, pricing, retention |
| newsletter | ai-for-pms | ai, genai, llms, ai-pm, ai-tools |
| newsletter | strategy-leadership | strategy, product-strategy, leadership, career |
| podcast | essentials | (hand-pick) |
| podcast | ai-and-tech | ai, ai-news, tech, engineering, machine-learning |
| podcast | founders-business | founders, startups, investing, markets, business, vc |
| podcast | leadership-career | leadership, career, management, communication |

`bundles.yaml` schema (one entry per bundle): `id`, `medium` (newsletter|podcast),
`title`, `description`, `rule`, `file` (relative to `bundles/`), `count` (must equal
the OPML's outline count). `id` is unique **within a medium** (both media may share an
`essentials`). Bundles ship **Active feeds only**; the full catalog TSV keeps every
row (incl. Inactive) so power users can mine the long tail.

After writing, run `node scripts/bundles.js validate-data` — it asserts every bundle
feed URL traces back to the matching-medium catalog TSV, counts match, and ids are
unique per medium.

## Hard rules
- **Verification-first:** a URL ships only if fetched and confirmed this run. No
  invented or unverified feeds.
- **Normalize** `Access` to {Free, Freemium, Paid} and `Cadence` to {Daily, Weekly,
  Fortnightly, Monthly, Others (...)}.
- **TSV hygiene:** real tab separators, exactly 9 columns per row, no duplicate
  names, no carriage returns; descriptions contain no tab characters.
- **Report, don't silently drop:** list what was dropped (NOFEED) and flagged
  Inactive, so the user can chase feeds manually (some active sites expose no public
  RSS — email-only or Apple/Spotify-exclusive).

## Validation
```
awk -F'\t' 'NF!=9{print NR": "NF}' file.tsv     # must be empty
# duplicate col-1 names must be empty; OPML must parse as well-formed XML
node scripts/bundles.js validate-data            # bundles trace to catalog
```
Print Active/Inactive and kept/dropped counts.

## Write-target safety

The installed skill directory is a **read-only plugin cache** that is wiped on update.
`/magazine curate` therefore **never writes into `${CLAUDE_SKILL_DIR}`**:

- **Installed run (default):** writes to `~/.pmos/magazine/curated/<YYYY-MM-DD>/`. The
  user can review and import from there with `add --from`.
- **Maintainer refresh:** run from inside the `agent-skills` repo with
  `--out plugins/pmos-learnkit/skills/magazine/data/` to regenerate the shipped
  catalog + bundles, then commit through `/complete-dev`.
