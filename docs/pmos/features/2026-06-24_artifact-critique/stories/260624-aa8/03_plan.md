# Plan — Story B · /artifact-critique skill (260624-aa8)

Epic `260624-kkw` · route: skill · pmos-toolkit · **depends on `260624-fbd`** (the critique-rubric
substrate; claim-time merged per D9 so `_shared/critique-rubric/` is present before `skill-eval`).
Design contract: [`02_design.html`](../../02_design.html) — anchors `#skill-shape`, `#findings-schema`,
`#eval-checks`, `#voice`, `#resolved`, `#invariants`, `#substrate-map`. Implementation standard:
`feature-sdlc/reference/skill-patterns.md §A–§L`.

## Overview

Author the new pmos-toolkit skill **`/artifact-critique`** that gives a product document (PRD /
strategy / POV / roadmap, ≤50k chars) the opinionated, axis-by-axis review a seasoned product leader
would — a 10-axis verdict scorecard, quote-grounded per-axis deep-dives with a prescriptive "what I'd
want to see", and a forced-ranking of the weakest claims — as a written HTML artifact carrying an
embedded machine-parseable findings block, then hands off to `/artifact` to rewrite. Runs standalone
on any doc path (like `/grill`, `/design-crit`).

The skill **orchestrates**; all rubric data (axes, heuristics, verdict scale, applicability map,
findings schema) is **cited from the `fbd` substrate** (Inv-1) — never restated or forked.

## Files

| File | Purpose |
|---|---|
| `artifact-critique/SKILL.md` | phases 0–7; cites `_shared/critique-rubric/`; canonical NI block |
| `artifact-critique/reference/ingest.md` | path/paste/Notion/PDF/image extraction + section-ref mapping (D6) |
| `artifact-critique/reference/voice-rubric.md` | persona + voice rules + curated few-shot exemplar lines |
| `artifact-critique/scripts/critique-eval.mjs` | the §4.4 deterministic hard gate (reads schema from `doc-types.md`) |
| `artifact-critique/tests/` | fixtures driving `fbd`'s vendored anonymized corpus-samples |

## Tasks

See [`tasks.yaml`](./tasks.yaml). T1 SKILL.md skeleton → (T2 ingest ∥ T3 doc-type/scoring/deep-dive/
weakest-claims ∥ T5 critique-eval fail-first) → T4 synthesize+emit (findings block + Copy-markdown) →
T6 voice rubric + advisory reviewer → T7 quality gates + standalone dogfood.

## Decisions carried from the design

- **HTML-primary, `--format html|md`, drop `both`** (D3) — "Copy markdown" affordance keeps the
  paste-into-Slack workflow without a sidecar.
- **Embedded `<script type="application/json">` findings block** (define grill Q2) — the `/artifact`
  hand-off contract; schema lives in `fbd`'s `doc-types.md` (Inv-1), read here, not re-declared.
- **Single-pass axis scoring** (brief §4 phase 3) — keeps cross-axis reasoning intact; per-axis
  fan-out deferred as a latency optimization only.
- **Critique-only** (D1) — the rewrite is `/artifact`'s; no `/artifact` change and **no `/artifact`
  cite of the substrate** ships in v1 (Inv-6).

## Risks

- **Voice drift toward generic-helpful/hedged output** — the product's signature is opinionated,
  position-taking critique. Mitigation: explicit voice rubric (T6) + curated few-shot + the advisory
  reviewer scoring voice adherence.
- **Manufactured/nitpick findings to fill the scorecard** — violates Inv-4 (no padding). Mitigation:
  `STRONG` is freely given; weakest-claims may return 0; the advisory reviewer flags manufactured
  findings; the hard gate never *requires* a non-empty weakest-claims list.
- **Quote hallucination** — a critique grounded in a quote not actually in the source. Mitigation:
  the deterministic `E-quote-in-source` check (T5) verifies every quote is a verbatim substring; a
  failing quote hard-fails the gate (Inv-3).
- **Honesty about limits** — asserting `ABSENT` for content that may live in an unreadable visual or
  an annexure. Mitigation: Inv-5 — "not visible in this doc"; unreadable visuals named, not scored.

## Verification

- `critique-eval.mjs` exits 0 on the dogfood output (all 8 deterministic checks).
- `skill-eval` `[D]` + `[J]` pass (carry only genuine pre-existing residuals, proven via HEAD^1).
- 4 hygiene lints + `audit-recommended.sh` + `check-comments-coverage.sh` green;
  `/artifact-critique` added to the comments-coverage roster.
- Standalone dogfood on a real/anonymized doc emits the full critique + embedded findings block +
  Copy-markdown; Inv-5 + Inv-6 hold.
- **Release prerequisites** (version bump / changelog / README row / manifest version-sync /
  learnings header) are NOT in scope here — `/complete-dev` owns them at epic release.
