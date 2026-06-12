---
name: backlog
description: Maintain a lightweight, AI-readable backlog of epics and stories — features, bugs, tech-debt, chores, docs, spikes, and ideas — inside the repo. Zero-friction quick-capture (`/backlog add ...`) plus a three-queue tracker (groom / next / releases) driving the define → build → release loops. Integrates with the requirements → spec → plan → execute → verify pipeline via `--backlog <id>` and feeds `/feature-sdlc define|build` and `/complete-dev --epic`. Use when the user says "add to backlog", "capture this idea", "track this bug", "show the backlog", "what's next", "what needs grooming", "what can I release", "claim a story", or "promote a backlog item".
user-invocable: true
argument-hint: "[<text> | add <text> | list | show <id> [--tasks] | groom | next [--status planned|in-progress] | releases | refine <id> | set <id> <field>=<value> | promote <id> [--feature <slug>] | claim <id> [--holder <id>] | unclaim <id> | link <id> <doc> | archive | rebuild-index] [--kind epic|story] [--epic <id>] [--json] [--non-interactive | --interactive]"
---

# Backlog

A repo-resident, AI-readable backlog. Two jobs: (1) a zero-friction capture buffer for ideas/bugs/deferred-work that surface mid-flow, (2) a three-queue tracker over **epics** and **stories** that drives the define → build → release loops. Epics are the release unit; stories are the atomic unit of all three loops (one story = one worktree = one branch = one `/plan` = one `tasks.yaml`). See `schema.md` for the data model and `docs/pmos/reviews/2026-06-10_ops-observations/backlog-three-loop-design.md` for the rationale (D1–D30).

```
   capture            DEFINE (Loop 1)        BUILD (Loop 2)         RELEASE (Loop 3)
  /backlog add  ──▶  /feature-sdlc define ─▶ /feature-sdlc build ─▶ /complete-dev --epic
       │             requirements+spec        pick→claim→execute      merge train + ship
       ▼             story split + /plan      →verify→done/blocked    released: write-back
   draft/inbox       → planned (per story)
       │
   ┌───┴───────────────── the three queues (bare /backlog) ─────────────────┐
   │  groom   = your desk  ·  next = the machine's queue  ·  releases = shelf │
   └────────────────────────────────────────────────────────────────────────┘
```

**Announce at start:** "Using the backlog skill to {capture|show the queues|groom|pick next|...}."

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** State your assumption, document it in the output, and proceed (capture and the machine verbs never prompt anyway). The user reviews after completion.
- **No subagents:** Perform research and analysis sequentially as a single agent.
- **No `node`:** the claim lock (`scripts/claim-lock.js`) is the only hard dependency; without it, `claim`/`next --claim` degrade to a YAML-only `claimed_by:` write with a stderr warning that double-claim is unguarded (acceptable for single-driver use).

## References

- `schema.md` — the data model: kinds, enums, defaults, status machines, body, `tasks.yaml`, claim locks, INDEX, archive root. **The single source of truth for every enum.**
- `_shared/tracker-crudl.md` — shared tracker invariants: id/slug (§2), universal fields (§3), INDEX-as-cache (§5), archive (§6).
- `inference-heuristics.md` — keyword → type table for quick-capture.
- `pipeline-bridge.md` — the `--backlog <id>` contract + three-loop story write-back rules (main-checkout-only, auto-commit, blocked channel).
- `scripts/claim-lock.js` — O_EXCL story-claim lock (D13).
- `scripts/mint-id.mjs` — coordination-free id minter + dual-form validator (the `<MMDD>-<rand3>` allocation cited by `#add`; format owned by `_shared/tracker-crudl.md` §2).
- `_shared/interactive-prompts.md` — prompting protocol for `refine`.

## Flags & natural language

