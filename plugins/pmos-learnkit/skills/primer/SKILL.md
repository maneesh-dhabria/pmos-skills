---
name: primer
description: Produces a verified-source, audience-shaped HTML primer on any topic — researched, outlined, drafted, and self-evaluated into a single teachable artifact. Use to ramp-up before a meeting / a scope / a doc review, when the user needs to learn a topic quickly with citations they can trust. Triggers when the user says "write me a primer on X", "ramp me up on Y", "generate a primer", "I need to learn about Z before a meeting", "/primer", or "create a teachable artifact on this topic". Shapes depth, jargon, and examples to the chosen audience (senior-pms vs all-pms) and prefers primary sources over secondary commentary.
user-invocable: true
argument-hint: <topic> [--audience <senior-pms|all-pms>] [--autonomous] [--format <html|md|both>] [--non-interactive] [--interactive]
---

# Primer

**Announce at start:** "Using primer to research and draft a teachable artifact on the requested topic."

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

<!-- defer-only: ambiguous -->
- **No `AskUserQuestion` available:** Intake confirmation, audience selection, and Phase 0.5 consolidated confirm all degrade to numbered free-form prompts per `_shared/interactive-prompts.md`. The non-interactive auto-pick contract (Recommended → AUTO-PICK) still applies.
- **No `Task` subagent:** Research, drafting, and eval phases run inline in the host conversation; the try-both research pattern in Phase 2 collapses to a single sequential pass (web search first, then context7 if available).
- **No `WebFetch`:** Phase 2 research falls back to context7 MCP (if available) plus any user-supplied URLs/snippets pasted into the conversation; surface the degraded-source warning in the eval phase.
- **No `context7` MCP:** Phase 2 research falls back to `WebFetch` plus user-supplied material; if neither is available, refuse with a clear message naming the missing tools and exit 64.

## Track Progress

This skill has 5 sequential phases (Intake, Research, Outline, Draft, Eval + Write) plus an intake/setup phase (Phase 0 + Phase 0.5) and a closing Capture Learnings phase, with eval gates inside Phase 5. Create one task per phase using the host agent's task-tracking tool (e.g., `TaskCreate` in Claude Code). Mark each task in-progress when you start it and completed as soon as it finishes — do not batch completions.

## Phase 0: Pipeline setup + Load Learnings

Inline `_shared/pipeline-setup.md` to read `.pmos/settings.yaml`, resolve `{docs_path}`, and resolve the per-run artifact folder. Read `~/.pmos/learnings.md` if present; note any entries under `## /primer` and factor them into your approach (skill body wins on conflict; surface conflicts to user before applying).

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

## Phase 0.5: Consolidated confirm

<!-- defer-only: ambiguous -->
Read `.pmos/primer.lastrun.yaml` if present and seed a single `AskUserQuestion` from `last_audience` and `last_output_format` to confirm defaults for this run (Recommended options are the prior values). If `--autonomous` is passed, skip this phase entirely and use the seeded defaults (or built-in defaults if no lastrun file exists).

## Phase 1: Intake

Parse `<topic>` and any `--audience` / `--format` flags from the argument string. If `<topic>` is missing or ambiguous, ask the user for a one-line topic statement and the intended use (meeting / scope / doc review) so depth and framing can be tuned.

## Phase 2: Research (try-both)

Dispatch a research pass that tries both `WebFetch` and `context7` MCP in parallel (or sequentially if `Task` subagent is unavailable — see Platform Adaptation), prefers primary sources, and captures URL + retrieved-at timestamp for every cited fact. Surface degraded-source warnings when only one channel succeeds.

## Phase 3: Outline

Draft a section outline shaped by the resolved audience: senior-pms gets fewer sections with denser synthesis and explicit decision-relevance; all-pms gets more sections with definitions, examples, and a glossary. Confirm outline with user before drafting (skipped under `--autonomous`).

## Phase 4: Draft

Expand the approved outline into full prose, inlining citations from Phase 2 against every non-trivial claim. Match the audience's jargon tolerance and example density set in Phase 3.

## Phase 5: Eval + Write

Run a self-evaluation pass against the primer rubric (source verification, audience fit, teachability, structural coverage) with up to 2 refinement loops. Then write the artifact to `{docs_path}/primers/{YYYY-MM-DD}_<slug>/primer.{html,md}` per the resolved `output_format`, and update `.pmos/primer.lastrun.yaml` with the audience and output_format used.

## Phase 6: Capture Learnings

1. After a successful run, prompt the user for any reusable lessons (source-quality patterns, audience-shaping heuristics, rubric edge-cases) and append them to `~/.pmos/learnings.md` under `## /primer`. Skip silently if the user declines or the run errored before Phase 5 completion.

## Anti-Patterns (DO NOT)

- Do not cite a fact without a primary-source URL and a retrieved-at timestamp. (Full anti-pattern list authored in T14.)
