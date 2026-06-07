# Spec — /magazine entrypoint fixes

Tier 2. Design follows from `01_requirements.md`. Each fix is testable via the script `--selftest` blocks (the repo's TDD idiom) plus new regression `chk` lines in `tests/structure.test.sh` (FR-R1..R6).

## FR-R1 — prep routes by feed type, not enclosure
`cmdPrep` builds a `typeByKey` map from `readFeedsTyped(root)` (keyed by both `name` and `url`). For each `discovered` item:
- route to the transcription queue iff `item.enclosure && (type==='podcast' || (!type && !item.link))` — an enclosure is necessary but not sufficient; a newsletter with an enclosure is crawled.
- otherwise crawl `item.link`.
After the loop, emit a route summary (`{crawled, queued, unknownFeed}`) and **warn** when any item whose feed is declared `newsletter` was queued, or when >50% of discovered items routed to transcription while ≥1 newsletter feed exists (misconfiguration signal). Items whose feed is absent from the map default to crawl (safer path) and increment `unknownFeed`.

## FR-R2 — drain threads the resolved model + surfaces errors
- Extend `readFeedsTyped` to capture `whisper_model` per feed.
- `cmdDrain` precomputes `modelByFeed` (by `name` and `url`; default `'base'`). The job carries `feed`; the default `transcribeFn(guid, enclosure, model)` passes `--model <model>` to `transcribe.sh` and captures stderr (`stdio: ['ignore','inherit','pipe']`).
- On a non-zero exit, append `<ISO> transcribe <guid> exit=<code> stderr=<last 3 lines>` to `<root>/watch.log`. Exit 3 (no whisper/model) is logged as such (no longer a silent requeue) before the `break`. Injected test `transcribeFn`s (returning a number, 2 args) keep working — the extra `model` arg is ignored.

## FR-R3 — wrapper + plist PATH
- `install()` resolves the whisper directory: `dirname(command -v <bin>)` via a `whisperDir(bin)` helper (run at install-time PATH, which includes Homebrew).
- `wrapperFor(gen)` emits, near the top, `PATH="<whisperDir>:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"; export PATH` (whisperDir omitted only if null).
- `plistFor(gen)` adds an `<key>EnvironmentVariables</key>` dict carrying the same `PATH`.
- Both generators read `gen.whisperDir`.

## FR-R4 — slug as the single feed key + forward-only seed
- `cmdDiscover` iterates feed objects `{url, name}` (config feeds via `readFeedsTyped`; explicit `--feed` URLs → `{url, name:null}`) and stores `meta.feed = name || url`. `advanceCursors` (keys by `it.feed`) and `cmdEnqueue` (`feedKey = name || url`) now agree.
- `magazine-state.js` gains `remapCursors(state, feeds)` (move a `state.cursors[url]` to the `name` key, keeping the newer value) and `orphanCursors(state, feeds)` (cursor keys matching no current feed name/url). `cmdEnqueue` + `cmdDiscover` call `remapCursors` after load (idempotent; save if it moved anything).
- `install()` (when **not** `--backfill`) seeds each podcast feed's cursor to `new Date().toISOString()` **only when absent**, so the first scheduled enqueue is forward-only; an existing cursor (a real position) is respected.

## FR-R5 — first-run detection + orphan-cursor surfacing
- `cmdStatus` adds `orphanCursors` to its report (via the new helper).
- `SKILL.md` Phase 1: first-run = **no `state.json` AND no `feeds.yaml`**; if `state.json` exists with cursor keys matching no current feed name, warn ("orphaned cursors from renamed/removed feeds — re-import resets the since-anchor").

## FR-R6 — install smoke check
- `transcribe.sh` gains `--check-model [name]`: runs `detect_whisper`; for openai-whisper reports ok with the name; for whisper.cpp runs `resolve_cpp_model "$name"` and reports the resolved path; exit 0 on success, 3 on no-whisper/unresolved-model.
- `install()` runs the check **under the wrapper's simulated scheduler env** (`{ HOME, PATH: <whisperDir>:/usr/bin:/bin:/usr/sbin:/sbin }`) against the first podcast feed's `whisper_model` (default `base`). Reports `found-whisper: yes · model <name>: resolved` on success; on failure prints a loud warning naming PATH/model as the likely cause (install still completes — the job is scheduled, but the user is told it can't transcribe yet). Skips gracefully if the platform is unsupported.

## Interfaces touched
- `scripts/magazine-run.js` — `cmdPrep`, `cmdDrain`, `cmdDiscover`, `cmdEnqueue`, `readFeedsTyped`, selftest.
- `scripts/magazine-state.js` — `remapCursors`, `orphanCursors`, exports, selftest.
- `scripts/magazine-watch.js` — `wrapperFor`, `plistFor`, `install`, `whisperDir`, selftest.
- `scripts/transcribe.sh` — `--check-model`, selftest.
- `SKILL.md` — Phase 1 first-run detection (+ orphan-cursor note); Phase 3 prep description.
- `reference/config-schema.md`, `reference/watch.md` — document the unified slug key, forward-only seed, smoke check.
- `tests/structure.test.sh` — FR-R1..R6 regression `chk` lines.

## Verification plan
All four `--selftest`s green; `tests/structure.test.sh`, `tests/watch.test.sh`, `tests/bundles.test.sh` green; a new `watch.test.sh` case asserting (a) PATH in wrapper+plist, (b) install seeds forward-only cursors, (c) `--check-model` exit codes, (d) drain threads `--model`. `bash tools/lint-non-interactive-inline.sh` + `tools/audit-recommended.sh` pass for the skill.

## Release prerequisites
- `pmos-learnkit` minor bump (0.15.0 → 0.16.0) in BOTH `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json`.
- Changelog entry (user-facing).
- `~/.pmos/learnings.md ## /magazine` — note the fixes landed (close the loop on the workaround entries).
- (No README row change — magazine already listed. No manifest description fields.)