Options are NL-first: infer filters, scope, and destinations from the request ("list must-priority bugs", "across the workstream", "archive into 2026-Q1", "what's blocked on 0042"); an explicit flag overrides. Contract flags, kept literal: `--feature <slug>` (promote → `_shared/pipeline-setup.md` §B), `--kind epic|story` and `--epic <id>` (capture wiring), `--json` (machine read for `next`/`releases`/`list`), `--tasks` (`show` read-through), `--status <s>` (`next` candidate filter — `planned` default, `in-progress` selects the reconcile sweep, D1), `--holder <id>` (machine-coupled — the stable claim-owner string threaded into `claim-lock.js`; `claim`/`next --claim`), `--non-interactive`/`--interactive` (mode contract), and the `--backlog <id>` this skill's consumers pass per `pipeline-bridge.md`. Everything else stays parsed as back-compat sugar, marked `<!-- nl-sugar -->` at its definition site.

---

## Routing {#routing}

Parse the argument to pick a handler. Be liberal with the form — both `/backlog add foo` and `/backlog "foo"` work for capture. The sections below are independent verb handlers behind this dispatch table, not a sequence.

| Argument shape | Handler |
|---|---|
| empty | `#dashboard` (the three-queue view) |
| `add <text>` or free text not matching a verb | `#add` |
| `groom` | `#groom` |
| `next` | `#next` |
| `releases` | `#releases` |
| `claim <id>` / `unclaim <id>` | `#claim` |
| `set <id> <field>=<value>` | `#set` |
| `promote <id>` | `#promote` |
| `refine <id>` | `#refine` |
| `rebuild-index` | `#rebuild-index` |
| `list …` / `show <id>` / `link <id> <doc>` / `archive` / any read or light-maintenance request | `#interpret` |

If the first token is not a recognized verb AND the argument is non-empty, treat the whole argument as `add <text>` (frictionless capture is the priority) — **unless the text is query-shaped**. A question or read request about the backlog ("what's in my backlog for auth?", "do we have anything on rate limits?", "show me the bugs") routes to `#interpret`. Never create an item from a question about the backlog.

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

(`<repo>` = git repo root via `git rev-parse --show-toplevel`; if not in a git repo, the current working directory. Applies to every handler.)

---

## add — quick-capture {#add}

`/backlog add <text>` OR bare non-query text (per `#routing`).

**This handler MUST complete in a single tool-call sequence with NO clarifying questions.** Wrong inference is acceptable; capture friction is not (D26 — the quality bar is the `ready` gate, never `add`).

1. Ensure `<repo>/backlog/items/` exists (`mkdir -p`).
2. Mint id + derive slug per `_shared/tracker-crudl.md` §2 — id via `node scripts/mint-id.mjs` (coordination-free `<MMDD>-<rand3>`, §2.3); **no `max+1` scan, no counter**. Epics and stories draw from the same id space (the scheme needs no per-kind sequence). Slug per §2.2.
3. Infer `type` from `<text>` per `inference-heuristics.md` (case-insensitive, first-match-by-order; no match → `idea`, remember the fallback notice for step 6).
4. **Decide the kind + parent (D18 auto-wrap):**
   - `--kind epic` → create an epic (`status: inbox`); done.
   - `--epic <id>` → create a story with `parent: <id>`, attached to that existing epic; validate the epic exists (warn + fall through to auto-wrap if missing).
   - otherwise → create the story **and** a same-titled singleton epic (`status: inbox`), set the story's `parent:` to it. Rollup views collapse single-story epics, so this is invisible until the epic grows. Stories stay re-parentable via `set <id> parent=<epic>` until first claim.
   - retro capture ("capture this as already done") → status `done` (story); still wrapped. <!-- nl-sugar --> `--done` stays parsed as the explicit spelling.
5. Write `backlog/items/{id}-{slug}.md` — frontmatter only, no body, per `schema.md` "Defaults on create". `title` = the original text, unchanged.
6. Regenerate INDEX inline (`#rebuild-index`). If regeneration fails, the item file is still written — warn suggesting `/backlog rebuild-index`, but DO NOT roll back the write.
7. Output exactly one line (the capture contract — the user learns the inferred type here):

   `Captured #{id} ({type}, {kind}, should): "{title}"` — for an auto-wrapped story, append ` in epic #{epic-id}`.

   If `type` was the fallback, append: ` — type inferred as 'idea' (no strong signal); use /backlog set {id} type=... to correct.`

## set — the machine API {#set}

`/backlog set <id> <field>=<value>`. `/requirements`, `/spec`, `/plan`, `/execute`, `/verify`, `/feature-sdlc`, and `/complete-dev` invoke this literal form per `pipeline-bridge.md`; keep its surface exact.

