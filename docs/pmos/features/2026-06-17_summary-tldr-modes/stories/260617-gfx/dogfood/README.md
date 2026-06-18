# Dogfood evidence — story 260617-gfx (/summary-tldr --mode video)

## Video mode, end-to-end (FR-C1..C4)

`gen-video-mode.mjs` exercises the exact `--mode video` seam this story owns, on a **deps-present
host** (ffmpeg, ffprobe, macOS `say`, Playwright all present):

```
--compression band → mode.js --video-length-resolve            → /explainer-video --length
  → main-agent handoff `/explainer-video <ORIGINAL-SOURCE> --length <l> --non-interactive`
  → real .mp4 produced with the SAME binaries /explainer-video uses (say + ffmpeg)
  → link + provenance injected into the canonical .html (relative link, NO re-host)
  → degradation: /explainer-video non-zero → canonical text intact, no video link
```

**Scope note:** this dogfood proves the `/summary-tldr` **video seam** (length mapping, the handoff
command, link/provenance, degradation) — not `/explainer-video`'s internal ingest→distill→capture
pipeline, which is covered by **its own** shipped smoke (a 34.6s self-checked mp4). The `.mp4` here
is produced directly with `say`+`ffmpeg` (the real binaries `/explainer-video` assembles with) so the
link/provenance and **no-re-host** assertions run against a genuine, ffprobe-valid artifact.

Artifacts (regenerated on every run):
- `explainer-video-out/wcag2-at-a-glance.mp4` — real 3.0s, ffprobe-valid mp4 (stands in for
  `/explainer-video`'s output dir; the link/provenance target).
- `summary-tldr-out/2026-06-18-wcag2-at-a-glance.html` — canonical doc with the injected
  `#summary-video` provenance `<figure>` linking the mp4 via a **relative** path (never a copy).
- `summary-tldr-out/2026-06-18-degraded.html` — the degradation case: canonical text on disk, the
  empty `#summary-diagram` slot untouched, **no** `.mp4` link written.

## Length mapping (FR-C1/D9)

Real `mode.js --video-length-resolve` calls: `tight→quick`, `standard→standard`, `detailed→deep`;
a `--video-length deep` override beats a `tight` band (`source: override`); an invalid override
exits 64 naming `quick|standard|deep`.

## No re-host + original-source (FR-C2/D9)

The mp4 is **never** copied into the summary-tldr dir (asserted: no `.mp4` under `summary-tldr-out/`);
the handoff passes the user's **original URL**, not the compressed summary (asserted).

## Gates

- `mode.js --selftest`: **28 checks pass** (video implemented + length mapping added).
- `tests/run.sh`: **36 passed, 0 failed** (video routing, length mapping, video-mode contract greps).
- `gen-video-mode.mjs`: **18 passed, 0 failed** (live, real binaries).
- skill-eval `[D]` (`--target claude-code`): **EXIT 0** (see story write-up).
- 4 repo lints + comments-coverage: **PASS**.
