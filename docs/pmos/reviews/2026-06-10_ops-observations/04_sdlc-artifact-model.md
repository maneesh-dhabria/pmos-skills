# SDLC artifact model: per-phase docs vs single evolving doc

**Date:** 2026-06-10 · **Question:** for /feature-sdlc and its embedded phases, keep different outputs per phase (requirements, spec, plan, …) or move to a single output modified in each phase? The per-phase model mirrors real-org ownership, but the maintainer worries the docs drift out of sync and stop being MECE.

**Verdict up front: keep per-phase documents, but stop pretending they are living docs. Adopt a lightweight lifecycle + supersession layer (hybrid c-2 below): (1) /complete-dev stamps every artifact `status: Shipped vX.Y.Z`, (2) /verify writes one-line `superseded-by` markers at the spec/requirements anchors its compliance pass found "intentional — decision" drift on, (3) runtime skills may only cite living reference docs (the state-schema.md pattern), never feature-folder specs, with a "contract promotion" step at /complete-dev, and (4) the spec template's "Restate from requirements" instructions become "cite anchor + deltas only." Total cost ≈ one /skill-sdlc run touching 4 skills + a ~50-line one-shot backfill script. Do not move to a single evolving doc — the evidence says the drift is concentrated at two cheap-to-fix seams, and the single-doc model destroys the decision-record property that the prior audit graded as one of the repo's rare strengths ("the decision history is *recoverable*, which is rare").**

This is the artifact-level expression of the prior audit's #1 systemic finding ([report.md](../2026-06-10_skill-design-review/report.md) §1: "facts stated twice, drifted once — silently"). Same disease, one level up: there the duplicated facts were in SKILL.md bodies; here they are in the per-feature requirements/spec/plan triplet and in the seam between frozen feature snapshots and living runtime docs.

---

## 1. The current contract: information-flow map

What each stage emits, what the next stage reads, and what gets restated (sources: each skill's SKILL.md; paths relative to `plugins/pmos-toolkit/skills/`).

| Stage | Emits | Reads from upstream | Restates (verified) |
|---|---|---|---|
| `/requirements` | `01_requirements.html` + `.sections.json` (problem, goals/non-goals, journeys, design decisions, success metrics, open questions; newer runs also own FR-IDs) | seed / ideate brief / 0c triage | — |
| `/grill` | `grills/<date>_01_requirements.html` (report, opt-in save) + a `#grill-resolutions` appendix **appended into** `01_requirements.html` (one line per resolution + pointer) | chrome-stripped `01_requirements.html` (FR-50/51/52 contract, `feature-sdlc/SKILL.md:561`) | one-line summaries only — the **good** pattern |
| `/spec` | `02_spec.html` | `01_requirements.html` via resolver (`spec/SKILL.md:102`); checklist "Every requirement … mapped to a spec section" (`:387`, `:464`) | **By template instruction**: `spec/reference/spec-templates.md:68` — "Problem Statement: *[Restate from requirements + primary success metric]*" — plus Goals, Non-Goals, User Journeys, Edge Cases, Decision Log sections that all also exist in 01 |
| `/plan` | `03_plan.html` + sidecars (`03_plan_review.md`, skip-list, auto, blocked) | `02_spec` frontmatter tier (`plan/SKILL.md:75`), `**Spec refs:** 02_spec.html#anchor` per task, FR-31a broken-anchor hard-fail (`:402`), FR-31b spec-hash drift detection (`:404`) | own Decision Log (P-ids), **Risks and Rollback restated from spec** with colliding row ids (see §2.1) |
| `/execute` | `execute/task-NN.md` logs, `03_plan_defect_<id>.md` | `03_plan` + "its upstream spec end-to-end" (`execute/SKILL.md:139`) | `DEVIATION:` lines live **only in task logs** (`:377`) — "Adapt the implementation to reality but do NOT silently adjust" |
| `/verify` | `verify/<date>-review.html` | "reads all prior artifacts (`01_…`, `02_…`, `03_…`, `execute/`)" (`verify/SKILL.md:67`); per-FR / per-task compliance tables (`:528`, `:537`, `:560`) | restates every FR row with a three-state outcome — by design (this is the audit function) |
| `/complete-dev` | merge, changelog, version bump, learnings → CLAUDE.md | verify outcome | **nothing artifact-side** — no status flip, no historical marking (verified: zero matches for shipped/superseded/historical lifecycle actions in `complete-dev/SKILL.md`) |

### Back-propagation mechanisms that exist today

1. **/grill → requirements**: resolutions are appended into `01_requirements.html#grill-resolutions` (verified in `2026-05-11_feature-sdlc-skill-mode/01_requirements.html`: "Recorded during the deep grill (…); the /spec stage turns these into concrete FRs"). Works.
2. **/plan → spec (plan-time)**: E13 "Spec re-open during planning" (`plan/SKILL.md:171`) — a 4-option prompt including "Halt /plan and update spec" and "Document override in spec via Decision Log entry". Plus FR-31a (broken `02_spec#anchor` → high-risk finding) and FR-31b (spec content hash → "Spec has changed since plan was generated"). Works, at plan time only.
3. **/spec folded simulate-spec**: auto-applies patches to `02_spec.html` with per-finding commits (`spec/SKILL.md:487`). Forward-edit of the spec, pre-plan.
4. **/execute → spec**: **none required.** Deviations land in `execute/task-NN.md`; spec amendment is ad-hoc — it happened once (D22, see §2.2) and was explicitly declined once (D26) in the same feature.
5. **/verify → spec**: **none.** Verify fixes *code and skill files* it finds stale, but never back-edits the feature's own requirements/spec (proven by the FR-12.1 case in §2.1 — verify edited 20+ SKILL.md files and left the spec's contradicting Non-Goal untouched).
6. **/complete-dev**: **nothing.** Artifacts freeze wherever their status field happened to be.
7. **/comments resolve**: post-hoc, human-directed edits to any artifact via `apply-edit-at-anchor` — an editing transport, not a sync mechanism.

