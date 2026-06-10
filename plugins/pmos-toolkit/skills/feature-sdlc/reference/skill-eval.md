# skill-eval.md — the binary skill-quality rubric

41 binary pass/fail checks, a 1:1 mirror of `skill-patterns.md` §A–§G. `/feature-sdlc`
Phase 6a (and `/verify` on a skill) runs this rubric: the 21 `[D]` (deterministic)
checks are implemented in `tools/skill-eval-check.sh`; the 20 `[J]` (llm-judge) checks
are run by a reviewer subagent. Each check carries a stable `check_id` (kebab,
prefixed by the `skill-patterns.md` § it mirrors — `a-…`, `b-…`, … `f-…`), a `tag`,
an `applies_when` gate, a `check`/`pass-condition`, a `why`, a `how-to-verify`, and a
back-reference to its `skill-patterns.md` §-rule. This file is the contract; the
`/execute` implementation may refine the prose and re-tag an individual `[D]`/`[J]`
where clearly mis-tagged, but MUST keep the total ≥37, the bijective
patterns↔eval mapping (FR-72), and every `[D]`-tagged check implemented in the script
(FR-71).

## Table of contents

- **10.A — Frontmatter** (8 checks: 7 `[D]`, 1 `[J]`)
- **10.B — Description & triggering** (6 checks, all `[J]`)
- **10.C — Structure & progressive disclosure** (9 checks: 6 `[D]`, 3 `[J]`)
- **10.D — Body & content** (9 checks: 4 `[D]`, 5 `[J]`)
- **10.E — Scripts & tooling** (4 checks: 1 `[D]`, 3 `[J]`)
- **10.F — Platform-conditional frontmatter** (3 checks: 2 `[D]`, 1 `[J]`; gated by `target_platform`)
- **10.G — Release-prerequisites scope** (2 checks: 1 `[D]`, 1 `[J]`; gated — pmos-toolkit pipeline plans only)
- **Totals & group-skip rules**
- **LLM-judge determinism contract**

## Group-skip rules (part of the contract)

- **No `scripts/` dir / no bundled executable scripts** → group 10.E is skipped entirely (not a failure).
- **No `reference/` (or `references/`) dir** → the reference-only group-10.C checks (`c-references-dir-name`, `c-references-one-level`, `c-reference-toc`, `c-progressive-disclosure`) are N/A when no reference dir exists; `c-body-size` still applies.
- **`--target generic`** → group 10.F (`f-cc-user-invocable`, `f-cc-argument-hint-matches`, `f-codex-sidecar`) is skipped entirely — only the platform-intersection requirements apply.
- **No `03_plan.{html,md}` artifact present** (or skill is not being authored under the pmos-toolkit pipeline) → group 10.G (`g-release-prereqs-scope`, `g-plan-grep-clean`) is skipped entirely. The two checks only run when `/feature-sdlc skill …` has produced a plan artifact and `/verify` / Phase 6a is grading the plan-to-scope discipline.
- An N/A check counts as neither pass nor fail; it is omitted from the script's TSV output and from the reviewer's findings.

## LLM-judge determinism contract

Every `[J]` check call (copied from the `polish/reference/rubric.md` shape):

- `temperature: 0`.
- Output schema, per check: `{check_id, verdict: "pass" | "fail", fix_note: string, quote: string}` — where `quote` is a ≥40-character verbatim span from the skill source that grounds a `fail`.
- A `fail` with an empty `quote`, or a `quote` that is not a substring of the skill source, is treated as `pass` (an unsubstantiated fail does not count). The parent (`/feature-sdlc` Phase 6a or `/verify`) substring-validates every `quote` against the un-stripped source and downgrades unverifiable fails.

---

## 10.A — Frontmatter (8 checks)

| id | tag | applies-when | check / pass-condition | § |
|---|---|---|---|---|
| a-frontmatter-present | [D] | always | `SKILL.md` opens with a `---`-delimited YAML frontmatter block; pass iff present and the closing `---` is found within the first ~40 lines. | skill-patterns.md §A |
| a-name-present | [D] | always | Frontmatter has a non-empty `name`; pass iff present. | skill-patterns.md §A |
| a-name-lowercase-hyphen | [D] | always | `name` matches `^[a-z0-9]+(-[a-z0-9]+)*$`; pass iff it matches. | skill-patterns.md §A |
| a-name-len | [D] | always | `len(name) ≤ 64`; pass iff true. | skill-patterns.md §A |
| a-name-matches-dir | [D] | always | `name` equals the skill directory's basename; pass iff equal. | skill-patterns.md §A |
| a-desc-present | [D] | always | Frontmatter has a non-empty `description`; pass iff present. | skill-patterns.md §A |
| a-desc-len | [D] | always | `len(description) ≤ 1024`; pass iff ≤1024 (note in `evidence` when over a platform listing-budget cap). | skill-patterns.md §A |
| a-name-verb-or-gerund | [J] | always | `name` reads as a verb or gerund naming the action, not a bare noun phrase; pass iff it does. | skill-patterns.md §A |

