---
schema_version: 1
id: 0612-h2j
kind: epic
title: /summary-tldr — faithful, grounded TL;DR of any user-supplied content (text/PDF/image/URL/email/tweet/podcast/video)
type: feature
priority: should
status: released
route: skill
feature_folder: docs/pmos/features/2026-06-12_summary-tldr-skill/
requirements_doc:
spec_doc:
design_doc: docs/pmos/features/2026-06-12_summary-tldr-skill/02_design.html
labels: [pmos-toolkit, summary-tldr, content-tool, faithfulness-first]
created: 2026-06-12
updated: 2026-06-13
released: pmos-toolkit/v2.73.0
---

## Context

A new pmos-toolkit content/authoring skill (beside `/polish`, `/artifact`, `/diagram`). Given any single user-supplied source — article/web URL, raw text, PDF, markdown, image, video URL, email thread, tweet/Twitter thread, or podcast episode — `/summary-tldr` produces a **faithful, grounded summary** at a user-confirmed compression target and chosen output style, runs a first-time-reader review pass, optionally hands off to `/diagram`, and saves a standalone HTML doc under `{docs_path}/summary-tldr/{YYYY-MM-DD}-<slug>`.

North star: *a reader who never saw the original comes away with the source's actual claims, numbers, and takeaways — not a meta-description of what the document is about.*

Singleton epic (D18) wrapping one build story (`0612-ejq`). Route: skill. Standalone utility (no workstream context, not a pipeline stage).

Design contract: `docs/pmos/features/2026-06-12_summary-tldr-skill/02_design.html`. Research substrate: `docs/pmos/features/2026-06-12_summary-tldr-skill/research/`.

### Maintainer decisions captured at define (2026-06-12)

- **D1 — Plugin = pmos-toolkit** (as requested). Cross-plugin reuse of pmos-learnkit's `transcribe.sh` for podcast/video accepted.
- **D2 — Compression = research-informed bands + absolute cap.** Tight ~10–20% / Standard ~20–30% (default) / Detailed ~30–40% (with a "this will be long" nudge); plus a length-scaled absolute word cap so long sources stay TL;DRs. Target confirmed per run.
- **D3 — Inputs = tiered, honest degradation.** v1 fully supports native inputs (text, markdown, PDF, image, URL, pasted email thread, pasted tweet/thread); podcast/video best-effort via transcription-if-available; no transcript path → refuse with guidance, never fabricate.
- **D4 — Writing quality = inline the relevant `/polish` checks** (concision, de-AI-slop, active voice, no-meta-description); cite `polish/reference/rubric.md`; do not invoke `/polish` (no author voice to preserve; subagent-safe).

## Acceptance Criteria

- [ ] A registered, eval-passing pmos-toolkit skill `/summary-tldr` exists at `plugins/pmos-toolkit/skills/summary-tldr/SKILL.md` (passes `skill-eval.md`, floor 43/47).
- [ ] Accepts all declared source kinds with per-kind preprocessing and honest degradation; non-text/transcription failures are flagged or refused, never fabricated.
- [ ] Proposes a compression band (intent-labeled) + length-scaled cap and confirms with the user (or honors `--compression`); produces output in a user-chosen style (or `--style`), always front-loading the conclusion.
- [ ] Summary is grounded (hybrid extract-then-generate; keyfact coverage); meta-description ("this article discusses X") is a hard review fail; every claim traces to source content extracted this run.
- [ ] A first-time-reader review pass (coverage / faithfulness / standalone / asserts-not-describes / coherence, ≤2-loop remediation) runs before emit; residual gaps surfaced.
- [ ] Optional `/diagram` handoff (main-agent, `--non-interactive --on-failure drop`, SVG validated before embed).
- [ ] Output saved as a self-contained HTML artifact per `_shared/html-authoring/` checklist at the specified path; a `summary-tldr` library listing is regenerated.

## Notes

Stories: 0612-ejq (the whole skill — single build story).
Route: skill (new skill in pmos-toolkit). Reuses `_shared/pipeline-setup.md`, `_shared/non-interactive.md`, `_shared/findings-dispositions.md`, `_shared/html-authoring/`, `/polish` input-resolver + rubric (inlined), `/magazine` `transcribe.sh` (cross-plugin), `/diagram` handoff. New: input-type dispatcher, compression model, hybrid extract-then-generate pipeline, first-time-reader review pass, library listing, tweet-stitch + email-dedup preprocessors.
Lean define: the design doc (`02_design.html`) is the cross-cutting contract; no separate epic `/spec` (skill spec folds into the story `/plan`).
