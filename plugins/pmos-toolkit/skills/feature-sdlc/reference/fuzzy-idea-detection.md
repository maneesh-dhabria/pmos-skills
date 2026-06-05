# Fuzzy-idea detection (Phase 1a)

Deterministic heuristic used by `/feature-sdlc` Phase 1a to classify the run's seed as **fuzzy** (warrants `/ideate`) or **formed** (skip straight to `/requirements`). Mirrors the shape of `frontend-detection.md` — small, transparent, side-effect-free.

## Inputs

| Name | Type | Source |
|---|---|---|
| `seed_text` | string | The user's argument string to `/feature-sdlc` (or to `/feature-sdlc skill`), with recognised flags removed (`--tier`, `--resume`, `--no-worktree`, `--format`, `--non-interactive`, `--interactive`, `--backlog`, `--minimal`, `--no-ideate`, `--from-feedback`, `--from-reflect`) and surrounding quotes stripped. |
| `doc_attached` | bool | `true` iff the user supplied a `--doc <path>` (or the `--from-feedback <path>` resolved to a real file). |

## Output

`seed_shape ∈ {fuzzy, formed}`.

## Rules (apply in order; first hit wins)

1. **`doc_attached == true` → `formed`.** The user supplied a structured document; assume they did the framing work.
2. **`wordcount(seed_text) >= 80` → `formed`.** A substantial seed; the framing has been done in writing.
3. **`seed_text` contains a vagueness marker (word-boundary, case-insensitive) → `fuzzy`.** Markers:

   ```
   idea | maybe | explore | thinking about | not sure | might | could
   wondering | brainstorm | half-formed | half formed | rough | fuzzy
   ```

   Use the portable word-boundary pattern `($|[^A-Za-z])` (NOT `\b`) — BSD-awk on macOS treats `\b` inconsistently (per `~/.pmos/learnings.md` /readme entry, 2026-05-15).
4. **`wordcount(seed_text) < 20` → `fuzzy`.** Sparse seed; the user has a half-thought, not a framed problem.
5. **Otherwise → `formed`.**

## Worked examples

| Seed | Wordcount | Markers | Doc? | Rule | Outcome |
|---|---|---|---|---|---|
| `"add /ideate to /feature-sdlc before /requirements"` | 7 | none | no | 4 | **fuzzy** |
| `"I have a half-formed idea about a Notion sync"` | 9 | `idea`, `half-formed` | no | 3 | **fuzzy** |
| `"explore what we could do for survey response analysis"` | 9 | `explore`, `could` | no | 3 | **fuzzy** |
| `"Build a survey-analyse skill that reads CSV/XLSX/PDF exports, runs per-question-type Python helpers, dispatches a fresh open-end-coding subagent per text column, applies Holm correction by default with plain-language framing..."` | 35+ | none | no | 5 | **formed** |
| `"Fix the BSD-awk \\b portability bug in scripts/rubric.sh"` | 8 | none | no | 5 | **formed** (concrete bug, no vagueness marker) |
| Any seed | — | — | yes | 1 | **formed** |

## Why these thresholds

- **80 words = formed (rule 2).** Empirically the floor where a seed contains: a problem statement + user/scope + at least one constraint. Below this, premature framing risks `/requirements` re-asking the brainstorm.
- **20 words = fuzzy (rule 4).** Short one-liners almost always lack a who/why/constraint triad; `/ideate` adds these.
- **Vagueness markers (rule 3) win over wordcount.** A 60-word seed that says "I'm wondering if maybe we should explore..." is still fuzzy regardless of length — the user is signaling uncertainty.
- **Doc attached (rule 1) ends the analysis early.** Users who took the time to attach a document have framing in hand.

## What this heuristic deliberately does NOT do

- **No LLM judgement.** Per `frontend-detection.md` precedent: heuristics are deterministic, fast, and surface uncertainty to the user via the gate prompt. Anti-pattern #5 in `SKILL.md` extends here.
- **No tier inference.** Tier is set by `--tier` or by `/requirements` auto-tier or (in skill modes) Phase 0d. Fuzzy-detection is orthogonal to tier.
- **No false-positive tolerance for `skill-feedback` mode.** In that mode the phase is **not presented** at all (mode-conditional non-presentation) — this heuristic only runs in `feature` + `skill-new`.
