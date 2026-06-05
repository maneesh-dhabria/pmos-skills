---
name: architecture
description: Audit a repo against tiered architectural principles (L1 universal ≤15 rules, L2 stack-specific TS+Python, L3 per-repo overrides); emit an HTML+MD+JSON triplet under `{docs_path}/architecture/`; optionally run a deepening pass (`--deep`) to classify modules as deep / shallow / leaky and propose reshapes. Use when the user says "audit my codebase against principles", "run an architecture review", "check for circular imports", "find shallow modules", "do a deep architectural audit", "scaffold an L3 config", "audit a monorepo", "diff against a baseline", "/architecture", or "lint my repo against universal rules".
user-invocable: true
argument-hint: "audit [path] [--label <slug>] [--non-interactive] [--deep] [--include-info-comments] [--monorepo] [--since <ref>] [--baseline <path>] [--scaffold-l3] [--sort risk] [--from-spec <spec-path>]"
target: generic
---

# /architecture

Audits a repository against tiered architectural principles and emits an HTML+MD+JSON triplet. L1 universal rules (≤15) ship with the plugin; L2 adds stack-specific rules (TypeScript via dependency-cruiser, Python via ruff + a cross-file AST harness); L3 lets a project override disposition, exempt files, or add rules at `<repo>/.pmos/architecture/principles.yaml`. An opt-in deepening pass (`--deep`) dispatches a subagent to classify modules along deep / shallow / leaky axes and propose reshapes.

**Announce at start:** "Using /architecture to audit the repo against tiered principles."

The skill is read-mostly. It writes an HTML+MD+JSON triplet to `{docs_path}/architecture/{date}_<slug>.{html,md,json}` (where `{docs_path}` resolves from `.pmos/settings.yaml`, defaulting to `docs/pmos/`); a one-line human summary on stderr; nothing else. Stdout is empty. It does NOT modify source code. The skill's own shape conforms to the generic skill-authoring conventions at `plugins/pmos-toolkit/skills/feature-sdlc/reference/skill-patterns.md §A–§F` (the standing acceptance criteria).

At Phase 0, the skill reads `~/.pmos/learnings.md` if present; entries under `## /architecture` factor into its approach (skill body wins on conflict; surface conflicts to the user before applying).

## Track Progress

This skill runs 7 phases sequentially against the resolved scan root (Phase 4a is the opt-in deepening pass). Use your agent's task-tracking tool (e.g., `TaskCreate`/`TaskUpdate` in Claude Code) to create one task per phase, mark each in-progress when entered, and completed when its artifact lands. If no task tracker is available, the stderr summary line + the on-disk triplet are the durable progress record.

## When NOT to use

- **Style or formatting lint.** This skill audits *architecture* (boundaries, cycles, coupling, depth). For code-style issues, run `ruff` / `prettier` / `eslint` directly.
- **Docs-only or non-code repos.** With no source files in the scan root, every L1/L2 rule short-circuits to zero findings; the resulting triplet is empty noise.
- **Single-file scripts.** L1 cycle / coupling / depth rules have no signal at this scale; the time cost outweighs the value.
- **Repos missing required tooling** (`jq`, `python3`, `node`). Phase 0 halts before emitting the triplet — install the prerequisites first.
- **PR-scoped diff review.** Use `--since <ref>` to constrain the scan; do not run a full audit as a per-PR gate (the report is a project-level artifact, not a per-commit check).

## Platform Adaptation

Reference tool names below are Claude Code. In other environments:

- **Codex / no `AskUserQuestion`:** the only interactive prompts are confirmations around `--scaffold-l3` overwrite and (when relevant) monorepo fan-out. On Codex, present a numbered free-form prompt with the same options. `--non-interactive` defers prompts and emits defaults.
- **No subagent / Task tool:** `--deep` is a no-op — the harness probes for a Task-tool runtime marker and, when absent, records `skipped_reason: no_tool_use_runtime` under `deep_pass` and proceeds with mechanical evaluators only. The audit works identically with or without a Task tool; only the deepening pass is gated.
- **No Playwright / MCP:** unused by this skill.
- **TaskCreate / TodoWrite missing:** the skill body works without task tracking; the on-disk triplet is the canonical artifact.

