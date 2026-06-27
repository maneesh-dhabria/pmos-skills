---
schema_version: 1
id: 260626-af6
kind: story
title: "curated-references — Playwright title + content backfill"
type: tech-debt
priority: should
status: released
route: skill
parent: 260626-j5k
dependencies: []
worktree:
plan_doc: docs/pmos/features/2026-06-26_learn-list-corpus-hygiene/stories/260626-af6/03_plan.html
tasks_file: docs/pmos/features/2026-06-26_learn-list-corpus-hygiene/stories/260626-af6/tasks.yaml
claimed_by: build:e385ea38
driver_holder: build:e385ea38
pr:
labels: [learn-list, primer, pmos-learnkit, skill, corpus]
created: 2026-06-26
updated: 2026-06-27
---

## Context

The title-recovery half of epic `260626-j5k`. 611 / 1,817 (34%) records in
`plugins/pmos-learnkit/skills/_shared/topic-research/curated-references.json` carry a junk display title
(305 empty, 179 `"Just a moment..."`, 98 `"Amazon.com"`, 11 `"403 Forbidden"`, 10 `"429"`, 8 WAF). Build a
headless-Chromium (Playwright) backfill pass that recovers the real title — and, where the summary is
ungrounded, the body content — for each junk record, writing the cleaned corpus back.

Proven over a 50-record sample (2026-06-26): 90% reachable, 70% clean first pass. The shipped script must
harden the prototype's known failure modes.

Two scope additions verified live 2026-06-26: (1) **205 of the 1,817 refs are X/Twitter URLs** with generic
`"Thread Reader App"` titles and 149 ungrounded — recoverable via server-rendered meta (`document.title` +
`og:description`) despite the SPA login wall (design D8); (2) the ~800 total navigations need **throttling**
(per-host serialization, jitter, 429-aware backoff) so the burst doesn't earn rate-limit junk that recreates
the very defect being fixed (design D9).

## Acceptance Criteria

- [ ] A reusable script recovers titles via `og:title` → `document.title` → `<h1>`, following redirects to the canonical URL, and writes the cleaned corpus back (idempotent; re-runnable)
- [ ] Recovery escalation ladder (design D5): headless+networkidle → cooldown-retry on junk/host-only → **real (non-headless) Playwright browser** → URL-slug last resort. Applied to generic/error titles like `Amazon.com` too, not just empty ones
- [ ] Cloudflare/JS-challenge pages handled: `networkidle` settle + one cooldown-retry clears the challenge the 2.5s prototype wait missed
- [ ] Amazon (98 records) recovered via the real-browser escalation (proven to work interactively); URL-slug fallback only if the real browser also fails, and slug-derived titles are marked for audit
- [ ] Navigation timeout raised (25s → ~40s); transient errors retried, not fatal
- [ ] Drop policy is CONSERVATIVE (design D6): a record is dropped ONLY when confirmed genuinely-dead (hard 404 / dead domain / `"Deployment Paused"`) AFTER the full escalation ladder; alive-but-hard-to-fetch records are kept with their recovered title, never dropped, never re-shipped with an error label
- [ ] X/Twitter records (205 refs; design D8) use a host-specific branch — title from `document.title` (strip ` / X`), summary-grounding from `og:description` (server-rendered meta survive the SPA login wall); link/image-only tweets stay WEAK (no fabricated summary), tombstones fall to D6 drop. The 149 ungrounded tweets are explicitly in scope, not skipped by the generic article handler
- [ ] Throttling (design D9) is first-class: per-host serialization + randomized politeness delay, bounded global concurrency, `429`/`503`/challenge-aware exponential backoff honouring `Retry-After`. A host still rate-limited after the retry budget is recorded as **rate-limited, not dead** (kept + flagged for re-run, never dropped); the report lists the rate-limited worklist for an idempotent second pass
- [ ] Records with `summary_grounded:false` are re-summarized from recovered body content in the same pass and flipped to grounded only when a real summary is produced
- [ ] Junk-title rate over the full corpus drops to <5% (report before/after counts)
- [ ] T1 PII scrub gate (`tests/test_pii_scrub_gate.sh`) passes GREEN over the regenerated corpus
- [ ] `/learn-list browse` + `/primer` library viewers and `curated-references-match.mjs` IDF prefilter verified correct against the regenerated corpus
- [ ] Zero-dep posture respected (Playwright is a build-time tool, not a runtime skill dependency); conforms to `skill-patterns.md §A–§L`, passes `skill-eval.md`

## Notes

Read-only prototype + proof: session scratchpad `backfill-prototype.mjs` + `backfill-report.json`
(50-record run: 35 clean / 10 host-only-weak / 2 still-junk Amazon / 3 errors). Re-author as the shipped
script under the topic-research substrate. Run before `260626-ex8` so re-summarized records get re-tagged
under the new vocabulary.

### Build outcome (2026-06-27, build:e385ea38) — DONE

Shipped `scripts/backfill-titles.mjs` (D5 escalation ladder, D6 conservative drop, D8 X/Twitter branch,
D9 throttling) + `tests/backfill_titles_unit.mjs` (35/0) + D3 doc-wiring (importer header +
`curated-references.md`). Full 817-record headed-Chromium pass over the corpus:

- **junk-title rate 33.68% → 0.44%** (AC: <5% ✓); 1817 → 1797 records (12 confirmed-dead drops + 8 dedupe).
- titles recovered 778, re-summarized 424, slug-fallback 5, **0 rate-limited**, 352 id-remints (canonical URL).
- **Dedupe-by-id fix:** URL canonicalization (Amazon `/dp/ASIN`, tweet redirect) collapsed 8 pairs onto one
  canonical id; added deterministic `dedupeById()` (grounded > longer summary > longer title > first) so the
  corpus never ships duplicate id+url rows. Reported as `dedup_collapsed`.

**All ACs met.** Gates: unit 35/0 · PII scrub gate PASS (1797) · prefilter suite PASS + live sample · skill-agnostic
PASS · `/learn-list` live-DOM render (1797 cards, recovered titles present, 0 junk titles, 0 PII leak) ·
skill-eval [D] learn-list 22/0 + primer 22/0 + book-summary 21/0 (exit 0) · 4 repo lints + audit EXIT0.
Schema-diff verified: only title/summary/grounded + 12 drops + 8 dedupe + reported remints; no new fields,
0 dup ids/urls. Impl `95a88fb1` on `feat/260626-af6` (worktree kept). Unblocks `260626-ex8` (tag vocabulary).
