---
name: architecture
description: Audit a repo against tiered architectural principles (L1 universal ≤15 rules, L2 stack-specific TS+Python, L3 per-repo overrides); emit an HTML+MD+JSON triplet under `{docs_path}/architecture/`; optionally run a deepening pass (`--deep`) to classify modules as deep / shallow / leaky and propose reshapes. Use when the user says "audit my codebase against principles", "run an architecture review", "check for circular imports", "find shallow modules", "do a deep architectural audit", "scaffold an L3 config", "audit a monorepo", "diff against a baseline", "/architecture", or "lint my repo against universal rules".
user-invocable: true
argument-hint: "audit [path] [--non-interactive] [--deep] [--monorepo] [--since <ref>] [--baseline <path>] [--scaffold-l3] [--from-spec <spec-path>]"
target: generic
---

# /architecture

Audits a repository against tiered architectural principles and emits an HTML+MD+JSON triplet. L1 universal rules (≤15) ship with the plugin; L2 adds stack-specific rules (TypeScript via dependency-cruiser, Python via ruff + a cross-file AST harness); L3 lets a project override disposition, exempt files, or add rules at `<repo>/.pmos/architecture/principles.yaml`. An opt-in deepening pass (`--deep`) dispatches a subagent to classify modules along deep / shallow / leaky axes and propose reshapes.

**Announce at start:** "Using /architecture to audit the repo against tiered principles."

The skill is read-mostly. It writes an HTML+MD+JSON triplet to `{docs_path}/architecture/{date}_<slug>.{html,md,json}` (where `{docs_path}` resolves from `.pmos/settings.yaml`, defaulting to `docs/pmos/`); a one-line human summary on stderr; nothing else. Stdout is empty. It does NOT modify source code.

At Phase 0, the skill reads `~/.pmos/learnings.md` if present; entries under `## /architecture` factor into its approach (skill body wins on conflict; surface conflicts to the user before applying).

## When NOT to use

- **Style or formatting lint.** This skill audits *architecture* (boundaries, cycles, coupling, depth). For code-style issues, run `ruff` / `prettier` / `eslint` directly.
- **Docs-only or non-code repos.** With no source files in the scan root, every L1/L2 rule short-circuits to zero findings; the resulting triplet is empty noise.
- **Single-file scripts.** L1 cycle / coupling / depth rules have no signal at this scale; the time cost outweighs the value.
- **Repos missing required tooling** (`jq`, `python3`, `node`). Phase 0 halts before emitting the triplet — install the prerequisites first.
- **PR-scoped diff review.** Use `--since <ref>` to constrain the scan; do not run a full audit as a per-PR gate (the report is a project-level artifact, not a per-commit check).

## Platform Adaptation

Reference tool names below are Claude Code. In other environments:

- **Codex / no `AskUserQuestion`:** the only interactive prompts are confirmations around `--scaffold-l3` overwrite, multi-stack fan-out (Phase 1), and the post-deep exploration offer (Phase 2). On Codex, present a numbered free-form prompt with the same options. `--non-interactive` defers prompts and emits defaults.
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

## Phase 0: Prerequisites {#prerequisites}

Required: `jq`, `python3` (with PyYAML), `node`. Missing → stderr `ERROR: /architecture requires <tool>. Install via brew/apt/dnf, then re-run.` and exit 64; the triplet is NOT emitted. Optional (graceful degrade): `npx dependency-cruiser` (TS/Vue) and `ruff` (Python) — missing tools record a `tools_errored[]` entry in the JSON sidecar and their L2 rules are skipped; the audit still succeeds and the report records the gap.

## Phase 1: Run the audit {#run-audit}

```bash
bash "${CLAUDE_PLUGIN_ROOT}/skills/architecture/scripts/run-audit.sh" audit [path] [flags]
```

