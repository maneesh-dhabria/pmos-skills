# skill-eval.md — the binary skill-quality rubric

52 binary pass/fail checks — 46 gated (24 `[D]` + 22 `[J]`) + 6 advisory `[J]` — pass floor 42 (gated − 4); a 1:1 mirror of `skill-patterns.md` §A–§K. `/feature-sdlc`
Phase 6a (and `/verify` on a skill) runs this rubric: the `[D]` (deterministic)
checks are implemented in `tools/skill-eval-check.sh`; the `[J]` (llm-judge) checks
are run by a reviewer subagent; the six advisory `[J]` checks (final section) are
evaluated and reported but never gate. Each check carries a stable `check_id` (kebab,
prefixed by the `skill-patterns.md` § it mirrors — `a-…`, `b-…`, … `k-…`), a `tag`,
an `applies_when` gate, a `check`/`pass-condition`, a `why`, a `how-to-verify`, and a
back-reference to its `skill-patterns.md` §-rule. This file is the contract; the
`/execute` implementation may refine the prose and re-tag an individual `[D]`/`[J]`
where clearly mis-tagged, but MUST keep the gated set at or above the pass floor, the
bijective patterns↔eval mapping (FR-72), every `[D]`-tagged check implemented in the
script (FR-71), and the opening-line counts equal to the table reality (both asserted
by `skill-eval-check.sh --selftest`).

## Table of contents

- **10.A — Frontmatter** (8 checks: 7 `[D]`, 1 `[J]`)
- **10.B — Description & triggering** (5 checks, all `[J]`)
- **10.C — Structure & progressive disclosure** (8 checks: 6 `[D]`, 2 `[J]`)
- **10.D — Body & content** (5 checks: 4 `[D]`, 1 `[J]`)
- **10.E — Scripts & tooling** (4 checks: 1 `[D]`, 3 `[J]`)
- **10.F — Platform-conditional frontmatter** (3 checks: 2 `[D]`, 1 `[J]`; gated by `target_platform`)
- **10.G — Release-prerequisites scope** (2 checks: 1 `[D]`, 1 `[J]`; gated — pmos-toolkit pipeline plans only)
- **10.H — Gates & rubrics** (3 checks, all `[J]`; gated — skills that define gates/rubrics/eval loops)
- **10.I — Flags** (4 checks: 2 `[D]`, 2 `[J]`)
- **10.J — Phases & anchors** (3 checks: 1 `[D]`, 2 `[J]`)
- **10.K — One fact, one home** (1 check, `[J]`)
- **Advisory signals (reported, not gated)** (6 checks, all `[J]`)
- **Totals & group-skip rules**
- **LLM-judge determinism contract**

## Group-skip rules (part of the contract)

