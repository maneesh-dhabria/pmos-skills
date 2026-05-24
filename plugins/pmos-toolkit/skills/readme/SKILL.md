---
name: readme
description: Audit, scaffold, or update READMEs against a 15-check rubric and 3-persona simulated reader. Use this whenever the user asks to "audit my README", "scaffold a README", "fix my README", "generate a README", "review my README structure", or invokes /readme. Three modes share one substrate (--audit, --scaffold, --update <commit-range>); monorepo-aware (8 workspace manifests + multi-stack); voice work delegated to /polish; never auto-commits.
user-invocable: true
argument-hint: "[--audit|--scaffold|--update <commit-range>] [--scope <audit-all|audit-one <pkg>|scaffold-missing|root-only>] [--skip-simulated-reader] [--non-interactive|--interactive] [<repo-path>]"
---

# /readme

Using /readme to audit, scaffold, or update a repository's README against a binary 15-check rubric and a 3-persona simulated reader pass — surfacing exactly which sections are missing, stale, or weak so the user (or /polish) can close the gap.

## When to Use

Three modes share a single substrate. **`--audit`** runs the rubric (and optionally the simulated-reader pass) against an existing README and reports findings without writing — use this when the user asks to "review my README" or "is my README any good". **`--scaffold`** generates a fresh README skeleton driven by repo discovery (manifests, languages, scripts, top-level structure) — use when there is no README, or when starting over. **`--update <commit-range>`** diffs the commit range, locates README-affecting changes (new commands, new env vars, new dependencies, removed features), and produces a targeted patch proposal — use when the user asks "what does the README need given these commits". All three modes are monorepo-aware: they discover workspaces across 8 manifest types (`package.json` workspaces, `pnpm-workspace.yaml`, `turbo.json`, `lerna.json`, Cargo workspaces, Go modules, Python `pyproject.toml`/`setup.py`, Maven `pom.xml`) and can target the root only, a single package, or all workspaces.

## Platform Adaptation

Claude Code is the primary target platform. The canonical non-interactive contract (inlined below) governs how this skill behaves under `--non-interactive` invocation, including on platforms where AskUserQuestion is not available — the classifier defers any question without a `(Recommended)` option and auto-picks otherwise, so the same SKILL.md works across Claude Code, Codex, and headless CI agents without per-platform branching.

## Track Progress

For multi-task runs (e.g., audit-all across a monorepo, or update-mode producing N patches), use the agent's task-tracking tool (`TaskCreate` in Claude Code; equivalent on other platforms) to surface progress to the user — one task per workspace or per patch.

## Phase 0: Pipeline setup

<!-- pipeline-setup-block:start -->
1. **Read `.pmos/settings.yaml`.**
   - If missing → you MUST invoke the `Read` tool on `_shared/pipeline-setup.md` Section A and run first-run setup before proceeding. (Skipping this Read is the most common cause of folder-naming defects.)
2. Set `{docs_path}` from `settings.docs_path`.
3. If `settings.workstream` is non-null → load `~/.pmos/workstreams/{workstream}.md` as context preamble; if frontmatter `type` is `charter` or `feature` and a `product` field exists, also load `~/.pmos/workstreams/{product}.md` read-only.
4. Resolve `{feature_folder}`:
   - If `--feature <slug>` was passed → glob `{docs_path}/features/*_<slug>/`. **Exactly 1 match required**; on 0 or 2+ → you MUST `Read` `_shared/pipeline-setup.md` Section B before acting.
   - Else if `settings.current_feature` is set AND `{docs_path}/features/{current_feature}/` exists → use it.
   - Else → ask user (offer: create new with derived slug, pick existing from folder list, or specify via Other...).
5. **Edge cases — you MUST `Read` `_shared/pipeline-setup.md` Section B before acting:** slug collision, slug validation failure, legacy date-less folder encountered, ambiguous `--feature` lookup, any folder creation.
6. Read `~/.pmos/learnings.md` if present; note entries under `## /<this-skill-name>` and factor them into approach (skill body wins on conflict; surface conflicts to user before applying).
<!-- pipeline-setup-block:end -->

## Phase 0b: Non-interactive contract

<!-- non-interactive-block:start -->
1. **Mode resolution.** Compute `(mode, source)` with precedence: `cli_flag > parent_marker > settings.default_mode > builtin-default ("interactive")` (FR-01).
   - `cli_flag` is `--non-interactive` or `--interactive` parsed from this skill's argument string. Last flag wins on conflict (FR-01.1).
   - `parent_marker` is set if the original prompt's first line matches `^\[mode: (interactive|non-interactive)\]$` (FR-06.1).
   - `settings.default_mode` is `.pmos/settings.yaml :: default_mode` if present and one of `interactive`/`non-interactive`. Unknown values → warn on stderr `settings: invalid default_mode value '<v>'; ignoring` and fall through (FR-01.3).
   - If `.pmos/settings.yaml` is malformed (not parseable as YAML, or missing `version`): print to stderr `settings.yaml malformed; fix and re-run` and exit 64 (FR-01.5).
   - On Phase 0 entry, always print to stderr exactly: `mode: <mode> (source: <source>)` (FR-01.2).

2. **Per-checkpoint classifier.** Before issuing any `AskUserQuestion` call, classify it (FR-02):
   - Use the awk extractor below to find the line of this call's `question:` key in the live SKILL.md (FR-02.6).
   - The defer-only tag, if present, is the literal previous non-empty line: `<!-- defer-only: <reason> -->` where `<reason>` ∈ {`destructive`, `free-form`, `ambiguous`} (FR-02.5).
   - Decision (in order): tag adjacent → DEFER; multiSelect with 0 Recommended → DEFER; 0 options OR no option label ends in `(Recommended)` → DEFER; else AUTO-PICK the (Recommended) option (FR-02.2).

3. **Buffer + flush.** Maintain an append-only OQ buffer in conversation memory. On each AUTO-PICK or DEFER classification, append one entry per the schema in spec §11.2. At end-of-skill (or in a caught error before exit), flush (FR-03):
   - Primary artifact is single Markdown → append `## Open Questions (Non-Interactive Run)` section with one fenced YAML block per entry; update prose frontmatter (`**Mode:**`, `**Run Outcome:**`, `**Open Questions:** N` where N counts deferred only — see FR-03.4) (FR-03.1).
   - Skill produces multiple artifacts → write a single `_open_questions.md` aggregator at the artifact directory root; primary artifact's frontmatter `**Open Questions:** N — see _open_questions.md` (FR-03.5).
   - Primary artifact is non-MD (SVG, etc.) → write sidecar `<artifact>.open-questions.md` (FR-03.2).
   - No persistent artifact (chat-only) → emit buffer to stderr at end-of-run as a single block prefixed `--- OPEN QUESTIONS ---` (FR-03.3).
   - Mid-skill error → flush partial buffer under heading `## Open Questions (Non-Interactive Run — partial; skill errored)`; set `**Run Outcome:** error`; exit 1 (E13).

