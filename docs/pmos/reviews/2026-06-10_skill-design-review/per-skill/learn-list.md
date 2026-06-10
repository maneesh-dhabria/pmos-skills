# learn-list — review

**Grade:** B (close to the north star — states its one governing rule up front, delegates the front half to the substrate cleanly, owns only its reactions; held back by a retired-vocabulary template and a handful of trims)
**Size:** SKILL.md 212 lines (no inline non-interactive block — it delegates to `_shared/non-interactive.md`); references 1 file / 95 lines (artifact-template.html); target ~170 lines.

## TL;DR

- **Biggest win available:** fix `reference/artifact-template.html` — it still renders the **retired** `--mode`/`--level` vocabulary (`Mode: {{mode}} · Level: {{level}}`, paste-block `({{mode}})`, "omitted in quick mode") that Phase 1 step 2 of this very skill rejects with exit 64. Every artifact shipped today carries pre-0.9.0 vocabulary.
- **Biggest risk in current design:** none structural — the design is sound. The residual risk is template/SKILL drift of exactly the kind above: the template is the only reference and it wasn't swept when the flags were unified.
- **Done well, keep:** the opening — "The one rule everything else serves: **this is a verification-first web pipeline, not a generate-from-memory one**" — is the Pocock move ("this is the skill"); every anti-pattern then traces back to it with a stated failure mode ("the first 404 a user hits tells them the whole list is unreliable"). The substrate consumption is exemplary: inline the shared doc, then a clearly-labeled "this skill's reaction" block.

## Findings

1. **[R] artifact-template.html uses retired flag vocabulary.** Line 27 `Mode: {{mode}} · Level: {{level}}`, line 56 "omitted in quick mode" (`quick` was an old `--mode` value), line 80 `({{mode}})` in the paste-block. The 0.9.0 unification retired `--mode`/`--level` for `--depth`/`--audience` — with no silent alias, enforced by the Phase-1 exit-64 rejection — yet the template instructs the model to emit the old names into every artifact. **Fix:** `{{depth}}` / `{{audience}}`, "omitted at brief depth"; one-file quick win.
2. **[V] Retired-flag rejection (Phase 1 step 2) is a migration shim with no expiry.** Six lines + exact error strings + a deterministic test pinned to those strings (unify spec FR-22 family: "retired-flag rejection string presence"). Justified now (deliberate no-silent-alias ruling), but it will sit there forever unless dated. **Fix:** add a removal horizon ("drop after two minor releases") so a future sweep can delete it with confidence; coupling note: the structure test must be updated in the same commit.
3. **[S] Two learnings mechanisms in one plugin.** `/primer` Phase 6 delegates to `learnings/learnings-capture.md`; `/learn-list` Phase 7 carries its own inline protocol with an exact-output-line contract ("Emit exactly one of: `Learning: …` / `No new learnings this session because <reason>`"). Both are fine designs; having both shapes across sibling skills is incoherence a colleague would trip on. **Fix:** pick one (the exact-output-line version is the more checkable) and share it.
4. **[F] Sibling flag asymmetry.** `/primer` has `--autonomous`; `/learn-list` doesn't. `/learn-list --format both` writes a real `.md` sidecar; `/primer --format both` is silently coerced to html. A user of both skills cannot transfer expectations. Not learn-list's defect per se — its side of each asymmetry is the better one — but the unification should finish the job at the flag surface too.
5. **[P] Phase 4's "Fan out one subagent per topic in standard/deep (sequential in brief)"** prescribes an execution strategy where intent would do ("parallelize per-topic sourcing when the host supports subagents"). Minor — the Platform Adaptation block already gives the degradation ("collapses to a sequential pass… only wall-clock grows"), which is exactly the right framing; the phase body could just point at it.
6. **[V] Anti-pattern 8 ("Hardcoding paths") restates a repo-wide invariant** any capable model honors; anti-pattern 5's parenthetical list of sibling skills is trivia. ~5 lines of ballast in an otherwise high-signal list (anti-patterns 1–4, 6, 7, 9 each carry a real failure mode and the why). Trim, don't restructure.
7. **[Ph] Phase structure is earning its keep.** Eight phases, integer-numbered, each mapping to a real pipeline stage with distinct outputs; the shared/back-half split is announced in the preamble and honored throughout. No fractional phases. This is what /primer should converge toward.

### Substrate assessment (`_shared/topic-research/`, D12) — special attention

The boundary is **clean and verifiably so**: every doc opens with "this file knows nothing about which skill inlines it," emits a typed output (`intake`, `canon`, `outline`, `sourced`), and the dial matrix in intake.md is a genuine single source of truth both skills size against. `tests/assert_substrate_skill_agnostic.sh` enforces the no-skill-names rule with a selftest. The two consumers' divergent reactions (primer hard-reacts to `thin` with reframings; learn-list "consumes the verdict softly… never block") prove the typed-output design works — same mechanism, different policy, policy lives in the skill. D12 origin confirmed: unify requirements D12, "(b), per user ruling," grill G3.

Three leaks the grep can't catch:

