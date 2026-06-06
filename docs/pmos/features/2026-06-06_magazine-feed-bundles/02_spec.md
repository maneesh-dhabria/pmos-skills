# Spec — /magazine feed bundles & curation

**Skill:** `magazine` (pmos-learnkit) · **Tier:** 3 · **Date:** 2026-06-06
Derived from `01_requirements.md`. Conforms to `reference/skill-patterns.md §A–§F`
and this repo's `CLAUDE.md` (canonical path, manifest version-sync, /complete-dev).

## 1. File layout (added to the skill)

```
plugins/pmos-learnkit/skills/magazine/
  data/
    catalog/
      pm-newsletters.tsv          # 9-col, all rows (Active+Inactive)
      pm-podcasts.tsv             # 9-col, all rows
      feeds.opml                  # OPML 2.0, Active feeds, Newsletters/Podcasts folders
    bundles/
      bundles.yaml                # manifest (single source of truth for the menu)
      newsletters/
        essentials.opml
        growth-monetization.opml
        ai-for-pms.opml
        strategy-leadership.opml
      podcasts/
        essentials.opml
        ai-and-tech.opml
        founders-business.opml
        leadership-career.opml
  reference/
    feed-curation.md              # the research methodology (re-runnable)
    import.md                     # +bundles/add --bundle/curate dispatch (edited)
  scripts/
    bundles.js                    # list/resolve bundles; parse bundles.yaml + OPML
  tests/
    bundles.test.sh              # data + manifest + dispatch integrity (deterministic)
  SKILL.md                        # +dispatch, +argument-hint, +description (edited)
```

## 2. Data formats

### 2.1 Catalog TSV (`data/catalog/*.tsv`)
Exactly 9 tab-separated columns, header row required:
`Name, Author/Host(s), RSS Feed URL, Access, Description, Cadence, Tags, Status, Last Post/Episode`
- `Access ∈ {Free, Freemium, Paid}`; `Status ∈ {Active, Inactive}`.
- Hygiene: every data row has exactly 9 fields; no tab chars inside fields; no
  duplicate col-1 names within a file; no CR.
- Sourced verbatim from the verified research output (already passes hygiene).

### 2.2 Bundle OPML (`data/bundles/<medium>/<id>.opml`)
OPML 2.0. Single body, leaf outlines only:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>magazine bundle — ai-for-pms (newsletters)</title></head>
  <body>
    <outline type="rss" text="Lenny's Newsletter — Lenny Rachitsky"
             title="Lenny's Newsletter" xmlUrl="https://www.lennysnewsletter.com/feed"/>
    ...
  </body>
</opml>
```
- Active feeds only. `xmlUrl` = the verified working URL from the catalog.
- XML-escape `& < > "` in attribute values.
- Type is implied by the medium folder (newsletters → `type: newsletter`,
  podcasts → `type: podcast`), consumed by the importer.

### 2.3 Bundle manifest (`data/bundles/bundles.yaml`)
The menu source of truth. `bundles.js` and the `bundles` listing read only this.
```yaml
version: 1
generated_at: 2026-06-06
bundles:
  - id: essentials
    medium: newsletter            # newsletter | podcast
    title: "PM Essentials"
    description: "The widely-recognized canon every PM should read."
    rule: "Hand-picked top-signal newsletters."
    file: newsletters/essentials.opml
    count: 12
  - id: ai-for-pms
    medium: newsletter
    title: "AI for PMs"
    description: "Building with and reasoning about AI/LLMs as a PM."
    rule: "Active newsletters tagged ai|genai|llms|ai-pm|ai-tools."
    file: newsletters/ai-for-pms.opml
    count: 18
  # ... 8 total (4 newsletter + 4 podcast)
```
- `id` is unique **within a medium** (both media have an `essentials`). The
  command addresses a bundle by `<id>` and disambiguates by medium when needed;
  bare ambiguous `essentials` lists both and asks which (or `--medium`).

## 3. `scripts/bundles.js` (zero-dep Node)

CLI, no external deps (matches existing scripts). Subcommands:
- `list [--json]` — parse `bundles.yaml`; print the menu (id, medium, title, count,
  description). `--json` for programmatic use. Exit 0.
- `resolve <id> [--medium <m>]` — print the resolved feed list for a bundle as JSON
  array `[{name, host, url, type}]` parsed from its OPML. Errors:
  - unknown id → exit 3, stderr lists valid ids (FR-7).
  - ambiguous id (both media) without `--medium` → exit 4, stderr asks for `--medium`.
- `validate-data` — used by tests: assert every `bundles.yaml` `file` exists, parses
  as OPML, `count` matches outline count, every bundle feed URL appears in the
  matching-medium catalog TSV, manifest ids unique per medium. Exit 0/1.

