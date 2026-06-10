# people — review

**Grade:** B (minor-to-moderate trims; the design is sound, the duplication is mechanical to remove)
**Size:** SKILL.md 350 lines (321 excluding non-interactive block); references 2 files / 125 lines (`schema.md` 79, `lookup.md` 46) + shared `tracker-crudl.md` 65 and `interactive-prompts.md` 75; target ~180 lines.

## TL;DR

- **Biggest win available:** the skill says "Algorithm and tier definitions: see `lookup.md`" (Phase 2) and "Apply the handle derivation rules from `lookup.md`" (Phase 3 Step 1) — then restates both algorithms in full anyway. Deleting the restatements saves ~50 lines and removes two drift seeds; the same applies to the INDEX template inlined in Phase 8.
- **Biggest risk in current design:** `lookup.md`'s "Caller behavior" section promises that `/people set <text>` / `refine <text>` resolve fuzzy input and "refuse with the ranked list" on multi-match — but SKILL.md Phases 6–7 require an exact handle file to exist and just error. The two documents describe different skills; an incremental edit drifted one without the other.
- **Done well, keep:** the cross-skill surface is genuinely well-designed. `find` is read-only with caller-decides-multi-match semantics; the reactive-create entry point (Phase 3, "called by /mytasks, not user-invoked") is explicit about what it skips, what it seeds (`aliases: [<original-token>]`), and what it returns; handle immutability is stated with its reason (cross-references from `people:` lists). This is the entity-store pattern future people-aware skills should copy.

## Sizing note

At 321 net lines for 8 small CRUD subcommands, this is in better shape than its sibling — every phase is short and most prose is doing work. The path to ~180 is almost entirely deduplication against its own references, not rethinking. The one structural tension (command grammar vs natural language) is milder here than in `/mytasks` because there is no capture fall-through: unknown verbs error loudly (Phase 0), so `"who is sarah"` typed as an argument fails safe instead of corrupting the store. But it still fails — see finding 3.

## Findings

1. **[S][V] Cites `lookup.md`, then restates it.** Phase 2 Step 2 reproduces all 5 match tiers (exact handle → alias → name → substring → initials, with the tier-stop and `updated:`-desc tiebreak); `lookup.md` lines 7–13 are the same content. Phase 3 Step 1 reproduces the 3-rule handle derivation; `lookup.md` "Handle derivation" is the same content, plus the collision definition which SKILL.md *also* repeats ("A 'collision' means a file with that handle already exists..." appears verbatim in both files). Pick one home — `lookup.md` is the right one since `/mytasks` also reads it — and have SKILL.md say only "apply the algorithm in `lookup.md`; stop at the first matching tier."
2. **[R] `lookup.md` and SKILL.md disagree on set/refine resolution.** `lookup.md` Caller behavior: "**`/people set <text>` / `/people refine <text>`:** if N matches, refuse with the ranked list; the user must pick a handle." SKILL.md Phase 6/7 Step 1: "`~/.pmos/people/{handle}.md` must exist. If not: `No record with handle '{handle}'. Run /people find {handle} for suggestions.`" — no fuzzy resolution at all, and no ranked list. Recommend implementing the `lookup.md` behavior (resolve via find; proceed on unique match; refuse-with-ranked-list on multi-match): it's strictly better UX, `lookup.md` already documents why ("otherwise edits go to the wrong record"), and Phase 4 `show` already does exactly this resolve-then-disambiguate dance — so the fix is "Step 1: resolve as in Phase 4, but refuse instead of proceeding on multi-match."
3. **[P] Unknown-verb handling fights the skill's own NL triggers.** The description promises "who is X" as a trigger, but Phase 0 errors on any unrecognized verb. `/people who is sarah` → `Unknown subcommand 'who'`. One routing line fixes it: *free text that isn't a recognized verb is treated as `find <text>`* — find is read-only, so the fall-through is safe (unlike `/mytasks`, where the fall-through mutates). This turns the error path into the most natural query path.
4. **[V] Phase 8 inlines the INDEX.md template that `schema.md` already defines.** SKILL.md even says "with the format defined in `schema.md` (### INDEX.md format section)" — then shows the full template anyway, including the "empty cells (no null, no dashes)" rule that `tracker-crudl.md` §5 owns. Cite, don't restate (~14 lines).
5. **[P] Per-tier match-note strings over-specify the `find` contract.** Phase 2 Step 3 pins decoration per tier ("empty for tier 1, ` — matched alias '{alias}'` for tier 2, omitted for tier 3..."). Step 4 correctly declares the output "contract — do not change without updating callers", but the only part `/mytasks` actually parses is the `{handle} ({name})` shape and the match count. Fix: pin exactly that ("each match renders as `{handle} ({name})`, one per line, count first — this shape is the contract"), and leave the why-it-matched annotation advisory. Shrinks the contract surface to what callers consume.
6. **[S] Positive: substrate binding is the model for the repo.** `schema.md` opens by declaring its *bindings* and delegating *invariants* to `_shared/tracker-crudl.md`, including its two documented deviations (handle-keyed, no archive). The interactive flows delegate fully to `_shared/interactive-prompts.md` with no protocol restatement — only field order and prompt copy, which are legitimately per-skill. The references got this right; only SKILL.md's body forgot to lean on them (findings 1, 4).
7. **[X] Cross-platform posture is fine.** Same shape as `/mytasks`: the only interactive surfaces are `add`/`refine` via `_shared/interactive-prompts.md` (which has the numbered-text fallback), and the Platform Adaptation note matches the skill's actual behavior. The "No subagents" line is vestigial — the skill never dispatches one — but harmless.

