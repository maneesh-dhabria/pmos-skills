# Distillation contract — text → `deck.json`

Consumed by `SKILL.md` Phase 3 (`{#distill}`). The distiller is the only model-judgment stage in the pipeline; this file is the contract it must satisfy. Cites the epic design `02_design.html#distillation-contract`.

**Contents:** [Schema](#schema) · [Hard rules](#hard-rules) · [Length calibration](#length-calibration) · [Figure resolution](#figure-resolution) · [Worked example](#worked-example)

## Schema

`deck.json`:

```json
{
  "title": "string — the video title",
  "length_target": "quick | standard | deep",
  "slides": [
    {
      "idea": "one-sentence single idea (the whole point of this slide)",
      "title": "short slide title",
      "bullets": ["<=3 minimal supports, prefer 0-1"],
      "speaker_notes": "25-50 words narrating THIS one idea, length-calibrated",
      "figure": { "source": "<inventory id>", "kind": "svg | img" }
    }
  ]
}
```

`figure` is optional. `bullets` may be empty (`[]`). Write to `<ev_dir>/<slug>/deck.json` via temp-then-rename.

## Hard rules

1. **One idea per slide (hard).** Each slide carries exactly one idea. If a slide reads like two ideas ("X, and also Y"), split it into two slides before proceeding. Bullets are minimal *support* for the single idea — never a second idea smuggled in as a bullet.
2. **Bullets minimal.** Cap 3; prefer 0–1. The narration (`speaker_notes`) carries the idea; bullets are visual anchors, not the script.
3. **Speaker notes assert.** Notes state the source's actual claim for this idea — not "this slide is about X". They are the literal narration text.
4. **Every `figure` reference resolves.** A slide's `figure.source` MUST equal an `id` in the Phase 2 figure inventory (`figures.json`). An unresolved reference is a Phase 6 self-check failure.

## Length calibration

A **starting point, not a quota** — adapt to the source's natural structure rather than padding or truncating to hit a number (~140 wpm):

| `--length` | Slides | Notes/slide | ≈ pace |
|---|---|---|---|
| `quick` | 5–8 | 25–35 words | ~12–18 s/slide |
| `standard` (default) | 10–16 | 30–45 words | ~15–20 s/slide |
| `deep` | 18–30 | 35–50 words | ~18–22 s/slide |

A 4-section source at `standard` naturally yields ~3 slides/section; a thin source yields fewer slides than the band's floor rather than padding.

## Figure resolution

When a figure from the inventory (`reference/figure-inventory.md`) illustrates a slide's idea, reference it by `id` and place the **original asset** on the slide (Phase 4) instead of paraphrasing it in prose. Text-only fallback when no inventory figure fits the idea. One figure per slide max.

## Worked example

A research-paper section "We cut p99 latency 38% by sharding the write path" with an architecture diagram (`fig_2` in the inventory) distills to:

```json
{
  "idea": "Sharding the write path cut p99 latency 38%.",
  "title": "Write-path sharding",
  "bullets": ["p99: 410ms → 254ms"],
  "speaker_notes": "The team sharded the write path across eight partitions. That single change cut p99 latency thirty-eight percent — from four hundred ten milliseconds down to two fifty-four — with no read-path changes.",
  "figure": { "source": "fig_2", "kind": "svg" }
}
```

One idea (the latency win), one supporting number as a bullet, notes that assert the claim with the exact figures, and the paper's own diagram reused rather than redrawn.
