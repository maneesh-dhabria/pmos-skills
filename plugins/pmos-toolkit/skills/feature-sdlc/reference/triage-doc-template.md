<!-- pmos:feedback-triage v=1 -->
# Feedback triage — {YYYY-MM-DD} — {slug}

> This template's *structure* (findings table / critique table / disposition log /
> approved-by-skill / per-skill tier) is what `/feature-sdlc` Phase 0c reuses — but
> Phase 0c renders it through the HTML substrate as
> `{feature_folder}/0c_feedback_triage.html`, not as a standalone markdown file. This
> file was lifted from the (now-archived) `/update-skills` skill; the only changes on
> move were generalising the `update-skills`-specific path/marker framing.

**Source:** {raw text | file: <path> | --from-reflect: run <n> at <timestamp>}
**Feature folder:** {feature_folder}  (the `/feature-sdlc` run's feature folder)
**Affected skills (in scope):** {comma-separated skill names}
**Out-of-scope skill mentions:** {list with reason; or "none"}

> Resume via `/feature-sdlc --resume` — Phase 0c is a normal pipeline phase; its completion is recorded in `state.yaml` like any other phase, not via this header marker.

---

## Findings (parsed)

| # | Skill | Severity | Finding (one line) | Evidence (≤2 lines) | Proposed fix (verbatim from input) |
|---|-------|----------|--------------------|---------------------|-------------------------------------|
| 1 |       |          |                    |                     |                                     |

## Critique

| # | Already handled? | Classification | Recommendation | Rationale (one line) | Scope hint |
|---|------------------|----------------|----------------|----------------------|------------|
| 1 | yes/no/partial   | bug \| UX-friction \| new-capability \| nit | Apply \| Modify \| Skip \| Defer | … | small \| medium \| large |

## Disposition log

| # | User disposition | Notes / Skip reason / Modified text |
|---|------------------|-------------------------------------|
| 1 |                  |                                     |

## Approved changes by skill

### /<skill-name-1>

- Finding #N — <one-line summary> — <Apply | Modified-as: …>
- Finding #M — …

### /<skill-name-2>

- …

## Per-skill tier

| Skill | Approved-change count | Recommended tier | Run tier (= max) | Rationale |
|-------|-----------------------|------------------|------------------|-----------|
|       |                       | Tier N           | Tier N           |           |

(The downstream pipeline status — `/requirements → /spec → /plan → /execute → /verify
→ /complete-dev` per skill — lives in `/feature-sdlc`'s `00_pipeline.html` and
`state.yaml`, not here. This triage doc captures only what Phase 0c produces: the
parsed findings, the critique, the user's dispositions, the approved-by-skill set,
and the per-skill / run tier.)