**why & how-to-verify (10.A):**

- **a-frontmatter-present** — *why:* the loader keys off frontmatter; a body with no frontmatter is not a skill. *how-to-verify:* `head -1 SKILL.md` is `---`; a second `---` exists within ~40 lines.
- **a-name-present** — *why:* `name` is the identifier the harness invokes; missing → unloadable. *how-to-verify:* `grep -m1 '^name:'` in the frontmatter region yields a non-empty value.
- **a-name-lowercase-hyphen** — *why:* the canonical naming form; `Foo_Bar` / `fooBar` break path conventions and slash-command derivation. *how-to-verify:* the `name` value satisfies `[[ "$name" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]`.
- **a-name-len** — *why:* the published hard cap; over-long names get truncated in listings. *how-to-verify:* `${#name} -le 64`.
- **a-name-matches-dir** — *why:* a `name` ≠ dirname is a copy-paste tell and breaks tooling that maps one to the other. *how-to-verify:* `name == basename "$skill_dir"`.
- **a-desc-present** — *why:* the description is how the agent decides to invoke the skill; empty → never triggered. *how-to-verify:* `grep -m1 '^description:'` yields a non-empty value.
- **a-desc-len** — *why:* the published hard cap; some platforms also have a much tighter visible budget, worth flagging. *how-to-verify:* `${#desc} -le 1024`; if over the platform listing cap, record it in `evidence`.
- **a-name-verb-or-gerund** — *why:* a noun-phrase name (`pdf-utilities`) tells the agent *what domain* but not *what action* — under-triggers. *how-to-verify:* judge whether `name` names an action (`create-skill`, `verify`, `wireframes`) vs a thing (`skill-utils`).

---

## 10.B — Description & triggering (6 checks, all `[J]`)

| id | tag | applies-when | check / pass-condition | § |
|---|---|---|---|---|
| b-desc-has-when | [J] | always | The `description` states *when* to use the skill (trigger conditions), not only *what* it does; pass iff trigger conditions are present. | skill-patterns.md §B |
| b-desc-has-what | [J] | always | The `description` includes a one-clause statement of *what* the skill does; pass iff present. | skill-patterns.md §B |
| b-desc-third-person | [J] | always | The `description` is third person ("Use when…"), not "I will…" / "You should…"; pass iff third person. | skill-patterns.md §B |
| b-desc-trigger-phrases | [J] | always | The skill body or description supplies ≥5 user-spoken trigger phrases, written the way users actually ask; pass iff ≥5 are present. | skill-patterns.md §B |
| b-desc-no-step-list | [J] | always | The `description` does NOT embed a numbered/bulleted step list or workflow (the "workflow-in-description bug"); pass iff no embedded workflow. | skill-patterns.md §B |
| b-desc-pushy | [J] | always | The `description` is assertive enough to combat under-triggering — not hedged into invisibility; pass iff it reads as a confident trigger. | skill-patterns.md §B |

**why & how-to-verify (10.B):**

- **b-desc-has-when** — *why:* the missing-*when* is the single most common description defect; without it the agent can't tell when to fire. *how-to-verify:* the description contains "Use when…" / "when the user says…" / equivalent trigger language.
- **b-desc-has-what** — *why:* terse names are ambiguous without a one-clause *what*. *how-to-verify:* the description leads with (or contains) a single clause naming the output/action.
- **b-desc-third-person** — *why:* first/second person reads as a chat reply, not a registry entry. *how-to-verify:* no "I will" / "I'll" / "you should" framing; "Use when…", "Create…", etc.
- **b-desc-trigger-phrases** — *why:* trigger phrases are how users who don't know the slash name reach the skill. *how-to-verify:* count distinct quoted user-spoken phrases ("write the technical design", "create the spec", …) in the description or body — ≥5.
- **b-desc-no-step-list** — *why:* a phase list pasted into the description bloats the picker and teaches the agent nothing about *when*. *how-to-verify:* no `1.`/`2.`/`-` enumerated workflow inside the `description:` value.
- **b-desc-pushy** — *why:* a hedged description ("can optionally help with…") under-triggers — the skill exists but never fires. *how-to-verify:* the trigger language is assertive ("Use this whenever…"), not timid.

