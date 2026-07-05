---
name: one-on-one
description: Run recurring 1:1s with your direct reports as an active coach, not a notepad. Keeps one rolling record per report (goals, standing themes, performance + coaching feedback, a running agenda inbox, and a reverse-chron session log) under ~/.pmos/one-on-ones/, and turns it into a human-first prep agenda with corpus-driven coached questions and deterministic flags (status-heavy sessions, stale action items, overdue career conversation). Use when the user says "prep my 1:1 with <name>", "add a report", "note for my next 1:1", "log today's 1:1", "who am I due for a 1:1 with", "career conversation with <name>", or "/one-on-one". Identity comes from /people. Independent of /interview-feedback.
user-invocable: true
argument-hint: "add <name> | note <report> \"<item>\" | plan <report> | log <report> | set <report> <field> <text> | career <report> | <report> (bare = overview)   [--tag blocker|growth|morale|feedback-up] [--non-interactive]"
---

# One-on-one

Keep and coach your 1:1s. This skill owns **one rolling Markdown record per direct report** — a persistent
header (goals, standing themes, operating manual, performance + coaching feedback), a running-agenda **inbox**,
and a reverse-chron **session log** — and turns it into an *actively coached* prep agenda. It is a coach, not a
neutral notepad (D6): `plan` proposes intent-tagged questions from a bundled corpus and raises deterministic
flags when recent 1:1s have drifted into status-only, when an action item has gone stale, or when a career
conversation is overdue.

Records live under `~/.pmos/one-on-ones/` (outside any repo — they hold sensitive employee content, INV-4).
Report **identity** is resolved through `/people` (INV-1); this skill owns only the 1:1 record. It is
**independent of `/interview-feedback`** (INV-2) and does **not** touch `/mytasks` (INV-3).

**Announce at start:** "Using one-on-one — <verb> for <report>." (Bare/overview: "Using one-on-one — who's due." )

This skill follows the SKILLS-standard authoring guide at `../../../pmos-toolkit/skills/feature-sdlc/reference/skill-patterns.md` — frontmatter, triggering, progressive disclosure, §H gates, §I flags, §J phases. The coaching substrate is in `reference/coaching-corpus.md`; the record/flag logic and verb CLIs are in `scripts/` (zero-dependency Node, each with `--selftest`); tests in `tests/`.

## Verbs

The first token selects the verb when it is exactly `add`, `note`, `plan`, `log`, `set`, or `career`; a bare
report name (or nothing) is the default **overview**.

