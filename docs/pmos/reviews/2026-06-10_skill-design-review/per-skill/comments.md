# comments — review

**Grade:** B
**Size:** SKILL.md 169 lines (~140 excluding non-interactive block); references 1 file / 172 lines (`_shared/apply-edit-at-anchor.md`) + spec-HTML deep links; 5 scripts / 1,852 LOC + 11 test files; target ~115 lines (excluding NI block).

## TL;DR

- **Biggest win available:** reconcile the three-way mode contradiction. The Modes table says `--batch`/`--auto`/`--non-interactive` are "TODO — stub; CLI exits 64", but `resolver.js` fully implements all four modes (T13/T14/T15 logs are `status: done`); only `cli.js` still gates them out, and the file's own "Non-interactive mode" section simultaneously claims the contract is honoured. Wiring the CLI + fixing the table converts ~600 LOC of tested-but-unreachable code into shipped behavior.
- **Biggest risk in current design:** the runtime seam is ambiguous. SKILL.md tells the model to "load threads via the controller" and "persist via its own serializer," but `resolver.js` exports only the full `resolve()` loop (whose default dispatcher reaches **only the /spec shim**) plus underscore-private `_internal` helpers. Neither the CLI path nor the model-orchestration path is complete end-to-end for non-spec artifacts.
- **Done well, worth keeping:** the "Authoritative refs (do not restate; link)" posture, the explicit ownership boundaries (resolver = dispatch + UX + staging; anchor math = originating skill), and the 4-item Anti-patterns section. This is the closest body in the repo to the Pocock style — short, principle-stating, with machinery pushed into scripts and a shared contract doc. The defects here are *drift*, not design.

## Findings

1. **[R][G] Modes table contradicts the implementation and the file's own non-interactive section.** "Modes" (lines 137–142) marks batch/auto/non-interactive as `TODO(T13)/(T14) — stub; CLI exits 64`. But `scripts/resolver.js` implements all four (batch wave-loop ~175 LOC, `_resolveAuto`, `_resolveNonInteractive`), shipped per `docs/pmos/features/2026-05-23_inline-doc-comments/execute/task-13.md`, `task-14.md`, `task-15.md` (all `status: done`). Only `scripts/cli.js:66–71` still exits 64 with "not implemented in T10. See T13/T14." Meanwhile line 48 says "This skill honours `--non-interactive` per the canonical contract" — a direct contradiction with the table row that says `--non-interactive` exits 64. CLAUDE.md also advertises "4 modes" as live. **Fix:** delete the cli.js stub guard (the resolver's mode allowlist already validates), update the table's Status column to "Implemented", and add one sentence distinguishing the harness-level `--non-interactive` contract (defer prompts, OQ buffer) from the resolver's CLI mode of the same name — today a reader cannot tell which one the flag triggers.

2. **[S][P] The controller/model division of labor is asserted but not wired.** Phase 1: "Load the artifact's comment threads via the controller (`scripts/resolver.js`)"; Phase 4: "persists the updated threads via its own serializer." But the module's public surface is `resolve({path, mode, askUser, dispatchSubagent, runGit})` — the whole loop — and the parse/persist helpers (`_parseInlineComments`, `_persistInline`, `_injectCommentsBlock`) live under `_internal`. An in-session model cannot inject a real `dispatchSubagent` into a node process (Task-tool dispatch happens in the harness), and `_defaultDispatchSubagent` throws `not_implemented` for every slug except `spec` ("see T18–T21" — but T18–T21 shipped: 14 per-skill shims exist). So: CLI-driven resolution works end-to-end only for spec artifacts; model-driven resolution must either re-implement the loop or poke private helpers. **Fix (structural):** export `loadThreads(path)` / `persistThreads(path, threads)` as public API and state in SKILL.md which party drives ("the model orchestrates dispatch; the controller owns parse/serialize/stage"), or extend the default dispatcher to route all 14 shims so the CLI lane is complete.

3. **[P] Task-number pointers have already rotted — replace with behavior statements.** Phase 3: "Modify — inline edit-then-resubmit (T13). Until wired…" — T13 was the *batch/wave* task; the resolver's own comment says Modify UX was owed by T14, and T14 shipped without it (code still records `operator_modify_deferred`). The Modes table's `TODO(T13)`/`TODO(T14)` pointers are likewise stale (both tasks are done). North-star durability rule #4: no task numbers in living docs. **Fix:** "Modify is not yet implemented; the thread stays open" — no T-numbers. Same for the Modes table.

