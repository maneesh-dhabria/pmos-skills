# Eval rubric — self-review for a book summary

## Contents

- [How this is used](#how-this-is-used)
- [Trust checks (hard)](#trust-checks-hard) — R1–R3
- [Shape checks (hard)](#shape-checks-hard) — R4–R5
- [Taste checks (advisory)](#taste-checks-advisory) — R6–R7

The binary self-review the SKILL.md Phase 7 reviewer pass runs (≤2 loops, per `_shared/reviewer-protocol.md`). Each check is pass/fail with a how-to-verify line. Per `skill-patterns.md §H`, deterministically-decidable and trust checks are **hard** (block the write or trigger the recovery note); judgment-call taste checks are **advisory** (surfaced with severity + cited span, never silently passed).

## How this is used

The reviewer subagent (dispatched `model: sonnet` — bounded scoring, parent-side validated) receives the draft, the `*.sources.json` ledger, and this rubric. It returns one JSON object per check `{check_id, verdict, fix_note, quote}` (`quote` = ≥40-char verbatim span grounding a fail). The SKILL.md Phase 7 logic validates quotes against the source, auto-applies fixes once, re-runs once, then surfaces residuals — never silently ships a hard-check failure.

## Trust checks (hard)

| id | check | how-to-verify |
|---|---|---|
| **R1 — fetched-this-run** | Every source link emitted in the artifact was fetched during this run and identity-matched to the canonical book. | Each `<a href>` is a verbatim member of `*.sources.json[].url` whose `verification` records a successful fetch + identity-match this run. |
| **R2 — grounded** | Every shipped takeaway is grounded in ≥1 fetched **T1 or T2** source; no T3-only claim ships unflagged. | For each takeaway, ≥1 evidence entry is tier T1/T2; any T3-only takeaway carries the explicit social-sourced flag (`reference/source-taxonomy.md` § "Grounding rule"). |
| **R3 — identity-matched** | No source is about a different, same-titled work. | Each ledger entry's `identity_match` is true against the Phase 2 canonical `{title, author}`. |

A hard trust failure surviving the re-run blocks the normal write — the run emits the honest-degradation result (SKILL.md Phase 7), never a summary that cites unverified material as verified.

## Shape checks (hard)

| id | check | how-to-verify |
|---|---|---|
| **R4 — PM-lens complete** | Every takeaway carries the full five-part shape (idea → why → product decision → concrete application → evidence). | Per `reference/takeaway-contract.md`; a takeaway missing any part fails. |
| **R5 — heading + sections.json** | The artifact passes the heading-id + sections.json gates. | Every `<h2>`/`<h3>` has a stable kebab `id`; `*.sections.json` id set equals the on-page id set in document order (deterministic — `_shared/html-authoring/README.md` § "Heading-id enforcement"). |

## Taste checks (advisory)

| id | check | how-to-verify |
|---|---|---|
| **R6 — no-caps honored** | Theme count and takeaways-per-theme are driven by the book, not a fixed N or a depth ceiling. | Judge whether the structure looks truncated/padded vs. organic (`reference/takeaway-contract.md` § "No caps"). Surface, don't block. |
| **R7 — themes coherent + ranked** | Themes are coherent clusters, importance-ranked; takeaways ranked within each theme. | Judge clustering quality + ordering. Surface with a cited span; user disposes or accepts as residual. |

Residual advisory failures after the loop cap are listed in the run summary, never hidden.