## Non-interactive mode

This skill honours `--non-interactive` per the canonical contract inlined below (byte-identical to `_shared/non-interactive.md`; audited by `tools/lint-non-interactive-inline.sh`). The runtime classifier reads each structured prompt it is about to issue; static auditing lives in `tools/audit-recommended.sh`.

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

## Phase 0: Prerequisites

The audit harness shells out to `jq`, `python3` (with PyYAML), `node` (substrate renderers), and optionally to `npx dependency-cruiser` (for TS/Vue) and `ruff` (for Python). Prerequisite gates:

1. **Required:** `jq`, `python3`, `node`. Missing → stderr `ERROR: /architecture requires <tool>. Install via brew/apt/dnf, then re-run.` and exit 64.
2. **Optional (graceful degrade):** `npx dependency-cruiser`, `ruff`. Missing → emit a `tools_errored[]` entry in the JSON sidecar; the corresponding L2 rules are skipped for this run. The audit still succeeds; the report records the gap.

If a required tool is missing, the run halts; the triplet is NOT emitted.

## Phase 1: Resolve scan root + parse flags

Parse the argument string:

- Positional `[path]` is the scan root. Default: `.` (cwd).
- `--label <slug>` — override the slug used in the output filename triplet (default: scan root basename).
- `--non-interactive` — defer prompts; emit defaults.
- `--deep` — opt into the Phase 4a deepening pass.
- `--include-info-comments` — keep `wont_fix` findings in the HTML and MD output (default: JSON-only).
- `--monorepo` — fan out across detected stack subtrees and emit one triplet per stack plus an index.
- `--since <ref>` — diff findings against a git ref; only new findings render.
- `--baseline <path>` — diff against a saved JSON baseline.
- `--scaffold-l3` — write a starter `.pmos/architecture/principles.yaml` and exit.
- `--sort risk` — sort findings within each disposition by `risk_score` descending instead of file/line order.

The legacy v1 ADR-promotion flag is rejected at parse time with an explicit "ADR promotion removed in schema v2; see CHANGELOG" message and exit 64. Other unknown flags → stderr usage line, exit 64.

Resolve `~`/symlinks once (no recursive follow). The resolved absolute path is recorded under `config.scan_root` in the JSON sidecar.

## Phase 2: Load rules — 3-tier merge

Rule loading is delegated to the harness (`scripts/run-audit.sh`); cite this phase, do not re-implement it. The loader:

1. **L1 + L2 (plugin-owned):** reads `plugins/pmos-toolkit/skills/architecture/principles.yaml` shipped with this plugin. The L1 set is capped at 15 rules.
2. **Stack detection:** scans the resolved root for stack markers (`tsconfig.json`, `package.json`, `pyproject.toml`, `*.vue`); only matching L2 rules participate.
3. **L3 (project-owned):** if `<scan_root>/.pmos/architecture/principles.yaml` exists, merge per-rule overrides + exemptions on top of the plugin set. L3 may set any disposition (including `wont_fix`) for any rule, and may add new rules. The rule must still be loaded and remain visible in `rules_loaded`; muting is via `wont_fix`, not removal.

The full L1 rule list, rationales, and source citations live at [`reference/l1-rationales.md`](reference/l1-rationales.md) (progressive disclosure). The gap-map rationale (why each rule delegates to grep / dep-cruiser / ruff / cycle-py / inline AST) lives at [`reference/gap-map-rationale.md`](reference/gap-map-rationale.md).

## Phase 3: Scan files

The scanner walks the resolved root and enumerates files for rule evaluation:

- Honors `.gitignore` when the scan root is a git repo (uses `git check-ignore`).
- Applies a hardcoded deny-list for paths that are universally noise: `node_modules/`, `.git/`, `dist/`, `build/`, `.next/`, `.venv/`, `__pycache__/`, `.pytest_cache/`.
- Filters by extension per the rule set's needs (`.ts`, `.tsx`, `.vue`, `.js`, `.jsx`, `.py`, plus a configurable extra).
- Records counts under `scanned.{total, by_ext, excluded_by_gitignore, excluded_by_fallback}` in the JSON sidecar.

## Phase 4: Evaluate rules (mechanical)

