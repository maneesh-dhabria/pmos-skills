---
name: magazine
description: Turns your scattered public RSS subscriptions — newsletters and podcasts — into one skimmable, filterable HTML digest of what's new since last time: a resumable local pipeline crawls each article, transcribes podcasts (whisper-if-installed), summarizes every item into 3–5 trustworthy bullets with a read/listen link, auto-tags from a closed registry, and ranks a Top-picks lane — saved as a durable issue plus a searchable library, offline from file://. Ships a verified PM feed catalog + starter bundles, and an optional local background worker that keeps podcasts transcribed so issues build fast. Use when the user wants to catch up on their feed backlog, wants recommended feeds, or wants podcasts pre-transcribed in the background. Triggers when the user says "digest my newsletters", "what's new in my feeds", "summarize my podcasts", "/magazine", "add a feed", "starter feeds", "add a feed bundle", "keep my podcasts transcribed", "/magazine watch", or "curate a feed catalog".
user-invocable: true
argument-hint: "[add <url> | add --bundle <id> | add --from <file> | remove <name> | bundles | curate | list | watch <--install|--status|--run-now|--uninstall>] [--days N] [--feed <name>] [--max-per-feed N] [--medium <newsletter|podcast>] [--audience <a>] [--media <newsletters|podcasts|both>] [--out <dir>] [--interval H] [--max K] [--ac-only] [--backfill DAYS] [--non-interactive] [--interactive]"
---

# Magazine

**Announce at start:** "Using magazine to build a filterable digest of what's new in your feeds."

Turn a dozen-plus public newsletter and podcast subscriptions into one trustworthy,
skimmable HTML issue of what's new since last time — then a searchable library of
every past issue. The value is **trust + windowing**, not raw aggregation: an RSS
reader already aggregates; this tells the user what's worth their time, in language
they trust. Speed is explicitly **not** a goal — the pipeline may run long, resumes
cleanly, and fills the issue incrementally.

The deep mechanics live one hop away in `reference/` — keep this body as the lean
orchestrator:

- `${CLAUDE_SKILL_DIR}/reference/config-schema.md` — `feeds.yaml` / `tags.yaml` / `interest.yaml` / `state.json`.
- `${CLAUDE_SKILL_DIR}/reference/pipeline.md` — Stage A + Stage B mechanics, lifecycle, cursor rule.
- `${CLAUDE_SKILL_DIR}/reference/issue-format.md` — issue HTML + library contract.
- `${CLAUDE_SKILL_DIR}/reference/import.md` — command dispatch + assisted import + bundles + curate.
- `${CLAUDE_SKILL_DIR}/reference/watch.md` — the optional background transcription worker: queue model, `/magazine watch` surface, scheduler artifacts.
- `${CLAUDE_SKILL_DIR}/reference/feed-curation.md` — the research methodology behind the shipped catalog + bundles (re-run via `curate`).

The skill ships a verified PM feed catalog and starter bundles under
`${CLAUDE_SKILL_DIR}/data/` (`catalog/` TSVs + `feeds.opml`; `bundles/` — 4 newsletter
+ 4 podcast OPML bundles + `bundles.yaml`). Read bundle data only through
`${CLAUDE_SKILL_DIR}/scripts/bundles.js` — never hand-parse the manifest.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion`:** the first-run interview, tag-registry approval, and
  import batch-approval degrade to numbered free-form prompts per
  `_shared/interactive-prompts.md`. The non-interactive auto-pick contract
  (Recommended → AUTO-PICK) still applies.
- **No `Task` subagent:** the Stage B summarize+tag fan-out runs sequentially in the
  host conversation — one item after another. Slower, identical output.
- **No transcription support:** do not probe with a bare on-PATH binary check —
  that misses whisper.cpp (`whisper-cli`/`main`) and a documented model name that has
  no ggml file. Probe by running `transcribe.sh --selftest` (it reports the detected
  binary): `bash ${CLAUDE_SKILL_DIR}/scripts/transcribe.sh --selftest`. Treat
  **exit 3 — and only exit 3** — from a real transcribe call as "no transcription":
  fall back to show-notes plus an honest "install whisper / set `WHISPER_MODEL_DIR`"
  hint on the card — never fabricate a summary.
- **No reach to `r.jina.ai`:** `extract-article.js` keeps its heuristic-strip result;
  if that is thin, fall back to the RSS `body`/`description` and flag the card
  `preview-only`.

## Track Progress

This skill has multiple sequential phases (setup → command-resolve → discover →
prep → summarize+tag → curate+render → commit → capture-learnings). Create one task
per phase using your agent's task-tracking tool (e.g. `TaskCreate` in Claude Code).
Mark each in-progress when you start it and completed as soon as it finishes — do
not batch completions.

## Phase 0: Pipeline setup + Load Learnings

Inline `_shared/pipeline-setup.md` to read `.pmos/settings.yaml` (require `version`;
default `output_format` to `html` when absent) and resolve `{docs_path}`. The issue
output dir is `{docs_path}/magazine/` (`mkdir -p` if missing). All feed config/state
lives under `~/.pmos/magazine/` (create on first run).

Resolve `output_format` with precedence `settings.output_format > default "html"`.
On Phase 0 entry, print to stderr `output_format: <v> (source: <settings|default>)`.
v1 emits HTML only.

Read `~/.pmos/learnings.md` if present; note any entries under the `## /magazine`
heading and factor them into your approach. **The skill body wins on conflict** —
surface any conflict between a learning and the body to the user before applying it.

