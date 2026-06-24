# Plan — Story D · prevention reference + drift-lint (260624-aqb)

**Epic** 260624-3jp · **route** skill · **plugin** pmos-toolkit · **depends on** 260624-cg6 (story A).
**Design** `../../02_design.html` — cite `#c-prevention`, `#c-drift-lint`, `#d-gen`, `#invariants`.
**Reference** `feature-sdlc/reference/skill-patterns.md §A–§L` (esp. §K) + host `CLAUDE.md` (canonical
skill path; byte-identical non-interactive block).

## Overview

This is impeccable's **prevention face** plus its **cross-validator**, ported as a pure consumer of the
story-A engine. Two deliverables:

1. **The generated floor** — `_shared/slop-engine/design-slop-rules.md`, DON'T lines grouped by
   `skillSection`, **generated** from the registry's `SLOP_RULES[].skillGuideline` fields via story A's
   `gen-rules-doc.mjs` (D-GEN, Inv-2 — not hand-authored, idempotent). Cited as a **floor** (one line,
   per §K — cite, never restate) by `/wireframes`, `/prototype`, and frontend `/execute`, alongside each
   surface's existing DESIGN.md house-style cite (grill-confirmed: **all three**).
2. **The drift-lint** — `tools/lint-slop-rules.sh` (repo-root, bash-3.2-safe) asserts every
   `skillGuideline` substring is present in the floor; fails loudly on drift (ports
   `validateAntipatternRules()`). Wired into `skill-hygiene.yml`; a deliberately-broken fixture proves
   it fails.

Story A is the **sole author** of the engine (Inv-1). This story never edits `registry.mjs` or the
generator — it runs them and cites their output. Story A arrives in this worktree via the D9 claim-time
merge of 260624-cg6, so `registry.mjs` + `gen-rules-doc.mjs` are present before any task runs; if either
is absent or errors, **stop and surface the claim-merge gap — never hand-write the floor**.

## Ordering — generate → cite → lint → CI

The build follows a strict dependency chain so each link is verifiable before the next:

1. **Generate** (T1) — produce `design-slop-rules.md` from the registry; assert idempotence + full
   `skillGuideline` coverage. This is the artifact everything else points at.
2. **Cite** (T2) — add the one-line floor cite to the three SKILL.md surfaces (depends on T1: the floor
   path must exist before it is cited). §K one-liner each; no rule text duplicated.
3. **Lint** (T3, parallel with T2) — `tools/lint-slop-rules.sh`; depends only on T1 (needs a real
   registry+floor pair to test against), so it builds alongside the cites.
4. **CI** (T4) — wire the lint into `skill-hygiene.yml` + add the broken fixture; depends on T3 (the
   script must exist to wire it).
5. **Gates** (T5) — Inv-3 grep clean, skill-eval green for the 3 skills, 4 lints + audit + coverage.
6. **Dogfood** (T6) — break → fail → regenerate → pass, end-to-end on the real engine.

## Risk

- **Drift-lint substring brittleness (short substrings).** A `skillGuideline` that is a very short or
  common phrase (e.g. a 2–3 word fragment) could match the floor *incidentally* — present, but not in
  the line the rule actually authored — masking a real drift, or conversely break on innocuous floor
  re-wording. **Mitigation:** the contract is a verbatim ≥3-word substring of the matching DON'T line
  (design `#engine-internals`: `skillGuideline` = a "3–6-word substring"); the lint asserts exact
  substring presence, and the generator *writes* the floor from the same field, so the two cannot diverge
  by construction. The lint catches the manual-edit drift case (someone hand-edits the floor); the
  generator+idempotence test catches the floor-out-of-date case. Treat any guideline shorter than ~3
  words as a registry smell to flag back to story A (do not weaken the lint to tolerate it).
- **Claim-merge gap.** If the D9 merge of story A is incomplete, the generator/registry may be missing —
  T1 stops loudly rather than fabricating a floor (Inv-1 protects the single source of truth).
- **Cite drift into restating.** The temptation is to paste rule text into the SKILL.md cites; §K forbids
  it. Each cite is one line pointing at the floor path — skill-eval + a manual diff confirm no rules were
  inlined.

## Final verification checklist

- [ ] `gen-rules-doc.mjs` run twice over an unchanged registry → byte-identical `design-slop-rules.md`
      (**generator idempotent**); every `SLOP_RULES` entry with a `skillGuideline` appears under its
      `skillSection` heading.
- [ ] `tools/lint-slop-rules.sh` **fails (exit 1)** on the deliberately-broken fixture, naming the
      drifted rule; **passes (exit 0)** on the real registry ↔ floor pair (**fails-then-passes**).
- [ ] **Three cites present** — `/wireframes`, `/prototype`, frontend `/execute` each carry a one-line
      floor cite alongside their DESIGN.md cite; no rule text duplicated (§K).
- [ ] `skill-hygiene.yml` runs `lint-slop-rules` alongside the existing lints; its `paths:` trigger
      includes the engine + floor + lint paths.
- [ ] **skill-eval green** (EXIT 0) for /wireframes, /prototype, /execute; argument-hints, phase anchors,
      and the non-interactive inline block unchanged.
- [ ] 4 repo lints (flags-vs-hints, phase-refs, non-interactive-inline, slop-rules) + audit-recommended +
      comments-coverage all clean.
- [ ] **Inv-3**: `grep -ri impeccable` over this story's new/edited files hits only design-doc lineage
      prose / the engine NOTICE (neither introduced here).
- [ ] Live dogfood evidence (break → fail → regenerate → pass, registry reverted) saved under this
      story's dir; no forked registry left behind.
