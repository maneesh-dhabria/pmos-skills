# Self-verification loops: do they earn their latency?

**Date:** 2026-06-10 · **Investigator:** ops-observations review, item 06
**Question:** Are the reviewer/self-eval loops (reviewer subagent → fix → re-review, capped at 2) catching real issues in practice, or are they friction + latency? Distinct from finding #7 of the 2026-06-10 skill-design review (which settled gate *policy*: deterministic=hard, judgment=advisory) — this measures loop *yield* from real transcripts.

## Methodology

- **Corpus:** `~/.claude-personal/projects/<slug>/<session>.jsonl`, `-mtime -15` (2026-05-26 → 2026-06-10). 949 transcript files; 91 main-session files >50 KB.
- **Screen:** grep for loop markers (`refinement loop`, `reviewer subagent`, `loop 1/2`, `skill-eval`, `re-critique`, `rubric`) → 60 candidate sessions; classified by skill-invocation markers; deep-extracted the loop story (assistant text + Task dispatches + timestamps) from every session that actually *ran* a loop-bearing skill, via python extraction (never full-file reads).
- **Per-run extraction:** did iteration-1 review FAIL anything real? Was a fix applied? Did iteration 2 run and change anything? Wall-clock between dispatch and verdict; user reaction afterwards.
- **Caveats:** wall-clock from event timestamps includes model latency + tool time; token cost proxied by subagent transcript file size. Sessions that ran loops fully autonomously (no surviving announce text) may be undercounted. Sample is one user's real usage, not a benchmark.

## Loop designs surveyed (mechanics only)

| Skill | Loop type | Cap | Design notes |
|---|---|---|---|
| wireframes Phase 4 | LLM reviewer subagent per file | 2/file | rigor tiers: high = per-file fan-out; medium = ONE cross-file reviewer, no loop 2; low = skip |
| prototype Phase 6 | LLM reviewer subagent per device file | 2/file | 7 rubric groups + contract checks; "no loop 3 — diminishing returns" baked in |
| diagram Phase 5–6 | hybrid: deterministic SVG metrics (hard-fail) + 7-item binary vision rubric on raster | 2 (by rigor tier) | exit early on clean pass; terminal handler if still failing |
| polish Phase 6 | rubric re-run after applying patches | 2 iterations | + editorial pass with 1 capped re-critique |
| artifact Phase 3 | reviewer subagent + auto-apply | 2 iterations | per-section eval criteria |
| primer Phase 5 | reviewer subagent, 10-check binary rubric (R1–R10) | **1** retry | spec explicitly rejected unbounded loops; check_id set-match hard-fail |
| learn-list | inline self-review before writing | 1 pass | no subagent |
| feature-sdlc Phase 6a | skill-eval binary rubric ([D] script + [J] judge checks) | TDD eval loop | hard gate before merge in skill modes |
| readme | 4 personas + 1 reviewer, single parallel dispatch | 1 pass | no refinement loop — findings table only |
| msf-wf | analysis pass (MSF + PSYCH) | 1 pass | recommendations-only by default |

## Tally — loop runs found in transcripts (last 15 days)

| # | Date | Project / session | Skill loop | Iter-1 result | Fix applied? | Iter-2 ran? | Est. loop wall-clock | Verdict for this run |
|---|---|---|---|---|---|---|---|---|
| W1 | 06-05 | dr-stone `3b0bf92e` | wireframes Phase 4 (medium-rigor: 1 cross-file reviewer) | 1 medium (inconsistent `aria-label` on glyph buttons) + few lows | yes (medium + 1 cheap low; rest logged) | no (medium-rigor skips loop 2) | ~85 s | **Marginal catch** — real but cosmetic. The USER's own review 30 min later found the actual problems (tiled-cards vs graph IA, "banked" jargon, microcopy) → full rev-2 rebuild. Reviewer missed all of them. |
| W1b | 06-05 | same session | msf-wf Phase 6 (downgraded) | run inline, advisory consolidated md | — | — | — | Skill machinery skipped mid-pipeline by the orchestrating agent itself ("rather than spinning the full standalone /msf-wf skill machinery"). |
| W1c | 06-06 | same session | plan Phase 4 self-review loop 1 | 1 cosmetic + 1 genuine design finding | yes | no | ~minutes (inline) | Inline self-review caught a real design gap cheaply. |

