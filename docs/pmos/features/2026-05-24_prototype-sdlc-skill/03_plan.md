---
title: /prototype-sdlc — execution plan
tier: 2
based_on: 02_spec.md
execution_mode: inline
---

# /prototype-sdlc — plan

## Wave 1 — sequential implementation (single editor, no parallelization needed)

### T1: Create `plugins/pmos-toolkit/skills/prototype-sdlc/SKILL.md`

- Implements FR-PSDLC-01.
- Model: `plugins/pmos-toolkit/skills/skill-sdlc/SKILL.md` (the existing thin-alias pattern).
- Frontmatter `name: prototype-sdlc`, `description:` with ≥5 trigger phrases per spec, `argument-hint:` enumerating every flag the underlying mode honors.
- Body: ≤80 lines, one instruction paragraph + 2–3 worked examples + Platform Adaptation stanza.
- Verify: `wc -l plugins/pmos-toolkit/skills/prototype-sdlc/SKILL.md` ≤80; grep for the five trigger phrases.

### T2: Edit `plugins/pmos-toolkit/skills/feature-sdlc/SKILL.md` — Phase 0 dispatch

- Implements FR-PSDLC-02.
- Insert `prototype` into the token-1 disambiguation paragraph (alongside `skill` and `list`).
- Add three rows to the dispatch table: `prototype <description>`, `prototype` (no description → usage error), `prototype --resume` (ignore subcommand).
- Verify: `grep -c "prototype" feature-sdlc/SKILL.md` matches expected count; the dispatch table renders correctly in chat.

### T3: Edit feature-sdlc Mode × phase table + Pipeline-position diagram

- Implements FR-PSDLC-03.
- Add `prototype` column to the table near top of SKILL.md per spec.
- Update the `## Pipeline position` ASCII diagram with a third branch for `prototype` mode.

### T4: Add "## Prototype-mode phase ordering" section to feature-sdlc

- Implements FR-PSDLC-06.
- New H2 explaining the spec/wireframes/prototype reordering for prototype mode.
- Cross-reference from Phase 3b, 3c, and 4 sections.

### T5: Edit Phase 3b /wireframes — hardness in prototype mode

- Implements FR-PSDLC-04 (3b half).
- Add `pipeline_mode == prototype` short-circuit at top of Phase 3b: skip the gate, log, always run, hard-phase failure dialog on failure.

### T6: Edit Phase 3c /prototype — hardness in prototype mode

- Implements FR-PSDLC-04 (3c half).
- Mirror T5 for Phase 3c.

### T7: Edit Phase 9 final-summary — prototype-mode branch

- Implements FR-PSDLC-08.
- Add a `pipeline_mode == prototype` block: artifact list, no merge/tag, the documented continuation one-liner.

### T8: Edit `reference/state-schema.md`

- Implements FR-PSDLC-07.
- Bump `schema_version: 5`; add `prototype` to phase-set tables; add v4→v5 migration row.

### T9: Update feature-sdlc frontmatter

- Implements FR-PSDLC-09 + FR-PSDLC-10 (trigger phrases half).
- Append `prototype`, `list` to `argument-hint` (if not already present).
- Append `prototype` trigger phrases to `description`.

### T10: README row

- Implements FR-PSDLC-10 (README half).
- Add `/prototype-sdlc` row under "Pipeline orchestrators" in `README.md`.

### T11: Update CLAUDE.md? — none

- No CLAUDE.md changes needed. (The "## Skill-authoring conventions" section already covers thin-alias creation.)

### T12: Smoke check, then hand to /skill-eval

- Run all five manual smoke tests from the spec mentally (no integration test harness change).
- Confirm SKILL.md ≤80 lines, both plugin.json files at same version, README row present.
- Hand to Phase 6a (/skill-eval).

## Wave 2 — gates (handled by /skill-eval, /verify, /complete-dev separately)

- T13: /skill-eval — binary rubric pass against `reference/skill-eval.md`.
- T14: /verify — re-run eval + spec compliance + best-effort release-prereq grading.
- T15: /complete-dev — sole writer of plugin.json version bumps, CHANGELOG/README maintenance, merge, tag, push to both remotes.

## Release prerequisites

Surfaced here per Convention 13. NOT included in any wave above — `/complete-dev` is the sole writer.

- Both `plugin.json` files bumped (minor) and synced.
- `CHANGELOG.md` regen via `/changelog`.
- README row for `/prototype-sdlc` (T10 already drafts the row; /complete-dev may polish).
- Learnings header: NONE (rides on /feature-sdlc per FR-PSDLC-12).

## Risks

- **R1:** The prototype-mode phase reordering (FR-PSDLC-06) may collide with the existing resume-cursor logic in Phase 0b. Resume cursor scans `phases[]` in declared order and picks the first non-completed entry — if the declared order in v5 schema lists phases in the prototype-mode execution order (requirements → grill → creativity → spec → wireframes → prototype), the cursor naturally does the right thing. **Mitigation:** in state-schema.md, declare prototype-mode `phases[]` in execution order, not in the feature-mode source order.
- **R2:** Token-1 disambiguation: `/prototype-sdlc "list users"` — `list users` is the seed (multi-word), not the `list` selector. The existing rule "selector only when sole token OR next is a recognised flag OR remainder is exactly one quoted arg" handles this: `"list users"` is one quoted arg so its first token-after-strip is `list` which COULD trigger the selector. **Mitigation:** the disambiguation rule applies to the un-quoted argv tokens; `"list users"` is a single argv element, so token-1 = the whole string = `list users`, not `list`. Add a test note to the spec smoke-test #5.
- **R3:** State schema v5 bump triggers the existing auto-migration chain. **Mitigation:** v4→v5 is purely additive (new valid enum value); the migration step is a no-op write (idempotent rewrite of state.yaml with schema_version: 5). Safe.