4. **[R] Phase 3's prompt description doesn't match the implemented prompt.** SKILL.md describes "a 4-option AskUserQuestion" (Accept/Reject/Modify/Skip), but `resolver.js:_buildPromptOptions` presents **five** options — including "Reject with refinement", the very mechanism the MAX_REDISPATCH=2 cap (mentioned twice elsewhere in the file) governs — collapsing to `{Modify, Skip}` at the cap. **Fix:** list the real five options once in Phase 3 and delete the cap restatements in Phase 2 and Edge cases (state each cap once).

5. **[R][S] The anchor-ownership principle contradicts the skill's own scripts.** Phase 2: "Anchor strategy is owned by the originating skill, not by the resolver… keeps anchor math out of the controller." Yet the skill ships the 365-line canonical `scripts/anchor-resolver.js`, which `resolver.js` uses to pre-validate every thread (orphan short-circuit before burning a dispatch — a defensible optimization, per the comment at resolver.js:24–27) *and* to compute `dom_range` for the §9.3 idempotency check and the batch wave-planner. Meanwhile each of the ~14 per-skill shims carries its own "minimal in-shim anchor resolver" (≈2,700 LOC of shims total). Anchor math thus lives in **both** places, simplified 14× on one side. **Fix:** soften the SKILL.md claim to match reality ("the resolver pre-validates anchors to avoid wasted dispatches; authoritative resolution happens in the originating skill"), and consider promoting `anchor-resolver.js` to `_shared/` so shims import one implementation instead of cloning a naive one — flagging the coupling: all 14 shims + their contract tests would be touched.

6. **[V] Stale persistence language one hop away.** The SKILL.md itself is clean ("persistence format… owned by the controller" — good), but its normative reference `_shared/apply-edit-at-anchor.md` still describes walking "the artifact's `.comments.json` sidecar" (Purpose section), retired in v2.58.0 — `resolver.js` reads the inline `pmos-comments` block. A subagent loading the contract doc receives the wrong persistence model. Not this skill's file, but this skill's blast radius. **Fix:** one-line amendment to the contract doc.

7. **[V][Ph] Learnings boilerplate duplicates a shared pattern.** Phase 0's `~/.pmos/learnings.md` read and Phase 5's capture-and-report ritual (~12 lines) restate what `_shared/learnings-capture.md` defines and what ~26 SKILL.md files repeat. Also the 3-line "Track Progress" section is ballast for a 5-phase linear flow. **Fix:** one line each ("Read/capture learnings per `_shared/learnings-capture.md`"); delete Track Progress.

8. **[P] The verbatim summary-line mandate is already inaccurate.** Phase 4: "The summary line MUST read verbatim: `Resolved N/M. Review with git diff --cached then commit.`" — but `resolver.js` itself prints the line (the right place for a pinned string) and prints *variants* for batch ("(batch, N wave(s))") and other modes. The script owns the string; the SKILL.md mandate duplicates it and is already wrong for 3 of 4 modes. **Fix:** "Relay the controller's summary line verbatim."

9. **[F] The four mode flags are 80% earning their keep — once wired.** `--confirm-each` (default) is the skill. `--non-interactive` is required by the repo-wide CI contract. `--auto` vs `--non-interactive` is a real, tested distinction (clarifications still prompt vs defer). `--batch` is the marginal one: ~175 LOC in resolver + the 235-line wave-planner + parallel-dispatch machinery, for the case of *many* threads on one artifact — built by porting /execute's planner (task-13.md), so the cost is sunk and tested, but it's the first thing to cut if maintenance bites. Natural-language mapping ("apply everything without asking") should be accepted at the skill layer and translated to CLI modes — the argument-hint already documents the flags, which is the right discoverability surface.

10. **[X] Platform adaptation is honest and mostly accurate** — Node declared as the only external dependency, no-subagents → refuse-with-message (correct: the dispatch IS the skill), AskUserQuestion degradation routed to `_shared/interactive-prompts.md`. Only blemish is the non-interactive ambiguity from finding 1.

## Flags inventory

