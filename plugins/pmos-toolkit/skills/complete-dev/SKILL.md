---
name: complete-dev
description: End-of-development orchestrator that follows /verify — merges feature work into main, captures learnings into CLAUDE.md/AGENTS.md, regenerates the changelog, bumps versions, deploys per repo norms, tags the release, and pushes to all configured remotes. Supersedes the legacy /push skill. Terminal stage of the requirements -> spec -> plan -> execute -> verify -> complete-dev pipeline. Use when the user says "complete the dev cycle", "ship this work", "merge and deploy", "wrap up this branch", "finish development", "ready to push and deploy", "push to remotes", "push and ship", or "push the release".
user-invocable: true
argument-hint: "[--plugin <name>] [--skip-changelog] [--skip-deploy] [--no-tag] [--force-cleanup] [--reset-defaults] [optional commit-message hint] [--non-interactive | --interactive]"
---

# /complete-dev — end-of-development orchestrator

Runs the full end-of-dev ceremony after `/verify`: confirm run defaults (one prompt seeded from lastrun) → merge → deploy detection → learnings capture → README + /changelog → version bump → commit → tag → push → worktree cleanup. The Phase 0a "Confirm run defaults" prompt collapses ~6 per-phase prompts into one consolidated confirm seeded from `.pmos/complete-dev.lastrun.yaml` (per-developer memory of the last run's choices); destructive gates (merge conflict, stale-bump, push failure, tag collision, commit message) still ask.

**Announce at start:** "Running /complete-dev: end-of-dev ceremony — merge, deploy, learnings, commit, tag, push. Approval gates at every destructive step."

## Pipeline position

```
/requirements → [/msf-req, /creativity] → /spec → /plan → /execute → /verify → /complete-dev (this skill)
                  optional enhancers
```

Standalone-ish: invokes `/changelog` (Phase 8) and optionally `/verify` (Phase 1).

## Track Progress

Phases run 0–18 in order, with three conditional sub-phases (0a defaults confirm, 15a push-retry cleanup, 16a worktree cleanup) and a one-line deferral stub at Phase 4 (the cleanup body lives at Phase 16a). Do NOT create one task per phase — track 8 task groups with your agent's task-tracking tool (e.g., `TaskCreate` in Claude Code), marking each in-progress when started and completed as soon as it finishes:

1. Preflight + run defaults (Phases 0–2)
2. Merge (Phases 3–4)
3. Deploy detection + repo learnings (Phases 5–6)
4. README + changelog + version bump (Phases 7–10)
5. Commit + branch cleanup (Phases 11–12)
6. Tag + dry-run summary (Phases 13–14)
7. Deploy + push + push tag (Phases 15–16, incl. the 15a retry loop)
8. Worktree cleanup + finalize + lastrun + learnings capture (Phases 16a–18)

## Platform Adaptation

These instructions use Claude Code tool names. In other environments:

- **No interactive prompt tool:** state your assumption, document it in the final report, proceed. Never silently skip a phase. Specifically: default deploy method to "skip deploy" if undetermined; default merge style to fast-forward if possible; default version bump to patch.
- **No subagents:** Phase 6 learnings scan and Phase 8 /changelog run inline (sequential). No dispatch needed.
- **No Playwright / MCP:** N/A — this skill has no browser-based steps.
- **No `TaskCreate` / `TodoWrite`:** print phase headers as text progress markers.
- **/changelog unavailable:** skip Phase 8 with a warning; suggest manual changelog edit. Same path as `--skip-changelog`.
- **/verify unavailable:** Phase 1's "Run /verify now" option becomes "Run verify manually then resume" with a pause.

## Load Learnings

Read `~/.pmos/learnings.md` if it exists. Note any entries under `## /complete-dev` and factor them into your approach for this session. If the file doesn't exist, skip silently.

## Arguments

`$ARGUMENTS` may contain:

- `--skip-changelog` — bypass Phase 8 (still runs Phase 5 detection so dry-run summary documents what was skipped). Forces `run_defaults.changelog_disposition: skip` in Phase 0a.
- `--skip-deploy` — bypass Phase 15's deploy invocation only (push and tag still happen). Forces `run_defaults.deploy_path: skip-deploy` in Phase 0a.
- `--no-tag` — bypass Phase 13 tagging (push still happens)
- `--force-cleanup` — pass through to Phase 16a worktree-cleanup's dirty-branch handling (allows `git worktree remove --force`)
- `--reset-defaults` — ignore `.pmos/complete-dev.lastrun.yaml` and seed Phase 0a from built-in defaults instead. The lastrun file is not deleted; Phase 17 will overwrite it with this run's choices as usual.
- Free-form text — used as the commit-message hint draft in Phase 11

Every flag has a natural-language equivalent — "skip the changelog this run" ≡ `--skip-changelog`, "don't tag" ≡ `--no-tag`, "ignore my last run's defaults" ≡ `--reset-defaults`; infer the option from the request, and an explicit flag overrides inference. The flags stay documented contracts because each is a destructive opt-in (`--force-cleanup`), a typed machine-coupled value (`--plugin`), or pins an answer a `--non-interactive` run can't be prompted for (`--skip-*`, `--no-tag`, `--reset-defaults`).

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

## Phase 0 — Sanity & state {#sanity-state}

Run in parallel:
- `git status --porcelain` (uncommitted state)
- `git branch --show-current` (current branch)
- `git remote -v` (which remotes are configured)
- `git worktree list` (am I in a worktree?)
- `git log --oneline -5`
- `git status -sb` (ahead/behind tracking)

Print a one-line state summary: `Branch: <name>; Worktree: <yes|no>; Uncommitted: <N>; Remotes: <list>; Ahead of origin: <N>`.

**Resolve `--plugin <name>` (multi-plugin marketplace).** In a multi-plugin repo (multiple `plugins/<name>/` directories under the repo root), Phase 0 must scope the release to exactly one plugin before any version-bump / tag / push work begins.

1. **Parse argument.** If the invocation includes `--plugin <name>`, capture `<name>` and validate against `ls plugins/`. If `<name>` does not match any directory under `plugins/`, emit `ERROR: --plugin <name> does not match any directory under plugins/. Known: <list>. Exit 64.` to stderr and abort.

2. **Auto-detect / refuse / substrate-smart-detect.** If `--plugin` is unset, invoke the runtime helper (a Bash tool call; if `CLAUDE_PLUGIN_ROOT` is unset on your platform, resolve the script relative to this SKILL.md — `scripts/diff_router.sh`):

   ```
   bash ${CLAUDE_PLUGIN_ROOT}/skills/complete-dev/scripts/diff_router.sh
   ```

   The script is the routing contract — relay its own message rather than re-deriving it. Four dispositions:

   - **Auto-detected** (stdout `Auto-detected --plugin <name> from diff`) → confirm via `AskUserQuestion` — Proceed (Recommended) / pass `--plugin` explicitly (retype) / abort — then set `--plugin <name>` and continue.
   - **Refused** (exit 64, stderr `spans plugins/.* AND plugins/` — multi-plugin diff with non-`_shared` changes) → surface the stderr verbatim and abort with exit 64. Do not proceed.
   <!-- defer-only: ambiguous -->
   - **Substrate-only** (stdout `Substrate-only change detected`) → ask via `AskUserQuestion` which plugin's next release should "ride" the substrate change (the version bump + tag + marketplace.json entry land under that plugin); set `--plugin <chosen>`.
   <!-- defer-only: ambiguous -->
   - **Silent exit 0** (empty diff or no `plugins/` paths) → legacy fallback: when exactly one plugin exists under `plugins/`, assume it; when several exist, ask the user to pick via `AskUserQuestion` — never guess.

<!-- defer-only: ambiguous -->
3. **Cross-check `## Release policy` in top-level `CLAUDE.md`.** Read the repo-root `CLAUDE.md`. If it contains a `## Release policy` section with a `plugins:` list, parse the list and compare against the actual directory list under `plugins/`. On any mismatch (missing entry, extra entry, name drift) emit `WARNING: CLAUDE.md ## Release policy plugins list disagrees with plugins/ directory layout: <diff>. Proceeding anyway.` to stderr and continue (warn-but-proceed; this is advisory only). If `CLAUDE.md` lacks a `## Release policy` section, skip silently. If the diff is `CLAUDE.md`-only (no `plugins/` paths at all in the cached or working diff), treat as a substrate-like case: warn the user and ask via `AskUserQuestion` which plugin's next release should ride the policy edit.

The resolved `--plugin <name>` value is the scope key for every downstream phase — version bump (Phase 9), tag prefix (Phase 13), marketplace.json registration check (Phase 14 pre-push), and changelog routing (Phase 8).

**Load lastrun defaults.** Seed `run_defaults` from `.pmos/complete-dev.lastrun.yaml` per `reference/lastrun-schema.md` § "Read contract" (absent → built-ins; malformed → stderr warn `lastrun.yaml malformed or unknown version — falling back to built-in defaults`, never error out; `--reset-defaults` → bypass the read, seed from built-ins). Then apply CLI-flag overrides: `--skip-changelog` → `changelog_disposition: skip`; `--skip-deploy` → `deploy_path: skip-deploy`; `--no-tag` is orthogonal (not stored in lastrun). Phase 0a surfaces overrides with a `(overridden by --flag)` annotation.

## Phase 0a — Confirm run defaults {#confirm-run-defaults}

**Skip if `mode == non-interactive`** — the AUTO-PICK-Recommended contract in the inlined non-interactive block already handles every prompt; Phase 0a's confirm is redundant there. Log to chat: `Phase 0a auto-confirmed (non-interactive); defaults source: <lastrun|built-in>`.

Otherwise, present `run_defaults` in a single consolidated prompt. Sample shape (substitute actual `run_defaults` values + override annotations):

```
Phase 0a — Confirm run defaults

  /verify already ran:    true
  Merge style:            rebase onto main, then fast-forward
  Worktree disposition:   remove after push succeeds
  Deploy path:            skip explicit deploy (CI handles it)
  Version bump:           minor
  Changelog action:       accept as drafted
  Push target:            all configured remotes

(Source: .pmos/complete-dev.lastrun.yaml — last updated 2026-05-12)
```

```
question: "Proceed with these defaults? Destructive prompts (merge conflict, stale-bump, push failure, tag collision, commit message draft) will still fire as needed."
options:
  - Confirm all (Recommended)
  - Edit one or more
  - Cancel
```

**On "Confirm all":** mark `run_defaults_confirmed = true`, which arms **the short-circuit rule — stated once, applied pipeline-wide:** every phase marked "(0a-short-circuitable)" below consults its `run_defaults` field, applies it per the field-reference table in `reference/lastrun-schema.md` (which enumerates each seeded prompt and its effect), skips its own prompt, and logs one line: `Phase <N>: <field> '<value>' auto-selected via Phase 0a`. The destructive-prompt allowlist in `reference/lastrun-schema.md` is never short-circuited. Two conditions are not memorizable and always re-prompt: Phase 3 when the shared-branch guard FAILs (rebase would rewrite SHAs others may have pulled), and Phase 5 when detected deploy signals differ from lastrun's `detected_signals.deploy` (the environment has shifted).

**On "Edit one or more":**

<!-- defer-only: ambiguous -->
```
question: "Which fields do you want to change?"
multiSelect: true
options:
  - /verify already ran
  - Merge style
  - Worktree disposition
  - Deploy path
  - Version bump
  - Changelog action
  - Push target
```

For each selected field, present the per-field prompt (reuse Phase 1 / 3 / 5 / 8 / 9 / 14's option lists verbatim). After all selected fields are updated, re-display the consolidated summary and re-ask "Proceed with these defaults?" — loop until the user picks Confirm.

**On "Cancel":** exit /complete-dev with no side effects.

## Phase 1 — /verify gate {#verify-gate}

(0a-short-circuitable: `verify_already_ran: true` → proceed to Phase 2. The PASS-WITH-GAPS check below still runs — it is never short-circuited.)

Otherwise (Phase 0a's edit path set it to `false`, OR running in non-interactive mode which already AUTO-PICKs the Recommended option):

<!-- defer-only: ambiguous -->
Ask via `AskUserQuestion` (no auto-detection — branch state changes via amend/rebase make commit-pattern detection unreliable):

```
question: "Has /verify been run for this branch's current state?"
options:
  - Already ran, continue (Recommended)
  - Run /verify now — invoke /pmos-toolkit:verify, then resume
  - Skip — I accept the risk for this push
  - Cancel /complete-dev
```

If "Run /verify now" → invoke `/pmos-toolkit:verify` inline. If verify fails, abort /complete-dev.

**PASS-WITH-GAPS check (always runs — confirmation-required, never auto-confirmed).** Before proceeding to Phase 2, read the verdict line of the most recent verify report: resolve `{docs_path}` and `current_feature` from `.pmos/settings.yaml`, then take the latest `{docs_path}/features/{current_feature}/verify/*-review.{html,md}` by date. If no settings, feature folder, or report resolves, skip this check silently. If the verdict is `PASS-WITH-GAPS`, surface every enumerated gap from the report's verdict block verbatim, then ask — this prompt is in the same class as the destructive-prompt allowlist (`reference/lastrun-schema.md`): the Phase 0a "Confirm all" short-circuit does NOT suppress it, and in non-interactive mode it classifies DEFER — record the open question and abort rather than merging past unverified gaps.

<!-- defer-only: destructive -->
```
question: "/verify finished PASS-WITH-GAPS — the gaps above are unverified. Merge and release anyway?"
options:
  - Resolve the gaps first — re-run /verify, then resume
  - Proceed despite gaps — I accept the risk for this release
  - Cancel /complete-dev
```

If "Resolve the gaps first" → invoke `/pmos-toolkit:verify` inline, then re-run this check on the fresh report. If "Proceed despite gaps" → continue, and list the accepted gaps in the Phase 17 success summary. If "Cancel" → exit with no side effects.

## Phase 2 — Worktree + branch detection {#worktree-detection}

Determine:
- Is the current cwd a worktree? (`git rev-parse --git-common-dir` differs from `git rev-parse --git-dir` when in a worktree)
- What's the feature branch? (current branch unless on main)
- Where's the root main checkout? (`git worktree list` first entry, or the dir whose `.git` is a directory not a file)

If on `main` already: skip to Phase 5 (no merge needed; treat as direct-to-main flow).

## Phase 3 — Merge feature → main {#merge}

If on a feature branch:

**Step A — Shared-branch guard.** Before showing the prompt, determine whether rebasing is safe:

```bash
upstream=$(git rev-parse --abbrev-ref --symbolic-full-name @{upstream} 2>/dev/null || true)
if [ -z "$upstream" ]; then
  guard=PASS  # no upstream → rebase-safe
else
  git fetch "${upstream%/*}" "${upstream#*/}" 2>/dev/null || true
  if [ "$(git rev-parse HEAD)" = "$(git rev-parse "$upstream")" ]; then
    guard=PASS
  else
    guard=FAIL  # remote tip diverged → rebase would rewrite SHAs others may have pulled
  fi
fi
```

**Step B — Show the prompt.** Annotation flips based on guard.

(0a-short-circuitable on guard PASS only: `merge_style` → its action per the field table; proceed to Step C. **Guard FAIL ALWAYS re-prompts** — destructive escape hatch — with merge as Recommended; Phase 0a's `merge_style` is ignored.)

- **Guard PASS** (default — solo branch or unpushed):

  ```
  question: "Land branch <name> into main how?"
  options:
    - Rebase onto main, then fast-forward (Recommended)
    - Merge into main (fast-forward if possible, else --no-ff merge commit)
    - Stay on feature branch and push only this branch
    - Cancel
  ```

- **Guard FAIL** (branch shared, remote diverged):

  ```
  question: "Branch <name> has been pushed and remote tip differs from local — rebase would rewrite SHAs others may have. Land into main how?"
  options:
    - Merge into main (--no-ff if not fast-forward) (Recommended)
    - Rebase onto main, then fast-forward (WARNING: rewrites SHAs)
    - Stay on feature branch and push only this branch
    - Cancel
  ```

**Step C — Execute the chosen option.**

If **rebase** chosen, the explicit sequence:

1. Verify uncommitted state is clean (or commit; ask user)
2. `cd <root-main-path>` if currently in a worktree
3. `git checkout main && git pull origin main`
4. `git checkout <feature-branch>`
5. `git rebase main` — **conflicts → STOP and ask user. Do NOT auto-resolve.**
6. `git checkout main`
7. `git merge --ff-only <feature-branch>` (guaranteed safe after step 5)

If **merge** chosen, the existing sequence:

1. Verify uncommitted state is clean
2. `cd <root-main-path>` if currently in a worktree
3. `git checkout main`
4. `git pull origin main`
5. `git merge <feature-branch>` (fast-forward where possible; `--no-ff` if explicitly chosen)
6. **Conflicts → STOP and ask user. Do NOT auto-resolve.**

## Phase 4 — Worktree cleanup (stub — runs at Phase 16a) {#cleanup-stub}

No-op stub — see Anti-pattern #4 for why cleanup runs after push tag. Log to chat: `Phase 4: worktree retained through release; cleanup deferred to Phase 16a.` Proceed to Phase 5.

## Phase 5 — Detect deployment norms {#deploy-norms}

Probe the six signal classes per `reference/deploy-norms.md` (the detection rubric and recommendation table live there): CLAUDE.md/AGENTS.md deploy sections, `package.json` deploy/release/publish scripts, Makefile targets, CI push-to-main workflows, plugin manifests (deploy = push-to-remotes), and `pyproject.toml` `[project]` metadata (PyPI via `uv publish`). **Enumerate ALL detected signals — do not pick silently.**

(0a-short-circuitable — **only when detected signals match lastrun's `detected_signals.deploy`**; record the chosen path for Phase 14's dry-run summary and Phase 17's lastrun write. If signals differ from lastrun, the prompt below ALWAYS fires — the environment has shifted and the prior default may be wrong.)

Present detected signals + the rubric's recommendation. Example:

```
Detected deploy signals:
  (1) package.json scripts.deploy: "vercel deploy --prod"
  (2) .github/workflows/deploy.yml on push to main (CI auto-deploy)

Recommendation: skip explicit deploy — CI handles it on push.

question: "Which deploy path?"
options:
  - Skip explicit deploy (CI handles it) (Recommended)
  - Run npm run deploy locally
  - Run both (risk of double-deploy)
  - Skip deploy entirely (--skip-deploy effect)
```

When the pyproject signal fires alone, the menu narrows to `Build + publish to PyPI via `uv publish` (Recommended)` / `Skip deploy entirely`, showing the package name + version being shipped.

If `--skip-deploy` flag: still show this menu but pre-pick the skip option in the dry-run summary.

## Phase 6 — Propose repo learnings {#repo-learnings}

Scan `git diff main..HEAD` (or `git diff origin/main..HEAD` post-merge) plus the last N feature-branch commit messages. **Do NOT scan conversation transcript.** See `reference/learnings-scan.md` for the heuristics.

Generate up to 8 candidate learnings, grouped by target file (CLAUDE.md, AGENTS.md, ~/.pmos/learnings.md). Present them per `_shared/findings-dispositions.md` (four dispositions, ≤4 per batch, platform fallback included), with these deltas: batch by target file instead of severity (candidates are uniform proposals — no severity vocabulary); question shape is `"<one-sentence finding> — propose adding to <file>: '<text>'"`; "Defer" means leave for manual edit later. Every candidate is a judgment call (`defer-only: ambiguous` class) — under `--non-interactive` all candidates DEFER; never auto-write learnings.

Apply approved entries inline. Stage the edited files for the Phase 11 commit.

## Phase 7 — README freshness check {#readme-freshness}

Detect skill inventory drift:

- Skill directories on disk: `/bin/ls plugins/${plugin_name}/skills/ | grep -vE "^(_shared|\.shared|\.system)$"`
- Skill rows in README: `/usr/bin/grep -oE "/${plugin_name}:[a-z-]+" README.md | sort -u`

If diff exists, ask:

```
question: "README is out of sync — <new-skills> missing, <removed-skills> still listed. Update?"
options:
  - Update README now (Recommended)
  - Skip — I'll update README in a follow-up
  - Cancel
```

If "Update": read each new skill's `SKILL.md` `description:` and add a categorized row (Pipeline / Enhancers / Artifacts & docs / Tracking & context / Utilities — ask if unclear). Remove rows for deleted skills. Show diff before staging.

## Phase 8 — Run /changelog (unless --skip-changelog) {#changelog}

If `--skip-changelog`: skip with a one-line warning.

Otherwise: invoke `/pmos-toolkit:changelog` inline. /changelog writes to `{docs_path}/changelog.md` (resolved via `.pmos/settings.yaml`).

**Drafting release notes** (for /changelog or the merge-commit body) on a branch with folded-phase commits: filter the per-finding auto-apply noise with `git log --invert-grep --grep='auto-apply' main..HEAD`, and recover finding ordering from auto-apply bodies with `git log --grep='Depends-on:' --pretty=format:'%h %s%n%b%n---' main..HEAD`. Never `git rebase -i` mid-/feature-sdlc-run to "clean up" history first — the orchestrator's resume cursor matches commit timestamps + SHAs; rebase only in a fresh /complete-dev session after the pipeline completes.

(0a-short-circuitable: `changelog_disposition: accept` → stage the drafted entry for the Phase 11 commit. The `edit / rerun / skip` paths ALWAYS fire the prompt — edit needs free-form input; rerun is non-default; skip is destructive.)

After /changelog completes, surface the diff to the user:

```
question: "Changelog drafted. Use this entry?"
options:
  - Looks good (Recommended)
  - Let me edit before commit
  - Re-run /changelog
  - Skip changelog this run
```

## Phase 9 — Version bump {#version-bump}

If skill content changed (Phase 0 detected new/modified files under `plugins/${plugin_name}/skills/` or `plugins/${plugin_name}/agents/`), bump is **mandatory** — pre-push hook enforces.

**Paired-manifest special case**: if BOTH `plugins/${plugin_name}/.claude-plugin/plugin.json` AND `plugins/${plugin_name}/.codex-plugin/plugin.json` exist, treat as ONE logical version that bumps together.

**Step 1 — Pre-flight: sync main reference.**

```bash
git fetch origin main 2>&1   # 10s hard timeout via `timeout 10 git fetch origin main` if available
```

On non-zero exit, log `pre-flight skipped: could not fetch origin/main; pre-push hook will catch any version collision` and set `pre_flight_skipped=true`. Skip to Step 5.

**Step 2 — Read main_v.**

```bash
main_v=$(git show origin/main:plugins/${plugin_name}/.claude-plugin/plugin.json | jq -r .version)
```

On parse failure, treat as Step 1 failure (skip pre-flight, warn).

**Step 3 — Read branch_point_v.**

```bash
merge_base=$(git merge-base HEAD origin/main)
branch_point_v=$(git show "$merge_base":plugins/${plugin_name}/.claude-plugin/plugin.json | jq -r .version || echo "$main_v")
```

If lookup fails, fall back to `branch_point_v=$main_v` (degraded 2-way mode; warn).

**Step 4 — Read local_v + decide.**

```bash
local_v=$(jq -r .version plugins/${plugin_name}/.claude-plugin/plugin.json)
```

Apply the decision table (semantic-version compare on each cell):

| `local_v` vs `branch_point_v` | `main_v` vs `branch_point_v` | Verdict |
|---|---|---|
| equal (no local bump yet) | equal (no parallel ship) | **Clean**: bump baseline = `main_v` |
| equal (no local bump yet) | greater (parallel ship happened) | **Clean-after-rebase**: bump baseline = `main_v` |
| greater (local already bumped) | equal (no parallel ship) | **Fresh local bump**: proceed; baseline already advanced |
| greater (local already bumped) | greater (parallel ship + local bump on stale base) | **Stale-bump**: trigger recovery prompt below |
| less (impossible-ish) | any | **Anomaly**: warn user; ask whether Phase 3 succeeded; offer skip-or-cancel |

**Step 4a — Stale-bump recovery prompt** (only on Stale-bump verdict):

```
question: "Stale version bump detected: feature branch has plugin.json at v<local_v>, branched from v<branch_point_v>, but main shipped v<main_v> since. What now?"
options:
  - Revert the speculative bump and re-bump from main (Recommended)
  - Keep going anyway (will likely fail pre-push hook)
  - Cancel — let me investigate manually
```

If "Revert and re-bump", run the recipe in `reference/version-bump-recovery.md`, then continue at Step 5 with the restored manifests.

**Step 5 — Bump prompt.**

(0a-short-circuitable: `version_bump ∈ {patch, minor, major, skip}` applied against `<baseline_v>`. **Step 4a's stale-bump recovery prompt always fires when triggered** — it's destructive.)

```
question: "Current version is <baseline_v>. What kind of bump?"
options:
  - Patch (X.Y.Z+1) — bug fix, content tweak, doc-only
  - Minor (X.Y+1.0) — new skill, additive feature (Recommended for new skills)
  - Major (X+1.0.0) — breaking change to skill API or removed skill
  - Skip version bump (only if no plugin content changed)
```

Where `<baseline_v>` is `main_v` (when pre-flight ran cleanly) or `local_v` with suffix `(pre-flight skipped — verify manually)` when `pre_flight_skipped=true`.

Apply the bump to **both `plugin.json` manifests** (paired-manifest invariant):

1. `plugins/${plugin_name}/.claude-plugin/plugin.json` — top-level `.version`
2. `plugins/${plugin_name}/.codex-plugin/plugin.json` — top-level `.version`

**Do NOT write a `version` into either `marketplace.json`** — marketplace entries are catalogs; a marketplace `version` is silently shadowed by `plugin.json`. (In this repo: see `CLAUDE.md ## Plugin manifest version sync`.)

Validate both manifests still parse, and confirm the plugin is still registered (presence-only) in both marketplace files:

```bash
python3 -c "import json; json.load(open('plugins/${plugin_name}/.claude-plugin/plugin.json'))"
python3 -c "import json; json.load(open('plugins/${plugin_name}/.codex-plugin/plugin.json'))"
for mp in .claude-plugin/marketplace.json .codex-plugin/marketplace.json; do
  jq -e --arg p "$plugin_name" '.plugins[] | select(.name==$p)' "$mp" >/dev/null \
    || echo "ERROR: $plugin_name not registered in $mp"
done
```

The pre-push hook enforces that BOTH `plugin.json` versions agree **and** that the plugin is registered in both marketplace files — it does **not** check a marketplace `version` (there is none).

**For other monorepo cases**: detect via multiple `package.json` files; only offer bumps for paths that actually changed (`git diff --name-only main..HEAD` mapped to package roots).

## Phase 10 — JSON schema validation {#schema-validation}

For any changed `.json` schema files in `plugins/${plugin_name}/skills/*/schemas/`: validate each parses (`python3 -c "import json; json.load(open('<schema-path>'))"`), and validate any paired YAML example against its schema (`python3 -c "import json, yaml, jsonschema; jsonschema.validate(yaml.safe_load(open('<example>')), json.load(open('<schema>')))"`). Abort and surface errors if anything fails.

## Phase 11 — Stage + commit {#stage-commit}

If uncommitted changes exist (and there will be — version bump, README, changelog, learnings):

1. Run `git diff --staged` and `git diff` to see what's being committed.
2. Run `git log --oneline -3` to match repo commit-message style. See `reference/commit-style.md` for fallback templates.
3. Draft the commit message using the user's `$ARGUMENTS` hint if provided.
<!-- defer-only: ambiguous -->
4. **Surface the draft via AskUserQuestion BEFORE committing:**

```
question: "Draft commit message: '<first line>'. Use it?"
options:
  - Commit with this message (Recommended)
  - Edit the message
  - Cancel
```

5. Stage SPECIFIC files (never `git add -A` — could pick up secrets, .env, .bak). Then commit using HEREDOC:

```bash
git commit -m "$(cat <<'EOF'
<message>

<co-author trailer — the identity your host environment specifies; see reference/commit-style.md>
EOF
)"
```

6. Verify: `git log --oneline -1`.

## Phase 12 — Stale branch cleanup {#stale-branches}

```bash
git branch --merged main | grep -vE "^\*|^\s*main$" || true
git fetch --all --prune
git branch -vv | grep ': gone]' | awk '{print $1}'
```

If branches found, ask via multi-select:

```
question: "Cleanup eligible branches?"
multiSelect: true
options:
  - <merged-branch-1> (last commit: <date>)
  - <gone-branch-1> (remote deleted)
  - ...
  - Skip cleanup
```

Delete only selected branches with `git branch -d` (NEVER `-D`).

## Phase 13 — Tag release (unless --no-tag) {#tag-release}

If `--no-tag`: skip.

**Tag format:** the tag MUST be `${plugin_name}/v<version>` (e.g., `pmos-toolkit/v2.42.0`, `my-other-plugin/v0.3.1`). The repo-root namespace is shared across all plugins, so the per-plugin prefix is what keeps tags unique. This also satisfies the pre-push hook, which rejects unprefixed `v<version>` tags in a multi-plugin repo.

Pre-check tag existence:

```bash
git rev-parse "${plugin_name}/v<version>" 2>/dev/null
```

If tag exists at expected version:

```
question: "Tag ${plugin_name}/v<version> already exists at <existing-sha>. What to do?"
options:
  - Skip tagging (Recommended if version unchanged)
  - Force-replace tag (DESTRUCTIVE — rewrites tag pointer)
  - Cancel
```

Otherwise create annotated tag:

```bash
git tag -a "${plugin_name}/v<version>" -m "Release ${plugin_name} v<version>"
```

## Phase 14 — Dry-run summary {#dry-run-summary}

Print a one-screen summary BEFORE pushing. The summary must surface the detected plugin name, the two bump targets, the templated tag name, and every configured remote in the push-targets line:

```
=== /complete-dev summary ===
Plugin:           ${plugin_name}
Branch:           main
Local commits:    <N> ahead of origin/main
Last commit:      <hash> <message>
Plugin version:   <X.Y.Z> (2 bump targets in-sync: <YES|NO>)
  - plugins/${plugin_name}/.claude-plugin/plugin.json
  - plugins/${plugin_name}/.codex-plugin/plugin.json
  (marketplace.json entries carry no version — presence-only registration check)
Tag:              ${plugin_name}/v<X.Y.Z> (new | force-replaced | skipped)
Deploy method:    <chosen Phase 5 path | skipped>
Pushing to:       <remote-1>, <remote-2>, ... (every entry from `git remote`)
=============================
```

(0a-short-circuitable: `push_target`. The dry-run summary above is ALWAYS printed regardless; push **failure** in Phase 15 still re-prompts — destructive.)

```
question: "Push to <N> remotes?"
options:
  - Push to all configured remotes (Recommended)
  - Push to origin only
  - Cancel
```

## Phase 15 — Deploy + push {#deploy-push}

**Step 1 — Deploy** (skipped if `--skip-deploy` or user picked skip in Phase 5):
Run the chosen deploy command. If it fails, abort BEFORE push and surface the error. Do not retry automatically.

**Step 2 — Push**, sequentially to **every** remote enumerated by `git remote`. Origin first (pre-push hook runs once):

```bash
git push origin main 2>&1
```

If origin fails → STOP. Do not push to other remotes. Surface the error.

**On push failure: NO auto-rollback.** Present recovery options:

```
question: "Push to origin failed: <error summary>. What now?"
options:
  - Fix and retry — I'll address the cause, you re-push
  - Skip this remote, push others
  - Cancel — leave local main as-is
  - DESTRUCTIVE: full rollback to pre-merge SHA <sha> (loses ceremony commits)
```

If "Fix and retry" → proceed to Phase 15a.

If origin succeeds, continue with **every** other remote returned by `git remote`:

```bash
for remote in $(git remote | grep -v '^origin$'); do
  git push "$remote" main 2>&1 || echo "WARNING: push to $remote failed; continuing"
done
```

Each runs sequentially; report each result. Failures on non-origin remotes don't roll back origin and don't abort the loop — the warning is surfaced and the next remote is attempted.

See `reference/rollback-recipes.md` for the destructive rollback procedure.

## Phase 15a — Push retry cleanup {#push-retry}

If user picked "Fix and retry" in Phase 15:

1. Delete local tag (so re-tag at the new HEAD can succeed if the retry includes new commits): `git tag -d "${plugin_name}/v<version>"`
2. Pause and tell the user: "Tag deleted. Address the push failure (auth, hook, conflict), then tell me to resume."
3. On resume, loop back to Phase 13 (re-create tag) → Phase 14 (re-summary) → Phase 15 (re-push).

## Phase 16 — Push tag {#push-tag}

After Phase 15 push success, push the tag to **every** remote that accepted main:

```bash
for remote in $(git remote); do
  git push "$remote" "${plugin_name}/v<version>" 2>&1 || echo "WARNING: tag push to $remote failed; continuing"
done
```

Skip if `--no-tag` was used.

## Phase 16a — Worktree cleanup {#worktree-cleanup}

**Skip Phase 16a entirely** (chat: `Phase 16a skipped: not in a worktree.`) when Phase 2 detected `--no-worktree` mode or a non-worktree session.

**Skip when Phase 15 push failed and the user picked anything except a fully-completed retry** — the worktree must remain available for re-push attempts and `/feature-sdlc --resume` (Anti-pattern #4). The Phase 15a push-retry loop returns control to Phase 13 → 14 → 15 → 16 → 16a; only when 16 push tag succeeds does this phase run.

(0a-short-circuitable: `worktree_disposition` — `remove` → step 1 of the Remove sequence; `keep` → skip the Remove sequence, proceed to Phase 17.)

Otherwise (Phase 0a edit-path or non-interactive Recommended-AUTO-PICK already covered):

```
question: "Worktree at <path> can be removed (push succeeded; release tagged). Remove now?"
options:
  - Remove worktree (Recommended)
  - Keep worktree (I want to inspect it)
  - Cancel
```

On **Remove**:

1. **Compute dirty status excluding `.pmos/feature-sdlc/`.** Query the worktree's tracked + untracked status, **excluding the entire `.pmos/feature-sdlc/` subtree** (state.yaml is gitignored but exists on disk and would otherwise count as untracked). Non-empty result set = dirty. The exact git invocation (porcelain flags, pathspec syntax, or two-step `git ls-files --others --exclude-standard` + `git diff --name-only`) is left to the implementor to pin against the installed git version; the contract is the exclusion + the boolean result.

2. **Dirty branch:**
   - With `--force-cleanup` flag: `git worktree remove --force <path>`; proceed to step 4.
   - Without `--force-cleanup`: surface the raw git error and stop. The user decides whether to commit, stash, or rerun with `--force-cleanup`. No auto-stash.

3. **Clean branch:**
   - Call `ExitWorktree(action=keep)`.
     - Success → cwd is restored to the launch session's root; proceed.
     - No-op (any non-success return — typically "Must not already be in a worktree" / "Must have entered the worktree this session") → print fallback: `Worktree removed. After this session ends, run: cd <root-main-path>` where `<root-main-path>` is the first entry of `git worktree list` (canonical realpath per `_shared/canonical-path.md`); proceed.
   - Run `git worktree remove <path>` (no `--force`).
   - Run `git branch -D feat/<slug>`.

4. **Confirm.** `git worktree list` no longer contains the feature's worktree; `git branch --list "feat/<slug>"` is empty. Print confirmation to chat.

## Phase 17 — Final verification {#final-verification}

Run in parallel:
- `git status -sb` — confirm clean working tree, main in sync
- `git log --oneline -3` — show committed history
- `pwd` — confirm cwd is root main checkout (not a deleted worktree, when Phase 16a ran the Remove path)

**Write lastrun.** Atomically update `.pmos/complete-dev.lastrun.yaml` per `reference/lastrun-schema.md` § "Write contract":

1. Build the `defaults` dict from THIS run's chosen values (the `run_defaults` modified by Phase 0a edits AND any destructive-allowlist re-prompts that overrode them mid-run).
2. Record `detected_signals.deploy` from Phase 5's emission (so the next run's Phase 5 short-circuit can compare).
3. Stamp `last_updated: <ISO-8601 UTC now>`.
4. Write `.pmos/complete-dev.lastrun.yaml.tmp`, then `rename(2)` → `.pmos/complete-dev.lastrun.yaml`.
5. On rename failure, log to chat `lastrun write failed: <error>; next /complete-dev run will use built-in defaults` and continue — the release has already shipped; this is not a release-blocking error.

A **failed** or **cancelled** run skips the lastrun write — we do not memorialize broken choices. (Phase 15 push-failure with no retry, Phase 0a Cancel, Phase 1 Cancel all skip Phase 17 entirely.)

Print success summary:

```
✓ Merged <branch>, bumped ${plugin_name} to vX.Y.Z, deployed via <method | skipped>,
  pushed to <remotes>, tagged ${plugin_name}/vX.Y.Z. Worktree <removed|retained>. Now in <main-path>.
  lastrun defaults saved to .pmos/complete-dev.lastrun.yaml.
```

If anything failed in Phase 15-16, list the failed remote(s) + suggested manual retry: `git push <remote> main && git push <remote> "${plugin_name}/v<version>"`.

## Phase 18: Capture Learnings {#capture-learnings}

**This skill is not complete until the learnings-capture process has run.** Read and follow `_shared/learnings-capture.md` (relative to the skills directory, i.e. `plugins/${plugin_name}/skills/_shared/learnings-capture.md`) now.

Reflect on whether this session surfaced anything worth capturing under `## /complete-dev` — surprising behaviors, repeated corrections, deploy-norm misdetections, push failures with non-obvious causes. Proposing zero learnings is a valid outcome.

---

## Anti-patterns

1. **Auto-deciding the deploy method** without enumerating signals — repo norms can be ambiguous (npm `deploy` script + CI auto-deploy = double-deploy risk). Always show ALL detected signals + recommend; user picks.
2. **`git add -A` blindly** — could include `.env`, `.bak`, secrets. Stage specific paths only.
3. **Auto-resolving merge conflicts** in Phase 3. Always halt and ask.
4. **Removing the worktree before push succeeds** — since v2.41.0, worktree cleanup lives at **Phase 16a** (after Phase 16 push tag), not Phase 4. The `/feature-sdlc` resume contract depends on `<worktree>/.pmos/feature-sdlc/state.yaml`; removing the worktree before push completes means a Phase 15 push failure leaves no resumable state AND no worktree to inspect. Phase 4 is now a deferral stub; do not move the cleanup body back. If you need pre-push cleanup for a non-resumable standalone /complete-dev run, that's still wrong — the worktree's branch is the source of truth for the merged content; keep it through the push.
5. **Pushing to all remotes in parallel** — sequence with origin first; abort chain on origin failure (pre-push hook runs once, not N times).
6. **Tagging before push** — tag is local until pushed; if push fails the tag is still local. Phase 13 → Phase 15 → Phase 16 ordering is load-bearing.
7. **Auto-rolling-back the merge on push failure** — destructive; user almost always wants to fix-and-retry. Rollback is the explicit escape hatch, never the default.
8. **Forgetting to delete the local tag on push retry (Phase 15a)** — re-tag at a new HEAD will fail if the old tag still points at the old HEAD.
9. **Skipping version bump because "nothing changed"** when skill files actually changed — Phase 0 must accurately detect changes; pre-push hook will reject otherwise.
10. **Capturing learnings the user didn't actually want** — Phase 6 proposes, never auto-writes. Each entry needs explicit approval.
11. **Forgetting to bump BOTH `.claude-plugin` and `.codex-plugin` versions to match** — pre-push hook rejects mismatch. Treat paired manifests as one logical version.
12. **Treating `--skip-deploy` as `--skip-everything-deploy-related`** — push, tag, dry-run summary all still happen. Only the deploy-method invocation is skipped.
13. **Scanning the conversation transcript for learnings** — too noisy. Phase 6 is scoped to `git diff main..HEAD` + commit messages only.
14. **Trusting the shared-branch guard's `local==remote SHA` test as proof no one has based work on this branch.** It's necessary-but-not-sufficient — a coworker who pulled before our last fixup could have based work, and we'd never know. The pre-push hook is the only authoritative line of defence; use the merge fallback for any branch you've shared for review.

---

*Spec lineage: multi-plugin release scoping, diff routing, tag convention, stale-bump pre-flight, and dry-run + multi-remote push contracts (FR-50–FR-60, E15, NFR-01, T4–T5) per `docs/pmos/features/2026-05-20_multi-plugin-marketplace/`; worktree-cleanup contract (FR-CD01–CD06) per `docs/pmos/features/2026-05-10_feature-sdlc-worktree-resume/`; lastrun run-defaults memory (FR-LR01–LR04) per `docs/pmos/features/2026-05-13_complete-dev-run-defaults/DESIGN.md`.*
