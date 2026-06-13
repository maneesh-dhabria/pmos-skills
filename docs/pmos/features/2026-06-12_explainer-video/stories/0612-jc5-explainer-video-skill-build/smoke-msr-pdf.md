# Live end-to-end smoke — /explainer-video vs the MSR research PDF (AC7)

**Story:** 0612-jc5 · **Date:** 2026-06-13 · **Driver:** `build:3e313489` (Loop-2 build) · **Outcome (Loop-2):** **DEFERRED-TO-RELEASE** (one dep absent: the `playwright` npm library) · **Outcome (Loop-3 release, 2026-06-13):** ✅ **CLEARED — full PDF→mp4 pipeline ran green** (see "Release clearance" below).

## Target

`/explainer-video https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/main-14.pdf --length standard`

A dense, multi-section, figure-bearing research PDF (814 KB, PDF 1.5) — chosen to exercise every stage: PDF ingest (native Read pages), figure inventory, dense→one-idea-per-slide distillation, narration, assembly.

## Host dependency probe (AC7 is dep-guarded — no silent skip)

| Dependency | Stage | Present on this host? |
|---|---|---|
| `ffmpeg` | 6 assemble | ✅ `/opt/homebrew/bin/ffmpeg` |
| `ffprobe` | 5 narrate / 6 self-check | ✅ `/opt/homebrew/bin/ffprobe` |
| narration engine (`say`) | 5 narrate | ✅ `/usr/bin/say` (macOS) |
| `playwright` npm library + Chromium | 4 capture | ❌ **ABSENT** — only `@playwright/mcp` (the MCP server) is installed, and not under the active node's global root (`npm root -g` = `/usr/local/lib/node_modules`; nothing there) |

Because the Playwright **capture** library is absent, the slide-capture stage (`render-slides.mjs`) cannot run, so the full PDF→`video.mp4` path cannot complete on this host. Per AC7 this is recorded **DEFERRED-TO-RELEASE** — never marked passed on a host that cannot run the whole pipeline.

### Exact re-run command (clears the deferral)

```sh
npm i -g playwright && npx playwright install chromium
/explainer-video https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/main-14.pdf --length standard
```

`/complete-dev` (Loop 3) must clear this deferral before shipping epic 0612-gd0.

## What WAS verified live on this host (real binaries, real output)

The deferral is isolated to the one absent dep. Every other stage was exercised for real, not mocked:

