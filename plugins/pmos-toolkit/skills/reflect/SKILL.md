---
name: reflect
description: Generate a paste-back retrospective for every pmos-toolkit skill invoked in the current session. Reads the session transcript (not the skill's source) to identify what went wrong, where the user pushed back, what got skipped, and where friction surfaced — emits one markdown block per skill, severity-tagged (blocker / friction / nit), ready to paste to the skill author. Use when the user says "/reflect", "what went wrong this session", "give feedback to the skill authors", "how did the pmos skills hold up", or "produce a session retro".
user-invocable: true
argument-hint: "[skill-name to filter, optional] [--last N] [--days N] [--since YYYY-MM-DD] [--project current|all] [--skill <name>] [--scan-all] [--msf-auto-apply-threshold N] [--non-interactive | --interactive]"
---

# Reflect

Produce a transcript-grounded retrospective on every `pmos-toolkit:*` skill that ran this session. The output is markdown the user can paste back to the skill author for improvement. **Critique is grounded in observed behavior — never in reading the skill's implementation.**

**Announce at start:** "Using reflect to analyze pmos skill invocations in this session from the transcript."

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:
- **No interactive prompt tool:** State your assumption, document it in the output, and proceed. The user reviews after completion.
- **No subagents:** Perform analysis sequentially as a single agent.
- **No transcript access:** If you cannot find a session transcript file, fall back to the in-context conversation and note the limitation in the output header.

## Track Progress

This skill has multiple phases. Create one task per phase using your agent's task-tracking tool (e.g., `TodoWrite` in Claude Code, equivalent in other agents). Mark each task in-progress when you start it and completed as soon as it finishes — do not batch completions.

## Phase 0: Load Learnings

Read `~/.pmos/learnings.md` if it exists. Note any entries under `## /reflect` and factor them into your approach for this session.

### Multi-session flag parser (T14, new in v2.34.0 per W8)

Parse the following flags from the argument string before any other processing. All are optional; defaults preserve single-session behavior.

| Flag | Type | Default | Purpose |
|------|------|---------|---------|
| `--last N` | int (>0) | unset | Analyze the last N session transcripts (most-recent-first). Mutually exclusive with `--days` and `--since`. |
| `--days N` | int (>0) | unset | Analyze transcripts within the last N days. Mutex with `--last` and `--since`. |
| `--since YYYY-MM-DD` | ISO date | unset | Analyze transcripts on or after the given date. Mutex with `--last` and `--days`. Future dates → exit 64. |
| `--project current\|all` | string | `current` | Scope: `current` = this project's transcript dir only; `all` = every project under `~/.claude-personal/projects/`. |
| `--skill <name>` | string | unset | Filter findings to only the named skill (e.g., `--skill spec`). Combine with `--last` for "recurring spec issues across sessions". |
| `--scan-all` | boolean | false | Override the cap-confirmation prompt — process every transcript without prompting (D18 escape). |
| `--msf-auto-apply-threshold N` | int (0-100) | 80 | Confidence threshold for any folded MSF apply-loops invoked by /reflect (per FR-RETRO-MSF integration). |

**Validation rules** (exit 64 with usage hint on violation):

- `--last 0` or negative → exit 64.
- `--since` parses as a future date (after today) → exit 64.
- More than one of `--last / --days / --since` set → exit 64.
- `--project` value not in `{current, all}` → exit 64.

**Mode resolution and the canonical non-interactive block below run AFTER flag parsing.** A malformed flag value short-circuits before any structured-ask is issued.

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

## Phase 1 (multi-session prelude): Enumerate transcript candidates + D18 cap

**Skip if no multi-session flag was set** (no `--last`, `--days`, or `--since`). Single-session path goes directly to Phase 1 below.

When a multi-session flag is set:

1. **Enumerate candidates** by globbing `~/.claude-personal/projects/<project>/*.jsonl` (or all projects if `--project all`). Build candidate rows: `(date, size, skill-invocation-count, project-slug)`. Sort by date descending.
2. **Apply selector**:
   - `--last N` → take the first N rows.
   - `--days N` → keep rows whose date ≥ now() − N days.
   - `--since YYYY-MM-DD` → keep rows whose date ≥ the given date.
3. **0-candidate handling (E16)**: emit `no transcripts found matching <selector>`; exit 0 cleanly. Do not error.
4. **Cap-confirmation (D18, FR-40)**: if candidate count > 20 AND `--scan-all` is NOT set:

   ```
   AskUserQuestion:
     question: "Selector matched N transcripts. Scanning all may take >2 min. Pick scope:"
     options:
       - Process most-recent-20 (Recommended)
       - Process all N (--scan-all equivalent)
       - Cancel
   ```

   In `--non-interactive` mode the classifier AUTO-PICKs **most-recent-20** per D32. The Recommended option matches D32 default (NI auto-pick is most-recent-20 to keep wall-clock bounded per NFR-02).

5. **Final candidate set** is the resulting trimmed list; this seeds Phase 2 dispatch.

## Phase 2 (multi-session dispatch): Subagent-per-transcript with 5-in-flight + 60s timeout

**Skip if not in multi-session mode.**

For each candidate transcript, dispatch a fresh subagent (per D7) with:

- **Brief**: read the transcript jsonl, identify pmos-toolkit:* skill invocations, extract findings tagged `blocker|friction|nit` per Phase 4 standalone rubric. Return a compact YAML list `{skill, severity, finding, session-date}`.
- **Concurrency** (D18): 5 in-flight at any time. As one returns, dispatch the next.
- **Timeout** (FR-42): 60s wall-clock per subagent. On timeout, mark the transcript `scanned-failed`, free the in-flight slot, and continue.
- **Per-wave progress** to stderr (FR-49): `Wave i/N: <complete>/<in-flight> (T+<sec>s)`. Emit on each subagent return + on each new dispatch.

**Partial-failure handling (FR-44)**: If ≥1 transcript fails, continue with the remaining results. Phase 5 emission marks failed transcripts in a `## Skipped (scan failed)` subsection; recurring-pattern aggregation excludes them but keeps the count visible.

**NFR-02 wall-clock budget**: 5×60s = 300s worst-case for 20 candidates with one wave; per-wave progress emits prevent silent hangs. Empirical target <90s for the 5-transcript W8 fixture.

## Phase 1: Locate the Session Transcript

The transcript is the source of truth — read it directly rather than relying on summarized in-context history (compaction may have dropped detail).

1. Resolve the project slug: replace `/` with `-` in the current working directory's absolute path (e.g., `/Users/maneeshdhabria/Desktop/Projects/agent-skills` → `-Users-maneeshdhabria-Desktop-Projects-agent-skills`).
2. List `~/.claude/projects/<slug>/*.jsonl` (sorted by mtime, newest first). The newest file is almost always the current session.
<!-- defer-only: ambiguous -->
3. If multiple recent files exist or the slug doesn't resolve, ask the user via `AskUserQuestion` which file to use, or accept a path argument.
4. **Fallback:** if no jsonl is found, use the in-context conversation as the corpus and put a note at the top of the output: `> Note: transcript file not found — analysis based on in-context conversation only; older turns may have been compacted.`

## Phase 2: Detect pmos Skill Invocations

Scan the transcript for skill activations. Signals to look for:
- `<command-name>pmos-toolkit:*</command-name>` tags (slash invocation)
- `Skill` tool calls with `skill: "pmos-toolkit:*"` or `skill: "<name>"` where `<name>` matches a pmos skill
- Inline announcements like `Using <skill> to ...`
- `SkillStart` system messages naming a pmos-toolkit skill

Build an ordered list of `(skill_name, start_marker, end_marker)` tuples. The end marker is the next user turn after the skill claims completion, or the next skill invocation. If the same skill ran multiple times, treat each run as a separate entry.

If the user passed a skill name argument, filter to that skill only.

**If zero pmos skills were invoked:** print `No pmos-toolkit skills were invoked in this session.` and exit. Do not fabricate findings.

## Phase 3: Peek at Skill Frontmatter Only

For each unique skill name detected, read **only the YAML frontmatter** of `plugins/pmos-toolkit/skills/<name>/SKILL.md` (or wherever the plugin is installed). You need:
- `name`
- `description`
- `argument-hint` (if present)

**Do not read the body of the skill.** The body would bias the critique toward rationalizing the skill's design. The frontmatter gives you the skill's claimed contract — that is enough to judge "claimed X, did Y."

If frontmatter cannot be located, note the skill name and proceed without the contract reference.

## Phase 4 (multi-session aggregation): Boilerplate-strip + nested constituents (T17)

**Skip if not in multi-session mode** (Phase 2 multi-session dispatch was not run).

After Phase 2 dispatch returns the per-transcript findings, aggregate via the hash:

```
hash = (skill, severity, first-100-chars-of-finding-with-boilerplate-stripped)
```

### Boilerplate-strip rules (FR-45)

Apply this regex to each finding text BEFORE computing the first-100-chars hash component:

```regex
^The /\S+ skill\b\s*|^The skill\b\s*|^An?\s+|^The\s+
```

This strips the skill-name prefix (`The /spec skill ...`) and leading articles (`A wireframes ...`, `An MSF ...`, `The wireframes ...`) so semantically-identical findings hash the same regardless of phrasing variance.

### Aggregation result shape

For each unique hash, emit ONE aggregated row:

```markdown
- **<skill>** [<severity>] — <stripped-100-chars-finding>
  - <session-date-1>: <verbatim finding-1>
  - <session-date-2>: <verbatim finding-2>
  ...
```

The nested sub-list lists every constituent finding (verbatim, with session date) — D10 Loop-2 refinement requires constituents inline so the user can audit the aggregation.

### Hash collisions

Findings with identical (skill, severity, stripped-prefix) but different remaining text hash the same. This is intentional — the user reviews the constituent list to confirm. False positives surface as "this aggregation contains semantically-different findings"; the operator splits manually if needed (rare).

## Phase 4: Analyze Each Invocation

For each invocation, scan the transcript window (start → end) for these signals:

1. **User corrections / pushback** — phrases like "no", "don't", "stop", "that's wrong", "redo", "you missed X", "why did you", or any user turn that re-directs the skill mid-flight.
2. **Repeated retries / loops** — refinement loops that hit max iterations, the agent re-running a phase, or the user having to repeat an instruction.
3. **Skipped phases or checklist items** — the skill's frontmatter promises behavior X (or the transcript shows the skill announcing phases) but the run ended without that phase appearing. Common offenders: Capture Learnings, Workstream Enrichment, self-review loops.
4. **Off-spec output shape** — output didn't match what the description promised (missing sections, wrong format, didn't write the file it claimed to write).
5. **Friction-but-worked** — skill ultimately produced acceptable output, but had awkward UX: unclear prompts, unnecessary back-and-forth, prose-dump findings instead of structured asks, surprising defaults, redundant confirmations.