## Flags inventory

| Flag | Purpose | Verdict |
|---|---|---|
| `--non-interactive` / `--interactive` | repo-wide mode contract | keep (global contract, assessed once) |
| `list --workstream <slug>` | filter by workstream membership | keep — add one line that NL maps onto it ("people on platform-q3") |
| `list --relationship <enum>` | filter by working relationship | keep — same NL-mapping line ("list my direct reports") |

Only two domain flags, both well-named and validated. The richer query surface is natural language over `find` — finding 3 makes that real.

## Gates & rubrics inventory

| Check | Hard or soft | Failure it catches | Verdict |
|---|---|---|---|
| `working_relationship` enum validation | hard | corrupt store, unfilterable values (tracker-crudl §4) | keep-hard |
| Handle immutability (skill-managed `handle`/`created`/`updated`) | hard | dangling `people:` references in /mytasks items | keep-hard |
| Disambiguate-before-write on set/refine | hard | edits landing on the wrong person | keep-hard — and actually implement it per finding 2 |
| `find` output format as caller contract | hard | /mytasks misparsing resolution results | keep-hard, but narrow to the `{handle} ({name})` shape (finding 5) |
| INDEX freshness check + regen-on-write | hard | stale directory view after manual edits | keep-hard (shared §5) |
| Fail-soft on INDEX regen (never roll back record) | soft | losing a created person to a cache error | keep |
| Malformed-frontmatter skip + warn | soft | one bad file aborting reads | keep |
| Handle derivation collision ladder | hard | duplicate keys | keep-hard (lives in `lookup.md`, correctly) |

No self-eval loops, no rubrics, no subagents — right-sized for an entity store.

## Fix list

| Fix | Type | Impact | Risk |
|---|---|---|---|
| Delete restated tier algorithm + handle derivation from SKILL.md; cite `lookup.md` (finding 1) | quick-win | high | low |
| Align set/refine with `lookup.md` caller behavior (fuzzy resolve, refuse-with-ranked-list) (finding 2) | structural | high | low-med — behavior change, but the documented-intended one; update `tests/scenarios.md` set/refine rows |
| Route unrecognized free text to `find` (finding 3) | quick-win | med | low — find is read-only |
| Cite `schema.md` for INDEX format in Phase 8 (finding 4) | quick-win | low | none |
| Narrow the `find` contract to the parsed shape; make tier annotations advisory (finding 5) | quick-win | med | low — confirm /mytasks parse expectations in same change |
