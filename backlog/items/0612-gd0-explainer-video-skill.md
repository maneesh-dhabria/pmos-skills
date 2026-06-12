---
schema_version: 1
id: 0612-gd0
kind: epic
title: /explainer-video — turn a doc/artifact/URL into a narrated slideshow video (local, $0)
type: feature
priority: should
status: defined
route: skill
feature_folder: docs/pmos/features/2026-06-12_explainer-video/
requirements_doc:
spec_doc:
design_doc: docs/pmos/features/2026-06-12_explainer-video/02_design.html
labels: [pmos-toolkit, explainer-video, artifact-authoring, local-first]
created: 2026-06-12
updated: 2026-06-13
released:
---

## Context

A new pmos-toolkit skill. `/explainer-video` converts a pmos artifact, a local document (`.md/.html/.txt/.pdf`), or a web URL into a narrated slideshow `.mp4` — a deck whose synthetic voice reads per-slide speaker notes. It sits alongside `/diagram`, `/wireframes`, and `/prototype` as a shareable-artifact authoring tool (see `plugins/pmos-toolkit/skills/`).

Singleton epic (D18) wrapping one build story — a single brand-new skill. Route: skill.

Design contract: `docs/pmos/features/2026-06-12_explainer-video/02_design.html` (adopted verbatim from the brainstorming design doc — design-doc seed).

### Maintainer decisions captured at brainstorming / define (2026-06-12)

- **No TTS API spend, ever (hard constraint).** Narration comes only from free, local, file-writing engines: macOS `say` (default) and Kokoro `kokoro-onnx` (opt-in neural, auto-detected). Cloud TTS is excluded entirely — not even an opt-in.
- **Browser TTS is out (research crux).** The Web Speech API cannot export audio to a file (Chromium 1185527 / WICG#69); "browser TTS + ffmpeg" is not viable. Confirmed during research.
- **Slides reuse the `_shared/html-authoring` substrate**, captured to PNG via a slim Playwright script patterned on `design-crit/assets/capture.mjs` — not reveal.js/Marp.
- **Input scope:** pmos artifacts + any local doc + web URL, with an LLM distillation step into a `deck.json`.
- **One idea per slide (hard).** The distiller carries exactly one idea per slide; bullets are minimal support (cap 3, prefer 0–1).
- **Length calibration:** `--length quick|standard|deep` (`1-2/3-5/5-10 min`) calibrates slide count + notes length; the distiller adapts to source structure, not a hard quota.
- **Reuse source figures (incl. web).** When the source carries a diagram/figure that illustrates a slide's idea, place the original asset rather than paraphrasing it. Figure inventory spans pmos artifacts, local HTML/MD, **and** fetched web pages (resolve relative URLs against the page base; filter by size/role to drop nav/tracking/spacer images).

### Grill resolutions (2026-06-13)

- **mp4-only for v1.** No audio-wired playable deck. `deck.html` is the (silent) slide source the capturer screenshots; narration lives only in the per-slide WAVs and the final video. A click-through narrated deck is explicitly v1.1+.
- **No bundled PDF parser; ingest is in-session.** The skill runs inside Claude Code, which natively reads PDFs (Read `pages`) and fetches URLs (WebFetch). So **ingest dispatches a distiller subagent** that reads the source directly to clean text + figure inventory — no poppler/`pdftotext`, no vendored JS PDF lib, no API cost. `ingest.mjs` handles deterministic asset/figure extraction + URL resolution; native-Read handles text for formats Node can't cleanly parse (PDF especially). This is the canonical ingest shape for every source type.
- **`say` voice: best-available + nudge.** Default to a good built-in voice; auto-detect and prefer an installed Enhanced/Premium voice; print a one-line "install Enhanced voices for better narration" nudge; never auto-download. `--voice` overrides.

## Acceptance Criteria

- [ ] A registered, eval-passing pmos-toolkit skill `/explainer-video` exists at `plugins/pmos-toolkit/skills/explainer-video/SKILL.md` (passes `skill-eval.md`, floor 43/47).
- [ ] Given a pmos artifact, a local doc (`.md/.html/.txt/.pdf`), or a web URL, the skill ingests the source to clean text **plus a figure inventory** via an in-session distiller subagent (native Read for PDF/text, WebFetch for URLs; `ingest.mjs` for deterministic asset + relative-URL resolution) — **no bundled PDF parser** — then distills a `deck.json` (one idea per slide; length-calibrated; figures reused, including web-scraped images filtered by size/role).
- [ ] The deck is authored as a self-contained HTML artifact via the `_shared/html-authoring` substrate (one `<section>` per slide; speaker notes carried per slide) and each slide is captured to a 1920×1080 PNG via a packaged Playwright script.
- [ ] Narration is synthesized **fully locally at $0** — macOS `say` by default, auto-upgrading to Kokoro when installed — one WAV per slide; **no cloud TTS path exists in the skill**.
- [ ] Slides + narration are assembled into a 16:9 H.264/AAC `.mp4` via packaged ffmpeg scripts (each slide held for its narration's `ffprobe` duration; optional burned-in captions); a modest self-check verifies frame/slide parity, duration, non-silent audio, and resolved figure references.
- [ ] Output lands at `{docs_path}/explainer-video/{YYYY-MM-DD}_{slug}/` (`deck.json`, `deck.html`, `frames/`, `audio/`, `durations.json`, `video.mp4`); ffmpeg is a hard gate with an install hint; non-Mac without Kokoro errors clearly.

## Notes

Stories: 0612-jc5 (the whole skill — single build story).
Route: skill (new skill in pmos-toolkit; reuses `_shared/html-authoring/` substrate + the `design-crit` Playwright-capture pattern + the `magazine` whisper-if-installed detection pattern; adds the ingest/distill/narrate/assemble pipeline + reference files).
Lean define: the design doc (`02_design.html`) is the cross-cutting contract; no separate epic `/spec` (skill spec folds into the story `/plan`).