So: drift *into* the spec is well-defended up to /plan, and completely undefended from /execute onward — exactly where reality diverges from the design.

### Living docs that already exist (the unnamed second tier)

The repo already operates a two-tier model without naming it: feature folders are frozen snapshots, while **living** truth accretes in (a) `feature-sdlc/reference/state-schema.md` — "`schema_version: 5` is the current version … auto-migrated on read through the chain v1 → v2 → v3 → v4 → v5" — a genuine consolidating doc that supersedes each feature's frozen schema section; (b) `_shared/html-authoring/README.md` (e.g. "`output_format: both`? Retired (FR-12.1)"); (c) CLAUDE.md feature sections (the inline-doc-comments section carries the "Pre-v2.58.0 artifacts used a separate sidecar; that contract was retired" supersession note that the spec itself lacks); (d) `*.sections.json` + `index.html` per folder (structured per-artifact indexes — generated views over the docs). The failure mode is that this tier is ad-hoc: some contracts got promoted to it, others are still cited in their frozen feature-folder form.

---

## 2. Ground truth: drift evidence from four real feature folders

### 2.1 `2026-05-28_inline-html-artifacts` (Tier 3, full pipeline, 13 tasks)

**Duplication (template-mandated): 7 topic areas restated requirements → spec.** Problem (`#problem` vs `#problem-statement`), Goals, Non-Goals, Journeys (4 journey sections each), Edge Cases, Decisions (`#design-decisions` vs `#decision-log`), Research Sources. The Non-Goals are the clearest: 01_requirements `#non-goals` is 1,837 chars of 8 bullets; 02_spec `#non-goals` is an 879-char compressed restatement of the **same 8 bullets**. Measured verbatim overlap between the two docs is ~zero (0 shared 80-char shingles out of 720/830) — the duplication is *semantic restatement*, which is worse than copy-paste because no diff tool can ever catch the drift.

**Contradiction #1 (the smoking gun): the documented mitigation for a scope cut was itself cut during the same feature, and neither upstream doc was ever corrected.**

- `01_requirements.html#non-goals`: "NOT preserving the Copy-Markdown button after turndown is removed — … users who want Markdown can **re-emit with `output_format=both`**."
- `02_spec.html#non-goals`: "users wanting Markdown **re-emit with `--format=both`**." And `#decision-log` D7 rationale: "no in-domain signal of button usage; **re-emit with `--format=both` covers rare cases**."
- `verify/2026-05-28-review.html#open-followups`, same feature, days later: "**`output_format=both` is silently inert.** The MD-sidecar emit path depended on the now-deleted turndown bundle. SKILL.md prose now says 'retired (FR-12.1) — treated as html.'"

The verify pass (commit `25a61d8`/`b37babf`, "scrub retired-feature prose to satisfy spec deletion-set gate") rewrote 38 turndown references across 20+ SKILL.md files — and left the feature's **own requirements and spec** stating, three times, an escape hatch that no longer exists. A post-ship reader of the spec (the doc the folder presents as the design record) is actively misled about what users can do. Count: **3 stale statements, 0 back-edits, 1 place where the truth lives (the verify report's follow-ups section).**

