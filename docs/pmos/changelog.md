# Changelog

## 2026-05-24 — pmos-toolkit 2.55.0: `/wireframes` Phase 7 — Figma-like canvas view aggregating every screen

`/wireframes` now always emits a Figma-like `canvas.html` viewer alongside the per-device wireframe files. Every screen of every device renders on an infinite pan/zoom surface, with flow arrows derived from DESIGN.md user journeys and screens drag-positionable on the canvas. The curated layout persists to a `canvas.json` sidecar that round-trips across re-runs — drag a screen, click **Save layout**, drop the downloaded JSON next to the existing one, commit. Next time anyone opens the canvas they see the curated arrangement.

(Skips 2.54.0 — that version was concurrently shipped for `/prototype-sdlc`; this release rides 2.55.0 to avoid the collision. See the 2026-05-13 origin-drift learning in `~/.pmos/learnings.md`.)

**What's new**

- New **Phase 7: Canvas Aggregation** in `/wireframes`, between Phase 6 (MSF + PSYCH) and Phase 8 (Spec Handoff). Always-on — no flag, no gate.
- New substrate at `plugins/pmos-toolkit/skills/wireframes/assets/canvas/`: `canvas-template.html` (the viewer), `build-canvas.js` (the aggregator), `extract-screens.js` (screen discovery).
- New reference at `plugins/pmos-toolkit/skills/wireframes/reference/canvas-aggregation.md` — full Phase 7 contract, `canvas.json` schema (v1), screen-extraction rules, DESIGN.md journey parser, auto-layout algorithm, merge semantics.
- Canvas viewer dependencies: `panzoom@4.5.1` and `leader-line-new@1.1.9` loaded via jsdelivr with SRI hashes. Single-file HTML; works under `file://` once cached.

**Why it matters**

Before this release, design crits required scrolling back and forth through one stacked HTML file per device, mentally reconstructing the flow each time. The canvas view lays the entire feature out spatially so stakeholders can compare onboarding screens side-by-side, spot inconsistencies across devices, and walk the journey end-to-end without leaving one viewport. The arrows make user-flow structure visible at-a-glance instead of buried in DESIGN.md prose.

**Behavioural notes**

- Existing per-device wireframe files are unchanged — the canvas is additive. Per-device files remain the source of truth; the canvas embeds them as sandboxed iframes (`allow-scripts allow-same-origin` so wireframe state-switchers still work).
- Idempotent on re-run: user-curated `(x, y)` positions in `canvas.json` are preserved; newly-added screens (post-regen) are auto-laid-out below the existing layout; removed screens drop out.
- Bootstrap-only mode (`/wireframes --bootstrap-design-only`) does **not** run Phase 7 — by-design, because no per-device files exist in that mode.
- Missing DESIGN.md degrades gracefully: screens still render; arrows array is empty; a warning is logged to chat.
- Smoke-tested in a real browser: 4 wireframes render via iframes; Fit-to-screen, Reset zoom, drag, and Save-layout all work; 0 console errors.

**Files changed**

- `plugins/pmos-toolkit/skills/wireframes/SKILL.md` — frontmatter description + new Phase 7 section + Phase 5 / Phase 8 cross-references.
- `plugins/pmos-toolkit/skills/wireframes/assets/canvas/` — new substrate directory (3 files).
- `plugins/pmos-toolkit/skills/wireframes/reference/canvas-aggregation.md` — new reference.
- `plugins/pmos-toolkit/skills/wireframes/reference/{eval-rubric,components-md-spec,style-extraction,screenshot-ingestion,design-md-spec,html-template}.md` — added `## Contents` ToC blocks to satisfy `c-reference-toc` skill-eval check (pre-existing failure).

## 2026-05-23 — pmos-toolkit 2.53.0: `/design-crit` gains `--depth` flag; lifts silent 12-finding cap

`/design-crit` previously truncated reviewer output and disposition prompts at a hard 12 high+medium findings per run. On complex multi-screen audits, the 13th-Nth medium-severity finding silently became "unsurfaced" — logged to `eval-findings.json` but never reaching the user as an actionable disposition. This release adds explicit depth control:

- **New `--depth shallow|standard|deep` flag** (default: unset → triggers adaptive Phase 4 gate). `shallow` caps at 5, `standard` caps at 12 (current behavior — no regression), `deep` lifts the cap entirely (reviewer-side safety bound of 50).
- **Adaptive Phase 4 disposition gate** fires when `--depth` was not set on CLI and the reviewer returned >5 findings. Single AskUserQuestion: "Reviewer surfaced N findings. Top 5 / Top 12 (Recommended) / All N?". In `--non-interactive` mode, auto-picks Top 12 (standard) per the canonical Recommended-pick contract; the deferred choice is logged to the OQ buffer.
- **No silent capping.** After dispositions, `/design-crit` now prints `<N> surfaced, <M> unsurfaced — see eval-findings.json` in every mode. A new anti-pattern entry codifies the rule.
- Fixup: added a Contents ToC to `reference/eval.md` to satisfy the `c-reference-toc` skill-eval check (pre-existing failure unrelated to this change set).

## 2026-05-23 — pmos-toolkit 2.52.1: parameterize HTML substrate attribution

Small refactor to support multi-plugin reuse of `_shared/html-authoring/`:

- The `template.html` "attribution" string is now parameterized so sibling plugins (e.g. `pmos-learnkit`) can reuse the substrate without leaking pmos-toolkit's name into their HTML output. Behavior is unchanged for existing callers; the default still renders pmos-toolkit's attribution.
- Added `_shared/html-authoring/tests/template-bytestable.sh` to lock the byte-stable template invariant under the new parameterization.

## 2026-05-23 — pmos-learnkit 0.1.0: new plugin shipping /primer

First release of the **pmos-learnkit** plugin — a companion to `pmos-toolkit`
focused on verified-source, audience-shaped teachable artifacts.

- New `/primer <topic>` skill — researches a topic from primary sources,
  drafts an audience-shaped HTML primer (`senior-pms` or `all-pms`), and
  self-evaluates against a binary rubric before delivering. Use to ramp up
  before a meeting, a scope review, or a doc review when you need citations
  you can trust.
- Audience presets shape depth, jargon, and examples — see
  `reference/audience-presets.md`.
- Source-floor enforcement prefers primary sources over secondary commentary;
  surfaces degraded-source warnings when WebFetch / context7 are unavailable.
- Curator-lens pass biases drafts toward non-obvious angles before final
  evaluation.
- Output: single self-contained HTML artifact (Markdown sidecar when
  `output_format: both`).

### References

- [Requirements](features/2026-05-23_pmos-learnkit-primer/01_requirements.html)
- [Spec](features/2026-05-23_pmos-learnkit-primer/02_spec.html)
- [Plan](features/2026-05-23_pmos-learnkit-primer/03_plan.html)
- [Verify report](features/2026-05-23_pmos-learnkit-primer/verify/2026-05-23-review.html)

## 2026-05-23 — pmos-toolkit 2.52.0: /feature-sdlc gains an optional /ideate phase before /requirements

`/feature-sdlc` now slots an **optional Phase 1.5 `/ideate` gate** between init-state and `/requirements`, for the cases where a user has a half-formed idea and `/requirements` is the wrong starting point. The gate auto-detects fuzzy-vs-formed via a deterministic heuristic (`reference/fuzzy-idea-detection.md`); a formed seed silently skips with a log line, a fuzzy seed surfaces a single Run /ideate (Recommended) / Skip prompt. When `/ideate` runs and the resulting brief looks Tier-3 (≥3 user-journey sections OR ≥5 pressure-test findings OR `--tier 3` explicit), the orchestrator auto-chains `/grill --deep` on the brief before handing off to `/requirements`. The brief lands in the feature folder as `00d_ideate.html` (+ optional `00d-grill_ideate.html`) and is forwarded to `/requirements` via `[ideate-brief: …]` and `[ideate-grill: …]` first-line seed lines.

### What's new

- **Phase 1.5 `/ideate` gate** (soft, runs in `feature` + `skill-new` modes only; mode-conditional by-design non-presentation in `skill-feedback` — the triage doc is already a structured seed).
- **`reference/fuzzy-idea-detection.md`** — 5-rule deterministic classifier (doc-attached → formed; ≥80 words → formed; vagueness markers → fuzzy; <20 words → fuzzy; else formed). Uses the portable word-boundary pattern `($|[^A-Za-z])` per the BSD-awk learning; no LLM judgement.
- **`--no-ideate` flag** — unconditional bypass; records `status: skipped-flag`.
- **Tier-3 auto-`/grill --deep` chain** — disjunctive heuristic OR explicit `--tier 3`; logs the reason; never silent.
- **`description` frontmatter** picks up three fuzzy-idea triggers — "I have a half-formed idea", "this is a rough idea", "I want to brainstorm this end-to-end".

### Schema (state.yaml, v4 additive)

- `phases[]` for `feature` + `skill-new` gains an `ideate` entry between `init-state` and `requirements` (skill-feedback omits it). Fields: `seed_shape ∈ {fuzzy, formed, null}`, `ideate_tier_estimate ∈ {null, 1, 2, 3}`, `grill_deep_chained: bool`, `grill_deep_artifact_path`. Status enum gains `skipped-formed` (classifier-skip) and `skipped-flag` (`--no-ideate`).
- **Back-compat:** no `schema_version` bump. Pre-2.52.0 state files have no `ideate` entry — the resume cursor scans whatever phases are present and advances past missing entries (same shape as the pre-2.34.0 `msf-req`/`simulate-spec` elision).

### Eval

- 18/19 [D] checks pass. One accepted residual: `e-scripts-dir` (`tools/` should be `scripts/` per `skill-patterns.md §E`) — multi-file refactor deferred (rename + sed all references across SKILL.md / reference / fixtures).
- Two pre-existing eval failures (`c-reference-toc` on `failure-dialog.md`; `c-portable-paths` on didactic-example absolute paths in `skill-patterns.md` + `state-schema.md`) folded into the same change as cheap in-skill fixes — TOC added; `${REPO_PARENT}` / `${BAD}` placeholders bypass the regex on what are intentionally negative examples.

### Anti-pattern #14 added

Skipping the `/ideate` gate without running the fuzzy-detect classifier first. `skipped-formed` is allowed only because the classifier ran. The presented gate (when `seed_shape: fuzzy`) is non-bypassable interactive; defers per canonical block non-interactive. Tier-3 grill-chain is similarly deterministic — disjunctive heuristic OR `--tier 3`, no LLM gut-feel.

## 2026-05-22 — pmos-toolkit 2.50.0: /architecture deep-pass v2 (discovery-capable deepening + signal-hygiene + cross-module detectors + triplet output)

Major revision of `/architecture` shipped via `/feature-sdlc skill --from-feedback` (skill-feedback mode, Tier 3). 24 tasks (T1–T24 + TN) replayed onto an in-flight rewrite of the audit harness: a new opt-in deepening pass classifies modules as deep / shallow / leaky with substring-grep-verified evidence; monorepo fan-out, since/baseline diffing, and L3-config scaffolding are now first-class flags; output is an HTML+MD+JSON triplet under `{docs_path}/architecture/` rather than stdout-JSON. The schema break (`severity:` → `disposition:`) is intentional and not back-compatible with v1 baselines — see "Breaking" below. One eval residual accepted: skill name `architecture` is a bare noun, not a verb/gerund per `a-name-verb-or-gerund`; rename would cascade through manifests, README, every fixture `.assert`, and the `/architecture` slash command itself — deferred as a future feature.

### What's new

- **`--deep` deepening pass** classifies modules as deep / shallow / leaky with substring-grep-verified evidence. Subagent-driven; runtime-gated via Task-tool marker — `--deep` is a no-op when no subagent runtime is available (records `skipped_reason: no_tool_use_runtime` in the JSON sidecar). Module classifications carry inline rationale + at least one verbatim code citation.
- **`--monorepo` fan-out** runs the audit once per detected stack root rather than at repo root, so polyglot trees with separate TS/Python/Vue subtrees get per-stack findings without false-positive cross-pollination.
- **`--since <ref>` + `--baseline <path>` AND-intersect** filter findings to those that are simultaneously new since `<ref>` AND absent from `<path>`'s baseline. Designed for "did this PR regress us?" gating.
- **`--scaffold-l3`** writes `.pmos/architecture/principles.yaml` seeded with idiomatic exemptions (Typer/Click decorators, framework conventions) so L3 overrides start from a sensible baseline, not from scratch.
- **HTML+MD+JSON triplet output** under `{docs_path}/architecture/{date}_<slug>.{html,md,json}` replaces stdout-JSON. The HTML view renders Must-Fix / Should-Fix / Won't-Fix sections with kebab-case `<h2>`/`<h3>` IDs and a `godmodule_candidates` table from the deepening pass; the MD sidecar is a regenerated companion; the JSON is the machine-readable artifact.
- **Phase 4.5 deepening pass** is documented inline in `SKILL.md` with the full subagent dispatch contract (return shape, validation rules, size caps).
- **New reference docs:** `deepening-vocabulary.md` (deep / shallow / leaky definitions + indicative anti-patterns), `l1-rationales.md` (per-rule rationale + source citation for U001–U011), `gap-map-rationale.md` (per-rule rationale for `delegate_to:` assignment).
- **`scripts/cycle-py.py`** ships a Python cross-file cycle detector (the missing peer to `dependency-cruiser` for TS); the L2 Python pass now includes cycle findings, not just ruff complexity signals.
- **`## When NOT to use`** section added to `SKILL.md` per `skill-patterns §D` (style-only lint should use `ruff`/`prettier` directly; docs-only repos / single-file scripts / repos missing `jq`+`python3`+`node`).

### Breaking