The canonical non-interactive block below handles `mode` resolution, the
per-checkpoint classifier, the OQ buffer, and the end-of-skill summary. Do not
paraphrase or move it.

<!-- non-interactive-block:start -->
1. **Mode resolution.** Compute `(mode, source)` with precedence: `cli_flag > parent_marker > settings.default_mode > builtin-default ("interactive")` (FR-01).
   - `cli_flag` is `--non-interactive` or `--interactive` parsed from this skill's argument string. Last flag wins on conflict (FR-01.1).
   - `parent_marker` is set if the original prompt's first line matches `^\[mode: (interactive|non-interactive)\]$` (FR-06.1).
   - `settings.default_mode` is `.pmos/settings.yaml :: default_mode` if present and one of `interactive`/`non-interactive`. Unknown values → warn on stderr `settings: invalid default_mode value '<v>'; ignoring` and fall through (FR-01.3).
   - If `.pmos/settings.yaml` is malformed (not parseable as YAML, or missing `version`): print to stderr `settings.yaml malformed; fix and re-run` and exit 64 (FR-01.5).
   - On Phase 0 entry, always print to stderr exactly: `mode: <mode> (source: <source>)` (FR-01.2).

2. **Per-checkpoint classifier.** Before issuing any `AskUserQuestion` call, classify it (FR-02):
   - The defer-only tag, if present, is the literal previous non-empty line: `<!-- defer-only: <reason> -->` where `<reason>` ∈ {`destructive`, `free-form`, `ambiguous`} (FR-02.5).
   - Decision (in order): tag adjacent → DEFER; multiSelect with 0 Recommended → DEFER; 0 options OR no option label ends in `(Recommended)` → DEFER; else AUTO-PICK the (Recommended) option (FR-02.2).

3. **Buffer + flush.** Maintain an append-only OQ buffer in conversation memory. On each AUTO-PICK or DEFER classification, append one entry per the schema in spec §11.2. At end-of-skill (or in a caught error before exit), flush (FR-03):
   - Primary artifact is single Markdown → append `## Open Questions (Non-Interactive Run)` section with one fenced YAML block per entry; update prose frontmatter (`**Mode:**`, `**Run Outcome:**`, `**Open Questions:** N` where N counts deferred only — see FR-03.4) (FR-03.1).
   - Skill produces multiple artifacts → write a single `_open_questions.md` aggregator at the artifact directory root; primary artifact's frontmatter `**Open Questions:** N — see _open_questions.md` (FR-03.5).
   - Primary artifact is non-MD (SVG, etc.) → write sidecar `<artifact>.open-questions.md` (FR-03.2).
   - No persistent artifact (chat-only) → emit buffer to stderr at end-of-run as a single block prefixed `--- OPEN QUESTIONS ---` (FR-03.3).
   - Mid-skill error → flush partial buffer under heading `## Open Questions (Non-Interactive Run — partial; skill errored)`; set `**Run Outcome:** error`; exit 1 (E13).

4. **Subagent dispatch.** When dispatching a child skill via Task tool or inline invocation, prepend the literal first line: `[mode: <current-mode>]\n` to the child's prompt (FR-06).

5. **Call-site auditing (CI only).** This runtime classifier reads the call it is about to make — it does not run awk. Static/offline auditing of `AskUserQuestion` call sites across SKILL.md files is performed by `tools/audit-recommended.sh`, which sources the shared call-site extractor from Section D of this file (`_shared/non-interactive.md`). Runtime and audit therefore share one decision contract without inlining the extractor into every skill (FR-02.6).

6. **Refusal check.** If this SKILL.md contains a `<!-- non-interactive: refused; ... -->` marker (regex: `<!--[[:space:]]*non-interactive:[[:space:]]*refused`), and `mode` resolved to `non-interactive`: emit refusal per Section A and exit 64 (FR-07).

