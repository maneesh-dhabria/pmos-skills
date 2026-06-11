---
name: backlog
description: Maintain a lightweight, AI-readable backlog of features, bugs, tech-debt, ideas, and other work items inside the repo. Zero-friction quick-capture (`/backlog add ...`) plus structured tracking with status, priority, and acceptance criteria. Integrates with the requirements -> spec -> plan -> execute -> verify pipeline via explicit `--backlog <id>` linkage. Use when the user says "add to backlog", "capture this idea", "track this bug", "show the backlog", "promote a backlog item", or "what's in the backlog".
user-invocable: true
argument-hint: "[<text> | add <text> | list | show <id> | refine <id> | set <id> <field>=<value> | promote <id> [--feature <slug>] | link <id> <doc> | archive | rebuild-index] [--non-interactive | --interactive]"
---

# Backlog

A repo-resident, AI-readable backlog. Two jobs: (1) zero-friction capture buffer for ideas/bugs/deferred-work that surface mid-flow, (2) lightweight tracker with status, priority, and pipeline linkage.

```
                                    ┌─ deferred items ──┐
/backlog (capture)                  ↓                   │
       │                                                │
       ▼                                                │
   inbox -> ready -> /backlog promote -> /requirements -> /spec -> /plan -> /execute -> /verify
                                          (or /spec)         │        │        │          │
                                                             ↓        ↓        ↓          ↓
                                                          spec'd  planned  in-progress  done
```

**Announce at start:** "Using the backlog skill to {capture|list|refine|...}."

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** State your assumption, document it in the output, and proceed. The user reviews after completion.
- **No subagents:** Perform research and analysis sequentially as a single agent.

## References

- `schema.md` — backlog's bindings: fields, enums, defaults-on-create, body sections, INDEX format, archive root
- `_shared/tracker-crudl.md` — shared tracker invariants: id/slug (§2), universal fields (§3), INDEX-as-cache (§5), archive (§6)
- `inference-heuristics.md` — keyword → type table for quick-capture
- `pipeline-bridge.md` — the `--backlog <id>` contract with pipeline skills
- `_shared/interactive-prompts.md` — prompting protocol for refine

## Flags & natural language

Options are NL-first: infer filters and destinations from the request ("list must-priority bugs", "across the workstream", "archive into 2026-Q1"); an explicit flag overrides. Contract flags, kept literal: `--feature <slug>` (promote → `_shared/pipeline-setup.md` §B), `--non-interactive`/`--interactive` (mode contract), and the `--backlog <id>` this skill's consumers pass per `pipeline-bridge.md`. Everything else stays parsed as back-compat sugar, marked `<!-- nl-sugar -->` at its definition site.

---

## Phase 0: routing {#routing}

Parse the user's argument to pick a handler. Be liberal with the form — both `/backlog add foo` and `/backlog "foo"` work for capture. The numbered phases below are independent verb handlers behind this dispatch table, not a sequence.

| Argument shape | Handler |
|---|---|
| empty | `#show-index` |
| `add <text>` or free text not matching another verb | `#add` |
| `list [filters]` | `#list` |
| `show <id>` | `#show` |
| `refine <id>` | `#refine` |
| `set <id> <field>=<value>` | `#set` |
| `promote <id>` | `#promote` |
| `link <id> <doc-or-pr>` | `#link` |
| `archive` | `#archive` |
| `rebuild-index` | `#rebuild-index` |

If the first token is not a recognized verb AND the argument is non-empty, treat the whole argument as `add <text>` (frictionless capture is the priority) — **unless the text is query-shaped**. A question or read request about the backlog ("what's in my backlog for auth?", "do we have anything on rate limits?", "show me the bugs") routes to `#list`/`#show` with the constraint interpreted as a filter. Never create an item from a question about the backlog.

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

---

## Phase 1: show INDEX {#show-index}

`/backlog` with no arguments.