- **No `scripts/` dir / no bundled executable scripts** → group 10.E is skipped entirely (not a failure).
- **No `reference/` (or `references/`) dir** → the reference-only group-10.C checks (`c-references-dir-name`, `c-references-one-level`, `c-reference-toc`, `c-progressive-disclosure`) are N/A when no reference dir exists; `c-body-size` still applies.
- **`--target generic`** → group 10.F (`f-cc-user-invocable`, `f-cc-argument-hint-matches`, `f-codex-sidecar`) is skipped entirely — only the platform-intersection requirements apply.
- **No `03_plan.{html,md}` artifact present** (or skill is not being authored under the pmos-toolkit pipeline) → group 10.G (`g-release-prereqs-scope`, `g-plan-grep-clean`) is skipped entirely. The two checks only run when `/feature-sdlc skill …` has produced a plan artifact and `/verify` / Phase 6a is grading the plan-to-scope discipline.
- **Skill defines no gate, rubric, or eval loop** → group 10.H is N/A (not a failure).
- **Skill parses no flags/options** → the `[J]` group-10.I checks (`i-nl-first-stated`, `i-flags-4test`) are N/A; the `[D]` lint-backed checks still run (they pass trivially on a flagless skill).
- **No phase headings in the body** → `j-phases-integer` and `j-phase-slug-anchors` are N/A; `j-phase-refs-resolve` still runs (it passes trivially when there are no phase references).
- **Repo-root lint missing** — the three lint-backed `[D]` checks (`i-hint-contract-only`, `i-nl-sugar-marked` → `tools/lint-flags-vs-hints.sh`; `j-phase-refs-resolve` → `tools/lint-phase-refs.sh`, both resolved by walking up from the script's own location) are **skipped with a stderr `WARN:`**, not failed, when the lint file cannot be found or errors. This rubric may be synced into a plugin/repo that lacks the host repo-root `tools/`; a missing lint must never crash the eval.
- **Advisory checks** (final section) are evaluated whenever their `applies_when` holds and reported in the eval output, but they never count toward the pass floor and never block.
- An N/A check counts as neither pass nor fail; it is omitted from the script's TSV output and from the reviewer's findings.

## LLM-judge determinism contract

Every `[J]` check call (copied from the `polish/reference/rubric.md` shape):

- `temperature: 0`.
- Output schema, per check: `{check_id, verdict: "pass" | "fail", fix_note: string, quote: string}` — where `quote` is a ≥40-character verbatim span from the skill source that grounds a `fail`.
- A `fail` with an empty `quote`, or a `quote` that is not a substring of the skill source, is treated as `pass` (an unsubstantiated fail does not count). The parent (`/feature-sdlc` Phase 6a or `/verify`) substring-validates every `quote` against the un-stripped source and downgrades unverifiable fails.
- Advisory checks use the same contract and the same quote-grounding; their verdicts are reported with the `fix_note` + `quote` but are excluded from the pass floor.

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

## 10.B — Description & triggering (5 checks, all `[J]`)

| id | tag | applies-when | check / pass-condition | § |
|---|---|---|---|---|
| b-desc-has-when | [J] | always | The `description` states *when* to use the skill (trigger conditions), not only *what* it does; pass iff trigger conditions are present. | skill-patterns.md §B |
| b-desc-has-what | [J] | always | The `description` includes a one-clause statement of *what* the skill does; pass iff present. | skill-patterns.md §B |
| b-desc-third-person | [J] | always | The `description` is third person ("Use when…"), not "I will…" / "You should…"; pass iff third person. | skill-patterns.md §B |
| b-desc-trigger-phrases | [J] | always | The skill body or description supplies ≥5 user-spoken trigger phrases, written the way users actually ask; pass iff ≥5 are present. | skill-patterns.md §B |
| b-desc-no-step-list | [J] | always | The `description` does NOT embed a numbered/bulleted step list or workflow (the "workflow-in-description bug"); pass iff no embedded workflow. | skill-patterns.md §B |

**why & how-to-verify (10.B):**

- **b-desc-has-when** — *why:* the missing-*when* is the single most common description defect; without it the agent can't tell when to fire. *how-to-verify:* the description contains "Use when…" / "when the user says…" / equivalent trigger language.
- **b-desc-has-what** — *why:* terse names are ambiguous without a one-clause *what*. *how-to-verify:* the description leads with (or contains) a single clause naming the output/action.
- **b-desc-third-person** — *why:* first/second person reads as a chat reply, not a registry entry. *how-to-verify:* no "I will" / "I'll" / "you should" framing; "Use when…", "Create…", etc.
- **b-desc-trigger-phrases** — *why:* trigger phrases are how users who don't know the slash name reach the skill. *how-to-verify:* count distinct quoted user-spoken phrases ("write the technical design", "create the spec", …) in the description or body — ≥5.
- **b-desc-no-step-list** — *why:* a phase list pasted into the description bloats the picker and teaches the agent nothing about *when*. *how-to-verify:* no `1.`/`2.`/`-` enumerated workflow inside the `description:` value.

---

## 10.C — Structure & progressive disclosure (8 checks)

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

**why & how-to-verify (10.C):**

- **c-body-size** — *why:* every body line is a line the agent can't spend on the task; the graduated bands keep authors honest without a hard veto. *how-to-verify:* `wc -l` of the body region (file lines minus the frontmatter block); ≤500 pass, 501–800 pass-with-note, >800 fail.
- **c-body-size-judge** — *why:* line count alone is crude — an orchestrator is legitimately long, a 600-line CRUD skill probably isn't. *how-to-verify:* read the 501–800-line body (or the self-declared orchestrator) and judge whether any block obviously belongs in `reference/`.
- **c-references-dir-name** — *why:* tooling and readers expect exactly `reference/`/`references/`; `docs/` or `ref/` breaks discovery. *how-to-verify:* the dir holding the skill's reference `.md` files is named `reference` or `references`.
- **c-references-one-level** — *why:* a reader following one hop should reach a leaf; chains hide depth. *how-to-verify:* grep each `reference/*.md` for links to another `reference/*.md` — there are none.
- **c-reference-toc** — *why:* a long reference file with no index forces a linear read. *how-to-verify:* every `reference/*.md` with >100 lines has a `## Contents` / `## Table of contents` heading or a bullet/numbered jump-list within its first ~15 lines.
- **c-portable-paths** — *why:* a hard-coded `/Users/alice/...` breaks the instant the skill is installed elsewhere. *how-to-verify:* grep the body + reference files for `/Users/` / `/home/` / leading-`/` bundle paths; portable tokens (`${CLAUDE_SKILL_DIR}`) are fine.
- **c-asset-layout** — *why:* loose files in the skill root clutter the entry point and confuse the loader. *how-to-verify:* every non-`SKILL.md`, non-sidecar bundled file lives under `scripts/`, `references/`/`reference/`, or `assets/`.
- **c-progressive-disclosure** — *why:* dumping everything inline defeats the entry-point role; hiding everything makes the skill opaque. *how-to-verify:* judge whether `SKILL.md` reads as a lean orchestrator that points at depth, vs a wall.

---

## 10.D — Body & content (5 checks)

| id | tag | applies-when | check / pass-condition | § |
|---|---|---|---|---|
| d-platform-adaptation | [D] | always | `SKILL.md` has a `## Platform Adaptation` (or equivalently-named) section; pass iff present. | skill-patterns.md §D |
| d-learnings-load-line | [D] | skill is not a thin alias | `SKILL.md` instructs reading `~/.pmos/learnings.md` (entries under `## /<name>`) at startup; pass iff present. (N/A for thin aliases — FR-81.) | skill-patterns.md §D |
| d-capture-learnings-phase | [D] | skill is not a thin alias | `SKILL.md` has a numbered Capture-Learnings phase (not a trailing un-numbered section); pass iff present and numbered. | skill-patterns.md §D |
| d-progress-tracking | [D] | skill has ≥3 sequential phases/steps | `SKILL.md` has a `## Track Progress` (or equivalent) instruction to create one task per phase; pass iff present. | skill-patterns.md §D |
| d-body-skeleton | [J] | skill is not a thin alias | The body covers the essentials (overview / when-to-use / core pattern / implementation / common mistakes) in spirit — not as a rigid template, but nothing critical is missing; pass iff the essentials are present. | skill-patterns.md §D |

**why & how-to-verify (10.D):**

- **d-platform-adaptation** — *why:* a skill that only works on the primary platform is half a skill. *how-to-verify:* `grep -E '^##+ +(Cross-)?Platform Adaptation'` hits.
- **d-learnings-load-line** — *why:* without it the skill never participates in the feedback loop. *how-to-verify:* (non-alias skills) `grep -i 'learnings.md'` plus a `## /<name>` reference in the body.
- **d-capture-learnings-phase** — *why:* an *un-numbered* tail section gets skipped; only a numbered phase reliably runs. *how-to-verify:* (non-alias skills) `grep -E '^##+ +Phase [0-9N].*Capture Learnings'` hits.
- **d-progress-tracking** — *why:* a multi-phase skill the agent can't see the progress of leaves the user blind. *how-to-verify:* if the body has ≥3 `^##+ +Phase ` headings, `grep -E '^##+ +Track Progress'` hits.
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
| f-cc-argument-hint-matches | [J] | `target_platform == claude-code` AND `argument-hint` present | The `argument-hint` enumerates the *contract* flags/positional args the body actually parses — those passing the 4-test (see 10.I). NL-sugar aliases (marked `<!-- nl-sugar -->` in the body) are parsed but deliberately absent and exempt from the hint requirement; pass iff the hint lists exactly the contract surface. | skill-patterns.md §F |
| f-codex-sidecar | [D] | `target_platform == codex` | An `agents/openai.yaml` sidecar exists alongside `SKILL.md` with the required Codex fields; pass iff present. | skill-patterns.md §F |

**why & how-to-verify (10.F):**

- **f-cc-user-invocable** — *why:* on Claude Code a skill without `user-invocable: true` + an `argument-hint` can't be invoked as `/name`. *how-to-verify:* both keys present in the frontmatter, when `--target claude-code` and the skill has a non-trivial phased body.
- **f-cc-argument-hint-matches** — *why:* a stale `argument-hint` (lists flags the body dropped, omits contract flags the body parses, or advertises an NL-sugar alias) misleads the user — the hint is the contract surface, not the alias surface. *how-to-verify:* judge whether every *contract* flag/arg the body parses appears in the hint and vice-versa; a body-parsed flag marked `<!-- nl-sugar -->` is exempt from the hint requirement (its absence is correct, its presence is the failure). Semantics align with `tools/lint-flags-vs-hints.sh` (HINT-DEAD / BODY-ONLY), whose deterministic halves are `i-hint-contract-only` / `i-nl-sugar-marked` in 10.I.
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

## 10.H — Gates & rubrics (3 checks, all `[J]`; gated — skills that define gates/rubrics/eval loops)

| id | tag | applies-when | check / pass-condition | § |
|---|---|---|---|---|
| h-gates-deterministic-hard | [J] | skill defines a gate, rubric, or eval loop | Every check a script can decide (file exists, count matches, string present, schema validates) is wired as a hard gate enforced by a bundled script — never left to prose discipline or a judge; pass iff no deterministically-decidable check is enforced by prose or judge. | skill-patterns.md §H |
| h-gates-judgment-advisory | [J] | skill defines a gate, rubric, or eval loop | Every judgment-call check (prose clarity, emphasis, taste, style gestalt) is advisory — surfaced with severity and a cited span, disposed by the user or recorded as an accepted residual — never wired as a blocking gate; pass iff no judgment call blocks. | skill-patterns.md §H |
| h-gates-arithmetic-scripted | [J] | skill's checks include arithmetic over extractable data | Arithmetic checks (a percentage, a stddev, a count) are computed by a bundled script whose output the LLM judge consumes — the judge never computes the number itself; pass iff every arithmetic check is script-computed. | skill-patterns.md §H |

**why & how-to-verify (10.H):**

- **h-gates-deterministic-hard** — *why:* loader and contract drift fail deterministically when a script asserts them; prose-enforced structure rots silently (precedent: `/magazine`'s `structure.test.sh` heading assertions and hermetic script `--selftest`s). *how-to-verify:* for each gate the skill defines, judge whether a script could decide it; if yes, confirm a script does — a prose- or judge-enforced deterministic check is the fail.
- **h-gates-judgment-advisory** — *why:* binary-failing a judgment call triggers a full remediation loop over a wording nit, and the verdict shifts with the judging model (precedent: `/diagram`'s vision-gate rebalance — deterministic SVG metrics stay hard-fail, taste-grade vision items report and ship). *how-to-verify:* for each judgment-decided check, confirm the skill surfaces it (severity + cited span, user-disposed or accepted-residual) rather than blocking on it.
- **h-gates-arithmetic-scripted** — *why:* asking a judge to "compute at temperature 0" yields nondeterministic, model-coupled numbers; the same numbers from a script are exact (precedent: `/polish`'s metric checks — passive-%, sentence-length stddev, heading metrics). *how-to-verify:* for each numeric threshold in the skill's rubric, confirm the number comes from a bundled script and the judge only consumes it.

---

## 10.I — Flags (4 checks: 2 `[D]`, 2 `[J]`)

| id | tag | applies-when | check / pass-condition | § |
|---|---|---|---|---|
| i-nl-first-stated | [J] | skill is user-invocable AND parses flags/options | The body states the NL-first rule once ("infer <option> from the request; an explicit `--flag` overrides") and names the canonical natural-language phrasings for its options; pass iff the rule is stated and phrasings are named. | skill-patterns.md §I |
| i-flags-4test | [J] | skill documents flags as contract (body + `argument-hint`) | Every contract flag passes ≥1 prong of the 4-test: (1) machine coupling, (2) destructive opt-in, (3) typed value, (4) headless determinism. Flags passing none are silent aliases — parsed, removed from the hint, `<!-- nl-sugar -->`-marked; pass iff no contract flag fails all four prongs. | skill-patterns.md §I |
| i-hint-contract-only | [D] | always (skipped with a stderr `WARN:` when repo-root `tools/lint-flags-vs-hints.sh` is absent) | `tools/lint-flags-vs-hints.sh <skill-dir>` reports no `HINT-DEAD` finding — no flag advertised in `argument-hint` that the body never mentions; pass iff zero HINT-DEAD lines. | skill-patterns.md §I |
| i-nl-sugar-marked | [D] | always (skipped with a stderr `WARN:` when repo-root `tools/lint-flags-vs-hints.sh` is absent) | The same lint reports no `BODY-ONLY` finding — every body-*defined* flag is either listed in `argument-hint` or carries an `<!-- nl-sugar -->` marker within 2 lines of its definition site; pass iff zero BODY-ONLY lines. | skill-patterns.md §I |

**why & how-to-verify (10.I):**

- **i-nl-first-stated** — *why:* flags users must memorize are friction; "go deep on this" should work without knowing `--depth deep` exists. *how-to-verify:* judge whether the body states the infer-from-request rule once and names the canonical phrasings.
- **i-flags-4test** — *why:* the 2026-06-10 review found 137 user-facing flags where ~35 pass the 4-test; the gap is exactly where dead flags, vocabulary collisions, and broken cross-skill calls accumulated. *how-to-verify:* for each flag in the `argument-hint`, judge which prong it passes; a contract flag passing none should be demoted to NL-sugar.
- **i-hint-contract-only** — *why:* a hint advertising a flag the body never handles is a promise the skill doesn't keep (the HINT-DEAD class). *how-to-verify:* the script runs `tools/lint-flags-vs-hints.sh <skill-dir>` (one invocation shared with `i-nl-sugar-marked`) and fails this check on any `HINT-DEAD` line.
- **i-nl-sugar-marked** — *why:* a body-defined flag absent from the hint and unmarked is either an undiscoverable contract or an unmarked alias — both drift (the BODY-ONLY class). *how-to-verify:* the same lint invocation; fails this check on any `BODY-ONLY` line. The marker exemption (`<!-- nl-sugar -->` within 2 lines) is the lint's, not re-implemented here.

---

## 10.J — Phases & anchors (3 checks: 1 `[D]`, 2 `[J]`)

| id | tag | applies-when | check / pass-condition | § |
|---|---|---|---|---|
| j-phases-integer | [J] | skill body has phase headings | Top-level phases are integers only — no fractional (`Phase 7.5`) or lettered (`Phase 0c`) top-level phases; sub-structure inside a phase is "step N" prose, never a pseudo-phase label; pass iff every top-level phase label is an integer. | skill-patterns.md §J |
| j-phase-slug-anchors | [J] | skill body has phase headings | Every phase heading carries a stable kebab `{#slug}` anchor, and cross-references cite the slug (cross-skill refs additionally carry the skill qualifier) rather than a bare number on non-heading surfaces (schemas, log-line contracts, Track Progress enumerations, tests); pass iff anchors are present and slug-addressing is the norm. | skill-patterns.md §J |
| j-phase-refs-resolve | [D] | always (skipped with a stderr `WARN:` when repo-root `tools/lint-phase-refs.sh` is absent) | `tools/lint-phase-refs.sh <skill-dir>` exits 0 — every textual `Phase <label>` / `#slug` reference in the skill's markdown resolves to a heading/anchor that exists (cross-skill refs resolve against the named skill); pass iff exit 0. | skill-patterns.md §J |

**why & how-to-verify (10.J):**

- **j-phases-integer** — *why:* a fractional/lettered top-level phase is an accretion smell — a phase was inserted and the file never renumbered. *how-to-verify:* judge the phase headings; `Phase 7.5` / `Phase 0c` at top level is the fail, "Phase 4, step 3" prose sub-structure is fine.
- **j-phase-slug-anchors** — *why:* the number is ordering sugar; the slug is the address. A renumber that only fixes headings orphans every other surface — one such commit (`a76a5da`) left 22 in-file ghost references + 7 cross-skill phantoms. *how-to-verify:* judge whether phase headings carry `{#slug}` anchors and whether non-heading references cite slugs (with skill qualifiers cross-skill).
- **j-phase-refs-resolve** — *why:* renumbering is safe because a lint catches the stragglers, not discipline. *how-to-verify:* the script runs `tools/lint-phase-refs.sh <skill-dir>`; exit 0 passes, exit 1 fails with the first ghost reference as evidence.

---

## 10.K — One fact, one home (1 check)

| id | tag | applies-when | check / pass-condition | § |
|---|---|---|---|---|
| k-one-fact-one-home | [J] | always | Every fact (a count, a path, an enum, a contract, a phase list) has exactly one canonical home picked by ownership; every other mention is a 1–3-line pointer (intent + citation + the one genuine local delta). Where physical duplication is genuinely required, a lint binds the copies; pass iff no fact is restated in ≥2 places without a binding lint. | skill-patterns.md §K |

**why & how-to-verify (10.K):**

- **k-one-fact-one-home** — *why:* facts stated in two places with no lint binding them are the root cause behind ~35 verified contradictions in the 2026-06-10 design review — dead flags, ghost phase refs, rubric headers lying about their own check counts. *how-to-verify:* judge whether the skill restates anything a reference file, a script header, or a `_shared/` contract already states; a restatement is a fail unless it is a ≤3-line pointer or carries a binding lint (e.g., the inline non-interactive block).

---

## Advisory signals (reported, not gated)

Per `skill-patterns.md` §H's judgment→advisory policy, the six judgment-call checks below are evaluated under the same `[J]` contract (temperature 0, quote-grounded) and reported in the eval output with severity + `fix_note` + `quote`, but they never count toward the pass floor and never block — the user disposes of each finding or records it as an accepted residual.

| id | tag | applies-when | check / pass-condition | § |
|---|---|---|---|---|
| b-desc-pushy | [J] | always | The `description` is assertive enough to combat under-triggering — not hedged into invisibility; pass iff it reads as a confident trigger. | skill-patterns.md §B |
| c-context-economy | [J] | always | The skill respects "context window is a public good" — no gratuitous restatement, no copy-pasted boilerplate a reference could carry; pass iff lean. | skill-patterns.md §C |
| d-imperative-form | [J] | always | Instructions are imperative ("Read X", "Write Y"), not narrated ("the skill will read X"); pass iff predominantly imperative. | skill-patterns.md §D |
| d-explain-why | [J] | always | Non-obvious instructions explain the rationale; the doc avoids all-caps shouting (gratuitous MUST/NEVER); pass iff rationale is given where needed and shouting is restrained. | skill-patterns.md §D |
| d-flowcharts-justified | [J] | `SKILL.md` contains a flowchart/diagram | Flowcharts appear only for genuinely non-obvious decision logic, not to decorate linear steps; pass iff every flowchart earns its place. | skill-patterns.md §D |
| d-examples-quality | [J] | `SKILL.md` or reference files contain examples | Examples are few and excellent rather than many and mediocre; each one teaches something; pass iff so. | skill-patterns.md §D |

**why & how-to-verify (advisory):**

- **b-desc-pushy** — *why:* a hedged description ("can optionally help with…") under-triggers — the skill exists but never fires. *how-to-verify:* the trigger language is assertive ("Use this whenever…"), not timid.
- **c-context-economy** — *why:* restatement and boilerplate are pure context tax. *how-to-verify:* judge whether the doc repeats itself or carries copy-pasted blocks a reference could hold.
- **d-imperative-form** — *why:* narrated instructions read as description, not direction; the agent follows commands better. *how-to-verify:* judge whether the body addresses the agent in the imperative.
- **d-explain-why** — *why:* an agent that understands a rule follows it more reliably; all-caps shouting is noise the agent tunes out. *how-to-verify:* judge whether non-obvious steps carry a one-line rationale and whether emphasis is reserved for the load-bearing constraint.
- **d-flowcharts-justified** — *why:* a flowchart of linear steps is decoration that costs context. *how-to-verify:* for each diagram, judge whether the control flow has real branches the prose can't carry.
- **d-examples-quality** — *why:* a gallery of half-examples teaches less than one worked example. *how-to-verify:* judge whether each example earns its place.

---

## Totals & group-skip rules

The check counts and the pass floor are stated **once**, in this file's opening line, and asserted by `skill-eval-check.sh --selftest` (opening-line counts vs table reality; floor = gated − 4) — they are deliberately not restated here. The `[D]` checks, all gated and all implemented in `tools/skill-eval-check.sh`: `a-frontmatter-present`, `a-name-present`, `a-name-lowercase-hyphen`, `a-name-len`, `a-name-matches-dir`, `a-desc-present`, `a-desc-len`, `c-body-size`, `c-references-dir-name`, `c-references-one-level`, `c-reference-toc`, `c-portable-paths`, `c-asset-layout`, `d-platform-adaptation`, `d-learnings-load-line`, `d-capture-learnings-phase`, `d-progress-tracking`, `e-scripts-dir`, `f-cc-user-invocable`, `f-codex-sidecar`, `g-plan-grep-clean`, `i-hint-contract-only`, `i-nl-sugar-marked`, `j-phase-refs-resolve`. Every other gated check is `[J]` (reviewer subagent), and the final section's checks are advisory `[J]` — evaluated and reported, never counted toward the pass floor. This table set is the baseline contract; `/execute` may refine prose and adjust an individual `[D]`/`[J]` where clearly mis-tagged, but must keep the gated set at or above the pass floor stated in the opening line, the bijective patterns↔eval mapping (FR-72), and every `[D]`-tagged check implemented in the script (FR-71). The group-skip rules (no `scripts/` → skip 10.E; no `reference/` → 10.C reference-only checks N/A; `--target generic` → skip 10.F; no `03_plan.{html,md}` / non-pmos-pipeline skill → skip 10.G; no gates/rubrics → 10.H N/A; missing repo-root lint → lint-backed checks skip with a `WARN:`) are part of the contract — see the top of this file.

## Cross-reference to skill-patterns.md

Every check above — gated and advisory alike — names exactly one `skill-patterns.md`
§-rule in its `§` column, and every §-rule there lists ≥1 `check_id` here in its
closing `Checks:` line. The bijection is asserted by `skill-eval-check.sh --selftest`
(every `[D]` check ↔ a code branch, every check names a `§[A-Z]` rule, and the
opening-line counts equal the table reality) plus a `/verify` structural check
(FR-72). Change a rule there and the matching check here in the same commit.
