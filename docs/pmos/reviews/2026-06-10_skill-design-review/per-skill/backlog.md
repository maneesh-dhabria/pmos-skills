# backlog — review

**Grade:** B-
**Size:** SKILL.md 465 lines (436 excluding non-interactive block); references 13 files / ~482 lines (schema.md 103, pipeline-bridge.md 80, inference-heuristics.md 21, tests/scenarios.md 139, + 9 test fixtures ~139); target ~200 lines for SKILL.md.

## TL;DR

- **Biggest win available:** collapse the read/maintenance verbs (list, show, refine, link, archive) into a Pocock-triage-style "interpret the request" section and delete the mechanics that restate `_shared/tracker-crudl.md` — SKILL.md drops from 436 to ~200 lines with zero behavior loss.
- **Biggest risk in current design:** a live type-enum drift bug — `schema.md` was extended to 8 types in commit `f968171` (2026-05-08, "feat(T21): extend /backlog type enum") but SKILL.md's Phase 3 flag table, Phase 6 validation table, and the frontmatter description still say 4. The skill's own validation instructions now contradict the schema it claims to enforce; `/backlog set <id> type=chore` is simultaneously legal (schema.md) and rejected (SKILL.md Phase 6).
- **Done well, keep:** the capture contract. "Wrong inference is acceptable; capture friction is not" is exactly the Pocock register — a WHY that justifies its one hard rule (single round-trip, never ask). The tracker-crudl binding pattern (shared invariants, per-skill bindings in schema.md, shared with /mytasks and /people) is the best substrate use in the plugin.

## Findings

