# `survey.json` — schema reference (authoritative)

Loaded on demand by `/survey-design` Phase 3 (generation) and consulted by the Phase-4 reviewer and any consumer of the IR (e.g. `/survey-analyse --survey-json`). The skill writes exactly this shape; the invariants at the bottom are enforced on every write.

## Top-level object

```json
{
  "schema_version": 2,                         // (req) int
  "title": "Trial conversion — exit survey",   // (req) string
  "purpose": "Understand why recent trial users did not upgrade.",  // (req) string — the research goal
  "mode": "generative",                        // (req) "generative" | "evaluative" | "hybrid"
  "audience": "People who started a trial in the last 30 days and did not upgrade.",  // (req) string
  "time_budget_min": 3,                        // (req) int — target completion minutes
  "estimated_minutes": 2.7,                    // (req) number — the skill's estimate (time constants below)
  "max_questions": null,                       // int | null
  "intro": {                                   // (req)
    "text": "Thanks for trying <Product>. We're figuring out which gaps actually block people who try a paid plan — your answers (about 3 minutes) decide which ones we fix first this quarter. Responses are confidential.",  // (req) string — MUST carry a persuasive, honest WIIFM sentence (SKILL.md Phase 3 build step)
    "response_impact": "decides which trial-blocking gaps we fix first this quarter",  // string | null — the Phase-2 intake variable; null when the author didn't state it
    "consent_required": false,                 // bool — if true, an explicit "I agree" gate precedes Q1
    "anonymous": false,                        // bool — MUST be false if any PII question exists
    "estimated_seconds": 15,                   // number
    "thankyou": "Thanks — your feedback helps."  // string | null — shown on the final screen
  },
  "sections": [                                // (req) array, >= 1
    {
      "id": "screening",                       // (req) kebab id, unique
      "title": "First, a quick check",         // (req) string
      "description": null,                     // string | null — signpost text
      "randomize_questions": false,            // bool — never true for screening / ordinal-dependent sections
      "questions": [ /* question objects, below */ ]   // (req) array, >= 1
    }
  ]
}
```

**Schema version & migration.** Current `schema_version` is `2`. A `schema_version: 1` `survey.json` (or one parsed from an existing-survey file) is still valid **input** — the skill reads it, then writes `schema_version: 2` on the next re-derive. v2 **removes no v1 field**; the only additions over v1 are `intro.response_impact` and the `multi_field_open` question type (added to the `type` enum, with a `fields[]` array).

## The question object

```json
{
  "id": "q-hoped-to-do",            // (req) kebab id, unique across the whole survey
  "type": "open_long",              // (req) one of the type enum below
  "stem": "What were you hoping to accomplish when you started the trial?",  // (req) string
  "help_text": null,                // string | null — shown under the stem
  "required": false,                // (req) bool
  "reference_period": null,         // string | null — e.g. "in the past 7 days"; REQUIRED for retrospective/frequency questions
  "screening": false,               // bool — true => the answer drives skip logic; screening questions come first
  "skip_logic": null,               // null | { "on_value": <choice-value or [values]>, "action": "skip_to" | "end_survey", "target_section_id": <id|null> }
  "randomize_options": false,       // bool — true only for nominal (unordered) option lists; never for ordinal scales

  "options": [                      // for single_select / multi_select / forced_choice_grid (rows live in `rows`) / ranking
    { "value": "price", "label": "The price was too high" }
  ],
  "other_option": false,            // bool — appends an "Other (please specify)" free-text option
  "opt_out_options": [],            // array of {value,label} appended & visually separated, e.g. [{"value":"na","label":"Not applicable"},{"value":"dk","label":"Don't know"},{"value":"pnts","label":"Prefer not to say"}]

  "scale": {                        // for rating / nps
    "points": 5,                    // int — 5 or 7 default; NPS implies 11 (0..10)
    "min": 1, "max": 5,             // ints — NPS: 0..10
    "labels": { "min": "Not at all satisfied", "mid": "Neither", "max": "Extremely satisfied" },  // pole labels; "mid" only for odd scales
    "balanced": true                // bool — equal #positive/#negative around the midpoint (MUST be true unless `purpose` forces a forced-choice even scale)
  },

  "rows": [ { "id": "r-ease", "label": "Ease of use" } ],   // for forced_choice_grid / matrix — the items being rated
  "columns": [ { "value": "poor", "label": "Poor" } ],      // for matrix — the shared scale columns

  "constant_sum_total": 100,        // for constant_sum

  "fields": [                       // for multi_field_open ONLY — one single-line free-text input per field
    { "id": "daily", "label": "Daily active users", "placeholder": "e.g. 1,200" }   // id kebab & unique within the question; placeholder string | null
  ]
}
```

