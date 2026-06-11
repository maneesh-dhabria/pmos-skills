---
name: readme
description: Audit, scaffold, or update READMEs against a binary rubric and a multi-persona simulated reader. Use this whenever the user asks to "audit my README", "scaffold a README", "fix my README", "generate a README", "review my README structure", or invokes /readme. Three modes share one substrate (--audit, --scaffold, --update <commit-range>); monorepo-aware (8 workspace manifests + multi-stack); voice work delegated to /polish; never auto-commits.
user-invocable: true
argument-hint: "[--audit|--scaffold|--update <commit-range>] [--scope <audit-all|audit-one <pkg>|scaffold-missing|root-only>] [--non-interactive|--interactive] [<repo-path>]"
---

# /readme

/readme audits, scaffolds, or updates a repository's README. Two judges decide what's wrong: a deterministic rubric (`reference/rubric.yaml`, run by `scripts/rubric.sh`) catches structural failures — missing hero or install, broken links, marketing slop — and a simulated-reader pass catches what no regex can: real readers bouncing. The output is findings (audit), a draft README (scaffold), or a staged patch (update). /readme never auto-commits (commits belong to /complete-dev) and never rewrites voice (prose belongs to /polish).

## When to Use

- **Audit** — "review my README", "is my README any good". Rubric + reader pass against the existing README; reports findings; writes nothing.
- **Scaffold** — "generate a README", or no README exists. Mines the repo (manifests, entry points, license, structure) and drafts a skeleton grounded in evidence.
- **Update** — "what does the README need given these commits" (`--update <commit-range>`). Maps the range's Conventional Commits onto impacted README sections and proposes targeted patches.

