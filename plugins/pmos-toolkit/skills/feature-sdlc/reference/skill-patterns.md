# skill-patterns.md — the SKILLS-standard authoring guide

The open-SKILLS-standard authoring guide that `/feature-sdlc` cites in its
skill-authoring modes (`skill-new` / `skill-feedback`). Claude Code is the primary
platform but not the only one; platform-specific items are labelled `[claude-code]`
or `[codex]`. This file is **cited, never copied** into pipeline artifacts (FR-61).
Each section ends with a `Checks:` line listing the `skill-eval.md` `check_id`s it
maps to — the two files are a 1:1 mirror (FR-72). Details, the pmos-specific carve-out,
and the recorded disagreements are below.

## Table of contents

- **§A — Frontmatter** — required fields (`name`, `description`), platform-optional fields, char limits, naming rules.
- **§B — Description & triggering** — what + when, third person, ≥5 user-spoken triggers, no embedded workflow, anti-under-triggering.
- **§C — Structure & progressive disclosure** — body line budget, references one level deep, reference-file ToC, portable paths, `scripts/`/`reference/`/`assets/` layout, context economy.
- **§D — Body & content** — imperative form, explain the why, justified flowcharts, excellent examples, `## Platform Adaptation`, learnings-load line + numbered Capture-Learnings phase, progress tracking, the recommended body skeleton.
- **§E — Scripts & tooling** — when to bundle a script, documented dependencies, script self-tests, eval-driven development.
- **§F — Platform-conditional frontmatter** — `[claude-code]` slash-command fields, `[codex]` sidecar; `--target generic` skips this group.
- **§G — Release-prerequisites scope** — what `/execute` writes vs what `/complete-dev` writes; `/plan` MUST NOT enumerate version bumps, changelog entries, README rows, or manifest version-sync as execute-phase tasks.

Three points in this guide record a genuine disagreement between the published
sources (Anthropic's skills docs, the Codex/`agents.md` ecosystem, `agentskills.io`,
the `superpowers` plugin, `awesome-claude-skills`) and the rule this guide resolves
on. They are flagged inline as **Disagreement**.

## How this file is used / relationship to CLAUDE.md

`/feature-sdlc` in a skill mode cites the relevant §s of this file at four points:
`/requirements` turns them into acceptance criteria, `/spec` turns them into FRs,
`/execute` uses them as the implementation reference, `/verify` re-runs the binary
mirror (`skill-eval.md`). This guide is generic — it supersedes `/create-skill`'s old
"Conventions" section *except* for the three pmos-toolkit-specific items: the
canonical skill path (`plugins/pmos-toolkit/skills/<name>/SKILL.md`), the
two-manifest version-sync rule, and the `/complete-dev` release-entry rule. Those
three live in this repo's `CLAUDE.md` (FR-62) — not here — because they are about
*this* repo's layout, not about skills in general; `CLAUDE.md`'s "Skill-authoring
conventions" section cross-links back to this file for the generic guidance.

---

## §A — Frontmatter

Every skill is a directory with a `SKILL.md` whose first bytes are a YAML frontmatter
block delimited by `---` lines.

**Open-standard required fields** (every platform):

- `name` — the skill's identifier. Must be lowercase, hyphen-separated, matching
  `^[a-z0-9]+(-[a-z0-9]+)*$`, ≤64 characters, and equal to the directory name.
  Read as a verb or gerund describing the action (`create-skill`, `verify`,
  `wireframes`) — not a bare noun phrase.
- `description` — see §B. ≤1024 characters. (Some platforms list skills with a much
  tighter visible budget — e.g. a one-line picker — so a description over the
  platform's listing cap still passes the hard limit but should be flagged in
  `evidence` as likely to be truncated in the UI.)

**Platform-optional fields** `[claude-code]`: `user-invocable`, `argument-hint`,
`arguments`, `allowed-tools`, `model`, `disable-model-invocation`, `when_to_use`,
`paths`, `hooks`, `shell`, `context`, `agent`, `effort`. **`[codex]`**: a sidecar
`agents/openai.yaml` alongside `SKILL.md` carrying the Codex-required fields. A skill
that is meant to be invokable as a slash command on Claude Code needs
`user-invocable: true` plus an `argument-hint` (see §F).

**Disagreement — naming style.** Anthropic's skill examples lean toward gerund/noun
("Brainstorming Ideas Into Designs", "Processing PDFs"); `superpowers` uses
imperative verb-first directory names (`writing-plans`, `debugging`). **Resolved
rule:** either a verb or a gerund is fine — what matters is that the name names the
*action*, lowercase-hyphenated, ≤64 chars, matching the dir. A noun-phrase name
(`pdf-utilities`) is the failure case.

