# Reference resolution & the interviewer model

How `/interview-feedback` decides **which** interviewer-reference + scorecard a round uses, and how a round's **interviewer roster** (lead / shadow / panel) shapes output (b). Cited from SKILL.md Phase [Resolve](../SKILL.md#resolve) and Phase [Coach](../SKILL.md#coach). Design §7 (reference override) + §8 (interviewer model).

## Reference resolution (§7)

For the round being scored, resolve the interviewer-reference and the scorecard **independently** (a round may override one but not the other), each by this precedence — first hit wins:

1. **`--reference <path>`** — an explicit per-invocation override. A directory → look inside for `interviewer-reference.html` and `scorecard.html`; a single file → use it for whichever artifact it names (`*reference*` → reference, `*scorecard*`/`*scoring*` → scorecard). An explicit override that resolves to nothing is an error, not a silent fall-through — surface it.
2. **Round-level guideline** — `<role-dir>/guidelines/<round>/{interviewer-reference.html, scorecard.html}`. This is the default for a configured role.
3. **Role-level default** — if a round has no own guideline, fall back to the role's default round guideline (the first round whose archetype matches, else the role's generic guideline). Record that a fallback was used.

**Non-interactive ambiguity.** If precedence leaves resolution ambiguous (e.g. two override files both match `*scorecard*`, or no round-level guideline and multiple role-level candidates), DEFER under `--non-interactive` — log an open question naming the candidates and stop short of guessing. Interactive runs ask. This mirrors the non-interactive block's classifier; it never silently picks.

**Foreign scorecard.** A resolved scorecard that lacks the canonical machine anchors (no `data-card="scorecard"`) is handled by `scripts/fill-scorecard.mjs parse` (`anchored:false`) — the skill infers dimensions from the DOM and echoes them for confirmation (interactive) or logs each inference as an open question (non-interactive) before filling. See Phase [Score](../SKILL.md#score).

## Interviewer model (§8)

Each round in `role.json` carries `interviewers: [{ name, role }]` with `role ∈ {lead, shadow, panel}`:

- **lead** — runs the round and owns the scorecard. Output (b) holds the lead to the **full** interviewer-effectiveness rubric (all 8 dimensions in `interviewer-effectiveness.html`).
- **shadow** — observing to calibrate. Scored on a **reduced** set (note-quality, calibration, bias-mitigation); not held to talk-time/coverage since they are not driving. Output (b) says so.
- **panel** — one of several interviewers in a shared session (e.g. case presentation). Talk-time-balance is assessed **per panel member**, and area-coverage is a **shared** responsibility (flag gaps to the panel, not to one member).

**Attribution confidence.** When the transcript cannot be attributed to a specific interviewer (refined transcript is timestamps-only; speaker labels are only ever *proposed* from explicit self-introductions — Phase [Transcribe](../SKILL.md#transcribe)), a per-interviewer claim in output (b) carries an **attribution-confidence flag** and, where the evidence basis is the interviewer's own recall, drops to `data-cite-tier="recalled"` with `data-source` naming the interviewer. Never assign a quote to an interviewer the transcript does not support.

## additional_docs

A round's `additional_docs[]` (role.json) are extra context the interviewer reference points to (rubrics, case prompts, take-home specs). They are inputs to scoring, not scored artifacts. Copy them under `guidelines/<round>/additional/`; cite them as `data-cite-tier="notes"` with `data-source` when they ground a claim.