Each loaded rule dispatches by `delegate_to`:

- **`grep`:** the harness's built-in evaluators (hygiene, security/safety) — see `scripts/run-audit.sh` for the per-rule check expressions.
- **`ast-inline`:** in-harness Python AST checks for U001/U002 size limits, U004 debug-log idiom suppression (Typer/Click `@app.command()`-decorated function bodies only), and U011 cross-file duplicate-signature detection.
- **`dependency-cruiser`:** shells out to `npx dependency-cruiser` with the plugin-owned `scripts/.depcruise.cjs` config; parses JSON and surfaces findings against TS001–TS004.
- **`ruff`:** shells out to `ruff check --format=json` against rules PY001–PY008 (complexity, branches, magic values, unused args, etc.).
- **`cycle-py`:** delegates to `scripts/cycle-py.py` for PY009 Python import-cycle detection (dep-cruiser covers JS/TS only).

Findings are sorted deterministically by disposition, then `rule_id`, then `file`, then `line`.

Vue SFC coverage gap: dependency-cruiser does not parse `<script setup>` blocks. The harness counts `.vue` files in the scan and emits a `coverage_gaps[]` entry (`vue_sfc_unanalyzed`) when any are skipped — the user sees the gap; the audit does not silently misreport.

## Phase 4a: Deepening Pass (opt-in)

`--deep` is off by default; mechanical evaluators (Phases 1–4) suffice for most runs. When set, the harness runs a deepening pass that classifies modules along a deep / shallow / leaky axis and proposes reshapes. The vocabulary (deep / shallow / leaky / deletion-test / seam / adapter / leverage / locality / module-interface-implementation) is defined in [`reference/deepening-vocabulary.md`](reference/deepening-vocabulary.md), which is read at runtime as the Task-subagent SYSTEM prompt.

**Runtime probe.** The harness probes for a Task-tool environment marker. When absent, it records `skipped_reason: no_tool_use_runtime` under `deep_pass` in the JSON and proceeds without deepening. `--deep` is a no-op on Codex and other no-subagent runtimes.

**Module-count cap.** Hard error at >5000 modules. Bypass with `ARCH_DEEP_NO_CAP=1` when the user has accepted the cost.

**Payload build.** The harness assembles a module-graph payload (file paths, imports, size-class seed hints) and filters it through a secret-file denylist covering `**/.env`, `**/.env.*`, `**/*.pem`, `**/*.key`, `**/credentials.json`, `**/credentials.yaml`, `**/.ssh/**`, and `**/secrets/**`.

**Subagent dispatch.** `scripts/dispatch-deep-pass.sh` is the orchestrator-side wrapper that pairs the payload with the SYSTEM prompt from `reference/deepening-vocabulary.md` (with the denylist advisory section embedded) and invokes the Task-tool primitive. The orchestrator wraps the subagent's Read calls through `read_with_denylist()` so denied paths return synthetic empty content. The subagent returns a JSON candidates array matching the shape locked in the spec.

**Validation.** Each candidate's `module` is grep-checked against the subagent's actually-read file content; any evidence quote that is not verbatim-present in the named file marks the candidate `validation_failed`. A fully-failed pass records `skipped_reason: validation_failed` and promotes no candidates.

**Promotion.** Validated candidates surface under `findings[]` with `classification` ∈ {deep, shallow, leaky}. Disposition derives from classification: `deep` → `wont_fix` (positive signal); `shallow` and `leaky` → `should_fix`. Each candidate becomes one finding, with the reshape proposal in `message`.

**Reconciliation with mechanical findings (size-class demotion).** When a candidate's `module` also matches a mechanical U001/U002 size finding, the mechanical finding's `disposition` is demoted one rank (`must_fix` → `should_fix`, `should_fix` → `wont_fix`; never re-promoted). Both findings remain visible — the demotion only changes the disposition, not the count.

## Phase 5: Reconcile exemptions

L3 may carry `exemptions:` rows that whitelist a `(rule, file)` pair, optionally with an `expires:` date. The disposition axis (`must_fix` / `should_fix` / `wont_fix`) replaces v1's severity axis throughout the report.

