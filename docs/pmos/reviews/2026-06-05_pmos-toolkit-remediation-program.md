# pmos-toolkit — Remediation Program

**Date:** 2026-06-05
**Sources:** `2026-06-05_pmos-toolkit-skill-architecture-review.md` (architecture + per-skill + roadmap) and `2026-06-05_pmos-toolkit-design-questions.md` (7 design-philosophy answers). This doc is the *actionable consolidation* — it does not re-paste the evidence; cite the two source docs for the "why".

---

## How to run this program

This is **not one feature.** It's 3 decisions + ~14 work items that route to different tools. Do not pass the whole thing to a single `/feature-sdlc` run — it will mis-tier and the discovery stages add nothing to mechanical refactors.

**Recommended flow:**
1. **Capture** every `W#` below into `/backlog` (one item each) so you have a tracker. Each work item's heading + scope line is a ready backlog entry.
2. **Decide** D1–D3 first (≈30 min, no tooling). They gate several work items.
3. **Route** each item to the lightest tool that fits, per the `Route:` line:
   - **`direct + /verify`** — mechanical correctness fix; just do it and verify.
   - **`/plan → /execute → /verify`** — cross-cutting refactor, crisp acceptance criteria, no requirements/spec needed.
   - **`/feature-sdlc skill --from-feedback`** — skill revision; eval-gated against `skill-eval.md`. Paste-ready feedback blocks provided.
   - **`/feature-sdlc` (full)** — genuine behavior feature.

**Why not full SDLC on everything:** `/feature-sdlc` is built to take *one* idea/skill through req→ship. A 29-skill awk extraction or a `.shared`→`_shared` repoint has no "requirements" to discover — forcing them through the pipeline burns stages. Use the pipeline where there's genuine design to do (the skill revisions and the two features); use `/plan`+`/execute` for the refactors.

---

## Decisions to make first (gate the work items)