- **Schema: `severity:` → `disposition:`.** Every finding now carries `disposition ∈ {must-fix, should-fix, wont-fix}` rather than a numeric/textual severity. L3 principles.yaml files using the legacy `severity:` key are rejected at load with exit 64 and the verbatim message `legacy 'severity:' key … rename to 'disposition:'`. **v1 baseline JSONs do NOT interop with v2** — re-baseline against a v2 run before relying on `--baseline`.
- **ADR machinery removed.** The `--no-adr` flag is deleted; no ADRs are written under `docs/adr/`. The architecture audit is read-mostly: it emits the triplet and nothing else. Repos that relied on the v1 ADR-write behaviour need to capture decisions via `/spec` or manual ADRs instead.
- **Stdout-JSON replaced with the triplet.** Pipelines that consumed `architecture audit … | jq …` from stdout must instead read `{docs_path}/architecture/{date}_<slug>.json`. Stdout is now empty; stderr emits a single human summary line of the documented shape.
- **Skill layout: `tools/` → `scripts/`** per `skill-patterns §E`. `package.json` colocates with `scripts/` (`scripts/package.json`); `npm install` lands at `scripts/node_modules/`; the `.depcruise` fallback `cwd` is `scripts/`, not the skill root. External callers shelling into `$SKILL_DIR/tools/...` must rewrite to `$SKILL_DIR/scripts/...`.

### Known follow-ups