1. **Field name.** Settable: `title`, `type`, `status`, `priority`, `score`, `labels`, `route`, `kind`, `parent`, `dependencies`, `source`, `feature_folder`, `requirements_doc`, `spec_doc`, `design_doc`, `plan_doc`, `tasks_file`, `worktree`, `claimed_by`, `released`, `pr`. (`design_doc` is the `route: skill` epic's coherence contract, G2 — set by `/feature-sdlc define --route skill` in place of `spec_doc`.) Skill-managed (reject with `Field '{field}' cannot be set directly. The skill manages it.`): `id`, `created`, `updated`, `resume_attempts`, `last_progress`, `driver_holder` (the last three are the build-loop reconcile poison-guard fields, written only by `#build-mode`'s reconcile step — `schema.md` § "Frontmatter — story-only fields", D7).
2. **Value.** Validate against `schema.md` (the single enum source):

   | Field | Validation |
   |---|---|
   | `type`, `priority`, `route`, `kind` | must be in the matching enum in `schema.md` |
   | `status` | must be in the machine for the item's `kind` (epic vs story — `schema.md`) |
   | `score` | integer, 1 ≤ n ≤ 1000, or empty (to clear) |
   | `labels`, `dependencies` | comma-separated → YAML list; `dependencies` ids validated to exist + be siblings under the same `parent` (warn on miss/cross-epic, proceed) |
   | `parent` | single id; validate it exists and is `kind: epic` |
   | everything else | free string |

   On enum violation: `Unknown {field} '{value}'. Allowed: {list from schema.md}.` No write.
3. **Main-checkout rule (stories, D11).** When the working dir is a story worktree and the field is a status/claim/release/body mutation, write the item in the **main checkout** (resolve via `git worktree list --porcelain`), not the worktree copy, then auto-commit path-scoped per `pipeline-bridge.md`. Plain field edits from the main checkout commit normally.
4. **Edit.** Update only the named field, set `updated:` to today, write back. If `title` changed, rename the file to match the new slug (preserve the id prefix). Regenerate INDEX. Confirm in one line: id + field + new value (note any rename).

## next — the picker (machine API, D22) {#next}

`/backlog next [--kind story] [--status planned|in-progress] [--route <r>] [--json] [--claim] [--holder <id>]`. Computes the single best ready story (or, with `--status in-progress`, the reconcile sweep list); `/feature-sdlc build --next` consumes `--json`. Readiness is **derived**, never stored.

1. **Candidate set:** stories at `status: planned` (default) whose `dependencies:` are **all `done` or `released`**, and which are **unclaimed** (no live claim lock per `scripts/claim-lock.js status`).
2. **Wontfix-dep poison (D30):** a dependency on a `wontfix` story is permanently unsatisfiable → that dependent is NOT a candidate; instead flip it to `blocked` (one-line note: `blocked: depends on wontfix #<dep>`) so it surfaces in `#groom`.
3. **Order (D22):** stories of **in-flight epics first** (any sibling `in-progress`/`done`/`released`), then priority bucket (must>should>could>maybe) → score desc (nulls last) → updated desc. This drives epics to completion instead of spreading WIP.
4. **Output:** the top candidate. `--json` → `{id, parent, title, route, plan_doc, tasks_file, worktree, dependencies}` (or `{}` when none). Human → one line: `Next: #{id} [{priority}] {title} (epic #{parent}). Claim with /backlog claim {id} or /feature-sdlc build --next.` No candidate → `No ready story. Run /backlog groom to see what's waiting on you.`
5. **`--claim`:** on a chosen candidate, delegate to `#claim` atomically before returning (used by unattended drivers so pick+claim is one step). `--holder <id>` is threaded through to `#claim` so the claim records the caller's stable owner id.