---

## 10.C — Structure & progressive disclosure (9 checks)

| id | tag | applies-when | check / pass-condition | § |
|---|---|---|---|---|
| c-body-size | [D] | always | `SKILL.md` body line count (excluding frontmatter): ≤500 → pass; 501–800 → pass-with-note (verdict `pass`, `evidence` = "501–800; verify progressive disclosure"); >800 → fail. | skill-patterns.md §C |
| c-body-size-judge | [J] | body > 500 lines OR skill self-declares as an orchestrator/meta-skill | For a 501–800-line body or a self-declared orchestrator: should any block here live in a reference file instead? Pass iff the length is justified by content that genuinely belongs inline. | skill-patterns.md §C |
| c-references-dir-name | [D] | skill has a reference-files dir | The reference dir is named exactly `reference/` or `references/`; pass iff so. | skill-patterns.md §C |
| c-references-one-level | [D] | skill has `reference/` files | No reference file links to another reference file (no chains); pass iff the link graph `SKILL.md` → reference files is depth ≤1. | skill-patterns.md §C |
| c-reference-toc | [D] | a reference file is >100 lines | Each reference file >100 lines opens with a table of contents / section index in its first ~15 lines; pass iff every such file has one. | skill-patterns.md §C |
| c-portable-paths | [D] | `SKILL.md` or reference files reference bundled files by path | Bundled-file paths use a portable token (`${CLAUDE_SKILL_DIR}` / `${CLAUDE_PLUGIN_ROOT}` / the platform equivalent), not a hard-coded absolute path; pass iff no hard-coded absolute bundle paths. | skill-patterns.md §C |
| c-asset-layout | [D] | skill bundles non-doc files | Bundled files live under `scripts/` / `references/`(or `reference/`) / `assets/`, not loose in the skill root; pass iff layout conforms. | skill-patterns.md §C |
| c-progressive-disclosure | [J] | skill has `reference/` files | Detailed/optional material is in reference files; `SKILL.md` stays the lean entry point pointing to them; pass iff disclosure is genuinely progressive (not all inline, not all hidden). | skill-patterns.md §C |
| c-context-economy | [J] | always | The skill respects "context window is a public good" — no gratuitous restatement, no copy-pasted boilerplate a reference could carry; pass iff lean. | skill-patterns.md §C |

**why & how-to-verify (10.C):**

- **c-body-size** — *why:* every body line is a line the agent can't spend on the task; the graduated bands keep authors honest without a hard veto. *how-to-verify:* `wc -l` of the body region (file lines minus the frontmatter block); ≤500 pass, 501–800 pass-with-note, >800 fail.
- **c-body-size-judge** — *why:* line count alone is crude — an orchestrator is legitimately long, a 600-line CRUD skill probably isn't. *how-to-verify:* read the 501–800-line body (or the self-declared orchestrator) and judge whether any block obviously belongs in `reference/`.
- **c-references-dir-name** — *why:* tooling and readers expect exactly `reference/`/`references/`; `docs/` or `ref/` breaks discovery. *how-to-verify:* the dir holding the skill's reference `.md` files is named `reference` or `references`.
- **c-references-one-level** — *why:* a reader following one hop should reach a leaf; chains hide depth. *how-to-verify:* grep each `reference/*.md` for links to another `reference/*.md` — there are none.
- **c-reference-toc** — *why:* a long reference file with no index forces a linear read. *how-to-verify:* every `reference/*.md` with >100 lines has a `## Contents` / `## Table of contents` heading or a bullet/numbered jump-list within its first ~15 lines.
- **c-portable-paths** — *why:* a hard-coded `/Users/alice/...` breaks the instant the skill is installed elsewhere. *how-to-verify:* grep the body + reference files for `/Users/` / `/home/` / leading-`/` bundle paths; portable tokens (`${CLAUDE_SKILL_DIR}`) are fine.
- **c-asset-layout** — *why:* loose files in the skill root clutter the entry point and confuse the loader. *how-to-verify:* every non-`SKILL.md`, non-sidecar bundled file lives under `scripts/`, `references/`/`reference/`, or `assets/`.
- **c-progressive-disclosure** — *why:* dumping everything inline defeats the entry-point role; hiding everything makes the skill opaque. *how-to-verify:* judge whether `SKILL.md` reads as a lean orchestrator that points at depth, vs a wall.
- **c-context-economy** — *why:* restatement and boilerplate are pure context tax. *how-to-verify:* judge whether the doc repeats itself or carries copy-pasted blocks a reference could hold.