OPML parsing: regex/stack walker over `<outline ... xmlUrl="...">` (same lightweight
approach as the repo's other zero-dep parsers — no XML lib). TSV parsing: split on
`\t`.

## 4. SKILL.md changes

### 4.1 Frontmatter
- `argument-hint`: add `bundles`, `add --bundle <id>`, `curate`:
  `"[add <url> | add --bundle <id> | add --from <file> | remove <name> | bundles | curate | list] [--days N] [--feed <name>] [--max-per-feed N] [--medium <newsletter|podcast>] [--audience <a>] [--media <m>] [--out <dir>] [--format <html|md|both>] [--non-interactive] [--interactive]"`
- `description`: append trigger phrases — "starter feeds", "recommended PM
  newsletters", "recommended PM podcasts", "feed bundle", "get me started with
  feeds", "curate a feed catalog". (Keep under length norms; conforms §B.)

### 4.2 Phase 1 dispatch (extend Token-1 table)
Add to the dispatch in Phase 1 / `import.md`:
| Token 1 | Selector when… | Action |
|---|---|---|
| `bundles` | sole token | list bundles via `bundles.js list`; end. |
| `add --bundle <id>` | `--bundle` present | resolve via `bundles.js resolve` → validate each feed (`fetch-feed.js <url> --max 1`) → batch-approve → merge into feeds.yaml (dedup by name/url). End. |
| `curate` | token 1 == `curate` | run `reference/feed-curation.md` (see §5); end. |

`add --bundle` reuses the **existing** assisted-import resolve→validate→batch-approve
→append machinery (import.md). The only new step is `bundles.js resolve` producing
the candidate list and the medium→type inference. Dedup: skip any candidate whose
name or canonicalized url already exists in feeds.yaml; report skipped as
"already subscribed".

### 4.3 First-run onboarding (extend Phase 1 first-run setup)
After tags/interest seeding, in the "initial feed set" step, present the bundle menu
(from `bundles.js list`) as a multi-select with a `(Recommended)` default of
`{newsletters: essentials, podcasts: essentials}`. Chosen bundles import via §4.2.
Offer `add --from <file>` and manual `add <url>` as alternatives. Skipping is
allowed. Non-interactive → auto-pick the Recommended starter pair.

## 5. `curate` subcommand (thin)

`/magazine curate [--audience "<a>"] [--media newsletters|podcasts|both] [--out <dir>]`
- Defaults: `audience="product managers"`, `media=both`,
  `out=~/.pmos/magazine/curated/<YYYY-MM-DD>/`.
- Body: load `reference/feed-curation.md`; run its 4 phases (multi-agent fan-out
  discover → dedupe → verify → finalize) with the params; write `pm-newsletters.tsv`,
  `pm-podcasts.tsv`, `feeds.opml`, and regenerate bundles (`bundles.yaml` + per-bundle
  OPML) into `--out`.
- **Write-target safety (G1):** never writes into `${CLAUDE_SKILL_DIR}`. To refresh
  shipped data, the maintainer runs from the repo with
  `--out plugins/pmos-learnkit/skills/magazine/data/`. The skill body states this.
- Honest about cost: warns it's a long, network-heavy, token-heavy run before
  starting; carries a `(Recommended)` proceed option for non-interactive.

## 6. `reference/feed-curation.md`

Refined from the user's tested `feed-curation-prompt.md`. Keep its 4-phase method,
parameterization (audience/media/lanes/today/output_dir), platform conventions for
RSS resolution, the verification-first hard rules, and validation commands. Add:
- A short "Bundle generation" Phase 5: after the catalog is finalized, derive the
  curated bundles per the §2.3 rules (essentials hand-pick; thematic by tag), emit
  per-bundle OPML + `bundles.yaml`.
- A pointer that `/magazine curate` is the command wrapper, and that a user/agent can
  run the method by hand by reading this file.

## 7. Testing strategy

`tests/bundles.test.sh` (bash, deterministic, **no network**):
1. `bundles.yaml` parses; `version: 1`; ≥3 bundles per medium (FR-3: expect 4+4).
2. Every manifest `file` exists and parses as well-formed XML (`xmllint --noout` if
   present, else a Node well-formed check via `bundles.js validate-data`).
3. Each bundle's outline count == manifest `count`.
4. Every bundle feed `xmlUrl` is present in the matching-medium catalog TSV.
5. Catalog TSV hygiene: `awk -F'\t' 'NF!=9'` empty; no duplicate col-1 names.
6. Bundle ids unique within a medium; both media may share `essentials`.
7. `bundles.js list --json` emits valid JSON with all manifest ids.
8. `bundles.js resolve <id> --medium newsletter` returns N feeds == count, each with
   `type: newsletter`.
9. Unknown id → exit 3; ambiguous id w/o `--medium` → exit 4.
Wire into existing `tests/structure.test.sh` runner or run standalone; both invoked
by `/verify`.

## 8. Verification plan (maps to /verify)
- Lint/structure: `bash tests/structure.test.sh` + `bash tests/bundles.test.sh` green.
- `bundles.js validate-data` exits 0.
- Manual: `/magazine bundles` lists 8; `bundles.js resolve ai-for-pms --medium
  newsletter` returns the AI feeds; a dry import shows dedup against an existing feed.
- skill-eval (Phase 6a) green against `skill-eval.md`.
- Progressive disclosure preserved: SKILL.md body stays lean; mechanics in reference/.

## 9. Release prerequisites (for /complete-dev — NOT plan waves)
- Bump `plugins/pmos-learnkit/.claude-plugin/plugin.json` + `.codex-plugin/plugin.json`
  to the same new minor version (0.14.0).
- Changelog entry; README row/update for the new bundle/curate capability if present.
- No marketplace.json version edits (per CLAUDE.md).
- `~/.pmos/learnings.md` `## /magazine` header bootstrap if missing.