1. If `<repo>/backlog/INDEX.md` does not exist (or `backlog/` is missing entirely), output `No backlog yet. Capture an item with /backlog add <text>.` and exit.
2. Freshness per `_shared/tracker-crudl.md` §5: if any file under `backlog/items/` has an mtime newer than INDEX's `Last regenerated:` date, regenerate (`#rebuild-index`) before rendering.
3. Output the contents of `backlog/INDEX.md`.

(`<repo>` = git repo root via `git rev-parse --show-toplevel`; if not in a git repo, the current working directory. Applies to every handler below.)

## Phase 2: add — quick-capture {#add}

`/backlog add <text>` OR bare non-query text (per `#routing`).

**This handler MUST complete in a single tool-call sequence with NO clarifying questions.** Wrong inference is acceptable; capture friction is not.

1. Ensure `<repo>/backlog/items/` exists (`mkdir -p`).
2. Allocate id + slug per `_shared/tracker-crudl.md` §2 — scan both `items/` and `archive/**/` for the max id prefix (empty store → `0001`). The counter is per-repo per `schema.md`.
3. Infer `type` from `<text>` per `inference-heuristics.md` (case-insensitive, first-match-by-order; no match → `idea`, and remember the fallback notice for step 5).
4. Write `backlog/items/{id}-{slug}.md` — frontmatter only, no body, per `schema.md` "Defaults on create". `title` = the original text, unchanged; `type` = the inferred type.
5. Regenerate INDEX inline (`#rebuild-index`). If regeneration fails, the item file is still written — warn suggesting `/backlog rebuild-index`, but DO NOT roll back the item write.
6. Output exactly one line:

   `Captured #{id} ({type}, should): "{title}"`

   If `type` was the fallback, append: ` — type inferred as 'idea' (no strong signal); use /backlog set {id} type=... to correct.`

## Phase 3: list {#list}

`/backlog list ...` or any read-shaped request. Filters — type, status, priority, label, single repo, archive inclusion, workstream scope — are inferred from the request; combinations AND together. The legacy flag spellings stay parsed:

<!-- nl-sugar -->
- `--type <t>` · `--status <s>` · `--priority <p>` · `--label <name>` — enum/label filters
<!-- nl-sugar -->
- `--repo <name>` (one linked repo) · `--workstream` (aggregate via `#workstream-aggregator`) · `--include-archive` (include `backlog/archive/**/`)

1. **Scope.** Local `items/` (plus `archive/**/` when asked). Workstream requests go through `#workstream-aggregator`.
2. **Validate filter values** against the enums in `schema.md` (the single source for enum values). Reject unknown values with the allowed list. Example: `Unknown status 'open'. Allowed: inbox, ready, spec'd, planned, in-progress, done, wontfix.`
3. **Sort** per `schema.md`'s INDEX rules: priority bucket (must > should > could > maybe) → score desc (nulls last) → updated desc.
4. **Render** a flat markdown table (no priority grouping). Columns: `id | type | status | priority | title | spec | plan | pr`; prepend a `repo` column in workstream mode. Zero matches: `No items match.`

## Phase 4: show {#show}

`/backlog show <id>`.

1. Normalize the id: accept `42`, `0042`, or `repo-name#0042` (workstream form → route via `#workstream-aggregator`). Local form: zero-pad to 4 digits.
2. Search `<repo>/backlog/items/{id}-*.md`, then `<repo>/backlog/archive/**/{id}-*.md`.
3. Still not found → list existing items sharing the digit prefix and output: `No item with id {id}. Closest matches by prefix: {list or "(none)"}. Run /backlog list to see all items.`
4. Output the file contents verbatim, fenced as markdown.

## Phase 5: refine {#refine}

`/backlog refine <id>`. Interactive — follow `_shared/interactive-prompts.md` (primary: the interactive prompt tool; fallback: one question at a time, numbered responses). Locate the item via `#show`'s lookup; if missing, emit the same error and exit.

<!-- defer-only: free-form -->
Ask via `AskUserQuestion` when available, ONE field at a time, in this order:

