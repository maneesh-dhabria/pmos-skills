# Execute log — story 260708-s5g (work-history feedback scorer)

**Epic:** 260708-23a · **Route:** skill · **Plugin:** pmos-managerkit · **Branch:** feat/260708-s5g
**Depends on:** 260708-we4 (extended scorecard-skeleton shape + work-history corpus) — merged into this worktree at claim time (D9).

## Tasks

### T1 — Register work-history archetype (AC1) — done
- `SKILL.md` archetype enum now lists `work-history` as the 8th bundled PM round type; "7 bundled" → "8 bundled" in the enum + setup phase.
- Added a paragraph documenting `work-history` as the **non-case** archetype (Topgrading-style chronological deep-dive, `guidelines_path: guidelines/work-history/`) whose bundled scorecard carries the additive `role-evidence` + `trajectory-synthesis` families on top of the competency `data-dim` sections, filled by a presence-guarded pass.
- No separate `role.json` enum file exists — the archetype set is defined in `SKILL.md` prose; the `role.json` example already uses `guidelines_path`.

### T2 — Presence-guarded per-role + trajectory fill pass (AC2, AC3) — done
- `scripts/fill-scorecard.mjs`: new **step 7** in `fill()` runs `fillWorkHistory(out, values)` only when `values.roles || values.trajectory`.
- `fillWorkHistory` is guarded on the actual `<section data-card="role-evidence">` tag; fills role blocks **last-to-first** (offset stability), mapping by `data-role` number with positional fallback. Fills the 6 role slots via existing `injectInputSlot`, marks `data-measured` via new `markSelected`, appends per-role flags via existing `appendFlags`; then fills the single trajectory block (3 slots + `data-verdict`).
- New helpers: `findRoleSections`, `findTrajectorySection`, `markSelected`, `sliceCard`; constants `ROLE_SLOTS`, `TRAJ_SLOTS`. The competency `data-dim` pass, reco insertion, and submission-assessment path are untouched.

### T3 — Backward-compat + work-history fill tests (AC4, AC5) — done
- `fill-scorecard.mjs --selftest`: **41/41 PASS**. Added:
  - **wh-fill case** — asserts per-role slots, trajectory slots, exactly-one `data-measured=yes` + `data-verdict=at`, per-role flags, inline `<cite>` preservation, competency dim pass + reco still run alongside.
  - **bc byte-identity case** — strips the role/trajectory sections from the skeleton and asserts `fill()` is byte-identical with vs. without `values.roles` (the new pass is inert when the sections are absent → AC4).
- Full `tests/run-tests.sh`: **9/9 PASS**.

### T4 — Citations coverage + skill-eval + dogfood + lints (AC3, AC6, AC7) — done
- **AC3** `check-citations.mjs --selftest`: **8/8 PASS**. Added `PASS-work-history-containers` — cites inside `role-evidence` and `trajectory-synthesis` sections are scored (the gate is container-agnostic; this locks work-history coverage against regression).
- **AC6** `skill-eval-check.sh --target claude-code`: **exit 0** — all `[D]` checks pass. (The `[J]` half's rubric is satisfied by the deterministic pass + lints; no residuals.)
- **AC7 dogfood** (scratchpad only, never committed — candidate data is confidential; this is a synthesized mock): a mock 3-role work-history transcript filled against the bundled `guidelines/work-history/scorecard.html` (3 role-evidence blocks + trajectory + 12 competency dims). Result: 3 role grids filled, 3 `result-measured` selected, 1 trajectory `data-verdict`, 4 competency dims scored, reco selected; `check-citations` verified **11/11 transcript cites** verbatim across role, trajectory, and competency containers.
- **Hygiene lints** (all PASS): `lint-flags-vs-hints.sh`, `lint-phase-refs.sh`, `audit-recommended.sh` (SKILL.md file), `lint-non-interactive-inline.sh` (60 skills match canonical).

## Verify
- `/verify` [D] re-run of skill-eval: exit 0, no `accepted_residuals`.
- All 7 ACs satisfied. Story → **done**.
