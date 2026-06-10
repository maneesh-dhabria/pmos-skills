# creativity — review

**Grade:** C (good bones and good substrate citizenship on the read side; the write side is stale — pre-dates the html-artifacts migration — and the technique catalog needs a posture change)
**Size:** SKILL.md 197 lines (168 excluding non-interactive block); references 0 files / 0 lines; target ~95 lines + a ~25-line `reference/techniques.md`.

## TL;DR

- **Biggest win available:** modernize the write side. The save path (`docs/creativity/YYYY-MM-DD-….md` + auto-commit) ignores `{docs_path}`, ignores the feature-folder layout, and creativity is absent from the html-authoring substrate's surface list — it's the only pipeline-adjacent enhancer whose output lands outside the feature folder and outside `index.html`.
- **Biggest risk:** Phase 5 edits the requirements doc with zero HTML awareness. Post-html-artifacts, editing `01_requirements.html` without re-emitting `sections.json` silently desynchronizes the FR-52 set-equality validation that /feature-sdlc runs on every downstream reviewer pass. This is a latent corruption path, not a style nit.
- **Worth keeping:** the anti-padding discipline — "each technique should produce 0 or 1 strong idea per journey. Skip freely if nothing strong — don't pad" — is the best line in the skill and the correct counterweight to any catalog. Also the persona/journey alignment via `_shared/persona-journey-alignment.md` is exemplary substrate use (properly factored, shared with /msf-req and /msf-wf).

## The catalog question: does enumeration constrain the model?

The skill's core is a 20-technique catalog (6 Tier-1, 14 Tier-2). Verdict: **a catalog is the right shape, but the current posture is wrong in three ways.**

Steelman first: the catalog is domain payload, not micromanagement — like /frameworks' corpus, it encodes curated PM lenses ("add friction," "build distribution within," "make them feel better & smarter") that a bare "brainstorm improvements" prompt reliably fails to reach. The tiering ("Tier 1 gets deep thought, Tier 2 gets a quick pass") and the 0-or-1 rule are exactly how you stop a catalog from becoming a fill-in-the-matrix exercise. This is a skill that is long because the domain is a repertoire, not because it distrusts the model.

But:

1. **The catalog is a ceiling, not a floor.** Nothing invites a lens that isn't listed. A model that spots a category-breaking idea has no sanctioned slot for it. One sentence fixes this: "These lenses are a floor — if a stronger idea comes from outside the catalog, include it and name your own lens."
2. **Tier 2 has redundancy that pads the prompt budget.** "Make it much bigger / much smaller / the only thing" are one scale axis; "Remove friction" (Tier 1) vs "Make it unnecessary" (Tier 1) vs "Add constraints / Remove constraints" overlap heavily. 20 prompts read; ~14 distinct moves exist. Models asked to apply 20 named techniques × N journeys drift toward coverage-performance — exactly what the 0-or-1 rule is fighting.
3. **Wrong disclosure level.** Pocock's pattern for a big repertoire (improve-codebase-architecture) is: principles inline, repertoire in a reference file loaded when the branch is taken. Tier 1 (6 lenses) is the distilled judgment — keep inline. Tier 2 belongs in `reference/techniques.md`, read at Phase 3.

History note: the catalog dates to the repo's founding bulk commit (`727504e`, 150 lines); creativity never went through /skill-sdlc and has no feature folder of its own (no `docs/pmos/features/*creativity*`). It has only grown by mechanical fanouts (non-interactive rollout `364d1eb`, persona-substrate extraction `73675d7`) — which is precisely why its write-side conventions fossilized while the pipeline moved.

## Findings

