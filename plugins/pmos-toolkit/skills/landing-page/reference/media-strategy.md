# Media strategy

How `/landing-page` decides what visual medium carries each **signature moment** — a static device-framed
image, a carousel, or a captured product video — and how it degrades gracefully when the host environment
lacks the tools to capture richer media. Detection runs once at **Phase 0** (`media_caps`); the gate runs at
**Phase 4.5** (`#media-strategy`); the binding happens at **Phase 5**. Grounded in
[`02_design.html`](../../../../docs/pmos/features/2026-06-26_landing-page-enhancements/02_design.html) §2 (D6).
This file carries the menu + detection + pipeline + degrade ladder + embed rules; the SKILL.md body cites it.

## Contents

- [Format menu](#format-menu)
- [Capability detection](#capability-detection)
- [Video pipeline](#video-pipeline)
- [Degrade ladder](#degrade-ladder)
- [Embed rules](#embed-rules)

## Format menu

Each signature moment (the 2–4 product moments the brief marks worth showing) gets **one** of these, picked
at the Phase 4.5 gate. They escalate do > show > tell (`section-scaffolds.md#governing-principles`):

| Format | What it is | Best when | Needs |
|---|---|---|---|
| **Static device-framed image** (default) | A real screenshot placed in a device frame (browser chrome / phone bezel), preserving native aspect ratio. | Always available; the safe default. Use when one frame tells the story. | nothing beyond a screenshot |
| **Carousel of stills** | 2–4 framed stills of a moment, advanced by a tiny vanilla-JS control. | A short sequence (a flow, before/after) reads better than one frame, but motion isn't needed. | multiple stills |
| **Captured product video** | A short, **muted, auto-looping** clip of the **real** product flow, with a poster frame. | Motion is the point — a live readout, an animation, an interaction that a still can't convey. | headless browser **+** ffmpeg (see ladder) |

The default is **static device-framed**; richer formats are opt-in at the gate and only offered when the
capabilities exist.

## Capability detection

Run **once** at Phase 0 and cache as `media_caps` — never re-detect downstream:

- **`ffmpeg`** — `command -v ffmpeg >/dev/null 2>&1` (the repo's standard probe — see
  `explainer-video/scripts/narrate.sh`). Required to trim/compress a raw capture and to extract a poster frame.
- **`headless_browser`** — a Playwright / headless-Chromium context is available **and** the page can be
  served over `http://localhost` (`command -v npx` for `http-server`, or `python3 -m http.server`). Playwright
  in this repo **cannot open `file://`**, so a local server is part of the capability. Required to capture any
  video (and to record the flow).

## Video pipeline

Only when a moment is chosen for video **and** the ladder permits it:

1. **Capture the real flow.** Serve the running product (or a faithful local build) over `http://localhost`
   and drive the actual interaction with a Playwright context opened with the `recordVideo` option
   (`recordVideo: { dir, size }`). The clip is of the **real product**, never a mock, storyboard, or
   fabricated UI (C3) — if the real flow can't be driven, fall down the ladder rather than fake it.
2. **Post-process with ffmpeg.** Trim to the moment, compress to a small web-friendly file (e.g. H.264/VP9
   MP4/WebM at a modest bitrate), and extract a **poster frame** (`ffmpeg -ss … -frames:v 1`).
3. **Embed.** A muted, `loop`, `autoplay`, `playsinline` `<video>` with the `poster` set — or an animated
   **WebP** where a `<video>` is undesirable — bound per the embed rules below.

## Degrade ladder

Pick the richest format the capabilities allow; **log every downgrade**, never silently drop a moment:

1. **Video chosen + `headless_browser` + `ffmpeg`** → full captured product video (poster + muted loop).
2. **Video chosen + `headless_browser`, no `ffmpeg`** → capture the flow but emit an **animated GIF/WebP**
   (no ffmpeg compression/poster step); log `ffmpeg absent — emitting animated WebP instead of <video>`.
3. **Video chosen, no `headless_browser`** → fall back to a **captioned static device-framed image** of the
   moment (from the brief's existing screenshots) and **log** `no headless browser — video moment downgraded
   to captioned still`. Also log it as an Open Question so a later interactive run can capture the video.
4. **Carousel chosen** → emit if ≥2 stills exist; else a single static image (log the collapse).
5. **Static device-framed** → always available; the floor of the ladder.

The ladder is deterministic from `media_caps` + the chosen format — the model picks **format**, not whether a
tool exists (§H: the capability is a detected boolean, not a judgement).

## Embed rules

- **Never remote (C1).** All media is embedded as a `data:` URI **or** referenced as a file **inside the page
  folder** — never an `http(s)://` `src`. The page must open and render fully from `file://`.
- **Keep it self-contained.** Small images → `data:` URI inline; larger video/WebP → a sibling file in the
  page folder, referenced relatively. No CDN, no external fetch (D3).
- **Fidelity follows `copy-gates.md` asset rules** — preserve native aspect ratio, `object-fit` inside fixed
  frames, device frames for product shots, mobile-appropriate crops (one home: `copy-gates.md#asset-fidelity`).
- **Real assets only.** A moment with no real capture available gets a clearly-labelled **placeholder**, never
  a fabricated screenshot or video (D6).