1. **Matching exemptions** (an exemption row that matches an active finding): the finding is dropped from `findings[]` and surfaced under `exemptions.applied[]`.
2. **Orphan exemptions** (an exemption row that matches no active finding): surfaced under `exemptions.orphan[]` (info-only — the exemption can be retired).
3. **Expired exemptions** (`expires` date in the past): the finding re-emits as `should_fix` and the row is logged under `exemptions.expired[]`. Re-affirm in `principles.yaml` or remove the row.

Size-class demotion (cross-link with Phase 4a): when a deepening candidate's `module` overlaps with a U001/U002 mechanical finding, the mechanical finding's `disposition` is demoted one rank — not silently dropped.

## Phase 6: Emit report (triplet)

Output is an HTML+MD+JSON triplet at `{docs_path}/architecture/{date}_<slug>.{html,md,json}`. `{docs_path}` resolves from `.pmos/settings.yaml` (default `docs/pmos/`). `<slug>` derives from the scan root's basename, or from `--label` when provided. Same-day collisions append `-2`, `-3`, ... to the slug.

- **HTML** is the primary artifact: substrate-rendered with kebab-case `<h2>` / `<h3>` IDs and `?v=<plugin-version>` cache-busted asset links.
- **MD** is a humans-only sidecar.
- **JSON** is the machine-readable schema-v2 sidecar; top-level keys include `schema_version: 2`, `config`, `scanned`, `findings[]` (each with `disposition`, not `severity`), `exemptions`, `module_metrics`, `godmodule_candidates`, `cycles`, `monorepo_detected`, `deep_pass {dispatched_at, seed_hint, candidates, skipped_reason}`, `tools_errored`, `tools_skipped`, and `coverage_gaps`.
- **Stdout is empty.** The single-line human summary goes to stderr in the form: `Wrote <path>: <N> Must Fix, <N> Should Fix, <N> Won't Fix in <N> files`.

**Sorting.** By default, findings are disposition-first (`must_fix`, `should_fix`, `wont_fix`), then `rule_id` asc, `file` asc, `line` asc. With `--sort risk`, findings sort by `risk_score` desc within each disposition.

**jq queries against the JSON sidecar:**

- `jq '.findings[] | select(.disposition == "must_fix")' <slug>.json` — list every blocker.
- `jq '.findings[] | select(.classification == "shallow")' <slug>.json` — list shallow-module findings from the deep pass.
- `jq '.diff.new[]' <slug>.json` — new findings vs `--since` / `--baseline`.
- `jq '.deep_pass.skipped_reason // empty' <slug>.json` — surface why the deep pass was skipped (or empty if it ran).
- `jq '.godmodule_candidates[]' <slug>.json` — list god-module candidates.

## Phase 7: Capture Learnings

After the report is emitted, reflect on whether this run surfaced anything worth capturing about `/architecture` itself — false-positive rules, missed coverage gaps, exemption-row gotchas, deep-pass validation friction. Append entries under `## /architecture` in `~/.pmos/learnings.md` for future runs. Proposing zero learnings is a valid outcome; the gate is that the reflection happens.

## Anti-Patterns (DO NOT)

- (a) **Do NOT silently drop double-reported findings.** When a deepening candidate's `module` overlaps with a mechanical U001/U002 finding, the mechanical finding's `disposition` is DEMOTED one rank (`must_fix` → `should_fix`, `should_fix` → `wont_fix`) — not removed. Both findings remain visible in `findings[]`.
- (b) **Do NOT promote unvalidated deepening candidates.** Subagent-returned candidates are grep-validated against actually-read file content; any candidate whose evidence quote is not verbatim-present in the named file is marked `validation_failed`. A fully-failed pass records `skipped_reason: validation_failed`.
- (c) **Do NOT silently audit one stack in a polyglot repo.** When the scanner detects multiple sibling stack roots (e.g., `pyproject.toml` + `package.json` in different subtrees) without `--monorepo`, the harness warns loudly to stderr (`multiple stacks detected; pass --monorepo to fan out`) and proceeds against the resolved root only.
- (d) **Do NOT treat U004 idiom exemption as file-level.** Debug-log suppression for Typer/Click `@app.command()`-decorated functions applies ONLY to the decorated function body. Sibling functions in the same file remain subject to U004.
- (e) **Do NOT emit findings to stdout.** All findings land in the on-disk triplet; stdout is empty. The single-line human summary goes to stderr only — printing to stdout breaks downstream tooling.
- (f) **Do NOT document the deep-pass test-only fixture flags.** They are gated by `FIXTURE=1` in the parser; production runs reject them with exit 64. They exist only to drive the fixture suite and have no user-facing surface.
- (g) **Do NOT silently drop an L1 universal rule via L3.** L3 may set any disposition for any rule (including `wont_fix`), but the rule must still be loaded and visible in `rules_loaded`. Mute via `wont_fix`, not via removal.
- (h) **Do NOT delegate to a tool that is not on PATH.** Auto-skip the rule and record an entry in `tools_errored[]`; crashing the audit on a missing optional tool is the wrong default.
- (i) **Do NOT hide coverage gaps.** Every `.vue` file that dep-cruiser cannot analyse, every Python file with a ruff parse error, every git query that fails — record under `coverage_gaps[]`. Silent omission breaks user trust in the report.

