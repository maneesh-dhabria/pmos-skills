# Requirements — /magazine entrypoint fixes

**Mode:** interactive · **Tier:** 2 · **Pipeline mode:** skill-feedback
**Skill:** `pmos-learnkit:magazine` · **Source:** `/reflect` retro (2 runs: build + watch --install), 2026-06-07
**Acceptance criteria:** conform to `reference/skill-patterns.md §A–§F`.

## Problem

`/magazine` delivered correct final artifacts on two real runs, but **only because the agent silently hand-built four workarounds around broken documented entrypoints**. The skill did not deliver its claimed contract — "resumable pipeline crawls articles, transcribes podcasts … plus an optional background worker that keeps podcasts transcribed" — through its own `prep` and `watch` commands for the whisper.cpp + Homebrew + Substack-bundle configuration. Zero user pushback occurred; every defect was absorbed silently — the exact failure mode the `/reflect` learning warns about.

## In-scope findings (all six confirmed in source + corroborated in `~/.pmos/learnings.md`)

| # | Sev | Finding | Confirmed |
|---|---|---|---|
| R1 | blocker | `prep` routes to transcription by `item.enclosure` presence, not feed `type` → every Substack newsletter (all carry an audio enclosure) queued for transcription, never crawled | `magazine-run.js:149` |
| R2 | blocker | foreground/background drain shells `transcribe.sh` with **no `--model`**, never reads `whisper_model` → model name unresolved → exit 3 → silent requeue (`transcribed:0`) | `magazine-run.js:245` |
| R3 | blocker | `watch --install` wrapper + plist set **no PATH** → Homebrew `whisper-cli`/`ffmpeg` unreachable from the scheduler → worker transcribes nothing, silently, forever | `magazine-watch.js:41-79` |
| R4 | blocker | `enqueue` stores `feed` as **slug** while interactive `discover`/`advanceCursors` key cursors by **URL** → cursor never found → `since=null` → entire back-catalog (2,019 episodes) enqueued, overriding "forward-only" | `magazine-run.js:217` vs `:114` / `magazine-state.js:132` |
| R5 | friction | first-run detection keys off missing config YAMLs, ignoring a stale `state.json` with orphaned cursors under old slugs | `SKILL.md:195` |
| R6 | nit | `install` reports success without verifying the worker can actually transcribe | `magazine-watch.js:186` |

## Solution direction

Make the documented `prep` and `watch` entrypoints functional end-to-end for the real-world config, with **no manual drivers required**, and add cheap self-checks that surface misconfiguration loudly instead of failing silently.

- **R1** — gate the transcription branch on feed `type==='podcast'` (enclosure necessary but not sufficient); crawl newsletters/unknown-type-with-link; emit a per-route summary + warn on suspicious routing.
- **R2** — thread the resolved per-feed `whisper_model` (default `base`; name or abs path) into the drain's `--model`; on a non-zero, non-3 exit, log exit code + stderr to `watch.log` instead of requeuing silently.
- **R3** — write `PATH=<dir of detected whisper>:…` into both the generated wrapper and the plist `EnvironmentVariables`.
- **R4** — unify the feed key on **slug/name** everywhere (matches documented schema + card badge); remap legacy URL-keyed cursors on load; install seeds each podcast cursor to "now" (absent-only) for forward-only.
- **R5** — base first-run detection on `state.json` existence too; surface orphan cursors (keys matching no current feed) in `status` and in SKILL prose.
- **R6** — fold a launchd-simulated smoke check into `install` (run under the wrapper's minimal PATH) that asserts whisper + model resolve, and report `found-whisper: yes / model <name>: resolved` rather than a bare "Installed."

## User journeys

1. **Catch-up build with a mixed bundle** — a user with Substack newsletters (audio-bearing) + podcast feeds runs `/magazine`; `prep` crawls newsletters and transcribes only true podcasts, no hand-driver.
2. **Install the watcher (whisper.cpp + Homebrew)** — `watch --install` verifies whisper+model under the scheduler's PATH and seeds forward-only cursors; first tick enqueues only new episodes, not the back-catalog.
3. **Re-run after a rename** — orphaned cursors from old slugs are flagged, not silently treated as "first run."

## Out of scope

- Re-architecting the queue, lock, or Stage-B summarize/render.
- Auto-downloading whisper models.
- `--format md|both` issue output (still reserved).
- The `/reflect` scope-glob fix (separate skill).

## Constraints

- Zero npm dependencies; node ≥18; bash + curl only. Backward-compatible state.json. All script self-tests + `tests/*.test.sh` stay green. No new loose files in skill root.
