# skill-tier-matrix.md — the skill-mode tier resolver

The data behind `/feature-sdlc` Phase 0d's tier resolver. Phase 0d produces three
resolved values for a skill-authoring run: the **tier** (this file), the
**skill-location path**, and the **target_platform** (the latter two are in
`repo-shape-detection.md`). Inputs to the tier decision: the expected phase count,
the number of `reference/` files warranted, whether an eval rubric is warranted, and
the pipeline-integration depth.

## The matrix (lifted from `/create-skill` Phase 2, adapted)

| Tier | Triggers | Pipeline workflow in `/feature-sdlc` |
|---|---|---|
| **Tier 1 — one-shot utility** | ≤2 phases; no `reference/`; no `assets/`; no eval rubric; no workstream awareness | short-form `/requirements` → **skip** `/grill` and `/creativity` → short-form `/spec` → `/plan` → `/execute` → **Phase 6a (skill-eval) still runs** → `/verify` (non-skippable) → `/complete-dev`. The folded `/msf-req` runs but stays brief. |
| **Tier 2 — standard skill** | 3+ phases OR has `reference/` files OR has `assets/` OR uses workstream context OR has a structured output format | the full pipeline minus the always-optional gates' defaults (`/creativity` stays opt-in; `/grill` runs at Tier 2+; the feature-mode UI gates 3b/3c are suppressed in skill modes by design). |
| **Tier 3 — system skill** | 5+ phases AND (has an eval rubric OR has external integrations OR multi-source/multi-tier behaviour OR pipeline integration) | the full pipeline. |

## `--tier N` override

If `--tier N` was passed on the CLI it wins over the matrix result. Record the
divergence in the `skill-tier-resolve` phase entry as a
`child_tier_divergence`-style note (`matrix=<M>, override=<N>`) and proceed with the
override — do not silently drop the matrix recommendation; surface
both in the Phase 0d confirmation prompt.

## skill-feedback (multi-skill) tier rule

In `skill-feedback` mode the run targets one or more skills. For each targeted skill,
compute a **per-skill tier** from that skill's approved-change-set size — reuse the
`scope_hint` recorded per finding in the Phase 0c critique:

- mostly `small` scope hints → Tier-1-ish for that skill,
- mostly `medium` → Tier-2-ish,
- any `large` → Tier-3-ish.

The **run tier = max** of the per-skill tiers (the run is as heavy as its heaviest
skill). Show the per-skill breakdown alongside the resolved max in the single Phase 0d
confirmation prompt so the user can override the run tier knowingly.

## Notes

- Tier is a *recommendation surface*, not a hard gate — the orchestrator confirms it
  with the user at Phase 0d (one prompt, the matrix result pre-selected as
  `(Recommended)`).
- The resolved tier is passed to the children that accept `--tier` (`/requirements`,
  `/spec`, `/plan`) and drives the orchestrator's own gate logic; children may
  auto-tier-escalate, in which case the divergence is logged, not overridden.