1. **[S][R] Save path is pre-migration fossil.** "Save consolidated findings to `docs/creativity/YYYY-MM-DD-<feature-name>-creativity-analysis.md`. Commit." — hardcodes `docs/` (no `{docs_path}` resolution), lands outside the feature folder, MD-only while every sibling surface is HTML-primary, and is referenced by nothing else in the repo (single grep hit). When /feature-sdlc Phase 3a runs creativity inside a worktree, findings escape the feature folder and the index. **Fix:** save to `{feature_folder}/creativity.{html,md}` per the substrate; register a `creativity` label in `_shared/resolve-input.md`'s label table if anything downstream should find it. Coupling check: feature-sdlc Phase 3a captures no artifact path from creativity, so this is low-risk to change.
2. **[G][S] Phase 5 requirements edits break the sections.json contract.** "Update the requirements doc" with no mention of re-emitting `01_requirements.sections.json` or preserving heading ids. /artifact got exactly this treatment in v2.42.0 (post-edit re-emit); creativity didn't. Until fixed, an accepted creativity recommendation can hard-fail the next /feature-sdlc reviewer pass with `sections_found … do not match 01_requirements.sections.json`. **Fix:** "After editing an HTML requirements doc, re-emit sections.json per `_shared/html-authoring/README.md` step 3."
3. **[Structural] Re-tier the catalog** per the verdict above: Tier 1 inline, Tier 2 → `reference/techniques.md` (merge the scale-axis trio; note the friction-family overlaps), add the floor-not-ceiling sentence. ~−35 lines from SKILL.md, and the catalog stops constraining.
4. **[R] Orphaned `-final.html` wireframe convention.** Phase 5: "Update only `-final.html` wireframes (not iterations)." /wireframes contains zero references to `-final` naming — it now emits per-device files + `canvas.html` with DESIGN.md sidecars. The instruction is unactionable as written. **Fix:** "Update the current wireframe files per /wireframes' layout; never edit iteration history."
5. **[X] Platform Adaptation lists "No Playwright MCP"** — the skill never touches a browser. Copy-paste residue from an msf/wireframes sibling; flags the adaptation notes as unmaintained. Delete the bullet.
6. **[P] Silent auto-commit.** "Commit." — no other enhancer skill auto-commits (grill explicitly never does; /feature-sdlc owns commits in orchestrated runs; /readme advertises "never auto-commits"). Surprising and inconsistent. Delete, or make it an offer.
7. **[V] "Keep the report under 300 lines"** — numeric cap with no stated failure mode; the adjacent principle ("table-heavy, minimal prose") already carries the intent, and the 0-or-1 rule bounds volume upstream. Soften to the principle or delete.
8. **[P] Phase 3's subagent mandate + Parallelization section** prescribe fan-out machinery for what is often a 2-journey doc. Keep the one real hazard ("serialize edits to any shared file") and compress the rest to: "For many journeys, analyze them in parallel (one subagent per journey) — never let two agents edit the same file."
9. **[R] Phase 4 wording contradicts itself:** "Present recommendations individually for accept/reject via multi-select (not group-level accept/reject)" — multi-select *is* batch presentation. Intent is clearly "per-recommendation verdicts, grouped display"; say that. Also: the Phase 4 multi-select and Phase 5 (a)/(b)/(c) prompt carry neither `(Recommended)` nor a `defer-only` tag — the bare classifier DEFERs them in non-interactive mode (harmless), but per the W14 posture every prompt should be deliberately classified, not classified-by-omission.
10. **[V] Description/argument-hint mismatch on tiers:** the description sells "Optional enhancer for Tier 3 requirements" and the body says "Best applied to Tier 3," but there's no tier input and the skill behaves identically at any tier. Fine — but then "Tier 3" is advisory prose; one mention suffices (currently two).

## Flags inventory

| Flag | Purpose | Verdict |
|---|---|---|
| `--non-interactive` / `--interactive` | W14 mode contract | **Keep (repo contract).** Only flags the skill has — refreshingly clean. Note: persona confirmation is "mandatory — never skipped," which in non-interactive mode means it DEFERs with proposed personas auto-carried; coherent, but worth one sentence stating it so. |

## Gates & rubrics inventory

| Check | Hard or soft | Failure it catches | Verdict |
|---|---|---|---|
| Persona confirmation "mandatory — never skipped" (Phase 1, via substrate) | Hard | Generic ideas from unanchored brainstorming — the substrate names this exact failure ("creativity without user context produces generic ideas") | **Keep-hard** — and it lives in `_shared/persona-journey-alignment.md`, shared with /msf-req and /msf-wf. Correctly factored. |
| Journey confirmation (Phase 2, via substrate) | Hard | Analyzing flows the user doesn't care about | **Keep-hard** (same substrate). |
| 0-or-1 idea per technique / don't pad | Soft (principle) | Coverage-performance padding | **Keep** — the skill's best line; stated twice (intro + Phase 3), once is enough. |
| Phase 4 per-recommendation verdicts + DROPPED-strikethrough preservation | Soft | Losing rejected ideas; group-level rubber-stamping | **Keep** — DROPPED preservation is a genuinely good audit trail. |
| Phase 5 approval before any doc edit | Hard | Unapproved mutation of pipeline artifacts | **Keep-hard.** |
| Phase 6 consistency pass (cross-ref applied recommendations, contradictions, wireframe-text match) | Soft | Accepted-but-unapplied recommendations; doc self-contradiction | **Keep as advisory** — cheap, catches real drift; don't harden (no machine validation exists). |
| ≤300-line report cap | Soft | None stated | **Delete** (finding 7). |
| Learnings reflection (Phase 7) | Soft (process gate) | Lost session learnings | Keep (repo contract). |

## Fix list

| Fix | Type | Impact | Risk |
|---|---|---|---|
| Move save target into the feature folder via html-authoring substrate; drop `docs/creativity/` | structural | high | low — nothing references the old path; feature-sdlc captures no artifact path |
| Add sections.json re-emit rule to Phase 5 requirements edits | quick-win | high | none — prevents a downstream hard-fail |
| Tier-2 catalog → `reference/techniques.md`; merge overlapping lenses; add floor-not-ceiling sentence | structural | high | low — content move + one behavioral sentence |
| Delete orphaned `-final.html` wireframe rule; rephrase to current /wireframes layout | quick-win | med | none |
| Remove "Commit." auto-commit | quick-win | med | low — check no automation expects the commit (none found) |
| Delete "No Playwright MCP" adaptation bullet | quick-win | low | none |
| Delete 300-line cap; keep "table-heavy, minimal prose" | quick-win | low | none |
| Compress subagent/parallelization prescription to one sentence + shared-file rule | quick-win | low | none |
| Fix Phase 4 "individually via multi-select" wording; classify Phase 4/5 prompts (tag or Recommended) | quick-win | low | none |