**`--status in-progress` — the reconcile sweep (D1).** `/feature-sdlc build`'s `reconcile-in-flight` step 0 calls `/backlog next --kind story --status in-progress --json` to find a crashed-mid-build story to resume. In this mode the picker switches semantics:
   - **Candidate set:** stories at `status: in-progress` (claimed or not — they are already in flight; **no `dependencies:` gating**, those were satisfied at pickup). Never `blocked`/`done`/`released` (D7 — reconcile only ever touches in-progress).
   - **Order:** the same D22 order (in-flight-epic-first → priority → score → updated desc).
   - **Per-story claim annotation:** for each candidate, read its claim via `scripts/claim-lock.js status <repo>/backlog/claims <id>` and attach `{claim_holder, claim_at, claim_stale}` (`claim_stale` = `at` older than the 4h TTL; absent lock → `claim_holder: null`). The caller applies the D2 ownership guard itself (resume iff the claim is absent / stale / its own holder); this query does **not** decide resumability — it surfaces the facts.
   - **Output:** `--json` → a JSON **array** (D22 order) of `{id, parent, title, route, plan_doc, tasks_file, worktree, dependencies, resume_attempts, last_progress, driver_holder, claim_holder, claim_at, claim_stale}`; `[]` when no in-progress story exists (the clean-backlog fall-through, D1). `--claim`/`--holder` are ignored in sweep mode (resumption claims happen in `#build-mode`, not here).

## claim / unclaim {#claim}

`/backlog claim <id>` · `/backlog unclaim <id>`. The atomic story-claim primitive (D13).