1. **Title** — show current; "Edit the title? (enter to keep)"
2. **Context** — multi-line free text; "skip" allowed
3. **Acceptance criteria** — one per line; "done" to finish; zero is fine
4. **Priority** — choice from the enum; default current
5. **Score** — integer 1–1000 or "skip"
6. **Labels** — comma-separated or "skip"

Write the body per `schema.md`'s section order: always `## Context` (use "_TBD_" if skipped — refine is iterative), `## Acceptance Criteria` only if any were given, never `## Notes` (that stays free-form for later edits). Replace the entire body; keep frontmatter intact except `updated:` → today, `status:` → `ready` if currently `inbox`, and `priority:`/`score:`/`labels:` if changed.

Regenerate INDEX (`#rebuild-index`). Confirm in one line: id + old → new status (omit the arrow if status is unchanged).

## Phase 6: set {#set}

`/backlog set <id> <field>=<value>` — the machine API. `/requirements`, `/spec`, `/plan`, `/execute`, and `/verify` invoke this literal form per `pipeline-bridge.md`; keep its surface exact.

1. **Field name.** Allowed: `title`, `type`, `status`, `priority`, `score`, `labels`, `parent`, `dependencies`, `source`, `spec_doc`, `plan_doc`, `pr`. Disallowed (skill-managed): `id`, `created`, `updated` — reject with `Field '{field}' cannot be set directly. The skill manages it.`
2. **Value.**

   | Field | Validation |
   |---|---|
   | `type`, `status`, `priority` | Must be in the matching enum in `schema.md` |
   | `score` | Integer, 1 <= n <= 1000, or empty (to clear) |
   | `labels` | Comma-separated; written as a YAML list |
   | `dependencies` | Comma-separated ids; validate each exists in `items/` (warn on missing, but proceed) |
   | `parent` | Single id; validate exists |
   | `title`, `source`, `spec_doc`, `plan_doc`, `pr` | Free string |

   On enum violation: `Unknown {field} '{value}'. Allowed: {comma-separated list}.` No write.
3. **Edit.** Update only the named field, set `updated:` to today, write back. If `title` changed, ALSO rename the file to match the new slug (preserve the id prefix). Regenerate INDEX (`#rebuild-index`). Confirm in one line: id + field + new value (note the rename if one occurred).

## Phase 7: promote {#promote}

`/backlog promote <id> [--feature <slug>]`. Seeds a feature folder from the item and hands off to the pipeline.

1. **Status routing.** Locate the item, then:

   | Current status | Target | Notes |
   |---|---|---|
   | `inbox` | `/requirements` | Item likely lacks ACs |
   | `ready` | `/spec` | Item has ACs already |
   | `spec'd` | refuse | Use `/plan --backlog <id>` directly |
   | `planned` | refuse | Use `/execute --backlog <id>` directly |
   | `in-progress` | refuse | Already running |
   | `done`, `wontfix` | refuse | Use `/backlog set` to revive first |

   On refuse: `#{id} is already at status '{status}'. {next_step_message}.` No further action.
2. **Build the seed:**

   ```
   [Backlog #{id} | {type} | priority {priority}]
   Title: {title}

   {body if present, otherwise just the title}

   Source: backlog/items/{id}-{slug}.md
   ```
3. **Resolve the feature folder** per `../_shared/pipeline-setup.md` Section B with `skill_name=backlog`, `feature_arg=<--feature value or empty>`, `feature_hint=<item title>`. Default to **Create new** with the derived slug; folder creation updates `settings.current_feature` so downstream skills pick up the same folder.
4. **Seed it.** Write the seed to `{feature_folder}/01_requirements.md`. If that file already exists, do NOT overwrite — abort with: `#{id}: {feature_folder}/01_requirements.md already exists. Re-run with --feature <new-slug> or remove the existing file.`
5. **Invoke the target** (`/requirements` or `/spec`) with `--backlog {id}` so the pipeline-bridge consent gate opens; it resolves its input from the feature folder per `_shared/pipeline-setup.md` Section 0 + `_shared/resolve-input.md`. The frontmatter write-back (`source:`, `spec_doc:`, status) is the target skill's responsibility per `pipeline-bridge.md` — promote does NOT mutate the item.
6. **On return,** confirm in one line: id → target, seeded path, and whether the target linked a doc.

