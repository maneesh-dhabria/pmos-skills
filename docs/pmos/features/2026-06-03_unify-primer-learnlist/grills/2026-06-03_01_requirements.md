# Grill — unify-primer-learnlist requirements (focused, 3 risky decisions)

**Date:** 2026-06-03
**Target:** `01_requirements.md`
**Scope:** focused (user-elected) — D5 cost, D8 callers, D3/D7 substrate boundary.

## G1 — D5: read-everything-per-topic cost (resolved)

**Challenge:** removing the short-circuit means a deep run can be ~96 fetch+read+synthesize ops (8–12 topics × 5–8 sources).
**Resolution:** the `--depth` dial is the sole governor (its matrix already bounds topics × sources). No per-source cap. Borrow `/learn-list`'s deep-mode behavior: **emit one est-cost log line before sourcing** (`~N source reads across M topics; proceeding`) so a large deep run is never a silent surprise. → feeds `sourcing.md` + `intake.md` dial matrix in spec.

## G2 — D8: retired-flag breakage safety net (resolved)

**Challenge:** the rejection error protects ad-hoc human use, but committed callers (other skills, READMEs, tests, examples) using `/learn-list --mode/--level` would break silently.
**Resolution:** add a `/plan` task to **grep the whole repo for `--mode`/`--level` callers of `/learn-list` and update them to `--depth`/`--audience`** during `/execute`. The runtime rejection error remains the net for ad-hoc human use. → spec must list this as an FR; plan task `g-grep-retired-flags`.

## G3 — D3/D7: substrate boundary — STRENGTHENED to a hard rule (resolved → new D12)

**Challenge:** what stops `_shared/topic-research/*.md` from rotting into `if primer… else learn-list…` conditionals?
**User ruling (stronger than the proposed option):** *"Why should references have anything to do with skill? It's on the skill to define how to use the references and manipulate the output. The shared substrate should not know about individual skills referencing it."*
**Resolution — D12 (new, governing):** the shared substrate is **fully skill-agnostic**. Each `_shared/topic-research/*.md`:
- describes only the **mechanism** and the **typed output** it emits (e.g. richness verdict ∈ {rich, narrow-by-design, thin}; a ranked verified shortlist per topic; the outline + its provenance rung);
- contains **no** mention of `primer` or `learn-list`, **no** per-skill reaction tables, **no** skill-name branching;
- the consuming `SKILL.md` owns 100% of the reaction to the typed output.

**Enforcement (spec FR + skill-eval/verify check):** grep `_shared/topic-research/*.md` for the literal tokens `primer` / `learn-list` (case-insensitive) → any hit fails the gate. This supersedes the weaker "may document reactions in a table" framing in the requirements draft.

## Net

3/3 risky decisions resolved; no new open questions. D12 added; D5/D8 gain a safety-net mechanism each. Proceed to /spec.