**claim:**
1. Run `node scripts/claim-lock.js acquire <repo>/backlog/claims <id> --holder <holder>`. The `<holder>` is the caller's stable owner id: pass `--holder <id>` when given, else default to this session's id. **`/feature-sdlc build` passes a stable per-loop holder** (e.g. `loop:<root-session-id>`) so a crashed tick's own abandoned claim is reclaimed immediately by the next tick without the 4h TTL wait (epic 0612-w4e D3 — the own-holder reclaim trigger in `claim-lock.js`). Exit 0 → lock held; exit 3 → contended (print the holder; refuse: `#{id} is already claimed by {holder} since {at}. /backlog unclaim {id} to steal, or pick another.`).
2. On success, stamp `claimed_by:` and `driver_holder:` (the `<holder>` just used — mirror of the lock's owner, read by reconcile, D3); `status: in-progress` is NOT set here — claim only reserves; `/execute` sets `in-progress`. Write the mirrors in the **main checkout**, auto-commit `chore(backlog): {id} → claimed [claim]` (D12).
3. Confirm: `Claimed #{id}. Worktree: {worktree or "(fresh from main)"}.`

**unclaim:** `node scripts/claim-lock.js release <repo>/backlog/claims <id>`; clear `claimed_by:` in the main checkout; auto-commit `chore(backlog): {id} → unclaimed`. Confirm one line. Stale locks (>4h) are auto-reclaimed by `acquire`; `unclaim` is the manual override.

## promote {#promote}

`/backlog promote <id> [--feature <slug>]`. The lightweight single-item handoff for a story that doesn't need a full epic-define pass (the three-loop path is `/feature-sdlc define <epic>`; `promote` stays for quick one-offs).

1. **Status routing** (story `status`): `draft`/`ready` → seed `/requirements` (draft) or `/spec` (ready); `planned`+ → refuse with the next-step (`Use /feature-sdlc build --story {id}`); `done`/`released`/`wontfix` → refuse (`Use /backlog set to revive first`). On refuse: `#{id} is at status '{status}'. {next_step}.`
2. Build the seed (`[Backlog #{id} | {type} | priority {priority}]` + title + body + `Source: backlog/items/{id}-{slug}.md`).
3. Resolve the feature folder per `_shared/pipeline-setup.md` §B (`skill_name=backlog`, `feature_arg=<--feature>`, `feature_hint=<title>`); default Create-new.
4. Write the seed to `{feature_folder}/01_requirements.{html,md}`. If it exists, do NOT overwrite — abort: `#{id}: {path} already exists. Re-run with --feature <new-slug> or remove it.`
5. Invoke the target with `--backlog {id}` (the bridge consent gate). The frontmatter write-back is the target's responsibility per `pipeline-bridge.md`. Confirm one line on return.

## rebuild-index {#rebuild-index}

`/backlog rebuild-index`. Also invoked internally by every mutating handler, per the regenerable-cache contract in `_shared/tracker-crudl.md` §5.

1. Glob `<repo>/backlog/items/*.md`; parse frontmatter; skip malformed files (one-line warning per skip; never abort).
2. Overwrite `<repo>/backlog/INDEX.md` per `schema.md`'s "INDEX.md format" — the `## Epics` rollup (derived `done/total`), then priority-grouped stories. Grouping, sort, columns, and `Last regenerated:` are specified there.
3. Invoked directly: `Regenerated INDEX.md: {count} items.` Invoked internally: silent on success, warn on failure.

---

## Interpret the request {#interpret}

The read and light-maintenance paths (`list`, `show`, `link`, `archive`, and ad-hoc queries) share one rule: **the user describes what they want; interpret the constraints and act.** No fixed flag grammar — infer filters, scope, and destinations from natural language, validating enum values against `schema.md` and sorting per its INDEX rules. The legacy flag spellings still parse as sugar.

**list / query** — "list must-priority bugs", "what's blocked on 0042", "show the inbox epics", "anything on rate limits across the workstream".
<!-- nl-sugar -->
Legacy: `list --type/--status/--priority/--label <v>`, `--repo <name>`, `--workstream`, `--include-archive`, `--kind epic|story`, `--json`.
- Scope local `items/` (plus `archive/**/` when asked; workstream requests go through `#workstream-aggregator`).
- Filters AND together; validate values against `schema.md` (reject unknown with the allowed list).
- Render the flat story table (columns `id | kind | type | status | parent | title | spec | plan | pr`; prepend `repo` in workstream mode) — or the `## Epics` rollup when the user asks about epics/releases. `--json` emits the rows as an array. Zero matches: `No items match.`

**show** — `/backlog show <id> [--tasks]`.
- Normalize the id (`42`, `0042`, or `repo#0042` → `#workstream-aggregator`). Search `items/` then `archive/**/`. Not found → `No item with id {id}. Closest matches by prefix: {list or "(none)"}. Run /backlog list to see all items.`
- Output the file contents verbatim, fenced.
- **`--tasks`:** also render the story's `tasks_file` **read-only**, resolving the path **through the worktree** when the story is claimed (the branch-local `tasks.yaml` is the live state, D11) else from main. Derive each task's readiness (`pending` + all `deps` done) at render time (D21); never write.

**link** — `/backlog link <id> <doc-or-url>`. Infer the field (`*/pull/N` → `pr`; `*-spec.*`/`*_spec.*` → `spec_doc`; `*-design.*`/`*_design.*` → `design_doc`; `*-plan.*` → `plan_doc`; `tasks.yaml` → `tasks_file`; `*-requirements.*` → `source`; else error `Cannot infer link type from '{value}'. Use /backlog set {id} <field>=<value>.`) and delegate to `#set`. Confirm one line.

**archive** — `/backlog archive` (or "archive old done items", "archive into 2026-Q1").
<!-- nl-sugar -->
Legacy: `--quarter YYYY-QN`.
- Eligibility: `status` in `done`/`released`/`wontfix` AND age (today − `updated:`) > 30 days.
- Destination quarter per-item from `updated:` unless the user names one (forces it for all).
- Move per `_shared/tracker-crudl.md` §6 (`git mv`; plain move outside git). Regenerate INDEX. Report: count + `#{id} → {quarter}` per item, or `0 items: nothing eligible.`

## refine {#refine}

`/backlog refine <id>`. Interactive — follow `_shared/interactive-prompts.md` (ONE field at a time; fallback: numbered responses). Locate via `#interpret`'s `show` lookup; missing → same error.

<!-- defer-only: free-form -->
Ask via `AskUserQuestion` when available, in order: **Title** (current shown; enter to keep) · **Context** (multi-line; "skip") · **Acceptance Criteria** (one per line; "done" to finish; zero is fine) · **Priority** (enum; default current) · **Score** (1–1000 or "skip") · **Labels** (comma-separated or "skip"). For a story, ACs are what gate it from `draft` → `ready`.

Write the body per `schema.md`'s section order (always `## Context` — use "_TBD_" if skipped; `## Acceptance Criteria` only if any given; never `## Notes`). Keep frontmatter except `updated:` → today, and for a story `status:` → `ready` if currently `draft`/`inbox` and ≥1 AC exists, plus any changed `priority`/`score`/`labels`. Regenerate INDEX. Confirm one line: id + old → new status (omit the arrow if unchanged).

---

## dashboard — bare /backlog (the three queues, D25) {#dashboard}

`/backlog` with no arguments renders the three-queue dashboard: **groom** (your desk), a **next preview** (the machine's queue), and **releases** (the shelf).

1. If `<repo>/backlog/INDEX.md` is missing (or `backlog/` absent), output `No backlog yet. Capture an item with /backlog add <text>.` and exit.
2. Freshness per `_shared/tracker-crudl.md` §5: regenerate INDEX if any `items/` file is newer than its `Last regenerated:` date.
3. Render three compact sections, each derived at render time:
   - **Groom (waiting on you):** the `#groom` summary (counts + top rows).
   - **Next (the machine's queue):** the single `#next` pick (or "nothing ready").
   - **Releases (the shelf):** the `#releases` release-ready list (or "nothing release-ready").
   Each row carries its copy-ready next command. Then print the full `INDEX.md` below the dashboard.

## groom — the human queue (D25) {#groom}

`/backlog groom`. Lists everything waiting on a **human**, grouped with copy-ready next commands. All derived at render time.

| Group | Membership | Next command |
|---|---|---|
| **needs definition** | epics at `inbox`/`defining` | `/feature-sdlc define <epic-id>` |
| **needs grooming** | stories at `draft` or missing ACs | `/backlog refine <story-id>` |
| **blocked** | stories at `blocked` (show the gap text from `## Notes`) | fix, then `/feature-sdlc build --story <id>` |
| **stale claims** | claim locks older than the 4h TTL (`scripts/claim-lock.js status` per claimed story) | `/backlog unclaim <id>` |

Empty groom: `Nothing waiting on you. Run /backlog next to see what the machine can pick up.`

## releases — the release shelf (D23) {#releases}

`/backlog releases [--json]`. Answers "what can I release, and what's in it?" — readiness derived at render time, never stored. `/complete-dev --epic` with no id offers this same release-ready list.

For each epic, roll up its non-wontfix stories:

- **release-ready** (all non-wontfix stories `done`): show epic id, plugin (from `labels`/`route`), each completed story with its one-line summary + `/verify` verdict (a **changelog preview** of what the train will assemble), and the copy-ready `/complete-dev --epic <id>`.
- **in-flight** (some stories still open): progress rollup, e.g. `3/5 done, 1 blocked`.
- **blocked** (a story is `blocked`): which story + the gap.

`--json` emits `{release_ready: [...], in_flight: [...], blocked: [...]}` for `/complete-dev`. Human output groups the three with the release-ready set first. Empty: `No epics. Capture work with /backlog add <text>.`

---

## workstream aggregator {#workstream-aggregator}

Used by `#interpret` (workstream scope) and `show <repo#id>`. Read-only — never writes items, `~/.pmos/workstreams/{slug}.md`, or `.pmos/settings.yaml` (linked-repo management is `/product-context`'s job).

1. Read `<repo>/.pmos/settings.yaml :: workstream`. Absent → `Current repo has no workstream link. Run /product-context init or query without --workstream.`
2. Read `~/.pmos/workstreams/{slug}.md` frontmatter `linked_repos:`. Absent/empty → `Workstream '{slug}' has no linked_repos. Add them via /product-context update.`
3. For each linked repo: skip paths not on disk (warn `Skipping {path} (not on disk).`); else read `{path}/backlog/items/*.md`, tagging each item with its repo basename.
4. Render ids as `{repo-basename}#{id}`; `show repo-a#0001` parses the prefix to route.

---

*Spec lineage: `docs/pmos/features/2026-04-25_backlog-skill/02_spec.md` (capture contract, score bounds, archive eligibility, promote routing); `2026-05-08_non-interactive-mode/` (mode block); `_shared/tracker-crudl.md` (shared invariants, 2026-05 consolidation); `schema.md` (enum/INDEX/defaults ownership, 2026-06-10 review); the three-loop model (epics/stories/tasks.yaml, define/build/release queues) per `docs/pmos/reviews/2026-06-10_ops-observations/backlog-three-loop-design.md` (D1–D30). Per-rule traceability lives in those files, not inline.*