| Flag | Purpose | Verdict |
|---|---|---|
| `--confirm-each` | default per-thread Accept/Reject/… prompting | keep (default; flag exists for explicitness) |
| `--batch` | wave-planned group prompting, parallel dispatch | keep **once wired in cli.js**; first candidate to cut if maintenance bites — sunk, tested cost today |
| `--auto` | apply successes without prompting; clarifications still prompt | keep + wire; accept natural-language equivalent ("apply them all") at the skill layer |
| `--non-interactive` | headless CI; defers clarifications into `deferred[]` | keep + wire; **disambiguate from the harness-level `--non-interactive` contract in one sentence** |
| `--interactive` | harness-level mode override (from NI block) | keep (repo-wide contract, not this skill's) |

## Gates & rubrics inventory

| Check | Hard or soft | Failure it catches | Verdict |
|---|---|---|---|
| Never `git commit` (Phase 4 + Anti-patterns; enforced — `_persistInline` only ever `git add`s) | hard | resolver silently committing unreviewed LLM edits | keep-hard |
| Closed `error_enum` (4 values, NFR-08; pinned in resolver + 14 shims + tests) | hard | enum sprawl across a 14-skill fanout | keep-hard |
| Schema-version refuse-load (`CURRENT_SCHEMA_VERSION`, exit 64; T16) | hard | older toolkit corrupting a newer inline block | keep-hard |
| Missing `pmos:skill` meta → refuse | hard | unroutable dispatch; guessing the originating skill | keep-hard |
| `MAX_CLARIFY=1` (FR-29) | hard | infinite clarify ping-pong burning dispatches | keep-hard; state once in SKILL.md, not three times |
| `MAX_REDISPATCH=2` collapse to `{Modify, Skip}` (S10/E10) | hard | operator refine-loop never converging | keep-hard; same dedup |
| §9.3 idempotency semantic-match (≥80% keyword threshold, 60–80 soft band) | hard (script) | re-runs double-applying edits after partial commits | keep-hard; lives in scripts + contract doc, correctly absent from SKILL.md |
| Anchor pre-validation orphan short-circuit (`anchor-resolver.js`) | hard | burning a subagent dispatch on an unresolvable anchor | keep-hard; fix the SKILL.md prose that disclaims its existence (finding 5) |
| Wave-planner overlap relation (FR-25) + RTL apply | hard | same-wave edits invalidating each other's offsets | keep-hard while `--batch` exists |
| Verbatim summary-line mandate (SKILL.md prose) | soft | none the script doesn't already guarantee | delete from prose; script owns the string |
| cli.js exit-64 mode stub | hard | nothing anymore — resolver validates modes itself | **delete** (it now blocks shipped behavior) |

## Fix list

| Fix | Type | Impact | Risk |
|---|---|---|---|
| Wire cli.js to all 4 modes (drop the exit-64 stub); update Modes table Status column | structural | high | low — resolver paths are tested (`resolver-modes.test.js`, `wave-planner.test.js`); only spec-lane default-dispatch limitation remains and is a separate fix |
| Add one sentence disambiguating harness `--non-interactive` vs resolver mode `--non-interactive` | quick-win | high | none |
| Export `loadThreads`/`persistThreads` (or extend default dispatcher to all 14 shims); state in SKILL.md who drives at runtime | structural | high | medium — touches the contract surface; tests pin `_internal` |
| Replace T13/T14 pointers with behavior statements ("Modify not yet implemented") | quick-win | med | none |
| Phase 3: document the real 5-option prompt; state each cap once (delete restatements in Phase 2 / Configuration / Edge cases) | quick-win | med | none |
| Soften anchor-ownership claim to match the pre-validation reality | quick-win | med | none |
| Amend `_shared/apply-edit-at-anchor.md` sidecar language to inline-block (v2.58.0) | quick-win | med | low — doc-only, but it is the normative contract |
| Collapse Phase 0/5 learnings prose to one line citing `_shared/learnings-capture.md`; drop Track Progress | quick-win | low | none |
| Drop the verbatim summary mandate ("relay the controller's summary") | quick-win | low | none |
| Consider promoting `anchor-resolver.js` to `_shared/` and de-duplicating 14 in-shim resolvers | structural | med | high — touches 14 skills + contract tests; do only with the fanout sync machinery |