| R1 | 05-28 | memory-book-v2 `55ca768a` | requirements/spec/plan inline review loops | spec loop 1: 8 findings, all applied (structural pass clean; design-critique 4 priority + batch of lower). plan loop 1: 5 high-risk + 1 low → AskUserQuestion | yes | grill output applied as "loop 2" on requirements (5 gaps) | inline, minutes | **Real catches** — inline self-review on spec/plan surfaced genuine design findings the user then dispositioned. (Project later abandoned for product reasons, unrelated.) |
| R2 | 05-28 | pmos-content `205a958f` (/rewrite, non-interactive) | 3 reviewer subagents over 12 sections | **0 hard fails** across all 12 sections; 2 soft flags | soft flags deferred to assembly | n/a | ~3.5 min | **Pass-through** — section reviewers added ~3.5 min, caught nothing blocking. |
| R2b | 05-28 | same session | persona pass (simulated reader) | **4 P0 factual catches** (ROIC cost-of-capital undefined; Rule-of-X multiplier over-asserted; Copilot cost-to-serve vs net-loss; Superhuman price over-attribution) + 5 P1 + 3 P2 | yes (P0+P1) | no | ~2.5 min | **Strong catch** — persona/factual pass found real errors a self-review missed. |
| R2c | 05-28 | same session | 9-dim eval subagent + informed retry | v1: **8/9 pass, 1 hard fail** (missing `## Upskill mode` label + Prerequisites callout) | yes (3 fixes) | re-eval → 9/9 ship | ~9 min total (eval 3 min, fix+re-eval 6 min) | **Real catch, converged in exactly 1 retry** — the designed loop shape worked. |
| SE1 | 05-29 | critical-thinking `b1227a18` | skill-eval Phase 6a + /verify re-run | **[D] script caught the agent's own silently-failed edits** — agent had recorded edits as done; `d-learnings-load-line fail` proved string-not-found edits never landed (twice in one session) | yes (re-applied properly) | /verify fresh re-run: [D] 19/19, [J] 17 pass / 2 N/A / **0 fail** | [J] dispatch→return ~90 s | **[D] half = strong catch (caught agent self-deception). [J] half = pass-through both times.** |
| SE2 | 06-03 | agent-skills `d889cb79` (magazine skill-new + 2 retro fix-sets) | skill-eval Phase 6a ×3 | run 1: [J] 16 pass/4 N/A/**0 fail**, [D] 19/19. runs 2–3: [D] 19/19; **[J] reviewer never dispatched — "self-reviewed PASS"** | n/a | no | minutes | **Pass-through ×3**; note the agent itself shortcut the [J] dispatch on Tier-2 fix-sets (revealed preference: the loop isn't worth it for small diffs). Also: `a-name-verb-or-gerund` PASSED here for noun `magazine` "on the repo's product-noun convention". |
| SE3 | 06-10 | agent-skills `95323f7a` (frameworks revamp) | skill-eval Phase 6a + /verify fresh re-run | 6a [J]: **2 fails** — 1 real regression (stale `"prioritization"` enum in matching.md `--json` example → fixed + repo-wide sweep) + 1 noise (`a-name-verb-or-gerund` on established public name `/frameworks` → accepted residual) | yes | /verify [J] re-run re-found ONLY the known residual (added nothing); but verify's code-quality reviewer found 1 real latent bug (conf 90) → fixed + regression test | 6a [J] ~93 s; verify re-run ~2.3 min | **1 real catch + 1 noise in 6a; the fresh re-run was pure repetition.** Same [J] check that passed noun `magazine` (SE2) failed noun `frameworks` — judge-check nondeterminism on taste checks, exactly finding #7's complaint. |

| W2 | 05-29 | poker-coach `d4ad2fb2` | wireframes Phase 4 (**low-rigor** — user/agent chose it) | "mostly a11y/contrast at medium severity" | yes (contrast tokens, one edit); ARIA items logged known-minor | no | ~75 s | **Marginal catch.** Hours later the USER's observations ("buttons look old-school", styling root-causes) drove the real fixes — again invisible to the reviewer. |
| W3 | 05-31 | poker-coach `127c24f4` | wireframes Phase 4 (**low-rigor** again) | run announced; verdict not captured in surviving text | — | no | — | Counted for rigor-selection evidence only. |
| W4 | 05-29 | mini-first-birthday `0966de31` | wireframes Phase 4 (**medium-rigor**, user picked) | **3 high-severity contrast misses** (rose 4.25:1, sage 4.34:1, **toast Undo 1.34:1**) + 1 medium + 2 nits | yes | no (medium-rigor = single pass) | ~137 s | **Real catch** (1.34:1 is a genuine accessibility fail). Note: every catch was a *contrast ratio* — computable deterministically without an LLM. msf-wf skipped by user choice. |
| P1–P7 | 05-28→05-31 | pmos-content ×7 (`8d594bf5`, `2697c6e1`, `4252f35d`, `1556dbdb`, `b0be2da3`, `f64bb4ce`, `f7036fca`) | primer Phase 5 reviewer (10-check rubric, cap 1 retry) | **All 7 runs: 10/10 PASS, zero iterations, zero findings** | n/a | never | ~40–95 s + ~117 KB subagent transcript each | **Pure pass-through ×7.** Meanwhile the user's actual complaints — word count below deep-tier target (reviewer *reports*, never blocks), generic topic-frame sourcing (user wrote an 8-fix improvement memo), dark-mode SVG illegibility ("reviewer reads markup, not rendered output") — were all outside or beneath the rubric. |
| L1 | 06-03 | pmos-content `79b675b3` | learn-list inline self-review | 1 real de-dup catch (same source in 2 topics) + dead-link/slop sweep confirmed clean | yes | n/a | ~seconds (inline, no dispatch) | **Cheap real catch** — the no-subagent inline shape pays for itself. |
| R3 | 05-29 | pmos-content `fb90bfc7` (/rewrite #2) | section reviewers + 9-dim eval | sections: **0 hard fails**; final eval **9/9 at v1** | n/a | no retry needed | ~minutes | Pass-through on both loop stages this run. |
| SE4 | 05-28 | agent-skills `fdeed705` (primer-skill-fixes) | skill-eval 6a | **33/33 clean** ([D] 18 + [J]) | n/a | no | minutes | Pass-through. |
| SE5 | 06-03 | agent-skills `ef8f2541` (unify-primer-learnlist) | skill-eval 6a, 2 parallel [J] reviewers | learn-list: all pass. primer: 1 fail `a-name-verb-or-gerund` — **downgraded to pass** by the ≥40-char quote contract (13-char quote) + pre-existing | n/a | no | ~110 s | Pass-through + **noise neutralized by the determinism contract working as designed** (2nd sighting of the noun-name check). |
| SE6 | 05-28 | agent-skills `23a214f1` (primer-inline-diagrams) | skill-eval 6a | [D] 18/18; **[J] self-checked, no reviewer dispatched** | n/a | no | seconds | Pass-through; agent shortcut the dispatch on a small diff. |
| SE7 | 06-07 | agent-skills `e09be3df` (frameworks skill-new) | skill-eval 6a | PASS iteration 1 — [D] 19/19, [J] 18 pass + 2 N/A, **0 fail**, quotes spot-checked | n/a | no | ~minutes | Pass-through. |
| SE8 | 06-03 | agent-skills `1102f8d7` (playbook skill-new) | skill-eval 6a | iteration 1: 19 [D] + 18 [J], 0 failed | n/a | no | ~minutes | Pass-through (orchestrator spot-checked reviewer's load-bearing claims — good hygiene). |
| SE9 | 06-07 | agent-skills `f911fd40` (magazine transcription queue) | skill-eval 6a | PASS — [D] all, 8 [J] pass, 2 cosmetic nits | yes (nits) | no | ~minutes | Essentially pass-through. |
| SE10 | 05-29 | mini-first-birthday `f7769191` (skill mode) | skill-eval 6a | 19/19 [D] + 19/19 [J] clean | n/a | no | ~minutes | Pass-through. |
| X1 | 06-05 | agent-skills `5501e7cb` (P0/W-refactor apply) | skill-eval **[D] used as regression lint** during a 38-skill refactor | caught pre-existing failures and correctly attributed them ("all three [D] failures pre-date my changes"); kept the refactor honest per-wave | n/a | n/a | seconds per run | **Deterministic half earning its keep in a second role** — cheap, repeatable, no false positives observed. |

### Loops that never ran (15-day window)

- **/prototype Phase 6 (≤2 loops/device):** zero executions — every pipeline that reached the prototype gate **skipped it** (dr-stone: "We can skip /prototype phase since I have verified the wireframes"; memory-book: skipped as not-wireframable; in-book-edit-mode: not presented).
- **/diagram Phases 5–6 (hybrid rubric):** zero standalone runs. (The frameworks corpus generated 421 SVGs via direct parallel workflows precisely because /diagram was "infeasible headless" — per project memory D5.)
- **/polish (2-iteration cap), /artifact (2-iter reviewer), /readme (reviewer + personas):** zero runs in window.
- **/msf-wf:** two opportunities, zero full runs — once downgraded to an inline pass by the orchestrating agent itself ("rather than spinning the full standalone /msf-wf skill machinery"), once skipped by user choice.
- **wireframes high-rigor (per-file fan-out + 2 loops):** zero — all 4 wireframes runs chose medium or low rigor. **The 2-loop budget has never been exercised in this window.**