## Known limitations

- **Same-day re-run race (R8):** the same-day slug collision handler appends `-2`, `-3`, ... by scanning existing filenames before writing. Under concurrent runs on the same scan root in the same day, two processes can resolve the same suffix and the later writer wins. Spec-deferred; serialize concurrent runs externally.
- **Deepening pass requires a Task-tool runtime:** without one, the harness records `skipped_reason: no_tool_use_runtime` and proceeds with mechanical evaluators only.
- **Module-count cap:** the deepening pass hard-errors above 5000 modules. Set `ARCH_DEEP_NO_CAP=1` to bypass when the cost is acceptable.

## Tool version requirements

- `jq` ≥ 1.6 (required; sidecar renderer)
- `python3` ≥ 3.8 with `pyyaml` (required; rule loader, AST evaluators, cycle-py)
- `node` ≥ 18 (required; substrate renderer `build_sections_json.js`)
- `dependency-cruiser` ≥ 15 (optional; L2 TS rules)
- `ruff` ≥ 0.5 (optional; L2 Python rules)
- `git` ≥ 2.25 (required when scan root is a git repo; used for `.gitignore` honoring, `--since` diffs, and blame queries)

## Reference

- [`reference/l1-rationales.md`](reference/l1-rationales.md) — full per-rule rationale + source citation for U001–U011.
- [`reference/gap-map-rationale.md`](reference/gap-map-rationale.md) — per-rule rationale for `delegate_to:` assignment.
- [`reference/deepening-vocabulary.md`](reference/deepening-vocabulary.md) — vocabulary for the `--deep` pass (read at runtime as the Task-subagent SYSTEM prompt).

---

## Mode: --from-spec

Audit a `/spec` artifact (instead of the repo source tree) against the loaded principles. Used by `/spec` Phase 6b (folded sub-step) and `/verify` Phase 4b, but also runnable as a standalone CLI. Reads a spec HTML file's §Modules + §Architectural Assertions, dispatches a judge subagent against the merged L1+L2+L3 ruleset at `temperature: 0`, applies the FR-06 orchestrator-side validator + the 3 D8 knobs, and emits an HTML+MD+JSON triplet at `{docs_path}/architecture/{date}_<slug>_from-spec.{html,md,json}`.

**CLI signature (§9.1):**
```
/architecture --from-spec <spec-path>
              [--top-n <N>]              # default 8
              [--min-confidence <N>]     # default 70
              [--no-evidence-required]   # disables ≥40-char verbatim quote requirement
```

**Mutually exclusive with** `--since`, `--baseline`, `--deep`. Combining any pair → exit 64 (usage error).

**Dispatch flow:**

