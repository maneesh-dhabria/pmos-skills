---
name: magazine
description: Turns your scattered public RSS subscriptions — newsletters and podcasts — into one skimmable, filterable HTML digest of what's new since last time, built by a resumable local pipeline that crawls each article, transcribes podcasts (whisper-if-installed), summarizes every item into 3–5 trustworthy bullets with a read/listen link, auto-tags them from a closed registry, and ranks a Top-picks lane — saved as a durable issue plus a searchable cross-issue library, all working offline from file://. Use whenever the user wants to catch up on their feed backlog without app-hopping. Triggers when the user says "digest my newsletters", "what's new in my feeds", "catch me up on my subscriptions", "summarize my podcasts", "build my reading digest", "/magazine", "add a feed to my magazine", or "what did I miss this week".
user-invocable: true
argument-hint: "[add <url> | add --from <file> | remove <name> | list] [--days N] [--feed <name>] [--max-per-feed N] [--format <html|md|both>] [--non-interactive] [--interactive]"
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
- `${CLAUDE_SKILL_DIR}/reference/import.md` — command dispatch + assisted import.

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

Resolve `output_format` with precedence `cli --format > settings.output_format >
default "html"`. On Phase 0 entry, print to stderr `output_format: <v> (source:
<cli|settings|default>)`. v1 emits HTML only; `--format both` is reserved.

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
   - Use the awk extractor below to find the line of this call's `question:` key in the live SKILL.md (FR-02.6).
   - The defer-only tag, if present, is the literal previous non-empty line: `<!-- defer-only: <reason> -->` where `<reason>` ∈ {`destructive`, `free-form`, `ambiguous`} (FR-02.5).
   - Decision (in order): tag adjacent → DEFER; multiSelect with 0 Recommended → DEFER; 0 options OR no option label ends in `(Recommended)` → DEFER; else AUTO-PICK the (Recommended) option (FR-02.2).

3. **Buffer + flush.** Maintain an append-only OQ buffer in conversation memory. On each AUTO-PICK or DEFER classification, append one entry per the schema in spec §11.2. At end-of-skill (or in a caught error before exit), flush (FR-03):
   - Primary artifact is single Markdown → append `## Open Questions (Non-Interactive Run)` section with one fenced YAML block per entry; update prose frontmatter (`**Mode:**`, `**Run Outcome:**`, `**Open Questions:** N` where N counts deferred only — see FR-03.4) (FR-03.1).
   - Skill produces multiple artifacts → write a single `_open_questions.md` aggregator at the artifact directory root; primary artifact's frontmatter `**Open Questions:** N — see _open_questions.md` (FR-03.5).
   - Primary artifact is non-MD (SVG, etc.) → write sidecar `<artifact>.open-questions.md` (FR-03.2).
   - No persistent artifact (chat-only) → emit buffer to stderr at end-of-run as a single block prefixed `--- OPEN QUESTIONS ---` (FR-03.3).
   - Mid-skill error → flush partial buffer under heading `## Open Questions (Non-Interactive Run — partial; skill errored)`; set `**Run Outcome:** error`; exit 1 (E13).

4. **Subagent dispatch.** When dispatching a child skill via Task tool or inline invocation, prepend the literal first line: `[mode: <current-mode>]\n` to the child's prompt (FR-06).

5. **Awk extractor.** The classifier and `tools/audit-recommended.sh` MUST both use the function below. Loaded at script init time; sourcing differs per consumer.

<!-- awk-extractor:start -->
```awk
# Find AskUserQuestion call sites and their adjacent defer-only tags.
# Input: a SKILL.md file (stdin or argv).
# Output (TSV): <line_no>\t<has_recommended:0|1>\t<defer_only_reason or "-">
# A "call site" is a line referencing `AskUserQuestion` in the SKILL's own prose
# (backtick mentions, prose instructions, multi-line invocation hints).
# `(Recommended)` is detected on the call site line OR any subsequent non-blank
# line (the option-list block) until a blank line, defer-only tag, or another
# AskUserQuestion call closes the pending call. Lines inside the inlined
# `<!-- non-interactive-block:... -->` region are canonical contract text and
# never count as call sites.
function emit_pending() {
  if (pending_call > 0) {
    out_tag = (pending_call_tag != "") ? pending_call_tag : "-";
    printf "%d\t%d\t%s\n", pending_call, pending_has_recc, out_tag;
    pending_call = 0;
    pending_has_recc = 0;
    pending_call_tag = "";
  }
}
/^<!-- non-interactive-block:start -->$/ { in_inlined=1; next }
/^<!-- non-interactive-block:end -->$/   { in_inlined=0; next }
in_inlined { next }
/^[[:space:]]*<!--[[:space:]]*defer-only:[[:space:]]*([a-z-]+)[[:space:]]*-->/ {
  emit_pending();
  match($0, /defer-only:[[:space:]]*[a-z-]+/);
  pending_tag = substr($0, RSTART + 12, RLENGTH - 12);
  sub(/^[[:space:]]+/, "", pending_tag);
  pending_line = NR;
  next;
}
/^[[:space:]]*$/ {
  emit_pending();
  pending_tag = "";
  next;
}
/AskUserQuestion/ {
  emit_pending();
  pending_call = NR;
  pending_has_recc = ($0 ~ /\(Recommended\)/) ? 1 : 0;
  pending_call_tag = (pending_tag != "" && NR == pending_line + 1) ? pending_tag : "";
  pending_tag = "";
  next;
}
{
  if (pending_call > 0 && $0 ~ /\(Recommended\)/) {
    pending_has_recc = 1;
  }
}
END { emit_pending() }
```
<!-- awk-extractor:end -->

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
- anything else (including bare `/magazine`) → a **build**; continue to Phase 2.

**First-run setup** (when `~/.pmos/magazine/` is empty): walk the user through a
short interview to seed `interest.yaml` (topics + priority feeds), then LLM-seed
`tags.yaml` and present the ~8-tag registry for batch-approval. Always keep an
`uncategorized` bucket. **Also capture the default build window** into
`interest.yaml :: defaults` — `days` (lookback; recommend `7`) and `max_per_feed`
(per-feed cap; recommend `5`) — so later builds need no window prompt (FR-Q3).
These gates carry a `(Recommended)` option so non-interactive runs auto-pick. Then
prompt for an initial feed set (offer `add --from <file>`).

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

For each item it crawls via `extract-article.js` **with output redirected to**
`~/.pmos/magazine/crawl-cache/<safe-guid>.txt` (a file, never a pipe — a piped
capture truncates a long article), flagging `preview-only` on exit 2 and falling
back to the RSS body on exit 1; and transcribes podcasts via `transcribe.sh`
(**exit 3 — no whisper *or* no resolvable model** → keep show-notes + an honest
hint; never fabricate). Item status advances as it goes.

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