Checks: a-frontmatter-present, a-name-present, a-name-lowercase-hyphen, a-name-len, a-name-matches-dir, a-desc-present, a-desc-len, a-name-verb-or-gerund.

---

## §B — Description & triggering

The `description` is how an agent decides whether to invoke the skill — it is the
single highest-leverage field in the file. Write it third person ("Use when…", not
"I will…" or "You should…"), and include:

1. **What it does** — one clause. ("Create a detailed technical specification from a
   requirements document.")
2. **When to use it** — the trigger conditions. Not only what it does — *when*. This
   is the part skills most often omit.
3. **≥5 user-spoken trigger phrases** — written the way users actually ask, not the
   way a spec author would phrase them. ("write the technical design", "design the
   system", "create the spec", "I have a requirements doc ready", "spec this out".)

**Be pushy.** The dominant failure mode for skill descriptions is *under-triggering*
— the skill exists but the agent never reaches for it because the description is
hedged into invisibility. Phrase the trigger conditions assertively. A confident
"Use this whenever the user asks to X" beats a timid "This skill can optionally help
with X if appropriate."

**No embedded workflow.** The description states what + when + triggers — it does NOT
contain a numbered/bulleted step list or a mini-workflow. (`superpowers` calls this
the "workflow-in-description bug": authors paste the skill's phase list into the
description, which bloats the picker and teaches the agent nothing about *when* to
fire.) The workflow lives in the body.

**Disagreement — "what + when" vs "when, not what".** Anthropic's guidance is
"describe what the skill does and when to use it"; `superpowers` pushes harder —
"describe *when*, not *what*; the what is obvious from the name." **Resolved rule:**
both — a one-clause *what* plus explicit *when*/trigger conditions. Dropping the
*what* entirely makes terse names ambiguous; dropping the *when* is the
under-triggering bug. Keep both, keep the *what* short.

Checks: b-desc-has-when, b-desc-has-what, b-desc-third-person, b-desc-trigger-phrases, b-desc-no-step-list, b-desc-pushy.

---

## §C — Structure & progressive disclosure

**Body line budget.** The `SKILL.md` body (everything after the closing frontmatter
`---`) should be ≤500 lines. 501–800 lines is a pass-with-note: it is allowed, but
the author is on notice to ask "does any block here belong in a reference file?".
Over ~800 lines is a fail — split it. **Orchestrator/meta-skill acknowledgement:**
some skills (a pipeline orchestrator, a multi-mode driver) legitimately run larger
because their body *is* a long sequence of phases that genuinely belong together;
the judge check for these asks "should anything here move to a reference file?" — it
is not a raw line-count veto.

**References one level deep.** `SKILL.md` may point at files under `reference/` (or
`references/` — see §F per-platform naming); those files may NOT chain to further
reference files. The link graph from `SKILL.md` → reference files is depth ≤1. A
reader following one hop should reach a leaf.

**Reference-file ToC.** Any reference file longer than ~100 lines opens with a table
of contents / section index in its first ~15 lines, so a reader can jump. (This file
does — see above.)

**Portable paths.** Refer to bundled files via a portable token —
`${CLAUDE_SKILL_DIR}` / `${CLAUDE_PLUGIN_ROOT}` on Claude Code, or the platform
equivalent — never the literal `${BAD}` form `/Users/alice/...` or
`/home/bob/...` (use the `${CLAUDE_SKILL_DIR}` token instead). Hard-coded absolute bundle paths break the moment the skill is
installed anywhere else.

**Bundle layout.** Executable scripts under `scripts/`; long/optional documentation
under `references/` (or `reference/`); data, templates, images under `assets/`.
Nothing bundled loose in the skill root except `SKILL.md` itself (and the platform
sidecar where one is required).

**Context window is a public good.** Every line the agent loads to use this skill is
a line it can't spend on the task. No gratuitous restatement, no copy-pasted
boilerplate that a reference file could carry, no "as we discussed above" padding.
The body is the lean entry point; the depth lives behind one hop.

Checks: c-body-size, c-body-size-judge, c-references-dir-name, c-references-one-level, c-reference-toc, c-portable-paths, c-asset-layout, c-progressive-disclosure, c-context-economy.

---

## §D — Body & content

**Imperative form.** Write instructions as commands to the agent — "Read X", "Write
Y", "Run the test" — not as narration ("the skill will read X", "this step reads
Y"). The agent is the second person; address it.

**Explain the why; don't shout.** When an instruction is non-obvious, give the
one-line rationale — the agent follows a rule it understands far more reliably than
one it doesn't. Conversely, avoid all-caps shouting: a doc peppered with
`MUST`/`NEVER`/`ALWAYS` in caps reads as noise and the agent tunes it out. Reserve
emphasis for the genuinely load-bearing constraint.

**Flowcharts only for non-obvious decisions.** A diagram earns its place when the
control flow has real branches the prose can't carry cleanly. Don't draw a flowchart
of five linear steps — that's decoration, and decoration costs context.

**One excellent example beats many mediocre ones.** A single worked example that
teaches the pattern is worth more than a gallery of half-examples. Each example
should teach something the prose doesn't.

**`## Platform Adaptation`.** Every skill has a section (named `Platform Adaptation`
or close) right after the announce line that says how the instructions degrade off
the primary platform: no interactive prompt tool → state assumptions and proceed;
no subagents → run sequentially; no Playwright/MCP → note the manual fallback. Do
not make the interactive prompt tool the *only* way to get input; do not delegate
core logic to an external plugin you can't assume is installed.

**Learnings-load line.** Unless the skill is a thin alias (a ~15-line forwarder),
the body instructs reading `~/.pmos/learnings.md` and factoring in any entries under
`## /<skill-name>` at startup — so the skill participates in the global feedback
loop from day one.

**Numbered Capture-Learnings phase.** Likewise (thin aliases excepted), the body
ends with a *numbered* `## Phase N: Capture Learnings` phase — numbered, not a
trailing unnumbered section, because unnumbered tail sections get skipped. If the
skill loads a workstream in Phase 0 it also gets a numbered `## Phase N: Workstream
Enrichment` phase just before it.

**Progress tracking.** A skill with ≥3 sequential phases/steps/approval gates carries
a `## Track Progress` instruction near the top: "create one task per phase using your
agent's task-tracking tool; mark in-progress on start, completed on finish — don't
batch". Single-shot skills skip it — the overhead clutters them.

**Recommended body skeleton (guidance, not a rigid template).** A well-formed body
covers, in spirit: Overview → When to Use → Core Pattern → Implementation → Common
Mistakes / Anti-patterns. `superpowers` ships this as a literal template; treat it as
a checklist of what shouldn't be missing, not a layout you must copy verbatim — a
skill with a different but complete shape passes.

Checks: d-platform-adaptation, d-learnings-load-line, d-capture-learnings-phase, d-progress-tracking, d-imperative-form, d-explain-why, d-flowcharts-justified, d-examples-quality, d-body-skeleton.

---

## §E — Scripts & tooling

**When to bundle a script.** Inline a few shell lines; bundle a script when the logic
is non-trivial, reused across phases, or needs its own tests. A bundled script lives
under `scripts/`.

**Document dependencies.** Any bundled script that depends on an interpreter, a
package, or a CLI tool documents that — in `SKILL.md` or the script's own header
comment. "Requires `bash ≥4`, `jq`, `node`" up front saves the agent a confusing
failure later.

**Scripts get self-tests.** A non-trivial bundled script ships a `--selftest` /
smoke check / unit test. A script that *is* its own contract (a checker, a linter, a
generator) especially — its self-test is how `/verify` confirms it still works.

**Eval-driven development.** Build the skill the way you'd build a model eval:
write the check, watch it fail, fix, repeat. Evidence of iterative refinement — an
eval rubric, a test suite, a documented refine loop — is the pass bar.

**Disagreement — "no skill without a failing test first".** `superpowers` states the
strong form: a skill that wasn't built test-first is not done. Anthropic's guidance
is softer — "iterate against examples". **Resolved rule:** record the strong form as
the aspirational bar; the *pass* bar is "there is evidence of iterative refinement"
(a rubric, a test, or a documented validate→fix→repeat loop). Prose-only skills and
file-relocation tasks are carved out of the test-first requirement entirely — you
cannot unit-test a markdown body; their verification is structural greps plus the
final `/verify` pass.

Checks: e-scripts-dir, e-deps-documented, e-script-selftest, e-eval-driven.

---

## §F — Platform-conditional frontmatter

This group is gated by the resolved `target_platform` (see
`repo-shape-detection.md`). `--target generic` skips it entirely — only the
intersection of platform requirements applies.

- **`[claude-code]`** — a skill meant to be invoked as a slash command needs
  `user-invocable: true` in the frontmatter *and* an `argument-hint` string. The
  `argument-hint` must enumerate the flags and positional arguments the body
  actually parses — if the body branches on `--from-feedback` and `--tier N`, the
  hint says so. A stale `argument-hint` (lists flags the body dropped, or omits
  flags the body parses) is the failure case.
- **`[codex]`** — a Codex skill carries an `agents/openai.yaml` sidecar alongside
  `SKILL.md` with the Codex-required fields.
- **`--target generic`** — neither the `f-cc-*` checks nor `f-codex-sidecar` apply.

Checks: f-cc-user-invocable, f-cc-argument-hint-matches, f-codex-sidecar.

---

## §G — Release-prerequisites scope

**The rule.** A skill's `SKILL.md` body, its `reference/` files, its `scripts/`, and
its `tests/` are `/execute`'s scope. README rows, manifest version bumps (e.g.
`plugins/<p>/.claude-plugin/plugin.json` + `.codex-plugin/plugin.json`), changelog
entries (e.g. `docs/pmos/changelog.md`), and `~/.pmos/learnings.md` header
bootstraps are `/complete-dev`'s scope. They MUST appear in the spec's
`## Release prerequisites` section, **never** as a `/plan`-wave task that
`/execute` will pick up.

**Why.** When `/execute` commits a version bump or a changelog entry against the
worktree's local base, and origin has advanced during the run, `/complete-dev` is
forced to merge-conflict-resolve every one of those files at Phase 8 — and
worse, the bumped version is silently below the latest published, the legacy
`CHANGELOG.md` may have been picked instead of the canonical `docs/pmos/changelog.md`,
and the README row may collide. `/complete-dev`'s entire job description
("Phase 8 — merge, regenerate changelog, bump versions, deploy per repo norms,
tag release, push") presupposes it is the **sole writer** of those files.
Having `/execute` write them in advance produces silent damage that only surfaces
at merge time.

**How to apply.**

1. **`/plan` (skill modes).** When generating waves from the spec, every
   release-prerequisite item is filtered out of execute-phase tasks. It belongs in
   the spec's `## Release prerequisites` section as a `/complete-dev` deliverable,
   not in a `Wave N` block as a `T<N>` task with file edits to
   `plugin.json` / `CHANGELOG.md` / `docs/pmos/changelog.md` / a README row.
2. **`/execute` (skill modes).** Treats `## Release prerequisites` as
   informational — does not pick up tasks from it. Edits only `SKILL.md` content,
   `reference/`, `scripts/`, and `tests/`. If a `/plan` wave contains a release-
   prerequisite task (legacy plan, or a `/plan` regression), `/execute` flags it
   and refuses to commit the file edit — the user fixes the plan and re-runs.
3. **`/complete-dev` (Phase 8).** Reads the spec's `## Release prerequisites`
   section, applies the version bump (synced across both manifests where
   applicable), prepends the changelog entry to the canonical changelog file
   (resolved from repo conventions, not hard-coded), adds the README row, and
   bootstraps the `~/.pmos/learnings.md` header. It is the only writer.
4. **Spec.** `/spec` in skill modes emits a `## Release prerequisites` section
   enumerating these items as plain bullets — file paths + one-line intent. This
   section is the handoff contract between `/plan`/`/execute` and `/complete-dev`.
   **Do NOT write concrete version numbers** (e.g., `2.51.0 → 2.52.0`) in this
   section — name the bump *type* only (`patch`/`minor`/`major`). The actual
   from/to numbers depend on what `main` is at merge time, not when the
   spec/worktree was authored; `/complete-dev` Phase 9 computes the baseline
   from current `main` and applies the bump there. Baking specific numbers into
   the spec produces stale-bump conflicts and is the failure mode `/complete-dev`'s
   stale-bump recovery (`reference/version-bump-recovery.md`) exists to clean up.

**The pmos-specific bits.** The list of files (`plugin.json` × 2, the canonical
changelog path, the learnings file, the README row) is repo-specific and lives in
the host repo's `CLAUDE.md ## Skill-authoring conventions` — see also the
"Release entry point" and "Plugin manifest version sync" rules there. This
section sets the *generic* scope rule; the host repo's CLAUDE.md sets the *concrete*
file list.

Checks: g-release-prereqs-scope, g-plan-grep-clean.

---

## Mutual cross-reference

`skill-eval.md` is the 1:1 binary mirror of §A–§F: every §-rule above lists ≥1
`check_id` in its closing `Checks:` line, and every check in `skill-eval.md` names
exactly one §-rule here. `skill-eval-check.sh --selftest` asserts the
deterministic-check half of that bijection (every `[D]` check ↔ a code branch in the
script, and every check names a `§[A-Z]` rule); a `/verify` structural check covers
the rest (FR-72). When you change a rule here, change the matching check there in the
same commit — the two files drifting apart is the one failure this pair is built to
prevent.
