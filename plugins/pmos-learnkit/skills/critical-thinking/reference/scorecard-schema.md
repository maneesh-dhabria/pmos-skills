# scorecard-schema.md — the persistent practice scorecard

The scorecard tracks a PM's critical-thinking practice across sessions so the skill can (a) weight the mix toward under-practiced muscles and (b) show an objective "you're improving" signal. Managed by `scripts/scorecard.js` (node stdlib; atomic writes).

## Location

`~/.pmos/learnkit/critical-thinking/scorecard.json` — created on first run. Override for testing with the `SCORECARD_PATH` env var.

## Schema (`version: 1`)

```json
{
  "version": 1,
  "sessions": [
    { "date": "2026-05-29", "band": "Deep",
      "shapes": ["pick-and-defend", "calibration"],
      "muscles_practiced": { "assumptions": { "seen": 1, "strong": 1 } } }
  ],
  "muscle_scores": { "<muscle>": { "seen": 3, "strong": 2 } },
  "calibration": { "predictions": [{ "p": 0.7, "outcome": 1 }], "brier": 0.09 },
  "streak": { "last_session_date": "2026-05-29", "count": 4 }
}
```

| Key | Meaning |
|---|---|
| `sessions[]` | one entry per completed session (date, band, shapes used, muscles practiced) |
| `muscle_scores` | per-muscle running totals: `seen` (times exercised) and `strong` (times the move was done well) |
| `calibration.predictions[]` | every `{p, outcome}` pair from calibration exercises (`outcome` ∈ {0,1}) |
| `calibration.brier` | **Brier score** = mean((p − outcome)²); **lower is better** (0 = perfect, 0.25 = a coin-flip guesser). `null` until the first prediction. |
| `streak` | consecutive-day count; increments on the next calendar day, resets after a gap > 1 day |

## Brier score

`brier = (1/N) · Σ (pᵢ − outcomeᵢ)²`. It rewards both accuracy and honest confidence: claiming 0.9 and being wrong is punished harder than claiming 0.6. The accumulating Brier across sessions is the headline "are my probability judgments getting better" metric.

## Helper CLI (`scripts/scorecard.js`)

- `node scorecard.js read` — print the scorecard (seeds an empty one if absent).
- `node scorecard.js update <session.json>` — merge a session delta atomically, recompute Brier + streak, print the summary.
- `node scorecard.js summary` — print weakest muscle + Brier + streak.

**Session delta shape** (what the skill passes to `update`):

```json
{ "date": "2026-05-29", "band": "Standard",
  "shapes": ["assumption-hunt", "spot-the-bias"],
  "muscles": { "assumptions": { "seen": 1, "strong": 1 }, "spot bias": { "seen": 1, "strong": 0 } },
  "predictions": [{ "p": 0.6, "outcome": 1 }] }
```

## Degradation

If `node` is unavailable, the skill body reads/writes this JSON itself and computes Brier inline (logging a one-line note). A missing or corrupt file is reseeded with a stderr warning — the skill never crashes on scorecard I/O.