1. **Parse spec** — `node scripts/parse-spec.js <spec-path>` captures stdout JSON `{modules, assertions, section_ids}`. Propagate exit 65 verbatim with §9.4 stderr on spec-contract-violation.
2. **Load principles** — `bash scripts/load-principles.sh` captures stdout JSON (merged L1+L2 plugin + L3 overrides if present). Records loaded `rule_id_set` for downstream FR-06 validation.
3. **Build judge prompt** — read `reference/judge-prompt-template.md`; substitute `{{principles}}` (loaded JSON), `{{artifact}}` (stripped spec HTML body), `{{rule_id_set}}` (CSV of loaded rule IDs), `{{mode}}=from-spec`.
4. **Dispatch judge subagent** — blocking Task tool call, `temperature: 0`, 300s timeout. The judge returns a JSON array of finding objects per §13. The judge does NOT edit the spec.
5. **Validate findings (FR-06)** — `cat <judge-output> | node scripts/validate-findings.js --rule-id-set "<csv>" --source <spec-path>`. Drops any finding with unknown rule_id, out-of-range confidence, missing quote, quote <40 chars, or quote not verbatim-substring of source. Each drop logged to stderr.
6. **Apply knobs (D8)** — `... | node scripts/apply-knobs.js --top-n <N> --min-confidence <N> [--evidence-required]`. Order: drop below min-confidence → drop missing-quote-when-evidence-required → cap top-N by (severity, confidence).
7. **Emit triplet (§9.3)** — `... | node scripts/emit-findings.js --out-prefix {docs_path}/architecture/{date}_<slug>_from-spec --mode from-spec --source-path <spec-path>`. Atomic temp+rename writes for all three files (E6 same-day overwrite is safe). HTML carries `<meta name="pmos:skill" content="architecture">`; MD has `## Finding N` headings; JSON is the §13 schema.

**Exit codes:**
- `0` — success; triplet written; stderr summary line.
- `1` — runtime error (judge dispatch failure, file IO error).
- `64` — usage error (mutually exclusive flag combo, missing spec path, file not found).
- `65` — spec-contract-violation (propagated from `parse-spec.js`).

**When invoked by `/spec` Phase 6b or `/verify` Phase 4b:** the parent passes the spec path and consumes the JSON output; HTML+MD triplet is still written for human review. See spec §6.6 / §4.7 for parent-side handling of findings (escalate `must_fix` to spec FRs; surface `should_fix` to author).

---

## Mode: --since

Audit only the source-tree delta between two git refs against the loaded principles (instead of the full repo). Used by `/verify` Phase 4b alongside `--from-spec`, and runnable as a standalone CLI for PR-scoped review. Reads `git diff --name-only $SINCE..HEAD`, dispatches a judge subagent against the changed files with the merged L1+L2+L3 ruleset at `temperature: 0`, applies the FR-06 orchestrator-side validator + the 3 D8 knobs, and emits an HTML+MD+JSON triplet at `{docs_path}/architecture/{date}_<slug>_since.{html,md,json}`. Findings carry `file_path` (not `spec_section_id`) per §13.

**CLI signature:**
```
/architecture --since <ref>
              [--top-n <N>]              # default 8
              [--min-confidence <N>]     # default 70
              [--no-evidence-required]   # disables ≥40-char verbatim quote requirement
```

**Mutually exclusive with** `--from-spec`, `--baseline`, `--deep`. Combining any pair → exit 64 (usage error).

**Pre-flight (empty-diff short-circuit, FR-09):**

```bash
CHANGED="$(git diff --name-only "$SINCE"..HEAD)"
if [ -z "$CHANGED" ]; then
  echo "architecture: no changes since $SINCE; skipping" >&2
  exit 0
fi
```

When `CHANGED` is empty, the skill exits 0 with the skip log line on stderr and emits **no triplet** — same-day overwrite of a prior triplet does not fire on empty diffs, so the prior artifact is preserved.

**Dispatch flow (non-empty diff):**