- **`a-name-verb-or-gerund` eval residual accepted.** Skill name `architecture` is a bare noun (rule expects a verb/gerund such as `audit-architecture`). Rename would cascade through plugin manifests, README rows, CLAUDE.md references, every reference doc, all fixture `.assert` files, and the `/architecture` slash command itself — deferred as a separate future feature. Surfaced in this release's `/verify` report and recorded in `state.yaml.accepted_residuals[]`.
- **Book-companion regression deferred.** Plan §Done-when requires running `/architecture audit backend/` on a pinned-SHA clone of `book-companion` and confirming `jq '.findings | length' ≤ 120` (down from v1's 586) AND `--monorepo --deep` yielding ≥3 non-deep candidates. User disposition is post-release follow-up; verify manually before relying on the deep-pass numbers in production reports.

### References

- [Feature folder](docs/pmos/features/2026-05-13_architecture-deep-pass/)
- [Spec](docs/pmos/features/2026-05-13_architecture-deep-pass/02_spec.html)
- [Plan](docs/pmos/features/2026-05-13_architecture-deep-pass/03_plan.html)
- [Verify report](docs/pmos/features/2026-05-13_architecture-deep-pass/verify/2026-05-22-review.html)
- [Skill source](plugins/pmos-toolkit/skills/architecture/)

## 2026-05-15 — pmos-toolkit 2.49.0: /readme — hardening pass against /retro feedback (rubric portability, reviewer-subagent contract, FR-V-2 polish-hook)

Skill-feedback revision of `/pmos-toolkit:readme` shipped via `/feature-sdlc skill --from-feedback` (skill-feedback mode, Tier 2). Ten surgical changes (T1–T10) against the existing `/readme` substrate to close gaps surfaced by a prior `/retro` against the audit pipeline: rubric script BSD-awk portability, deterministic rubric schema (`type:` field), reviewer-subagent contract with parent-side validation, 4th simulated-reader persona + 5-Task dispatch, audit close-out mode-branch, FR-V-2 `Suggest:/polish` unconditional hook, and four new regression fixtures registered under the run-all harness. Two known structural residuals from Phase 6a (skill name `readme` is a noun — not verb/gerund per `a-name-verb-or-gerund`; SKILL.md body 505 lines in the 501–800 reviewer-judge band per `c-body-size-judge`) accepted as out-of-scope for this audit-fix revision; both surfaced loudly in the `/verify` report. The `/readme` skill at `plugins/pmos-toolkit/skills/readme/SKILL.md` remains the canonical path (no rename, no relocation).

### What's new

- **`scripts/rubric.sh` — BSD-awk portability + selftest drift-guard** (T1, `378064a`). Replaced GNU-awk-only `\b` word-boundary at lines 40 and 119 with the portable boundary class `($|[^A-Za-z])`. Selftest now grep-lints every `awk '...'` block in the script and hard-fails on `\b` regressions; explicit `/usr/bin/awk` fork added to the install-or-quickstart fixture path. macOS users on default `/usr/bin/awk` now get deterministic rubric runs.
- **`reference/rubric.yaml` — `type:` field + cross-cutting [D] check + `--validate-yaml` flag** (T2, `471d181`). Every rubric row now declares `type: [D]` (deterministic, scored by `scripts/rubric.sh`) or `type: [J]` (judge-only, scored by reviewer subagent). New cross-cutting [D] check asserts every row carries a `type:`; `--validate-yaml` flag prints `missing type` and exits non-zero on omission so CI catches schema drift. Audit-mode behaviour unchanged ([D] rows only).
- **`reference/reviewer.md` + `[J]` rows + `READMER_REVIEWER_STUB` env path** (T3, `6890ae7`). New 106-line `reference/reviewer.md` carries the [J] rubric rows + the reviewer-subagent dispatch contract (cites `/skill-eval` FR-44 shape). `READMER_REVIEWER_STUB=<path>` env var substitutes a deterministic stub for the live Task-tool dispatch in tests — reusable seam for any pmos skill that dispatches a reviewer.
- **`scripts/_reviewer_validate.sh` — parent-side validation + 3-variant contract** (T4, `950acaa`, `5a1dc89`). New validator enforces (1) `check_id` set-equality against `reference/reviewer.md`, (2) every `quote` substring-grep ≥40 chars against the source README, (3) hard-fail with exact existing FR-SR-3 message on either miss. 3-variant integration test (`reviewer_subagent_contract.sh`) covers valid / sub-40-quote / missing-check_id paths. `BASH_SOURCE[0]` resolution hardened with `${BASH_SOURCE[0]:-$0}` + cwd-walking fallback (T10).
- **4th persona `returning-user-navigator` + 5-Task dispatch** (T5, `5b53d64`). Simulated-reader persona inventory expanded to 4 (evaluator, adopter, contributor, returning-user-navigator) with a parallel reviewer (5 total Task dispatches per audit). Theater-check (FR-SR-5) fires symmetrically on all 4 personas. `tests/mocks/simulated_reader_stub.sh` gains the navigator fixture.
- **SKILL.md §1 mode-branch + close-out + `Suggest:/polish` unconditional** (T6, `309c1c7`). Audit mode emits the findings table only (D2 column shape preserved); scaffold mode unchanged. `Suggest:/polish — readme requires technical voice; /polish refines style without changing meaning.` (FR-V-2) now emits unconditionally on successful audit-or-scaffold close-out — both modes wired.
- **`simulated_reader_sub40_quote.sh` regression fixture** (T7, `bb1ea01`). New integration test seals FR-SR-3: a sub-40 quote from any persona OR the reviewer MUST hard-fail with the exact existing message. Fixture asserts hard-fail at quote length 18.
- **JTBD-organized synthetic README fixture + reviewer-subagent test** (T8, `0b57281`). New `tests/fixtures/jtbd-organized-readme.md` and `reviewer_subagent_jtbd_fixture.sh` exercise the [J] check pair against a non-standard but valid README organization; both [J] checks PASS.
- **Tracer + close-out tightening + 5-dispatch contract** (T9, `cfd852e`). `tracer_audit_polish_suggest.sh` asserts `Suggest:/polish` appears exactly once on every audit-or-scaffold close-out. `audit_clean.sh` tightened to assert the audit-mode contract (16/16 PASS, zero file diff, cross-cutting row present, BSD-awk fork green). `simulated_reader_contract.sh` documents the 5-Task dispatch shape (4 personas + 1 reviewer) and asserts the SKILL.md declares it.
- **Run-all harness picks up 4 new tests via glob** (`tests/run-all.sh`). The existing alphabetical-glob loop auto-discovers `reviewer_subagent_contract.sh`, `reviewer_subagent_jtbd_fixture.sh`, `simulated_reader_sub40_quote.sh`, `tracer_audit_polish_suggest.sh` — no manual registration needed.

### Known residuals (accepted; carry forward)

- `a-name-verb-or-gerund` (skill-eval [J] check) — skill name `readme` is a noun. Rename would touch plugin manifests, hooks, every existing reference; deferred to a dedicated rename pass.
- `c-body-size-judge` (skill-eval [J] check) — `SKILL.md` body is 505 lines (down from 511 via T3's extraction of `reference/reviewer.md` at 106 lines). Still in the 501–800 reviewer-judge band; further extraction of §4/§5/§7/§8/§9/§10 deferred to a dedicated restructure pass.

### Pipeline + repo hygiene

- **CLAUDE.md `## Bash portability`** — new section documents the `BASH_SOURCE[0]` fallback pattern (resolved from T10's `_reviewer_validate.sh` hardening). Applies to every shell script under `plugins/pmos-toolkit/skills/*/scripts/` and `tests/integration/`.
- **`~/.pmos/learnings.md ## /readme`** — captured BSD-awk portability gotcha + the reusable `*_REVIEWER_STUB` env-var test-seam pattern.
- **README inventory drift fix** — `/changelog` and `/people` rows added to the "What do you want to do?" table (pre-existing drift; not caused by this revision).

### Advisory — pre-existing test failures (out of scope for this release)

Surfaced by `/verify` against the full `tests/run-all.sh`, confirmed pre-existing on `main` (neither file changed in T1–T10). Filed for a follow-up backlog pass:

- `scripts/commit-classifier.sh --selftest` — fixture `tests/fixtures/commits/01_feat-only` lacks `.git`; no `setup.sh` to materialise it. Selftest exits rc=2 with the clear error.
- `tests/integration/update_hook_dry_run.sh` — exits rc=2 with no diagnostic output. Needs a `set -x` pass to surface the failing line.

### Tests

- `scripts/rubric.sh --selftest`: 16/16 PASS; A2 fixture-agreement 100% on 10 fixtures.
- `plugins/pmos-toolkit/skills/feature-sdlc/tools/skill-eval-check.sh --target claude-code plugins/pmos-toolkit/skills/readme/`: [D] 19/19 PASS.
- `tests/run-all.sh`: 4 substrate-selftests + 13 integration tests — 15 PASS, 2 advisory-fail-pre-existing.
- All 4 new T1–T10 fixtures green.

## 2026-05-13 — pmos-toolkit 2.48.0: /architecture — tiered repo audit (L1/L2/L3) with ADR promotion

New skill `/pmos-toolkit:architecture` shipped via `/feature-sdlc skill` (skill-new mode, Tier 3). Audits a repository against 18 architectural rules across three tiers — L1 universal (capped at 15 per spec; 10 shipped: file-size, function-size, arg-count, debug-leak, TODO-rot, path-depth, missing-header, hardcoded-credential, throw-TBD, console.log-in-src), L2 stack-specific (8 rules delegated to `dependency-cruiser` for TypeScript/Vue and `ruff` for Python), and L3 per-repo overrides at `<repo>/.pmos/architecture/principles.yaml` (severity demote/promote + exemption rows with optional `adr:` pointer and `expires:` date). Emits a deterministic JSON report to stdout; promotes ≤5 unexempted block-severity findings to Nygard ADRs at `<repo>/docs/adr/NNNN-<slug>.md` (atomic write, monotonic numbering, `--no-adr` suppression). CLI-only, offline, no network reach.

### What's new

- **`/pmos-toolkit:architecture`** — the canonical skill at `plugins/pmos-toolkit/skills/architecture/SKILL.md` (target: `generic`). Tools under `tools/`: `run-audit.sh` (1256 lines — entrypoint + 3-tier rule loader + scanner + L1 evaluators + L2 dep-cruiser/ruff delegation + exemption reconciliation + ADR writer; FR-01 `audit` selector + FR-04 `--non-interactive` flag enforced), `check-citations.sh` (asserts every rule has a non-empty `source:`), `check-gap-map.sh` (reports declarative-delegated ratio; current 0.444, G2 stretch 0.70 not enforced), `check-determinism.sh` (2-run byte-identical guarantee; STRIP targets real time fields). `principles.yaml` carries 10 L1 + 8 L2 rules with rule citations. `reference/`: `l1-rationales.md`, `gap-map-rationale.md`, `adr-template.md` (Nygard).
- **Test suite (23/23 green)** — fixture-based regression harness at `tests/run.sh`. 13 fixture groups covering tracer, gitignore-deny, l1-hygiene/security/size, l3-override/malformed, principles-16-rules (cap), tool-missing graceful skip, ts-circular (dep-cruiser), vue-mixed (Vue SFC L1-only coverage gap surfacing), py-tidy-imports (ruff), exemption-row, adr-cap (5-write truncation), adr-reconcile (4 sub-fixtures: clean/expired/orphan/informational), citations-missing, determinism, and a new `selector-required` regression covering FR-01 absence-of-selector + FR-04 `--non-interactive` acceptance + too-many-positionals exit 64.
- **Skill-eval Phase 6a — 2 accepted residuals** that the orchestrator surfaces but does not block on:
  - **`c-asset-layout` [D]** — `package.json` + `package-lock.json` at skill root are required for `npx dependency-cruiser` to resolve its devDep; moving them breaks the L2 TS rule path. Documented design call.
  - **`a-name-verb-or-gerund` [J]** — name `architecture` is a domain noun; verb/gerund rename would contradict the pmos peer convention (`plan`, `spec`, `backlog`, `wireframes`, `verify`, `creativity`). Documented exception.
- **`/verify` Phase 3 caught 5 doc/code drift bugs that Phase 6a missed and were fixed inline before merge**: (1) `--non-interactive` was advertised in SKILL.md frontmatter L5 but unparseable — would have exited 64 on use; (2) FR-01 `audit` selector was documented but not enforced — parser treated `audit` as a positional path; (3) SKILL.md Phase 6 documented a JSON shape with ghost fields (`run.id`, `findings[].rule`, `exemptions_applied/orphaned/expired`, `duration_ms`) that the implementation never emitted — 22 fixtures locked the real shape; SKILL.md was the lie; (4) `run.duration_s` was hardcoded to `0.0` instead of computed; (5) `check-determinism.sh` STRIP targeted the same ghost fields — determinism passed only by accident. All 5 fixes ship in this release; new regression fixture seals (1)+(2). Surfaced as a learning: doc/code drift in JSON-emitting skills must be caught by fixture-locked shape, not the prose sketch.

### Pipeline run signature

- **Phases run:** worktree(`feat/architecture-principles-skill`) → init-state → skill-tier-resolve(T3, generic) → requirements (+folded /grill Tier-3, 5 findings) → creativity(skipped — composite finalist) → spec (+folded /simulate-spec skipped per user; F2 gap-map 0.444 reframed as G2 stretch) → plan (21 tasks, inline mode) → execute (T1 tracer → T21 final-verification; 22 commits) → skill-eval iter 1 (17/18 [D] + 15/16 [J]; 2 residuals accepted) → verify (PASS_WITH_ACCEPTED_RESIDUALS; 5 reviewer findings fixed inline + new selector-required regression; 23/23 fixtures, shellcheck clean, citations/gap-map/determinism all exit 0) → complete-dev → final-summary.
- **Manifests:** both `plugins/pmos-toolkit/.claude-plugin/plugin.json` and `plugins/pmos-toolkit/.codex-plugin/plugin.json` bumped 2.47.0 → 2.48.0 in sync (pre-push hook enforces).

## 2026-05-13 — pmos-toolkit 2.47.0: /readme — audit, scaffold, update READMEs against a binary 15-check rubric

New skill `/pmos-toolkit:readme` shipped via `/feature-sdlc skill` (skill-new mode). Three modes share one substrate: `--audit` (default) grades an existing README against a 15-check binary rubric + a 3-persona simulated-reader pass; `--scaffold` writes a missing README from detected workspace signals; `--update <commit-range>` proposes diff-driven section edits from recent commit history. Monorepo-aware (8 workspace-manifest detectors + multi-stack), cross-file rules R1–R4 (Install/Contributing/License root-only + version-bump-touches-changelog), voice work delegated to `/polish` (never inlined). Never auto-commits — every write goes through an atomic-write contract with a pre-write diff preview.

### What's new

- **`/pmos-toolkit:readme`** — the canonical skill at `plugins/pmos-toolkit/skills/readme/SKILL.md` (477 lines, NFR-6 ≤480). Three substrates under `scripts/`: `rubric.sh` (15-check binary grader with `--selftest` 100% A2 agreement on 10 fixtures), `workspace-discovery.sh` (8 manifest detectors: `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Gemfile`, `composer.json`, `pom.xml`, `build.gradle`), `commit-classifier.sh` (Conventional-Commits + breaking-change detection), `voice-diff.sh` (delegates to `/polish` for prose work). Cross-file rules at `reference/cross-file-rules.md`: R1 (Install root-only), R2 (Contributing root-only), R3 (License root-only with anchor for fragment resolution), R4 (version-bump → changelog touched). Plugin-manifest detection warns-and-skips when no manifest mentioned. Bash 3.2-safe end-to-end.
- **Test suite (13/13 green from repo root)** — 4 substrate `--selftest` invocations + 9 integration scripts (`tracer_audit`, `scaffold_greenfield`, `update_hook_dry_run`, `audit_cluttered`, `cross_file_rules`, `multi_stack_grafana_style`, `compose_audit_scaffold`, `simulated_reader_contract`) + dogfood orchestrator `run-dogfood.sh` (ADVISORY-exit-0 contract per /plan Loop-1 F2 — exits 0 even when host-repo gates can't pass because the repo has only 1 plugin with no top-level README; surfaces as advisory residual `phase-9-r1`).
- **`reference/skill-tier-matrix.md`** — the new `/readme` skill is **Tier 3** (full-pipeline: shipped via the complete `/feature-sdlc skill` flow including `/grill` + `/simulate-spec` folded in `/spec` Phase 6.5 + 26-task `/plan` + subagent-driven `/execute` + Phase 6a `/skill-eval` 2-iteration loop + feature-level `/verify`).

### Known accepted residuals (carried per Phase 6a + execute reconciliation)

- **`a-name-verb-or-gerund` (Phase 6a accepted)** — skill name is `readme`, a noun. Verb/gerund preferred by rubric, but `readme` is the user-spoken trigger (`/readme`, "audit my README"); rename has wide blast radius. Documented in `reference/skill-eval.md` exception list.
- **`c-context-economy` (Phase 6a accepted)** — inlined non-interactive-block + awk extractor (~100 lines) is the canonical cross-skill greppable contract (audited by `audit-recommended.sh`), not /readme-specific bloat.
- **Execute carried residuals (6)** — `phase-1-r1` SC1091 info on `_lib.sh source` (info-level only), `phase-2-r1` rubric.yaml `pass_when` doc-impl drift on `install-or-quickstart-presence` (functional path correct), `phase-2-r2` `_lib.sh` header says Bash >=4 but code is 3.2-safe (comment-only), `phase-3-r1` `repo_type` binary at workspace-discovery layer (full FR-WS-5 taxonomy deferred), `phase-3-r3` long-tail fallback triggers on no-manifest alone (plugin-marketplace signal combination deferred to v2), `phase-4-r3` FR-SR-4 dedupe rule documented in SKILL.md §2 step 4 (end-to-end exercise deferred).
- **`phase-9-r1` dogfood advisory** — G1 (73%) + G3 (0 findings) ADVISORY_FAIL on host repo because only 1 plugin exists with no top-level README; the 6-target plan-spec set is unattainable on today's repo by design (per /plan Loop-1 F2 — `run-dogfood.sh` still exits 0).
- One low-severity `tracer_audit.sh` cwd-portability gap (uses repo-root-relative paths; works from repo root, fails from skill dir) — non-blocking; documented in `reference/cross-file-rules.md` follow-ups.

### Pipeline run signature

- **Phases run:** worktree(`feat/readme-skill`) → init-state → skill-tier-resolve(T3) → requirements (+folded /grill Tier-3 + /msf-req 7 gap + 14 grill) → spec (+folded /simulate-spec A2 10/10 + A8 20/20) → plan (26 tasks, subagent-driven mode) → execute (9 phases, 50 commits) → skill-eval (2 iterations; iter 2 → 16/18 [J] + 19/19 [D], 2 accepted residuals) → verify (PASS_WITH_ACCEPTED_RESIDUALS, [D] 19/19 + tests 13/13) → complete-dev → final-summary.
- **Manifests:** both `plugins/pmos-toolkit/.claude-plugin/plugin.json` and `plugins/pmos-toolkit/.codex-plugin/plugin.json` bumped 2.46.0 → 2.47.0 in sync (pre-push hook enforces).

## 2026-05-13 — pmos-toolkit 2.46.0: /feature-sdlc base-drift pre-flight + release-prereq scope discipline

Two follow-up fixes for `/feature-sdlc` from the 2026-05-13 retro on the `/survey-analyse` run, applied to its skill modes. (2.44.0 was taken by `/plan vertical-slice`; 2.45.0 by `/ideate` — both shipped concurrently.)

### What's new

- **`/feature-sdlc` Phase 0a — base-drift pre-flight.** Before `git worktree add`, `/feature-sdlc` now fetches the base branch's upstream and computes `behind`. When local is behind remote, it surfaces a dialog: pull-then-branch (Recommended) / branch-anyway (record drift) / abort. The branch-anyway path writes `state.base_drift = {behind, fetched_at, remote, base, remote_sha, local_sha}` so `/complete-dev` Phase 8 can surface the gap at merge time. Phase 0b on resume re-runs the fetch+diff to flag origin advancing after worktree creation. Network failures degrade gracefully (log + proceed). Closes the silent-friction class where a worktree branched from stale local main only fails at Phase 8 merge with version-collision conflicts on `plugin.json` and changelog files.
- **`reference/state-schema.md` — three new optional top-level fields** (`base`, `remote`, `base_drift`) on the run-state document. Additive; no migration needed for older states (v4 schema unchanged).
- **`reference/skill-patterns.md` §G — Release-prerequisites scope.** New section codifies the scope split: `SKILL.md` body, `reference/`, `scripts/`, `tests/` are `/execute`'s scope; README rows, manifest version bumps, changelog entries, and `~/.pmos/learnings.md` header bootstraps are `/complete-dev`'s scope and belong in the spec's `## Release prerequisites` section. The pmos-specific file list is delegated to the host repo's `CLAUDE.md ## Skill-authoring conventions`.
- **`reference/skill-eval.md` 10.G — two new rubric checks.** `g-release-prereqs-scope` `[J]` (reviewer) verifies a plan's wave sections list only skill-content tasks; `g-plan-grep-clean` `[D]` (script) greps `03_plan.{html,md}` wave blocks for `version bump|bump.*plugin\.json|CHANGELOG\.md|docs/.*changelog|README row` markers. Group skipped when no plan artifact is present. Totals: 41 checks (21 `[D]` + 20 `[J]`).
- **`tools/skill-eval-check.sh` — implements `g-plan-grep-clean`.** New `--plan <path>` flag enables the check; awk wave-block extractor scopes the grep to `## Wave N` sections (preamble and `## Release prerequisites` are excluded); HTML chrome stripped before grep so `.html` and `.md` plans are graded uniformly. Selftest bijection regex extended from `§[A-F]` to `§[A-Z]` so future §-additions don't break it. Verified via selftest + good/bad smoke fixtures. Companion prose `§[A-F]` → `§[A-Z]` cleanup in skill-patterns.md + skill-eval.md cross-reference sections.
- **`/feature-sdlc` Phase 5 dispatch — directive line in skill modes.** The `/plan` invocation now prepends a directive forbidding version-bump / CHANGELOG / README-row / manifest-sync / learnings-bootstrap tasks in any wave block — they MUST live in the spec's `## Release prerequisites` section as `/complete-dev` deliverables. Backed by the 10.G rubric.

### Why this matters

The 2026-05-13 `/survey-analyse` SDLC run branched off stale local main and the resulting `03_plan` included version bumps + changelog edits as `/execute` tasks. `/execute` committed them against the stale base; `/complete-dev` then had to merge-conflict-resolve `plugin.json`, revert the legacy `CHANGELOG.md` writes, and re-prepend the entry to the canonical `docs/pmos/changelog.md`. Phase 0a Step 2.5 surfaces the divergence before the worktree exists; §G + 10.G prevents `/execute` from ever owning release artifacts.

This very release encountered the same stale-bump dynamic in `/complete-dev` (2.45.0 was taken by /ideate while this branch was being prepared at 2.45.0) — the Phase 9 stale-bump recovery prompt fired correctly, rebased onto main, and re-bumped to 2.46.0. That path is operating as designed.

### Breaking changes

None. The Phase 0a Step 2.5 pre-flight degrades gracefully when no upstream is configured (skipped). The 10.G checks are group-skipped when no plan artifact is given to `skill-eval-check.sh`. The state-schema additions are optional fields — older state files keep working.

### Migration

None. Additive.

---

## 2026-05-13 — pmos-toolkit 2.43.0: /survey-analyse skill

Sister to `/survey-design`: turns a raw survey response export (CSV / TSV / XLSX / XLS / PDF) into a defensible HTML report.

### What's new

- **`/survey-analyse`** — new standalone utility. Eight phases: ingest → user-confirmed schema (column-by-column; no silent auto-classification) → cleaning (straightliners / speeders / incompletes / duplicates / attention checks, with rule counts logged) → per-question analysis via **bundled Python helper modules** under `scripts/helpers/` (`categorical`, `multi_select`, `likert`, `nps`, `ranking`, `matrix`, `numeric`, `stats`, `clean`, `ingest`, `schema`, `pii`) — pure stdlib + `openpyxl` for xlsx; each ships `--selftest`. The LLM authors a per-run `analysis.py` that imports the helpers and runs it via Bash with one consolidated permission ask → open-end thematic coding via **subagent-per-question** (Braun & Clarke 6-phase contract; structured JSON return validated against the verbatim ids) → whole-survey cross-tabs with **Holm correction applied by default** across each segment family (plain-language framing in the report body; technical term in Methodology; `--raw-p-only` opts out) → HTML report through the `_shared/html-authoring/` substrate with executive summary, methodology & limitations, key findings, per-question, open-end themes, cross-tab appendix, data-quality log. Numbers are deterministic across runs on the same cleaned input; narrative + theme names are LLM-generated and disclosed as such. PII in verbatim quotes is **detect-and-warn only** — never auto-redacted. Bundled `reference/` files cover the per-question-type playbook, the thematic-coding contract, the cross-survey statistics (Holm, MoE, weighting), and the cleaning / reporting standards.

### Breaking changes

None.

### Migration

None — additive. New skill auto-discovered from `plugins/pmos-toolkit/skills/`.

---

## 2026-05-13 — pmos-toolkit 2.42.0: /artifact HTML output parity

`/artifact` produces HTML artifacts that look and behave like every other pipeline skill's HTML output — same toolbar, same fonts, same anchors, same companion files. Eight gaps closed:

### What's new

- **MD→HTML authoring contract is explicit.** `/artifact` Phase 2.7 spells out that the skill authors HTML directly using `template.md` for section ordering + per-section guidance (matching how `/spec` and `/plan` author HTML from outline) — no MD→HTML renderer step at write time. The template store at `~/.pmos/artifacts/templates/<slug>/template.md` retains its MD shape (runbook edge case row 4 carve-out).
- **Pre-rename heading-id + section-wrapper assertion** (FR-2). Before the atomic `rename(2)` of `{slug}.html.tmp`, inline `grep` checks hard-fail the write if any `<h2>`/`<h3>` lacks an `id="..."` or any `<section>` lacks one — surfacing the soft-phase failure dialog (Retry / Pause / Abort).
- **Phase 3 reviewer dispatch is HTML-aware** (FR-4, FR-5, FR-9). The reviewer subagent receives a chrome-stripped HTML slice (`<h1>` + `<main>` only, via `chrome-strip.js`) plus the companion `{slug}.sections.json`. Reviewer returns gain a required `quote` field — a ≥40-char verbatim substring of the source. The skill validates parent-side: every finding's `section` must be a kebab id present in `sections.json`; every `quote` must substring-match the source. On miss → hard-fail. Reviewer-prompt updated with HTML preamble + Rules 9 and 10 making the contract explicit.
- **Post-edit re-emit of `sections.json` + MD sidecar** (FR-6). After any Phase 3 `Edit` applies a fix, the skill regenerates `{slug}.sections.json` from the live HTML via the new `build_sections_json.js` helper, and (when `output_format=both`) re-runs the MD sidecar through `html-to-md.js`. No more stale companions.
- **`build_sections_json.js`** (new substrate file). Zero-dep Node helper at `_shared/html-authoring/assets/build_sections_json.js` — regex+stack DOM walker (~80 LOC, mirrors `chrome-strip.js`'s pattern). Reads HTML from argv or stdin; emits the conventions.md §10 `[{id, level, title, parent_id}]` schema. Self-tested against `01_requirements.html` + `02_spec.html`.
- **Refine flow extension mirrors primary format** (FR-7). `/artifact refine prd.html` now offers `prd.refined.html` (not `prd.refined.md`); the legacy MD path still works for `.md` primaries.
- **Update flow Comment Resolution Log is HTML-shaped** (FR-8). `/artifact update` appends a `<section id="comment-resolution-log">` containing an HTML `<table>` to the artifact (not a markdown table). MD primary keeps the markdown table fallback.
- **JSON frontmatter example** (FR-3). Phase 2.7's frontmatter example shows the actual emitted `<script type="application/json" id="pmos-frontmatter">` shape (not the misleading YAML triple-dash that was there before).

### Changed

- **Substrate manifest extended** (FR-11). `build_sections_json.js` joins the substrate manifest enumeration across 11 files: `_shared/html-authoring/README.md` plus 10 SKILL.md files (`artifact`, `design-crit`, `grill`, `msf-req`, `msf-wf`, `plan`, `requirements`, `simulate-spec`, `spec`, `verify`). New substrate files added in future releases continue to ride along automatically — the "currently includes" list is informational, not gating.
- **`reviewer-prompt.md`** is HTML-aware (no more "you receive a markdown document"), explicitly cites the new `quote` field as required, and ties `section` to `sections.json` ids.

### Migration

None — additive. Existing MD-only primary mode (`output_format=md`) continues to work — chrome-strip + quote validation only run for HTML. `build_sections_json.js` is consumed by `/artifact` only at this release; other HTML-emitting skills can adopt it incrementally.

## 2026-05-13 — pmos-toolkit 2.41.1: subtle "Created using pmos-toolkit" attribution in HTML chrome

Every HTML artifact emitted by a pmos-toolkit skill now carries a small, muted "Created using pmos-toolkit" link to the GitHub README — one centralized substrate edit, no per-skill changes.

### What's new

- **Attribution in the shared HTML chrome.** `plugins/pmos-toolkit/skills/_shared/html-authoring/template.html` adds an `<a class="pmos-attribution">` in both the toolbar (right of the action buttons) and the footer (inline after `Source:`, separated by a middot). Both link to `https://github.com/maneesh-dhabria/pmos-toolkit#readme` with `target="_blank" rel="noopener noreferrer"`. Styled via a new `.pmos-attribution` class in `assets/style.css`: `--pmos-fs-xs`, italic, `--pmos-muted` color, `opacity: 0.65`, with hover bumping to `opacity: 1` plus a 1px underline at `text-underline-offset: 2px` — subtle by default, clearly clickable on intent. The toolbar variant is hidden in print; the footer attribution prints (it's where source/citation conventionally appears).
- **Reach.** Inherited automatically by every skill that emits via the substrate: `/requirements`, `/spec`, `/plan`, `/wireframes`, `/prototype`, `/diagram`, `/survey-design`, `/polish`, `/artifact`, `/design-crit`, `/msf-req`, `/msf-wf`, `/grill`, `/creativity`, `/simulate-spec`, plus the pipeline-status and OQ-index artifacts written by `/feature-sdlc`. No per-skill edits.
- **No reviewer-payload leakage.** `_shared/html-authoring/assets/chrome-strip.js` already extracts only `<h1>` + `<main>`, so the attribution (which sits in `<header>` and `<footer>` chrome) is automatically stripped from the bytes passed to reviewer subagents — no risk of the LLM judge quoting "Created using pmos-toolkit" as a finding.

### Why

Drive adoption without being in users' face. The attribution is discoverable (in chrome on every artifact) but deferential (xs italic muted, opacity 0.65) — readers who care can click through to the README; readers focused on the artifact content barely register it.

## 2026-05-13 — pmos-toolkit 2.41.0: /complete-dev gains lastrun memory + one-shot defaults confirm + worktree-cleanup moved to after push

`/complete-dev` learns to remember its own answers, asks for them in one consolidated prompt instead of twelve scattered ones, and stops removing the worktree before push tag succeeds (which was severing the `/feature-sdlc --resume` contract).

### What's new

- **Per-developer lastrun memory.** Each `/complete-dev` run now reads `.pmos/complete-dev.lastrun.yaml` (gitignored, per-developer) at Phase 0 and writes it at the end of Phase 17 once the release lands. The schema captures `merge_style`, `worktree_disposition`, `deploy_path`, `version_bump`, `changelog_disposition`, `push_target`, `verify_already_ran`, plus the last-run `detected_signals.deploy` for Phase 5's environment-change check. Malformed file → stderr warn + fall through to built-in defaults; never errors. Cancelled / failed runs do NOT update lastrun (so broken choices aren't memorialized). See `plugins/pmos-toolkit/skills/complete-dev/reference/lastrun-schema.md`.
- **New Phase 0.5 — "Confirm run defaults".** One consolidated `AskUserQuestion` seeded from lastrun (or built-ins). Pick **Confirm all** (Recommended) and the run-shaping prompts at Phase 1 (/verify gate), Phase 3 guard-PASS (merge style), Phase 5 (deploy path, when detected signals haven't drifted), Phase 8 (changelog accept), Phase 9 step 5 (bump kind), and Phase 14 (push target) all short-circuit — about six per-run prompts collapsed into one. Pick **Edit one or more** to multi-select which fields to override; the per-field prompts then loop until you re-confirm. Destructive prompts (merge conflict, stale-bump recovery, push failure, tag collision, commit message draft, Phase 6 learnings findings) always still fire — they involve free-form input or non-recoverable consequences and can't be meaningfully memorized. Skipped in non-interactive mode (the AUTO-PICK-Recommended contract already covers it).
- **Worktree removal moved to Phase 16.5 — after push tag succeeds.** Previously Phase 4 ran cleanup right after merge, severing `/feature-sdlc --resume`: a Phase 15 push failure would leave the worktree gone AND `<worktree>/.pmos/feature-sdlc/state.yaml` unreachable. The substantive cleanup body (dirty-check excluding `.pmos/feature-sdlc/`, `--force-cleanup` handling, `ExitWorktree(action=keep)` with fallback chat line) now lives at Phase 16.5; Phase 4 is a one-line deferral stub. Anti-pattern #4 retitled "Removing the worktree before **push** succeeds" with explicit reference to the resume-contract dependency. The Phase 17 success summary now reports `Worktree <removed|retained>` to reflect that lastrun can opt into retention.
- **New flag: `--reset-defaults`.** Bypass the lastrun read for one run (seed Phase 0.5 from built-ins instead). The file is not deleted; Phase 17 still overwrites it with this run's choices.

### Changed

- `complete-dev/SKILL.md` grew Phase 0.5 (consolidated confirm), Phase 16.5 (relocated cleanup body), and Phase 0 lastrun-load steps; Phase 4 shrank to a deferral stub; Phases 1/3/5/8/9/14 each gained a "Short-circuit when Phase 0.5 confirmed" rider above their existing prompt. Phase 7.5's release-notes recipes moved verbatim to `reference/release-recipes.md` (keeps SKILL.md body under the 800-line eval cap). Anti-pattern #4 rewritten.
- README's `/complete-dev` row now mentions Phase 0.5 lastrun confirm + Phase 16.5 timing.
- `.gitignore` adds `.pmos/complete-dev.lastrun.yaml`.

### Why

Triaged from user feedback on the 2.40.0 ship: "save lastrun defaults to make /complete-dev easy to execute, reduce questions asked, rationalize the worktree removal sequence — it happens too early." The pre-push worktree removal was a latent resume-contract bug (state.yaml lives inside the worktree); the prompt-count was friction the user kept hitting on every ship.

## 2026-05-13 — pmos-toolkit 2.40.0: /polish honors source format (md or HTML) + opt-in editorial reduction pass

`/polish` learns two things, plus a de-flake of `/feature-sdlc skill`'s `[D] body` checks comes along for the ride.

### What's new

- **Source format honored.** Hand `/polish` a local `.md` and you get `<name>.polished.md`; hand it a local `.html` and you get `<name>.polished.html` — same shape in, same shape out. HTML inputs get HTML-aware lock zones (tags + attributes, `<script>`/`<style>`/`<pre>`/`<code>` contents, HTML comments, `<head>`, short `<td>`/`<th>` cells) and `<h1>`/`<h2>` chunk anchors; the rubric and patches only ever change text between tags. URL and Notion inputs continue to normalize to markdown (their HTML is page chrome, not an authored artifact). After an HTML rewrite, `/polish` verifies all non-prose bytes are byte-identical to the original; if not, it keeps the output but surfaces a loud `⚠ markup outside prose nodes may have shifted — review before replacing` and drops the replace prompt's default-yes — never refuse, never hard-fail.
- **New "Phase 2.5 — Editorial reduction" (opt-in, runs before the rubric).** Either pass `--reduce <pct|range>` (e.g. `--reduce 30-40` or `--reduce 25`) or pick a target at the gate: `Skip — no reduction (Recommended)` / `~10-20% (light trim)` / `~30-40% (substantial cut)` / `~50%+ (aggressive)` / custom. Skip is a true no-op; the pipeline behaves exactly as before. On a non-Skip target, an **editor subagent** critiques the doc ruthlessly (rephrase / merge / reorder / tighten / cut) and emits structured notes to `editor_notes.json` (validated against the new `schemas/editor-notes.schema.json`); a **rewriter subagent** applies the `risk: low` notes honoring lock zones; `risk: high` notes (structural reorders, large merges) and any `PRESERVE_VOICE_CONFLICT` are surfaced through the existing Phase 5 findings protocol — never auto-applied. If the rewriter falls short of the target band, the editor gets one capped re-critique. The editor pass is **not** a polish iteration — the existing 2-iteration rubric cap is untouched.
- **`--dry-run` interplay.** With a non-Skip target, the editor still runs and writes `editor_notes.json`; the rewriter and re-critique do not. The dry-run report now includes the editor notes + target reconciliation above the rubric results.
- **Phase 7 metrics anchored to the original.** The headline `Words: 1,842 → 1,310 (-29%)` is computed against the original ingested doc (not the editor-reduced one), so the % reflects editor cut + rubric tightening together. A new `Editorial pass:` summary line reports target / estimated / actual / applied / skipped / surfaced — or `skipped` / the dry-run variant.

### Changed

- **`/polish` is now `10` phases** (Phase 2.5 inserted between preset selection and the rubric). The "Track Progress" instruction, the platform-adaptation note, the file map, and the anti-patterns all updated; the rubric runs on the *working document* (editor-reduced if Phase 2.5 ran).
- **`reference/chunking.md`** gains a "Format-aware lock zones" subsection (the markdown set is unchanged; HTML adds its own lock zones); the chunking algorithm cites `<h1>`/`<h2>` (and `<h3>`/`<p>` for oversized) as the HTML analogues.
- **New files:** `plugins/pmos-toolkit/skills/polish/reference/editorial-pass.md` (editor + rewriter prompt templates, the `editor_notes.json` validate/prune contract, re-critique, HTML fidelity rule), `plugins/pmos-toolkit/skills/polish/schemas/editor-notes.schema.json` (JSON Schema draft-07), and two fixtures — `tests/fixtures/html-doc.html` (HTML round-trip + lock zones) and `tests/fixtures/bloated-doc.md` (a verbose PRD-shaped doc for the reduction pass) — with paired `tests/expected.yaml` contracts.

### Fixed

- **`/feature-sdlc skill`'s deterministic eval was flaky on any skill with a >16KB body.** `tools/skill-eval-check.sh` ran the body-pattern checks as `body | grep -q …`; under `set -o pipefail`, `grep -q` closes the pipe on its first match and the upstream `sed` gets SIGPIPE, so the pipeline reports failure even when the pattern *did* match — flaking `d-platform-adaptation`, `d-learnings-load-line`, `d-capture-learnings-phase`, and `d-progress-tracking`. The body is now cached once and the checks read from a here-string. Same script for `/polish` runs 10/10 clean post-fix.

### Migration

None — additive. The existing markdown path is byte-for-byte unchanged when the editor gate is Skipped (the default). The new `--reduce` flag and the new phase do not require any state changes; `editor_notes.json` is a per-run artifact alongside the polished file.

### References

- Requirements: `docs/pmos/features/2026-05-13_polish-editorial-pass/01_requirements.html`
- Spec: `docs/pmos/features/2026-05-13_polish-editorial-pass/02_spec.html`
- Plan: `docs/pmos/features/2026-05-13_polish-editorial-pass/03_plan.html`
- Feedback triage: `docs/pmos/features/2026-05-13_polish-editorial-pass/0c_feedback_triage.html`

---

## 2026-05-13 — pmos-toolkit 2.39.0: /execute parallel subagent-driven execution mode

`/execute` can now run a plan by fanning independent tasks out across subagents in parallel, instead of (or in addition to) the single-agent task-by-task loop. The behavior is selected by a flag, the user is asked which mode to use right after `/plan`, and all of the subagent-driven logic lives inside `/execute` itself — nothing outside `plugins/pmos-toolkit/skills/execute/` is required.

### What's new

- **`/execute --subagent-driven` — parallel, subagent-driven execution.** A fresh implementer subagent per task; a deterministic wave planner groups tasks into "waves" (a task is in wave *k* once all its `Depends on:` / `Requires state from:` are in earlier waves **and** it shares no `Files:` path with its wave-mates), and each wave's implementers are dispatched concurrently. Implementer subagents implement + test but never `git commit` — the controller commits each task's file-set serially after the wave, preserving the `T<N>` commit subjects the resume resolver depends on (and honoring the plan's `commit_cadence`). Every completed task then goes through a two-stage review — spec-compliance reviewer subagent first, then (only on ✅) a code-quality reviewer subagent — looping to clean, and one whole-implementation reviewer runs after the last wave. Implementer status (`DONE` / `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` / `BLOCKED` / stall) is handled per the subagent-driven contract. Inspired by `superpowers:subagent-driven-development`, but with no dependency on it — degenerate plans (dependency cycle, unknown task id, legacy plan with no v2 task fields) fall back to fully-sequential singleton waves.
- **`plugins/pmos-toolkit/skills/execute/subagent-driven.md` — self-contained prompt templates.** Implementer / spec-compliance-reviewer / code-quality-reviewer / final-reviewer templates plus model-selection guidance (cheap model for mechanical 1–2-file tasks, standard for integration, most-capable for design/review). No `../_shared/*` or `superpowers:*` reference is load-bearing.
- **`/plan` asks the execution mode at close.** Before the closing offer, `/plan` asks **Inline execution** (Recommended — one agent, task-by-task, lowest token cost) vs **Subagent-driven execution** (fresh subagent per task, parallel waves, two-stage review — faster on wide plans), records the choice as `execution_mode:` in the plan's frontmatter, and reflects it in the `/execute …` invocation it offers.
- **`/feature-sdlc` honors it.** Phase 6 reads `execution_mode` from the plan and passes `--subagent-driven` accordingly; an absent value (legacy plan) means inline, with no re-prompt.

### Changed

- `/execute` `argument-hint` gains `[--subagent-driven | --inline]` (mutually exclusive, last wins, absent ⇒ inline). On platforms with no subagent tool, `--subagent-driven` degrades to a warning + inline execution — never an error. `/execute` also gains a `## Track Progress` section. The pre-existing "Subagent Execution (when Agent tool is available)" note is now framed as a lightweight *sequential* sub-option of inline mode; the new section is the parallel variant.
- Both `plugin.json` manifests bumped to 2.39.0 (in sync).

### References

- Requirements: `docs/pmos/features/2026-05-13_execute-subagent-mode/01_requirements.md`
- Spec: `docs/pmos/features/2026-05-13_execute-subagent-mode/02_spec.md`
- Plan: `docs/pmos/features/2026-05-13_execute-subagent-mode/03_plan.md`
- Verification report: `docs/pmos/features/2026-05-13_execute-subagent-mode/04_verify.md`

## 2026-05-12 — pmos-toolkit 2.38.0: skill development via /feature-sdlc (skill modes, skill-eval rubric, /skill-sdlc alias)

Folds skill authoring into the same SDLC spine everything else uses. `/create-skill` and `/update-skills` are retired — building or revising a skill now runs the full worktree-isolated, resumable, gated `/feature-sdlc` pipeline (requirements → spec → plan → execute → eval → verify → complete-dev), and every skill is scored against a binary rubric before it can merge.

### What's new

- **`/feature-sdlc skill <description>` builds a new skill end-to-end.** It runs the same pipeline as a feature: git worktree + branch, resumable `state.yaml`, auto-tiering, compact checkpoints — then adds a skill-eval gate before merge. `/feature-sdlc skill --from-feedback <file|text>` (or `--from-retro`) drives the same pipeline to apply feedback or retro findings to one or more existing skills in a single combined run.
- **`/skill-sdlc` — a thin alias** for `/feature-sdlc skill …`. Triggers on "create a skill", "build me a slash command", "author a new skill", "apply this retro feedback to the skill", etc. It forwards verbatim; all the logic lives in `/feature-sdlc`.
- **A research-grounded skill-authoring guide + binary eval rubric.** `reference/skill-patterns.md` (§A frontmatter · §B description & triggering · §C structure & progressive disclosure · §D body & content · §E scripts & tooling · §F platform-conditional frontmatter) is the single source of truth for how a good skill is written; `reference/skill-eval.md` mirrors it 1:1 as a 39-check pass/fail rubric (20 deterministic + 19 LLM-judge). `/feature-sdlc skill`'s requirements / spec / execute / verify stages all cite the guide; `/create-skill`'s old prose "Conventions" checklist is superseded (the three pmos-specific bits — canonical path, manifest version-sync, release entry point — live in `CLAUDE.md`).
- **`skill-eval-check.sh` — a bundled deterministic-check runner.** `plugins/pmos-toolkit/skills/feature-sdlc/tools/skill-eval-check.sh [--target claude-code|codex|generic] [--selftest] <skill-dir>` runs the 20 deterministic checks and prints a TSV verdict (exit 0 all-pass / 1 a-check-failed / 2 invocation error). `--selftest` asserts the check-list ↔ rubric bijection. The 19 LLM-judge checks run via a reviewer subagent with a verbatim-quote contract.
- **A TDD-style skill-eval refinement loop (new Phase 6a).** After `/execute`, the skill is scored; failing checks become a `## Eval-remediation` task block appended to the plan, `/execute` re-runs (task-level resume), and it re-scores — up to 2 iterations, then a categorical decision (accept residuals as known risk / iterate manually / restore iteration 1 / abort). `/verify` re-runs the rubric fresh and reconciles against any accepted residuals. Nothing passes silently.
- **New skill-mode phases.** `0c /feedback-triage` (parse a retro/feedback source → per-finding critique vs the current skill → approve/modify/skip/defer → triage doc → combined per-skill requirements seed) and `0d /skill-tier-resolve` (resolve skill tier, on-disk location, and target platform — host CLAUDE.md/AGENTS.md/GEMINI.md rule > plugin manifest > `.agents/` > `.claude/skills/` — with a single consolidated confirmation).

### Changed

- **`/feature-sdlc`'s phases are renumbered linearly:** `0, 0a, 0b, 0c, 0d, 1, 2, 2a, 3, 3a, 3b, 3c, 4, 5, 6, 6a, 7, 8, 8a, 9, 10`. Feature mode behaves exactly as before — the new `0c/0d/6a` phases only run in skill modes.
- **`state.yaml` is schema v4** — additive over v3: a `pipeline_mode` field (`feature` / `skill-new` / `skill-feedback`), a `skill_eval` substructure (per-iteration results + accepted residuals), and a mode-conditional `phases[]` set. Existing v1/v2/v3 state files auto-migrate on `--resume`.
- **`/create-skill` and `/update-skills` are archived** to `archive/skills/` (with `archive/skills/README.md` explaining the merge and where each old phase lives now); their reusable reference files moved into `feature-sdlc/reference/`. The README rows for both now redirect to the archive; `CLAUDE.md` gains a `## Skill-authoring conventions` section.

### References

- Requirements: `docs/pmos/features/2026-05-11_feature-sdlc-skill-mode/01_requirements.html`
- Spec: `docs/pmos/features/2026-05-11_feature-sdlc-skill-mode/02_spec.html`
- Plan: `docs/pmos/features/2026-05-11_feature-sdlc-skill-mode/03_plan.html`
- Verification report: `docs/pmos/features/2026-05-11_feature-sdlc-skill-mode/verify/2026-05-12-review.html`
- Archive: `archive/skills/README.md`

## 2026-05-11 — pmos-toolkit 2.37.0: survey-design hardening (Phase-4 refinement loop, multi_field_open, two-tier assets)

Acts on the retro from the first `/survey-design` session (the skill shipped in 2.36.0): rebuilds the reviewer pass as a bounded refinement loop with a product-fit rubric, adds a new question type, hardens substrate-asset handling, declutters dispositions, and adds a persuasive-intro intake variable. Five fixes (F1, F3, F6, F7, F8) approved out of 8 surfaced; F2/F4/F5 skipped with reasons (see the triage doc). Driven via `/update-skills`.

### What's new

- **Phase 4 is now a bounded generate↔review refinement loop (F1).** ≤ 2 iterations, *categorical* exit (zero product-fit FAILs **and** zero blocker-severity methodology findings, or the cap). The reviewer **evaluates and recommends only** — it never writes files or mutates `survey.json`; the generator applies a targeted regeneration (only the flagged questions + directly-coupled ones; author-supplied questions are rewrite-only, never auto-cut), re-runs trim-to-budget, re-derives the artifacts, and loops. The reviewer return contract gains: a `**Product fit:**` lead line per question (predictability / load-bearing / scope-match — each PASS/FAIL with a *written* predicted-answer / themes line as the evidence), a `## Refinement loop changelog` (`### Iteration N` tables), a `## Research-goal coverage / product fit` section in `survey-eval.md`, per-section sub-scores, and a YAML machine block (`score`, `sub_scores`, `product_fit_fails`, `blockers`, `recommended_edits`). Phase 5 opens with the loop summary and surfaces residual product-fit FAILs first as "Kill or rewrite Q<id>?" decisions (`Rewrite as proposed (Recommended)` / `Kill` / `Keep with reason` / `Defer`).
- **Product-fit rubric + 0–100 score (F1).** `reference/survey-best-practices.md` gains a leading **"Product fit (evaluate this first)"** section (the three binary per-question checks + a survey-wide research-goal-coverage check + two worked PASS/FAIL examples) and a **"Scoring rubric (0–100, informational)"** section (8 weighted dimensions summing to 100 — product-fit 30 / structure 15 / length 10 / mode 10 / scale 10 / accessibility 10 / ethics 10 / intro 5 — deduction sizes, composite formula). The score is a *progress signal only* — it never gates the loop; the exit is categorical.
- **`multi_field_open` question type + `schema_version` 2 (F6).** A shared stem + one labelled single-line input per `fields: [{id,label,placeholder}]` entry — the recommended shape for "metrics by cadence" items (one input each for daily / weekly / monthly …). 30 s per field; not routable; new schema invariants (`fields` ≥ 1, kebab-unique field ids, no `options`/`scale`/`rows`/`columns`/`constant_sum_total`). `reference/platform-export.md` maps it per platform: SurveyMonkey and Qualtrics native (`open_ended`/`multi` with `answers.rows[]`; `Matrix`/`TE`); Typeform and Google Forms downgrade to N short-answer items preceded by a statement / section header, with an in-artifact comment and a `export/README.md` note. `assets/survey-preview.js` renders it (one `<label for>`+`<input type="text">` per field, label-adjacent, counted as one question). `schema_version: 1` surveys remain valid input — the skill rewrites it to `2` on the next re-derive; no v1 field is removed.
- **Two-tier substrate-asset handling (F3).** A missing **hard-required** asset (`survey-preview.js`, `style.css`, `viewer.js`) aborts with `survey-design: missing substrate asset <abs-path> — reinstall the pmos-toolkit plugin` and writes **no** degraded artifact (no improvised self-contained renderer). A missing **convenience** asset (`serve.js`; the turndown trio / `html-to-md.js`) emits one warning, skips the dependent extra, and continues.
- **Cosmetic-finding filter (F7).** Reviewer / simulation findings that are severity-`nit` **and** pure wording/title polish (no methodological or product-fit weight) no longer crowd the batched dispositions — they go in a trailing "Noted, not asked:" line and into `## Dispositions` as `noted (cosmetic, not asked)`.
- **Persuasive-intro intake variable (F8).** Phase 2 gains a free-form `response_impact` variable ("what happens to the responses / what does the audience get out of it"); the generated `intro.text` MUST carry a WIIFM sentence built from it — concrete impact, audience-specific, **honest** (no fake scarcity/urgency, no overclaiming) — or a benefit-framed restatement of `purpose` when `response_impact` is null (no invented downstream-action claim). The reviewer's intro/consent dimension flags a missing WIIFM line as `should-fix`. Stored as `intro.response_impact` in `survey.json`.

### Verification

- `/verify` PASS — static + structural: `audit-recommended.sh` exit 0; the non-interactive-block region byte-matches `_shared/non-interactive.md`; `node --check` on `survey-preview.js`; `expected.yaml` parses; structural greps confirm each F-fix's contract is present and self-consistent. Report: `docs/pmos/features/2026-05-11_update-skills-survey-design-fixes/verify/2026-05-11-review.html`. The plan's behavioral runbook (an end-to-end `/survey-design` run on a reconstructed retro brief; rename-the-asset abort/warn checks; a 3-field `multi_field_open` export + render) is recorded for the next real `/survey-design` invocation — it's a use-time exercise of the skill, not a deploy-time gate. New test expectations + a fixture for the type and the F8 regression were added under `tests/`.

### References

- [`docs/pmos/features/2026-05-11_update-skills-survey-design-fixes/00_triage.md`](features/2026-05-11_update-skills-survey-design-fixes/00_triage.md) — `/update-skills` triage (8 findings → F1/F3/F6/F7/F8 approved; F2/F4/F5 skipped)
- [`.../01_requirements.html`](features/2026-05-11_update-skills-survey-design-fixes/01_requirements.html) · [`grills/2026-05-11_01-requirements.html`](features/2026-05-11_update-skills-survey-design-fixes/grills/2026-05-11_01-requirements.html) · [`02_spec.html`](features/2026-05-11_update-skills-survey-design-fixes/02_spec.html) · [`03_plan.html`](features/2026-05-11_update-skills-survey-design-fixes/03_plan.html) · [`verify/2026-05-11-review.html`](features/2026-05-11_update-skills-survey-design-fixes/verify/2026-05-11-review.html)
- [`plugins/pmos-toolkit/skills/survey-design/SKILL.md`](../../plugins/pmos-toolkit/skills/survey-design/SKILL.md) — updated skill body · [`reference/survey-best-practices.md`](../../plugins/pmos-toolkit/skills/survey-design/reference/survey-best-practices.md) · [`reference/platform-export.md`](../../plugins/pmos-toolkit/skills/survey-design/reference/platform-export.md) · [`assets/survey-preview.js`](../../plugins/pmos-toolkit/skills/survey-design/assets/survey-preview.js)

## 2026-05-10 — pmos-toolkit 2.35.0: feature-sdlc worktree-resume rework

Reworks /feature-sdlc to use harness-native worktree entry, fixes resume friction across compact checkpoints, and teaches /complete-dev to clean up worktrees on success.

### What's new

- **Harness-native worktree entry (FR-W01–W05).** /feature-sdlc Phase 0.a now creates the worktree and immediately calls `EnterWorktree(path=<abs>)`. On harness success, the same Claude session continues into the new worktree. On any error, /feature-sdlc emits a byte-deterministic handoff block + a grep-able `Status: handoff-required` line, then exits 0 — wrapper scripts (/loop, /schedule) see clean exit.
- **Drift-check resume (FR-R01–R07).** `/feature-sdlc --resume` now compares `realpath($PWD)` to `state.worktree_path` before any other validation. If the user is in the wrong directory, the skill refuses early with the relaunch instruction and exit 64. Each drift check logs its inputs to chat for debuggability (NFR-06).
- **State schema v3 (FR-S01–S05).** Pure cohort-marker bump over v2 — no field changes, no removals. Auto-migrates on read when the drift check passes; legacy v2 files in main trigger drift-refusal (correct). `worktree_path` is now realpath-canonical at write time.
- **`/feature-sdlc list` (FR-L01–L08).** New subcommand discovers all in-flight features across `feat/*` worktrees. Outputs a markdown table with `Slug | Branch | Phase | Last updated | Worktree`, sorted by last_updated descending. Worktrees with legacy v1/v2 state get a `(legacy v1/v2)` Phase suffix.
- **`/complete-dev --force-cleanup` (FR-CD01–CD06).** Phase 4 now does `ExitWorktree(action=keep)` → fallback `cd <root>` instruction → `git worktree remove` → `git branch -D feat/<slug>`. New `--force-cleanup` flag handles dirty-tree and rebased-stale-branch edge cases. Dirty-status check excludes the gitignored `.pmos/feature-sdlc/` subtree (FR-CD03).
- **state.yaml gitignored.** `.pmos/feature-sdlc/` added to `.gitignore`; the previously-tracked `state.yaml` removed from tracking (FR-G01–G03). Per-worktree state files no longer collide across features in fresh worktrees.
- **`_shared/canonical-path.md`.** Single source of truth for the realpath contract; cited by /feature-sdlc Phase 0.b + Phase 1, and /complete-dev Phase 4 (FR-SH01).

### Verification

- Unit tests: `tools/test-feature-sdlc-worktree.sh` — 4/4 OK.
- Integration tests: `tools/verify-feature-sdlc-worktree.sh` — 8/8 PASS. Cases 3+4 hardened to grep production prose (red-green verified) per /verify Phase 3 multi-agent finding (score 95).
- Manifest version sync: 2.34.0 → 2.35.0 in both `.claude-plugin` and `.codex-plugin`.
- audit-recommended baseline preserved: 15 unmarked across 28 skills, byte-identical to main pre-merge.
- Dogfood: this very feature shipped through /feature-sdlc end-to-end; /complete-dev Phase 4 exercised on the rework's own worktree + the stale `pipeline-consolidation` worktree from the prior release.

### References

- [Spec](docs/pmos/features/2026-05-10_feature-sdlc-worktree-resume/02_spec.md)
- [Plan](docs/pmos/features/2026-05-10_feature-sdlc-worktree-resume/03_plan.md)
- [Verify review](docs/pmos/features/2026-05-10_feature-sdlc-worktree-resume/verify/2026-05-10-review.md)

## 2026-05-10 — pmos-toolkit 2.34.0: Pipeline consolidation — folded MSF-req/MSF-wf/simulate-spec, /retro multi-session, /feature-sdlc Phase 13 + --minimal

Folds three optional pipeline skills (`/msf-req`, `/msf-wf`, `/simulate-spec`) into their parents (`/requirements`, `/wireframes`, `/spec` respectively) as Tier-3 default-on phases with per-finding commit cadence and inline-disposition for sub-threshold findings. Removes the now-redundant `/feature-sdlc` Phase 4.a (msf-req gate) and Phase 6 (simulate-spec gate). Adds `/retro` as Phase 13 of `/feature-sdlc` (soft, Recommended=Skip). Enhances `/retro` with multi-session analysis (--last/--days/--since/--project current|all/--skill/--scan-all) via subagent-per-transcript dispatch with 5-in-flight + 60s timeout + boilerplate-strip aggregation. Bumps `state.yaml` schema v1→v2 with auto-migration. Adds `--minimal` flag to short-circuit four soft gates. Fixes the slug clash between `/msf-req` and `/msf-wf` (both previously wrote `msf-findings.md`) by adopting the `<skill-name-slug>-findings.<ext>` convention.

### What's new

- **Folded MSF-req inside `/requirements` (Phase 5.5)** — Tier-3 default-on; Tier-1/2 optional. Apply-loop with confidence threshold (default 80; override via `--msf-auto-apply-threshold N`); per-finding git commits with `Depends-on:` body annotation; sub-threshold findings surface as structured-ask with `Recommended=Defer to OQ`. Output to `msf-req-findings.md` (slug-distinct per W4). Escape: `--skip-folded-msf`. FR-64 uncommitted-edits guard prevents clobber. Failure capture appends `{folded_skill, error_excerpt, ts}` to `state.yaml.phases.requirements.folded_phase_failures[]`; chat-emits a `WARNING: msf-req crashed (advisory continue per D11): <excerpt>` at append.
- **Folded MSF-wf inside `/wireframes` (Phase 6 reframed)** — same contract, per-wireframe iteration. Output to `msf-wf-findings/<wireframe-id>.md` (directory variant). Escape: `--skip-folded-msf-wf`. FR-65 uncommitted guard.
- **Folded simulate-spec inside `/spec` (Phase 6.5)** — delegates to a new `_shared/sim-spec-heuristics.md` substrate (4-pass scenario enumeration → trace → 4-bucket fitness critique → cross-reference → severity-keyed disposition). Auto-apply patches edit `02_spec.md` in-place with `spec: auto-apply simulate-spec patch P<N>` per-finding commits. Escape: `--skip-folded-sim-spec`. FR-66 uncommitted guard.
- **`/feature-sdlc` Phase 13 `/retro` gate (new)** — soft, Recommended=Skip. Options: Skip / Run /retro / Run /retro --last 5 / Defer. State.yaml gains `retro` phase entry (v2 schema).
- **`/feature-sdlc` `--minimal` flag** — sets `_minimal_active=true` directive; orchestrator short-circuits the four soft gates (creativity, wireframes, prototype, retro) via chat log line `[orchestrator] phase_minimal_skip: <phase-id>` without issuing the AskUserQuestion. User-explicit; does not bypass canonical-block classifier.
- **`/retro` multi-session capability (W8)** — 7 new flags: `--last N`, `--days N`, `--since YYYY-MM-DD`, `--project current|all`, `--skill <name>`, `--scan-all`, `--msf-auto-apply-threshold N`. Phase 1 enumerates candidates, applies cap-confirmation prompt at >20 transcripts (Recommended=most-recent-20 per D32; NI auto-pick same). Phase 2 dispatches one subagent per candidate, batched 5-in-flight, 60s per-subagent timeout (FR-42), with `scanned-failed` partial-failure handling (FR-44). Per-wave progress to stderr (`Wave i/N: complete/in-flight (T+sec)`, FR-49). Phase 4 aggregates via `(skill, severity, first-100-chars-stripped)` hash with boilerplate-strip regex (`^The /\S+ skill\b\s*|^The skill\b\s*|^An?\s+|^The\s+`); constituent raw findings nested per aggregated row. Phase 5 emits two-tier output (`## Recurring Patterns` ≥2 sessions sorted frequency × severity + `## Unique but Notable` + `## Skipped (scan failed)`). NFR-02 wall-clock budget <90s for 5-transcript fixture.
- **`state.yaml` schema v1 → v2 with auto-migration (FR-SCHEMA / D31)** — additive: `phases[].folded_phase_failures: []` (with `(folded_skill, error_excerpt)` append-dedup rule per spec §10.1), `phases[].started_at` write contract on `pending → in_progress` transitions (FR-57; never overwritten on resume), `retro` phase entry between `complete-dev` and `final-summary`. 4-step idempotent auto-migration runs on read of any v1 state file. POSIX-atomic same-directory write-temp-then-rename per D31; orphan `.tmp` reaper at /plan startup; NFR-08 hard error on `rename(2)` failure.
- **`/feature-sdlc` Phase 11 + Resume folded-phase failure surfacing (T12b)** — Phase 11 final-summary reads each `state.yaml.phases.<x>.folded_phase_failures[]` and emits a `## Folded-phase failures (N)` subsection above the OQ index when ≥1 failure present (omitted when N=0). The `--resume` Resume Status panel (single chat-block per D30) re-emits the same subsection so users see folded-phase health at every resume.
- **`/verify` legacy slug fallback + folded-phase awareness (T19)** — primary read at `msf-req-findings.md` / `msf-wf-findings/<id>.md`; fallback to `msf-findings.md` with soft warning. Affirmative `✓ folded phases skipped per documented flags` when E14 conditions hold (all skipped + zero failures + flags in state.yaml.notes). Advisory warning when Tier-3 has no folded artifacts AND no documented skips. Per-failure advisory emit per FR-52.
- **`/complete-dev` release-notes recipes (T20)** — four recipes: (1) `git log --invert-grep --grep='auto-apply'` to filter human-meaningful commits; (2) `git log --grep='Depends-on:'` to discover folded-finding dependency graph; (3) `git rebase -i mid-pipeline` anti-pattern documentation (rewrites SHAs/timestamps that the apply-loop's `--since=<phase.started_at>` resume cursor depends on); (4) `--help` quick-reference for the 11-flag v2.34.0 surface.
- **11 new CLI flags (T1)** — across 5 SKILL.md frontmatters: `/feature-sdlc --minimal`; `/requirements --skip-folded-msf --msf-auto-apply-threshold N`; `/wireframes --skip-folded-msf-wf --msf-auto-apply-threshold N`; `/spec --skip-folded-sim-spec`; `/retro --last N --days N --since YYYY-MM-DD --project current|all --skill <name> --scan-all`.
- **Slug-distinct findings convention (W4)** — `<skill-name-slug>-findings.<ext>` replaces the legacy `msf-findings.md`. /msf-req → `msf-req-findings.md`; /msf-wf → `msf-wf-findings/<wireframe-id>.md` (directory variant). Dogfooded in this feature's own folder before shipping.

### Verification

- **Lints PASS:** `lint-non-interactive-inline.sh` 27/27, `lint-pipeline-setup-inline.sh` 7/7, manifest version-sync diff = 0 (both at 2.34.0).
- **Fixture suite (12 tests):** `test-t5-shared-substrate.sh`, `test-w1-fold-msf-req.sh`, `test-w2-fold-msf-wf.sh`, `test-w3-fold-sim-spec.sh`, `test-w5-fsdlc-gates.sh`, `test-w7-fold-retro.sh`, `test-w8-multi-session-retro.sh`, `test-t12a-failure-capture.sh`, `test-t12b-failure-surface.sh`, `test-t14-retro-flags.sh`, `test-t19-verify-fallback.sh`, `test-resume-idempotency.sh` — all OK.
- **E2E dogfood:** `/verify` ran against this feature's own `02_spec.md` cleanly; review at `verify/2026-05-10-review.md`. PASS-with-documented-deviations.

### Known limitations / open questions

- **ADV-audit-recommended baseline** — `audit-recommended.sh` still reports 15 unmarked AskUserQuestion call sites (baseline 13 + 2 from this feature's prose-imperative directives in `/feature-sdlc` for the `--minimal` and Resume Status panel sections; the awk extractor cannot distinguish prose mentions from real call sites). Pre-existing across changelog/create-skill/execute/feature-sdlc; not blocking. Pre-push hook does not gate on this script.
- **Per-task commit cadence (T15-T18)** — DEVIATION-P6: T15-T18 (4 /retro multi-session tasks) batched into one commit because they all touch `/retro/SKILL.md` in tightly-coupled sections; per-task resume-cursor sacrifice was acceptable for documentation-only changes. Future folded-feature work in a single SKILL.md should still split per-task when feasible.
- **OQ-1 / OQ-2 from html-artifacts (v2.33.0) — RESOLVED** — bootstrap markdown handling in `/complete-dev` and `output_format` flip-back behavior were carried over but did not block this release; folded-phase artifacts in this feature are markdown (the html-artifacts substrate handles HTML for canonical pipeline artifacts, not the slug-distinct findings docs).

### Migration notes

- **Pre-2.34.0 `state.yaml` files** are auto-migrated on read by `/feature-sdlc --resume`. The migration is idempotent: sets `schema_version: 2`, ensures `folded_phase_failures: []` on every phase entry, ensures `started_at: null` where absent, appends `retro` phase entry between `complete-dev` and `final-summary`. Emits a `migration: state.schema v1 → v2 (added: ...)` chat line.
- **Pre-2.34.0 paused pipelines** with `phases.msf-req` or `phases.simulate-spec` entries are read transparently — entries elide and the resume cursor advances to the next phase. No manual intervention required.
- **Existing `msf-findings.md` artifacts** in older feature folders are preserved unchanged. /verify reads new slug primary; falls back to legacy with soft warning.

---

## 2026-05-10 — pmos-toolkit 2.33.0: HTML-native artifact generation across feature-folder pipeline skills

Migrates 10 feature-folder pipeline skills (`/requirements`, `/spec`, `/plan`, `/msf-req`, `/msf-wf`, `/simulate-spec`, `/grill`, `/artifact`, `/verify`, `/design-crit`) plus the `/feature-sdlc` orchestrator's tracking artifacts from markdown-primary to HTML-primary authoring. Establishes a shared `_shared/html-authoring/` substrate (template, conventions, vendored turndown UMD + GFM plugin, hand-authored style.css ≤30 KB, single-script viewer.js with file:// fallback + sessionStorage try/catch + clipboard execCommand fallback, zero-deps serve.js with explicit MIME map + port-fallback, `html-to-md.js` CLI shim).

### What's new

- **HTML-primary feature-folder artifacts.** Every pipeline-stage artifact (`01_requirements.html`, `02_spec.html`, `03_plan.html`, plus `/msf-req`, `/msf-wf`, `/simulate-spec`, `/grill`, `/artifact`, `/verify`, `/design-crit` outputs and the `/feature-sdlc` `00_pipeline.html` + `00_open_questions_index.html`) is authored as semantic HTML5 with `<section>` per H2, kebab-case stable IDs, sibling `<artifact>.sections.json` ground-truth manifest, asset-relative `assets/*` references, and zero server-side MD→HTML conversion. Existing markdown artifacts in older feature folders are untouched (forward-only migration).
- **`output_format` resolution gate.** Settings `output_format ∈ {html, md, both}` (default `html`); the literal token `markdown` and any out-of-set value exit 64. Resolution precedence is per-skill `--format` flag → `.pmos/settings.yaml :: output_format` → built-in default. Inlined as a non-interactive-block-style gate in all 10 affected skills.
- **Format-aware input resolver (`_shared/resolve-input.md`).** Picks `<artifact>.html` then `<artifact>.md` then errors with a clear message; consumers (reviewer subagents, downstream stages) traverse the canonical resolution order without per-skill duplication.
- **Reviewer subagent input contract.** Five reviewer-dispatching skills (`/grill`, `/verify`, `/msf-req`, `/msf-wf`, `/simulate-spec`) carry a Phase-1 "Input Contract (when invoked as reviewer subagent)" subsection — each consumes chrome-stripped HTML and validates `sections_found` against the ground-truth `<artifact>.sections.json` (FR-50/50.1/52). Chrome-strip is the **parent's** responsibility: `_shared/html-authoring/chrome-strip.md` documents the algorithm; `_shared/html-authoring/assets/chrome-strip.js` (≤80 LOC ref impl) is the canonical implementation; `tests/scripts/assert_chrome_strip.sh` exercises a 5-fixture self-test. `/verify` Phase 3 Multi-Agent Code Quality Review block is carved out (FR-50.1) since those reviewers consume git diffs, not artifact HTML.
- **`/diagram` blocking subagent pattern.** `/spec` Phase 5 dispatches `/diagram` as a blocking Task subagent (300s timeout × 3 attempts → inline-SVG fallback after 3 failures; 30 min wall-clock cap per `/spec` run via `diagram_subagent_state` accumulator). `/plan` Execution-order section cross-references the pattern. Three figcaption provenance variants (subagent / fallback / inline). Selftest at `plugins/pmos-toolkit/skills/diagram/tests/run.py` exit 0.
- **Cross-doc anchor scan in `/verify` smoke (FR-92).** Broken cross-document anchors (e.g., `02_spec.html#nonexistent-section`) are hard-failed during `/verify` smoke runs.
- **Heading-id rule (FR-03.1).** Every `<h2>`/`<h3>` carries a kebab-case `id` derived from the visible heading text; `tests/scripts/assert_heading_ids.sh` enforces the contract across feature-folder fixtures.
- **viewer.js classic-script (FR-05.1).** Single-script viewer (≤30 KB budget; 12984 bytes actual) with no ES module patterns; lint enforced by `plugins/pmos-toolkit/tools/lint-no-modules-in-viewer.sh` + `tests/scripts/assert_no_es_modules_in_viewer.sh`. Eleven UI surfaces: chrome + iframe routing + per-section Copy MD + full-doc Copy MD + sessionStorage state restore (with try/catch fallback) + clipboard execCommand fallback + file:// fallback banner + legacy-md `<pre class="pmos-legacy-md">` shim + four others.
- **Eight new assert scripts in `tests/scripts/`** — `assert_resolve_input.sh` + `_resolve_input_harness.sh` (4 sub-fixtures), `assert_sections_contract.sh`, `assert_format_flag.sh` (10 skills), `assert_unsupported_format.sh` (10 skills), `assert_no_md_to_html.sh` (G2 enforcement), `assert_no_es_modules_in_viewer.sh`, `assert_heading_ids.sh`, `assert_cross_doc_anchors.sh` — plus `assert_chrome_strip.sh` and `assert_serve_js_unit.sh` from earlier phases.
- **Canonical fixture** at `tests/fixtures/repos/node/docs/pmos/features/2026-05-09_html-artifacts-fixture/` (5 HTML artifacts + sibling sections.json + 4 cross-doc anchors + index.html + 6 byte-identical assets) drives the assert suite end-to-end.

### Known limitations / open questions

- **OQ-1 (deferred to pre-2.34.0)** — When `/complete-dev` is updated to handle the bootstrap markdown still present in this feature's own artifacts (`01_requirements.md`, `02_spec.md`, `03_plan.md`), the choice between auto-regenerate-as-HTML, hand-convert via turndown reverse, or leave-as-historical-MD is unresolved.
- **OQ-2 (deferred to pre-2.34.0)** — When `output_format` flips from `both` back to `html`, behaviour for existing `.md` sidecars from prior runs is undefined.
- **ADV-T19** — `msf-req/SKILL.md` lacks the canonical `<!-- non-interactive-block:start -->` contract carried by the other 9 affected skills (pre-existing rollout gap; not introduced by this feature).
- **ADV-T21** — `lint-no-modules-in-viewer.sh` is not yet wired into a multi-lint runner (none currently exists; tool + assert wrapper callable independently).
- **ADV-T24** — `audit-recommended.sh` fails on 13 unmarked `AskUserQuestion` call sites across `changelog`, `create-skill`, `execute`, `feature-sdlc` SKILL.md files (pre-existing on `main`; not introduced by this feature).

Single release; rollback = revert merge.

## 2026-05-09 — pmos-toolkit 2.32.0: `/create-skill` and `/update-skills` wired into `/complete-dev`

Closes the loop on the `requirements → spec → plan → execute → verify → complete-dev` pipeline by making the terminal `/complete-dev` edge real (not aspirational) at both batch entry points.

### What's new

- **`/create-skill` Phase 7 canonical-path precondition** — at write-time, refuses to write a skill outside `plugins/pmos-toolkit/skills/<skill-name>/`. Three options (Use canonical / Override-as-risk / Abort); default Recommended. Prevents the silent failure where a new skill is invisible to the plugin manifest.
- **`/create-skill` Phase 9 — Release via `/complete-dev`** — after `/verify` passes, prompts whether to invoke `/complete-dev` now / batch / skip. New row in the Phase 8 pipeline-status table for `complete-dev`. Old learnings phase renumbered to Phase 10.
- **`/update-skills` batch-level `/complete-dev` invocation** — Phase 8 dispatch now ends with one `/complete-dev` call per batch (after every approved skill passes `/verify`), not per-skill. Avoids N redundant version bumps / deploys / pushes when shipping multiple skill updates.
- **Pipeline-position diagrams updated** in both skills' bodies and frontmatter descriptions to terminate at `/complete-dev` instead of `/verify`. Convention 3 description guidance extended.
- **Repo `CLAUDE.md` added at root** — captures three project-level invariants that aren't obvious from directory structure: canonical pmos-toolkit skill path, paired-manifest version sync, `/complete-dev` as canonical release entry point. Loaded into every Claude Code session so manual skill moves/copies/renames are caught by the rule, not by coupling generic skills to repo-specific layouts.
- **Legacy `/push` references removed** in `/create-skill` Convention 1 and `/update-skills` Release-prereqs section; both now point at `/complete-dev`.

### Why

`/complete-dev` superseded the legacy `/push` in 2.30.0 but the two batch-style entry points (`/create-skill`, `/update-skills`) still terminated at `/verify`, leaving the user to remember the manual release step. The pipeline diagrams claimed an edge that the skills didn't actually walk. This release makes the diagrams honest. The accompanying repo `CLAUDE.md` keeps the misplaced-skill guard out of `/complete-dev` itself — a generic release skill should not couple to one repo's directory layout.

## 2026-05-09 — pmos-toolkit 2.31.0: `/feature-sdlc` end-to-end SDLC orchestrator

New top-level orchestrator that turns an idea into a shipped feature by driving the full pipeline sequentially — with auto-tiering, resumable state inside a git worktree, pre-heavy-phase compact checkpoints, and `--non-interactive` plumbing through every child skill.

### `/feature-sdlc` (new)

- Drives `requirements → grill → [msf-req | creativity | wireframes → prototype] → spec → [simulate-spec] → plan → execute → verify → complete-dev` sequentially. Auto-tiers each gate from the requirements doc; honours an explicit `--tier 1|2|3` override that drives both child passthrough (where children accept it) and orchestrator gate logic.
- Creates a git worktree + `feat/<slug>` branch on entry; refuses fast on the four edge cases (not-a-repo / detached HEAD / dirty tree / branch already exists), with the existing-branch case offering Use / Pick-new-slug / Abort.
- Persists resumable state at `<worktree>/.pmos/feature-sdlc/state.yaml` (schema_version: 1, refuse-newer / auto-migrate-older). On no-arg invocation inside a worktree with state.yaml, auto-detects resume; jumps to the first non-completed phase after showing the status table.
- Surfaces a compact checkpoint before each context-heavy phase (wireframes, prototype, simulate-spec, execute, verify) with a precise three-part Pause-resumable exit contract: state.yaml records `paused_reason`, chat prints exact resume command including `cd <worktree>`, clean exit. Skills can't trigger `/compact` directly — this is the contract that makes pause work.
- Failure dialog is constructed from per-phase hard/soft tags in `state-schema.md` (single source of truth). Skip is hidden for the six hard phases (`requirements`, `spec`, `plan`, `execute`, `verify`, `complete-dev`); shown for the six soft phases. Missing-skill detection presents a Pause-to-install option instead of silent skip.
- `--non-interactive` plumbs through child skills and aggregates their deferred-question artifacts into a single `00_open_questions_index.md` written at end-of-run or end-of-pause. `/grill` is auto-skipped in non-interactive mode with an explicit chat log line (never silent).
- `/wireframes` gate is always presented per FR-FRONTEND-GATE; the keyword heuristic only biases which option is `(Recommended)`. Tier-1 always recommends Skip regardless of heuristic.

### README

- New "Pipeline orchestrators" subsection groups `/feature-sdlc` alongside `/update-skills` (moved from "Pipeline enhancers"). Standalone-line updated to include `/feature-sdlc`.

### References

- `docs/pmos/features/2026-05-09_feature-sdlc-skill/02_spec.md` — full Tier-3 spec (status: verified) including the 11 post-grill dispositions in §15.
- `docs/pmos/features/2026-05-09_feature-sdlc-skill/03_plan.md` — implementation plan (16 tasks + TN, 2 phases).
- `docs/pmos/features/2026-05-09_feature-sdlc-skill/verify/2026-05-09-review.md` — /verify report (PASS, 0 critical).
- `plugins/pmos-toolkit/skills/feature-sdlc/` — SKILL.md + 6 reference files (state-schema, pipeline-status-template, slug-derivation, frontend-detection, compact-checkpoint, failure-dialog).

---

## 2026-05-08 — pmos-toolkit 2.30.0: `/update-skills` retro friction fixes across `/changelog`, `/complete-dev`, `/verify`, `/execute`

Driven by the 2026-05-08 retro of a 6-run `/execute` + 4-run `/verify` + 1-run `/complete-dev` + 1-run `/changelog` session. Seven approved findings shipped; three skipped with reasons recorded in the triage doc.

### `/changelog`

- When `.pmos/settings.yaml :: docs_path` points somewhere other than `docs/` but a sibling `docs/changelog.md` already exists, `/changelog` now writes to the sibling and emits a one-line non-blocking advisory to reconcile `settings.yaml`. Previously you had to manually redirect at every run.

### `/complete-dev`

- Phase 5 deploy-norm detection now recognizes Python projects: any `./pyproject.toml` or `./backend/pyproject.toml` with `[project]` metadata surfaces as a deploy signal, and "Build + publish to PyPI via `uv publish`" appears as a deploy menu option (recommended when no other signals are present; defers to CI when CI auto-deploys).

### `/verify`

- Phase-scoped `--scope phase --feature <slug> --phase <N>` runs no longer require a duplicate `TodoWrite` task per FR-ID. The markdown table inside `review.md` is the structural enforcement when the per-task logs already carry evidence-typed FR coverage. `TodoWrite`-as-gate stays mandatory for standalone feature-scope runs.
- Phase 4 sub-step 3d evidence guidance now explicitly warns: synthesized `KeyboardEvent`s must use `bubbles: true` to reach document-level listeners, otherwise the listener won't fire and you'll log a false negative. (One retro session almost shipped a false-pass for FR-E09 because of this.)
- Phase 5 sub-section 4b now ships a copy-pasteable markdown table template with example rows for each of the three valid `Outcome` values (`Verified` / `NA — alt-evidence` / `Unverified — action required`). Bare `Pass` / `Fail` / `✓` are now explicitly listed as not valid.

### `/execute`

- New `--no-halt` flag suppresses the per-phase `HALT_FOR_COMPACT` handshake on green; phase verify still runs and `phase-N.md` is still written, but the skill rolls directly into the next phase without pausing for a manual `/compact`. Failure escalation is unaffected.
- Mid-run, the executing agent now honors a session-sticky continuation directive: typing `[continue_through_phases]`, "continue without compacting", "no halts", "skip compacts", or "don't halt at phase boundaries" sets the same opt-out for the rest of the conversation. Default behavior (HALT on every green) is unchanged when neither flag nor directive is set.
- Phase 0.5 Resume Reports now append a "Last 5 lines from in-flight task body" bullet list under the resume table whenever a task is `in-flight` or `in-flight-with-commits`. The resuming agent sees the recent thinking trace (last test written, current deviation, etc.) without re-deriving from `git log`. Omitted entirely when no task is in-flight.

### Skipped findings (recorded in retro triage)

Three retro findings were dropped after triage: a `task_goal_hash` helper script (maintenance overhead not worth it), a "first-tag-on-mature-project" version-bump heuristic (edge case, manual override is fine), and a Recommended-marker flip on `/complete-dev` Phase 6 learnings scan (current dedup nudge is more valuable than the capture default).

### References

- `docs/pmos/features/2026-05-08_update-skills-retro-pipeline-friction/00_triage.md` — full triage with disposition log, per-skill tier, and pipeline-status.
- Per-skill requirements + verify reviews under `docs/pmos/features/2026-05-08_update-skills-retro-pipeline-friction/{changelog,complete-dev,verify,execute}/`.

## 2026-05-08 — pmos-toolkit 2.29.0: `/diagram --on-failure` flag for deterministic non-interactive terminal failures

- `/diagram` now accepts `--on-failure {drop|ship-with-warning|exit-nonzero}` to make Phase 6.5 (terminal-failure handler) disposition deterministic when running in non-interactive mode. The flag bypasses the existing `AskUserQuestion` and dispatches on three values:
  - `drop` — write nothing, exit 3, print one-line reason; caller (e.g., `/rewrite`) drops the diagram slot.
  - `ship-with-warning` — write the SVG with a leading `<!-- WARNING: <fails> -->` comment, exit 0.
  - `exit-nonzero` (default when `--non-interactive` is set) — write nothing, exit 4, print one-line reason; caller decides.
- New **Exit-Code contract table** documented in `/diagram` SKILL.md Phase 6.5 (codes: 0 success, 2 environmental, 3 drop, 4 exit-nonzero, 64 argument error). External callers can now rely on the contract without reading source.
- Interactive `/diagram` runs are unaffected — the existing `Ship-with-warning / Try-alt / Abandon` prompt remains the source of truth.
- New regression test `plugins/pmos-toolkit/tests/non-interactive/diagram-on-failure.bats` (7 assertions) locks in the SKILL.md contract.
- Per-skill addendum added to `plugins/pmos-toolkit/tests/non-interactive/per-skill-rollout-runbook.md` documenting the flag, the exit-code contract, and the awk-extractor false-positive gotcha (prose mentions of `AskUserQuestion` in tagged sections must be reworded to "interactive prompt" / "AUQ" to keep `audit-recommended.sh` green).
- Unblocks `/rewrite` v0.14.0's spec-only handoff swap, which depends on this contract for autonomous-default diagram generation.

### References
- [features/2026-05-08_update-skills-diagram-on-failure/01_requirements.md](features/2026-05-08_update-skills-diagram-on-failure/01_requirements.md)
- [features/2026-05-08_update-skills-diagram-on-failure/03_plan.md](features/2026-05-08_update-skills-diagram-on-failure/03_plan.md)
- [features/2026-05-08_update-skills-diagram-on-failure/verify/2026-05-08-review.md](features/2026-05-08_update-skills-diagram-on-failure/verify/2026-05-08-review.md)
- [../../plugins/pmos-toolkit/tests/non-interactive/diagram-on-failure.bats](../../plugins/pmos-toolkit/tests/non-interactive/diagram-on-failure.bats)

## 2026-05-08 — pmos-toolkit 2.28.1: /complete-dev rebase-default + parallel-worktree version-bump pre-flight

- `/complete-dev` Phase 3 now defaults to **rebase-onto-main + fast-forward** when a shared-branch guard passes (no upstream OR local SHA == remote SHA). Branches that have been pushed and diverged from local fall back to `--no-ff` merge with a one-line reason in the prompt. Rebase command sequence is now spelled out explicitly.
- `/complete-dev` Phase 9 now fetches `origin/main` and runs a 3-way (local / main / branch-point) version pre-flight that detects parallel-worktree bump collisions before commit. Five verdict states: Clean, Clean-after-rebase, Fresh local bump, Stale-bump (triggers recovery), and Anomaly.
- New `reference/version-bump-recovery.md` documents the stale-bump recovery recipe (restore both paired manifests from origin/main, re-bump from main's baseline) plus failure modes and manual fallback.
- Added anti-pattern entry: the shared-branch guard's `local==remote SHA` test is necessary-but-not-sufficient — documented as a runtime caveat to prefer the merge fallback for any branch shared for review.
- Pre-push hook unchanged — it remains the authoritative last line of defence; the new pre-flight catches collisions earlier and friendlier.

### References
- `docs/pmos/features/2026-05-08_update-skills-complete-dev-merge/01_requirements.md`
- `docs/pmos/features/2026-05-08_update-skills-complete-dev-merge/02_spec.md`
- `docs/pmos/features/2026-05-08_update-skills-complete-dev-merge/03_plan.md`
- `docs/pmos/features/2026-05-08_update-skills-complete-dev-merge/verify/2026-05-08-review.md`
- `plugins/pmos-toolkit/skills/complete-dev/SKILL.md`
- `plugins/pmos-toolkit/skills/complete-dev/reference/version-bump-recovery.md`

## 2026-05-08 — pmos-toolkit 2.28.0: cross-cutting `--non-interactive` mode

- All 26 user-invokable skills now accept a `--non-interactive` (and symmetric `--interactive`) flag. In non-interactive mode, every `AskUserQuestion` checkpoint is classified at runtime: calls with a `(Recommended)` option AUTO-PICK; calls without one (or with an adjacent `<!-- defer-only: <reason> -->` tag) DEFER to a structured `## Open Questions (Non-Interactive Run)` block in the produced artifact.
- Repo-level default via `.pmos/settings.yaml :: default_mode` (`interactive` | `non-interactive`); precedence: `cli_flag > parent_marker > settings.default_mode > builtin-default`.
- Three-state exit contract: `0` clean / `2` deferred / `1` runtime error / `64` usage-or-refusal.
- Subagent propagation: parent skill prepends `[mode: <current>]` as the literal first line of any child's prompt; child resolver detects + reports `mode: <m> (source: parent-skill-prompt)` on stderr.
- Per-checkpoint classifier with three defer-only reasons: `destructive` (overwrite/delete/reset/force), `free-form` (paste/file/dictate/free-text), `ambiguous` (confirm/picker without defensible auto-pick). Destructive tag wins over `(Recommended)` (FR-04.1).
- `/msf-req` declares itself refused (`<!-- non-interactive: refused; reason: recommendations-only with free-form persona inference -->`); `--non-interactive` against a refused skill exits 64 with a stderr-only diagnostic.
- Backward compatibility: a `--non-interactive` arg against a skill that has not yet been rolled out emits `WARNING: --non-interactive not yet supported by /<skill>; falling back to interactive.` and continues in interactive mode (FR-08).
- `tools/audit-recommended.sh` enforces that every `AskUserQuestion` in supported `SKILL.md` has either a `(Recommended)` option or a `<!-- defer-only: ... -->` adjacent tag (`destructive` | `free-form` | `ambiguous`); supports `--strict-keywords` to warn on un-tagged destructive vocabulary (`overwrite|restart|discard|drift|delete|force|reset|wipe`).
- `tools/lint-non-interactive-inline.sh` enforces drift-detection on the canonical `_shared/non-interactive.md` block across all supported skills.
- New CI: `.github/workflows/audit-recommended.yml` runs both scripts on every PR touching `plugins/pmos-toolkit/skills/**/SKILL.md` or the canonical `_shared/non-interactive.md`.
- 13 unit-bats files under `plugins/pmos-toolkit/tests/non-interactive/` (51 cases / 1 documented skip) cover resolver precedence, classifier decision tree, buffer-and-flush dispatch (single-MD / sidecar / chat-only / multi-artifact), destructive auto-pick override, refusal regex, parser, parent-marker propagation, child-OQ-id namespacing, and resolver/extractor perf budgets.
- 26 integration smoke tests under `plugins/pmos-toolkit/tests/integration/non-interactive/` (opt-in via `PMOS_INTEGRATION=1`; each takes 30–120s of LLM time) — invoke `claude -p '/<skill> --non-interactive ...'` and assert zero `AskUserQuestion` events.
- 2 manual E2E runbooks (`MANUAL-subagent.md` for FR-06 propagation, `MANUAL-bc-fallback.md` for FR-08).

### Notable plan deviations during execution

- The canonical awk extractor's marker regexes (`/<!-- non-interactive-block:start -->/`) originally matched their OWN literal substrings inside the inlined block (the awk script self-references the markers in its rule lines). This flipped `in_inlined` mid-block and let the awk's `/AskUserQuestion/` rule line itself escape the skip region. Fixed by anchoring marker regexes to whole-line (`/^...$/`).
- Plan estimate "≤4 defer-only tags per skill after manual review" assumed prose enumerates options inline with `(Recommended)`; in practice prose-style SKILL.md (the majority) describes calls semantically, so most skills got 5–18 tags.
- 17 of 26 skills lack an inlined `pipeline-setup-block` (Anchor B in the runbook); only 9 use Anchor A. Runbook documents both.
- 4 false-positive `AskUserQuestion` mentions per skill on average (Platform Adaptation notes, anti-pattern bullets, parenthetical asides, section headings) needed prose rephrasing rather than tagging — tagging would pollute the runtime OQ buffer with phantom DEFERs.

### References

- [`docs/pmos/features/2026-05-08_non-interactive-mode/02_spec.md`](features/2026-05-08_non-interactive-mode/02_spec.md) — non-interactive mode spec (FR-01..FR-09, NFR-01..NFR-07, E1..E14)
- [`docs/pmos/features/2026-05-08_non-interactive-mode/03_plan.md`](features/2026-05-08_non-interactive-mode/03_plan.md) — 45-task implementation plan (Phase 1 Foundation → Phase 4 Ship)
- [`plugins/pmos-toolkit/skills/_shared/non-interactive.md`](../../plugins/pmos-toolkit/skills/_shared/non-interactive.md) — canonical contract (Section 0 inline block, Section A refusal, Section B parser, Section C subagent propagation)
- [`plugins/pmos-toolkit/tests/non-interactive/per-skill-rollout-runbook.md`](../../plugins/pmos-toolkit/tests/non-interactive/per-skill-rollout-runbook.md) — 10-step procedure for adding the contract to a skill
- [`plugins/pmos-toolkit/tools/audit-recommended.sh`](../../plugins/pmos-toolkit/tools/audit-recommended.sh) and [`plugins/pmos-toolkit/tools/lint-non-interactive-inline.sh`](../../plugins/pmos-toolkit/tools/lint-non-interactive-inline.sh) — CI-enforced drift checks

---

## 2026-05-08 — pmos-toolkit 2.27.0: /create-skill plan+verify + /plan v2 cross-stack support + first changelog

> Note: v2.26.0 was tagged and shipped without a `docs/pmos/changelog.md` entry. This 2.27.0 release adds the first entry retroactively, covering the 2.24.0 → 2.27.0 span (everything between the previous tagged release and now).

- `/pmos-toolkit:create-skill` now runs the full pipeline. Tier 2+ runs `/plan` after spec/grill; all tiers run `/verify` after implement. The inline pre-save checklist is gone — `/verify` is the single source of truth for skill verification.
- Spec status lifecycle on skill creation extends to `draft → grilled → planned → approved → implemented → verified` so each phase boundary is auditable.
- `/spec` now emits a frontmatter contract (FR-01..FR-18 stable IDs, anchors per FR) so downstream `/plan` and `/verify` can reference requirements by anchor instead of line number.
- `/plan` v2: Phase 0 lockfile + backup, Phase 2 simulate-spec hook, Phase 4 hard task cap, blind-subagent review, skip-list and branch-strategy fields, "Done when" frontmatter contract, tier-aware templates.
- `/execute` v2: per-task `commit_cadence` (per-step / per-task / phase-end), new task frontmatter fields, back-compat with v1 plans.
- Cross-stack support added across `/plan`, `/execute`, `/spec`: shared stack preambles for Python (pytest/poetry/uv), Rails (rspec/minitest), Go, static-site, and Node variants. Skills now detect host stack and inline the right test/lint/build phrasing.
- CI lint scripts: `lint-stack-libraries.sh`, `lint-platform-strings.sh`, `lint-js-stack-preambles.sh` enforce cross-platform phrasing and prevent stack-specific drift in skill bodies.
- `/backlog` type enum extended with `enhancement`, `chore`, `docs`, `spike`; new heuristics auto-classify items at capture.
- Legacy commands pruned from the `/plan` body — fewer footguns, sharper guidance.
- Integration test fixtures and assert scripts shipped under `tests/fixtures/` so contributors can dry-run pipeline changes locally.

### References

- [`docs/pmos/features/2026-05-08_update-skills-add-plan-verify/02_spec.md`](features/2026-05-08_update-skills-add-plan-verify/02_spec.md) — /create-skill plan+verify spec
- [`docs/pmos/features/2026-05-08_update-skills-add-plan-verify/03_plan.md`](features/2026-05-08_update-skills-add-plan-verify/03_plan.md) — implementation plan
- [`plugins/pmos-toolkit/skills/create-skill/SKILL.md`](../../plugins/pmos-toolkit/skills/create-skill/SKILL.md) — updated /create-skill body
- [`plugins/pmos-toolkit/skills/plan/SKILL.md`](../../plugins/pmos-toolkit/skills/plan/SKILL.md) — /plan v2
- [`plugins/pmos-toolkit/skills/execute/SKILL.md`](../../plugins/pmos-toolkit/skills/execute/SKILL.md) — /execute v2
- [`plugins/pmos-toolkit/skills/_shared/stacks/`](../../plugins/pmos-toolkit/skills/_shared/stacks/) — cross-stack preambles