The script owns the entire mechanical audit — cite this phase, do not re-implement any of it: flag parsing (unknown flags → usage + exit 64; the retired v1 ADR-promotion flag is rejected with a CHANGELOG pointer), scan-root resolution (recorded under `config.scan_root`), the 3-tier rule merge (plugin L1 capped at 15 — the cap keeps reports reviewable; stack-detected L2; project L3 overrides), the gitignore-honoring scanner with its noise deny-list, per-rule evaluator dispatch (grep / inline AST / dependency-cruiser / ruff / cycle-py), exemption reconciliation, and the triplet emit. Deterministic finding order: disposition, then `rule_id`, `file`, `line`.

Two L3 contract points worth knowing without opening the script:

- **Mute via `wont_fix`, never removal.** L3 may set any disposition for any rule (including `wont_fix`) and add rules, but every L1 rule stays loaded and visible in `rules_loaded` — that is the team contract against silent erosion.
- **Exemptions expire.** L3 `exemptions:` rows whitelist a `(rule, file)` pair, optionally with `expires:`. Matching rows move the finding to `exemptions.applied[]`; orphans surface info-only; expired rows re-emit the finding as `should_fix` until re-affirmed or removed.

Flags are NL-first: infer options from the request ("go deep on the module structure" ≡ `--deep`; "audit each stack separately" ≡ `--monorepo`); an explicit flag overrides.

- Positional `[path]` — scan root (default `.`).
- `--non-interactive` — canonical contract; defer prompts, emit defaults.
- `--deep` — opt into the Phase 2 deepening pass (subagent cost; off by default).
- `--monorepo` — fan out across detected stack subtrees; one triplet per stack plus an index.
- `--since <ref>` — with the `audit` selector: diff findings against a git ref, only new findings render (`.diff.new[]`). Without `audit`, `--since` invokes the judge mode instead (see `#judge-modes`).
- `--baseline <path>` — diff against a saved JSON baseline.
- `--scaffold-l3` — write a starter `.pmos/architecture/principles.yaml` and exit (confirms before overwriting an existing one).

<!-- nl-sugar -->
- `--label <slug>` — output filename slug ("call the report X"); default is the scan-root basename. Parsed for back-compat.
<!-- nl-sugar -->
- `--include-info-comments` — keep `wont_fix` findings in the HTML/MD ("show the won't-fix items too"); default is JSON-only.
<!-- nl-sugar -->
- `--sort risk` — order findings by `risk_score` within each disposition ("sort by risk"); `risk` is the only accepted value.

**Multi-stack repos.** When the engine warns `multiple stacks detected; pass --monorepo to fan out` on an interactive run, surface the choice instead of letting the warning scroll by:

`AskUserQuestion`:
```
question: "Multiple sibling stacks detected without --monorepo. Audit scope?"
options:
  - Proceed against the resolved root only (Recommended)
    description: The engine's default; stacks outside the root are skipped and the warning is recorded.
  - Re-run with --monorepo fan-out
    description: One triplet per stack subtree plus an index.
```

