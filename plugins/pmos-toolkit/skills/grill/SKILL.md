---
name: grill
description: Adversarially interview the user about a plan, spec, requirements doc, ADR, design, or code change to surface unresolved decisions and shaky assumptions. Walks the decision tree branch by branch — one question at a time, each with a recommended answer. Use when the user says "grill me", "stress-test this plan", "poke holes in my design", "interview me about X", or wants an adversarial review before committing to a direction.
user-invocable: true
argument-hint: "[<path-to-artifact-or-topic>] [--depth=quick|standard|deep] [--save|--no-save] [--format <html|md|both>] [--non-interactive | --interactive]"
---

# Grill

Adversarial interrogation of a plan, design, or artifact. Walks the decision tree one branch at a time, asks one question per turn, and proposes a recommended answer for each. The goal is to expose unstated assumptions, unresolved branches, and weak rationale **before** the user commits to a direction.

This is **orthogonal to the pipeline** — not a stage. Use it on any artifact at any time: a half-formed idea, a `01_requirements.{html,md}`, a draft `02_spec.{html,md}`, an ADR, a code diff, a Slack proposal.

**Announce at start:** "Using the grill skill to stress-test {artifact}."

## Platform Adaptation

- **No interactive prompt tool:** fall back to numbered-choice plain-text per `_shared/interactive-prompts.md`. One question per turn — never batch.
- **No subagents:** skip the optional codebase-exploration subagent and grep directly.

---

## Phase 0: Intake & Scope

1. **Resolve the target.**
   - If argument is a file path → read it directly.
   - If argument is a pipeline-doc stem (e.g., `01_requirements`, `02_spec`, `03_plan`) → derive the resolver phase via the switch below and use `_shared/resolve-input.md` with `phase=<derived>`, `label="<stem>"` to locate either the `.html` (preferred) or `.md` (legacy fallback) primary in `{feature_folder}`. Switch:
     - `01_requirements` → `phase=requirements`
     - `02_spec` → `phase=spec`
     - `03_plan` → `phase=plan`
     - any other stem → fall through to direct file-path read.
   - If argument is a URL or topic name → ask the user to paste the content or point to a file.
   <!-- defer-only: ambiguous -->
   - If no argument → use `AskUserQuestion`: "What are we grilling? (a) most recent artifact in this conversation, (b) a file path, (c) a topic I'll describe inline."

<!-- defer-only: ambiguous -->
2. **Pick depth.** Default `standard`. Use `AskUserQuestion`:
   | Depth | Branches walked | Approx questions |
   |---|---|---|
   | quick | top-level decisions only | 3–5 |
   | standard | top-level + immediate sub-branches | 6–12 |
   | deep | full decision tree to leaves | **no limit** — keep going until the tree is exhausted or the user calls stop |

3. **Summarize what you read** in 3–5 bullets so the user can confirm you've understood the artifact correctly. If the summary is wrong, fix it before grilling — interrogating a misread is wasted turns.

### Phase 0 addendum: output_format resolution (FR-12)

4. **Resolve `output_format`.** Read `output_format` from `.pmos/settings.yaml` (default: `html`; valid values: `html`, `md`, `both`). A `--format <html|md|both>` argument-string flag overrides settings (last flag wins on conflict, per FR-12). Print to stderr exactly: `output_format: <value> (source: <cli|settings|default>)` once at Phase 0 entry. Controls the format of the optional Phase 3b grill-report save only — chat output is unaffected.

---

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

## Phase 1: Build the Decision Tree

Before asking anything, internally enumerate the decisions embedded in the artifact. For each one, classify:

| Class | Action |
|---|---|
| **Stated and justified** | Skip. Don't grill what's already defended. |
| **Stated but unjustified** | Grill — "Why this and not X?" |
| **Implied / unstated** | Grill — "I noticed you assume Y; is that intentional?" |
| **Missing entirely** | Grill — "I don't see how this handles Z." |
| **Answerable from code/docs** | Do NOT ask the user — explore the codebase, then report findings. |

Order branches by leverage: questions whose answers gate other questions go first. Don't grill leaves before the root.

### Input Contract (when invoked as reviewer subagent)

When a parent orchestrator (currently `/feature-sdlc`) invokes this skill as a reviewer subagent, the parent has chrome-stripped the artifact via `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/chrome-strip.js` (FR-50, T12) and passes the stripped slice (`<h1>` + `<main>`) inline as the prompt body. In that mode, this skill skips its own resolver (`_shared/resolve-input.md`) and operates directly on the stripped HTML.

**Output shape (FR-51 canonical):** the skill MUST first enumerate every `<section>` id and every `<h2>`/`<h3>` id it can locate in the stripped slice, returning them as `sections_found: [...]`. It then evaluates against its own rubric and emits findings as `{section_id, severity, message, quote: "<≥40-char verbatim from source>"}`.

**Parent-side validation (FR-52, the skill MUST NOT self-validate):** the parent will (a) set-equality-check `sections_found` against `<artifact>.sections.json`, (b) substring-grep every `quote` against the original (un-stripped) source HTML, (c) hard-fail on any miss. This skill does not duplicate that validation; the contract lives in the parent.

---

## Phase 2: Grill Loop

For each branch, in order:

1. **Try to answer from the codebase first.** If the question is "what does the existing auth middleware do?", grep — don't ask.

<!-- defer-only: free-form -->
2. **Compose one `AskUserQuestion` call per question.** Shape:
   - `question`: the challenge in one sentence. Be sharp, not hedged. "Why are you handling retries client-side instead of in the gateway?" not "Have you thought about retries?"
   - `options` (up to 4):
     - **[Recommended]** `<your proposed answer>` — what you'd argue for, with the reasoning compressed into the option label
     - 1–2 plausible alternatives (with their tradeoff in the label)
     - **Elaborate** — user types a free-form answer next turn
     - **Skip / not relevant** — user judges the question doesn't apply

