---
name: playbook
description: Turns your own Claude Code session history for one repo into a single self-sufficient "evolution story" — an HTML article (plus a tweet thread) tracing how the repo, or one skill inside it, came to be what it is today: the milestones it passed through, the decisions that bent its arc, the verbatim prompts you opened each push with, and where the pmos pipeline shaped the work. Mines the committed record (changelog, feature docs, git history) and your raw session inputs together, across the whole arc — no time window. Repo-scoped or skill-scoped; finds work scattered across worktrees (even merged-and-deleted ones); filters out headless/subprocess noise. Standalone learnkit utility — never posts anything; you are the share gate. Use when a PM says "tell the story of how this repo evolved", "write up how this skill came to be", "make a playbook of this project's evolution", "show how I built this over time with AI", "document the evolution of /<skill>", "turn my history into an evolution story", or "/playbook".
user-invocable: true
argument-hint: "[--repo <path>] [--skill <name>] [--include-headless] [--format <html|md|both>] [--non-interactive] [--interactive]"
---

# /playbook

**Announce at start:** "Using /playbook to reconstruct the evolution story of this repo from my session history."

A standalone **pmos-learnkit** utility (sibling-shaped with `/learn-list` and `/primer`; no
workstream context, no pipeline coupling). It mines *your own* interactive Claude Code session
history for **one repo** and synthesizes a single self-sufficient **evolution article** — the
story of how the repo (or one skill inside it) came to be what it is today — that a peer PM can
read cold and learn from without access to your repo.

The one rule everything else serves: **this skill never posts anything and never marks output
"safe" — you are the share gate.** Clearing the `REVIEW-BEFORE-SHARING.md` checklist is always
a human decision.

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No `AskUserQuestion` tool:** degrade to numbered free-form prompts per `_shared/interactive-prompts.md`; the non-interactive auto-pick contract still applies (Recommended → AUTO-PICK).
- **No subagents:** the per-milestone deep-read runs sequentially instead of fanning out — no behavioural change, just slower.
- **No Playwright / browser:** the screenshot step prefers committed wireframe/diagram files; if none exist it degrades to an embedded text excerpt + a "screenshot unavailable" note; it never hard-fails.
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
5. **Resolve `--repo`** (default: cwd). There is **no time window** — evolution mines the whole
   arc (`reference/evolution-sources.md`). All options also work in plain English ("this repo",
   "the /frameworks skill") — an explicit flag overrides.
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

## Phase 1: Resolve target — whole repo or one skill {#resolve-target}

An evolution story can be the **whole repo's** arc or **one skill's**. Decide the target before
mining.