- **`add <name>`** — resolve/create the report's `/people` identity, then scaffold their 1:1 record (cadence, role, initial goals, operating-manual notes). → Phase [Add](#add).
- **`note <report> "<item>"`** — quick-capture one agenda item into the running inbox, in a single unattended-safe command; optional intent `--tag`. → Phase [Note](#note).
- **`plan <report>`** — assemble the human-first prep agenda + coached questions + flags, and emit a commentable HTML prep artifact. → Phase [Plan](#plan).
- **`log <report>`** — append a dated session entry (topics, decisions, owner-tagged action items, questions) newest-first and clear discussed inbox items. → Phase [Log](#log).
- **`set <report> <field> <text>`** — set/update a persistent-header field: goals, standing themes, operating manual, **performance feedback**, **coaching feedback** (manager-entered only). → Phase [Set context](#set-context).
- **`career <report>`** — run Laraway's three-part career conversation and write a career-plan block to the header, distinct from weekly prep. → Phase [Career](#career).
- **bare (`<report>` or nothing)** — the who's-due roster across all reports. → Phase [Overview](#overview).

## Flags & natural language

Every verb and option also has a natural-language form — infer it from the request; an explicit flag overrides.
Canonical phrasings: "add <name> as a report" ≡ `add`, "jot this down for my next 1:1 with <name>" ≡ `note`,
"prep my 1:1 with <name>" ≡ `plan`, "log / write up today's 1:1" ≡ `log`, "record feedback for <name>" ≡
`set … feedback`, "let's do a career conversation with <name>" ≡ `career`, "who am I due for a 1:1 with" ≡ the
bare overview.

Contract flags (§I — machine-coupled / typed / headless-determinism), shown in `argument-hint`:

- `--tag <blocker|growth|morale|feedback-up>` — on `note`, the intent of the captured item (typed enum). It renders as a `[tag]` prefix that Phase [Plan](#plan) keys coached questions off. Natural language works too ("a blocker for <name>: …").
- `--non-interactive` / `--interactive` — see the non-interactive block.

All other flags the phases pass to the scripts (`--handle`, `--date`, `--field`, `--replace`, `--vision`, …) are
internal plumbing the skill constructs from the resolved verb + natural language, never a user-facing contract —
so they stay out of `argument-hint` by design (§I).

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion` tool:** the `add` create-report prompt and any confirm degrade to a numbered free-form question; the non-interactive auto-pick/DEFER contract still applies.
- **No subagents:** the skill is a sequential CRUD-plus-coaching flow (§L) — no parallel work to degrade.
- **TaskCreate / TodoWrite missing:** the skill body works without task tracking; the on-disk record is the canonical state.
- **`/people` unavailable:** `add` still scaffolds the 1:1 record from the supplied name (deriving a kebab handle); it just can't cross-link an identity — note that in the record and continue.
- **`node` missing:** every phase shells to a `scripts/*.mjs` CLI; without Node the skill cannot persist — surface the error, do not hand-edit records (byte-stability + the INV-4 guard live in the scripts).

## Track Progress

The verbs are single-step, so no cross-phase task list is needed for one report. For a multi-report sweep
("prep everyone I'm due for"), create one task per report with your agent's task tool (e.g. `TaskCreate`) and
mark each done as its prep artifact lands.

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

## Store & privacy

Every record is `~/.pmos/one-on-ones/<handle>.md` (or `$PMOS_ONEONONES_DIR`), created on first write. The record
holds **sensitive employee content** and must **never** live inside a repo working tree — `scripts/record-lib.mjs`
refuses to write there (INV-4). Do not hand-edit records or echo their raw contents into a repo, PR, or artifact
that could be committed; the prep artifact from Phase [Plan](#plan) is written under the store's `prep/` dir for
the same reason.

## Phase 0: Setup {#setup}

Before any verb runs: read `~/.pmos/learnings.md` if present and factor any entries under `## /one-on-one`
into your approach (skill body wins on conflict; surface conflicts to the user before applying). Resolve
`(mode, source)` per the non-interactive block and print the `mode:` line to stderr. Then resolve the report
handle from the verb's `<report>` argument (fuzzy-match against `~/.pmos/one-on-ones/*.md` and `/people`; the
create path is Phase [Add](#add)).

## Phase 1: Add {#add}

Resolve identity, then scaffold the record.

1. **Resolve the report in `/people`.** Look up the name in `~/.pmos/people/` (fuzzy per `/people`'s `lookup.md`). Found → use that `handle`. Not found → offer to create the person:
   <!-- defer-only: free-form -->
   - `AskUserQuestion`: "No one named <name> is in /people yet. Create them?" — because creating a person needs details this skill can't invent, this prompt **DEFERs under `--non-interactive`** (never fabricate a person). If declined or deferred, either use an existing handle or stop; do not scaffold a 1:1 record against a fabricated identity.
2. **Gather the scaffold fields** (interactive) or read them from natural language: cadence (default weekly), role, initial goal(s), operating-manual note(s). Under `--non-interactive`, missing fields are simply left empty — only the *person* is a hard DEFER.
3. **Persist:**
   ```
   node scripts/add.mjs --handle <handle> --name "<Full Name>" [--role "<role>"] [--cadence weekly] \
     [--started <YYYY-MM-DD>] [--goal "<goal>"]… [--theme "<theme>"]… [--manual "<note>"]…
   ```
   Refuses to clobber an existing record (use `note`/`set`/`log`, or re-scaffold explicitly).

## Phase 2: Note {#note}

One-command quick capture — the everyday verb, safe to run unattended.

- Append the item to the report's inbox, tagging intent when the user signals one:
  ```
  node scripts/note.mjs --handle <handle> --text "<item>" [--tag blocker|growth|morale|feedback-up]
  ```
- No prompts, ever — `note` is unattended-safe capture (never DEFERs). If the report has no record yet, the script errors telling you to `add` first; surface that rather than fabricating a record.

## Phase 3: Plan {#plan}

Assemble the prep agenda. Everything here is **deterministic** — the ordering, the flags, and the question
selection are computed by the script (§H); you narrate the result, you do not invent flags.

- Run:
  ```
  node scripts/plan.mjs --handle <handle> [--today <YYYY-MM-DD>]
  ```
- The script emits a terminal summary and writes a self-contained, commentable HTML prep artifact to
  `<store>/prep/<handle>-<date>.html` (Editorial Technical theme; annotate it in the browser before the meeting).
  Its sections are in **human-first order** (02_design.html §5): **Human first** (opener) → **Last time's open
  loops** → **Their agenda** (inbox by intent) → **Growth & feedback in view** → **Coached suggestions**.
- The three flags — **status-creep** (recent sessions all topic-only), **stale-action** (an open item older than
  the threshold), **career-due** (no recent career conversation) — and the coached questions come from
  `reference/coaching-corpus.md`. Present them as suggestions; the manager decides.

## Phase 4: Log {#log}

Write up the session after it happens.

1. **Gather the session body** (interactive) or from natural language: topics, decisions, action items
   (owner + open/done), questions, and which inbox items were discussed (to clear). Under `--non-interactive`,
   an **empty session body DEFERs** — never fabricate session content or feedback.
2. **Persist** (newest-first; still-open actions mirror into the header's open-items list for stale tracking;
   `--clear` removes discussed inbox lines by substring):
   ```
   node scripts/log.mjs --handle <handle> [--date <YYYY-MM-DD>] \
     [--topic "…"]… [--decision "…"]… [--action "<owner>|<open|done>|<text>"]… [--question "…"]… [--clear "<substr>"]…
   ```

## Phase 5: Set context {#set-context}

Maintain the persistent header — **manager-entered only** (this skill never fabricates feedback, D4).

- Fields map to header sections: `goal` → Goals & growth focus, `theme` → Standing themes, `manual` → Operating
  manual, `perf` → Performance feedback, `coaching` → Coaching feedback. Feedback fields are dated and accrete;
  pass a replace intent to swap a whole section.
  ```
  node scripts/set.mjs --handle <handle> --field goal|theme|manual|perf|coaching --text "<text>" [--date <YYYY-MM-DD>] [--replace]
  ```

## Phase 6: Career {#career}

Run Laraway's three-part career conversation — a session **distinct from weekly prep**.

1. Walk the arc from `reference/coaching-corpus.md` (Named models → Laraway): **Life Story → Dreams → Career
   Action Plan** (a long-term **vision** + a near-term **short-term** step — not an "18-month" or "15-month"
   plan; see the corpus attribution caveats). Under `--non-interactive`, an **empty plan DEFERs** (the two plan
   parts are never fabricated).
2. **Persist** — writes the career-plan block to the header and stamps `career_last_reviewed` (clearing the
   career-due flag):
   ```
   node scripts/career.mjs --handle <handle> [--date <YYYY-MM-DD>] \
     --vision "<long-term vision>" --short-term "<near-term step>" [--life-story "…"] [--dreams "…"]
   ```

## Phase 7: Overview {#overview}

The bare verb — a who's-due roster across every report, sorted most-overdue first. Read-only and deterministic
(cadence vs. last session, plus each report's flags):

```
node scripts/overview.mjs [--today <YYYY-MM-DD>]
```

## §H / §I / §L notes

- **§H gates.** The `status-creep` / `stale-action` / `career-due` flags and the "who's due" ordering are
  **deterministic → computed by the scripts**, never model arithmetic. Coached suggestions are advisory (judgment).
- **§I flags.** NL-first — every verb/flag has a natural-language form; `--tag` and `--non-interactive` are the
  only user-facing contract flags. Script-internal flags stay out of `argument-hint`.
- **§L dispatch.** No subagent fan-out — the skill is a sequential CRUD-plus-coaching flow.

## Independence

This skill imports nothing from `/interview-feedback` and reads no scorecard from it (INV-2); the two are
deliberately decoupled — a manager may score candidates without running 1:1s, or vice versa. It reads identity
from `/people` (INV-1) and never touches `/mytasks` (INV-3). The only cross-skill coupling is the light,
read-only identity lookup in Phase [Add](#add).

## Phase 8: Capture Learnings {#capture-learnings}

After a run, if you discovered something reusable — a cadence or flag-threshold judgment call, a corpus gap,
a `/people` resolution edge case — append it under `## /one-on-one` in `~/.pmos/learnings.md` (create the file
if absent). Keep entries to one or two lines. **Never record an employee's actual 1:1 content, feedback, or
career details** — those are private (INV-4); capture only the reusable technique.
