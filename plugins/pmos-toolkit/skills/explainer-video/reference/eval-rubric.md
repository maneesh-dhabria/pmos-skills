# Self-check rubric — the assembled video

Consumed by `SKILL.md` Phase 6 (`{#assemble}`) and implemented by the self-check in `scripts/assemble.sh`. A modest, binary, **script-computed** gate (no reviewer-subagent loop in v1 — design D7). All arithmetic is done by the script, never the model (§H). Cites `02_design.html` D7; reviewer-subagent framing (if ever extended) would follow `_shared/reviewer-protocol.md`.

**Contents:** [Binary checks](#binary-checks) · [Dependency gate](#dependency-gate) · [Verdict](#verdict)

## Binary checks

Each is pass/fail with a how-to-verify line. The script emits `check_id<TAB>verdict<TAB>evidence` and exits non-zero if any fails.

| check | rule | how to verify |
|---|---|---|
| `frame-slide-parity` | frame count == slide count | `ls frames/slide_*.png \| wc -l` == `jq '.slides \| length' deck.json` |
| `duration-sum` | total video duration ≈ Σ narration durations (±1s or ±2%) | `ffprobe -show_entries format=duration video.mp4` vs `jq '[.[]]\|add' durations.json` |
| `audio-non-silent` | every audio segment is non-silent | per WAV: `ffprobe`/`volumedetect` mean_volume > −90 dB (a silent WAV ≈ −91 dB) |
| `figures-resolved` | every `deck.json` `figure.source` resolved against the inventory | each slide `figure.source` ∈ `figures.json` ids AND its asset embedded in `deck.html` |
| `artifacts-present` | output dir holds all six artifacts | `deck.json`, `deck.html`, `frames/`, `audio/`, `durations.json`, `video.mp4` all exist |

## Dependency gate

Run **before** any work, in Phase 5 (`narrate.sh --check-deps`), because `durations.json` needs `ffprobe`:

- `ffmpeg` AND `ffprobe` both present — a single up-front probe. The install hint names **whichever** is missing (`ffprobe` can be absent even when `ffmpeg` is present): `brew install ffmpeg` (macOS) / `apt install ffmpeg` (Debian/Ubuntu).
- Playwright present (Phase 4, `render-slides.mjs` exits 3 with `npx playwright install chromium` if not).
- A narration engine (`say` or Kokoro) present (Phase 5, `narrate.sh` errors with the install path if not).

A missing dependency is never a silent skip: the live smoke (AC7) is recorded DEFERRED-TO-RELEASE naming the missing binary and the exact re-run command.

## Verdict

All five checks pass → the video is sound; report the durations and frame count. Any fail → surface the failing `check_id` + evidence; the run does NOT claim success. The self-check is advisory-to-the-user but **hard for "done"**: a failing self-check means the mp4 is not deliverable.
