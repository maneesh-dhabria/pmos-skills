---
name: playbook
description: Turns your own Claude Code session history for one repo into focused, self-sufficient case-study articles that teach fellow PMs how you used AI to solve a real problem — mining the prompts you started with, how you refined the idea, the trade-offs you decided, and the skills you used, then emitting a shareable HTML article + tweet thread per problem with a safety-review checklist. Repo-scoped; finds work scattered across worktrees (even merged-and-deleted ones); filters out headless/subprocess noise. Standalone learnkit utility — never posts anything; you are the share gate. Use when a PM says "turn my AI work into a case study", "write up how I used AI on this", "make a playbook from my sessions", "create a shareable case study from my Claude history", "show how I solved this with AI", "document how I built this with AI", or "/playbook".
user-invocable: true
argument-hint: "[--repo <path>] [--days N | --sessions N | --since <date>] [--include-headless] [--format <html|md|both>] [--non-interactive] [--interactive]"
---

# /playbook

**Announce at start:** "Using /playbook to mine my sessions for this repo and propose shareable case studies."

This is a standalone **pmos-learnkit** utility for product managers. It does NOT load workstream
context and does NOT feed the requirements→spec→plan pipeline (sibling-shaped with `/learn-list`
and `/primer`). It mines *your own* interactive Claude Code session history for **one repo** and
synthesizes focused, self-sufficient case-study articles — one per problem you actually solved —
that a peer PM can read and replicate without access to your repo.

The one rule everything else serves: **this skill never posts anything and never marks output
"safe" — you are the share gate.** It produces a draft article + a `REVIEW-BEFORE-SHARING.md`
checklist; clearing it for sharing is always a human decision.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion`:** degrade to numbered free-form prompts per `_shared/interactive-prompts.md`; the non-interactive auto-pick contract still applies (Recommended → AUTO-PICK).
- **No subagents:** the per-playbook deep-read runs sequentially instead of fanning out — no behavioural change, just slower.
- **No Playwright / browser:** the screenshot step (FR-52) degrades to an embedded text excerpt + a "screenshot unavailable" note; it never hard-fails.
- **No `.pmos/settings.yaml`:** run `_shared/pipeline-setup.md` Section A first-run setup before resolving `{docs_path}`.
- **Node absent:** the scout/resolver scripts require Node ≥18; if missing, report it and stop (the cheap-scout contract cannot be met by hand on real-scale logs).

## Track Progress

This skill has multiple phases. Create one task per phase using your task-tracking tool
(`TaskCreate` in Claude Code). Mark each in-progress when you start and completed when done —
never batch completions.

## Phase 0: Setup

1. **Read `.pmos/settings.yaml`** (run `_shared/pipeline-setup.md` §A if missing). Set `{docs_path}`.
2. **Resolve `output_format`** (default `html`; `--format` overrides). Print the stderr line.
3. **Read `~/.pmos/learnings.md`** if present; factor any `## /playbook` entries into your approach.
4. **Resolve mode** (interactive / non-interactive) per `_shared/non-interactive.md`.
5. **Resolve `--repo`** (default: cwd). Resolve scope window: `--days N` / `--sessions N` /
   `--since <date>` are additive; **default when none given = last 30 days** (D11).
6. **Denylist (FR-62):** if `~/.pmos/playbook/sensitive.yaml` is absent, offer a one-time prompt
   to seed known client/repo names (skippable). See `reference/anonymizer.md`.

## Phase 1: Resolve & Filter (cheap, deterministic)

Run the scout — it resolves sessions (multi-signal) AND filters to interactive AND clusters, in
one deterministic pass. **Never read raw session bodies yourself at this stage.**

```
node {skill}/scripts/scout.mjs <repo> [--days N|--since ISO|--sessions N] [--include-headless]
```

- Session resolution is multi-signal (nested ∪ sibling ∪ branch-in-merge-history) — see
  `reference/resolver.md`. It finds worktree work, including merged-and-deleted worktrees.
- Interactive-only by default; headless/subprocess runs are dropped (`--include-headless` to
  re-admit). Discriminator + record shapes: `reference/session-log-format.md`.
- **Print the coverage line** from the script's `coverage` object (FR-13), e.g.
  *"found 4 session dirs (2 via worktree/sibling/merged), 41 interactive (12 headless dropped, 1 low-confidence), 6 candidate threads"*.
- **Ambiguous attributions (FR-22):** if `ambiguous[]` is non-empty, surface each (branch-only
  matches that could belong to another repo) and ask the author to confirm-include or skip.
  Never silently attribute. Low-confidence (sibling-only) sessions ARE included but noted.

## Phase 2: Propose (ranked candidates)

From the scout's `candidates[]` (already floored + ranked — `reference/clustering.md`):

1. Present the ranked top ~5 threads, each with its one-line `why_teachable`, branch, decision
   count, and skills.
