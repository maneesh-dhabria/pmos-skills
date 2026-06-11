---
name: session-log
description: Use when wrapping up a significant work session, or when the user says "log this session", "capture session learnings", "write a session log", "record what we did", "note the decisions from today", or "/session-log" — captures what you built, decided (with reasoning), the gotchas you hit, and the patterns that worked, as dated bullets. Distinct from /reflect, which critiques the tools and skills you used; session-log records the work itself.
argument-hint: "[--non-interactive | --interactive]"
---

# /session-log

**Announce at start:** "Using /session-log to capture this session's learnings."

Capture session learnings as concise bullet points, prepended (newest first) to `{docs_path}/session-log.md`. The record is *what you built and decided this session* — the decisions and their reasoning are the most valuable part.

**When NOT to use:** the session was trivial (typo fixes, formatting) with nothing non-obvious to capture; or the user wants to critique *how the skills/tools performed* → that's `/reflect`.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion` tool:** Degrade the draft-confirmation prompt to a numbered free-form prompt per `_shared/interactive-prompts.md`. The non-interactive auto-pick contract still applies (Recommended → AUTO-PICK).
- **No `.pmos/settings.yaml`:** Run `_shared/pipeline-setup.md` Section A first-run setup before resolving `{docs_path}`.

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

## Phase 0: Setup {#setup}

1. **Run `_shared/pipeline-setup.md` Section 0 steps 1–3** — reads `.pmos/settings.yaml` (missing → Section A first-run setup), resolves `{docs_path}`, and loads the workstream if one is linked (Phase 4 depends on that load). Output path: `{docs_path}/session-log.md`.
2. **Read `~/.pmos/learnings.md`** if present; factor `## /session-log` entries into your approach. Skill body wins on conflict; surface conflicts to the user.
3. **Resolve mode** (interactive / non-interactive) per the non-interactive contract above. Print `mode: <m> (source: <s>)` to stderr.

## Phase 1: Gather context {#gather}

Read the git diff (`git diff HEAD~` or the appropriate range for the session's changes) and reflect on the conversation: what was built, what decisions were made and why, what was surprising, what patterns worked well.

## Phase 2: Draft entry {#draft}

Write a dated entry as flat bullet points. Format:

```markdown
## YYYY-MM-DD — [Brief title]

- What changed / was built
- Key decisions with reasoning (chose X over Y because Z)
- Gotchas or surprises encountered
- Patterns or techniques that worked well
- Takeaway: what you'd teach someone from this session

**References:**
- Spec: [`relative/path/to/spec.md`](relative/path/to/spec.md)
- Plan: [`relative/path/to/plan.md`](relative/path/to/plan.md)
- Requirements: [`relative/path/to/requirements.md`](relative/path/to/requirements.md)
```

Only include bullets that apply. No empty sections, no headers within the entry. Keep each bullet concise — one line, direct.

## Phase 3: Confirm and write {#confirm-write}

Present the drafted entry and ask for confirmation or edits. In non-interactive mode, this checkpoint follows the auto-pick contract above. Then prepend the entry to `{docs_path}/session-log.md`; if the file doesn't exist, create it with a single H1 header `# Session Log` followed by the entry.

## Phase 4: Workstream enrichment {#workstream-enrichment}

If Phase 0 loaded a workstream, follow `_shared/pipeline-setup.md` Section C. Session-log signals: decisions with reasoning → workstream `## Key Decisions`; gotchas → workstream `## Constraints & Scars`.

## Phase 5: Capture learnings {#capture-learnings}

Read and follow `_shared/learnings-capture.md` for the `## /session-log` section — e.g., a decision-category the user always wants logged, a git-range heuristic that worked, a boundary call between session-log and reflect.

## Rules

- Every bullet must be specific and actionable, not generic ("improved code quality" is useless; "extracted embedding batching into a generator to stay under Ollama's 5-connection semaphore" is useful)
- Decisions MUST include the "why" — the reasoning is the most valuable part for training material
- Keep the full entry under 15 bullets. Aim for 4-8.
- Do not include trivial changes (typo fixes, formatting) unless they revealed something non-obvious
- Date must be the actual current date, not inferred from commits
- References (format in the Phase 2 template): relative paths from repo root; only link docs that exist in the repo

---

*Spec lineage: mode contract per `2026-05-08_non-interactive-mode`; workstream enrichment owned by `_shared/pipeline-setup.md` Section C since the context-skill consolidation (`2026-04-11_context-skill`); de-triplication (References, /reflect boundary), Phases 3+4 merge, and learnings-capture pointer per the 2026-06-10 skill-design review.*
