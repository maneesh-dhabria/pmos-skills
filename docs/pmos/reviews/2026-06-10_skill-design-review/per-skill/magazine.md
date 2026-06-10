# magazine — review

**Grade:** B
**Size:** SKILL.md 320 lines (236 excluding non-interactive block, lines 82–165); references 6 files / 826 lines; target ~120 lines (excluding block) + references as-is.

## TL;DR

- **Biggest win available:** Phases 1–3 re-narrate, in SKILL.md prose, behavior the Stage-A scripts already enforce and `reference/pipeline.md`/`import.md` already document — the same rules are stated three times in three places. De-narrating saves ~90 lines with zero behavior change.
- **Biggest risk in current design:** spec breadcrumbs (`FR-Q3`, `FR-R4/FR-R5`, `FR-P1`…) and bugfix memorials (the whisper-probe paragraph) are accreting into the body. Each one is individually justified and collectively turning a clear orchestrator into a changelog — the classic incremental-edit failure mode the review is hunting.
- **Worth keeping (the best thing in either plugin):** the Stage-A/Stage-B *architecture* is exactly right. Determinism, resumability, dedup, locking, and cursor invariants live in zero-dep tested scripts; the model does only what models are for (summarize, tag, curate). `magazine-run.js` as a single entrypoint ("don't hand-write per-feed drivers") is the move every script-heavy skill in this repo should copy.

## Findings

1. **[V] Phase 3 re-narrates what `magazine-run.js prep` enforces (~35 lines → ~8).** The script/model division of labor is respected in *architecture* but violated in *prose*. Phase 3 explains type-based routing (FR-R1), the redirect-to-file rule (FR-P1), the bounded foreground drain, `whisper_model` threading, exit-3 semantics, and `watch.log` logging — all of which `prep` does itself; the agent never performs any of it. The agent needs to know: run `magazine-run.js prep`; it's deterministic and may run long; if you ever call `extract-article.js` directly, redirect to a file; podcasts without transcripts render with show-notes, never a fabricated summary. Everything else is `pipeline.md` §Stage-A material (where it already appears, near-verbatim — the "redirect, don't pipe" rule is stated in SKILL.md Phase 3 *twice*, in `pipeline.md` step 2, and in the `magazine-run.js` header comment). Fix: cut Phase 3 to the four agent-relevant sentences; let the entrypoint and the reference own the mechanics.

2. **[V/S] Phase 1's dispatch list duplicates `import.md` §Token-1 dispatch — with *more* detail than the reference.** SKILL.md says "Dispatch per `import.md` 'Token-1 dispatch'", then re-lists all 7 subcommands including bundle-import pipeline steps, curate write-target safety, and watch install-refusal conditions — each of which also appears in `import.md`, `feed-curation.md`, and `watch.md` respectively. This is progressive disclosure inverted: the index is fatter than the chapters. Fix: a 7-line routing list (`add/remove/list → import.md; bundles/add --bundle → import.md §Bundles; curate → feed-curation.md (warn: long, maintainer-leaning); watch → watch.md; else → build, Phase 2`). The references are good; trust them.

3. **[R] FR-tag breadcrumbs in user-facing prose.** Eleven FR citations in SKILL.md (`FR-Q3` ×2, `FR-R4/FR-R5`, `FR-R1`, …) and dozens more across references. They mean nothing to a fresh reader, couple the skill text to feature-folder history, and violate the durability principle (north-star item 4). The origins are real — `FR-Q3` traces to `docs/pmos/features/2026-06-07_magazine-entrypoint-fixes`, the queue invariants to `2026-06-07_magazine-transcription-queue/02_spec.html` — but the *why* is what belongs in prose ("cursor advances only on completion so an interrupt never drops items" — which Phase 6 already states well). Fix: strip FR tags from SKILL.md; references may keep them.

4. **[P] The one load-bearing rule is scattered instead of stated.** "Never fabricate a summary; degrade honestly" appears in Platform Adaptation, Phase 3, Phase 4, `pipeline.md` (×3), and `config-schema.md`. This is magazine's equivalent of diagnose's "**This is the skill.**" — the trust rule that distinguishes it from an RSS reader. Stating it once, prominently, at the top ("Trust rule: a card is either grounded in a crawled article/transcript, or visibly degraded with a reason. No third option.") would let every scattered restatement collapse to nothing and would survive model upgrades better than per-phase reminders.