## Headline numbers

Sample: **~27 loop executions across 20 sessions** (4 wireframes, 7 primer, 1 learn-list, 2 /rewrite multi-stage, 12 skill-eval executions incl. verify re-runs, 3 spec/plan inline loops, 1 [D]-as-lint usage). Honest caveats: one user's usage; loop runs that left no narrative text may be undercounted; /rewrite lives in pmos-content but shares the loop pattern.

- **Real catches: ~9 executions (~33%)** — and they cluster in three shapes: **deterministic [D] checks** (SE1's silently-failed edits ×2, X1's regression attribution), **targeted/adversarial passes** (R2b's 4 factual P0s, SE3-verify's latent bug via code-quality reviewer, R2c's structural hard-fail), and **inline self-reviews** (spec loop-1's 8 findings, plan loop-1's 5, learn-list's dedup). Plus one genuine [J] catch (SE3's stale enum) and one genuine wireframes catch (W4's 1.34:1 contrast — deterministically computable).
- **Pure pass-through: ~16 executions (~60%)** — primer ×7 (10/10 every time), skill-eval [J] ×8, rewrite section reviewers ×2, verify fresh-[J] re-runs ×2 (re-found only the already-known residual).
- **Noise: 3 sightings of one taste check** (`a-name-verb-or-gerund`): failed `frameworks`, failed `primer` (downgraded by quote contract), **passed** `magazine` on the identical convention — judge nondeterminism on the exact check class finding #7 flagged.
- **Iteration 2 produced new findings in 0 of 27 executions.** The only useful second pass was R2c's *informed retry* (fix known fails → confirm), which converged exactly as designed. Verify's mandated fresh [J] re-run after a 6a pass added nothing in either observed instance (~2 min + ~100 KB subagent each, pure repetition).
- **Per-loop cost:** reviewer dispatch ≈ 40 s–2.5 min wall-clock + ~25–60k tokens (117–250 KB subagent transcript). In a 20-min primer run, the reviewer is ~8% latency for 0 observed yield; in a multi-hour SDLC pipeline, 6a+verify [J] ≈ 4–5 min total.
- **The user's own review beat the LLM reviewer every time both looked at the same artifact:** dr-stone (IA + terminology vs aria-labels), poker-coach (visual design vs contrast tokens), primer (depth/sourcing vs rubric pass). The reviewers catch floor violations; the user catches ceiling problems. No instance of reviewer nitpicks causing rework the user reverted; no instance of the user manually interrupting a running loop (they pre-empt via rigor tiers and gate skips instead — the permissiveness design absorbs the friction).