1. **Resolve changed files** — `CHANGED="$(git diff --name-only $SINCE..HEAD)"` captures the set of files the judge will review (the `<artifact>` slot in the prompt template is the concatenated set).
2. **Load principles** — `bash scripts/load-principles.sh` captures stdout JSON (merged L1+L2 plugin + L3 overrides if present). Records loaded `rule_id_set` for downstream FR-06 validation.
3. **Build judge prompt** — read `reference/judge-prompt-template.md`; substitute `{{principles}}` (loaded JSON), `{{artifact}}` (the changed files' content, path-labelled), `{{rule_id_set}}` (CSV of loaded rule IDs), `{{mode}}=since`. The judge is instructed by the template to emit findings with `file_path` (the changed-file path) instead of `spec_section_id` per §13 / §9.2 case 2.
4. **Dispatch judge subagent** — blocking Task tool call, `temperature: 0`, 300s timeout. Read-only; the judge does NOT edit source.
5. **Validate findings (FR-06, FR-10)** — `cat <judge-output> | node scripts/validate-findings.js --rule-id-set "<csv>" --source <concatenated-source>`. Same rules as `--from-spec`: drops unknown rule_id, out-of-range confidence, missing quote, quote <40 chars, or quote not verbatim-substring of source. Each drop logged to stderr.
6. **Apply knobs (D8)** — `... | node scripts/apply-knobs.js --top-n <N> --min-confidence <N> [--evidence-required]`. Identical ordering to `--from-spec`.
7. **Emit triplet (§9.3, FR-11)** — `... | node scripts/emit-findings.js --out-prefix {docs_path}/architecture/{date}_<slug>_since --mode since --source-path <ref-spec>`. The emitter's `--mode since` requires `file_path` on every finding (mode-conditional §9.3 validation); HTML carries `<meta name="pmos:skill" content="architecture">`; MD has `## Finding N` headings; JSON conforms to §13 with `file_path` populated and `spec_section_id` absent.

**Exit codes:**
- `0` — success (triplet written) OR empty-diff skip (no triplet).
- `1` — runtime error (judge dispatch failure, file IO error).
- `64` — usage error (mutually exclusive flag combo, missing ref).

**When invoked by `/verify` Phase 4b:** the parent passes the merge-base ref and consumes the JSON output; HTML+MD triplet is still written for human review. See spec §4.7 for parent-side handling.

---

## Apply comment-resolver edit (FR-22, FR-30, FR-60)

This phase is the `/architecture` entrypoint that `/comments resolve` (T10) dispatches into when walking open threads in an architecture artifact's `.comments.json` sidecar. The contract — input/output JSON shapes, closed `error_enum` set, idempotency rules, subagent invocation convention — lives in the shared contract doc and is the single source of truth:

- **Contract (normative):** `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md` (T6).

Per [NFR-08](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#nfr-h), this phase MUST cite that file rather than restate the contract. Anything below is `/architecture`-specific implementation guidance only.

**Comments meta tag (FR-01, FR-40):** the emitted HTML report (`{date}_<slug>.html`) MUST carry `<meta name="pmos:skill" content="architecture">` in the `<head>`. Set `{{pmos_skill}}` to `architecture` when expanding the substrate template at Phase 6. The `/comments` resolver routes apply-edit dispatches via this tag, so it MUST be set byte-exact.

**Asset substrate (FR-40):** when writing the HTML report, include `comments.js`, `comments.css`, and the launcher trio (`comments-open.command`, `comments-open.sh`, `comments-open.bat`) alongside the rest of the HTML substrate assets under `{docs_path}/architecture/assets/`. Copy from `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/` using `cp -n` (idempotent).

### When invoked

The resolver dispatches a subagent with the §9.1 input JSON. The subagent's tools include this skill's Node shim:

- **Shim:** `plugins/pmos-toolkit/skills/architecture/scripts/apply-edit-at-anchor.js` — exports `apply(input)`, returns one of the three output shapes (success / failure / clarification) per §9.1. Success responses include the optional `applied_artifact` field (full post-edit HTML); the shim's minimal edit inserts an HTML annotation comment immediately before the resolved anchor element — real prose rewriting is deferred to T12+.

### Resolution order

1. **id-first.** Locate `id="<id>"` in the artifact HTML. Match → success path, `strategy: "id-first"`, `score: 1.0`.
2. **quote-fallback.** Otherwise (or on id miss), substring-contains match `anchor.quote_anchor.text` (≥40 chars) against the candidate's text content. First exact substring hit wins.
3. **Neither hits** → emit `{ success: false, error_enum: "anchor_orphaned" }`; do NOT mutate the artifact.

### Tests

- Per-skill contract: `plugins/pmos-toolkit/skills/architecture/tests/apply-edit-at-anchor.test.js` (5 cases: id-first happy, orphan, idempotent, infeasible, clarification).
- Wrapper: `tests/scripts/assert_apply_edit_at_anchor_architecture.sh`.