(The Recommended option mirrors the engine's headless default, so `--non-interactive` behavior is unchanged.)

**Read the result.** Triplet at `{docs_path}/architecture/{date}_<slug>.{html,md,json}` (same-day collisions append `-2`, `-3`, …). HTML is the primary artifact (substrate-rendered, kebab-case heading IDs, `<meta name="pmos:skill" content="architecture">`, version-cache-busted assets); MD is a humans-only sidecar; JSON is the schema-v2 machine sidecar (`config`, `scanned`, `findings[]` with `disposition`, `exemptions`, `module_metrics`, `godmodule_candidates`, `cycles`, `deep_pass`, `tools_errored`, `coverage_gaps`, …). Stdout is empty; the single human summary goes to stderr: `Wrote <path>: <N> Must Fix, <N> Should Fix, <N> Won't Fix in <N> files`. Useful jq one-liners: `jq '.findings[] | select(.disposition == "must_fix")'`, `jq '.diff.new[]'`, `jq '.deep_pass.skipped_reason // empty'`, `jq '.godmodule_candidates[]'`.

## Phase 2: Deepening pass (--deep) {#deep-pass}

Off by default — Phase 1 suffices for most runs. When set, a subagent classifies modules along deep / shallow / leaky axes and proposes reshapes. The vocabulary (deep / shallow / leaky / deletion-test / seam / adapter / leverage / locality) lives in [`reference/deepening-vocabulary.md`](reference/deepening-vocabulary.md), read at runtime as the Task-subagent SYSTEM prompt. Dispatch (`scripts/dispatch-deep-pass.sh`) is a blocking Task call with model inherited — module-depth judgment is genuine architectural judgment per `skill-patterns.md` §L.

The harness owns the guardrails:

- **Runtime probe** — no Task-tool runtime → record `skipped_reason: no_tool_use_runtime` under `deep_pass` and proceed mechanical-only.
- **Module cap** — hard error above 5,000 modules (cost control); `ARCH_DEEP_NO_CAP=1` bypasses once the user accepts the cost.
- **Secret denylist** — the module-graph payload excludes `**/.env`, `**/.env.*`, `**/*.pem`, `**/*.key`, `**/credentials.{json,yaml}`, `**/.ssh/**`, `**/secrets/**`; the subagent's Reads are wrapped so denied paths return synthetic empty content.
- **Evidence validation** — every candidate's evidence quote is grep-checked verbatim against the file content the subagent actually read; a miss marks the candidate `validation_failed`, and a fully-failed pass promotes nothing (`skipped_reason: validation_failed`).

Validated candidates surface under `findings[]` with `classification` ∈ {deep, shallow, leaky}: `deep` → `wont_fix` (positive signal), `shallow`/`leaky` → `should_fix`, reshape proposal in `message`. **Size-class demotion** — the one reconciliation rule, stated only here: when a candidate's `module` also carries a mechanical U001/U002 size finding, the mechanical finding's disposition is demoted one rank (`must_fix` → `should_fix`, `should_fix` → `wont_fix`; never re-promoted). Both findings remain visible — demotion changes the disposition, not the count.

**Post-deep exploration offer (interactive runs only).** Classification alone doesn't make reshape decisions — pressure-testing does. After the triplet lands with ≥1 validated `shallow`/`leaky` candidate:

`AskUserQuestion`:
```
question: "The deep pass classified <N> modules (<X> shallow, <Y> leaky). Explore a reshape candidate before closing?"
options:
  - Finish — keep the report as-is (Recommended)
    description: The triplet already carries every candidate and reshape proposal.
  - Explore a candidate
    description: Pick one finding; walk its reshape proposal interface-first and pressure-test it before you commit to it.
```

On Explore: list the shallow/leaky candidates, let the user pick one, then walk the reshape proposal — what the module's interface would become, what callers change, what the deletion test says — and interrogate the trade-offs with the user (hand off to `/grill` when available). Under `--non-interactive` the classifier auto-picks Finish, so headless runs end exactly as before.

## Phase 3: Capture learnings {#capture-learnings}

After the report is emitted, reflect on whether this run surfaced anything worth capturing about `/architecture` itself — false-positive rules, missed coverage gaps, exemption-row gotchas, deep-pass validation friction. Append entries under `## /architecture` in `~/.pmos/learnings.md`. Proposing zero learnings is a valid outcome; the gate is that the reflection happens.

---

## Judge modes: --from-spec / --since {#judge-modes}

Two LLM-judge modes share one dispatch pipeline; only the input source and the finding anchor differ. `--from-spec <spec-path>` audits a /spec artifact's §Modules + §Architectural Assertions against the loaded principles; `--since <ref>` (invoked *without* the `audit` selector) audits the source delta `git diff --name-only <ref>..HEAD`. Parents: `/spec` dispatches `--from-spec` from its folded phase (`spec/SKILL.md#folded-arch`); `/verify` Phase 4b (`verify/reference/folded-phases.md` §B) dispatches `--since` against the merge-base. Both also run as standalone CLIs (`--since` is the PR-scoped review path).

```
/architecture --from-spec <spec-path>   |   /architecture --since <ref>
              [--top-n <N>]              # default 8
              [--min-confidence <N>]     # default 70
              [--no-evidence-required]   # disables the ≥40-char verbatim-quote requirement
```

The three knobs exist for parent skills, not humans; the defaults are judgment calls — revisit if the judge's false-positive rate exceeds ~20%. The two modes are mutually exclusive with each other and with `--baseline` / `--deep`; any such combination exits 64.

**`--since` pre-flight (empty-diff short-circuit):**

```bash
CHANGED="$(git diff --name-only "$SINCE"..HEAD)"
if [ -z "$CHANGED" ]; then
  echo "architecture: no changes since $SINCE; skipping" >&2
  exit 0
fi
```

No triplet is emitted on the skip path, so a prior same-day triplet is preserved.

**Shared dispatch flow:**

1. **Resolve input** — from-spec: `node scripts/parse-spec.js <spec-path>` → stdout JSON `{modules, assertions, section_ids}`; a spec that violates the artifact contract exits 65 — propagate it verbatim. since: the changed files' content, path-labelled.
2. **Load principles** — `bash scripts/load-principles.sh` → stdout JSON (merged plugin L1+L2 + L3 overrides); record the loaded `rule_id_set` for step 5.
3. **Build the judge prompt** — `reference/judge-prompt-template.md`, substituting `{{principles}}`, `{{artifact}}` (stripped spec body, or the path-labelled changed files), `{{rule_id_set}}` (CSV), `{{mode}}`.
4. **Dispatch the judge** — blocking Task call, 300s timeout, model inherited (architecture judging is genuine judgment per `skill-patterns.md` §L). Read-only; the judge edits nothing. Determinism is enforced downstream by the step-5 validator, not by sampling settings.
5. **Validate** — `node scripts/validate-findings.js --rule-id-set "<csv>" --source <spec-path | concatenated-source>`. Drops any finding with an unknown rule_id, out-of-range confidence, or a quote that is missing, <40 chars, or not a verbatim substring of the source; each drop logs to stderr. This is the anti-hallucination gate that makes an LLM judge usable in a pipeline.
6. **Apply knobs** — `node scripts/apply-knobs.js --top-n <N> --min-confidence <N> [--evidence-required]`; order: drop below min-confidence → drop missing-quote-when-evidence-required → cap top-N by (severity, confidence).
7. **Emit the triplet** — `node scripts/emit-findings.js --out-prefix {docs_path}/architecture/{date}_<slug>_<suffix> --mode from-spec|since --source-path <...>` (literally `--mode since` or `--mode from-spec`). Atomic temp+rename writes; HTML carries `<meta name="pmos:skill" content="architecture">`; MD has `## Finding N` headings.

**Mode differences:**

| | `--from-spec` | `--since` |
|---|---|---|
| Input | spec HTML §Modules + §Architectural Assertions | changed files' content, path-labelled |
| Finding anchor | `spec_section_id` | `file_path` (the emitter requires it under `--mode since`) |
| Short-circuit | none; exit 65 on spec-contract violation | empty diff → skip log + exit 0, no triplet |
| Output suffix | `_from-spec` | `_since` |
| Parent | `/spec` `#folded-arch` | `/verify` Phase 4b |

**Exit codes:** `0` success — triplet written + stderr summary (or the `--since` empty-diff skip) · `1` runtime error (judge dispatch failure, file IO) · `64` usage error (flag combos, missing/not-found args) · `65` spec-contract violation (`--from-spec` only, propagated from `parse-spec.js`). When parent-invoked, the parent consumes the JSON and the HTML+MD are still written for human review (parents escalate `must_fix` findings and surface `should_fix` to the author).

---

## Apply comment-resolver edit {#apply-comment-edit}

`/comments resolve` dispatches into this entrypoint when walking open threads in an architecture artifact's inline `pmos-comments` JSON block (`<script id="pmos-comments" type="application/json">`). The contract — input/output JSON shapes, the closed `error_enum` set, idempotency rules, subagent invocation convention — lives in `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md`; cite that file, never restate it. `/architecture`-specific deltas only:

- **Shim:** `scripts/apply-edit-at-anchor.js` — exports `apply(input)`. Resolution order: id-first (`id="<id>"` match → `strategy: "id-first"`, `score: 1.0`), then substring-contains quote-fallback (≥40 chars); neither hit → `{ success: false, error_enum: "anchor_orphaned" }` and the artifact is NOT mutated. The shim's minimal edit inserts an HTML annotation comment immediately before the resolved anchor element.
- **Routing meta:** the emitted HTML report must carry `<meta name="pmos:skill" content="architecture">` byte-exact (set when Phase 1 emits the triplet) — the resolver routes apply-edit dispatches by this tag.
- **Asset substrate:** copy `comments.js`, `comments.css`, and the launcher trio from `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/` to `{docs_path}/architecture/assets/` with `cp -n` (idempotent).
- **Tests:** `tests/apply-edit-at-anchor.test.js` (5 contract cases); wrapper `tests/scripts/assert_apply_edit_at_anchor_architecture.sh`.

## Anti-Patterns (DO NOT)

- **Do NOT silently drop double-reported findings** — demote, never remove (Phase 2's size-class demotion rule).
- **Do NOT promote unvalidated deepening candidates** (Phase 2's evidence validation).
- **Do NOT silently audit one stack of a polyglot repo** — surface the multi-stack choice (Phase 1).
- **Do NOT treat the U004 idiom exemption as file-level.** Debug-log suppression for Typer/Click `@app.command()`-decorated functions applies ONLY to the decorated function body; sibling functions in the same file remain subject to U004.
- **Do NOT emit findings to stdout** — the triplet lands on disk, one summary line goes to stderr, stdout stays empty (downstream tooling depends on it).
- **Do NOT document the deep-pass test-only fixture flags.** They are gated by `FIXTURE=1` in the parser; production runs reject them with exit 64.
- **Do NOT drop an L1 universal rule via L3** — mute via `wont_fix` (Phase 1's team contract).
- **Do NOT crash on a missing optional tool** — auto-skip the rule and record it in `tools_errored[]`.
- **Do NOT hide coverage gaps.** Every `.vue` file dep-cruiser cannot analyse (`vue_sfc_unanalyzed`), every ruff parse error, every failed git query records under `coverage_gaps[]` — silent omission breaks trust in the report.

## Known limitations

- **Same-day re-run race:** the slug collision handler appends `-2`, `-3`, … by scanning existing filenames before writing; two concurrent same-day runs on the same scan root can resolve the same suffix and the later writer wins. Serialize concurrent runs externally.

## Tool version requirements

- `jq` ≥ 1.6 (required; sidecar renderer)
- `python3` ≥ 3.8 with `pyyaml` (required; rule loader, AST evaluators, cycle-py)
- `node` ≥ 18 (required; substrate renderer `build_sections_json.js`)
- `dependency-cruiser` ≥ 15 (optional; L2 TS rules)
- `ruff` ≥ 0.5 (optional; L2 Python rules)
- `git` ≥ 2.25 (required when scan root is a git repo; `.gitignore` honoring, `--since` diffs, blame queries)

## Reference

- [`principles.md`](principles.md) — the single prose source for every rule: rationale, external source citation, violation/compliance examples (embedded verbatim in the judge prompt).
- [`reference/gap-map-rationale.md`](reference/gap-map-rationale.md) — per-rule rationale for `delegate_to:` assignment.
- [`reference/deepening-vocabulary.md`](reference/deepening-vocabulary.md) — vocabulary for the `--deep` pass (read at runtime as the Task-subagent SYSTEM prompt).
- [`reference/judge-prompt-template.md`](reference/judge-prompt-template.md) — the judge-mode prompt skeleton (step 3 above).

---

*Spec lineage: `2026-05-13_architecture-principles-skill` (L1/L2/L3 tiers, audit engine), `2026-05-13_architecture-deep-pass` (deepening pass, disposition axis, output triplet), `2026-05-28_architecture-in-feature-sdlc` (judge modes, knobs, validator), `2026-05-23_inline-doc-comments` / `2026-05-28_inline-html-artifacts` (comment-resolver shim) — all under `docs/pmos/features/`.*