---

## 10.D — Body & content (9 checks)

| id | tag | applies-when | check / pass-condition | § |
|---|---|---|---|---|
| d-platform-adaptation | [D] | always | `SKILL.md` has a `## Platform Adaptation` (or equivalently-named) section; pass iff present. | skill-patterns.md §D |
| d-learnings-load-line | [D] | skill is not a thin alias | `SKILL.md` instructs reading `~/.pmos/learnings.md` (entries under `## /<name>`) at startup; pass iff present. (N/A for thin aliases — FR-81.) | skill-patterns.md §D |
| d-capture-learnings-phase | [D] | skill is not a thin alias | `SKILL.md` has a numbered Capture-Learnings phase (not a trailing un-numbered section); pass iff present and numbered. | skill-patterns.md §D |
| d-progress-tracking | [D] | skill has ≥3 sequential phases/steps | `SKILL.md` has a `## Track Progress` (or equivalent) instruction to create one task per phase; pass iff present. | skill-patterns.md §D |
| d-imperative-form | [J] | always | Instructions are imperative ("Read X", "Write Y"), not narrated ("the skill will read X"); pass iff predominantly imperative. | skill-patterns.md §D |
| d-explain-why | [J] | always | Non-obvious instructions explain the rationale; the doc avoids all-caps shouting (gratuitous MUST/NEVER); pass iff rationale is given where needed and shouting is restrained. | skill-patterns.md §D |
| d-flowcharts-justified | [J] | `SKILL.md` contains a flowchart/diagram | Flowcharts appear only for genuinely non-obvious decision logic, not to decorate linear steps; pass iff every flowchart earns its place. | skill-patterns.md §D |
| d-examples-quality | [J] | `SKILL.md` or reference files contain examples | Examples are few and excellent rather than many and mediocre; each one teaches something; pass iff so. | skill-patterns.md §D |
| d-body-skeleton | [J] | skill is not a thin alias | The body covers the essentials (overview / when-to-use / core pattern / implementation / common mistakes) in spirit — not as a rigid template, but nothing critical is missing; pass iff the essentials are present. | skill-patterns.md §D |

**why & how-to-verify (10.D):**

- **d-platform-adaptation** — *why:* a skill that only works on the primary platform is half a skill. *how-to-verify:* `grep -E '^##+ +(Cross-)?Platform Adaptation'` hits.
- **d-learnings-load-line** — *why:* without it the skill never participates in the feedback loop. *how-to-verify:* (non-alias skills) `grep -i 'learnings.md'` plus a `## /<name>` reference in the body.
- **d-capture-learnings-phase** — *why:* an *un-numbered* tail section gets skipped; only a numbered phase reliably runs. *how-to-verify:* (non-alias skills) `grep -E '^##+ +Phase [0-9N].*Capture Learnings'` hits.
- **d-progress-tracking** — *why:* a multi-phase skill the agent can't see the progress of leaves the user blind. *how-to-verify:* if the body has ≥3 `^##+ +Phase ` headings, `grep -E '^##+ +Track Progress'` hits.
- **d-imperative-form** — *why:* narrated instructions read as description, not direction; the agent follows commands better. *how-to-verify:* judge whether the body addresses the agent in the imperative.
- **d-explain-why** — *why:* an agent that understands a rule follows it more reliably; all-caps shouting is noise the agent tunes out. *how-to-verify:* judge whether non-obvious steps carry a one-line rationale and whether emphasis is reserved for the load-bearing constraint.
- **d-flowcharts-justified** — *why:* a flowchart of linear steps is decoration that costs context. *how-to-verify:* for each diagram, judge whether the control flow has real branches the prose can't carry.
- **d-examples-quality** — *why:* a gallery of half-examples teaches less than one worked example. *how-to-verify:* judge whether each example earns its place.
- **d-body-skeleton** — *why:* a body missing "when to use" or "common mistakes" leaves the agent guessing. *how-to-verify:* judge whether the essentials are present in spirit (not as a rigid layout).

