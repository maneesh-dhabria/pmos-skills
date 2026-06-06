# Requirements — /magazine feed bundles & curation

**Skill:** `magazine` (pmos-learnkit)
**Mode:** skill-new · **Tier:** 3 · **Date:** 2026-06-06
**Acceptance criteria standing reference:** `reference/skill-patterns.md §A–§F` — the produced skill must conform.

## Problem

`/magazine` turns a user's RSS subscriptions into a trustworthy digest — but it
assumes the user **already has** a `feeds.yaml`. A new PM arriving at the skill faces
a cold start: an empty subscription list and no obvious way to populate it. They must
hunt down each newsletter/podcast and its RSS URL by hand before the skill delivers
any value. The skill's value (trust + windowing) is gated behind tedious manual
feed-gathering.

Separately, the maintainer has a tested research methodology (a 4-phase, multi-agent,
verification-first fan-out) that produced a **303-feed verified PM catalog**
(174 active newsletters + 129 active podcasts). That methodology and its output live
in a scratch project, not in the skill — so it can't be re-run, updated, or offered
to users.

## Goal

Ship `/magazine` with a **bundled, verified PM feed catalog** plus **ready-made
starter bundles** so a PM goes from zero to a populated, relevant `feeds.yaml` in one
command — and bake the **research methodology** into the skill's references so the
catalog can be regenerated/updated (by the maintainer, or rarely by a user).

## Users & journeys

### J1 — New PM, cold start (primary)
A PM installs the skill, runs `/magazine`, has no feeds. First-run setup offers
starter bundles. They pick `ai-for-pms` (newsletters) + `essentials` (podcasts),
the feeds are validated and added, and their first issue builds. Time-to-value:
~1 minute, no manual URL hunting.

### J2 — Existing user, targeted top-up
A PM already running `/magazine` wants more growth coverage. They run
`/magazine bundles` to see what's available, then `/magazine add --bundle
growth-monetization`. New feeds are validated and merged (dedup against existing).

### J3 — Cherry-picker
A PM wants the full menu. They open the bundled catalog TSV (newsletters +
podcasts, with Status/Access/Tags), pick individual feeds, and add them with
`/magazine add <url>` or `add --from <their-own-file>`.

### J4 — Maintainer refresh (rare)
The maintainer (or a power user) runs `/magazine curate` to re-run the research
fan-out and regenerate the catalog TSVs, OPML, and bundles — keeping the shipped
data fresh. Driven by `reference/feed-curation.md`.

## Functional requirements

**Bundled data (ship with the skill):**
- FR-1 — Ship a verified catalog: `data/catalog/pm-newsletters.tsv` +
  `pm-podcasts.tsv`, 9-column schema (Name, Author/Host(s), RSS Feed URL, Access,
  Description, Cadence, Tags, Status, Last Post/Episode). Keep all rows incl.
  Inactive (Status column distinguishes).
- FR-2 — Ship `data/catalog/feeds.opml` (OPML 2.0) of **Active** feeds, foldered
  into Newsletters / Podcasts.
- FR-3 — Ship 8 curated bundles: newsletters `{essentials, growth-monetization,
  ai-for-pms, strategy-leadership}`, podcasts `{essentials, ai-and-tech,
  founders-business, leadership-career}`. Each bundle = **Active feeds only**,
  ~10–20 feeds, drawn from the catalog by tag/curation.
- FR-4 — Bundle storage format: one OPML file per bundle under
  `data/bundles/<medium>/<bundle>.opml`, plus a `data/bundles/bundles.yaml`
  manifest (id, medium, title, one-line description, feed count, source file).

**New commands (ride the existing import rail):**
- FR-5 — `/magazine bundles` — list available bundles (id, medium, title,
  description, feed count) from `bundles.yaml`. Read-only.
- FR-6 — `/magazine add --bundle <id>` — import a bundle: resolve its OPML →
  validate each feed by fetching XML (`fetch-feed.js`) → **batch-approve** →
  merge into `feeds.yaml`, deduping against existing feeds by name/url. Reuses the
  existing assisted-import flow; no parallel code path.
- FR-7 — `add --bundle` with an unknown id → list valid ids; never silently no-op.
- FR-8 — `/magazine curate [--audience <a>] [--media <m>]` — run the research
  methodology to regenerate catalog + bundles. Thin orchestrator that defers all
  mechanics to `reference/feed-curation.md`. Writes into the skill's `data/` (or a
  user-specified out dir). Rare/power-user path.

**Methodology reference:**
- FR-9 — Bundle the research methodology as `reference/feed-curation.md` — the
  refined 4-phase fan-out (discover → dedupe → verify → finalize), parameterized by
  audience/media/lanes, with the verification-first hard rules and validation
  commands. Re-runnable by `/magazine curate` and readable by a user directly.

**First-run onboarding:**
- FR-10 — First-run setup (empty `~/.pmos/magazine/`) offers starter bundles as
  part of the initial feed-set step: present the bundle menu (multi-select), import
  the chosen bundles through the FR-6 flow. Skipping is allowed (keep manual add).
  Carries a `(Recommended)` default so non-interactive runs auto-pick.

**Wiring/discoverability:**
- FR-11 — `argument-hint` enumerates `bundles`, `add --bundle <id>`, `curate`.
- FR-12 — `description` gains trigger phrases: "starter feeds", "recommended PM
  newsletters/podcasts", "bundle", "get me started with feeds".
- FR-13 — `reference/import.md` documents `bundles` / `add --bundle` / `curate`
  dispatch + the bundle file layout.

## Non-functional / constraints

- NFR-1 — **Verification-first stays sacred.** Bundles are validated at import time
  (fetch XML before writing feeds.yaml), same as any assisted import. A shipped feed
  that 404s at import is reported, not silently added.
- NFR-2 — **No new dependencies.** Bundles ride `fetch-feed.js` + the existing
  import flow. `curate` uses WebSearch/WebFetch + subagents already available.
- NFR-3 — Dedup on import: adding a bundle that overlaps existing feeds must not
  create duplicate `feeds.yaml` entries.
- NFR-4 — Catalog data is a **snapshot** — feeds drift. Ship `Last Post` dates and
  a "regenerate with /magazine curate" pointer so staleness is honest, not hidden.
- NFR-5 — Skill conforms to `skill-patterns.md` (progressive disclosure: mechanics
  in reference/, lean body) and this repo's canonical path + manifest-sync rules.

## Out of scope

- Auto-refreshing the catalog on a schedule (cron). Manual `curate` only.
- Per-user bundle authoring/saving (users add individual feeds or their own
  `--from` file).
- Non-PM audiences in the shipped data (the methodology supports other audiences;
  only the PM catalog ships).
- `--format both` / MD export of bundle listings (HTML/chat output only).

## Decisions (resolved at requirements)

- D1 — Bundle UX = first-class `add --bundle` + `bundles` list (not plain files).
- D2 — Ship full catalog + curated bundles (not bundles only).
- D3 — Bundles active-only; full catalog keeps all rows w/ Status.
- D4 — Bundle set = 4 newsletters + 4 podcasts (essentials + 3 thematic each).
- D5 — Re-curation = reference doc + thin `curate` subcommand.
- D6 — Bundle format = OPML per bundle + `bundles.yaml` manifest (OPML already
  supported by `add --from`; manifest gives the list/metadata).