1. **`--skill <name>` given:** pre-selects skill scope. Validate the name resolves to a real skill
   in the repo (a `plugins/*/skills/<name>/SKILL.md` or the repo's known skill path). **Unknown
   name → stderr `no skill '<name>' found in <repo>`; exit 64.** No prompt.

2. **No `--skill`:** detect whether this is a **skill-marketplace repo** — one that ships many
   skills, where "one skill's evolution" is a natural unit. Deterministic signals (≥2 fire, or a
   marketplace manifest present → it's a marketplace):
   - `.claude-plugin/marketplace.json` (or `.codex-plugin/marketplace.json`) exists at the repo root;
   - a `plugins/` directory holds plugin subdirs with `skills/` folders;
   - more than one `plugins/*/skills/*/SKILL.md` exists.

   - **Marketplace detected →** ask the author to scope (the **whole repo is Recommended** — the
     broadest, default story):

     ```
     AskUserQuestion → header "Evolution scope" (Recommended)
       • "Whole repo (Recommended)" — the full arc across every skill/plugin
       • "<skill-a>" … one option per skill found (cap the list; if many skills, offer the
         top-level plugins plus a "name a specific skill" free-form path)
     ```

     Under **non-interactive** mode this AUTO-PICKs **whole repo** and logs the scope as an open
     question (the author can re-run `--skill <name>` to narrow).
   - **Not a marketplace →** target is the whole repo; **no prompt**.

Record `target ∈ {repo, skill:<name>}` and pass `--skill <name>` to the scout when skill-scoped.

## Phase 2: Mine the evolution — build the milestone spine {#mining}

Run the scout — one deterministic pass that mines **both sources** together
(`reference/evolution-sources.md`): the committed record (changelog + `docs/pmos/features/*` + git
merge log) becomes the ordered **milestone spine**, and your interactive sessions
(multi-signal-resolved, finding even merged-and-deleted worktree work — `reference/resolver.md`;
filtered to interactive — `reference/session-log-format.md`) are **mapped onto** that spine.
**Never read raw session bodies at this stage** — the scout emits only cheap fields.

```
node {skill}/scripts/scout.mjs <repo> [--skill <name>] [--include-headless]
```

- **Print the coverage line** from the script's `coverage` object (session dirs, via-worktree,
  interactive, headless-dropped, low-confidence, milestones, mapped/unmapped sessions) — silent
  undercount is the failure the resolver exists to prevent.
- The scout returns the **ordered `milestones[]`** (each with its date, plain title, source,
  mapped `session_ids`, `skills`, and the verbatim `opening_prompt`), plus `unmapped_sessions[]`
  (work that did not map to a shipped milestone) and `ambiguous[]`.
- **Ambiguous attributions:** if `ambiguous[]` is non-empty, surface each for confirm-include or
  skip — never silently attribute. Low-confidence (sibling-only) sessions ARE included but noted.
- Zero milestones → report "no committed history to build an evolution from in this repo", and
  stop — never invent an arc.

## Phase 3: Deep-read each milestone {#deep-read}

For **each** milestone on the spine, deep-read its mapped sessions (only) + the feature/design
docs it references. With subagents, fan out one per milestone (strict output contract); otherwise
sequential. Extract **prose-first** per `reference/session-log-format.md` §decision-signals — the
raw material for each milestone section (`reference/article-schema.md`): the verbatim opening
prompt, the 1–2 inflection decisions (choice + alternatives + your pushbacks), and the ordered
pmos skills used (for the "Where the pipeline mattered" callout). A milestone with no
attributable session is read from its design doc alone — note that in its section.

## Phase 4: Synthesize the evolution article + tweet thread {#synthesize}

Compose the article body from `reference/artifact-template.html` (a `{{content}}` fragment —
sections + article CSS) per the **evolution schema** in `reference/article-schema.md`
("What this is" first → one section per milestone with a verbatim opening prompt and a "Where the
pipeline mattered" callout → "How the pipeline shaped the whole arc" → an understated close),
then render it through the shared substrate — `_shared/html-authoring/template.html` + `render.js`
`renderArtifact()` with `pmosSkill: 'playbook'`, the pmos-learnkit token values, and
`pluginVersion` from the plugin manifest — which bakes in the inline CSS/JS overlay, the
`pmos-comments` block, and the `pmos:skill` meta. **Strip the substrate template's leading
doc-comment before calling `renderArtifact()`** — the literal tokens inside it get substituted too
and the body duplicates (regression-tested by `tests/render-surface.test.sh`). **Embed everything
inline** — the reader opens zero repo files.

- **Voice + pre-emit self-check (binary):** run the self-check in `reference/article-schema.md`
  §"Pre-emit self-check" — "What this is" is first and cold-readable; every milestone has a plain
  title; every milestone with a session quotes its opening prompt verbatim; every "Where the
  pipeline mattered" callout names a real skill; the cross-cutting section is present; no invented
  content; the four voice rules hold. Any item failing → revise (or state the gap in the
  article); never ship silently.
- **Screenshots:** **prefer committed visual artifacts** — wireframe/diagram/prototype HTML/SVG
  already in the repo (e.g. under a milestone's feature folder). Serve those on
  `http://localhost` and capture via Playwright (`file://` is blocked); **clean up any
  `.playwright-mcp/` scratch output** after capture. Only fall back to Playwright-rendering live
  HTML when no committed artifact exists; degrade per Platform Adaptation. Never fabricate a
  screenshot.
- Also emit `tweet-thread.md` (a standalone tweet + a numbered thread tracing the arc — see
  article-schema.md).

## Phase 5: Anonymize & gate (always-on) {#anonymize-gate}

Run the detect-and-flag pass and write `REVIEW-BEFORE-SHARING.md` into the playbook folder, both
exactly per `reference/anonymizer.md`. The inviolable rule: **never auto-scrub the content;
never mark it "safe."** State plainly in the summary that the playbook is NOT cleared for
sharing until the author completes the checklist.

## Phase 6: Emit {#emit}

Write the evolution to **one folder** `{docs_path}/playbooks/{YYYY-MM-DD}_<repo-or-skill>-evolution/`
per the layout in `reference/article-schema.md` §Output layout: `index.html` (rendered in Phase 4
(#synthesize)) + `index.sections.json` (via `_shared/html-authoring/assets/build_sections_json.js`)
+ `screenshots/` + `tweet-thread.md` + `REVIEW-BEFORE-SHARING.md` + copied substrate `assets/`
(launchers + `serve.js` enable write-mode comments; CSS/JS are already inlined). Slug = kebab of
the repo basename (or skill name) + `-evolution`. Atomic temp-then-rename writes;
`?v=<plugin-version>` cache-bust. Existing folder → prompt overwrite / suffix / cancel. Print the
absolute path.

## Phase 7: Capture Learnings {#capture-learnings}

Not complete until the reflection emits exactly one line — reflect on anything worth keeping
under `## /playbook` in `~/.pmos/learnings.md` (a resolver edge case, a spine-mapping miss, a
teaching pattern), then print either:
- `Learning: <entry written under ## /playbook>`, or
- `No new learnings this session because <specific reason tied to this session>`.

## Anti-Patterns (DO NOT)

1. **Reading raw session bodies at scout time** — blows context on real-scale repos (thousands
   of sessions). Deep-read ONLY the sessions mapped onto the milestones you cover.
2. **Path-prefix-only resolution** — silently misses sibling/nested/merged-deleted worktree
   sessions (10 of ~29 on the validation repo). Always the multi-signal resolver + coverage line.
3. **Sampling a recent window** — evolution is the *whole* arc; there is no `--days`/`--since`/
   `--sessions` knob. Mining a slice tells half the story.
4. **A changelog dump** — a milestone section anchors on 1–2 inflection *decisions*, not every
   line that shipped. The story is the choices, not the commit list.
5. **Auto-scrubbing or auto-marking "safe"** — the anonymizer flags; the author clears. Never
   post; never declare a playbook shareable.
6. **Inventing a quote, decision, milestone, or screenshot** — opening prompts are verbatim or
   absent; a milestone with no session says so; never pad to clear the self-check.
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

*Spec lineage: `docs/pmos/features/2026-06-03_playbook/02_spec.html` — home of the resolver,
cheap-scout, safety, and emit FR/D contracts; the evolution-only rewrite (D1–D13: evolution
schema, two-source mining, milestone spine, mine-everything, skill scoping, voice self-check) is
specified in `docs/pmos/features/2026-06-17_playbook-evolution-mode/02_design.html`.*
