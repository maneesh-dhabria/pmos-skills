# P1/P2 campaign — stragglers log (controller-maintained)

Cross-boundary items reported by Wave 2 package agents, to be resolved by the
owning package if still in flight, else by Wave 3.1 central repair. Strike
through when resolved.

## From A4 (execute)

- [ ] `plan/SKILL.md:553` claims "/execute reads this [`execution_mode` frontmatter]" — execute's Phase 0a resolves mode from flags only; /feature-sdlc is the frontmatter reader. → A3 (plan) owns; verify A3 fixed it, else Wave 3.

## From A5 (verify)

- [ ] `scripts/check-comments-coverage.sh:2` header still says "/verify Phase 5 gate set" — should say Phase 7. Repo-root file; controller fixes in Wave 3.
- [ ] `verify/reference/design-drift-check.md:74` cites "/wireframes Phase 2a + 2.6" — resolves today but ghosts if B1 renumbers wireframes. B1 or Wave 3 slug-ifies.
- [ ] `architecture/SKILL.md:223,251` ("/spec Phase 6b") and `prototype/SKILL.md:134` ("Phase 2ac") fail lint-phase-refs after A2's spec renumber → C4 (architecture) + B2 (prototype) own; else Wave 3.

## From A2 (spec)

- [ ] `feature-sdlc/SKILL.md:859` "/spec Phase 6a" → `{#folded-sim-spec}`; `:177/:350` possessive "its Phase 6a" prose-stale → A7 owns (in its brief).
- [ ] `verify/SKILL.md:525` "mirrors /spec's same-named flag for Phase 6b" — semantically stale → should cite `{#folded-arch}`. Wave 3 (A5 already committed).
- [ ] `tests/fixtures/pipeline-consolidation/test-w3-fold-sim-spec.sh` greps `^## Phase 6\.5: Folded simulate-spec` — pre-existing red at HEAD; needs slug-form update. Controller/Wave 3.
- [ ] `_shared/html-authoring/conventions.md` §10 still mandates on-disk `_index.json` — contradicts README step 5 (inline manifest). Frozen substrate; post-campaign or Wave 3 controller fix.

## From A1 (requirements)

- [ ] `msf-req/SKILL.md:65` "its Phase 5a" prose-stale (folded MSF-req is now requirements Phase 6 {#folded-msf}) → B7 owns msf-req.
- [ ] feature-sdlc:177 claims /spec and /plan also accept `--tier` — A2/A3 didn't implement passthrough; reconcile in Wave 3 (either feature-sdlc drops the claim or it's accurate already — verify).

## From A3 (plan)

- [ ] `spec/SKILL.md` cites "/plan Phase 4" by bare number ×2 — resolves but should be slug form per §J. Wave 3.

## From A6 (complete-dev)

- [ ] diff_router.sh's new branch-scope diff source has no dedicated test under `tests/scripts/` (outside A6 ownership). Wave 3 optional.
- [ ] Finding 3 phantom contracts (`readme_update_hook`, `state.base_drift`): P0 deleted the readme/feature-sdlc sides; Wave 3 must grep for any complete-dev-side residue and confirm zero mentions remain.

## From B1 (wireframes renumber — old→new slug map for cross-skill repair)

Old 2a → `#resolve-design-md` (Phase 3) · old 2b/2.6 → `#composition-context` (Phase 4) · old Phase 3 generate → `#generate` (Phase 5) · old Phase 4 review → `#review` (Phase 6) · old Phase 6 folded → `#folded-msf-wf` (Phase 8) · old Phase 7 canvas → `#canvas` (Phase 9).

- [ ] `verify/reference/design-drift-check.md:74` "Re-run /wireframes Phase 2a + 2.6 extractors" → `#resolve-design-md` + `#composition-context`. Wave 3 (verify already committed).
- [ ] `prototype/SKILL.md:122,126-140` "Phase 2a + 2.6 of /wireframes" + ghost "Phase 2ac" in the --bootstrap-design-only handoff → same slugs. → B2 brief includes this.
- [x] msf-wf stragglers — already resolved by B7's rewrite (verified post-commit).
- Follow-ups (not this campaign): DESIGN.md cluster → _shared/design-md/; canvas extraction-priority doc/script drift.

## From B2 (prototype)

- [ ] `_shared/structured-ask-edge-cases.md:69` cites "/prototype — Phase 8 Findings Presentation Protocol" — semantically stale (findings is now Phase 9 {#findings}); lint-invisible (a Phase 8 exists). Controller one-liner, Wave 3.
- [ ] §L follow-up: prototype's 4 dispatch sites (mock-data/runtime/components/reviewer) and polish's editor/rewriter dispatches have no model pins; `sonnet` would fit. Optional, post-campaign.

## From B7 (design-crit + msf)

- [ ] Pre-existing (requirements-owned): the folded MSF-req path writes `msf-req-findings.md` (MD) while standalone msf-req writes `.html` — same W4 slug, different extension by route. Wave 3: verify which is correct and align.
