---
name: playbook
description: Turns your own Claude Code session history for one repo into focused, self-sufficient case-study articles that teach fellow PMs how you used AI to solve a real problem — mining the prompts you started with, how you refined the idea, the trade-offs you decided, and the skills you used, then emitting a shareable HTML article + tweet thread per problem with a safety-review checklist. Repo-scoped; finds work scattered across worktrees (even merged-and-deleted ones); filters out headless/subprocess noise. Standalone learnkit utility — never posts anything; you are the share gate. Use when a PM says "turn my AI work into a case study", "write up how I used AI on this", "make a playbook from my sessions", "create a shareable case study from my Claude history", "show how I solved this with AI", "document how I built this with AI", or "/playbook".
user-invocable: true
argument-hint: "[--repo <path>] [--days N | --sessions N | --since <date>] [--include-headless] [--format <html|md|both>] [--non-interactive] [--interactive]"
---

# /playbook

**Announce at start:** "Using /playbook to mine my sessions for this repo and propose shareable case studies."

A standalone **pmos-learnkit** utility (sibling-shaped with `/learn-list` and `/primer`; no
workstream context, no pipeline coupling). It mines *your own* interactive Claude Code session
history for **one repo** and synthesizes self-sufficient case-study articles — one per problem
actually solved — that a peer PM can replicate without access to your repo.

The one rule everything else serves: **this skill never posts anything and never marks output
"safe" — you are the share gate.** Clearing the `REVIEW-BEFORE-SHARING.md` checklist is always
a human decision.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion` tool:** degrade to numbered free-form prompts per `_shared/interactive-prompts.md`; the non-interactive auto-pick contract still applies (Recommended → AUTO-PICK).
- **No subagents:** the per-playbook deep-read runs sequentially instead of fanning out — no behavioural change, just slower.
- **No Playwright / browser:** the screenshot step degrades to an embedded text excerpt + a "screenshot unavailable" note; it never hard-fails.
- **No `.pmos/settings.yaml`:** run `_shared/pipeline-setup.md` Section A first-run setup before resolving `{docs_path}`.
- **Node absent:** the scout/resolver scripts require Node ≥18; if missing, report it and stop (the cheap-scout contract cannot be met by hand on real-scale logs).

## Track Progress

This skill has multiple phases. Create one task per phase using your task-tracking tool
(`TaskCreate` in Claude Code). Mark each in-progress when you start and completed when done —
never batch completions.

## Phase 0: Setup {#setup}

1. **Read `.pmos/settings.yaml`** (run `_shared/pipeline-setup.md` §A if missing). Set `{docs_path}`.
2. **Resolve `output_format`** (default `html`; `--format` overrides). Print the stderr line.
3. **Read `~/.pmos/learnings.md`** if present; factor any `## /playbook` entries into your approach.
4. **Resolve mode** (interactive / non-interactive) per the canonical non-interactive block
   below (edge cases: `_shared/non-interactive.md`).
5. **Resolve `--repo`** (default: cwd). Resolve scope window: `--days N` / `--sessions N` /
   `--since <date>` are additive; **default when none given = last 30 days**. All options also
   work in plain English ("last two weeks", "this repo only") — an explicit flag overrides.
6. **Denylist:** if `~/.pmos/playbook/sensitive.yaml` is absent, offer a one-time prompt
   to seed known client/repo names (skippable). See `reference/anonymizer.md`.

The canonical non-interactive block below handles `mode` resolution + per-checkpoint classifier + OQ buffer + end-of-skill summary. Do not paraphrase or move this block.

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

## Phase 1: Resolve & Filter (cheap, deterministic) {#resolve-filter}

Run the scout — one deterministic pass that resolves sessions (multi-signal, finds even
merged-and-deleted worktree work — `reference/resolver.md`), filters to interactive
(`reference/session-log-format.md`), and clusters. **Never read raw session bodies at this stage.**

```
node {skill}/scripts/scout.mjs <repo> [--days N|--since ISO|--sessions N] [--include-headless]
```

- **Print the coverage line** from the script's `coverage` object — silent undercount is the
  failure the resolver exists to prevent.
- **Ambiguous attributions:** if `ambiguous[]` is non-empty, surface each for confirm-include or
  skip — never silently attribute. Low-confidence (sibling-only) sessions ARE included but noted.

## Phase 2: Propose (ranked candidates) {#propose}

Present the scout's `candidates[]` (already floored + ranked — `reference/clustering.md`): the
top ~5 threads, each with its one-line `why_teachable`, branch, decision count, and skills.
Surface any `merge_suggestion`; confirm only low-`boundary_confidence` clusters. The inviolable
rule: **the author picks which candidate(s) to build (and may merge/split) before anything is
deep-read.** Zero qualifying candidates → report "nothing teachable in this window", suggest a
wider window, and stop — never invent thin playbooks. Under non-interactive mode the pick
auto-resolves to the top-ranked candidate, ambiguous attributions are skipped (never
auto-included), and both are logged as open questions.

## Phase 3: Deep-read (only the picked threads) {#deep-read}

