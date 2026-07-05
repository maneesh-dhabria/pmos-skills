---
name: morning-brief
description: >
  Turn a user-declared set of inbound sources (email, calendar, doc-comments, chat, custom)
  into one trustworthy, ranked, show-everything morning view — swept from live source state,
  categorized against your own rules, and emitted as a self-contained HTML brief with a
  coverage manifest and a read-only /mytasks lane. Use when the user says "morning brief",
  "what came in overnight", "sweep my inboxes", "plan my morning", "what needs me today", or
  runs /morning-brief. This story is the read-only core (sweep → categorize → rank → brief);
  the batch confirm/act lane is a companion skill. Nothing is mutated; nothing is written
  inside a repo. First run with no config routes into guided source setup.
user-invocable: true
argument-hint: "[sources | rules] [--non-interactive]"
---

# /morning-brief

The repo's first connector-reader skill. Turns declared sources into one derived morning
view. A **pure derived view**: sources and `/mytasks` are the only state stores; this skill
persists only your configuration, your rules, and a last-run cursor. This story
(`260702-b6q`) is read-only end-to-end — the batch confirm/act lane lands in `260702-ww7`.

Grounded in `docs/pmos/features/2026-07-02_morning-brief/02_design.html` (cite by anchor).
Per-kind read contracts, the normalized item, and the run-model JSON that the render script
consumes live in `reference/source-contracts.md`.

## Invariants (these bind every phase)

- **INV-1 — Derive, don't store.** No per-item triage ledger, ever. The view is recomputed
  from live source state + `/mytasks` each run; the only run-state written is `cursor.yaml`.
  An item leaves the brief only by being resolved in its source, never by being seen.
- **INV-2 — Show everything, structurally.** Every in-window item appears at least as a
  one-line FYI row. Rules and ranking set **prominence, never inclusion**. A judgment miss
  must be detectable as "ranked too low", not invisible.
- **INV-3 — User-declared, never assumed.** Source presence AND relative priority are user
  configuration. Ship zero assumptions about anyone's channel mix; bundled examples are
  examples, not defaults. Never suggest a priority from observed volume.
- **INV-4 — Privacy residency.** All config, state, and briefs live under
  `~/.pmos/morning-brief/` (or `$PMOS_MORNING_BRIEF_DIR`). **Work-comms content is never
  written inside any code repository** — `scripts/lib.mjs` refuses such writes.
  LLM processing of your work content is an accepted, stated premise.
- **INV-6 — `/mytasks` sole system of record.** The task lane is read-only; this story
  writes no tasks. (Task creation behind the confirm lane is `260702-ww7`.)

## Verbs (D1)