1. **[R] Type enum drifted in 3 places — real contradiction, not style.** schema.md line 40 allows `feature | enhancement | bug | tech-debt | chore | docs | idea | spike`; inference-heuristics.md infers all 8; `/spec` SKILL.md line 119 maps all 8. But backlog SKILL.md says 4 in three spots: frontmatter description ("features, bugs, tech-debt, and ideas"), Phase 3 flag table (`--type <feature|bug|tech-debt|idea>`), Phase 6 Step 2 ("Must be in `feature, bug, tech-debt, idea`"). Quick-capture can write `type: spike`, then `list --type spike` and `set <id> type=spike` are "unknown" per SKILL.md. tracker-crudl.md §preamble says schema.md wins for its own fields, so a careful model *might* recover — but this is exactly the incremental-edit incoherence the review is hunting. **Fix:** delete both enum value lists from SKILL.md and point at schema.md ("validate against the enums in `schema.md`; reject with the allowed list"); fix the description. The enums then live in exactly one file.
2. **[Ph] "Phases" are verb handlers, not phases — the structure misdescribes itself.** Phases 0–11 never run in sequence; Phase 0 is a dispatch table and 1–10 are subcommand bodies, with GOTO-style cross-references ("Apply Phase 10", "Locate via Phase 4's lookup", "Delegate to Phase 6"). Compare triage: headed sections named for what they do ("Show what needs attention", "Quick state override"). Renaming `## Phase 6: Set Field` → `## set` and "Apply Phase 10" → "regenerate INDEX (see *rebuild-index*)" costs nothing and removes the implication of a pipeline that doesn't exist. No fractional phases — credit where due.
3. **[V|S] Mechanics restate the shared contract the skill already binds.** Phase 2 Step 2 (id allocation: max+1, 4-digit zero-pad, never reuse) and Step 4 (slug: lowercase, hyphen runs, 60-char trim) are verbatim restatements of tracker-crudl.md §2, which schema.md already binds. Phase 1 Step 2's freshness check restates tracker-crudl §5 — and *diverges* (git commit date vs the contract's mtime; a `git mv` or rebase makes them disagree). Phase 10 Steps 1–3 restate §5's regenerable-cache rules. ~50 lines of duplication across the three trackers that tracker-crudl was extracted to kill (commit `320b6a1`). **Fix:** replace with one line each: "allocate id + slug per `tracker-crudl.md` §2", "freshness per §5 (mtime)".
4. **[V|P] The capture frontmatter template duplicates schema.md and has already drifted.** Phase 2 Step 5 inlines a 17-line YAML template; schema.md "Defaults on create" specifies the same — except SKILL.md's template **omits `schema_version: 1`**, which schema.md and tracker-crudl §3 require on create. Second concrete drift bug from the same root cause (two copies of one truth). **Fix:** delete the template; "write frontmatter per schema.md defaults-on-create" is sufficient and self-healing.
5. **[F|P] The read-path command surface is CLI cosplay where natural language would do.** Special-attention verdict: backlog's surface should be a *hybrid*, and it's currently weighted wrong. Three verbs earn deterministic shapes: `add` (the capture contract — bare-text fallthrough already makes it natural-language-first, good), `set` (a **machine API**: /requirements:674, /plan:539, /execute:37, /verify invoke `/backlog set <id> field=value` per pipeline-bridge.md — must stay exact), and `promote` (pipeline handoff with feature-folder side effects). But `list` with 7 flags, `show`, `link` (a regex-inference table for what `set` already does), and `archive` are read/maintenance paths where triage's pattern — "the maintainer describes what they want; interpret and act" — is strictly better UX ("show must-priority bugs", "what's blocked on 0042", "archive old done items") and ~80 lines shorter. The enum validation moves to schema.md (finding 1); the sort order is already specified once in schema.md's INDEX section. Keep `rebuild-index` as a named repair verb.
6. **[P] Exact output strings are over-specified beyond what the tests need.** Every verb mandates byte-exact one-line outputs (`Captured #{id} ({type}, should): "{title}"`, `Updated #{id}: {field} = {value}.`, the archive report grammar). Steelman: tests/scenarios.md asserts these strings, and the capture confirmation in particular is a real contract (it's how the user learns the inferred type). Keep the capture line and error-message shapes (enum rejection, missing-id with prefix matches — genuinely good UX); soften the rest to "confirm in one line: id, what changed".
7. **[R] scenarios.md encodes promote-routing logic absent from SKILL.md.** Scenario line 102 says routing considers type ("status `inbox` and `idea`/`tech-debt`/`feature` -> `/requirements`"), but SKILL.md Phase 7's table is status-only. The tests assert behavior the skill doesn't specify. Align scenarios.md to the status-only table (which is the simpler, correct design).
8. **[S] pipeline-bridge.md is the right shape — protect it.** It's a genuine cross-skill contract (consent gate, lifecycle table, auto-prompt, auto-capture) cited by 5 pipeline skills rather than restated. The "Implementation pattern" subroutine at the bottom is the one soft spot: it's a copy-paste template that has already half-drifted (e.g., /plan:539 says "the bridge contract owns the write-back" while requirements:674 inlines the set call). Don't fix in backlog's review scope, but flag for the cross-cutting report: bridge call-sites should cite, not paste.
9. **[X] Cross-platform posture is sound.** Platform Adaptation section is honest (no-prompt-tool → assume-and-document; no-subagents → sequential), Phase 5 routes through `_shared/interactive-prompts.md` which carries the Codex/Copilot fallback, and nothing else depends on Claude-Code-only tools. No action.
10. **[V] The ASCII pipeline diagram (lines 12–21) earns its keep; the References block doesn't fully.** The diagram is the one place the capture-buffer→tracker→pipeline mental model is visible at a glance — keep. The References list annotates each file with a summary that the files' own first lines already provide; trim to bare links (triage does this in 3 lines).

## Flags inventory

| Flag | Purpose | Verdict |
|---|---|---|
| `--non-interactive` / `--interactive` | repo-wide mode contract | keep (global machinery, assessed globally) |
| `list --type/--status/--priority/--label` | enum/label filters | fold into natural language ("list must-priority bugs"); enums validated against schema.md |
| `list --repo <name>` | restrict workstream listing to one repo | fold into natural language |
| `list --workstream` | aggregate across linked repos | fold into natural language ("across the workstream"); keep the Phase 11 aggregator it triggers |
| `list --include-archive` | include archived items | fold into natural language |
| `promote --feature <slug>` | feature-folder override, passed to `pipeline-setup.md` §B | keep — pipeline coupling, same flag as every pipeline skill |
| `archive --quarter Q` | force destination quarter | fold into natural language ("archive into 2026-Q1"); rare op |
| (subcommand) `set <id> <field>=<value>` | machine API invoked by /requirements, /spec, /plan, /execute, /verify | keep exactly — do NOT naturalize; 5 skills depend on the literal form |
| (subcommand) `add` / bare text | capture | keep — bare-text fallthrough is already the natural-language path |

## Gates & rubrics inventory

| Check | Hard or soft | Failure it catches | Verdict |
|---|---|---|---|
| Phase 2: single round-trip, zero clarifying questions | hard | capture friction killing the buffer's whole value prop | keep-hard — this IS the skill; the why is stated inline |
| Enum validation on set/list (closed sets, exact rejection message) | hard | invented statuses breaking INDEX grouping + promote routing + bridge write-backs | keep-hard, but source enums from schema.md only (finding 1) |
| Score bounds 1–1000 | hard | nonsense ICE scores corrupting sort | keep (origin: 2026-04-25_backlog-skill/02_spec.md:83) |
| Archive eligibility: done/wontfix AND >30 days | hard | archiving fresh items the user still references | keep (origin: 02_spec.md:146); 30d is arbitrary but harmless |
| Promote status-refusal table | hard | double-seeding a feature folder / re-running a finished item | keep-hard — guards real side effects |
| Promote Step 4: never overwrite existing `01_requirements.md` | hard | clobbering authored requirements | keep-hard |
| INDEX freshness check before render | hard | stale cache shown as truth | keep, but align mechanism to tracker-crudl §5 (mtime) |
| Phase 6: `id`/`created`/`updated` write-protected | hard | users corrupting skill-managed fields | keep-hard |
| Top-5 auto-prompt / auto-capture (pipeline-bridge.md) | soft (one-shot, skippable) | backlog rotting unseen; deferred work evaporating | keep (origin: 02_spec.md:167) |
| Exact one-line output strings per verb | hard | (capture line: user can't correct a wrong inference they never saw) | soften to advisory except capture confirmation + error shapes (finding 6) |

## Fix list

| Fix | Type | Impact | Risk |
|---|---|---|---|
| Fix type-enum drift: delete enum lists from SKILL.md Phase 3 + Phase 6, cite schema.md; update frontmatter description to the 8-type reality | quick-win | high | none — schema.md is already authoritative per tracker-crudl preamble |
| Add `schema_version: 1` to capture (or better: delete the inline template, cite schema.md defaults-on-create) | quick-win | high | none — schema.md already mandates it |
| Replace id/slug/freshness/INDEX mechanics with one-line citations to tracker-crudl §2/§5; standardize freshness on mtime | quick-win | med | low — tiny chance a model under-implements; the contract text is one hop away |
| Rename "Phase N" headers to verb names; replace "Apply Phase 10" GOTOs with named references | quick-win | med | none |
| Collapse list/show/link/archive into an "Interpret the request" section (triage pattern), keeping add/set/promote/rebuild-index as deterministic verbs | structural | high | med — tests/scenarios.md asserts flag-form invocations and exact outputs; update scenarios in the same change; `set` call-sites in 5 skills untouched |
| Align scenarios.md promote routing to SKILL.md's status-only table | quick-win | low | none |
| Soften exact-output mandates to "one line: id + what changed", keeping capture confirmation + error shapes verbatim | quick-win | low | low — loosens test assertions |
| Trim References annotations + Announce line; keep the pipeline diagram | quick-win | low | none |