## The `type` enum

- `single_select` — radio, pick one. MECE options, ~4–5 for attitudinal, `opt_out_options` recommended.
- `multi_select` — checkboxes. Discouraged where per-item prevalence matters; if used, `randomize_options: true`.
- `forced_choice_grid` — Yes/No per item; the recommended replacement for "select all that apply". Columns implicitly Yes/No, optionally + "N/A".
- `rating` — Likert / unipolar scale. Construct-specific labels, *not* agree/disagree; balanced, poles labeled, opt-out separate.
- `nps` — 0–10 recommend-likelihood; the skill SHOULD add an open follow-up automatically.
- `dichotomous` — Yes/No single. Add a "Don't know" opt-out when uncertainty is plausible; don't force a binary on a continuum.
- `open_short` — single-line free text. `help_text` SHOULD hint the expected length.
- `open_long` — multi-line free text. The generative workhorse; keep to a few per survey.
- `ranking` — rank a short list. ≤ 5–7 items; for longer lists emit a "top-3 pick" `multi_select` instead.
- `matrix` — rate many items on a shared scale. ≤ ~7 rows, consider splitting, randomize rows, per-item on mobile.
- `constant_sum` — allocate N points across items. Cognitively heavy; small item count.
- `multi_field_open` — a shared stem + one single-line free-text input **per field** (the recommended shape for "metrics by cadence"–style items, e.g. one labeled input each for daily / weekly / monthly active users). Uses a `fields: [{id,label,placeholder}]` array, not `options`/`scale`/`rows`/`columns`/`constant_sum_total`; `opt_out_options` may still apply to the whole group. Counts as **one** question toward `max_questions` and the progress counter. Not a routable question — `skip_logic`/`screening` must stay null/false.
- `statement` — display-only (section intro / instructions). Not a question; `required` ignored; not counted toward `max_questions` or the time estimate.

## Schema invariants

The skill enforces these on write, and any consumer may re-check:

- All `id`s kebab-case and unique across the whole survey.
- `intro.anonymous: true` forbids any PII question — say "confidential", not "anonymous", if you can re-identify.
- `rating`/`nps` scales `balanced: true` unless `purpose` explicitly justifies a forced even scale.
- Ordinal types (`rating`, `nps`, `matrix` with an ordinal scale) never have `randomize_options: true`.
- `skip_logic.target_section_id` (when `action` is `skip_to`) MUST reference an existing **later** section — if a generated or parsed survey has a backward jump, rewrite it forward or drop it and note the change (SKILL.md E14).
- Retrospective/frequency stems MUST set `reference_period`.
- `required: true` on a sensitive item (income, health, demographics, politics, anything PII-adjacent) MUST be accompanied by an `opt_out_options` entry.
- `multi_field_open` MUST carry a `fields` array of length ≥ 1 with kebab-case `id`s unique within that question, and MUST NOT carry `options` / `scale` / `rows` / `columns` / `constant_sum_total`, nor a non-null `skip_logic` or `screening: true` (no other type carries `fields`).

## Time-cost constants (for `estimated_minutes`; tunable)

Per-question seconds: `open_short` / `open_long` = 30; `single_select` / `multi_select` / `dichotomous` = 8; `rating` / `nps` = 6; `matrix` / `forced_choice_grid` = 5 **per row**; `ranking` = 5 per item; `constant_sum` = 8 per item; `multi_field_open` = 30 **per field** (each field is costed like an `open_short`); `statement` = 5 (read time). Plus the intro/consent screen = `intro.estimated_seconds` (default 15). `estimated_minutes` = (Σ of the above) ÷ 60, rounded to one decimal.

---

*Moved out of SKILL.md §3.1–3.3 in the 2026-06-10 skill-design review (progressive disclosure — the IR contract is needed only at generation/review time). Spec lineage: `docs/pmos/features/2026-05-11_survey-design-skill/02_spec.html` (schema v1), `2026-05-11_update-skills-survey-design-fixes` (v2 additions).*