## Phase 8: link {#link}

`/backlog link <id> <doc-path-or-url>`.

1. Infer the target field:

   | Pattern | Field |
   |---|---|
   | URL matching `https?://github\.com/[^/]+/[^/]+/pull/\d+` | `pr` |
   | Path ending in `-spec.md` | `spec_doc` |
   | Path ending in `-plan.md` | `plan_doc` |
   | Path ending in `-requirements.md` or under `requirements/` | `source` |
   | Anything else | error: `Cannot infer link type from '{value}'. Use /backlog set {id} <field>=<value>.` |

2. Delegate to `#set` with the inferred `field=value`. Confirm in one line: id + field + value.

## Phase 9: archive {#archive}

`/backlog archive`.

1. **Destination quarter.** Per-item from its `updated:` date (`{year}-Q{quarter}`) — unless the user names one ("archive into 2026-Q1"), which forces that destination for all.
   <!-- nl-sugar -->
   `--quarter YYYY-QN` stays parsed as the explicit spelling.
2. **Eligibility.** `status` in `done, wontfix` AND age (today − `updated:`) > 30 days. Everything else stays.
3. **Move** per `_shared/tracker-crudl.md` §6: `git mv backlog/items/{file} backlog/archive/{quarter}/{file}` (create the quarter dir; fall back to a plain move outside git).
4. Regenerate INDEX (`#rebuild-index` — archived items are excluded). Report one line: count + `#{id} -> {quarter}` per item, or `0 items: nothing eligible.`

## Phase 10: rebuild-index {#rebuild-index}

`/backlog rebuild-index`. Also invoked internally by every mutating handler, per the regenerable-cache contract in `_shared/tracker-crudl.md` §5.

1. Glob `<repo>/backlog/items/*.md`; parse frontmatter; skip files with malformed frontmatter (one-line warning per skip; never abort).
2. Overwrite `<repo>/backlog/INDEX.md` per `schema.md`'s "INDEX.md format" section — grouping, sort, columns, and the `Last regenerated:` line are all specified there.
3. Invoked directly: `Regenerated INDEX.md: {count} items.` Invoked internally: silent on success, warn on failure.

## Phase 11: workstream aggregator {#workstream-aggregator}

Used by `#list` (workstream scope) and `#show` (`repo#id` form). Read-only — never writes items, `~/.pmos/workstreams/{slug}.md`, or any `.pmos/settings.yaml` (linked-repo management is `/product-context`'s job).

1. Read `<repo>/.pmos/settings.yaml :: workstream`. Absent → error: `Current repo has no workstream link. Run /product-context init or use /backlog list without --workstream.`
2. Read `~/.pmos/workstreams/{slug}.md` frontmatter `linked_repos:`. Absent/empty → error: `Workstream '{slug}' has no linked_repos. Add them via /product-context update.`
3. For each linked repo: skip paths not on disk (warn `Skipping {path} (not on disk).`); otherwise read `{path}/backlog/items/*.md`, tagging each item with its repo basename.
4. Render ids as `{repo-basename}#{id}` (e.g., `repo-a#0001`); `show repo-a#0001` parses the prefix to route to the right repo.

---

*Spec lineage: `docs/pmos/features/2026-04-25_backlog-skill/02_spec.md` (capture contract, score bounds, archive eligibility, promote routing, auto-prompt), `2026-05-08_non-interactive-mode/` (inline mode block). Shared tracker invariants extracted to `_shared/tracker-crudl.md` in the 2026-05 tracker consolidation; enum/INDEX/defaults ownership moved to `schema.md` in the 2026-06-10 skill-design review. Traceability for individual rules lives there, not inline here.*