All three are monorepo-aware: `scripts/workspace-discovery.sh` probes 8 workspace-manifest families and a run can target the root, one package, or every workspace ([the monorepo phase](#monorepo)).

## Platform Adaptation

Claude Code is the primary target platform. The canonical non-interactive contract (inlined below) governs behavior under `--non-interactive`, including on platforms where AskUserQuestion is not available — the classifier defers any question without a `(Recommended)` option and auto-picks otherwise. On platforms that cannot dispatch Task subagents in parallel, run the reader-pass dispatches sequentially — the per-call timeout bounds the cost either way.

## Track Progress

For multi-step runs (audit-all across a monorepo; update mode producing N patches), use the agent's task-tracking tool (`TaskCreate` in Claude Code; equivalent on other platforms) — one task per workspace or per patch.

## Phase 0: Pipeline setup {#pipeline-setup}

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

## Phase 0b: Non-interactive contract {#non-interactive}

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

## Dependencies & script contracts {#scripts}

Bundled scripts live at `${CLAUDE_PLUGIN_ROOT}/skills/readme/scripts/` — always invoke via that root, never an absolute path. Environment: **bash 3.2+** (every script is Bash-3.2-safe per the repo's portability invariant — the macOS default shell works as-is), **python3 ≥ 3.8 with PyYAML**, **jq ≥ 1.6**, and **git**. node is needed only by the shared HTML substrate (`chrome-strip.js` / `build_sections_json.js`), never by a bundled shell script. Each script's `--selftest` exits non-zero with a clear diagnostic on a missing dependency — run once after install to verify the environment.

Each script contract, stated once:

| Script | Invocation | Contract |
|---|---|---|
| `rubric.sh` | `bash scripts/rubric.sh <readme-path> [--variant <repo-type>]` | One TSV row `check-id \t verdict \t commit \t line \t message` per check declared in `reference/rubric.yaml`. Exit 0 = all pass, 1 = ≥1 fail, 2 = script error (refuse the run: `rubric.sh exited 2 — see stderr above. Aborting audit.`). |
| `workspace-discovery.sh` | `bash scripts/workspace-discovery.sh <repo-root>` | JSON: primary manifest, secondaries, enumerated `packages`, `repo_type`. Owns manifest precedence across the 8 supported families — never re-derive precedence in prose. |
| `commit-classifier.sh` | `bash scripts/commit-classifier.sh <repo-root> <range>` | JSON `commits[]` (type, breaking, section affinity) + `sections[]` (deduped union), driven by the `commit_affinity` table in `reference/section-schema.yaml`; adds a `warn` field when the range has no Conventional-Commit subjects. |
| `voice-diff.sh` | `bash scripts/voice-diff.sh <pre.md> <post.md>` | JSON `{"sentence_len_delta_pct": <n>, "jaccard_new_tokens": <n>}` (pure bash + awk). |
| `_reviewer_validate.sh` | source it, then `readme::reviewer_validate <json> <readme-path>` | 0 = clean, 1 = violation with stderr message. Enforces the reviewer `check_id` set-equality against the `[J]` rows of `reference/rubric.yaml` plus the quote contract. |
| `apply-edit-at-anchor.js` | comment-resolver shim — see [the comment-resolver phase](#apply-comment-edit) | success / failure / clarification JSON per `_shared/apply-edit-at-anchor.md`. |

## Phase 1: Mode resolution {#mode-resolution}

Infer the mode from the request — "review my README" → audit, "generate/start over" → scaffold, "what changed since `<range>`" → update; an explicit `--audit` / `--scaffold` / `--update <range>` flag overrides inference. With no flag and no stated intent: an existing `README.md` defaults to audit (`mode: audit (existing README detected)`); no README defaults to scaffold (`mode: scaffold (no README found)`).

Refusals, all exit 64: two mode flags together (`Modes are mutually exclusive: --audit / --scaffold / --update <range>. Pick one.`); `--update` with `--audit` or `--scaffold` (`--update is mutually exclusive with --audit/--scaffold`); `--update` without a range (`--update requires a commit range (e.g. main..HEAD)`); `--audit` with no README (`--audit requires a README; pass --scaffold or omit flags`).

In monorepos where some packages have a README and some don't, resolve the composition `audit+scaffold` — audit the present, scaffold the absent — in one invocation. Emit one log line per run, `mode: <resolved> (source: cli|default-readme-present|default-readme-absent)`; for the composition, the multi-line form:

```
mode: audit+scaffold (source: cli)
  - packages/foo: audit (README present)
  - packages/bar: scaffold (README absent)
```

The full input × flags × README-presence resolution table lives in [reference/modes.md](reference/modes.md#mode-resolution-table).

## Phase 2: Audit {#audit}

Audit is **read-only**: it reports, the user acts. Run `rubric.sh` (contract above), then the [reader pass](#simulated-reader) unless skipped. The rubric is a hard gate because a script decides it deterministically; the reader pass is advisory because bouncing is a judgment call — surfaced, never blocking.

1. Tally PASS/FAIL rows; emit `rubric: <P> pass / <F> fail`. Zero fails → close with `README clean against rubric. Nothing to fix.` — no findings table, no prompts.
2. With findings, emit one Markdown table — `Source | Severity | Check/Persona | Line | Message | Suggested fix`, severity-desc, Source ∈ {`rubric`, `reviewer`, `persona`}. **Do NOT fire `AskUserQuestion`** — the user re-runs with `--scaffold` or edits directly to apply fixes.
3. Close-out: audit emits the count line plus bracketed sub-counts `[+ <R> reviewer findings + <N> persona friction]` (omit zero buckets); write modes emit `README written to <target>. Run /complete-dev to include it in the release commit.` **Both modes additionally emit**, on a separate final line: `Suggest: /polish <readme-path> — tighten prose without changing meaning.`

## Phase 3: Simulated reader {#simulated-reader}

The rubric can't see a reader's job; the personas can. Each is a *reader who can leave*, not a reviewer — the prompts in `reference/simulated-reader.md` engineer against LLM helpfulness bias, and quote-grounding makes every finding mechanically checkable.

**Dispatch.** Issue 5 `Task` tool calls in ONE assistant response (sequentially only where the platform can't parallelize — see Platform Adaptation): 4 personas (`evaluator`, `adopter`, `contributor`, `returning-user-navigator`) + 1 IA-fit reviewer scoring the `[J]` rubric checks. Every call uses `model: sonnet` — these are bounded roles whose returns are validated deterministically parent-side, which is what makes the cheaper tier safe. Each Task body pastes, verbatim: the matching prompt block (`reference/simulated-reader.md` §1 per persona; `reference/reviewer.md` §1 for the reviewer), the absolute path of the un-stripped README with an instruction to read it (paths over pastes — subagents share the filesystem), and the return-shape contract (§2 of the respective file). Per-call timeout 120s, advisory: a timed-out persona is skipped with `simulated-reader: persona <name> timed out (120s); skipping`; a timed-out reviewer drops the `[J]` findings with a warn.

**Validation (parent-side).** The quote contract is `_shared/reviewer-protocol.md` — ≥40-char verbatim quotes, substring-grepped by the parent against its own read of the source, never self-validated. Call-site deltas here: the source is the raw README markdown (no chrome-strip, no `sections.json`), and persona returns carry a `persona` label instead of section ids.

- **Personas — advisory, drop-with-warn.** An entry with a sub-40-char quote, a quote not found verbatim in the README, or a `persona` label that doesn't match the dispatched one is **dropped with a warn** (e.g. `simulated-reader returned quote shorter than 40 chars: <quote>`; `simulated-reader returned quote not found in README: <prefix-30>…`); surviving entries proceed. The grep grounding still guarantees nothing fabricated merges — a formatting slip costs one finding, not the run.
- **Reviewer — hard.** Delegate to `readme::reviewer_validate` (contract above). Its `check_id` set-equality feeds scored rubric rows, so a violation hard-fails and pauses with the failure dialog.

**Merge + dedupe.** Accepted persona entries merge into the rubric findings stream tagged `source: simulated-reader/<persona>`, severity from the return (default `friction`). Dedupe near-duplicates — same section (per the spine in `reference/section-schema.yaml`), line ±2 — keeping the higher severity; on ties keep the rubric entry (deterministic beats probabilistic).

**Theater-check.** A persona returning empty `friction[]` while the rubric scored ≥3 findings is re-dispatched ONCE with the bounce-suffix in `reference/simulated-reader.md` §3; a second empty return is accepted as genuine. Log `simulated-reader: theater-check re-dispatched persona <P> (rubric≥3, empty first-pass)`.

**Skipping.** The user can say "skip the reader pass" (CI against pre-vetted READMEs is the intended case); log `simulated-reader: skipped`.
<!-- nl-sugar -->
`--skip-simulated-reader` is still parsed as a silent alias for that request.

**Test stubs.** `READMER_PERSONA_STUB` / `READMER_REVIEWER_STUB` replace the Task dispatches with shell stubs for the contract tests — documented in `reference/simulated-reader.md` §4 and `reference/reviewer.md` §4; never set in production.

## Phase 4: Scaffold {#scaffold}

The one rule that matters most: **never invent commands, APIs, or facts not present in the code — emit `<!-- TODO(/readme): <field> — <reason> -->` markers instead.** A wrong install command is worse than a visible gap.

Per package:

1. **Repo-miner.** Dispatch ONE Task call (`model: sonnet`, timeout 90s — on timeout fall back to user questions): prompt body = the supported-manifest set from `scripts/workspace-discovery.sh`, the repo-root absolute path, and the return-shape contract in [reference/modes.md](reference/modes.md#repo-miner-contract). Validate the return per that contract — every non-null fact must carry an `evidence` pointer that greps true on disk; a validation miss hard-fails and pauses.
2. **Workspace discovery.** `workspace-discovery.sh` refines `repo_type` (it owns precedence).
   <!-- defer-only: ambiguous -->
3. **Fill gaps by asking — capped.** For fields the miner returned `null` and discovery can't infer, `AskUserQuestion` with repo-derived defaults; never auto-pick a license — the license prompt is always deferred-or-asked, never assumed. Hard cap **6 questions per package**; at the cap, emit a stub with TODO markers and log `scaffold: question cap reached (6/6); emitting stub with N TODO markers — re-run /readme after filling in`.
4. **Assemble.** Opening shape per `repo_type` from `reference/opening-shapes.md` (library shape + a TODO marker for `unknown`); section order from the spine in `reference/section-schema.yaml`, skipping sections the repo-type variant drops.
5. **Self-check, advisory.** Run the draft through `rubric.sh --variant <repo_type>`; below ~80% of declared checks passing, inline TODO warnings and continue — a scaffold is a starting point, never blocked on polish. Then run the [reader pass](#simulated-reader) against the draft; friction lands in the diff preview as comments, not in the README content.
6. **Diff preview + confirm.** Show the full draft, a `Rubric: <passes>/<total checks>` line, and a 1-line-per-persona `Simulated-reader:` block, then ask: **Write README.md (Recommended)** / **Edit before writing** / **Discard**.
   <!-- defer-only: destructive -->
   (Writing a file is non-reversible from the skill's perspective.)
7. **Atomic write.** Temp-then-rename next to the package manifest — never write the target directly; on write error, refuse with the original file intact. Log `scaffold: wrote <path> (<bytes> bytes; <lines> lines; rubric <passes>/<total>)`.

In `audit+scaffold` composition, repeat per absent-README package; the question cap is per-package.

## Phase 5: Update {#update}

Update mode is patch-only and self-gated: typing `--update <range>` IS the consent — no external hook, config flag, or other enablement. Every patch passes the per-section prompts, and the patch-fail guard makes auto-patching safe.

1. **Classify.** `commit-classifier.sh <repo-root> <range>`. If `sections[]` is empty with a `warn` (no Conventional-Commit subjects), or the range has zero commits: log `update-mode: README update skipped — commit signal ambiguous (no conventional-commit subjects in <range>)` and exit 0 — no patch attempted.
2. **Per-section ask.** For each impacted section (batch ≤4 per call), draft a patch from the commit subjects + `commit_affinity`, then:
   ```
   question: "Section <Name> impacted by <N> commits. Apply suggested patch?"
   options:
     - Apply (Recommended) — apply the drafted patch verbatim
     - Modify              — user supplies replacement text next turn
     - Skip                — drop the patch for this section
     - Defer               — log to /reflect for later
   ```
3. **Patch + re-check.** Write accepted patches to the working tree (no `git add` yet), then re-run `rubric.sh` against the patched README.
4. **Patch-fail guard (hard).** If any blocker check fails on the patched file: revert (`git checkout -- <readme-path>`, or restore the pre-patch buffer if untracked); append to `.pmos/readme/update.log` (JSONL) `{"event":"patch_dropped","reason":"rubric_blocker_fail","range":"<range>","failed_checks":[…],"timestamp":"<ISO-8601>"}`; queue a /reflect finding; log `update-mode: patch dropped (rubric blockers: <ids>); README unchanged; finding logged for /reflect`. The release proceeds unpatched — the failure never blocks /complete-dev.
5. **Stage only.** On rubric pass, `git add <readme-path>` (one path per package in composition mode) — never `git commit`, never `git push`; the user's release flow owns those. Log `update-mode: README patched + staged at <path> (rubric <passes>/<total> pass); /complete-dev will pick it up in the release commit`.

## Phase 6: Monorepo runs {#monorepo}

When `workspace-discovery.sh` reports a monorepo, this phase wraps the per-file flows of [audit](#audit) / [scaffold](#scaffold) / [update](#update) into one cross-package run with one unified diff and one final approval. Single-repo runs never enter it.

<!-- defer-only: ambiguous -->
**Scope.** `--scope <audit-all|audit-one <pkg>|scaffold-missing|root-only>` pins the scope for headless runs (`audit-one` requires its package path — hard error without it, no prompt fallback); otherwise ask once via `AskUserQuestion`: **audit-all (Recommended for non-empty workspaces)** / audit-one (follow-up pick from discovered paths) / scaffold-missing (shown when ≥1 package lacks a README) / root-only / "Include all stacks" (shown for multi-stack workspaces; makes each package use its own `repo_type` rubric variant).

**Iterate.** Per package in discovery order: rubric with the package's variant, then the four cross-file rules of [reference/cross-file-rules.md](reference/cross-file-rules.md) — R1 root contents-table references every package, R2 each package links back to root, R3 Install/Contributing/License live root-only (with a persistent `package_variance` ledger for confirmed exceptions), R4 no duplicate hero text (friction-only; voice-sensitive, so no auto-fix). Findings join one stream keyed by package path; the root README iterates as a synthetic package so R1/R4 land in the same stream.

**Roll up and approve.** Summarize per severity then per package; offer drill-down before proceeding (a read-only navigation prompt — defer-tagged `ambiguous`). Render ONE unified diff covering every file (per-file headers + ordering per [reference/modes.md](reference/modes.md#monorepo-overlay)), then the final gate:
<!-- defer-only: destructive -->
**Apply all (Recommended)** / **Reject all** / **Cancel** — Apply writes every file atomically **all-or-nothing** (any mid-batch failure reverts every written file from its `.bak`; no partial state on disk) and stages via `git add` per the update-mode staging contract; Reject/Cancel exits with `monorepo audit complete — no files written`.

## Phase 7: Voice delegation {#voice-delegation}

Voice, tone, and prose-tightening are /polish's job — that is why every successful run ends with the Suggest line in the [audit close-out](#audit), and why /readme never rewrites prose in-skill.

When the user runs /polish on the README and re-enters update mode, check the round-trip with `voice-diff.sh README.md.pre-polish README.md`. The thresholds (sentence-length delta < 15%, token Jaccard ≥ 0.7) are heuristics, so the result is advisory: surface the numbers, and when they indicate drift, say `voice-drift detected: /polish materially changed meaning — review diff before accepting` and ask —
<!-- defer-only: ambiguous -->
**Accept polished version (Recommended)** / **Reject — keep pre-polish** / **Show diff**. If the /polish substrate is absent, `voice-diff.sh` falls back to its built-in tokenizer with a stderr warn (`voice-diff: /polish substrate unavailable; using built-in heuristic`) — never block on missing substrate.

## Anti-Patterns

- **Do NOT auto-commit.** /readme writes to the working tree (or stdout for audit); /complete-dev owns the release commit.
- **Do NOT invent README facts.** No commands, APIs, env vars, or claims that aren't evidenced in the repo — TODO markers mark the gaps.
- **Do NOT skip the simulated-reader pass silently.** Skipping is an explicit user choice (logged), never a default — the personas catch what the rubric can't.
- **Do NOT bypass /polish for voice work.** "Make this README sound better" → invoke /polish on the output, don't rewrite in-skill.

## Phase 8: Capture Learnings {#capture-learnings}

This skill is not complete until learnings-capture has run. Read `_shared/learnings-capture.md` (relative to this skill's directory) and reflect on whether this session surfaced anything worth capturing — new rubric checks, manifest-discovery edge cases, persona refinements, platform gotchas. Append to `~/.pmos/learnings.md` under `## /readme` only when the lesson generalizes; skill body wins on conflict.

---

## Apply comment-resolver edit {#apply-comment-edit}

This phase is the `/readme` entrypoint that `/comments resolve` dispatches into when walking open threads in a readme artifact's inline `pmos-comments` JSON block. The contract — input/output JSON shapes, closed `error_enum` set, idempotency rules, subagent invocation convention — lives in `plugins/pmos-toolkit/skills/_shared/apply-edit-at-anchor.md`, which this phase MUST cite rather than restate. Below is `/readme`-specific guidance only.

- **Meta tag:** any HTML artifact emitted by `/readme` carries `<meta name="pmos:skill" content="readme">` in `<head>` (set `{{pmos_skill}}` byte-exact — the resolver routes on it).
- **Assets:** ship `comments.js`, `comments.css`, and the launcher trio alongside HTML artifacts, copied from `${CLAUDE_PLUGIN_ROOT}/skills/_shared/html-authoring/assets/` with `cp -n`.
- **Shim:** `scripts/apply-edit-at-anchor.js` exports `apply(input)`; resolution order is id-first (`strategy: "id-first"`, `score: 1.0`), then substring-contains on the ≥40-char `quote_anchor.text`, else `{ success: false, error_enum: "anchor_orphaned" }` with no mutation. Tests: `tests/apply-edit-at-anchor.test.js` (id-first happy, orphan, idempotent, infeasible, clarification) + the wrapper at `tests/scripts/assert_apply_edit_at_anchor_readme.sh`.

---

*Spec lineage: `docs/pmos/features/2026-05-13_readme-skill/02_spec.html` (modes, rubric, scaffold/update flows, FR-* ids) and `docs/pmos/features/2026-05-15_readme-audit-fixes/` (4th persona, `[J]` reviewer checks). Requirement-level detail lives there; this file states the operating contract.*