5. **[X] The whisper-probe paragraph in Platform Adaptation is a bugfix memorial.** "do not probe with a bare on-PATH binary check — that misses whisper.cpp…" is a fix from the 2026-06-03 magazine retro (selftest/exit-3 work is all over `2026-06-03_magazine-retro/02_spec.html`). The positive instruction ("probe via `transcribe.sh --selftest`; treat exit 3 — and only exit 3 — as no-transcription") is load-bearing and should stay; the negative history ("don't do the thing we once did wrong") can go — the script *is* the fix.

6. **[F] `--format <html|md|both>` is documented vapor.** Phase 0: "v1 emits HTML only; `--format both` is reserved." A flag in the argument-hint that does nothing is a discoverability trap. Delete from the hint and the body until implemented; `pipeline-setup.md` precedence can be re-added when real.

7. **[F/Ph] `watch --install` vs `magazine-watch.js install` — gratuitous surface mismatch.** The user-facing subcommand takes flag-style verbs (`watch <--install|--status|--run-now|--uninstall>`) while the script takes positional verbs (`install|status|run-now|uninstall`), and every *other* magazine verb is positional (`add`, not `--add`). Fix: accept `watch install` (positional, matching siblings and the script) and treat the flag forms as aliases. One line in `import.md`'s dispatch table.

