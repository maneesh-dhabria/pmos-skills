# `/explainer-video` — design

**Date:** 2026-06-12
**Plugin:** pmos-toolkit
**Status:** Design approved (brainstorming) — pending build via `/skill-sdlc`

## Problem

PMs want to turn a document, a pmos artifact, or a web page into a short **explainer video** — a narrated slideshow they can share with stakeholders. Today this means manually building a deck, recording a voiceover, and editing video. The skill automates that into a single command, fully local and at zero recurring cost.

## Constraints (hard)

- **No TTS API spend, ever.** Narration must come from a free, local, file-writing engine. Cloud TTS is excluded entirely — not even as an opt-in. (Locked by user.)
- **Local-first, Mac-first.** Runs offline on macOS with system tools; neural quality is an opt-in local upgrade, never a paid service.
- **No build step / no SaaS** in the runtime path.

## Crux finding from research

The browser Web Speech API (`SpeechSynthesis`) **cannot export audio to a file**. `speak()` plays straight to the OS audio device — no `MediaStream`/`AudioBuffer` — and `MediaRecorder`/`getDisplayMedia` cannot capture it (Chromium bug 1185527; WICG/speech-api#69, open). The only capture path is an OS-loopback driver (e.g. BlackHole) requiring manual per-machine setup that records all system audio. **Therefore "browser TTS + ffmpeg" is not viable.** We use engines that write audio data directly: macOS `say` (default) and Kokoro (`kokoro-onnx`, opt-in neural).

Reference implementation that already follows the chosen pipeline: <https://github.com/pjdoland/deck2video>.

## Architecture — six stages

```
input ──▶ [1] ingest ──▶ plaintext + figures ──▶ [2] distill (LLM) ──▶ deck.json
                                                                          │
                                  deck.html ◀── [3] author-deck ◀────────┘
                                      │
                  frames/slide_NN.png ◀── [4] capture (Playwright)
                  audio/slide_NN.wav  ◀── [5] narrate (say | Kokoro) ──▶ durations.json
                                      │
                              [6] assemble (ffmpeg) ──▶ video.mp4  (+ optional captions)
```

| Stage | Mechanism | Reuse |
|---|---|---|
| **1. Ingest** | `ingest.mjs` resolves input → clean text **and an inventory of embedded figures** (SVGs/images). URL = fetch + readability strip; adapters for `.md` / `.html` / `.txt` / `.pdf`; pmos artifacts read their sections + owned SVGs. | new (small) |
| **2. Distill** | In-session LLM turns text into `deck.json`. The only model-judgment step. Honors the length calibration, the one-idea-per-slide rule, and figure reuse (below). | — |
| **3. Author deck** | `deck.json` → self-contained `deck.html`, one `<section id>` per slide; speaker notes in `data-notes` + sidecar; referenced figures placed as the original asset. | **`_shared/html-authoring`** substrate (`render.js`, `template.html`, `conventions.md`) |
| **4. Capture** | `render-slides.mjs` — Playwright headless, screenshot each slide `<section>` at 1920×1080 → `frames/slide_NN.png`. Slim, slide-specific (not design-crit's crawl/journey modes). | patterned on `design-crit/assets/capture.mjs`; Playwright-detection reused |
| **5. Narrate** | `narrate.sh` — `detect_tts()` prefers Kokoro if installed, else macOS `say -o slide_NN.wav --file-format=WAVE`. One WAV per slide; `ffprobe` → `durations.json`. Flags: `--voice`, `--rate`. | **whisper-if-installed pattern** from `magazine/scripts/transcribe.sh` |
| **6. Assemble** | `assemble.sh` — per slide: `ffmpeg -loop 1 -i frames/slide_NN.png -i audio/slide_NN.wav -c:v libx264 -tune stillimage -pix_fmt yuv420p -c:a aac -ar 44100 -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -shortest seg_NN.mp4`; then `concat -c copy`. Optional `.srt` from notes + durations, burned in. | ffmpeg (system tool) |

## Distillation contract (Stage 2)

`deck.json`:

```json
{
  "title": "…",
  "length_target": "standard",
  "slides": [
    { "idea": "one-sentence single idea",
      "title": "short slide title",
      "bullets": ["≤3 minimal supports, often 0–1"],
      "speaker_notes": "25–50 words narrating THIS one idea",
      "figure": { "source": "<path|anchor>", "kind": "svg|img" }  // optional
    }
  ]
}
```

Rules the distiller must obey:

- **One idea per slide (hard).** Each slide carries exactly one idea. Bullets are minimal support for that single idea (cap 3; prefer 0–1). The self-check flags any slide that reads like two ideas and the distiller re-splits before proceeding.
- **Length calibration (starting point, not a quota).** Target from `--length`:

  | Length | Slides | Notes/slide | ≈ pace (~140 wpm) |
  |---|---|---|---|
  | `1-2 min` (quick) | 5–8 | 25–35 words | ~12–18 s/slide |
  | `3-5 min` (standard, default) | 10–16 | 30–45 words | ~15–20 s/slide |
  | `5-10 min` (deep) | 18–30 | 35–50 words | ~18–22 s/slide |

  The distiller adapts to the source's natural structure rather than padding/truncating to hit a number.
- **Reuse source figures.** When the source contains a figure (pmos owned SVG, `<figure>`, image) that illustrates a slide's idea, reference it via `figure` and place the **original asset** on the slide instead of paraphrasing it in prose. Text-only fallback when no figure fits.

## Key decisions

- **D1 — Timing model:** one narration clip ⇄ one slide; slide held for the clip's exact `ffprobe` duration. Deterministic, no ASR. Sub-slide bullet reveals / word-sync deferred to v2.
- **D2 — TTS default + upgrade:** macOS `say` works on any Mac with zero install; if `kokoro-onnx` is detected, use it automatically and emit a one-line "better voices available" nudge with the install command. No auto-install, no cloud.
- **D3 — Output layout:** `{docs_path}/explainer-video/<YYYY-MM-DD>_<slug>/` containing `deck.json`, `deck.html` (annotatable pmos artifact), `frames/`, `audio/`, `durations.json`, `video.mp4`; plus the substrate `index.html` entry.
- **D4 — Video format:** 1920×1080, 16:9, H.264 / AAC, `+faststart`. Captions on by default (`--no-captions` to disable).
- **D5 — Hard gates:** ffmpeg required (install hint if missing); Playwright detected the way design-crit does. On non-Mac without Kokoro → clear error pointing at the Kokoro install (since `say` is Mac-only).
- **D6 — Length flag:** `--length quick|standard|deep` with NL forms (`1-2 min` / `3-5 min` / `5-10 min`); typed value that changes output → a contract flag (§I). Default `standard`. If unspecified and interactive, ask once.
- **D7 — Self-check (modest v1):** frame count == slide count; video duration ≈ Σ clip durations; audio tracks non-silent; every `figure` reference resolved. No heavyweight reviewer-subagent loop in v1.

## Packaged scripts

- `ingest.mjs` — input → `{ text, figures[] }` (md/html/txt/pdf/url adapters; pmos-artifact reader). `--selftest`.
- `render-slides.mjs` — `deck.html` → `frames/slide_NN.png` (Playwright). `--selftest`, Playwright-missing exit code.
- `narrate.sh` — speaker notes → `audio/slide_NN.wav` + `durations.json`; `detect_tts()` (Kokoro → `say`); `--voice`, `--rate`, `--selftest`, `--detect`.
- `assemble.sh` — frames + audio → `video.mp4` (+ optional captions); `--no-captions`, `--selftest`.
- Deck authoring uses the `_shared/html-authoring` substrate (cite, don't restate the contract).

All scripts: zero npm deps where possible, bash-3.2-safe, honest exit codes, self-tests — matching repo conventions (`magazine`, `design-crit`).

## Scope / YAGNI

**In (v1):** the 6-stage pipeline; three input types (pmos artifact / local doc / URL); `say` + Kokoro; length calibration; one-idea-per-slide; figure reuse; captions; single 1920×1080 16:9 output.

**Out (v2 candidates):** sub-slide animation/reveal timing; whisperX word-sync; background music; transitions / Ken-Burns motion; vertical/social aspect ratios; multi-language; a reviewer-subagent quality loop; auto-install of Kokoro.

## Open questions for build

- Exact `say` voice default and whether to nudge installing Enhanced/Premium voices (better quality, hundreds of MB, manual download).
- Whether `deck.html` should also be playable as a live narrated deck in-browser (audio elements wired to slides) in addition to the mp4 — cheap to add, possibly v1.1.
- Kokoro detection specifics (CLI vs `python -m`) and the exact install nudge string.

## Build path

Per repo CLAUDE.md, skills in this repo are authored via the SDLC pipeline (`/skill-sdlc` → `/feature-sdlc skill`), **not** superpowers `writing-plans`. This design doc is the seed/spec for that run. (User instructions / CLAUDE.md take precedence over the brainstorming skill's default terminal step.)
