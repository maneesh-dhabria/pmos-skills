# Plan — /magazine entrypoint fixes

Execution mode: inline (single session, TDD per fix). Each task: write/extend the selftest assertion(s) first (red), implement (green), then add the `structure.test.sh` regression `chk`.

## Wave 1 — state-layer key unification (no dependents broken)
- **T1** `magazine-state.js`: add `remapCursors(state, feeds)` + `orphanCursors(state, feeds)`; export both; add selftest cases (URL→slug remap keeps newer value; orphan detection). [FR-R4, FR-R5]

## Wave 2 — run-layer routing + queue (depends on T1 helpers)
- **T2** `magazine-run.js`: `readFeedsTyped` captures `whisper_model`; `cmdDiscover` keys `meta.feed` by `name||url` and calls `remapCursors`; `cmdEnqueue` calls `remapCursors`. Selftest: discover keys by slug; enqueue finds the seeded cursor (no full backfill). [FR-R4]
- **T3** `magazine-run.js`: `cmdPrep` routes by feed `type` (typeByKey map); route summary + warn. Selftest: a newsletter-with-enclosure is crawled, a podcast is queued. [FR-R1]
- **T4** `magazine-run.js`: `cmdDrain` threads `modelByFeed`/`--model` + logs non-3 failures to `watch.log`; job carries `feed`. Selftest: drain passes a model; failure writes a watch.log line. [FR-R2]
- **T5** `magazine-run.js`: `cmdStatus` adds `orphanCursors`. Selftest assertion. [FR-R5]

## Wave 3 — transcribe + watch (depends on T4 model threading)
- **T6** `transcribe.sh`: `--check-model [name]` mode; selftest case (resolves a stub ggml; exit 3 on unresolved). [FR-R6]
- **T7** `magazine-watch.js`: `whisperDir` helper; `wrapperFor`/`plistFor` emit PATH; selftest asserts PATH in both. [FR-R3]
- **T8** `magazine-watch.js`: `install` seeds forward-only cursors (absent-only) + runs the `--check-model` smoke under simulated scheduler env + reports. Selftest/integration for seed-on-install. [FR-R4, FR-R6]

## Wave 4 — docs + tests + regressions
- **T9** `SKILL.md` Phase 1 first-run detection + orphan-cursor note; Phase 3 prep type-routing wording. [FR-R5, FR-R1]
- **T10** `reference/config-schema.md` + `reference/watch.md`: unified slug key, forward-only seed, smoke check, watch.log error logging. [docs]
- **T11** `tests/structure.test.sh`: FR-R1..R6 regression `chk` lines; extend `tests/watch.test.sh` with PATH/seed/check-model/model-thread cases. [verification]

## Final verification checklist
- [ ] `node magazine-state.js --selftest` PASS
- [ ] `node magazine-run.js --selftest` PASS
- [ ] `node magazine-watch.js --selftest` PASS
- [ ] `bash transcribe.sh --selftest` PASS
- [ ] `bash tests/structure.test.sh` PASS (incl. FR-R1..R6)
- [ ] `bash tests/watch.test.sh` PASS (incl. new cases)
- [ ] `bash tests/bundles.test.sh` PASS
- [ ] `bash tools/lint-non-interactive-inline.sh` clean for magazine
- [ ] `bash tools/audit-recommended.sh` clean for magazine
- [ ] No new loose files in skill root

## Release prerequisites (deferred to /complete-dev)
Version bump 0.15.0→0.16.0 (both manifests), changelog entry, learnings note. NOT implemented in execute waves.
