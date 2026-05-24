# Changelog

## pmos-toolkit 2.54.0 — 2026-05-24

### What's new

- **`/prototype-sdlc <seed>`** — new pipeline orchestrator that runs the **discovery half** of the SDLC only: `requirements → grill → creativity → spec → wireframes → prototype`, then stops. No `/plan`, `/execute`, `/skill-eval`, `/verify`, or `/complete-dev` runs. The branch + worktree are left intact for the user to extend (edit `state.yaml.pipeline_mode` from `prototype` → `feature` and `/feature-sdlc --resume`) or discard. Implemented as a thin alias (24-line SKILL.md) over a new `prototype` subcommand on `/feature-sdlc`. Reuses all of `/feature-sdlc`'s state, resume, worktree, gate, compact-checkpoint, non-interactive, `--minimal`, `--no-worktree`, `--tier N`, and `--format` machinery. In `prototype` mode `/wireframes` and `/prototype` are **hard, always-run** (no gate) — they are the deliverable; `/spec` is reordered to run *before* `/wireframes` so the wireframes consume the technical design. Use cases: stakeholder-walkable prototype before committing to implementation; design exploration with the same resumable pipeline as `/feature-sdlc`.
- **State schema v5** — additive: `pipeline_mode` enum widens to include `prototype`; new mode-conditional `phases[]` membership. v1–v4 files auto-migrate on read via the `v4 → v5` block (2 steps, idempotent).

### Breaking changes

None. `/feature-sdlc skill …`, bare `/feature-sdlc <idea>`, `/skill-sdlc`, `/feature-sdlc list`, and all existing flags continue to behave identically. The Phase 0 token-1 disambiguation grows `prototype` as a recognised selector, but only when it is the literal first token AND followed by a flag, a single quoted arg, or nothing — multi-word seeds starting with the word "prototype" (e.g., `/feature-sdlc prototype this in detail`) continue to be parsed as `feature` mode with that text as the seed.

### Internal

- The new alias was authored end-to-end via `/feature-sdlc skill` (the `/skill-sdlc` alias), `--minimal` ceremony, Tier 2. Requirements/spec/plan artifacts ship under `docs/pmos/features/2026-05-24_prototype-sdlc-skill/`.

---

## pmos-toolkit 2.51.0 — 2026-05-23

### What's new

- **Multi-plugin marketplace migration.** The repo is now `pmos-skills` — a multi-plugin marketplace structured for future `pmos-*` plugins under `plugins/<name>/`. `pmos-toolkit` is the first (and currently only) hosted plugin. Install via `/plugin marketplace add maneesh-dhabria/pmos-skills`; cached `v2.49.0` installs of the old `pmos-toolkit` repo continue read-only.
- **Per-plugin manifests + namespaced tags.** Each plugin owns its own `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json`; top-level `.claude-plugin/marketplace.json` and `.codex-plugin/marketplace.json` mirror the per-plugin versions. Release tags now follow `<plugin>/v<semver>` (e.g., `pmos-toolkit/v2.51.0`). Pre-existing `v2.x` / `pmos-toolkit-v2.x` tags are preserved as-is (FR-43); new tags MUST be namespaced.
- **`scripts/sync-shared.sh`** — sanctioned mutation path for cross-plugin `_shared/` substrate sync; invoked as `scripts/sync-shared.sh --from=<plugin>`.
- **`.githooks/pre-commit` drift hook** — fails commits when `_shared/` substrate diverges across plugins; trivially passes when only one plugin exists (FR-31).
- **`.githooks/pre-push` 4-manifest invariant + tag-format hook** — enforces `<plugin>/v<semver>` tag format, tag-version-match, and version-bump-on-skill-content-change. Handles empty-remote pushes (fixed during cutover) and skips `refs/tags/*` per-ref validation for historical tags (FR-43).
- **`/complete-dev --plugin <name>`** — required flag (auto-detect from diff for single-plugin diffs; refuses ambiguous multi-plugin diffs; substrate-only changes trigger the "which plugin's next release?" prompt). 4-manifest bump in one commit; namespaced tag; pushes to all configured remotes (currently 2: origin = GitHub `pmos-skills`, gitlab-mirror = GitLab `pmos1/pmos-skills`; `work-mirror` deferred until the work account is configured).
- **`tests/scripts/assert_*.sh`** — 20 shell-assertion tests covering sync-shared (4), pre-commit drift (2), pre-push (6 incl. empty-remote + legacy-tag-skip regressions), /complete-dev (3), CLAUDE.md generalization (1), release-policy section (1), hardcoded-path guard (1), marketplace-json 3-way invariant (1), and skill-substrate-refs (1).