2. For any candidate carrying a `merge_suggestion`, surface it ("looks like the follow-up HEAD
   work belongs with this branch thread — merge?"). For low `boundary_confidence` clusters, offer
   a confirm. Confident clusters are not re-litigated.
3. **Dry-run confirm (FR-35):** the author picks which candidate(s) to build (and may merge/split).
   Do not deep-read anything until this pick. If zero candidates qualified, report "nothing
   teachable in this window" and suggest a wider window — do not invent thin playbooks.

## Phase 3: Deep-read (only the picked threads)

For **each** chosen candidate, read the full sessions in that thread (only) + the repo docs they
reference. With subagents, fan out one per playbook (strict output contract); otherwise sequential.
Extract **prose-first** (`reference/session-log-format.md` §decision-signals):

- **Starting prompt(s)** — the verbatim first genuine human message of the earliest session.
- **Refinement arc** — what changed and why across the thread.
- **Research / exploration** done.
- **Decisions** — the choice, the alternatives weighed, the rationale, and your pushbacks/
  redirects (from prose; `AskUserQuestion` blocks are high-confidence anchors, not the only source).
- **Skills-used provenance** — ordered `<command-name>` invocations + notable tools.
- **Artifact excerpts** — interesting load-bearing snippets from generated docs.

## Phase 4: Synthesize (self-sufficient article + tweet thread)

Render each playbook from `reference/artifact-template.html` per the schema in
`reference/article-schema.md`. **Embed everything inline** — the reader opens zero repo files.

- **Quality gate (FR-51):** the article MUST carry ≥3 real prompts AND ≥1 decision-ledger row
  with real alternatives. If the thread genuinely lacks the material, report it as thin — never
  pad with invented prompts/decisions.
- **Screenshots (FR-52):** capture the visual artifacts referenced in the thread via Playwright
  (serve local HTML on `http://localhost`; `file://` is blocked). When Playwright is unavailable,
  degrade to a text excerpt + a "screenshot unavailable" note.
- **Tweet thread (FR-53):** also emit `tweet-thread.md` (a standalone tweet + a numbered thread).

## Phase 5: Anonymize & gate (always-on)

Run the detect-and-flag pass per `reference/anonymizer.md` and write
`REVIEW-BEFORE-SHARING.md` into the playbook folder: every retained proper noun + quantitative
claim flagged with location, and every screenshot enumerated as a mandatory manual-verify item.
**Never auto-scrub the content; never mark it "safe."** State plainly in the summary that the
playbook is NOT cleared for sharing until the author completes the checklist.

## Phase 6: Emit

Write each playbook to its own folder `{docs_path}/playbooks/{YYYY-MM-DD}_<slug>/` (FR-70/71):
`index.html` + `index.sections.json` (via `_shared/html-authoring/assets/build_sections_json.js`)
+ `screenshots/` + `tweet-thread.md` + `REVIEW-BEFORE-SHARING.md` + copied `assets/`. Atomic
temp-then-rename writes; `?v=<plugin-version>` cache-bust; `<meta name="pmos:skill" content="playbook">`.
Existing folder → prompt overwrite / suffix / cancel. Print the absolute path(s).

## Phase 7: Capture Learnings

**This skill is not complete until the learnings reflection has produced a one-line output.**
Reflect on whether this session surfaced anything worth keeping under `## /playbook` in
`~/.pmos/learnings.md` (e.g. a resolver edge case, a clustering miss, a teaching pattern).

**Emit exactly one:**
- `Learning: <entry written under ## /playbook>` — a non-obvious lesson worth keeping.
- `No new learnings this session because <specific reason tied to this session>`.

## Anti-Patterns (DO NOT)

1. **Reading raw session bodies at scout time.** The scout script reads only cheap fields and
   emits a compact summary; deep-read ONLY the threads the author picks. Loading bodies up front
   blows context on real-scale repos (thousands of sessions).
2. **Path-prefix-only resolution.** Sessions scatter across sibling/nested worktrees and
   merged-deleted dirs. Always use the multi-signal resolver; print the coverage line so
   undercount is never silent.
3. **Keeping headless/subprocess sessions by default.** They inflate volume and aren't teachable.
   Filter via the `permission-mode` discriminator; `--include-headless` is the explicit escape.
4. **Auto-scrubbing or auto-marking "safe".** The anonymizer flags; the author clears. Never post;
   never declare a playbook shareable.
5. **Padding a thin thread.** If a thread lacks ≥3 real prompts + a real decision, report it thin —
   do not invent prompts/decisions to clear the quality gate.
6. **Generalizing across repos / into one "how I use AI" post.** v1 is repo-scoped and one article
   per problem thread. The teachable value is the concrete decision trail, not a generic playbook.
7. **Silently attributing ambiguous (branch-only) sessions.** Surface them for confirm; a generic
   branch name can belong to another repo.
8. **Loading workstream context.** Standalone utility — workstream pollution biases synthesis.

## Apply comment-resolver edit

Emitted playbook articles carry `<meta name="pmos:skill" content="playbook">`; `/comments resolve`
routes here. Anchor resolution is id-first then quote-substring (≥40 chars) per the shared
contract `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md`. All article prose sections
are editable; the `REVIEW-BEFORE-SHARING.md` checklist is not an HTML artifact and is out of scope.