### D1 — Plugin scope & charters
**Decide:** (a) Create a `pmos-utilities` plugin and move `mac-health` into it? (Recommended: yes.) (b) Does `architecture` move there too, or stay in `pmos-toolkit` (it's wired into `/verify` Phase 4.7)? (Recommended: stay for now.) (c) Write a one-line **charter per plugin** into the repo CLAUDE.md so future skills route correctly: *toolkit = ship a feature; learnkit = learn a topic; utilities = maintain your environment/machine.*
**Gates:** W6.

### D2 — Visual identity direction
**Decide:** the ownable accent color (not Tailwind `#2563eb`), the wordmark concept ("pmos" lockup), and one display typeface for headings/wordmark. Delivery = base64-inlined subsetted woff2 (matches the self-contained-artifact architecture; works with no server and no internet). See design-questions §Q6.
**Gates:** W11.

### D3 — creativity + msf-req: merge or disambiguate?
**Decide:** merge into one `requirements-review` skill with `--mode friction|creativity|both`, OR keep both and tighten descriptions so they stop colliding. (Recommended: merge — they share input, slot, and the persona/journey ceremony.)
**Gates:** W5.

---

## Work items

### W1 — [P0] Fix resolver drift (`.shared` → `_shared`)
**Route:** `direct + /verify`
**Scope:** 8 pipeline skills cite the stale `../.shared/resolve-input.md` (a `.md`-only resolver predating the HTML-artifacts upgrade); the corrected `.html`-aware `_shared/resolve-input.md` exists but is unused.
**Files:** repoint citations in verify:190, spec:153, plan:169, execute:193, wireframes:188, prototype:143, creativity:38, simulate-spec:139 → `_shared/resolve-input.md`. Delete `skills/.shared/` (single stale file). Add `tools/lint-no-dot-shared.sh` grep guard.
**Acceptance:** no `.shared/` references remain; spine resolves `.html` artifacts; lint guard green. **Do this first — it's a live correctness bug.**

### W2 — [P1] Extract the awk extractor out of 29 skills
**Route:** `/plan → /execute → /verify`
**Scope:** the non-interactive block's ~52-line awk extractor is pasted into 29 skills (~1,500 lines of tax) but the *executing model never runs awk* — it classifies its own AskUserQuestion calls by reading. The awk is only needed by `tools/audit-recommended.sh`.
**Files:** move the awk to `tools/` (audit-recommended.sh + lint script); in `_shared/non-interactive.md` Section 0, replace the inlined "5. Awk extractor" with a one-line reading instruction; re-paste the shrunk ~32-line block into all 29 skills; update `tools/lint-non-interactive-inline.sh` to guard the shrunk region.
**Acceptance:** lint green against the new canonical block; no awk in any SKILL.md; non-interactive behavior unchanged. See design-questions §Q2.

### W3 — [P1] feature-sdlc Phase 0.5 lastrun consolidation
**Route:** `/feature-sdlc skill --from-feedback` (paste block below)
**Scope:** fresh `/feature-sdlc` run hits ~5 soft gates one at a time; complete-dev already solved this (Phase 0.5, lastrun-seeded). Port the pattern.

> **Feedback for `/feature-sdlc`:** A fresh pipeline run presents the soft gates (ideate, creativity, wireframes, prototype, reflect) as five separate sequential AskUserQuestion prompts. complete-dev (SKILL.md:193–220) already solved this exact friction with a Phase 0.5 consolidated prompt seeded from `.pmos/complete-dev.lastrun.yaml`. **Why:** decision fatigue before ship; the 2nd+ run repeats identical choices. **How to apply:** add a Phase 0.5 to feature-sdlc that reads `.pmos/feature-sdlc.lastrun.yaml` and presents ONE batched prompt — "pipeline gates: ideate=skip, creativity=skip, wireframes=run, prototype=skip, reflect=skip — confirm or edit?" — short-circuiting the individual gates when prior choices match. Write the file at the final phase. Keep destructive prompts (slug collision, base-drift, merge, push) explicit and separate; only consolidate the non-destructive soft gates. Mirror complete-dev's confirm/edit loop exactly.

### W4 — [P1] Extract a shared tracker substrate
**Route:** `/plan → /execute → /verify`
**Scope:** backlog/mytasks/people each hand-roll the same file-CRUD + INDEX-regen + archive-by-quarter + frontmatter-validation stack. No shared abstraction → no schema versioning, 3× maintenance.
**Files:** create `_shared/tracker-crudl.md` (item schema shape, slug/ID rules, INDEX-regen contract, archive layout, validation patterns). Refactor backlog/mytasks/people to cite it + supply only storage path + enum set + skill-specific phases.
**Acceptance:** the three trackers share one CRUDL contract; per-tracker tests still pass; schema-version field added to all three.

### W5 — [P1] Discovery-cluster disambiguation (executes D3)
**Route:** `/feature-sdlc skill --from-feedback` (per skill or as a cluster)
**Scope:** grill/ideate/creativity/simulate-spec/msf-req/msf-wf collide on "stress-test"/"pressure-test"/"friction analysis" triggers; a user can't predict which fires.

> **Feedback for the discovery/critique cluster (grill, ideate, simulate-spec, creativity, msf-req, msf-wf):** their descriptions compete for the same user phrasing ("stress-test", "pressure-test", "friction analysis"). **Why:** users can't tell which to invoke; creativity and msf-req are functionally redundant (same input, same pipeline slot). **How to apply:** (1) add an input-type/method disambiguator to each description's lead — grill "via interactive decision-tree interrogation of any artifact", ideate "of an uncommitted pre-requirements idea", simulate-spec "scenario-trace of a committed spec", creativity "technique-driven idea generation on a requirements doc", msf-req "end-user friction analysis of requirements text", msf-wf "PSYCH+friction scoring of wireframe screens". (2) Per D3 decision: either merge creativity+msf-req into `requirements-review --mode friction|creativity|both`, or keep both with the tightened descriptions. (3) Extract the copy-pasted persona-alignment + journey-confirmation prose (creativity Phase 1, msf-req Phase 3, msf-wf Phase 3–4) into `_shared/persona-journey-alignment.md` and cite it from all three.

### W6 — [P1] Move mac-health to pmos-utilities (executes D1)
**Route:** `/plan → /execute` (new-plugin scaffold)
**Scope:** mac-health (diagnose a slow Mac) has zero connection to req→ship. Per the repo's new-plugin scaffold rules (CLAUDE.md), stand up `pmos-utilities` (two `plugin.json` manifests at 0.1.0, both marketplace entries, Plugins-list update) and move `mac-health` there. Also fold D1's plugin charters into CLAUDE.md.
**Acceptance:** `mac-health` registers under pmos-utilities; removed from pmos-toolkit; marketplace catalogs updated; charters documented.

### W7 — [P2] Shared writing-principles reference
**Route:** `/plan → /execute` (or skill-feedback per skill)
**Scope:** ~10 artifact-emitting skills carry scattered prose one-liners ("user-facing language", "conciseness") that overlap polish's rubric; only readme defers to /polish.
**Files:** extract a short `_shared/writing-principles.md` (skill-agnostic prose rules only); have requirements/spec/plan/changelog/artifact/ideate/survey-* cite it in their write phase; make polish's `rubric.md` the enforcement layer built on those principles. Keep skill-specific content rules local. See design-questions §Q1.

### W8 — [P2] Move inline templates to reference/
**Route:** `/feature-sdlc skill --from-feedback` (per skill, eval-gated)
**Scope:** spec (~320 lines of Tier templates), plan (~100-line task template + ~70-line operational-modes), design-crit (~50-line depth spec), survey-design (~115-line schema) inline content that pushes bodies past the 800-line ceiling.

> **Feedback for spec / plan / design-crit / survey-design:** large blocks of template/spec content are inlined in the body, pushing each past the skill-eval body-size ceiling. **Why:** verbose bodies hurt readability and context economy; templates belong behind progressive disclosure. **How to apply:** move spec's Tier 1/2/3 markdown templates → `reference/spec-templates.md`; plan's task template + operational-modes → `reference/`; design-crit's `--depth`/`--output-format` spec → `reference/depth-and-format.md`; survey-design's Phase 3 schema → `reference/survey-schema.md`. Body cites the reference and emits the chosen template at runtime. polish is the model to copy (lean body + 7 reference files).

### W9 — [P2] Fix thin-skill structural gaps
**Route:** `/feature-sdlc skill --from-feedback` (one run per skill — paste blocks below)
**Scope:** changelog, comments, session-log fail several checks in your own `skill-eval.md`.

> **Feedback for `/changelog`:** missing structural gates. **Why:** fails the repo's own skill-eval rubric (no learnings phase, no track-progress, no platform-adaptation; only 1 trigger phrase; malformed non-interactive markers — a `:start` with no `:end`). **How to apply:** add ≥5 quoted trigger phrases to the description; add a Capture-Learnings phase and Track-Progress + Platform-Adaptation sections; fix the non-interactive block markers (or, post-W2, adopt the shrunk canonical block).

> **Feedback for `/comments`:** identity is ambiguous. **Why:** it exposes a `/comments` command and has an `argument-hint`, but frontmatter omits `user-invocable: true` and the body declares itself "a utility, not a pipeline stage"; the prose restates what `resolver.js` already does. **How to apply:** decide — make it a first-class user skill (add `user-invocable: true`, Platform-Adaptation, Track-Progress, learnings phase, ≥5 trigger phrases, document the 4 modes) OR move it to `_shared/` infra and drop the slash command. Recommended: first-class skill; thin the prose to defer to the controller scripts.

> **Feedback for `/session-log`:** under-built and overlaps reflect. **Why:** 0 trigger phrases, no numbered phases (only "Process"), an orphaned `instructions.md` not referenced by SKILL.md, and unclear boundary vs `/reflect`. **How to apply:** add ≥5 user-spoken triggers; add Phase 0 (load learnings) + a Capture-Learnings phase; fold `instructions.md` into the body; clarify in the description that session-log captures *what you built/decided* while reflect critiques *the tools you used*.

### W10 — [P2] Extend the persona theater-check
**Route:** `/feature-sdlc skill --from-feedback`
**Scope:** readme's `simulated-reader.md` has an anti-theater re-dispatch (if a persona returns no friction but the rubric found ≥3 issues, re-dispatch once harder). Other persona simulations lack it.

> **Feedback for `/design-crit` and `/survey-design`:** persona simulations can return sycophantic "looks great" theater. **Why:** the #1 failure mode of LLM persona work; readme already solved it (`reference/simulated-reader.md` theater-check re-dispatch, FR-SR-5). **How to apply:** add the same guard to design-crit's per-journey friction pass and survey-design's simulated-respondent walk — if the persona surfaces fewer issues than the rubric/expected floor, re-dispatch once with a harder anti-helpfulness prompt and accept the second result. Spec the persona's *constraints + bounce conditions + anti-theater guard*, not a biography. See design-questions §Q4.

### W11 — [P2] Implement the visual identity (executes D2)
**Route:** `/feature-sdlc` (full — touches shared substrate, real design work)
**Scope:** PMOS output is currently generic (Tailwind blue + system fonts + invisible footer). Implement D2's decisions in the single substrate.
**Files:** `_shared/html-authoring/assets/style.css` (accent tokens, type scale, base64 display face, section signature, branded footer), `template.html` (wordmark in toolbar), a shared palette token file bridging docs ↔ diagram themes (`diagram/themes/*`).
**Acceptance:** all 14 HTML surfaces render the wordmark + accent + section signature; diagrams and docs share one palette; artifacts stay self-contained (font inlined). See design-questions §Q6.

### W12 — [P2] Standardize phase numbering + frontmatter keys
**Route:** `/plan → /execute`
**Scope:** phase tokens are a free-for-all (decimals, letters, mixed); spec emits `requirements:` while plan emits `requirements_ref:` for the same pointer.
**Files:** adopt one convention (integer phases + lettered sub-phases `6a/6b`, no decimals) across the spine; standardize on `requirements_ref`. Mechanical, cross-skill.

### W13 — [P3] Relocate learnings-capture.md into _shared
**Route:** `direct` / small `/plan`
**Scope:** `skills/learnings/learnings-capture.md` is a shared contract cited by 20 skills but lives outside `_shared/`; some skills inline the contract, others cite it.
**Files:** move to `_shared/learnings-capture.md`; repoint the 20 citations; make requirements cite (not inline) it.

### W14 — [P3] Decide the inline-with-lint context-tax posture
**Route:** `decision` + small `/plan`
**Scope:** even after W2, ~32 lines × 29 skills of contract are re-pasted with only lint (detect) and no sync (propagate). Decide: add a `tools/sync-inline-blocks.sh` (propagate canonical → skills) or accept the tax explicitly and document why. See design-questions §Q2/§2.3 of the architecture review.

---

## Suggested sequencing

1. **Now:** W1 (P0 bug). Make decisions D1–D3.
2. **Refactor wave (`/plan`+`/execute`):** W2 (awk), W4 (tracker substrate), W12 (numbering/keys). High-leverage, low-risk, mechanical.
3. **Skill-revision wave (`/feature-sdlc skill --from-feedback`):** W9 (thin skills — start here; smallest, cleanest eval targets), W5 (discovery cluster), W8 (template moves), W10 (theater-check). Eval-gated.
4. **Scope:** W6 (mac-health → pmos-utilities) once D1 is decided.
5. **Features (`/feature-sdlc` full):** W3 (Phase 0.5 consolidation), W11 (visual identity) once D2 is decided.
6. **Cleanup:** W7 (writing-principles), W13 (learnings relocation), W14 (sync posture).

**Start with W9** if you want to validate the skill-feedback route on small, unambiguous targets before taking the bigger items through it.