8. **[S] "Track Progress" and "Capture Learnings" are copy-pasted across all 6 learnkit skills.** Verified by grep: every learnkit SKILL.md carries a near-identical `## Track Progress` block and a learnings-load + Capture-Learnings phase pair. This is substrate-shaped prose living in 6 bodies (and pinned per-skill by each `structure.test.sh`). Cross-skill fix (not magazine's alone): one `_shared/` file or a plugin-level convention, inlined or referenced the way `pipeline-setup.md` is. Flagging here because magazine is where the pattern is most visible against an otherwise-lean orchestrator intent.

9. **[Ph] Phase structure itself is sound — a minority report in this review.** Phases 0–7 are integer-numbered, each maps to a real pipeline stage and a Track-Progress task, and Phase 6 (commit cursor) is a model phase: 6 lines, mechanism + the why ("the cursor is the completeness guarantee"). No fractional phases, no insertion scars at the phase level — the accretion is *within* phases 1–3, not between them.

10. **[G] `structure.test.sh` pins prose, which taxes the fixes above.** It asserts section headings ("Platform Adaptation", "Track Progress", "## /magazine learnings ref", numbered Capture-Learnings phase). As loader/contract conformance that's fine, but it means every trim recommended here requires a paired test edit. Not a defect — a coordination cost to budget for; any de-narration PR must touch the test in the same commit.

11. **[S] Justified divergence from `_shared/html-authoring` — keep it.** The issue/library HTML comes from `render-issue.js`, not the shared emit substrate, and that's correct: a digest is a read-from-`file://` consumption artifact, not a stakeholder-review doc needing the pmos-comments overlay. It still carries `<meta name="pmos:skill" content="magazine">`. No fix needed; recorded so a future reviewer doesn't "unify" it.

12. **[P] Caps and bounds all trace to specs — don't soften them.** 3–5 bullets / soft ≤240 chars (`2026-06-03_magazine/02_spec.html`), foreground-drain bound + 30-min claim TTL ("generous vs. a long episode"; `2026-06-07_magazine-transcription-queue/02_spec.html`), forward-only cursor seeding, install refusal conditions. Each prevents a named failure (issue bloat, stranded claims, runaway back-catalogue pulls, useless schedulers). The steelman holds.

## Flags inventory

| flag | purpose | verdict |
|---|---|---|
| `--days N` | lookback override (stored default in `interest.yaml`) | keep — flag-overrides-stored-default is the right pattern |
| `--feed <name>` | single-feed build | keep |
| `--max-per-feed N` | per-feed cap override | keep |
| `--format <html\|md\|both>` | output format — "reserved", HTML-only in v1 | **delete until implemented** |
| `--non-interactive` / `--interactive` | mode contract | keep (repo contract) |
| `add --type`, `add --name` | override inferred feed type/slug | keep |
| `add --from <file>` | assisted import (CSV/OPML/image) | keep |
| `add --bundle <id>`, `--medium` | starter-bundle import; medium disambiguation | keep; document `--medium` only under `add --bundle` |
| `curate --audience`, `--media` | curate targeting | fold into natural language — curate is conversational and rare; "curate a podcast catalog for designers" works |
| `curate --out <dir>` | curate write target | keep — the maintainer-refresh safety path depends on it |
| `watch --install/--status/--run-now/--uninstall` | worker lifecycle | rename to positional `watch install` etc. (match script + sibling verbs); keep flags as aliases |
| `watch --interval/--max/--ac-only/--backfill` | worker tuning at install | keep, but move out of the top-level argument-hint — they're `watch install` options, not `/magazine` options |

The top-level argument-hint lists ~16 flags; after the moves above it lists ~8 and reads like a command, not a man page.

## Gates & rubrics inventory

| check | hard/soft | failure it catches | verdict |
|---|---|---|---|
| Never-fabricate / degraded-card rule | hard (prose) | invented summaries — the product's trust premise | keep-hard; state once, prominently (finding 4) |
| Cursor advances only on full completion | hard (script + test) | interrupt drops/double-counts items | keep-hard |
| `enqueue`/`drain` never advance cursors or render | hard (script + `watch.test.sh`) | background worker silently changing "what's new" | keep-hard |
| Closed tag registry (`tags.yaml` only; `uncategorized` bucket) | hard | tag sprawl making filters useless | keep-hard |
| Batch-approve before any `feeds.yaml` append | soft (Recommended auto-pick) | silent subscription mutation | keep |
| `watch install` refusal (whisper detected AND ≥1 podcast feed) | hard | installing a scheduler that can never do work | keep-hard |
| Install smoke check (scheduler-PATH + model resolution) | hard, warns | the "worker silently transcribes nothing" failure (retro-traced) | keep-hard |
| `curate` never writes into `${CLAUDE_SKILL_DIR}` | hard | data loss on plugin-cache wipe | keep-hard |
| `bundles.js validate-data` + `bundles.test.sh` | hard | shipped bundles drifting from catalog | keep-hard |
| `structure.test.sh` SKILL.md heading assertions | hard | loader/contract drift — but also pins prose | keep, edit in lockstep with any trim (finding 10) |
| Script `--selftest`s (hermetic, no network) | hard | regressions in the deterministic substrate | keep-hard |
| Stale-ledger / orphan-cursor surfacing | soft | renamed feed silently resetting its window | keep |

Nothing here earns delete. Magazine's machinery is in scripts and tests where it belongs; the problem is prose duplication, not over-gating.

## Fix list

| fix | type | impact | risk |
|---|---|---|---|
| De-narrate Phase 3 to the 4 agent-relevant sentences; Phase 2's dedup prose to 2 lines (finding 1) | structural | high | low — scripts/references already carry the content; update `structure.test.sh` in the same commit |
| Collapse Phase 1's dispatch list to a 7-line routing table pointing at references (finding 2) | structural | high | low — `import.md` is already authoritative |
| Hoist the trust rule to one prominent statement; delete scattered restatements (finding 4) | quick-win | med | none |
| Strip FR-tags from SKILL.md body (finding 3) | quick-win | med | none — references keep traceability |
| Delete `--format` until implemented (finding 6) | quick-win | med | none — "reserved" today |
| Slim argument-hint: drop watch-tuning + curate flags to their subcommand docs (flags table) | quick-win | med | none |
| Accept positional `watch install` (aliases for flag forms) (finding 7) | quick-win | low | low — additive |
| Trim whisper-probe paragraph to the positive instruction (finding 5) | quick-win | low | none |
| Extract Track-Progress + Capture-Learnings to `_shared/` (finding 8) | structural (cross-skill) | med | med — touches all 6 learnkit skills + their structure tests; do as its own pass |
