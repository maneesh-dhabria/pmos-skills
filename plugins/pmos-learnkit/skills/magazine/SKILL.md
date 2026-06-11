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

**The trust rule — this is the skill:** every card is either grounded in a crawled
article or a real transcript, or **visibly degraded with an honest reason**
(`preview-only`, show-notes fallback, `failed`). Never a fabricated summary, never an
invented tag, never a silently dropped item. No third option.

Options are NL-first: infer them from the request ("catch me up on the last two
weeks" ≡ `--days 14`); an explicit flag overrides the inference.

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
- **No transcription support:** probe via
  `bash ${CLAUDE_SKILL_DIR}/scripts/transcribe.sh --selftest` (it reports the
  detected binary). Treat **exit 3 — and only exit 3** — from a real transcribe call
  as "no transcription": keep show-notes plus an honest "install whisper / set
  `WHISPER_MODEL_DIR`" hint on the card.
- **No reach to `r.jina.ai`:** `extract-article.js` keeps its heuristic-strip result;
  if that is thin, fall back to the RSS `body`/`description` and flag the card
  `preview-only`.

## Track Progress

This skill has multiple sequential phases (setup → command-resolve → discover →
prep → summarize+tag → curate+render → commit → capture-learnings). Create one task
per phase using your agent's task-tracking tool (e.g. `TaskCreate` in Claude Code).
Mark each in-progress when you start it and completed as soon as it finishes — do
not batch completions.

## Phase 0: Pipeline setup + Load Learnings {#pipeline-setup}

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

## Phase 1: Resolve command + first-run setup {#resolve-command}

Dispatch on token 1; `${CLAUDE_SKILL_DIR}/reference/import.md` §"Token-1 dispatch"
owns each flow's mechanics — trust it, don't re-derive them here:

| Token 1 | Behavior | Owner |
|---|---|---|
| `list` / `add <url>` / `remove <name>` | print / mutate `feeds.yaml` (validate a new feed by fetching its XML first); end | `import.md` |
| `add --from <file>` | assisted import (CSV / OPML / image): resolve → validate → **batch-approve** → append; end | `import.md` §Assisted import |
| `bundles` / `add --bundle <id> [--medium <m>]` | list / import starter bundles via `${CLAUDE_SKILL_DIR}/scripts/bundles.js`; **batch-approve** before any append; end | `import.md` §Bundles |
| `curate [--audience <a>] [--media <m>] [--out <dir>]` | regenerate catalog + bundles; warn first (long, network/token-heavy); **never write into `${CLAUDE_SKILL_DIR}`** — default out is `~/.pmos/magazine/curated/<date>/`; end | `feed-curation.md` |
| `watch <--install\|--status\|--run-now\|--uninstall>` | optional background transcription worker → `node ${CLAUDE_SKILL_DIR}/scripts/magazine-watch.js <install\|status\|run-now\|uninstall> [--interval H] [--max K] [--ac-only] [--backfill DAYS]`; install refuses unless whisper is detected **and** ≥1 podcast feed exists; end | `watch.md` |
| anything else (incl. bare `/magazine`) | a **build** — continue to Phase 2 | — |

**First-run setup** (true first run = **no `state.json` AND no `feeds.yaml`** under
`~/.pmos/magazine/` — a stale `state.json` alone is not a first run): short interview
to seed `interest.yaml` — topics, priority feeds, and the default build window under
`defaults` (`days`, recommend `7`; `max_per_feed`, recommend `5`) so later builds
need no window prompt — then LLM-seed `tags.yaml` (~8 tags, always an
`uncategorized` bucket) and batch-approve the registry. These gates carry a
`(Recommended)` option so non-interactive runs auto-pick. Offer the shipped starter
bundles before manual add: show `bundles.js list` as a **multi-select** with the two
`essentials` bundles `(Recommended)`; chosen bundles import through the
`add --bundle` flow above. Also offer `add --from <file>` and manual `add <url>`;
skipping all of them is allowed.

**Stale-ledger check.** When a `state.json` IS present, run
`node ${CLAUDE_SKILL_DIR}/scripts/magazine-run.js status` and surface its
`orphanCursors` to the user — cursor keys matching no current feed slug; re-importing
a publication under a different slug resets its "since last run" anchor. (Legacy
URL-keyed cursors are remapped to the slug automatically on the next run.)

## Phase 2: Discover (Stage A) {#discover}

Resolve the window per `reference/pipeline.md` §Windowing — lookback: `--days` flag →
`interest.yaml :: defaults.days` → built-in `7`; per-feed cap: `--max-per-feed` flag
→ `interest.yaml :: defaults.max_per_feed` → uncapped — so a plain `/magazine` build
needs **no window prompt** after first-run setup. Then drive discovery through the
Stage-A entrypoint — never hand-write a per-feed driver:

```
node ${CLAUDE_SKILL_DIR}/scripts/magazine-run.js discover [--since <cursor>] [--max <N>]
```

It fetches every feed in isolation (a failing feed is skipped and reported, never
aborting the issue), dedups two-layer (idempotent GUID + cross-feed link), records
GUIDs in the ledger, and prints the snapshot item set as JSON. **That snapshot
defines the issue.** For an ad-hoc single feed, pass `--feed <url>`.

## Phase 3: Prep — crawl + transcribe (Stage A) {#prep}

Run `node ${CLAUDE_SKILL_DIR}/scripts/magazine-run.js prep` — deterministic (no
LLM), resumable per-item, may run long; cached results are never recomputed. It
routes by **feed `type`, not enclosure presence**: newsletters are crawled to
`~/.pmos/magazine/crawl-cache/`, podcasts go through the shared transcription queue
(a bounded foreground drain, claimed under the same lock an installed background
watcher uses). Episodes the drain doesn't reach stay queued and render via
show-notes fallback — picked up as cache hits next run; `/magazine watch` keeps that
queue warm. If you ever call `extract-article.js` directly, **redirect output to a
file, never a pipe** — `reference/pipeline.md` owns the entrypoint contract and the
"redirect, don't pipe" rule.

## Phase 4: Summarize + tag (Stage B) {#summarize-tag}

Fan out **one subagent per ready item** via the Task tool with `model: haiku`
(mechanical summarize+tag against a closed registry, validated downstream; sequential
if no subagent tool). Each reads
the crawled article or transcript (never the RSS stub alone) and returns 3–5 bullet
takeaways (soft ≤240 chars each), a read/listen link, and tags chosen **only** from
`tags.yaml` — no fitting tag → `uncategorized` plus a `suggest-add` note. A
thin/empty source → a **degraded card** with the reason (the trust rule above).
Status → `summarized`.

## Phase 5: Curate Top picks + render incrementally (Stage B) {#curate-render}

Rank the summarized items against `interest.yaml` (sparse interests → rank on
item-intrinsic importance, never random); mark the top items `top_pick`. After each
item (or small batch) completes, build the items JSON and re-emit the issue:

```
node ${CLAUDE_SKILL_DIR}/scripts/render-issue.js issue  <items.json>  > {docs_path}/magazine/{YYYY-MM-DD}_issue.html
node ${CLAUDE_SKILL_DIR}/scripts/render-issue.js library <issues.json> > {docs_path}/magazine/index.html
```

Failed items still render as degraded cards (status `failed`, per the trust rule).
On `file://` the user reloads to see new cards (no meta-refresh in v1). Mark each
rendered item `rendered`.

## Phase 6: Commit cursor {#commit-cursor}

Only when every snapshot item is `rendered` or `failed`, advance the per-feed
cursors via `magazine-state.js advanceCursors()`, so the next "since last run"
starts cleanly. Advancing earlier would risk dropping items on an interrupt — the
cursor is the completeness guarantee. Report the issue path and any skipped feeds /
degraded items to the user.

## Phase 7: Capture Learnings {#capture-learnings}

This skill is not complete until learnings capture has run. Reflect on whether this
session surfaced anything worth recording about `/magazine` itself — a feed that
broke discovery, a tagging miss, an extraction fallback that fired often, a resume
edge. If so, append it under the `## /magazine` heading in `~/.pmos/learnings.md`
(create the heading if missing). Proposing zero learnings is valid — the gate is
that the reflection happens, not that an entry is written.

---

*Spec lineage: `docs/pmos/features/2026-06-03_magazine/` (founding two-stage
pipeline, 3–5 bullet / soft ≤240-char caps, closed tag registry, cursor rule);
`2026-06-03_magazine-retro/` (whisper `--selftest` / exit-3 contract — P-series
regressions); `2026-06-05_magazine-output-ux/` (issue-UX affordances);
`2026-06-06_magazine-feed-bundles/` (catalog, bundles, curate);
`2026-06-07_magazine-transcription-queue/` (watch worker, claim TTL, O_EXCL lock);
`2026-06-07_magazine-entrypoint-fixes/` (Q/R-series: windowing defaults, cross-feed
dedup, type routing, cursor remap); `2026-05-08_non-interactive-mode/` (mode
contract). Per-rule traceability lives in those folders and in
`tests/structure.test.sh`, not inline here.*