## Per-loop-type verdicts

### 1. Deterministic-gated loops ([D] script halves; diagram's SVG metrics) — **KEEP, hard**
Strongest value profile in the sample: caught the agent's own false "done" records twice in one session (SE1 — edits silently failed via string-not-found, eval proved it), correctly attributed pre-existing vs introduced failures during the refactor (X1), near-zero latency, zero false positives observed. This independently confirms finding #7's "deterministic = hard." Diagram's deterministic half never executed in-window (no standalone runs) — no evidence either way, but its design matches the proven shape.

### 2. LLM-judge reviewer loops (wireframes/prototype reviewers, primer R1–R10, artifact) — **REDESIGN**
Evidence: 11 single-artifact reviewer runs → 1 real catch (W4 contrast), 2 marginal (W1/W2 a11y nits), 8 pass-throughs (primer ×7, R3). Three specific indictments:
- **Every wireframes catch was a contrast ratio or aria attribute** — the deterministic-computable subset of the rubric. The judgment-requiring subset (IA, copy, layout sense) caught nothing the user didn't catch better.
- **Primer's reviewer is a rubber stamp in practice** (7/7 clean), partly because the load-bearing trust checks (R1 citation-membership) are *already enforced at draft time* ("All 18 unique hrefs are members of the source set — R1 is satisfied at draft time"). The reviewer re-verifies what construction guarantees. Its known blind spot (rendered output — dark-mode SVG bug) is exactly where defects actually appeared.
- **Users systematically select away from the heavy variant** — 4/4 wireframes runs chose medium/low rigor; the agent itself skipped [J] dispatch twice and downgraded msf-wf once. Revealed preference says the full loop isn't worth it.
Redesign (short of removal): (a) extract the deterministically-computable checks (contrast ratios, aria coverage, href-membership, anchor integrity) into scripts that run every time for free; (b) collapse the loop budget to 1 pass + verdict-triggered second pass only on hard-fail (matches primer's cap-1 design, which is the right shape — and matches observed behavior everywhere); (c) make the LLM reviewer **opt-in above medium rigor** and spend the judgment budget on the pass shapes that demonstrated yield: persona/factual verification (R2b: 4 real P0s) and code-quality review (SE3-verify: latent bug), not generic rubric re-scoring.

### 3. Rubric-eval loop (skill-eval, feature-sdlc Phase 6a + /verify re-run) — **SPLIT: keep [D] hard, run [J] once, delete the verify fresh-[J] re-run**
Evidence: 12 executions → [D] caught real agent errors (SE1 ×2); [J] caught 1 real regression (SE3 stale enum) against 3 noise sightings of a taste check and ~8 pass-throughs. The verify-phase *fresh* [J] re-run is the clearest pure-latency item in the whole sample: both observed instances re-confirmed only the already-accepted residual (~2 min + a subagent each). Concretely: (a) [J] runs once, at 6a; /verify re-runs **[D] only** + reconciles recorded residuals; (b) demote the taste-[J] checks per finding #7 — `a-name-verb-or-gerund` alone generated 3/3 of observed noise with inconsistent verdicts across runs; (c) keep the quote-grounding downgrade contract — it correctly neutralized a bad fail (SE5) with zero human cost; (d) sanction the Tier-2 shortcut the agent already takes (SKILL.md-unchanged diffs → [D] + self-review, no [J] dispatch) instead of leaving it as silent non-compliance.

### 4. Inline self-review loops (spec/plan loop 1, learn-list pre-write check) — **KEEP as-is**
Zero-dispatch, seconds of latency, consistent real findings (8 spec findings + 5 high-risk plan findings in memory-book; 1 genuine design finding in dr-stone's plan; learn-list's dedup). Best value-per-token in the sample. No change needed; do not "upgrade" these to subagent dispatches.

## Recommendations (ranked)

1. **Delete the fresh [J] re-run from /verify skill modes** (re-run [D] only, reconcile residuals). Pure repetition in 2/2 observed instances; saves ~2 min + a subagent per skill pipeline. Smallest change, clearest evidence.
2. **Convert the deterministically-computable rubric items to scripts** (contrast ratio, aria coverage, citation-membership, anchor/id integrity). They account for essentially all real catches by the wireframes/primer reviewers — and scripts run in seconds with no judge variance. The diagram skill already proves this hybrid pattern.
3. **Collapse all 2-loop budgets to "1 pass + retry only on hard-fail."** Iteration 2 found nothing in 27 executions; primer's cap-1 + R2c's informed-retry are the proven shapes. This is a doc-only change to wireframes/prototype/artifact/polish.
4. **Demote or delete `a-name-verb-or-gerund` and siblings** (taste-[J] checks) — 100% of observed [J] noise, inconsistent across runs. Finding #7 already prescribes this; the transcripts now supply the incident data.
5. **Make the single-artifact LLM reviewer conditional on rigor tier** (default off at low/medium for primer-class artifacts whose trust checks are construction-enforced), and reinvest in persona/factual and code-review passes, which delivered the only high-value LLM-judge catches in the window.
6. **Leave inline self-reviews and the [D] gates untouched.** They are the part of the design that is working exactly as intended.

