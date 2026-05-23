# 0c — Feedback triage

**Mode:** skill-feedback
**Target skill:** `/feature-sdlc`
**Feedback source:** `<inline-text>`

## Findings (parsed)

### F1 — Add `/ideate` as a Phase-0 stage before `/requirements`

- **severity:** enhancement
- **classification:** new-capability
- **already_handled:** no
- **scope_hint:** medium
- **evidence (verbatim):** "I want to add /ideate also the /feature-sdlc pipeline before /requirements phase. In cases where the user has a fully formed idea and only needs to flesh out requirements that is ok but there are many times when they need to /ideate first followed by /grill --deep if it's a big idea."
- **proposed_fix (verbatim):** Add `/ideate` as a phase that runs before `/requirements`. Skip silently when the user has a fully-formed idea; offer to run when fuzzy. Chain `/grill --deep` after `/ideate` when the idea is big (Tier-3).

## Critique (per-finding)

### F1 critique

- The proposed addition is consistent with the existing optional-stage pattern (`/creativity`, `/wireframes`, `/prototype`, `/retro`) — soft gate, recommended-default, mode-conditional.
- Gate model (locked in prior turn): auto-detect fuzzy vs. formed; confirm-on-fuzzy; auto-`/grill --deep` after `/ideate` for Tier-3; persist brief into feature folder and consume in `/requirements`.
- Hardness: **soft** (skippable / not-presented when seed is clearly formed). Auto-skip-on-formed is a **mode-conditional non-presentation** of the gate (per existing Anti-pattern #4 carve-out for `--minimal` and skill-mode 3b/3c suppression), not a silent skip of a presented gate.
- Modes: `feature` + `skill-new`. **NOT** `skill-feedback` — that mode's seed is a structured per-skill finding set (built at 0c), already formed by definition.

## Disposition log

| # | Finding | User disposition | Notes |
|---|---|---|---|
| F1 | Add `/ideate` Phase-1.5 | **Apply as recommended** | Three sub-options also locked: gate=auto-detect+confirm; grill-chain=auto-on-Tier-3; artifact=persist+consume |

## Approved changes by skill

### `/feature-sdlc`

1. New **Phase 1.5: /ideate gate** (soft, runs in `feature` + `skill-new` modes only) between Phase 1 (init-state) and Phase 2 (/requirements).
2. Fuzzy-idea detection heuristic in a new `reference/fuzzy-idea-detection.md`.
3. Auto-`/grill --deep` chain when the post-`/ideate` tier estimate is 3 (or `--tier 3` was explicit).
4. Brief persisted to `{feature_folder}/00d_ideate.html` (+ `.md` sidecar when `output_format=both`); same for `00d-grill_ideate.html` when grill chained.
5. Phase 2 `/requirements` invocation passes the brief path as additional seed context.
6. `state.yaml` schema (v4 additive) gains `ideate` phase entry for `feature` + `skill-new` modes; new fields `seed_shape`, `ideate_tier_estimate`, `ideate_brief_path`, `grill_deep_chained` on that phase entry.
7. `argument-hint` adds `--no-ideate` flag for explicit bypass; `description` frontmatter adds "fuzzy idea" trigger phrases.
8. Anti-pattern list gains entry #14 on "skipping `/ideate` gate without the auto-detect classifier".

## Per-skill tier

- `/feature-sdlc`: **Tier 2** (medium-scope enhancement — one new soft phase, one new reference doc, additive state-schema field, no breaking change). Per `reference/skill-tier-matrix.md` row "single new phase, single new reference file, no migration".

**Run tier:** 2 (single skill in scope).