3. **One question per turn.** Wait for the answer. Do NOT batch.

4. **Branch based on the answer:**
   - If the answer opens a sub-branch, queue it and ask next.
   - If the answer closes the branch, mark it resolved and move to the next sibling.
   - If the answer reveals a gap not in your tree, insert it and re-prioritize.

5. **Track findings** in a running internal table:
   | # | Branch | Question | Disposition | New gap? |
   |---|---|---|---|---|

6. **Stop conditions** (any one):
   - All branches at the chosen depth are resolved.
   - User says "stop" / "enough" / "wrap it up".
   - For `quick` and `standard` only: you've hit the depth's question budget and the next branch is low-leverage. **Deep mode has no question budget** — only the user or an exhausted tree stops it.

---

## Phase 3: Grill Report

Emit a compact report at the end. The report always goes in the chat. Persisting to a file is **opt-in** (see Phase 3b).

```markdown
# Grill Report — <artifact>

**Depth:** <quick|standard|deep>  •  **Questions asked:** N

## Resolved
- [decision] → [answer + 1-line rationale]

## Open / Deferred
- [question] — needs [info / stakeholder] before [event]

## Gaps surfaced
- [thing the artifact doesn't address] — recommend [action]

## Recommended next step
- [e.g., "Update §3 of spec to capture the retry decision" / "Run /simulate-spec to pressure-test the revised design"]
```

If the artifact is a pipeline doc (`01_requirements.{html,md}`, `02_spec.{html,md}`, `03_plan.{html,md}`), suggest the right follow-up skill in **Recommended next step** — but do not auto-invoke it.

---

## Phase 3b: Optional Save

After emitting the chat report, offer to persist it.

1. **Skip the prompt** if the user passed `--no-save` (do nothing) or `--save` (save without asking).

2. **Resolve the save path** in this order (extension is `.html` when `output_format` ∈ {`html`, `both`}; `.md` when `output_format=md`):
   - Target is inside a pipeline feature dir (matches `.../NN_<slug>/` where `NN` is two digits) → `<feature_dir>/grills/{YYYY-MM-DD}_{slug}.<ext>`
   - Target is a repo file outside the pipeline → `<repo_root>/.pmos/grills/{YYYY-MM-DD}_{slug}.<ext>`
   - Target is an inline topic or has no file → `~/.pmos/grills/{YYYY-MM-DD}_{slug}.<ext>`

3. **Build the slug** from the artifact filename (without extension) or, for inline topics, the first 4–5 meaningful words of the topic. Lowercase, hyphenated, ASCII only. If a file already exists at the resolved path, append `-2`, `-3`, … until unique.

4. **Prompt** (unless `--save`/`--no-save` was passed): "Save grill report to `<resolved_path>`? [Y/n]" — single yes/no question per `_shared/interactive-prompts.md`.

5. **On save (HTML primary path):** create parent directories as needed and emit per the substrate at `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/`.
   - **Atomic write (FR-10.2):** write `{slug}.html` and the companion `{slug}.sections.json` via temp-then-rename.
   - **Asset substrate (FR-10):** when saving inside a pipeline feature dir, copy `assets/*` from `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/` to `<feature_dir>/assets/` if not already present. The substrate currently includes `style.css`, `viewer.js`, `serve.js`, `build_sections_json.js`, `comments.js`, `comments.css`, and the launcher trio (`comments-open.command`, `comments-open.sh`, `comments-open.bat`); new substrate files added in future releases ride along automatically. Idempotent — `cp -n` skips identical files. Repo-level and `~/.pmos/grills/` saves seed `<repo_root>/.pmos/grills/assets/` and `~/.pmos/grills/assets/` respectively on first use.
   - **Asset prefix (FR-10.1):** `grills/` is one level below the feature folder, so the relative prefix is `../assets/`; for repo and home-cache saves the prefix is `assets/` (sibling to the grill dir).
   - **Cache-bust (FR-10.3):** append `?v=<plugin-version>` to all asset URL references emitted into the HTML.
   - **Heading IDs (FR-03.1):** every `<h2>` and `<h3>` carries a stable kebab-case `id` per `_shared/html-authoring/conventions.md` §3.
   - **Index regeneration (FR-22, §9.1):** when saving inside a pipeline feature dir, regenerate `<feature_dir>/index.html` via `_shared/html-authoring/index-generator.md` (manifest inlined; no `_index.json` on disk, FR-41). Repo-level and home-cache saves do NOT regenerate an index — those are loose archives.
   - **Mixed-format sidecar (FR-12.1):** retired — `output_format=both` is treated as `html` until a future feature re-introduces MD export.

6. **On save (MD primary path, `output_format=md`):** create parent directories as needed, write the same markdown report shown in chat, confirm the path back to the user. No substrate copy, no index regen.

---

## Anti-Patterns (DO NOT)

- Do NOT batch questions. One interactive-prompt call = one question.
- Do NOT ask questions answerable from the codebase. Grep first.
- Do NOT hedge the recommended option ("maybe consider X?"). Take a position; the user can override.
- Do NOT grill stated-and-justified decisions just to fill the quota. Stop when the leverage runs out.
- Do NOT write the Grill Report to a file silently — always show it in chat first, then offer to persist (Phase 3b).
- Do NOT segue into implementing the fixes you surface. The terminal state is the Grill Report.

---

## Phase 4: Capture Learnings

Read and follow `_shared/learnings-capture.md`. Reflect on whether this session surfaced anything worth capturing under `## /grill` — repeated friction (e.g., users overriding the Recommended option in the same way), question-tree shapes that worked well, depth-budget miscalibration. Zero learnings is a valid outcome.