| Verb | Behavior |
|---|---|
| bare `/morning-brief` | The run pipeline: sweep → categorize → rank → emit brief + manifest → advance cursor, then STOP (Phases [4](#sweep)–[8](#cursor)). No `sources.yaml` → route into guided setup ([Phase 2](#sources-verb)) first. |
| `/morning-brief sources` | Guided declare/edit of sources + priorities + the two window settings ([Phase 2](#sources-verb)). Writes `sources.yaml`. Never suggests a priority from volume (INV-3). |
| `/morning-brief rules` | View / add / edit / retire personal categorization rules ([Phase 3](#rules-verb)). Retire = delete. |

All flags are natural-language-first (§I); the only machine-coupled flag is the inherited
`--non-interactive`.

## Track Progress

This skill has multiple phases. Create one task per phase you will run (the bare run uses
Phases 1, 4–9; the `sources`/`rules` verbs use Phase 1 then 2 or 3) using your agent's
task-tracking tool. Mark each in-progress when you start and completed as soon as it
finishes — do not batch completions.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion` tool:** guided setup and rule edits degrade to numbered free-form
  prompts per `_shared/interactive-prompts.md`. The non-interactive auto-pick contract still
  applies (Recommended → AUTO-PICK; free-form/destructive → DEFER).
- **No subagents:** per-source sweeps run sequentially in the parent (the parallel dispatch
  in [Phase 4](#sweep) is an optimization, not a requirement).
- **`node` missing:** the deterministic scripts (`scripts/lib.mjs`, `scripts/render-brief.mjs`)
  cannot run — the brief cannot be assembled or validated. Report the missing runtime and stop;
  do not hand-compute counts or hand-write the HTML (§H — arithmetic and rendering are the
  script's job).
- **No connector MCP tools for a declared source:** that source is recorded
  `status: failed, reason: connector unavailable` and the run continues (D6).
- **`.pmos/settings.yaml` missing:** the mode resolver below falls back to its built-in
  default; no other setup is required (this skill's own store is `~/.pmos/morning-brief/`).

## Load Learnings

Read `~/.pmos/learnings.md` if present; note any entries under `## /morning-brief` and factor
them in. Skill body wins on conflict; surface conflicts before applying.

## Phase 1 — Setup + dispatch {#setup}

1. **Mode + settings.** Run the non-interactive block below (resolve `(mode, source)`; print
   the `mode:` line to stderr).
2. **Resolve the store dir.** `node -e "import('./scripts/lib.mjs').then(m=>console.log(m.resolveStoreDir()))"`
   (or call `resolveStoreDir()` in a script step) — `$PMOS_MORNING_BRIEF_DIR` else
   `~/.pmos/morning-brief`. Do **not** create it yet. Every write in this skill goes through
   `lib.assertWritableStore()` / `writeCursor()` / `render-brief.mjs`, which refuse a path
   inside a code repo (INV-4).
3. **Dispatch on the verb:**
   - `sources` → [Phase 2](#sources-verb).
   - `rules` → [Phase 3](#rules-verb).
   - bare → if `sources.yaml` is absent, route to [Phase 2](#sources-verb) first (then offer
     to run); otherwise begin the pipeline at [Phase 4](#sweep).

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

## Phase 2 — `sources` verb: guided setup + edit {#sources-verb}

Declare or edit the source set (design §5). Also reached on a bare run when `sources.yaml` is
absent. For **each** source, collect: `kind` (email / calendar / doc-comments / chat /
custom), `connector` hint (the MCP tool-family name — e.g. `Gmail`, `Google Calendar`,
`Notion`), optional `scope` (labels/calendars/spaces), a **user-indicated** `priority`, and
the native `dismiss` action name (or `none`). Then the two window settings:
`first_window_days` (default 7, D9) and `carryover_horizon_days` (default 14, D10).

**INV-3 is load-bearing here:** never suggest a priority ordering from observed volume, and
ship no default channel mix. The bundled examples in `reference/source-contracts.md` are
illustrations, not defaults.

Declaring a source is inherently free-form (there is no correct source set to auto-pick), so
under `--non-interactive` this DEFERs:

```
<!-- defer-only: free-form -->
AskUserQuestion: "Declare your morning-brief sources — for each, its kind, connector, scope, priority, and dismiss action. And the two window settings (first-run reach, carryover horizon)."
```

Write the result with `lib.serializeSources()` to `<storeDir>/sources.yaml` via an atomic
write (the lib validates and refuses a repo-internal path). The file is hand-editable YAML.
On a bare run that routed here, then offer to continue into [Phase 4](#sweep).

## Phase 3 — `rules` verb: view / add / edit / retire {#rules-verb}

`rules.md` under the store dir holds your categorization rules as prose bullets under the
four GTD-4D headings. **First use seeds it** by copying `reference/rules-seed.md` (strip the
leading HTML authoring comment) to `<storeDir>/rules.md` — cold start, zero personal priors
(INV-3). `/morning-brief rules` then:

- **view** — print the current `rules.md`.
- **add / edit** — append or revise a bullet under the right heading. Hand-editability is a
  feature: prose bullets, no machine framing beyond the four headings.
- **retire** — delete the bullet (retired rules are removed, not archived — the file is
  small and yours, D3).

Rule edits are free-form authoring, so under `--non-interactive` this DEFERs:

```
<!-- defer-only: free-form -->
AskUserQuestion: "Which rule do you want to add, edit, or retire? (rules.md is prose bullets under do / delegate-reply / defer-track / drop-FYI.)"
```

Write back atomically. Rules earned from real traffic via the confirm step land in
`260702-ww7`; this story only supports the manual verb.

## Phase 4 — Sweep {#sweep}

Read every declared source per its `kind` contract in `reference/source-contracts.md`.

1. **Window.** `node -e` → `lib.readCursor(storeDir)` then `lib.computeWindow(cursor, settings, <nowIso>)`.
   First run reaches back `first_window_days`; otherwise `last_run → now`. Carryover reaches
   `carryover_horizon_days`; older unresolved items are **counted** (`beyond_horizon`), not
   rendered (D10). Do not compute these dates by hand (§H).
2. **Resolve connectors at run time.** For each source, **ToolSearch by its `connector`
   hint** (D5) — never a hardcoded tool inventory. Read per the kind contract.
3. **Parallel per source (§L, optional).** You MAY dispatch one sonnet subagent per source to
   read+extract, each returning the normalized item JSON (`reference/source-contracts.md`).
   The parent validates every return. Categorize/rank stays in the parent.
4. **Failed sources never abort.** A missing / unauthed / erroring connector →
   `{ id, status: "failed", reason: "<why>" }`; continue with the rest (D6). Its failure
   surfaces in the brief header, not only the manifest.
5. Collect the read-only `/mytasks` lane: `node -e` → `lib.mytasksLane("~/.pmos/tasks", <nowIso>)`
   (buckets overdue / due / check-ins / waiting-on; `{absent:true}` when no store — INV-6).

## Phase 5 — Categorize {#categorize}

Categorize **every** swept item against `rules.md` (LLM judgment — the rules file is your
rubric). Place each into exactly one of `do` / `delegate-reply` / `defer-track` / `drop-FYI`.
An item no bullet matches is placed by the seed taxonomy's default sense AND flagged
`no_rule_matched: true` for the manifest — never dropped (INV-2).

## Phase 6 — Rank {#rank}

Rank each item into exactly one prominence **tier** using its category + the user-indicated
source priority:

- `today` — **Needs you today** (actionable, time-pressured).
- `knowing` — **Worth knowing** (real, not urgent).
- `fyi` — **FYI** (awareness only; collapsed per-source in the brief).

Ranking sets **prominence, never inclusion** (INV-2). Every item gets exactly one tier.

## Phase 7 — Emit brief {#emit}

1. Assemble the run-model JSON (`reference/source-contracts.md` § Run-model): `date`,
   `window`, `sources[]` (with `status` + `counts.{new,carryover,beyond_horizon}`), `items[]`
   (with `category`, `tier`, `why`, `no_rule_matched`), `lane`, and an **informational**
   `proposals[]` (create/dismiss/leave suggestions — the confirm/act lane is `260702-ww7`).
2. `node scripts/render-brief.mjs <model.json> --out <storeDir>` — the script computes all
   manifest counts (§7/§H), enforces INV-2 (every item rendered), writes
   `briefs/YYYY-MM-DD[-N].html` (same-day suffixing, D7), and prints the absolute path.
3. Print that absolute path to the user, plus a one-line coverage summary and the
   informational proposal lane (clearly marked "confirm lane lands in a later story"). Then
   **STOP** — no mutations in this story.

The brief is self-contained static HTML outside any repo (INV-4) — the pmos-comments overlay
contract does not apply to home-dir artifacts.

## Phase 8 — Advance cursor {#cursor}

Write `cursor.yaml` atomically (`lib.writeCursor(storeDir, { last_run: <nowIso>, high_water })`)
**only when the sweep completed cleanly for all reachable sources** (D6). If any reachable
source failed mid-read, leave the cursor where it was — a crashed run must not eat items; the
next run re-derives them as carryover (INV-1). Failed-because-unreachable sources do not block
the cursor (they are carried in the manifest and re-swept by derive-on-read). No other
run-state is written.

## Phase 9: Capture Learnings {#capture-learnings}

If this run surfaced a durable, reusable lesson about `/morning-brief` (a connector quirk, a
recurring miscategorization, a window-tuning insight), offer to append it under
`## /morning-brief` in `~/.pmos/learnings.md`. Skip silently if nothing rises to that bar.

## §H / §I / §L notes

- **§H — deterministic work is in scripts, never prose.** `scripts/lib.mjs`: store-dir +
  repo guard, `sources.yaml`/`cursor.yaml` parse/validate/serialize (atomic), window math,
  the `/mytasks` lane, manifest count assembly. `scripts/render-brief.mjs`: HTML render +
  suffixing. LLM keeps judgment: categorization, tiering, summarization. Both scripts are
  zero-dependency Node with `--selftest`.
- **§I — NL-first surface.** `argument-hint` carries only the verbs + `--non-interactive`;
  everything else is inferred from natural language. No machine-coupled flags in v1.
- **§L — model tiers.** Per-source sweeps MAY dispatch parallel **sonnet** subagents (bounded
  read+extract; parent validates). Categorize/rank/summarize stay in the parent (**inherit**)
  — they need the whole picture and the user's rules.
