# Dogfood run — story 260624-fbd (critique-rubric substrate)

**Date:** 2026-06-25
**Story:** 260624-fbd — `_shared/critique-rubric/` substrate for `/artifact-critique` (epic 260624-kkw, pmos-toolkit, route:skill)
**Branch:** `feat/260624-fbd`

## What was built

The single home (Inv-1) for the `/artifact-critique` rubric, authored as `_shared` substrate with **no SKILL.md** (the SKILL.md is the dependent story `aa8`, built next):

- `plugins/pmos-toolkit/skills/_shared/critique-rubric/heuristics.md` — 11 named, doc-type-agnostic critique heuristics, each `### \`handle\` — Title` with Rule / sharp line / "what it demands".
- `.../axes.md` — the fixed 10 axes (Customer · Solution · Scope · Metrics · Pricing · Strategy · GTM · Stage · AI · Risks), each citing its heuristics by handle.
- `.../doc-types.md` — §1 verdict scale (STRONG/MIXED/WEAK/ABSENT/N/A), §2 doc-type × axis applicability map (PRD/Strategy/POV/Roadmap, with `E`/`N/A`/`C` cells + conditional footnotes + hybrid-union rule), §3 the `pmos-critique-findings/v1` output schema with the fixed axis enum and field-rule table.
- `.../selftest.mjs` — deterministic internal-consistency checker (§H: a script counts, never an LLM). Exit 0/1/2.
- `docs/pmos/features/2026-06-24_artifact-critique/corpus-samples/` — 3 vendored **synthetic, anonymized** critique-output exemplars (one `.md` source doc + one `.json` critique each): an internal-platform PRD (Pricing N/A + build-vs-buy Strategy + AI N/A), a two-sided marketplace strategy (Solution N/A + supply-side gap), and an AI reply-drafting PRD (AI axis applicable, WEAK — exercises the Behavior-Contract check).

## TDD

`selftest.mjs` was authored **fail-first** against the empty/partial directory and walked RED → GREEN as each artifact landed. C5 (enum parse) and C7 (Inv-6 dangling-cite allowlist) each surfaced a real issue during the RED→GREEN walk; both fixed (enum marker line reworded; epic seed-brief added to the legitimate-lineage allowlist).

## Verification

| Gate | Result |
|---|---|
| `selftest.mjs` (C1–C7 + per-fixture `validateFindings`) | **PASS, exit 0** — axes ⊆ map ⊆ schema enum; 11/11 heuristic handles defined and cited (0 dangling, 0 orphan); all 3 samples conform to `pmos-critique-findings/v1`; Inv-6 clean |
| Quote grounding (Inv-3) | **28/28 quotes** verbatim, whitespace-normalized ≥40-char substrings of paired source docs; 0 problems |
| `applicable===false ⇔ verdict==="N/A"` | holds on every axis of every sample |
| `tools/lint-phase-refs.sh` | PASS (56 skills scanned) — substrate has no SKILL.md, unaffected |
| skill-eval | **N/A** — no SKILL.md in this story; the SKILL.md (`aa8`) carries the eval gate |
| Blind adversarial judge (general-purpose subagent, unprimed) | **SHIP — 5/5/5/5/5**, 0 Blockers, 0 Should-fix, 2 Nits |

### Blind judge

A general-purpose subagent reviewed the substrate + corpus cold (not told the expected verdict), hand-verified 28 quotes against sources, reproduced the map parser, and independently checked handle coverage and applicability consistency. Verdict **SHIP 5/5/5/5/5**. Two Nits:

1. §3 `E-applicable-consistency` table row read as if the substrate self-check covered the full assertion when the map-set/union half is deferred to the skill's `critique-eval.mjs`. **Fixed** — the row now states the biconditional is enforced by `selftest.mjs` and the live map-set half by `critique-eval.mjs`. Selftest re-run GREEN after the edit.
2. Loose axis-name regex `[A-Za-z/]+` — harmless; a malformed multi-word heading would be caught downstream by the C1 count mismatch. Left as-is (judge agreed: not exploitable).

## Honest notes

- **Synthetic corpus.** The confidential real corpus under `~/Downloads/critique/` was **never read or committed**, per the standing constraint. All three samples are invented (names/numbers/products fabricated) and carry an explicit "Anonymized synthetic sample" banner in their `.md`. They are sufficient to exercise every conditional in the applicability map (Pricing N/A, AI applicable vs N/A, Strategy E-promotion, two-sided completeness) and serve as the eval fixtures the dependent `critique-eval.mjs` will run against.
- **Division of labor with `aa8`.** The substrate `selftest.mjs` checks fixture *shape* and internal cross-file consistency. The against-live-source half of Inv-3 (`E-quote-in-source`) and the doc-type map-set check are explicitly deferred to the skill's `critique-eval.mjs` (built in `aa8`), which has the live document to resolve `C` cells. This is disclosed in `doc-types.md` §3.
- **Epic not yet fully built.** After `fbd`, story `aa8` (the SKILL.md) remains. Loop-3 `/complete-dev --epic 260624-kkw` only after `aa8`.