4. **Subagent dispatch.** When dispatching a child skill via Task tool or inline invocation, prepend the literal first line: `[mode: <current-mode>]\n` to the child's prompt (FR-06).

5. **Awk extractor.** The classifier and `tools/audit-recommended.sh` MUST both use the function below. Loaded at script init time; sourcing differs per consumer.

<!-- awk-extractor:start -->
```awk
# Find AskUserQuestion call sites and their adjacent defer-only tags.
# Input: a SKILL.md file (stdin or argv).
# Output (TSV): <line_no>\t<has_recommended:0|1>\t<defer_only_reason or "-">
# A "call site" is a line referencing `AskUserQuestion` in the SKILL's own prose
# (backtick mentions, prose instructions, multi-line invocation hints).
# `(Recommended)` is detected on the call site line OR any subsequent non-blank
# line (the option-list block) until a blank line, defer-only tag, or another
# AskUserQuestion call closes the pending call. Lines inside the inlined
# `<!-- non-interactive-block:... -->` region are canonical contract text and
# never count as call sites.
function emit_pending() {
  if (pending_call > 0) {
    out_tag = (pending_call_tag != "") ? pending_call_tag : "-";
    printf "%d\t%d\t%s\n", pending_call, pending_has_recc, out_tag;
    pending_call = 0;
    pending_has_recc = 0;
    pending_call_tag = "";
  }
}
/^<!-- non-interactive-block:start -->$/ { in_inlined=1; next }
/^<!-- non-interactive-block:end -->$/   { in_inlined=0; next }
in_inlined { next }
/^[[:space:]]*<!--[[:space:]]*defer-only:[[:space:]]*([a-z-]+)[[:space:]]*-->/ {
  emit_pending();
  match($0, /defer-only:[[:space:]]*[a-z-]+/);
  pending_tag = substr($0, RSTART + 12, RLENGTH - 12);
  sub(/^[[:space:]]+/, "", pending_tag);
  pending_line = NR;
  next;
}
/^[[:space:]]*$/ {
  emit_pending();
  pending_tag = "";
  next;
}
/AskUserQuestion/ {
  emit_pending();
  pending_call = NR;
  pending_has_recc = ($0 ~ /\(Recommended\)/) ? 1 : 0;
  pending_call_tag = (pending_tag != "" && NR == pending_line + 1) ? pending_tag : "";
  pending_tag = "";
  next;
}
{
  if (pending_call > 0 && $0 ~ /\(Recommended\)/) {
    pending_has_recc = 1;
  }
}
END { emit_pending() }
```
<!-- awk-extractor:end -->

6. **Refusal check.** If this SKILL.md contains a `<!-- non-interactive: refused; ... -->` marker (regex: `<!--[[:space:]]*non-interactive:[[:space:]]*refused`), and `mode` resolved to `non-interactive`: emit refusal per Section A and exit 64 (FR-07).