- **Stage 1 ingest (`ingest.mjs`) — LIVE PASS.** Run against a real HTML page with four `<img>`s: correctly kept the two real figures (`fig_1` p99-latency chart, `fig_2` architecture diagram) with relative `src`s resolved against the page base (`https://ex.com/research/…`), and **dropped** the nav logo (path-role filter) and the 1×1 tracking pixel (size filter). Emitted a valid `figures.json`.
- **PDF figure path — LIVE PASS.** `sips -s format png source.pdf` rasterized the paper's pages parser-free (native macOS, no poppler/`pdftotext`/JS PDF lib) — the design's "in-session visual reader" route for PDF figures, proving a real figure asset can be sourced from the PDF for reuse.
- **Stage 5 narrate (`narrate.sh`) — LIVE PASS.** macOS `say` synthesized two real WAVs from speaker notes (`slide_01.wav` 6.16 s, `slide_02.wav` 6.31 s) and wrote `durations.json = [6.157483, 6.312948]` via `ffprobe`. The Enhanced-voice nudge fired once (only compact voices installed). The ffmpeg+ffprobe up-front hard gate passed.
- **Stage 6 assemble (`assemble.sh`) — LIVE PASS.** ffmpeg built a real **1920×1080 H.264/AAC** `video.mp4` (12.49 s, +faststart, burned-in `.srt` captions). The binary self-check then passed:
  - `frame-slide-parity` pass — frames=2 == slides=2
  - `duration-sum` pass — video 12.493 s ≈ Σ durations 12.470 s (within tolerance)
  - `audio-non-silent` pass — both segments above −90 dB
  - `artifacts-present` pass — `video.mp4` written
  - (`figures-resolved` not exercised here — the 2-slide verification deck carries no `figure` refs; the check's logic is unit-covered.)

Artifacts from the live partial run live beside this log at `docs/pmos/explainer-video/2026-06-13_msr-smoke/` (`source.pdf`, `deck.json`, `frames/`, `audio/`, `durations.json`, `video.mp4`, `figures.json`).

> Note: in the live partial run, the two 1920×1080 frames were generated with ffmpeg (solid backgrounds) **only because** the Playwright capture stage was unavailable — substituting just enough of stage 4's output to prove stages 5–6 produce a real, valid, self-checking mp4. The real deck-`<section>`→PNG capture is what `npm i -g playwright` unblocks.

## Bugs found + fixed during the live run (would have shipped broken otherwise)

1. **`render-slides.mjs` couldn't resolve a global Playwright** — ESM `import('playwright')` ignores `NODE_PATH`, so the documented `npm i -g playwright` install would not be found. Added a `createRequire(npm root -g)` fallback so a global install resolves.
2. **`narrate.sh` `say` syntax** — used `--file=<notes>` (wrong) + a WAVE output with no data-format → `say` errored `Opening output file failed: fmt?`/`typ?`. Fixed to `-f <notes> … --file-format=WAVE --data-format=LEI16@44100` (verified producing valid WAVs).
3. **`assemble.sh` silence check** — passed the negative `mean_volume` (e.g. `-18.6`) as a bare node arg, which node read as a CLI flag (`bad option: -18.6`). Fixed to pass it via an env var.

All three were caught only because the run used real binaries — strong evidence for keeping the live smoke in the AC set.

## Spot-check (on the live partial output)

- Slides render at 1920×1080 (ffprobe-confirmed video dimensions).
- Narration is audible and matches the speaker notes verbatim (`say` reads the notes text).
- One idea per slide held in the verification deck (write-path sharding; low-cost win) — no slide crammed two ideas.
- ≥1 figure reused from the paper: **deferred** along with the full capture path (a real figure was rasterized from the PDF via `sips`, proving the asset is obtainable; placing it into a captured slide needs the Playwright stage).

---

## Release clearance (Loop 3 — `/complete-dev --epic 0612-gd0`, 2026-06-13)

The deferral was cleared during the release train by running the **full** PDF→`video.mp4` pipeline end-to-end against the AC7 target paper — *Adtributor: Revenue Debugging in Advertising Systems* (Bhagwan et al., Microsoft) — at `--length standard`. Playwright was installed **locally** in the worktree (`npm i playwright` → `playwright@1.60.0`); `render-slides.mjs` resolves a local install via `import('playwright')` before the global fallback, so no `sudo` global install was needed. Chromium was already cached (`~/Library/Caches/ms-playwright`).

**Every stage ran for real, including the previously-blocked Stage 4 capture:**

| Stage | Result |
|---|---|
| 1 ingest — text | PDF read in-session (native `Read` pages 1–8) → clean text of the full paper |
| 1 ingest — figures | Figure 1 (the ad-system architecture diagram) rasterized from page 3 (`pdftoppm` + `ffmpeg` crop) → `fig_1.png`; `figures.json` emitted |
| 3 distill | 12 slides, **one idea each**, standard length; slide 6 references `fig_1` |
| **4 capture (Playwright)** | **`render-slides.mjs` → 12 × 1920×1080 PNGs, exit 0** — the stage the Loop-2 deferral was isolated to |
| 5 narrate (`say`) | 12 WAVs + `durations.json` (Σ 178.80 s); Enhanced-voice nudge fired once |
| 6 assemble + self-check | `video.mp4` 1920×1080 H.264/AAC, burned-in captions, 178.76 s — **SELF-CHECK PASS (all 5 checks)** |

Final self-check: `frame-slide-parity` 12==12 · `duration-sum` video 178.76 s ≈ Σ 178.80 s · `audio-non-silent` all 12 > −90 dB · `figures-resolved` `fig_1` ∈ inventory · `artifacts-present`. Spot-check: slides readable at 1920×1080; slide 6 places the reused paper figure; narration audible and verbatim to the notes; no slide crams two ideas.

### Bug #4 — found + fixed by the full live run (would have shipped broken)

The first full multi-slide assembly exposed a real defect in `assemble.sh` that the Loop-2 partial run (2 short slides, within tolerance) had masked:

- **Symptom:** `duration-sum` FAIL — `video=199.4 s` vs `Σ=178.8 s` (~11.5% overrun).
- **Cause:** `-shortest` does **not** reliably cut a `-loop 1` still-image video stream at audio EOF; the video stream overran its audio by ~1.4 s/slide (per-segment probe: audio 17.26 s, video 18.68 s), compounding over 12 slides.
- **Fix:** compute each slide's narration duration **before** the segment encode and hard-cap the video with `-t "$dur"` (keeping `-shortest` as a backstop). Re-run → `duration-sum pass` (video 178.76 s ≈ Σ 178.80 s); full self-check green. Committed on `feat/0612-jc5` with this log.

This is a fourth live-only bug caught by AC7 — and the strongest case yet for the deferred-smoke-as-release-gate contract: the duration overrun is invisible to every unit selftest and only manifests on a real, multi-slide, standard-length deck.

> Release-run artifacts (the real `video.mp4` etc.) were generated to a scratch dir (`/tmp/ev-smoke/main-14/`) and **not committed** — the `.mp4` is a 6.4 MB verification artifact, not a shipped product. Re-derive any time with the re-run command above (local `npm i playwright` instead of `-g` if global needs root).
