---
schema_version: 1
id: 260614-7g0
kind: epic
title: "/explainer-video first-run robustness + caption UX fixes"
type: bug
priority: must
status: defined
route: skill
feature_folder: docs/pmos/features/2026-06-14_explainer-video-fixes/
requirements_doc:
spec_doc:
design_doc: docs/pmos/features/2026-06-14_explainer-video-fixes/02_design.html
labels: [explainer-video, pmos-toolkit, retro, captions]
created: 2026-06-14
updated: 2026-06-14
released:
parent:
dependencies: []
---

## Context

Seeded by a `/reflect` retro of one real `/explainer-video` run (pov_v5.html → 321s video) plus direct user feedback on the rendered captions. The run completed and self-checked GREEN, but only because the agent silently improvised three undocumented workarounds — two blocker-grade — that a naive first run would have blocked on. Plus the burned-in captions are unusably large (cover half the frame) and the captions on/off choice is not remembered.

All findings target a single skill — `/explainer-video` (in pmos-toolkit) — so this is a singleton epic of one `route: skill` story.

Retro + grounding (each verified against the skill's scripts this run):

1. **[blocker] deck.json shape ambiguity.** `narrate.sh` (line 106/151/160) and `assemble.sh` (line 99/126) require a wrapped `{"slides":[...]}` object; `reference/distillation-contract.md` Schema (lines 11–25) shows the wrapper correctly, but SKILL.md Phase 3 shows only "Schema per slide: {...}" and the contract's worked example is a bare slide object — so a first run writes a flat array and every script crashes `TypeError: Cannot read properties of undefined (reading 'length')`.
2. **[blocker] figures not extracted as files.** `ingest.mjs` writes only `figures.json`; for inline pmos `<svg>` the `source_ref` is just an anchor id (line 107), not a written file. Phase 3/4 say "place the original asset"/"reuse source figures" — implying figures exist on disk. They don't, so the agent hand-wrote a regex SVG extractor.
3. **[friction] no JSON-validity gate** between Phase 3 (distill) and Phase 4. The model authors deck.json by hand; unescaped `"` in speaker_notes produced invalid JSON, surfaced only when narrate.sh parsed it.
4. **[friction] @artifact path resolution undocumented.** `@pov/pov_v5.html` was assumed to be `{docs_path}/pov/...` (didn't exist); agent used `find`. No documented resolution algorithm.
5. **[should-fix / user] captions cover half the screen.** `assemble.sh` line 113 burns `FontSize=22` with no explicit `PlayResX/Y`, so libass scales against default PlayResY=288 → ~82px at 1080; the entire 40–50-word speaker_note is one cue held for the whole slide → multi-line wall over half the frame.
6. **[enhancement / user] caption on/off as a remembered preference.** `--captions`/`--no-captions` exists (D4, default ON) but isn't persisted like `--length`'s lastrun; user wants to set it once.

Design doc: `docs/pmos/features/2026-06-14_explainer-video-fixes/02_design.html`

## Acceptance Criteria

- [ ] deck.json top-level wrapper `{title, length_target, slides:[...]}` is unambiguous in SKILL.md Phase 3 + the contract worked example; scripts normalise a bare-array deck.json instead of crashing.
- [ ] Inline `<svg>` figures are extracted to files by `ingest.mjs` (e.g. `figures/<id>.svg`) with `source_ref` pointing at the written file; Phase 2/4 wording matches what ingest actually produces.
- [ ] A JSON-validity gate runs after Phase 3 writes deck.json (parse + the unescaped-quote guidance) before Phase 4.
- [ ] `@artifact` / source-path resolution is a documented, deterministic algorithm in Phase 1/2.
- [ ] Burned-in captions are small, bottom-anchored, and bounded (explicit PlayRes + sane FontSize; cue text not a half-screen wall).
- [ ] Captions on/off is persisted as a per-project preference (lastrun), consistent with `--length`; the flag still overrides.
- [ ] A subtle bottom-right `pmos-toolkit` watermark renders on every slide via deck.html CSS (captured in frames; no ffmpeg change).
- [ ] Phase 1 prints an approximate run-time estimate from length/slide-count; the `deep` tier asks a confirm (auto-proceed under `--non-interactive`).
- [ ] An outline-approval gate after Phase 3 shows slide titles + ideas and supports approve/edit/delete before the expensive capture+narrate half (auto-proceed headless); edits rewrite deck.json and re-run the JSON-validity gate.
- [ ] All changes pass `skill-eval` and keep the skill's existing selftests green.

## Notes

Singleton epic (one in-scope skill). One fused `route: skill` story — the nine findings (4 retro + 5 user-feedback: caption size, caption preference, watermark, time estimate, outline gate) are coherent edits to one SKILL.md + its three scripts + two reference files, independently shippable as one pmos-toolkit release.
