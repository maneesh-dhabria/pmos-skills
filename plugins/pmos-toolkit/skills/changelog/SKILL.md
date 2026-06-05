---
name: changelog
description: Use when merging to main or after a merge to main - generates user-facing changelog entries describing what the system can now do
argument-hint: "[--non-interactive | --interactive]"
---

# Changelog

Generate user-facing changelog entries, prepended (newest first).

## Determine docs_path

Check for `.pmos/settings.yaml` in the current repo. If found, read `docs_path` from it. If not found, follow `_shared/pipeline-setup.md` Section A to run first-run setup (which writes settings.yaml and detects legacy `docs/` layout).

**Sibling-prefer probe (observed-convention override).** After resolving `docs_path` from settings, normalize it (strip trailing `/`) and probe `{repo_root}/docs/changelog.md`:

- If `docs_path` (normalized) is **not** `docs` AND `{repo_root}/docs/changelog.md` exists → resolve `{changelog_path}` to `docs/changelog.md` (prefer the existing sibling) AND emit exactly one non-blocking advisory line to the user before any read or write:
  ```
  /changelog: settings.yaml says docs_path=<value> but docs/changelog.md already exists; preferring the sibling. Consider reconciling settings.yaml.
  ```
  Do NOT block on `AskUserQuestion`; do NOT auto-edit `settings.yaml`.
- Otherwise → resolve `{changelog_path}` to `{docs_path}/changelog.md` (current behavior, no advisory).

`{changelog_path}` MUST be used consistently for both the scope read (Process step 1) and the prepend write (Process step 5) within a single run.

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

1. **Determine scope** — Run `git log` to find commits since the last changelog entry date (read the top entry in `{changelog_path}` — resolved by the "Determine docs_path" section above — for the last date). If no changelog exists, use all commits on main.

2. **Analyze changes** — Read the commit messages and diffs to understand what was added, changed, or fixed. Focus on *what the system can now do*, not implementation details.

3. **Draft entry** — Write a dated entry with user-facing bullets. Format:

```markdown
## YYYY-MM-DD — [Brief feature/theme title]

- Added: what new capability exists
- Changed: what behaves differently
- Fixed: what broken thing now works
```

No "Added/Changed/Fixed" prefixes required — use them only when they add clarity. Write in plain language a user of the tool would understand.

4. **Show draft to user** — Present the entry and ask for confirmation or edits before writing.

5. **Write** — Prepend the entry to `{changelog_path}` (resolved by the "Determine docs_path" section above). If the file doesn't exist, create it with a single H1 header `# Changelog` followed by the entry.

## Rules

- User-facing language: "Search now combines keyword and semantic results" not "Implemented RRF fusion in SearchService"
- Group related changes under one bullet rather than listing every commit
- Skip internal refactors, test changes, and doc updates unless they affect user-visible behavior
- Keep entries concise: aim for 3-7 bullets per merge
- Date must be the actual current date
- Include a **References** section at the end of each entry linking to relevant plans, specs, requirements, or other docs (relative paths from repo root). Only include references that exist in the repo.
