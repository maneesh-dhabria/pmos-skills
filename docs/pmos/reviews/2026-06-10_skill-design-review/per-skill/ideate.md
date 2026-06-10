# ideate — review

**Grade:** B- (the loop design and reference architecture are right; the body re-inlines what the references already hold, and the Amplify insertion left stale phase numbers and a hardcoded date behind)
**Size:** SKILL.md 264 lines (235 excluding non-interactive block); references 6 files / 507 lines (383 md + 124-line HTML template); target ~150 lines (~120 excluding the block), references unchanged.

## TL;DR

- **Biggest win available:** Phase 3 and Anti-Patterns 11–12 restate `reference/eleven-star-ladder.md` nearly in full (sweet-spot-is-7-8, never-11, the three confirm options, multi-finalist handling, additive preservation — each stated twice, some three times). Same pattern for Phase 4 vs. `pressure-test-battery.md`. The references are the better copies; the body should gate and point. ~70 lines come out with zero behavior change.
- **Biggest risk:** post-Amplify drift. The Amplify phase was inserted later (commit `03497ec`) and renumbered everything after it, but `pressure-test-battery.md` still says "Phase 3 prompts" / "Phase 4 Refine" (both off by one), claims a "12-section schema" while SKILL.md Phase 6 mandates 13 sections, and tells users to re-run `/ideation` (a skill that doesn't exist). A model loading the reference on the branch it governs gets contradicting instructions about the thing it's doing.
- **Worth keeping:** the routing discipline. "When NOT to use" cleanly fences /requirements (shaped → acceptance criteria), /grill (committed plan → interrogation), /creativity (committed direction → angles); the closed technique set with named exclusions and *reasons* ("Six Thinking Hats — LLM switching hats is cosplay, not signal") is the most Pocock-like writing in the plugin; and the Amplify opt-in gating (auto-skip for `fix`, default-Skip even for `new`/`extend`) shows real restraint.

## Is a separate pre-requirements skill warranted? (special attention)

**Yes — the charter holds, narrowly.** The test is whether /ideate does something /requirements' brainstorming and Pocock's grill philosophy don't:

- **/requirements brainstorms to converge** on a known feature — its output is acceptance criteria for a thing you've decided to build. /ideate diverges first (8–15 deliberately distinct variants via type-matched techniques) and then attacks the survivor with a *batch* battery. Folding this into /requirements would either bloat its Tier-3 path or get skipped under delivery pressure — the failure mode the skill names ("users skip the half that matters").
- **Pocock's grill-me** would handle this in 5 lines of conversation — but grill-me's output is a conversation, not an artifact, and it interrogates *the user*. /ideate's premortem/inversion/assumption battery runs without the user supplying answers and leaves a durable, shareable brief. That's a different job. The honest Pocock translation of /ideate is ~½ this size, not zero.
- **The boundary to watch** is /creativity — both generate non-obvious alternatives via named techniques. Anti-Pattern 3 fences it correctly today (different inputs: uncommitted seed vs. Tier-3 requirements doc), but the two technique libraries will be tempting to merge; if they ever converge, the *substrate* (a shared techniques.md) should merge, not the skills.

**Is the 11-star ladder progressive disclosure done right?** The *gating* is right: opt-in, idea-type-restricted, auto-skipped for `fix`, with skip-signaling so the artifact schema stays stable, and the rationale ("most ideas don't earn the ceiling-raising cost") stated where the decision happens. The *disclosure* is not: `eleven-star-ladder.md` (78 lines) is a proper on-demand reference — Chesky's canonical example, the per-rung generator prompts, sweet-spot selection, skip signaling — but SKILL.md Phase 3 (lines 143–156) re-inlines the sweet-spot rule, the three-option confirm, multi-finalist handling, and artifact preservation, then Anti-Patterns 11–12 state them a third time. A reader pays for the ladder whether or not the branch is taken — the opposite of "loaded only when the branch is taken." Fix: Phase 3 becomes ~5 lines (run the ladder per `reference/eleven-star-ladder.md`; recommend the sweet-spot reframe; confirm; persist cursor), and the duplicated anti-patterns collapse to a pointer.

## Findings

1. **[S][V] Body duplicates its own references.** Phase 3 ↔ `eleven-star-ladder.md` (above); Phase 4's three battery descriptions + table schemas ↔ `pressure-test-battery.md` (which holds the verbatim frames, row caps, and operating rules); Phase 2's variant rules (≤120 chars, distinctness, 8–15) ↔ `techniques.md` §Variant-quality rules; Phase 0 step 5's slug rules ↔ `slug-derivation.md`. In every case the reference is the richer, canonical copy. **Fix:** body keeps the gate, the one-line intent, and the pointer. −60 to −70 lines; this is the single change that gets the file to target.
2. **[R] `pressure-test-battery.md` was orphaned by the Amplify insertion.** Title/intro say "Phase 3" (battery is now Phase 4); operating rule 2 says "the artifact's Phase 4 Refine" (Refine is Phase 5); rule 4 says "the 12-section schema" (Phase 6 mandates 13 — Amplify added one) and names `/ideation --refine --resume` (the skill is `/ideate`). Four stale facts in one reference file. **Fix:** mechanical sync pass — or better, drop phase numbers from reference files entirely and say "this battery" / "the optional refine pass," so renumbering can't orphan them again.
3. **[R][P] Hardcoded date in Phase 4:** `Frame: "It is 2027-05-13. This idea, shipped 12 months ago, has failed."` — a frozen authoring-day artifact (the reference correctly says `<today + 1 year>`). This is the criteria's durability rule verbatim: no time-sensitive info. **Fix:** replace with the reference's parameterized frame (which also makes the body line redundant — see finding 1).
4. **[Ph] The loop diagram jumps Phase 4 → Phase 6,** with a caption explaining that Phases 0/5/7/8 "wrap the core loop." The skipped number plus the wrapper-phases footnote is the insertion smell the criteria flags — Amplify pushed pressure-test from 3→4 but the artifact write kept its old number 6. Harmless at runtime, confusing to a human reader. **Fix:** renumber 0–7 contiguously (or label diagram boxes by name, not number).
5. **[V] 12 anti-patterns where ~7 earn their place.** Keep the ones naming real, ideate-specific failure modes with reasons (1 over-convergence, 2 skipping pressure-test, 3 /creativity coupling, 4 not-acting-like-/grill, 6 no auto-promotion, 9 re-asking locked decisions). Cut or collapse: 7 (closed technique set — already stated in techniques.md with the reasons), 8 (artifact schema — Phase 6's contract already), 10 (hardcoded paths — generic skill-patterns hygiene, not ideate-specific), 11–12 (ladder rules — live in the reference). −15 lines.
6. **[F] Flag surface is wider than the natural-language triggers it shadows.** The description already triggers on "11-star this idea" and "amplify this idea" — `--amplify` adds little beyond scriptability; `--refine` duplicates the end-of-Phase-4 prompt; `--no-amplify` exists only to pre-answer an AskUserQuestion whose default is already Skip. Each is cheap individually; collectively the argument-hint reads like a CLI man page for what the skill itself frames as a ~10-minute conversation. See inventory below — none are wrong, three could be natural language.
7. **[X] Tool-name inconsistency in Track Progress:** "e.g., `TaskCreate` in Claude Code" vs. Platform Adaptation's "TaskCreate / TodoWrite missing." Trivial; pick one name. The rest of Platform Adaptation genuinely matches the body (the artifact phase-cursor as the canonical resume contract is a nice tracking-tool-independent design).
8. **[S] Phase 6 step 3 carries the FR-10 asset-enumeration inline block** (same 12-skill fanout flagged in the grill and simulate-spec reviews). Delta here: `assets/` prefix (artifact dir is the parent), `pmos:ideate-phase` cursor meta. Same fix: substrate pointer + deltas.
9. **[G] The 8–15 variant floor is a model gate done right** — it names the failure ("LLMs over-converge in single-shot generation; a 6-variant pass dressed up as good enough is the most common failure mode"), originates in the 2026-05-13_ideation spec, and `techniques.md` backs it with a regenerate rule. Keep-hard. Same for the 3-regeneration cap (decision-fatigue bound) and the 13-section artifact schema (downstream tooling + /comments resolve route on it).
10. **[R] Done well, worth naming:** the "Apply comment-resolver edit" section cites `_shared/apply-edit-at-anchor.md` as normative instead of restating it ("per NFR-08, this phase MUST cite that file rather than restate the contract") — the exact pattern findings 1 and 8 ask the rest of the file to follow. Also the Phase 1 announce-and-allow-override ("saves a turn and signals the skill has an opinion") states its WHY inline — prescription earned.

## Flags inventory

| Flag | Purpose | Verdict |
|---|---|---|
| `--format html\|md\|both` | FR-12 override | **Keep (repo contract)** — `both` is retired-aliased (Phase 6 step 2); same global hint cleanup as other skills. |
| `--amplify` / `--no-amplify` | Force-run / force-skip Phase 3 | **Fold into natural language** — "11-star this idea" already triggers Amplify per the description, and the interactive gate covers the rest. Keep only if an orchestrator needs deterministic pass-through (none does today — /feature-sdlc's ideate gate doesn't forward it). |
| `--no-stress-test` | Skip Phase 4 for throwaway brainstorms | **Keep** — it's a deliberate, warned escape (TL;DR carries `⚠`); making the skip *costly and explicit* is the design. |
| `--refine` | Force Phase 5 polish | **Fold into natural language** — the end-of-Phase-4 prompt already offers it; "refine the artifact" suffices. Retain in the handoff suggestion string only if kept. |
| `--slug <slug>` | Override derived filename | **Keep** — cheap, validated (slug-derivation.md rejection rules), occasionally genuinely needed; no NL equivalent is less awkward. |
| `--resume <path>` | Jump to the artifact's phase cursor | **Keep** — load-bearing: the `pmos:ideate-phase` meta is the resume contract and the handoff section emits `--resume` commands. |
| `--non-interactive` / `--interactive` | W14 mode contract | Keep (repo contract). |

## Gates & rubrics inventory

| Check | Hard or soft | Failure it catches | Verdict |
|---|---|---|---|
| 8–15 variant count (regenerate below 8; trim above 15) | Hard | LLM over-convergence in single-shot generation (failure named, origin: 2026-05-13_ideation spec) | **Keep-hard** — this is the skill's load-bearing rule and it says so. |
| 3-regeneration cap, then force a finalist pick | Hard | Endless regenerate loops / convergence avoidance | **Keep** — small, bounded, stated. |
| Amplify gate (idea-type + opt-in; auto-skip `fix`) | Hard routing | Paying the ceiling-raising cost on ideas that can't use it | **Keep-hard** — restraint is the feature; rationale stated at the decision point. |
| Phase 4 always-on (only `--no-stress-test` escapes, with artifact warning) | Hard | Users skipping the differentiating half of the skill | **Keep-hard** — the warning-in-artifact makes the bypass honest. |
| 13-section artifact schema (skipped sections carry `<em>Skipped — reason</em>`) | Hard | Downstream tooling (/comments resolve, section anchors) breaking on variable schemas | **Keep-hard** — but fix the reference that still says 12 (finding 2). |
| No clarifying questions in the battery (batch pass) | Hard | Phase 4 degrading into /grill's turn-by-turn cadence (the skill-identity boundary) | **Keep** — this is the anti-pattern-4 boundary enforced. |
| Sweet-spot never 11, almost always 7–8 | Soft (judgment guided) | Dumping the raw ladder on the user / recommending the absurd rung | **Keep — in the reference only** (currently triple-stated). |
| Phase 8 "MUST emit exactly one of two lines" learnings gate | Hard | Silent skip of the reflection | **Soften to the repo-standard learnings-capture wording** — the exactly-one-of-two-lines mandate is exact-wording prescription where the shared `_shared/learnings-capture.md` contract already covers intent. |
| Slug validation (rejection rules + fallback) | Hard | Path traversal / unusable filenames | **Keep** — 10 lines in the reference, real input-sanitization value. |

## Fix list

| Fix | Type | Impact | Risk |
|---|---|---|---|
| Deduplicate body ↔ references (Phase 3, Phase 4, variant rules, slug rules; collapse Anti-Patterns 7/8/10/11/12) | structural | high | low — references already hold the canonical copies; behavior unchanged. Verify the non-interactive classifier still sees each AskUserQuestion call site after the trim (Recommended labels live in the body). |
| Sync `pressure-test-battery.md` (phase numbers, 12→13 sections, `/ideation`→`/ideate`) — or strip phase numbers from references | quick-win | high | none |
| Replace hardcoded `2027-05-13` premortem date with the reference's `<today + 1 year>` | quick-win | med | none |
| Renumber the loop diagram / drop numbers from diagram boxes | quick-win | low | none |
| Retire `--amplify`/`--no-amplify`/`--refine` in favor of natural language (keep `--no-stress-test`, `--slug`, `--resume`) | structural | med | low — confirm no orchestrator forwards them (none found; /feature-sdlc's ideate gate passes the seed only). |
| Replace Phase 6 FR-10 inline block with substrate pointer + ideate deltas | structural (12-skill pattern) | med | low — coordinate with the same fix across skills. |
| Align Track Progress tool naming with Platform Adaptation | quick-win | low | none |
