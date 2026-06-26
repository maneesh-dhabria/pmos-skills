---
schema_version: 1
id: 260626-af6
kind: story
title: "curated-references — Playwright title + content backfill"
type: tech-debt
priority: should
status: ready
route: skill
parent: 260626-j5k
dependencies: []
worktree:
plan_doc:
tasks_file:
claimed_by:
pr:
labels: [learn-list, primer, pmos-learnkit, skill, corpus]
created: 2026-06-26
updated: 2026-06-26
---

## Context

The title-recovery half of epic `260626-j5k`. 611 / 1,817 (34%) records in
`plugins/pmos-learnkit/skills/_shared/topic-research/curated-references.json` carry a junk display title
(305 empty, 179 `"Just a moment..."`, 98 `"Amazon.com"`, 11 `"403 Forbidden"`, 10 `"429"`, 8 WAF). Build a
headless-Chromium (Playwright) backfill pass that recovers the real title — and, where the summary is
ungrounded, the body content — for each junk record, writing the cleaned corpus back.

Proven over a 50-record sample (2026-06-26): 90% reachable, 70% clean first pass. The shipped script must
harden the prototype's known failure modes.

## Acceptance Criteria

- [ ] A reusable script recovers titles via `og:title` → `document.title` → `<h1>`, following redirects to the canonical URL, and writes the cleaned corpus back (idempotent; re-runnable)
- [ ] Cloudflare/JS-challenge pages handled: wait for `networkidle` / longer settle; retry once when the recovered title is host-only (e.g. `medium.com`)
- [ ] Amazon pages recovered via non-headless context or a URL-slug fallback (pure-headless returns a captcha shell)
- [ ] Navigation timeout raised (25s → ~40s); transient errors retried, not fatal
- [ ] Genuinely-dead pages (e.g. `"Deployment Paused"`, hard 404) are DROPPED, never re-shipped with an error-page title
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