7. **Pre-rollout BC.** If the `--non-interactive` argument is present BUT this SKILL.md does NOT contain the `<!-- non-interactive-block:start -->` marker (i.e., this skill hasn't been rolled out yet): emit `WARNING: --non-interactive not yet supported by /<skill>; falling back to interactive.` to stderr; continue in interactive mode (FR-08).

8. **End-of-skill summary.** Print to stderr at exit: `pmos-toolkit: /<skill> finished — outcome=<clean|deferred|error>, open_questions=<N>` (NFR-07).
<!-- non-interactive-block:end -->

## Core Pattern

Three modes share a single substrate: a 15-check rubric, a workspace-discovery scanner, and a simulated-reader pass. /readme audits or scaffolds the README; voice rewriting is delegated to /polish; commits happen only via /complete-dev.

## Implementation

### Dependencies

Bundled scripts under `scripts/` and the orchestrator body assume:

- **bash ≥ 4** — `scripts/_lib.sh` and all `scripts/*.sh` use bash-4 features (associative arrays, `${var,,}`). macOS ships bash 3.2 by default; install GNU bash via Homebrew (`brew install bash`) for local dev.
- **python3 ≥ 3.8** with **PyYAML** — `rubric.sh`, `workspace-discovery.sh`, and `commit-classifier.sh` invoke `python3 -c 'import yaml; ...'` to parse `reference/rubric.yaml` and `reference/section-schema.yaml`. Install with `pip install pyyaml` or `python3 -m pip install --user pyyaml`.
- **jq ≥ 1.6** — workspace-discovery parses `package.json` / `pnpm-workspace.yaml` derivatives via jq.
- **node ≥ 18** — `voice-diff.sh` shells into a tiny node helper for unified-diff rendering; the HTML substrate's `chrome-strip.js` / `html-to-md.js` (consumed by the artifact pipeline) also require node.
- **git** — every flow reads commit history (`--update <range>` and the §7 update-mode flow) and never auto-commits (commit work is delegated to `/complete-dev`).

Each script's `--selftest` exits non-zero with a clear diagnostic if any of the above is missing — run `bash scripts/<name>.sh --selftest` once after install to verify the environment.

### Single-file audit flow

This subsection documents the procedure /readme follows when invoked at a repo with an existing `README.md` and no monorepo signal. Mode-resolver wiring for `--scaffold` and `--update <range>` lands in T14 / T18; cross-file rules for monorepo workspaces in T21. T3 owns the audit mode's tracer path end-to-end.

**1. Argv parsing — mode resolver.** Parse `--audit | --scaffold | --update <range>` as **mutually exclusive**. If two are present, refuse with platform-aware error: `Modes are mutually exclusive: --audit / --scaffold / --update <range>. Pick one.` (FR-MODE-1.) If none is passed and `README.md` exists at the resolved repo-path → default to `--audit` and log: `mode: audit (existing README detected)`. If none is passed and no `README.md` exists → default to `--scaffold` and log: `mode: scaffold (no README found)`. (FR-MODE-4.)

**2. Shell the rubric.** From SKILL.md, invoke the bundled rubric script via the portable plugin root:
```
bash "${CLAUDE_PLUGIN_ROOT}/skills/readme/scripts/rubric.sh" "${repo_path}/README.md"
```
Capture stdout (TSV: `check-id\tverdict\tcommit\tline\tmessage` per row) and exit code. Exit 0 ⇒ all pass; exit 1 ⇒ ≥1 fail; exit 2 ⇒ script error (refuse with `rubric.sh exited 2 — see stderr above. Aborting audit.`).

**3. Aggregate findings.** Tally `PASS` / `FAIL` rows from the TSV. Emit one summary line to chat: `rubric: <P> pass / <F> fail`. (FR-OUT-1.) Empty `FAIL` set ⇒ no diff preview, no AskUserQuestion: close with `README clean against rubric. Nothing to fix.` (FR-OUT-5 — no findings, no diff path.)

**4. Findings presentation — mode-branch (FR-OUT-2, FR-15/FR-16/FR-17).**
   - **Audit mode** (read-only contract): if `<F> > 0`, emit a single Markdown table to chat with columns `Source | Severity | Check/Persona | Line | Message | Suggested fix`, sorted severity-desc then source. Source ∈ {`rubric`, `reviewer`, `persona`}. **Do NOT fire `AskUserQuestion`** — audit is a read-only audit pass; the user runs `/readme` again with `--scaffold` or edits the README directly to apply.
   - **Scaffold / update mode**: group failing findings into batches of ≤4 per `AskUserQuestion` call (existing batched-ask behavior). Each finding's question shape: `[<check-id>] <message>. Suggested fix: <one-line>.` Options: **Apply suggested fix (Recommended)** / **Modify** / **Skip — leave as-is** / **Defer**. Canonical (Recommended) labelling per the non-interactive contract.

**5. Atomic write.** For every Apply-or-Modify disposition, compute the proposed README content in memory, then write via temp + rename:
```
tmp="${target}.tmp.$$"
printf '%s' "${new_content}" > "${tmp}"
mv -- "${tmp}" "${target}"
```
Never write to `${target}` directly. (FR-OUT-4.) On any write error, refuse with `Atomic write failed: ${err}. Original README preserved at ${target}.` and exit 1 without modifying the file. The integration test at `tests/integration/tracer_audit.sh` exercises this contract end-to-end.

**6. Close-out — mode-branch (FR-V-2, FR-OUT-4).**
   - **Audit mode** (no write happened): emit `rubric: <P> pass / <F> fail` + optional bracketed sub-counts `[+ <R> reviewer findings + <N> persona friction]` (omit a bracket when its bucket is zero).
   - **Scaffold / update mode** (write happened): emit `README written to ${target}. Run /complete-dev to include it in the release commit.` (never auto-commit.)
   - **Both modes additionally emit on a separate final line:** `Suggest: /polish <readme-path> — tighten prose without changing meaning.` (FR-V-2 — unconditional on successful run.)

All script paths use `${CLAUDE_PLUGIN_ROOT}/skills/readme/scripts/…` — no absolute paths. (FR-C1.)

### Subsection 2 — TBD (rubric runner)

### Subsection 3 — TBD (workspace discovery)

### Subsection 4 — TBD (simulated reader)

### Subsection 5 — TBD (atomic write)

### §2: Simulated-reader pass

This subsection documents the protocol /readme follows after `rubric.sh` returns its findings (§1 step 3) and before the AskUserQuestion batching (§1 step 4). It implements FR-SR-1 / FR-SR-2 / FR-SR-3 and decision-log entries D13 + P3. Skip entirely when `--skip-simulated-reader` is set (advisory log: `simulated-reader: skipped via --skip-simulated-reader`).

**1. Parallel Task dispatch (FR-SR-1, FR-09/FR-10/FR-13 — 5 concurrent calls).** Issue **5 `Task` tool calls in ONE assistant response** — 4 personas + 1 reviewer:
   - Persona Task calls (4): `evaluator`, `adopter`, `contributor`, `returning-user-navigator`. Each body inlines, in order:
     - The persona-specific prompt block from `reference/simulated-reader.md §1` (load the file and paste the matching `### 1.x` section verbatim — do not re-author).
     - The full **un-stripped** README markdown source (the user-supplied input file, byte-for-byte — required for FR-SR-3 substring grep to be sound).
     - The return-shape contract from `reference/simulated-reader.md §2` (JSON schema: `persona`, `friction[]` with `quote`/`line`/`severity`/`message`).
   - Reviewer Task call (1): IA-fit reviewer scoring the 2 [J] checks. Body inlines, in order:
     - The reviewer prompt block from `reference/reviewer.md §1` verbatim.
     - The full **un-stripped** README markdown source (same byte-for-byte source as the personas).
     - The return-shape contract from `reference/reviewer.md §2` (JSON array, one object per declared [J] `check_id`).
   - Sequential dispatch is forbidden (P3); the parallel-scheduling requirement is what makes the 120s-per-call wall budget tractable.
   - A per-call timeout of **120s**. On persona timeout, emit `simulated-reader: persona <name> timed out (120s); skipping` (NFR-4) and proceed with whichever of the other personas returned in time. On reviewer timeout, emit `reviewer: timed out (120s); dropping [J] findings (soft-failure E4)` and proceed without [J] entries.
   - **Stub escape (P9).** When `READMER_PERSONA_STUB` is set, the persona Task calls are replaced by `bash "$READMER_PERSONA_STUB" --persona=<name> <readme-path>` (per §3). When `READMER_REVIEWER_STUB` is set, the reviewer Task call is replaced by `bash "$READMER_REVIEWER_STUB" <readme-path>` (per §3). Both env vars are unset in the default skill prompt — test-only.

**2. Substring validation on return (FR-SR-3 personas; FR-11/FR-12 reviewer).** For each returned JSON payload, parse `friction[]` (personas) OR the JSON array (reviewer) and validate every entry against the un-stripped README source:
   - **Persona quote length:** if `len(quote) < 40` → hard-fail with `simulated-reader returned quote shorter than 40 chars: <quote>` and pause with the failure dialog.
   - **Persona substring grep:** if `quote NOT IN readme_source_text` (exact substring, byte-for-byte) → hard-fail with `simulated-reader returned quote not found in README: <prefix-30>…` and pause with the failure dialog.
   - **Persona label match:** the returned `persona` field MUST exactly equal the dispatched persona label (one of `evaluator|adopter|contributor|returning-user-navigator`). Mismatch → hard-fail with `simulated-reader persona label mismatch: dispatched=<X>, returned=<Y>`.
   - **Reviewer validation (FR-11/FR-12 — symmetric).** Delegate to `scripts/_reviewer_validate.sh::readme::reviewer_validate <json> <readme-path>` which enforces:
     - **`check_id` set-equality** vs the declared [J] set (read from `rubric.yaml` rows where `type: "[J]"`). On miss/extra → hard-fail with `reviewer returned check_ids that do not match rubric.yaml: missing=[…], extra=[…]` and pause.
     - **Reviewer quote length:** if `len(quote) < 40` → hard-fail with `reviewer returned quote shorter than 40 chars: <quote>` and pause.
     - **Reviewer substring grep:** if `quote NOT IN readme_source_text` → hard-fail with `reviewer returned quote not found in README: <prefix-30>…` and pause.

**3. Merge into rubric stream.** Every entry from a persona that passes all FR-SR-3 checks merges into the rubric findings as a severity-tagged item — using the `severity` field from the persona return (default `friction` when omitted). Annotate each merged entry with `source: simulated-reader/<persona>` so the §1 step-3 aggregator and the §1 step-4 AskUserQuestion batcher can distinguish persona findings from `rubric.sh` checks.

**4. Dedupe near-duplicates.** After merge, dedupe across the combined findings list. Two findings are duplicates iff `abs(line_a - line_b) ≤ 2` AND they target the same section heading (use the parsed section spine from `reference/section-schema.yaml`). Keep the higher-severity entry; drop the lower. On equal severity, keep the `rubric.sh` entry over the persona entry (rubric findings are deterministic; persona findings are probabilistic).

> See [reference/simulated-reader.md](reference/simulated-reader.md) for the full persona prompts and return-shape JSON schema (per §C "references one level deep" of skill-patterns.md).

### §3: Theater-check + skip flag

**FR-SR-5 — Theater-check.** After §2's parallel dispatch + substring validation completes, examine the returns per persona:

- If persona `P` returned `friction[]` is **empty** AND the rubric.sh pass (§1) scored **≥3 findings**, treat this as suspected theater (the persona may have rubber-stamped the README to avoid friction). **Re-dispatch persona P ONCE** with the same body as §2 but appending this bounce-suffix to the prompt:
  > "You have alternatives and 90 seconds. What makes you bounce?"
- Re-dispatch is **single-shot**: even if the second-pass still returns empty, accept it as a genuine pass (a persona that bounces on nothing twice has earned the empty return).
- Re-dispatch validation: still subject to FR-SR-3 substring-grep + persona-label match. Hard-fail on miss, same dialog as §2.
- Log to chat: `simulated-reader: theater-check re-dispatched persona <P> (rubric≥3, empty first-pass)`.

**FR-SR-6 — Skip flag.** The CLI flag `--skip-simulated-reader` short-circuits §2 + §3 entirely:

- When present, skip the 3 Task dispatches; emit chat log `simulated-reader: skipped (--skip-simulated-reader)`; the aggregator pass receives ONLY rubric.sh findings.
- The flag is parsed by §1's argv loop alongside `--variant`, `--auto-apply`, etc. (mutex with `--selftest`).
- Intended use: speed up CI runs against pre-vetted READMEs; not the default user path.

**Contract-test escape (P9).** The `READMER_PERSONA_STUB` environment variable, if set to a path, REPLACES the persona Task-tool dispatch with a shell invocation of that path:
- The script receives `--persona=<name>` and the README path as args.
- Stdout = the per-persona JSON return (same shape as a real Task return).
- Used exclusively by `tests/mocks/simulated_reader_stub.sh` for the FR-SR-3 contract test (verifies the parent substring-grep correctly hard-fails on a deliberately altered quote).
- DO NOT use in production — the env var is unset in the default skill prompt.

**Reviewer-subagent contract-test escape (FR-11).** The `READMER_REVIEWER_STUB` environment variable, if set to a path, REPLACES the reviewer Task-tool dispatch (§2 step 1, the 5th concurrent Task call) with a shell invocation of that path:
- The script receives the README path as a single arg.
- Stdout = the reviewer JSON array (same shape as a real Task return, per `reference/reviewer.md §2`).
- Used by `tests/mocks/reviewer_stub.sh` for the FR-11/FR-12 reviewer contract tests (parent-side validation of `check_id` set-equality + `quote≥40` substring-grep).
- DO NOT use in production — the env var is unset in the default skill prompt.

### §4: Mode resolution

Modes drive the top-level flow of `/readme`: which subagent dispatches fire, what artifacts get written, how the user is prompted. The resolver runs **after** §1's argv loop has parsed flags.

**FR-MODE-1 — Three primary modes:** `audit` / `scaffold` / `update`. Exactly one mode (or a composition — see FR-MODE-3) is active per invocation.

**FR-MODE-2 — Resolution truth table.**

| Input | README present? | Flags | Resolved mode | Source label |
|---|---|---|---|---|
| `/readme path/to/file.md` | yes | none | `audit` | `default-readme-present` |
| `/readme` (no path, monorepo root) | depends per package | none | per-package — see FR-MODE-3 | `default-readme-absent` (where absent) |
| `/readme` (greenfield repo) | no | none | `scaffold` | `default-readme-absent` |
| `/readme` | yes | `--scaffold` | `audit+scaffold` (composition, D16) | `cli` |
| `/readme` | no | `--audit` | exit 64: `--audit requires a README; pass --scaffold or omit flags` | — |
| `/readme` | any | `--update <range>` | `update` | `cli` |
| `/readme` | any | `--update <range> --audit` (or `--scaffold`) | exit 64: `--update is mutually exclusive with --audit/--scaffold` | — |

**FR-MODE-3 — Audit+scaffold composition (D16).** In monorepos where SOME packages have a README and SOME do not, the runtime resolves `audit` for present packages and `scaffold` for absent ones, in a single invocation. Per-package modes are emitted to the chat log:
```
mode: audit+scaffold (source: cli)
  - packages/foo: audit (README present)
  - packages/bar: scaffold (README absent)
```
The per-package loop processes each in declared order (per `workspace-discovery.sh` output). `--scope` may narrow the loop to specific packages (downstream task, T22).

**FR-MODE-4 — Observability.** Emit ONE chat-log line per invocation, format: `mode: <resolved> (source: cli|default-readme-present|default-readme-absent)`. For audit+scaffold composition, emit the multi-line form above. Resolution decisions are auditable in chat without verbose logging.

**Error cases.**
- `--audit` + no README → exit 64 with the message in the table.
- `--update` + `--audit` or `--scaffold` → exit 64 with the mutex message.
- `--update` without a `<range>` arg → exit 64: `--update requires a commit range (e.g. main..HEAD)`.

See [§1: Single-file audit flow](#single-file-audit-flow) for argv parsing and [§5: Repo-miner subagent](#5-repo-miner-subagent) for scaffold-mode data gathering (T15).

### §5: Repo-miner subagent

In `scaffold` mode (per §4 FR-MODE-2), the runtime dispatches a Task subagent to gather raw repo data before any user prompts fire. The repo-miner reads manifests, code entry points, license files, and contributor history; returns a structured JSON for §6's draft-assembly phase (T16).

**Dispatch protocol.**

1. After §4 resolves mode to `scaffold` (or `audit+scaffold` for the absent-README packages), dispatch ONE Task call:
   - **Prompt body:** the supported-manifest list (from `reference/section-schema.yaml` if a manifest registry surfaces there; otherwise inline the 8-manifest set from `scripts/workspace-discovery.sh`), the repo-root absolute path, and the return-shape contract below.
   - **Timeout:** 90s. On timeout, log `repo-miner: timed out (90s); falling back to AskUserQuestion for all required fields` and skip to the §6 prompt-fallback path.

2. **Return shape (spec §9.2.2).** The subagent MUST return JSON matching:
```json
{
  "name": "<package-name>",
  "entry_point": "<bin path | importable module | null>",
  "license": "<SPDX-id | UNLICENSED | null>",
  "contributors": ["<gh-handle>", ...],
  "repo_type_hint": "library|cli|plugin|app|monorepo-root|monorepo-package|unknown",
  "manifest_source": "<one-of-the-8-supported>",
  "evidence": {
    "name_from": "<file:line>",
    "entry_point_from": "<file:line | null>",
    "license_from": "<file:line | null>"
  }
}
```

3. **Parent-side validation.** For each required field that is non-null:
   - Field types match the schema (string/array/object). Type mismatch → hard-fail: `repo-miner: field <name> has wrong type (expected <T>, got <U>)`. Pause with failure dialog.
   - `name` non-empty after `.strip()`.
   - `repo_type_hint` ∈ the 7-value enum above. Otherwise → hard-fail: `repo-miner: unknown repo_type_hint '<value>'`.
   - `evidence.*_from` paths exist on disk when the corresponding field is non-null (substring-grep the named file for the field value). Miss → hard-fail: `repo-miner: evidence missing — <field>='<value>' not found in <file>`. Pause.

4. **AskUserQuestion fallback.** For each required field that the repo-miner returned as `null` (genuinely couldn't infer):
   - Issue a single `AskUserQuestion` with sensible defaults from the repo context (e.g., for `license: null`, propose `MIT (Recommended)` / `Apache-2.0` / `Other` / `UNLICENSED`).
   - Defer-tag with `<!-- defer-only: ambiguous -->` so the non-interactive contract's classifier (Phase 0b) DEFERS rather than auto-picks — license choice is too consequential to auto-pick.

5. **Cross-reference.** §6 (T16) consumes this validated `RepoMinerResult` as the seed for the scaffold draft. The `evidence.*_from` paths flow into the README's footnote section so the user can audit where each fact came from.

See [§4: Mode resolution](#4-mode-resolution) for the upstream gate and [§6: Scaffold flow](#6-scaffold-flow) for the downstream consumer (T16 lands §6).

### §6: Scaffold flow

When §4 resolves mode to `scaffold` (or per-package `scaffold` within `audit+scaffold` composition), the runtime follows the steps below. The terminal output is a draft README (or a stub with TODO markers if data is insufficient), atomically written next to the manifest (per `scripts/workspace-discovery.sh` package paths).

**Steps (per package).**

1. **Repo-miner dispatch (§5).** Get the validated `RepoMinerResult`.

2. **Workspace-discovery (`scripts/workspace-discovery.sh`).** Resolve `repo_type` from the manifest set (refines §5's `repo_type_hint`). For per-package scaffold (composition mode), pass the package path; for top-level greenfield, pass repo root.

3. **≤6 Q user cap (FR-OUT-3).** For required fields the repo-miner returned `null` for AND that workspace-discovery can't infer, prompt the user via `AskUserQuestion`. Hard cap: **6 questions total** across the entire scaffold flow. If unresolved fields remain after 6 Q:
   - Emit a **stub README** with `<!-- TODO(/readme): <field> — <reason> -->` markers at the points the missing data should go.
   - Log: `scaffold: question cap reached (6/6); emitting stub with N TODO markers — re-run /readme after filling in`.
   - This is the E2 path (empty repo, manifest only, no callable entry). Per spec §16 E2: never invent commands; never fabricate APIs.

4. **Per-type opening shape.** Read `reference/opening-shapes.md`; select the shape matching `repo_type` (one of library / cli / plugin / app / monorepo-root / monorepo-package). Apply: hero line, what-it-does-in-60s, install-or-quickstart, runnable example, links. For `unknown` repo_type (T10 long-tail), use the library shape as a default and append `<!-- TODO(/readme): repo_type unresolved — verify scaffold defaults -->`.

5. **Section spine.** Read `reference/section-schema.yaml`; emit sections in spine order (Title → Description/TLDR → Install → Quickstart → Usage → Contributing → License). For each section, fill from `RepoMinerResult`, workspace-discovery output, or user answers. Skip sections the repo-type variant drops (e.g., `cli` drops `## Use as a library`).

6. **Rubric pass (§1).** Run the assembled draft through `rubric.sh --variant <repo_type>`. If <12/15 pass on a draft we're about to land, log warnings inline as TODO markers and continue (do not block — scaffold output is a starting point, not a polished README).

7. **Simulated-reader pass (§2 + §3).** Dispatch the 3-persona pass against the draft. Friction items merge into the diff preview (step 8) as inline comments, NOT into the README content (the user decides whether to act on persona feedback after the diff).

8. **Diff preview + confirm.** Emit the proposed README content to chat: ` ```markdown\n<full draft>\n``` ` followed by:
   - A `Rubric:` line showing the X/15 score per the rubric pass.
   - A `Simulated-reader:` block summarising friction per persona (1-line each).
   - An `AskUserQuestion`: **Write README.md (Recommended)** / **Edit before writing** / **Discard**.
   - Defer-tag this prompt with `<!-- defer-only: destructive -->` — writing a file is non-reversible from the skill's perspective.

9. **Atomic write (FR-OUT-4).** On confirm, write `<package-path>/README.md` via temp-then-rename. Log to chat: `scaffold: wrote <path> (<bytes> bytes; <line> lines; rubric <X>/15)`.

10. **Per-package iteration.** In `audit+scaffold` composition (D16), repeat steps 1-9 for each absent-README package. Question cap is **per-package** (each gets its own 6-Q budget), not shared across the run.

**Anti-patterns specific to scaffold.** See [## Anti-Patterns](#anti-patterns) for the cross-cutting list; scaffold-specific rules:
- Never invent commands or APIs not present in the code. Use TODO markers instead.
- Never auto-pick a license — always defer to the user (per §5 step 4).
- Never write the README without the diff-preview gate, even with `--auto-apply` (which mechanizes only banned-phrase strikethrough in audit mode, per `reference/rubric.yaml`).

See [§4: Mode resolution](#4-mode-resolution), [§5: Repo-miner subagent](#5-repo-miner-subagent), and the rubric workflow in [§1: Single-file audit flow](#single-file-audit-flow).

### §7: Update-mode flow

When `--update <range>` is passed (per §4 FR-MODE-2), the runtime patches an EXISTING README based on commits that landed since the range's base. Update-mode is opt-in (dual-gate, see §8) and patch-only — never destructive. The full FR-UP-3 patch-fail guard ensures a regression cannot ship.

**Steps.**

1. **Classify the commit range.** Invoke `scripts/commit-classifier.sh <repo-root> <range>` (T17). Parse the JSON output: `commits[]` (per-commit type + breaking flag + section affinity) and `sections[]` (union of impacted sections, deduped).

   - **E12 path** (FR-UP-2): if `sections[]` is empty AND a `warn` field is present (`"no conventional-commit subjects"`), short-circuit with chat log `update-mode: README update skipped — commit signal ambiguous (no conventional-commit subjects in <range>)`. No patch attempted; exit 0.

2. **Per-section ask.** For each impacted section in `sections[]`, issue an `AskUserQuestion`:
   ```
   question: "Section <Name> impacted by <N> commits. Apply suggested patch?"
   options:
     - Apply (Recommended) — apply the LLM-drafted patch verbatim
     - Modify              — user supplies replacement text next turn
     - Skip                — drop the patch for this section
     - Defer               — log to /retro for later
   ```
   Batch ≤4 sections per call (per §8.6 of the spec's batching convention). The LLM drafts the per-section patch using the commit subjects + commit_affinity from `reference/section-schema.yaml`.

3. **Stage patches in working tree.** On Apply / Modify, write the patched README to disk (overwriting the existing file). DO NOT git add yet — staging is §8's responsibility.

4. **Re-run rubric on patched README** (per §1). The rubric.sh pass produces a fresh 15-check verdict against the patched file.

5. **FR-UP-3 patch-fail guard.** If ANY blocker check fails in the rubric pass on the patched README:
   - **Revert the working tree**: `git checkout -- <readme-path>` (or restore the pre-patch buffer if the file was untracked).
   - **Log to `.pmos/readme/update.log`** (append, JSONL):
     ```json
     {"event":"patch_dropped","reason":"rubric_blocker_fail","range":"<range>","failed_checks":["<id>",...],"timestamp":"<ISO-8601>"}
     ```
   - **Emit /retro finding** via the `/retro` skill's pending-findings queue (chat log entry + JSON to the retro buffer per the retro skill's contract).
   - **Release proceeds unpatched** — the existing README ships as-is. The patch failure does NOT block `/complete-dev`.
   - **Chat log:** `update-mode: patch dropped (rubric blockers: <ids>); README unchanged; finding logged for /retro`.

6. **On rubric pass.** The patched README remains on disk; staging deferred to §8 (`git add` only — no commit by /readme per FR-UP-5).

**E13 path** — Range contains zero commits (e.g., `HEAD..HEAD`): treat same as E12 — chat warn, exit 0, no patch.

See [§1: Single-file audit flow](#single-file-audit-flow) for the rubric pass that gates this flow, and [§8: Opt-in dual gate](#8-opt-in-dual-gate) for the FR-UP-4 dual-flag enablement (T19).

### §8: Opt-in dual gate

Update-mode is destructive-by-default in spirit (it overwrites the user's existing README) — so the entry point is **doubly opt-in** per FR-UP-4. Both flags must be `true` for the patch flow (§7) to fire.

**Dual-flag check (FR-UP-4).** At update-mode entry (after §4 resolves `mode == update` and BEFORE invoking the commit-classifier in §7 step 1), read both:

1. **User-global config:** `~/.pmos/readme/config.yaml :: phase_7_6_hook_enabled` (boolean; default `false` if file/key absent).
2. **Per-run state:** `.pmos/complete-dev.lastrun.yaml :: readme_update_hook` (boolean; default `false` if file/key absent).

**Resolution:**

| `phase_7_6_hook_enabled` | `readme_update_hook` | Action |
|---|---|---|
| `true` | `true` | Proceed to §7 |
| `true` | `false` | No-op + warn |
| `false` | `true` | No-op + warn |
| `false` | `false` | No-op + warn |
| absent | any | No-op + warn (treat absent as `false`) |
| any | absent | No-op + warn |

**Warn message (chat-log line, single):**
```
/readme --update skipped: opt-in not set (phase_7_6_hook_enabled=<v1> AND readme_update_hook=<v2>)
```
where `<v1>` and `<v2>` are the resolved values (`true|false|absent`). The user can re-enable with:

- `phase_7_6_hook_enabled`: `printf 'phase_7_6_hook_enabled: true\n' >> ~/.pmos/readme/config.yaml` (create the file if absent).
- `readme_update_hook`: this is per-run, set by `/complete-dev`'s Phase 0.5 ask when the user opts in to the post-release README update hook (default off). It is NOT set manually.

**Why dual.** The user-global flag (`phase_7_6_hook_enabled`) is the one-time enablement: "yes, I want /readme to participate in /complete-dev's Phase 7.6 hook." The per-run flag (`readme_update_hook`) is the per-release confirmation: "yes, run the hook on THIS release." Either alone is insufficient — the global flag without the per-run confirmation would surprise users; the per-run flag without the global enablement would let /complete-dev silently fire a feature the user never opted into.

**FR-UP-5 — Staging-only contract.** On a successful patch (after §7 step 6 confirms rubric pass on the patched README), `/readme --update`:

1. **Stages** the patched README via `git add <readme-path>` — exactly one path per package in monorepo composition mode.
2. **Does NOT** call `git commit`. The patched file enters /complete-dev's existing commit machinery alongside the release commit.
3. **Does NOT** call `git push`. Same reason — push is /complete-dev's job.
4. Logs to chat: `update-mode: README patched + staged at <path> (rubric <X>/15 pass); /complete-dev will pick it up in the release commit`.

This contract makes `/readme --update` a **patch generator**, not a commit author. The user's release workflow (manual or `/complete-dev`) owns the commit message and branch state.

See [§7: Update-mode flow](#7-update-mode-flow) for the upstream flow gated by this section, and [§4: Mode resolution](#4-mode-resolution) for `--update`'s mutex with `--audit`/`--scaffold`.

### §9: Cross-file rules (monorepo)

When composition is `monorepo` (per §5 repo-miner output), the audit pass runs four cross-file rules **after** per-file rubric scoring and **before** synthesis. Each rule emits a finding into the same rubric stream (`severity`, `rule_id`, `path`, `auto_fix_path`) so §1 audit and §6 scaffold both consume it uniformly. Full detection contracts, edge cases, and fixture mappings live in [reference/cross-file-rules.md](reference/cross-file-rules.md) (forward-cite — dangling until T20 merges).

| Rule | Scope | Detection | Auto-fix path |
|---|---|---|---|
| **R1** — root contents-table refs every workspace pkg ([#r1-link-existence](reference/cross-file-rules.md#r1-link-existence)) | root README only | Resolve workspace pkgs via `scripts/workspace-discovery.sh`; scan root README for a contents/packages table; assert each pkg path is referenced. | If table exists → append missing entries inline. If absent → AskUserQuestion "root README has no contents-table — add one? [show preview]" `<!-- defer-only: ambiguous -->` (structural rewrite, user must confirm). |
| **R2** — each pkg README links back to root ([#r2-link-up-presence](reference/cross-file-rules.md#r2-link-up-presence)) | every workspace pkg README | Scan pkg README for a relative link resolving to root README (`../README.md`, `../../README.md`, etc., per pkg depth). | Append a link-up line at end-of-readme under the configurable section (default: appended bare; section name overridable via `.pmos/readme.config.yaml :: link_up_section`). |
| **R3** — Install/Contributing/License root-only ([#r3-install-contributing-license-root-only](reference/cross-file-rules.md#r3-install-contributing-license-root-only)) | every workspace pkg README | Scan pkg README headings for `Install`, `Contributing`, `License` (case-insensitive, H2/H3). Emit WARN per hit. | Offer two options: (a) replace section body with a link-up to the root README's corresponding section; (b) mark as legitimate variance → persist in `.pmos/readme.config.yaml :: package_variance` keyed by `<pkg_path>:<section>`. Variance prompt is `<!-- defer-only: free-form -->` (override reason is user-typed). Subsequent runs skip the WARN when a matching variance entry exists. |
| **R4** — no duplicate hero text ([#r4-no-duplicate-hero-text](reference/cross-file-rules.md#r4-no-duplicate-hero-text)) | root vs each pkg README | Extract hero line = first non-empty, non-heading line after H1. Cross-compare root hero against each pkg hero; flag exact or near-duplicate (normalized whitespace + case). | **No auto-fix** — voice-sensitive. Surface as friction-only finding; user resolves via /polish or manual edit. |

The cross-file pass slots in as a single post-per-file phase: §1 audit invokes it after rubric scoring and includes its findings in the rubric-stream summary; §6 scaffold invokes it after writing the per-pkg READMEs so the generated tree is internally consistent on first emit. Both flows respect the `package_variance` ledger from R3, so confirmed variances persist across runs without re-prompting.

### §10: Monorepo audit-all flow

When `scripts/workspace-discovery.sh` reports composition=`monorepo`, §10 orchestrates the workspace-scope flow that wraps §1 audit, §6 scaffold, and §7 update into a single cross-package run with one unified diff (FR-OUT-1) and one final approval. This section closes the monorepo integration contract — it is invoked from §1/§6/§7 once workspace composition is confirmed, and supersedes their per-file flows for the duration of the run.

**argv parsing.** The non-interactive surface is `--scope <audit-all|audit-one|scaffold-missing|root-only>` (FR-MODE-3). When `--scope` is present, §10 bypasses the workspace-scope AskUserQuestion below and dispatches directly. `--scope audit-one` requires a positional pkg path (`--scope audit-one packages/web`); missing path → hard error, no prompt fallback. Absent `--scope`, the interactive prompt fires. `--scope` is mutex with the per-file `--path` flag (validated at §4 mode resolution).

**Workspace-scope prompt** (interactive surface, fires once after workspace-discovery returns). `<!-- defer-only: ambiguous -->` — choice surface, no destructive write yet.

| Option | When shown | Behavior |
|---|---|---|
| `audit-all` (Recommended for non-empty workspaces) | always | Run rubric + cross-file pass against every discovered pkg + root. |
| `audit-one <pick>` | always | Follow-up AskUserQuestion lists discovered pkg paths; run rubric on that pkg only (cross-file pass skipped — single-pkg scope). |
| `scaffold-missing` | only when ≥1 pkg has no README | Run §6 scaffold against pkgs missing README; existing READMEs untouched. |
| `root-only` | always | Audit root README only; skip pkg iteration. Cross-file R1 still fires (root contents-table check). |
| `Include all stacks (JS + Go + …)` | only when repo-miner emits MS01 (multi-stack workspace) | Forces per-pkg rubric variant to follow each pkg's detected `repo_type` rather than the workspace-default; otherwise pkgs inherit root `repo_type`. |

**Per-package iteration.** For `audit-all` and `Include all stacks`, iterate pkgs in discovery order. Per pkg: load rubric variant per its `repo_type` (from repo-miner per-pkg output — see §5), run the 15-check rubric (§2), run the §9 cross-file rule pass scoped to that pkg, append findings to a shared rubric stream keyed by `<pkg_path>`. Root README is iterated as a synthetic pkg with `path=.` so R1/R4 land in the same stream.

**Findings roll-up.** First-pass output groups by severity across the whole workspace (blockers first, then friction, then nits), then within each severity a per-package one-liner: `<pkg_path>: N blockers, M friction, K nits` (zero-counts omitted from the line, omitted entirely if all-zero). After the roll-up, fire a follow-up `AskUserQuestion` — `Show findings for <pkg>` / `Proceed to diff` / `Cancel` — drill-down lists every finding for that pkg with `rule_id`, `path`, `severity`, `auto_fix_path` (matches §1 audit format). User can drill multiple pkgs before proceeding. `<!-- defer-only: ambiguous -->` (read-only navigation).

**Unified diff (D15 / FR-OUT-1).** A single diff body covers every patched file across every pkg + root. Per-file headers use the form `=== package: <pkg_path> (audit|scaffold) ===` immediately before the standard unified-diff `--- a/<path>` / `+++ b/<path>` header. `audit` = update-mode patch against an existing README; `scaffold` = new-file create against `/dev/null`. Diff body is emitted in pkg-discovery order; root last so reviewers land on the highest-level file at end-of-scroll.

**Atomic multi-write contract.** On `Apply all`, every patched file is written via `temp+rename` per §6's atomic-write contract. If any rename fails mid-batch, every successfully-renamed file is reverted to its pre-write content (captured to per-file `.bak` paths before any rename); failure surfaces to chat as `monorepo write rolled back: <failed-path> — <N> files reverted, no partial state on disk`. The contract is all-or-nothing — workspace consistency wins over partial progress.

**Final approval** (single AskUserQuestion, fires after diff render). `<!-- defer-only: destructive -->` — writes to disk.

| Option | Behavior |
|---|---|
| `Apply all` (Recommended) | Atomic multi-write per above; stages all paths via `git add` (§8 contract); does NOT commit. |
| `Reject all` | Discard diff; exit with `monorepo audit complete — no files written`. |
| `Cancel` | Same as Reject all (alias for muscle-memory). |

**Composition wiring.** §10 is the entry point for §1 audit / §6 scaffold / §7 update whenever composition=`monorepo`: §1 delegates the iteration + roll-up + diff phases here and consumes the unified diff as its audit output; §6 delegates the missing-pkg detection + scaffold-emit phases here and reuses the same approval gate; §7 update applies §10's diff-and-stage contract per-pkg so workspace-scope update lands as one staged batch for /complete-dev to commit. Per-file flows in §1/§6/§7 remain the contract for `composition=single` repos — §10 is the monorepo overlay, not a replacement.

### §11: Voice delegation

**FR-V-2 — follow-up Suggest line.** After every successful /readme audit-or-scaffold run (§6, §7), emit exactly one chat line on the final turn: `Suggest: /polish <path-to-README.md> — tighten prose without changing meaning.` Non-blocking advisory — exit 0, no AskUserQuestion, no gate. Voice and prose-tightening are /polish's job (see Anti-Patterns); /readme is structure-only. Cite FR-V-2.

**FR-V-3 — voice-drift gate on /polish round-trip.** When the user runs /polish and re-invokes /readme in update mode (§7), gate re-acceptance with `scripts/voice-diff.sh README.md.pre-polish README.md` (forward-cite: ships in T23, parallel Wave 1). Accept iff `sentence_len_delta_pct < 15` AND `jaccard_new_tokens >= 0.7`. On fail, emit `voice-drift detected: /polish materially changed meaning — review diff before accepting`, then AskUserQuestion (prefix `<!-- defer-only: ambiguous -->` so §0b's non-interactive block defers rather than auto-picks). Options: **Accept polished version (Recommended)** / **Reject — keep pre-polish** / **Show diff**. Cite FR-V-3.

**FR-V-4 — substrate-absent graceful warn.** If `find plugins/pmos-toolkit/skills/polish/ -name 'voice*'` returns empty, `voice-diff.sh` writes a stderr warn and falls back to its built-in tokenizer — gate still runs, with chat note `voice-diff: /polish substrate unavailable; using built-in heuristic`. Never block on missing substrate. Cite FR-V-4.

**Worked example** — update-mode + /polish round-trip: `voice-diff.sh` emits `{"sentence_len_delta_pct": 22.4, "jaccard_new_tokens": 0.61, "verdict": "drift"}` → chat renders `voice-drift detected: /polish materially changed meaning — review diff before accepting` → AskUserQuestion (Accept/Reject/Show diff) → final turn appends `Suggest: /polish README.md — tighten prose without changing meaning.`

**Cross-cites.** §11 fires on the success edge of §6 and §7 (both emit FR-V-2 Suggest as final turn); only §7 can trigger the FR-V-3 drift gate (scaffold has no pre-polish baseline).

## Anti-Patterns

- **Do NOT auto-commit.** /readme writes to the working tree (or stdout for audit); /complete-dev owns the release commit. Auto-committing breaks the user's ability to review the patch before it lands.
- **Do NOT skip the simulated-reader pass** except via the explicit `--skip-simulated-reader` flag (advisory, not silent). The 3-persona pass catches gaps the rubric misses — skipping it is a user choice, never a default.
- **Do NOT bypass /polish for voice work.** /readme produces structural output; voice, tone, and prose-tightening are /polish's job. If the user asks for "make this README sound better", invoke /polish on the output rather than rewriting in-skill.

## Phase N: Capture Learnings

This skill is not complete until learnings-capture has run. Read `learnings/learnings-capture.md` (relative to this skill's directory) and reflect on whether this session surfaced anything worth capturing — new rubric checks, manifest-discovery edge cases, simulated-reader persona refinements, or platform-adaptation gotchas. Append entries to `~/.pmos/learnings.md` under `## /readme` only when the lesson generalizes; skill-body wins on conflict.

---

## Apply comment-resolver edit (FR-22, FR-30, FR-60)

This phase is the `/readme` entrypoint that `/comments resolve` (T10) dispatches into when walking open threads in a readme audit artifact's `.comments.json` sidecar. The contract — input/output JSON shapes, closed `error_enum` set, idempotency rules, subagent invocation convention — lives in the shared contract doc and is the single source of truth:

- **Contract (normative):** `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md` (T6).

Per [NFR-08](../../../docs/pmos/features/2026-05-23_inline-doc-comments/02_spec.html#nfr-h), this phase MUST cite that file rather than restate the contract. Anything below is `/readme`-specific implementation guidance only.

**Comments meta tag (FR-01, FR-40):** any HTML artifact emitted by `/readme` (scaffold output rendered to HTML, audit report) MUST carry `<meta name="pmos:skill" content="readme">` in the `<head>`. Set `{{pmos_skill}}` to `readme` when expanding the substrate template. The `/comments` resolver routes apply-edit dispatches via this tag, so it MUST be set byte-exact.

**Asset substrate (FR-40):** when writing HTML artifacts, include `comments.js`, `comments.css`, `diff_match_patch.js`, and the launcher trio (`comments-open.command`, `comments-open.sh`, `comments-open.bat`) alongside the rest of the HTML substrate assets. Copy from `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/` using `cp -n` (idempotent).

### When invoked

The resolver dispatches a subagent with the §9.1 input JSON. The subagent's tools include this skill's Node shim:

- **Shim:** `plugins/pmos-toolkit/skills/readme/scripts/apply-edit-at-anchor.js` — exports `apply(input)`, returns one of the three output shapes (success / failure / clarification) per §9.1. Success responses include the optional `applied_artifact` field (full post-edit HTML); the shim's minimal edit inserts an HTML annotation comment immediately before the resolved anchor element — real prose rewriting is deferred to T12+.

### Resolution order

1. **id-first.** Locate `id="<id>"` in the artifact HTML. Match → success path, `strategy: "id-first"`, `score: 1.0`.
2. **quote-fallback.** Run diff-match-patch Bitap against `anchor.quote_anchor.text`. Accept when normalized score ≥ 0.7.
3. **Neither hits** → emit `{ success: false, error_enum: "anchor_orphaned" }`; do NOT mutate the artifact.

### Tests

- Per-skill contract: `plugins/pmos-toolkit/skills/readme/tests/apply-edit-at-anchor.test.js` (5 cases: id-first happy, orphan, idempotent, infeasible, clarification).
- Wrapper: `tests/scripts/assert_apply_edit_at_anchor_readme.sh`.
