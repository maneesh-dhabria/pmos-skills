---
schema_version: 1
id: 0612-ejq
kind: story
title: Build the /summary-tldr pmos-toolkit skill — multi-input, grounded, compression-confirmed summaries with a first-time-reader review pass
type: feature
status: in-progress
priority: should
route: skill
parent: 0612-h2j
dependencies: []
worktree: ../agent-skills-0612-ejq
plan_doc: docs/pmos/features/2026-06-12_summary-tldr-skill/stories/0612-ejq-summary-tldr-skill-build/03_plan.html
tasks_file: docs/pmos/features/2026-06-12_summary-tldr-skill/stories/0612-ejq-summary-tldr-skill-build/tasks.yaml
claimed_by: build:3e313489-a624-4b93-b86e-c56f8eb34df6
driver_holder: build:3e313489-a624-4b93-b86e-c56f8eb34df6
released:
labels: [pmos-toolkit, summary-tldr, content-tool, faithfulness-first]
created: 2026-06-12
updated: 2026-06-13
source: 2026-06-12 /skill-sdlc define "I want to build a new skill called /summary-tldr in pmos-toolkit …"
pr:
---

## Context

The single build story for epic 0612-h2j. Authors the brand-new `/summary-tldr` pmos-toolkit skill end-to-end, per the epic design contract `docs/pmos/features/2026-06-12_summary-tldr-skill/02_design.html`. One skill = one `/execute` run = one branch (`feat/0612-ejq`). The skill is `skill-eval`'d (Phase 6a) before it can ship.

Reuses existing substrate (`_shared/pipeline-setup.md`, `_shared/non-interactive.md`, `_shared/findings-dispositions.md`, `_shared/html-authoring/`, `/polish` input-resolver + rubric inlined, `/magazine` `transcribe.sh` cross-plugin, `/diagram` handoff) and adds the input-type dispatcher, compression model, hybrid extract-then-generate pipeline, first-time-reader review pass, and library listing. No epic-level `/spec`; the design doc + these ACs + `skill-patterns.md §A–§L` are the implementation contract.

## Acceptance Criteria

- [ ] **AC1 — Registered & eval-passing.** `plugins/pmos-toolkit/skills/summary-tldr/SKILL.md` exists, frontmatter `name: summary-tldr` matches dir, `user-invocable: true`, has `## Platform Adaptation`, a learnings-load line, a numbered Capture-Learnings phase, `## Track Progress`, kebab `{#slug}` phase anchors, and the canonical non-interactive inline block byte-identical to `_shared/non-interactive.md`. Passes `skill-eval-check.sh` `[D]` half and the `[J]` rubric (floor 43/47).
- [ ] **AC2 — Input dispatcher (D3).** Detects source kind and preprocesses to clean text for every declared kind: raw text, markdown file, web/document URL (`WebFetch`), PDF (native `Read`), image (vision `Read`), email thread (quote-dedup + chronological order), tweet/Twitter thread (stitch in posting order), podcast episode (`/magazine transcribe.sh`, cross-plugin), video URL (transcript/captions or audio transcription). Records `source_kind` + `extraction_confidence`. Low-confidence/absent extraction is **flagged or refused with guidance — never fabricated** (`design_doc#input-ingestion`, I5).
- [ ] **AC3 — Compression model (D2, I3).** For text sources, measures length, proposes an intent band (Tight ~10–20% / Standard ~20–30% default / Detailed ~30–40% with a long-output nudge) bounded by a length-scaled absolute word cap, and confirms with the user (or honors `--compression`). Non-text sources propose a target length directly (`design_doc#compression`).
- [ ] **AC4 — Grounded pipeline (I1, I2).** Hybrid extract-then-generate: preprocess → map-reduce chunk if long → extract keyfact list → generate to cover & assert keyfacts. Meta-description ("this article discusses X") is a **hard fail**; every claim traces to source content extracted this run; exact numbers/entities/named conclusions preserved (`design_doc#pipeline`, `#grounding`).
- [ ] **AC5 — Output styles & writing quality (D4).** Offers key-takeaways bullets (default), executive narrative, nested bullets, layered/progressive (or honors `--style`); always front-loads the conclusion. Applies the inlined `/polish` checks (concision, de-AI-slop, active voice, reframed no-throat-clearing) citing `polish/reference/rubric.md`; deterministic checks auto-apply, judgment checks surface per `findings-dispositions.md`; arithmetic by script not model (§H) (`design_doc#output-styles`, `#writing-quality`).
- [ ] **AC6 — First-time-reader review pass (I4).** Before emit, runs a FineSurE-style gate from a first-time reader's perspective: coverage, faithfulness (7 error types), standalone, asserts-not-describes, coherence; reviewer grounded in ≥40-char source quotes; ≤2-loop remediation; coverage/faithfulness signal surfaced; residual gaps surfaced not hidden (`design_doc#review`).
- [ ] **AC7 — Optional diagram + output (I6).** Offers the optional `/diagram` step (Recommended=Skip, or `--diagram`): main-agent `/diagram --source <md> --theme editorial --non-interactive --on-failure drop`, SVG validated before embed, failure → continue without it. Emits a self-contained HTML artifact at `{docs_path}/summary-tldr/{YYYY-MM-DD}-<slug>.html` (+ `.sections.json` + provenance block) per `_shared/html-authoring/README.md`, `{{pmos_skill}}=summary-tldr`; regenerates a `summary-tldr` library listing.

## Notes

- Reference files to author (cite shared substrate, state deltas only): `reference/input-dispatcher.md` (per-kind detection + preprocessing + degradation, citing `/polish` resolver + `/magazine` transcribe contract), `reference/compression-model.md` (bands + length-scaled cap formula — a script does the arithmetic), `reference/summary-pipeline.md` (extract-then-generate + map-reduce chunking), `reference/review-rubric.md` (first-time-reader checks + inlined `/polish` checks, citing `polish/reference/rubric.md`), `reference/output-styles.md` (the 4 styles).
- Reuse, do not fork: `_shared/pipeline-setup.md`, `_shared/non-interactive.md`, `_shared/findings-dispositions.md`, `_shared/html-authoring/`, `/magazine scripts/transcribe.sh` (cross-plugin path), `/diagram` (main-agent handoff).
- Cross-plugin note (D1): `transcribe.sh` lives in pmos-learnkit; resolve its path at runtime and degrade gracefully if pmos-learnkit isn't installed (podcast/video become "paste a transcript" inputs).
- Release prerequisites (NOT in `/plan` waves — `/complete-dev` owns these): pmos-toolkit version bump (currently 2.68.0), both `plugin.json` manifests, changelog entry, README row, `~/.pmos/learnings.md` header bootstrap. Marketplace entries already point at `./skills/` (no marketplace edit for a new skill in an existing plugin).
- Out of scope (v1): multi-document synthesis; persistent background transcription queue (that's `/magazine watch`); translation; rewriting the original (that's `/polish`); paywalled/auth-gated scraping (ask for a paste).