For each signal you find, capture: the transcript quote (≤2 lines), what you infer happened, and a concrete proposed change to the skill.

## Phase 5 (multi-session emission): Two-tier output + per-wave progress (T18)

**Skip if not in multi-session mode.**

After Phase 4 aggregation, emit a two-tier report:

```markdown
# /reflect — multi-session

**Selector:** <flag values>  •  **Transcripts processed:** N  •  **Wall-clock:** <sec>s

## Recurring Patterns

> Findings seen in ≥2 sessions, sorted by frequency × severity (blocker=3, friction=2, nit=1).

- **<skill>** [<severity>] — <finding-100-chars>  *(seen across <date-1>, <date-2>, <date-3>)*
  - <date-1>: <constituent>
  - <date-2>: <constituent>
  - ...

## Unique but Notable

> Single-session findings rated `blocker` or persistent friction.

- **<skill>** [<severity>] — <finding-100-chars>  *(<session-date>)*

## Skipped (scan failed)

> Transcripts that timed out or errored during Phase 2 dispatch (FR-44).

- <transcript-path> — <reason>
```

### Per-wave progress emit (FR-49)

During Phase 2 dispatch, emit to stderr at every subagent return AND every new dispatch:

```
Wave i/N: <complete>/<in-flight> (T+<sec>s)
```

