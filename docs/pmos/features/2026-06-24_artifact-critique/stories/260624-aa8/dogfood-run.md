# Dogfood run — story 260624-aa8 (`/artifact-critique` SKILL.md)

**Date:** 2026-06-25 · **Mode:** standalone (Loop-2 autonomous build) · **Branch:** `feat/260624-aa8`

## What was exercised

Authored the new skill `plugins/pmos-toolkit/skills/artifact-critique/` (SKILL.md + reference/ingest.md +
reference/voice-rubric.md + scripts/critique-eval.mjs + tests/critique-eval.test.mjs) over the `fbd`
critique-rubric substrate, then ran the skill's own reasoning on a **fresh synthetic doc that does not
exist in the corpus** — a Payments H2 **roadmap** — to genuinely exercise the pipeline rather than
re-validate a fixture.

The roadmap was chosen on purpose: the `fbd` corpus only carries a PRD and a strategy doc, so a roadmap
exercises a **different applicability column** (`doc-types.md` §2 Roadmap: Pricing → `N/A`, AI → `N/A`,
Customer → `C` resolved to `E`). This drives the `ABSENT`-vs-`N/A` resolution down a path the fixtures
never touch.

## Steps

1. **Phase 1 ingest** — read `dogfood/roadmap-payments-h2.md`; built the §1–§6 section map; recorded the
   one unreadable-adjacent limit (no linked eng design) for `limits[]` (Inv-5).
2. **Phase 2 doc-type** — detected `roadmap` (`type_confidence: detected`); resolved the applicable set
   from `doc-types.md` §2 — Pricing `applicable:false`/`N/A`, AI `applicable:false`/`N/A`, the rest `E`.
3. **Phases 3–6** — scored all 10 axes single-pass (2× STRONG-Solution/Strategy/Stage, 2× WEAK with named
   gaps Metrics/GTM, MIXED elsewhere); 2 weakest-claims (no padding, Inv-4); opening + bottom-line that
   credits strengths first.
4. **Phase 7 emit + Tier-1 gate** — produced `dogfood/roadmap-payments-h2.findings.json` (a valid
   `pmos-critique-findings/v1` instance) and ran the deterministic hard gate.

## Results — all green

| Gate | Result |
|---|---|
| `critique-eval.mjs` on the dogfood roadmap findings | **PASS** exit 0 — schema conforms; 10 axes complete; applicable⇔N/A; **every quote ≥40 chars and verbatim in source**; gaps named; weakest ranked |
| `critique-eval.test.mjs` (fail-first harness) | **PASS** — 23 assertions (clean fixtures pass; every E-check fails-first on its mutant; exit-2 posture holds) |
| `skill-eval-check.sh` [D] | **EXIT 0** — zero residuals (a-name-matches-dir, desc 824 chars, Platform Adaptation, Track Progress, learnings load + Capture-Learnings phase, scripts/, i-hint-contract-only, j-phase-refs-resolve all pass) |
| `lint-non-interactive-inline.sh` | **PASS** — `artifact-critique/SKILL.md` NI block byte-identical to canonical |
| `lint-flags-vs-hints.sh` | **PASS** — argument-hint ↔ body flag docs in sync |
| `lint-phase-refs.sh` | **PASS** — every phase reference resolves |
| `audit-recommended.sh` | **PASS** — 1 AskUserQuestion call, 0 unmarked (1 defer-only: ambiguous) |
| `critique-rubric/selftest.mjs` (substrate, Inv-6 guard) | **PASS** — Inv-6 clean *with* the new `artifact-critique/` citations now present |
| `check-comments-coverage.sh` | **PASS** (untouched — see roster note below) |

## Decisions / deviations

- **Comments-coverage roster — deliberately NOT added.** T7 listed "add `/artifact-critique` to the
  comments-coverage roster", but that roster is the **13 doc-authoring pipeline skills + feature-sdlc**
  whose artifacts get comment-*resolved back into themselves* (each requires an
  `apply-edit-at-anchor.test.js` shim). The direct sibling `design-crit` — also a standalone HTML-emitting
  critique — is **not** on the roster (`grep -c design-crit = 0`). `/artifact-critique` is **critique-only**
  (D1/Inv-6: the rewrite is delegated to `/artifact`), so it implements no comment-resolution apply-edit
  contract; adding it would falsely assert one. Followed the `design-crit` precedent. The skill's HTML still
  carries the read/annotate comments overlay automatically via the idempotent html-authoring asset copy.

## Invariants confirmed

- **Inv-1** (one rubric home) — the SKILL.md and `critique-eval.mjs` *cite* `_shared/critique-rubric/`; the
  axis enum is parsed from `doc-types.md` at runtime, never hardcoded. skill-eval + substrate selftest green.
- **Inv-3** (quote grounding) — `E-quote-in-source` verified every dogfood quote is a verbatim,
  whitespace-normalized substring of the live source.
- **Inv-4** (no padding) — 3 STRONG verdicts given freely; weakest-claims held at 2 (not forced to 3).
- **Inv-5** (honest about limits) — the missing eng-design link is named in `limits[]`, not scored ABSENT.
- **Inv-6** (dangling-cite guard) — substrate selftest's C7 stays clean now that `artifact-critique/` is the
  expected new citer; no `/artifact` cite ships.
- **AC7** (voice) — `grep "Gokul Rajaram"` across the skill tree returns nothing; the persona is the
  unnamed seasoned-product-leader archetype, and `voice-rubric.md` §1 hard-bans naming a real person.
