---
name: changelog
description: Use when merging to main, after a merge to main, or whenever the user wants to record what shipped — generates user-facing changelog entries (newest-first) describing what the system can now do, not how it was built. Use when the user says "update the changelog", "write a changelog entry", "what changed in this release", "document what's new", "add a changelog entry for this merge", or "/changelog".
argument-hint: "[--non-interactive | --interactive]"
---

# /changelog

**Announce at start:** "Using /changelog to generate user-facing changelog entries."

Generate user-facing changelog entries, prepended (newest first) to the project changelog. Describe *what the system can now do*, never implementation details.

## When to use this

- A branch just merged to main and the user-visible surface changed.
- The user wants a dated, plain-language record of what shipped this release.
- `/complete-dev` is preparing a release and needs the changelog refreshed before tagging.

**When NOT to use:**
- Internal-only refactors, test changes, or doc updates with no user-visible effect → skip; there is nothing to log.
- The user wants design rationale or a decision record → that belongs in the feature folder, not the changelog.

## Track Progress

This skill has multiple phases. Create one task per phase using your agent's task-tracking tool (e.g., `TaskCreate` in Claude Code). Mark each task `in_progress` when you start it and `completed` when it finishes — never batch completions.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion` tool:** Degrade to numbered free-form prompts per `_shared/interactive-prompts.md`. The non-interactive auto-pick contract still applies (Recommended → AUTO-PICK).
- **No subagents:** All phases run single-agent; there is no parallel work to degrade.
- **No `.pmos/settings.yaml`:** Run `_shared/pipeline-setup.md` Section A first-run setup before resolving `{docs_path}`.
- **TaskCreate / TodoWrite missing:** The skill body works without task tracking.
- **Browser / Playwright:** Not used by this skill.

## Determine changelog_path

Check for `.pmos/settings.yaml` in the current repo. If found, read `docs_path` from it. If not found, follow `_shared/pipeline-setup.md` Section A to run first-run setup (which writes settings.yaml and detects legacy `docs/` layout).

**Sibling-prefer probe (observed-convention override).** After resolving `docs_path` from settings, normalize it (strip trailing `/`) and probe `{repo_root}/docs/changelog.md`:

- If `docs_path` (normalized) is **not** `docs` AND `{repo_root}/docs/changelog.md` exists → resolve `{changelog_path}` to `docs/changelog.md` (prefer the existing sibling) AND emit exactly one non-blocking advisory line to the user before any read or write:
  ```
  /changelog: settings.yaml says docs_path=<value> but docs/changelog.md already exists; preferring the sibling. Consider reconciling settings.yaml.
  ```
  Do NOT block on `AskUserQuestion`; do NOT auto-edit `settings.yaml`.
- Otherwise → resolve `{changelog_path}` to `{docs_path}/changelog.md` (current behavior, no advisory).

`{changelog_path}` MUST be used consistently for both the scope read (Phase 1) and the prepend write (Phase 5) within a single run.

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

## Phase 0: Setup

1. **Read `.pmos/settings.yaml`** and resolve `{changelog_path}` per the "Determine changelog_path" section above. If settings is missing → run `_shared/pipeline-setup.md` §A first-run setup first.
2. **Read `~/.pmos/learnings.md`** if present; note any entries under `## /changelog` and factor them into your drafting (e.g., a recurring phrasing the user prefers, a category they always want surfaced). Skill body wins on conflict; surface conflicts to the user.
3. **Resolve mode** (interactive / non-interactive) per the non-interactive contract above. Print `mode: <m> (source: <s>)` to stderr.

## Phase 1: Determine scope

Run `git log` to find commits since the last changelog entry date — read the top entry in `{changelog_path}` for the last date. If no changelog exists, use all commits on main.

## Phase 2: Analyze changes

Read the commit messages and diffs to understand what was added, changed, or fixed. Focus on *what the system can now do*, not implementation details.

## Phase 3: Draft entry

Write a dated entry with user-facing bullets. Format:

```markdown
## YYYY-MM-DD — [Brief feature/theme title]

- Added: what new capability exists
- Changed: what behaves differently
- Fixed: what broken thing now works
```

No "Added/Changed/Fixed" prefixes required — use them only when they add clarity. Write in plain language a user of the tool would understand. Hold the prose to `_shared/writing-principles.md` as you draft.

## Phase 4: Confirm with user

Present the drafted entry and ask for confirmation or edits before writing. In non-interactive mode, this checkpoint follows the auto-pick contract above.

## Phase 5: Write

Prepend the entry to `{changelog_path}` (resolved in Phase 0). If the file doesn't exist, create it with a single H1 header `# Changelog` followed by the entry.

## Phase 6: Capture Learnings

Reflect on whether this run surfaced anything worth capturing under `## /changelog` in `~/.pmos/learnings.md` — e.g., a recurring category the user always wants pulled out, a phrasing convention, or a commit-grouping heuristic that worked well. Append a one-line entry only when the lesson is non-obvious and reusable; do not log routine runs.

Report at close:
- `Learning: <new entry written to ~/.pmos/learnings.md under ## /changelog>` — when the run surfaced a non-obvious lesson worth keeping.

## Rules

- User-facing language: "Search now combines keyword and semantic results" not "Implemented RRF fusion in SearchService"
- Group related changes under one bullet rather than listing every commit
- Skip internal refactors, test changes, and doc updates unless they affect user-visible behavior
- Keep entries concise: aim for 3-7 bullets per merge
- Date must be the actual current date
- Include a **References** section at the end of each entry linking to relevant plans, specs, requirements, or other docs (relative paths from repo root). Only include references that exist in the repo.