For **each** chosen candidate, read the full sessions in that thread (only) + the repo docs they
reference. With subagents, fan out one per playbook (strict output contract); otherwise
sequential. Extract **prose-first** per `reference/session-log-format.md` §decision-signals — the
raw material for every article section (`reference/article-schema.md`): verbatim starting
prompt(s), the refinement arc, research done, decisions (choice + alternatives weighed +
rationale + your pushbacks), ordered skills-used provenance, and load-bearing artifact excerpts.

## Phase 4: Synthesize (self-sufficient article + tweet thread) {#synthesize}

Compose each article body from `reference/artifact-template.html` (a `{{content}}` fragment —
sections + article CSS) per `reference/article-schema.md`, then render it through the shared
substrate — `_shared/html-authoring/template.html` + `render.js` `renderArtifact()` with
`pmosSkill: 'playbook'`, the pmos-learnkit token values, and `pluginVersion` from the plugin
manifest — which bakes in the inline CSS/JS overlay, the `pmos-comments` block, and the
`pmos:skill` meta. **Strip the substrate template's leading doc-comment before calling
`renderArtifact()`** — the literal tokens inside it get substituted too and the body duplicates
(regression-tested by `tests/render-surface.test.sh`). **Embed everything inline** — the reader
opens zero repo files.

- **Quality gate:** ≥3 real prompts AND ≥1 decision-ledger row with real alternatives
  (`reference/article-schema.md` §Quality gate). Thin threads are reported thin — never padded.
- **Screenshots:** capture visual artifacts via Playwright (serve local HTML on
  `http://localhost`; `file://` is blocked); degrade per Platform Adaptation.
- Also emit `tweet-thread.md` (a standalone tweet + a numbered thread — see article-schema.md).

## Phase 5: Anonymize & gate (always-on) {#anonymize-gate}

Run the detect-and-flag pass and write `REVIEW-BEFORE-SHARING.md` into the playbook folder, both
exactly per `reference/anonymizer.md`. The inviolable rule: **never auto-scrub the content;
never mark it "safe."** State plainly in the summary that the playbook is NOT cleared for
sharing until the author completes the checklist.

## Phase 6: Emit {#emit}

Write each playbook to its own folder `{docs_path}/playbooks/{YYYY-MM-DD}_<slug>/` per the
layout in `reference/article-schema.md` §Output layout: `index.html` (rendered in Phase 4
(#synthesize)) + `index.sections.json` (via `_shared/html-authoring/assets/build_sections_json.js`)
+ `screenshots/` + `tweet-thread.md` + `REVIEW-BEFORE-SHARING.md` + copied substrate `assets/`
(launchers + `serve.js` enable write-mode comments; CSS/JS are already inlined). Atomic
temp-then-rename writes; `?v=<plugin-version>` cache-bust. Existing folder → prompt overwrite /
suffix / cancel. Print the absolute path(s).

## Phase 7: Capture Learnings {#capture-learnings}

Not complete until the reflection emits exactly one line — reflect on anything worth keeping
under `## /playbook` in `~/.pmos/learnings.md` (a resolver edge case, a clustering miss, a
teaching pattern), then print either:
- `Learning: <entry written under ## /playbook>`, or
- `No new learnings this session because <specific reason tied to this session>`.

## Anti-Patterns (DO NOT)

1. **Reading raw session bodies at scout time** — blows context on real-scale repos (thousands
   of sessions). Deep-read ONLY the threads the author picks.
2. **Path-prefix-only resolution** — silently misses sibling/nested/merged-deleted worktree
   sessions (10 of ~29 on the validation repo). Always the multi-signal resolver + coverage line.
3. **Keeping headless/subprocess sessions by default** — they inflate volume and aren't
   teachable; `--include-headless` is the explicit escape.
4. **Auto-scrubbing or auto-marking "safe"** — the anonymizer flags; the author clears. Never
   post; never declare a playbook shareable.
5. **Padding a thin thread** — report it thin; never invent prompts/decisions to clear the
   quality gate.
6. **Generalizing across repos into one "how I use AI" post** — the teachable value is the
   concrete decision trail; v1 is repo-scoped, one article per problem thread.
7. **Silently attributing ambiguous (branch-only) sessions** — a generic branch name can belong
   to another repo; surface for confirm.
8. **Loading workstream context** — standalone utility; workstream pollution biases synthesis.

## Apply comment-resolver edit

Articles render through the shared substrate (Phase 4 (#synthesize)), so every emit carries the
inline `pmos-comments` block + overlay and `<meta name="pmos:skill" content="playbook">` —
`/comments resolve` routes here. Anchor resolution is id-first (the fragment's stable `<h2 id>`
values) then quote-substring (≥40 chars) per `_shared/apply-edit-at-anchor.md`. All article
prose sections are editable; `REVIEW-BEFORE-SHARING.md` is not an HTML artifact and is out of
scope. After applying an edit, re-emit `index.sections.json`.

---

*Spec lineage: `docs/pmos/features/2026-06-03_playbook/02_spec.html` — home of every FR/D
contract cited in `reference/` (resolver, cheap-scout, article, safety, emit; D10/D11);
shared-substrate rendering, phase thinning, and the non-interactive pick rule per the
2026-06-10 skill-design review.*
