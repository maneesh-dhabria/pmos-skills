---
name: session-log
description: Use when the user invokes /session-log, or before ending a significant session where meaningful work was done - captures learnings, decisions, gotchas, and patterns
argument-hint: "[--non-interactive | --interactive]"
---

# Session Log

Capture session learnings as concise bullet points, prepended (newest first).

## Load Workstream Context

Before any other work, follow `_shared/pipeline-setup.md` Section 0 to read `.pmos/settings.yaml` and resolve `{docs_path}`. If settings.yaml is missing, run first-run setup per Section A. Use `{docs_path}/session-log.md` as the output path.

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

## Process

1. **Gather context** — Read the git diff (`git diff HEAD~` or appropriate range for the session's changes) and reflect on the conversation: what was built, what decisions were made and why, what was surprising, what patterns worked well.

2. **Draft entry** — Write a dated entry as flat bullet points. Format:

```markdown
## YYYY-MM-DD — [Brief title]

- What changed / was built
- Key decisions with reasoning (chose X over Y because Z)
- Gotchas or surprises encountered
- Patterns or techniques that worked well
- Takeaway: what you'd teach someone from this session
```

Only include bullets that apply. No empty sections, no headers within the entry. Keep each bullet concise — one line, direct.

3. **Show draft to user** — Present the entry and ask for confirmation or edits before writing.

4. **Write** — Prepend the entry to `{docs_path}/session-log.md`. If the file doesn't exist, create it with a single H1 header `# Session Log` followed by the entry.

5. **Workstream Enrichment** — If a workstream was loaded, follow `_shared/pipeline-setup.md` Section C. Session log signals: decisions with reasoning → workstream `## Key Decisions`; gotchas → workstream `## Constraints & Scars`.

## Rules

- Every bullet must be specific and actionable, not generic ("improved code quality" is useless; "extracted embedding batching into a generator to stay under Ollama's 5-connection semaphore" is useful)
- Decisions MUST include the "why" — the reasoning is the most valuable part for training material
- Keep the full entry under 15 bullets. Aim for 4-8.
- Do not include trivial changes (typo fixes, formatting) unless they revealed something non-obvious
- Date must be the actual current date, not inferred from commits