### Breaking changes

- **Repo URL.** The canonical install URL is now `maneesh-dhabria/pmos-skills`; the old `maneesh-dhabria/pmos-toolkit` repo will be archived + privatized post-install-verify. New installs MUST flow through `pmos-skills`.
- **Tag format.** New release tags follow `<plugin>/v<semver>`. Tooling consuming tag names (e.g., release-note scripts) must accept both legacy (`v2.x`, `pmos-toolkit-2.x`) and namespaced (`pmos-toolkit/v2.x`) shapes.
- **`/complete-dev` invocation.** The `--plugin <name>` flag is required (auto-detected for single-plugin diffs); ambiguous multi-plugin diffs are refused. Prior single-plugin-implicit calls no longer work.



### What's new

- **`/ideate`** — new standalone utility that turns a fuzzy idea into a structured, pressure-tested one-page brief in ~10–15 minutes. Runs a 3-phase loop: **Frame** (HMW + JTBD + success signal + idea-type classification — `new` / `extend` / `fix`), **Expand** (auto-picks 2 techniques from {SCAMPER, Crazy 8s, First Principles, Analogous Inspiration, HMW riffs, Premortem-as-generator, Inversion} based on idea-type, generates 8–15 distinct one-line variants, lets the user pick 1–3 finalists), **Pressure-test** (always-on batch — premortem failure-modes table + Munger inversion bullets + assumption-mapping table; cross-cutting decision table when multiple finalists). Optional Phase 4 Refine. Writes a per-idea HTML artifact (markdown sidecar when `output_format=both`) to `{docs_path}/ideate/{YYYY-MM-DD}_<slug>.html` via the `_shared/html-authoring/` substrate; phase cursor stored in a `<meta name="pmos:ideate-phase">` tag for `--resume <path>` recovery. Standalone — does not load workstream context. Sits **outside** the requirements→spec→plan pipeline (it's pre-requirements) but suggests explicit handoffs in Next Steps (`/requirements`, `/grill`, `/backlog add`) by idea-type. Reference material in `reference/techniques.md`, `reference/idea-type-classifier.md`, `reference/pressure-test-battery.md`, `reference/slug-derivation.md`, `reference/artifact-template.html`.

### Breaking changes

None.

### Internal

- The skill was authored end-to-end via `/feature-sdlc skill` (the `/skill-sdlc` alias); requirements/spec/plan/skill-eval/verify artifacts ship under `docs/pmos/features/2026-05-13_ideation/` as the worked-example reference for future skill-mode runs.

---

## pmos-toolkit 2.44.0 — 2026-05-13

### What's new

- **`/plan` — vertical-slice enforcement.** `/plan` now teaches and enforces vertical-slice task decomposition end-to-end. A new Phase 3 sub-section **§Vertical-Slice Decomposition** defines the rule (each task cuts through every layer it needs to deliver one user-observable behavior), the **tracer-bullet T1 convention** (the narrowest end-to-end path that proves the architecture works, with risky unproven integration points forced inside T1's slice), the *many thin over few thick* preference, the per-slice done-when ("could you ship just this slice?"), and the refactor/spike/css-only/config exception path declared via a new `**Slice shape:**` task field. The previously-horizontal `## Phase N` worked example (Schema and Migration → API Layer) is pivoted to a vertical-slice example (Phase 1: tracer bullet — single record end-to-end / Phase 2: widen to list + filters). Phase 2 deep-code-study gains a new step 7 (*Identify the tracer-bullet candidate*) that earmarks T1's slice at discovery time. Phase 4 review gets a new structural-checklist item 13 enforcing vertical-slice shape with concrete finding conditions (single-layer cut with no declared exception → finding; horizontal phase names → finding; T1 not end-to-end → finding). Anti-Patterns names "decompose by layer" as forbidden. The change is additive — no existing FR, sidecar contract, or tier-gate rule is replaced.
- **`/plan` — `## Track Progress` section.** Adds the standard `## Track Progress` heading directing agents to create one task per phase. (Co-shipped remediation for a pre-existing `/skill-eval` finding surfaced during this release.)

### Breaking changes

None.

### Migration

None — additive. Existing plans without `**Slice shape:**` fields are interpreted as `vertical` (the default); Phase 4 review will surface a finding only when a task is a pure single-layer cut with no declared exception.

### References

- `docs/pmos/features/2026-05-13_plan-vertical-slices/01_requirements.html`
- `docs/pmos/features/2026-05-13_plan-vertical-slices/02_spec.html`
- `docs/pmos/features/2026-05-13_plan-vertical-slices/03_plan.html`
- Inspiration: [mattpocock/skills `to-issues`](https://github.com/mattpocock/skills/blob/main/skills/engineering/to-issues/SKILL.md) — "each issue is a thin vertical slice that cuts through ALL integration layers end-to-end."

---

## pmos-toolkit 2.36.0 — 2026-05-11

### What's new

- **`/survey-design`** — new standalone utility that turns a rough research intent (or an existing survey) into a fielded-ready survey. It interprets the design variables (audience, time budget, mode generative/evaluative/hybrid, optional question cap), generates a sectioned `survey.json` applying baked-in survey-methodology best practices and avoiding a built-in anti-pattern catalog (A1–E6, with detection signals), then runs a reviewer-critique pass and a simulated-respondent friction walk — each surfacing findings as batched, structured `Fix / Modify / Skip / Defer` questions — and renders a substrate-compliant `survey.html`, a standalone fillable `preview.html` (works on `file://`), a viewer `index.html`, and per-stage commits. Phase 8 emits import files for **Typeform** (`typeform.json` Create-API body), **SurveyMonkey** (`surveymonkey.json` + a plain-text paste fallback), and **Google Forms** (`build-google-form.gs` Apps Script), with unsupported types mapped down and every downgrade documented in `export/README.md`. Reference material lives in the skill's `reference/` directory (`survey-best-practices.md`, `question-antipatterns.md`, `platform-export.md`), loaded on demand.

### Breaking changes

None.

### Migration

None — additive. New skill auto-discovered from `plugins/pmos-toolkit/skills/`.

## pmos-toolkit 2.26.0 — 2026-05-08

### What's new

- **`/plan` v2** — tier-aware plan generation. Tier-1 bug-fixes ship as ≥1 task with reduced TN (no Decision-Log floor); Tier-3 features get mandatory Risks, ≥3 Decision-Log entries, and 2–4 review loops capped at 4 (FR-40). Plan documents now emit a YAML frontmatter contract (`tier`, `type`, `feature`, `spec_ref`, `requirements_ref`, `date`, `status`, `commit_cadence`, `contract_version`) so `/execute` can read them deterministically.
- **Stack-aware verification** — new `_shared/stacks/{npm,pnpm,yarn-classic,yarn-berry,bun,python,rails,go,static}.md` library. `/plan` v2 detects stack signals from manifest files and inlines the stack's lint / test / API-smoke commands into per-task verification steps (FR-10, FR-13). The 5 JS-stack files share a `## Common Preamble` enforced byte-equivalent by `tools/lint-js-stack-preambles.sh`.
- **Platform-neutral templates** — new `_shared/platform-strings.md` provides per-platform phrasing (claude-code, gemini, copilot, codex) for closing offers and skill-invocation refs.
- **Per-task contract fields** — every plan task now emits `**Depends on:**`, `**Idempotent:**`, `**Requires state from:**`, `**TDD:** yes — new-feature|yes — bug-fix|no — <reason>`, `**Data:**` alongside the existing `**Goal:**`/`**Spec refs:**`/`**Files:**`/`**Steps:**`. `/execute` v2 consumes them; missing optional fields trigger per-task `WARN:` lines on stderr (back-compat shim per FR-110).
- **Convergent review loops** — `/plan` v2 caps review at 4 loops; Loop 2 dispatches a fresh blind subagent (5-minute timeout, nested-subagent guard via `PMOS_NESTED=1`). Findings are auto-classified low-risk vs high-risk (default ambiguous → high-risk). Skip List persists across runs at `03_plan_skip-list.md` with hash-keyed entries.
- **Sidecar contracts** — review log accumulates at `03_plan_review.md`; non-interactive runs write `03_plan_auto.md` and on halt `03_plan_blocked.md`. All sidecar writes use same-directory-tempfile + `mv` rename for atomicity.
- **Defect handoff (E10)** — `/execute` v2 writes `03_plan_defect_<task-id>.md` on a planning defect; `/plan --fix-from <task-id>` consumes it; `/execute` deletes the defect file when the previously-defective task succeeds.
- **Spec frontmatter contract** — `/spec` Tier 1/2/3 templates emit `tier`/`type`/`feature`/`date`/`status`/`requirements`. Auto-derived kebab-case anchors at H2/H3 (collision dedupe via `-2/-3/...` suffix) so `/plan` Phase 4 can hard-fail on broken `02_spec.md#anchor` refs (FR-31a) and detect spec drift (FR-31b).
- **`/backlog` `type` enum extended** — adds `enhancement`, `chore`, `docs`, `spike` to the existing `feature`/`bug`/`tech-debt`/`idea`. Inference heuristics extended with keyword tables for the new values.
- **Operational modes** — `/plan` v2 supports Edit / Replan / Append modes plus `--non-interactive` (FR-61, FR-61a halt protocol with exit code 2 + `03_plan_blocked.md`).

### Breaking changes

- **None at runtime.** Back-compat shim in `/execute` v2 warns on missing optional task fields rather than failing (decision P5 / FR-110). `/plan` v1 plans still execute.
- The `/spec` Phase 7 promotion now `Edit`s the frontmatter `status: Draft` line (was the prose `**Status:** Draft` line). Specs written by /spec v1 need their `**Status:** Draft` line manually moved into frontmatter on next /spec re-run.

### Migration

- No code migration required. First run of /plan v2 against a /spec v1 spec emits a frontmatter-validation refusal — re-run /spec to re-emit with v2 frontmatter, then /plan.

---

## pmos-toolkit 2.24.0 — 2026-05-08

### Added

- **`/update-skills`** — new pipeline enhancer that turns skill feedback (raw text or `/retro` paste-back) into shipped changes end-to-end. Parses findings, critiques each against the current skill source, gets per-finding keep/drop approval via the Findings Protocol, then runs `/requirements -> /spec -> [/grill] -> /plan -> /execute -> /verify` per affected skill (auto-tiered, sequential, halt-on-failure, resume-from-triage-doc).

### References

- `docs/pmos/features/2026-05-08_update-skills-skill/02_spec.md`
- `plugins/pmos-toolkit/skills/update-skills/SKILL.md`

## pmos-toolkit 2.23.0 — 2026-05-08

### Added

- **`/complete-dev`** — new 19-phase end-of-development orchestrator that follows `/verify`. Merges feature work into main, cleans up worktrees, detects deploy norms (CLAUDE.md / package.json / Makefile / CI / plugin manifest), captures diff-scoped learnings, refreshes the README skill inventory, runs `/changelog`, bumps paired plugin manifests, tags the release, and pushes sequentially to every configured remote with halt-on-origin-failure recovery. Supersedes the legacy `/push` skill. Terminal stage of the `requirements -> spec -> plan -> execute -> verify -> complete-dev` pipeline.

### References

- `plugins/pmos-toolkit/skills/complete-dev/SKILL.md`

## pmos-toolkit 2.22.0 — 2026-05-08

### Breaking changes

- **`/msf` removed**, replaced by two purpose-built skills:
  - `/msf-req` — MSF analysis on a requirements doc (recommendations-only).
  - `/msf-wf` — MSF + PSYCH analysis on a wireframes folder; pass `--apply-edits` to apply user-approved HTML edits inline (typically invoked by `/wireframes` Phase 6).
- **PSYCH scoring moved** from `/wireframes` Phase 6 into `/msf-wf`. `/wireframes` Phase 6 is now a thin wrapper that delegates to `/msf-wf --apply-edits` and aborts on non-zero return.
- **PSYCH artifact unified.** Pre-2.22 PSYCH wrote to a separate `psych-findings.md`; from 2.22 PSYCH lives as Section B of `msf-findings.md`. `reference/psych-output-format.md` moved from `/wireframes/reference/` to `/msf-wf/reference/`.
- **Removed flags:** `--wireframes`, `--skip-psych`, `--default-scope`. The only flag on the new skills is `--apply-edits` (on `/msf-wf` only).
- **Findings doc location:** moved from `docs/msf/YYYY-MM-DD-<feature>-msf-analysis.md` to `<feature_folder>/msf-findings.md` for pipeline runs (or `~/.pmos/msf/YYYY-MM-DD_<slug>.md` for ad-hoc).

### Migration

- Anywhere you wrote `/msf <req-doc>`, write `/msf-req <req-doc>`.
- Anywhere you wrote `/msf <req-doc> --wireframes <folder>`, write `/msf-wf <folder>` (drop `--wireframes` — the folder is now the positional argument).
- `/wireframes` end-to-end behavior unchanged from the user's perspective; PSYCH still runs in Phase 6, just delegated. If `/msf-wf` errors mid-run, `/wireframes` aborts (FR-39) — re-run `/msf-wf` manually before continuing with `/spec`.
- Standalone `/msf` runs that wrote back to the source doc no longer happen — both replacement skills are recommendations-only by default; only `/msf-wf --apply-edits` mutates files (and only HTML wireframes, never the requirements doc).

### Internal

- New shared module: `plugins/pmos-toolkit/skills/_shared/msf-heuristics.md` — persona-alignment template, M/F/S 24 considerations, executive-summary template (referenced by both `/msf-req` and `/msf-wf`).
- `/wireframes/SKILL.md` trimmed by ~150 lines (Phase 6 PSYCH walkthrough + Phase 7 inline `/msf` invocation removed).
