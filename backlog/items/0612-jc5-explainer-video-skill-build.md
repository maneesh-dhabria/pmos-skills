---
schema_version: 1
id: 0612-jc5
kind: story
title: Build the /explainer-video pmos-toolkit skill — doc/artifact/URL → narrated slideshow .mp4 ($0, local)
type: feature
status: planned
priority: should
route: skill
parent: 0612-gd0
dependencies: []
worktree:
plan_doc: docs/pmos/features/2026-06-12_explainer-video/stories/0612-jc5-explainer-video-skill-build/03_plan.html
tasks_file: docs/pmos/features/2026-06-12_explainer-video/stories/0612-jc5-explainer-video-skill-build/tasks.yaml
claimed_by:
labels: [pmos-toolkit, explainer-video, artifact-authoring, local-first]
created: 2026-06-13
updated: 2026-06-13
source: 2026-06-12 /skill-sdlc define @docs/superpowers/specs/2026-06-12-explainer-video-design.md
pr:
---

## Context

The single build story for epic 0612-gd0. Authors the brand-new `/explainer-video` pmos-toolkit skill end-to-end, per the epic design contract `docs/pmos/features/2026-06-12_explainer-video/02_design.html` and its grill resolutions (2026-06-13). One skill = one `/execute` run = one branch (`feat/0612-jc5`). The skill is `skill-eval`'d (Phase 6a) before it can ship.

Reuses the existing authoring substrate (`_shared/html-authoring/` for deck emission, `_shared/non-interactive.md`, `_shared/pipeline-setup.md`, the `design-crit` Playwright-capture pattern, the `magazine` whisper-if-installed detection pattern) and adds the explainer-specific ingest → distill → author-deck → capture → narrate → assemble pipeline plus its own `reference/` files. No epic-level `/spec`; the design doc + these ACs + `skill-patterns.md §A–§L` are the implementation contract.

## Acceptance Criteria

- [ ] **AC1 — Registered & eval-passing.** `plugins/pmos-toolkit/skills/explainer-video/SKILL.md` exists, frontmatter `name: explainer-video` matches dir, `user-invocable: true`, has `## Platform Adaptation`, a learnings-load line, a numbered Capture-Learnings phase, `## Track Progress`, integer top-level phases with kebab `{#slug}` anchors, and the canonical non-interactive inline block byte-identical to `_shared/non-interactive.md`. Passes `skill-eval-check.sh` `[D]` half and the `[J]` rubric (floor 43/47).
- [ ] **AC2 — Ingest (in-session, no bundled parser).** Given a pmos artifact, a local doc (`.md/.html/.txt/.pdf`), or a web URL, the skill ingests to clean text **plus a figure inventory** via an in-session distiller subagent — native Read (incl. PDF `pages`) for local docs, WebFetch for URLs — with `ingest.mjs` doing deterministic asset extraction and relative-URL resolution (against the page base). **No poppler / `pdftotext` / vendored JS PDF lib.** Figure inventory spans pmos SVGs, local HTML/MD images, and web-page images filtered by size/role (drop nav/tracking/spacer). The `--length quick|standard|deep` dial is read here.
- [ ] **AC3 — Distill to deck.json (one idea per slide).** A distillation step emits a `deck.json` validated against the design's schema: exactly **one idea per slide**, bullets minimal (cap 3, prefer 0–1), per-slide speaker notes, length-calibrated to `--length` (quick 5–8 slides/25–35 words; standard 10–16/30–45; deep 18–30/35–50; ~140 wpm) adapting to source structure rather than a hard quota; each slide may carry a resolved `figure` reference drawn from the inventory.
- [ ] **AC4 — Author + capture the deck.** The deck is authored as a self-contained HTML artifact via `_shared/html-authoring` (one `<section>` per slide; speaker notes carried per slide; figures placed). A packaged Playwright `render-slides.mjs` (patterned on `design-crit/assets/capture.mjs`) captures each slide to a 1920×1080 PNG into `frames/`. v1 is **mp4-only** — `deck.html` is the silent slide source, not an audio-wired player.
- [ ] **AC5 — Narrate locally at $0.** `narrate.sh` synthesizes one WAV per slide from speaker notes, fully locally — macOS `say` by default (best-available built-in voice, auto-preferring an installed Enhanced/Premium voice, one-line nudge to install better voices, never auto-download, `--voice` override), auto-upgrading to Kokoro `kokoro-onnx` when detected (whisper-if-installed style). **No cloud TTS path exists in the skill.** Non-Mac without Kokoro errors clearly with the install path.
- [ ] **AC6 — Assemble + self-check.** `assemble.sh` builds a 16:9 H.264/AAC `.mp4` via ffmpeg (each slide held for its narration's `ffprobe` duration; per-slide segment then `concat`; optional burned-in `.srt` captions). ffmpeg is a hard gate with an install hint. A modest self-check verifies frame/slide parity, total duration ≈ Σ narration, non-silent audio, and that every `deck.json` figure reference resolved. Output lands at `{docs_path}/explainer-video/{YYYY-MM-DD}_{slug}/` (`deck.json`, `deck.html`, `frames/`, `audio/`, `durations.json`, `video.mp4`).

## Notes

- Reference files to author (cite shared substrate, state deltas only): `reference/distillation-contract.md` (deck.json schema + one-idea-per-slide rule + length-calibration table + figure-reference resolution), `reference/narration-engines.md` (`say` voice selection + Enhanced-voice nudge + Kokoro detection/install nudge + non-Mac degradation), `reference/figure-inventory.md` (pmos/local/web figure extraction + web size/role filter heuristics), `reference/eval-rubric.md` (self-check parity/duration/audio/figure checks).
- Packaged scripts: `scripts/ingest.mjs` (asset + relative-URL resolution; native-Read does text), `scripts/render-slides.mjs` (Playwright capture), `scripts/narrate.sh` (say/Kokoro), `scripts/assemble.sh` (ffmpeg per-slide + concat + caption burn).
- Reuse, do not fork: `_shared/html-authoring/` (deck emit), `_shared/non-interactive.md` (inline block), `_shared/pipeline-setup.md` (settings/docs_path), the `design-crit/assets/capture.mjs` capture pattern, the `magazine/scripts/transcribe.sh` detection pattern.
- Open for `/plan` (per design open-questions): exact Kokoro detection (CLI vs `python -m`) + install nudge string; web-figure size/role filter thresholds.
- Release prerequisites (NOT in `/plan` waves — `/complete-dev` owns these): pmos-toolkit version bump (currently 2.69.0), both `plugin.json` manifests, changelog entry, README row, `~/.pmos/learnings.md` header bootstrap. (New skill in existing plugin — marketplace already points at `./skills/`; no marketplace edit.)
- Out of scope (v1): audio-wired playable `deck.html` (v1.1+); bundling a PDF parser or any system dep; cloud TTS of any kind; non-16:9 aspect ratios; background music / transitions / b-roll.