---

## 10.E — Scripts & tooling (4 checks)

| id | tag | applies-when | check / pass-condition | § |
|---|---|---|---|---|
| e-scripts-dir | [D] | skill bundles executable scripts | Scripts live under `scripts/`; pass iff so. (Whole group skipped when the skill bundles no scripts — not a failure.) | skill-patterns.md §E |
| e-deps-documented | [J] | skill bundles scripts with external dependencies | Script dependencies (interpreters, packages, CLIs) are documented in `SKILL.md` or the script header; pass iff documented. | skill-patterns.md §E |
| e-script-selftest | [J] | skill bundles a non-trivial script | Non-trivial scripts have a self-test / `--selftest` / smoke check; pass iff present (or the script is trivial enough not to need one). | skill-patterns.md §E |
| e-eval-driven | [J] | always | The skill (or its dev history) reflects validate→fix→repeat — not a one-shot dump; records the `superpowers` strong-form "no skill without a failing test first" as the aspirational bar; pass iff there is evidence of iterative refinement (an eval rubric, a test, or a documented refine loop). | skill-patterns.md §E |

**why & how-to-verify (10.E):**

- **e-scripts-dir** — *why:* loose scripts in the root are the `c-asset-layout` failure with teeth — they don't get found. *how-to-verify:* every bundled `*.sh`/`*.py`/`*.js` (outside `reference/`/`assets/`) is under `scripts/`. **Whole group is N/A when the skill bundles no scripts.**
- **e-deps-documented** — *why:* an undocumented `jq`/`node` dependency surfaces as a confusing runtime failure. *how-to-verify:* the script header or `SKILL.md` lists the required interpreters/packages/CLIs.
- **e-script-selftest** — *why:* a checker/generator with no self-test can rot silently. *how-to-verify:* the non-trivial bundled script has a `--selftest`/smoke path, or is trivial enough to need none.
- **e-eval-driven** — *why:* a one-shot skill dump tends to be brittle in ways an iterative process would have caught. *how-to-verify:* there is an eval rubric, a test suite, or a documented validate→fix→repeat loop. (The strong-form "test-first or it isn't done" is the bar to aspire to; the pass bar is "evidence of iteration".)

---

## 10.F — Platform-conditional frontmatter (3 checks; gated by `target_platform`)

| id | tag | applies-when | check / pass-condition | § |
|---|---|---|---|---|
| f-cc-user-invocable | [D] | `target_platform == claude-code` AND skill is meant to be a slash command | Frontmatter has `user-invocable: true` and an `argument-hint`; pass iff both present. | skill-patterns.md §F |
| f-cc-argument-hint-matches | [J] | `target_platform == claude-code` AND `argument-hint` present | The `argument-hint` enumerates the flags/positional args the body actually parses; pass iff it matches. | skill-patterns.md §F |
| f-codex-sidecar | [D] | `target_platform == codex` | An `agents/openai.yaml` sidecar exists alongside `SKILL.md` with the required Codex fields; pass iff present. | skill-patterns.md §F |

**why & how-to-verify (10.F):**

- **f-cc-user-invocable** — *why:* on Claude Code a skill without `user-invocable: true` + an `argument-hint` can't be invoked as `/name`. *how-to-verify:* both keys present in the frontmatter, when `--target claude-code` and the skill has a non-trivial phased body.
- **f-cc-argument-hint-matches** — *why:* a stale `argument-hint` (lists dropped flags, or omits parsed ones) misleads the user. *how-to-verify:* judge whether every flag/arg the body parses appears in the hint and vice-versa.
- **f-codex-sidecar** — *why:* a Codex skill without `agents/openai.yaml` is incomplete on that platform. *how-to-verify:* the sidecar file exists alongside `SKILL.md`, when `--target codex`.

**Note:** `--target generic` skips this entire group — neither the `f-cc-*` checks nor `f-codex-sidecar` apply (intersection-only).

---

## 10.G — Release-prerequisites scope (2 checks; gated — pmos-toolkit pipeline plans only)