Where `i/N` is the current wave (5-in-flight), `<complete>` is the cumulative completed count, `<in-flight>` is the currently-dispatched count. NFR-02 wall-clock budget for 5 transcripts: <90s.

### `seen across <session-dates>` annotation (FR-46)

Every Recurring Patterns row includes the comma-separated list of session dates where the aggregation appeared. This lets the user spot whether a pattern is becoming more frequent over time (versus a one-time blip in two sessions).

## Phase 5: Emit Retro Blocks

For each invoked skill, emit one markdown block in this exact shape, printed inline in the conversation (no file written):

````markdown
### Retro: /<skill-name>  ·  <run-count> run(s)

**Claimed contract (from description):** <one-line paraphrase of frontmatter description>

**What happened:** <2-4 sentence neutral summary of how the run(s) actually went.>

**Findings:**

- **[blocker]** <one-line finding> — *Evidence:* "<short quote or paraphrased turn>" — *Proposed fix:* <concrete change to the skill, e.g., "add a Phase N that …", "tighten the description trigger phrase to …", "replace prose-dump review with an interactive-prompt batch …">
- **[friction]** <one-line finding> — *Evidence:* … — *Proposed fix:* …
- **[nit]** <one-line finding> — *Evidence:* … — *Proposed fix:* …