**Duplication spec → plan with colliding namespaces:** both docs carry `#risks` and `#rollback`. Spec R1 = "Claude desktop preview inline-JS fails"; plan R1 = "renderer re-emit drops existing threads". Same ids, different registers — any cross-doc citation of "R2" is ambiguous. Rollback is restated (spec: "rollback = git revert. The migration's commit (step 7e) can be reverted independently"; plan: same content re-expanded with task ids).

**Deviations:** 9 `DEVIATION` entries across `execute/task-*.md` (LOC estimate off 689 vs <400 in task-09; plan steps rewritten for safety in task-10/12; a planned removal that had nothing to remove in task-11). All correctly logged; none annotated back onto the plan body. Acceptable as decision-record behavior — but nothing in `03_plan.html` tells a reader the task list was executed with amendments.

### 2.2 `2026-05-23_inline-doc-comments` (Tier 3, 29 tasks — the natural experiment in back-prop)

This folder contains both the good case and the bad case side by side:

- **D22 (back-prop done):** `execute/task-22.md`: "**Part A — NFR-02 amendment (DEVIATION D22)** … `02_spec.html` NFR-02 row **rewritten** with split thresholds + rationale. `DEVIATIONS.md` D22 entry documents the decision." The spec was amended; CLAUDE.md's living section matches it today. Cost: one Edit call.
- **D26 (back-prop declined):** `execute/task-26.md`: "the spec'd date pattern (2026-04-* + 2026-05-0[1-7]_*) predates the HTML emit era … Generator falls back to all HTML … **No spec amendment opened; the fallback note in the script header is sufficient.**" Result: `02_spec.html#testing-anchor-calibration` (§14.6) still specifies the obsolete corpus pattern today.
- **Cross-feature supersession, unmarked:** the 2026-05-28 feature retired this spec's entire persistence model (sidecar → inline) and deleted its anchor-resolver technology (Bitap/diff-match-patch → substring-contains). The 05-23 spec still contains **54 mentions of "sidecar"** and Bitap-based language in its error taxonomy ("quote-fallback **Bitap** score < threshold", §9.2) with **zero supersession markers** (grep for superseded/retired/obsolete: 1 hit, unrelated).
- **And it is cited as normative at runtime:** **25 citations** from current SKILL.md files point into this frozen spec as a living contract — e.g. `spec/SKILL.md:668`: "Per [NFR-08](…2026-05-23_inline-doc-comments/02_spec.html#nfr-h), this phase **MUST cite that file rather than restate the contract**." The anti-restatement rule is right; the citation *target* is a snapshot that a later feature partially rewrote. One citation is mechanically broken: `comments/SKILL.md:41` cites `02_spec.html#solution-architecture` — **that id does not exist** in the spec (the real id is `architecture-overview`).

### 2.3 `2026-05-11_feature-sdlc-skill-mode` (skill-mode run, 23 tasks)