7. **Pre-rollout BC.** If the `--non-interactive` argument is present BUT this SKILL.md does NOT contain the `<!-- non-interactive-block:start -->` marker (i.e., this skill hasn't been rolled out yet): emit `WARNING: --non-interactive not yet supported by /<skill>; falling back to interactive.` to stderr; continue in interactive mode (FR-08).

8. **End-of-skill summary.** Print to stderr at exit: `pmos-toolkit: /<skill> finished — outcome=<clean|deferred|error>, open_questions=<N>` (NFR-07).
<!-- non-interactive-block:end -->

## Phase 1: Resolve command + first-run setup

Dispatch the argument string per `${CLAUDE_SKILL_DIR}/reference/import.md` "Token-1
dispatch":

- `list` → print the current feeds (name, type, url, last-run cursor); end.
- `add <url>` / `remove <name>` → mutate `feeds.yaml` (validate a new feed by
  fetching its XML first); end.
- `add --from <file>` → run the assisted-import flow (CSV / OPML / image →
  resolve → validate → **batch-approve** → append). End.
- `bundles` → list the shipped starter bundles
  (`node ${CLAUDE_SKILL_DIR}/scripts/bundles.js list`); end.
- `add --bundle <id> [--medium <m>]` → import a starter bundle: resolve via
  `bundles.js resolve` → validate each feed (`fetch-feed.js`) → dedup against
  `feeds.yaml` → **batch-approve** → append with the inferred `type`. See
  `import.md` → "Bundles". End.
- `curate [--audience <a>] [--media <m>] [--out <dir>]` → regenerate the catalog +
  bundles via `reference/feed-curation.md`. Warn first (long, network/token-heavy).
  **Never write into `${CLAUDE_SKILL_DIR}`** — default out is
  `~/.pmos/magazine/curated/<date>/`; the maintainer passes
  `--out plugins/pmos-learnkit/skills/magazine/data/` from the repo. End.
- `watch <--install|--status|--run-now|--uninstall>` → manage the **optional local
  background podcast-transcription worker**. Dispatch to
  `node ${CLAUDE_SKILL_DIR}/scripts/magazine-watch.js <install|status|run-now|uninstall> [--interval H] [--max K] [--ac-only] [--backfill DAYS]`.
  `--install` refuses unless whisper is detected **and** ≥1 podcast feed exists.
  See `${CLAUDE_SKILL_DIR}/reference/watch.md` for the queue model + scheduler artifacts. End.
- anything else (including bare `/magazine`) → a **build**; continue to Phase 2.

**First-run setup** (true first run = **no `state.json` AND no `feeds.yaml`** under
`~/.pmos/magazine/` — do NOT infer "first run" from missing config YAMLs alone; a
stale `state.json` from a prior run can be present and carry rendered items +
cursors): walk the user through a short interview to seed `interest.yaml` (topics +
priority feeds), then LLM-seed `tags.yaml` and present the ~8-tag registry for
batch-approval. Always keep an `uncategorized` bucket. **Also capture the default
build window** into `interest.yaml :: defaults` — `days` (lookback; recommend `7`)
and `max_per_feed` (per-feed cap; recommend `5`) — so later builds need no window
prompt (FR-Q3). These gates carry a `(Recommended)` option so non-interactive runs
auto-pick.

**Stale-ledger / orphan-cursor check.** When a `state.json` IS present, run
`node ${CLAUDE_SKILL_DIR}/scripts/magazine-run.js status` and check its
`orphanCursors` — cursor keys matching no current feed slug (a renamed/removed
feed). Surface them to the user: re-importing a publication under a different slug
resets its "since last run" anchor. The feed key is the slug (`name`) everywhere
(ledger items, cursors, card badges); legacy URL-keyed cursors from older runs are
remapped to the slug automatically on the next `discover`/`enqueue` (FR-R4/FR-R5).

**Initial feed set — offer starter bundles.** Because a new user starts with an
empty `feeds.yaml`, present the shipped bundles before falling back to manual add.
Show the menu (`node ${CLAUDE_SKILL_DIR}/scripts/bundles.js list`) and ask which to
import as a **multi-select** with a `(Recommended)` default of the two `essentials`
bundles (newsletters + podcasts) — so non-interactive runs auto-pick a sensible
starter set. Chosen bundles import through the `add --bundle` flow above (validate →
dedup → batch-approve). Also offer `add --from <file>` (existing subscriptions) and
manual `add <url>`. Skipping all of them is allowed — the user can add feeds later.

## Phase 2: Discover (Stage A)

Determine the window per `reference/pipeline.md` "Windowing". Resolve the lookback
as `--days` flag → `interest.yaml :: defaults.days` → built-in `7`, and the per-feed
cap as `--max-per-feed` flag → `interest.yaml :: defaults.max_per_feed` → uncapped
(FR-Q3) — so a plain `/magazine` build needs **no interactive window prompt** after
first-run setup. **Drive discovery through the Stage-A entrypoint** — do not
hand-write a per-feed driver:

```
node ${CLAUDE_SKILL_DIR}/scripts/magazine-run.js discover [--since <cursor>] [--max <N>]
```

It reads `feeds.yaml`, runs `fetch-feed.js` per feed **each in isolation** (a feed
that exits non-zero is skipped and reported, never aborting the issue), records each
GUID in the ledger at `discovered`, and prints the snapshot item set as JSON. Dedup
is two-layer: idempotent **GUID** dedup, plus **cross-feed link** dedup that
collapses the same article syndicated under different GUIDs across feeds (catalogued
as `duplicate`, kept out of the snapshot — FR-Q2), so you no longer hand-dedupe
overlapping feeds. That snapshot **defines the issue**. (For an ad-hoc single feed,
pass `--feed <url>`.)

## Phase 3: Prep — crawl + transcribe (Stage A)

Run the prep phase through the same entrypoint — it walks every `discovered` item
(resumable per-item; cached results are never recomputed):

```
node ${CLAUDE_SKILL_DIR}/scripts/magazine-run.js prep
```

Routing is by **feed `type`, not enclosure presence** (FR-R1): only `type:podcast`
items go to the transcription queue. A newsletter that carries an audio enclosure
(every Substack post does) is **crawled**, not transcribed — its content is the
article text, right there in the post. `prep` prints a route summary and warns if a
declared-newsletter feed lands in the transcribe queue (a feed-type
misconfiguration signal).

For each crawled item it uses `extract-article.js` **with output redirected to**
`~/.pmos/magazine/crawl-cache/<safe-guid>.txt` (a file, never a pipe — a piped
capture truncates a long article), flagging `preview-only` on exit 2 and falling
back to the RSS body on exit 1. **Podcasts are transcribed through the shared
queue, not inline:** `prep` foreground-drains a bounded number of episodes (claimed
under the same lock an installed background watcher uses, so the two never
double-transcribe), leaves the rest **queued** (rendered via show-notes fallback,
picked up next run as cache hits). The drain threads each podcast feed's
`whisper_model` (default `base`) into `transcribe.sh --model` and treats exit 3 — no
whisper *or* no resolvable model — as keep-show-notes (never fabricate), logging the
exit to `~/.pmos/magazine/watch.log` rather than requeuing silently. A user who
installs `/magazine watch` keeps that queue warm so most episodes are already
transcribed by issue time. Item status advances as it goes.

If you must call a script directly (e.g. to re-crawl one item), **redirect crawl
output to a file** — `extract-article.js <link> > <cache-file>` — never capture it
through a pipe. See `reference/pipeline.md` for the entrypoint contract and the
"redirect, don't pipe" rule. This stage is deterministic (no LLM) and can run long
in the background.

## Phase 4: Summarize + tag (Stage B)

Fan out **one subagent per ready item** (sequential if no subagent tool). Each reads
the crawled article or transcript (never the RSS stub alone) and returns 3–5 bullet
takeaways (soft ≤240 chars each), a read/listen link, and tags chosen **only** from
`tags.yaml`. No fitting tag → `uncategorized` plus a `suggest-add` note — never
invent a tag. A thin/empty source → a **degraded card** with an honest reason, never
a fabricated summary (this is the load-bearing trust rule). Status → `summarized`.

## Phase 5: Curate Top picks + render incrementally (Stage B)

Rank the summarized items against `interest.yaml` (sparse interests → rank on
item-intrinsic importance, never random); mark the top items `top_pick`. After each
item (or small batch) completes, build the items JSON and re-emit the issue:

```
node ${CLAUDE_SKILL_DIR}/scripts/render-issue.js issue  <items.json>  > {docs_path}/magazine/{YYYY-MM-DD}_issue.html
node ${CLAUDE_SKILL_DIR}/scripts/render-issue.js library <issues.json> > {docs_path}/magazine/index.html
```

Failed items still render as degraded, reason-flagged cards — nothing is silently
dropped. On `file://` the user reloads to see new cards (no meta-refresh in v1).
Mark each rendered item `rendered`.

## Phase 6: Commit cursor

Only when every snapshot item is `rendered` or `failed`, advance the per-feed
cursors via `magazine-state.js advanceCursors()`, so the next "since last run"
starts cleanly. Advancing earlier would risk dropping items on an interrupt — the
cursor is the completeness guarantee. Report the issue path and any skipped feeds /
degraded items to the user.

## Phase 7: Capture Learnings

This skill is not complete until learnings capture has run. Reflect on whether this
session surfaced anything worth recording about `/magazine` itself — a feed that
broke discovery, a tagging miss, an extraction fallback that fired often, a resume
edge. If so, append it under the `## /magazine` heading in `~/.pmos/learnings.md`
(create the heading if missing). Proposing zero learnings is valid — the gate is
that the reflection happens, not that an entry is written.