**Net assessment:** <one sentence: did the skill deliver on its claimed contract this session?>
````

Severity definitions:
- **blocker** — skill produced wrong/missing output, user had to redo it, or a promised phase was silently skipped
- **friction** — skill worked but UX was rough enough to slow the user down or require repeated guidance
- **nit** — minor polish item; safe to defer

If a skill ran multiple times with different outcomes, fold them into one block and note "Run 1: …, Run 2: …" inside *What happened*.

If a skill had **zero** signals worth reporting, still emit a one-line block: `### Retro: /<name> — clean run, no findings.` Do not invent issues.

After all blocks, print a one-paragraph **Session summary** that lists the skills with the most blockers/friction in priority order, so the user knows where to paste-back first.

## Phase 6: Capture Learnings

**This skill is not complete until the learnings-capture process has run.** Read and follow `learnings/learnings-capture.md` (relative to the skills directory) now. Reflect on whether this session surfaced anything worth capturing about `/reflect` itself — e.g., transcript-resolution edge cases, signals that turned out to be false positives, output shapes that didn't paste cleanly. Proposing zero learnings is a valid outcome for a smooth session; the gate is that the reflection happens, not that an entry is written.

## Anti-Patterns

- **Reading the skill body to form the critique.** The whole point of `/reflect` is a black-box, transcript-grounded view. Reading SKILL.md will bias you toward rationalizing the existing design ("ah, the skill does X because phase 3 says Y") instead of noticing that X was missing from this session. Frontmatter only.
- **Manufacturing findings to fill space.** A clean run is a valid outcome. Emit the one-line "clean run" block and move on. Pretending you found three nits per skill makes the paste-back useless.
- **Vague proposed fixes.** "Improve clarity" is not a fix. "Replace the prose dump in Phase 4 with an interactive-prompt batch using Fix / Modify / Skip / Defer options" is a fix.
- **Treating every user message as a correction.** A clarifying question or a "looks good" is not pushback. Only count turns that re-direct, reject, or repeat instruction.
- **Severity inflation.** A surprising default is a *friction*, not a *blocker*. Reserve **blocker** for things that broke the skill's claimed contract.
- **Writing to disk.** Output is inline markdown for paste-back. No retro file unless the user explicitly asks.
- **Over-quoting the transcript.** Two lines max per finding. Paraphrase if needed. The author wants the diagnosis, not a transcript dump.