- **Frozen fact outliving its truth window:** `02_spec.html` §10: "**Totals: 39 checks** — 20 [D] … 19 [J]". The living rubric (`feature-sdlc/reference/skill-eval.md`) grew to **41 checks** through later features, but its header kept repeating the spec's frozen 39 until today's audit flagged it (report.md: "Rubric headers lie about their own counts"). Same chain for `schema_version: 4` (this spec's G6) → v5 (prototype mode) while `feature-sdlc/SKILL.md` still declared v4 — "read literally, resuming a prototype run aborts." Both were P0-fixed on 2026-06-10; both incubated for ~2–4 weeks. The mechanism: a per-phase artifact froze a number, a living doc inherited it by copy, reality moved, the copy didn't.
- **The good pattern, working:** `01_requirements.html#grill-resolutions` holds G1–G15 as one-liners with a pointer to `grills/2026-05-11_01_requirements.html` — summary-plus-citation instead of restatement. The verify report (`verify/2026-05-12-review.html`) is a clean PASS with "90 Verified · 1 NA-with-alt-evidence · 0 Unverified" and 3 advisory findings — the per-FR restatement here is the *point* of the doc.

### 2.4 `2026-06-10_frameworks-library-revamp` (recent skill-feedback run — duplication is already declining)

The newest folder shows the convention drifting toward MECE on its own: **FR text lives only in `01_requirements.html`** (`#fr-views` … `#fr-invariants`; e.g. FR-13's full text appears there once), and `02_spec.html` is organized by component (`#schema`, `#renderer`, `#r-views`…) citing FR-IDs without restating their text. The verify report carries its residual explicitly ("1 known/accepted residual carried to /complete-dev — `a-name-verb-or-gerund` … renaming would break the public /frameworks command"). This is the target shape: each doc owns a disjoint register, IDs cross-cut by citation.

### 2.5 Pipeline-level consequence of "no terminal status"

Artifact statuses end at `Approved` (requirements, `requirements/SKILL.md:490`), `Ready for Plan` (spec, `spec/SKILL.md:602`), `Draft`/`Ready for Execute` (plan). Nothing ever flips them post-ship — survey of all 29 `03_plan.html` files on disk: 5 × `Draft`, 2 × `Ready for Execute`, 1 × `Approved-for-execute`, rest no parseable status — **including shipped features**. `/plan`'s FR-54 peer-plan conflict scan (`plan/SKILL.md:166`) filters peers by `status ∈ {Draft, Planned, Executing}`, so the long-shipped inline-html-artifacts plan (frontmatter `status: Draft`, shipped in v2.58.0) is **permanently treated as an in-flight conflicting plan** by every future /plan run that touches overlapping files. The missing lifecycle isn't just a framing problem; it has a concrete false-positive cost today.

### Drift scorecard (the quantified answer to "do things get out of sync?")

| Folder | Duplicated topic areas (req↔spec) | Contradictions found | Back-edits that should have happened and didn't |
|---|---|---|---|
| inline-html-artifacts | 7 (+2 spec↔plan: risks, rollback, with colliding R-ids) | 1 confirmed, stated 3× (`--format=both` mitigation vs FR-12.1 retirement) | 3 (req non-goals, spec non-goals, spec D7) |
| inline-doc-comments | ~7 (same template) | 2 (§14.6 corpus pattern post-D26; §9.2 Bitap language post-DMP-removal) + 54 unmarked "sidecar" mentions post-supersession + 1 broken normative anchor | ≥2 (D26 declined; no supersession pass after 05-28) |
| feature-sdlc-skill-mode | ~6 | 0 inside the folder; 2 incubated *outward* (39→41 checks, v4→v5 schema) into living docs | 2 (living headers lagged the moved facts ~2–4 weeks) |
| frameworks-library-revamp | ~2 (FRs cited, not restated) | 0 found | 0 |

Pattern: contradictions concentrate (a) at the /execute–/verify seam, where reality changes and no mechanism pushes the change upstream, and (b) at the frozen-snapshot-cited-as-living seam. Template-mandated restatement (goals/non-goals/journeys) creates the *surface* for (a) to land on. The newest folder, which restates least, drifted least.

---

## 3. Design-space analysis

### (a) Per-phase docs — current

**For:** matches org ownership (PM owns 01, eng owns 02/03); each doc is a frozen decision record — the prior audit explicitly praised this ("Provenance discipline: most caps traced cleanly to feature folders — the decision history is *recoverable*, which is rare"); the entire machinery is anchored to it (grill's chrome-strip/quote-grounding contract, sections.json, FR-31a anchor checks, comments overlay per-artifact, verify's three-doc compliance tables, tier carry-forward via frontmatter). **Against:** drifts exactly as feared — but §2 shows the drift is *localized*, not diffuse: 100% of found contradictions are either execute/verify-era reality changes never pushed upstream, or frozen docs cited as living. Zero contradictions were found between requirements and spec *as written at their own moments*.

### (b) Single evolving doc

**For:** one source, no restatement. **Against, decisively:** (1) destroys the decision record — the D7 rationale ("re-emit with --format=both covers rare cases") *should* survive as what-we-believed-then; in a single doc it gets overwritten, and the audit's provenance praise evaporates; (2) the pipeline's review machinery is per-stage — grill grounds quotes against the requirements snapshot, FR-31b hashes the spec *as planned against*, verify diffs implementation against the spec *as committed to*; a mutating doc makes every one of those checks self-referential; (3) merge surface — /spec's folded simulate-spec auto-commits patches while /plan holds a hash of the same file; (4) size — the 05-28 triplet is 40+52+84 KB; a single doc breaches the 200 KiB NFR-03 comments ceiling on Tier-3 features and becomes unnavigable for the stakeholder-comments flow; (5) it doesn't even fix the worst drift class — the frozen-cited-as-living seam (25 citations into the 05-23 spec) is orthogonal to how many docs a feature has.

### (c) Hybrids

- **c-1: append-only decision records + generated index.** Closest to current behavior (execute logs already are append-only; DEVIATIONS.md exists). But a generated cross-artifact index is new machinery, and the per-folder `index.html` manifest already covers navigation. Doesn't by itself stop a reader being misled by the spec body.
- **c-2: per-phase docs + explicit supersession markers + terminal status + promotion of durable contracts to living reference docs.** This is the recommendation. It legitimizes the snapshot framing ("this doc was true on its date; here is what changed") instead of fighting it. Every needed mechanism already exists: stable kebab-case heading ids on every h2/h3 (FR-03.1, enforced), `apply-edit-at-anchor` shims in all 14 surfaces, `_shared/html-authoring` re-emit, `sections.json` regeneration, the `state-schema.md` precedent for living contracts, and /verify already *computes* the drift classification ("intentional — decision" vs "regression") — it just throws the result away instead of writing it upstream.
- **c-3: sections.json as single structured source, docs as rendered views.** Architecturally elegant, practically wrong here: sections.json is an *index* (ids/titles/levels), not content; promoting it to source-of-truth means inventing a content schema for prose, journeys, and tables — a build pipeline the 05-28 feature explicitly listed as a non-goal for good reason ("template-substitution is a 10-line renderer change; a build step is needless indirection"). The cost is a rewrite of every emit surface; the benefit is drift protection only for facts that fit the schema.

### Steelman of the pure status quo ("they're decision records; drift is fine")

Mostly correct, and it's why the recommendation is framing + convention, not architecture. A requirements snapshot disagreeing with shipped reality is *healthy* — that's what a record is. The steelman fails in exactly three places, each evidenced above: (1) **nothing tells the reader the doc is a record** — `status: Draft` on a shipped plan claims the opposite; (2) **the records are load-bearing at runtime** — 25 normative citations point into a partially-superseded spec, and /plan's peer-scan treats shipped plans as live; (3) **mid-flight contradictions are not history, they're errors** — the `--format=both` mitigation was false *before the feature shipped*; freezing it isn't provenance, it's a bug in the record itself. Fix those three and the status quo's framing argument becomes actually true.

---

## 4. Recommendation and migration cost

**Keep per-phase artifacts. Ship hybrid c-2 as one /skill-sdlc run:**

1. **Terminal status stamp (new /complete-dev phase, ~30 lines).** After tag push, re-emit each of `01/02/03` (+ wireframes/prototype if present) with frontmatter `status: Shipped <plugin>/v<semver> — historical record` and regenerate sections.json + index. Side effect: FR-54 peer-plan false positives disappear (the filter already excludes non-{Draft,Planned,Executing}). One-shot backfill script for the ~70 existing folders (~50 lines, same shape as `migrate-sidecars-to-inline.sh`).
2. **Supersession markers from /verify (~20 lines in verify Phase 5).** For every compliance row classified `intentional — decision` (or any deviation that amends an FR/NFR/non-goal), require one `apply-edit-at-anchor` write to the affected spec/requirements section: `<p class="superseded">Superseded during execute/verify — see <a>verify/<date>-review.html#gaps-found</a> (D22-style note)</p>`. The anchor machinery, the re-emit path, and the classification all exist; this connects them. This converts the D22-vs-D26 coin-flip into a rule, and would have caught all 3 `--format=both` statements.
3. **Normative-truth rule (skill-patterns.md + ~10-line lint).** Runtime SKILL.md files cite only living docs (`_shared/`, `reference/`, README, CLAUDE.md), never `docs/pmos/features/**`. At /complete-dev, any contract a skill needs durably gets *promoted* into a reference doc (the state-schema.md pattern) with the feature-folder spec linked as provenance. Migrating the 25 existing citations into a `comments/reference/contract.md` is the bulk of this; the broken `#solution-architecture` anchor gets fixed for free.
4. **De-restate the spec template (~10 lines in `spec-templates.md`).** Replace "[Restate from requirements + primary success metric]" with "[Cite `01_requirements.html#problem`; state only the success metric and any deltas]"; same for Goals/Non-Goals/Journeys. Adopt the frameworks-revamp convention as the rule: FR text lives in exactly one doc; everything else cites the ID. Also: namespace plan risk ids (`PR-1` vs spec `R-1`).

**What this deliberately does not do:** no artifact-format change, no substrate change, no new build step, no change to grill/comments/execute logging, no renumbering of existing folders. Items 1–2 are pure additions; 3–4 change conventions only for future runs.

**Migration cost estimate:** 4 skill-file edits (complete-dev, verify, spec template, skill-patterns.md) + 1 backfill script + 1 lint extension ≈ one focused /skill-sdlc run, ~1 day, low risk (every mechanism reused is already tested). The alternative — single evolving doc — is a rewrite of all 14 emit surfaces, the review machinery, and the comments contract, to fix a disease that §2 shows lives at two seams a day's work closes.