- **sourcing-ladder.md §Book summaries names learn-list's artifact sections** — "(reading-list-by-topic, adjacent rabbit holes, *and* the follow-list)". Those are this skill's section names; the substrate shouldn't know them. Reword to "wherever the book appears in the consuming artifact."
- **Stale "mode" vocabulary** in sourcing-ladder.md ("take the top-N for the mode", "N verified links… for the mode") — pre-unification dial name; should be "depth".
- **Phase numbers in substrate headings** — sourcing-ladder.md "Rank-then-verify loop (per topic, **Phase 4**)" and "Curation-of-curations harvest (**Phase 2**)" bake one consumer's phase numbering into skill-agnostic docs (they happen to be learn-list's numbers; primer's are 3 and 2).
- **Duplication within the substrate:** sourcing.md's 5-step rank-then-verify loop and sourcing-ladder.md's are near-copies (~20 lines). One should own the loop (sourcing.md), the other verification + per-format mechanics (ladder).

Residual duplication between the two skills post-0.9.0 is small and mostly legitimate per-skill reaction (both restate "never emit unverified" in their own voice; both carry WebFetch-unavailable degradations shaped to their own contracts). The one real leftover is primer re-implementing dial resolution that learn-list takes from intake.md (filed under primer).

**On `--depth`/`--audience` vs natural language:** the flag design is defensible *because* the natural-language path exists alongside it — intake.md maps phrasing cues ("just a quick list" → brief; "I'm specializing" → deep) and mandates "never auto-apply without the flag," i.e., suggest, don't assume. Flags are the explicit override and the machine-callable surface; phrasing is the human surface. That's the right factoring. The earlier `--mode quick|standard|deep` + `--level` design was worse (two overlapping enums, skill-specific names); the unification to two shared dials was a real improvement. Remaining gap: discoverability relies on the argument-hint; the SKILL.md never tells the model to *suggest* a depth when phrasing cues fire — it does (Phase 1 step 3 "Honor effort phrasing to suggest a depth"), good.

## Flags inventory

| flag | purpose | verdict |
|---|---|---|
| `--depth brief\|standard\|deep` | effort dial (shared with /primer) | keep — typed override over a working natural-language path |
| `--audience senior-pms\|all-pms` | reader axis (shared) | keep |
| `--format html\|md\|both` | output format; `both` adds `.md` sidecar | keep — actually functional here (unlike /primer); align the siblings |
| `--non-interactive` / `--interactive` | repo-wide mode contract | keep — global contract |
| `--mode`, `--level` (rejected) | retired-flag tombstones, exit 64 | keep with expiry date — migration aid, not permanent surface |

## Gates & rubrics inventory

| check | hard or soft | failure it catches | verdict |
|---|---|---|---|
| Retired-flag rejection (exit 64) | hard | silent aliasing of old flags to new semantics | keep-hard, add removal horizon |
| Topic-richness verdict (soft consume) | soft | padding a thin topic into a fake-complete list | keep — "thin → smaller honest list, never block" is the right reaction for a list |
| Outline confirm gate (substrate) | soft (auto-proceeds NI) | sourcing the wrong topics before the expensive step | keep |
| Anti-slop hard gate (source-tiers.md: named author OR recognized publication) | hard | content-farm/SEO slop shipping | keep-hard — this is the differentiator vs plain search, and it's binary on purpose ("the model cannot 'feel' quality reliably") |
| Verification pass-bar (reachable + identity-match + grounded annotation) | hard | dead links, redirects, hallucinated annotations | keep-hard — the product; "never emit a link not fetched this run" is the skill's whole claim |
| Est-cost line before sourcing | informational | silent expensive deep runs | keep — one line |
| Phase 6 self-review (5 advisory checks, same-agent) | soft | residual dead links, slop slips, missing book summaries, coverage holes | keep-soft — right weight; the heavy verification already happened per-link, this is a sweep. Do not escalate to a primer-style reviewer subagent: the artifact is links + ≤2-sentence annotations, mechanically self-checkable |
| Book-summary parity check | soft (but "fix before writing") | paid book with no skim path and no honest none-note | keep |
| Learnings exact-output-line ("empty reflection counts as unfinished") | soft-hard | skipped reflection | keep — cheap and checkable |

## Fix list

| fix | type | impact | risk |
|---|---|---|---|
| Replace `{{mode}}`/`{{level}}`/"quick mode" in artifact-template.html with `{{depth}}`/`{{audience}}`/"brief depth" | quick-win | high | none — template-only; no contract reads the old tokens |
| Reword sourcing-ladder.md §Book summaries to drop learn-list's section names; fix "mode" → "depth"; drop phase numbers from substrate headings | quick-win | med | none — strengthens D12 beyond what the grep enforces |
| Dedupe the rank-then-verify loop (sourcing.md owns the loop; ladder owns verification + per-format) | structural | med | low — substrate-only edit; both consumers inherit |
| Add a removal horizon to the retired-flag rejection (and note the test coupling) | quick-win | low | none |
| Unify the learnings-capture mechanism with /primer's (pick the exact-output-line shape) | structural | low | low — touches both skills |
| Trim anti-patterns 5 & 8 ballast | quick-win | low | none |
| Soften Phase 4 fan-out prescription to intent + pointer at the Platform Adaptation degradation | quick-win | low | none |
