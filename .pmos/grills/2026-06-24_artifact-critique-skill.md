# Grill Report — `/artifact-critique` design brief

**Target:** `docs/design-briefs/2026-06-24-artifact-critique-skill.md`
**Depth:** deep • **Questions asked:** 13 • **Date:** 2026-06-24

## Resolved

1. **Skill boundary (D0)** → Separate standalone skill (not a mode of `/artifact`). Matches `/grill`/`/design-crit`/`/polish`; must run on foreign docs.
2. **Output format (fixes D3)** → Honor `output_format` (`html`|`md`); **drop `both`** (repo retired the sidecar). HTML artifact keeps a "Copy markdown" affordance.
3. **Shared-substrate scope (amends D2)** → Author the rubric at `_shared/critique-rubric/`, but **only `/artifact-critique` consumes it in v1**. `/artifact` adoption is a later story tied to `/artifact-sdlc`.
4. **Rewrite hand-off (amends D1)** → `/artifact-critique` persists a **structured critique document** that becomes the input contract a future `/artifact` rewrite consumes. v1 hand-off is advisory prose; the structured findings block is the durable contract.
5. **N/A vs ABSENT** → A per-doc-type **applicability map** in `doc-types.md` decides deterministically (missing+expected→`ABSENT`; missing+not-applicable→`N/A`); doubles as the author-facing explanation.
6. **Verdict vocabulary** → Single ordinal scale **`STRONG · MIXED · WEAK · ABSENT · N/A`** + free-text reason tag for shape critiques (output-not-outcome, wedge-not-moat). Drops the ambiguous SPECIFIC/GOOD/OUTPUT mix.
7. **Scoring architecture** → **Single-pass reviewer** (whole doc in context, scores all axes + synthesizes weakest-claims/signals). Fan-out deferred to a latency optimization.
8. **Long docs (amends D6)** → Full doc in context by default; only past the real context limit, map-reduce **evidence-gathering** (chunks return verbatim quotes, never summaries). Removed the 50k "summarize" language.
9. **Quality gate (fixes §4)** → Deterministic **script** for mechanical checks (hard gate, 100% pass) + **separate reviewer subagent** for grounding/fairness (advisory). Defines the missing `N` floor.
10. **Doc-type detection** → Auto-detect + declare in the opening line, user-correctable / recorded as assumption; **hybrids take the union of applicable axes**.
11. **Forced negativity** → `STRONG` freely-givable; "**up to** three" weakest claims (may be fewer/none); advisory reviewer flags manufactured nitpicks.
12. **Voice anchor** → Codified unnamed "seasoned product leader" voice rubric + few-shot corpus exemplars; advisory reviewer scores voice. Keep dropping the real-person attribution.
13. **Multimodal input (amends D6)** → **Read embedded diagrams/images** and factor into scoring; note when a visual is unreadable to avoid false-`ABSENT`.

## Gaps surfaced (carried into `define`)

- **Structured findings schema** — the persisted critique needs a stable, parseable findings block (per-axis verdict + reason + "what I'd want to see" + ranked weakest-claims) so `/artifact` can later consume it. The html-authoring `.sections.json` companion is a candidate carrier.
- **Exemplar curation** — pick the few-shot voice exemplars from the 5-doc corpus during `define`.
- **`/artifact` adoption of the rubric** — explicitly a *later* story; until then, guard against a dangling cite (don't have `/artifact` reference `_shared/critique-rubric/` prematurely).

## Recommended next step

Brief amended with all 13 resolutions (D0 added; D1/D2/D3/D6 amended; §2.3 verdict scale, §2.6 applicability map, §4 scoring/eval, §5 voice added). Run `/skill-sdlc define` on the updated brief.