| id | tag | applies-when | check / pass-condition | § |
|---|---|---|---|---|
| g-release-prereqs-scope | [J] | skill mode AND `03_plan.{html,md}` present AND spec present | The plan's wave sections list ONLY skill content tasks (`SKILL.md` body, `reference/`, `scripts/`, `tests/`). README rows, manifest version bumps (any `plugin.json`), changelog entries (any `CHANGELOG.md` / `docs/**/changelog.md`), and `~/.pmos/learnings.md` header bootstraps are enumerated in the spec's `## Release prerequisites` section as `/complete-dev` deliverables — never as `/execute` tasks. Pass iff every release-prerequisite item is in `## Release prerequisites` and not in a `## Wave N` / `T<N>` block. | skill-patterns.md §G |
| g-plan-grep-clean | [D] | skill mode AND `03_plan.{html,md}` present | `grep -E '(version bump\|bump.*plugin\.json\|CHANGELOG\.md\|docs/.*changelog\|README row\|X.Y.Z -> X.Y.Z)' 03_plan.{html,md}` finds no match inside any `## Wave N`/`### Wave N`/`T<N>:` block. The concrete-version pattern (`X.Y.Z → X.Y.Z`) catches stale-bump guesses baked in at plan time — per §G #4, only bump *type* belongs in `## Release prerequisites`. Pre-amble and the `## Release prerequisites` section are excluded from the scan. Pass iff no match in wave blocks. | skill-patterns.md §G |

**why & how-to-verify (10.G):**

- **g-release-prereqs-scope** — *why:* `/execute` committing version bumps + changelog edits against a stale local base produces silent damage at Phase 8 `/complete-dev` merge time (conflicts, version below latest published, wrong changelog file). `/complete-dev`'s contract presupposes it is the sole writer of those files. *how-to-verify:* read every `## Wave N` block; for each `T<N>` task, confirm its file edits are limited to `SKILL.md`, `reference/`, `scripts/`, or `tests/`. Any task that edits a `plugin.json`, a changelog, a README, or `~/.pmos/learnings.md` is a fail — its `fix_note` is "move this task to the spec's ## Release prerequisites section as a /complete-dev deliverable", and the `quote` is the offending task's heading + first line.
- **g-plan-grep-clean** — *why:* a deterministic backstop to the `[J]` check above — a regression in `/plan`'s scope discipline shows up as a grep match before any reviewer sees it. The added `X.Y.Z -> X.Y.Z` pattern catches the related anti-pattern of baking specific version numbers into the plan: those numbers depend on what `main` is at `/complete-dev` time, not at plan time, so any concrete from/to in a wave block is guesswork that produces stale-bump conflicts at merge. *how-to-verify:* the script `bin`-greps the plan artifact for the substrings above, scoped to wave blocks only (preamble + `## Release prerequisites` are excluded). The script must handle both `.html` and `.md` plans (strip HTML chrome before grep). Any match in a wave block is a fail; the evidence column lists the matched lines.

---

## Totals & group-skip rules

41 checks — **21 `[D]`** (implemented in `tools/skill-eval-check.sh`: `a-frontmatter-present`, `a-name-present`, `a-name-lowercase-hyphen`, `a-name-len`, `a-name-matches-dir`, `a-desc-present`, `a-desc-len`, `c-body-size`, `c-references-dir-name`, `c-references-one-level`, `c-reference-toc`, `c-portable-paths`, `c-asset-layout`, `d-platform-adaptation`, `d-learnings-load-line`, `d-capture-learnings-phase`, `d-progress-tracking`, `e-scripts-dir`, `f-cc-user-invocable`, `f-codex-sidecar`, `g-plan-grep-clean`) — **20 `[J]`** (reviewer subagent: the rest). This table is the baseline contract; `/execute` may refine prose and adjust an individual `[D]`/`[J]` where clearly mis-tagged, but must keep the total ≥37, the bijective patterns↔eval mapping (FR-72), and every `[D]`-tagged check implemented in the script (FR-71). The group-skip rules (no `scripts/` → skip 10.E; no `reference/` → 10.C reference-only checks N/A; `--target generic` → skip 10.F; no `03_plan.{html,md}` / non-pmos-pipeline skill → skip 10.G) are part of the contract — see the top of this file.

## Cross-reference to skill-patterns.md

Every check above names exactly one `skill-patterns.md` §-rule in its `§` column, and
every §-rule there lists ≥1 `check_id` here in its closing `Checks:` line. The
bijection is asserted by `skill-eval-check.sh --selftest` (every `[D]` check ↔ a code
branch, and every check names a `§[A-Z]` rule) plus a `/verify` structural check
(FR-72). Change a rule there and the matching check here in the same commit.
