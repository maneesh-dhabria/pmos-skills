# Presets — semantics + thresholds

Four built-in presets. The user picks one in Phase 2 (or passes `--preset`). The preset controls (a) what "good" looks like in patch prompts, and (b) the threshold values for rubric checks that depend on preset-specific limits.

## Semantics

| Preset       | Sentence target  | Voice                                | Keep                                 |
|--------------|------------------|--------------------------------------|--------------------------------------|
| `preserve`   | Match author     | Mirror author's register             | Idiosyncrasies, varied rhythm        |
| `concise`    | <18 words avg    | BLUF, definition-dense               | Specifics, tables, lists             |
| `narrative`  | Varied (8–28)    | Conversational, single thesis        | Anecdotes, rhythm                    |
| `technical`  | <20 words avg    | Imperative, second person ("you")    | Code-first, decisions upfront        |

## Threshold defaults

| Threshold key                       | preserve | concise | narrative | technical |
|-------------------------------------|----------|---------|-----------|-----------|
| `passive_max_pct`                   | 25       | 15      | 25        | 15        |
| `sentence_stddev_min`               | 4        | 4       | 6         | 4         |
| `em_dash_per_200w_max`              | 2        | 1       | 3         | 1         |
| `tricolon_max_per_500w`             | 3        | 2       | 3         | 2         |
| `section_min_words_per_heading`     | 30       | 50      | 40        | 30        |

These are starting-point defaults. Users override per-preset in `~/.pmos/polish/custom-checks.yaml` under a `thresholds:` block. Calibrate after first real-world use.

## Patch-prompt instructions per preset

When generating patches (Phase 5), include a preset-specific instruction in the prompt:

- **`preserve`** — *"Keep the author's voice markers as the primary constraint. Fix violations only when you can do so without flattening the markers. Emit `PRESERVE_VOICE_CONFLICT` if you cannot."*
- **`concise`** — *"Bottom Line Up Front. Definition-dense. Prefer short sentences. Cut anything that doesn't advance the claim."*
- **`narrative`** — *"Vary sentence rhythm (short ↔ long). Conversational register. Concrete anecdotes over abstract claims. One thesis, sustained."*
- **`technical`** — *"Imperative voice. Second person ('you'). Decision rationale upfront. Code-first. No marketing tone."*

## Recommendation logic (Phase 2)

Classifier output → recommended preset:

| Classifier signal                                   | Recommended preset |
|------------------------------------------------------|--------------------|
| `README*`, `CHANGELOG*`, `*.adr.md`, `runbook*`     | `technical`        |
| `PRD*`, `spec*`, `*_requirements.md`, `memo*`       | `concise`          |
| `*.blog.md`, `posts/*`, `essay*`                    | `narrative`        |
| Frontmatter `type: <one of presets>`                | use `type:` value  |
| LLM classifier confidence ≥ 0.6                     | classifier output  |
| LLM classifier confidence < 0.6 OR no signal        | `preserve`         |
